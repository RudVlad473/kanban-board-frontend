#!/usr/bin/env node
/*
 * D-29: fails the build if a `*.test.tsx` renders a component it imported from a sibling module
 * rather than a composed story (docs/adr/tech/0025). Mirrors
 * scripts/check-no-play-functions.mjs's file-scanning shape.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

import { globRealFiles } from "./glob-real-files.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

/*
 * Thin route wrappers under `app/` are exempt from the stories requirement, so their tests render
 * the wrapper itself — docs/adr/tech/0025's route-file scope carve-out, carried from tech/0021.
 */
const ROUTE_WRAPPER_BASENAMES = new Set(["error.test.tsx", "global-error.test.tsx", "layout.test.tsx"]);

const isExemptRouteWrapper = (relativePath) => {
    const normalized = relativePath.replaceAll("\\", "/");
    return normalized.startsWith("app/") && ROUTE_WRAPPER_BASENAMES.has(path.basename(normalized));
};

const isRelativeSpecifier = (specifier) => specifier.startsWith("./") || specifier.startsWith("../");

const isStoriesSpecifier = (specifier) => specifier.replace(/\.[jt]sx?$/, "").endsWith(".stories");

/*
 * Value imports only: a test may legitimately name the component's own type, so an import-graph
 * rule that counted `import type` would fire on a file that never renders anything.
 */
const collectSiblingComponentImports = (sourceFile) => {
    const names = new Set();

    for (const statement of sourceFile.statements) {
        if (!ts.isImportDeclaration(statement) || statement.importClause === undefined) {
            continue;
        }

        if (!ts.isStringLiteral(statement.moduleSpecifier)) {
            continue;
        }

        const specifier = statement.moduleSpecifier.text;
        if (!isRelativeSpecifier(specifier) || isStoriesSpecifier(specifier)) {
            continue;
        }

        const { importClause } = statement;
        if (importClause.isTypeOnly) {
            continue;
        }

        if (importClause.name) {
            names.add(importClause.name.text);
        }

        const { namedBindings } = importClause;
        if (namedBindings === undefined) {
            continue;
        }

        if (ts.isNamespaceImport(namedBindings)) {
            names.add(namedBindings.name.text);
            continue;
        }

        for (const element of namedBindings.elements) {
            if (!element.isTypeOnly) {
                names.add(element.name.text);
            }
        }
    }

    return names;
};

/** `<Foo>` and `<Foo.Bar>` both resolve to the leftmost identifier the import bound. */
const readTagRootName = (tagName) => {
    if (ts.isIdentifier(tagName)) {
        return tagName.text;
    }

    if (ts.isPropertyAccessExpression(tagName)) {
        let current = tagName;
        while (ts.isPropertyAccessExpression(current)) {
            current = current.expression;
        }
        return ts.isIdentifier(current) ? current.text : undefined;
    }

    return undefined;
};

export const findStoryOnlyRenderViolations = ({ source, relativePath }) => {
    if (isExemptRouteWrapper(relativePath)) {
        return [];
    }

    const sourceFile = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const siblingImports = collectSiblingComponentImports(sourceFile);
    const violations = [];

    const visit = (node) => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            const name = readTagRootName(node.tagName);

            if (name !== undefined && siblingImports.has(name)) {
                const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
                violations.push({ line: line + 1, name });
            }
        }

        ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return violations;
};

const scanFile = (relativePath) => {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const source = readFileSync(absolutePath, "utf8");
    return findStoryOnlyRenderViolations({ source, relativePath }).map((violation) => ({ ...violation, relativePath }));
};

const runCli = () => {
    const files = globRealFiles({
        patterns: ["src/**/*.test.tsx", "app/**/*.test.tsx"],
        cwd: repoRoot,
    });

    const violations = files
        .flatMap(scanFile)
        .sort((a, b) => a.relativePath.localeCompare(b.relativePath) || a.line - b.line);

    if (violations.length > 0) {
        console.error(
            "renders:check failed — a *.test.tsx renders a component imported from a sibling " +
                "module instead of a composed story, banned by " +
                "docs/adr/tech/0025-direct-composed-story-rendering.md. Add a named exported story " +
                "per prop combination in the component's *.stories.tsx and render that composed " +
                "story — never one composed story fed varying props, and never a render helper " +
                "declared in the test file, both of which the same record bans.\n",
        );
        for (const violation of violations) {
            console.error(`  ${violation.relativePath}:${String(violation.line)} — <${violation.name}>`);
        }
        process.exit(1);
    }

    console.log("renders:check passed — every *.test.tsx renders composed stories only.");
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
