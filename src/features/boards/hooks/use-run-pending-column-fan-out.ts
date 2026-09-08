"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`, `e2e/boards-create.e2e.spec.ts`

import { isNil } from "es-toolkit";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCreateBoardColumns } from "@/features/boards/hooks/use-create-board-columns";
import { takePendingColumnFanOut } from "@/features/boards/pending-column-fan-out";

// comment-length-exempt: records what the mount-time trigger buys now that the navigation it was built around is gone, and what a plain `useEffect` misses if simplified — none of which the body carries on its own
/**
 * Runs BOARD-02's column fan-out once, the instant `BoardView` mounts for the board it targets —
 * never from `createBoard()`'s own fire-and-forget call.
 *
 * The measured `router.push` transition stall this deferral was first built for (260907-exb Task 1)
 * no longer applies: there is no `router.push` on the create path any more. What still holds is that
 * the DISPATCH belongs after the mount — `useCreateBoard` stages the placeholders itself, before the
 * URL moves, so this effect owns only the request and the reconciliation that follows it.
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

        void createColumns({
            boardId,
            names: claim.names,
            ownedClientIds: claim.clientIds,
            colors: claim.colors,
            boardCreated: claim.boardCreated,
        }).then((outcome) => {
            // comment-length-exempt: records the two things this branch must NOT do and why, neither of which the early return states
            /*
             * The board itself never landed, so this fan-out has nothing to report: its own toast
             * would be a SECOND toast for one failure, and its `refresh()` would re-render the path
             * `createBoard` is at that moment rolling the user back FROM — whose board id the
             * membership guard would then bounce them off anyway.
             */
            if (!outcome.boardLanded) {
                return;
            }

            /*
             * The action's own `refresh()` alone never reaches a PREFETCHED route (docs/adr/tech/0030
             * rule 4) — this one is ordered after the columns, on whatever board is now open.
             */
            router.refresh();

            if (outcome.failedNames.length > 0) {
                raiseColumnFailureToast({ boardId, failedNames: outcome.failedNames });
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `boardId` alone: `hasRun` makes this a true one-shot per mount, and re-running on a hook-identity change would re-claim a board this effect already resolved
    }, [boardId]);
};
