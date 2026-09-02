import type { Announcements, UniqueIdentifier } from "@dnd-kit/core";

import type { Board, Column, ColumnFull } from "@/features/boards/schemas";
import type { TaskFull } from "@/lib/core/api-contract/task-schemas";
import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";

/**
 * The create-board form's column rows reduced to the names sent, in the order typed: trimmed, and a
 * blank row DROPPED rather than blocking submission — the same rule `toSubmittedSubtaskTitles`
 * applies to the task form's rows. Pure, per CONVENTIONS.md's `model.ts` rule.
 */
export const toSubmittedColumnNames = (rows: string[]): string[] =>
    rows.map((row) => row.trim()).filter((row) => row !== "");

/** D-01a: one row, so the user is never made to clear rows they did not ask for. */
export const DEFAULT_COLUMN_ROW_COUNT = 1;

export const createEmptyColumnRows = (count: number): { value: string }[] =>
    Array.from({ length: count }, () => ({ value: "" }));

/*
 * `toSubtaskSummary` moved to `features/tasks/model.ts` in plan 04-12: after D-18 put the card in
 * the tasks feature, this one had no consumer left here. D-16's promotion rule covers contract
 * shapes, and a caption formatter is presentation — so it did not go to the core ring.
 */

/** The ALL-CAPS column caption with its task count, as the PDF renders it ("TODO (4)"). */
export const toColumnCaption = ({ name, taskCount }: { name: string; taskCount: number }): string =>
    `${name} (${String(taskCount)})`;

/** The exact template type React Hook Form's `register` needs for a column row's field path. */
export type ColumnRowPath = `columns.${number}.value`;

/*
 * A bare numeric interpolation trips `restrict-template-expressions`, so the index is stringified
 * and the result asserted back onto the template type — kept here so no `.tsx` carries the dance.
 */
export const buildColumnRowPath = (index: number): ColumnRowPath => `columns.${String(index)}.value` as ColumnRowPath;

/** The board list as it will read once a delete lands, with the rest left in the order given. */
export const removeBoard = ({ boards, boardId }: { boards: Board[]; boardId: string }): Board[] =>
    boards.filter((board) => board.id !== boardId);

/**
 * The board list with one board already prepended — the reducer behind `useCreateBoard`'s optimistic
 * insert. Newest-first, matching the order `fetchBoards` reverses the upstream list into.
 */
export const withBoardInsert = ({ boards, board }: { boards: Board[]; board: Board }): Board[] => [board, ...boards];

/**
 * The board list with the row at `boardId` MERGED with `board` — how `useCreateBoard` swaps its
 * placeholder for the server's real id and version. A boardId the list no longer holds yields the
 * input untouched, so a rejected write cannot resurrect a row something else already dropped.
 */
export const withBoardReplace = ({
    boards,
    boardId,
    board,
}: {
    boards: Board[];
    boardId: string;
    board: Board;
}): Board[] => boards.map((entry) => (entry.id === boardId ? { ...entry, ...board } : entry));

/**
 * D-08's post-delete destination, or `null` when the user was not looking at the board that went
 * away and so should not be moved at all. Pure, so all three branches are assertable without a
 * router (CONVENTIONS.md's `model.ts` rule).
 */
export const resolveDestinationAfterDelete = ({
    remainingBoards,
    deletedBoardId,
    currentBoardId,
}: {
    remainingBoards: Board[];
    deletedBoardId: string;
    currentBoardId: string | null;
}): string | null => {
    if (currentBoardId !== deletedBoardId) {
        return null;
    }

    /*
     * "First remaining" is this array's own first entry — `fetchBoards()` already reversed it to
     * newest-first, so ordering it again here would land the user off the top of the panel (D-12).
     */
    const [firstRemaining] = remainingBoards;

    return remainingBoards.length === 0 ? ROUTE.BOARDS : buildBoardDetailPath(firstRemaining.id);
};

/**
 * The board's columns with one already appended — the reducer behind `useCreateColumn`'s optimistic
 * insert. Appended, never sorted: D-01 puts a new column at the end of the row.
 */
export const withColumnInsert = ({ columns, column }: { columns: ColumnFull[]; column: ColumnFull }): ColumnFull[] => [
    ...columns,
    column,
];

/**
 * The board's columns with one already removed — the reducer behind `useDeleteColumn`'s optimistic
 * write. A columnId the board no longer holds yields the input untouched.
 */
export const withColumnRemove = ({ columns, columnId }: { columns: ColumnFull[]; columnId: string }): ColumnFull[] =>
    columns.filter((column) => column.id !== columnId);

/**
 * The board's columns with the one at `columnId` MERGED with `column` — how `useCreateColumn` swaps
 * its placeholder for the server's real id, version and position. Merged rather than assigned
 * because `ColumnResponseDTO` carries no `tasks` (docs/adr/tech/0030 rule 2).
 */
export const withColumnReplace = ({
    columns,
    columnId,
    column,
}: {
    columns: ColumnFull[];
    columnId: string;
    column: Column;
}): ColumnFull[] => columns.map((entry) => (entry.id === columnId ? { ...entry, ...column } : entry));

/*
 * Whole literal class names, never assembled by interpolation — Tailwind v4's source scanner only
 * emits a utility it can see spelled out in full.
 */
export const COLUMN_DOT_TOKENS = ["bg-accent-column-1", "bg-accent-column-2", "bg-accent-column-3"] as const;

/*
 * djb2. Any stable string→int would do; this one is here only so the bucket below is a pure
 * function of the id, with no dependency and no per-render allocation.
 */
const hashColumnId = (id: string): number => {
    let hash = 5381;

    for (let index = 0; index < id.length; index += 1) {
        hash = ((hash << 5) + hash + id.charCodeAt(index)) >>> 0;
    }

    return hash;
};

/**
 * U-03: the decorative header dot derives its hue from the column's own id, never its position —
 * delete renumbers positions, so a position-keyed hue repainted every surviving column.
 * Full rationale: 03-UI-SPEC.md § Color, "Keyed by id, not by position".
 */
export const toColumnDotToken = ({ id }: { id: string }): (typeof COLUMN_DOT_TOKENS)[number] =>
    COLUMN_DOT_TOKENS[hashColumnId(id) % COLUMN_DOT_TOKENS.length];

/**
 * `position` is the backend's ordering authority — the response array's own order carries no
 * guarantee and only looked like one because every fixture is authored in creation order. Copies
 * first: the input is `cache()`d RSC data other derivations also read (03-14-SUMMARY.md).
 */
export const sortColumnsByPosition = (columns: ColumnFull[]): ColumnFull[] =>
    [...columns].sort((left, right) => left.position - right.position);

/**
 * D-11's within-column ordering, on the same terms as the column sort one level up: `position` is
 * the authority, and the copy is not optional because the input is `cache()`d RSC data. Every
 * factory authors tasks in creation order, which is why the missing sort was invisible until now.
 */
export const sortTasksByPosition = (tasks: TaskFull[]): TaskFull[] =>
    [...tasks].sort((left, right) => left.position - right.position);

export type HorizontalBox = { left: number; right: number };

/**
 * Whether a keyboard step's destination already sits inside the column row's visible box. dnd-kit's
 * `KeyboardSensor` scrolls for anything past the container's MIDPOINT, which on a row several
 * columns wide throws an on-screen neighbour off it (03-14-SUMMARY.md).
 */
export const isColumnDestinationVisible = ({
    destination,
    visibleBox,
}: {
    destination: HorizontalBox;
    visibleBox: HorizontalBox;
}): boolean => destination.left >= visibleBox.left && destination.right <= visibleBox.right;

/*
 * 03-BACKEND-FACTS.md § R1 (probed 2026-08-26): `targetPosition` is the moved column's FINAL 0-based
 * index, so `reorderColumns`' own `toIndex` (column-drag-model.ts) goes out verbatim — no translation to get wrong.
 * § R4 observed an out-of-range value is clamped server-side, so no client clamp belongs here.
 */
export const toReorderTargetPosition = ({ toIndex }: { toIndex: number }): number => toIndex;

/** D-03's stated threshold. D-02 keeps the count itself uncapped — nothing here refuses a create. */
export const COLUMN_COUNT_NUDGE_THRESHOLD = 8;

/**
 * D-05 reads D-03's "first crosses 8" as *exceeds* 8, so testing one exact transition is what makes
 * the nudge fire once by construction rather than by remembering it already did.
 */
export const shouldNudgeOnColumnCount = ({ nextCount }: { nextCount: number }): boolean =>
    nextCount === COLUMN_COUNT_NUDGE_THRESHOLD + 1;

/**
 * dnd-kit's four reorder announcements in 03-UI-SPEC's own wording — a factory because the strings
 * need the live column list, and because `pnpm tsx:check` forbids declaring it in the consuming
 * `.tsx` (03-RESEARCH Pitfall 8). dnd-kit renders the live region itself; this supplies strings only.
 */
export const createColumnReorderAnnouncements = ({ columns }: { columns: ColumnFull[] }): Announcements => {
    const total = String(columns.length);

    /* Speech is 1-based while the wire's `targetPosition` is 0-based, so the conversion is encoded once here. */
    const resolveColumn = (id: UniqueIdentifier): { name: string; position: string } | null => {
        const index = columns.findIndex((column) => column.id === id);

        return index !== -1 ? { name: columns[index].name, position: String(index + 1) } : null;
    };

    return {
        onDragStart: ({ active }) => {
            const column = resolveColumn(active.id);

            return column !== null
                ? `Picked up ${column.name}, position ${column.position} of ${total}. Use left and right arrow keys to move, space to drop, escape to cancel.`
                : undefined;
        },

        /*
         * The library fires this once on the lift itself, with the column over its own droppable —
         * announcing that would overwrite "Picked up …" before it is ever read, so a target that is
         * the column itself says nothing (verified live in plan 03-10's keyboard tests).
         */
        onDragOver: ({ active, over }) => {
            const column = resolveColumn(active.id);
            const target = over !== null && over.id !== active.id ? resolveColumn(over.id) : null;

            return column !== null && target !== null
                ? `${column.name} moved to position ${target.position} of ${total}.`
                : undefined;
        },

        onDragEnd: ({ active, over }) => {
            const column = resolveColumn(active.id);
            const target = over !== null ? resolveColumn(over.id) : null;

            return column !== null && target !== null
                ? `${column.name} dropped at position ${target.position} of ${total}.`
                : undefined;
        },

        onDragCancel: ({ active }) => {
            const column = resolveColumn(active.id);

            return column !== null
                ? `Move cancelled. ${column.name} returned to position ${column.position} of ${total}.`
                : undefined;
        },
    };
};
