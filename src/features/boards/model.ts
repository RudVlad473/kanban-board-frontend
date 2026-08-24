/**
 * The create-board form's raw column rows reduced to the names that actually get sent, in the
 * order typed — a blank row is omitted here rather than blocked by validation (D-02). Pure: no
 * side effects and no API calls, per CONVENTIONS.md's `model.ts` rule.
 */
export const toCreatableColumnNames = (rows: string[]): string[] =>
    rows.map((row) => row.trim()).filter((row) => row.length > 0);
