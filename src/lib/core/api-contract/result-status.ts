// Covered by: nothing to test — an enum-like constant table; a test could only restate its members

/**
 * The single declaration of every result/status discriminant this app produces (ADR tech/0012's
 * enum-like pattern). Every producer and consumer — Server Actions, RSC reads, hooks and Storybook
 * action stubs alike — imports these members instead of retyping the literal at its own call site.
 */
export const RESULT_STATUS = {
    SUCCESS: "SUCCESS",
    ERROR: "ERROR",
    /*
     * A different axis from `PROBLEM_CODE.UNAUTHENTICATED` (`problem-detail.ts`): that one is the
     * backend's own error code, this one is this app's own result branch. Neither derives from the
     * other and the two are never interchangeable.
     */
    UNAUTHENTICATED: "UNAUTHENTICATED",
    INVALID: "INVALID",
    IDLE: "IDLE",
    /*
     * "The caller may not see this resource" — deliberately one branch for both 404 and the 403
     * the backend actually answers a foreign board with (02-BACKEND-FACTS.md P7), so a caller
     * cannot use the distinction to probe which ids exist.
     */
    NOT_FOUND: "NOT_FOUND",
    /*
     * "The resource moved under you" — this app's own branch for the backend's
     * `PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT`, kept distinct from `ERROR` so SYNC-01 (Phase 4) has
     * something to hang reconciliation from without re-deriving it from an upstream code.
     */
    CONFLICT: "CONFLICT",
    /*
     * "That name is already taken" — the backend's `PROBLEM_CODE.DUPLICATE_RESOURCE`. Deliberately
     * NOT folded into `CONFLICT`: both arrive as a 409, but one is a stale version and the other is
     * a name clash, and only the second has anything actionable to tell the user.
     */
    DUPLICATE: "DUPLICATE",
} as const;

export type ResultStatus = (typeof RESULT_STATUS)[keyof typeof RESULT_STATUS];
