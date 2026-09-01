// Covered by: `e2e/boards-list.e2e.spec.ts`
import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { PropsWithChildren } from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header/dashboard-header";
import { DashboardHeaderSkeleton } from "@/components/layout/dashboard-header-skeleton/dashboard-header-skeleton";
import { Sidebar } from "@/components/layout/sidebar/sidebar";
import { BoardList } from "@/features/boards/components/board-list/board-list";
import { BoardListSkeleton } from "@/features/boards/components/board-list-skeleton/board-list-skeleton";
import { dehydrateBoards } from "@/features/boards/server/dehydrate-boards";
import { ROUTE } from "@/lib/core/routing/routes";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { verifySession } from "@/lib/server/dal";

const SidebarBoards = async () => {
    const { state, boards, loadFailed } = await dehydrateBoards();

    return (
        <HydrationBoundary state={state}>
            <BoardList boards={boards} loadFailed={loadFailed} />
        </HydrationBoundary>
    );
};

/*
 * A second boundary beside `SidebarBoards`, so the header and the sidebar stream independently —
 * `fetchBoards`'s `cache` wrapper means both awaits share one upstream call rather than costing two.
 */
const HeaderBoards = async ({ displayName }: { displayName: string }) => {
    const { state, boards, loadFailed } = await dehydrateBoards();

    // A failed read has no board to title, and seeding the header's query with `[]` would poison it.
    if (loadFailed) {
        return <DashboardHeaderSkeleton displayName={displayName} />;
    }

    return (
        <HydrationBoundary state={state}>
            <DashboardHeader displayName={displayName} boards={boards} />
        </HydrationBoundary>
    );
};

/*
 * The authoritative check (T-01-05) — `proxy.ts`'s guard is optimisation only, not the
 * authoritative check, and this layout does not assume it already ran: calling `verifySession()`
 * here is what keeps this route group closed even if the guard were disabled (CVE-2025-29927; see docs/adr/tech/0019).
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
            <Sidebar initialTheme={initialTheme}>
                <Suspense fallback={<BoardListSkeleton />}>
                    <SidebarBoards />
                </Suspense>
            </Sidebar>

            {/* `h-dvh` (not `flex-1`) is what bounds the board area, so a column scrolls
                        internally instead of growing the page (mirrors the sidebar's own pinning). */}
            <div className="flex h-dvh min-w-0 flex-1 flex-col">
                {/* Chrome and controls paint immediately, only the board title waits on the read. */}
                <Suspense fallback={<DashboardHeaderSkeleton displayName={identity.displayName} />}>
                    <HeaderBoards displayName={identity.displayName} />
                </Suspense>

                <main className="flex min-h-0 flex-1 flex-col">{children}</main>
            </div>
        </div>
    );
};

export default DashboardLayout;
