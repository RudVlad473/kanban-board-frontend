import type { Announcements, UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import type { Board, ColumnFull } from "@/features/boards/schemas";
import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";

/**
 * The create-board form's column rows reduced to the names sent, in the order typed. Trims but
 * never drops: a blank row is blocked at validation (D-02a), so silently omitting one here would
 * make the created board differ from what was on screen. Pure, per CONVENTIONS.md's `model.ts` rule.
 */
export const toSubmittedColumnNames = (rows: string[]): string[] => rows.map((row) => row.trim());

/** D-01a: one row, so the user is never made to clear rows they did not ask for. */
export const DEFAULT_COLUMN_ROW_COUNT = 1;

export const createEmptyColumnRows = (count: number): { value: string }[] =>
    Array.from({ length: count }, () => ({ value: "" }));

/** The task card's meta line in the design's own "X of Y subtasks" wording (02-UI-SPEC Typography). */
export const toSubtaskSummary = (subtasks: { isCompleted: boolean }[]): string => {
    const completedCount = subtasks.filter((subtask) => subtask.isCompleted).length;

    return `${String(completedCount)} of ${String(subtasks.length)} subtasks`;
};

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

export type ColumnOrderOverride = { previousOrder: string[]; order: string[] };

/**
 * The optimistic reorder as rendered, retiring itself the moment the server's own order stops
 * matching `previousOrder` — nothing ever clears it (03-RESEARCH Pattern 2).
 */
export const applyColumnOrderOverride = ({
    columns,
    override,
}: {
    columns: ColumnFull[];
    override: ColumnOrderOverride | null;
}): ColumnFull[] => {
    if (override === null) {
        return columns;
    }

    const serverOrder = columns.map((column) => column.id);
    const isStale =
        serverOrder.length !== override.previousOrder.length ||
        serverOrder.some((id, index) => id !== override.previousOrder[index]);

    if (isStale) {
        return columns;
    }

    /* `flatMap` with an empty-array fallback, so an id the server no longer has drops out rather than becoming `undefined`. */
    return override.order.flatMap((id) => columns.find((column) => column.id === id) ?? []);
};

/**
 * The rendered order after one column moves, so no call site does its own `splice`. `toIndex` is the
 * item's *final* index here, which is also what the wire means by it — see the translation below.
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

/*
 * 03-BACKEND-FACTS.md § R1 (probed 2026-08-26): `targetPosition` is the moved column's FINAL 0-based
 * index, so `arrayMove`'s own `toIndex` goes out verbatim and there is no translation to get wrong.
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

        return index === -1 ? null : { name: columns[index].name, position: String(index + 1) };
    };

    return {
        onDragStart: ({ active }) => {
            const column = resolveColumn(active.id);

            return column === null
                ? undefined
                : `Picked up ${column.name}, position ${column.position} of ${total}. Use left and right arrow keys to move, space to drop, escape to cancel.`;
        },

        /*
         * The library fires this once on the lift itself, with the column over its own droppable —
         * announcing that would overwrite "Picked up …" before it is ever read, so a target that is
         * the column itself says nothing (verified live in plan 03-10's keyboard tests).
         */
        onDragOver: ({ active, over }) => {
            const column = resolveColumn(active.id);
            const target = over === null || over.id === active.id ? null : resolveColumn(over.id);

            return column === null || target === null
                ? undefined
                : `${column.name} moved to position ${target.position} of ${total}.`;
        },

        onDragEnd: ({ active, over }) => {
            const column = resolveColumn(active.id);
            const target = over === null ? null : resolveColumn(over.id);

            return column === null || target === null
                ? undefined
                : `${column.name} dropped at position ${target.position} of ${total}.`;
        },

        onDragCancel: ({ active }) => {
            const column = resolveColumn(active.id);

            return column === null
                ? undefined
                : `Move cancelled. ${column.name} returned to position ${column.position} of ${total}.`;
        },
    };
};
