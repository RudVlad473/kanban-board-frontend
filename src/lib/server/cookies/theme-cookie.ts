import "server-only";

import { cookies } from "next/headers";

import { baseCookieOptions, COOKIE } from "@/lib/core/cookies/cookie-registry";
import { isTheme, type Theme } from "@/lib/core/theme/theme";

const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // outlives the session cookie's 7-day expiry

/**
 * Server-side theme cookie I/O — the flash-avoidance mechanism the root layout relies on
 * (`app/layout.tsx`). `read` returns `null` for anything not shaped like a valid `Theme`
 * (absent or tampered — this cookie is client-writable by design, see T-01-35/T-02-10).
 */
export const themeCookie = {
    read: async (): Promise<Theme | null> => {
        const cookieStore = await cookies();
        const value = cookieStore.get(COOKIE.THEME)?.value;
        return isTheme(value) ? value : null;
    },
    write: async (theme: Theme): Promise<void> => {
        const cookieStore = await cookies();
        cookieStore.set(COOKIE.THEME, theme, {
            ...baseCookieOptions(),
            httpOnly: false,
            maxAge: THEME_COOKIE_MAX_AGE_SECONDS,
        });
    },
    // Clears the theme cookie on sign-out (folded todo FT-01) — added here for plan 02-04.
    clear: async (): Promise<void> => {
        const cookieStore = await cookies();
        cookieStore.delete(COOKIE.THEME);
    },
};
