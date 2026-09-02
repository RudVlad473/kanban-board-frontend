// Covered by: `src/components/ui/checkbox/checkbox.test.tsx`
import { cva } from "class-variance-authority";

import { formStateVariants } from "@/lib/core/styling/form-state-variants";

/*
 * D-18: 16/20/24px boxes, glyph inset 4px on every side; `peer` lets the sibling Field.Label react
 * to `data-checked`. Base classes use `data-[disabled]:*`, not `disabled:*` — GC-14 found the
 * latter never matches this non-native `role="checkbox"` span (see 01-23-SUMMARY.md).
 */
export const checkboxVariants = cva(
    "peer inline-flex shrink-0 items-center justify-center rounded-sm border bg-bg-surface transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none data-[checked]:border-transparent data-[checked]:bg-bg-primary data-[checked]:text-text-on-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&_svg]:shrink-0",
    {
        variants: {
            size: {
                sm: "size-4 [&_svg]:size-2",
                md: "size-5 [&_svg]:size-3",
                lg: "size-6 [&_svg]:size-4",
            },
            state: formStateVariants,
            /*
             * GC-14: mirrors `text-field.tsx`'s `isBusy` axis — the grayed-out look already comes
             * from base `data-[disabled]:opacity-50`, this axis only adds the cursor affordance
             * (see 01-23-SUMMARY.md).
             */
            isBusy: {
                true: "cursor-progress",
                false: "",
            },
        },
        defaultVariants: {
            size: "md",
            state: "default",
            isBusy: false,
        },
    },
);
