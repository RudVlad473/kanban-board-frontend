import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

/*
 * Typography reads `font-body-m`/`text-body-m` plus a direct `var(--font-weight-body-m)`
 * reference, working around a token-pipeline namespace collision (see 01-06-SUMMARY.md).
 * Disabled state is opacity-only; only `secondary`'s light fill also gets `text-text-muted` (01-06-SUMMARY.md addendum).
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
                 * GC-13: a static-looking spinner is expected, correct behavior under an OS/browser
                 * "reduce motion" preference — `motion-reduce:` honors that preference, it isn't
                 * failing to animate. `button.test.tsx`'s live regression test confirms this (see 01-22-SUMMARY.md).
                 */
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
            ) : null}

            {children}
        </BaseButton>
    );
};
