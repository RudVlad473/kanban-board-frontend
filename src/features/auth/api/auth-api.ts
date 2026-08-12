import { bffApi } from "@/lib/api/bff-client";
import type { SignInInput, SignUpInput } from "@/lib/validation/auth-schemas";

/*
 * Thin typed wrappers over this app's own `/api/auth/...` BFF Route Handlers — never the external
 * contract's base URL, which the browser must never learn (ADR tech/0001). `bffApi` is generated
 * from docs/api/bff-openapi.json (pnpm bff-api:generate), itself derived from the same Zod schemas
 * these Route Handlers validate against, so the request shape here and the server's can't drift
 * apart. Every non-2xx response's `message` (when present) is thrown so a mutation hook's `onError`
 * gets copy that already matches UI-SPEC's Copywriting Contract without re-deriving it.
 */

const FALLBACK_ERROR_MESSAGE = "Something went wrong. Please try again.";

type SignAuthResponse = { ok: true };

const extractMessage = (error: unknown): string | undefined => {
    if (typeof error !== "object" || error === null || !("message" in error)) {
        return undefined;
    }

    const { message } = error;
    return typeof message === "string" ? message : undefined;
};

export const postSignUp = async (input: SignUpInput): Promise<SignAuthResponse> => {
    const { data, error } = await bffApi.POST("/api/auth/signup", { body: input });

    if (error !== undefined) {
        throw new Error(extractMessage(error) ?? FALLBACK_ERROR_MESSAGE);
    }

    return data;
};

export const postSignIn = async (input: SignInInput): Promise<SignAuthResponse> => {
    const { data, error } = await bffApi.POST("/api/auth/signin", { body: input });

    if (error !== undefined) {
        throw new Error(extractMessage(error) ?? FALLBACK_ERROR_MESSAGE);
    }

    return data;
};

export const postSignOut = async (): Promise<void> => {
    const { error } = await bffApi.POST("/api/auth/signout");

    /*
     * The BFF route declares no error response at all, so the generated type claims `error` is
     * always `undefined` — true today (the route only ever clears a cookie and returns 200), but
     * widened through `unknown` so a future failure path added there doesn't silently bypass this
     * check (same pattern as app/api/auth/signin/route.ts's `upstreamError`).
     */
    const responseError: unknown = error;

    if (responseError !== undefined) {
        throw new Error(extractMessage(responseError) ?? "Sign-out failed.");
    }
};
