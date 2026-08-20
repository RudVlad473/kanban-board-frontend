"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import type {
    MenuItemProps as BaseMenuItemProps,
    MenuPopupProps,
    MenuRootProps as BaseMenuRootProps,
    MenuTriggerProps as BaseMenuTriggerProps,
} from "@base-ui/react/menu";
import type { PropsWithChildren } from "react";

import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

/*
 * D-07/02-RESEARCH.md Common Pitfall 3: an action menu, not a value picker — `Menu` wraps Base
 * UI's own `menu/` entry point (`role="menu"`/`menuitem"`s, verified against the installed
 * `node_modules/@base-ui/react/menu` surface at plan execution time), not the value-picker
 * primitive `Dropdown` wraps. No item ever renders as a persisted selection and the trigger's
 * glyph never changes after an item is activated — there is no selected-value state to reflect in
 * the first place.
 */
type RootProps = PropsWithChildren<Omit<BaseMenuRootProps, "disabled" | "children"> & { isDisabled?: boolean }>;

const Root = ({ isDisabled = false, children, ...props }: RootProps) => {
    return (
        <BaseMenu.Root disabled={isDisabled} {...props}>
            {children}
        </BaseMenu.Root>
    );
};

type TriggerProps = Omit<BaseMenuTriggerProps, "className"> & ClassNameProp;

/*
 * Unstyled by design — the same contribution-not-visuals contract `Modal.Trigger` documents. A
 * consumer composes a real control in via Base UI's `render` prop, e.g. the sidebar's kebab:
 * `<Menu.Trigger render={<IconButton label="Board actions" icon={<EllipsisVertical />} />} />` —
 * which keeps the required accessible name and 44px hit area without this file knowing anything
 * about boards.
 */
const Trigger = ({ className, ...props }: TriggerProps) => {
    return <BaseMenu.Trigger className={className} {...props} />;
};

type ContentProps = Omit<MenuPopupProps, "className"> & ClassNameProp;

/*
 * `Dropdown.Content`'s exact popup silhouette/scroll split (outer plain `div` owns
 * `rounded-md`/`border-border-default`/`bg-bg-surface`/`shadow-md`/`overflow-hidden`, the Base UI
 * popup inside owns the padding and scroll), `sideOffset={4}`/`collisionPadding={16}` (ADR
 * tech/0010's mobile-edge review). Deliberately not sized off the trigger's own measured width the
 * way `Dropdown.Content` is (that CSS custom property Base UI's Positioner exposes) — a kebab
 * trigger is 44px wide and this menu must size to its own content instead.
 */
const Content = ({ className, children, ...props }: ContentProps) => {
    return (
        <BaseMenu.Portal>
            <BaseMenu.Positioner className="z-50 outline-none" sideOffset={4} collisionPadding={16}>
                <div
                    className={cn(
                        "overflow-hidden rounded-md border border-border-default bg-bg-surface shadow-md",
                        className,
                    )}
                >
                    {/*
                     * `tabIndex={0}`: Base UI moves real DOM focus onto the popup itself when the
                     * menu opens (verified directly — `document.activeElement` is this element,
                     * not any item, until an arrow key is pressed), but renders it with
                     * `tabindex="-1"` — deliberately outside the natural Tab sequence, correct per
                     * the WAI-ARIA menu pattern (Tab closes a menu; arrow keys navigate it). axe's
                     * `scrollable-region-focusable` rule doesn't recognize a programmatically
                     * (JS `.focus()`) focused, negative-tabindex container as "keyboard
                     * accessible" for a scrolling region, and fires on any story with enough items
                     * to overflow `max-h-72` before an item has been arrow-key-highlighted.
                     * Overriding to `0` keeps the already-correct roving-tabindex item navigation
                     * unchanged (Escape/Arrow/Enter behavior is item-driven, not container-driven)
                     * while giving the scrollable region itself a real place in the Tab order too.
                     */}
                    <BaseMenu.Popup tabIndex={0} className="max-h-72 overflow-y-auto p-1 outline-none" {...props}>
                        {children}
                    </BaseMenu.Popup>
                </div>
            </BaseMenu.Positioner>
        </BaseMenu.Portal>
    );
};

type ItemProps = PropsWithChildren<
    Omit<BaseMenuItemProps, "className" | "disabled"> &
        ClassNameProp & {
            isDisabled?: boolean;
            /** UI-SPEC "Destructive reserved for" list item 1 — e.g. the kebab menu's "Delete Board". */
            isDestructive?: boolean;
        }
>;

/*
 * `Dropdown.Item`'s padding/typography, minus the item-text/item-indicator wrapping its
 * value-picker sibling uses and minus the checkmark — an action menu item has no selected state
 * to indicate. Same first/last
 * highlight-corner rounding fix as `Dropdown.Item` (the popup's own `p-1` inset is small enough
 * that a square-cornered highlight visibly pokes past the popup's `rounded-md` curve on the item
 * actually touching it).
 */
const Item = ({ isDisabled = false, isDestructive = false, className, children, ...props }: ItemProps) => {
    return (
        <BaseMenu.Item
            disabled={isDisabled}
            className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-4 py-3 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-text-muted data-[disabled]:opacity-50 data-[highlighted]:bg-bg-app first:data-[highlighted]:rounded-t-md last:data-[highlighted]:rounded-b-md",
                isDestructive ? "text-text-danger" : "text-text-primary",
                className,
            )}
            {...props}
        >
            {children}
        </BaseMenu.Item>
    );
};

export const Menu = { Root, Trigger, Content, Item };
