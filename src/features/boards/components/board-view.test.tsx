/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't load
 * the Vite plugin for (see docs/adr/tech/0021).
 */
import { composeStories } from "@storybook/react";
import { screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import {
    createColumnActionCalls,
    holdNextCreateColumn,
    queueCreateColumnFailure,
    resetCreateColumnStub,
    settleCreateColumn,
} from "@/test-utils/create-column-action-storybook-stub";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./board-view.stories";

const { Populated, EmptyBoard, ColumnsWithNoTasks, ManyColumns, AddColumnOpen } = composeStories(stories);

/** The board id every `createBoardFull()` fixture carries, and so the id a create must report. */
const FIXTURE_BOARD_ID = "00000000-0000-4000-8000-000000000001";

/*
 * Scoped to the notifications region, since the create modal is a `dialog` too — an unscoped role
 * query would report the modal and make "no toast was raised" pass for the wrong reason.
 */
const getRaisedToastCount = (): number => {
    const region = screen.queryByRole("region", { name: "Notifications" });

    return region === null ? 0 : within(region).queryAllByRole("dialog").length;
};

/** Opens the ghost column's modal, types a name and submits it — the whole COLUMN-01 entry path. */
const submitNewColumn = async (name: string): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: "+ New Column" }));
    await userEvent.fill(await screen.findByLabelText("Column Name"), name);
    await userEvent.click(screen.getByRole("button", { name: "Create New Column" }));
};

/*
 * ADR tech/0014: the whole body runs at both viewports. BoardView has no viewport-conditional
 * behaviour of its own — the horizontal/vertical overflow treatments are the same at both sizes.
 */
describeForEachDevice({
    name: "BoardView",
    body: () => {
        beforeEach(() => {
            resetCreateColumnStub();
        });

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
         * The omission is the assertion: the zero-columns call to action is plan 03-07's work, so
         * this state still offers no add-column entry point of any kind.
         */
        it("renders the verbatim empty-board message and no columns for a board with none", async () => {
            // Act
            await render(<EmptyBoard />);

            // Assert
            expect(screen.getByText("This board is empty. Create a new column to get started.")).toBeInTheDocument();
            expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
            expect(screen.queryByText("+ Add New Column")).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "+ New Column" })).not.toBeInTheDocument();
        });

        it("renders a zero count and no task cards for a column holding no tasks", async () => {
            // Act
            await render(<ColumnsWithNoTasks />);

            // Assert
            expect(screen.getByRole("heading", { name: "Fixture Column 1 (0)" })).toBeInTheDocument();
            expect(screen.getByRole("heading", { name: "Fixture Column 2 (0)" })).toBeInTheDocument();
            expect(screen.queryAllByRole("listitem")).toHaveLength(0);
        });

        it("opens the Add Column modal when the ghost column is pressed", async () => {
            // Arrange
            await render(<Populated />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "+ New Column" }));

            // Assert
            expect(await screen.findByRole("heading", { name: "Add New Column" })).toBeInTheDocument();
        });

        it("renders the Add Column modal open when staged that way", async () => {
            // Act
            await render(<AddColumnOpen />);

            // Assert
            expect(await screen.findByRole("heading", { name: "Add New Column" })).toBeInTheDocument();
        });

        /*
         * The tracer's real end-to-end assertion: it proves the call reached the action layer with
         * the board's own id, not merely that a spy prop fired. The exact call count is what catches
         * a double-submit regression (T-03-22).
         */
        it("reaches the create action once with the board's own id, then closes the modal", async () => {
            // Arrange
            await render(<Populated />);

            // Act
            await submitNewColumn("Backlog");

            // Assert
            await vi.waitFor(() => {
                expect(createColumnActionCalls).toHaveLength(1);
            });
            expect(createColumnActionCalls[0]).toEqual({ boardId: FIXTURE_BOARD_ID, name: "Backlog" });
            await vi.waitFor(() => {
                expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
            });
        });

        /* UI-SPEC error/Add-Column-generic: nothing was created, so the failure lands inline. */
        it("keeps the modal open with inline copy and no toast when the create fails", async () => {
            // Arrange
            queueCreateColumnFailure(RESULT_STATUS.ERROR);
            await render(<Populated />);

            // Act
            await submitNewColumn("Backlog");

            // Assert
            expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't create column. Try again.");
            expect(screen.getByRole("dialog")).toBeInTheDocument();
            expect(getRaisedToastCount()).toBe(0);
        });

        /*
         * Both dismissal guards are needed together: Base UI's Dialog fires `onOpenChange(false)` on
         * Escape regardless of the backdrop-dismissal prop (documented in `modal.tsx` itself).
         */
        it("shows the pending treatment and refuses Escape while the create is in flight", async () => {
            // Arrange
            holdNextCreateColumn();
            await render(<Populated />);

            // Act
            await submitNewColumn("Backlog");

            // Assert — the modal holds the in-flight window open so an inline failure can land in it.
            const submit = screen.getByRole("button", { name: "Create New Column" });
            await vi.waitFor(() => {
                expect(submit).toBeDisabled();
            });
            expect(submit).toHaveAttribute("aria-busy", "true");

            await userEvent.keyboard("{Escape}");
            expect(screen.getByRole("dialog")).toBeInTheDocument();

            // Act — settling the held call is what finally closes it.
            settleCreateColumn();

            // Assert
            await vi.waitFor(() => {
                expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
            });
        });

        /*
         * D-01 and the UI-SPEC overflow row jointly: a new column appends at the end, so the ghost
         * column must be the LAST child of the scroll row rather than pinned outside it.
         */
        it("renders the ghost column as the last child of the horizontal scroll row", async () => {
            // Act
            await render(<ManyColumns />);

            // Assert
            const ghostColumn = screen.getByRole("button", { name: "+ New Column" });
            const scrollRow = ghostColumn.parentElement;
            expect(scrollRow).toHaveClass("overflow-x-auto");

            const rowChildren = Array.from(scrollRow?.children ?? []);
            expect(rowChildren).toHaveLength(9);
            expect(rowChildren.at(-1)).toBe(ghostColumn);
            expect(rowChildren.slice(0, -1).map((child) => child.tagName)).toEqual(Array(8).fill("SECTION"));
        });
    },
});
