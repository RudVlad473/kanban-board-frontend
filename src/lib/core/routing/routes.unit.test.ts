import { describe, expect, it } from "vitest";

import { boardDetail, isProtectedPath, isPublicPath, PROTECTED_PREFIXES, PUBLIC_PATHS, ROUTE } from "./routes";

describe("boardDetail", () => {
    it("builds the board list path followed by a separator and the supplied id", () => {
        // Arrange
        const boardId = "abc-123";

        // Act
        const result = boardDetail(boardId);

        // Assert
        expect(result).toBe(`${ROUTE.BOARDS}/abc-123`);
    });
});

describe("isProtectedPath", () => {
    /*
     * A parametrised loop over the path families (D-26y), covering the board list path, every
     * path beneath it, and the near-miss case — a path beginning with the same characters but
     * continuing without a separator must not be treated as protected.
     */
    const protectedCases: { path: string; expected: boolean; description: string }[] = [
        { path: ROUTE.BOARDS, expected: true, description: "the board list path itself" },
        { path: `${ROUTE.BOARDS}/some-board-id`, expected: true, description: "a path beneath the board list path" },
        {
            path: `${ROUTE.BOARDS}/some-board-id/nested`,
            expected: true,
            description: "a nested path beneath the board list path",
        },
        {
            path: "/boardsish",
            expected: false,
            description: "a near-miss path sharing the same characters without a separator",
        },
        { path: ROUTE.HOME, expected: false, description: "the landing path" },
        { path: ROUTE.SIGN_IN, expected: false, description: "the sign-in path" },
    ];

    for (const { path, expected, description } of protectedCases) {
        it(`returns ${String(expected)} for ${description} ("${path}")`, () => {
            // Arrange / Act
            const result = isProtectedPath(path);

            // Assert
            expect(result).toBe(expected);
        });
    }
});

describe("isPublicPath", () => {
    const publicCases: { path: string; expected: boolean; description: string }[] = [
        { path: ROUTE.HOME, expected: true, description: "the landing path" },
        { path: ROUTE.SIGN_IN, expected: true, description: "the sign-in path" },
        { path: ROUTE.SIGN_UP, expected: true, description: "the sign-up path" },
        { path: ROUTE.BOARDS, expected: false, description: "the board list path" },
        {
            path: `${ROUTE.SIGN_IN}/nested`,
            expected: false,
            description: "a path beneath a public path, since public matching is exact-only",
        },
    ];

    for (const { path, expected, description } of publicCases) {
        it(`returns ${String(expected)} for ${description} ("${path}")`, () => {
            // Arrange / Act
            const result = isPublicPath(path);

            // Assert
            expect(result).toBe(expected);
        });
    }
});

describe("declaration shape", () => {
    it("derives PROTECTED_PREFIXES and PUBLIC_PATHS from ROUTE members", () => {
        // Arrange / Act / Assert
        expect(PROTECTED_PREFIXES).toEqual([ROUTE.BOARDS]);
        expect(PUBLIC_PATHS).toEqual([ROUTE.HOME, ROUTE.SIGN_IN, ROUTE.SIGN_UP]);
    });
});
