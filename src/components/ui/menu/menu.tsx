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
 * D-07: an action menu wrapping Base UI's dedicated `menu/` entry point (`role="menu"`), not the
 * value-picker `Dropdown` wraps — no item renders as a persisted selection, the trigger's glyph
 * never changes after activation (see 02-07-SUMMARY.md).
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
 * Unstyled by design, same contribution-not-visuals contract as `Modal.Trigger` — a consumer
 * composes a real control via Base UI's `render` prop, e.g. the sidebar's kebab
 * `<Menu.Trigger render={<IconButton .../>} />`, without this file knowing about boards.
 */
const Trigger = ({ className, ...props }: TriggerProps) => {
    return <BaseMenu.Trigger className={className} {...props} />;
};

type ContentProps = Omit<MenuPopupProps, "className"> & ClassNameProp;

/*
 * Mirrors `Dropdown.Content`'s popup silhouette/scroll split and `collisionPadding={16}` mobile
 * margin (ADR tech/0010) — but deliberately NOT sized off the trigger's measured width, since a
 * 44px kebab trigger must let this menu size to its own content instead (see 02-07-SUMMARY.md).
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
                     * `tabIndex={0}` gives the popup a Tab stop — Base UI defaults to
                     * tabindex="-1" (correct per WAI-ARIA); satisfies axe's
                     * scrollable-region-focusable rule once items overflow (see 02-07-SUMMARY.md). */}
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
 * Mirrors `Dropdown.Item`'s padding/typography minus the value-picker's item-text/indicator/
 * checkmark wrapping — an action-menu item has no selected state. Same `first:`/`last:`
 * corner-rounding fix as `Dropdown.Item` (see 01-09-SUMMARY.md).
 */
const Item = ({ isDisabled = false, isDestructive = false, className, children, ...props }: ItemProps) => {
    return (
        <BaseMenu.Item
            disabled={isDisabled}
            className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-4 py-3 font-body-l text-body-l outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-text-muted data-[disabled]:opacity-50 data-[highlighted]:bg-bg-app first:data-[highlighted]:rounded-t-md last:data-[highlighted]:rounded-b-md",
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
