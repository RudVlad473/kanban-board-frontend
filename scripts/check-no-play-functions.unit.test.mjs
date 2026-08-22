import { describe, expect, it } from "vitest";

import { findPlayFunctionViolations } from "./check-no-play-functions.mjs";

describe("findPlayFunctionViolations", () => {
    it("detects a story object property named play", () => {
        // Arrange
        const source = [
            "export const Interactive: Story = {",
            "    play: async ({ canvasElement }) => {",
            "        // interaction assertions here",
            "    },",
            "};",
        ].join("\n");

        // Act
        const violations = findPlayFunctionViolations({ source });

        // Assert
        expect(violations).toEqual([{ line: 2 }]);
    });

    it("does not flag the word inside a comment or inside an identifier such as displayName", () => {
        // Arrange
        const source = [
            "// play: mentioned here only in prose, no property declared",
            "export const Default: Story = {",
            '    displayName: "play",',
            "};",
        ].join("\n");

        // Act
        const violations = findPlayFunctionViolations({ source });

        // Assert
        expect(violations).toEqual([]);
    });

    it("reports zero violations for a clean stories fixture", () => {
        // Arrange
        const source = [
            "import type { Meta, StoryObj } from '@storybook/nextjs-vite';",
            "",
            "const meta: Meta = { component: SomeComponent };",
            "export default meta;",
            "",
            "export const Default: StoryObj = {};",
        ].join("\n");

        // Act
        const violations = findPlayFunctionViolations({ source });

        // Assert
        expect(violations).toEqual([]);
    });
});
