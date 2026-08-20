import type { PropsWithChildren } from "react";

import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import { THEME } from "@/lib/core/theme/theme";
import { readThemeCookie } from "@/lib/server/theme";

/** No stored preference resolves to light — matches the pre-hydration default `app/layout.tsx` applies when the cookie is absent (no `dark` class added). */
const DEFAULT_THEME = THEME.LIGHT;

/*
 * Both auth screens centre their single AuthCard on the dominant app background — kept thin per
 * CONVENTIONS.md's "app/ is routing only" rule; no business logic lives here beyond resolving the
 * theme cookie for the toggle's initial value. `gap-12` matches UI-SPEC's own `space-12` token —
 * "space between the auth card and the theme-toggle footer". A visitor here has no session yet
 * (`ThemeToggle`'s `isAuthenticated={false}` — the toggle updates the cookie and document scope
 * directly, without calling the endpoint, so a visitor can set their theme before signing in).
 */
const AuthLayout = async ({ children }: PropsWithChildren) => {
    const theme = (await readThemeCookie()) ?? DEFAULT_THEME;

    return (
        <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-12 bg-bg-app px-4">
            {children}

            <ThemeToggle initialTheme={theme} isAuthenticated={false} />
        </div>
    );
};

export default AuthLayout;
