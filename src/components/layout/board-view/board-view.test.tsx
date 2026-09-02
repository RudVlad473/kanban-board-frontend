/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't load
 * the Vite plugin for (see docs/adr/tech/0021).
 */
import { composeStories } from "@storybook/react";
import { screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { createColumnAction } from "@/features/boards/actions/create-column-action";
import { deleteColumnAction } from "@/features/boards/actions/delete-column-action";
import { renameColumnAction } from "@/features/boards/actions/rename-column-action";
import { reorderColumnAction } from "@/features/boards/actions/reorder-column-action";
import { deleteSubtaskAction } from "@/features/tasks/actions/delete-subtask-action";
import { deleteTaskAction } from "@/features/tasks/actions/delete-task-action";
import { moveTaskAction } from "@/features/tasks/actions/move-task-action";
import { updateSubtaskAction } from "@/features/tasks/actions/update-subtask-action";
import { updateTaskAction } from "@/features/tasks/actions/update-task-action";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { actionStub } from "@/test-utils/action-stub-registry";
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
    RenameColumnOpen,
    ServerColumnsAdvance,
    DeleteColumnOpen,
    DeleteTaskOpen,
    LoneColumn,
    ServerColumnRemoved,
    ReorderableColumns,
    ReorderInFlight,
    ReorderedServerOrder,
    ColumnsOutOfPositionOrder,
    FiveReorderableColumns,
    TasksAcrossColumns,
    TaskIntoEmptyColumn,
    ReorderableTasks,
    SingleColumnSingleTask,
    TaskWithMultipleSubtasks,
} = composeStories(stories);

/*
 * One recorder per action, looked up off the imported binding — `queue` accepts only that action's
 * own awaited result and `calls` is typed as its first parameter (04-CONTEXT.md D-01).
 */
const createColumnStub = actionStub(createColumnAction);
const renameColumnStub = actionStub(renameColumnAction);
const deleteColumnStub = actionStub(deleteColumnAction);
const reorderColumnStub = actionStub(reorderColumnAction);
const moveTaskStub = actionStub(moveTaskAction);
const updateSubtaskStub = actionStub(updateSubtaskAction);
const updateTaskStub = actionStub(updateTaskAction);
const deleteSubtaskStub = actionStub(deleteSubtaskAction);
const deleteTaskStub = actionStub(deleteTaskAction);

/** The board id every `createBoardFull()` fixture carries, and so the id a create must report. */
const FIXTURE_BOARD_ID = "00000000-0000-4000-8000-000000000001";

/**
 * The id every queued success below states for the column it wrote. The deleted doubles derived one
 * from the call; no consumer reads it back, since every column hook branches on `status` alone.
 */
const STUB_WRITTEN_COLUMN_ID = "stub-written-column-id";

/* Duplicated verbatim from `board-view.stories.tsx`'s own host — see the comment beside them there. */
const SERVER_RENAMED_NAME = "Renamed On The Server";
const SERVER_CHANGED_NAME = "Changed Somewhere Else";

/** The two authored toast strings, as the user reads them — title and description run together. */
const GENERIC_RENAME_TOAST = "Couldn't rename column.Try again.";
const CONFLICT_RENAME_TOAST = "This board changed somewhere else.Refresh to see the latest.";

/** The delete path's own two, which the UI-SPEC requires to differ from each other. */
const GENERIC_DELETE_TOAST = "Couldn't delete column.Try again.";
const CONFLICT_DELETE_TOAST = "This board changed somewhere else.Refresh to see the latest.";

/** COLUMN-03's own rollback copy, which the UI-SPEC requires to name the whole board's order. */
const GENERIC_REORDER_TOAST = "Couldn't reorder columns.Try again.";

/** TASK-04's own generic failure copy, from `use-move-task.ts`'s `GENERIC_MOVE_FAILURE`. */
const GENERIC_MOVE_TOAST = "Couldn't move task.Try again.";

/*
 * SYNC-01/C-08: the title matches the column phase's own conflict title EXACTLY; only the
 * description differs, since the move action re-reads the board itself (D-12) rather than asking
 * the user to refresh, which is what the column phase's own wording still (correctly) says.
 */
const CONFLICT_MOVE_TOAST = "This board changed somewhere else.Refreshing to show the latest.";

/* SUBTASK-02's own generic failure copy, from `use-toggle-subtask.ts`'s `GENERIC_TOGGLE_FAILURE`. */
const GENERIC_TOGGLE_TOAST = "Couldn't update subtask.Try again.";

/* SUBTASK-04's own generic failure copy, from `use-delete-subtask.ts`'s `GENERIC_DELETE_FAILURE`. */
const GENERIC_DELETE_SUBTASK_TOAST = "Couldn't delete subtask.Try again.";

/* TASK-03's own generic failure copy, from `use-update-task.ts`'s `GENERIC_UPDATE_FAILURE`. */
const GENERIC_UPDATE_TASK_TOAST = "Couldn't save task.Try again.";
/* SYNC-01/C-08: the phase-wide conflict title, matching every other conflict toast in this suite. */
const CONFLICT_UPDATE_TASK_TOAST = "This board changed somewhere else.Refreshing to show the latest.";

/* TASK-05's own generic failure copy, from `use-delete-task.ts`'s `GENERIC_DELETE_FAILURE`. */
const GENERIC_DELETE_TASK_TOAST = "Couldn't delete task.Try again.";

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

/** Every rendered column that still overlaps the scroll row's own visible box, in rendered order. */
const getColumnsOverlappingTheVisibleBox = (): (string | null | undefined)[] => {
    const rowRect = getScrollRow().getBoundingClientRect();

    return Array.from(document.querySelectorAll("section"))
        .filter((section) => {
            const rect = section.getBoundingClientRect();

            return rect.right > rowRect.left && rect.left < rowRect.right;
        })
        .map((section) => section.querySelector("h2")?.firstElementChild?.children[1]?.textContent);
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
const getRenderedColumnNames = (): (string | null | undefined)[] =>
    Array.from(document.querySelectorAll("section h2")).map(
        /* The heading's single child is the drag handle, or a plain span on a lone column. */
        (heading) => heading.firstElementChild?.children[1]?.textContent,
    );

const getRaisedToastTexts = (): (string | null)[] => getRaisedToasts().map((toast) => toast.textContent);

/**
 * Each rendered column's own task titles, in list order — the rollback assertion's ground truth,
 * since it must prove the card returned to its ORIGINAL column and index, not merely "somewhere".
 */
const getColumnTaskTitles = (): { columnName: string | null | undefined; taskTitles: (string | null)[] }[] =>
    Array.from(document.querySelectorAll("section")).map((section) => ({
        columnName: section.querySelector("h2")?.firstElementChild?.children[1]?.textContent,
        /* The content button's own first span, matched before the handle's sibling `<button>`. */
        taskTitles: Array.from(section.querySelectorAll("li")).map(
            (item) => item.querySelector("button span")?.textContent ?? null,
        ),
    }));

/*
 * Read off the DOM rather than by role: Base UI marks the tree outside an open dialog `aria-hidden`,
 * so a role query would report nothing while the detail modal a rollback test needs is open.
 */
const getCardCaption = (taskTitle: string): string | null => {
    const card = Array.from(document.querySelectorAll("li")).find((item) => item.textContent.startsWith(taskTitle));

    /* The content button's SECOND span, after the title's own first one (see `getColumnTaskTitles`). */
    return card?.querySelectorAll("button span")[1]?.textContent ?? null;
};

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

/** Opens a task's detail view, then its kebab's delete entry, leaving the confirmation on that task. */
const openDeleteTaskFor = async (taskTitle: string): Promise<void> => {
    await userEvent.click(screen.getByText(taskTitle));
    await userEvent.click(screen.getByRole("button", { name: `Task actions for ${taskTitle}` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete Task" }));
};

/** The whole TASK-05 entry path: detail view, kebab, delete entry, then the destructive confirmation. */
const deleteTaskFromDetailView = async (taskTitle: string): Promise<void> => {
    await openDeleteTaskFor(taskTitle);
    await userEvent.click(await screen.findByRole("button", { name: "Delete Task" }));
};

/*
 * The library's own live region, which it renders behind a mounted gate — this app adds no status
 * element of its own, so anything matched here came from `createColumnReorderAnnouncements`.
 */
const getAnnouncement = (): string | null | undefined => document.querySelector('[role="status"]')?.textContent;

// comment-length-exempt: an empirically-derived workaround for a documented harness limitation a future reader would otherwise "simplify" back to something that silently tests nothing (docs/adr/tech/0023)
/*
 * TASK-04's own answer to 03-RESEARCH Pitfall 4: `userEvent.dragAndDrop` (and raw DOM
 * `dispatchEvent`) both raise too few intermediate moves for `MouseSensor`'s distance-based
 * activation to ever fire — confirmed empirically, not assumed from the pitfall's column-drag
 * write-up alone, since a task's own drag is a different code path. This drives CDP's
 * `Input.dispatchMouseEvent` directly, over enough steps to clear the constraint, WITH one
 * correction the pitfall doesn't cover: `page.viewport()` renders the test iframe letterboxed
 * inside a FIXED host panel, so the frame is CSS-scaled down at any viewport wider than the panel
 * (confirmed live: a 1440px DESKTOP run measured a 1152px `frameElement` box) — dispatching this
 * component's own `getBoundingClientRect()` coordinates unscaled hits the wrong point on the host
 * page and misses the target checked only at MOBILE width, where the scale happens to be 1.
 */
type Point = { x: number; y: number };

const centerOf = (element: Element): Point => {
    const rect = element.getBoundingClientRect();

    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const STEPS_PER_LEG = 10;

/** The same host-letterboxing correction `dragThroughPoints`/`holdDragOver` both need. */
const toPageMapper = (): ((point: Point) => Point) => {
    const frameRect = window.frameElement?.getBoundingClientRect();
    const offsetX = frameRect?.left ?? 0;
    const offsetY = frameRect?.top ?? 0;
    const scaleX = frameRect ? frameRect.width / window.innerWidth : 1;
    const scaleY = frameRect ? frameRect.height / window.innerHeight : 1;

    return ({ x, y }) => ({ x: offsetX + x * scaleX, y: offsetY + y * scaleY });
};

/*
 * The lifted-state twin of `dragThroughPoints`: presses and moves through every waypoint but does
 * NOT release, returning `moveTo` (more legs, for a caller that needs to inspect an intermediate
 * hover before moving on) and `release` (releases wherever the pointer currently sits).
 */
const holdDragOver = async (
    waypoints: Point[],
): Promise<{
    moveTo: (waypoints: Point[]) => Promise<void>;
    release: () => Promise<void>;
    releaseBackAtOrigin: () => Promise<void>;
}> => {
    const toPage = toPageMapper();
    const session = cdp();
    let current = waypoints[0];
    const origin = waypoints[0];
    const scrollRow = document.querySelector<HTMLElement>("div.overflow-x-auto");
    const scrollLeftAtPress = scrollRow?.scrollLeft ?? 0;
    const startPage = toPage(current);
    await session.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: startPage.x,
        y: startPage.y,
        button: "left",
        clickCount: 1,
    });

    const moveTo = async (nextWaypoints: Point[]): Promise<void> => {
        for (const waypoint of nextWaypoints) {
            for (let step = 1; step <= STEPS_PER_LEG; step += 1) {
                const point = toPage({
                    x: current.x + ((waypoint.x - current.x) * step) / STEPS_PER_LEG,
                    y: current.y + ((waypoint.y - current.y) * step) / STEPS_PER_LEG,
                });
                await session.send("Input.dispatchMouseEvent", {
                    type: "mouseMoved",
                    x: point.x,
                    y: point.y,
                    button: "left",
                });
            }
            current = waypoint;
        }
    };

    await moveTo(waypoints.slice(1));

    const release = async (): Promise<void> => {
        const releasePage = toPage(current);
        await session.send("Input.dispatchMouseEvent", {
            type: "mouseReleased",
            x: releasePage.x,
            y: releasePage.y,
            button: "left",
        });
    };

    // comment-length-exempt: records the two measured library behaviours a one-shot walk-back loses to, which a future reader would otherwise "simplify" back into the flake this replaced (docs/adr/tech/0023)
    /*
     * The no-op ending every "issues no request" spec needs: back over the lifted card's OWN slot,
     * then release. Two library behaviours make that harder than re-reading the card's box. The card
     * is displaced by the sort strategy while it hovers elsewhere, so its live centre is the DROP
     * slot, not home — home is the press point, offset by whatever the row has auto-scrolled since
     * (Pitfall 8), which is the same correction dnd-kit applies to the rects it measured on lift. And
     * `handleDragEnd`'s `over` is read from a ref written a render behind the pointer, so a release
     * dispatched on the next CDP tick can still carry the target the pointer already left. Measured
     * 2026-08-31 at MOBILE: a walk-back to the card's live box released over the FAR column's card,
     * issuing a real cross-column move. The insertion bar is drawn from that same `over`, so polling
     * until none is left is what proves the library has followed the pointer home.
     */
    const releaseBackAtOrigin = async (): Promise<void> => {
        await expect
            .poll(
                async () => {
                    const scrolled = (scrollRow?.scrollLeft ?? 0) - scrollLeftAtPress;
                    await moveTo([{ x: origin.x - scrolled, y: origin.y }]);

                    return document.querySelectorAll('[aria-hidden="true"].bg-bg-primary').length;
                },
                { interval: 25, timeout: 5000 },
            )
            .toBe(0);
        await release();
    };

    return { moveTo, release, releaseBackAtOrigin };
};

/** A real mouse-driven drag through every waypoint in order, ending with a release at the last one. */
const dragThroughPoints = async (waypoints: Point[]): Promise<void> => {
    const { release } = await holdDragOver(waypoints);
    await release();
};

const dragElementOntoElement = async ({ source, target }: { source: Element; target: Element }): Promise<void> => {
    await dragThroughPoints([centerOf(source), centerOf(target)]);
};

/*
 * The no-op-drop case: releases back over its own origin, but only after a real out leg — a drag
 * whose start and end waypoint are the SAME point never clears the sensor's distance-activation
 * constraint, so without it this would test a plain click rather than `handleDragEnd`'s own guard.
 */
const dragElementOutAndBack = async (source: Element): Promise<void> => {
    const origin = centerOf(source);
    const { releaseBackAtOrigin } = await holdDragOver([origin, { x: origin.x, y: origin.y + 40 }]);
    await releaseBackAtOrigin();
};

/** U-02: the drag handle is the caption row itself, so its accessible name is the caption. */
const focusColumnHandle = (caption: string): void => {
    screen.getByRole("button", { name: caption }).focus();
};

/** S-04: a task's own handle, named "Reorder {Task Title}" (04-UI-SPEC Copywriting Contract). */
const focusTaskHandle = (title: string): void => {
    screen.getByRole("button", { name: `Reorder ${title}` }).focus();
};

/** The whole U-02 keyboard path: lift, step right, drop — with no request until the drop. */
const reorderFromKeyboard = async ({
    caption,
    liftKey = " ",
    steps = 1,
}: {
    caption: string;
    liftKey?: string;
    steps?: number;
}): Promise<void> => {
    focusColumnHandle(caption);
    await userEvent.keyboard(liftKey);

    for (let step = 0; step < steps; step += 1) {
        const announcedBefore = getAnnouncement();
        await userEvent.keyboard("{ArrowRight}");

        /*
         * Waiting on the announcement rather than on a timer: at a viewport too narrow to show the
         * next column, the sensor scrolls the row first and only then re-detects what it is over.
         */
        await expect.poll(getAnnouncement).not.toBe(announcedBefore);
    }

    await userEvent.keyboard(liftKey);
};

/*
 * Both the strategy's transform transition and the sensor's smooth scroll animate, so a rect read
 * taken as soon as an announcement lands is mid-flight. The empty seed forces a second poll pass.
 */
const waitForColumnLayoutToSettle = async (): Promise<void> => {
    const readLayout = (): string => {
        const scrollRow = getScrollRow();

        return Array.from(document.querySelectorAll("section"))
            .map((section) => String(Math.round(section.getBoundingClientRect().left)))
            .concat(String(Math.round(scrollRow.scrollLeft)))
            .join(",");
    };

    let previousLayout = "";

    await expect
        .poll(() => {
            const currentLayout = readLayout();
            const isSettled = currentLayout === previousLayout;
            previousLayout = currentLayout;

            return isSettled;
        })
        .toBe(true);
};

/**
 * One arrow step of a lift already in progress, reported as the pair the 03-10 defect broke: whether
 * the destination slot was already fully inside the row's visible box, and whether the row scrolled.
 */
const stepRightAndMeasureScroll = async ({
    movedName,
}: {
    movedName: string;
}): Promise<{ wasDestinationVisible: boolean; didScroll: boolean }> => {
    await waitForColumnLayoutToSettle();
    const scrollRow = getScrollRow();
    const rowRect = scrollRow.getBoundingClientRect();
    /* Read off live rects, never DOM order: a lift moves columns by transform and leaves the DOM as it was. */
    const rects = Array.from(document.querySelectorAll("section")).map((section) => ({
        name: section.querySelector("h2")?.firstElementChild?.children[1]?.textContent,
        rect: section.getBoundingClientRect(),
    }));
    const movedLeft = rects.find(({ name }) => name === movedName)?.rect.left ?? Number.NaN;
    const destination = rects
        .filter(({ rect }) => rect.left > movedLeft)
        .sort((left, right) => left.rect.left - right.rect.left)
        .at(0)?.rect;
    const wasDestinationVisible =
        destination !== undefined &&
        destination.left >= rowRect.left &&
        destination.right <= rowRect.left + scrollRow.clientWidth;
    const scrollBefore = scrollRow.scrollLeft;
    const announcedBefore = getAnnouncement();

    await userEvent.keyboard("{ArrowRight}");
    await expect.poll(getAnnouncement).not.toBe(announcedBefore);
    await waitForColumnLayoutToSettle();

    return { wasDestinationVisible, didScroll: scrollRow.scrollLeft !== scrollBefore };
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
            createColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Backlog", version: 0, position: 0 },
            });
            await render(<EmptyBoard />);

            // Act
            await submitFirstColumn("Backlog");

            // Assert
            await vi.waitFor(() => {
                expect(createColumnStub.calls).toHaveLength(1);
            });
            expect(createColumnStub.calls[0]).toEqual({ boardId: FIXTURE_BOARD_ID, name: "Backlog" });
        });

        /* UI-SPEC error/Add-Column-duplicate: its own copy, inline, and still never a toast. */
        it("keeps the modal open with the duplicate-name copy when the name is refused as a duplicate", async () => {
            // Arrange
            createColumnStub.queue({ status: RESULT_STATUS.DUPLICATE });
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
            createColumnStub.queue({ status: RESULT_STATUS.ERROR });
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
            createColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Backlog", version: 0, position: 0 },
            });
            await render(<Populated />);

            // Act
            await submitNewColumn("Backlog");

            // Assert
            await vi.waitFor(() => {
                expect(createColumnStub.calls).toHaveLength(1);
            });
            expect(createColumnStub.calls[0]).toEqual({ boardId: FIXTURE_BOARD_ID, name: "Backlog" });
            await vi.waitFor(() => {
                expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
            });
        });

        /*
         * COLUMN-01's optimistic insert (docs/adr/tech/0030): the column is on the board while the
         * action is demonstrably still unresolved, which a settle-then-assert test cannot show.
         */
        it("renders the new column on the board before the create resolves", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedColumnNames();
            createColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Backlog", version: 0, position: namesBefore.length },
            });
            createColumnStub.hold();

            // Act
            await submitNewColumn("Backlog");
            await vi.waitFor(() => {
                expect(createColumnStub.calls).toHaveLength(1);
            });

            // Assert — appended at the end of the row, where D-01 puts a new column.
            expect(getRenderedColumnNames()).toEqual([...namesBefore, "Backlog"]);

            // Act — let the write land.
            createColumnStub.settle();

            // Assert — the placeholder is SWAPPED for the server's column, never appended beside it.
            await vi.waitFor(() => {
                expect(screen.queryByRole("heading", { name: "Add New Column" })).not.toBeInTheDocument();
            });
            expect(getRenderedColumnNames()).toEqual([...namesBefore, "Backlog"]);
        });

        /* The other half of the same mechanism: a refusal must leave no trace of the optimistic column. */
        it("removes the optimistic column and reports the failure inline when the create fails", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedColumnNames();
            createColumnStub.queue({ status: RESULT_STATUS.ERROR });
            createColumnStub.hold();

            // Act
            await submitNewColumn("Backlog");
            await vi.waitFor(() => {
                expect(createColumnStub.calls).toHaveLength(1);
            });

            // Assert — the optimistic column stands while the refusal is still in flight.
            expect(getRenderedColumnNames()).toEqual([...namesBefore, "Backlog"]);

            // Act
            createColumnStub.settle();

            // Assert — nothing was created, so the rollback is silent and the copy stays inline.
            expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't create column. Try again.");
            expect(getRenderedColumnNames()).toEqual(namesBefore);
            expect(getRaisedToastCount()).toBe(0);
        });

        /* UI-SPEC error/Add-Column-generic: nothing was created, so the failure lands inline. */
        it("keeps the modal open with inline copy and no toast when the create fails", async () => {
            // Arrange
            createColumnStub.queue({ status: RESULT_STATUS.ERROR });
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
            createColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Backlog", version: 0, position: 0 },
            });
            createColumnStub.hold();
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
            createColumnStub.settle();

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
            /* Section, then its scroll region, then the header row, then the heading inside it. */
            expect(
                rowChildren
                    .slice(0, -1)
                    .map((child) => child.firstElementChild?.firstElementChild?.firstElementChild?.tagName),
            ).toEqual(Array(4).fill("H2"));
            expect(document.querySelectorAll('section h2 [aria-hidden="true"]')).toHaveLength(4);
        });

        /*
         * D-04: the ghost column always sits immediately after the newest column, so bringing it
         * into view is what confirms the create the user cannot otherwise see (D-01 appends).
         */
        it("scrolls the column row to its end after a successful create, with motion governed by CSS", async () => {
            // Arrange
            createColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Backlog", version: 0, position: 8 },
            });
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
            createColumnStub.queue({ status: RESULT_STATUS.ERROR });
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
            createColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Backlog", version: 0, position: 8 },
            });
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
            expect(createColumnStub.calls).toHaveLength(1);
            /* By its heading, not its role — the raised toast is a `dialog` too. */
            await vi.waitFor(() => {
                expect(screen.queryByRole("heading", { name: "Add New Column" })).not.toBeInTheDocument();
            });
        });

        it("raises no nudge on the create that takes the board to eight columns", async () => {
            // Arrange
            createColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Backlog", version: 0, position: 7 },
            });
            await render(<SevenColumns />);

            // Act
            await submitOpenColumnForm("Backlog");

            // Assert
            await vi.waitFor(() => {
                expect(createColumnStub.calls).toHaveLength(1);
            });
            expect(getRaisedToastCount()).toBe(0);
        });

        it("raises no nudge on the create that takes the board to ten columns", async () => {
            // Arrange
            createColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Backlog", version: 0, position: 9 },
            });
            await render(<NineColumns />);

            // Act
            await submitOpenColumnForm("Backlog");

            // Assert
            await vi.waitFor(() => {
                expect(createColumnStub.calls).toHaveLength(1);
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
            renameColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "In Progress", version: 1, position: 0 },
            });
            renameColumnStub.hold();

            // Act — submit, then observe while the action is still unresolved.
            await renameColumnFromHeader({ columnName: "Fixture Column 1", nextName: "In Progress" });

            // Assert — applied optimistically and already dismissed, with the write demonstrably open.
            await vi.waitFor(() => {
                expect(getRenderedColumnNames()).toEqual(["In Progress", ...namesBefore.slice(1)]);
            });
            expect(screen.queryByRole("heading", { name: "Rename Column" })).not.toBeInTheDocument();

            // Act — let the write land.
            renameColumnStub.settle();

            // Assert — the name stays and nothing was announced, the modal having closed long before.
            await vi.waitFor(() => {
                expect(renameColumnStub.calls).toHaveLength(1);
            });
            expect(getRenderedColumnNames()).toEqual(["In Progress", ...namesBefore.slice(1)]);
            expect(getRaisedToastCount()).toBe(0);
        });

        it("sends the column's own board id, column id, typed name and current version, exactly once", async () => {
            // Arrange
            renameColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "In Progress", version: 1, position: 1 },
            });
            await render(<Populated />);

            // Act
            await renameColumnFromHeader({ columnName: "Fixture Column 2", nextName: "In Progress" });

            // Assert
            await vi.waitFor(() => {
                expect(renameColumnStub.calls).toHaveLength(1);
            });
            expect(renameColumnStub.calls[0]).toEqual({
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
            renameColumnStub.queue({ status: RESULT_STATUS.ERROR });
            renameColumnStub.hold();

            // Act
            await renameColumnFromHeader({ columnName: "Fixture Column 1", nextName: "In Progress" });
            await vi.waitFor(() => {
                expect(getRenderedColumnNames()[0]).toBe("In Progress");
            });
            renameColumnStub.settle();

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
            renameColumnStub.queue({ status: RESULT_STATUS.CONFLICT });
            renameColumnStub.hold();

            // Act
            await renameColumnFromHeader({ columnName: "Fixture Column 1", nextName: "In Progress" });
            await vi.waitFor(() => {
                expect(getRenderedColumnNames()[0]).toBe("In Progress");
            });
            renameColumnStub.settle();

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
            renameColumnStub.queue({ status: RESULT_STATUS.UNAUTHENTICATED });

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
            renameColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "In Progress", version: 1, position: 0 },
            });
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
            renameColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: SERVER_RENAMED_NAME, version: 1, position: 0 },
            });
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
            expect(deleteColumnStub.calls).toHaveLength(0);
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
            deleteColumnStub.queue({ status: RESULT_STATUS.SUCCESS });
            await render(<Populated />);

            // Act
            await deleteColumnFromHeader("Fixture Column 2");

            // Assert — T-03-30: one call, never two.
            await vi.waitFor(() => {
                expect(deleteColumnStub.calls).toHaveLength(1);
            });
            expect(deleteColumnStub.calls[0]).toEqual({
                boardId: FIXTURE_BOARD_ID,
                columnId: Populated.args.board?.columns[1]?.id,
            });
        });

        /*
         * COLUMN-04's optimistic removal (docs/adr/tech/0030): the column is off the board while the
         * action is demonstrably still unresolved, which a settle-then-assert test cannot show.
         */
        it("removes the column from the board before the delete resolves", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedColumnNames();
            deleteColumnStub.queue({ status: RESULT_STATUS.SUCCESS });
            deleteColumnStub.hold();

            // Act — submit, then observe while the action is still unresolved.
            await deleteColumnFromHeader("Fixture Column 1");
            await vi.waitFor(() => {
                expect(deleteColumnStub.calls).toHaveLength(1);
            });

            // Assert — gone, and the confirmation is already closed, since nothing is left to wait on.
            expect(getRenderedColumnNames()).toEqual(namesBefore.filter((name) => name !== "Fixture Column 1"));
            expect(screen.queryByRole("heading", { name: "Delete this column?" })).not.toBeInTheDocument();

            // Act — let the write land.
            deleteColumnStub.settle();

            // Assert — nothing flashes back, and no toast is raised on a delete that worked.
            await vi.waitFor(() => {
                expect(getRaisedToastCount()).toBe(0);
            });
            expect(getRenderedColumnNames()).toEqual(namesBefore.filter((name) => name !== "Fixture Column 1"));
        });

        /*
         * The other half of the same mechanism: the whole-board snapshot is what brings the column
         * back WITH the tasks the cascade would have taken, which is why nothing bespoke undoes it.
         */
        it("puts the column and its tasks back and announces a generic delete failure", async () => {
            // Arrange — held, so the pre-settle state is observed before the failure lands.
            await render(<Populated />);
            const namesBefore = getRenderedColumnNames();
            const tasksBefore = getColumnTaskTitles();
            deleteColumnStub.queue({ status: RESULT_STATUS.ERROR });
            deleteColumnStub.hold();

            // Act
            await deleteColumnFromHeader("Fixture Column 1");
            await vi.waitFor(() => {
                expect(deleteColumnStub.calls).toHaveLength(1);
            });

            // Assert — removed optimistically, before anything has been refused.
            expect(getRenderedColumnNames()).toEqual(namesBefore.filter((name) => name !== "Fixture Column 1"));

            // Act
            deleteColumnStub.settle();

            // Assert
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toEqual([GENERIC_DELETE_TOAST]);
            });
            expect(screen.queryByRole("heading", { name: "Delete this column?" })).not.toBeInTheDocument();
            expect(getRenderedColumnNames()).toEqual(namesBefore);
            expect(getColumnTaskTitles()).toEqual(tasksBefore);
        });

        /*
         * UI-SPEC error/version-conflict: a stale version earns its OWN copy, because retrying
         * against the same version fails identically and generic retry copy would loop the user.
         */
        it("raises the distinct version-conflict copy, not the generic one, when the delete conflicts", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedColumnNames();
            deleteColumnStub.queue({ status: RESULT_STATUS.CONFLICT });

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

        /*
         * The keyboard path carries the automated coverage deliberately: a harness pointer drag
         * raises one intermediate move, which this library does not register as a drag, so an
         * automated pointer assertion would pass while testing nothing (03-RESEARCH Pitfall 4).
         */
        it("moves a column one position later when it is lifted, arrowed right and dropped", async () => {
            // Arrange
            reorderColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Fixture Column 1", version: 1, position: 1 },
            });
            reorderColumnStub.hold();
            await render(<ReorderableColumns />);

            // Act
            await reorderFromKeyboard({ caption: "Fixture Column 1 (2)" });

            // Assert
            await expect
                .poll(getRenderedColumnNames)
                .toEqual(["Fixture Column 2", "Fixture Column 1", "Fixture Column 3", "Fixture Column 4"]);
            expect(reorderColumnStub.calls).toHaveLength(1);
            reorderColumnStub.settle();
        });

        /* D-06: the library's default lift keys are kept, so enter lifts exactly as space does. */
        it("lifts and drops on the enter key as well as the space bar", async () => {
            // Arrange
            reorderColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Fixture Column 1", version: 1, position: 1 },
            });
            reorderColumnStub.hold();
            await render(<ReorderableColumns />);

            // Act
            await reorderFromKeyboard({ caption: "Fixture Column 1 (2)", liftKey: "{Enter}" });

            // Assert
            await expect
                .poll(getRenderedColumnNames)
                .toEqual(["Fixture Column 2", "Fixture Column 1", "Fixture Column 3", "Fixture Column 4"]);
            expect(reorderColumnStub.calls).toHaveLength(1);
            reorderColumnStub.settle();
        });

        it("returns the column to its original index and issues nothing when the move is cancelled", async () => {
            // Arrange
            await render(<ReorderableColumns />);
            focusColumnHandle("Fixture Column 1 (2)");

            // Act
            await userEvent.keyboard(" ");
            await userEvent.keyboard("{ArrowRight}");
            await userEvent.keyboard("{Escape}");

            // Assert
            await expect
                .poll(getRenderedColumnNames)
                .toEqual(["Fixture Column 1", "Fixture Column 2", "Fixture Column 3", "Fixture Column 4"]);
            expect(reorderColumnStub.calls).toHaveLength(0);
        });

        /*
         * T-03-12: a request per keystroke would burn versions and conflict against itself, so the
         * number of intermediate steps must not change the number of requests.
         */
        it("issues exactly one request however many arrow steps the move took", async () => {
            // Arrange
            reorderColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Fixture Column 1", version: 1, position: 3 },
            });
            reorderColumnStub.hold();
            await render(<ReorderableColumns />);

            // Act
            await reorderFromKeyboard({ caption: "Fixture Column 1 (2)", steps: 3 });

            // Assert
            await expect
                .poll(getRenderedColumnNames)
                .toEqual(["Fixture Column 2", "Fixture Column 3", "Fixture Column 4", "Fixture Column 1"]);
            expect(reorderColumnStub.calls).toHaveLength(1);
            expect(reorderColumnStub.calls[0].targetPosition).toBe(3);
            reorderColumnStub.settle();
        });

        /*
         * The four strings are asserted in full, not by substring, so an edit to 03-UI-SPEC's
         * Copywriting Contract fails here rather than shipping silently. Positions are 1-based.
         */
        it("announces the lift, each move and the drop in the contract's own wording", async () => {
            // Arrange
            reorderColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Fixture Column 1", version: 1, position: 1 },
            });
            await render(<ReorderableColumns />);
            focusColumnHandle("Fixture Column 1 (2)");

            // Act & Assert
            await userEvent.keyboard(" ");
            await expect
                .poll(getAnnouncement)
                .toBe(
                    "Picked up Fixture Column 1, position 1 of 4. Use left and right arrow keys to move, space to drop, escape to cancel.",
                );

            await userEvent.keyboard("{ArrowRight}");
            await expect.poll(getAnnouncement).toBe("Fixture Column 1 moved to position 2 of 4.");

            await userEvent.keyboard(" ");
            await expect.poll(getAnnouncement).toBe("Fixture Column 1 dropped at position 2 of 4.");
        });

        it("announces a cancelled move as a return to the position the column started at", async () => {
            // Arrange
            await render(<ReorderableColumns />);
            focusColumnHandle("Fixture Column 1 (2)");

            // Act
            await userEvent.keyboard(" ");
            await userEvent.keyboard("{ArrowRight}");
            await userEvent.keyboard("{Escape}");

            // Assert
            await expect.poll(getAnnouncement).toBe("Move cancelled. Fixture Column 1 returned to position 1 of 4.");
        });

        /* The announcements are the library's own region, never the toast viewport (UI-SPEC toast reuse). */
        it("keeps the reorder announcements out of the toast area", async () => {
            // Arrange
            await render(<ReorderableColumns />);
            focusColumnHandle("Fixture Column 1 (2)");

            // Act
            await userEvent.keyboard(" ");

            // Assert
            await expect.poll(getAnnouncement).toContain("Picked up Fixture Column 1");
            expect(getRaisedToastCount()).toBe(0);
        });

        /*
         * T-03-31, at the width 03-BACKEND-FACTS § R2 justifies: only the MOVED column's version was
         * bumped, so only its own two entries close — a merely shifted column stays usable.
         */
        it("disables the moved column's own two entries while its reorder is in flight", async () => {
            // Arrange
            await render(<ReorderInFlight />);
            reorderColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Fixture Column 1", version: 1, position: 1 },
            });
            reorderColumnStub.hold();
            await reorderFromKeyboard({ caption: "Fixture Column 1 (2)" });

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Column actions for Fixture Column 1" }));

            // Assert
            const items = await screen.findAllByRole("menuitem");
            expect(items.map((item) => item.textContent)).toEqual(["Rename Column", "Delete Column"]);
            expect(items.map((item) => item.getAttribute("data-disabled"))).toEqual(["", ""]);
            reorderColumnStub.settle();
        });

        it("leaves a merely shifted column's entries available while the reorder is in flight", async () => {
            // Arrange
            await render(<ReorderInFlight />);
            reorderColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Fixture Column 1", version: 1, position: 1 },
            });
            reorderColumnStub.hold();
            await reorderFromKeyboard({ caption: "Fixture Column 1 (2)" });

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Column actions for Fixture Column 2" }));

            // Assert
            const items = await screen.findAllByRole("menuitem");
            expect(items.map((item) => item.getAttribute("data-disabled"))).toEqual([null, null]);
            reorderColumnStub.settle();
        });

        /* U-05: the WHOLE board's order comes back, because the move shifted every column between. */
        it("restores the rendered order and raises the rollback toast when the reorder fails", async () => {
            // Arrange
            await render(<ReorderableColumns />);
            reorderColumnStub.queue({ status: RESULT_STATUS.ERROR });

            // Act
            await reorderFromKeyboard({ caption: "Fixture Column 1 (2)", steps: 3 });

            // Assert
            await expect.poll(getRaisedToastTexts).toEqual([GENERIC_REORDER_TOAST]);
            await expect
                .poll(getRenderedColumnNames)
                .toEqual(["Fixture Column 1", "Fixture Column 2", "Fixture Column 3", "Fixture Column 4"]);
        });

        /*
         * T-03-32's most likely regression, and the reason the kebab is a sibling of the handle
         * rather than a descendant: a plain press must never cross the activation constraint.
         */
        it("opens a column's menu on a plain kebab click and starts no reorder", async () => {
            // Arrange
            await render(<ReorderableColumns />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Column actions for Fixture Column 2" }));

            // Assert
            expect(await screen.findByRole("menuitem", { name: "Rename Column" })).toBeInTheDocument();
            expect(reorderColumnStub.calls).toHaveLength(0);
            expect(getRenderedColumnNames()).toEqual([
                "Fixture Column 1",
                "Fixture Column 2",
                "Fixture Column 3",
                "Fixture Column 4",
            ]);
        });

        /*
         * COLUMN-03's read half: the board arrives already in display order, so the container renders
         * it verbatim and the optimistic `arrayMove` composes on top of that order (03-14).
         */
        it("renders a board the user already reordered in the order the read boundary handed over", async () => {
            // Arrange & Act
            await render(<ReorderedServerOrder />);

            // Assert
            expect(getRenderedColumnNames()).toEqual([
                "Fixture Column 2",
                "Fixture Column 3",
                "Fixture Column 1",
                "Fixture Column 4",
            ]);
        });

        it("moves a column relative to that already-reordered order, not to creation order", async () => {
            // Arrange
            reorderColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Fixture Column 2", version: 1, position: 1 },
            });
            reorderColumnStub.hold();
            await render(<ReorderedServerOrder />);

            // Act
            await reorderFromKeyboard({ caption: "Fixture Column 2 (2)" });

            // Assert
            await expect
                .poll(getRenderedColumnNames)
                .toEqual(["Fixture Column 3", "Fixture Column 2", "Fixture Column 1", "Fixture Column 4"]);
            expect(reorderColumnStub.calls).toHaveLength(1);
            expect(reorderColumnStub.calls[0].targetPosition).toBe(1);
            reorderColumnStub.settle();
        });

        /*
         * The 03-10 checkpoint's defect, as an invariant that holds at both viewports: dnd-kit
         * scrolled for any destination past the row's MIDPOINT, throwing a visible neighbour off it.
         */
        it("scrolls the row only for a keyboard step whose destination is not already fully on screen", async () => {
            // Arrange
            reorderColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Fixture Column 1", version: 1, position: 4 },
            });
            await render(<FiveReorderableColumns />);
            focusColumnHandle("Fixture Column 1 (2)");
            await userEvent.keyboard(" ");

            // Act
            const steps: { wasDestinationVisible: boolean; didScroll: boolean }[] = [];
            for (let step = 0; step < 4; step += 1) {
                steps.push(await stepRightAndMeasureScroll({ movedName: "Fixture Column 1" }));
            }
            await userEvent.keyboard(" ");

            // Assert
            expect(steps.map(({ wasDestinationVisible, didScroll }) => wasDestinationVisible && didScroll)).toEqual([
                false,
                false,
                false,
                false,
            ]);
        });

        /* T-03-45's other side: the narrowing is keyboard-only, so the pointer path's scroll is untouched. */
        it("leaves the row's scroll where it was through a plain pointer press on a column handle", async () => {
            // Arrange
            await render(<FiveReorderableColumns />);
            const scrollRow = getScrollRow();

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Fixture Column 1 (2)" }));

            // Assert
            expect(scrollRow.scrollLeft).toBe(0);
            expect(reorderColumnStub.calls).toHaveLength(0);
        });

        /*
         * The trade this task refuses: suppressing the scroll wholesale passes the case above and
         * silently removes keyboard access to every column past the fold.
         */
        it("still moves a column past the fold by keyboard and leaves it on screen", async () => {
            // Arrange
            reorderColumnStub.queue({
                status: RESULT_STATUS.SUCCESS,
                column: { id: STUB_WRITTEN_COLUMN_ID, name: "Fixture Column 1", version: 1, position: 4 },
            });
            reorderColumnStub.hold();
            await render(<FiveReorderableColumns />);

            // Act
            await reorderFromKeyboard({ caption: "Fixture Column 1 (2)", steps: 4 });

            // Assert
            await expect
                .poll(getRenderedColumnNames)
                .toEqual([
                    "Fixture Column 2",
                    "Fixture Column 3",
                    "Fixture Column 4",
                    "Fixture Column 5",
                    "Fixture Column 1",
                ]);
            expect(reorderColumnStub.calls[0].targetPosition).toBe(4);
            await expect.poll(getColumnsOverlappingTheVisibleBox).toContain("Fixture Column 1");
            reorderColumnStub.settle();
        });

        /*
         * T-03-43: ordering is the read boundary's one job. Given props whose array order and
         * `position` values disagree, this container must still render the array it was handed.
         */
        it("adds no ordering of its own when the props' array order and positions disagree", async () => {
            // Arrange & Act
            await render(<ColumnsOutOfPositionOrder />);

            // Assert
            expect(getRenderedColumnNames()).toEqual(["Fixture Column 1", "Fixture Column 2", "Fixture Column 3"]);
        });

        /*
         * TASK-04's own tracer proof: a task dragged into a different column lands there before the
         * request settles (the optimistic apply), and issues exactly one request — no intermediate
         * pointer step between press and release reaches `moveTaskAction`.
         */
        it("moves a task into another column, rendering it there before the request settles, and sends exactly one request", async () => {
            // Arrange
            await render(<TasksAcrossColumns />);
            moveTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: "00000000-0000-4000-8000-d10000000001",
                    title: "Fixture Task Alpha",
                    description: undefined,
                    version: 1,
                    position: 0,
                },
            });
            moveTaskStub.hold();
            const source = screen.getByRole("button", { name: "Reorder Fixture Task Alpha" });
            const target = screen.getByRole("button", { name: /^Fixture Task Beta/ });

            // Act
            await dragElementOntoElement({ source, target });

            // Assert — rendered in the destination BEFORE the request settles, and only one call was made.
            await expect.poll(getColumnTaskTitles).toEqual([
                { columnName: "Fixture Column 1", taskTitles: [] },
                { columnName: "Fixture Column 2", taskTitles: ["Fixture Task Alpha", "Fixture Task Beta"] },
            ]);
            expect(moveTaskStub.calls).toHaveLength(1);
            expect(moveTaskStub.calls[0]).toEqual({
                taskId: "00000000-0000-4000-8000-d10000000001",
                targetColumnId: "00000000-0000-4000-8000-c00000000002",
                version: 0,
                targetPosition: 0,
            });
            moveTaskStub.settle();
        });

        /*
         * Pitfall 9 / UI-SPEC S-06: the empty column's card list is a real droppable, not a
         * zero-height gap — the drop resolves to that column with the position naming its end.
         */
        it("moves a task into a column holding zero tasks, sending exactly one request naming it", async () => {
            // Arrange
            await render(<TaskIntoEmptyColumn />);
            moveTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: "00000000-0000-4000-8000-d10000000001",
                    title: "Fixture Task Alpha",
                    description: undefined,
                    version: 1,
                    position: 0,
                },
            });
            moveTaskStub.hold();
            const source = screen.getByRole("button", { name: "Reorder Fixture Task Alpha" });
            const target = document.querySelectorAll("section")[1].querySelector("ul");
            if (target === null) {
                throw new Error("the empty column's card list did not render");
            }

            // Act
            await dragElementOntoElement({ source, target });

            // Assert
            await expect.poll(getColumnTaskTitles).toEqual([
                { columnName: "Fixture Column 1", taskTitles: [] },
                { columnName: "Fixture Column 2", taskTitles: ["Fixture Task Alpha"] },
            ]);
            expect(moveTaskStub.calls).toHaveLength(1);
            expect(moveTaskStub.calls[0]).toEqual({
                taskId: "00000000-0000-4000-8000-d10000000001",
                targetColumnId: "00000000-0000-4000-8000-c00000000002",
                version: 0,
                targetPosition: 0,
            });
            moveTaskStub.settle();
        });

        /* UI-SPEC populated/drag-drop-surface: the lifted treatment mirrors the shipped column one. */
        it("fades the source card in place and shows a full-opacity clone following the pointer while lifted", async () => {
            // Arrange
            await render(<TasksAcrossColumns />);
            const source = screen.getByRole("button", { name: "Reorder Fixture Task Alpha" });
            const sourceCard = source.closest("li");
            if (sourceCard === null) {
                throw new Error("the source task's card did not render");
            }
            const target = screen.getByRole("button", { name: /^Fixture Task Beta/ });
            const origin = centerOf(source);

            /* Held over the OTHER column — the lifted state is on screen to read while it hovers there. */
            const { releaseBackAtOrigin } = await holdDragOver([origin, centerOf(target)]);

            // Assert
            await expect.poll(() => sourceCard.className).toContain("opacity-50");
            await expect.poll(() => document.querySelectorAll(".shadow-lg").length).toBeGreaterThan(0);
            const clone = document.querySelector(".shadow-lg");
            expect(clone?.className).not.toContain("opacity-50");
            expect(clone?.textContent).toContain("Fixture Task Alpha");

            // Cleanup — a no-op drop back on the card's own slot.
            await releaseBackAtOrigin();
            expect(moveTaskStub.calls).toHaveLength(0);
        });

        /*
         * S-08's axis-flipped twin of the column indicator: the bar reads from the sort strategy's
         * own indices, so the pointer path and the keyboard path indicate at the same slot.
         */
        it("renders the insertion indicator at the hovered card while a pointer drag is over it", async () => {
            // Arrange
            await render(<ReorderableTasks />);
            const source = screen.getByRole("button", { name: "Reorder Task One" });
            const target = screen.getByRole("button", { name: "Reorder Task Three" });
            const origin = centerOf(source);

            // Act — held over the target, so the indicator it draws is on screen to read.
            const { releaseBackAtOrigin } = await holdDragOver([origin, centerOf(target)]);

            // Assert
            await expect
                .poll(() => document.querySelectorAll('li [aria-hidden="true"].bg-bg-primary').length)
                .toBeGreaterThan(0);

            // Cleanup — a no-op drop back on the card's own slot.
            await releaseBackAtOrigin();
            expect(moveTaskStub.calls).toHaveLength(0);
        });

        it("renders the insertion indicator at the same index for a keyboard step as a pointer drag would", async () => {
            // Arrange
            await render(<ReorderableTasks />);
            focusTaskHandle("Task One");

            // Act
            await userEvent.keyboard(" ");
            const liftedAnnouncement = getAnnouncement();
            await userEvent.keyboard("{ArrowDown}");
            await expect.poll(getAnnouncement).not.toBe(liftedAnnouncement);

            // Assert
            expect(document.querySelectorAll('li [aria-hidden="true"].bg-bg-primary').length).toBeGreaterThan(0);

            // Cleanup — stepped back to the original index before dropping, so the drop is a no-op.
            await userEvent.keyboard("{ArrowUp}");
            await userEvent.keyboard(" ");
            expect(moveTaskStub.calls).toHaveLength(0);
        });

        /* Pitfall 9's own visual half: the empty body draws S-08's bar directly, having no card of its own to carry one. */
        it("renders the insertion indicator inside an empty column's body while a task drag is over it", async () => {
            // Arrange
            await render(<TaskIntoEmptyColumn />);
            const source = screen.getByRole("button", { name: "Reorder Fixture Task Alpha" });
            const origin = centerOf(source);
            const target = document.querySelectorAll("section")[1].querySelector("ul");
            if (target === null) {
                throw new Error("the empty column's card list did not render");
            }

            // Act
            const { releaseBackAtOrigin } = await holdDragOver([origin, centerOf(target)]);

            // Assert
            await expect
                .poll(() => target.querySelectorAll(':scope > [aria-hidden="true"].bg-bg-primary').length)
                .toBeGreaterThan(0);

            // Cleanup — a no-op drop back on the card's own slot.
            await releaseBackAtOrigin();
            expect(moveTaskStub.calls).toHaveLength(0);
        });

        /*
         * UI-SPEC partial/task-card: the follow transition is DROPPED entirely, never merely shortened.
         * Emulated via CDP rather than a `window.matchMedia` stub — a real `prefers-reduced-motion`
         * media-query change, not a fake of the platform API (ADR tech/0020 no-mocking policy).
         */
        it("drops the settle transition entirely under reduced motion, rather than shortening it", async () => {
            // Arrange
            const session = cdp();
            await session.send("Emulation.setEmulatedMedia", {
                features: [{ name: "prefers-reduced-motion", value: "reduce" }],
            });

            try {
                await render(<ReorderableTasks />);
                focusTaskHandle("Task One");
                await userEvent.keyboard(" ");
                const liftedAnnouncement = getAnnouncement();
                await userEvent.keyboard("{ArrowDown}");
                await expect.poll(getAnnouncement).not.toBe(liftedAnnouncement);

                // Assert — the shifted sibling settles into its new slot with no transition style at all.
                const shiftedCard = screen.getByRole("button", { name: "Reorder Task Two" }).closest("li");
                if (shiftedCard === null) {
                    throw new Error("Task Two's card did not render");
                }
                await expect.poll(() => shiftedCard.style.transition).toBe("");

                // Cleanup — stepped back to the original index before dropping, so the drop is a no-op.
                await userEvent.keyboard("{ArrowUp}");
                await userEvent.keyboard(" ");
                expect(moveTaskStub.calls).toHaveLength(0);
            } finally {
                await session.send("Emulation.setEmulatedMedia", {
                    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
                });
            }
        });

        /*
         * 04-RESEARCH Pitfall 8's regression guard: an unguarded narrowing would measure a task's
         * step against its own column body (a vertical scroll container), not the horizontal row —
         * this proves the cross-column keyboard step still completes rather than getting stuck.
         */
        it("moves a task into another column when lifted, arrowed right and dropped by keyboard", async () => {
            // Arrange
            moveTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: "00000000-0000-4000-8000-d10000000001",
                    title: "Fixture Task Alpha",
                    description: undefined,
                    version: 1,
                    position: 0,
                },
            });
            moveTaskStub.hold();
            await render(<TasksAcrossColumns />);
            focusTaskHandle("Fixture Task Alpha");

            // Act
            await userEvent.keyboard(" ");
            const liftedAnnouncement = getAnnouncement();
            await userEvent.keyboard("{ArrowRight}");
            /*
             * At a viewport too narrow to show both columns, the sensor scrolls the row first and
             * only then re-detects what it is over — the same defect class 03-14 fixed for columns.
             */
            await expect.poll(getAnnouncement).not.toBe(liftedAnnouncement);
            await userEvent.keyboard(" ");

            // Assert
            await expect.poll(() => getColumnTaskTitles()[1].taskTitles).toContain("Fixture Task Alpha");
            expect(getColumnTaskTitles()[0].taskTitles).not.toContain("Fixture Task Alpha");
            expect(moveTaskStub.calls).toHaveLength(1);
            moveTaskStub.settle();
        });

        /*
         * The keyboard twin of the pointer case above it. `sortableKeyboardCoordinates` picks its
         * candidate from `droppableRects`, which is measured at drag start — and the column body is
         * disabled until a TASK drag is active, so an empty column has no card to stand in for it.
         */
        it("moves a task into a column holding zero tasks when arrowed right and dropped by keyboard", async () => {
            // Arrange
            moveTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: "00000000-0000-4000-8000-d10000000001",
                    title: "Fixture Task Alpha",
                    description: undefined,
                    version: 1,
                    position: 0,
                },
            });
            moveTaskStub.hold();
            await render(<TaskIntoEmptyColumn />);
            focusTaskHandle("Fixture Task Alpha");

            // Act
            await userEvent.keyboard(" ");
            const liftedAnnouncement = getAnnouncement();
            await userEvent.keyboard("{ArrowRight}");
            await expect.poll(getAnnouncement).not.toBe(liftedAnnouncement);
            await userEvent.keyboard(" ");

            // Assert
            await expect.poll(() => getColumnTaskTitles()[1].taskTitles).toContain("Fixture Task Alpha");
            expect(getColumnTaskTitles()[0].taskTitles).not.toContain("Fixture Task Alpha");
            expect(moveTaskStub.calls).toHaveLength(1);
            expect(moveTaskStub.calls[0]).toEqual({
                taskId: "00000000-0000-4000-8000-d10000000001",
                targetColumnId: "00000000-0000-4000-8000-c00000000002",
                version: 0,
                targetPosition: 0,
            });
            moveTaskStub.settle();
        });

        it("issues no request when a task is dropped back where it began", async () => {
            // Arrange
            await render(<TasksAcrossColumns />);
            const source = screen.getByRole("button", { name: "Reorder Fixture Task Alpha" });

            // Act
            await dragElementOutAndBack(source);

            // Assert
            expect(moveTaskStub.calls).toHaveLength(0);
            expect(getColumnTaskTitles()).toEqual([
                { columnName: "Fixture Column 1", taskTitles: ["Fixture Task Alpha"] },
                { columnName: "Fixture Column 2", taskTitles: ["Fixture Task Beta"] },
            ]);
        });

        /* U-05's task-level twin: both columns the move touched come back, not just the dragged card. */
        it("returns the task to its original column and raises the failure toast when the move fails", async () => {
            // Arrange
            await render(<TasksAcrossColumns />);
            moveTaskStub.queue({ status: RESULT_STATUS.ERROR });
            const source = screen.getByRole("button", { name: "Reorder Fixture Task Alpha" });
            const target = screen.getByRole("button", { name: /^Fixture Task Beta/ });

            // Act
            await dragElementOntoElement({ source, target });

            // Assert
            await expect.poll(getRaisedToastTexts).toEqual([GENERIC_MOVE_TOAST]);
            await expect.poll(getColumnTaskTitles).toEqual([
                { columnName: "Fixture Column 1", taskTitles: ["Fixture Task Alpha"] },
                { columnName: "Fixture Column 2", taskTitles: ["Fixture Task Beta"] },
            ]);
        });

        /*
         * SYNC-01/T-04-06/T-04-34: revert and toast proved TOGETHER — a silent revert reads as lost
         * work. `moveTaskStub.calls` staying at 1 proves no client re-read; the action's own
         * `refresh()` on `CONFLICT` is proved instead by `move-task-action.integration.test.ts`.
         */
        it("reverts the card, raises the distinct version-conflict toast, and issues no extra client request for a stale version", async () => {
            // Arrange
            await render(<TasksAcrossColumns />);
            moveTaskStub.queue({ status: RESULT_STATUS.CONFLICT });
            const source = screen.getByRole("button", { name: "Reorder Fixture Task Alpha" });
            const target = screen.getByRole("button", { name: /^Fixture Task Beta/ });

            // Act
            await dragElementOntoElement({ source, target });

            // Assert — the two branches are proved different, not merely proved to raise something.
            await expect.poll(getRaisedToastTexts).toEqual([CONFLICT_MOVE_TOAST]);
            expect(CONFLICT_MOVE_TOAST).not.toBe(GENERIC_MOVE_TOAST);
            await expect.poll(getColumnTaskTitles).toEqual([
                { columnName: "Fixture Column 1", taskTitles: ["Fixture Task Alpha"] },
                { columnName: "Fixture Column 2", taskTitles: ["Fixture Task Beta"] },
            ]);
            expect(moveTaskStub.calls).toHaveLength(1);
        });

        /* D-13's split, proved at the integration point rather than only in the card's own test. */
        it("opens the task detail view on a card click, and not on a handle click", async () => {
            // Arrange
            await render(<TasksAcrossColumns />);

            // Act
            await userEvent.click(screen.getByText("Fixture Task Alpha"));

            // Assert
            expect(await screen.findByRole("heading", { name: "Fixture Task Alpha" })).toBeInTheDocument();

            // Act — dismiss, then click the sibling card's HANDLE.
            await userEvent.keyboard("{Escape}");
            await userEvent.click(screen.getByRole("button", { name: "Reorder Fixture Task Beta" }));

            // Assert — no modal opened.
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        /*
         * D-10: the detail view's Current Status control is the move mutation's SECOND caller —
         * same hook, same optimistic apply, so the board re-parents the card behind the modal.
         */
        it("moves a task through the Current Status control, issuing exactly one request naming the chosen column", async () => {
            // Arrange
            moveTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: "00000000-0000-4000-8000-d10000000001",
                    title: "Fixture Task Alpha",
                    description: undefined,
                    version: 1,
                    position: 1,
                },
            });
            await render(<TasksAcrossColumns />);
            await userEvent.click(screen.getByText("Fixture Task Alpha"));

            // Act
            await userEvent.click(screen.getByRole("combobox", { name: "Fixture Column 1" }));
            await userEvent.click(await screen.findByRole("option", { name: "Fixture Column 2" }));

            // Assert
            expect(moveTaskStub.calls).toHaveLength(1);
            expect(moveTaskStub.calls[0]).toEqual({
                taskId: "00000000-0000-4000-8000-d10000000001",
                targetColumnId: "00000000-0000-4000-8000-c00000000002",
                version: 0,
                targetPosition: 1,
            });
            await expect.poll(getColumnTaskTitles).toEqual([
                { columnName: "Fixture Column 1", taskTitles: [] },
                { columnName: "Fixture Column 2", taskTitles: ["Fixture Task Beta", "Fixture Task Alpha"] },
            ]);
        });

        /* The dropdown's own loading axis is the ONLY pending signal — the card behind it stays idle. */
        it("marks the status control busy and disabled while its own move is in flight, without a second pending signal on the card", async () => {
            // Arrange
            moveTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: "00000000-0000-4000-8000-d10000000001",
                    title: "Fixture Task Alpha",
                    description: undefined,
                    version: 1,
                    position: 1,
                },
            });
            moveTaskStub.hold();
            await render(<TasksAcrossColumns />);
            await userEvent.click(screen.getByText("Fixture Task Alpha"));
            await userEvent.click(screen.getByRole("combobox", { name: "Fixture Column 1" }));

            // Act
            await userEvent.click(await screen.findByRole("option", { name: "Fixture Column 2" }));

            // Assert
            const trigger = screen.getByRole("combobox");
            await expect.poll(() => trigger.getAttribute("aria-busy")).toBe("true");
            expect(trigger).toBeDisabled();
            /*
             * Read off the DOM rather than by role: Base UI marks the tree outside the open dialog
             * `aria-hidden`, so a role query finds nothing while the modal is open.
             */
            const alphaCard = Array.from(document.querySelectorAll("li")).find((item) =>
                item.textContent.startsWith("Fixture Task Alpha"),
            );
            expect(alphaCard).not.toBeUndefined();
            expect(alphaCard?.getAttribute("aria-busy")).toBe("false");

            // Cleanup
            moveTaskStub.settle();
        });

        /*
         * SYNC-01/T-04-06's twin for the second entry point: revert and toast proved TOGETHER, and
         * the SAME mechanism the drag path uses, since both are the same hook.
         */
        it("reverts both the status control's value and the card's column on a status-control move failure, raising the drag path's own toast", async () => {
            // Arrange
            moveTaskStub.queue({ status: RESULT_STATUS.ERROR });
            await render(<TasksAcrossColumns />);
            await userEvent.click(screen.getByText("Fixture Task Alpha"));

            // Act
            await userEvent.click(screen.getByRole("combobox", { name: "Fixture Column 1" }));
            await userEvent.click(await screen.findByRole("option", { name: "Fixture Column 2" }));

            // Assert
            await expect.poll(getRaisedToastTexts).toEqual([GENERIC_MOVE_TOAST]);
            await expect.poll(getColumnTaskTitles).toEqual([
                { columnName: "Fixture Column 1", taskTitles: ["Fixture Task Alpha"] },
                { columnName: "Fixture Column 2", taskTitles: ["Fixture Task Beta"] },
            ]);
            await expect.poll(() => screen.getByRole("combobox").textContent).toBe("Fixture Column 1");
        });

        /*
         * SUBTASK-02's own tracer proof at the board integration point: the checklist and the card's
         * caption behind the modal derive from the SAME optimistic state, so a toggle updates both in
         * the same instant — and the plural word never varies as the counts change (0 to 1).
         */
        it("changes the card's caption behind the modal in the same instant the checkbox flips", async () => {
            // Arrange
            updateSubtaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                subtask: {
                    id: "00000000-0000-4000-8000-00000000000a",
                    title: "Fixture Subtask",
                    isCompleted: true,
                    version: 1,
                },
            });
            await render(<TasksAcrossColumns />);
            expect(getCardCaption("Fixture Task Alpha")).toBe("0 of 1 subtasks");
            await userEvent.click(screen.getByText("Fixture Task Alpha"));

            // Act
            await userEvent.click(await screen.findByRole("checkbox", { name: "Fixture Subtask" }));

            // Assert — the checklist row and the card behind it, from one cache write.
            await expect
                .poll(() => screen.getByRole("checkbox", { name: "Fixture Subtask" }).getAttribute("aria-checked"))
                .toBe("true");
            expect(getCardCaption("Fixture Task Alpha")).toBe("1 of 1 subtasks");
        });

        /*
         * UI-SPEC error/subtask-checklist-row: the checkbox and the card's caption revert TOGETHER,
         * asserted as ONE behaviour — a caption-only rollback miss is the defect this case exists for.
         */
        it("reverts BOTH the checkbox and the card's caption together on a toggle failure", async () => {
            // Arrange
            updateSubtaskStub.queue({ status: RESULT_STATUS.ERROR });
            await render(<TasksAcrossColumns />);
            await userEvent.click(screen.getByText("Fixture Task Alpha"));
            const checkbox = await screen.findByRole("checkbox", { name: "Fixture Subtask" });

            // Act
            await userEvent.click(checkbox);

            // Assert
            await expect.poll(getRaisedToastTexts).toEqual([GENERIC_TOGGLE_TOAST]);
            expect(checkbox.getAttribute("aria-checked")).toBe("false");
            expect(getCardCaption("Fixture Task Alpha")).toBe("0 of 1 subtasks");
        });

        /*
         * TASK-03's own tracer proof at the board integration point: the card is the only surface
         * left to show the save once the modal has closed (S-01), so this is where it must be proved.
         */
        it("shows the new title on the card immediately and returns to the detail view once the edit modal closes", async () => {
            // Arrange
            updateTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: "00000000-0000-4000-8000-d10000000001",
                    title: "Renamed Task",
                    description: undefined,
                    version: 1,
                    position: 0,
                },
            });
            await render(<TasksAcrossColumns />);
            await userEvent.click(screen.getByText("Fixture Task Alpha"));
            await userEvent.click(screen.getByRole("button", { name: "Task actions for Fixture Task Alpha" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Task" }));

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Renamed Task");
            await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

            // Assert — the card carries the new title, and the Edit modal is gone (back on the detail view).
            await expect.poll(getColumnTaskTitles).toEqual([
                { columnName: "Fixture Column 1", taskTitles: ["Renamed Task"] },
                { columnName: "Fixture Column 2", taskTitles: ["Fixture Task Beta"] },
            ]);
            expect(screen.queryByRole("heading", { name: "Edit Task" })).not.toBeInTheDocument();
            expect(screen.getByRole("heading", { name: "Renamed Task" })).toBeInTheDocument();
        });

        /* UI-SPEC error/edit-task-modal: the failure is a TOAST, since the modal has already closed. */
        it("reverts the card's title and raises the authored toast on a save failure", async () => {
            // Arrange
            updateTaskStub.queue({ status: RESULT_STATUS.ERROR });
            await render(<TasksAcrossColumns />);
            await userEvent.click(screen.getByText("Fixture Task Alpha"));
            await userEvent.click(screen.getByRole("button", { name: "Task actions for Fixture Task Alpha" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Task" }));

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Renamed Task");
            await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

            // Assert
            await expect.poll(getRaisedToastTexts).toEqual([GENERIC_UPDATE_TASK_TOAST]);
            expect(getColumnTaskTitles()).toEqual([
                { columnName: "Fixture Column 1", taskTitles: ["Fixture Task Alpha"] },
                { columnName: "Fixture Column 2", taskTitles: ["Fixture Task Beta"] },
            ]);
        });

        /* SYNC-01/C-08: the distinct version-conflict toast, matching the phase-wide title (D-12). */
        it("raises the version-conflict toast, matching the phase-wide title, on a stale-version save", async () => {
            // Arrange
            updateTaskStub.queue({ status: RESULT_STATUS.CONFLICT });
            await render(<TasksAcrossColumns />);
            await userEvent.click(screen.getByText("Fixture Task Alpha"));
            await userEvent.click(screen.getByRole("button", { name: "Task actions for Fixture Task Alpha" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Task" }));

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Renamed Task");
            await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

            // Assert
            await expect.poll(getRaisedToastTexts).toEqual([CONFLICT_UPDATE_TASK_TOAST]);
        });

        /*
         * SUBTASK-04's own tracer proof: a failed delete reinstates the row at its ORIGINAL index
         * (not appended to the end) and reverts the card's caption together, proving the toggle
         * case's caption-only-rollback-miss regression is covered for the delete path too.
         */
        it("reverts a failed subtask delete to its ORIGINAL index and reverts the card's caption", async () => {
            // Arrange
            deleteSubtaskStub.queue({ status: RESULT_STATUS.ERROR });
            await render(<TaskWithMultipleSubtasks />);
            expect(getCardCaption("Fixture Task Alpha")).toBe("0 of 2 subtasks");
            await userEvent.click(screen.getByText("Fixture Task Alpha"));
            await userEvent.click(screen.getByRole("button", { name: "Task actions for Fixture Task Alpha" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Task" }));

            // Act — delete the FIRST of two rows.
            await userEvent.click(await screen.findByRole("button", { name: "Remove subtask 'Fixture Subtask 1'" }));

            // Assert — reinstated at index 0 (before Subtask 2), never appended to the end.
            await expect.poll(getRaisedToastTexts).toEqual([GENERIC_DELETE_SUBTASK_TOAST]);
            await expect
                .poll(() =>
                    Array.from(document.querySelectorAll("button[aria-label^='Remove subtask']")).map((button) =>
                        button.getAttribute("aria-label"),
                    ),
                )
                .toEqual(["Remove subtask 'Fixture Subtask 1'", "Remove subtask 'Fixture Subtask 2'"]);
            expect(getCardCaption("Fixture Task Alpha")).toBe("0 of 2 subtasks");
        });

        it("opens the confirmation naming that task when its delete entry is chosen", async () => {
            // Arrange
            await render(<TasksAcrossColumns />);

            // Act
            await openDeleteTaskFor("Fixture Task Alpha");

            // Assert — that task is named, and nothing has been deleted yet.
            expect(await screen.findByRole("heading", { name: "Delete this task?" })).toBeInTheDocument();
            expect(screen.getByText(/'Fixture Task Alpha' task and its subtasks\?/)).toBeInTheDocument();
            expect(deleteTaskStub.calls).toHaveLength(0);
        });

        it("renders the delete confirmation when staged open", async () => {
            // Act
            await render(<DeleteTaskOpen />);

            // Assert
            expect(await screen.findByRole("heading", { name: "Delete this task?" })).toBeInTheDocument();
            expect(screen.getByText(/'Fixture Task Alpha' task and its subtasks\?/)).toBeInTheDocument();
        });

        it("sends that task's own board id, column id and task id with the delete, exactly once", async () => {
            // Arrange
            deleteTaskStub.queue({ status: RESULT_STATUS.SUCCESS });
            await render(<TasksAcrossColumns />);

            // Act
            await deleteTaskFromDetailView("Fixture Task Alpha");

            // Assert — T-04-41: one call, never two.
            await vi.waitFor(() => {
                expect(deleteTaskStub.calls).toHaveLength(1);
            });
            expect(deleteTaskStub.calls[0]).toEqual({
                boardId: FIXTURE_BOARD_ID,
                columnId: "00000000-0000-4000-8000-c00000000001",
                taskId: "00000000-0000-4000-8000-d10000000001",
            });
        });

        /*
         * The cascade is irreversible (ADR domain/0002), so nothing may leave the screen before the
         * server has agreed — there is nothing to roll back to if it refuses.
         */
        it("still renders the card while the delete is in flight, removing nothing optimistically", async () => {
            // Arrange
            await render(<TasksAcrossColumns />);
            const titlesBefore = getColumnTaskTitles();
            deleteTaskStub.queue({ status: RESULT_STATUS.SUCCESS });
            deleteTaskStub.hold();

            // Act — submit, then observe while the action is still unresolved.
            await deleteTaskFromDetailView("Fixture Task Alpha");
            await vi.waitFor(() => {
                expect(deleteTaskStub.calls).toHaveLength(1);
            });

            // Assert — the whole board is untouched, not merely the target task still present.
            expect(getColumnTaskTitles()).toEqual(titlesBefore);

            // Act — let the write land.
            deleteTaskStub.settle();

            // Assert — still nothing removed here: the refreshed props are what remove it.
            await vi.waitFor(() => {
                expect(screen.queryByRole("heading", { name: "Delete this task?" })).not.toBeInTheDocument();
            });
            expect(getColumnTaskTitles()).toEqual(titlesBefore);
            expect(getRaisedToastCount()).toBe(0);
        });

        it("closes the modal, leaves the task on the board and announces a generic delete failure", async () => {
            // Arrange — held, so the pre-settle state is observed before the failure lands.
            await render(<TasksAcrossColumns />);
            const titlesBefore = getColumnTaskTitles();
            deleteTaskStub.queue({ status: RESULT_STATUS.ERROR });
            deleteTaskStub.hold();

            // Act
            await deleteTaskFromDetailView("Fixture Task Alpha");
            await vi.waitFor(() => {
                expect(deleteTaskStub.calls).toHaveLength(1);
            });
            deleteTaskStub.settle();

            // Assert
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toEqual([GENERIC_DELETE_TASK_TOAST]);
            });
            expect(screen.queryByRole("heading", { name: "Delete this task?" })).not.toBeInTheDocument();
            expect(getColumnTaskTitles()).toEqual(titlesBefore);
            /* The failure leaves the still-existing task's detail view open, not merely the card. */
            expect(screen.getByRole("heading", { name: "Fixture Task Alpha" })).toBeInTheDocument();
        });

        /* D-11: the mandatory keyboard path, mirroring `reorderFromKeyboard`'s column-level shape. */
        it("announces the lift, naming the task's column and 1-based position", async () => {
            // Arrange
            await render(<ReorderableTasks />);

            // Act
            focusTaskHandle("Task One");
            await userEvent.keyboard(" ");

            // Assert
            await expect
                .poll(getAnnouncement)
                .toBe(
                    "Picked up Task One from Fixture Column 1, position 1 of 4. Use arrow keys to move, space to drop, escape to cancel.",
                );

            // Cleanup: drop where it started, issuing nothing.
            await userEvent.keyboard(" ");
        });

        it("reorders a task within its column when lifted, arrowed down and dropped, sending exactly one request", async () => {
            // Arrange
            moveTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: "00000000-0000-4000-8000-e10000000001",
                    title: "Task One",
                    description: undefined,
                    version: 1,
                    position: 1,
                },
            });
            moveTaskStub.hold();
            await render(<ReorderableTasks />);
            focusTaskHandle("Task One");

            // Act
            await userEvent.keyboard(" ");
            const liftedAnnouncement = getAnnouncement();
            await userEvent.keyboard("{ArrowDown}");
            await expect.poll(getAnnouncement).not.toBe(liftedAnnouncement);
            await userEvent.keyboard(" ");

            // Assert
            await expect
                .poll(() => getColumnTaskTitles()[0].taskTitles)
                .toEqual(["Task Two", "Task One", "Task Three", "Task Four"]);
            expect(moveTaskStub.calls).toHaveLength(1);
            expect(moveTaskStub.calls[0]).toEqual({
                taskId: "00000000-0000-4000-8000-e10000000001",
                targetColumnId: "00000000-0000-4000-8000-c00000000001",
                version: 0,
                targetPosition: 1,
            });
            moveTaskStub.settle();
        });

        /* The Copywriting Contract's two distinct wordings — the column reads last within, first across. */
        it("announces a within-column move and the drop naming the position and column", async () => {
            // Arrange
            moveTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: "00000000-0000-4000-8000-e10000000001",
                    title: "Task One",
                    description: undefined,
                    version: 1,
                    position: 1,
                },
            });
            await render(<ReorderableTasks />);
            focusTaskHandle("Task One");

            // Act & Assert
            await userEvent.keyboard(" ");
            await userEvent.keyboard("{ArrowDown}");
            await expect.poll(getAnnouncement).toBe("Task One moved to position 2 of 4 in Fixture Column 1.");

            await userEvent.keyboard(" ");
            await expect.poll(getAnnouncement).toBe("Task One dropped in Fixture Column 1 at position 2 of 4.");
        });

        it("announces a cross-column move and the drop naming the column and position", async () => {
            // Arrange
            moveTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: "00000000-0000-4000-8000-d10000000001",
                    title: "Fixture Task Alpha",
                    description: undefined,
                    version: 1,
                    position: 0,
                },
            });
            await render(<TasksAcrossColumns />);
            focusTaskHandle("Fixture Task Alpha");

            // Act & Assert
            await userEvent.keyboard(" ");
            await userEvent.keyboard("{ArrowRight}");
            await expect.poll(getAnnouncement).toBe("Fixture Task Alpha moved to Fixture Column 2, position 1 of 1.");

            await userEvent.keyboard(" ");
            await expect
                .poll(getAnnouncement)
                .toBe("Fixture Task Alpha dropped in Fixture Column 2 at position 1 of 1.");
        });

        /*
         * The Copywriting Contract makes no exception for a destination holding no cards, but the
         * resolver could not name one: an empty column is handed over as its BODY droppable, which
         * has no task behind it, so both announcements silently returned nothing.
         */
        it("announces a move and a drop into a column holding zero tasks the same way as any other", async () => {
            // Arrange
            moveTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: "00000000-0000-4000-8000-d10000000001",
                    title: "Fixture Task Alpha",
                    description: undefined,
                    version: 1,
                    position: 0,
                },
            });
            await render(<TaskIntoEmptyColumn />);
            focusTaskHandle("Fixture Task Alpha");

            // Act & Assert
            await userEvent.keyboard(" ");
            await userEvent.keyboard("{ArrowRight}");
            await expect.poll(getAnnouncement).toBe("Fixture Task Alpha moved to Fixture Column 2, position 1 of 1.");

            await userEvent.keyboard(" ");
            await expect
                .poll(getAnnouncement)
                .toBe("Fixture Task Alpha dropped in Fixture Column 2 at position 1 of 1.");
        });

        it("returns a task to its original column and index when cancelled after two steps, issuing nothing", async () => {
            // Arrange
            await render(<ReorderableTasks />);
            focusTaskHandle("Task One");

            // Act
            await userEvent.keyboard(" ");
            let announcedBefore = getAnnouncement();
            await userEvent.keyboard("{ArrowDown}");
            await expect.poll(getAnnouncement).not.toBe(announcedBefore);
            announcedBefore = getAnnouncement();
            await userEvent.keyboard("{ArrowDown}");
            await expect.poll(getAnnouncement).not.toBe(announcedBefore);
            await userEvent.keyboard("{Escape}");

            // Assert
            await expect
                .poll(() => getColumnTaskTitles()[0].taskTitles)
                .toEqual(["Task One", "Task Two", "Task Three", "Task Four"]);
            expect(getAnnouncement()).toBe("Move cancelled. Task One returned to Fixture Column 1, position 1 of 4.");
            expect(moveTaskStub.calls).toHaveLength(0);
        });

        it("issues exactly one request however many arrow steps a task's move took", async () => {
            // Arrange
            moveTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: "00000000-0000-4000-8000-e10000000001",
                    title: "Task One",
                    description: undefined,
                    version: 1,
                    position: 2,
                },
            });
            moveTaskStub.hold();
            await render(<ReorderableTasks />);
            focusTaskHandle("Task One");

            // Act
            await userEvent.keyboard(" ");
            for (let step = 0; step < 2; step += 1) {
                const announcedBefore = getAnnouncement();
                await userEvent.keyboard("{ArrowDown}");
                await expect.poll(getAnnouncement).not.toBe(announcedBefore);
            }
            await userEvent.keyboard(" ");

            // Assert
            await expect
                .poll(() => getColumnTaskTitles()[0].taskTitles)
                .toEqual(["Task Two", "Task Three", "Task One", "Task Four"]);
            expect(moveTaskStub.calls).toHaveLength(1);
            moveTaskStub.settle();
        });

        /* Boundary: nothing above the first index, so an up step there must issue no request. */
        it("issues no request when an up step is taken at index 0", async () => {
            // Arrange
            await render(<ReorderableTasks />);
            focusTaskHandle("Task One");

            // Act
            await userEvent.keyboard(" ");
            await userEvent.keyboard("{ArrowUp}");
            await userEvent.keyboard(" ");

            // Assert
            await expect
                .poll(() => getColumnTaskTitles()[0].taskTitles)
                .toEqual(["Task One", "Task Two", "Task Three", "Task Four"]);
            expect(moveTaskStub.calls).toHaveLength(0);
        });

        /* Boundary: nothing below the last index, so a down step there must issue no request. */
        it("issues no request when a down step is taken at the last index", async () => {
            // Arrange
            await render(<ReorderableTasks />);
            focusTaskHandle("Task Four");

            // Act
            await userEvent.keyboard(" ");
            await userEvent.keyboard("{ArrowDown}");
            await userEvent.keyboard(" ");

            // Assert
            await expect
                .poll(() => getColumnTaskTitles()[0].taskTitles)
                .toEqual(["Task One", "Task Two", "Task Three", "Task Four"]);
            expect(moveTaskStub.calls).toHaveLength(0);
        });

        /*
         * UI-SPEC zero-one-many/drag-drop-surface: a single task in a MULTI-column board keeps a
         * live handle, since cross-column movement is still possible even though within-column
         * reorder is not — the dead-control rule applies only to the one-column, one-task board.
         */
        it("keeps a task's handle live when it is the only task in a multi-column board", async () => {
            // Act
            await render(<TasksAcrossColumns />);

            // Assert
            expect(screen.getByRole("button", { name: "Reorder Fixture Task Alpha" })).toBeEnabled();
        });

        it("disables a task's handle only when the board holds exactly one column and one task", async () => {
            // Act
            await render(<SingleColumnSingleTask />);

            // Assert
            expect(screen.getByRole("button", { name: "Reorder Only Task" })).toBeDisabled();
        });
    },
});
