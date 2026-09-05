// Covered by: nothing to test — a static SkeletonRow arrangement no test renders; see 03-13-SUMMARY.md's gap list
import { SkeletonRow } from "@/components/ui/skeleton-row/skeleton-row";

/**
 * The `<Suspense>` fallback for `BoardView` — column-header bars and card-shaped placeholders, so
 * the board area is never a blank canvas. A static, prop-free fallback with no behaviour and no
 * copy of its own, so it gets no stories/test pair, matching `BoardListSkeleton`.
 */
export const BoardViewSkeleton = () => {
    return (
        /* `aria-hidden`, so it has no accessible name a spec could match — the testid is its only handle. */
        <div
            aria-hidden="true"
            data-testid="board-view-skeleton"
            className="flex min-h-0 flex-1 gap-6 overflow-hidden bg-bg-app p-6"
        >
            {[0, 1, 2].map((column) => {
                return (
                    <div key={column} className="flex w-70 shrink-0 flex-col gap-4">
                        <SkeletonRow className="h-4 w-32" />

                        <SkeletonRow className="h-24" />

                        <SkeletonRow className="h-24" />

                        <SkeletonRow className="h-24" />
                    </div>
                );
            })}
        </div>
    );
};
