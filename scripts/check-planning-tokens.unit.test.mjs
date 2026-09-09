import { describe, expect, it } from "vitest";

import { findBareTokens, isScannedSource } from "./check-planning-tokens.mjs";

describe("findBareTokens", () => {
    it("reports a bare decision id and the line it sits on", () => {
        // Arrange
        const source = ["const a = 1;", "", "/* D-11: the URL changes rather than the render. */"].join("\n");

        // Act
        const found = findBareTokens(source);

        // Assert
        expect(found).toEqual([{ line: 3, tokens: ["D-11"] }]);
    });

    it("exempts a comment that names the document defining the id", () => {
        // Arrange, Act, Assert
        expect(findBareTokens("/* 04-CONTEXT.md D-14 forbids the cross-feature import. */")).toEqual([]);
        expect(findBareTokens("/* D-14 forbids the cross-feature import. */")).toHaveLength(1);
    });

    it("leaves the id families that already resolve to one thing", () => {
        /*
         * Arrange, Act, Assert
         * `T-02-51` carries its phase inside the token and each requirement id is defined once in
         * ROADMAP.md, so neither is ambiguous the way a per-phase decision id is.
         */
        expect(findBareTokens("/* T-02-51 and BOARD-02 and TASK-04 and SYNC-01. */")).toEqual([]);
    });

    it("reads a suffixed id and de-duplicates repeats within one comment", () => {
        // Arrange, Act, Assert
        expect(findBareTokens("/* D-02a, and D-02a again, plus GC-17. */")).toEqual([
            { line: 1, tokens: ["D-02a", "GC-17"] },
        ]);
    });

    it("ignores an id outside a comment, where it is data rather than a reference", () => {
        // Arrange, Act, Assert
        expect(findBareTokens('const label = "D-11";')).toEqual([]);
    });
});

describe("isScannedSource", () => {
    it("scans source and gate scripts but never its own file", () => {
        // Arrange, Act, Assert
        expect(isScannedSource("src/a/thing.ts")).toBe(true);
        expect(isScannedSource("eslint.config.mjs")).toBe(true);
        expect(isScannedSource("docs/adr/tech/0030.md")).toBe(false);
        expect(isScannedSource("scripts/check-planning-tokens.mjs")).toBe(false);
    });
});
