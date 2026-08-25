/**
 * The backend's problem-response shape (RFC 7807-flavoured) and its named error codes — hand-
 * authored because the generated OpenAPI contract declares no error schema at all (Finding 4,
 * 01-RESEARCH.md round-3 addendum). The codes are the exact set the backend emits (see 01-30-SUMMARY.md).
 */
export const PROBLEM_CODE = {
    VALIDATION_FAILED: "VALIDATION_FAILED",
    DUPLICATE_RESOURCE: "DUPLICATE_RESOURCE",
    DATA_INTEGRITY_VIOLATION: "DATA_INTEGRITY_VIOLATION",
    BAD_CREDENTIALS: "BAD_CREDENTIALS",
    UNAUTHENTICATED: "UNAUTHENTICATED",
    ACCESS_DENIED: "ACCESS_DENIED",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    /* The 409 a stale-version update is refused with, observed verbatim in 02-BACKEND-FACTS.md P3. */
    OPTIMISTIC_LOCK_CONFLICT: "OPTIMISTIC_LOCK_CONFLICT",
} as const;

export type ProblemCode = (typeof PROBLEM_CODE)[keyof typeof PROBLEM_CODE];

/**
 * The backend's problem-response body shape — every field its own error responses carry, verified
 * directly against the live backend (see 01-30-SUMMARY.md). `errors` is optional: only a
 * validation failure carries the per-field message map.
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
 * `isSessionPayload` (`session.ts`): every failure mode returns `null` rather than throwing.
 * A half-populated value (e.g. an unrecognised `code`) is never returned.
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
