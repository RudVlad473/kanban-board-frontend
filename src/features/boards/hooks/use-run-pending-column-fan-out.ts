"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`, `e2e/boards-create.e2e.spec.ts`

import { isNil } from "es-toolkit";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCreateBoardColumns } from "@/features/boards/hooks/use-create-board-columns";
import { takePendingColumnFanOut } from "@/features/boards/pending-column-fan-out";

// comment-length-exempt: records the measurement that makes a mount-time trigger necessary, why the effect self-guards, and what a plain `useEffect` misses if simplified — none of which the six-line body carries on its own
/**
 * Runs BOARD-02's column fan-out once, the instant `BoardView` mounts for the board it targets —
 * never from `createBoard()`'s own fire-and-forget call.
 *
 * Measured live (260907-exb Task 1): dispatching the fan-out's Server Action concurrently with
 * `router.push()`'s own pending transition stalls the WHOLE navigation — no URL change, no skeleton,
 * nothing paints — until the fan-out (and the `router.refresh()` chained after it) also settle.
 * Deferring the dispatch to this mount effect lets `router.push` commit on its own, and by the time
 * this effect runs, `BoardView` is already subscribed to the `["board", boardId]` entry
 * `useCreateBoardColumns`' `onMutate` stages into — the earliest point anything could observe the
 * optimistic write at all.
 *
 * `takePendingColumnFanOut` is destructive (deletes on read), which is what makes a Strict-Mode
 * double-invoke of this effect harmless without an extra guard beyond the `hasRun` ref: a second
 * call finds nothing left to claim. The ref itself only prevents a redundant lookup, not a double-fire.
 */
export const useRunPendingColumnFanOut = ({ boardId }: { boardId: string }): void => {
    const router = useRouter();
    const { createColumns, raiseColumnFailureToast } = useCreateBoardColumns();
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) {
            return;
        }

        hasRun.current = true;
        const claim = takePendingColumnFanOut(boardId);

        if (isNil(claim)) {
            return;
        }

        void createColumns({ boardId, names: claim.names, ownedClientIds: claim.clientIds }).then((failedNames) => {
            /*
             * The action's own `refresh()` alone never reaches a PREFETCHED route (docs/adr/tech/0030
             * rule 4) — this one is ordered after the columns, on whatever board is now open.
             */
            router.refresh();

            if (failedNames.length > 0) {
                raiseColumnFailureToast({ boardId, failedNames });
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `boardId` alone: `hasRun` makes this a true one-shot per mount, and re-running on a hook-identity change would re-claim a board this effect already resolved
    }, [boardId]);
};
