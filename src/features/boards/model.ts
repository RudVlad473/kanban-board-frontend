import type { Board } from "@/features/boards/schemas";
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
