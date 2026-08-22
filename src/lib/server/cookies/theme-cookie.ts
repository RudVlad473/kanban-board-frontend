import "server-only";

import { COOKIE, THEME_COOKIE_MAX_AGE_SECONDS } from "@/lib/core/cookies/cookie-registry";
import { isTheme, type Theme } from "@/lib/core/theme/theme";

import { createCookieClient } from "./cookie-client";

/**
 * The flash-avoidance mechanism the root layout relies on (`app/layout.tsx`). Client-writable by
 * design (T-01-35/T-02-10), so `decode` returning `null` for anything not shaped like a valid
 * `Theme` is the tamper boundary — see the threat model in 02.1-03-PLAN.md.
 */
export const themeCookie = createCookieClient<Theme>({
    name: COOKIE.THEME,
    decode: (raw) => (isTheme(raw) ? raw : null),
    encode: (theme) => theme,
    options: { httpOnly: false, maxAge: THEME_COOKIE_MAX_AGE_SECONDS },
});
