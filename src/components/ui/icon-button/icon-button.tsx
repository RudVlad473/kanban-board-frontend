import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/*
 * Base UI has no dedicated icon-button component (RESEARCH.md Standard Stack), so this wraps
 * Base UI's Button exactly as button.tsx does (D-14: IconButton is a Button variant).
 * `h-11 w-11`/`h-12 w-12` keep the interactive hit area at or above the 44x44px accessibility
 * floor at every size (UI-SPEC Spacing Scale) even though the sm/md glyph is visually smaller —
 * the descendant `[&_svg]` selector sizes only the glyph, never the hit area.
 */
const iconButtonVariants = cva(
    "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                primary: "bg-bg-primary text-text-on-primary hover:bg-bg-primary-hover",
                secondary: "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-app",
                destructive: "bg-bg-danger text-text-on-primary hover:bg-bg-danger-hover",
                ghost: "bg-transparent text-text-muted hover:bg-bg-app",
            },
            size: {
                sm: "size-11 [&_svg]:size-4",
                md: "size-11 [&_svg]:size-5",
                lg: "size-12 [&_svg]:size-6",
            },
        },
        defaultVariants: {
            variant: "ghost",
            size: "md",
        },
    },
);

type Props = Omit<ComponentProps<typeof BaseButton>, "disabled" | "className" | "children"> &
    VariantProps<typeof iconButtonVariants> & {
        /** Required — an icon-only control must always expose an accessible name. */
        label: string;
        icon: ReactNode;
        isDisabled?: boolean;
        className?: string;
    };

export const IconButton = ({ variant, size, isDisabled = false, label, icon, className, ...props }: Props) => {
    return (
        <BaseButton
            disabled={isDisabled}
            aria-label={label}
            className={cn(iconButtonVariants({ variant, size }), className)}
            {...props}
        >
            <span aria-hidden="true" className="inline-flex">
                {icon}
            </span>
        </BaseButton>
    );
};
