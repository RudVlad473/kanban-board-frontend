import { describe, expect, it } from "vitest";

import { boardNameSchema, boardsSchema, createBoardInputSchema } from "@/features/boards/schemas";
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

describe("boardNameSchema", () => {
    it("rejects an empty name with the Copywriting Contract's empty-field message", () => {
        // Act
        const result = boardNameSchema.safeParse("");

        // Assert
        expect(result.success).toBe(false);
        expect(!result.success && result.error.issues[0]?.message).toBe("Can't be empty");
    });

    it("rejects a whitespace-only name as empty rather than accepting it", () => {
        // Act
        const result = boardNameSchema.safeParse("   ");

        // Assert
        expect(result.success).toBe(false);
        expect(!result.success && result.error.issues[0]?.message).toBe("Can't be empty");
    });

    it("accepts a single-character name", () => {
        // Act
        const result = boardNameSchema.safeParse("A");

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data).toBe("A");
    });

    /*
     * 02-BACKEND-FACTS.md P4 proved the backend rejects a 1000-character name; the client bound is
     * deliberately conservative, so this stays a rejection either way.
     */
    it("rejects a 1000-character name", () => {
        // Act
        const result = boardNameSchema.safeParse("a".repeat(1000));

        // Assert
        expect(result.success).toBe(false);
    });
});

describe("createBoardInputSchema", () => {
    it("yields the trimmed name for a well-formed input", () => {
        // Act
        const result = createBoardInputSchema.safeParse({ name: "  Platform Launch  " });

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data.name).toBe("Platform Launch");
    });

    it("rejects an input whose name is missing", () => {
        // Act
        const result = createBoardInputSchema.safeParse({});

        // Assert
        expect(result.success).toBe(false);
    });

    /*
     * A Server Action is callable over the wire with any payload — an unrelated `userId` field is
     * simply not part of the parsed output, so it can never reach the upstream call (T-02-43).
     */
    it("drops an unrelated userId supplied alongside the name", () => {
        // Act
        const result = createBoardInputSchema.safeParse({ name: "Platform Launch", userId: "someone-else" });

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data).toEqual({ name: "Platform Launch" });
    });
});
