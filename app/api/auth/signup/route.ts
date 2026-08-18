import "server-only";

import { externalApi } from "@/lib/api/server-client";
import { resolveDisplayName } from "@/lib/display-name";
import { session } from "@/lib/session";
import { signUpSchema, zodErrorToFieldErrors } from "@/lib/validation/auth-schemas";

/*
 * `POST /signup`'s only documented response is a bare 200 returning a string, with no schema for
 * the email-already-registered case (01-UI-SPEC.md's Copywriting Contract) — this copy covers
 * both the duplicate-email and unknown-failure triggers without committing to either.
 */
const SIGN_UP_FAILURE_MESSAGE =
    "We couldn't create your account. If you already have one, try signing in instead, or try again in a moment.";

/*
 * New accounts start on the LIGHT theme — `POST /signup`'s response is a bare id string, not the
 * full identity shape, so the session for a brand-new account is assembled from the validated
 * request body plus that default rather than a second round-trip to `/signin`.
 */
const DEFAULT_NEW_ACCOUNT_THEME = "LIGHT";

export const POST = async (request: Request): Promise<Response> => {
    const body: unknown = await request.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
        return Response.json({ errors: zodErrorToFieldErrors(parsed.error) }, { status: 400 });
    }

    const { data, error } = await externalApi.POST("/signup", {
        body: parsed.data,
        parseAs: "text",
    });

    /*
     * The contract declares no error-response schema for this operation, so the generated type
     * claims `error` is always `undefined` — untrue at runtime for the already-registered-email
     * case (and any other non-2xx upstream response). Widened through `unknown` so the type-aware
     * lint tier checks the real runtime shape, not the contract's incomplete claim.
     */
    const upstreamError: unknown = error;

    if (upstreamError !== undefined || typeof data !== "string") {
        return Response.json({ message: SIGN_UP_FAILURE_MESSAGE }, { status: 409 });
    }

    /*
     * The fallback is resolved only here, assembling the session payload — the request forwarded
     * upstream a few lines above carries `parsed.data` exactly as parsed, with no name substituted,
     * since the backend permits an absent name and storing one the user never chose would be wrong
     * (GC-02).
     */
    await session.create({
        id: data,
        email: parsed.data.email,
        displayName: resolveDisplayName(parsed.data),
        theme: DEFAULT_NEW_ACCOUNT_THEME,
    });

    return Response.json({ ok: true }, { status: 200 });
};
