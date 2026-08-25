"use client";

import { useMutation } from "@tanstack/react-query";

import { renameBoardAction } from "@/features/boards/actions/rename-board";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

export type RenameBoardArgs = { boardId: string; name: string; version: number };

/**
 * BOARD-04's write path, built on `use-theme-preference.ts`'s shape: a `useMutation` whose
 * `mutationFn` is the Server Action itself, with no retries (docs/adr/tech/0019). The optimistic
 * overlay and its rollback toast layer on top of this in Task 2.
 */
export const useRenameBoard = () => {
    const mutation = useMutation({ mutationFn: renameBoardAction, retry: false });

    const renameBoard = async (args: RenameBoardArgs): Promise<{ didRename: boolean }> => {
        const result = await mutation.mutateAsync(args).catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        return { didRename: result.status === RESULT_STATUS.SUCCESS };
    };

    return { renameBoard, isPending: mutation.isPending };
};
