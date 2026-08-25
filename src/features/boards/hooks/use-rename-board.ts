"use client";

import { useMutation } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { renameBoardAction } from "@/features/boards/actions/rename-board";
import type { Board } from "@/features/boards/schemas";
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
 * The one board whose name the UI is asserting ahead of the server. `previousName` is what the row
 * showed at submit time, and it is what retires the override: see `applyRenameOverride`.
 */
export type RenameOverride = { boardId: string; previousName: string; name: string };

type RenameOverrideStore = {
    override: RenameOverride | null;
    setOverride: (override: RenameOverride | null) => void;
};

/**
 * Shared so the sidebar row and the dashboard header assert the new name in the same instant. The
 * provider is optional: without one, `useRenameBoard` falls back to state local to its own caller.
 */
export const RenameOverrideContext = createContext<RenameOverrideStore | null>(null);

export const useRenameOverride = (): RenameOverride | null => useContext(RenameOverrideContext)?.override ?? null;

/**
 * Applies the override to a supplied board array, returning a new array in which only the matching
 * entry's name differs. The `previousName` guard retires a stale override by pure derivation
 * (T-02-63) — see 02-12-SUMMARY.md for why derivation replaced clearing state during render.
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

    return boards.map((board) =>
        board.id === override.boardId && board.name === override.previousName
            ? { ...board, name: override.name }
            : board,
    );
};

/**
 * BOARD-04's optimistic rename (D-15). The apply and the rollback live in local state, never a
 * query cache — reads never go through `useQuery` under docs/adr/tech/0019, so there is no cache
 * entry to patch; this is the shape `use-theme-preference.ts` already ships and that ADR names.
 */
export const useRenameBoard = ({ boards }: { boards: Board[] }) => {
    const toast = useToast();
    const sharedStore = useContext(RenameOverrideContext);
    const [localOverride, setLocalOverride] = useState<RenameOverride | null>(null);
    const mutation = useMutation({ mutationFn: renameBoardAction, retry: false });

    const override = sharedStore ? sharedStore.override : localOverride;
    const setOverride = sharedStore ? sharedStore.setOverride : setLocalOverride;

    const renameBoard = async ({ boardId, name, version }: RenameBoardArgs): Promise<{ didRename: boolean }> => {
        const previousName = boards.find((board) => board.id === boardId)?.name ?? name;

        // Optimistic: the sidebar and the header both assert the new name before the action is called.
        setOverride({ boardId, previousName, name });

        const result = await mutation
            .mutateAsync({ boardId, name, version })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        if (result.status !== RESULT_STATUS.SUCCESS) {
            // Dropping the override restores the previous name exactly — the raw props still carry it.
            setOverride(null);
            toast.add({ type: "danger", ...(RENAME_FAILURE_COPY[result.status] ?? GENERIC_RENAME_FAILURE) });

            return { didRename: false };
        }

        // Left in place on success: it retires itself once the refreshed props carry the new name.
        return { didRename: true };
    };

    return {
        renameBoard,
        isPending: mutation.isPending,
        boards: applyRenameOverride({ boards, override }),
    };
};
