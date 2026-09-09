import { describe, expect, it } from "vitest";

import {
    addTaskFormSchema,
    createSubtaskInputSchema,
    createTaskInputSchema,
    createTaskSubtasksInputSchema,
    deleteSubtaskInputSchema,
    deleteTaskInputSchema,
    editTaskFormSchema,
    moveTaskInputSchema,
    subtaskTitleRowSchema,
    updateSubtaskInputSchema,
    updateTaskInputSchema,
} from "@/features/tasks/schemas";

/** The one shape every case below varies a single field of, so a rejection names its own cause. */
const createValidMoveInput = () => ({
    taskId: "00000000-0000-4000-8000-00000000000b",
    targetColumnId: "00000000-0000-4000-8000-00000000000c",
    version: 0,
    targetPosition: 2,
});

describe("moveTaskInputSchema", () => {
    it("accepts a well-formed move and yields typed data", () => {
        // Arrange
        const input = createValidMoveInput();

        // Act
        const result = moveTaskInputSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data).toEqual(input);
    });

    /* T3 observed the destination's own first slot is a legal target, so the floor must admit it. */
    it("accepts the destination column's first slot", () => {
        // Act
        const result = moveTaskInputSchema.safeParse({ ...createValidMoveInput(), targetPosition: 0 });

        // Assert
        expect(result.success).toBe(true);
    });

    it("rejects an empty task id", () => {
        // Act
        const result = moveTaskInputSchema.safeParse({ ...createValidMoveInput(), taskId: "" });

        // Assert
        expect(result.success).toBe(false);
    });

    it("rejects an empty target column id", () => {
        // Act
        const result = moveTaskInputSchema.safeParse({ ...createValidMoveInput(), targetColumnId: "" });

        // Assert
        expect(result.success).toBe(false);
    });

    /* The floor `MoveTaskRequestDTO` declares — a forged negative index is stopped here, not upstream. */
    it("rejects a negative target position", () => {
        // Act
        const result = moveTaskInputSchema.safeParse({ ...createValidMoveInput(), targetPosition: -1 });

        // Assert
        expect(result.success).toBe(false);
    });

    it("rejects a fractional target position", () => {
        // Act
        const result = moveTaskInputSchema.safeParse({ ...createValidMoveInput(), targetPosition: 1.5 });

        // Assert
        expect(result.success).toBe(false);
    });

    it("rejects a fractional version", () => {
        // Act
        const result = moveTaskInputSchema.safeParse({ ...createValidMoveInput(), version: 0.5 });

        // Assert
        expect(result.success).toBe(false);
    });

    it("rejects a version sent as a string", () => {
        // Act
        const result = moveTaskInputSchema.safeParse({ ...createValidMoveInput(), version: "0" });

        // Assert
        expect(result.success).toBe(false);
    });

    it("rejects a payload missing its target column entirely", () => {
        // Arrange
        const { targetColumnId: _targetColumnId, ...rest } = createValidMoveInput();

        // Act
        const result = moveTaskInputSchema.safeParse(rest);

        // Assert
        expect(result.success).toBe(false);
    });
});

const createValidTaskInput = () => ({
    boardId: "00000000-0000-4000-8000-00000000000a",
    columnId: "00000000-0000-4000-8000-00000000000c",
    title: "Take coffee break",
    description: "Recharge for fifteen minutes",
});

describe("createTaskInputSchema", () => {
    it("accepts a well-formed create and yields typed data", () => {
        // Arrange
        const input = createValidTaskInput();

        // Act
        const result = createTaskInputSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data).toEqual(input);
    });

    /* Pipes through taskTitleRowSchema — TASK-01's own required-field copy, not re-derived here. */
    it("reports the required-field message for a blank title", () => {
        // Act
        const result = createTaskInputSchema.safeParse({ ...createValidTaskInput(), title: "" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.success || result.error.issues[0]?.message).toBe("Can't be empty");
    });

    it("reports the length message for a 2-character title", () => {
        // Act
        const result = createTaskInputSchema.safeParse({ ...createValidTaskInput(), title: "Do" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.success || result.error.issues[0]?.message).toBe(
            "Task title must be between 3 and 32 characters.",
        );
    });

    /* T9: the backend refuses an explicit `""` description (400) — this app never sends one. */
    it("normalises a blank description to undefined", () => {
        // Act
        const result = createTaskInputSchema.safeParse({ ...createValidTaskInput(), description: "" });

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data.description).toBeUndefined();
    });

    it("accepts a payload with no description at all", () => {
        // Arrange
        const { description: _description, ...rest } = createValidTaskInput();

        // Act
        const result = createTaskInputSchema.safeParse(rest);

        // Assert
        expect(result.success).toBe(true);
    });

    it("rejects an empty column id", () => {
        // Act
        const result = createTaskInputSchema.safeParse({ ...createValidTaskInput(), columnId: "" });

        // Assert
        expect(result.success).toBe(false);
    });
});

describe("subtaskTitleRowSchema", () => {
    it("reports the required-field message for a blank subtask title", () => {
        // Act
        const empty = subtaskTitleRowSchema.safeParse("");
        const whitespace = subtaskTitleRowSchema.safeParse("   ");

        // Assert
        expect(empty.success).toBe(false);
        expect(empty.error?.issues[0]?.message).toBe("Can't be empty");
        expect(whitespace.success).toBe(false);
    });

    /* SaveSubtaskRequestDTO declares no maximum on create — only the required-field floor applies. */
    it("accepts a one-character subtask title", () => {
        // Act
        const result = subtaskTitleRowSchema.safeParse("x");

        // Assert
        expect(result.success).toBe(true);
    });

    it("accepts a subtask title far longer than a task title would allow", () => {
        // Act
        const result = subtaskTitleRowSchema.safeParse("x".repeat(64));

        // Assert
        expect(result.success).toBe(true);
    });
});

describe("createSubtaskInputSchema", () => {
    const createValidSubtaskInput = () => ({
        boardId: "00000000-0000-4000-8000-00000000000a",
        columnId: "00000000-0000-4000-8000-00000000000c",
        taskId: "00000000-0000-4000-8000-00000000000d",
        title: "Make coffee",
    });

    it("accepts a well-formed subtask create", () => {
        // Act
        const result = createSubtaskInputSchema.safeParse(createValidSubtaskInput());

        // Assert
        expect(result.success).toBe(true);
    });

    it("rejects an empty task id", () => {
        // Act
        const result = createSubtaskInputSchema.safeParse({ ...createValidSubtaskInput(), taskId: "" });

        // Assert
        expect(result.success).toBe(false);
    });
});

describe("createTaskSubtasksInputSchema", () => {
    const createValidFanOutInput = () => ({
        boardId: "00000000-0000-4000-8000-00000000000a",
        columnId: "00000000-0000-4000-8000-00000000000c",
        taskId: "00000000-0000-4000-8000-00000000000d",
        titles: ["Make coffee", "Drink coffee & smile"],
    });

    it("accepts a well-formed fan-out payload, including an empty titles array", () => {
        // Act
        const withTitles = createTaskSubtasksInputSchema.safeParse(createValidFanOutInput());
        const withNone = createTaskSubtasksInputSchema.safeParse({ ...createValidFanOutInput(), titles: [] });

        // Assert
        expect(withTitles.success).toBe(true);
        expect(withNone.success).toBe(true);
    });

    /* T-04-04: the boundary cap mirrors createBoardColumnsInputSchema's own — no call is made past it. */
    it("rejects a titles array over the fifty-item cap", () => {
        // Act
        const result = createTaskSubtasksInputSchema.safeParse({
            ...createValidFanOutInput(),
            titles: Array.from({ length: 51 }, (_, index) => `Subtask ${String(index)}`),
        });

        // Assert
        expect(result.success).toBe(false);
    });

    it("accepts a titles array at exactly the fifty-item cap", () => {
        // Act
        const result = createTaskSubtasksInputSchema.safeParse({
            ...createValidFanOutInput(),
            titles: Array.from({ length: 50 }, (_, index) => `Subtask ${String(index)}`),
        });

        // Assert
        expect(result.success).toBe(true);
    });
});

describe("updateSubtaskInputSchema", () => {
    const createValidUpdateInput = () => ({
        boardId: "00000000-0000-4000-8000-00000000000a",
        columnId: "00000000-0000-4000-8000-00000000000c",
        taskId: "00000000-0000-4000-8000-00000000000d",
        subtaskId: "00000000-0000-4000-8000-00000000000e",
        version: 0,
    });

    /* The toggle's own payload — only `isCompleted`, no `title` at all. */
    it("accepts a completion-only payload", () => {
        // Act
        const result = updateSubtaskInputSchema.safeParse({ ...createValidUpdateInput(), isCompleted: true });

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data.title).toBeUndefined();
    });

    /* The rename's own payload — only `title`, no `isCompleted` at all. */
    it("accepts a title-only payload", () => {
        // Act
        const result = updateSubtaskInputSchema.safeParse({ ...createValidUpdateInput(), title: "Renamed" });

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data.isCompleted).toBeUndefined();
    });

    it("rejects an empty subtask id", () => {
        // Act
        const result = updateSubtaskInputSchema.safeParse({ ...createValidUpdateInput(), subtaskId: "" });

        // Assert
        expect(result.success).toBe(false);
    });

    it("rejects a blank title when one is supplied", () => {
        // Act
        const result = updateSubtaskInputSchema.safeParse({ ...createValidUpdateInput(), title: "" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.success || result.error.issues[0]?.message).toBe("Can't be empty");
    });

    it("rejects a fractional version", () => {
        // Act
        const result = updateSubtaskInputSchema.safeParse({ ...createValidUpdateInput(), version: 0.5 });

        // Assert
        expect(result.success).toBe(false);
    });
});

describe("deleteSubtaskInputSchema", () => {
    const createValidDeleteInput = () => ({
        boardId: "00000000-0000-4000-8000-00000000000a",
        columnId: "00000000-0000-4000-8000-00000000000c",
        taskId: "00000000-0000-4000-8000-00000000000d",
        subtaskId: "00000000-0000-4000-8000-00000000000e",
    });

    it("accepts a well-formed delete and yields typed data", () => {
        // Arrange
        const input = createValidDeleteInput();

        // Act
        const result = deleteSubtaskInputSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data).toEqual(input);
    });

    it("rejects an empty subtask id", () => {
        // Act
        const result = deleteSubtaskInputSchema.safeParse({ ...createValidDeleteInput(), subtaskId: "" });

        // Assert
        expect(result.success).toBe(false);
    });
});

describe("updateTaskInputSchema", () => {
    const createValidUpdateInput = () => ({
        boardId: "00000000-0000-4000-8000-00000000000a",
        columnId: "00000000-0000-4000-8000-00000000000c",
        taskId: "00000000-0000-4000-8000-00000000000b",
        version: 0,
        title: "Take coffee break",
        description: "Recharge for fifteen minutes",
    });

    it("accepts a well-formed update and yields typed data", () => {
        // Arrange
        const input = createValidUpdateInput();

        // Act
        const result = updateTaskInputSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data).toEqual(input);
    });

    /* RESEARCH Pitfall 4/T-04-23: piped through taskTitleRowSchema, same as the create path. */
    it("reports the required-field message for a blank title", () => {
        // Act
        const result = updateTaskInputSchema.safeParse({ ...createValidUpdateInput(), title: "" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.success || result.error.issues[0]?.message).toBe("Can't be empty");
    });

    /* The update DTO declares NO bounds at all — the client re-enforces them regardless. */
    it("reports the length message for a 2-character title", () => {
        // Act
        const result = updateTaskInputSchema.safeParse({ ...createValidUpdateInput(), title: "Do" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.success || result.error.issues[0]?.message).toBe(
            "Task title must be between 3 and 32 characters.",
        );
    });

    it("reports the length message for a 33-character title", () => {
        // Act
        const result = updateTaskInputSchema.safeParse({ ...createValidUpdateInput(), title: "x".repeat(33) });

        // Assert
        expect(result.success).toBe(false);
        expect(result.success || result.error.issues[0]?.message).toBe(
            "Task title must be between 3 and 32 characters.",
        );
    });

    /* T9: clearing a description round-trips to the same absent value the read normalises to. */
    it("normalises a blank description to undefined", () => {
        // Act
        const result = updateTaskInputSchema.safeParse({ ...createValidUpdateInput(), description: "" });

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data.description).toBeUndefined();
    });

    it("rejects a fractional version", () => {
        // Act
        const result = updateTaskInputSchema.safeParse({ ...createValidUpdateInput(), version: 0.5 });

        // Assert
        expect(result.success).toBe(false);
    });

    it("rejects an empty task id", () => {
        // Act
        const result = updateTaskInputSchema.safeParse({ ...createValidUpdateInput(), taskId: "" });

        // Assert
        expect(result.success).toBe(false);
    });
});

describe("deleteTaskInputSchema", () => {
    const createValidDeleteInput = () => ({
        boardId: "00000000-0000-4000-8000-00000000000a",
        columnId: "00000000-0000-4000-8000-00000000000c",
        taskId: "00000000-0000-4000-8000-00000000000d",
    });

    it("accepts a well-formed delete and yields typed data", () => {
        // Arrange
        const input = createValidDeleteInput();

        // Act
        const result = deleteTaskInputSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data).toEqual(input);
    });

    it("rejects an empty task id", () => {
        // Act
        const result = deleteTaskInputSchema.safeParse({ ...createValidDeleteInput(), taskId: "" });

        // Assert
        expect(result.success).toBe(false);
    });

    it("rejects a payload missing its column id entirely", () => {
        // Arrange
        const { columnId: _columnId, ...rest } = createValidDeleteInput();

        // Act
        const result = deleteTaskInputSchema.safeParse(rest);

        // Assert
        expect(result.success).toBe(false);
    });
});

describe("editTaskFormSchema", () => {
    it("accepts a well-formed form", () => {
        // Act
        const result = editTaskFormSchema.safeParse({ title: "Take coffee break", description: "" });

        // Assert
        expect(result.success).toBe(true);
    });

    it("reports the required-field message for a blank title", () => {
        // Act
        const result = editTaskFormSchema.safeParse({ title: "", description: "" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.success || result.error.issues[0]?.message).toBe("Can't be empty");
    });

    it("reports the length message for a 2-character title", () => {
        // Act
        const result = editTaskFormSchema.safeParse({ title: "Do", description: "" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.success || result.error.issues[0]?.message).toBe(
            "Task title must be between 3 and 32 characters.",
        );
    });
});

describe("addTaskFormSchema", () => {
    const createValidFormInput = () => ({
        title: "Take coffee break",
        description: "",
        columnId: "00000000-0000-4000-8000-00000000000c",
        subtasks: [{ value: "Make coffee" }, { value: "" }],
    });

    /*
     * Reversed 2026-09-03 by the product owner, who submitted a task carrying a blank subtask row
     * and reported it as a defect: a blank row is a user error to correct, not input to drop.
     */
    it("reports the required-field message for a blank subtask row", () => {
        // Act
        const result = addTaskFormSchema.safeParse(createValidFormInput());

        // Assert
        expect(result.success).toBe(false);
        expect(result.success || result.error.issues[0]?.message).toBe("Can't be empty");
    });

    it("reports the required-field message for a whitespace-only subtask row", () => {
        // Act
        const result = addTaskFormSchema.safeParse({ ...createValidFormInput(), subtasks: [{ value: "   " }] });

        // Assert
        expect(result.success).toBe(false);
        expect(result.success || result.error.issues[0]?.message).toBe("Can't be empty");
    });

    it("accepts a form whose subtask rows all carry a title", () => {
        // Act
        const result = addTaskFormSchema.safeParse({
            ...createValidFormInput(),
            subtasks: [{ value: "Make coffee" }, { value: "Drink coffee" }],
        });

        // Assert
        expect(result.success).toBe(true);
    });

    it("reports the required-field message for a blank title", () => {
        // Act
        const result = addTaskFormSchema.safeParse({ ...createValidFormInput(), title: "" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.success || result.error.issues[0]?.message).toBe("Can't be empty");
    });

    /* The create endpoint is column-scoped, so a destination must always be chosen. */
    it("reports the required-field message for a blank column id", () => {
        // Act
        const result = addTaskFormSchema.safeParse({ ...createValidFormInput(), columnId: "" });

        // Assert
        expect(result.success).toBe(false);
        expect(result.success || result.error.issues[0]?.message).toBe("Can't be empty");
    });

    it("accepts an empty row list — removing both seeded rows is legal", () => {
        // Act
        const result = addTaskFormSchema.safeParse({ ...createValidFormInput(), subtasks: [] });

        // Assert
        expect(result.success).toBe(true);
    });
});
