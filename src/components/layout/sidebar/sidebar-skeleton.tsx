/**
 * The `<Suspense>` fallback for the sidebar's RSC-fed board read (`app/(dashboard)/layout.tsx`) —
 * the same chrome and pending rows `sidebar.tsx`'s own `isPending` branch rendered before this
 * phase's retrofit moved the fetch server-side, lifted verbatim so the pending visual is unchanged.
 */

/** A single pulsing placeholder row, sized to match a real board row's height (`h-11`). */
const SkeletonRow = () => (
    <div aria-hidden="true" className="h-11 shrink-0 animate-pulse rounded-sm bg-bg-app motion-reduce:animate-none" />
);

export const SidebarSkeleton = () => (
    <nav
        aria-label="Boards"
        className="flex h-full w-75 shrink-0 flex-col border-r border-border-default bg-bg-surface"
    >
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
    </nav>
);
