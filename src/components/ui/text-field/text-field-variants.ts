// Covered by: `src/components/ui/text-field/text-field.test.tsx`
import { cva } from "class-variance-authority";

/*
 * Typography workaround follows button.tsx's font-weight/font-family collision fix (01-06-SUMMARY.md).
 * Truncation uses native `truncate`, not a DOM overlay, with `focus:text-clip` disabling the
 * ellipsis while focused — a cross-browser caret-scroll rendering bug, Firefox gap included (01-09-SUMMARY.md).
 */
export const textFieldVariants = cva(
    /*
     * `rounded-sm` (radius.sm, 4px) — tokens/radius.tokens.json documents this token as the
     * measured "Text Field / Dropdown corner radius" from the Figma source; `rounded-md` (24px,
     * "Button Secondary corner radius") was wired in by mistake in plan 01-07 and never caught.
     */
    "w-full truncate rounded-sm border bg-bg-surface px-4 py-3 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] transition-colors focus:text-clip focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-50",
    {
        variants: {
            size: {
                sm: "h-8 text-sm",
                md: "h-10",
                lg: "h-12",
            },
            // D-17 names these two semantic tokens explicitly for the form-primitive error visual.
            state: {
                default: "border-border-default text-text-primary placeholder:text-text-muted",
                error: "border-border-danger text-text-primary",
            },
            hasTrailing: {
                true: "pr-11",
                false: "",
            },
            /*
             * Driven internally by `isLoading`, not a standalone prop — composes into `disabled`
             * per GC-17 (mirroring Checkbox/Button); scoped to the same `disabled:` modifier so
             * tailwind-merge's conflict-group resolution picks it deterministically (01-29-SUMMARY.md).
             */
            isBusy: {
                true: "disabled:cursor-progress",
                false: "",
            },
        },
        defaultVariants: {
            size: "md",
            state: "default",
            hasTrailing: false,
            isBusy: false,
        },
    },
);
