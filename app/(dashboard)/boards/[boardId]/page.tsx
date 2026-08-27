// Covered by: `e2e/boards-detail.e2e.spec.ts`
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BoardView } from "@/features/boards/components/board-view/board-view";
import { BoardViewSkeleton } from "@/features/boards/components/board-view-skeleton/board-view-skeleton";
import { fetchBoardFull } from "@/features/boards/server/fetch-board-full";
import { fetchBoards } from "@/features/boards/server/fetch-boards";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";

/*
 * Streamed behind its own `Suspense` boundary so the skeleton stands in for the board area while
 * the full-board read is in flight (02-UI-SPEC's loading backstop row).
 */
const BoardContents = async ({ boardId }: { boardId: string }) => {
    const result = await fetchBoardFull({ boardId });

    if (result.status === RESULT_STATUS.UNAUTHENTICATED) {
        redirect(ROUTE.SIGN_IN);
    }

    if (result.status !== RESULT_STATUS.SUCCESS) {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center bg-bg-app p-6">
                <p className="text-center font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                    Couldn&apos;t load this board. Try again.
                </p>
            </div>
        );
    }

    return <BoardView board={result.board} />;
};

/*
 * Composition only, no business logic (CONVENTIONS.md's "app/ is routing only" rule). Membership is
 * tested against the already-fetched, request-deduplicated list rather than inferred from the
 * full-board read's failure, so this page's redirect rule and the sibling page's read one source (T-02-51).
 */
const BoardDetailPage = async ({ params }: PageProps<"/boards/[boardId]">) => {
    const { boardId } = await params;
    const boardsResult = await fetchBoards();

    if (boardsResult.status === RESULT_STATUS.UNAUTHENTICATED) {
        redirect(ROUTE.SIGN_IN);
    }

    if (boardsResult.status === RESULT_STATUS.SUCCESS && !boardsResult.boards.some((board) => board.id === boardId)) {
        const [firstBoard] = boardsResult.boards;

        // D-11: change the URL rather than silently render a substitute at the requested one (T-02-54).
        redirect(boardsResult.boards.length === 0 ? ROUTE.BOARDS : buildBoardDetailPath(firstBoard.id));
    }

    return (
        /*
         * Keyed so /boards/A -> /boards/B remounts this boundary rather than reusing the already
         * resolved one: both routes render the same element, so without a key React keeps the
         * previous board on screen while the next streams and the fallback never shows again.
         */
        <Suspense key={boardId} fallback={<BoardViewSkeleton />}>
            <BoardContents boardId={boardId} />
        </Suspense>
    );
};

export default BoardDetailPage;
