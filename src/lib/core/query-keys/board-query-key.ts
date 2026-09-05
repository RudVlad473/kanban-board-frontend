// Covered by: `src/components/layout/board-view/board-view.test.tsx`

/**
 * The key of the one cache entry every column and task write updates.
 *
 * Here, not in `features/boards/`: both features write that entry, and the server reads it too
 * (docs/adr/tech/0030).
 */
export const buildBoardQueryKey = (boardId: string): readonly unknown[] => ["board", boardId];

/**
 * The key family every board entry lives under — what `setQueryDefaults` is registered against, so
 * the entry's fetcher belongs to the KEY rather than to whichever observer mounted last.
 */
export const BOARD_QUERY_KEY_PREFIX = ["board"] as const;
