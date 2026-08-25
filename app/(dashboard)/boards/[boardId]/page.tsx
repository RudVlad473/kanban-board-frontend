import { redirect } from "next/navigation";

import { BoardView } from "@/features/boards/components/board-view";
import { fetchBoardFull } from "@/features/boards/server/fetch-board-full";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { ROUTE } from "@/lib/core/routing/routes";

/*
 * Composition only, no business logic (CONVENTIONS.md's "app/ is routing only" rule) — awaits
 * `fetchBoardFull()` (an RSC read, no client-side query per docs/adr/tech/0019) and hands its ok
 * branch to the view as plain props.
 */
const BoardDetailPage = async ({ params }: PageProps<"/boards/[boardId]">) => {
    const { boardId } = await params;
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

export default BoardDetailPage;
