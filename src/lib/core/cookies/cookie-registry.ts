/**
 * The single declaration of every cookie name this app sets or reads (PC-02), plus the option
 * fields duplicated verbatim across `session.ts`/`theme.ts` today. Pure `lib/core/` module,
 * importable from both server and client code — values are non-secret cookie names and flags.
 */
export const COOKIE = {
    SESSION: "session",
    THEME: "theme",
    UPSTREAM_SESSION: "JSESSIONID",
} as const;

export type CookieName = (typeof COOKIE)[keyof typeof COOKIE];

/**
 * Outlives the session cookie's 7-day expiry. The single declaration both the server-side
 * `themeCookie` client and the client-side unauthenticated write path import from.
 */
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * A function, not a frozen constant — `NODE_ENV` must be read at call time, not at module load,
 * matching `session.ts`/`theme.ts`'s existing behavior. Returns a fresh object per call so one
 * caller's `{ ...createBaseCookieOptions(), httpOnly: true }` spread can never be mutated by another.
 */
export const createBaseCookieOptions = () => ({
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax" as const,
    path: "/",
});

/**
 * The `document.cookie`-string counterpart to `createBaseCookieOptions()`, for the rare
 * client-side write a Server Action/RSC can't reach (e.g. an unauthenticated visitor toggling
 * theme). Reuses the same secure/sameSite/path policy so the two write paths can never drift.
 */
export const buildClientCookieString = ({
    name,
    value,
    maxAgeSeconds,
}: {
    name: CookieName;
    value: string;
    maxAgeSeconds: number;
}): string => {
    const { secure, sameSite, path } = createBaseCookieOptions();
    return `${name}=${value}; path=${path}; max-age=${String(maxAgeSeconds)}; samesite=${sameSite}${secure ? "; secure" : ""}`;
};
