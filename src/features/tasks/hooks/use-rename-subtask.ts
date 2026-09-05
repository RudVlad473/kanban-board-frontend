"use client";

// Covered by: `src/features/tasks/components/edit-task-modal/edit-task-modal.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isNil } from "es-toolkit";
import { useState } from "react";

import { useFailureToast } from "@/components/ui/toast/use-failure-toast";
import { updateSubtaskAction } from "@/features/tasks/actions/update-subtask-action";
import { withSubtaskRename, type TaskColumn } from "@/features/tasks/model";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

/*
 * Only the part of the board entry a rename touches. Structural rather than the boards feature's
 * own `BoardFull`, which D-18 forbids importing — the spread below preserves the fields not named here.
 */
type RenamableBoard = { columns: TaskColumn[] };

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can reach
 * these strings (04-UI-SPEC Copywriting Contract, T-04-05).
 */
const GENERIC_RENAME_FAILURE = { title: "Couldn't rename subtask.", description: "Try again." };

/*
 * C-08: the conflict TITLE matches the phase's own family exactly, and only the description differs
 * — D-12 has the action perform the re-read itself, so "Refresh to see the latest." would name
 * something already happening.
 */
const RENAME_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.CONFLICT]: {
        title: "This board changed somewhere else.",
        description: "Refreshing to show the latest.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to rename this subtask.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That subtask is no longer available.",
        description: "Refresh to see this board's current tasks.",
    },
};

// comment-length-exempt: records why this is a SECOND hook on an already-shared action rather than a new one, and where the current-value read happens — a settled design decision a future reader would otherwise "simplify" by splitting an action or trusting a stale prop (docs/adr/tech/0023)
/**
 * SUBTASK-03's inline rename — the SECOND caller of `updateSubtaskAction`, the SAME action
 * `useToggleSubtask` calls, differing only in which field it sends and how it rolls back: one action
 * file per HTTP operation, two hooks with their own optimistic/rollback semantics (see that action's
 * own doc comment). Writes the shared `["board", boardId]` entry (docs/adr/tech/0030). Resolves the
 * target subtask/column from the cache at call time, matching `useUpdateTask`/`useMoveTask`, so the
 * version submitted is never a render behind. The in-flight lock is keyed on the subtask id.
 */
export const useRenameSubtask = ({ boardId, taskId }: { boardId: string; taskId: string }) => {
    const raiseFailureToast = useFailureToast({ copy: RENAME_FAILURE_COPY, fallback: GENERIC_RENAME_FAILURE });
    const queryClient = useQueryClient();
    const queryKey = buildBoardQueryKey(boardId);
    const [pendingSubtaskIds, setPendingSubtaskIds] = useState<ReadonlySet<string>>(new Set());

    const mutation = useMutation({
        mutationFn: async (args: { subtaskId: string; version: number; title: string; columnId: string }) => {
            const result = await updateSubtaskAction({ ...args, boardId, taskId });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({
            subtaskId,
            title,
        }: {
            subtaskId: string;
            version: number;
            title: string;
            columnId: string;
        }) => {
            // Or an in-flight read could land on top of the optimistic board and undo it.
            await queryClient.cancelQueries({ queryKey });

            /* Captured BEFORE the write, so the rollback can restore THIS subtask's own title. */
            const previousTitle = queryClient
                .getQueryData<RenamableBoard>(queryKey)
                ?.columns.flatMap((column) => column.tasks)
                .flatMap((task) => task.subtasks)
                .find((subtask) => subtask.id === subtaskId)?.title;

            setPendingSubtaskIds((current) => new Set(current).add(subtaskId));
            queryClient.setQueryData<RenamableBoard>(queryKey, (current) =>
                isNil(current)
                    ? current
                    : {
                          ...current,
                          columns: withSubtaskRename({ columns: current.columns, taskId, subtaskId, title }),
                      },
            );

            /* Restores THIS title only — a snapshot restore would also undo a sibling row's edit. */
            return { previousTitle };
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (
            error: unknown,
            { subtaskId }: { subtaskId: string; version: number; title: string; columnId: string },
            context,
        ) => {
            if (!isNil(context?.previousTitle)) {
                const restoredTitle = context.previousTitle;
                queryClient.setQueryData<RenamableBoard>(queryKey, (current) =>
                    isNil(current)
                        ? current
                        : {
                              ...current,
                              columns: withSubtaskRename({
                                  columns: current.columns,
                                  taskId,
                                  subtaskId,
                                  title: restoredTitle,
                              }),
                          },
                );
            }

            raiseFailureToast(error);
        },

        /*
         * MERGED, never assigned, and matched by SUBTASK ID alone across every task — mirrors
         * `useToggleSubtask`'s own `onSuccess`.
         */
        onSuccess: ({ subtask }) => {
            queryClient.setQueryData<RenamableBoard>(queryKey, (current) =>
                isNil(current)
                    ? current
                    : {
                          ...current,
                          columns: current.columns.map((column) => ({
                              ...column,
                              tasks: column.tasks.map((task) => ({
                                  ...task,
                                  subtasks: task.subtasks.map((entry) =>
                                      entry.id === subtask.id ? { ...entry, ...subtask } : entry,
                                  ),
                              })),
                          })),
                      },
            );
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onSettled positionally (ADR tech/0016 exemption)
        onSettled: (
            _data,
            _error,
            { subtaskId }: { subtaskId: string; version: number; title: string; columnId: string },
        ) => {
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

    /** Resolves to whether the rename committed, so a failed row can restore its own value and refocus. */
    const renameSubtask = async ({ subtaskId, title }: { subtaskId: string; title: string }): Promise<boolean> => {
        const board = queryClient.getQueryData<RenamableBoard>(queryKey);
        const target = board?.columns
            .flatMap((column) => column.tasks)
            .find((task) => task.id === taskId)
            ?.subtasks.find((subtask) => subtask.id === subtaskId);
        const columnId = board?.columns.find((column) => column.tasks.some((task) => task.id === taskId))?.id;

        if (isNil(target) || isNil(columnId)) {
            return false;
        }

        const result = await mutation
            .mutateAsync({ subtaskId, version: target.version, title, columnId })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        return result.status === RESULT_STATUS.SUCCESS;
    };

    return {
        renameSubtask,
        isSubtaskPending: (subtaskId: string): boolean => pendingSubtaskIds.has(subtaskId),
    };
};
