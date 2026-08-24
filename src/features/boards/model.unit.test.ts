import { describe, expect, it } from "vitest";

import { toSubmittedColumnNames } from "@/features/boards/model";

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
