"use client";

// Covered by: `e2e/boards-switch.e2e.spec.ts`

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { createBoardQueryOptions } from "@/features/boards/queries/board-query";
import type { Board } from "@/features/boards/schemas";
import { useUnconfirmedIds } from "@/lib/client/use-unconfirmed-ids";
import { MUTATION_KEY } from "@/lib/core/query-keys/mutation-keys";

/*
 * The window in which an already-loaded board is not loaded a second time. It bounds THIS hook
 * only — the board being displayed still revalidates on every switch (`board-query.ts` sets
 * `staleTime: 0`), so a stale entry is corrected the moment it is shown, not on this timer.
 */
const PREFETCH_STALE_TIME_MS = 5 * 60 * 1000;

// comment-length-exempt: records what this buys, the cost it deliberately pays for it, and the one id class it must skip — a reader would otherwise "simplify" the filter away and 404 every optimistic board
/**
 * Load every board's contents in the background, so switching to one has something to paint.
 *
 * BOARD-04's first half: without this, the first visit to a board has nothing cached and the user
 * waits for the read exactly as before. It costs one upstream call per board, issued once after
 * the list arrives — deliberate, and the reason the window above exists rather than no window.
 *
 * A board still being created is skipped: its id is a client-generated placeholder that names
 * nothing upstream until the create settles (see `useUnconfirmedIds`), and prefetching it would
 * spend a request on a guaranteed 404 — its own `onSuccess` writes the real board in anyway.
 */
export const usePrefetchAllBoards = ({ boards }: { boards: Board[] }): void => {
    const queryClient = useQueryClient();
    const unconfirmedBoardIds = useUnconfirmedIds({ mutationKey: MUTATION_KEY.CREATE_BOARD });

    useEffect(() => {
        for (const board of boards) {
            if (unconfirmedBoardIds.has(board.id)) {
                continue;
            }

            /*
             * `prefetchQuery`, not `fetchQuery`: it resolves to nothing and swallows a rejection,
             * so one unreachable board cannot surface an error for a board nobody asked to see.
             */
            void queryClient.prefetchQuery({
                ...createBoardQueryOptions({ boardId: board.id }),
                staleTime: PREFETCH_STALE_TIME_MS,
            });
        }
    }, [boards, queryClient, unconfirmedBoardIds]);
};
