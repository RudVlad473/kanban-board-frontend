"use client";

import { closestCenter, DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { useEffect, useRef, useState } from "react";
import { useBoolean, useMediaQuery } from "usehooks-ts";

import { Button } from "@/components/ui/button/button";
import { AddColumnModal } from "@/features/boards/components/add-column-modal/add-column-modal";
import { AddColumnPlaceholder } from "@/features/boards/components/add-column-placeholder/add-column-placeholder";
import { DeleteColumnConfirm } from "@/features/boards/components/delete-column-confirm/delete-column-confirm";
import { RenameColumnModal } from "@/features/boards/components/rename-column-modal/rename-column-modal";
import { SortableColumn } from "@/features/boards/components/sortable-column/sortable-column";
import { useColumnDragSensors } from "@/features/boards/hooks/use-column-drag-sensors";
import { useCreateColumn } from "@/features/boards/hooks/use-create-column";
import { useDeleteColumn, type DeleteColumnArgs } from "@/features/boards/hooks/use-delete-column";
import { useRenameColumn, type RenameColumnArgs } from "@/features/boards/hooks/use-rename-column";
import { useReorderColumns } from "@/features/boards/hooks/use-reorder-columns";
import { createColumnReorderAnnouncements, toColumnCaption, toColumnDotToken } from "@/features/boards/model";
import type { BoardFull, ColumnFull } from "@/features/boards/schemas";
import { cn } from "@/lib/core/styling/cn";

/*
 * COLUMN-01 makes this the board's client container: it owns the Add Column modal's open state and
 * the create hook, while its presentational children take `onSubmit`/`isPending` as props. Task
 * cards stay display only — task interaction is Phase 4.
 */
type Props = {
    board: BoardFull;
    /** Storybook-only staging for the Add Column modal's open state — no real caller passes this. */
    defaultIsAddColumnOpen?: boolean;
    /** Storybook-only staging — seeds the rename modal open on the column at this index. */
    defaultRenameColumnTargetIndex?: number;
    /** Storybook-only staging — seeds the delete confirmation open on the column at this index. */
    defaultDeleteColumnTargetIndex?: number;
};

export const BoardView = ({
    board,
    defaultIsAddColumnOpen = false,
    defaultRenameColumnTargetIndex,
    defaultDeleteColumnTargetIndex,
}: Props) => {
    const {
        value: isAddColumnOpen,
        setValue: setIsAddColumnOpen,
        setFalse: closeAddColumn,
    } = useBoolean(defaultIsAddColumnOpen);
    /*
     * Bumped on every fresh open and used as the modal's `key`, so each open starts from an empty
     * field — a failed create keeps its value because the modal never closed, not because the form
     * is retained across opens (mirrors `board-list.tsx`).
     */
    const [openCount, setOpenCount] = useState(0);
    const [columnBeingRenamed, setColumnBeingRenamed] = useState<ColumnFull | null>(
        defaultRenameColumnTargetIndex === undefined ? null : (board.columns[defaultRenameColumnTargetIndex] ?? null),
    );
    const [columnBeingDeleted, setColumnBeingDeleted] = useState<ColumnFull | null>(
        defaultDeleteColumnTargetIndex === undefined ? null : (board.columns[defaultDeleteColumnTargetIndex] ?? null),
    );
    const [liftedColumnId, setLiftedColumnId] = useState<string | null>(null);
    const columnCount = board.columns.length;
    const { createColumn, isPending, errorMessage, clearError } = useCreateColumn({ columnCount });
    /* The DERIVED columns, not the raw props — that array is what carries the optimistic name. */
    const { renameColumn, columns: renamedColumns } = useRenameColumn({ columns: board.columns });
    /* Chained onto the rename's own output, so a column can be renamed and moved in the same session. */
    const {
        reorderColumns: requestReorder,
        columns: renderedColumns,
        reorderingColumnId,
    } = useReorderColumns({ columns: renamedColumns });
    const { deleteColumn, isPending: isDeletePending } = useDeleteColumn();
    const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", { initializeWithValue: false });

    const sensors = useColumnDragSensors();

    const liftedColumn = renderedColumns.find((column) => column.id === liftedColumnId) ?? null;

    const ghostColumnRef = useRef<HTMLButtonElement>(null);
    /** The column count when a create landed — a ref, so retiring the request costs no render. */
    const scrollRequestedAtCount = useRef<number | null>(null);

    /* No motion argument: the default resolves to the row's own CSS, which is what `motion-reduce` varies. */
    const scrollGhostColumnIntoView = (): void => {
        ghostColumnRef.current?.scrollIntoView({ inline: "end", block: "nearest" });
    };

    /*
     * D-04's second pass. The row grows only once the action's own `refresh()` lands, so scrolling
     * at the instant of success alone would move the row as it stood before the new column existed.
     * Retired as it runs, so a later count change (a delete) cannot re-fire it (T-03-27).
     */
    useEffect(() => {
        if (scrollRequestedAtCount.current === null || scrollRequestedAtCount.current === columnCount) {
            return;
        }

        scrollRequestedAtCount.current = null;
        scrollGhostColumnIntoView();
    }, [columnCount]);

    const handleOpenChange = (nextIsOpen: boolean): void => {
        setIsAddColumnOpen(nextIsOpen);
        clearError();

        if (nextIsOpen) {
            setOpenCount((count) => count + 1);
        }
    };

    /* Closed only when the create actually landed, so an inline failure has a modal to land in. */
    const handleSubmit = (values: { name: string }): void => {
        void createColumn({ boardId: board.id, name: values.name }).then((outcome) => {
            if (outcome.didCreate) {
                closeAddColumn();
                /* Confirms the create at once against the row as it stands; the effect finishes the job. */
                scrollRequestedAtCount.current = columnCount;
                scrollGhostColumnIntoView();
            }
        });
    };

    /*
     * U-05: closed on submit, not on settle — `renameColumn` applied the optimistic override
     * synchronously before this line runs, so the header already shows the new name underneath. A
     * later failure still reverts it and raises the hook's own toast, modal or no modal.
     */
    const handleRenameSubmit = (values: RenameColumnArgs): void => {
        void renameColumn(values);
        setColumnBeingRenamed(null);
    };

    /*
     * U-05, and the deliberate opposite of the rename handler above: closed when the mutation
     * SETTLES, not when it is submitted. Nothing was removed optimistically, so the destructive
     * button's own pending state is the only signal the user has that anything is happening.
     */
    const handleDeleteSubmit = (values: DeleteColumnArgs): void => {
        void deleteColumn(values).finally(() => {
            setColumnBeingDeleted(null);
        });
    };

    const openAddColumn = (): void => {
        handleOpenChange(true);
    };

    const handleDragStart = ({ active }: DragStartEvent): void => {
        setLiftedColumnId(String(active.id));
    };

    const handleDragCancel = (): void => {
        setLiftedColumnId(null);
    };

    /*
     * One completed move, one request (T-03-12). A drop with no target, or one that ended where it
     * began, is not a move — every intermediate arrow step stayed inside the library.
     */
    const handleDragEnd = ({ active, over }: DragEndEvent): void => {
        setLiftedColumnId(null);

        if (over === null || active.id === over.id) {
            return;
        }

        /* Both indices come from the RENDERED array, which is the same order the sortable items are in. */
        const fromIndex = renderedColumns.findIndex((column) => column.id === active.id);
        const toIndex = renderedColumns.findIndex((column) => column.id === over.id);

        if (fromIndex === -1 || toIndex === -1) {
            return;
        }

        void requestReorder({ boardId: board.id, fromIndex, toIndex });
    };

    return (
        <>
            {columnCount === 0 ? (
                /*
                 * UI-SPEC empty/0-columns: the centred call to action REPLACES the ghost column
                 * here, so this branch deliberately renders no `AddColumnPlaceholder`.
                 */
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 bg-bg-app p-6">
                    <p className="text-center font-heading-l text-heading-l [font-weight:var(--font-weight-heading-l)] text-text-muted">
                        This board is empty. Create a new column to get started.
                    </p>

                    {/* Auto-width and centred, never full-width (UI-SPEC accent reserved-for item 6). */}
                    <Button type="button" variant="primary" onClick={openAddColumn}>
                        + Add New Column
                    </Button>
                </div>
            ) : (
                /*
                 * The context id is derived from the board's own id, not left to the library: its
                 * description ids come from a module-scope counter that drifts between the server
                 * render and a fresh client, producing an `aria-describedby` hydration mismatch.
                 */
                <DndContext
                    id={`board-columns-${board.id}`}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    /*
                     * The library renders its own live region behind a mounted gate — separate from
                     * the toast viewport by construction, which is what the UI-SPEC requires.
                     */
                    accessibility={{ announcements: createColumnReorderAnnouncements({ columns: renderedColumns }) }}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    {/*
                     * The column row scrolls horizontally; columns keep their width rather than
                     * wrapping. The one declaration governing D-04's motion and its opt-out lives here.
                     */}
                    <div className="flex min-h-0 flex-1 gap-6 overflow-x-auto scroll-smooth bg-bg-app p-6 motion-reduce:scroll-auto">
                        {/* Item ids come from the same rendered array the map walks — the library requires render order. */}
                        <SortableContext
                            items={renderedColumns.map((column) => column.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {renderedColumns.map((column) => (
                                <SortableColumn
                                    key={column.id}
                                    column={column}
                                    isReorderDisabled={renderedColumns.length === 1}
                                    isReordering={column.id === reorderingColumnId}
                                    onRename={setColumnBeingRenamed}
                                    onDelete={setColumnBeingDeleted}
                                />
                            ))}
                        </SortableContext>

                        {/* Last flex child INSIDE the scroll row, so it scrolls away with the columns (UI-SPEC overflow). */}
                        <AddColumnPlaceholder ref={ghostColumnRef} onOpen={openAddColumn} />
                    </div>

                    {/* The full-opacity preview that follows the pointer while the column itself stays
                        in place at reduced opacity; the settle is dropped entirely under reduce-motion. */}
                    <DragOverlay dropAnimation={prefersReducedMotion ? null : undefined}>
                        {liftedColumn === null ? null : (
                            <div className="flex w-70 items-center gap-4 rounded-sm bg-bg-surface px-2 py-3 font-heading-s text-heading-s [font-weight:var(--font-weight-heading-s)] tracking-heading-s text-text-muted uppercase shadow-lg">
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        "size-4 shrink-0 rounded-full",
                                        toColumnDotToken({ id: liftedColumn.id }),
                                    )}
                                />

                                <span className="min-w-0 truncate">
                                    {toColumnCaption({
                                        name: liftedColumn.name,
                                        taskCount: liftedColumn.tasks.length,
                                    })}
                                </span>
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            )}

            <AddColumnModal
                key={openCount}
                isOpen={isAddColumnOpen}
                onOpenChange={handleOpenChange}
                onSubmit={handleSubmit}
                isPending={isPending}
                errorMessage={errorMessage}
            />

            {columnBeingRenamed === null ? null : (
                <RenameColumnModal
                    /* Keyed on the target column, so reopening on another header seeds that column's name. */
                    key={columnBeingRenamed.id}
                    boardId={board.id}
                    column={columnBeingRenamed}
                    isOpen
                    onOpenChange={(nextIsOpen) => {
                        if (!nextIsOpen) {
                            setColumnBeingRenamed(null);
                        }
                    }}
                    onSubmit={handleRenameSubmit}
                />
            )}

            {columnBeingDeleted === null ? null : (
                <DeleteColumnConfirm
                    /* Keyed on the target column, so reopening on another header names that column. */
                    key={columnBeingDeleted.id}
                    boardId={board.id}
                    column={columnBeingDeleted}
                    isOpen
                    onOpenChange={(nextIsOpen) => {
                        if (!nextIsOpen) {
                            setColumnBeingDeleted(null);
                        }
                    }}
                    onSubmit={handleDeleteSubmit}
                    isPending={isDeletePending}
                />
            )}
        </>
    );
};
