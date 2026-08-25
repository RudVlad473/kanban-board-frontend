"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { updateThemeAction } from "@/features/theme/actions/update-theme";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { buildClientCookieString, COOKIE, THEME_COOKIE_MAX_AGE_SECONDS } from "@/lib/core/cookies/cookie-registry";
import { THEME, type Theme } from "@/lib/core/theme/theme";

const FAILURE_MESSAGE = "Couldn't save your theme. Try again.";

const applyDocumentThemeClass = (theme: Theme): void => {
    document.documentElement.classList.toggle("dark", theme === THEME.DARK);
};

const writeThemeCookieClientSide = (theme: Theme): void => {
    document.cookie = buildClientCookieString({
        name: COOKIE.THEME,
        value: theme,
        maxAgeSeconds: THEME_COOKIE_MAX_AGE_SECONDS,
    });
};

type UseThemePreferenceArgs = {
    /**
     * The theme already resolved server-side — the signed-in session's own `theme` field, or the
     * theme cookie's value for an unauthenticated visitor. Never re-fetched by this hook; only
     * ever changed by its own `toggleTheme`.
     */
    initialTheme: Theme;
    /**
     * Whether a session currently exists. An unauthenticated toggle updates the cookie and the
     * document scope directly and never calls `updateThemeAction` — there is no account to
     * persist to yet, and calling the server function would only be refused with a 401.
     */
    isAuthenticated: boolean;
};

/**
 * Optimistic-apply-then-rollback theme mutation hook — the named reference shape later plans copy
 * (see docs/adr/tech/0019). Applies locally first, persists via `updateThemeAction` directly (no
 * fetch wrapper), and reverts both on failure; `retry: false` mirrors `QueryProvider`'s default.
 */
export const useThemePreference = ({ initialTheme, isAuthenticated }: UseThemePreferenceArgs) => {
    const [theme, setTheme] = useState<Theme>(initialTheme);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: updateThemeAction,
        retry: false,
    });

    const toggleTheme = (): void => {
        const previousTheme = theme;
        const nextTheme: Theme = previousTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK;

        /*
         * Optimistic: apply the new theme to the document root and local state first — the
         * persistence call (or, when unauthenticated, the cookie write) happens after, never
         * before.
         */
        setErrorMessage(null);
        setTheme(nextTheme);
        applyDocumentThemeClass(nextTheme);

        if (!isAuthenticated) {
            writeThemeCookieClientSide(nextTheme);
            return;
        }

        mutation.mutate(nextTheme, {
            onSuccess: (result) => {
                if (result.status === RESULT_STATUS.ERROR) {
                    setTheme(previousTheme);
                    applyDocumentThemeClass(previousTheme);
                    setErrorMessage(FAILURE_MESSAGE);
                }
            },
            onError: () => {
                setTheme(previousTheme);
                applyDocumentThemeClass(previousTheme);
                setErrorMessage(FAILURE_MESSAGE);
            },
        });
    };

    return { theme, toggleTheme, errorMessage };
};
