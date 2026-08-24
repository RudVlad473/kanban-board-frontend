import { describe, expect, it } from "vitest";

import { toCreatableColumnNames } from "@/features/boards/model";

describe("toCreatableColumnNames", () => {
    it("returns the trimmed non-empty rows in the order given", () => {
        // Act
        const names = toCreatableColumnNames(["  Todo ", "Doing", " Done"]);

        // Assert
        expect(names).toEqual(["Todo", "Doing", "Done"]);
    });

    /*
     * D-02: a blank row is omitted from the create sequence rather than validation-blocked, so
     * three untouched rows are a valid submission that creates a board with no columns.
     */
    it("returns an empty array for three blank rows", () => {
        // Act
        const names = toCreatableColumnNames(["", "   ", ""]);

        // Assert
        expect(names).toEqual([]);
    });

    it("drops blank rows sitting between filled ones without reordering the rest", () => {
        // Act
        const names = toCreatableColumnNames(["Todo", "  ", "Done"]);

        // Assert
        expect(names).toEqual(["Todo", "Done"]);
    });

    it("returns an empty array when there are no rows at all", () => {
        // Act
        const names = toCreatableColumnNames([]);

        // Assert
        expect(names).toEqual([]);
    });
});
