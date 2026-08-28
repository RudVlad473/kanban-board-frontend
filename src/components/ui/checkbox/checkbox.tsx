import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Field } from "@base-ui/react/field";
import { type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";

import { checkboxVariants } from "@/components/ui/checkbox/checkbox-variants";
import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

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
                    /*
                     * 04-UI-SPEC.md's completed-subtask treatment: 50% of primary composites to
                     * the mock's sampled #797B87 (p5) and #8F9095 (p15), which the muted token
                     * misses. Lives here because `className` reaches the box, not the label.
                     */
                    hasStrikethroughWhenChecked &&
                        "peer-data-[checked]:text-text-primary/50 peer-data-[checked]:line-through",
                )}
            >
                {label}
            </Field.Label>
        </Field.Root>
    );
};
