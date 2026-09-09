import { QueryClient, QueryObserver, skipToken } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

// comment-length-exempt: records the library mechanism this guards and the exact substitution that breaks it, which is invisible from any single hook's own file
/*
 * Several hooks subscribe to the ONE `["board", boardId]` entry, and only `board-query.ts` declares
 * its fetcher. Every observer's `queryFn` is stored on the shared query, so the last one mounted
 * wins — which makes "a reader must declare no fetcher" a property of the entry, not of any one
 * hook, and leaves it testable nowhere else.
 *
 * `skipToken` is the trap: it reads as "this observer does not fetch", but it is truthy, so
 * query-core's borrow-from-another-observer fallback (`if (!this.options.queryFn)`) never fires and
 * a refetch parks the shared entry in `error: Missing queryFn`. Measured on query-core 5.101.4.
 */
const BOARD_KEY = buildBoardQueryKey("b1");
const SERVER_BOARD = { id: "b1", name: "From the server", columns: [] };

/** A reader's own partial view of the board — no `id`, no `name`, which `BoardView` both read. */
const READER_VIEW = { columns: [] };

const createSharedEntry = async (readerOptions: Record<string, unknown>) => {
    /* `retry: false` so the failing case settles: the default backoff outlives the test timeout. */
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const canonical = new QueryObserver(client, {
        queryKey: BOARD_KEY,
        queryFn: () => Promise.resolve(SERVER_BOARD),
        staleTime: Infinity,
    });
    const unsubscribeCanonical = canonical.subscribe(() => undefined);

    /* Mounted AFTER the canonical one, which is the order that decides who owns the fetcher. */
    const reader = new QueryObserver(client, {
        queryKey: BOARD_KEY,
        initialData: READER_VIEW,
        staleTime: Infinity,
        ...readerOptions,
    });
    const unsubscribeReader = reader.subscribe(() => undefined);

    await client.refetchQueries({ queryKey: BOARD_KEY });
    const state = client.getQueryState(BOARD_KEY);
    unsubscribeCanonical();
    unsubscribeReader();

    return state;
};

describe("the shared board entry's fetcher", () => {
    it("reaches the canonical fetcher when a reader declares none", async () => {
        // Act
        const state = await createSharedEntry({});

        // Assert — the whole board, from the observer that owns the read.
        expect(state?.status).toBe("success");
        expect(state?.data).toEqual(SERVER_BOARD);
    });

    /* The regression: `skipToken` is truthy, so the fallback is skipped and the entry cannot refetch. */
    it("cannot refetch at all when a reader declares skipToken instead", async () => {
        // Act
        const state = await createSharedEntry({ queryFn: skipToken });

        // Assert — parked in error, still holding the reader's partial view.
        expect(state?.status).toBe("error");
        expect(state?.data).toEqual(READER_VIEW);
    });
});
