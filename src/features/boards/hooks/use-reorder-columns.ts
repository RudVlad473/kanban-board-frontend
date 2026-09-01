"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/ui/toast/use-toast";
import { reorderColumnAction } from "@/features/boards/actions/reorder-column-action";
import { reorderColumns } from "@/features/boards/column-drag-model";
import { toReorderTargetPosition } from "@/features/boards/model";
import type { BoardFull } from "@/features/boards/schemas";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach these strings (03-UI-SPEC Copywriting Contract, T-03-33).
 */
const GENERIC_REORDER_FAILURE = { title: "Couldn't reorder columns.", description: "Try again." };

/*
 * `CONFLICT` earns its own entry for the same reason the rename table gives it one: 03-BACKEND-FACTS
 * § R3 observed a stale reorder returns `OPTIMISTIC_LOCK_CONFLICT`, and retrying the same stale
 * version fails identically, so generic retry copy would loop the user.
 */
const REORDER_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.CONFLICT]: {
        title: "This board changed somewhere else.",
        description: "Refresh to see the latest.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to reorder this board's columns.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That column is no longer available.",
        description: "Refresh to see this board's current columns.",
    },
};

export type ReorderColumnsArgs = { fromIndex: number; toIndex: number };

/** What `reorderColumnAction` is called with, resolved from the cache rather than from the caller. */
type ReorderColumnVariables = { boardId: string; columnId: string; version: number; targetPosition: number };

/** Carries the refusal discriminant across the throw that routes it into `onError`. */
class ColumnReorderRefused extends Error {}

/**
 * COLUMN-03's optimistic reorder (U-05), written into the open board's cache entry so every reader
 * of that board sees it at once (docs/adr/tech/0030).
 */
export const useReorderColumns = ({ boardId }: { boardId: string }) => {
    const toast = useToast();
    const queryClient = useQueryClient();
    const queryKey = buildBoardQueryKey(boardId);

    const mutation = useMutation({
        mutationFn: async (args: ReorderColumnVariables) => {
            const result = await reorderColumnAction(args);

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ColumnReorderRefused(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ columnId, targetPosition }: ReorderColumnVariables) => {
            // Or an in-flight read could land on top of the optimistic order and undo it.
            await queryClient.cancelQueries({ queryKey });
            const previousBoard = queryClient.getQueryData<BoardFull>(queryKey);

            queryClient.setQueryData<BoardFull>(queryKey, (current) => {
                const fromIndex = current?.columns.findIndex((column) => column.id === columnId) ?? -1;

                return current === undefined || fromIndex === -1
                    ? current
                    : {
                          ...current,
                          columns: reorderColumns({
                              columns: current.columns,
                              fromIndex,
                              toIndex: targetPosition,
                          }),
                      };
            });

            return { previousBoard };
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (error: unknown, _variables, context) => {
            if (context?.previousBoard !== undefined) {
                queryClient.setQueryData(queryKey, context.previousBoard);
            }

            const status =
                error instanceof ColumnReorderRefused ? (error.message as ResultStatus) : RESULT_STATUS.ERROR;
            toast.add({ type: "danger", ...(REORDER_FAILURE_COPY[status] ?? GENERIC_REORDER_FAILURE) });
        },

        /*
         * The optimistic order already stands; this settles the moved column's own version.
         * MERGED, never assigned — the response is a tasks-less `Column` (see `use-rename-column.ts`).
         */
        onSuccess: ({ column }) => {
            queryClient.setQueryData<BoardFull>(queryKey, (current) =>
                current === undefined
                    ? current
                    : {
                          ...current,
                          columns: current.columns.map((entry) =>
                              entry.id === column.id ? { ...entry, ...column } : entry,
                          ),
                      },
            );
        },
    });

    const requestReorder = ({ fromIndex, toIndex }: ReorderColumnsArgs): void => {
        /* Read from the entry the drag itself rendered, so the version cannot be a render behind. */
        const movedColumn = queryClient.getQueryData<BoardFull>(queryKey)?.columns.at(fromIndex);

        if (movedColumn === undefined || fromIndex === toIndex) {
            return;
        }

        // Exactly one request per completed move — intermediate arrow steps never reach here (T-03-12).
        void mutation
            .mutateAsync({
                boardId,
                columnId: movedColumn.id,
                version: movedColumn.version,
                targetPosition: toReorderTargetPosition({ toIndex }),
            })
            .catch(() => {
                /* The rollback and the toast both live in `onError`; nothing is left to report. */
            });
    };

    return {
        reorderColumns: requestReorder,
        isPending: mutation.isPending,
        /*
         * T-03-31: the moved column's version IS bumped (03-BACKEND-FACTS § R2), so its own rename
         * and delete stay locked until the write settles. R2 also observed merely SHIFTED columns
         * keep a valid version, which is what lets this stop at the one column that moved.
         */
        reorderingColumnId: mutation.isPending ? mutation.variables.columnId : null,
    };
};
