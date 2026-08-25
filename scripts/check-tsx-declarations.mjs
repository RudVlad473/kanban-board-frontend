#!/usr/bin/env node
/*
 * D-28: fails the build if a `.tsx` file declares anything at top level other than a component, a
 * prop type, a compound-component namespace object, or a framework-forced route export
 * (docs/adr/tech/0027). Mirrors scripts/check-no-play-functions.mjs's file-scanning shape.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

import { globRealFiles } from "./glob-real-files.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

/*
 * Next.js reads these off the route module itself, so they cannot be moved out — the first block
 * mirrors eslint.config.mjs's own `import-x/no-default-export` override list.
 */
const FRAMEWORK_FORCED_EXPORTS = new Set([
    "metadata",
    "generateMetadata",
    "viewport",
    "generateViewport",
    "generateStaticParams",
    "dynamic",
    "dynamicParams",
    "revalidate",
    "fetchCache",
    "runtime",
    "preferredRegion",
    "maxDuration",
]);

/** Test infrastructure, never imported by application code — docs/adr/tech/0027's only path exemption. */
const EXEMPT_PATH_PREFIXES = ["src/test-utils/"];

const isExemptPath = (relativePath) =>
    EXEMPT_PATH_PREFIXES.some((prefix) => relativePath.replaceAll("\\", "/").startsWith(prefix));

const isRouteFile = (relativePath) => relativePath.replaceAll("\\", "/").startsWith("app/");

/** React helpers that wrap a component and return one — the wrapped value is still a component. */
const COMPONENT_WRAPPERS = new Set(["memo", "forwardRef"]);

const containsJsx = (node) => {
    let didFindJsx = false;

    const visit = (current) => {
        if (didFindJsx) {
            return;
        }

        if (
            ts.isJsxElement(current) ||
            ts.isJsxSelfClosingElement(current) ||
            ts.isJsxFragment(current) ||
            ts.isJsxText(current)
        ) {
            didFindJsx = true;
            return;
        }

        ts.forEachChild(current, visit);
    };

    visit(node);

    return didFindJsx;
};

const isComponentInitializer = (initializer) => {
    if (initializer === undefined) {
        return false;
    }

    if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
        return containsJsx(initializer);
    }

    /*
     * `memo(...)`/`forwardRef(...)` and the namespaced `React.memo(...)` form both wrap a component
     * argument, so the JSX search runs over the call's arguments rather than the callee.
     */
    if (ts.isCallExpression(initializer)) {
        const callee = initializer.expression;
        const calleeName = ts.isPropertyAccessExpression(callee) ? callee.name.text : callee.getText();

        if (COMPONENT_WRAPPERS.has(calleeName)) {
            return initializer.arguments.some((argument) => containsJsx(argument));
        }
    }

    return false;
};

const isPropTypeName = (name) => name === "Props" || name.endsWith("Props");

/*
 * The compound-component pattern (`export const Modal = { Root, Content, ... }`): permitted
 * structurally rather than by an exempt-path list, so a future compound component needs no edit
 * here (docs/adr/tech/0027's fifth permitted declaration kind).
 */
const isComponentNamespaceObject = ({ initializer, componentNames }) => {
    if (initializer === undefined || !ts.isObjectLiteralExpression(initializer)) {
        return false;
    }

    if (initializer.properties.length === 0) {
        return false;
    }

    return initializer.properties.every((property) => {
        if (ts.isShorthandPropertyAssignment(property)) {
            return componentNames.has(property.name.text);
        }

        if (ts.isPropertyAssignment(property)) {
            return ts.isIdentifier(property.initializer) && componentNames.has(property.initializer.text);
        }

        return false;
    });
};

/** Components declared above the statement being judged — a namespace object may only name these. */
const collectComponentNames = (sourceFile) => {
    const names = new Map();

    for (const statement of sourceFile.statements) {
        if (!ts.isVariableStatement(statement)) {
            continue;
        }

        for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name) && isComponentInitializer(declaration.initializer)) {
                names.set(declaration.name.text, declaration.getStart(sourceFile));
            }
        }
    }

    return names;
};

const namesDeclaredBefore = ({ componentNames, position }) =>
    new Set([...componentNames].filter(([, start]) => start < position).map(([name]) => name));

export const findTsxDeclarationViolations = ({ source, relativePath }) => {
    if (isExemptPath(relativePath)) {
        return [];
    }

    const sourceFile = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const componentNames = collectComponentNames(sourceFile);
    const allowsFrameworkExports = isRouteFile(relativePath);
    const violations = [];

    const report = ({ node, name }) => {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        violations.push({ line: line + 1, name });
    };

    for (const statement of sourceFile.statements) {
        if (
            ts.isImportDeclaration(statement) ||
            ts.isExportDeclaration(statement) ||
            ts.isExportAssignment(statement) ||
            ts.isExpressionStatement(statement) ||
            ts.isEmptyStatement(statement)
        ) {
            continue;
        }

        if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
            if (!isPropTypeName(statement.name.text)) {
                report({ node: statement, name: statement.name.text });
            }
            continue;
        }

        if (ts.isFunctionDeclaration(statement)) {
            const name = statement.name?.text ?? "(anonymous function)";
            if (!containsJsx(statement)) {
                report({ node: statement, name });
            }
            continue;
        }

        if (ts.isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                const name = ts.isIdentifier(declaration.name) ? declaration.name.text : declaration.name.getText();

                if (allowsFrameworkExports && FRAMEWORK_FORCED_EXPORTS.has(name)) {
                    continue;
                }

                if (isComponentInitializer(declaration.initializer)) {
                    continue;
                }

                const precedingComponents = namesDeclaredBefore({
                    componentNames,
                    position: declaration.getStart(sourceFile),
                });

                if (
                    isComponentNamespaceObject({
                        initializer: declaration.initializer,
                        componentNames: precedingComponents,
                    })
                ) {
                    continue;
                }

                report({ node: declaration, name });
            }
            continue;
        }

        report({ node: statement, name: statement.getText(sourceFile).split("\n")[0] });
    }

    return violations;
};

const scanFile = (relativePath) => {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const source = readFileSync(absolutePath, "utf8");
    return findTsxDeclarationViolations({ source, relativePath }).map((violation) => ({ ...violation, relativePath }));
};

const runCli = () => {
    const files = globRealFiles({
        patterns: ["src/**/*.tsx", "app/**/*.tsx"],
        cwd: repoRoot,
    }).filter((relativePath) => !relativePath.includes(".stories.") && !relativePath.includes(".test."));

    const violations = files
        .flatMap(scanFile)
        .sort((a, b) => a.relativePath.localeCompare(b.relativePath) || a.line - b.line);

    if (violations.length > 0) {
        console.error(
            "tsx:check failed — a `.tsx` file declares something other than a component, a prop " +
                "type, a compound-component namespace object or a framework-forced route export, " +
                "banned by docs/adr/tech/0027-tsx-declaration-scope.md. Move it to a non-`.tsx` " +
                "module (a schema to the feature's schemas.ts, a pure transform to its model.ts, a " +
                "styling constant to a sibling .ts). An exemption is added to that ADR, never as an " +
                "inline suppression comment.\n",
        );
        for (const violation of violations) {
            console.error(`  ${violation.relativePath}:${String(violation.line)} — ${violation.name}`);
        }
        process.exit(1);
    }

    console.log("tsx:check passed — every `.tsx` file declares only components and prop types.");
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
