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

/*
 * RED skeleton (04-15 Task 1) — type-checks so the pre-commit hook's type-aware lint pass can run
 * against the new failing tests; the real bounds land in the GREEN commit.
 */
export const subtaskTitleRowSchema = z.string();

export const createTaskInputSchema = z.object({
    boardId: z.string(),
    columnId: z.string(),
    title: z.string(),
    description: z.string().optional(),
});

export const createSubtaskInputSchema = z.object({
    boardId: z.string(),
    columnId: z.string(),
    taskId: z.string(),
    title: z.string(),
});

export const createTaskSubtasksInputSchema = z.object({
    boardId: z.string(),
    columnId: z.string(),
    taskId: z.string(),
    titles: z.array(z.string()),
});
