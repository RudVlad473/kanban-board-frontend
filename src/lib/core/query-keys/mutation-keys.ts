// Covered by: `src/components/layout/board-view/board-view.test.tsx`

/**
 * The mutation-cache keys, declared once `as const` so the hook that TAGS a mutation and the hook
 * that SEARCHES for it share one literal. Add an entry only for a mutation something reads back
 * via `findAll`; core ring, not `features/`, for the same reason as `board-query-key.ts`.
 */
export const MUTATION_KEY = {
    CREATE_COLUMN: ["create-column"],
} as const satisfies Record<string, readonly unknown[]>;
