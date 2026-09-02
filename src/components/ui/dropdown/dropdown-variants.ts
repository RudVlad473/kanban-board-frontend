// Covered by: `src/components/ui/dropdown/dropdown.test.tsx`
import { cva } from "class-variance-authority";

import { formStateVariants } from "@/lib/core/styling/form-state-variants";

/*
 * D-17: same danger-border token as TextField/Checkbox, same 12px/`h-10` box shape as TextField's
 * trigger. `rounded-sm` is the measured "Text Field / Dropdown corner radius" token; the popup
 * below keeps its own `rounded-md`, which covers only that surface (see 01-CONTEXT.md).
 */
export const triggerVariants = cva(
    "flex h-10 w-full items-center justify-between gap-2 rounded-sm border bg-bg-surface px-4 py-3 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-text-muted data-[disabled]:opacity-50",
    {
        variants: {
            state: formStateVariants,
        },
        defaultVariants: {
            state: "default",
        },
    },
);
