"use client";

import { EllipsisVertical } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button/icon-button";
import { Menu } from "@/components/ui/menu/menu";
import { toColumnCaption, toColumnDotToken } from "@/features/boards/model";
import type { ColumnFull } from "@/features/boards/schemas";
import { cn } from "@/lib/core/styling/cn";

type Props = {
    column: ColumnFull;
    /** Opens the rename modal for this column — the rename itself never happens from here. */
    onRename: (column: ColumnFull) => void;
    /** Storybook-only staging for the kebab menu's open state (see BoardCard's `defaultIsMenuOpen`). */
    defaultIsMenuOpen?: boolean;
};

/**
 * One column's header row — U-03's position-cycled dot beside the shipped caption, plus the
 * per-column overflow menu. Presentational by design: it owns no state and calls no mutation hook,
 * so its tests drive it without a module mock (ADR tech/0020).
 */
export const ColumnHeader = ({ column, onRename, defaultIsMenuOpen = false }: Props) => {
    const caption = toColumnCaption({ name: column.name, taskCount: column.tasks.length });
    /* The count half is cut from the caption itself, so the format stays owned by that one function. */
    const countSuffix = caption.slice(column.name.length);

    return (
        /* Pinned inside the column's own scroll region, with the canvas colour behind it so rows pass under. */
        <div className="sticky top-0 flex items-center gap-2 bg-bg-app pb-6">
            <h2
                id={`board-column-${column.id}`}
                className="min-w-0 flex-1 font-heading-s text-heading-s [font-weight:var(--font-weight-heading-s)] tracking-heading-s text-text-muted uppercase"
            >
                {/* The 44px tier is the kebab's touch target, which sets this row's height too. */}
                <span className="flex min-h-11 items-center gap-1">
                    {/* Decoration only: the hue states nothing the caption beside it does not already say. */}
                    <span
                        aria-hidden="true"
                        className={cn("size-4 shrink-0 rounded-full", toColumnDotToken({ position: column.position }))}
                    />

                    <span className="min-w-0 truncate">{column.name}</span>

                    <span className="shrink-0">{countSuffix}</span>
                </span>
            </h2>

            {/*
             * A sibling of the heading, never inside it (D-06): plan 03-10 turns the heading into a
             * drag handle whose lift keys include Enter, which a nested kebab would make ambiguous.
             */}
            <Menu.Root defaultOpen={defaultIsMenuOpen}>
                <Menu.Trigger
                    render={
                        <IconButton
                            variant="ghost"
                            size="md"
                            label={`Column actions for ${column.name}`}
                            icon={<EllipsisVertical />}
                        />
                    }
                />

                <Menu.Content>
                    {/* One entry for now — the destructive one lands with plan 03-09, which is when
                        it will actually do something. */}
                    <Menu.Item
                        onClick={() => {
                            onRename(column);
                        }}
                    >
                        Rename Column
                    </Menu.Item>
                </Menu.Content>
            </Menu.Root>
        </div>
    );
};
