import type { SignInInput, SignUpInput } from "@/lib/validation/auth-schemas";

/*
 * Thin same-origin fetch wrappers over this app's own `/api/auth/...` BFF Route Handlers — never
 * the external contract's base URL, which the browser must never learn (ADR tech/0001). Both
 * routes' success bodies are a bare `{ ok: true }` (plan 01-11); every non-2xx response carries
 * `{ message: string }`, which is thrown here so a mutation hook's `onError` gets copy that
 * already matches UI-SPEC's Copywriting Contract without re-deriving it.
 */

const SIGN_UP_ENDPOINT = "/api/auth/signup";
const SIGN_IN_ENDPOINT = "/api/auth/signin";
const FALLBACK_ERROR_MESSAGE = "Something went wrong. Please try again.";

type SignAuthResponse = { ok: true };

const extractMessage = (body: unknown): string | undefined => {
    if (typeof body !== "object" || body === null || !("message" in body)) {
        return undefined;
    }

    const { message } = body;
    return typeof message === "string" ? message : undefined;
};

const postAuthRequest = async ({ url, body }: { url: string; body: unknown }): Promise<SignAuthResponse> => {
    const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });

    const responseBody: unknown = await response.json();

    if (!response.ok) {
        throw new Error(extractMessage(responseBody) ?? FALLBACK_ERROR_MESSAGE);
    }

    return responseBody as SignAuthResponse;
};

export const postSignUp = (input: SignUpInput): Promise<SignAuthResponse> =>
    postAuthRequest({ url: SIGN_UP_ENDPOINT, body: input });

export const postSignIn = (input: SignInInput): Promise<SignAuthResponse> =>
    postAuthRequest({ url: SIGN_IN_ENDPOINT, body: input });
