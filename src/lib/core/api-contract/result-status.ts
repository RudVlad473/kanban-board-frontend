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
} as const;

export type ResultStatus = (typeof RESULT_STATUS)[keyof typeof RESULT_STATUS];
