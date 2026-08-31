import { z } from "zod";

import { taskTitleRowSchema } from "@/lib/core/api-contract/task-schemas";

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
 * Duplicated verbatim from the boards feature's own unexported constant rather than imported — a
 * feature may not import another feature (CONVENTIONS.md).
 */
const REQUIRED_FIELD_MESSAGE = "Can't be empty";

/*
 * `SaveSubtaskRequestDTO` declares `minLength: 1` and no maximum on create (04-BACKEND-FACTS.md T8
 * only found a hidden 32-char cap on UPDATE, out of this plan's scope) — so unlike
 * `taskTitleRowSchema` there is no length branch to pipe into, only the required-field message.
 */
export const subtaskTitleRowSchema = z.string().trim().min(1, REQUIRED_FIELD_MESSAGE);

/*
 * The object shape `createTaskAction` parses. `description` is normalised to `undefined` at the
 * boundary: T9 observed the backend REFUSES an explicit `""` while an omitted field means
 * "no description" — sending a blank field verbatim would fail every empty-description create.
 */
export const createTaskInputSchema = z.object({
    boardId: z.string().min(1),
    columnId: z.string().min(1),
    title: taskTitleRowSchema,
    description: z
        .string()
        .trim()
        .optional()
        .transform((value) => (value === "" ? undefined : value)),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

/** The object shape `createSubtaskAction` parses — one subtask, added to an existing task. */
export const createSubtaskInputSchema = z.object({
    boardId: z.string().min(1),
    columnId: z.string().min(1),
    taskId: z.string().min(1),
    title: subtaskTitleRowSchema,
});

export type CreateSubtaskInput = z.infer<typeof createSubtaskInputSchema>;

/*
 * `titles` is length-capped at the same limit `createBoardColumnsInputSchema` uses (T-04-04) — a
 * forged wire payload cannot drive an unbounded sequential fan-out.
 */
export const createTaskSubtasksInputSchema = z.object({
    boardId: z.string().min(1),
    columnId: z.string().min(1),
    taskId: z.string().min(1),
    titles: z.array(z.string()).max(50),
});

export type CreateTaskSubtasksInput = z.infer<typeof createTaskSubtasksInputSchema>;
