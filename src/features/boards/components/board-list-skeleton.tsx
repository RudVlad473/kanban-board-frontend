/**
 * The `<Suspense>` fallback for `BoardList` — carries over `sidebar-skeleton.tsx`'s pulsing rows
 * verbatim (plan 02-09's chrome/list split). A static, prop-free fallback with no behaviour of its
 * own, so it gets no stories/test pair, matching that file's prior treatment.
 */

/** A single pulsing placeholder row, sized to match a real board row's height (`h-11`). */
const SkeletonRow = () => (
    <div aria-hidden="true" className="h-11 shrink-0 animate-pulse rounded-sm bg-bg-app motion-reduce:animate-none" />
);

export const BoardListSkeleton = () => (
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
