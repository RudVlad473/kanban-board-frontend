"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { renameColumnAction } from "@/features/boards/actions/rename-column";
import type { ColumnFull } from "@/features/boards/schemas";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach these strings (03-UI-SPEC Copywriting Contract, T-03-03).
 */
const GENERIC_RENAME_FAILURE = { title: "Couldn't rename column.", description: "Try again." };

/*
 * `CONFLICT` earns its own entry here, unlike `use-rename-board.ts`'s table which deliberately
 * omits it: retrying with the same stale version fails identically, so generic retry copy would
 * loop the user (03-UI-SPEC error/version-conflict).
 */
const RENAME_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.CONFLICT]: {
        title: "This board changed somewhere else.",
        description: "Refresh to see the latest.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to rename this column.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That column is no longer available.",
        description: "Refresh to see this board's current columns.",
    },
};

export type RenameColumnArgs = { boardId: string; columnId: string; name: string; version: number };

/**
 * The one column whose name the UI is asserting ahead of the server. `previousName` is what the
 * header showed at submit time, and it is what retires the override: see `applyColumnRenameOverride`.
 */
export type ColumnRenameOverride = { columnId: string; previousName: string; name: string };

/**
 * Applies the override to a supplied column array, returning a new array in which only the matching
 * entry's name differs. The `previousName` guard retires a stale override by pure derivation
 * (T-03-29) — nothing needs clearing once the refreshed props carry the new name.
 */
export const applyColumnRenameOverride = ({
    columns,
    override,
}: {
    columns: ColumnFull[];
    override: ColumnRenameOverride | null;
}): ColumnFull[] => {
    if (override === null) {
        return columns;
    }

    return columns.map((column) =>
        column.id === override.columnId && column.name === override.previousName
            ? { ...column, name: override.name }
            : column,
    );
};

/**
 * COLUMN-02's optimistic rename (U-05). The apply and the rollback live in local state, never a
 * query cache — column reads are RSC props under docs/adr/tech/0019, so there is no cache entry to
 * patch. No context provider: exactly one container consumes this override.
 */
export const useRenameColumn = ({ columns }: { columns: ColumnFull[] }) => {
    const toast = useToast();
    const [override, setOverride] = useState<ColumnRenameOverride | null>(null);
    const mutation = useMutation({ mutationFn: renameColumnAction, retry: false });

    const renameColumn = async ({
        boardId,
        columnId,
        name,
        version,
    }: RenameColumnArgs): Promise<{ didRename: boolean }> => {
        const previousName = columns.find((column) => column.id === columnId)?.name ?? name;

        // Optimistic: the header asserts the new name before the action is called.
        setOverride({ columnId, previousName, name });

        const result = await mutation
            .mutateAsync({ boardId, columnId, name, version })
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
        renameColumn,
        isPending: mutation.isPending,
        columns: applyColumnRenameOverride({ columns, override }),
    };
};
