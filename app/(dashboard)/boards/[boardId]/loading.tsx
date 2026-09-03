// Covered by: nothing to test — a Suspense fallback returning BoardViewSkeleton with no logic of its own
import { BoardViewSkeleton } from "@/features/boards/components/board-view-skeleton/board-view-skeleton";

/*
 * Next wraps this segment in its own `<Suspense>` with this file as the fallback, so the skeleton
 * paints the instant a navigation starts — before `BoardDetailPage`'s blocking `fetchBoards()`
 * membership check even begins. Composition only, no logic ("app/ is routing only").
 */
const BoardDetailLoading = () => {
    return <BoardViewSkeleton />;
};

export default BoardDetailLoading;
