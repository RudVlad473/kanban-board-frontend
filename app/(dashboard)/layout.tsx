// Covered by: `e2e/boards-list.e2e.spec.ts`
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { PropsWithChildren } from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header/dashboard-header";
import { Sidebar } from "@/components/layout/sidebar/sidebar";
import { BoardList } from "@/features/boards/components/board-list/board-list";
import { BoardListSkeleton } from "@/features/boards/components/board-list-skeleton/board-list-skeleton";
import { RenameOverrideProvider } from "@/features/boards/components/rename-override-provider/rename-override-provider";
import { fetchBoards } from "@/features/boards/server/fetch-boards";
import { AddTaskProvider } from "@/features/tasks/components/add-task-provider/add-task-provider";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { ROUTE } from "@/lib/core/routing/routes";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { verifySession } from "@/lib/server/dal";

/*
 * Composition only, no business logic (CONVENTIONS.md's "app/ is routing only" rule) — awaits
 * `fetchBoards()` (D-02: an RSC read, no client-side query) and maps its discriminated-union result
 * onto `BoardList`'s plain `boards`/`loadFailed` props.
 */
const SidebarBoards = async () => {
    const result = await fetchBoards();
    return (
        <BoardList
            boards={result.status === RESULT_STATUS.SUCCESS ? result.boards : []}
            loadFailed={result.status !== RESULT_STATUS.SUCCESS}
        />
    );
};

/*
 * A second boundary beside `SidebarBoards`, so the header and the sidebar stream independently —
 * `fetchBoards`'s `cache` wrapper means both awaits share one upstream call rather than costing two.
 */
const HeaderBoards = async ({ displayName }: { displayName: string }) => {
    const result = await fetchBoards();
    return (
        <DashboardHeader
            displayName={displayName}
            boards={result.status === RESULT_STATUS.SUCCESS ? result.boards : []}
        />
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

    /*
     * Both providers wrap both Suspense boundaries: D-15's optimistic rename reaches the sidebar
     * row and the header title in the same instant, and S-06's bridge lets the header read the
     * open board's columns reported from inside `children` (`app/(dashboard)/boards/[boardId]`).
     */
    return (
        <RenameOverrideProvider>
            <AddTaskProvider>
                <div className="flex min-h-full bg-bg-app">
                    <Sidebar initialTheme={initialTheme}>
                        <Suspense fallback={<BoardListSkeleton />}>
                            <SidebarBoards />
                        </Suspense>
                    </Sidebar>

                    {/* `h-dvh` (not `flex-1`) is what bounds the board area, so a column scrolls
                        internally instead of growing the page (mirrors the sidebar's own pinning). */}
                    <div className="flex h-dvh min-w-0 flex-1 flex-col">
                        {/* The fallback is the same header with an empty list — chrome and controls
                            paint immediately, only the board title waits on the read. */}
                        <Suspense fallback={<DashboardHeader displayName={identity.displayName} boards={[]} />}>
                            <HeaderBoards displayName={identity.displayName} />
                        </Suspense>

                        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
                    </div>
                </div>
            </AddTaskProvider>
        </RenameOverrideProvider>
    );
};

export default DashboardLayout;
