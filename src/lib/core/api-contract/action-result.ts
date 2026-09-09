// Covered by: nothing to test — a type alias only, no runtime behavior

import type { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * The refusals an action opts into, on top of the three every one of them can return. Narrower than
 * `UpstreamFailureStatus` (`map-problem-code.ts`) by exactly the two that are never optional.
 */
export type ActionRefusalStatus =
    typeof RESULT_STATUS.CONFLICT | typeof RESULT_STATUS.DUPLICATE | typeof RESULT_STATUS.NOT_FOUND;

/**
 * One mutating Server Action's own result: the success payload it returns, plus the refusals it can
 * be answered with — this project's own discriminants only, so no upstream response text reaches a
 * caller's toast (T-02-61). `TSuccess` left at `unknown` means success carries nothing.
 */
export type ActionResult<TSuccess = unknown, TRefusal extends ActionRefusalStatus = never> =
    | ({ status: typeof RESULT_STATUS.SUCCESS } & TSuccess)
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.ERROR }
    | (TRefusal extends ActionRefusalStatus ? { status: TRefusal } : never);
