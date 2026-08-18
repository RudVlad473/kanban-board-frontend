"use server";

import { redirect } from "next/navigation";

import { PROBLEM_CODE, parseProblemDetail, type ProblemCode } from "@/lib/api/problem-detail";
import { externalApi } from "@/lib/api/server-client";
import { extractUpstreamSessionId } from "@/lib/api/session-cookie";
import { resolveDisplayName } from "@/lib/display-name";
import { ROUTE } from "@/lib/routes";
import { isSessionPayload, session } from "@/lib/session";
import { signInSchema, signUpSchema, zodErrorToFieldErrors } from "@/lib/validation/auth-schemas";

/*
 * A wrong credential and an unknown email must return byte-identical responses (T-01-08, account
 * enumeration) — one fixed message regardless of which upstream failure caused it, so this
 * boundary can never leak which addresses have accounts even if the upstream API's own per-cause
 * status/body ever changed. Copy is 01-UI-SPEC.md's exact Copywriting Contract string for this
 * row — it names the credential type generically, it never carries the submitted value itself.
 * Carried across verbatim from app/api/auth/signin/route.ts, the Route Handler this replaces —
 * only the delivery mechanism changed, not this constant or its rationale. Reused for both a
 * validation failure and an upstream rejection: the message is a project-owned constant chosen by
 * the branch, never derived from the backend's own text or from which of the two failure kinds
 * actually occurred (T-01-55) — that distinction lives in the state's `code` field only.
 */
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

/*
 * The contract still documents `POST /signup` as a bare 200 with no error schema (Finding 4,
 * 01-RESEARCH.md's round-3 addendum) — the real backend returns 201 + the full identity record.
 * No schema exists for the email-already-registered case either (01-UI-SPEC.md's Copywriting
 * Contract) — this copy covers both the duplicate-email and unknown-failure triggers without
 * committing to either. Carried across verbatim from app/api/auth/signup/route.ts.
 */
const SIGN_UP_FAILURE_MESSAGE =
    "We couldn't create your account. If you already have one, try signing in instead, or try again in a moment.";

/**
 * The state both auth forms render, returned by `signInAction`/`signUpAction` through
 * `useActionState`. There is no success member: success redirects, so the form never renders one.
 * `fieldErrors` is optional — only a validation failure carries a per-field message map.
 */
export type AuthActionState =
    { status: "idle" } | { status: "error"; code: ProblemCode; message: string; fieldErrors?: Record<string, string> };

/** The initial value both forms and every story seed `useActionState` with. */
export const AUTH_ACTION_IDLE: AuthActionState = { status: "idle" };

/*
 * `useActionState`'s action-function contract fixes this exact two-positional-argument shape
 * (previous state, then `FormData`) — React itself invokes `signInAction(prevState, formData)`
 * positionally, and there is no way to collect a call *React makes* into one destructured object,
 * the same category of external-API-dictated arity ADR tech/0016 already carves out for an inline
 * callback or a mocked third-party interface (`cookies().set(name, value, options)`). This is
 * neither of those two literally, but the same rationale applies: the positional shape belongs to
 * React's Server Action calling convention, not to this project.
 */
// eslint-disable-next-line no-restricted-syntax -- React's useActionState calls this positionally (prevState, formData); the shape is dictated by that external API, not this project (ADR tech/0016 exemption)
export const signInAction = async (_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> => {
    const parsed = signInSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
    });

    if (!parsed.success) {
        return {
            status: "error",
            code: PROBLEM_CODE.VALIDATION_FAILED,
            message: INVALID_CREDENTIALS_MESSAGE,
            fieldErrors: zodErrorToFieldErrors(parsed.error),
        };
    }

    const { data, error, response } = await externalApi.POST("/signin", { body: parsed.data });

    /*
     * The contract declares no error-response schema for this operation at all, so the generated
     * type claims `error` is always `undefined` — untrue at runtime, since a real backend
     * returning a non-2xx status populates it. Widened through `unknown` so the type-aware lint
     * tier checks the real runtime shape, not the contract's incomplete claim.
     */
    const upstreamError: unknown = error;
    const identity: unknown = data;

    /*
     * A success response carrying no upstream credential (GC-18, T-01-50) is a failure, not a
     * degraded success — creating a session that cannot authenticate anything would leave the user
     * looking signed in while every subsequent call fails.
     */
    const jsessionId = extractUpstreamSessionId(response);

    if (upstreamError !== undefined || !isSessionPayload(identity) || !jsessionId) {
        /*
         * Per the real backend's own documentation (kanban-board-backend's docs/AUTH_FLOWS.md),
         * `/signin`'s 401 collapses an unknown email, a wrong password and a refused third
         * concurrent session into the exact same `BAD_CREDENTIALS` response — there is no
         * per-cause code to distinguish here, which is the anti-enumeration property T-01-54
         * mitigates. `parseProblemDetail` yields that code when the upstream error is well-formed;
         * a fallback keeps the state well-formed even when it isn't.
         */
        const problem = parseProblemDetail(upstreamError);
        return {
            status: "error",
            code: problem?.code ?? PROBLEM_CODE.INTERNAL_ERROR,
            message: INVALID_CREDENTIALS_MESSAGE,
        };
    }

    /*
     * `isSessionPayload` only checks `displayName` is a string, not that it's non-empty — an
     * account created without a name would otherwise put a blank into the dashboard chrome on
     * every subsequent sign-in (GC-02).
     */
    await session.create({ ...identity, displayName: resolveDisplayName(identity), jsessionId });

    /*
     * The redirect replaces the client-side router push-and-refresh this app's sign-in flow used
     * before plan 01-33's Server Actions migration: because it happens on the server, the freshly
     * written cookie is already present on the redirected request, so nothing needs to re-render
     * the tree by hand. Outside any `try` and never caught — the redirect signals itself by
     * throwing, and a `catch` that absorbed it would turn a working navigation into a silent
     * no-op.
     */
    redirect(ROUTE.BOARDS);
};

// eslint-disable-next-line no-restricted-syntax -- React's useActionState calls this positionally (prevState, formData); the shape is dictated by that external API, not this project (ADR tech/0016 exemption, see signInAction's identical comment above)
export const signUpAction = async (_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> => {
    const parsed = signUpSchema.safeParse({
        email: formData.get("email"),
        displayName: formData.get("displayName"),
        password: formData.get("password"),
    });

    if (!parsed.success) {
        return {
            status: "error",
            code: PROBLEM_CODE.VALIDATION_FAILED,
            message: SIGN_UP_FAILURE_MESSAGE,
            fieldErrors: zodErrorToFieldErrors(parsed.error),
        };
    }

    const { data, error, response } = await externalApi.POST("/signup", { body: parsed.data });

    /*
     * The contract declares no error-response schema for this operation, so the generated type
     * claims `error` is always `undefined` — untrue at runtime for the already-registered-email
     * case (and any other non-2xx upstream response). Widened through `unknown`, same pattern
     * signInAction above uses.
     */
    const upstreamError: unknown = error;
    const identity: unknown = data;

    /*
     * A success response carrying no upstream credential (GC-18, T-01-50) is a failure, not a
     * degraded success — creating a session that cannot authenticate anything would leave the user
     * looking signed in while every subsequent call fails.
     */
    const jsessionId = extractUpstreamSessionId(response);

    if (upstreamError !== undefined || !isSessionPayload(identity) || !jsessionId) {
        const problem = parseProblemDetail(upstreamError);
        return {
            status: "error",
            code: problem?.code ?? PROBLEM_CODE.INTERNAL_ERROR,
            message: SIGN_UP_FAILURE_MESSAGE,
        };
    }

    /*
     * The session is built from the backend's own returned record — the identifier and theme are
     * the backend's, not values assembled from the submitted form. `resolveDisplayName` still runs
     * over the guarded identity (GC-02), mirroring signInAction above.
     */
    await session.create({ ...identity, displayName: resolveDisplayName(identity), jsessionId });

    redirect(ROUTE.BOARDS);
};
