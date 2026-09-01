// Covered by: `e2e/boards-list.e2e.spec.ts`
import "server-only";

import { QueryClient, dehydrate } from "@tanstack/react-query";
import { cache } from "react";

import { BOARDS_QUERY_KEY } from "@/features/boards/queries/boards-query";
import { fetchBoards } from "@/features/boards/server/fetch-boards";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";

/**
 * The board list read, handed to the client as a dehydrated cache entry rather than props.
 *
 * A failed read seeds nothing: an entry holding `[]` would read as "no boards" and never correct.
 */
export const dehydrateBoards = cache(async () => {
    const result = await fetchBoards();
    const loadFailed = result.status !== RESULT_STATUS.SUCCESS;
    const boards = result.status === RESULT_STATUS.SUCCESS ? result.boards : [];
    const queryClient = new QueryClient();

    if (!loadFailed) {
        queryClient.setQueryData(BOARDS_QUERY_KEY, boards);
    }

    return { state: dehydrate(queryClient), boards, loadFailed };
});
