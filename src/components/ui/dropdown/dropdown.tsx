import { Select } from "@base-ui/react/select";
import type { SelectItemProps, SelectPopupProps, SelectRootProps, SelectTriggerProps } from "@base-ui/react/select";
import { cva } from "class-variance-authority";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { createContext, useContext, useId, type PropsWithChildren } from "react";

import { useOverflowIndicator } from "@/hooks/use-overflow-indicator";
import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

/*
 * D-19: Dropdown's public shape mirrors Base UI's own Select composition — Root/Trigger/Content/
 * Item — rather than a list-of-options prop; every future consumer (board selector, column
 * actions, task status) is written against this shape. Focus trapping, roving tabindex,
 * outside-click dismissal and typeahead all come from Select itself (D-15; RESEARCH.md's Don't
 * Hand-Roll table names exactly this category) — this file contains no `useEffect` reading or
 * writing `document.activeElement`.
 */

/*
 * `hasError`/`isLoading` live on Root but must style Trigger — a sibling compound sub-component
 * the consumer instantiates as Root's child, not a prop Root can pass directly. Threaded via
 * context rather than cloning/inspecting Root's children.
 */
const DropdownContext = createContext<{ hasError: boolean; isLoading: boolean }>({
    hasError: false,
    isLoading: false,
});

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

/*
 * D-17: the same danger border token TextField and Checkbox use, on the same 12px
 * (`px-4 py-3`)/`h-10` box shape as TextField's own trigger-like control.
 * `rounded-sm` (radius.sm, 4px) — tokens/radius.tokens.json documents this token as the measured
 * "Text Field / Dropdown corner radius"; `rounded-md` (24px, "Button Secondary corner radius")
 * was wired in by mistake and never caught. The floating popup below (`popupVariants`) keeps its
 * own `rounded-md` — the token's description covers this trigger, not the popup surface.
 */
const triggerVariants = cva(
    "flex h-10 w-full items-center justify-between gap-2 rounded-sm border bg-bg-surface px-4 py-3 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-text-muted data-[disabled]:opacity-50",
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

type DropdownTriggerProps = Omit<SelectTriggerProps, "className" | "children" | "disabled"> &
    ClassNameProp & {
        placeholder?: string;
    };

const Trigger = ({ placeholder, className, ...props }: DropdownTriggerProps) => {
    const { hasError, isLoading } = useContext(DropdownContext);
    /*
     * ARIA's `combobox` role takes its accessible name from `author` only, never from content
     * (unlike `button`) — `Select.Value`'s rendered text (placeholder or selected item label)
     * must be wired in explicitly via `aria-labelledby`, or the trigger has no accessible name
     * at all despite rendering visible text.
     */
    const valueId = useId();
    /*
     * A trailing-edge "…" indicator signals that more of the selected label exists off-screen
     * once it overflows. `Select.Value` already truncates its text with CSS `text-overflow:
     * ellipsis` (`truncate`, below) — this adds the same deliberate, consistently-styled cue
     * TextField's input gets (which has no native ellipsis of its own, only horizontal scroll),
     * rather than relying on two different primitives signalling overflow two different ways.
     * `Select.Value` forwards its ref to the underlying `<span>`, so the hook observes it
     * directly; a re-render that swaps the rendered label text (a real DOM text-node change) is
     * exactly what the hook's internal `MutationObserver` catches, no extra wiring needed on
     * selection change.
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
 * `shadow.md`/`radius.md` — the popup elevation and corner measured in plan 01-04, the same
 * surface-elevation treatment as every other elevated surface in this design system.
 * `w-[var(--anchor-width)]` reads the CSS variable Base UI's Positioner sets from the trigger's
 * own measured width, so the popup always matches the trigger it belongs to.
 *
 * The silhouette (`rounded-md`/`shadow-md`/`overflow-hidden`) and the scroll
 * (`overflow-y-auto`/`max-h-72`) are deliberately on two different elements — the same
 * class of fix as Modal's panel (modal.tsx), but inverted: here the OUTER wrapper carries the
 * silhouette and clips it, while `Select.Popup` (the inner element) carries the scroll. Modal's
 * `Dialog.Popup` has no ARIA role of its own, so an inner scroll wrapper worked there; `Select.
 * Popup` carries `role="listbox"`, which per ARIA requires its children to be `option` roles
 * directly — wrapping the options in a plain scroll `<div>` between the listbox and its options
 * violates that (axe `aria-required-children`), so the listbox itself has to stay the scrollable
 * element and a plain outer `<div>` (no ARIA role) owns the silhouette instead. Putting the scroll
 * directly on the rounded/shadowed element (the original layout) let the scrollable region's edge
 * and an in-flow scrollbar (Firefox reserves layout width for it; Chrome's overlay scrollbar
 * merely hides the same underlying bug) render against or outside the rounded corner once the
 * item list actually needed to scroll.
 * ADR tech/0010 mobile review: `collisionPadding` defaults to Floating UI's generic 5px, which on
 * a narrow 375px viewport can let the popup render flush (or nearly so) against the screen edge
 * once the trigger sits near it. 16px (this design system's own `space-4`, UI-SPEC's spacing
 * scale) keeps a real margin on every side regardless of viewport — a single always-on value,
 * not a mobile/desktop split, since Floating UI's own collision detection only actually engages
 * near an edge in the first place, which mobile viewports make far more likely to happen at all.
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
 * Popup insets its items by `p-1` (4px) from its own `rounded-md` (24px) edge — small enough that
 * a square-cornered highlight on the first/last item still visibly pokes past that large a
 * corner radius. `first:`/`last:` keep the fix scoped to the item actually touching the popup's
 * curve; middle items' highlights stay square, matching the popup's own straight side edges.
 */
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
