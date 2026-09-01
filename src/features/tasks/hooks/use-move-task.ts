"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation } from "@tanstack/react-query";

import { useToast } from "@/components/ui/toast/use-toast";
import { moveTaskAction } from "@/features/tasks/actions/move-task-action";
import { moveTaskInColumns, type TaskColumn } from "@/features/tasks/model";
import { useOptimisticVariables } from "@/lib/client/optimistic-mutation";
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

/** What `moveTaskAction` is called with, and therefore what the optimistic board is read from. */
type MoveTaskVariables = { taskId: string; targetColumnId: string; version: number; targetPosition: number };

/** Names this mutation so its in-flight variables can be read back as the optimistic board. */
export const MOVE_TASK_MUTATION_KEY = ["moveTask"] as const;

/** The variables of every task move still in flight, oldest first — fold order matters. */
export const usePendingTaskMoves = (): MoveTaskVariables[] =>
    useOptimisticVariables<MoveTaskVariables>(MOVE_TASK_MUTATION_KEY);

/**
 * Return `columns` with every pending move applied in submission order, each move reading the board
 * the one before it produced. `targetPosition` is the destination index directly.
 */
export const applyPendingTaskMoves = <C extends TaskColumn>({
    columns,
    pending,
}: {
    columns: C[];
    pending: MoveTaskVariables[];
}): C[] =>
    pending.reduce((current, { taskId, version, targetColumnId, targetPosition }) => {
        // The version guard is the retirement: a landed `refresh()` bumps it and this stops matching.
        const isStillPending = current
            .flatMap((column) => column.tasks)
            .some((task) => task.id === taskId && task.version === version);

        return isStillPending
            ? moveTaskInColumns({ columns: current, taskId, targetColumnId, targetIndex: targetPosition })
            : current;
    }, columns);

/**
 * TASK-04's optimistic move (U-05), and D-10's single implementation: the drag path and the detail
 * view's `Current Status` dropdown are two callers of this one hook. Mechanism: tech/0029.
 */
export const useMoveTask = <C extends TaskColumn>({ columns }: { columns: C[] }) => {
    const toast = useToast();
    const mutation = useMutation({ mutationFn: moveTaskAction, retry: false, mutationKey: MOVE_TASK_MUTATION_KEY });
    const pending = usePendingTaskMoves();
    const optimisticColumns = applyPendingTaskMoves({ columns, pending });

    const requestMove = ({ taskId, targetColumnId, targetIndex }: MoveTaskArgs): void => {
        const movedTask = optimisticColumns.flatMap((column) => column.tasks).find((task) => task.id === taskId);

        if (movedTask === undefined) {
            return;
        }

        // Exactly one request per completed move — intermediate pointer and arrow steps never reach here.
        void mutation
            .mutateAsync({ taskId, targetColumnId, version: movedTask.version, targetPosition: targetIndex })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const)
            .then((result) => {
                if (result.status !== RESULT_STATUS.SUCCESS) {
                    toast.add({ type: "danger", ...(MOVE_FAILURE_COPY[result.status] ?? GENERIC_MOVE_FAILURE) });
                }
            });
    };

    return {
        moveTask: requestMove,
        isPending: mutation.isPending,
        columns: optimisticColumns,
        /*
         * T5 observed only the MOVED task's version is bumped and a merely-shifted sibling's stays
         * usable, which is what lets this lock stop at the one card rather than the whole column.
         */
        movingTaskId: mutation.isPending ? mutation.variables.taskId : null,
    };
};
