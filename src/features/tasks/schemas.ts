import { z } from "zod";

/*
 * `min(0)` mirrors `MoveTaskRequestDTO`'s own `minimum: 0`, and the id floors mirror
 * `reorderColumnInputSchema` exactly — a Server Action is callable over the wire with any payload,
 * so these are this app's boundary rather than a restatement of the compile-time types (T-04-01).
 */
export const moveTaskInputSchema = z.object({
    taskId: z.string().min(1),
    targetColumnId: z.string().min(1),
    version: z.number().int(),
    targetPosition: z.number().int().min(0),
});

export type MoveTaskInput = z.infer<typeof moveTaskInputSchema>;
