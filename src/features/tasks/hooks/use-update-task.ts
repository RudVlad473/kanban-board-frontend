"use client";

// Covered by: `src/features/tasks/components/task-detail-modal/task-detail-modal.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useFailureToast } from "@/components/ui/toast/use-failure-toast";
import { updateTaskAction } from "@/features/tasks/actions/update-task-action";
import { withTaskUpdate, type TaskColumn } from "@/features/tasks/model";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

/*
 * Only the part of the board entry a save touches. Structural rather than the boards feature's own
 * `BoardFull`, which D-18 forbids importing — the spread below preserves the fields not named here.
 */
type UpdatableBoard = { columns: TaskColumn[] };

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach these strings (04-UI-SPEC Copywriting Contract, T-04-05).
 */
const GENERIC_UPDATE_FAILURE = { title: "Couldn't save task.", description: "Try again." };

/*
 * C-08: the conflict TITLE matches the phase's own family exactly, and only the description differs
 * — D-12 has the action perform the re-read itself, so "Refresh to see the latest." would name
 * something already happening.
 */
const UPDATE_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.CONFLICT]: {
        title: "This board changed somewhere else.",
        description: "Refreshing to show the latest.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to save this task.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That task is no longer available.",
        description: "Refresh to see this board's current tasks.",
    },
};

export type UpdateTaskArgs = { taskId: string; title: string; description?: string };

/** What `updateTaskAction` is called with, resolved from the cache rather than from the caller. */
type UpdateTaskVariables = {
    taskId: string;
    columnId: string;
    title: string;
    description?: string;
    version: number;
};

/**
 * TASK-03's title/description save (S-01: one call on one entity). The modal has already CLOSED by
 * the time this settles, so the write — and its rollback — reach the CARD, the only surface left to
 * show it. Mechanism: docs/adr/tech/0030, the same shared-cache write `useMoveTask` uses.
 */
export const useUpdateTask = ({ boardId }: { boardId: string }) => {
    const raiseFailureToast = useFailureToast({ copy: UPDATE_FAILURE_COPY, fallback: GENERIC_UPDATE_FAILURE });
    const queryClient = useQueryClient();
    const queryKey = buildBoardQueryKey(boardId);

    const mutation = useMutation({
        mutationFn: async (args: UpdateTaskVariables) => {
            const result = await updateTaskAction({ boardId, ...args });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ taskId, title, description }: UpdateTaskVariables) => {
            // Or an in-flight read could land on top of the optimistic board and undo it.
            await queryClient.cancelQueries({ queryKey });

            /* Captured BEFORE the write, so the rollback can restore THIS task's own fields. */
            const previousTask = queryClient
                .getQueryData<UpdatableBoard>(queryKey)
                ?.columns.flatMap((column) => column.tasks)
                .find((task) => task.id === taskId);

            queryClient.setQueryData<UpdatableBoard>(queryKey, (current) =>
                current === undefined
                    ? current
                    : {
                          ...current,
                          columns: withTaskUpdate({ columns: current.columns, taskId, title, description }),
                      },
            );

            /* Restores THIS task's fields only — a snapshot restore would also undo a sibling write. */
            return previousTask === undefined
                ? undefined
                : { previousTitle: previousTask.title, previousDescription: previousTask.description };
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (error: unknown, { taskId }: UpdateTaskVariables, context) => {
            if (context !== undefined) {
                const { previousTitle, previousDescription } = context;
                queryClient.setQueryData<UpdatableBoard>(queryKey, (current) =>
                    current === undefined
                        ? current
                        : {
                              ...current,
                              columns: withTaskUpdate({
                                  columns: current.columns,
                                  taskId,
                                  title: previousTitle,
                                  description: previousDescription,
                              }),
                          },
                );
            }

            raiseFailureToast(error);
        },

        /*
         * MERGED, never assigned — `TaskResponseDTO` carries no `subtasks`, so assigning would empty
         * the card's checklist (mirrors `useMoveTask`'s own `onSuccess`).
         */
        onSuccess: ({ task }) => {
            queryClient.setQueryData<UpdatableBoard>(queryKey, (current) =>
                current === undefined
                    ? current
                    : {
                          ...current,
                          columns: current.columns.map((column) => ({
                              ...column,
                              tasks: column.tasks.map((entry) =>
                                  entry.id === task.id ? { ...entry, ...task } : entry,
                              ),
                          })),
                      },
            );
        },
    });

    const updateTask = ({ taskId, title, description }: UpdateTaskArgs): void => {
        /* Read from the entry the form itself rendered, so the version cannot be a render behind. */
        const board = queryClient.getQueryData<UpdatableBoard>(queryKey);
        const target = board?.columns.flatMap((column) => column.tasks).find((task) => task.id === taskId);
        const columnId = board?.columns.find((column) => column.tasks.some((task) => task.id === taskId))?.id;

        if (target === undefined || columnId === undefined) {
            return;
        }

        void mutation.mutateAsync({ taskId, columnId, title, description, version: target.version }).catch(() => {
            /* The rollback and the toast both live in `onError`; nothing is left to report. */
        });
    };

    return { updateTask, isPending: mutation.isPending };
};
