"use client";

import { useMutation } from "@tanstack/react-query";

import { useToast } from "@/components/ui/toast/use-toast";
import { deleteColumnAction } from "@/features/boards/actions/delete-column";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";

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

/**
 * COLUMN-04's delete (U-05). Deliberately NOT optimistic, unlike its rename sibling: the column
 * stays on the board until the server agrees, because the cascade to its tasks and subtasks is
 * irreversible (ADR domain/0002) and there would be nothing to roll back to if the delete failed.
 */
export const useDeleteColumn = () => {
    const toast = useToast();
    const mutation = useMutation({ mutationFn: deleteColumnAction, retry: false });

    const deleteColumn = async ({ boardId, columnId }: DeleteColumnArgs): Promise<{ didDelete: boolean }> => {
        const result = await mutation
            .mutateAsync({ boardId, columnId })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        if (result.status !== RESULT_STATUS.SUCCESS) {
            // Nothing to undo — the board was never changed, so the toast is the whole response.
            toast.add({ type: "danger", ...(DELETE_FAILURE_COPY[result.status] ?? GENERIC_DELETE_FAILURE) });

            return { didDelete: false };
        }

        /*
         * No cache work and no navigation on success: `refresh()` inside the action is what removes
         * the column, and deleting one never moves the user off the board (docs/adr/tech/0019).
         */
        return { didDelete: true };
    };

    return { deleteColumn, isPending: mutation.isPending };
};
