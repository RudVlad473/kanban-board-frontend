// Covered by: `src/components/layout/board-view/board-view.test.tsx`, `src/features/boards/components/board-list/board-list.test.tsx`

/**
 * One board's typed column names, handed from the create to the board about to mount.
 * `boardCreated` resolves to whether the board itself landed — the fan-out's dispatch waits on it,
 * because the backend answers `404 ENTITY_NOT_FOUND` for a column on a board it has never seen.
 */
type PendingColumnFanOut = {
    names: string[];
    clientIds: string[];
    /** Picked by the create, not by the fan-out: both stage the same placeholders, and two independent picks would repaint every header dot. */
    colors: string[];
    boardCreated: Promise<boolean>;
};

// comment-length-exempt: records the two component trees this handoff bridges and why a module Map rather than Context or React state, neither of which is readable from the code alone
/*
 * A one-shot handoff between `useCreateBoard.createBoard` (which knows the typed column names the
 * instant the user submits, inside the sidebar's own component tree) and
 * `useRunPendingColumnFanOut` (which runs them once the new board has actually mounted, inside a
 * completely different branch of the tree — `BoardView`, reached only after the URL moves).
 *
 * The handoff survives the removal of the `router.push` it was first built around (260907-exb
 * measured that a fan-out dispatched concurrently with that push stalled the whole navigation).
 * What keeps it is the OTHER half: the columns must be staged into the `["board", id]` entry at the
 * mount that first subscribes to it, which is the earliest point anything can observe them.
 *
 * A plain module-scope Map, not a Context or React state: the write and the read happen in two
 * components with no ancestor/descendant relationship, and neither side needs to RE-RENDER on the
 * other's write — only to observe it once, at the reader's own mount.
 */
const pendingColumnFanOuts = new Map<string, PendingColumnFanOut>();

export const claimPendingColumnFanOut = ({
    boardId,
    names,
    clientIds,
    colors,
    boardCreated,
}: PendingColumnFanOut & { boardId: string }): void => {
    pendingColumnFanOuts.set(boardId, { names, clientIds, colors, boardCreated });
};

/** Removes and returns the claim for `boardId` — destructive, so a re-mount or a second reader can never re-run the same fan-out twice. */
export const takePendingColumnFanOut = (boardId: string): PendingColumnFanOut | undefined => {
    const claim = pendingColumnFanOuts.get(boardId);
    pendingColumnFanOuts.delete(boardId);
    return claim;
};
