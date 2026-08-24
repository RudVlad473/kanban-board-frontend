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
