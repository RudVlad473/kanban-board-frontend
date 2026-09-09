"use client";

// Covered by: `src/features/tasks/components/edit-task-modal/edit-task-modal.test.tsx`

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isNil } from "es-toolkit";
import { useState } from "react";

import { useFailureToast } from "@/components/ui/toast/use-failure-toast";
import { createSubtaskAction } from "@/features/tasks/actions/create-subtask-action";
import { withSubtaskInsert, withSubtaskRemove, type TaskColumn } from "@/features/tasks/model";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import type { Subtask } from "@/lib/core/api-contract/task-schemas";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";
import { MUTATION_KEY } from "@/lib/core/query-keys/mutation-keys";

/*
 * Only the part of the board entry a create touches. Structural rather than the boards feature's
 * own `BoardFull`, which D-18 forbids importing — the spread below preserves the fields not named here.
 */
type CreatableBoard = { columns: TaskColumn[] };

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can reach
 * these strings (04-UI-SPEC Copywriting Contract, T-04-05).
 */
const GENERIC_CREATE_FAILURE = { title: "Couldn't add subtask.", description: "Try again." };

const CREATE_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to add this subtask.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That task is no longer available.",
        description: "Refresh to see this board's current tasks.",
    },
};

// comment-length-exempt: records why this hook subscribes to the shared cache rather than trusting its caller's props — a settled design decision a future reader would otherwise "simplify" back into a prop read (docs/adr/tech/0023)
/**
 * SUBTASK-01's optimistic add. A draft row commits by inserting a PLACEHOLDER subtask, keyed by the
 * caller's own client-generated `clientId`, immediately — then either the server's real id/version
 * replaces it (success) or the whole-board snapshot restore removes it (failure), the same
 * cache-write triple `useToggleSubtask` uses (docs/adr/tech/0030). Subscribes to the shared
 * `["board", boardId]` entry itself, seeded via `initialData` from its own caller's `columns`, so an
 * isolated `EditTaskModal` render (this hook's own test) still sees a reactive subtask list, exactly
 * as `useToggleSubtask` does for the checklist. The in-flight lock is keyed on that same `clientId`,
 * so two draft rows committing at once are independent.
 */
export const useCreateSubtask = ({
    boardId,
    taskId,
    columns,
}: {
    boardId: string;
    taskId: string;
    columns: TaskColumn[];
}) => {
    const raiseFailureToast = useFailureToast({ copy: CREATE_FAILURE_COPY, fallback: GENERIC_CREATE_FAILURE });
    const queryClient = useQueryClient();
    const queryKey = buildBoardQueryKey(boardId);
    const [pendingClientIds, setPendingClientIds] = useState<ReadonlySet<string>>(new Set());

    const { data: board } = useQuery<CreatableBoard>({
        queryKey,
        initialData: { columns },
        staleTime: Infinity,
        // comment-length-exempt: records what this observer must NOT declare on a shared entry, and that BOTH ways of declaring one are wrong — a reader would otherwise restore either the resolver or the skipToken
        /*
         * NO `queryFn` at all. This observer only READS the board entry; the entry's own fetcher
         * belongs to `board-query.ts`, and every observer's `queryFn` is stored on the one shared
         * query, so the last one mounted wins. A resolver here resolved the whole board to this
         * hook's partial `{ columns }` view. `skipToken` is worse: it is truthy, so query-core's
         * "borrow a queryFn from another observer" fallback (guarded by `if (!this.options.queryFn)`)
         * never fires and a refetch parks the shared query in `error: Missing queryFn`. Omitting it
         * is what lets that fallback reach the canonical fetcher. Measured on query-core 5.101.4.
         */
    });
    const subtasks: Subtask[] =
        board.columns.flatMap((column) => column.tasks).find((task) => task.id === taskId)?.subtasks ?? [];

    const mutation = useMutation({
        mutationKey: MUTATION_KEY.CREATE_SUBTASK,
        mutationFn: async (args: { clientId: string; title: string }) => {
            const columnId =
                queryClient
                    .getQueryData<CreatableBoard>(queryKey)
                    ?.columns.find((column) => column.tasks.some((task) => task.id === taskId))?.id ?? "";
            const result = await createSubtaskAction({ boardId, columnId, taskId, title: args.title });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ clientId, title }: { clientId: string; title: string }) => {
            // Or an in-flight read could land on top of the optimistic board and undo it.
            await queryClient.cancelQueries({ queryKey });

            setPendingClientIds((current) => new Set(current).add(clientId));
            /* Placeholder fields are inert — the server owns `isCompleted`/`version`, replaced on success. */
            queryClient.setQueryData<CreatableBoard>(queryKey, (current) =>
                isNil(current)
                    ? current
                    : {
                          ...current,
                          columns: withSubtaskInsert({
                              columns: current.columns,
                              taskId,
                              subtask: { id: clientId, title, isCompleted: false, version: 0 },
                          }),
                      },
            );

            /* Removes THIS row only — sibling draft rows commit independently and must survive. */
            return {
                undo: (current: CreatableBoard) =>
                    withSubtaskRemove({ columns: current.columns, taskId, subtaskId: clientId }),
            };
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (error: unknown, _variables, context) => {
            if (!isNil(context)) {
                queryClient.setQueryData<CreatableBoard>(queryKey, (current) =>
                    isNil(current) ? current : { ...current, columns: context.undo(current) },
                );
            }

            raiseFailureToast(error);
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onSuccess positionally (ADR tech/0016 exemption)
        onSuccess: ({ subtask }, { clientId }) => {
            /* The placeholder row is swapped for the server's real id/version — never inserted twice. */
            queryClient.setQueryData<CreatableBoard>(queryKey, (current) =>
                isNil(current)
                    ? current
                    : {
                          ...current,
                          columns: withSubtaskInsert({
                              columns: withSubtaskRemove({ columns: current.columns, taskId, subtaskId: clientId }),
                              taskId,
                              subtask,
                          }),
                      },
            );
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onSettled positionally (ADR tech/0016 exemption)
        onSettled: (_data, _error, { clientId }: { clientId: string; title: string }) => {
            setPendingClientIds((current) => {
                if (!current.has(clientId)) {
                    return current;
                }

                const next = new Set(current);
                next.delete(clientId);
                return next;
            });
        },
    });

    const createSubtask = async ({
        clientId,
        title,
    }: {
        clientId: string;
        title: string;
    }): Promise<{ didCreate: boolean }> => {
        const result = await mutation
            .mutateAsync({ clientId, title })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        return { didCreate: result.status === RESULT_STATUS.SUCCESS };
    };

    return {
        subtasks,
        createSubtask,
        isCreatingSubtask: (clientId: string): boolean => pendingClientIds.has(clientId),
    };
};
