"use client";

// Covered by: `src/features/boards/components/board-list/board-list.test.tsx`

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useFailureToast } from "@/components/ui/toast/use-failure-toast";
import { deleteBoardAction } from "@/features/boards/actions/delete-board-action";
import { removeBoard, resolveDestinationAfterDelete } from "@/features/boards/model";
import { BOARDS_QUERY_KEY } from "@/features/boards/queries/boards-query";
import type { Board } from "@/features/boards/schemas";
import { ActionRefusedError } from "@/lib/core/api-contract/action-refused-error";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { buildBoardDetailPath } from "@/lib/core/routing/routes";

/*
 * Authored copy only — the action returns a bare discriminant, so nothing the backend said can
 * reach these strings (UI-SPEC Copywriting Contract, T-02-69). One generic failure, deliberately:
 * D-09 has nothing distinct to explain because nothing was changed (see `use-rename-board.ts`).
 */
const DELETE_FAILURE_COPY = { title: "Couldn't delete board.", description: "Try again." };

/*
 * Decisions ─────────────────────────────────────────────────────────────────────────────────────
 * comment-length-exempt: records a reversal of this hook's own previous decision, which a reader comparing it against ADR domain/0002 would otherwise re-open (docs/adr/tech/0023)
 * This hook read "deliberately NOT optimistic (ADR domain/0002)" until 2026-09-02. That ADR says
 * the SERVER cannot undo a delete; it says nothing about staging one in the client. The snapshot
 * `onError` restores is a complete undo of the only thing removed here — a cache entry — so the
 * argument it rested on ("there would be nothing to roll back to") was never true of this write.
 * What would make this wrong: a delete whose failure the client cannot detect. This one's action
 * reports every refusal as a status, which is what the rollback below hangs on.
 * ───────────────────────────────────────────────────────────────────────────────────────────────
 */

/**
 * BOARD-05's optimistic delete: the row leaves the sidebar and the viewer leaves the board
 * on submit, and a refusal puts both back. Mechanism: docs/adr/tech/0030.
 */
export const useDeleteBoard = ({ currentBoardId }: { currentBoardId: string | null }) => {
    const queryClient = useQueryClient();
    const router = useRouter();
    const raiseFailureToast = useFailureToast({ fallback: DELETE_FAILURE_COPY });

    const mutation = useMutation({
        mutationFn: async ({ boardId }: { boardId: string }) => {
            const result = await deleteBoardAction({ boardId });

            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new ActionRefusedError(result.status);
            }

            return result;
        },
        retry: false,

        onMutate: async ({ boardId }: { boardId: string }) => {
            // Or an in-flight read could land on top of the optimistic list and undo it.
            await queryClient.cancelQueries({ queryKey: BOARDS_QUERY_KEY });
            const previousBoards = queryClient.getQueryData<Board[]>(BOARDS_QUERY_KEY);

            /* `setQueryData` returns what it wrote, which is the list the destination is resolved against. */
            const remainingBoards =
                queryClient.setQueryData<Board[]>(BOARDS_QUERY_KEY, (current) =>
                    removeBoard({ boards: current ?? [], boardId }),
                ) ?? [];
            const destination = resolveDestinationAfterDelete({
                remainingBoards,
                deletedBoardId: boardId,
                currentBoardId,
            });

            if (destination !== null) {
                // `replace`, so the deleted board's address does not sit in the back history (T-02-70).
                router.replace(destination);
            }

            return { previousBoards, didNavigate: destination !== null };
        },

        // eslint-disable-next-line no-restricted-syntax -- TanStack calls onError positionally (ADR tech/0016 exemption)
        onError: (error: unknown, { boardId }: { boardId: string }, context) => {
            if (context?.previousBoards !== undefined) {
                queryClient.setQueryData(BOARDS_QUERY_KEY, context.previousBoards);
            }

            /*
             * The restored row names a board the user was looking at, so the address has to come back
             * with it — otherwise the sidebar shows a board nothing can navigate to any more.
             */
            if (context?.didNavigate === true) {
                router.replace(buildBoardDetailPath(boardId));
            }

            raiseFailureToast(error);
        },
    });

    /* The rollback, the re-navigation and the toast all live in `onError`; this reports the outcome only. */
    const deleteBoard = async ({ boardId }: { boardId: string }): Promise<{ didDelete: boolean }> =>
        mutation
            .mutateAsync({ boardId })
            .then(() => ({ didDelete: true }))
            .catch(() => ({ didDelete: false }));

    return { deleteBoard, isPending: mutation.isPending };
};
