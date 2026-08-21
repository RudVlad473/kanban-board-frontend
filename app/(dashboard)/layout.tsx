import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { PropsWithChildren } from "react";

import { Sidebar } from "@/components/layout/sidebar/sidebar";
import { SidebarSkeleton } from "@/components/layout/sidebar/sidebar-skeleton";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { loadBoards } from "@/features/boards/server/load-boards";
import { ThemeToggle } from "@/features/theme/components/theme-toggle";
import { ROUTE } from "@/lib/core/routing/routes";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { verifySession } from "@/lib/server/dal";

/*
 * Composition only, no business logic (CONVENTIONS.md's "app/ is routing only" rule) — awaits
 * `loadBoards()` (D-02: an RSC read, no client-side query) and maps its discriminated-union result
 * onto `Sidebar`'s plain `boards`/`loadFailed` props.
 */
const SidebarBoards = async () => {
    const result = await loadBoards();
    return <Sidebar boards={result.status === "ok" ? result.boards : []} loadFailed={result.status !== "ok"} />;
};

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
     * The session JWT's `theme` is a sign-in-time snapshot that a later toggle never re-mints
     * (see 01-14-SUMMARY.md); prefer the cookie so a reload reflects what actually persisted.
     */
    const cookieTheme = await themeCookie.read();
    const initialTheme = cookieTheme ?? identity.theme;

    return (
        <div className="flex min-h-full bg-bg-app">
            <Suspense fallback={<SidebarSkeleton />}>
                <SidebarBoards />
            </Suspense>

            <div className="flex min-w-0 flex-1 flex-col">
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
        </div>
    );
};

export default DashboardLayout;
