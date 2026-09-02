/*
 * Composed from the plain React renderer package, not @storybook/nextjs-vite — the latter's main
 * entry eagerly imports real Next.js internals this "browser" project deliberately does not load
 * (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { updateSubtaskAction } from "@/features/tasks/actions/update-subtask-action";
import { updateTaskAction } from "@/features/tasks/actions/update-task-action";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { actionStub } from "@/test-utils/action-stub-registry";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./task-detail-modal.stories";

const { Default, NoDescription, NoSubtasks, LongTitle } = composeStories(stories);

/*
 * One recorder per action, looked up off the imported binding — `queue` accepts only that action's
 * own awaited result and `calls` is typed as its first parameter (04-CONTEXT.md D-01).
 */
const updateSubtaskStub = actionStub(updateSubtaskAction);
const updateTaskStub = actionStub(updateTaskAction);

/** The board id every fixture below declares itself to belong to. */
const FIXTURE_BOARD_ID = "00000000-0000-4000-8000-000000000001";

/** `createTaskFull()`'s own deterministic defaults, which `Default`'s fixture never overrides. */
const DEFAULT_TASK_ID = "00000000-0000-4000-8000-00000000000b";
const DEFAULT_TASK_TITLE = "Fixture Task";
const DEFAULT_TASK_DESCRIPTION = "Fixture description";
/* `FIXTURE_COLUMNS`'s own "Todo" entry — the only column the default task's own id sits in. */
const DEFAULT_COLUMN_ID = "00000000-0000-4000-8000-c00000000001";
/* `createSubtasks({ count: 3, completedCount: 1 })`'s own deterministic first (completed) entry. */
const DEFAULT_SUBTASK_ID = "00000000-0000-4000-8000-a00000000001";
const DEFAULT_SUBTASK_TITLE = "Fixture Subtask 1";
/* Its own second (incomplete) sibling — the one used to prove a DIFFERENT row's toggle is independent. */
const SECOND_SUBTASK_ID = "00000000-0000-4000-8000-a00000000002";
const SECOND_SUBTASK_TITLE = "Fixture Subtask 2";
const LONG_TASK_TITLE = "A task title long enough to wrap across several lines inside the detail view's panel";

/** The two authored toast strings, as the user reads them — title and description run together. */
const GENERIC_TOGGLE_TOAST = "Couldn't update subtask.Try again.";
/* SYNC-01/C-08: the title matches the phase-wide conflict family exactly; only the description differs. */
const CONFLICT_TOGGLE_TOAST = "This board changed somewhere else.Refreshing to show the latest.";

/*
 * Scoped to the notifications region, since the modal itself is a `dialog` too — an unscoped role
 * query would report the modal and make "no toast was raised" pass for the wrong reason.
 */
const getRaisedToastTexts = (): (string | null)[] => {
    const region = screen.queryByRole("region", { name: "Notifications" });

    return region === null
        ? []
        : within(region)
              .queryAllByRole("dialog")
              .map((toast) => toast.textContent);
};

/*
 * ADR tech/0014: every component's suite runs at both viewports; this modal has no
 * viewport-conditional behaviour of its own.
 */
describeForEachDevice({
    name: "TaskDetailModal",
    body: () => {
        it("renders the task's title, description, and checklist rows", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(screen.getByRole("heading", { name: DEFAULT_TASK_TITLE })).toBeInTheDocument();
            expect(screen.getByText(DEFAULT_TASK_DESCRIPTION)).toBeInTheDocument();
            expect(screen.getAllByRole("checkbox")).toHaveLength(3);
        });

        /*
         * UI-SPEC empty/detail-view: no description ELEMENT at all, not an empty one — the two
         * paragraphs left are the (non-empty) subtasks caption and the Current Status label.
         */
        it("renders no description paragraph when the task has none", async () => {
            // Act
            await render(<NoDescription />);

            // Assert
            expect(document.querySelectorAll("p")).toHaveLength(2);
        });

        /* UI-SPEC empty/detail-view: the two authored lines, and no "Subtasks (N of M)" caption. */
        it("renders the two authored empty-checklist lines and suppresses the subtasks caption", async () => {
            // Act
            await render(<NoSubtasks />);

            // Assert
            expect(screen.getByText("No subtasks yet.")).toBeInTheDocument();
            expect(screen.getByText("Use Edit Task to add one.")).toBeInTheDocument();
            expect(screen.queryByText(/^Subtasks \(/)).not.toBeInTheDocument();
        });

        it("renders the populated checklist caption naming the completed count", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(screen.getByText("Subtasks (1 of 3)")).toBeInTheDocument();
        });

        it("opens a two-item kebab menu naming the full task title, the second item destructive", async () => {
            // Arrange
            await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: `Task actions for ${DEFAULT_TASK_TITLE}` }));

            // Assert
            const items = await screen.findAllByRole("menuitem");
            expect(items.map((item) => item.textContent)).toEqual(["Edit Task", "Delete Task"]);
            expect(items[0]).toHaveClass("text-text-primary");
            expect(items[1]).toHaveClass("text-text-danger");
        });

        /* TASK-03: the kebab's first item opens the edit flow, owned directly (single caller). */
        it("opens the Edit Task modal prefilled with the task's current title and description when Edit Task is chosen", async () => {
            // Arrange
            await render(<Default />);
            await userEvent.click(screen.getByRole("button", { name: `Task actions for ${DEFAULT_TASK_TITLE}` }));

            // Act
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Task" }));

            // Assert
            expect(screen.getByRole("heading", { name: "Edit Task" })).toBeInTheDocument();
            expect(screen.getByLabelText("Title")).toHaveValue(DEFAULT_TASK_TITLE);
            expect(screen.getByLabelText("Description")).toHaveValue(DEFAULT_TASK_DESCRIPTION);
        });

        /*
         * S-01: submitting returns to the detail view — the CARD showing the new title is proved at
         * board level (board-view.test.tsx), where a real query-cache-seeded parent exists to read it
         * from; this component test only has the static `task` prop the story supplied.
         */
        it("closes the edit modal and returns to the detail view once a save settles", async () => {
            // Arrange
            updateTaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                task: {
                    id: DEFAULT_TASK_ID,
                    title: "Renamed Task",
                    description: DEFAULT_TASK_DESCRIPTION,
                    version: 1,
                    position: 0,
                },
            });
            await render(<Default />);
            await userEvent.click(screen.getByRole("button", { name: `Task actions for ${DEFAULT_TASK_TITLE}` }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Task" }));

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Renamed Task");
            await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

            // Assert — the Edit modal is gone; the kebab (only rendered in the detail view) is back.
            await vi.waitFor(() => {
                expect(screen.queryByRole("heading", { name: "Edit Task" })).not.toBeInTheDocument();
            });
            expect(screen.getByRole("button", { name: `Task actions for ${DEFAULT_TASK_TITLE}` })).toBeInTheDocument();
        });

        it("invokes onDeleteTask with the task when Delete Task is chosen", async () => {
            // Arrange
            await render(<Default />);
            await userEvent.click(screen.getByRole("button", { name: `Task actions for ${DEFAULT_TASK_TITLE}` }));

            // Act
            await userEvent.click(await screen.findByRole("menuitem", { name: "Delete Task" }));

            // Assert
            expect(Default.args.onDeleteTask).toHaveBeenCalledWith(Default.args.task);
        });

        /*
         * SUBTASK-02's own tracer proof: the checkbox flips before the write settles (optimistic),
         * and issues exactly one call carrying every path segment plus the flipped completion flag.
         */
        it("flips the checkbox optimistically before the write settles, sending exactly one call", async () => {
            // Arrange
            updateSubtaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                subtask: { id: DEFAULT_SUBTASK_ID, title: DEFAULT_SUBTASK_TITLE, isCompleted: false, version: 1 },
            });
            updateSubtaskStub.hold();
            await render(<Default />);
            const checkbox = screen.getByRole("checkbox", { name: DEFAULT_SUBTASK_TITLE });
            expect(checkbox.getAttribute("aria-checked")).toBe("true");

            // Act
            await userEvent.click(checkbox);

            // Assert — flipped BEFORE the held write settles.
            await expect.poll(() => checkbox.getAttribute("aria-checked")).toBe("false");
            expect(updateSubtaskStub.calls).toHaveLength(1);
            expect(updateSubtaskStub.calls[0]).toEqual({
                boardId: FIXTURE_BOARD_ID,
                columnId: DEFAULT_COLUMN_ID,
                taskId: DEFAULT_TASK_ID,
                subtaskId: DEFAULT_SUBTASK_ID,
                version: 0,
                isCompleted: false,
            });

            // Cleanup
            updateSubtaskStub.settle();
        });

        /* D-08's in-flight lock: the composed disabled checkbox drops a same-row second press. */
        it("marks the pending row's checkbox busy and drops a second press on the SAME row", async () => {
            // Arrange
            updateSubtaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                subtask: { id: DEFAULT_SUBTASK_ID, title: DEFAULT_SUBTASK_TITLE, isCompleted: false, version: 1 },
            });
            updateSubtaskStub.hold();
            await render(<Default />);
            const checkbox = screen.getByRole("checkbox", { name: DEFAULT_SUBTASK_TITLE });

            // Act — first press starts the in-flight write; the second targets the same row.
            await userEvent.click(checkbox);
            await expect.poll(() => checkbox.getAttribute("aria-busy")).toBe("true");
            expect(checkbox).toHaveAttribute("aria-disabled", "true");
            /*
             * `force: true` bypasses Playwright's OWN actionability guard, which would otherwise hang
             * waiting for the element to become enabled — this is what proves BASE UI'S own disabled
             * check is the thing refusing the second press, not merely Playwright declining to try.
             */
            await userEvent.click(checkbox, { force: true });

            // Assert — only one call ever reached the action.
            expect(updateSubtaskStub.calls).toHaveLength(1);

            // Cleanup
            updateSubtaskStub.settle();
        });

        /* D-08: the lock is per-subtask, not per-task — a different row runs its own write independently. */
        it("issues an independent call for a DIFFERENT row while the first is still in flight", async () => {
            // Arrange
            updateSubtaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                subtask: { id: DEFAULT_SUBTASK_ID, title: DEFAULT_SUBTASK_TITLE, isCompleted: false, version: 1 },
            });
            updateSubtaskStub.hold();
            await render(<Default />);
            const firstCheckbox = screen.getByRole("checkbox", { name: DEFAULT_SUBTASK_TITLE });
            const secondCheckbox = screen.getByRole("checkbox", { name: SECOND_SUBTASK_TITLE });

            // Act
            await userEvent.click(firstCheckbox);
            await expect.poll(() => firstCheckbox.getAttribute("aria-busy")).toBe("true");
            updateSubtaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                subtask: { id: SECOND_SUBTASK_ID, title: SECOND_SUBTASK_TITLE, isCompleted: true, version: 1 },
            });
            await userEvent.click(secondCheckbox);

            // Assert — the second row's own write went through while the first is still pending.
            expect(updateSubtaskStub.calls).toHaveLength(2);
            expect(updateSubtaskStub.calls[1]).toEqual(
                expect.objectContaining({ subtaskId: SECOND_SUBTASK_ID, isCompleted: true }),
            );

            // Cleanup
            updateSubtaskStub.settle();
        });

        /* UI-SPEC error/subtask-checklist-row: the checkbox AND the toast revert together, one case. */
        it("reverts the checkbox and raises the authored toast on a toggle failure", async () => {
            // Arrange
            updateSubtaskStub.queue({ status: RESULT_STATUS.ERROR });
            await render(<Default />);
            const checkbox = screen.getByRole("checkbox", { name: DEFAULT_SUBTASK_TITLE });

            // Act
            await userEvent.click(checkbox);

            // Assert
            await expect.poll(getRaisedToastTexts).toEqual([GENERIC_TOGGLE_TOAST]);
            expect(checkbox.getAttribute("aria-checked")).toBe("true");
        });

        /* SYNC-01: the distinct version-conflict toast, matching the phase-wide title exactly (C-08). */
        it("raises the version-conflict toast, matching the phase-wide title, on a stale-version toggle", async () => {
            // Arrange
            updateSubtaskStub.queue({ status: RESULT_STATUS.CONFLICT });
            await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("checkbox", { name: DEFAULT_SUBTASK_TITLE }));

            // Assert
            await expect.poll(getRaisedToastTexts).toEqual([CONFLICT_TOGGLE_TOAST]);
        });

        /*
         * S-09 barred a close control here on the grounds that no shipped modal rendered one. The
         * user overruled that outright, so every modal now carries one and this asserts the reversal.
         */
        it("offers a labelled, enabled close control that does not sit on top of the kebab", async () => {
            // Act
            await render(<Default />);

            // Assert
            const closeControl = screen.getByRole("button", { name: "Close" });
            expect(closeControl).toBeEnabled();

            const kebab = screen.getByRole("button", { name: /^Task actions for/ });
            const closeRect = closeControl.getBoundingClientRect();
            const kebabRect = kebab.getBoundingClientRect();
            const horizontalOverlap =
                Math.min(closeRect.right, kebabRect.right) - Math.max(closeRect.left, kebabRect.left);
            const verticalOverlap =
                Math.min(closeRect.bottom, kebabRect.bottom) - Math.max(closeRect.top, kebabRect.top);

            /* Geometry, not a class name: a class assertion passes through the exact overlap it guards. */
            expect(Math.min(horizontalOverlap, verticalOverlap)).toBeLessThanOrEqual(0);
        });

        /* S-09: Esc dismisses, matching every other shipped modal's guaranteed mechanism. */
        it("invokes onClose on Escape", async () => {
            // Arrange
            await render(<Default />);

            // Act
            await userEvent.keyboard("{Escape}");

            // Assert
            expect(Default.args.onClose).toHaveBeenCalledTimes(1);
        });

        /* The kebab's accessible name interpolates the FULL title — never truncated. */
        it("names the kebab trigger with the task's full title even when it is long", async () => {
            // Act
            await render(<LongTitle />);

            // Assert
            expect(screen.getByRole("button", { name: `Task actions for ${LONG_TASK_TITLE}` })).toBeInTheDocument();
        });

        /*
         * D-10: the Current Status control lists the board's columns in board order, with the
         * task's own column pre-selected — the move itself is proved at board level, where the
         * query cache `useMoveTask` reads from is actually populated.
         */
        it("shows the Current Status control listing the board's columns, the task's own column selected", async () => {
            // Arrange
            await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("combobox", { name: "Todo" }));

            // Assert
            const options = await screen.findAllByRole("option");
            expect(options.map((option) => option.textContent)).toEqual(["Todo", "Doing", "Done"]);
        });
    },
});
