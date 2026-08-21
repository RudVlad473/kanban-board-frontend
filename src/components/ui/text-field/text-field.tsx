import { Field } from "@base-ui/react/field";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

/*
 * Typography workaround follows button.tsx's font-weight/font-family collision fix (01-06-SUMMARY.md).
 * Truncation uses native `truncate`, not a DOM overlay, with `focus:text-clip` disabling the
 * ellipsis while focused — a cross-browser caret-scroll rendering bug, Firefox gap included (01-09-SUMMARY.md).
 */
const textFieldVariants = cva(
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
