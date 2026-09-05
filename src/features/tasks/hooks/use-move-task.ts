"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isNil } from "es-toolkit";

import { useFailureToast } from "@/components/ui/toast/use-failure-toast";
import { moveTaskAction } from "@/features/tasks/actions/move-task-action";
import { moveTaskInColumns, type TaskColumn } from "@/features/tasks/model";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

/*
 * Only the part of the board entry a move touches. Structural rather than the boards feature's own
 * `BoardFull`, which D-18 forbids importing — the spread below preserves the fields not named here.
 */
type MovableBoard = { columns: TaskColumn[] };

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

/** What `moveTaskAction` is called with, resolved from the cache rather than from the caller. */
type MoveTaskVariables = { taskId: string; targetColumnId: string; version: number; targetPosition: number };

/**
 * TASK-04's optimistic move, and the single implementation: the drag path and the detail
 * view's `Current Status` dropdown are two callers of this one hook. Mechanism: docs/adr/tech/0030.
 */
export const useMoveTask = ({ boardId }: { boardId: string }) => {
    const raiseFailureToast = useFailureToast({ copy: MOVE_FAILURE_COPY, fallback: GENERIC_MOVE_FAILURE });
    const queryClient = useQueryClient();
    const queryKey = buildBoardQueryKey(boardId);

    const mutation = useMutation({
        mutationFn: async (args: MoveTaskVariables) => {
            const result = await moveTaskAction(args);

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ taskId, targetColumnId, targetPosition }: MoveTaskVariables) => {
            // Or an in-flight read could land on top of the optimistic board and undo it.
            await queryClient.cancelQueries({ queryKey });

            /* Where this task sat BEFORE the move, so the rollback can put it back there. */
            const board = queryClient.getQueryData<MovableBoard>(queryKey);
            const sourceColumn = board?.columns.find((column) => column.tasks.some((task) => task.id === taskId));
            const sourceIndex = sourceColumn?.tasks.findIndex((task) => task.id === taskId) ?? -1;

            queryClient.setQueryData<MovableBoard>(queryKey, (current) =>
                isNil(current)
                    ? current
                    : {
                          ...current,
                          columns: moveTaskInColumns({
                              columns: current.columns,
                              taskId,
                              targetColumnId,
                              targetIndex: targetPosition,
                          }),
                      },
            );

            /* Moves THIS task back only — a snapshot restore would also undo a sibling write. */
            return !isNil(sourceColumn) ? { sourceColumnId: sourceColumn.id, sourceIndex } : undefined;
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (error: unknown, { taskId }: MoveTaskVariables, context) => {
            if (!isNil(context)) {
                const { sourceColumnId, sourceIndex } = context;

                queryClient.setQueryData<MovableBoard>(queryKey, (current) =>
                    isNil(current)
                        ? current
                        : {
                              ...current,
                              columns: moveTaskInColumns({
                                  columns: current.columns,
                                  taskId,
                                  targetColumnId: sourceColumnId,
                                  targetIndex: sourceIndex,
                              }),
                          },
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

        /*
         * The optimistic board already stands; this settles the moved task's own version. MERGED,
         * never assigned — `TaskResponseDTO` carries no `subtasks`, so assigning would empty the
         * card's checklist (Pitfall 3).
         */
        onSuccess: ({ task }) => {
            queryClient.setQueryData<MovableBoard>(queryKey, (current) =>
                isNil(current)
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

    const requestMove = ({ taskId, targetColumnId, targetIndex }: MoveTaskArgs): void => {
        /* Read from the entry the drag itself rendered, so the version cannot be a render behind. */
        const movedTask = queryClient
            .getQueryData<MovableBoard>(queryKey)
            ?.columns.flatMap((column) => column.tasks)
            .find((task) => task.id === taskId);

        if (isNil(movedTask)) {
            return;
        }

        // Exactly one request per completed move — intermediate pointer and arrow steps never reach here.
        void mutation
            .mutateAsync({ taskId, targetColumnId, version: movedTask.version, targetPosition: targetIndex })
            .catch(() => {
                /* The rollback and the toast both live in `onError`; nothing is left to report. */
            });
    };

    return {
        moveTask: requestMove,
        isPending: mutation.isPending,
        /*
         * T5 observed only the MOVED task's version is bumped and a merely-shifted sibling's stays
         * usable, which is what lets this lock stop at the one card rather than the whole column.
         */
        movingTaskId: mutation.isPending ? mutation.variables.taskId : null,
    };
};
