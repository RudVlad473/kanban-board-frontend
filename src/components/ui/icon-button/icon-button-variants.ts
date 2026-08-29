// Covered by: `src/components/ui/icon-button/icon-button.test.tsx`
import { cva } from "class-variance-authority";

/*
 * Base UI has no dedicated icon-button component, so this wraps Base UI's Button exactly as
 * button.tsx does (D-14). `h-11 w-11`/`h-12 w-12` keep the hit area at or above the 44x44px
 * floor at every size — the descendant `[&_svg]` selector sizes only the glyph (see 01-06-SUMMARY.md).
 */
export const iconButtonVariants = cva(
    "inline-flex shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                primary: "bg-bg-primary text-text-on-primary hover:bg-bg-primary-hover",
                secondary: "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-app",
                destructive: "bg-bg-danger text-text-on-primary hover:bg-bg-danger-hover",
                ghost: "bg-transparent text-text-muted hover:bg-bg-app",
            },
            size: {
                sm: "size-11 [&_svg]:size-4",
                md: "size-11 [&_svg]:size-5",
                lg: "size-12 [&_svg]:size-6",
            },
        },
        defaultVariants: {
            variant: "ghost",
            size: "md",
        },
    },
);
