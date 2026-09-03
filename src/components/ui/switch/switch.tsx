import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { rootVariants, thumbVariants, trackVariants } from "@/components/ui/switch/switch-variants";
import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

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
         * state reporting from the library. `label` renders only into `aria-label` — the
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
