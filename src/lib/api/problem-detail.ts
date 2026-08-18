/**
 * The backend's problem-response shape (RFC 7807-flavoured) and its named error codes — hand-
 * authored because the regenerated contract (`docs/api/kanban-board-openapi.json`) still declares
 * no error schema at all (Finding 4, 01-RESEARCH.md's round-3 addendum). The seven codes below are
 * the exact set the backend actually emits: the first six read directly from the backend
 * repository's own `docs/AUTH_FLOWS.md`, the seventh (`INTERNAL_ERROR`) observed directly against
 * the live nonprod backend during planning (see this plan's `<verified_backend_facts>`).
 */
export const PROBLEM_CODE = {
    VALIDATION_FAILED: "VALIDATION_FAILED",
    DUPLICATE_RESOURCE: "DUPLICATE_RESOURCE",
    DATA_INTEGRITY_VIOLATION: "DATA_INTEGRITY_VIOLATION",
    BAD_CREDENTIALS: "BAD_CREDENTIALS",
    UNAUTHENTICATED: "UNAUTHENTICATED",
    ACCESS_DENIED: "ACCESS_DENIED",
    INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ProblemCode = (typeof PROBLEM_CODE)[keyof typeof PROBLEM_CODE];

/**
 * The backend's problem-response body shape — every field the backend's own error responses
 * carry, per this plan's `<verified_backend_facts>` (a `401` on a bad `/signin` attempt was
 * observed carrying exactly this shape). `errors` is optional: only a validation failure carries
 * the per-field message map.
 */
export type ProblemDetail = {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance: string;
    code: ProblemCode;
    errors?: Record<string, string>;
};

const PROBLEM_CODES: readonly string[] = Object.values(PROBLEM_CODE);

const isProblemCode = (value: unknown): value is ProblemCode =>
    typeof value === "string" && PROBLEM_CODES.includes(value);

/**
 * Runtime guard for an unverified value claiming to be a `ProblemDetail` — shaped like
 * `isSessionPayload` (`src/lib/session.ts`): every failure mode returns `null` rather than
 * throwing, so no caller can mistake a rejection for a transient error. Rejects (returns `null`
 * for) anything that is not a well-formed problem response, including an object whose `code` is
 * not a member of `PROBLEM_CODE` — a half-populated value is never returned.
 */
export const parseProblemDetail = (value: unknown): ProblemDetail | null => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null;
    }

    const candidate = value as Record<string, unknown>;

    if (
        typeof candidate.type !== "string" ||
        typeof candidate.title !== "string" ||
        typeof candidate.status !== "number" ||
        typeof candidate.detail !== "string" ||
        typeof candidate.instance !== "string" ||
        !isProblemCode(candidate.code)
    ) {
        return null;
    }

    const problemDetail: ProblemDetail = {
        type: candidate.type,
        title: candidate.title,
        status: candidate.status,
        detail: candidate.detail,
        instance: candidate.instance,
        code: candidate.code,
    };

    if (typeof candidate.errors === "object" && candidate.errors !== null && !Array.isArray(candidate.errors)) {
        problemDetail.errors = candidate.errors as Record<string, string>;
    }

    return problemDetail;
};
