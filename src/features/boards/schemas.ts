import { z } from "zod";

/**
 * This domain's own runtime-verified shape — `BoardResponseDTO` (`generated-types.ts`) declares
 * every property optional because the contract's schema carries no `required` array, so casting an
 * upstream response straight to `Board` would be a lie the type checker can't catch. `BoardSchema`
 * exists to make that cast honest, replacing the hand-written `isBoard`/`isBoardArray` guards that
 * previously lived in `types.ts` (D-12).
 */
export const BoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    version: z.number(),
});

export const boardsSchema = BoardSchema.array();

export type Board = z.infer<typeof BoardSchema>;
