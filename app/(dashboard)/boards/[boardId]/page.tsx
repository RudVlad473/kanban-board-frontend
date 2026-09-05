// Covered by: `e2e/boards-detail.e2e.spec.ts`
import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { dehydrateBoard } from "@/features/boards/server/dehydrate-board";
import { fetchBoards } from "@/features/boards/server/fetch-boards";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";
import { requireAuthenticated } from "@/lib/server/require-authenticated";

// comment-length-exempt: records that this page deliberately renders nothing and where the board went instead, which a reader would otherwise read as an unfinished deletion
/*
 * The membership rule and the board entry's hydration — no markup of its own. Composition only,
 * no business logic (CONVENTIONS.md's "app/ is routing only" rule).
 *
 * The board is RENDERED by `app/(dashboard)/layout.tsx`'s `BoardScreen`, deliberately: a board
 * delivered as this page's output is a board the user waits a server round trip for on every
 * switch, which is the skeleton BOARD-04 exists to remove. It is still HYDRATED here, because a
 * Server Action's `refresh()` re-runs this render and hydrating the newer entry is what retires an
 * optimistic write (tech/0030) — doing that from the layout as well raced those writes.
 *
 * Membership is still tested against the already-fetched, request-deduplicated list rather than
 * inferred from the full-board read's failure, so this page's redirect rule and the sibling page's
 * read one source (T-02-51).
 */
const BoardDetailPage = async ({ params }: PageProps<"/boards/[boardId]">) => {
    const { boardId } = await params;
    const boardsResult = requireAuthenticated(await fetchBoards());

    if (boardsResult.status === RESULT_STATUS.SUCCESS && !boardsResult.boards.some((board) => board.id === boardId)) {
        const [firstBoard] = boardsResult.boards;

        // Change the URL rather than silently render a substitute at the requested one (T-02-54).
        redirect(boardsResult.boards.length === 0 ? ROUTE.BOARDS : buildBoardDetailPath(firstBoard.id));
    }

    const { state } = await dehydrateBoard({ boardId });

    return <HydrationBoundary state={state} />;
};

export default BoardDetailPage;
