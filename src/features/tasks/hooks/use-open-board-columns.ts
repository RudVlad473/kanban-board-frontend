"use client";

// Covered by: `src/features/tasks/components/add-task-button/add-task-button.test.tsx`

import { useQuery } from "@tanstack/react-query";
import { isNil } from "es-toolkit";
import { usePathname } from "next/navigation";

import { useUnconfirmedIds } from "@/lib/client/use-unconfirmed-ids";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";
import { MUTATION_KEY } from "@/lib/core/query-keys/mutation-keys";
import { toBoardIdFromPath } from "@/lib/core/routing/routes";

/*
 * Only the part of the board entry this reads. Structural rather than the boards feature's own
 * `BoardFull`, which D-18 forbids importing (mirrors `use-move-task.ts`).
 */
type ColumnsOnlyBoard = { columns: { id: string; name: string }[] };

/**
 * The open board's columns, read as a peer of `BoardView` from the entry every column and task
 * write already updates — no provider needed (docs/adr/tech/0030). Declaring no fetcher keeps it a pure
 * cache read: this renders above the board page's `HydrationBoundary`, which fills the entry.
 */
export const useOpenBoardColumns = (): {
    boardId: string | null;
    columns: { id: string; name: string }[] | undefined;
} => {
    const boardId = toBoardIdFromPath(usePathname());
    /* OPT-01: a create posts to the column resource itself, so an unacknowledged column is no target. */
    const unconfirmedColumnIds = useUnconfirmedIds({ mutationKey: MUTATION_KEY.CREATE_COLUMN });
    // comment-length-exempt: records why this observer declares no fetcher and why `skipToken` is not the way to say that, which is the exact substitution that poisons the shared entry
    /*
     * NO `queryFn` at all — this observer only READS the shared board entry, whose fetcher belongs
     * to `board-query.ts`. `skipToken` is truthy, so query-core's "borrow a queryFn from another
     * observer" fallback never fires and any refetch parks the shared query in
     * `error: Missing queryFn`. Omitting it is what keeps the canonical fetcher reachable.
     */
    const { data: board } = useQuery<ColumnsOnlyBoard>({
        queryKey: buildBoardQueryKey(boardId ?? ""),
        /* Never fetches, and unlike `skipToken` declares no fetcher the shared entry could inherit. */
        enabled: false,
    });

    /*
     * `[]` on the no-board route by construction, never whatever sits under the `["board", ""]` key
     * this must still subscribe to. `undefined` for an ABSENT entry, which this renders above the
     * boundary for: collapsing that into `[]` made the server disagree with the hydrated client.
     */
    const columns = board?.columns.filter((column) => !unconfirmedColumnIds.has(column.id));

    return { boardId, columns: !isNil(boardId) ? columns : [] };
};
