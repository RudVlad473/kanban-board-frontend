/*
 * Replaces the twelve hand-written `src/test-utils/*-action-storybook-stub.ts` modules and
 * `vitest.config.ts`'s `serverActionStubAlias` register (04-CONTEXT.md D-01): any `"use server"`
 * module becomes a generated recorder with the same export names, needing no file and no entry.
 */
import path from "node:path";

import ts from "typescript";

/** The runtime half, resolved Vite-root-absolutely so the emitted virtual module can reach it. */
export const ACTION_STUB_REGISTRY_SPECIFIER = "/src/test-utils/action-stub-registry.ts";

export const hasUseServerDirective = (source) => /^\s*(["'])use server\1/.test(source);

/*
 * Collects exported const arrow functions ONLY, so an exported type or const object is dropped from
 * the emitted module. Safe while no consumer value-imports anything else from an action module; the
 * moment one does, that import resolves to undefined rather than failing loudly (asserted by a test).
 */
export const readExportedFunctionNames = ({ source, filePath }) => {
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
    const names = [];

    for (const statement of sourceFile.statements) {
        if (!ts.isVariableStatement(statement)) {
            continue;
        }

        const isExported = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
        if (!isExported) {
            continue;
        }

        for (const declaration of statement.declarationList.declarations) {
            const initializer = declaration.initializer;
            const isArrowFunction = initializer !== undefined && ts.isArrowFunction(initializer);

            if (ts.isIdentifier(declaration.name) && isArrowFunction) {
                names.push(declaration.name.text);
            }
        }
    }

    return names;
};

/** Vite appends `?t=…`/`?import` suffixes to an id; the key is the bare repo-relative path. */
export const deriveModuleKey = ({ id, rootDir }) => path.relative(rootDir, id.split("?")[0]).replaceAll("\\", "/");

export const buildStubModule = ({ names, moduleKey }) =>
    [
        `import { registerActionStub } from ${JSON.stringify(ACTION_STUB_REGISTRY_SPECIFIER)};`,
        "",
        ...names.map(
            (name) =>
                `export const ${name} = registerActionStub({ moduleKey: ${JSON.stringify(moduleKey)}, exportName: ${JSON.stringify(name)} });`,
        ),
        "",
    ].join("\n");

/*
 * The `/actions/` path guard means an action placed outside an `actions/` folder is silently NOT
 * transformed. CONVENTIONS.md already requires that folder, and a test globs every real
 * `src/features/<domain>/actions/` module through this plugin so the coupling is checked, not assumed.
 */
export const serverActionStubPlugin = ({ rootDir }) => ({
    name: "server-action-stub",
    /*
     * `pre` is load-bearing twice: the hook sees raw TypeScript, which the AST reader needs, and it
     * orders ahead of @storybook/nextjs-vite's own transforms in the "storybook" project.
     */
    enforce: "pre",
    // eslint-disable-next-line no-restricted-syntax -- Vite calls `transform` positionally with (code, id); API-dictated arity, ADR tech/0016's carve-out.
    transform(source, id) {
        if (!id.includes("/actions/") || !/\.tsx?($|\?)/.test(id) || !hasUseServerDirective(source)) {
            return null;
        }

        const names = readExportedFunctionNames({ source, filePath: id });
        if (names.length === 0) {
            return null;
        }

        return { code: buildStubModule({ names, moduleKey: deriveModuleKey({ id, rootDir }) }), map: null };
    },
});
