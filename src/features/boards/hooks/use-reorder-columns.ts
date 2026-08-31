"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation } from "@tanstack/react-query";
import { startTransition, useOptimistic } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { reorderColumnAction } from "@/features/boards/actions/reorder-column-action";
import { reorderColumns } from "@/features/boards/column-drag-model";
import { toReorderTargetPosition } from "@/features/boards/model";
import type { ColumnFull } from "@/features/boards/schemas";
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

/**
 * COLUMN-03's optimistic reorder (U-05). `useOptimistic` owns the pending order: no query cache to
 * patch, since column reads are RSC props (docs/adr/tech/0019), and no staleness to track, since
 * the pending order lives exactly as long as the write does.
 */
export const useReorderColumns = ({ columns }: { columns: ColumnFull[] }) => {
    const toast = useToast();
    const [optimisticColumns, applyOptimisticReorder] = useOptimistic(
        columns,
        (current: ColumnFull[], move: { fromIndex: number; toIndex: number }) =>
            reorderColumns({ columns: current, ...move }),
    );
    /*
     * T-03-31: the moved column's version IS bumped (03-BACKEND-FACTS § R2), so its own rename and
     * delete stay locked until the write settles. R2 also observed that merely SHIFTED columns keep
     * a valid version, which is what lets this stop at the one column that moved.
     */
    const [reorderingColumnId, markColumnReordering] = useOptimistic<string | null, string>(
        null,
        (_current, columnId) => columnId,
    );
    const mutation = useMutation({ mutationFn: reorderColumnAction, retry: false });

    const requestReorder = ({ boardId, fromIndex, toIndex }: ReorderColumnsArgs): void => {
        const movedColumn = optimisticColumns.at(fromIndex);

        if (movedColumn === undefined || fromIndex === toIndex) {
            return;
        }

        /*
         * One action, so dropping the optimistic order restores the WHOLE board's: the move shifted
         * every column between the two indices, and the props still carry the order all of them had.
         */
        startTransition(async () => {
            applyOptimisticReorder({ fromIndex, toIndex });
            markColumnReordering(movedColumn.id);

            // Exactly one request per completed move — intermediate arrow steps never reach here (T-03-12).
            const result = await mutation
                .mutateAsync({
                    boardId,
                    columnId: movedColumn.id,
                    version: movedColumn.version,
                    targetPosition: toReorderTargetPosition({ toIndex }),
                })
                .catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

            if (result.status !== RESULT_STATUS.SUCCESS) {
                toast.add({ type: "danger", ...(REORDER_FAILURE_COPY[result.status] ?? GENERIC_REORDER_FAILURE) });
            }
        });
    };

    return {
        reorderColumns: requestReorder,
        isPending: mutation.isPending,
        columns: optimisticColumns,
        reorderingColumnId,
    };
};
