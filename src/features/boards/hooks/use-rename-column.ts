"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/ui/toast/use-toast";
import { renameColumnAction } from "@/features/boards/actions/rename-column-action";
import type { BoardFull } from "@/features/boards/schemas";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach these strings (03-UI-SPEC Copywriting Contract, T-03-03).
 */
const GENERIC_RENAME_FAILURE = { title: "Couldn't rename column.", description: "Try again." };

/*
 * `CONFLICT` earns its own entry here, unlike `use-rename-board.ts`'s table which deliberately
 * omits it: retrying with the same stale version fails identically, so generic retry copy would
 * loop the user (03-UI-SPEC error/version-conflict).
 */
const RENAME_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.CONFLICT]: {
        title: "This board changed somewhere else.",
        description: "Refresh to see the latest.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to rename this column.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That column is no longer available.",
        description: "Refresh to see this board's current columns.",
    },
};

export type RenameColumnArgs = { boardId: string; columnId: string; name: string; version: number };

/**
 * COLUMN-02's optimistic rename (U-05), written into the open board's cache entry so every reader
 * of that board sees it at once (docs/adr/tech/0030).
 */
export const useRenameColumn = ({ boardId }: { boardId: string }) => {
    const toast = useToast();
    const queryClient = useQueryClient();
    const queryKey = buildBoardQueryKey(boardId);

    const mutation = useMutation({
        mutationFn: async (args: RenameColumnArgs) => {
            const result = await renameColumnAction(args);

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ columnId, name }: RenameColumnArgs) => {
            await queryClient.cancelQueries({ queryKey });
            const previousBoard = queryClient.getQueryData<BoardFull>(queryKey);

            queryClient.setQueryData<BoardFull>(queryKey, (current) =>
                current === undefined
                    ? current
                    : {
                          ...current,
                          columns: current.columns.map((column) =>
                              column.id === columnId ? { ...column, name } : column,
                          ),
                      },
            );

            return { previousBoard };
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (error: unknown, _variables, context) => {
            if (context?.previousBoard !== undefined) {
                queryClient.setQueryData(queryKey, context.previousBoard);
            }

            const status = error instanceof ActionRefusedError ? error.status : RESULT_STATUS.ERROR;
            toast.add({ type: "danger", ...(RENAME_FAILURE_COPY[status] ?? GENERIC_RENAME_FAILURE) });
        },

        /*
         * The action returns the written column, version included, so this IS the settled value.
         * MERGED, never assigned: `renameColumnAction` answers with a tasks-less `Column`, and
         * replacing the entry wholesale would drop every task on the renamed column.
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

    const renameColumn = async (args: RenameColumnArgs): Promise<{ didRename: boolean }> =>
        mutation
            .mutateAsync(args)
            .then(() => ({ didRename: true }))
            .catch(() => ({ didRename: false }));

    return { renameColumn, isPending: mutation.isPending };
};
