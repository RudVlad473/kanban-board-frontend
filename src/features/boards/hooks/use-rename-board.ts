"use client";

// Covered by: `src/features/boards/components/board-list/board-list.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useFailureToast } from "@/components/ui/toast/use-failure-toast";
import { renameBoardAction } from "@/features/boards/actions/rename-board-action";
import { BOARDS_QUERY_KEY } from "@/features/boards/queries/boards-query";
import type { Board } from "@/features/boards/schemas";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach these strings (UI-SPEC Copywriting Contract, T-02-61). Titles name what happened,
 * descriptions name what to do, matching the Contract's own two-part toast shape.
 */
const GENERIC_RENAME_FAILURE = { title: "Couldn't rename board.", description: "Try again." };

/*
 * Only the branches with something distinct to tell the user. `CONFLICT` is deliberately absent:
 * a stale version keeps D-15's generic path in this phase, because explaining it is SYNC-01's job
 * (Phase 4) and half-building that reconciliation would be worse than not starting it.
 */
const RENAME_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.DUPLICATE]: {
        title: "A board with that name already exists.",
        description: "Choose a different name.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to rename this board.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That board is no longer available.",
        description: "Refresh to see your current boards.",
    },
};

export type RenameBoardArgs = { boardId: string; name: string; version: number };

/**
 * BOARD-04's optimistic rename (D-15), as TanStack Query's cache-based optimistic update: the
 * pending name is written into the `boards` entry both the sidebar and the header read, so they
 * change in the same instant with no shared owner and no provider (docs/adr/tech/0019).
 */
export const useRenameBoard = () => {
    const raiseFailureToast = useFailureToast({ copy: RENAME_FAILURE_COPY, fallback: GENERIC_RENAME_FAILURE });
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (args: RenameBoardArgs) => {
            const result = await renameBoardAction(args);

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ boardId, name }: RenameBoardArgs) => {
            // Or an in-flight read could land on top of the optimistic name and undo it.
            await queryClient.cancelQueries({ queryKey: BOARDS_QUERY_KEY });
            const previousBoards = queryClient.getQueryData<Board[]>(BOARDS_QUERY_KEY);

            queryClient.setQueryData<Board[]>(BOARDS_QUERY_KEY, (current) =>
                current?.map((board) => (board.id === boardId ? { ...board, name } : board)),
            );

            return { previousBoards };
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (error, variables, context); the shape is dictated by that external API, not this project (ADR tech/0016 exemption, as in sign-in-action.ts)
        onError: (error: unknown, _variables, context) => {
            if (context?.previousBoards !== undefined) {
                queryClient.setQueryData(BOARDS_QUERY_KEY, context.previousBoards);
            }

            raiseFailureToast(error);
        },

        /*
         * The action returns the written board, version included, so this IS the settled value —
         * a refetch would spend a round trip to learn what this response just said.
         */
        onSuccess: ({ board }) => {
            queryClient.setQueryData<Board[]>(BOARDS_QUERY_KEY, (current) =>
                current?.map((entry) => (entry.id === board.id ? board : entry)),
            );
        },
    });

    /* The toast and the rollback both live in `onError`, so this only reports what the caller needs. */
    const renameBoard = async (args: RenameBoardArgs): Promise<{ didRename: boolean }> =>
        mutation
            .mutateAsync(args)
            .then(() => ({ didRename: true }))
            .catch(() => ({ didRename: false }));

    return { renameBoard, isPending: mutation.isPending };
};
