import { describe, expect, it } from "vitest";

import {
    boardNameSchema,
    boardsSchema,
    columnNameRowSchema,
    columnNameSchema,
    createBoardColumnsInputSchema,
    createBoardInputSchema,
} from "@/features/boards/schemas";
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

/*
 * The bounds mirror the backend's own enforced rule verbatim — 3 to 32 characters, quoted from its
 * rejection message in 02-BACKEND-FACTS.md P6.
 */
describe("columnNameSchema", () => {
    it("rejects a two-character name", () => {
        // Act & Assert
        expect(columnNameSchema.safeParse("To").success).toBe(false);
    });

    it("accepts a three-character name", () => {
        // Act & Assert
        expect(columnNameSchema.safeParse("Fix").success).toBe(true);
    });

    it("accepts a thirty-two-character name and rejects a thirty-three-character one", () => {
        // Act & Assert
        expect(columnNameSchema.safeParse("a".repeat(32)).success).toBe(true);
        expect(columnNameSchema.safeParse("a".repeat(33)).success).toBe(false);
    });

    it("rejects an empty and a whitespace-only name", () => {
        // Act & Assert
        expect(columnNameSchema.safeParse("").success).toBe(false);
        expect(columnNameSchema.safeParse("   ").success).toBe(false);
    });
});

/*
 * Deliberately a separate export from `columnNameSchema`, not a relaxation of it: a form row may be
 * blank (D-02), but a name that actually gets sent may not. Collapsing the two re-blocks blank rows.
 */
describe("columnNameRowSchema", () => {
    it("accepts an empty and a whitespace-only row", () => {
        // Act & Assert
        expect(columnNameRowSchema.safeParse("").success).toBe(true);
        expect(columnNameRowSchema.safeParse("   ").success).toBe(true);
    });

    it("still rejects a two-character row and accepts a three-character one", () => {
        // Act & Assert
        expect(columnNameRowSchema.safeParse("To").success).toBe(false);
        expect(columnNameRowSchema.safeParse("Fix").success).toBe(true);
    });

    it("rejects a thirty-three-character row", () => {
        // Act & Assert
        expect(columnNameRowSchema.safeParse("a".repeat(33)).success).toBe(false);
    });
});

describe("createBoardColumnsInputSchema", () => {
    it("accepts a non-empty board id with an ordered name array", () => {
        // Act
        const result = createBoardColumnsInputSchema.safeParse({ boardId: "8okxhwo6oq2o", names: ["Todo", "Done"] });

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data.names).toEqual(["Todo", "Done"]);
    });

    it("rejects an empty board id", () => {
        // Act & Assert
        expect(createBoardColumnsInputSchema.safeParse({ boardId: "", names: ["Todo"] }).success).toBe(false);
    });

    /*
     * T-02-46: the array length is capped so an unbounded loop can never be driven from a forged
     * wire payload.
     */
    it("rejects an array longer than the cap", () => {
        // Arrange
        const tooMany = Array.from({ length: 51 }, (_, index) => `Column ${String(index)}`);

        // Act & Assert
        expect(createBoardColumnsInputSchema.safeParse({ boardId: "board-id", names: tooMany }).success).toBe(false);
    });
});
