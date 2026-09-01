"use client";

// Covered by: `src/features/boards/components/board-list/board-list.test.tsx`

import { useMutation } from "@tanstack/react-query";

import { useToast } from "@/components/ui/toast/use-toast";
import { renameBoardAction } from "@/features/boards/actions/rename-board-action";
import type { Board } from "@/features/boards/schemas";
import { useOptimisticVariables } from "@/lib/client/optimistic-mutation";
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
 * Names this mutation so any component under `QueryProvider` can read its in-flight variables,
 * which is what lets the sidebar row and the dashboard header assert the new name in the same
 * instant (D-15) with no shared owner — see `usePendingBoardRenames`.
 */
export const RENAME_BOARD_MUTATION_KEY = ["renameBoard"] as const;

/**
 * The variables of every rename still in flight, newest last. Readable from anywhere under
 * `QueryProvider`: the sidebar and the header sit in separate Suspense boundaries of
 * `app/(dashboard)/layout.tsx` and have no common client owner to hold this state.
 */
export const usePendingBoardRenames = (): RenameBoardArgs[] =>
    useOptimisticVariables<RenameBoardArgs>(RENAME_BOARD_MUTATION_KEY);

/**
 * Return `boards` with every pending rename applied, last submission winning per board. The
 * `version` guard is the retirement: once a `refresh()` bumps the board past the version the
 * rename was submitted against, the entry stops matching (T-02-63).
 */
export const applyPendingBoardRenames = ({
    boards,
    pending,
}: {
    boards: Board[];
    pending: RenameBoardArgs[];
}): Board[] => {
    if (pending.length === 0) {
        return boards;
    }

    return boards.map((board) => {
        const rename = pending.findLast(
            (candidate) => candidate.boardId === board.id && candidate.version === board.version,
        );

        return rename === undefined ? board : { ...board, name: rename.name };
    });
};

/**
 * BOARD-04's optimistic rename (D-15), read off the mutation's own variables rather than a cache
 * entry, since reads are RSC props (docs/adr/tech/0019, and tech/0029 for the mechanism).
 */
export const useRenameBoard = ({ boards }: { boards: Board[] }) => {
    const toast = useToast();
    const mutation = useMutation({
        mutationFn: renameBoardAction,
        retry: false,
        mutationKey: RENAME_BOARD_MUTATION_KEY,
    });
    const pending = usePendingBoardRenames();

    const renameBoard = async ({ boardId, name, version }: RenameBoardArgs): Promise<{ didRename: boolean }> => {
        const result = await mutation
            .mutateAsync({ boardId, name, version })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        if (result.status !== RESULT_STATUS.SUCCESS) {
            toast.add({ type: "danger", ...(RENAME_FAILURE_COPY[result.status] ?? GENERIC_RENAME_FAILURE) });

            return { didRename: false };
        }

        return { didRename: true };
    };

    return {
        renameBoard,
        isPending: mutation.isPending,
        boards: applyPendingBoardRenames({ boards, pending }),
    };
};
