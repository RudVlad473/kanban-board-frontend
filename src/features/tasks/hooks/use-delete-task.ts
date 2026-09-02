"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation } from "@tanstack/react-query";

import { useToast } from "@/components/ui/toast/use-toast";
import { deleteTaskAction } from "@/features/tasks/actions/delete-task-action";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach these strings (04-UI-SPEC Copywriting Contract, T-04-40).
 */
const GENERIC_DELETE_FAILURE = { title: "Couldn't delete task.", description: "Try again." };

/*
 * `NOT_FOUND` earns its own entry, matching `use-delete-column.ts`: a double submit lands there
 * (T6), and generic retry copy would tell the user to retry something that can never succeed again.
 */
const DELETE_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to delete this task.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That task is no longer available.",
        description: "Refresh to see this board's current tasks.",
    },
};

export type DeleteTaskArgs = { boardId: string; columnId: string; taskId: string };

/**
 * TASK-05's delete (D-09). Deliberately NOT optimistic, unlike every other mutation this phase
 * ships: the task stays on the board until the server agrees, because the cascade to its subtasks
 * is irreversible (ADR domain/0002) and there would be nothing to roll back to if the delete failed.
 */
export const useDeleteTask = () => {
    const toast = useToast();
    const mutation = useMutation({ mutationFn: deleteTaskAction, retry: false });

    const deleteTask = async ({ boardId, columnId, taskId }: DeleteTaskArgs): Promise<{ didDelete: boolean }> => {
        const result = await mutation
            .mutateAsync({ boardId, columnId, taskId })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        if (result.status !== RESULT_STATUS.SUCCESS) {
            // Nothing to undo — the board was never changed, so the toast is the whole response.
            toast.add({ type: "danger", ...(DELETE_FAILURE_COPY[result.status] ?? GENERIC_DELETE_FAILURE) });

            return { didDelete: false };
        }

        /*
         * No cache work here: `refresh()` inside the action is what removes the task from the
         * board's own RSC-seeded query-cache entry (docs/adr/tech/0030), same as `useDeleteColumn`.
         */
        return { didDelete: true };
    };

    return { deleteTask, isPending: mutation.isPending };
};
