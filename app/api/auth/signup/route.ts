import "server-only";

import { externalApi } from "@/lib/api/server-client";
import { extractUpstreamSessionId } from "@/lib/api/session-cookie";
import { resolveDisplayName } from "@/lib/display-name";
import { isSessionPayload, session } from "@/lib/session";
import { signUpSchema, zodErrorToFieldErrors } from "@/lib/validation/auth-schemas";

/*
 * The contract still documents `POST /signup` as a bare 200 with no error schema (Finding 4,
 * 01-RESEARCH.md's round-3 addendum) — the real backend returns 201 + the full identity record,
 * confirmed directly against the live nonprod backend during planning (this plan's
 * `<verified_backend_facts>`). No schema exists for the email-already-registered case either
 * (01-UI-SPEC.md's Copywriting Contract) — this copy covers both the duplicate-email and
 * unknown-failure triggers without committing to either.
 */
const SIGN_UP_FAILURE_MESSAGE =
    "We couldn't create your account. If you already have one, try signing in instead, or try again in a moment.";

export const POST = async (request: Request): Promise<Response> => {
    const body: unknown = await request.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
        return Response.json({ errors: zodErrorToFieldErrors(parsed.error) }, { status: 400 });
    }

    const { data, error, response } = await externalApi.POST("/signup", { body: parsed.data });

    /*
     * The contract declares no error-response schema for this operation, so the generated type
     * claims `error` is always `undefined` — untrue at runtime for the already-registered-email
     * case (and any other non-2xx upstream response). Widened through `unknown` so the type-aware
     * lint tier checks the real runtime shape, not the contract's incomplete claim — the same
     * pattern signin/route.ts already uses.
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
        return Response.json({ message: SIGN_UP_FAILURE_MESSAGE }, { status: 409 });
    }

    /*
     * The session is built from the backend's own returned record — the identifier and theme are
     * the backend's, not values assembled from the submitted form. `isSessionPayload` only checks
     * `displayName` is a string, not that it's non-empty — an account created without a name
     * (the backend permits an absent one) would otherwise put a blank into the dashboard chrome on
     * every subsequent sign-in (GC-02), so `resolveDisplayName` still runs over the guarded
     * identity here, mirroring signin/route.ts.
     */
    await session.create({ ...identity, displayName: resolveDisplayName(identity), jsessionId });

    return Response.json({ ok: true }, { status: 200 });
};
