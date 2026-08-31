import { beforeEach, describe, expect, it, vi } from "vitest";

import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { ROUTE } from "@/lib/core/routing/routes";

/*
 * The real `redirect()` throws a `NEXT_REDIRECT` error only Next's own request machinery can catch,
 * so the shim keeps the throw (the `never` contract callers rely on) without the framework.
 */
const REDIRECT_THROW = new Error("NEXT_REDIRECT");
const redirect = vi.fn((): never => {
    throw REDIRECT_THROW;
});

// eslint-disable-next-line no-restricted-properties -- D-19 framework limitation: next/navigation's redirect() needs a Next request scope to throw its NEXT_REDIRECT digest, which Vitest has no way to provide
vi.mock("next/navigation", () => ({ redirect }));

const { requireAuthenticated } = await import("./require-authenticated");

describe("requireAuthenticated", () => {
    beforeEach(() => {
        redirect.mockClear();
    });

    it("returns a non-UNAUTHENTICATED result untouched", () => {
        // Arrange
        const result = { status: RESULT_STATUS.SUCCESS, boards: [] } as const;

        // Act
        const authenticated = requireAuthenticated(result);

        // Assert
        expect(authenticated).toBe(result);
        expect(redirect).not.toHaveBeenCalled();
    });

    it("redirects an UNAUTHENTICATED result to sign-in instead of returning it", () => {
        // Arrange
        const result = { status: RESULT_STATUS.UNAUTHENTICATED } as const;

        // Act / Assert
        expect(() => requireAuthenticated(result)).toThrow(REDIRECT_THROW);
        expect(redirect).toHaveBeenCalledWith(ROUTE.SIGN_IN);
    });
});
