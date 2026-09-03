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
        .transform((value) => (value !== "" ? value : undefined)),
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
 * `PUT .../subtasks/{subtaskId}` carries BOTH mutable fields behind one `version`, so this is the
 * ONE action file the toggle (04-17) and the rename (04-19) both call. Both fields are optional,
 * mirroring `UpdateSubtaskRequestDTO` itself — a toggle sends only `isCompleted`, a rename only `title`.
 */
export const updateSubtaskInputSchema = z.object({
    boardId: z.string().min(1),
    columnId: z.string().min(1),
    taskId: z.string().min(1),
    subtaskId: z.string().min(1),
    version: z.number().int(),
    title: subtaskTitleRowSchema.optional(),
    isCompleted: z.boolean().optional(),
});

export type UpdateSubtaskInput = z.infer<typeof updateSubtaskInputSchema>;

/*
 * `DELETE .../subtasks/{subtaskId}` carries no body — no `version` field, mirroring
 * `deleteColumnInputSchema` exactly (the endpoint accepts no version to be stale against).
 */
export const deleteSubtaskInputSchema = z.object({
    boardId: z.string().min(1),
    columnId: z.string().min(1),
    taskId: z.string().min(1),
    subtaskId: z.string().min(1),
});

export type DeleteSubtaskInput = z.infer<typeof deleteSubtaskInputSchema>;

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

/*
 * The Add New Task form's own shape. `subtasks` rows carry no bound of their own — a blank row is
 * DROPPED at submit (`toSubmittedSubtaskTitles`), not blocked, so the row schema never rejects one.
 * `columnId` is required because the create endpoint is column-scoped.
 */
export const addTaskFormSchema = z.object({
    title: taskTitleRowSchema,
    description: z.string(),
    columnId: z.string().min(1, REQUIRED_FIELD_MESSAGE),
    subtasks: z.array(z.object({ value: z.string() })),
});

export type AddTaskFormValues = z.infer<typeof addTaskFormSchema>;

/**
 * What the create-task submit handler receives — validated fields plus subtask rows already
 * reduced to non-blank, trimmed titles. Lives here, the contract between the modal and its caller.
 */
export type AddTaskSubmitValues = { columnId: string; title: string; description: string; subtasks: string[] };

/*
 * `UpdateTaskRequestDTO` declares NO title bounds — re-enforced via the create path's own
 * `taskTitleRowSchema` (RESEARCH Pitfall 4, T-04-23). `description` mirrors `createTaskInputSchema`'s
 * blank-to-`undefined` transform: T9 found `""` refused and `null`/omitted a silent no-op.
 */
export const updateTaskInputSchema = z.object({
    boardId: z.string().min(1),
    columnId: z.string().min(1),
    taskId: z.string().min(1),
    version: z.number().int(),
    title: taskTitleRowSchema,
    description: z
        .string()
        .trim()
        .optional()
        .transform((value) => (value !== "" ? value : undefined)),
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

/** The Edit Task modal's own form shape — title and description only, S-02 drops Status entirely. */
export const editTaskFormSchema = z.object({
    title: taskTitleRowSchema,
    description: z.string(),
});

export type EditTaskFormValues = z.infer<typeof editTaskFormSchema>;

/** What `EditTaskModal`'s submit handler receives — the contract between the modal and its caller. */
export type EditTaskSubmitValues = { title: string; description: string };

/*
 * `DELETE .../tasks/{taskId}` carries no body — no `version` field, mirroring
 * `deleteColumnInputSchema` and `deleteSubtaskInputSchema` exactly (the endpoint takes no version
 * to be stale against; T6's cascade is unconditional).
 */
export const deleteTaskInputSchema = z.object({
    boardId: z.string().min(1),
    columnId: z.string().min(1),
    taskId: z.string().min(1),
});

export type DeleteTaskInput = z.infer<typeof deleteTaskInputSchema>;
