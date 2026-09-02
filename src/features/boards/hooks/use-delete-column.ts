"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useFailureToast } from "@/components/ui/toast/use-failure-toast";
import { deleteColumnAction } from "@/features/boards/actions/delete-column-action";
import { withColumnRemove } from "@/features/boards/model";
import type { BoardFull } from "@/features/boards/schemas";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach these strings (03-UI-SPEC Copywriting Contract, T-03-03).
 */
const GENERIC_DELETE_FAILURE = { title: "Couldn't delete column.", description: "Try again." };

/*
 * `CONFLICT` earns its own entry here, unlike `use-delete-board.ts`'s single generic failure:
 * retrying against the same stale version fails identically, so generic retry copy would loop the
 * user (03-UI-SPEC error/version-conflict).
 */
const DELETE_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.CONFLICT]: {
        title: "This board changed somewhere else.",
        description: "Refresh to see the latest.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to delete this column.",
    },
    /* Where a double submit lands: a second DELETE answers 404 ENTITY_NOT_FOUND (03-BACKEND-FACTS R7). */
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That column is no longer available.",
        description: "Refresh to see this board's current columns.",
    },
};

export type DeleteColumnArgs = { boardId: string; columnId: string };

/*
 * Decisions ─────────────────────────────────────────────────────────────────────────────────────
 * comment-length-exempt: records a reversal of this hook's own previous decision, which a reader comparing it against ADR domain/0002 would otherwise re-open (docs/adr/tech/0023)
 * This hook read "deliberately NOT optimistic (ADR domain/0002)" until 2026-09-02, on the argument
 * that the cascade to the column's tasks is irreversible so "there would be nothing to roll back
 * to". That is false of the client: the snapshot `onError` restores holds the column WITH its
 * tasks, and the ADR is about the server having no trash to recover from, not about staging.
 * What would make this wrong: a delete whose failure the client cannot detect. This one's action
 * reports every refusal as a status, which is what the rollback below hangs on.
 * ───────────────────────────────────────────────────────────────────────────────────────────────
 */

/**
 * COLUMN-04's optimistic delete (U-05): the column leaves the board on submit and a refusal puts it
 * back, tasks included, from the whole-board snapshot. Mechanism: docs/adr/tech/0030.
 */
export const useDeleteColumn = () => {
    const raiseFailureToast = useFailureToast({ copy: DELETE_FAILURE_COPY, fallback: GENERIC_DELETE_FAILURE });
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async ({ boardId, columnId }: DeleteColumnArgs) => {
            const result = await deleteColumnAction({ boardId, columnId });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ boardId, columnId }: DeleteColumnArgs) => {
            const queryKey = buildBoardQueryKey(boardId);
            // Or an in-flight read could land on top of the optimistic board and undo it.
            await queryClient.cancelQueries({ queryKey });
            const previousBoard = queryClient.getQueryData<BoardFull>(queryKey);

            queryClient.setQueryData<BoardFull>(queryKey, (current) =>
                current === undefined
                    ? current
                    : { ...current, columns: withColumnRemove({ columns: current.columns, columnId }) },
            );

            return { previousBoard };
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (error: unknown, { boardId }: DeleteColumnArgs, context) => {
            /* Restoring the whole-board snapshot is what brings the column and its tasks back. */
            if (context?.previousBoard !== undefined) {
                queryClient.setQueryData(buildBoardQueryKey(boardId), context.previousBoard);
            }

            raiseFailureToast(error);
        },
    });

    /* The rollback and the toast both live in `onError`; this reports the outcome only. */
    const deleteColumn = async ({ boardId, columnId }: DeleteColumnArgs): Promise<{ didDelete: boolean }> =>
        mutation
            .mutateAsync({ boardId, columnId })
            .then(() => ({ didDelete: true }))
            .catch(() => ({ didDelete: false }));

    return { deleteColumn, isPending: mutation.isPending };
};
