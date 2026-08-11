import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { ClassNameProp } from "@/types/props";

/*
 * D-18: track sized 32x20 / 40x24 / 48x28 (sm/md/lg), a `p-0.5` (2px) inset around a
 * correspondingly sized thumb (16/20/24px — track height minus the inset on both sides). The
 * 44x44px minimum interactive area (UI-SPEC Spacing Scale) floors the actual `Switch.Root`
 * element itself — exactly as IconButton makes its real hit box 44x44 regardless of the visual
 * glyph size (icon-button.tsx) — while the visually smaller colored track is a plain nested
 * `span`, styled off the root's own `data-checked`/`data-unchecked` attribute via Tailwind's
 * `group` utility (the track itself carries no Base UI state of its own, so it cannot be styled
 * with the `data-[checked]` selector directly).
 */
const rootVariants = cva(
    "group relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
    {
        variants: {
            size: {
                sm: "size-11",
                md: "size-11",
                lg: "size-12",
            },
        },
        defaultVariants: {
            size: "md",
        },
    },
);

/*
 * UI-SPEC reserves the accent for the Switch's "on" track specifically — `bg-bg-primary` must
 * never appear on the unchecked state (the reserved-accent rule this plan's must_haves enforce).
 */
const trackVariants = cva(
    "pointer-events-none inline-flex items-center rounded-full border border-transparent p-0.5 transition-colors group-data-[checked]:bg-bg-primary group-data-[unchecked]:bg-text-muted group-data-[unchecked]:opacity-40",
    {
        variants: {
            size: {
                sm: "h-5 w-8",
                md: "h-6 w-10",
                lg: "h-7 w-12",
            },
        },
        defaultVariants: {
            size: "md",
        },
    },
);

const thumbVariants = cva(
    "pointer-events-none flex items-center justify-center rounded-full bg-bg-surface shadow-sm transition-transform [&_svg]:shrink-0",
    {
        variants: {
            size: {
                sm: "size-4 data-[checked]:translate-x-3 [&_svg]:size-2.5",
                md: "size-5 data-[checked]:translate-x-4 [&_svg]:size-3",
                lg: "size-6 data-[checked]:translate-x-5 [&_svg]:size-3.5",
            },
        },
        defaultVariants: {
            size: "md",
        },
    },
);

type Props = Omit<ComponentProps<typeof BaseSwitch.Root>, "className" | "disabled" | "checked" | "children"> &
    Pick<VariantProps<typeof rootVariants>, "size"> &
    ClassNameProp & {
        /** Required — the theme toggle renders no visible text, so this is the control's only name. */
        label: string;
        isChecked?: boolean;
        isDisabled?: boolean;
        /** Rendered inside the thumb, shown only while checked. Marked `aria-hidden` — `label` carries the name. */
        iconOn?: ReactNode;
        /** Rendered inside the thumb, shown only while unchecked. Marked `aria-hidden` — `label` carries the name. */
        iconOff?: ReactNode;
    };

export const Switch = ({ label, isChecked, isDisabled = false, iconOn, iconOff, size, className, ...props }: Props) => {
    return (
        /*
         * `Switch.Root`/`Switch.Thumb` supply role="switch", keyboard toggling and aria-checked
         * state reporting from the library (D-15). `label` renders only into `aria-label` — the
         * theme toggle this primitive unblocks has no visible text by design.
         */
        <BaseSwitch.Root
            checked={isChecked}
            disabled={isDisabled}
            aria-label={label}
            className={cn(rootVariants({ size }), className)}
            {...props}
        >
            <span className={cn(trackVariants({ size }))}>
                <BaseSwitch.Thumb className={cn(thumbVariants({ size }))}>
                    {iconOn ? (
                        <span aria-hidden="true" className="hidden group-data-[checked]:inline-flex">
                            {iconOn}
                        </span>
                    ) : null}
                    {iconOff ? (
                        <span aria-hidden="true" className="hidden group-data-[unchecked]:inline-flex">
                            {iconOff}
                        </span>
                    ) : null}
                </BaseSwitch.Thumb>
            </span>
        </BaseSwitch.Root>
    );
};
