import { describe, expect, it } from "vitest";

import {
    buildColumnRowPath,
    createEmptyColumnRows,
    DEFAULT_COLUMN_ROW_COUNT,
    toSubmittedColumnNames,
} from "@/features/boards/model";

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
