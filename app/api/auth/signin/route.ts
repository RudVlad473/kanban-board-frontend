import "server-only";

import { externalApi } from "@/lib/api/server-client";
import { resolveDisplayName } from "@/lib/display-name";
import { isSessionPayload, session } from "@/lib/session";
import { signInSchema, zodErrorToFieldErrors } from "@/lib/validation/auth-schemas";

/*
 * A wrong credential and an unknown email must return byte-identical responses (T-01-08, account
 * enumeration) — one fixed status and message regardless of which upstream failure caused it,
 * so this BFF boundary can never leak which addresses have accounts even if the upstream API's
 * own per-cause status/body ever changed. Copy is 01-UI-SPEC.md's exact Copywriting Contract
 * string for this row — it names the credential type generically, it never carries the
 * submitted value itself.
 */
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

export const POST = async (request: Request): Promise<Response> => {
    const body: unknown = await request.json();
    const parsed = signInSchema.safeParse(body);

    if (!parsed.success) {
        return Response.json({ errors: zodErrorToFieldErrors(parsed.error) }, { status: 400 });
    }

    const { data, error } = await externalApi.POST("/signin", { body: parsed.data });

    /*
     * The contract declares no error-response schema for this operation at all, so the generated
     * type claims `error` is always `undefined` — untrue at runtime, since the mock (and any real
     * backend returning a non-2xx status) populates it. `POST /signin`'s success response is
     * similarly a bare 200 with no body; the Task 1 checkpoint decision (01-10-SUMMARY.md) fills
     * that gap with the full identity shape at runtime. Both are widened through `unknown` so the
     * type-aware lint tier checks the real runtime shape, not the contract's incomplete claim
     * (same pattern as src/lib/mocks/handlers.test.ts).
     */
    const upstreamError: unknown = error;
    const identity: unknown = data;

    if (upstreamError !== undefined || !isSessionPayload(identity)) {
        return Response.json({ message: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
    }

    /*
     * `isSessionPayload` only checks `displayName` is a string, not that it's non-empty — an
     * account created without a name would otherwise put a blank into the dashboard chrome on
     * every subsequent sign-in (GC-02).
     */
    await session.create({ ...identity, displayName: resolveDisplayName(identity) });

    return Response.json({ ok: true }, { status: 200 });
};
