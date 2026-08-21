import { describe, expect, it } from "vitest";

import { boardsSchema } from "@/features/boards/schemas";
import { createBoard, createBoards } from "@/test-utils/factories/board";

describe("boardsSchema", () => {
    it("accepts a well-formed board array and yields typed data", () => {
        // Arrange
        const boards = createBoards(2);

        // Act
        const result = boardsSchema.safeParse(boards);

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data).toEqual(boards);
    });

    it("accepts an empty array", () => {
        // Arrange
        const boards: unknown[] = [];

        // Act
        const result = boardsSchema.safeParse(boards);

        // Assert
        expect(result.success).toBe(true);
    });

    it("rejects a payload whose version is a string", () => {
        // Arrange
        const malformed = [{ ...createBoard(), version: "0" }];

        // Act
        const result = boardsSchema.safeParse(malformed);

        // Assert
        expect(result.success).toBe(false);
    });

    it("rejects a payload missing id", () => {
        // Arrange
        const { id: _id, ...rest } = createBoard();
        const malformed = [rest];

        // Act
        const result = boardsSchema.safeParse(malformed);

        // Assert
        expect(result.success).toBe(false);
    });

    it("rejects a value that is not an array", () => {
        // Arrange
        const notAnArray = createBoard();

        // Act
        const result = boardsSchema.safeParse(notAnArray);

        // Assert
        expect(result.success).toBe(false);
    });
});
