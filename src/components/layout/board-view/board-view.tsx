"use client";

import { DndContext, DragOverlay } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useBoolean, useMediaQuery } from "usehooks-ts";

import { Button } from "@/components/ui/button/button";
import { AddColumnModal } from "@/features/boards/components/add-column-modal/add-column-modal";
import { AddColumnPlaceholder } from "@/features/boards/components/add-column-placeholder/add-column-placeholder";
import { DeleteColumnConfirm } from "@/features/boards/components/delete-column-confirm/delete-column-confirm";
import { RenameColumnModal } from "@/features/boards/components/rename-column-modal/rename-column-modal";
import { SortableColumn } from "@/features/boards/components/sortable-column/sortable-column";
import { useCreateColumn } from "@/features/boards/hooks/use-create-column";
import { useDeleteColumn, type DeleteColumnArgs } from "@/features/boards/hooks/use-delete-column";
import { useRenameColumn, type RenameColumnArgs } from "@/features/boards/hooks/use-rename-column";
import { useReorderColumns } from "@/features/boards/hooks/use-reorder-columns";
import { toColumnCaption, toColumnDotToken } from "@/features/boards/model";
import { createBoardQueryOptions } from "@/features/boards/queries/board-query";
import type { BoardFull, ColumnFull } from "@/features/boards/schemas";
import { TaskCard } from "@/features/tasks/components/task-card/task-card";
import { TaskDetailModal } from "@/features/tasks/components/task-detail-modal/task-detail-modal";
import { useMoveTask } from "@/features/tasks/hooks/use-move-task";
import { toSubtaskSummary } from "@/features/tasks/model";
import { cn } from "@/lib/core/styling/cn";

import { useBoardDragSession } from "./use-board-drag-session";
import { useNewColumnReveal } from "./use-new-column-reveal";

/*
 * COLUMN-01 and TASK-04 make this the board's client container, and D-18 makes it the composition
 * point for two features that may not import each other: it builds the tasks feature's cards and
 * passes them DOWN into the boards feature's column as a render prop.
 */
type Props = {
    /** The RSC read's result, used to seed the shared `board` cache entry — not read directly. */
    board: BoardFull;
    /** Storybook-only staging for the Add Column modal's open state — no real caller passes this. */
    defaultIsAddColumnOpen?: boolean;
    /** Storybook-only staging — seeds the rename modal open on the column at this index. */
    defaultRenameColumnTargetIndex?: number;
    /** Storybook-only staging — seeds the delete confirmation open on the column at this index. */
    defaultDeleteColumnTargetIndex?: number;
    /** Storybook-only staging — seeds the task detail view open on the task with this id. */
    defaultOpenTaskId?: string;
};

export const BoardView = ({
    board: seedBoard,
    defaultIsAddColumnOpen = false,
    defaultRenameColumnTargetIndex,
    defaultDeleteColumnTargetIndex,
    defaultOpenTaskId,
}: Props) => {
    /*
     * The one entry the rename, the reorder and the task move all write, so what this renders is
     * already optimistic and no override chain is needed (docs/adr/tech/0030). `initialData` is what
     * makes a story or a test that renders this bare still show its own fixture.
     */
    const { data: board } = useQuery({
        ...createBoardQueryOptions({ boardId: seedBoard.id }),
        initialData: seedBoard,
    });
    const renderedColumns = board.columns;
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
        defaultRenameColumnTargetIndex !== undefined ? (board.columns[defaultRenameColumnTargetIndex] ?? null) : null,
    );
    const [columnBeingDeleted, setColumnBeingDeleted] = useState<ColumnFull | null>(
        defaultDeleteColumnTargetIndex !== undefined ? (board.columns[defaultDeleteColumnTargetIndex] ?? null) : null,
    );
    /*
     * An ID, not a snapshot — a snapshot task/column pair would go stale the moment the Current
     * Status control (or a later plan's edit/toggle) moves or edits it, so this re-derives from the
     * live `renderedColumns` on every render instead (CONVENTIONS "one source of truth for open").
     */
    const [openTaskId, setOpenTaskId] = useState<string | null>(defaultOpenTaskId ?? null);
    const openTask = renderedColumns.flatMap((column) => column.tasks).find((task) => task.id === openTaskId) ?? null;
    const columnCount = renderedColumns.length;
    const { createColumn, isPending, errorMessage, clearError } = useCreateColumn({ columnCount });
    const { renameColumn } = useRenameColumn({ boardId: board.id });
    const { reorderColumns: requestReorder, reorderingColumnId } = useReorderColumns({ boardId: board.id });
    const { moveTask: requestMove, movingTaskId } = useMoveTask({ boardId: board.id });
    const { deleteColumn, isPending: isDeletePending } = useDeleteColumn();
    const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", { initializeWithValue: false });
    const { dndContextProps, liftedColumn, liftedTask, isTaskMoveDisabled } = useBoardDragSession({
        boardId: board.id,
        columns: renderedColumns,
        moveTask: requestMove,
        reorderColumns: requestReorder,
    });
    const { ghostColumnRef, revealOnNextGrowth } = useNewColumnReveal({ columnCount });

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
                revealOnNextGrowth();
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
                <DndContext {...dndContextProps}>
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
                                                                onOpenDetail={(openedTask) => {
                                                                    setOpenTaskId(openedTask.id);
                                                                }}
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
                    {/* eslint-disable-next-line no-restricted-syntax -- null disables dnd-kit's drop animation and undefined means "use its default"; both branches are empty, so inverting only adds a negation */}
                    <DragOverlay dropAnimation={prefersReducedMotion ? null : undefined}>
                        {liftedTask !== null ? (
                            /* The card's own anatomy minus its controls — a preview, not a second interactive copy. */
                            <div className="flex w-70 flex-col gap-2 rounded-md bg-bg-surface py-6 pr-2 pl-4 shadow-lg">
                                <span className="font-heading-m text-heading-m [font-weight:var(--font-weight-heading-m)] break-words text-text-primary">
                                    {liftedTask.title}
                                </span>

                                {liftedTask.subtasks.length > 0 ? (
                                    <span className="font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-muted">
                                        {toSubtaskSummary(liftedTask.subtasks)}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}

                        {liftedColumn !== null ? (
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
                        ) : null}
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

            {columnBeingRenamed !== null ? (
                <RenameColumnModal
                    /* Keyed on the target column, so reopening on another header seeds that column's name. */
                    key={columnBeingRenamed.id}
                    boardId={board.id}
                    column={columnBeingRenamed}
                    onClose={() => {
                        setColumnBeingRenamed(null);
                    }}
                    onSubmit={handleRenameSubmit}
                />
            ) : null}

            {columnBeingDeleted !== null ? (
                <DeleteColumnConfirm
                    /* Keyed on the target column, so reopening on another header names that column. */
                    key={columnBeingDeleted.id}
                    boardId={board.id}
                    column={columnBeingDeleted}
                    onClose={() => {
                        setColumnBeingDeleted(null);
                    }}
                    onSubmit={handleDeleteSubmit}
                    isPending={isDeletePending}
                />
            ) : null}

            {openTask !== null ? (
                <TaskDetailModal
                    /* Keyed on the target task, so reopening on another card starts from that task. */
                    key={openTask.id}
                    boardId={board.id}
                    task={openTask}
                    columns={renderedColumns}
                    onClose={() => {
                        setOpenTaskId(null);
                    }}
                    onDeleteTask={() => {
                        /* TASK-05's delete flow is a later plan (04-20). */
                    }}
                />
            ) : null}
        </>
    );
};
