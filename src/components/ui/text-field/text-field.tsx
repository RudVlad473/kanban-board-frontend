import { Field } from "@base-ui/react/field";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

// Composite typography classes follow button.tsx's established pattern (plan 01-06): the
// generated `font-{name}` utility carries family, `text-{name}` carries size, and weight is read
// directly via Tailwind's arbitrary-property syntax because the token pipeline's `--font-weight-*`
// namespace collides with `--font-*` (WINDOWS.md id 2 — a pre-existing, out-of-scope pipeline bug).
const textFieldVariants = cva(
    "w-full rounded-md border bg-bg-surface px-4 py-3 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-text-muted disabled:opacity-50",
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
        },
        defaultVariants: {
            size: "md",
            state: "default",
            hasTrailing: false,
        },
    },
);

type Props = Omit<ComponentProps<typeof Field.Control>, "className" | "disabled" | "size" | "children"> &
    Pick<VariantProps<typeof textFieldVariants>, "size"> & {
        /** Required — an unlabelled input must not be constructible. */
        label: string;
        description?: string;
        errorMessage?: string;
        hasError?: boolean;
        isDisabled?: boolean;
        /** Rendered inside the field's visual box, absolutely positioned — e.g. a password-visibility IconButton. */
        trailing?: ReactNode;
        className?: string;
    };

export const TextField = ({
    label,
    description,
    errorMessage,
    hasError = false,
    isDisabled = false,
    size,
    trailing,
    className,
    type = "text",
    ...props
}: Props) => {
    return (
        // Field.Root/Field.Label/Field.Control/Field.Description/Field.Error wire up label
        // association, `aria-invalid` and `aria-describedby` from the library rather than
        // hand-rolled bookkeeping (D-15). `disabled` on Field.Root propagates to Field.Control
        // automatically, so `isDisabled` only needs to be set once, here.
        <Field.Root invalid={hasError} disabled={isDisabled} className="flex w-full flex-col gap-1">
            <Field.Label className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-primary">
                {label}
            </Field.Label>
            <div className="relative">
                <Field.Control
                    type={type}
                    className={cn(
                        textFieldVariants({
                            size,
                            state: hasError ? "error" : "default",
                            hasTrailing: Boolean(trailing),
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
