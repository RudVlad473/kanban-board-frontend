import { z } from "zod";

/*
 * The task and subtask levels of the full-board containment hierarchy, promoted out of the boards
 * feature's own `schemas.ts` under D-16 so a second feature may compose them without a
 * feature-to-feature import (ADR tech/0024's promotion rule).
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
    /*
     * The contract declares `description` optional, but the backend sends an explicit `null` for a
     * task created without one (observed 2026-08-27, plan 03-12) — normalised to the one absent
     * value, so a consumer never has to handle two spellings of the same thing.
     */
    description: z
        .string()
        .nullish()
        .transform((value) => value ?? undefined),
    version: z.number(),
    position: z.number(),
    subtasks: subtaskSchema.array(),
});

export type Subtask = z.infer<typeof subtaskSchema>;

export type TaskFull = z.infer<typeof taskFullSchema>;

/*
 * What a task mutation's own response parses as. Derived rather than restated so the two can never
 * drift: `TaskResponseDTO` returns no subtasks, so `taskFullSchema` would fail every successful call.
 */
export const taskSchema = taskFullSchema.omit({ subtasks: true });

/*
 * The same DTO also carries no `columnId`, so a move response cannot report where the task landed —
 * the optimistic override has to carry the destination itself (04-RESEARCH.md Pitfall 3).
 */
export type Task = z.infer<typeof taskSchema>;

/*
 * Duplicated verbatim from the boards feature's own unexported constant rather than imported — the
 * core ring may not import a feature (CONVENTIONS.md), and this is the Copywriting Contract's wording.
 */
const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const TASK_TITLE_LENGTH_MESSAGE = "Task title must be between 3 and 32 characters.";

/*
 * `SaveTaskRequestDTO`'s own declared bounds, re-enforced on UPDATE too: `UpdateTaskRequestDTO`
 * declares none at all, so without this a title that could never have been created becomes savable
 * (04-RESEARCH.md Pitfall 4).
 */
export const taskTitleSchema = z.string().trim().min(3, TASK_TITLE_LENGTH_MESSAGE).max(32, TASK_TITLE_LENGTH_MESSAGE);

/*
 * Deliberately separate from `taskTitleSchema`, not a relaxation of it: a blank field earns the
 * required-field copy, not the length copy. `.pipe` rather than stacked `.min`s so the blank case
 * can never report length, mirroring `columnNameSchema` / `columnNameRowSchema`'s split exactly.
 */
export const taskTitleRowSchema = z.string().trim().min(1, REQUIRED_FIELD_MESSAGE).pipe(taskTitleSchema);
