/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't load
 * the Vite plugin for (see docs/adr/tech/0021).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./board-view.stories";

const { Populated, EmptyBoard, ColumnsWithNoTasks } = composeStories(stories);

/*
 * ADR tech/0014: the whole body runs at both viewports. BoardView has no viewport-conditional
 * behaviour of its own — the horizontal/vertical overflow treatments are the same at both sizes.
 */
describeForEachDevice({
    name: "BoardView",
    body: () => {
        it("renders one column per column, each captioned with its name and task count", async () => {
            // Act
            await render(<Populated />);

            // Assert
            expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
            expect(screen.getByRole("heading", { name: "Fixture Column 1 (2)" })).toBeInTheDocument();
            expect(screen.getByRole("heading", { name: "Fixture Column 2 (2)" })).toBeInTheDocument();
            expect(screen.getByRole("heading", { name: "Fixture Column 3 (2)" })).toBeInTheDocument();
        });

        /*
         * Read per card rather than per assertion, so the title and the count are proved to be on
         * the SAME card — three columns of two tasks each, completing 0 and 1 of 3 subtasks.
         */
        it("renders each task card with its title and its subtask completion count", async () => {
            // Act
            await render(<Populated />);

            // Assert
            const cards = screen.getAllByRole("listitem");
            expect(cards.map((card) => card.textContent)).toEqual([
                "Fixture Task 10 of 3 subtasks",
                "Fixture Task 21 of 3 subtasks",
                "Fixture Task 10 of 3 subtasks",
                "Fixture Task 21 of 3 subtasks",
                "Fixture Task 10 of 3 subtasks",
                "Fixture Task 21 of 3 subtasks",
            ]);
        });

        /*
         * The omission is the assertion: this plan deliberately renders no add-column control,
         * because that interaction is COLUMN-01 in Phase 3 and a dead control is worse than none.
         */
        it("renders the verbatim empty-board message and no columns for a board with none", async () => {
            // Act
            await render(<EmptyBoard />);

            // Assert
            expect(screen.getByText("This board is empty. Create a new column to get started.")).toBeInTheDocument();
            expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
            expect(screen.queryByText("+ Add New Column")).not.toBeInTheDocument();
        });

        it("renders a zero count and no task cards for a column holding no tasks", async () => {
            // Act
            await render(<ColumnsWithNoTasks />);

            // Assert
            expect(screen.getByRole("heading", { name: "Fixture Column 1 (0)" })).toBeInTheDocument();
            expect(screen.getByRole("heading", { name: "Fixture Column 2 (0)" })).toBeInTheDocument();
            expect(screen.queryAllByRole("listitem")).toHaveLength(0);
        });
    },
});
