// Covered by: `src/components/ui/text-field/text-field.test.tsx`
import { cva } from "class-variance-authority";

import { formStateVariants } from "@/lib/core/styling/form-state-variants";

/*
 * Two cva's, because the box and the input are no longer the same element: the box is a flex row
 * holding the input beside PDF page 1's right-aligned error message. Focus and disabled are
 * therefore projected onto it with `has-[]`, the states themselves still landing on the input.
 */
export const textFieldBoxVariants = cva(
    /*
     * `rounded-sm` (radius.sm, 4px) — tokens/radius.tokens.json documents this token as the
     * measured "Text Field / Dropdown corner radius" from the Figma source; `rounded-md` (24px,
     * "Button Secondary corner radius") was wired in by mistake in plan 01-07 and never caught.
     */
    "relative flex w-full items-center gap-2 rounded-sm border bg-bg-surface px-4 transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring-focus has-[:focus-visible]:ring-offset-2",
    {
        variants: {
            size: {
                sm: "h-8",
                md: "h-10",
                lg: "h-12",
            },
            state: formStateVariants,
            hasTrailing: {
                true: "pr-11",
                false: "",
            },
            /*
             * Driven internally by `isLoading`, not a standalone prop — composes into `disabled`
             * (mirroring Checkbox/Button); scoped to the same `has-[:disabled]:` modifier
             * so tailwind-merge's conflict-group resolution picks it deterministically.
             */
            isBusy: {
                true: "has-[:disabled]:cursor-progress",
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

/*
 * Typography workaround follows button.tsx's font-weight/font-family collision fix (01-06-SUMMARY.md).
 * Truncation uses native `truncate`, not a DOM overlay, with `focus:text-clip` disabling the
 * ellipsis while focused — a cross-browser caret-scroll rendering bug, Firefox gap included (01-09-SUMMARY.md).
 */
export const textFieldControlVariants = cva(
    "min-w-16 flex-1 self-stretch truncate bg-transparent font-body-l text-body-l text-text-primary transition-colors placeholder:text-text-muted focus:text-clip focus-visible:outline-none disabled:cursor-not-allowed disabled:text-text-muted",
    {
        variants: {
            size: {
                sm: "text-sm",
                md: "",
                lg: "",
            },
            isBusy: {
                true: "disabled:cursor-progress",
                false: "",
            },
        },
        defaultVariants: {
            size: "md",
            isBusy: false,
        },
    },
);
