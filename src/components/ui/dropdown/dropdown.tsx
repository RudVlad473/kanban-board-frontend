import { Select } from "@base-ui/react/select";
import type { SelectItemProps, SelectPopupProps, SelectRootProps, SelectTriggerProps } from "@base-ui/react/select";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { useContext, useId, type PropsWithChildren } from "react";

import { DropdownContext } from "@/components/ui/dropdown/dropdown-context";
import { triggerVariants } from "@/components/ui/dropdown/dropdown-variants";
import { useOverflowIndicator } from "@/hooks/use-overflow-indicator";
import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

/*
 * D-19: Dropdown's public shape mirrors Base UI's own Select composition (Root/Trigger/Content/
 * Item), not a list-of-options prop; focus trapping, roving tabindex, outside-click dismissal and
 * typeahead all come from Select itself (D-15, see 01-CONTEXT.md).
 */

type DropdownRootProps = PropsWithChildren<
    Omit<SelectRootProps<string>, "disabled" | "children"> &
        ClassNameProp & {
            hasError?: boolean;
            isDisabled?: boolean;
            /**
             * Transient "the data backing this dropdown is still loading" state — composes with
             * `isDisabled` (either makes the trigger non-interactive), but only `isLoading` sets
             * `aria-busy` and swaps the trailing chevron for a spinner.
             */
            isLoading?: boolean;
        }
>;

const Root = ({
    hasError = false,
    isDisabled = false,
    isLoading = false,
    className,
    children,
    ...props
}: DropdownRootProps) => {
    return (
        <DropdownContext.Provider value={{ hasError, isLoading }}>
            <div className={cn("inline-block w-full", className)}>
                <Select.Root disabled={isDisabled || isLoading} {...props}>
                    {children}
                </Select.Root>
            </div>
        </DropdownContext.Provider>
    );
};

type DropdownTriggerProps = Omit<SelectTriggerProps, "className" | "children" | "disabled"> &
    ClassNameProp & {
        placeholder?: string;
    };

const Trigger = ({ placeholder, className, ...props }: DropdownTriggerProps) => {
    const { hasError, isLoading } = useContext(DropdownContext);
    /*
     * ARIA's `combobox` role takes its accessible name from `author` only, never content —
     * `Select.Value`'s rendered text must be wired in explicitly via `aria-labelledby`, or the
     * trigger has no accessible name despite rendering visible text (see 01-CONTEXT.md D-15).
     */
    const valueId = useId();
    /*
     * A trailing-edge "…" cue signals the selected label overflows, mirroring TextField's own
     * indicator (see 01-09-SUMMARY.md); `useOverflowIndicator`'s own doc comment covers the
     * ResizeObserver/MutationObserver mechanism this hook call relies on.
     */
    const { ref: overflowRef, isOverflowing } = useOverflowIndicator<HTMLSpanElement>();
    return (
        <Select.Trigger
            aria-labelledby={valueId}
            aria-busy={isLoading}
            className={cn(triggerVariants({ state: hasError ? "error" : "default" }), className)}
            {...props}
        >
            {/* `min-w-0` lets this flex item actually shrink below its content's min-content size
                (a flex item's default `min-width: auto` would otherwise block it) — required for
                both the existing `truncate` backstop and the overflow indicator below to have a
                bounded box to measure against, rather than pushing the trigger wider than its own
                anchor. */}
            <span className="relative min-w-0 flex-1 overflow-hidden">
                <Select.Value
                    ref={overflowRef}
                    id={valueId}
                    placeholder={placeholder}
                    className="block truncate text-left text-text-primary data-[placeholder]:text-text-muted"
                />

                {isOverflowing ? (
                    /*
                     * An opaque `bg-bg-surface` patch under the glyph — not a gradient — so the
                     * "…" reads clearly; `text-text-muted` keeps it legible in both themes.
                     */
                    <span
                        aria-hidden="true"
                        data-overflow-indicator=""
                        className="pointer-events-none absolute inset-y-0 right-0 flex items-center bg-bg-surface pl-1 text-text-muted"
                    >
                        …
                    </span>
                ) : null}
            </span>

            <Select.Icon className="text-text-muted">
                {isLoading ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                    <ChevronDown aria-hidden="true" className="size-4" />
                )}
            </Select.Icon>
        </Select.Trigger>
    );
};

type DropdownContentProps = Omit<SelectPopupProps, "className"> & ClassNameProp;

/*
 * Silhouette (`rounded-md`/`shadow-md`) and scroll live on different elements since `Select.
 * Popup`'s `role="listbox"` forbids a non-option child between it and its items (axe
 * `aria-required-children`, see 01-09-SUMMARY.md). Tokens: 01-04-SUMMARY.md; mobile margin: ADR tech/0010.
 */
const Content = ({ className, children, ...props }: DropdownContentProps) => {
    return (
        <Select.Portal>
            <Select.Positioner className="z-50 outline-none" sideOffset={4} collisionPadding={16}>
                <div
                    className={cn(
                        "w-[var(--anchor-width)] overflow-hidden rounded-md border border-border-default bg-bg-surface shadow-md",
                        className,
                    )}
                >
                    <Select.Popup className="max-h-72 overflow-y-auto p-1 outline-none" {...props}>
                        {children}
                    </Select.Popup>
                </div>
            </Select.Positioner>
        </Select.Portal>
    );
};

type DropdownItemProps = PropsWithChildren<
    Omit<SelectItemProps, "className" | "disabled" | "value" | "children"> &
        ClassNameProp & {
            /** A unique value identifying this item — required, so an item cannot be constructed value-less. */
            value: string;
            isDisabled?: boolean;
        }
>;

/*
 * `first:`/`last:` scope rounded item-highlight corners to just the item touching the popup's own
 * `rounded-md` edge — a square highlight there visibly pokes past that curve at only `p-1` inset;
 * middle items stay square, matching the popup's straight sides (see 01-09-SUMMARY.md).
 */
const Item = ({ value, isDisabled = false, className, children, ...props }: DropdownItemProps) => {
    return (
        <Select.Item
            value={value}
            disabled={isDisabled}
            className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-4 py-3 font-body-l text-body-l text-text-primary outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-text-muted data-[disabled]:opacity-50 data-[highlighted]:bg-bg-app first:data-[highlighted]:rounded-t-md last:data-[highlighted]:rounded-b-md",
                className,
            )}
            {...props}
        >
            <Select.ItemText>{children}</Select.ItemText>

            {/* The active/selected item indicator uses the accent colour (UI-SPEC Color). */}
            <Select.ItemIndicator className="text-bg-primary">
                <Check aria-hidden="true" className="size-4" strokeWidth={3} />
            </Select.ItemIndicator>
        </Select.Item>
    );
};

export const Dropdown = { Root, Trigger, Content, Item };
