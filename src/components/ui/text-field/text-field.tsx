import { Field } from "@base-ui/react/field";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { ClassNameProp } from "@/types/props";

/*
 * Composite typography classes follow button.tsx's established pattern (plan 01-06): the
 * generated `font-{name}` utility carries family, `text-{name}` carries size, and weight is read
 * directly via Tailwind's arbitrary-property syntax because the token pipeline's `--font-weight-*`
 * namespace collides with `--font-*` (WINDOWS.md id 2 — a pre-existing, out-of-scope pipeline bug).
 *
 * `truncate` (Tailwind's `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
 * shorthand — same utility Dropdown's trigger already relies on) renders the "…" as part of the
 * input's own native text box, inset by the input's own padding. This replaced a custom
 * absolutely-positioned overlay span + `useOverflowIndicator` hook, which read as a broken white
 * cutoff because the overlay's `right-0`/`right-11` offsets didn't account for the input's own
 * border width and bled over the border/corner radius. Dropdown's own overflow-indicator hook
 * usage is unrelated and intentionally untouched — its trigger is a `<span>`, not a native input,
 * so it has no `text-overflow` box to truncate against.
 *
 * `focus:text-clip` (round-10 human-reported visual bug): `text-overflow: ellipsis` on a native
 * `<input>` fights the browser's own caret-follow auto-scroll while the field is focused —
 * confirmed two independent, real-browser-engine symptoms via a Playwright repro against the
 * built Storybook (not just DOM-property assertions, since neither the ellipsis glyph nor the
 * native caret-scroll position is introspectable via computed styles or jsdom): (1) Firefox
 * never paints the "…" glyph on `<input>` at all, focused or not — a 20+-year-old, still-open,
 * WontFix Firefox limitation (Mozilla Bugzilla #15154) — so the value simply clips with no
 * truncation cue; (2) even in Chromium, once focus moves the caret and the browser auto-scrolls
 * the input's internal text to keep it visible, the ellipsis is never recomputed against the new
 * scroll offset, so it either vanishes or (per the human's second screenshot) briefly renders
 * against a stale/blank scroll position. Neither engine's focused-state ellipsis rendering can be
 * trusted, so the fix scopes the ellipsis to the *blurred* state only: `text-clip` (plain
 * `text-overflow: clip`, no glyph) while focused, where native caret-scroll alone already works
 * correctly in both engines, and `truncate`'s ellipsis returns the moment the field blurs.
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
             * Driven internally by `isLoading` (below), not exposed as a standalone consumer-facing
             * variant. GC-17: `isLoading` now composes into native `disabled` (mirroring
             * Checkbox/Button), so the base `disabled:opacity-50` class already delivers the
             * grayed-out look the moment a field is loading — the previous `opacity-70 bg-bg-app`
             * treatment here (GC-15) became CSS-unreachable, since a `:disabled`-qualified selector
             * always outranks a plain class on specificity regardless of source order. This axis now
             * only adds the cursor affordance, mirroring `checkbox.tsx`'s own `isBusy` comment — but
             * as `disabled:cursor-progress` (not a bare `cursor-progress`), confirmed live to be
             * necessary: a bare class shares that same specificity disadvantage against the base
             * `disabled:cursor-not-allowed`, so it never wins either. Scoping this class to the same
             * `disabled:` modifier puts both in the same `cn()`/tailwind-merge conflict group, where
             * the later-declared class (this one) wins deterministically instead of falling back to
             * CSS cascade order.
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
         * Transient "a request is in flight" state. Composes into the same single `disabled` prop
         * `Field.Root` already uses for `isDisabled` (`isDisabled || isLoading`), matching
         * Button/IconButton/Checkbox/Dropdown's established composition pattern (GC-17, overriding
         * the prior readOnly-based mechanism). Still independently sets `aria-busy`.
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
         * Field.Root/Field.Label/Field.Control/Field.Description/Field.Error wire up label
         * association, `aria-invalid` and `aria-describedby` from the library rather than
         * hand-rolled bookkeeping (D-15). `disabled` on Field.Root propagates to Field.Control
         * automatically, so `isDisabled` only needs to be set once, here.
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
