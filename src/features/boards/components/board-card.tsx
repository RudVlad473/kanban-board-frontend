"use client";

import { EllipsisVertical, PanelLeft } from "lucide-react";
import Link from "next/link";

import { IconButton } from "@/components/ui/icon-button/icon-button";
import { Menu } from "@/components/ui/menu/menu";
import type { Board } from "@/features/boards/schemas";
import { buildBoardDetailPath } from "@/lib/core/routing/routes";
import { cn } from "@/lib/core/styling/cn";

type Props = {
    board: Board;
    isSelected: boolean;
    onEdit: (board: Board) => void;
    /** Opens D-06's confirm modal for this row's board — the delete itself never happens from here. */
    onDelete: (board: Board) => void;
    /** Storybook-only staging for the overflow menu's open state (see BoardList's `defaultIsAddBoardOpen`). */
    defaultIsMenuOpen?: boolean;
};

/*
 * One sidebar board row (D-07): the board link plus the per-board overflow menu, built on the
 * action-menu primitive 02-07 shipped — never the value-picker one, which would leave the
 * activated entry marked and rewrite the trigger (02-RESEARCH.md Pitfall 3).
 */
export const BoardCard = ({ board, isSelected, onEdit, onDelete, defaultIsMenuOpen = false }: Props) => {
    return (
        <li className="relative min-w-0">
            {/*
             * Full-bleed pill (UAT finding 1): `mr-6` + `rounded-r-full` match the header's 24px
             * inset, and `pr-11` reserves the kebab's own 44px hit area so the name truncates first.
             */}
            <Link
                href={buildBoardDetailPath(board.id)}
                className={cn(
                    "mr-6 flex h-11 min-w-0 items-center gap-2 rounded-r-full pr-11 pl-6 font-body-m text-body-m [font-weight:var(--font-weight-body-m)]",
                    isSelected ? "bg-bg-primary text-text-on-primary" : "text-text-muted hover:text-text-primary",
                )}
            >
                <PanelLeft aria-hidden="true" className="size-5 shrink-0" />

                <span className="truncate">{board.name}</span>
            </Link>

            <Menu.Root defaultOpen={defaultIsMenuOpen}>
                {/*
                 * The IconButton goes through the trigger's render prop, so the trigger's glyph is
                 * fixed by this composition and can never come to reflect a chosen item.
                 */}
                {/*
                 * The ghost variant's muted glyph on the selected row's own background measures
                 * 1.05:1 in light mode — invisible; the on-primary token restores it (02-12-SUMMARY.md).
                 */}
                <Menu.Trigger
                    render={
                        <IconButton
                            label={`Board actions for ${board.name}`}
                            icon={<EllipsisVertical />}
                            className={cn(
                                "absolute top-1/2 right-6 -translate-y-1/2",
                                isSelected &&
                                    "text-text-on-primary hover:bg-bg-primary-hover hover:text-text-on-primary",
                            )}
                        />
                    }
                />

                <Menu.Content>
                    <Menu.Item
                        onClick={() => {
                            onEdit(board);
                        }}
                    >
                        Edit Board
                    </Menu.Item>

                    <Menu.Item
                        isDestructive
                        onClick={() => {
                            onDelete(board);
                        }}
                    >
                        Delete Board
                    </Menu.Item>
                </Menu.Content>
            </Menu.Root>
        </li>
    );
};
