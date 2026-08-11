import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Field } from "@base-ui/react/field";
import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

// D-18: 16/20/24px boxes for sm/md/lg, with the tick glyph inset 4px (`space-1`) on every side —
// box size minus 2*4px gives the exact glyph sizes below. `peer` (on the root) lets the sibling
// Field.Label react to the root's own `data-checked` attribute via `peer-data-[checked]:*`,
// working for both controlled (`isChecked`) and uncontrolled (`defaultChecked`) usage since it
// reads the live DOM attribute rather than React state.
const checkboxVariants = cva(
    "peer inline-flex shrink-0 items-center justify-center rounded-sm border bg-bg-surface transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:border-transparent data-[checked]:bg-bg-primary data-[checked]:text-text-on-primary [&_svg]:shrink-0",
    {
        variants: {
            size: {
                sm: "size-4 [&_svg]:size-2",
                md: "size-5 [&_svg]:size-3",
                lg: "size-6 [&_svg]:size-4",
            },
            // D-17: the same danger border token TextField uses, so the two form primitives are
            // visually consistent by construction.
            state: {
                default: "border-border-default",
                error: "border-border-danger",
            },
        },
        defaultVariants: {
            size: "md",
            state: "default",
        },
    },
);

type Props = Omit<ComponentProps<typeof BaseCheckbox.Root>, "className" | "disabled" | "checked" | "children"> &
    Pick<VariantProps<typeof checkboxVariants>, "size"> & {
        /** Required — an unlabelled control must not be constructible. */
        label: string;
        isChecked?: boolean;
        isDisabled?: boolean;
        hasError?: boolean;
        /**
         * Opt-in strikethrough on the label when checked. Defaults to `false` — the Phase 4
         * subtask row turns this on; the auth forms consuming this primitive in plan 01-12 do
         * not want it.
         */
        hasStrikethroughWhenChecked?: boolean;
        className?: string;
    };

export const Checkbox = ({
    label,
    isChecked,
    isDisabled = false,
    hasError = false,
    hasStrikethroughWhenChecked = false,
    size,
    className,
    ...props
}: Props) => {
    return (
        // Field.Root/Checkbox.Root/Field.Label wire up label association and invalid marking
        // from the library rather than hand-rolled bookkeeping (D-15). `disabled` on Field.Root
        // propagates to Checkbox.Root automatically, so `isDisabled` only needs to be set once.
        <Field.Root invalid={hasError} disabled={isDisabled} className="inline-flex items-center gap-2">
            <BaseCheckbox.Root
                checked={isChecked}
                className={cn(checkboxVariants({ size, state: hasError ? "error" : "default" }), className)}
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
