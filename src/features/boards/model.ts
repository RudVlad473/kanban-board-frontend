/**
 * The create-board form's column rows reduced to the names sent, in the order typed. Trims but
 * never drops: a blank row is blocked at validation (D-02a), so silently omitting one here would
 * make the created board differ from what was on screen. Pure, per CONVENTIONS.md's `model.ts` rule.
 */
export const toSubmittedColumnNames = (rows: string[]): string[] => rows.map((row) => row.trim());
