"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { moveTaskAction } from "@/features/tasks/actions/move-task-action";
import { applyTaskMoveOverride, type TaskColumn, type TaskMoveOverride } from "@/features/tasks/model";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach these strings (04-UI-SPEC Copywriting Contract, T-04-05).
 */
const GENERIC_MOVE_FAILURE = { title: "Couldn't move task.", description: "Try again." };

/*
 * C-08: the conflict TITLE matches Phase 3's column string exactly so the two read as one family,
 * and only the description differs — D-12 has the action perform the re-read itself, so telling the
 * user to refresh would name something already happening. Phase 3's strings are not retro-edited.
 */
const MOVE_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.CONFLICT]: {
        title: "This board changed somewhere else.",
        description: "Refreshing to show the latest.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to move this task.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That task is no longer available.",
        description: "Refresh to see this board's current tasks.",
    },
};

export type MoveTaskArgs = { taskId: string; targetColumnId: string; targetIndex: number };

/**
 * TASK-04's optimistic move (U-05), and D-10's single implementation: the drag path and the detail
 * view's `Current Status` dropdown are two callers of this one hook. The override is retired by the
 * same pure derivation the column reorder uses, kept in `model.ts`.
 */
export const useMoveTask = <C extends TaskColumn>({ columns }: { columns: C[] }) => {
    const toast = useToast();
    const [override, setOverride] = useState<TaskMoveOverride | null>(null);
    const [movedTaskId, setMovedTaskId] = useState<string | null>(null);
    const mutation = useMutation({ mutationFn: moveTaskAction, retry: false });

    const renderedColumns = applyTaskMoveOverride({ columns, override });

    /*
     * The helper hands back the props array ITSELF once the server's own order has moved on, so
     * reference equality is the retirement signal — nothing has to clear this.
     */
    const isOverrideApplied = renderedColumns !== columns;

    /*
     * T5 observed only the MOVED task's version is bumped and a merely-shifted sibling's stays
     * usable, which is what lets this lock stop at the one card rather than the whole column.
     */
    const movingTaskId = mutation.isPending || isOverrideApplied ? movedTaskId : null;

    const requestMove = async ({
        taskId,
        targetColumnId,
        targetIndex,
    }: MoveTaskArgs): Promise<{ didMove: boolean }> => {
        const movedTask = renderedColumns.flatMap((column) => column.tasks).find((task) => task.id === taskId);
        const sourceColumn = columns.find((column) => column.tasks.some((task) => task.id === taskId));

        if (movedTask === undefined || sourceColumn === undefined) {
            return { didMove: false };
        }

        /*
         * `previousTaskIds` records the SERVER's own order in each column this move touches, never
         * the rendered one — that is what the override compares itself against to know it is stale.
         */
        const affectedColumnIds =
            sourceColumn.id === targetColumnId ? [sourceColumn.id] : [sourceColumn.id, targetColumnId];

        setOverride({
            taskId,
            targetColumnId,
            targetIndex,
            previousTaskIds: affectedColumnIds.map((columnId) => ({
                columnId,
                taskIds: (columns.find((column) => column.id === columnId)?.tasks ?? []).map((task) => task.id),
            })),
        });
        setMovedTaskId(taskId);

        // Exactly one request per completed move — intermediate pointer and arrow steps never reach here.
        const result = await mutation
            .mutateAsync({
                taskId,
                targetColumnId,
                version: movedTask.version,
                targetPosition: targetIndex,
            })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        if (result.status !== RESULT_STATUS.SUCCESS) {
            /*
             * Dropping the override restores BOTH columns at once, not just the dragged card: the
             * raw props still carry the order every task in them came in with.
             */
            setOverride(null);
            setMovedTaskId(null);
            toast.add({ type: "danger", ...(MOVE_FAILURE_COPY[result.status] ?? GENERIC_MOVE_FAILURE) });

            return { didMove: false };
        }

        // Left in place on success: it retires itself once the refreshed props carry the new order.
        return { didMove: true };
    };

    return { moveTask: requestMove, isPending: mutation.isPending, columns: renderedColumns, movingTaskId };
};
