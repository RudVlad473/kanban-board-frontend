"use client";

import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
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
    /** Opens the delete confirmation for this column — nothing is destroyed from here. */
    onDelete: (column: ColumnFull) => void;
    /**
     * The sortable hook's activator ref, listeners and ARIA attributes. Absent is the lone-column
     * case: a column with nowhere to go gets no handle at all rather than a dead one.
     */
    handleProps?: {
        /* A callback ref, deliberately not named `ref`: `react-hooks/refs` reads that name as a ref object. */
        setNode: (element: HTMLElement | null) => void;
        attributes: DraggableAttributes;
        listeners: DraggableSyntheticListeners;
    };
    /** T-03-31: locks this column's own mutations while a reorder it was moved by is unsettled. */
    areMutationsDisabled?: boolean;
    /** Storybook-only staging for the kebab menu's open state (see BoardCard's `defaultIsMenuOpen`). */
    defaultIsMenuOpen?: boolean;
};

/**
 * One column's header row — the id-keyed dot beside the shipped caption, the U-02 drag handle,
 * and the per-column overflow menu. Presentational by design: it owns no state and calls no mutation
 * hook, so its tests drive it without a module mock (ADR tech/0020).
 */
export const ColumnHeader = ({
    column,
    onRename,
    onDelete,
    handleProps,
    areMutationsDisabled = false,
    defaultIsMenuOpen = false,
}: Props) => {
    const caption = toColumnCaption({ name: column.name, taskCount: column.tasks.length });
    /* The count half is cut from the caption itself, so the format stays owned by that one function. */
    const countSuffix = caption.slice(column.name.length);

    /*
     * Read out here rather than inside the JSX: `react-hooks/refs` treats a property access feeding
     * a `ref=` as reaching into a ref object during render, and fails the whole object's reads.
     */
    const setHandleNode = handleProps?.setNode;
    const handleAttributes = handleProps?.attributes;
    const handleListeners = handleProps?.listeners;

    /* Declared once so the handle and the handle-less lone column cannot drift apart visually. */
    const captionRow = (
        <>
            {/* Decoration only: the hue states nothing the caption beside it does not already say. */}
            <span
                aria-hidden="true"
                className={cn("size-4 shrink-0 rounded-full", toColumnDotToken({ id: column.id }))}
            />

            <span className="min-w-0 truncate">{column.name}</span>

            <span className="shrink-0">{countSuffix}</span>
        </>
    );

    return (
        /* Pinned inside the column's own scroll region, with the canvas colour behind it so rows pass under. */
        <div className="sticky top-0 flex items-center gap-2 bg-bg-app pb-6">
            <h2
                id={`board-column-${column.id}`}
                className="min-w-0 flex-1 font-heading-s text-heading-s [font-weight:var(--font-weight-heading-s)] tracking-heading-s text-text-muted uppercase"
            >
                {/* The 44px tier is the kebab's touch target, which sets this row's height too. */}
                {handleProps === undefined ? (
                    <span className="flex min-h-11 items-center gap-4">{captionRow}</span>
                ) : (
                    /*
                     * No click handler of its own — enter LIFTS the column, so a handle that also
                     * activated on enter would be ambiguous. `uppercase` repeats the h2's on purpose: a
                     * UA rule sets text-transform:none on form controls, beating inheritance (03-14).
                     */
                    <button
                        type="button"
                        ref={setHandleNode}
                        {...handleAttributes}
                        {...handleListeners}
                        className="flex min-h-11 w-full cursor-grab items-center gap-4 rounded-sm text-left uppercase focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 focus-visible:outline-none aria-pressed:cursor-grabbing"
                    >
                        {captionRow}
                    </button>
                )}
            </h2>

            {/*
             * A sibling of the heading, never inside it, which is also the first of the two
             * defences against a kebab click starting a drag: it never receives the drag listeners.
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
                    {/* Both entries stay available on a lone column: renaming and deleting are each
                        meaningful there, unlike dragging (UI-SPEC zero-one-many/exactly-1-column). */}
                    <Menu.Item
                        isDisabled={areMutationsDisabled}
                        onClick={() => {
                            onRename(column);
                        }}
                    >
                        Rename Column
                    </Menu.Item>

                    {/* `isDestructive` is the shared danger treatment, not a local colour choice. */}
                    <Menu.Item
                        isDestructive={true}
                        isDisabled={areMutationsDisabled}
                        onClick={() => {
                            onDelete(column);
                        }}
                    >
                        Delete Column
                    </Menu.Item>
                </Menu.Content>
            </Menu.Root>
        </div>
    );
};
