"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";

import { useColumnDragSensors } from "@/features/boards/hooks/use-column-drag-sensors";
import { createColumnReorderAnnouncements } from "@/features/boards/model";
import type { ColumnFull } from "@/features/boards/schemas";
import { createTaskMoveAnnouncements, toTaskMoveTargetPosition } from "@/features/tasks/model";
import {
    createTaskAwareCollisionDetection,
    isPastOverTaskCentre,
    toDragItemData,
} from "@/features/tasks/task-drag-model";
import type { TaskFull } from "@/lib/core/api-contract/task-schemas";
import { DRAG_ITEM_TYPE } from "@/lib/core/drag/drag-items";

type Args = {
    boardId: string;
    columns: ColumnFull[];
    moveTask: (args: { taskId: string; targetColumnId: string; targetIndex: number }) => void;
    reorderColumns: (args: { fromIndex: number; toIndex: number }) => void;
};

/**
 * One board's drag session: what is currently lifted, and what a completed drop means.
 *
 * In the layout ring rather than either feature's `hooks/` because it needs BOTH — the column
 * reorder model and the task move model — which the `feature -> feature` boundary forbids.
 */
export const useBoardDragSession = ({ boardId, columns, moveTask, reorderColumns }: Args) => {
    const [liftedColumnId, setLiftedColumnId] = useState<string | null>(null);
    const [liftedTaskId, setLiftedTaskId] = useState<string | null>(null);
    const sensors = useColumnDragSensors();

    /* Every column's own card ids, which is both the sortable item list and what narrows a collision. */
    const columnTaskIds = columns.map((column) => ({
        columnId: column.id,
        taskIds: column.tasks.map((task) => task.id),
    }));

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

        const destination = columns.find((column) => column.id === targetColumnId);
        const source = columns.find((column) => column.tasks.some((task) => task.id === active.id));

        if (destination === undefined || source === undefined) {
            return;
        }

        const taskId = String(active.id);
        const targetIndex = toTaskMoveTargetPosition({
            destinationTaskIds: destination.tasks.map((task) => task.id),
            taskId,
            overTaskId: overData.type === DRAG_ITEM_TYPE.TASK ? String(over.id) : null,
            /* Only a cross-column drop reads this; within one column the model has a direction already. */
            isPastOverTask: isPastOverTaskCentre({ activeRect: active.rect.current.translated, overRect: over.rect }),
        });

        /* A drop that ended exactly where it began is not a move, so it issues no request at all. */
        if (source.id === targetColumnId && source.tasks.findIndex((task) => task.id === taskId) === targetIndex) {
            return;
        }

        moveTask({ taskId, targetColumnId, targetIndex });
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
        const fromIndex = columns.findIndex((column) => column.id === active.id);
        const toIndex = columns.findIndex((column) => column.id === over.id);

        if (fromIndex === -1 || toIndex === -1) {
            return;
        }

        reorderColumns({ fromIndex, toIndex });
    };

    const liftedColumn: ColumnFull | null = columns.find((column) => column.id === liftedColumnId) ?? null;
    const liftedTask: TaskFull | null =
        columns.flatMap((column) => column.tasks).find((task) => task.id === liftedTaskId) ?? null;
    const taskCount = columns.reduce((total, column) => total + column.tasks.length, 0);

    return {
        /*
         * Spread onto `DndContext` rather than returned field by field — the id, the sensors, the
         * collision strategy and the announcements are one wiring decision, not four.
         */
        dndContextProps: {
            /*
             * The context id is derived from the board's own id, not left to the library: its
             * description ids come from a module-scope counter that drifts between the server
             * render and a fresh client, producing an `aria-describedby` hydration mismatch.
             */
            id: `board-columns-${boardId}`,
            sensors,
            /* Centre distance for a column, the nested-container strategy for a task (Pitfall 7). */
            collisionDetection: createTaskAwareCollisionDetection({ columnTaskIds }),
            /*
             * The library renders its own live region behind a mounted gate — separate from the
             * toast viewport by construction, which is what the UI-SPEC requires.
             */
            accessibility: {
                announcements: createTaskMoveAnnouncements({
                    columns,
                    fallback: createColumnReorderAnnouncements({ columns }),
                }),
            },
            onDragStart: handleDragStart,
            onDragEnd: handleDragEnd,
            onDragCancel: handleDragCancel,
        },
        liftedColumn,
        liftedTask,
        /* UI-SPEC zero-one-many: one column holding one task is the only board a card cannot move on. */
        isTaskMoveDisabled: columns.length === 1 && taskCount === 1,
    };
};
