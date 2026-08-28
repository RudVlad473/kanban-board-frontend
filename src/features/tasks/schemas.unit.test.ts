import { describe, expect, it } from "vitest";

import { moveTaskInputSchema } from "@/features/tasks/schemas";

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
