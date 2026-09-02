import { Field } from "@base-ui/react/field";
import { type VariantProps } from "class-variance-authority";
import { isNil } from "es-toolkit";
import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";

import { textFieldBoxVariants, textFieldControlVariants } from "@/components/ui/text-field/text-field-variants";
import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

type Props = Omit<ComponentProps<typeof Field.Control>, "className" | "disabled" | "size" | "children"> &
    Pick<VariantProps<typeof textFieldBoxVariants>, "size"> &
    ClassNameProp & {
        /** Required — an unlabelled input must not be constructible. */
        label: string;
        /**
         * Hide the label visually while keeping it announced and associated. For a row inside an
         * already-labelled group (a subtask/column row), where the mock shows the group label only
         * and a per-row label would both repeat it and take layout space the design has no gap for.
         */
        isLabelHidden?: boolean;
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
        /**
         * Opt in to a live `12/32` counter in the message slot, passing the same upper bound the
         * field's schema enforces. Supplied per call site, never derived: parsing a zod schema at
         * runtime to recover a bound would couple this primitive to every form that uses it.
         */
        characterLimit?: number;
        /** Rendered inside the field's visual box, absolutely positioned — e.g. a password-visibility IconButton. */
        trailing?: ReactNode;
    };

export const TextField = ({
    label,
    isLabelHidden = false,
    description,
    errorMessage,
    hasError = false,
    isDisabled = false,
    isLoading = false,
    characterLimit,
    size,
    trailing,
    className,
    type = "text",
    value,
    onValueChange,
    ...props
}: Props) => {
    const boxRef = useRef<HTMLDivElement>(null);
    const [typedLength, setTypedLength] = useState(0);
    const valueLength = value === undefined ? typedLength : String(value).length;

    /*
     * One post-mount DOM read, because `register()` writes a form's default value straight through
     * the ref and fires no change event: without this a pre-filled field would open its counter at
     * 0. Every later change arrives as `onValueChange` below.
     */
    useLayoutEffect(() => {
        const input = boxRef.current?.querySelector("input");
        if (!isNil(input)) {
            setTypedLength(input.value.length);
        }
    }, []);

    /*
     * Precedence, stated once here rather than per call site: an empty value is the required-field
     * case and keeps its prose, which already fits; a non-empty one is a length case and gets the
     * counter, which fits at any width. The prose stays mounted for `aria-describedby` either way.
     */
    const counterText =
        characterLimit !== undefined && valueLength > 0 ? `${String(valueLength)}/${String(characterLimit)}` : null;

    return (
        /*
         * Field.Root/Label/Control/Description/Error wire up label association, `aria-invalid`
         * and `aria-describedby` from the library, not hand-rolled bookkeeping (D-15, see
         * 01-CONTEXT.md). `disabled` on Field.Root propagates to Field.Control automatically.
         */
        <Field.Root
            invalid={hasError}
            disabled={isDisabled || isLoading}
            /*
             * `min-w-0` because a nowrap error message makes the field's min-content width its own
             * width: without it a field sitting in a flex row refuses to shrink and pushes the
             * row's remove control off the panel.
             */
            className="flex w-full min-w-0 flex-col gap-1"
        >
            <Field.Label
                className={cn(
                    "font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-primary",
                    isLabelHidden && "sr-only",
                )}
            >
                {label}
            </Field.Label>

            <div
                ref={boxRef}
                className={textFieldBoxVariants({
                    size,
                    state: hasError ? "error" : "default",
                    hasTrailing: Boolean(trailing),
                    isBusy: isLoading,
                })}
            >
                <Field.Control
                    type={type}
                    aria-busy={isLoading}
                    value={value}
                    onValueChange={(nextValue, event) => {
                        setTypedLength(nextValue.length);
                        onValueChange?.(nextValue, event);
                    }}
                    className={cn(textFieldControlVariants({ size, isBusy: isLoading }), className)}
                    {...props}
                />

                {trailing ? <span className="absolute inset-y-0 right-3 flex items-center">{trailing}</span> : null}

                {/* `match` forced to `true` (rather than left to native/Form validity) because this
                    primitive's error state is fully externally controlled via `hasError`/`errorMessage`
                    — not native constraint validation or a Base UI <Form>. Conditionally mounting only
                    when `hasError` keeps "no error element when valid" true without relying on the
                    library's own async mount/unmount transition. */}
                {/* A sibling of the input INSIDE the field's box, right-aligned — PDF page 1's "Text
                    Field (Error)" state. Owning a slot in the box is what keeps the message from
                    costing the field height in any container: below the field in flow it grew the
                    form by 23.5px mid-click, between a control's mousedown and mouseup, silently
                    losing the click (04-15-CHECKPOINT.md), and below the field out of flow it
                    covered the next control by 9.5px, the 24px inter-field gap it assumed being
                    more than a row group leaves. A message wider than the slot truncates rather
                    than pushing the input away; `aria-describedby` still carries it in full. */}
                {/* `sr-only` while a counter owns the slot, never unmounted: the prose is the only
                    carrier of WHICH bound was crossed, and `sr-only` keeps it out of the layout
                    without taking it out of `aria-describedby`. */}
                {hasError && errorMessage ? (
                    <Field.Error
                        match={true}
                        className={cn(
                            "min-w-0 truncate font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-danger",
                            counterText !== null && "sr-only",
                        )}
                    >
                        {errorMessage}
                    </Field.Error>
                ) : null}

                {/* `aria-hidden` because the fragment "12/32" states no bound on its own; the prose
                    above is what carries the constraint to assistive tech, in full, whenever the
                    field is invalid. */}
                {counterText !== null ? (
                    <span
                        aria-hidden="true"
                        className={cn(
                            "shrink-0 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] whitespace-nowrap tabular-nums",
                            hasError ? "text-text-danger" : "text-text-muted",
                        )}
                    >
                        {counterText}
                    </span>
                ) : null}
            </div>

            {description ? (
                <Field.Description className="font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted">
                    {description}
                </Field.Description>
            ) : null}
        </Field.Root>
    );
};
