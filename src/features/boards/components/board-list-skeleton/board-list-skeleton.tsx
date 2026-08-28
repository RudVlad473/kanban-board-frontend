// Covered by: `src/components/layout/sidebar/sidebar.test.tsx`
import { SkeletonRow } from "@/components/ui/skeleton-row/skeleton-row";

/**
 * The `<Suspense>` fallback for `BoardList`. A static, prop-free fallback with no behaviour of its
 * own, so it gets no stories/test pair, matching `SkeletonRow`'s own treatment.
 */
export const BoardListSkeleton = () => {
    return (
        <>
            <p className="p-6 font-heading-s text-heading-s [font-weight:var(--font-weight-heading-s)] tracking-heading-s text-text-muted uppercase">
                ALL BOARDS (0)
            </p>

            <div className="flex-1 overflow-y-auto">
                <div aria-hidden="true" className="flex flex-col gap-2 px-4">
                    <SkeletonRow />

                    <SkeletonRow />

                    <SkeletonRow />
                </div>
            </div>
        </>
    );
};
