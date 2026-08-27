"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast/use-toast";
import { deleteBoardAction } from "@/features/boards/actions/delete-board-action";
import { removeBoard, resolveDestinationAfterDelete } from "@/features/boards/model";
import type { Board } from "@/features/boards/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/*
 * Authored copy only — the action returns a bare discriminant, so nothing the backend said can
 * reach these strings (UI-SPEC Copywriting Contract, T-02-69). One generic failure, deliberately:
 * D-09 has nothing distinct to explain because nothing was changed (see `use-rename-board.ts`).
 */
const DELETE_FAILURE_COPY = { title: "Couldn't delete board.", description: "Try again." };

/**
 * BOARD-05's delete (D-09). Deliberately NOT optimistic, unlike its rename sibling: the row must
 * stay in the sidebar until the delete succeeds, or a failed delete would make a board look gone
 * for as long as the request took, with no undo behind it (ADR domain/0002, T-02-66).
 */
export const useDeleteBoard = ({ boards, currentBoardId }: { boards: Board[]; currentBoardId: string | null }) => {
    const router = useRouter();
    const toast = useToast();
    const mutation = useMutation({ mutationFn: deleteBoardAction, retry: false });

    const deleteBoard = async ({ boardId }: { boardId: string }): Promise<{ didDelete: boolean }> => {
        const result = await mutation.mutateAsync({ boardId }).catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        if (result.status !== RESULT_STATUS.SUCCESS) {
            // Nothing to undo — the sidebar was never changed, so the toast is the whole response.
            toast.add({ type: "danger", ...DELETE_FAILURE_COPY });

            return { didDelete: false };
        }

        /*
         * No cache work on success: `refresh()` inside the action is what removes the row from the
         * persistent sidebar layout (docs/adr/tech/0019). Moving the user is the only client job.
         */
        const destination = resolveDestinationAfterDelete({
            remainingBoards: removeBoard({ boards, boardId }),
            deletedBoardId: boardId,
            currentBoardId,
        });

        if (destination !== null) {
            // `replace`, so the deleted board's address does not sit in the back history (T-02-70).
            router.replace(destination);
        }

        return { didDelete: true };
    };

    return { deleteBoard, isPending: mutation.isPending };
};
