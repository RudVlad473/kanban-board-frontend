import { describe, expect, it } from "vitest";

import {
    boardFullSchema,
    boardNameSchema,
    boardsSchema,
    columnFullSchema,
    columnNameRowSchema,
    columnNameSchema,
    createBoardColumnsInputSchema,
    createBoardInputSchema,
    renameBoardInputSchema,
    taskFullSchema,
} from "@/features/boards/schemas";
import { createBoard, createBoards } from "@/test-utils/factories/board";
import { createBoardFull, createColumnFull, createTaskFull } from "@/test-utils/factories/board-full";

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

/*
 * The containment hierarchy is composed level by level precisely so a malformed nested payload is
 * rejected outright rather than partially rendered (T-02-52) — each case drives one level.
 */
describe("boardFullSchema", () => {
    it("accepts a well-formed full board and yields typed data", () => {
        // Arrange
        const board = createBoardFull();

        // Act
        const result = boardFullSchema.safeParse(board);

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data).toEqual(board);
    });

    it("accepts a board with no columns", () => {
        // Act & Assert
        expect(boardFullSchema.safeParse(createBoardFull({ columns: [] })).success).toBe(true);
    });

    it("rejects a board whose columns field is absent", () => {
        // Arrange
        const { columns: _columns, ...withoutColumns } = createBoardFull();

        // Act & Assert
        expect(boardFullSchema.safeParse(withoutColumns).success).toBe(false);
    });

    it("rejects a board whose columns field is not an array", () => {
        // Act & Assert
        expect(boardFullSchema.safeParse({ ...createBoardFull(), columns: createColumnFull() }).success).toBe(false);
    });

    it("rejects a board holding a malformed column", () => {
        // Arrange
        const { name: _name, ...columnWithoutName } = createColumnFull();

        // Act & Assert
        expect(boardFullSchema.safeParse({ ...createBoardFull(), columns: [columnWithoutName] }).success).toBe(false);
    });
});

describe("columnFullSchema", () => {
    it("rejects a column holding a malformed task", () => {
        // Arrange
        const { title: _title, ...taskWithoutTitle } = createTaskFull();

        // Act & Assert
        expect(columnFullSchema.safeParse({ ...createColumnFull(), tasks: [taskWithoutTitle] }).success).toBe(false);
    });

    it("rejects a column whose tasks field is absent", () => {
        // Arrange
        const { tasks: _tasks, ...withoutTasks } = createColumnFull();

        // Act & Assert
        expect(columnFullSchema.safeParse(withoutTasks).success).toBe(false);
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
 * Deliberately a separate export from `columnNameSchema`, not a relaxation of it: a blank row is a
 * user error to correct (D-02a) and earns the required-field copy, not the length copy.
 */
describe("columnNameRowSchema", () => {
    it("rejects an empty and a whitespace-only row with the required-field copy", () => {
        // Act
        const empty = columnNameRowSchema.safeParse("");
        const whitespace = columnNameRowSchema.safeParse("   ");

        // Assert
        expect(empty.success).toBe(false);
        expect(empty.error?.issues[0]?.message).toBe("Can't be empty");
        expect(whitespace.error?.issues[0]?.message).toBe("Can't be empty");
    });

    it("reports the length copy, not the required copy, for a two-character row", () => {
        // Act
        const tooShort = columnNameRowSchema.safeParse("To");

        // Assert
        expect(tooShort.success).toBe(false);
        expect(tooShort.error?.issues[0]?.message).toBe("Column name must be between 3 and 32 characters.");
        expect(columnNameRowSchema.safeParse("Fix").success).toBe(true);
    });

    it("rejects a thirty-three-character row", () => {
        // Act & Assert
        expect(columnNameRowSchema.safeParse("a".repeat(33)).success).toBe(false);
    });
});

describe("renameBoardInputSchema", () => {
    it("accepts a board id, an integer version and a valid name", () => {
        // Act
        const result = renameBoardInputSchema.safeParse({
            boardId: "8okxhwo6oq2o",
            name: "Platform Launch",
            version: 3,
        });

        // Assert
        expect(result.success).toBe(true);
        expect(result.success && result.data.version).toBe(3);
    });

    /*
     * The update body declares `version` required while the create body has no such field, so an
     * input missing it must fail here rather than upstream (02-RESEARCH.md Pitfall 1).
     */
    it("rejects an input with no version at all", () => {
        // Act & Assert
        expect(renameBoardInputSchema.safeParse({ boardId: "8okxhwo6oq2o", name: "Platform Launch" }).success).toBe(
            false,
        );
    });

    it("rejects a non-integer version", () => {
        // Act & Assert
        expect(
            renameBoardInputSchema.safeParse({ boardId: "8okxhwo6oq2o", name: "Platform Launch", version: 1.5 })
                .success,
        ).toBe(false);
    });

    it("rejects an empty board id", () => {
        // Act & Assert
        expect(renameBoardInputSchema.safeParse({ boardId: "", name: "Platform Launch", version: 0 }).success).toBe(
            false,
        );
    });

    it("reports the required-field copy for a blank name", () => {
        // Act
        const result = renameBoardInputSchema.safeParse({ boardId: "8okxhwo6oq2o", name: "   ", version: 0 });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe("Can't be empty");
    });

    it("rejects a name past the board-name ceiling", () => {
        // Act & Assert
        expect(
            renameBoardInputSchema.safeParse({ boardId: "8okxhwo6oq2o", name: "a".repeat(101), version: 0 }).success,
        ).toBe(false);
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
