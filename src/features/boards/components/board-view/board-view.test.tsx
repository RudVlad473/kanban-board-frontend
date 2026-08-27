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
import {
    deleteColumnActionCalls,
    holdNextDeleteColumn,
    queueDeleteColumnFailure,
    resetDeleteColumnStub,
    settleDeleteColumn,
} from "@/test-utils/delete-column-action-storybook-stub";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import {
    holdNextRenameColumn,
    queueRenameColumnFailure,
    renameColumnActionCalls,
    resetRenameColumnStub,
    settleRenameColumn,
} from "@/test-utils/rename-column-action-storybook-stub";

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
    RenameColumnOpen,
    ServerColumnsAdvance,
    DeleteColumnOpen,
    LoneColumn,
    ServerColumnRemoved,
} = composeStories(stories);

/** The board id every `createBoardFull()` fixture carries, and so the id a create must report. */
const FIXTURE_BOARD_ID = "00000000-0000-4000-8000-000000000001";

/* Duplicated verbatim from `board-view.stories.tsx`'s own host — see the comment beside them there. */
const SERVER_RENAMED_NAME = "Renamed On The Server";
const SERVER_CHANGED_NAME = "Changed Somewhere Else";

/** The two authored toast strings, as the user reads them — title and description run together. */
const GENERIC_RENAME_TOAST = "Couldn't rename column.Try again.";
const CONFLICT_RENAME_TOAST = "This board changed somewhere else.Refresh to see the latest.";

/** The delete path's own two, which the UI-SPEC requires to differ from each other. */
const GENERIC_DELETE_TOAST = "Couldn't delete column.Try again.";
const CONFLICT_DELETE_TOAST = "This board changed somewhere else.Refresh to see the latest.";

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
 * Read off the DOM rather than by role: Base UI marks the tree outside an open dialog `aria-hidden`,
 * so a role query would report zero headings exactly when a failed rename's rollback needs reading.
 */
const getRenderedColumnNames = (): (string | null)[] =>
    Array.from(document.querySelectorAll("section h2 > span > span:nth-child(2)")).map((name) => name.textContent);

const getRaisedToastTexts = (): (string | null)[] => getRaisedToasts().map((toast) => toast.textContent);

/** Opens a column's kebab and activates its rename entry, leaving the modal open on that column. */
const openRenameFor = async (columnName: string): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: `Column actions for ${columnName}` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Rename Column" }));
};

/** Opens a column's kebab and activates its delete entry, leaving the confirmation on that column. */
const openDeleteFor = async (columnName: string): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: `Column actions for ${columnName}` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete Column" }));
};

/** The whole COLUMN-04 entry path: kebab, delete entry, then the destructive confirmation. */
const deleteColumnFromHeader = async (columnName: string): Promise<void> => {
    await openDeleteFor(columnName);
    await userEvent.click(await screen.findByRole("button", { name: "Delete Column" }));
};

/** The whole COLUMN-02 entry path: kebab, rename entry, retype the name, submit. */
const renameColumnFromHeader = async ({
    columnName,
    nextName,
}: {
    columnName: string;
    nextName: string;
}): Promise<void> => {
    await openRenameFor(columnName);
    await userEvent.fill(await screen.findByLabelText("Column Name"), nextName);
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
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
            resetRenameColumnStub();
            resetDeleteColumnStub();
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

        /*
         * The sequence is a property of the fixture's ids, not the row — the hue is id-keyed, so
         * this asserts only that each header gets its own column. `model.unit.test.ts` owns the
         * keying itself, including the delete-stability regression.
         */
        it("gives each column header the accent its own id selects", async () => {
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
            /* The header row is the section's first child; the heading is the first thing inside it. */
            expect(
                rowChildren.slice(0, -1).map((child) => child.firstElementChild?.firstElementChild?.tagName),
            ).toEqual(Array(4).fill("H2"));
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

        /* A board with no rename in flight renders the server's own names, override or not. */
        it("renders the server's own column names while no rename is in flight", async () => {
            // Act
            await render(<Populated />);

            // Assert
            expect(getRenderedColumnNames()).toEqual(["Fixture Column 1", "Fixture Column 2", "Fixture Column 3"]);
        });

        it("opens the rename modal seeded with that column's name when its kebab entry is chosen", async () => {
            // Arrange
            await render(<Populated />);

            // Act
            await openRenameFor("Fixture Column 2");

            // Assert
            expect(await screen.findByRole("heading", { name: "Rename Column" })).toBeInTheDocument();
            expect(await screen.findByLabelText("Column Name")).toHaveValue("Fixture Column 2");
        });

        it("renders the rename modal when staged open", async () => {
            // Act
            await render(<RenameColumnOpen />);

            // Assert
            expect(await screen.findByLabelText("Column Name")).toHaveValue("Fixture Column 1");
        });

        /*
         * U-05's whole point, plus the UI-SPEC loading row: the header asserts the new name and the
         * modal is already gone while the write is still in flight, and no other column is touched.
         */
        it("closes the modal and shows the new name in that header before the rename resolves", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedColumnNames();
            holdNextRenameColumn();

            // Act — submit, then observe while the action is still unresolved.
            await renameColumnFromHeader({ columnName: "Fixture Column 1", nextName: "In Progress" });

            // Assert — applied optimistically and already dismissed, with the write demonstrably open.
            await vi.waitFor(() => {
                expect(getRenderedColumnNames()).toEqual(["In Progress", ...namesBefore.slice(1)]);
            });
            expect(screen.queryByRole("heading", { name: "Rename Column" })).not.toBeInTheDocument();

            // Act — let the write land.
            settleRenameColumn();

            // Assert — the name stays and nothing was announced, the modal having closed long before.
            await vi.waitFor(() => {
                expect(renameColumnActionCalls).toHaveLength(1);
            });
            expect(getRenderedColumnNames()).toEqual(["In Progress", ...namesBefore.slice(1)]);
            expect(getRaisedToastCount()).toBe(0);
        });

        it("sends the column's own board id, column id, typed name and current version, exactly once", async () => {
            // Arrange
            await render(<Populated />);

            // Act
            await renameColumnFromHeader({ columnName: "Fixture Column 2", nextName: "In Progress" });

            // Assert
            await vi.waitFor(() => {
                expect(renameColumnActionCalls).toHaveLength(1);
            });
            expect(renameColumnActionCalls[0]).toEqual({
                boardId: FIXTURE_BOARD_ID,
                columnId: Populated.args.board?.columns[1]?.id,
                name: "In Progress",
                version: Populated.args.board?.columns[1]?.version,
            });
        });

        /*
         * The load-bearing rollback case: asserting only that the renamed header reverted would pass
         * whether or not the override had leaked into a neighbouring column on the way back out.
         */
        it("restores the whole rendered name set and announces the reason when a rename fails", async () => {
            // Arrange — held, so the optimistic name is observed before the failure lands on it.
            await render(<Populated />);
            const namesBefore = getRenderedColumnNames();
            queueRenameColumnFailure(RESULT_STATUS.ERROR);
            holdNextRenameColumn();

            // Act
            await renameColumnFromHeader({ columnName: "Fixture Column 1", nextName: "In Progress" });
            await vi.waitFor(() => {
                expect(getRenderedColumnNames()[0]).toBe("In Progress");
            });
            settleRenameColumn();

            // Assert — identical to the pre-submit set, not merely "the renamed header reverted".
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toEqual([GENERIC_RENAME_TOAST]);
            });
            expect(getRenderedColumnNames()).toEqual(namesBefore);
        });

        /*
         * UI-SPEC error/version-conflict: a stale version earns its OWN copy, because retrying with
         * the same version fails identically and generic retry copy would loop the user.
         */
        it("raises the distinct version-conflict copy, not the generic one, for a stale version", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedColumnNames();
            queueRenameColumnFailure(RESULT_STATUS.CONFLICT);
            holdNextRenameColumn();

            // Act
            await renameColumnFromHeader({ columnName: "Fixture Column 1", nextName: "In Progress" });
            await vi.waitFor(() => {
                expect(getRenderedColumnNames()[0]).toBe("In Progress");
            });
            settleRenameColumn();

            // Assert — the two branches are proved different, not merely proved to raise something.
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toEqual([CONFLICT_RENAME_TOAST]);
            });
            expect(CONFLICT_RENAME_TOAST).not.toBe(GENERIC_RENAME_TOAST);
            expect(getRenderedColumnNames()).toEqual(namesBefore);
        });

        it("tells the user to sign in again when the rename is refused as unauthenticated", async () => {
            // Arrange
            await render(<Populated />);
            queueRenameColumnFailure(RESULT_STATUS.UNAUTHENTICATED);

            // Act
            await renameColumnFromHeader({ columnName: "Fixture Column 1", nextName: "In Progress" });

            // Assert
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toEqual([
                    "Your session has expired.Sign in again to rename this column.",
                ]);
            });
        });

        /* The override applies only where the id matches, so a second column keeps its own name. */
        it("seeds the modal with each column's own name when the kebab is reopened elsewhere", async () => {
            // Arrange
            await render(<Populated />);

            // Act — rename the first column, then open the rename modal on a different one.
            await renameColumnFromHeader({ columnName: "Fixture Column 1", nextName: "In Progress" });
            await vi.waitFor(() => {
                expect(getRenderedColumnNames()[0]).toBe("In Progress");
            });
            await openRenameFor("Fixture Column 3");

            // Assert — that column's own name, not the one just renamed.
            expect(await screen.findByLabelText("Column Name")).toHaveValue("Fixture Column 3");
        });

        /*
         * T-03-29: the override must not outlive the value it stands in for, or a change made in
         * another tab would sit behind a stale local name indefinitely.
         */
        it("retires the override once the refreshed props carry it, so a later server change renders", async () => {
            // Arrange
            await render(<ServerColumnsAdvance />);

            // Act — rename optimistically, then land the refreshed server render carrying that name.
            await renameColumnFromHeader({ columnName: "Fixture Column 1", nextName: SERVER_RENAMED_NAME });
            await vi.waitFor(() => {
                expect(getRenderedColumnNames()[0]).toBe(SERVER_RENAMED_NAME);
            });
            await userEvent.click(screen.getByRole("button", { name: "Land the refreshed server render" }));

            // Act — a later server-side change to that same column.
            await userEvent.click(screen.getByRole("button", { name: "Land a later server change" }));

            // Assert — rendered, not masked by the override that stood in for the earlier value.
            await vi.waitFor(() => {
                expect(getRenderedColumnNames()[0]).toBe(SERVER_CHANGED_NAME);
            });
        });

        it("opens the confirmation naming that column when its delete entry is activated", async () => {
            // Arrange
            await render(<Populated />);

            // Act
            await openDeleteFor("Fixture Column 2");

            // Assert — that column is named, and nothing has been deleted yet.
            expect(await screen.findByRole("heading", { name: "Delete this column?" })).toBeInTheDocument();
            expect(screen.getByText(/'Fixture Column 2' column\?/)).toBeInTheDocument();
            expect(deleteColumnActionCalls).toHaveLength(0);
        });

        it("renders the delete confirmation when staged open", async () => {
            // Act
            await render(<DeleteColumnOpen />);

            // Assert
            expect(await screen.findByRole("heading", { name: "Delete this column?" })).toBeInTheDocument();
            expect(screen.getByText(/'Fixture Column 1' column\?/)).toBeInTheDocument();
        });

        it("sends that column's own board id and column id with the delete, exactly once", async () => {
            // Arrange
            await render(<Populated />);

            // Act
            await deleteColumnFromHeader("Fixture Column 2");

            // Assert — T-03-30: one call, never two.
            await vi.waitFor(() => {
                expect(deleteColumnActionCalls).toHaveLength(1);
            });
            expect(deleteColumnActionCalls[0]).toEqual({
                boardId: FIXTURE_BOARD_ID,
                columnId: Populated.args.board?.columns[1]?.id,
            });
        });

        /*
         * U-05's whole point: the cascade is irreversible (ADR domain/0002), so nothing may leave
         * the screen before the server has agreed — there is nothing to roll back to if it refuses.
         */
        it("still renders the column while the delete is in flight, removing nothing optimistically", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedColumnNames();
            holdNextDeleteColumn();

            // Act — submit, then observe while the action is still unresolved.
            await deleteColumnFromHeader("Fixture Column 1");
            await vi.waitFor(() => {
                expect(deleteColumnActionCalls).toHaveLength(1);
            });

            // Assert — the whole set is untouched, not merely the target still present.
            expect(getRenderedColumnNames()).toEqual(namesBefore);

            // Act — let the write land.
            settleDeleteColumn();

            // Assert — still nothing removed here: the refreshed props are what remove it.
            await vi.waitFor(() => {
                expect(screen.queryByRole("heading", { name: "Delete this column?" })).not.toBeInTheDocument();
            });
            expect(getRenderedColumnNames()).toEqual(namesBefore);
            expect(getRaisedToastCount()).toBe(0);
        });

        it("closes the modal, leaves the column on the board and announces a generic delete failure", async () => {
            // Arrange — held, so the pre-settle state is observed before the failure lands.
            await render(<Populated />);
            const namesBefore = getRenderedColumnNames();
            queueDeleteColumnFailure(RESULT_STATUS.ERROR);
            holdNextDeleteColumn();

            // Act
            await deleteColumnFromHeader("Fixture Column 1");
            await vi.waitFor(() => {
                expect(deleteColumnActionCalls).toHaveLength(1);
            });
            settleDeleteColumn();

            // Assert
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toEqual([GENERIC_DELETE_TOAST]);
            });
            expect(screen.queryByRole("heading", { name: "Delete this column?" })).not.toBeInTheDocument();
            expect(getRenderedColumnNames()).toEqual(namesBefore);
        });

        /*
         * UI-SPEC error/version-conflict: a stale version earns its OWN copy, because retrying
         * against the same version fails identically and generic retry copy would loop the user.
         */
        it("raises the distinct version-conflict copy, not the generic one, when the delete conflicts", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedColumnNames();
            queueDeleteColumnFailure(RESULT_STATUS.CONFLICT);

            // Act
            await deleteColumnFromHeader("Fixture Column 1");

            // Assert — the two branches are proved different, not merely proved to raise something.
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toEqual([CONFLICT_DELETE_TOAST]);
            });
            expect(CONFLICT_DELETE_TOAST).not.toBe(GENERIC_DELETE_TOAST);
            expect(getRenderedColumnNames()).toEqual(namesBefore);
        });

        /*
         * UI-SPEC empty/after-deleting-the-last-column: the same zero-columns state plan 03-07
         * wired, not a separate "you just deleted everything" screen.
         */
        it("falls through to the zero-columns empty state when no columns remain", async () => {
            // Act
            await render(<EmptyBoard />);

            // Assert
            expect(screen.getByText("This board is empty. Create a new column to get started.")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "+ Add New Column" })).toBeInTheDocument();
            expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
        });

        /* COLUMN-04 ordering: removal filters the surviving columns, it never re-sorts them. */
        it("keeps the surviving columns in their relative order when a middle one is removed", async () => {
            // Arrange
            await render(<ServerColumnRemoved />);
            expect(getRenderedColumnNames()).toEqual([
                "Fixture Column 1",
                "Fixture Column 2",
                "Fixture Column 3",
                "Fixture Column 4",
            ]);

            // Act — land the refreshed render a completed delete of the second column produces.
            await userEvent.click(
                screen.getByRole("button", { name: "Land the refreshed render without the middle column" }),
            );

            // Assert — the same order minus one, never a reshuffle.
            await vi.waitFor(() => {
                expect(getRenderedColumnNames()).toEqual(["Fixture Column 1", "Fixture Column 3", "Fixture Column 4"]);
            });
        });

        it("names the newly targeted column when the confirmation is reopened on another one", async () => {
            // Arrange — open on one column, then dismiss without deleting.
            await render(<Populated />);
            await openDeleteFor("Fixture Column 1");
            await userEvent.click(await screen.findByRole("button", { name: "Keep Column" }));

            // Act
            await openDeleteFor("Fixture Column 3");

            // Assert — that column's own name, not the one previously targeted.
            expect(await screen.findByText(/'Fixture Column 3' column\?/)).toBeInTheDocument();
            expect(screen.queryByText(/'Fixture Column 1' column\?/)).not.toBeInTheDocument();
        });

        /* UI-SPEC zero-one-many/exactly-1-column: both entries stay meaningful on a lone column. */
        it("offers both kebab entries on a board holding exactly one column", async () => {
            // Arrange
            await render(<LoneColumn />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Column actions for Fixture Column 1" }));

            // Assert
            expect(await screen.findByRole("menuitem", { name: "Rename Column" })).toBeInTheDocument();
            expect(screen.getByRole("menuitem", { name: "Delete Column" })).toBeInTheDocument();
        });
    },
});
