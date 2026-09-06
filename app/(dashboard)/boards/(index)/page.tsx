// Covered by: `e2e/boards-list.e2e.spec.ts`
import { redirect } from "next/navigation";

import { BoardsEmptyState } from "@/features/boards/components/boards-empty-state/boards-empty-state";
import { fetchBoards } from "@/features/boards/server/fetch-boards";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { buildBoardDetailPath } from "@/lib/core/routing/routes";
import { requireAuthenticated } from "@/lib/server/require-authenticated";

/*
 * Composition only, no business logic (CONVENTIONS.md's "app/ is routing only" rule). The
 * auto-select resolves here on the server, before any board markup reaches the browser, so a user
 * never sees a flash of the wrong screen — the only option still consistent with docs/adr/tech/0019.
 */
const BoardsPage = async () => {
    const result = requireAuthenticated(await fetchBoards());

    if (result.status !== RESULT_STATUS.SUCCESS) {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center bg-bg-app p-6">
                <p className="text-center font-body-l text-body-l text-text-muted">
                    Couldn&apos;t load your boards. Try again.
                </p>
            </div>
        );
    }

    /*
     * The same entry the sidebar renders at the top, because both read `fetchBoards()`'s own
     * already-reversed array — sorting or reversing again here would land the redirect somewhere
     * other than the top of the panel.
     */
    if (result.boards.length === 0) {
        return <BoardsEmptyState />;
    }

    const [firstBoard] = result.boards;
    redirect(buildBoardDetailPath(firstBoard.id));
};

export default BoardsPage;
