import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Field } from "@base-ui/react/field";
import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

/*
 * D-18: 16/20/24px boxes, glyph inset 4px on every side; `peer` lets the sibling Field.Label react
 * to `data-checked`. Base classes use `data-[disabled]:*`, not `disabled:*` — GC-14 found the
 * latter never matches this non-native `role="checkbox"` span (see 01-23-SUMMARY.md).
 */
const checkboxVariants = cva(
    "peer inline-flex shrink-0 items-center justify-center rounded-sm border bg-bg-surface transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none data-[checked]:border-transparent data-[checked]:bg-bg-primary data-[checked]:text-text-on-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&_svg]:shrink-0",
    {
        variants: {
            size: {
                sm: "size-4 [&_svg]:size-2",
                md: "size-5 [&_svg]:size-3",
                lg: "size-6 [&_svg]:size-4",
            },
            /*
             * D-17: the same danger border token TextField uses, so the two form primitives are
             * visually consistent by construction.
             */
            state: {
                default: "border-border-default",
                error: "border-border-danger",
            },
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

type Props = Omit<ComponentProps<typeof BaseCheckbox.Root>, "className" | "disabled" | "checked" | "children"> &
    Pick<VariantProps<typeof checkboxVariants>, "size"> &
    ClassNameProp & {
        /** Required — an unlabelled control must not be constructible. */
        label: string;
        isChecked?: boolean;
        isDisabled?: boolean;
        /**
         * Transient "a request is in flight" state; composes with `isDisabled` via `Field.Root`'s
         * single `disabled` propagation point, no second parallel prop. No spinner glyph — the
         * tick box has no room, and `isDisabled`'s grayed-out opacity already reads as loading too.
         */
        isLoading?: boolean;
        hasError?: boolean;
        /**
         * Opt-in strikethrough on the label when checked. Defaults to `false` — the Phase 4
         * subtask row turns this on; the auth forms consuming this primitive in plan 01-12 do
         * not want it.
         */
        hasStrikethroughWhenChecked?: boolean;
    };

export const Checkbox = ({
    label,
    isChecked,
    isDisabled = false,
    isLoading = false,
    hasError = false,
    hasStrikethroughWhenChecked = false,
    size,
    className,
    ...props
}: Props) => {
    return (
        /*
         * Field.Root/Checkbox.Root/Field.Label wire up label association and invalid marking from
         * the library, not hand-rolled bookkeeping (D-15). `disabled` propagates to Checkbox.Root
         * automatically; `isLoading` (GC-14) composes into that same expression (see 01-23-SUMMARY.md).
         */
        <Field.Root
            invalid={hasError}
            disabled={isDisabled || isLoading}
            className="inline-flex items-center gap-2 align-top"
        >
            <BaseCheckbox.Root
                checked={isChecked}
                aria-busy={isLoading}
                className={cn(
                    checkboxVariants({ size, state: hasError ? "error" : "default", isBusy: isLoading }),
                    className,
                )}
                {...props}
            >
                <BaseCheckbox.Indicator className="flex items-center justify-center">
                    <Check strokeWidth={3} />
                </BaseCheckbox.Indicator>
            </BaseCheckbox.Root>

            <Field.Label
                className={cn(
                    "font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary",
                    hasStrikethroughWhenChecked && "peer-data-[checked]:line-through",
                )}
            >
                {label}
            </Field.Label>
        </Field.Root>
    );
};
