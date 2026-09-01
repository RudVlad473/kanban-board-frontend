import { z } from "zod";

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
 *
 * `errors` catches to `undefined` rather than failing the parse. Every caller branches on `code`;
 * letting a malformed side-channel map discard the whole problem would turn a specific backend
 * error into a generic INTERNAL_ERROR at exactly the moment the specific one matters.
 */
const problemDetailSchema = z.object({
    type: z.string(),
    title: z.string(),
    status: z.number(),
    detail: z.string(),
    instance: z.string(),
    code: z.enum(PROBLEM_CODE),
    errors: z.record(z.string(), z.string()).optional().catch(undefined),
});

export type ProblemDetail = z.infer<typeof problemDetailSchema>;

/**
 * Runtime guard for an unverified value claiming to be a `ProblemDetail` — every failure mode
 * returns `null` rather than throwing. A half-populated value (e.g. an unrecognised `code`) is
 * never returned.
 */
export const parseProblemDetail = (value: unknown): ProblemDetail | null => {
    const parsed = problemDetailSchema.safeParse(value);

    return parsed.success ? parsed.data : null;
};
