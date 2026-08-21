import "server-only";

import { COOKIE } from "@/lib/core/cookies/cookie-registry";

/**
 * Deliberately NOT built on `createCookieClient` (D-20): this parses an upstream `fetch`
 * `Response`'s `Set-Cookie` header, never `next/headers`'s `cookies()` — see docs/adr/tech/0020
 * for the full reasoning.
 */
export const upstreamCookie = {
    // getSetCookie() (array form) avoids an Expires attribute's comma splitting one entry into two.
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
