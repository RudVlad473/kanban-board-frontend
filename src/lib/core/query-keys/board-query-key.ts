// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { QUERY_KEY } from "@/lib/core/query-keys/query-keys";

/**
 * The key of the one cache entry every column and task write updates.
 *
 * Here, not in `features/boards/`: both features write that entry, and the server reads it too
 * (docs/adr/tech/0030).
 */
export const buildBoardQueryKey = (boardId: string): readonly unknown[] => [...QUERY_KEY.BOARD, boardId];
