"use client";

// Covered by: `src/features/tasks/components/edit-task-modal/edit-task-modal.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isNil } from "es-toolkit";
import { useState } from "react";

import { useFailureToast } from "@/components/ui/toast/use-failure-toast";
import { deleteSubtaskAction } from "@/features/tasks/actions/delete-subtask-action";
import { withSubtaskRemove, withSubtaskRestore, type TaskColumn } from "@/features/tasks/model";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

/*
 * Only the part of the board entry a delete touches. Structural rather than the boards feature's
 * own `BoardFull`, which D-18 forbids importing — the spread below preserves the fields not named here.
 */
type DeletableBoard = { columns: TaskColumn[] };

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can reach
 * these strings (04-UI-SPEC Copywriting Contract, T-04-05).
 */
const GENERIC_DELETE_FAILURE = { title: "Couldn't delete subtask.", description: "Try again." };

const DELETE_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.CONFLICT]: {
        title: "This board changed somewhere else.",
        description: "Refreshing to show the latest.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to delete this subtask.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That subtask is no longer available.",
        description: "Refresh to see this board's current tasks.",
    },
};

// comment-length-exempt: records why this hook follows the optimistic-rename analog rather than the wait-for-server delete one, and why no index-restore path exists — a settled design decision a future reader would otherwise "fix" by adding one (docs/adr/tech/0023)
/**
 * SUBTASK-04's immediate, optimistic, no-confirm delete — following the optimistic
 * RENAME analog rather than the wait-for-server task-delete one, because a subtask destroys nothing
 * beneath it. Its rollback reinstates the row at its ORIGINAL index for free, via the whole-board
 * snapshot restore `onError` already performs — no separate index is recorded and no bespoke restore
 * path is written. Mechanism: docs/adr/tech/0030. The in-flight lock is keyed on the subtask id.
 */
export const useDeleteSubtask = ({ boardId, taskId }: { boardId: string; taskId: string }) => {
    const raiseFailureToast = useFailureToast({ copy: DELETE_FAILURE_COPY, fallback: GENERIC_DELETE_FAILURE });
    const queryClient = useQueryClient();
    const queryKey = buildBoardQueryKey(boardId);
    const [pendingSubtaskIds, setPendingSubtaskIds] = useState<ReadonlySet<string>>(new Set());

    const mutation = useMutation({
        mutationFn: async (args: { subtaskId: string; columnId: string }) => {
            const result = await deleteSubtaskAction({ ...args, boardId, taskId });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ subtaskId }: { subtaskId: string; columnId: string }) => {
            // Or an in-flight read could land on top of the optimistic board and undo it.
            await queryClient.cancelQueries({ queryKey });

            /* Captured BEFORE the removal, so the rollback can put this row back at its own index. */
            const subtasks =
                queryClient
                    .getQueryData<DeletableBoard>(queryKey)
                    ?.columns.flatMap((column) => column.tasks)
                    .find((task) => task.id === taskId)?.subtasks ?? [];
            const removedSubtask = subtasks.find((subtask) => subtask.id === subtaskId);
            /* The neighbour it followed, so a concurrent add cannot shift the anchor. */
            const afterSubtaskId = subtasks[subtasks.findIndex((subtask) => subtask.id === subtaskId) - 1]?.id ?? null;

            setPendingSubtaskIds((current) => new Set(current).add(subtaskId));
            queryClient.setQueryData<DeletableBoard>(queryKey, (current) =>
                isNil(current)
                    ? current
                    : { ...current, columns: withSubtaskRemove({ columns: current.columns, taskId, subtaskId }) },
            );

            if (isNil(removedSubtask)) {
                return undefined;
            }

            /* Re-inserts THIS row at its original index — a snapshot would resurrect a sibling deleted since. */
            return {
                undo: (current: DeletableBoard) =>
                    withSubtaskRestore({
                        columns: current.columns,
                        taskId,
                        subtask: removedSubtask,
                        afterSubtaskId,
                    }),
            };
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (error: unknown, _variables, context) => {
            if (!isNil(context)) {
                queryClient.setQueryData<DeletableBoard>(queryKey, (current) =>
                    isNil(current) ? current : { ...current, columns: context.undo(current) },
                );
            }

            /*
             * A conflict means the server holds what this screen does not, so the rollback alone
             * leaves the user on data known to be wrong. Re-read HERE too, not only through the
             * action's `refresh()`, which never reaches a prefetched route (tech/0030 rule 4).
             */
            if (error instanceof ActionRefusedError && error.status === RESULT_STATUS.CONFLICT) {
                void queryClient.refetchQueries({ queryKey });
            }

            raiseFailureToast(error);
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onSettled positionally (ADR tech/0016 exemption)
        onSettled: (_data, _error, { subtaskId }: { subtaskId: string; columnId: string }) => {
            setPendingSubtaskIds((current) => {
                if (!current.has(subtaskId)) {
                    return current;
                }

                const next = new Set(current);
                next.delete(subtaskId);
                return next;
            });
        },
    });

    const deleteSubtask = (subtaskId: string): void => {
        const board = queryClient.getQueryData<DeletableBoard>(queryKey);
        const columnId = board?.columns.find((column) => column.tasks.some((task) => task.id === taskId))?.id;

        if (isNil(columnId)) {
            return;
        }

        void mutation.mutateAsync({ subtaskId, columnId }).catch(() => {
            /* The rollback and the toast both live in `onError`; nothing is left to report. */
        });
    };

    return {
        deleteSubtask,
        isSubtaskPending: (subtaskId: string): boolean => pendingSubtaskIds.has(subtaskId),
    };
};
