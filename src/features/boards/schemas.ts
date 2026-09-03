import { z } from "zod";

import { taskFullSchema } from "@/lib/core/api-contract/task-schemas";

/**
 * Runtime-verified shape replacing the deleted `isBoard`/`isBoardArray` guards — the
 * contract declares no `required` array, so a raw cast to `Board` can't be trusted (see
 * docs/adr/tech/0024).
 */
export const boardSchema = z.object({
    id: z.string(),
    name: z.string(),
    version: z.number(),
});

export const boardsSchema = boardSchema.array();

export type Board = z.infer<typeof boardSchema>;

/*
 * The full-board containment hierarchy, composed a level at a time. None of the four response
 * shapes declares a `required` array, so a cast at any level would be a claim rather than a fact
 * (docs/adr/tech/0024). Its task and subtask levels moved to the core ring.
 */
export const columnFullSchema = z.object({
    id: z.string(),
    name: z.string(),
    version: z.number(),
    position: z.number(),
    tasks: taskFullSchema.array(),
});

export const boardFullSchema = z.object({
    id: z.string(),
    name: z.string(),
    version: z.number(),
    columns: columnFullSchema.array(),
});

export type ColumnFull = z.infer<typeof columnFullSchema>;

export type BoardFull = z.infer<typeof boardFullSchema>;

/*
 * What a column mutation's own response parses as. Derived rather than restated so the two can never
 * drift: `ColumnResponseDTO` returns no tasks, so `columnFullSchema` would fail every successful call.
 */
export const columnSchema = columnFullSchema.omit({ tasks: true });

export type Column = z.infer<typeof columnSchema>;

/*
 * Duplicated verbatim from auth's own unexported constant rather than imported — a feature may not
 * import another feature (CONVENTIONS.md), and this is the UI-SPEC Copywriting Contract's wording.
 */
const REQUIRED_FIELD_MESSAGE = "Can't be empty";
/* Exported so a TextField's `characterLimit` and the rule it counts against stay one number. */
export const BOARD_NAME_MAX_LENGTH = 64;
const BOARD_NAME_LENGTH_MESSAGE = `Board name must be ${String(BOARD_NAME_MAX_LENGTH)} characters or fewer.`;

/*
 * 64 is the backend's own measured ceiling, binary-searched against the real nonprod backend on
 * 2026-08-25 — 64 accepted, 65 rejected — closing 02-BACKEND-FACTS.md P4's Escalate item, which
 * only knew the limit lay between 1 and 1000 and left a conservative 100 in its place.
 */
export const boardNameSchema = z
    .string()
    .trim()
    .min(1, REQUIRED_FIELD_MESSAGE)
    .max(BOARD_NAME_MAX_LENGTH, BOARD_NAME_LENGTH_MESSAGE);

/** The object shape `createBoardAction` parses — never the raw argument it was handed. */
export const createBoardInputSchema = z.object({ name: boardNameSchema });

export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;

/*
 * `version` is required here because the board *update* body requires it while the create body has
 * no such field — a rename built by analogy to create is rejected on every attempt
 * (02-RESEARCH.md Pitfall 1). Requiring it at this app's own boundary fails loudly instead.
 */
export const renameBoardInputSchema = z.object({
    boardId: z.string().min(1),
    name: boardNameSchema,
    version: z.number().int(),
});

export type RenameBoardInput = z.infer<typeof renameBoardInputSchema>;

/*
 * A delete has no request body, so the board id is the entire untrusted surface — and it selects
 * the target of the one operation in this app that cannot be undone (ADR domain/0002).
 */
export const deleteBoardInputSchema = z.object({ boardId: z.string().min(1) });

export type DeleteBoardInput = z.infer<typeof deleteBoardInputSchema>;

/*
 * The rename form's own shape — only the name is editable, since the board's id and version come
 * from the RSC-supplied row rather than from anything the user can type.
 */
export const editBoardFormSchema = z.object({ name: boardNameSchema });

export type EditBoardFormValues = z.infer<typeof editBoardFormSchema>;

export const COLUMN_NAME_MAX_LENGTH = 32;
const COLUMN_NAME_LENGTH_MESSAGE = `Column name must be between 3 and ${String(COLUMN_NAME_MAX_LENGTH)} characters.`;

/* Exported so a TextField's `characterMinimum` and the rule it counts against stay one number. */
export const COLUMN_NAME_MIN_LENGTH = 3;

/** The backend's own enforced bounds, mirrored verbatim (02-BACKEND-FACTS.md P6). */
export const columnNameSchema = z
    .string()
    .trim()
    .min(COLUMN_NAME_MIN_LENGTH, COLUMN_NAME_LENGTH_MESSAGE)
    .max(COLUMN_NAME_MAX_LENGTH, COLUMN_NAME_LENGTH_MESSAGE);

/*
 * Deliberately separate from `columnNameSchema`, not a relaxation of it: a blank row is now a user
 * error to correct rather than input to drop, and it earns the required-field copy, not the
 * length copy. `.pipe` rather than stacked `.min`s so the blank case can never report length.
 */
export const columnNameRowSchema = z.string().trim().min(1, REQUIRED_FIELD_MESSAGE).pipe(columnNameSchema);

/*
 * The create FORM's own row rule, distinct from `columnNameRowSchema`'s: a blank row is dropped
 * from the create sequence rather than blocking the submit. Reuses `columnNameSchema` for the
 * non-blank case, so a 1- or 2-character row still reports the length copy.
 */
export const columnNameFormRowSchema = z
    .string()
    .trim()
    .refine((value) => value === "" || columnNameSchema.safeParse(value).success, COLUMN_NAME_LENGTH_MESSAGE);

/*
 * Rows are validated with `columnNameFormRowSchema`, not `columnNameRowSchema` — this form drops a
 * blank row, while every single-field column form still requires its one field.
 */
export const addBoardFormSchema = z.object({
    name: boardNameSchema,
    columns: z.array(z.object({ value: columnNameFormRowSchema })),
});

export type AddBoardFormValues = z.infer<typeof addBoardFormSchema>;

/**
 * What the create-board submit handler receives — the validated rows, trimmed later by
 * `toSubmittedColumnNames`. Lives here rather than beside the modal because it is the contract
 * between that modal and `board-list.tsx`, and neither should import the other's component module.
 */
export type AddBoardSubmitValues = { name: string; columns: string[] };

/*
 * The array is length-capped so a forged wire payload cannot drive an unbounded upstream loop
 * (T-02-46); 50 is far above any plausible starter-column count.
 */
export const createBoardColumnsInputSchema = z.object({
    boardId: z.string().min(1),
    names: z.array(z.string()).max(50),
});

export type CreateBoardColumnsInput = z.infer<typeof createBoardColumnsInputSchema>;

/*
 * `columnNameRowSchema` rather than bare `columnNameSchema`: 03-UI-SPEC's Copywriting Contract gives
 * a blank column name the required-field copy and only an out-of-bounds one the length copy, and
 * that split is exactly what the row schema already pipes (it reuses the 3-32 bound, never restates it).
 */
export const createColumnInputSchema = z.object({ boardId: z.string().min(1), name: columnNameRowSchema });

export type CreateColumnInput = z.infer<typeof createColumnInputSchema>;

/*
 * `version` is required here for the same reason `renameBoardInputSchema` requires it one level up:
 * the column *update* body requires it while the create body has no such field.
 */
export const renameColumnInputSchema = z.object({
    boardId: z.string().min(1),
    columnId: z.string().min(1),
    name: columnNameRowSchema,
    version: z.number().int(),
});

export type RenameColumnInput = z.infer<typeof renameColumnInputSchema>;

/*
 * `min(0)` mirrors `ReorderColumnRequestDTO`'s own `minimum: 0` — the floor that stops a forged
 * negative or fractional wire payload at this app's boundary rather than upstream (T-03-06).
 */
export const reorderColumnInputSchema = z.object({
    boardId: z.string().min(1),
    columnId: z.string().min(1),
    version: z.number().int(),
    targetPosition: z.number().int().min(0),
});

export type ReorderColumnInput = z.infer<typeof reorderColumnInputSchema>;

/*
 * A delete has no request body, so the two ids are the entire untrusted surface — and they select the
 * target of a hard cascade that takes every task with it (ADR domain/0002).
 */
export const deleteColumnInputSchema = z.object({
    boardId: z.string().min(1),
    columnId: z.string().min(1),
});

export type DeleteColumnInput = z.infer<typeof deleteColumnInputSchema>;

/*
 * Both column forms carry only the name, since the board id, column id and version come from the
 * RSC-supplied column rather than from anything the user can type (mirrors `editBoardFormSchema`).
 */
export const addColumnFormSchema = z.object({ name: columnNameRowSchema });

export type AddColumnFormValues = z.infer<typeof addColumnFormSchema>;

export const renameColumnFormSchema = z.object({ name: columnNameRowSchema });

export type RenameColumnFormValues = z.infer<typeof renameColumnFormSchema>;
