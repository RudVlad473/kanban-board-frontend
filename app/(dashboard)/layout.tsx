// Covered by: `e2e/boards-list.e2e.spec.ts`
import { HydrationBoundary } from "@tanstack/react-query";
import { isNil } from "es-toolkit";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { PropsWithChildren } from "react";

import { BoardScreen } from "@/components/layout/board-view/board-screen";
import { DashboardHeader } from "@/components/layout/dashboard-header/dashboard-header";
import { DashboardHeaderSkeleton } from "@/components/layout/dashboard-header-skeleton/dashboard-header-skeleton";
import { Sidebar } from "@/components/layout/sidebar/sidebar";
import { BoardList } from "@/features/boards/components/board-list/board-list";
import { BoardListSkeleton } from "@/features/boards/components/board-list-skeleton/board-list-skeleton";
import { BoardViewSkeleton } from "@/features/boards/components/board-view-skeleton/board-view-skeleton";
import { dehydrateBoard } from "@/features/boards/server/dehydrate-board";
import { dehydrateBoards } from "@/features/boards/server/dehydrate-boards";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { PATHNAME_HEADER, ROUTE, toBoardIdFromPath } from "@/lib/core/routing/routes";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { verifySession } from "@/lib/server/dal";
import { requireAuthenticated } from "@/lib/server/require-authenticated";

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

// comment-length-exempt: records why the board's hydration moved up a level, and the one Next behaviour that makes the page-level alternative repaint a skeleton on every switch
/*
 * The open board's first read, hydrated HERE rather than in `[boardId]/page.tsx`.
 *
 * Next re-renders only the segments a navigation changes, so this layout — and the `BoardScreen`
 * it mounts — survives a board-to-board switch untouched. That is exactly what makes the switch
 * instant: the next board comes out of the cache entry rather than out of a page render the
 * browser has to wait for. This boundary's only job is the FIRST board, so a hard load still
 * paints server-rendered markup instead of a skeleton.
 *
 * A PROP, not a hydration boundary: the boundary hydrates in an effect, which never runs on the
 * server, so only a prop can make the first paint server-rendered markup instead of a skeleton.
 * Re-hydrating the entry from here as well raced every optimistic write a `refresh()` landed
 * beside — a subtask briefly appeared twice and the row under the cursor detached (measured
 * 2026-09-05). `[boardId]/page.tsx` stays the one place the entry is hydrated from.
 *
 * The id comes from `proxy.ts`'s header because a layout above `[boardId]` receives no `params`.
 */
const OpenBoard = async ({ boardId }: { boardId: string | null }) => {
    /* No board in the URL, so nothing to read and nothing to suspend on — the shape stays the same. */
    if (isNil(boardId)) {
        return <BoardScreen initialBoard={null} />;
    }

    const { result } = await dehydrateBoard({ boardId });
    const authenticated = requireAuthenticated(result);
    const initialBoard = authenticated.status === RESULT_STATUS.SUCCESS ? authenticated.board : null;

    return <BoardScreen initialBoard={initialBoard} />;
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
    const openBoardId = toBoardIdFromPath((await headers()).get(PATHNAME_HEADER) ?? "");

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

                <main className="flex min-h-0 flex-1 flex-col">
                    {/*
                     * comment-length-exempt: records the measured remount a conditional here causes, invisible from the JSX itself
                     * ONE shape, never a branch: `openBoardId` is re-resolved on every `refresh()`,
                     * so a conditional here changed the element type under React mid-session and
                     * remounted the whole board — which closed the task modal the user had open and
                     * detached the row being typed into (measured 2026-09-05).
                     */}
                    <Suspense fallback={<BoardViewSkeleton />}>
                        <OpenBoard boardId={openBoardId} />
                    </Suspense>

                    {/* Always rendered, never routed through `BoardScreen`: the page is what carries
                        `[boardId]`'s membership redirect, and a page that is never rendered never
                        runs it — an absent board id stayed on screen instead of redirecting. It
                        contributes no markup on a board route. */}
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
