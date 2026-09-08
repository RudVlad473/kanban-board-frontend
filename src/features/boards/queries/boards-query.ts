"use client";

// Covered by: `src/features/boards/components/board-list/board-list.test.tsx`

import { queryOptions } from "@tanstack/react-query";

import { getBoardsAction } from "@/features/boards/actions/get-boards-action";
import type { Board } from "@/features/boards/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { QUERY_KEY } from "@/lib/core/query-keys/query-keys";

/*
 * `staleTime: Infinity` because the server, not a timer, decides when this is stale: the entry is
 * hydration-fed and each mutation writes its own result back. `queryFn` covers the one case that
 * leaves no entry — a failed RSC read (docs/adr/tech/0030).
 */
export const createBoardsQueryOptions = () =>
    queryOptions({
        queryKey: QUERY_KEY.BOARDS,
        queryFn: async (): Promise<Board[]> => {
            const result = await getBoardsAction();

            // A refetch that cannot authenticate must reject, not resolve to an empty board list.
            if (result.status !== RESULT_STATUS.SUCCESS) {
                throw new Error(result.status);
            }

            return result.boards;
        },
        staleTime: Infinity,
    });
