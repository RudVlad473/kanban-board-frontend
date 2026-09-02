"use client";

// Covered by: `src/features/tasks/components/add-task-button/add-task-button.test.tsx`

import { skipToken, useQuery } from "@tanstack/react-query";
import { isNil } from "es-toolkit";
import { usePathname } from "next/navigation";

import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";
import { toBoardIdFromPath } from "@/lib/core/routing/routes";

/*
 * Only the part of the board entry this reads. Structural rather than the boards feature's own
 * `BoardFull`, which D-18 forbids importing (mirrors `use-move-task.ts`).
 */
type ColumnsOnlyBoard = { columns: { id: string; name: string }[] };

/**
 * The open board's columns, read as a peer of `BoardView` from the entry every column and task
 * write already updates — no provider needed (docs/adr/tech/0030). `skipToken` keeps it a pure
 * cache read: this renders above the board page's `HydrationBoundary`, which fills the entry.
 */
export const useOpenBoardColumns = (): { boardId: string | null; columns: { id: string; name: string }[] } => {
    const boardId = toBoardIdFromPath(usePathname());
    const { data: board } = useQuery<ColumnsOnlyBoard>({
        queryKey: buildBoardQueryKey(boardId ?? ""),
        queryFn: skipToken,
    });

    /*
     * `[]` on the no-board route by construction, never whatever sits under the `["board", ""]`
     * key this must still subscribe to — a hook cannot be called conditionally.
     */
    return { boardId, columns: !isNil(boardId) ? (board?.columns ?? []) : [] };
};
