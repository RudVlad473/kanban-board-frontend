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
 * A function, not a frozen constant — `NODE_ENV` must be read at call time, not at module load,
 * matching `session.ts`/`theme.ts`'s existing behavior. Returns a fresh object per call so one
 * caller's `{ ...baseCookieOptions(), httpOnly: true }` spread can never be mutated by another.
 */
export const baseCookieOptions = () => ({
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax" as const,
    path: "/",
});
