import "server-only";

import { cookies } from "next/headers";

import { baseCookieOptions, COOKIE } from "@/lib/core/cookies/cookie-registry";
import { isTheme, type Theme } from "@/lib/core/theme/theme";

export type { Theme };

const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // a display preference should outlive the session cookie's 7-day expiry

/**
 * Server-side read of the theme cookie — the whole flash-avoidance mechanism the root layout
 * relies on: the resolved scope is present in the very first byte of HTML, so no client script
 * has to correct the page after paint. Returns `null` for anything not shaped like a valid
 * `Theme` (absent, or a tampered/stale value) rather than trusting an arbitrary string — this
 * cookie is client-writable by design (non-httpOnly), so a malformed value is an expected input,
 * not an error condition.
 */
export const readThemeCookie = async (): Promise<Theme | null> => {
    const cookieStore = await cookies();
    const value = cookieStore.get(COOKIE.THEME)?.value;
    return isTheme(value) ? value : null;
};

/**
 * Server-side write of the theme cookie, called by `updateThemeAction` (`src/features/theme/
 * actions.ts`) once the upstream persistence call succeeds, so the next server render resolves
 * the new scope before hydration.
 */
export const writeThemeCookie = async (theme: Theme): Promise<void> => {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE.THEME, theme, {
        ...baseCookieOptions(),
        httpOnly: false,
        maxAge: THEME_COOKIE_MAX_AGE_SECONDS,
    });
};
