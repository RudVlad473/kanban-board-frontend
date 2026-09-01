// Covered by: `e2e/boards-detail.e2e.spec.ts`
import "server-only";

import { QueryClient, dehydrate } from "@tanstack/react-query";
import { cache } from "react";

import { fetchBoardFull } from "@/features/boards/server/fetch-board-full";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

/**
 * The open board's read, handed to the client as a dehydrated cache entry rather than props.
 *
 * A failed read seeds nothing, so the query can fetch instead of caching a board that never loaded.
 */
export const dehydrateBoard = cache(async ({ boardId }: { boardId: string }) => {
    const result = await fetchBoardFull({ boardId });
    const queryClient = new QueryClient();

    if (result.status === RESULT_STATUS.SUCCESS) {
        queryClient.setQueryData(buildBoardQueryKey(boardId), result.board);
    }

    return { state: dehydrate(queryClient), result };
});
