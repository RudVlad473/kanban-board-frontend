import { describe, expect, it } from "vitest";

import { findQueryKeyViolations } from "./check-query-keys.mjs";

describe("findQueryKeyViolations", () => {
    it("flags a plural board-key array literal", () => {
        // Arrange
        const source = ['export const KEY = ["boards"] as const;'].join("\n");

        // Act
        const violations = findQueryKeyViolations({ source });

        // Assert
        expect(violations).toEqual([{ line: 1 }]);
    });

    it("flags a singular board-key array literal followed by an identifier", () => {
        // Arrange
        const source = ['const key = ["board", boardId];'].join("\n");

        // Act
        const violations = findQueryKeyViolations({ source });

        // Assert
        expect(violations).toEqual([{ line: 1 }]);
    });

    it("does not flag the literal when it appears only inside a line comment", () => {
        // Arrange
        const source = ['// setQueryDefaults is registered against ["board"]', "const x = 1;"].join("\n");

        // Act
        const violations = findQueryKeyViolations({ source });

        // Assert
        expect(violations).toEqual([]);
    });

    it("does not flag the literal inside a block comment, and still reports a real violation after it", () => {
        // Arrange
        const source = [
            "/*",
            ' * Explains why the entry lives under ["board"] rather than a feature folder.',
            " */",
            'const real = ["boards"];',
        ].join("\n");

        // Act
        const violations = findQueryKeyViolations({ source });

        // Assert — the block comment contributes no violation, and the real one keeps its own line number.
        expect(violations).toEqual([{ line: 4 }]);
    });

    it("records whatever it does with an argv-shaped array (e2e/seed.ts:52's shape) — out of scope by glob, not by this function", () => {
        // Arrange
        const source = ['const argv = ["board", "--jsession", session];'].join("\n");

        // Act
        const violations = findQueryKeyViolations({ source });

        /*
         * Assert — same shape as the singular-key case above, so this function reports it too;
         * SEARCH_GLOBS excludes e2e/ entirely, which is what actually keeps this out of scope.
         */
        expect(violations).toEqual([{ line: 1 }]);
    });

    it("does not flag QUERY_KEY imported and spread", () => {
        // Arrange
        const source = [
            'import { QUERY_KEY } from "@/lib/core/query-keys/query-keys";',
            "",
            "const key = [...QUERY_KEY.BOARD, boardId];",
        ].join("\n");

        // Act
        const violations = findQueryKeyViolations({ source });

        // Assert
        expect(violations).toEqual([]);
    });
});
