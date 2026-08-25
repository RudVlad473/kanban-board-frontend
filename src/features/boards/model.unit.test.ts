import { describe, expect, it } from "vitest";

import {
    buildColumnRowPath,
    createEmptyColumnRows,
    DEFAULT_COLUMN_ROW_COUNT,
    removeBoard,
    resolveDestinationAfterDelete,
    toSubmittedColumnNames,
} from "@/features/boards/model";
import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";
import { createBoards } from "@/test-utils/factories/board";

describe("toSubmittedColumnNames", () => {
    it("returns the trimmed rows in the order given", () => {
        // Act
        const names = toSubmittedColumnNames(["  Todo ", "Doing", " Done"]);

        // Assert
        expect(names).toEqual(["Todo", "Doing", "Done"]);
    });

    /*
     * D-02a: a blank row is blocked at validation, so one reaching here is a real name the user
     * can see on screen — dropping it would understate what the create attempted.
     */
    it("keeps a blank row rather than dropping it", () => {
        // Act
        const names = toSubmittedColumnNames(["Todo", "  ", "Done"]);

        // Assert
        expect(names).toEqual(["Todo", "", "Done"]);
    });

    /* D-02a keeps 0 rows valid: removing every row still creates a board with no columns. */
    it("returns an empty array when there are no rows at all", () => {
        // Act
        const names = toSubmittedColumnNames([]);

        // Assert
        expect(names).toEqual([]);
    });
});

describe("createEmptyColumnRows", () => {
    it("returns exactly the requested number of empty rows", () => {
        // Act
        const rows = createEmptyColumnRows(3);

        // Assert
        expect(rows).toEqual([{ value: "" }, { value: "" }, { value: "" }]);
    });

    it("returns no rows for a count of zero", () => {
        // Act
        const rows = createEmptyColumnRows(0);

        // Assert
        expect(rows).toEqual([]);
    });

    /* D-01a: the form opens with one row, never zero and never several. */
    it("returns a single row at the form's own default count", () => {
        // Act
        const rows = createEmptyColumnRows(DEFAULT_COLUMN_ROW_COUNT);

        // Assert
        expect(rows).toHaveLength(1);
    });

    it("returns rows that are distinct objects, so editing one never edits another", () => {
        // Arrange
        const rows = createEmptyColumnRows(2);

        // Act
        rows[0].value = "Todo";

        // Assert
        expect(rows[1].value).toBe("");
    });
});

describe("buildColumnRowPath", () => {
    it("returns the React Hook Form field path for a given row index", () => {
        // Act & Assert
        expect(buildColumnRowPath(0)).toBe("columns.0.value");
        expect(buildColumnRowPath(4)).toBe("columns.4.value");
    });
});

describe("removeBoard", () => {
    it("returns a new array without the named board, leaving the rest in order", () => {
        // Arrange
        const boards = createBoards(3);

        // Act
        const remaining = removeBoard({ boards, boardId: boards[1].id });

        // Assert
        expect(remaining).toEqual([boards[0], boards[2]]);
        expect(remaining).not.toBe(boards);
        expect(boards).toHaveLength(3);
    });

    it("returns an equivalent list when the id names no board in it", () => {
        // Arrange
        const boards = createBoards(2);

        // Act & Assert
        expect(removeBoard({ boards, boardId: "no-such-board" })).toEqual(boards);
    });

    it("tolerates an empty input array", () => {
        // Act & Assert
        expect(removeBoard({ boards: [], boardId: "anything" })).toEqual([]);
    });
});

/* D-08's three branches, each assertable here rather than through a router. */
describe("resolveDestinationAfterDelete", () => {
    it("returns the first remaining board's path when the deleted board was the one being viewed", () => {
        // Arrange
        const boards = createBoards(3);
        const [deleted, ...remainingBoards] = boards;

        // Act
        const destination = resolveDestinationAfterDelete({
            remainingBoards,
            deletedBoardId: deleted.id,
            currentBoardId: deleted.id,
        });

        // Assert — the top of the sidebar's own newest-first order, not a re-sorted one.
        expect(destination).toBe(buildBoardDetailPath(remainingBoards[0].id));
    });

    it("returns the board-list path when the deleted board was the one being viewed and none remain", () => {
        // Arrange
        const [only] = createBoards(1);

        // Act
        const destination = resolveDestinationAfterDelete({
            remainingBoards: [],
            deletedBoardId: only.id,
            currentBoardId: only.id,
        });

        // Assert
        expect(destination).toBe(ROUTE.BOARDS);
    });

    it("returns nothing when the deleted board was not the one being viewed", () => {
        // Arrange
        const boards = createBoards(3);

        // Act & Assert
        expect(
            resolveDestinationAfterDelete({
                remainingBoards: [boards[0], boards[2]],
                deletedBoardId: boards[1].id,
                currentBoardId: boards[0].id,
            }),
        ).toBeNull();
    });

    it("returns nothing when no board is being viewed at all", () => {
        // Arrange
        const boards = createBoards(2);

        // Act & Assert
        expect(
            resolveDestinationAfterDelete({
                remainingBoards: [boards[1]],
                deletedBoardId: boards[0].id,
                currentBoardId: null,
            }),
        ).toBeNull();
    });
});
