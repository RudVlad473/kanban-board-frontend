import { z } from "zod";

/**
 * Runtime-verified shape replacing the deleted `isBoard`/`isBoardArray` guards (D-12) — the
 * contract declares no `required` array, so a raw cast to `Board` can't be trusted (see
 * docs/adr/tech/0024).
 */
export const BoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    version: z.number(),
});

export const boardsSchema = BoardSchema.array();

export type Board = z.infer<typeof BoardSchema>;

/*
 * The full-board containment hierarchy, composed a level at a time. None of the four response
 * shapes declares a `required` array, so a cast at any level would be a claim rather than a fact
 * (see docs/adr/tech/0024).
 */
export const subtaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    isCompleted: z.boolean(),
    version: z.number(),
});

export const taskFullSchema = z.object({
    id: z.string(),
    title: z.string(),
    // The contract declares `description` optional; a task without one is well-formed, not malformed.
    description: z.string().optional(),
    version: z.number(),
    position: z.number(),
    subtasks: subtaskSchema.array(),
});

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

export type Subtask = z.infer<typeof subtaskSchema>;

export type TaskFull = z.infer<typeof taskFullSchema>;

export type ColumnFull = z.infer<typeof columnFullSchema>;

export type BoardFull = z.infer<typeof boardFullSchema>;

/*
 * Duplicated verbatim from auth's own unexported constant rather than imported — a feature may not
 * import another feature (CONVENTIONS.md), and this is the UI-SPEC Copywriting Contract's wording.
 */
const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const BOARD_NAME_LENGTH_MESSAGE = "Board name must be 100 characters or fewer.";

/*
 * 100 is a deliberately conservative bound, not a measured one: 02-BACKEND-FACTS.md P4 proved a
 * ceiling exists between 1 and 1000 characters but never pinned it, and under-restricting is safe
 * because the backend rejects whatever the client lets through.
 */
export const boardNameSchema = z.string().trim().min(1, REQUIRED_FIELD_MESSAGE).max(100, BOARD_NAME_LENGTH_MESSAGE);

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
 * The rename form's own shape — only the name is editable, since the board's id and version come
 * from the RSC-supplied row rather than from anything the user can type.
 */
export const editBoardFormSchema = z.object({ name: boardNameSchema });

export type EditBoardFormValues = z.infer<typeof editBoardFormSchema>;

const COLUMN_NAME_LENGTH_MESSAGE = "Column name must be between 3 and 32 characters.";

/** The backend's own enforced bounds, mirrored verbatim (02-BACKEND-FACTS.md P6). */
export const columnNameSchema = z
    .string()
    .trim()
    .min(3, COLUMN_NAME_LENGTH_MESSAGE)
    .max(32, COLUMN_NAME_LENGTH_MESSAGE);

/*
 * Deliberately separate from `columnNameSchema`, not a relaxation of it: a blank row is now a user
 * error to correct rather than input to drop (D-02a), and it earns the required-field copy, not the
 * length copy. `.pipe` rather than stacked `.min`s so the blank case can never report length.
 */
export const columnNameRowSchema = z.string().trim().min(1, REQUIRED_FIELD_MESSAGE).pipe(columnNameSchema);

/*
 * Rows are validated with `columnNameRowSchema`, not `columnNameSchema` — a blank row blocks
 * submission with the required-field copy rather than the length copy (D-02a).
 */
export const addBoardFormSchema = z.object({
    name: boardNameSchema,
    columns: z.array(z.object({ value: columnNameRowSchema })),
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
