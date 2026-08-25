"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { renameBoardAction } from "@/features/boards/actions/rename-board";
import type { Board } from "@/features/boards/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach these strings (UI-SPEC Copywriting Contract, T-02-61).
 */
const RENAME_FAILURE_TITLE = "Couldn't rename board.";
const RENAME_FAILURE_DESCRIPTION = "Try again.";

export type RenameBoardArgs = { boardId: string; name: string; version: number };

/** The one board whose name the sidebar is currently asserting ahead of the server. */
export type RenameOverride = { boardId: string; name: string };

/**
 * Applies the override to a supplied board array, returning a new array in which only the matching
 * entry's name differs. Named and exported so "every other row is left alone" is directly assertable.
 */
export const applyRenameOverride = ({
    boards,
    override,
}: {
    boards: Board[];
    override: RenameOverride | null;
}): Board[] => {
    if (override === null) {
        return boards;
    }

    return boards.map((board) => (board.id === override.boardId ? { ...board, name: override.name } : board));
};

/**
 * BOARD-04's optimistic rename (D-15). The apply and the rollback live in local state, never a
 * query cache — reads never go through `useQuery` under docs/adr/tech/0019, so there is no cache
 * entry to patch; this is the shape `use-theme-preference.ts` already ships and that ADR names.
 */
export const useRenameBoard = ({ boards }: { boards: Board[] }) => {
    const toast = useToast();
    const [override, setOverride] = useState<RenameOverride | null>(null);
    const mutation = useMutation({ mutationFn: renameBoardAction, retry: false });

    /*
     * Cleared during render rather than in an effect (React's documented way to adjust state when
     * props change): once the refreshed props carry this name, a later server-side change to the
     * same row would otherwise stay masked by a stale local value (T-02-63).
     */
    if (override !== null && boards.some((board) => board.id === override.boardId && board.name === override.name)) {
        setOverride(null);
    }

    const renameBoard = async ({ boardId, name, version }: RenameBoardArgs): Promise<{ didRename: boolean }> => {
        /*
         * Optimistic: the sidebar asserts the new name before the action is called. Dropping the
         * override restores the previous name exactly, since the raw props still carry it.
         */
        setOverride({ boardId, name });

        const result = await mutation
            .mutateAsync({ boardId, name, version })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        /*
         * A conflict takes the same restore-and-announce path as a generic failure — SYNC-01's
         * reconciliation experience is Phase 4 scope and is deliberately not half-built here.
         */
        if (result.status !== RESULT_STATUS.SUCCESS) {
            setOverride(null);
            toast.add({ type: "danger", title: RENAME_FAILURE_TITLE, description: RENAME_FAILURE_DESCRIPTION });

            return { didRename: false };
        }

        // Left in place on success: the refreshed server render carries the same name and clears it.
        return { didRename: true };
    };

    return {
        renameBoard,
        isPending: mutation.isPending,
        boards: applyRenameOverride({ boards, override }),
    };
};
