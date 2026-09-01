"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation } from "@tanstack/react-query";

import { useToast } from "@/components/ui/toast/use-toast";
import { renameColumnAction } from "@/features/boards/actions/rename-column-action";
import type { ColumnFull } from "@/features/boards/schemas";
import { useOptimisticVariables } from "@/lib/client/optimistic-mutation";
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
 * Names this mutation so its in-flight variables can be read back as the optimistic name, the same
 * shape `use-rename-board.ts` uses. Kept here even though one container consumes it, so every
 * optimistic surface in the app reads the same way.
 */
export const RENAME_COLUMN_MUTATION_KEY = ["renameColumn"] as const;

/** The variables of every column rename still in flight, newest last. */
export const usePendingColumnRenames = (): RenameColumnArgs[] =>
    useOptimisticVariables<RenameColumnArgs>(RENAME_COLUMN_MUTATION_KEY);

/**
 * Return `columns` with every pending rename applied, last submission winning per column. The
 * `version` guard is the retirement: once a `refresh()` bumps the column past the version the
 * rename was submitted against, the entry stops matching (T-03-29).
 */
export const applyPendingColumnRenames = ({
    columns,
    pending,
}: {
    columns: ColumnFull[];
    pending: RenameColumnArgs[];
}): ColumnFull[] => {
    if (pending.length === 0) {
        return columns;
    }

    return columns.map((column) => {
        const rename = pending.findLast(
            (candidate) => candidate.columnId === column.id && candidate.version === column.version,
        );

        return rename === undefined ? column : { ...column, name: rename.name };
    });
};

/**
 * COLUMN-02's optimistic rename (U-05), read off the mutation's own variables rather than a cache
 * entry, since column reads are RSC props (docs/adr/tech/0019, and tech/0029 for the mechanism).
 */
export const useRenameColumn = ({ columns }: { columns: ColumnFull[] }) => {
    const toast = useToast();
    const mutation = useMutation({
        mutationFn: renameColumnAction,
        retry: false,
        mutationKey: RENAME_COLUMN_MUTATION_KEY,
    });
    const pending = usePendingColumnRenames();

    const renameColumn = async ({
        boardId,
        columnId,
        name,
        version,
    }: RenameColumnArgs): Promise<{ didRename: boolean }> => {
        const result = await mutation
            .mutateAsync({ boardId, columnId, name, version })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

        if (result.status !== RESULT_STATUS.SUCCESS) {
            toast.add({ type: "danger", ...(RENAME_FAILURE_COPY[result.status] ?? GENERIC_RENAME_FAILURE) });

            return { didRename: false };
        }

        return { didRename: true };
    };

    return {
        renameColumn,
        isPending: mutation.isPending,
        columns: applyPendingColumnRenames({ columns, pending }),
    };
};
