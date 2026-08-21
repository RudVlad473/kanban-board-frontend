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
