import { describe, expect, it } from "vitest";

import { createSubtask, createTaskFull } from "@/test-utils/factories/board-full";

import { subtaskSchema, taskFullSchema, taskSchema, taskTitleRowSchema, taskTitleSchema } from "./task-schemas";

describe("subtaskSchema", () => {
    it("accepts a well-formed subtask and yields typed data", () => {
        // Arrange
        const subtask = createSubtask();

        // Act
        const result = subtaskSchema.safeParse(subtask);

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data).toEqual(subtask);
    });

    it("rejects a subtask missing its completion flag", () => {
        // Arrange
        const { isCompleted: _isCompleted, ...withoutFlag } = createSubtask();

        // Act & Assert
        expect(subtaskSchema.safeParse(withoutFlag).success).toBe(false);
    });
});

describe("taskFullSchema", () => {
    it("rejects a task holding a malformed subtask", () => {
        // Act & Assert
        expect(
            taskFullSchema.safeParse({ ...createTaskFull(), subtasks: [{ id: "s1", title: "Subtask", version: 0 }] })
                .success,
        ).toBe(false);
    });

    /* The contract declares `description` optional, so its absence is well-formed, not malformed. */
    it("accepts a task with no description", () => {
        // Arrange
        const { description: _description, ...withoutDescription } = createTaskFull();

        // Act
        const result = taskFullSchema.safeParse(withoutDescription);

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data.description).toBeUndefined();
    });

    /* Pinned against the backend's own observed answer: it sends `null`, not an absent key (03-12). */
    it("accepts a task whose description came back as an explicit null, and normalises it away", () => {
        // Act
        const result = taskFullSchema.safeParse({ ...createTaskFull(), description: null });

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data.description).toBeUndefined();
    });

    it("accepts a task with an empty subtask array", () => {
        // Act & Assert
        expect(taskFullSchema.safeParse(createTaskFull({ subtasks: [] })).success).toBe(true);
    });
});

/*
 * RESEARCH Pitfall 3: `TaskResponseDTO` returns no `subtasks`, so parsing a create/update/move
 * response with `taskFullSchema` would fail on every successful call.
 */
describe("taskSchema", () => {
    it("accepts a response-shaped task with no subtasks key, which taskFullSchema refuses", () => {
        // Arrange
        const { subtasks: _subtasks, ...taskResponse } = createTaskFull();

        // Act
        const result = taskSchema.safeParse(taskResponse);

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data).toEqual(taskResponse);
        expect(taskFullSchema.safeParse(taskResponse).success).toBe(false);
    });

    it("drops a subtasks array supplied alongside the response fields", () => {
        // Act
        const result = taskSchema.safeParse(createTaskFull());

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && "subtasks" in result.data).toBe(false);
    });
});

/*
 * RESEARCH Pitfall 4: `SaveTaskRequestDTO` bounds the title 3-32 while `UpdateTaskRequestDTO`
 * declares none at all, so these bounds are the only thing stopping an unsavable title on edit.
 */
describe("taskTitleSchema", () => {
    it("rejects a two-character title and accepts a three-character one", () => {
        // Act & Assert
        expect(taskTitleSchema.safeParse("Do").success).toBe(false);
        expect(taskTitleSchema.safeParse("Fix").success).toBe(true);
    });

    it("accepts a thirty-two-character title and rejects a thirty-three-character one", () => {
        // Act & Assert
        expect(taskTitleSchema.safeParse("a".repeat(32)).success).toBe(true);
        expect(taskTitleSchema.safeParse("a".repeat(33)).success).toBe(false);
    });

    it("reports the length copy on either side of the bound", () => {
        // Act
        const tooShort = taskTitleSchema.safeParse("Do");
        const tooLong = taskTitleSchema.safeParse("a".repeat(33));

        // Assert
        expect(tooShort.error?.issues[0]?.message).toBe("Task title must be between 3 and 32 characters.");
        expect(tooLong.error?.issues[0]?.message).toBe("Task title must be between 3 and 32 characters.");
    });

    it("yields the trimmed title", () => {
        // Act
        const result = taskTitleSchema.safeParse("  Build UI  ");

        // Assert
        expect(result.success && result.data).toBe("Build UI");
    });
});

/*
 * Deliberately a separate export from `taskTitleSchema`, mirroring `columnNameRowSchema`: a blank
 * field is a user error to correct and earns the required-field copy, never the length copy.
 */
describe("taskTitleRowSchema", () => {
    it("rejects an empty and a whitespace-only title with the required-field copy", () => {
        // Act
        const empty = taskTitleRowSchema.safeParse("");
        const whitespace = taskTitleRowSchema.safeParse("   ");

        // Assert
        expect(empty.success).toBe(false);
        expect(empty.error?.issues[0]?.message).toBe("Can't be empty");
        expect(whitespace.error?.issues[0]?.message).toBe("Can't be empty");
    });

    it("reports the length copy, not the required copy, for a two-character title", () => {
        // Act
        const tooShort = taskTitleRowSchema.safeParse("Do");

        // Assert
        expect(tooShort.success).toBe(false);
        expect(tooShort.error?.issues[0]?.message).toBe("Task title must be between 3 and 32 characters.");
        expect(taskTitleRowSchema.safeParse("Fix").success).toBe(true);
    });

    it("rejects a thirty-three-character title", () => {
        // Act & Assert
        expect(taskTitleRowSchema.safeParse("a".repeat(33)).success).toBe(false);
    });
});
