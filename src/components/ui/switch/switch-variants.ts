import { cva } from "class-variance-authority";

/*
 * D-18: track sized 32x20/40x24/48x28 (sm/md/lg); the 44x44px min interactive area floors
 * `Switch.Root` itself, matching IconButton's real-vs-visual hit-box split. Track is a plain
 * nested `span` styled via `group` off the root's `data-checked` (see 01-08-SUMMARY.md).
 */
export const rootVariants = cva(
    "group relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
    {
        variants: {
            size: {
                sm: "size-11",
                md: "size-11",
                lg: "size-12",
            },
        },
        defaultVariants: {
            size: "md",
        },
    },
);

/*
 * UI-SPEC reserves the accent for the Switch's "on" track specifically — `bg-bg-primary` must
 * never appear on the unchecked state (the reserved-accent rule this plan's must_haves enforce).
 */
export const trackVariants = cva(
    "pointer-events-none inline-flex items-center rounded-full border border-transparent p-0.5 transition-colors group-data-[checked]:bg-bg-primary group-data-[unchecked]:bg-text-muted group-data-[unchecked]:opacity-40",
    {
        variants: {
            size: {
                sm: "h-5 w-8",
                md: "h-6 w-10",
                lg: "h-7 w-12",
            },
        },
        defaultVariants: {
            size: "md",
        },
    },
);

export const thumbVariants = cva(
    "pointer-events-none flex items-center justify-center rounded-full bg-bg-surface shadow-sm transition-transform [&_svg]:shrink-0",
    {
        variants: {
            size: {
                sm: "size-4 data-[checked]:translate-x-3 [&_svg]:size-2.5",
                md: "size-5 data-[checked]:translate-x-4 [&_svg]:size-3",
                lg: "size-6 data-[checked]:translate-x-5 [&_svg]:size-3.5",
            },
        },
        defaultVariants: {
            size: "md",
        },
    },
);
