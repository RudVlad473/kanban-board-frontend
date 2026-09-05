// Covered by: `src/components/layout/board-view/board-view.test.tsx`

/**
 * The mutation-cache keys, declared once `as const` so the hook that TAGS a mutation and the hook
 * that SEARCHES for it share one literal — every create is tagged so `useUnconfirmedIds` can read
 * back which entities on screen the server has not acknowledged yet.
 */
export const MUTATION_KEY = {
    CREATE_BOARD: ["create-board"],
    CREATE_COLUMN: ["create-column"],
    CREATE_TASK: ["create-task"],
    CREATE_SUBTASK: ["create-subtask"],
} as const satisfies Record<string, readonly unknown[]>;
