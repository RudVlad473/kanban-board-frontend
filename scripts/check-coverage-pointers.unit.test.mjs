import { describe, expect, it } from "vitest";

import {
    findCoLocatedTests,
    isScannedSource,
    isTestPath,
    readHeaderComment,
    scanSources,
} from "./check-coverage-pointers.mjs";

/** Every fixture drives the pure entry points, so no case touches the real tree. */
const createTree = (files) => ({
    readSource: (relativePath) => files[relativePath] ?? "",
    exists: (relativePath) => Object.hasOwn(files, relativePath),
});

describe("findCoLocatedTests", () => {
    it("finds a sibling test through each suffix independently", () => {
        // Arrange
        const { exists } = createTree({
            "src/a/thing.ts": "",
            "src/a/thing.integration.test.ts": "",
        });

        // Act
        const found = findCoLocatedTests({ relativePath: "src/a/thing.ts", exists });

        // Assert — a multi-argument existence probe would report none because the other four are absent.
        expect(found).toEqual(["src/a/thing.integration.test.ts"]);
    });
});

describe("isTestPath", () => {
    it("treats a story as a fixture rather than a test", () => {
        // Arrange, Act, Assert
        expect(isTestPath("src/a/thing.stories.tsx")).toBe(false);
        expect(isTestPath("e2e/columns-reorder.e2e.spec.ts")).toBe(true);
        expect(isTestPath("src/a/thing.unit.test.ts")).toBe(true);
    });
});

describe("isScannedSource", () => {
    it("skips test infrastructure, stories, declaration files and the generated contract types", () => {
        // Arrange, Act, Assert
        expect(isScannedSource("src/test-utils/factories/board-full.ts")).toBe(false);
        expect(isScannedSource("src/a/thing.stories.tsx")).toBe(false);
        expect(isScannedSource("src/a/thing.d.ts")).toBe(false);
        expect(isScannedSource("src/lib/core/api-contract/generated-types.ts")).toBe(false);
        expect(isScannedSource("src/a/thing.ts")).toBe(true);
    });
});

describe("readHeaderComment", () => {
    it("reads past a directive prologue but stops at the first real statement", () => {
        // Arrange
        const source = [
            '"use client";',
            "",
            "// Covered by: `src/a/thing.test.tsx`",
            "",
            'import { x } from "y";',
            "",
            "// Covered by: `src/a/decoy.test.tsx`",
        ].join("\n");

        // Act
        const headerLines = readHeaderComment({ source });

        // Assert
        expect(headerLines).toEqual(["// Covered by: `src/a/thing.test.tsx`"]);
    });
});

describe("scanSources", () => {
    it("requires no pointer from a file that already has a co-located test", () => {
        // Arrange
        const { readSource, exists } = createTree({
            "src/a/thing.ts": 'import { x } from "y";',
            "src/a/thing.test.tsx": "",
        });

        // Act
        const violations = scanSources({ files: ["src/a/thing.ts"], readSource, exists });

        // Assert
        expect(violations).toEqual([]);
    });

    it("fails a file with no co-located test and no pointer", () => {
        // Arrange
        const { readSource, exists } = createTree({ "src/a/thing.ts": 'import { x } from "y";' });

        // Act
        const violations = scanSources({ files: ["src/a/thing.ts"], readSource, exists });

        // Assert
        expect(violations).toEqual([
            {
                relativePath: "src/a/thing.ts",
                kind: "missing",
                detail: "no `Covered by:` line in the file's header comment",
            },
        ]);
    });

    it("fails a pointer naming a path that does not exist", () => {
        // Arrange
        const { readSource, exists } = createTree({
            "src/a/thing.ts": "// Covered by: `src/a/gone.test.tsx`",
        });

        // Act
        const violations = scanSources({ files: ["src/a/thing.ts"], readSource, exists });

        // Assert
        expect(violations).toEqual([
            { relativePath: "src/a/thing.ts", kind: "unresolved", detail: "`src/a/gone.test.tsx` does not exist" },
        ]);
    });

    it("fails a pointer naming a real file that is not a test", () => {
        // Arrange
        const { readSource, exists } = createTree({
            "src/a/thing.ts": "// Covered by: `src/a/other.ts`",
            "src/a/other.ts": "",
        });

        // Act
        const violations = scanSources({ files: ["src/a/thing.ts"], readSource, exists });

        // Assert
        expect(violations).toEqual([
            { relativePath: "src/a/thing.ts", kind: "not-a-test", detail: "`src/a/other.ts` is not a test file" },
        ]);
    });

    it("accepts the documented nothing-to-test escape hatch", () => {
        // Arrange
        const { readSource, exists } = createTree({
            "src/a/thing.ts": "// Covered by: nothing to test — type declarations only, no runtime",
        });

        // Act
        const violations = scanSources({ files: ["src/a/thing.ts"], readSource, exists });

        // Assert
        expect(violations).toEqual([]);
    });

    it("fails a bare pointer and an escape hatch with no stated reason", () => {
        // Arrange
        const { readSource, exists } = createTree({
            "src/a/bare.ts": "// Covered by:",
            "src/a/reasonless.ts": "// Covered by: nothing to test",
        });

        // Act
        const violations = scanSources({ files: ["src/a/bare.ts", "src/a/reasonless.ts"], readSource, exists });

        // Assert
        expect(violations).toEqual([
            { relativePath: "src/a/bare.ts", kind: "empty", detail: "`Covered by:` names nothing" },
            {
                relativePath: "src/a/reasonless.ts",
                kind: "empty",
                detail: "the escape hatch needs a reason: `Covered by: nothing to test — <one clause why>`",
            },
        ]);
    });

    it("reports every violation in one run rather than stopping at the first", () => {
        // Arrange
        const { readSource, exists } = createTree({
            "src/a/one.ts": 'import { x } from "y";',
            "src/a/two.ts": "// Covered by: `src/a/gone.test.tsx`",
            "src/a/three.ts": "// Covered by: no backticks here",
            "src/a/four.ts": "// Covered by: `src/a/real.test.ts` and `src/a/gone.test.ts`",
            "src/a/real.test.ts": "",
        });

        // Act
        const violations = scanSources({
            files: ["src/a/one.ts", "src/a/two.ts", "src/a/three.ts", "src/a/four.ts"],
            readSource,
            exists,
        });

        // Assert — one per file, in path order, including the second of `four.ts`'s two pointers.
        expect(violations.map((violation) => [violation.relativePath, violation.kind])).toEqual([
            ["src/a/four.ts", "unresolved"],
            ["src/a/one.ts", "missing"],
            ["src/a/three.ts", "unquoted"],
            ["src/a/two.ts", "unresolved"],
        ]);
    });
});
