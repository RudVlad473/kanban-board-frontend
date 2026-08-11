import { Select } from "@base-ui/react/select";
import type { SelectItemProps, SelectPopupProps, SelectRootProps, SelectTriggerProps } from "@base-ui/react/select";
import { cva } from "class-variance-authority";
import { Check, ChevronDown } from "lucide-react";
import { createContext, useContext, useId, type ReactNode } from "react";

import { useOverflowFade } from "@/hooks/use-overflow-fade";
import { cn } from "@/lib/cn";

// D-19: Dropdown's public shape mirrors Base UI's own Select composition — Root/Trigger/Content/
// Item — rather than a list-of-options prop; every future consumer (board selector, column
// actions, task status) is written against this shape. Focus trapping, roving tabindex,
// outside-click dismissal and typeahead all come from Select itself (D-15; RESEARCH.md's Don't
// Hand-Roll table names exactly this category) — this file contains no `useEffect` reading or
// writing `document.activeElement`.

// `hasError` lives on Root but must style Trigger — a sibling compound sub-component the
// consumer instantiates as Root's child, not a prop Root can pass directly. Threaded via context
// rather than cloning/inspecting Root's children.
const DropdownContext = createContext<{ hasError: boolean }>({ hasError: false });

type DropdownRootProps = Omit<SelectRootProps<string>, "disabled" | "children"> & {
    hasError?: boolean;
    isDisabled?: boolean;
    className?: string;
    children?: ReactNode;
};

const Root = ({ hasError = false, isDisabled = false, className, children, ...props }: DropdownRootProps) => {
    return (
        <DropdownContext.Provider value={{ hasError }}>
            <div className={cn("inline-block w-full", className)}>
                <Select.Root disabled={isDisabled} {...props}>
                    {children}
                </Select.Root>
            </div>
        </DropdownContext.Provider>
    );
};

// D-17: the same danger border token TextField and Checkbox use, on the same 12px
// (`px-4 py-3`)/`h-10` box shape as TextField's own trigger-like control.
const triggerVariants = cva(
    "flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-bg-surface px-4 py-3 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-text-muted data-[disabled]:opacity-50",
    {
        variants: {
            state: {
                default: "border-border-default",
                error: "border-border-danger",
            },
        },
        defaultVariants: {
            state: "default",
        },
    },
);

type DropdownTriggerProps = Omit<SelectTriggerProps, "className" | "children" | "disabled"> & {
    placeholder?: string;
    className?: string;
};

const Trigger = ({ placeholder, className, ...props }: DropdownTriggerProps) => {
    const { hasError } = useContext(DropdownContext);
    // ARIA's `combobox` role takes its accessible name from `author` only, never from content
    // (unlike `button`) — `Select.Value`'s rendered text (placeholder or selected item label)
    // must be wired in explicitly via `aria-labelledby`, or the trigger has no accessible name
    // at all despite rendering visible text.
    const valueId = useId();
    // A trailing-edge fade signals that more of the selected label exists off-screen once it
    // overflows — the same Safari-address-bar affordance TextField's input gets. `Select.Value`
    // forwards its ref to the underlying `<span>`, so the hook observes it directly; a re-render
    // that swaps the rendered label text (a real DOM text-node change) is exactly what the hook's
    // internal `MutationObserver` catches, no extra wiring needed on selection change.
    const { ref: overflowRef, isOverflowing } = useOverflowFade<HTMLSpanElement>();
    return (
        <Select.Trigger
            aria-labelledby={valueId}
            className={cn(triggerVariants({ state: hasError ? "error" : "default" }), className)}
            {...props}
        >
            {/* `min-w-0` lets this flex item actually shrink below its content's min-content size
                (a flex item's default `min-width: auto` would otherwise block it) — required for
                both the existing `truncate` backstop and the overflow fade below to have a bounded
                box to measure against, rather than pushing the trigger wider than its own anchor. */}
            <span className="relative min-w-0 flex-1 overflow-hidden">
                <Select.Value
                    ref={overflowRef}
                    id={valueId}
                    placeholder={placeholder}
                    className="block truncate text-left text-text-primary data-[placeholder]:text-text-muted"
                />
                {isOverflowing ? (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-r from-transparent to-bg-surface"
                    />
                ) : null}
            </span>
            <Select.Icon className="text-text-muted">
                <ChevronDown aria-hidden="true" className="size-4" />
            </Select.Icon>
        </Select.Trigger>
    );
};

type DropdownContentProps = Omit<SelectPopupProps, "className"> & {
    className?: string;
};

// `shadow.md`/`radius.md` — the popup elevation and corner measured in plan 01-04, the same
// surface-elevation treatment as every other elevated surface in this design system.
// `w-[var(--anchor-width)]` reads the CSS variable Base UI's Positioner sets from the trigger's
// own measured width, so the popup always matches the trigger it belongs to.
const Content = ({ className, children, ...props }: DropdownContentProps) => {
    return (
        <Select.Portal>
            <Select.Positioner className="z-50 outline-none" sideOffset={4}>
                <Select.Popup
                    className={cn(
                        "max-h-72 w-[var(--anchor-width)] overflow-y-auto rounded-md border border-border-default bg-bg-surface p-1 shadow-md outline-none",
                        className,
                    )}
                    {...props}
                >
                    {children}
                </Select.Popup>
            </Select.Positioner>
        </Select.Portal>
    );
};

type DropdownItemProps = Omit<SelectItemProps, "className" | "disabled" | "value" | "children"> & {
    /** A unique value identifying this item — required, so an item cannot be constructed value-less. */
    value: string;
    isDisabled?: boolean;
    className?: string;
    children?: ReactNode;
};

// Popup insets its items by `p-1` (4px) from its own `rounded-md` (24px) edge — small enough that
// a square-cornered highlight on the first/last item still visibly pokes past that large a
// corner radius. `first:`/`last:` keep the fix scoped to the item actually touching the popup's
// curve; middle items' highlights stay square, matching the popup's own straight side edges.
const Item = ({ value, isDisabled = false, className, children, ...props }: DropdownItemProps) => {
    return (
        <Select.Item
            value={value}
            disabled={isDisabled}
            className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-4 py-3 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-text-muted data-[disabled]:opacity-50 data-[highlighted]:bg-bg-app first:data-[highlighted]:rounded-t-md last:data-[highlighted]:rounded-b-md",
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
