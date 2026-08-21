import { describe, expect, it } from "vitest";

import { findLongCommentRuns, MAX_PROSE_LINES } from "./check-comment-length.mjs";

describe("findLongCommentRuns", () => {
    it("reports a violation naming the start line and run length for a block over the limit", () => {
        // Arrange
        const source = ["/**", " * one", " * two", " * three", " * four", " */", "export const a = 1;"].join("\n");

        // Act
        const violations = findLongCommentRuns({ source, max: MAX_PROSE_LINES });

        // Assert
        expect(violations).toEqual([{ startLine: 1, length: 4 }]);
    });

    it("reports nothing when the longest comment prose run is exactly the limit", () => {
        // Arrange
        const source = ["/**", " * one", " * two", " * three", " */", "export const a = 1;"].join("\n");

        // Act
        const violations = findLongCommentRuns({ source, max: MAX_PROSE_LINES });

        // Assert
        expect(violations).toEqual([]);
    });

    it("does not count block-comment delimiter lines or bare * continuation lines toward run length", () => {
        /*
         * Arrange — spacer "*" lines separate two 2-line prose paragraphs inside one block (4 prose
         * lines total), proving delimiters/spacers neither count nor break the run.
         */
        const source = ["/**", " * one", " * two", " *", " * three", " * four", " */", "export const a = 1;"].join(
            "\n",
        );

        // Act
        const violations = findLongCommentRuns({ source, max: MAX_PROSE_LINES });

        // Assert
        expect(violations).toEqual([{ startLine: 1, length: 4 }]);
    });

    it("ends a run at a blank line, so two separate 3-line comments are both compliant", () => {
        // Arrange
        const source = [
            "/**",
            " * one",
            " * two",
            " * three",
            " */",
            "",
            "/**",
            " * four",
            " * five",
            " * six",
            " */",
        ].join("\n");

        // Act
        const violations = findLongCommentRuns({ source, max: MAX_PROSE_LINES });

        // Assert
        expect(violations).toEqual([]);
    });

    it("skips a run immediately preceded by a comment-length-exempt: marker line", () => {
        // Arrange
        const source = [
            "// comment-length-exempt: full historical rationale intentionally kept inline",
            "/**",
            " * one",
            " * two",
            " * three",
            " * four",
            " * five",
            " */",
            "export const a = 1;",
        ].join("\n");

        // Act
        const violations = findLongCommentRuns({ source, max: MAX_PROSE_LINES });

        // Assert
        expect(violations).toEqual([]);
    });

    it("still reports a violation when the exempt marker does not immediately precede the run", () => {
        // Arrange — a blank line sits between the marker and the block, so it does not apply.
        const source = [
            "// comment-length-exempt: this marker is too far away to count",
            "",
            "/**",
            " * one",
            " * two",
            " * three",
            " * four",
            " */",
            "export const a = 1;",
        ].join("\n");

        // Act
        const violations = findLongCommentRuns({ source, max: MAX_PROSE_LINES });

        // Assert
        expect(violations).toEqual([{ startLine: 3, length: 4 }]);
    });

    it("exits with 0 violations for a file with no comments at all", () => {
        // Arrange
        const source = "export const a = 1;\nexport const b = 2;\n";

        // Act
        const violations = findLongCommentRuns({ source, max: MAX_PROSE_LINES });

        // Assert
        expect(violations).toEqual([]);
    });

    it("finds a 26-prose-line offender in a synthetic block", () => {
        /*
         * A real-repo fixture (text-field.tsx's own 26-line block) previously stood in here, but
         * D-22's sweep (02.1-11..14) drove the whole repo to zero violations by design — asserting
         * against live file content would make this test regress every time the retrofit works.
         */

        // Arrange
        const prose = Array.from({ length: 26 }, (_, index) => ` * line ${String(index)}`);
        const source = ["/**", ...prose, " */", "export const a = 1;"].join("\n");

        // Act
        const violations = findLongCommentRuns({ source, max: MAX_PROSE_LINES });

        // Assert
        expect(violations.some((violation) => violation.length >= 26)).toBe(true);
    });
});
