"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation } from "@tanstack/react-query";
import { startTransition, useOptimistic } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { moveTaskAction } from "@/features/tasks/actions/move-task-action";
import { moveTaskInColumns, type TaskColumn } from "@/features/tasks/model";
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
 * view's `Current Status` dropdown are two callers of this one hook. `useOptimistic` owns the
 * pending move, so a failure and a landed refresh both retire it with no bookkeeping here.
 */
export const useMoveTask = <C extends TaskColumn>({ columns }: { columns: C[] }) => {
    const toast = useToast();
    const [optimisticColumns, applyOptimisticMove] = useOptimistic(columns, (current: C[], move: MoveTaskArgs) =>
        moveTaskInColumns({ columns: current, ...move }),
    );
    /*
     * T5 observed only the MOVED task's version is bumped and a merely-shifted sibling's stays
     * usable, which is what lets this lock stop at the one card rather than the whole column.
     */
    const [movingTaskId, markTaskMoving] = useOptimistic<string | null, string>(null, (_current, taskId) => taskId);
    const mutation = useMutation({ mutationFn: moveTaskAction, retry: false });

    const requestMove = ({ taskId, targetColumnId, targetIndex }: MoveTaskArgs): void => {
        const movedTask = optimisticColumns.flatMap((column) => column.tasks).find((task) => task.id === taskId);

        if (movedTask === undefined) {
            return;
        }

        /*
         * One action, so both optimistic values live exactly as long as the write does: dropping
         * them restores BOTH columns the move touched, not just the dragged card.
         */
        startTransition(async () => {
            applyOptimisticMove({ taskId, targetColumnId, targetIndex });
            markTaskMoving(taskId);

            // Exactly one request per completed move — intermediate pointer and arrow steps never reach here.
            const result = await mutation
                .mutateAsync({ taskId, targetColumnId, version: movedTask.version, targetPosition: targetIndex })
                .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

            if (result.status !== RESULT_STATUS.SUCCESS) {
                toast.add({ type: "danger", ...(MOVE_FAILURE_COPY[result.status] ?? GENERIC_MOVE_FAILURE) });
            }
        });
    };

    return { moveTask: requestMove, isPending: mutation.isPending, columns: optimisticColumns, movingTaskId };
};
