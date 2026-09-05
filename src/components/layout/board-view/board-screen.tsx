"use client";

// Covered by: `e2e/boards-switch.e2e.spec.ts`

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isNil } from "es-toolkit";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { BoardViewSkeleton } from "@/features/boards/components/board-view-skeleton/board-view-skeleton";
import { createBoardQueryOptions } from "@/features/boards/queries/board-query";
import type { BoardFull } from "@/features/boards/schemas";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";
import { toBoardIdFromPath } from "@/lib/core/routing/routes";

import { BoardView } from "./board-view";

type Props = {
    /**
     * The board the SERVER read for the URL this page was loaded at, or null when it could not be
     * read. Used for the first render only — see the note on `initialData` below.
     */
    initialBoard: BoardFull | null;
};

// comment-length-exempt: records why the board area is mounted in the layout rather than the page, the two Next behaviours that make any page-owned alternative blank the screen on every switch, and the boundary reason it is filed in this folder
/**
 * The board area, driven by the URL rather than by a page's props.
 *
 * Mounted by the dashboard layout, which Next does NOT re-render when only the `[boardId]` segment
 * changes — so this component survives a board switch and can paint the next board out of the
 * `["board", id]` cache entry the moment the URL changes, with no server round trip in the way.
 * The page cannot do that: its own render is what the browser is waiting for, so a board delivered
 * as a page prop is a board the user waits for, which is the skeleton the recording shows.
 *
 * Filed beside `BoardView` rather than in a folder of its own because the boundaries policy has no
 * `layout -> layout` rule: a sibling layout element cannot import one, and these two are one unit.
 *
 * `usePathname` rather than `useParams` — a layout above `[boardId]` is handed no params at all
 * (`use-open-board-columns.ts` reads the open board the same way).
 */
export const BoardScreen = ({ initialBoard }: Props) => {
    const boardId = toBoardIdFromPath(usePathname());
    const queryClient = useQueryClient();
    /*
     * `initialBoard` is used ONLY while it still describes the board in the URL. Because the layout
     * does not re-render on a switch, this prop keeps naming the board the page was first loaded
     * at; without the id guard it would seed every later board's entry with that first board.
     */
    const seedBoard = !isNil(initialBoard) && initialBoard.id === boardId ? initialBoard : undefined;
    // comment-length-exempt: records the measured SSR failure that makes `initialData` load-bearing here, which is invisible from this file alone
    /*
     * The canonical observer for the shared entry. `initialData` is what makes the SERVER render
     * real markup: `HydrationBoundary` hydrates in an effect, so during SSR the cache is still
     * empty and a cache-only read here would server-render the skeleton and then mismatch on
     * hydration (measured 2026-09-05). The fetcher itself comes from the key's own defaults.
     */
    const { data: board, isError } = useQuery({
        ...createBoardQueryOptions({ boardId: boardId ?? "" }),
        initialData: seedBoard,
        enabled: !isNil(boardId),
    });

    /* Seeded with the board this mounted at, so the effect below fires on a SWITCH and never on load. */
    const lastRevalidatedBoardId = useRef(boardId);

    // comment-length-exempt: records why revalidation is triggered by the navigation rather than by a staleness timer, and the measured interaction failure the timer version caused
    /*
     * BOARD-04's second half: the switch itself asks for the fresh read, once.
     *
     * Deliberately NOT `staleTime: 0` on the entry, which was the first attempt. That made the
     * board stale for EVERY observer, so each hook mounting a new one — opening the task detail
     * modal, for instance — triggered its own refetch, and the landing response re-rendered the
     * open modal and detached the input the user was typing into. Measured 2026-09-05: it broke
     * `subtasks` and both `tasks-conflict` specs. Keying it to the navigation instead means one
     * read per switch and none at all while the user is working on a board.
     */
    useEffect(() => {
        if (lastRevalidatedBoardId.current === boardId || isNil(boardId)) {
            return;
        }

        lastRevalidatedBoardId.current = boardId;
        void queryClient.invalidateQueries({ queryKey: buildBoardQueryKey(boardId), exact: true });
    }, [boardId, queryClient]);

    if (isNil(boardId)) {
        return null;
    }

    /* The read failed and nothing was ever loaded for this board — the same copy the page used to show. */
    if (isNil(board) && isError) {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center bg-bg-app p-6">
                <p className="text-center font-body-l text-body-l text-text-muted">
                    Couldn&apos;t load this board. Try again.
                </p>
            </div>
        );
    }

    /* Only a board this session has never loaded reaches the skeleton — a switch never does. */
    if (isNil(board)) {
        return <BoardViewSkeleton />;
    }

    /* Keyed on the board id: a new board is a new view, so the row starts at the beginning and board-scoped modal state does not follow the user across. */
    return <BoardView key={board.id} board={board} />;
};
