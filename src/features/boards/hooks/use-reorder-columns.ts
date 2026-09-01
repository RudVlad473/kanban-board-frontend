"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation } from "@tanstack/react-query";

import { useToast } from "@/components/ui/toast/use-toast";
import { reorderColumnAction } from "@/features/boards/actions/reorder-column-action";
import { reorderColumns } from "@/features/boards/column-drag-model";
import { toReorderTargetPosition } from "@/features/boards/model";
import type { ColumnFull } from "@/features/boards/schemas";
import { useOptimisticVariables } from "@/lib/client/optimistic-mutation";
import { RESULT_STATUS, type ResultStatus } from "@/lib/core/api-contract/result-status";

/*
 * Authored copy only — the action returns bare discriminants, so nothing the backend said can
 * reach these strings (03-UI-SPEC Copywriting Contract, T-03-33).
 */
const GENERIC_REORDER_FAILURE = { title: "Couldn't reorder columns.", description: "Try again." };

/*
 * `CONFLICT` earns its own entry for the same reason the rename table gives it one: 03-BACKEND-FACTS
 * § R3 observed a stale reorder returns `OPTIMISTIC_LOCK_CONFLICT`, and retrying the same stale
 * version fails identically, so generic retry copy would loop the user.
 */
const REORDER_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    [RESULT_STATUS.CONFLICT]: {
        title: "This board changed somewhere else.",
        description: "Refresh to see the latest.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to reorder this board's columns.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That column is no longer available.",
        description: "Refresh to see this board's current columns.",
    },
};

export type ReorderColumnsArgs = { boardId: string; fromIndex: number; toIndex: number };

/** What `reorderColumnAction` is called with, and therefore what the optimistic order is read from. */
type ReorderColumnVariables = { boardId: string; columnId: string; version: number; targetPosition: number };

/** Names this mutation so its in-flight variables can be read back as the optimistic order. */
export const REORDER_COLUMN_MUTATION_KEY = ["reorderColumn"] as const;

/** The variables of every column reorder still in flight, oldest first — fold order matters. */
export const usePendingColumnReorders = (): ReorderColumnVariables[] =>
    useOptimisticVariables<ReorderColumnVariables>(REORDER_COLUMN_MUTATION_KEY);

/**
 * Return `columns` with every pending reorder applied in submission order, each move reading the
 * index the one before it produced. `toReorderTargetPosition` is identity, so `targetPosition` is
 * the destination index directly.
 */
export const applyPendingColumnReorders = ({
    columns,
    pending,
}: {
    columns: ColumnFull[];
    pending: ReorderColumnVariables[];
}): ColumnFull[] =>
    pending.reduce((current, { columnId, version, targetPosition }) => {
        // The version guard is the retirement: a landed `refresh()` bumps it and this stops matching.
        const fromIndex = current.findIndex((column) => column.id === columnId && column.version === version);

        return fromIndex === -1 ? current : reorderColumns({ columns: current, fromIndex, toIndex: targetPosition });
    }, columns);

/**
 * COLUMN-03's optimistic reorder (U-05), folded from the mutations' own variables rather than a
 * cache entry — column reads are RSC props (docs/adr/tech/0019, and tech/0029 for the mechanism).
 */
export const useReorderColumns = ({ columns }: { columns: ColumnFull[] }) => {
    const toast = useToast();
    const mutation = useMutation({
        mutationFn: reorderColumnAction,
        retry: false,
        mutationKey: REORDER_COLUMN_MUTATION_KEY,
    });
    const pending = usePendingColumnReorders();
    const optimisticColumns = applyPendingColumnReorders({ columns, pending });

    const requestReorder = ({ boardId, fromIndex, toIndex }: ReorderColumnsArgs): void => {
        const movedColumn = optimisticColumns.at(fromIndex);

        if (movedColumn === undefined || fromIndex === toIndex) {
            return;
        }

        // Exactly one request per completed move — intermediate arrow steps never reach here (T-03-12).
        void mutation
            .mutateAsync({
                boardId,
                columnId: movedColumn.id,
                version: movedColumn.version,
                targetPosition: toReorderTargetPosition({ toIndex }),
            })
            .catch(() => ({ status: RESULT_STATUS.ERROR }) as const)
            .then((result) => {
                if (result.status !== RESULT_STATUS.SUCCESS) {
                    toast.add({ type: "danger", ...(REORDER_FAILURE_COPY[result.status] ?? GENERIC_REORDER_FAILURE) });
                }
            });
    };

    return {
        reorderColumns: requestReorder,
        isPending: mutation.isPending,
        columns: optimisticColumns,
        /*
         * T-03-31: the moved column's version IS bumped (03-BACKEND-FACTS § R2), so its own rename
         * and delete stay locked until the write settles. R2 also observed merely SHIFTED columns
         * keep a valid version, which is what lets this stop at the one column that moved.
         */
        reorderingColumnId: mutation.isPending ? mutation.variables.columnId : null,
    };
};
