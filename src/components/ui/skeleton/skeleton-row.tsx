import { cn } from "@/lib/core/styling/cn";

/**
 * A single pulsing placeholder row. Static and prop-driven only, so — matching
 * `board-list-skeleton.tsx`'s prior treatment — it gets no stories/test pair.
 */
export const SkeletonRow = ({ className }: { className?: string }) => (
    <div
        aria-hidden="true"
        className={cn("h-11 shrink-0 animate-pulse rounded-sm bg-bg-app motion-reduce:animate-none", className)}
    />
);
