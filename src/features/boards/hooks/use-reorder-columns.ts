"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { useToast } from "@/components/ui/toast/use-toast";
import { reorderColumnAction } from "@/features/boards/actions/reorder-column-action";
import { reorderColumns } from "@/features/boards/column-drag-model";
import { applyColumnOrderOverride, toReorderTargetPosition, type ColumnOrderOverride } from "@/features/boards/model";
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
 * COLUMN-03's optimistic reorder (U-05). The override is an ORDER rather than a field, but it is
 * retired by the same pure derivation the rename override uses, kept in `model.ts`. No query cache
 * to patch: column reads are RSC props (docs/adr/tech/0019).
 */
export const useReorderColumns = ({ columns }: { columns: ColumnFull[] }) => {
    const toast = useToast();
    const [override, setOverride] = useState<ColumnOrderOverride | null>(null);
    const [movedColumnId, setMovedColumnId] = useState<string | null>(null);
    const mutation = useMutation({ mutationFn: reorderColumnAction, retry: false });

    const renderedColumns = applyColumnOrderOverride({ columns, override });

    /*
     * The helper hands back the props array ITSELF once the server's own order has moved on, so
     * reference equality is the retirement signal — nothing has to clear this.
     */
    const isOverrideApplied = renderedColumns !== columns;

    /*
     * T-03-31: the moved column's version IS bumped (03-BACKEND-FACTS § R2), so its own rename and
     * delete stay locked until the refreshed props land. R2 also observed that merely SHIFTED
     * columns keep a valid version, which is what lets this stop at the one column that moved.
     */
    const reorderingColumnId = mutation.isPending || isOverrideApplied ? movedColumnId : null;

    const requestReorder = async ({
        boardId,
        fromIndex,
        toIndex,
    }: ReorderColumnsArgs): Promise<{ didReorder: boolean }> => {
        const movedColumn = renderedColumns.at(fromIndex);
        if (movedColumn === undefined || fromIndex === toIndex) {
            return { didReorder: false };
        }

        /*
         * `previousOrder` is the SERVER's order, never the rendered one — that is what the override
         * compares itself against to know it has been superseded.
         */
        setOverride({
            previousOrder: columns.map((column) => column.id),
            order: reorderColumns({ columns: renderedColumns, fromIndex, toIndex }).map((column) => column.id),
        });
        setMovedColumnId(movedColumn.id);

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
            /*
             * Dropping the override restores the WHOLE board's order, not just the dragged column:
             * the move shifted every column between the two indices, and the raw props still carry
             * the order all of them came in with.
             */
            setOverride(null);
            setMovedColumnId(null);
            toast.add({ type: "danger", ...(REORDER_FAILURE_COPY[result.status] ?? GENERIC_REORDER_FAILURE) });

            return { didReorder: false };
        }

        // Left in place on success: it retires itself once the refreshed props carry the new order.
        return { didReorder: true };
    };

    return {
        reorderColumns: requestReorder,
        isPending: mutation.isPending,
        columns: renderedColumns,
        reorderingColumnId,
    };
};
