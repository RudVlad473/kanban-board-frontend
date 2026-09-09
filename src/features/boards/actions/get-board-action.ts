"use server";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { fetchBoardFull, type FetchBoardFullResult } from "@/features/boards/server/fetch-board-full";

/**
 * The client-callable face of `fetchBoardFull()`, so the open board can be a TanStack Query
 * `queryFn` without a Route Handler (docs/adr/tech/0019). Adds no logic of its own.
 */
export const getBoardAction = async ({ boardId }: { boardId: string }): Promise<FetchBoardFullResult> =>
    fetchBoardFull({ boardId });
