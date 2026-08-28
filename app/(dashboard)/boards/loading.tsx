// Covered by: nothing to test — a Suspense fallback returning BoardViewSkeleton with no logic of its own
import { BoardViewSkeleton } from "@/features/boards/components/board-view-skeleton/board-view-skeleton";

/*
 * Reuses the board skeleton rather than authoring a second one: this route either redirects into a
 * board detail route or renders `BoardsEmptyState`, and the column shape is a better first paint
 * than a blank frame for either, so a bespoke skeleton for a redirect is not worth building (D-03).
 */
const BoardsLoading = () => {
    return <BoardViewSkeleton />;
};

export default BoardsLoading;
