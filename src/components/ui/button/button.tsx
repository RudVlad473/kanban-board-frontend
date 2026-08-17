import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";
import type { ClassNameProp } from "@/types/props";

/*
 * Base classes shared by every variant/size. Typography reads two working generated utilities
 * (`font-body-m` for family, `text-body-m` for size + line-height) plus a direct custom-property
 * reference for weight: the token pipeline's Style Dictionary transform (style-dictionary.config.mjs,
 * plan 01-04) emits `--font-weight-body-m` as a top-level `--font-weight-*` namespace entry, but
 * Tailwind v4 resolves that namespace to the SAME utility class name (`font-body-m`) as the
 * `--font-*` font-family namespace — the two collide and the family declaration always wins,
 * silently dropping the weight utility. Verified by direct compilation (postcss + @tailwindcss/postcss)
 * during this plan's execution. Referencing `var(--font-weight-body-m)` directly via Tailwind's
 * arbitrary-property syntax still reads the real token (not a hardcoded literal) and sidesteps the
 * collision without touching the shared token pipeline, which is out of this plan's scope. Logged
 * as a deviation in this plan's SUMMARY.md and the phase's deferred-items.md for a future fix in
 * the token pipeline itself (rename to Tailwind's paired `--text-<name>--font-weight` sub-property
 * convention, which does not collide).
 * Disabled state is opacity-only at the base level (no text-color override): `primary` and
 * `destructive` keep their `text-on-primary` (white) label at reduced opacity, which stays
 * legible against their own faded fill. Overriding to `text-muted` there (a token designed for
 * muted text on a *light* surface) collapsed contrast to near-zero once opacity-50 was also
 * applied on top — a dark-grey label on a already-faded purple/red fill reads as invisible.
 * `secondary`'s fill is `bg-surface` (light), so muting its text to `text-muted` on disable still
 * reads correctly and is kept as a per-variant override instead of a shared base class.
 */
const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 rounded-lg font-body-m text-body-m [font-weight:var(--font-weight-body-m)] transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
    {
        variants: {
            variant: {
                primary: "bg-bg-primary text-text-on-primary hover:bg-bg-primary-hover",
                secondary:
                    "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-app disabled:text-text-muted",
                destructive: "bg-bg-danger text-text-on-primary hover:bg-bg-danger-hover",
            },
            size: {
                sm: "h-8 px-4",
                md: "h-10 px-4",
                lg: "h-12 px-6",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "md",
        },
    },
);

type Props = Omit<ComponentProps<typeof BaseButton>, "disabled" | "className"> &
    VariantProps<typeof buttonVariants> &
    ClassNameProp & {
        isDisabled?: boolean;
        /**
         * Transient "a request is in flight" state — distinct from `isDisabled`'s static
         * availability statement. Composes with it (either makes the control non-activatable), but
         * only `isLoading` sets `aria-busy` and renders the spinner glyph.
         */
        isLoading?: boolean;
    };

export const Button = ({
    variant,
    size,
    isDisabled = false,
    isLoading = false,
    className,
    children,
    ...props
}: Props) => {
    return (
        <BaseButton
            disabled={isDisabled || isLoading}
            aria-busy={isLoading}
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
        >
            {isLoading ? (
                /*
                 * GC-13: a static-looking spinner in a live browser is expected, correct behavior
                 * when that browser or OS has "reduce motion" enabled — `motion-reduce:` is
                 * deliberately honoring an accessibility preference, not failing to animate.
                 * Confirmed live by button.test.tsx's environment-aware regression test: with no
                 * reduced-motion preference requested, the spinner's computed animation genuinely
                 * runs (animationName: "spin", animationPlayState: "running"); the source-level
                 * audit found no global animation-disabling override anywhere in this codebase. A
                 * future "the spinner looks static" report is resolved by checking the reporter's
                 * own reduced-motion setting first, not by re-investigating the CSS pipeline.
                 */
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
            ) : null}

            {children}
        </BaseButton>
    );
};
