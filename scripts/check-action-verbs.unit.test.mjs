import { describe, expect, it } from "vitest";

import { ALLOWED_ACTION_VERBS, findActionNameViolations, findStubSeamViolations } from "./check-action-verbs.mjs";

/** Every case drives the pure entry point, so no case touches the real tree. */
describe("findActionNameViolations", () => {
    it("accepts a conforming action whose export mirrors its file name", () => {
        // Arrange
        const relativePath = "src/features/boards/actions/rename-column-action.ts";
        const source = "export const renameColumnAction = async () => {};";

        // Act
        const violations = findActionNameViolations({ relativePath, source });

        // Assert
        expect(violations).toEqual([]);
    });

    it("flags a verb outside the allowed set", () => {
        // Arrange
        const relativePath = "src/features/tasks/actions/archive-task-action.ts";
        const source = "export const archiveTaskAction = async () => {};";

        // Act
        const violations = findActionNameViolations({ relativePath, source });

        // Assert
        expect(violations).toHaveLength(1);
        expect(violations[0].reason).toContain("archive");
    });

    it("flags a file name that does not end in -action, and stops there", () => {
        // Arrange
        const relativePath = "src/features/boards/actions/rename-column.ts";
        const source = "export const renameColumn = async () => {};";

        // Act
        const violations = findActionNameViolations({ relativePath, source });

        // Assert
        expect(violations).toEqual([{ relativePath, reason: "file name does not end in `-action`" }]);
    });

    it("flags an export whose name drifts from the file name", () => {
        // Arrange
        const relativePath = "src/features/boards/actions/delete-column-action.ts";
        const source = "export const removeColumnAction = async () => {};";

        // Act
        const violations = findActionNameViolations({ relativePath, source });

        // Assert
        expect(violations).toHaveLength(1);
        expect(violations[0].reason).toContain("deleteColumnAction");
    });

    it("admits every verb the closed set names", () => {
        // Arrange
        const sources = ALLOWED_ACTION_VERBS.map((verb) => ({
            relativePath: `src/features/boards/actions/${verb}-thing-action.ts`,
            source: `export const ${verb}ThingAction = async () => {};`,
        }));

        // Act
        const violations = sources.flatMap(findActionNameViolations);

        // Assert
        expect(violations).toEqual([]);
    });
});

/**
 * Phase 4 success criterion 8's absence property. Every case drives the pure entry point, so no
 * case touches the real tree.
 */
describe("findStubSeamViolations", () => {
    it("accepts a test-utils tree and a config carrying neither a double nor a register", () => {
        // Arrange
        const testUtilPaths = ["src/test-utils/action-stub-registry.ts", "src/test-utils/server-only-stub.ts"];
        const vitestConfigSource = 'const alias = [{ find: "@", replacement: "./src" }];';

        // Act
        const violations = findStubSeamViolations({ testUtilPaths, vitestConfigSource });

        // Assert
        expect(violations).toEqual([]);
    });

    it("flags a hand-written Server Action double reappearing under src/test-utils/", () => {
        // Arrange
        const testUtilPaths = ["src/test-utils/create-column-action-storybook-stub.ts"];

        // Act
        const violations = findStubSeamViolations({ testUtilPaths, vitestConfigSource: "" });

        // Assert
        expect(violations).toHaveLength(1);
        expect(violations[0].relativePath).toBe("src/test-utils/create-column-action-storybook-stub.ts");
        expect(violations[0].reason).toContain("double");
    });

    it("leaves an unrelated stub module alone — only the double's own suffix is banned", () => {
        // Arrange
        const testUtilPaths = ["src/test-utils/server-only-stub.ts"];

        // Act
        const violations = findStubSeamViolations({ testUtilPaths, vitestConfigSource: "" });

        // Assert
        expect(violations).toEqual([]);
    });

    it("flags an alias register mapping Server Action specifiers in vitest.config.ts", () => {
        // Arrange
        const vitestConfigSource = [
            "const serverActionStubAlias = [",
            '    { find: "@/features/auth/actions/sign-in-action", replacement: "./src/test-utils/x.ts" },',
            "];",
        ].join("\n");

        // Act
        const violations = findStubSeamViolations({ testUtilPaths: [], vitestConfigSource });

        // Assert
        expect(violations.map(({ relativePath }) => relativePath)).toEqual(["vitest.config.ts", "vitest.config.ts"]);
        expect(violations.map(({ reason }) => reason).join(" ")).toContain("register");
    });

    it("still flags a register that renames itself to evade a name-only check", () => {
        // Arrange
        const vitestConfigSource =
            'const shims = [{ find: "@/features/tasks/actions/create-task-action", replacement: "./s.ts" }];';

        // Act
        const violations = findStubSeamViolations({ testUtilPaths: [], vitestConfigSource });

        // Assert
        expect(violations).toHaveLength(1);
        expect(violations[0].reason).toContain("Server Action");
    });

    it("ignores a register named only inside a comment", () => {
        // Arrange
        const vitestConfigSource = [
            "/*",
            " * The register was deleted in plan 04-10; the transform replaced it.",
            " */",
            "// It used to alias @/features/auth/actions/sign-in-action to a double.",
            'const alias = [{ find: "@", replacement: "./src" }];',
        ].join("\n");

        // Act
        const violations = findStubSeamViolations({ testUtilPaths: [], vitestConfigSource });

        // Assert
        expect(violations).toEqual([]);
    });
});
