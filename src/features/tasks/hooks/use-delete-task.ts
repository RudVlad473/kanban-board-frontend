"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isNil } from "es-toolkit";

import { useFailureToast } from "@/components/ui/toast/use-failure-toast";
import { deleteTaskAction } from "@/features/tasks/actions/delete-task-action";
import { withTaskRemove, withTaskRestore, type TaskColumn } from "@/features/tasks/model";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach these strings (04-UI-SPEC Copywriting Contract).
 */
const GENERIC_DELETE_FAILURE = { title: "Couldn't delete task.", description: "Try again." };

/*
 * `NOT_FOUND` earns its own entry: a double submit lands there, and generic retry copy would tell
 * the user to retry something that can never succeed again.
 */
const DELETE_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to delete this task.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That task is no longer available.",
        description: "Refresh to see this board's current tasks.",
    },
};

/*
 * Only the part of the board entry a delete touches. Structural rather than the boards feature's
 * own `BoardFull`, which the boundaries policy forbids importing — the spread below preserves the
 * fields not named here.
 */
type DeletableBoard = { columns: TaskColumn[] };

export type DeleteTaskArgs = { boardId: string; columnId: string; taskId: string };

/*
 * Decisions ─────────────────────────────────────────────────────────────────────────────────────
 * comment-length-exempt: records a reversal of this hook's own previous decision, which a reader comparing it against ADR domain/0002 would otherwise re-open (docs/adr/tech/0023)
 * This hook read "deliberately NOT optimistic (ADR domain/0002)" until 2026-09-02, on the argument
 * that the cascade to the task's subtasks is irreversible so there would be nothing to roll back
 * to. That is false of the client: the snapshot `onError` restores holds the task WITH its
 * subtasks, and the ADR is about the server having no trash to recover from, not about staging.
 * The second reason to reverse it: leaving this hook dependent on `refresh()` alone made the board
 * segment uncacheable — a cached navigation replayed a payload predating the delete and the task
 * came back. Every sibling mutation already writes the cache; this one was the outlier.
 * ───────────────────────────────────────────────────────────────────────────────────────────────
 */

/**
 * TASK-05's optimistic delete: the task leaves the board on submit and a refusal puts it back,
 * subtasks included, from the whole-board snapshot. Mechanism: docs/adr/tech/0030.
 */
export const useDeleteTask = () => {
    const raiseFailureToast = useFailureToast({ copy: DELETE_FAILURE_COPY, fallback: GENERIC_DELETE_FAILURE });
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async ({ boardId, columnId, taskId }: DeleteTaskArgs) => {
            const result = await deleteTaskAction({ boardId, columnId, taskId });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ boardId, taskId }: DeleteTaskArgs) => {
            const queryKey = buildBoardQueryKey(boardId);
            // Or an in-flight read could land on top of the optimistic board and undo it.
            await queryClient.cancelQueries({ queryKey });

            /* Captured BEFORE the removal, so the rollback can put this task back where it was. */
            const board = queryClient.getQueryData<DeletableBoard>(queryKey);
            const sourceColumn = board?.columns.find((column) => column.tasks.some((task) => task.id === taskId));
            const removedTask = sourceColumn?.tasks.find((task) => task.id === taskId);
            const removedIndex = sourceColumn?.tasks.findIndex((task) => task.id === taskId) ?? -1;

            queryClient.setQueryData<DeletableBoard>(queryKey, (current) =>
                !isNil(current)
                    ? { ...current, columns: withTaskRemove({ columns: current.columns, taskId }) }
                    : current,
            );

            if (isNil(sourceColumn) || isNil(removedTask)) {
                return undefined;
            }

            /* Re-inserts THIS task only — a snapshot restore would also resurrect a sibling deleted since. */
            return {
                undo: (current: DeletableBoard) =>
                    withTaskRestore({
                        columns: current.columns,
                        columnId: sourceColumn.id,
                        task: removedTask,
                        index: removedIndex,
                    }),
            };
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (error: unknown, { boardId }: DeleteTaskArgs, context) => {
            if (!isNil(context)) {
                queryClient.setQueryData<DeletableBoard>(buildBoardQueryKey(boardId), (current) =>
                    isNil(current) ? current : { ...current, columns: context.undo(current) },
                );
            }

            raiseFailureToast(error);
        },
    });

    /* The rollback and the toast both live in `onError`; this reports the outcome only. */
    const deleteTask = async ({ boardId, columnId, taskId }: DeleteTaskArgs): Promise<{ didDelete: boolean }> =>
        mutation
            .mutateAsync({ boardId, columnId, taskId })
            .then(() => ({ didDelete: true }))
            .catch(() => ({ didDelete: false }));

    return { deleteTask, isPending: mutation.isPending };
};
