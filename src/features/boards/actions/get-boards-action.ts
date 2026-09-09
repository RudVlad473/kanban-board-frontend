"use server";

// Covered by: `src/features/boards/components/board-list/board-list.test.tsx`

import { fetchBoards, type FetchBoardsResult } from "@/features/boards/server/fetch-boards";

/**
 * The client-callable face of `fetchBoards()`, so the board list can be a TanStack Query `queryFn`
 * without a Route Handler (docs/adr/tech/0019). Adds no logic: session check and discriminant stay.
 */
export const getBoardsAction = async (): Promise<FetchBoardsResult> => fetchBoards();
