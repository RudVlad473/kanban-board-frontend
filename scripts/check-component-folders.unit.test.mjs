import { describe, expect, it } from "vitest";

import { findFolderNameViolations } from "./check-component-folders.mjs";

/** Every case drives the pure entry point, so no case touches the real tree. */
describe("findFolderNameViolations", () => {
    it("flags a folder whose component is named something else", () => {
        // Arrange
        const folders = ["src/components/ui/skeleton"];

        // Act
        const violations = findFolderNameViolations({ folders, folderHasOwnComponent: () => false });

        // Assert
        expect(violations).toEqual([
            { relativePath: "src/components/ui/skeleton", expected: "src/components/ui/skeleton/skeleton.tsx" },
        ]);
    });

    it("accepts a folder holding a component named after it", () => {
        // Arrange
        const folders = ["src/components/ui/button"];

        // Act
        const violations = findFolderNameViolations({ folders, folderHasOwnComponent: () => true });

        // Assert
        expect(violations).toEqual([]);
    });

    it("skips a runner-generated screenshot directory shaped like a component folder", () => {
        // Arrange
        const folders = ["src/features/boards/components/board-view/__screenshots__"];

        // Act
        const violations = findFolderNameViolations({ folders, folderHasOwnComponent: () => false });

        // Assert
        expect(violations).toEqual([]);
    });

    it("reports every offending folder in one run rather than stopping at the first", () => {
        // Arrange
        const folders = ["src/components/ui/a", "src/components/ui/b"];

        // Act
        const violations = findFolderNameViolations({ folders, folderHasOwnComponent: () => false });

        // Assert
        expect(violations).toHaveLength(2);
    });
});
