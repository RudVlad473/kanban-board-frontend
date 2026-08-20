import "server-only";

import { COOKIE } from "@/lib/core/cookies/cookie-registry";

/**
 * Parses the backend's own raw fetch `Response` — not this app's request/response, which is why
 * this can't use `next/headers`'s `cookies()` (T-02-08/T-02-09, GC-18).
 */
export const upstreamCookie = {
    /*
     * Uses `getSetCookie()` (array form), not the comma-joined `headers.get("set-cookie")`: a
     * cookie's own `Expires` attribute contains a comma, which would otherwise split one entry
     * into two.
     */
    extract: (response: Response): string | null => {
        const setCookiePairs = response.headers.getSetCookie();

        for (const pair of setCookiePairs) {
            const [nameValue] = pair.split(";");
            const separatorIndex = nameValue.indexOf("=");

            if (separatorIndex === -1) {
                continue;
            }

            const name = nameValue.slice(0, separatorIndex).trim();
            if (name === COOKIE.UPSTREAM_SESSION) {
                return nameValue.slice(separatorIndex + 1).trim();
            }
        }

        return null;
    },
    toHeader: (jsessionId: string): string => `${COOKIE.UPSTREAM_SESSION}=${jsessionId}`,
};
