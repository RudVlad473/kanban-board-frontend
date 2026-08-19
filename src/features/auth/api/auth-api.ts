import { bffApi } from "@/lib/api/bff-client";

/*
 * A thin typed wrapper over this app's own `/api/auth/signout` BFF Route Handler — never the
 * external contract's base URL, which the browser must never learn (ADR tech/0001). `bffApi` is
 * generated from docs/api/bff-openapi.json (pnpm bff-api:generate). Sign-in and sign-up moved off
 * this module and onto server functions (`@/features/auth/api/auth-actions`) in plan 01-33; this
 * file now covers only sign-out, which plan 01-34 migrates in turn.
 */

const extractMessage = (error: unknown): string | undefined => {
    if (typeof error !== "object" || error === null || !("message" in error)) {
        return undefined;
    }

    const { message } = error;
    return typeof message === "string" ? message : undefined;
};

export const postSignOut = async (): Promise<void> => {
    const { error } = await bffApi.POST("/api/auth/signout");

    /*
     * The BFF route declares no error response at all, so the generated type claims `error` is
     * always `undefined` — true today (the route only ever clears a cookie and returns 200), but
     * widened through `unknown` so a future failure path added there doesn't silently bypass this
     * check (same pattern server-client.ts's `upstreamError` uses).
     */
    const responseError: unknown = error;

    if (responseError !== undefined) {
        throw new Error(extractMessage(responseError) ?? "Sign-out failed.");
    }
};
