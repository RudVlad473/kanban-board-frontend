"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { queryOptions } from "@tanstack/react-query";

import { getBoardAction } from "@/features/boards/actions/get-board-action";
import type { BoardFull } from "@/features/boards/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/** The one entry every column and task write updates, and the board view reads. */
export const buildBoardQueryKey = (boardId: string): readonly unknown[] => ["board", boardId];

/*
 * `staleTime: Infinity` because the server, not a timer, decides when this is stale: the entry is
 * hydration-fed and each mutation writes its own result back (docs/adr/tech/0029).
 */
export const createBoardQueryOptions = ({ boardId }: { boardId: string }) =>
    queryOptions({
        queryKey: buildBoardQueryKey(boardId),
        queryFn: async (): Promise<BoardFull> => {
            const result = await getBoardAction({ boardId });

            // A refetch that cannot authenticate must reject, not resolve to an empty board.
            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new Error(result.status);
            }

            return result.board;
        },
        staleTime: Infinity,
    });
