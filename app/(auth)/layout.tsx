import type { PropsWithChildren } from "react";

import { ThemeToggle } from "@/features/theme/components/theme-toggle/theme-toggle";
import { THEME } from "@/lib/core/theme/theme";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";

/*
 * Kept thin per CONVENTIONS.md's "app/ is routing only" rule — only resolves the theme cookie for
 * the toggle's initial value (see 01-12-SUMMARY.md, 01-14-SUMMARY.md). `isAuthenticated={false}`:
 * a pre-session visitor's toggle updates the cookie/document scope directly, no endpoint call.
 */
const AuthLayout = async ({ children }: PropsWithChildren) => {
    /* No stored preference resolves to light — matches the pre-hydration default `app/layout.tsx` applies when the cookie is absent (no `dark` class added). */
    const theme = (await themeCookie.read()) ?? THEME.LIGHT;

    return (
        <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-12 bg-bg-app px-4">
            {children}

            <ThemeToggle initialTheme={theme} isAuthenticated={false} />
        </div>
    );
};

export default AuthLayout;
