import { Field } from "@base-ui/react/field";
import type { ComponentProps } from "react";

import { textareaVariants } from "@/components/ui/textarea/textarea-variants";
import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

type Props = Omit<ComponentProps<typeof Field.Control>, "className" | "disabled" | "size" | "children"> &
    ClassNameProp & {
        /** Required — an unlabelled control must not be constructible. */
        label: string;
        description?: string;
        errorMessage?: string;
        hasError?: boolean;
        isDisabled?: boolean;
        /**
         * Transient "a request is in flight" state; composes into `disabled` (`isDisabled ||
         * isLoading`), matching Button/IconButton/Checkbox/Dropdown/TextField's isLoading pattern
         * (GC-17, see 01-29-SUMMARY.md). Still independently sets `aria-busy`.
         */
        isLoading?: boolean;
    };

export const Textarea = ({
    label,
    description,
    errorMessage,
    hasError = false,
    isDisabled = false,
    isLoading = false,
    className,
    ...props
}: Props) => {
    return (
        /*
         * Field.Root/Label/Control/Description/Error wire up label association, `aria-invalid` and
         * `aria-describedby` from the library, exactly as text-field.tsx does.
         */
        <Field.Root
            invalid={hasError}
            disabled={isDisabled || isLoading}
            className="relative flex w-full flex-col gap-1"
        >
            <Field.Label className="font-body-m text-body-m text-text-primary">{label}</Field.Label>

            {/* `render` swaps the mounted element: text-field.tsx passes `type` to a fixed-height
                `<input>`, which is the one thing a Description box has to change. */}
            <Field.Control
                render={<textarea />}
                aria-busy={isLoading}
                className={cn(
                    textareaVariants({ state: hasError ? "error" : "default", isBusy: isLoading }),
                    className,
                )}
                {...props}
            />

            {description ? (
                <Field.Description className="font-body-l text-body-l text-text-muted">{description}</Field.Description>
            ) : null}

            {/* `match` forced to `true` and mounted only when `hasError`, and absolutely positioned
                so appearing costs no height — both for the reason text-field.tsx records. */}
            {hasError && errorMessage ? (
                <Field.Error
                    match={true}
                    className="absolute top-full left-0 mt-1 font-body-l text-body-l text-text-danger"
                >
                    {errorMessage}
                </Field.Error>
            ) : null}
        </Field.Root>
    );
};
