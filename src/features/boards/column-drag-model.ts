"use client";

import { arrayMove } from "@dnd-kit/sortable";

import type { ColumnFull } from "@/features/boards/schemas";

/*
 * Split out of `model.ts` so no VALUE import of `@dnd-kit/*` reaches the server graph: dnd-kit calls
 * `React.createContext` at module scope and `server-only` `fetch-board-full.ts` imports `model.ts`.
 * Revert the merge and `pnpm build` dies on /boards/[boardId] — see 03-14-SUMMARY.md.
 */

/**
 * The rendered order after one column moves, so no call site does its own `splice`. `toIndex` is the
 * item's *final* index here, which is also what the wire means by it — see `toReorderTargetPosition`.
 */
export const reorderColumns = ({
    columns,
    fromIndex,
    toIndex,
}: {
    columns: ColumnFull[];
    fromIndex: number;
    toIndex: number;
}): ColumnFull[] => arrayMove(columns, fromIndex, toIndex);
