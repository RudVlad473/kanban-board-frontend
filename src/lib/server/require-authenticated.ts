import "server-only";

import { redirect } from "next/navigation";

import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { ROUTE } from "@/lib/core/routing/routes";

/** Any of this app's discriminated results — the read functions and the Server Actions alike. */
type StatusResult = { status: ResultStatus };

/** The same result with its `UNAUTHENTICATED` arm gone, which is what the redirect below buys. */
type AuthenticatedResult<TResult extends StatusResult> = Exclude<
    TResult,
    { status: typeof RESULT_STATUS.UNAUTHENTICATED }
>;

/**
 * Send an expired session to sign-in, and hand back the result without its `UNAUTHENTICATED` arm.
 *
 * A plain function, not a `use*` hook: every caller is an async Server Component, where `redirect()`
 * is an ordinary call and no hook may run at all. Callers therefore write
 * `const result = requireAuthenticated(await fetchBoards())` and go straight to the branches that
 * remain — the narrowing is the point, not the two saved lines.
 */
export const requireAuthenticated = <TResult extends StatusResult>(result: TResult): AuthenticatedResult<TResult> => {
    if (result.status === RESULT_STATUS.UNAUTHENTICATED) {
        redirect(ROUTE.SIGN_IN);
    }

    /*
     * The assertion is unavoidable rather than lazy: a discriminant check narrows a concrete union
     * but never the generic `TResult` it was instantiated from, so TypeScript still sees the full
     * union here. `redirect()` returns `never`, so the excluded arm genuinely cannot reach this line.
     */
    return result as AuthenticatedResult<TResult>;
};
