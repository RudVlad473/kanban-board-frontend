import { Field } from "@base-ui/react/field";
import { type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { textFieldVariants } from "@/components/ui/text-field/text-field-variants";
import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

type Props = Omit<ComponentProps<typeof Field.Control>, "className" | "disabled" | "size" | "children"> &
    Pick<VariantProps<typeof textFieldVariants>, "size"> &
    ClassNameProp & {
        /** Required — an unlabelled input must not be constructible. */
        label: string;
        description?: string;
        errorMessage?: string;
        hasError?: boolean;
        isDisabled?: boolean;
        /**
         * Transient "a request is in flight" state; composes into `disabled` (`isDisabled ||
         * isLoading`), matching Button/IconButton/Checkbox/Dropdown's isLoading pattern
         * (GC-17, see 01-29-SUMMARY.md). Still independently sets `aria-busy`.
         */
        isLoading?: boolean;
        /** Rendered inside the field's visual box, absolutely positioned — e.g. a password-visibility IconButton. */
        trailing?: ReactNode;
    };

export const TextField = ({
    label,
    description,
    errorMessage,
    hasError = false,
    isDisabled = false,
    isLoading = false,
    size,
    trailing,
    className,
    type = "text",
    ...props
}: Props) => {
    return (
        /*
         * Field.Root/Label/Control/Description/Error wire up label association, `aria-invalid`
         * and `aria-describedby` from the library, not hand-rolled bookkeeping (D-15, see
         * 01-CONTEXT.md). `disabled` on Field.Root propagates to Field.Control automatically.
         */
        <Field.Root invalid={hasError} disabled={isDisabled || isLoading} className="flex w-full flex-col gap-1">
            <Field.Label className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-primary">
                {label}
            </Field.Label>

            <div className="relative">
                <Field.Control
                    type={type}
                    aria-busy={isLoading}
                    className={cn(
                        textFieldVariants({
                            size,
                            state: hasError ? "error" : "default",
                            hasTrailing: Boolean(trailing),
                            isBusy: isLoading,
                        }),
                        className,
                    )}
                    {...props}
                />

                {trailing ? <span className="absolute inset-y-0 right-3 flex items-center">{trailing}</span> : null}
            </div>

            {description ? (
                <Field.Description className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                    {description}
                </Field.Description>
            ) : null}

            {/* `match` forced to `true` (rather than left to native/Form validity) because this
                primitive's error state is fully externally controlled via `hasError`/`errorMessage`
                — not native constraint validation or a Base UI <Form>. Conditionally mounting only
                when `hasError` keeps "no error element when valid" true without relying on the
                library's own async mount/unmount transition. */}
            {hasError && errorMessage ? (
                <Field.Error
                    match={true}
                    className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-danger"
                >
                    {errorMessage}
                </Field.Error>
            ) : null}
        </Field.Root>
    );
};
