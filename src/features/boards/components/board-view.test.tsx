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

const {
    Populated,
    EmptyBoard,
    ColumnsWithNoTasks,
    EvenlyCycledColumns,
    ManyColumns,
    AddColumnOpen,
    DuplicateColumnName,
    SevenColumns,
    EightColumns,
    NineColumns,
} = composeStories(stories);

/** The board id every `createBoardFull()` fixture carries, and so the id a create must report. */
const FIXTURE_BOARD_ID = "00000000-0000-4000-8000-000000000001";

/*
 * Scoped to the notifications region, since the create modal is a `dialog` too — an unscoped role
 * query would report the modal and make "no toast was raised" pass for the wrong reason.
 */
const getRaisedToasts = (): HTMLElement[] => {
    const region = screen.queryByRole("region", { name: "Notifications" });

    return region === null ? [] : within(region).queryAllByRole("dialog");
};

const getRaisedToastCount = (): number => getRaisedToasts().length;

/** The horizontal column row — the scrolling box D-04's `scrollIntoView` actually moves. */
const getScrollRow = (): HTMLElement => {
    const row = document.querySelector<HTMLElement>("div.overflow-x-auto");
    if (row === null) {
        throw new Error("The horizontal column row is not rendered.");
    }

    return row;
};

/** Fills and submits an Add Column modal that is already open, whichever entry point opened it. */
const submitOpenColumnForm = async (name: string): Promise<void> => {
    await userEvent.fill(await screen.findByLabelText("Column Name"), name);
    await userEvent.click(screen.getByRole("button", { name: "Create New Column" }));
};

/** Opens the ghost column's modal, types a name and submits it — the whole COLUMN-01 entry path. */
const submitNewColumn = async (name: string): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: "+ New Column" }));
    await submitOpenColumnForm(name);
};

/** The same path from the zero-columns empty state, whose call to action replaces the ghost column. */
const submitFirstColumn = async (name: string): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: "+ Add New Column" }));
    await submitOpenColumnForm(name);
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

        it("renders the verbatim empty-board message and no columns for a board with none", async () => {
            // Act
            await render(<EmptyBoard />);

            // Assert
            expect(screen.getByText("This board is empty. Create a new column to get started.")).toBeInTheDocument();
            expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
        });

        /*
         * The omission is half the assertion: UI-SPEC empty/0-columns has the centred call to action
         * REPLACE the ghost column in this state, so exactly one of the two labels may be present.
         */
        it("offers the empty-state call to action and no ghost column on a board with no columns", async () => {
            // Act
            await render(<EmptyBoard />);

            // Assert
            const callToAction = screen.getByRole("button", { name: "+ Add New Column" });
            expect(callToAction).toBeInTheDocument();
            expect(screen.getAllByRole("button", { name: /Add New Column/ })).toHaveLength(1);
            expect(screen.queryByRole("button", { name: "+ New Column" })).not.toBeInTheDocument();

            /* UI-SPEC accent reserved-for item 6 — read off real layout, not off a class name. */
            const emptyState = callToAction.parentElement;
            expect(callToAction.getBoundingClientRect().width).toBeLessThan(
                emptyState?.getBoundingClientRect().width ?? 0,
            );
        });

        it("opens the same Add Column modal from the empty-state call to action", async () => {
            // Arrange
            await render(<EmptyBoard />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "+ Add New Column" }));

            // Assert
            expect(await screen.findByRole("heading", { name: "Add New Column" })).toBeInTheDocument();
            expect(await screen.findByLabelText("Column Name")).toBeInTheDocument();
        });

        /* COLUMN-01 on the one board state the tracer could not reach at all. */
        it("reaches the create action once from the empty state, with the board's own id", async () => {
            // Arrange
            await render(<EmptyBoard />);

            // Act
            await submitFirstColumn("Backlog");

            // Assert
            await vi.waitFor(() => {
                expect(createColumnActionCalls).toHaveLength(1);
            });
            expect(createColumnActionCalls[0]).toEqual({ boardId: FIXTURE_BOARD_ID, name: "Backlog" });
        });

        /* UI-SPEC error/Add-Column-duplicate: its own copy, inline, and still never a toast. */
        it("keeps the modal open with the duplicate-name copy when the name is refused as a duplicate", async () => {
            // Arrange
            queueCreateColumnFailure(RESULT_STATUS.DUPLICATE);
            await render(<DuplicateColumnName />);

            // Act
            await submitOpenColumnForm("Fixture Column 1");

            // Assert
            expect(await screen.findByRole("alert")).toHaveTextContent(
                "A column with that name already exists on this board.",
            );
            expect(screen.getByRole("dialog")).toBeInTheDocument();
            expect(getRaisedToastCount()).toBe(0);
        });

        /* The new table entry must not swallow the fallback every other failure branch still uses. */
        it("still renders the generic create-failure copy for a failure that is not a duplicate", async () => {
            // Arrange
            queueCreateColumnFailure(RESULT_STATUS.ERROR);
            await render(<DuplicateColumnName />);

            // Act
            await submitOpenColumnForm("Fixture Column 1");

            // Assert
            const alert = await screen.findByRole("alert");
            expect(alert).toHaveTextContent("Couldn't create column. Try again.");
            expect(alert).not.toHaveTextContent("A column with that name already exists on this board.");
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

        it("cycles the column header dots across the three accents and repeats on the fourth", async () => {
            // Act
            await render(<EvenlyCycledColumns />);

            // Assert
            const dots = Array.from(document.querySelectorAll('h2 [aria-hidden="true"]'));
            expect(
                dots.map((dot) => dot.className.split(" ").find((name) => name.startsWith("bg-accent-column-"))),
            ).toEqual(["bg-accent-column-1", "bg-accent-column-2", "bg-accent-column-3", "bg-accent-column-1"]);
        });

        /* Moving the heading into its own component must not change what names each column's region. */
        it("keeps every column section labelled by its own header", async () => {
            // Act
            await render(<EvenlyCycledColumns />);

            // Assert
            const sections = Array.from(document.querySelectorAll("section[aria-labelledby]"));
            expect(
                sections.map(
                    (section) => document.getElementById(section.getAttribute("aria-labelledby") ?? "")?.textContent,
                ),
            ).toEqual(["Fixture Column 1 (2)", "Fixture Column 2 (2)", "Fixture Column 3 (2)", "Fixture Column 4 (2)"]);
        });

        it("keeps the ghost column last in the scroll row, after every column header", async () => {
            // Act
            await render(<EvenlyCycledColumns />);

            // Assert
            const ghostColumn = screen.getByRole("button", { name: "+ New Column" });
            const rowChildren = Array.from(ghostColumn.parentElement?.children ?? []);
            expect(rowChildren.at(-1)).toBe(ghostColumn);
            expect(rowChildren.slice(0, -1).map((child) => child.firstElementChild?.tagName)).toEqual(
                Array(4).fill("H2"),
            );
            expect(document.querySelectorAll('section h2 [aria-hidden="true"]')).toHaveLength(4);
        });

        /*
         * D-04: the ghost column always sits immediately after the newest column, so bringing it
         * into view is what confirms the create the user cannot otherwise see (D-01 appends).
         */
        it("scrolls the column row to its end after a successful create, with motion governed by CSS", async () => {
            // Arrange
            await render(<EightColumns />);
            const scrollRow = getScrollRow();
            expect(scrollRow.scrollLeft).toBe(0);

            // Act
            await submitOpenColumnForm("Backlog");

            // Assert — the row itself owns the motion, so no scroll call has to name it.
            await vi.waitFor(() => {
                expect(scrollRow.scrollLeft).toBeGreaterThan(0);
            });
            expect(getComputedStyle(scrollRow).scrollBehavior).toBe("smooth");
            expect(scrollRow).toHaveClass("motion-reduce:scroll-auto");
        });

        /* T-03-27: the pending-scroll flag is set only in the success branch, so a failure is inert. */
        it("leaves the column row where it was when the create fails", async () => {
            // Arrange
            queueCreateColumnFailure(RESULT_STATUS.ERROR);
            await render(<EightColumns />);
            const scrollRow = getScrollRow();

            // Act
            await submitOpenColumnForm("Backlog");

            // Assert
            expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't create column. Try again.");
            expect(scrollRow.scrollLeft).toBe(0);
        });

        /* D-03/D-05 fire on one exact transition, and D-02 keeps the create itself uncapped. */
        it("raises one neutral nudge on the create that takes the board to nine columns", async () => {
            // Arrange
            await render(<EightColumns />);

            // Act
            await submitOpenColumnForm("Backlog");

            // Assert — the create landed and the modal closed; the nudge never stood in the way.
            await vi.waitFor(() => {
                expect(getRaisedToastCount()).toBe(1);
            });
            expect(getRaisedToasts()[0]).toHaveTextContent(
                "That's 9 columns on this board.Columns scroll horizontally from here.",
            );
            expect(getRaisedToasts()[0]).not.toHaveClass("border-l-border-danger");
            expect(createColumnActionCalls).toHaveLength(1);
            /* By its heading, not its role — the raised toast is a `dialog` too. */
            await vi.waitFor(() => {
                expect(screen.queryByRole("heading", { name: "Add New Column" })).not.toBeInTheDocument();
            });
        });

        it("raises no nudge on the create that takes the board to eight columns", async () => {
            // Arrange
            await render(<SevenColumns />);

            // Act
            await submitOpenColumnForm("Backlog");

            // Assert
            await vi.waitFor(() => {
                expect(createColumnActionCalls).toHaveLength(1);
            });
            expect(getRaisedToastCount()).toBe(0);
        });

        it("raises no nudge on the create that takes the board to ten columns", async () => {
            // Arrange
            await render(<NineColumns />);

            // Act
            await submitOpenColumnForm("Backlog");

            // Assert
            await vi.waitFor(() => {
                expect(createColumnActionCalls).toHaveLength(1);
            });
            expect(getRaisedToastCount()).toBe(0);
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
