// Covered by: `src/components/ui/button/button.test.tsx`
import { cva } from "class-variance-authority";

/*
 * Typography reads `font-body-m`/`text-body-m` plus a direct `var(--font-weight-body-m)`
 * reference, working around a token-pipeline namespace collision (see 01-06-SUMMARY.md).
 * Disabled state is opacity-only; only `secondary`'s light fill also gets `text-text-muted` (01-06-SUMMARY.md addendum).
 */
export const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 rounded-full font-body-m text-body-m transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
    {
        variants: {
            variant: {
                primary: "bg-bg-primary text-text-on-primary hover:bg-bg-primary-hover",
                secondary:
                    "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-app disabled:text-text-muted",
                destructive: "bg-bg-danger text-text-on-primary hover:bg-bg-danger-hover",
            },
            size: {
                sm: "h-8 px-4",
                md: "h-10 px-4",
                lg: "h-12 px-6",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "md",
        },
    },
);
