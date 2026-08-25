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
