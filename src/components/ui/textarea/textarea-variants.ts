// Covered by: `src/components/ui/textarea/textarea.test.tsx`
import { cva } from "class-variance-authority";

/*
 * Mirrors text-field-variants.ts, minus its `size` axis and its `truncate`/`focus:text-clip` pair:
 * a multi-line box wraps instead of truncating, and `min-h-28` (112px, 04-UI-SPEC.md's tier-2 row,
 * measured 110.9px on PDF p6) is a floor the box grows from rather than a fixed height.
 */
export const textareaVariants = cva(
    "min-h-28 w-full rounded-sm border bg-bg-surface px-4 py-3 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-50",
    {
        variants: {
            // D-17's two semantic tokens for the form-primitive error visual, same as TextField.
            state: {
                default: "border-border-default text-text-primary placeholder:text-text-muted",
                error: "border-border-danger text-text-primary",
            },
            /*
             * Driven internally by `isLoading`, not a standalone prop — composes into `disabled`
             * per GC-17, so the cursor is the sole busy-vs-disabled differentiator.
             */
            isBusy: {
                true: "disabled:cursor-progress",
                false: "",
            },
        },
        defaultVariants: {
            state: "default",
            isBusy: false,
        },
    },
);
