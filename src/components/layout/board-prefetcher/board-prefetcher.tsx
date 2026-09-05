"use client";

// Covered by: `e2e/boards-switch.e2e.spec.ts`

import { useQuery } from "@tanstack/react-query";

import { usePrefetchAllBoards } from "@/features/boards/hooks/use-prefetch-all-boards";
import { createBoardsQueryOptions } from "@/features/boards/queries/boards-query";

// comment-length-exempt: records why this is a component of its own rather than a hook call in the sidebar, which is where it started and where its reads did not belong
/**
 * BOARD-04's background load, mounted once by the dashboard layout.
 *
 * Deliberately NOT a hook call inside `BoardList`, which is where it began: the sidebar list is a
 * presentational component whose tests drive it in isolation, and a board read fired from there
 * turned every one of them into a test that had to stub a read it never asked for. Loading every
 * board is an application-level behaviour that happens to need the board list, not a behaviour of
 * the list, so it is mounted beside the board area instead and reads the same cache entry.
 */
export const BoardPrefetcher = () => {
    /* A pure cache read — the sidebar's own observer owns the fetch for this entry. */
    const { data: boards } = useQuery({ ...createBoardsQueryOptions(), enabled: false });

    usePrefetchAllBoards({ boards: boards ?? [] });

    /* An empty fragment, not `null`: `pnpm tsx:check` identifies a component by the JSX it returns. */
    return <></>;
};
