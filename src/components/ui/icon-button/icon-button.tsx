import { Button as BaseButton } from "@base-ui/react/button";
import { type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { iconButtonVariants } from "@/components/ui/icon-button/icon-button-variants";
import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

type Props = Omit<ComponentProps<typeof BaseButton>, "disabled" | "className" | "children"> &
    VariantProps<typeof iconButtonVariants> &
    ClassNameProp & {
        /** Required — an icon-only control must always expose an accessible name. */
        label: string;
        icon: ReactNode;
        isDisabled?: boolean;
        /**
         * Transient "a request is in flight" state; composes with `isDisabled`, but only
         * `isLoading` sets `aria-busy` and swaps the glyph for a spinner. `label` keeps supplying
         * the accessible name unchanged, so a busy control is still identifiable.
         */
        isLoading?: boolean;
    };

export const IconButton = ({
    variant,
    size,
    isDisabled = false,
    isLoading = false,
    label,
    icon,
    className,
    ...props
}: Props) => {
    return (
        <BaseButton
            disabled={isDisabled || isLoading}
            aria-busy={isLoading}
            aria-label={label}
            className={cn(iconButtonVariants({ variant, size }), className)}
            {...props}
        >
            <span aria-hidden="true" className="inline-flex">
                {isLoading ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : icon}
            </span>
        </BaseButton>
    );
};
