import { PROBLEM_CODE, type ProblemCode } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/** The refusal branches that carry no payload beyond their own name — the whole point (T-02-61). */
export type UpstreamFailureStatus =
    | typeof RESULT_STATUS.UNAUTHENTICATED
    | typeof RESULT_STATUS.CONFLICT
    | typeof RESULT_STATUS.DUPLICATE
    | typeof RESULT_STATUS.NOT_FOUND
    | typeof RESULT_STATUS.ERROR;

/**
 * The backend codes a write can be refused with that have something distinct to tell the user.
 * Every other code falls through to `ERROR`, because "try again" is genuinely all there is to say.
 */
const UPSTREAM_CODE_TO_STATUS: Partial<Record<ProblemCode, UpstreamFailureStatus>> = {
    [PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT]: RESULT_STATUS.CONFLICT,
    [PROBLEM_CODE.DUPLICATE_RESOURCE]: RESULT_STATUS.DUPLICATE,
    [PROBLEM_CODE.UNAUTHENTICATED]: RESULT_STATUS.UNAUTHENTICATED,
    /*
     * One branch for both 403 and 404, so a caller cannot probe which ids exist (see
     * result-status.ts). `ENTITY_NOT_FOUND` joins `ACCESS_DENIED` here for the identical reason —
     * a double-submit delete (04-BACKEND-FACTS.md T6) must read the same as a forbidden id (T-04-42).
     */
    [PROBLEM_CODE.ACCESS_DENIED]: RESULT_STATUS.NOT_FOUND,
    [PROBLEM_CODE.ENTITY_NOT_FOUND]: RESULT_STATUS.NOT_FOUND,
};

/**
 * Resolves an upstream problem code to one of this app's own result discriminants — the single
 * declaration every write path shares, so create and rename cannot drift apart on what a 409 means.
 * Takes `undefined` directly, since `parseProblemDetail` returns null for anything it cannot read.
 */
export const mapProblemCodeToStatus = (code: ProblemCode | undefined): UpstreamFailureStatus =>
    (code === undefined ? undefined : UPSTREAM_CODE_TO_STATUS[code]) ?? RESULT_STATUS.ERROR;
