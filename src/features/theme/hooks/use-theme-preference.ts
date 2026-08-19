"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { updateThemeAction } from "@/features/theme/actions";

/**
 * Duplicated from `src/lib/server/theme.ts`'s `Theme` — that module carries `import "server-only"`
 * and cannot be imported here even as a type-only import risk (this project was already bitten
 * once by a "use server"/client-boundary assumption in 01-33; not repeating that here). Structurally
 * identical to `updateThemeAction`'s own parameter type, so no compatibility is lost.
 */
export type Theme = "LIGHT" | "DARK";

/*
 * The same literal `src/lib/server/theme.ts`'s `THEME_COOKIE` names, duplicated for the same
 * reason as the `Theme` type above — that module is server-only and cannot be imported into this
 * client hook. Used only by the unauthenticated path below, which writes the cookie itself
 * because it never calls `updateThemeAction` (there is no session to persist against yet). The
 * cookie is deliberately non-httpOnly (T-01-35), so a direct client-side write is a legitimate
 * mechanism, not a workaround.
 */
const THEME_COOKIE_NAME = "theme";
const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const FAILURE_MESSAGE = "Couldn't save your theme. Try again.";

const applyDocumentThemeClass = (theme: Theme): void => {
    document.documentElement.classList.toggle("dark", theme === "DARK");
};

const writeThemeCookieClientSide = (theme: Theme): void => {
    document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${String(THEME_COOKIE_MAX_AGE_SECONDS)}; samesite=lax`;
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
 * The theme mutation hook: owns the optimistic toggle (document root class + local state applied
 * first), issues the persistence call second via `updateThemeAction` (Task 1) directly — no
 * fetch wrapper, since the mutation dials the domain's own server function, not an HTTP endpoint
 * of this app's own — and reverts both on failure. `retry: false` mirrors `QueryProvider`'s own
 * default (already set globally), restated here since this hook is that default's first real
 * mutation consumer.
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
        const nextTheme: Theme = previousTheme === "DARK" ? "LIGHT" : "DARK";

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
                if (result.status === "error") {
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
