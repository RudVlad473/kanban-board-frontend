"use client";

// Covered by: `src/components/layout/board-view/board-view.test.tsx`

import { queryOptions } from "@tanstack/react-query";

import { getBoardAction } from "@/features/boards/actions/get-board-action";
import type { BoardFull } from "@/features/boards/schemas";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";

/** One board's read, taking the id as an argument so the fetcher can be keyed rather than closed over. */
const fetchBoard = async (boardId: string): Promise<BoardFull> => {
    const result = await getBoardAction({ boardId });

    // A refetch that cannot authenticate must reject, not resolve to an empty board.
    if (result.status !== RESULT_STATUS.SUCCESS) {
        throw new Error(result.status);
    }

    return result.board;
};

// comment-length-exempt: records the measured defect this placement fixes, and separately the staleness reversal and the two settings that keep it from undoing an optimistic write — three things a reader could each undo on its own
/**
 * What every `["board", id]` entry fetches and how stale it is, registered against the KEY FAMILY
 * by `BoardQueryDefaults` rather than carried by whichever observer happened to mount last.
 *
 * That placement fixes a real defect, not a style point. Several hooks subscribe to this one shared
 * entry and deliberately declare no `queryFn`, relying on query-core's "borrow one from another
 * observer" fallback. When no observer carrying a fetcher is mounted at the moment a fetch starts,
 * the entry parks in `No queryFn was passed` and can never revalidate again — measured 2026-09-05
 * on query-core 5.101.4, four such errors on a plain board load, on code predating BOARD-04. A
 * default registered on the key cannot go missing, so no reader has to avoid declaring one.
 *
 * `staleTime: Infinity` and both incidental refetch triggers off, so NOTHING refetches this entry
 * on its own: the server decides when it is stale, each mutation writes its own result back
 * (docs/adr/tech/0030), and a board switch asks for its one read explicitly in `BoardScreen`. A
 * staleness timer here instead refetched on every observer that mounted — opening the task detail
 * modal re-read the board and detached the input being typed into (measured 2026-09-05).
 */
export const BOARD_QUERY_DEFAULTS = {
    queryFn: ({ queryKey }: { queryKey: readonly unknown[] }): Promise<BoardFull> => {
        const [, boardId] = queryKey;

        if (typeof boardId !== "string") {
            throw new TypeError(`board query key carries no id: ${JSON.stringify(queryKey)}`);
        }

        return fetchBoard(boardId);
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
};

/** The canonical observer's options — the same fetcher the key defaults carry, named explicitly. */
export const createBoardQueryOptions = ({ boardId }: { boardId: string }) =>
    queryOptions({
        queryKey: buildBoardQueryKey(boardId),
        queryFn: (): Promise<BoardFull> => fetchBoard(boardId),
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
