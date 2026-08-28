import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { globRealFiles } from "./glob-real-files.mjs";
import { ACTION_STUB_REGISTRY_SPECIFIER, serverActionStubPlugin } from "./vite-plugin-server-action-stub.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const plugin = serverActionStubPlugin({ rootDir: repoRoot });

const transform = ({ source, id }) => plugin.transform(source, id);

const idFor = (relativePath) => path.resolve(repoRoot, relativePath);

const ACTION_ID = idFor("src/features/boards/actions/create-column-action.ts");

const MINIMAL_ACTION_SOURCE = ['"use server";', "", "export const createColumnAction = async () => ({});"].join("\n");

/** Reports only syntactic diagnostics, which is what "the emitted module parses at all" means here. */
const syntaxErrorsIn = (code) =>
    ts.transpileModule(code, {
        reportDiagnostics: true,
        compilerOptions: { target: ts.ScriptTarget.Latest, module: ts.ModuleKind.ESNext },
    }).diagnostics;

describe("serverActionStubPlugin", () => {
    it("is a pre-enforced plugin, so its transform sees raw TypeScript source", () => {
        // Arrange, Act & Assert
        expect(plugin.name).toBe("server-action-stub");
        expect(plugin.enforce).toBe("pre");
    });

    describe("match conditions", () => {
        it("transforms a `use server` module under an /actions/ path with a .ts extension", () => {
            // Arrange & Act
            const result = transform({ source: MINIMAL_ACTION_SOURCE, id: ACTION_ID });

            // Assert
            expect(result?.code).toContain("createColumnAction");
        });

        it("accepts a single-quoted directive too", () => {
            // Arrange
            const source = MINIMAL_ACTION_SOURCE.replace('"use server"', "'use server'");

            // Act
            const result = transform({ source, id: ACTION_ID });

            // Assert
            expect(result?.code).toContain("createColumnAction");
        });

        it("leaves a module with no `use server` directive untouched", () => {
            // Arrange
            const source = "export const createColumnAction = async () => ({});";

            // Act & Assert
            expect(transform({ source, id: ACTION_ID })).toBeNull();
        });

        it("leaves a module outside an /actions/ path segment untouched", () => {
            // Arrange
            const id = idFor("src/features/boards/hooks/use-create-column.ts");

            // Act & Assert
            expect(transform({ source: MINIMAL_ACTION_SOURCE, id })).toBeNull();
        });

        it("leaves a non-TypeScript extension untouched", () => {
            // Arrange
            const id = idFor("src/features/boards/actions/create-column-action.js");

            // Act & Assert
            expect(transform({ source: MINIMAL_ACTION_SOURCE, id })).toBeNull();
        });

        it("leaves a `use server` module exporting no arrow function untouched", () => {
            // Arrange — nothing to stand in for, so emitting an empty recorder would only hide the module.
            const source = ['"use server";', "", "export type CreateColumnResult = { status: string };"].join("\n");

            // Act & Assert
            expect(transform({ source, id: ACTION_ID })).toBeNull();
        });
    });

    describe("module key", () => {
        it("is the source path relative to rootDir, forward-slashed", () => {
            // Arrange & Act
            const result = transform({ source: MINIMAL_ACTION_SOURCE, id: ACTION_ID });

            // Assert
            expect(result?.code).toContain('moduleKey: "src/features/boards/actions/create-column-action.ts"');
        });

        it("strips a Vite query suffix", () => {
            // Arrange
            const id = `${ACTION_ID}?t=1730000000000`;

            // Act
            const result = transform({ source: MINIMAL_ACTION_SOURCE, id });

            // Assert
            expect(result?.code).toContain('moduleKey: "src/features/boards/actions/create-column-action.ts"');
            expect(result?.code).not.toContain("?t=");
        });
    });

    describe("against this repository's real action modules", () => {
        const actionFiles = globRealFiles({ patterns: ["src/features/*/actions/*.ts"], cwd: repoRoot }).filter(
            (relativePath) => !relativePath.includes(".test."),
        );

        it("finds at least one real action module to check against", () => {
            // Arrange, Act & Assert — a silently empty glob would make the coupling gate below vacuous.
            expect(actionFiles.length).toBeGreaterThan(0);
        });

        it.each(actionFiles)("transforms %s into a recorder exporting at least one name", (relativePath) => {
            // Arrange
            const source = readFileSync(path.resolve(repoRoot, relativePath), "utf8");

            // Act
            const result = transform({ source, id: idFor(relativePath) });

            // Assert
            expect(result).not.toBeNull();
            expect(result.code).toContain(`import { registerActionStub } from "${ACTION_STUB_REGISTRY_SPECIFIER}"`);
            expect(result.code.match(/^export const /gm)?.length ?? 0).toBeGreaterThan(0);
        });
    });

    describe("round-trip against the real create-column-action.ts", () => {
        const source = readFileSync(
            path.resolve(repoRoot, "src/features/boards/actions/create-column-action.ts"),
            "utf8",
        );

        it("imports registerActionStub from the registry", () => {
            // Arrange & Act
            const result = transform({ source, id: ACTION_ID });

            // Assert
            expect(result.code).toContain(`import { registerActionStub } from "${ACTION_STUB_REGISTRY_SPECIFIER}"`);
        });

        it("exports a binding named after the action", () => {
            // Arrange & Act
            const result = transform({ source, id: ACTION_ID });

            // Assert
            expect(result.code).toMatch(/^export const createColumnAction = registerActionStub\(/m);
        });

        it("drops the module's exported result type, the recorded limit of the AST reader", () => {
            // Arrange & Act
            const result = transform({ source, id: ACTION_ID });

            // Assert — asserted rather than assumed, so a future value-import failure is diagnosable.
            expect(source).toContain("export type CreateColumnResult");
            expect(result.code).not.toContain("CreateColumnResult");
        });

        it("emits a module that parses", () => {
            // Arrange & Act
            const result = transform({ source, id: ACTION_ID });

            // Assert
            expect(syntaxErrorsIn(result.code)).toEqual([]);
        });
    });

    it("emits a parseable module for an action carrying extra exported non-function declarations", () => {
        /*
         * The backstop this plan names: the AST reader collects exported const arrow functions only,
         * so everything else must be dropped cleanly rather than emitted as a half-written statement.
         */
        const source = [
            '"use server";',
            "",
            "export type CreateColumnResult = { status: string };",
            "export const STUB_ID = 'stub-id';",
            "export const createColumnAction = async () => ({});",
            "export const renameColumnAction = async () => ({});",
        ].join("\n");

        // Act
        const result = transform({ source, id: ACTION_ID });

        // Assert
        expect(syntaxErrorsIn(result.code)).toEqual([]);
        expect(result.code).toContain("export const createColumnAction");
        expect(result.code).toContain("export const renameColumnAction");
        expect(result.code).not.toContain("STUB_ID");
    });
});
