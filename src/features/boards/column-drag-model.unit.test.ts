import { describe, expect, it } from "vitest";

import { reorderColumns } from "@/features/boards/column-drag-model";
import { createColumnsFull } from "@/test-utils/factories/board-full";

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
