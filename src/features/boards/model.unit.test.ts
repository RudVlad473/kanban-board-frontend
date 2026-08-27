import type { Active, Over } from "@dnd-kit/core";
import { describe, expect, it } from "vitest";

import {
    applyColumnOrderOverride,
    createColumnReorderAnnouncements,
    buildColumnRowPath,
    COLUMN_COUNT_NUDGE_THRESHOLD,
    COLUMN_DOT_TOKENS,
    createEmptyColumnRows,
    DEFAULT_COLUMN_ROW_COUNT,
    removeBoard,
    reorderColumns,
    resolveDestinationAfterDelete,
    shouldNudgeOnColumnCount,
    toColumnDotToken,
    toReorderTargetPosition,
    toSubmittedColumnNames,
} from "@/features/boards/model";
import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";
import { createBoards } from "@/test-utils/factories/board";
import { createColumnsFull } from "@/test-utils/factories/board-full";

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

/* U-03: the contract carries no colour field, so the dot's hue derives from the column's own id. */
describe("toColumnDotToken", () => {
    it("returns the same accent every time for the same id", () => {
        // Act & Assert
        expect(toColumnDotToken({ id: "8p9ekduj9uyo" })).toBe(toColumnDotToken({ id: "8p9ekduj9uyo" }));
    });

    it("only ever returns one of the three authorized accents", () => {
        // Arrange
        const ids = ["a", "8p9ekduj9uyo", "zzzz", "", "column-42", "ÄÖÜ"];

        // Act & Assert
        ids.forEach((id) => {
            expect(COLUMN_DOT_TOKENS).toContain(toColumnDotToken({ id }));
        });
    });

    it("spreads a realistic set of ids across more than one accent", () => {
        // Arrange
        const ids = ["8p9ekduj9uyo", "8p9ho68ok8hs", "7q2mvbn4xa1c", "3k8dlqp0zzt5", "9w1rsyc6ee2n"];

        // Act
        const distinct = new Set(ids.map((id) => toColumnDotToken({ id })));

        // Assert
        expect(distinct.size).toBeGreaterThan(1);
    });

    /*
     * The regression this keying exists for: positions renumber contiguously on delete
     * (03-BACKEND-FACTS R2/R3), so a position-keyed hue repainted every surviving column.
     */
    it("leaves every surviving column's accent unchanged when an earlier column is deleted", () => {
        // Arrange
        const ids = ["8p9ekduj9uyo", "8p9ho68ok8hs", "7q2mvbn4xa1c", "3k8dlqp0zzt5"];
        const before = ids.map((id) => toColumnDotToken({ id }));

        // Act
        const survivors = ids.slice(1);
        const after = survivors.map((id) => toColumnDotToken({ id }));

        // Assert
        expect(after).toEqual(before.slice(1));
    });
});

/*
 * 03-RESEARCH Pattern 2: the override retires itself by derivation once the server's own order moves,
 * so nothing ever clears state during render.
 */
describe("applyColumnOrderOverride", () => {
    it("returns the columns untouched when there is no override", () => {
        // Arrange
        const columns = createColumnsFull({ count: 3 });

        // Act & Assert
        expect(applyColumnOrderOverride({ columns, override: null })).toEqual(columns);
    });

    it("applies the override's order while the server order still matches previousOrder", () => {
        // Arrange
        const columns = createColumnsFull({ count: 3 });
        const previousOrder = columns.map((column) => column.id);

        // Act
        const rendered = applyColumnOrderOverride({
            columns,
            override: { previousOrder, order: [previousOrder[2], previousOrder[0], previousOrder[1]] },
        });

        // Assert
        expect(rendered).toEqual([columns[2], columns[0], columns[1]]);
    });

    it("returns the server's own columns once the server order no longer matches previousOrder", () => {
        // Arrange
        const columns = createColumnsFull({ count: 3 });
        const previousOrder = columns.map((column) => column.id);
        const settledColumns = [columns[2], columns[0], columns[1]];

        // Act
        const rendered = applyColumnOrderOverride({
            columns: settledColumns,
            override: { previousOrder, order: [previousOrder[2], previousOrder[0], previousOrder[1]] },
        });

        // Assert
        expect(rendered).toEqual(settledColumns);
    });

    /* T-03-20: a column added or deleted underneath the override can never be synthesised or dropped. */
    it("returns the server's own columns when a column was added or deleted underneath", () => {
        // Arrange
        const columns = createColumnsFull({ count: 3 });
        const previousOrder = columns.map((column) => column.id);
        const remaining = [columns[0], columns[1]];

        // Act
        const rendered = applyColumnOrderOverride({
            columns: remaining,
            override: { previousOrder, order: [previousOrder[2], previousOrder[0], previousOrder[1]] },
        });

        // Assert
        expect(rendered).toEqual(remaining);
    });
});

describe("reorderColumns", () => {
    it("moves one column to its new index and leaves every other column's relative order intact", () => {
        // Arrange
        const columns = createColumnsFull({ count: 4 });

        // Act
        const reordered = reorderColumns({ columns, fromIndex: 0, toIndex: 2 });

        // Assert
        expect(reordered).toEqual([columns[1], columns[2], columns[0], columns[3]]);
        expect(columns.map((column) => column.id)).toEqual(createColumnsFull({ count: 4 }).map((column) => column.id));
    });
});

/*
 * All three assert one observed fact (03-BACKEND-FACTS.md § R1): the wire's `targetPosition` is
 * where the moved column ENDS UP, so the value sent must be the index `reorderColumns` actually put
 * it at. Reading the moved column back out of the reordered array is what makes that falsifiable.
 */
describe("toReorderTargetPosition", () => {
    it("sends the moved column's final index for a forward move", () => {
        // Arrange
        const columns = createColumnsFull({ count: 4 });

        // Act
        const targetPosition = toReorderTargetPosition({ toIndex: 2 });

        // Assert
        expect(targetPosition).toBe(2);
        expect(reorderColumns({ columns, fromIndex: 0, toIndex: 2 })[targetPosition]).toEqual(columns[0]);
    });

    it("sends the moved column's final index for a backward move", () => {
        // Arrange
        const columns = createColumnsFull({ count: 4 });

        // Act
        const targetPosition = toReorderTargetPosition({ toIndex: 1 });

        // Assert
        expect(targetPosition).toBe(1);
        expect(reorderColumns({ columns, fromIndex: 3, toIndex: 1 })[targetPosition]).toEqual(columns[3]);
    });

    it("stays inside the board's own index range for every from/to pair", () => {
        // Arrange
        const columns = createColumnsFull({ count: 4 });

        // Act & Assert
        for (let fromIndex = 0; fromIndex < columns.length; fromIndex += 1) {
            for (let toIndex = 0; toIndex < columns.length; toIndex += 1) {
                const targetPosition = toReorderTargetPosition({ toIndex });

                expect(targetPosition).toBeGreaterThanOrEqual(0);
                expect(targetPosition).toBeLessThanOrEqual(columns.length - 1);
                expect(reorderColumns({ columns, fromIndex, toIndex })[targetPosition]).toEqual(columns[fromIndex]);
            }
        }
    });
});

/*
 * D-05 resolves D-03's "first crosses 8" as *exceeds* 8, and testing one exact transition is what
 * makes "once only" true by construction rather than by remembering.
 */
describe("shouldNudgeOnColumnCount", () => {
    it("fires only on the create whose resulting count is exactly one past the threshold", () => {
        // Act & Assert
        expect(shouldNudgeOnColumnCount({ nextCount: COLUMN_COUNT_NUDGE_THRESHOLD + 1 })).toBe(true);
        expect(shouldNudgeOnColumnCount({ nextCount: COLUMN_COUNT_NUDGE_THRESHOLD })).toBe(false);
        expect(shouldNudgeOnColumnCount({ nextCount: COLUMN_COUNT_NUDGE_THRESHOLD + 2 })).toBe(false);
        expect(shouldNudgeOnColumnCount({ nextCount: 2 })).toBe(false);
    });
});

/* dnd-kit's own event shapes, reduced to the id each announcement actually reads. */
const createActive = (id: string): Active => ({
    id,
    data: { current: undefined },
    rect: { current: { initial: null, translated: null } },
});

const createOver = (id: string): Over => ({
    id,
    rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
    disabled: false,
    data: { current: undefined },
});

/*
 * The four strings are asserted in full, not by substring, so an edit to 03-UI-SPEC's Copywriting
 * Contract fails here rather than shipping silently.
 */
describe("createColumnReorderAnnouncements", () => {
    it("names the column, its 1-based position and the three keys when a column is picked up", () => {
        // Arrange
        const columns = createColumnsFull({ count: 3 });
        const announcements = createColumnReorderAnnouncements({ columns });

        // Act
        const announcement = announcements.onDragStart({ active: createActive(columns[0].id) });

        // Assert
        expect(announcement).toBe(
            "Picked up Fixture Column 1, position 1 of 3. Use left and right arrow keys to move, space to drop, escape to cancel.",
        );
    });

    it("reports the column's new 1-based position while it is being moved", () => {
        // Arrange
        const columns = createColumnsFull({ count: 3 });
        const announcements = createColumnReorderAnnouncements({ columns });

        // Act
        const announcement = announcements.onDragOver({
            active: createActive(columns[0].id),
            over: createOver(columns[2].id),
        });

        // Assert
        expect(announcement).toBe("Fixture Column 1 moved to position 3 of 3.");
    });

    it("reports the dropped position on drop and the original position on cancel", () => {
        // Arrange
        const columns = createColumnsFull({ count: 3 });
        const announcements = createColumnReorderAnnouncements({ columns });
        const active = createActive(columns[0].id);

        // Act
        const dropped = announcements.onDragEnd({ active, over: createOver(columns[1].id) });
        const cancelled = announcements.onDragCancel({ active, over: null });

        // Assert
        expect(dropped).toBe("Fixture Column 1 dropped at position 2 of 3.");
        expect(cancelled).toBe("Move cancelled. Fixture Column 1 returned to position 1 of 3.");
    });

    /* dnd-kit reads an undefined announcement as "say nothing" — the right outcome for a drag that reached no target. */
    it("says nothing when the drag reached no target or names a column that is not on the board", () => {
        // Arrange
        const columns = createColumnsFull({ count: 3 });
        const announcements = createColumnReorderAnnouncements({ columns });

        // Act & Assert
        expect(announcements.onDragOver({ active: createActive(columns[0].id), over: null })).toBeUndefined();
        expect(announcements.onDragStart({ active: createActive("no-such-column") })).toBeUndefined();
    });
});
