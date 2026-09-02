"use client";

// Covered by: `src/features/tasks/components/edit-task-modal/edit-task-modal.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { updateSubtaskAction } from "@/features/tasks/actions/update-subtask-action";
import { withSubtaskRename, type TaskColumn } from "@/features/tasks/model";
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

/** Carries the refusal discriminant across the throw that routes it into `onError`. */
class SubtaskRenameRefused extends Error {}

// comment-length-exempt: records why this is a SECOND hook on an already-shared action rather than a new one, and where the current-value read happens — a settled design decision a future reader would otherwise "simplify" by splitting an action or trusting a stale prop (docs/adr/tech/0023)
/**
 * SUBTASK-03's inline rename (S-03) — the SECOND caller of `updateSubtaskAction`, the SAME action
 * `useToggleSubtask` calls, differing only in which field it sends and how it rolls back: one action
 * file per HTTP operation, two hooks with their own optimistic/rollback semantics (see that action's
 * own doc comment). Writes the shared `["board", boardId]` entry (docs/adr/tech/0030). Resolves the
 * target subtask/column from the cache at call time, matching `useUpdateTask`/`useMoveTask`, so the
 * version submitted is never a render behind. The in-flight lock is keyed on the subtask id.
 */
export const useRenameSubtask = ({ boardId, taskId }: { boardId: string; taskId: string }) => {
    const toast = useToast();
    const queryClient = useQueryClient();
    const queryKey = buildBoardQueryKey(boardId);
    const [pendingSubtaskIds, setPendingSubtaskIds] = useState<ReadonlySet<string>>(new Set());

    const mutation = useMutation({
        mutationFn: async (args: { subtaskId: string; version: number; title: string; columnId: string }) => {
            const result = await updateSubtaskAction({ ...args, boardId, taskId });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new SubtaskRenameRefused(result.status);
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
            const previousBoard = queryClient.getQueryData<RenamableBoard>(queryKey);

            setPendingSubtaskIds((current) => new Set(current).add(subtaskId));
            queryClient.setQueryData<RenamableBoard>(queryKey, (current) =>
                current === undefined
                    ? current
                    : {
                          ...current,
                          columns: withSubtaskRename({ columns: current.columns, taskId, subtaskId, title }),
                      },
            );

            return { previousBoard };
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (error: unknown, _variables, context) => {
            /* Restoring the whole-board snapshot is what restores the prior title — no bespoke undo. */
            if (context?.previousBoard !== undefined) {
                queryClient.setQueryData(queryKey, context.previousBoard);
            }

            const status =
                error instanceof SubtaskRenameRefused ? (error.message as ResultStatus) : RESULT_STATUS.ERROR;
            toast.add({ type: "danger", ...(RENAME_FAILURE_COPY[status] ?? GENERIC_RENAME_FAILURE) });
        },

        /*
         * MERGED, never assigned, and matched by SUBTASK ID alone across every task — mirrors
         * `useToggleSubtask`'s own `onSuccess`.
         */
        onSuccess: ({ subtask }) => {
            queryClient.setQueryData<RenamableBoard>(queryKey, (current) =>
                current === undefined
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

        if (target === undefined || columnId === undefined) {
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
