"use client";

import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
import { TaskCard } from "@/features/tasks/components/task-card/task-card";
import { useMoveTask } from "@/features/tasks/hooks/use-move-task";
import { createTaskMoveAnnouncements, toSubtaskSummary, toTaskMoveTargetPosition } from "@/features/tasks/model";
import { createTaskAwareCollisionDetection, toDragItemData } from "@/features/tasks/task-drag-model";
import type { TaskFull } from "@/lib/core/api-contract/task-schemas";
import { DRAG_ITEM_TYPE } from "@/lib/core/drag/drag-items";
import { cn } from "@/lib/core/styling/cn";

/*
 * COLUMN-01 and TASK-04 make this the board's client container, and D-18 makes it the composition
 * point for two features that may not import each other: it builds the tasks feature's cards and
 * passes them DOWN into the boards feature's column as a render prop.
 */
type Props = {
    board: BoardFull;
    /** Storybook-only staging for the Add Column modal's open state — no real caller passes this. */
    defaultIsAddColumnOpen?: boolean;
    /** Storybook-only staging — seeds the rename modal open on the column at this index. */
    defaultRenameColumnTargetIndex?: number;
    /** Storybook-only staging — seeds the delete confirmation open on the column at this index. */
    defaultDeleteColumnTargetIndex?: number;
    /**
     * Where a task card's open-detail activation lands. Absent in production for now: TASK-02's
     * detail view is a later plan, and this is the seam it fills without changing the card's shape.
     */
    onOpenTaskDetail?: (task: TaskFull) => void;
};

export const BoardView = ({
    board,
    defaultIsAddColumnOpen = false,
    defaultRenameColumnTargetIndex,
    defaultDeleteColumnTargetIndex,
    onOpenTaskDetail,
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
    const [liftedTaskId, setLiftedTaskId] = useState<string | null>(null);
    const columnCount = board.columns.length;
    const { createColumn, isPending, errorMessage, clearError } = useCreateColumn({ columnCount });
    /* The DERIVED columns, not the raw props — that array is what carries the optimistic name. */
    const { renameColumn, columns: renamedColumns } = useRenameColumn({ columns: board.columns });
    /* Chained onto the rename's own output, so a column can be renamed and moved in the same session. */
    const {
        reorderColumns: requestReorder,
        columns: reorderedColumns,
        reorderingColumnId,
    } = useReorderColumns({ columns: renamedColumns });
    /* Last in the chain, so a task move renders on top of whatever the two column overrides produced. */
    const {
        moveTask: requestMove,
        columns: renderedColumns,
        movingTaskId,
    } = useMoveTask({ columns: reorderedColumns });
    const { deleteColumn, isPending: isDeletePending } = useDeleteColumn();
    const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", { initializeWithValue: false });

    const sensors = useColumnDragSensors();

    const liftedColumn = renderedColumns.find((column) => column.id === liftedColumnId) ?? null;
    const liftedTask =
        renderedColumns.flatMap((column) => column.tasks).find((task) => task.id === liftedTaskId) ?? null;
    /* Every column's own card ids, which is both the sortable item list and what narrows a collision. */
    const columnTaskIds = renderedColumns.map((column) => ({
        columnId: column.id,
        taskIds: column.tasks.map((task) => task.id),
    }));
    const taskCount = renderedColumns.reduce((total, column) => total + column.tasks.length, 0);
    /* UI-SPEC zero-one-many: one column holding one task is the only board a card cannot move on. */
    const isTaskMoveDisabled = columnCount === 1 && taskCount === 1;

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

    /* Branched on the item's DECLARED type, never on the id: an id lookup returns -1 for the other kind. */
    const handleDragStart = ({ active }: DragStartEvent): void => {
        if (toDragItemData(active.data.current)?.type === DRAG_ITEM_TYPE.TASK) {
            setLiftedTaskId(String(active.id));

            return;
        }

        setLiftedColumnId(String(active.id));
    };

    const handleDragCancel = (): void => {
        setLiftedColumnId(null);
        setLiftedTaskId(null);
    };

    /*
     * TASK-04's one request per completed move. The destination comes from whatever the drop landed
     * on — another card, or the column body itself, which is what makes an empty column reachable.
     */
    const moveDroppedTask = ({ active, over }: DragEndEvent): void => {
        const overData = toDragItemData(over?.data.current);

        if (over === null || overData?.columnId === undefined) {
            return;
        }

        const targetColumnId = overData.columnId;

        const destination = renderedColumns.find((column) => column.id === targetColumnId);
        const source = renderedColumns.find((column) => column.tasks.some((task) => task.id === active.id));

        if (destination === undefined || source === undefined) {
            return;
        }

        const taskId = String(active.id);
        const targetIndex = toTaskMoveTargetPosition({
            destinationTaskIds: destination.tasks.map((task) => task.id),
            taskId,
            overTaskId: overData.type === DRAG_ITEM_TYPE.TASK ? String(over.id) : null,
        });

        /* A drop that ended exactly where it began is not a move, so it issues no request at all. */
        if (source.id === targetColumnId && source.tasks.findIndex((task) => task.id === taskId) === targetIndex) {
            return;
        }

        void requestMove({ taskId, targetColumnId, targetIndex });
    };

    /*
     * One completed move, one request (T-03-12). A drop with no target, or one that ended where it
     * began, is not a move — every intermediate arrow step stayed inside the library.
     */
    const handleDragEnd = (event: DragEndEvent): void => {
        const { active, over } = event;
        const wasTaskLifted = toDragItemData(active.data.current)?.type === DRAG_ITEM_TYPE.TASK;
        setLiftedColumnId(null);
        setLiftedTaskId(null);

        if (over === null || active.id === over.id) {
            return;
        }

        if (wasTaskLifted) {
            moveDroppedTask(event);

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
                    /* Centre distance for a column, the nested-container strategy for a task (Pitfall 7). */
                    collisionDetection={createTaskAwareCollisionDetection({ columnTaskIds })}
                    /*
                     * The library renders its own live region behind a mounted gate — separate from
                     * the toast viewport by construction, which is what the UI-SPEC requires.
                     */
                    accessibility={{
                        announcements: createTaskMoveAnnouncements({
                            columns: renderedColumns,
                            fallback: createColumnReorderAnnouncements({ columns: renderedColumns }),
                        }),
                    }}
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
                            {renderedColumns.map((column) => {
                                return (
                                    <SortableColumn
                                        key={column.id}
                                        column={column}
                                        /*
                                         * D-18: the tasks feature's nodes are built HERE and handed
                                         * down, so the column imports nothing from that feature.
                                         */
                                        renderTasks={() => {
                                            return (
                                                <SortableContext
                                                    items={column.tasks.map((task) => task.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {column.tasks.map((task) => {
                                                        return (
                                                            <TaskCard
                                                                key={task.id}
                                                                task={task}
                                                                columnId={column.id}
                                                                onOpenDetail={
                                                                    onOpenTaskDetail ??
                                                                    (() => {
                                                                        /* TASK-02's detail view is a later plan. */
                                                                    })
                                                                }
                                                                isMoveDisabled={isTaskMoveDisabled}
                                                                isMoving={task.id === movingTaskId}
                                                            />
                                                        );
                                                    })}
                                                </SortableContext>
                                            );
                                        }}
                                        isReorderDisabled={renderedColumns.length === 1}
                                        isReordering={column.id === reorderingColumnId}
                                        onRename={setColumnBeingRenamed}
                                        onDelete={setColumnBeingDeleted}
                                    />
                                );
                            })}
                        </SortableContext>

                        {/* Last flex child INSIDE the scroll row, so it scrolls away with the columns (UI-SPEC overflow). */}
                        <AddColumnPlaceholder ref={ghostColumnRef} onOpen={openAddColumn} />
                    </div>

                    {/* The full-opacity preview that follows the pointer while the column itself stays
                        in place at reduced opacity; the settle is dropped entirely under reduce-motion. */}
                    <DragOverlay dropAnimation={prefersReducedMotion ? null : undefined}>
                        {liftedTask === null ? null : (
                            /* The card's own anatomy minus its controls — a preview, not a second interactive copy. */
                            <div className="flex w-70 flex-col gap-2 rounded-md bg-bg-surface py-6 pr-2 pl-4 shadow-lg">
                                <span className="font-heading-m text-heading-m [font-weight:var(--font-weight-heading-m)] break-words text-text-primary">
                                    {liftedTask.title}
                                </span>

                                {liftedTask.subtasks.length === 0 ? null : (
                                    <span className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-muted">
                                        {toSubtaskSummary(liftedTask.subtasks)}
                                    </span>
                                )}
                            </div>
                        )}

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
