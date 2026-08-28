import { describe, expect, it } from "vitest";

import { ALLOWED_ACTION_VERBS, findActionNameViolations } from "./check-action-verbs.mjs";

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
