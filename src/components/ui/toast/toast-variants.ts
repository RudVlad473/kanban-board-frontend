import { cva } from "class-variance-authority";

/*
 * Danger accent reads `toast.type` (not a separate `variant` prop) — Base UI's own `ToastObject`
 * already carries `type` for styling. `rounded-sm` matches TextField/Dropdown's radius per human
 * review, not Modal's `rounded-lg`; surface color/shadow still match Modal (see 02-07-SUMMARY.md).
 */
export const rootVariants = cva(
    "pointer-events-auto relative w-[min(90vw,24rem)] overflow-hidden rounded-sm border-l-4 bg-bg-surface shadow-lg",
    {
        variants: {
            variant: {
                default: "border-l-transparent",
                danger: "border-l-border-danger",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);
