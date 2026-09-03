"use client";

// Covered by: `src/features/tasks/components/task-detail-modal/task-detail-modal.test.tsx`

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useFailureToast } from "@/components/ui/toast/use-failure-toast";
import { updateSubtaskAction } from "@/features/tasks/actions/update-subtask-action";
import { withSubtaskCompletion, type TaskColumn } from "@/features/tasks/model";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import type { Subtask } from "@/lib/core/api-contract/task-schemas";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

/*
 * Only the part of the board entry a toggle touches. Structural rather than the boards feature's own
 * `BoardFull`, which D-18 forbids importing — the spread below preserves the fields not named here.
 */
type ToggleableBoard = { columns: TaskColumn[] };

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can reach
 * these strings (04-UI-SPEC Copywriting Contract, T-04-05).
 */
const GENERIC_TOGGLE_FAILURE = { title: "Couldn't update subtask.", description: "Try again." };

/*
 * C-08: the conflict TITLE matches the phase's own family exactly, and only the description differs
 * — D-12 has the action perform the re-read itself, so "Refresh to see the latest." would name
 * something already happening.
 */
const TOGGLE_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.CONFLICT]: {
        title: "This board changed somewhere else.",
        description: "Refreshing to show the latest.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to update this subtask.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That subtask is no longer available.",
        description: "Refresh to see this board's current tasks.",
    },
};

// comment-length-exempt: records why this hook subscribes to the shared cache rather than trusting its caller's props — a settled design decision a future reader would otherwise "simplify" back into a prop read (docs/adr/tech/0023)
/**
 * SUBTASK-02's optimistic completion toggle, reading and writing the open board's shared
 * cache entry (docs/adr/tech/0030) — the SAME mechanism `useMoveTask` uses. This hook subscribes to
 * that entry itself, seeded via `initialData` from its own caller's `columns`: `initialData` only
 * takes effect while no entry exists yet, so a `TaskDetailModal` mounted under a live `BoardView`
 * simply reads what that parent already seeded, while an isolated render (Storybook, this hook's own
 * test) still gets a reactive one. The override and the in-flight lock are BOTH keyed on the subtask
 * id: toggles on different rows are independent, and a second toggle on the SAME row is never sent
 * because the composed `isSubtaskPending` disables that row's own checkbox — no separate in-hook guard.
 */
export const useToggleSubtask = ({
    boardId,
    taskId,
    columns,
}: {
    boardId: string;
    taskId: string;
    columns: TaskColumn[];
}) => {
    const raiseFailureToast = useFailureToast({ copy: TOGGLE_FAILURE_COPY, fallback: GENERIC_TOGGLE_FAILURE });
    const queryClient = useQueryClient();
    const queryKey = buildBoardQueryKey(boardId);
    const [pendingSubtaskIds, setPendingSubtaskIds] = useState<ReadonlySet<string>>(new Set());

    const { data: board } = useQuery<ToggleableBoard>({
        queryKey,
        initialData: { columns },
        staleTime: Infinity,
        /* Unreachable in practice — `staleTime: Infinity` plus an always-present entry never refetches. */
        queryFn: (): Promise<ToggleableBoard> => Promise.resolve({ columns }),
    });
    const subtasks: Subtask[] =
        board.columns.flatMap((column) => column.tasks).find((task) => task.id === taskId)?.subtasks ?? [];
    /* The subtask endpoint's ancestors are inert (04-BACKEND-FACTS.md T2) but still required by the schema. */
    const columnId = board.columns.find((column) => column.tasks.some((task) => task.id === taskId))?.id ?? "";

    const mutation = useMutation({
        mutationFn: async (args: { subtaskId: string; version: number; isCompleted: boolean }) => {
            const result = await updateSubtaskAction({ ...args, boardId, columnId, taskId });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ subtaskId, isCompleted }: { subtaskId: string; version: number; isCompleted: boolean }) => {
            // Or an in-flight read could land on top of the optimistic board and undo it.
            await queryClient.cancelQueries({ queryKey });
            const previousBoard = queryClient.getQueryData<ToggleableBoard>(queryKey);

            setPendingSubtaskIds((current) => new Set(current).add(subtaskId));
            queryClient.setQueryData<ToggleableBoard>(queryKey, (current) =>
                current === undefined
                    ? current
                    : {
                          ...current,
                          columns: withSubtaskCompletion({ columns: current.columns, taskId, subtaskId, isCompleted }),
                      },
            );

            return { previousBoard };
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (error: unknown, _variables, context) => {
            if (context?.previousBoard !== undefined) {
                queryClient.setQueryData(queryKey, context.previousBoard);
            }

            raiseFailureToast(error);
        },

        /*
         * MERGED, never assigned, and matched by SUBTASK ID alone across every task — the response
         * carries no `taskId` to narrow by, and the id is unique board-wide (mirrors `useMoveTask`).
         */
        onSuccess: ({ subtask }) => {
            queryClient.setQueryData<ToggleableBoard>(queryKey, (current) =>
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
        onSettled: (_data, _error, { subtaskId }: { subtaskId: string; version: number; isCompleted: boolean }) => {
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

    const toggleSubtask = (subtaskId: string): void => {
        const target = subtasks.find((subtask) => subtask.id === subtaskId);
        if (target === undefined) {
            return;
        }

        void mutation
            .mutateAsync({ subtaskId, version: target.version, isCompleted: !target.isCompleted })
            .catch(() => {
                /* The rollback and the toast both live in `onError`; nothing is left to report. */
            });
    };

    return {
        subtasks,
        toggleSubtask,
        isSubtaskPending: (subtaskId: string): boolean => pendingSubtaskIds.has(subtaskId),
    };
};
