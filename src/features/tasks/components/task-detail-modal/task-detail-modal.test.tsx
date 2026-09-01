/*
 * Composed from the plain React renderer package, not @storybook/nextjs-vite — the latter's main
 * entry eagerly imports real Next.js internals this "browser" project deliberately does not load
 * (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./task-detail-modal.stories";

const { Default, NoDescription, NoSubtasks, LongTitle, SubtaskPending } = composeStories(stories);

/** `createTaskFull()`'s own deterministic defaults, which `Default`'s fixture never overrides. */
const DEFAULT_TASK_TITLE = "Fixture Task";
const DEFAULT_TASK_DESCRIPTION = "Fixture description";
/* `createSubtasks({ count: 3, ... })`'s own deterministic first entry. */
const DEFAULT_SUBTASK_ID = "00000000-0000-4000-8000-a00000000001";
const DEFAULT_SUBTASK_TITLE = "Fixture Subtask 1";
const LONG_TASK_TITLE = "A task title long enough to wrap across several lines inside the detail view's panel";

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

        it("invokes onEditTask with the task when Edit Task is chosen", async () => {
            // Arrange
            await render(<Default />);
            await userEvent.click(screen.getByRole("button", { name: `Task actions for ${DEFAULT_TASK_TITLE}` }));

            // Act
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Task" }));

            // Assert
            expect(Default.args.onEditTask).toHaveBeenCalledWith(Default.args.task);
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

        it("invokes onToggleSubtask with the clicked row's subtask id", async () => {
            // Arrange
            await render(<Default />);

            // Act
            screen.getByText(DEFAULT_SUBTASK_TITLE).click();

            // Assert
            expect(Default.args.onToggleSubtask).toHaveBeenCalledWith(DEFAULT_SUBTASK_ID);
        });

        /* D-08's in-flight lock: only the pending row's own checkbox is busy. */
        it("marks only the pending subtask's checkbox busy", async () => {
            // Act
            await render(<SubtaskPending />);

            // Assert
            const checkboxes = screen.getAllByRole("checkbox");
            expect(checkboxes.map((checkbox) => checkbox.getAttribute("aria-busy"))).toEqual([
                "true",
                "false",
                "false",
            ]);
        });

        /* S-09: no visible close control anywhere in this modal. */
        it("renders no visible close control", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
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
