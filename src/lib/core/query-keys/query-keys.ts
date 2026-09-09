// Covered by: `src/lib/core/query-keys/board-query-key.unit.test.ts`

/**
 * The query-cache keys, declared once `as const` so every reader and writer of a cache entry
 * shares one literal — mirrors `mutation-keys.ts`'s own pattern for the mutation cache.
 */
export const QUERY_KEY = {
    /** The one entry the sidebar and the header both read, which is what keeps them in step. */
    BOARDS: ["boards"],

    /**
     * The key family every board entry lives under — what `setQueryDefaults` is registered
     * against, so the entry's fetcher belongs to the KEY rather than to whichever observer
     * mounted last.
     */
    BOARD: ["board"],
} as const satisfies Record<string, readonly unknown[]>;
