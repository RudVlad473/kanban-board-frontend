import "server-only";

/**
 * The name of the backend's own session cookie (Spring Session / JSESSIONID), confirmed directly
 * against live nonprod during planning (this plan's `<verified_backend_facts>`). Kept as a named
 * constant, not a literal repeated at each call site, so the one string never drifts.
 */
export const UPSTREAM_SESSION_COOKIE_NAME = "JSESSIONID";

/**
 * Reads the upstream credential out of a raw `Response`'s `Set-Cookie` headers. Deliberately uses
 * `response.headers.getSetCookie()` — the array form — rather than `headers.get("set-cookie")`,
 * whose single comma-joined string cannot be split safely: a cookie's own `Expires` attribute
 * contains a comma (`Expires=Tue, 18 Aug 2026 19:15:56 GMT`), so a naive comma-split would cut a
 * single `Set-Cookie` entry in two. Returns the raw cookie value only (no attributes), or `null`
 * when no pair with this name is present.
 */
export const extractUpstreamSessionId = (response: Response): string | null => {
    const setCookiePairs = response.headers.getSetCookie();

    for (const pair of setCookiePairs) {
        const [nameValue] = pair.split(";");
        const separatorIndex = nameValue.indexOf("=");

        if (separatorIndex === -1) {
            continue;
        }

        const name = nameValue.slice(0, separatorIndex).trim();
        if (name === UPSTREAM_SESSION_COOKIE_NAME) {
            return nameValue.slice(separatorIndex + 1).trim();
        }
    }

    return null;
};

/**
 * Builds the `Cookie` request-header value carrying the bridged credential back to the backend —
 * kept as a function (not an inline template at the call site) so the header shape appears in
 * exactly one place.
 */
export const toUpstreamCookieHeader = (jsessionId: string): string => `${UPSTREAM_SESSION_COOKIE_NAME}=${jsessionId}`;
