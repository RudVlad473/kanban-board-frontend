import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import { ROUTE } from "@/lib/core/routing/routes";
import { verifySession } from "@/lib/server/dal";
import { readThemeCookie } from "@/lib/server/theme";

/*
 * The authoritative check (RESEARCH.md Security Domain, T-01-05) — `proxy.ts`'s guard is an
 * optimisation only, and this layout does not assume it already ran. Calling `verifySession()`
 * here itself is what keeps this route group closed even if the guard were disabled entirely
 * (the CVE-2025-29927 proxy-bypass class).
 */
const DashboardLayout = async ({ children }: PropsWithChildren) => {
    const identity = await verifySession();

    if (!identity) {
        redirect(ROUTE.SIGN_IN);
    }

    /*
     * The session JWT's own `theme` field is a snapshot taken at sign-in time — `updateThemeAction`
     * (plan 01-14) never re-mints the session, it only writes the separate theme cookie, so a
     * plain reload after toggling would otherwise show the toggle's control reverted to the
     * stale sign-in-time value even though the account's real theme (and the root layout's own
     * `dark` scope, which reads the same cookie) is already correct. Preferring the cookie here
     * keeps the toggle's initial position in sync with what actually persisted; falling back to
     * `identity.theme` covers the one case with no cookie yet — a fresh sign-in on a browser that
     * has never toggled here before.
     */
    const cookieTheme = await readThemeCookie();
    const initialTheme = cookieTheme ?? identity.theme;

    return (
        <div className="flex min-h-full flex-col bg-bg-app">
            <header className="flex items-center justify-between border-b border-border-default bg-bg-surface px-6 py-4">
                <span className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary">
                    {identity.displayName}
                </span>

                <div className="flex items-center gap-4">
                    <ThemeToggle initialTheme={initialTheme} isAuthenticated />

                    <SignOutButton />
                </div>
            </header>

            <main className="flex flex-1 flex-col">{children}</main>
        </div>
    );
};

export default DashboardLayout;
