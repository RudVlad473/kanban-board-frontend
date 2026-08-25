import { Button as BaseButton } from "@base-ui/react/button";
import { type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

import { buttonVariants } from "@/components/ui/button/button-variants";
import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

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
