// Covered by: `src/components/layout/board-view/board-view.test.tsx`, `src/features/boards/components/board-list/board-list.test.tsx`

// comment-length-exempt: records the measurement that makes this handoff necessary, the two component trees it bridges, and why a module Map rather than Context or React state, none of which is readable from the code alone
/**
 * A one-shot handoff between `useCreateBoard.createBoard` (which knows the typed column names the
 * instant the board resolves, inside the sidebar's own component tree) and
 * `useRunPendingColumnFanOut` (which runs them once the new board has actually mounted, inside a
 * completely different branch of the tree — `BoardView`, reached only after a route change).
 *
 * Measured live (260907-exb Task 1): dispatching the columns fan-out's Server Action concurrently
 * with `router.push()`'s own pending transition stalls the WHOLE navigation — no URL change, no
 * skeleton, nothing paints — until the fan-out (and the `router.refresh()` chained after it) also
 * settle. `createBoard()` must therefore hand the claim off and return immediately, never call the
 * fan-out itself.
 *
 * A plain module-scope Map, not a Context or React state: the write and the read happen in two
 * components with no ancestor/descendant relationship, and neither side needs to RE-RENDER on the
 * other's write — only to observe it once, at the reader's own mount.
 */
const pendingColumnFanOuts = new Map<string, { names: string[]; clientIds: string[] }>();

export const claimPendingColumnFanOut = ({
    boardId,
    names,
    clientIds,
}: {
    boardId: string;
    names: string[];
    clientIds: string[];
}): void => {
    pendingColumnFanOuts.set(boardId, { names, clientIds });
};

/** Removes and returns the claim for `boardId` — destructive, so a re-mount or a second reader can never re-run the same fan-out twice. */
export const takePendingColumnFanOut = (boardId: string): { names: string[]; clientIds: string[] } | undefined => {
    const claim = pendingColumnFanOuts.get(boardId);
    pendingColumnFanOuts.delete(boardId);
    return claim;
};
