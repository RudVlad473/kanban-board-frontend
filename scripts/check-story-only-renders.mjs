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

/*
 * Ten suites predate this gate and violate it. Migrating them is tracked follow-up work, not
 * forgiveness: each number is a ratchet ceiling, the CLI prints the whole carve-out on every run,
 * and docs/adr/tech/0025's Enforcement section carries the dated exemption and what unwinds it.
 */
export const MIGRATION_EXEMPTIONS = new Map([
    ["src/components/layout/error-fallback/error-fallback.test.tsx", 2],
    ["src/components/ui/button/button.test.tsx", 15],
    ["src/components/ui/checkbox/checkbox.test.tsx", 12],
    ["src/components/ui/dropdown/dropdown.test.tsx", 34],
    ["src/components/ui/icon-button/icon-button.test.tsx", 8],
    ["src/components/ui/menu/menu.test.tsx", 11],
    ["src/components/ui/modal/modal.test.tsx", 17],
    ["src/components/ui/switch/switch.test.tsx", 6],
    ["src/components/ui/text-field/text-field.test.tsx", 15],
    ["src/components/ui/toast/toast.test.tsx", 1],
]);

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

/*
 * The second half of docs/adr/tech/0025's rule. `findStoryOnlyRenderViolations` above sees only
 * "rendered the raw component"; this sees "rendered a composed story but re-configured it", which
 * reaches the same banned end through a binding no import graph names.
 */
const collectComposedStoryBindings = (sourceFile) => {
    const names = new Set();

    const seedFromComposeStories = (node) => {
        if (
            ts.isVariableDeclaration(node) &&
            node.initializer !== undefined &&
            ts.isCallExpression(node.initializer) &&
            ts.isIdentifier(node.initializer.expression) &&
            node.initializer.expression.text === "composeStories" &&
            ts.isObjectBindingPattern(node.name)
        ) {
            for (const element of node.name.elements) {
                if (ts.isIdentifier(element.name)) {
                    names.add(element.name.text);
                }
            }
        }

        ts.forEachChild(node, seedFromComposeStories);
    };

    seedFromComposeStories(sourceFile);

    /*
     * Widening repeats until stable, so an alias declared above its source still resolves and so
     * does a chain of them.
     */
    let grew = true;
    while (grew) {
        grew = false;

        const remember = (identifier) => {
            if (!names.has(identifier.text)) {
                names.add(identifier.text);
                grew = true;
            }
        };

        const isKnownStory = (node) => node !== undefined && ts.isIdentifier(node) && names.has(node.text);

        const widen = (node) => {
            /* `const Story = Expanded` — a plain alias. */
            if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isKnownStory(node.initializer)) {
                remember(node.name);
            }

            /* `{ story: Story = Expanded }` — the destructured default a render helper takes. */
            if (ts.isBindingElement(node) && ts.isIdentifier(node.name) && isKnownStory(node.initializer)) {
                remember(node.name);
            }

            /* `({ story: Story }: { story: typeof Expanded })` — the same input, typed not defaulted. */
            if (
                ts.isParameter(node) &&
                ts.isObjectBindingPattern(node.name) &&
                node.type !== undefined &&
                ts.isTypeLiteralNode(node.type)
            ) {
                for (const element of node.name.elements) {
                    const propertyName = element.propertyName ?? element.name;
                    if (!ts.isIdentifier(propertyName) || !ts.isIdentifier(element.name)) {
                        continue;
                    }

                    const member = node.type.members.find(
                        (candidate) =>
                            ts.isPropertySignature(candidate) &&
                            candidate.name !== undefined &&
                            ts.isIdentifier(candidate.name) &&
                            candidate.name.text === propertyName.text,
                    );

                    if (
                        member?.type !== undefined &&
                        ts.isTypeQueryNode(member.type) &&
                        ts.isIdentifier(member.type.exprName) &&
                        names.has(member.type.exprName.text)
                    ) {
                        remember(element.name);
                    }
                }
            }

            ts.forEachChild(node, widen);
        };

        widen(sourceFile);
    }

    return names;
};

const readAttributeLabel = (property) =>
    property.name !== undefined && ts.isIdentifier(property.name) ? property.name.text : "{...spread}";

/** Whitespace-only JSX text is what a multi-line `<Story>\n</Story>` leaves behind, not a child. */
const hasMeaningfulChildren = (children) =>
    children.some((child) => !ts.isJsxText(child) || child.text.trim().length > 0);

export const findStoryPropOverrideViolations = ({ source, relativePath }) => {
    const sourceFile = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const storyBindings = collectComposedStoryBindings(sourceFile);
    const violations = [];

    const record = ({ opening, props }) => {
        const name = readTagRootName(opening.tagName);
        if (name === undefined || !storyBindings.has(name) || props.length === 0) {
            return;
        }

        const { line } = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile));
        violations.push({ line: line + 1, name, props });
    };

    const visit = (node) => {
        if (ts.isJsxSelfClosingElement(node)) {
            record({ opening: node, props: node.attributes.properties.map(readAttributeLabel) });
        }

        /*
         * `<Story>{children}</Story>` re-configures the story's `children` arg with no attribute to
         * show for it, so the children are read as a prop rather than only the attribute list.
         */
        if (ts.isJsxElement(node)) {
            const attributes = node.openingElement.attributes.properties.map(readAttributeLabel);
            const props = hasMeaningfulChildren(node.children) ? [...attributes, "children"] : attributes;
            record({ opening: node.openingElement, props });
        }

        ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return violations;
};

const countByFile = (violations) => {
    const counts = new Map();

    for (const violation of violations) {
        counts.set(violation.relativePath, (counts.get(violation.relativePath) ?? 0) + 1);
    }

    return counts;
};

/*
 * Splits the raw finder output against the exemption ledger. An exempt file may only improve:
 * exceeding its ceiling blocks, and reaching zero blocks too, so a finished migration cannot leave
 * a dead entry behind claiming coverage that is no longer carved out.
 */
export const classifyViolations = ({ violations, exemptions = MIGRATION_EXEMPTIONS }) => {
    const counts = countByFile(violations);

    const blocking = violations.filter(({ relativePath }) => !exemptions.has(relativePath));
    const tracked = [];
    const regressions = [];
    const stale = [];

    for (const [relativePath, ceiling] of exemptions) {
        const count = counts.get(relativePath) ?? 0;

        if (count > ceiling) {
            regressions.push({ relativePath, count, ceiling });
        } else if (count === 0) {
            stale.push({ relativePath, count, ceiling });
        } else {
            tracked.push({ relativePath, count, ceiling });
        }
    }

    return { blocking, tracked, regressions, stale };
};

const scanFile = (relativePath) => {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const source = readFileSync(absolutePath, "utf8");
    return findStoryOnlyRenderViolations({ source, relativePath }).map((violation) => ({ ...violation, relativePath }));
};

const scanFileForPropOverrides = (relativePath) => {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const source = readFileSync(absolutePath, "utf8");
    return findStoryPropOverrideViolations({ source, relativePath }).map((violation) => ({
        ...violation,
        relativePath,
    }));
};

/*
 * Says only what docs/adr/tech/0025 says. An earlier wording also claimed every render helper
 * declared in a test file was banned; the record bans re-configuring a story, so a zero-argument
 * alias for one composed story (`sign-in-form.test.tsx`) was never a violation.
 */
const FIX_GUIDANCE =
    "Add a named exported story per prop combination in the component's *.stories.tsx and render " +
    "that composed story — never one composed story fed varying props, whether those props are " +
    "written at the call site or funnelled through a helper.";

/** Printed on every run, pass or fail: a carve-out nobody can see is indistinguishable from coverage. */
const reportExemptions = ({ tracked }) => {
    if (tracked.length === 0) {
        return;
    }

    const total = tracked.reduce((sum, { count }) => sum + count, 0);
    console.log(
        `renders:check — ${String(tracked.length)} suite(s) carry a tracked docs/adr/tech/0025 ` +
            `exemption covering ${String(total)} direct render(s), pending the migration deferred by ` +
            "plan 02-15 (.planning/phases/02-board-management/deferred-items.md). These do NOT fail " +
            "the build; each count is a ceiling that may only fall.",
    );
    for (const { relativePath, count, ceiling } of tracked) {
        const drift = count < ceiling ? ` (improved from ${String(ceiling)} — lower the ceiling)` : "";
        console.log(`  exempt: ${relativePath} — ${String(count)} direct render(s)${drift}`);
    }
};

const runCli = () => {
    const files = globRealFiles({
        patterns: ["src/**/*.test.tsx", "app/**/*.test.tsx"],
        cwd: repoRoot,
    });

    const violations = files
        .flatMap(scanFile)
        .sort((a, b) => a.relativePath.localeCompare(b.relativePath) || a.line - b.line);

    const { blocking, tracked, regressions, stale } = classifyViolations({ violations });

    /*
     * Deliberately outside the exemption ledger: those ceilings count direct renders, so folding a
     * second violation class into them would move every count and trip the ratchet on ten suites
     * that never changed.
     */
    const propOverrides = files
        .flatMap(scanFileForPropOverrides)
        .sort((a, b) => a.relativePath.localeCompare(b.relativePath) || a.line - b.line);

    reportExemptions({ tracked });

    if (blocking.length === 0 && regressions.length === 0 && stale.length === 0 && propOverrides.length === 0) {
        console.log("renders:check passed — every non-exempt *.test.tsx renders composed stories only.");
        return;
    }

    if (propOverrides.length > 0) {
        console.error(
            "\nrenders:check failed — a *.test.tsx passes props to a composed story instead of " +
                "rendering one already configured in the stories file, banned by " +
                `docs/adr/tech/0025-direct-composed-story-rendering.md. ${FIX_GUIDANCE}\n`,
        );
        for (const violation of propOverrides) {
            console.error(
                `  ${violation.relativePath}:${String(violation.line)} — <${violation.name} ${violation.props.join(" ")}>`,
            );
        }
    }

    if (blocking.length > 0) {
        console.error(
            "\nrenders:check failed — a *.test.tsx renders a component imported from a sibling " +
                "module instead of a composed story, banned by " +
                `docs/adr/tech/0025-direct-composed-story-rendering.md. ${FIX_GUIDANCE}\n`,
        );
        for (const violation of blocking) {
            console.error(`  ${violation.relativePath}:${String(violation.line)} — <${violation.name}>`);
        }
    }

    for (const { relativePath, count, ceiling } of regressions) {
        console.error(
            `\nrenders:check failed — ${relativePath} added direct renders on top of its tracked ` +
                `exemption (${String(count)} now, ceiling ${String(ceiling)}). The exemption is a ` +
                `ratchet: an exempt suite may only shrink. ${FIX_GUIDANCE}`,
        );
    }

    for (const { relativePath, ceiling } of stale) {
        console.error(
            `\nrenders:check failed — ${relativePath} is listed in MIGRATION_EXEMPTIONS at ` +
                `${String(ceiling)} but now has none. Delete its entry here and its row in ` +
                "docs/adr/tech/0025's exemption table, so the ledger never overstates the carve-out.",
        );
    }

    process.exit(1);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
