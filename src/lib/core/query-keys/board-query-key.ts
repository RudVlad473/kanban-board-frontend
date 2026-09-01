// Covered by: `src/components/layout/board-view/board-view.test.tsx`

/**
 * The key of the one cache entry every column and task write updates.
 *
 * Here, not in `features/boards/`: both features write that entry, and the server reads it too
 * (docs/adr/tech/0030).
 */
export const buildBoardQueryKey = (boardId: string): readonly unknown[] => ["board", boardId];
