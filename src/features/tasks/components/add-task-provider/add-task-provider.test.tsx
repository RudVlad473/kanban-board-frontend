/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { createTaskAction } from "@/features/tasks/actions/create-task-action";
import { createTaskSubtasksAction } from "@/features/tasks/actions/create-task-subtasks-action";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { actionStub } from "@/test-utils/action-stub-registry";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createNextLinkShim, createNextNavigationShim } from "@/test-utils/next-router-shims";

import * as stories from "./add-task-provider.stories";

/*
 * Matches `createBoards(3)[0].id` exactly (that factory's ids are positionally deterministic) —
 * inlined because `vi.mock`'s factory is hoisted above every module-scope const in this file.
 */
const openBoardId = "00000000-0000-4000-8000-000000000001";

// eslint-disable-next-line no-restricted-properties -- next/navigation's router has no real implementation outside a Next.js request/render cycle in Vitest (D-19)
vi.mock("next/navigation", () =>
    createNextNavigationShim({
        pathname: "/boards/00000000-0000-4000-8000-000000000001",
        refresh: () => undefined,
    }),
);

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode (D-19, see comment above)
vi.mock("next/link", () => createNextLinkShim());

const { WithColumns, NoColumns, NoBoardOpen } = composeStories(stories);

/*
 * Looked up off the imported binding, so `queue` accepts only that action's own awaited result and
 * no module-key string is spelled here (04-CONTEXT.md D-01).
 */
const createTaskStub = actionStub(createTaskAction);
const createTaskSubtasksStub = actionStub(createTaskSubtasksAction);

const NEW_TASK = { id: "new-task-id", title: "Take coffee break", description: undefined, version: 0, position: 0 };

const openCreateTaskModal = async (): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: "+ Add New Task" }));
};

describeForEachDevice({
    name: "AddTaskProvider",
    body: () => {
        it("renders the create button enabled when the open board has columns", async () => {
            // Act
            await render(<WithColumns />);

            // Assert
            const button = screen.getByRole("button", { name: "+ Add New Task" });
            await expect.element(button).toBeEnabled();
        });

        it("renders the create button disabled, with real disabled semantics, on a board with zero columns", async () => {
            // Act
            await render(<NoColumns />);

            /*
             * Assert
             * The real HTML `disabled` attribute, not merely a dimmed appearance — excluded from
             * tab order and announced as disabled by assistive technology.
             */
            const button = screen.getByRole("button", { name: "+ Add New Task" });
            await expect.element(button).toBeDisabled();
            await expect.element(button).toHaveAttribute("disabled");
        });

        it("renders the create button disabled with no board open", async () => {
            // Act
            await render(<NoBoardOpen />);

            // Assert
            await expect.element(screen.getByRole("button", { name: "+ Add New Task" })).toBeDisabled();
        });

        it("opens the modal on the create button, listing the open board's columns in order", async () => {
            // Arrange
            await render(<WithColumns />);

            // Act
            await openCreateTaskModal();

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Add New Task" })).toBeVisible();
            const status = screen.getByRole("combobox");
            // The trigger's own display text lags one paint behind Base UI's item registry.
            await expect.element(status).toHaveTextContent("Todo");
            await userEvent.click(status);
            const options = within(document.body).getAllByRole("option");
            expect(options.map((option) => option.textContent)).toEqual(["Todo", "Doing", "Done"]);
        });

        it("creates the task and closes the modal on success", async () => {
            // Arrange
            await render(<WithColumns />);
            createTaskStub.queue({ status: RESULT_STATUS.SUCCESS, task: NEW_TASK });
            await openCreateTaskModal();

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.click(screen.getByRole("button", { name: "Create Task" }));

            // Assert
            await vi.waitFor(() => {
                expect(screen.queryByRole("heading", { name: "Add New Task" })).not.toBeInTheDocument();
            });
            expect(createTaskStub.calls).toHaveLength(1);
            expect(createTaskStub.calls[0]).toMatchObject({ boardId: openBoardId, title: "Take coffee break" });
        });

        it("keeps the modal open with an inline error when the create fails", async () => {
            // Arrange
            await render(<WithColumns />);
            createTaskStub.queue({ status: RESULT_STATUS.ERROR });
            await openCreateTaskModal();

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.click(screen.getByRole("button", { name: "Create Task" }));

            // Assert
            await expect.element(screen.getByRole("alert")).toHaveTextContent("Couldn't create task. Try again.");
            await expect.element(screen.getByRole("heading", { name: "Add New Task" })).toBeVisible();
        });

        /* D-07: the fan-out runs behind the already-closed modal, keeping whatever succeeded. */
        it("runs the subtask fan-out after the task lands, closing the modal without waiting on it", async () => {
            // Arrange
            await render(<WithColumns />);
            createTaskStub.queue({ status: RESULT_STATUS.SUCCESS, task: NEW_TASK });
            createTaskSubtasksStub.queue({ status: RESULT_STATUS.SUCCESS, failedTitles: [] });
            createTaskSubtasksStub.hold();
            await openCreateTaskModal();
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.fill(screen.getByLabelText("Subtask 1", { exact: true }), "Make coffee");

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Create Task" }));

            // Assert — the modal is already gone while the fan-out is demonstrably still unresolved.
            await vi.waitFor(() => {
                expect(screen.queryByRole("heading", { name: "Add New Task" })).not.toBeInTheDocument();
            });
            createTaskSubtasksStub.settle();
            await vi.waitFor(() => {
                expect(createTaskSubtasksStub.calls).toHaveLength(1);
            });
        });

        /* D-07/ADR domain/0003: a partial fan-out failure keeps the task and toasts the count that did not land. */
        it("keeps the task and toasts a scoped retry when part of the fan-out fails", async () => {
            // Arrange
            await render(<WithColumns />);
            createTaskStub.queue({ status: RESULT_STATUS.SUCCESS, task: NEW_TASK });
            createTaskSubtasksStub.queue({ status: RESULT_STATUS.SUCCESS, failedTitles: ["Drink coffee & smile"] });
            await openCreateTaskModal();
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.fill(screen.getByLabelText("Subtask 1", { exact: true }), "Make coffee");
            await userEvent.fill(screen.getByLabelText("Subtask 2", { exact: true }), "Drink coffee & smile");

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Create Task" }));

            // Assert
            const region = await screen.findByRole("region", { name: "Notifications" });
            await expect.element(within(region).getByText("Couldn't create 1 subtask(s).")).toBeVisible();

            // Act — retry, this time succeeding.
            createTaskSubtasksStub.queue({ status: RESULT_STATUS.SUCCESS, failedTitles: [] });
            await userEvent.click(within(region).getByRole("button", { name: "Retry" }));

            // Assert — the toast clears once the retry lands.
            await vi.waitFor(() => {
                expect(within(region).queryByText("Couldn't create 1 subtask(s).")).not.toBeInTheDocument();
            });
            expect(createTaskSubtasksStub.calls).toHaveLength(2);
            expect(createTaskSubtasksStub.calls[1]).toMatchObject({ titles: ["Drink coffee & smile"] });
        });

        /* An expired session is the one fan-out failure a Retry cannot fix — say so instead of a count. */
        it("names an expired session instead of offering a retry that can only fail again", async () => {
            // Arrange
            await render(<WithColumns />);
            createTaskStub.queue({ status: RESULT_STATUS.SUCCESS, task: NEW_TASK });
            createTaskSubtasksStub.queue({ status: RESULT_STATUS.UNAUTHENTICATED });
            await openCreateTaskModal();
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.fill(screen.getByLabelText("Subtask 1", { exact: true }), "Make coffee");

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Create Task" }));

            // Assert
            const region = await screen.findByRole("region", { name: "Notifications" });
            await expect
                .element(within(region).getByText("Your session has expired. Sign in again to add these subtasks."))
                .toBeVisible();
            expect(within(region).queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
        });

        /* The toast never auto-dismisses, so its Retry stays clickable mid-retry — a second click must be inert. */
        it("fans the same titles out once when Retry is clicked twice while the first retry is in flight", async () => {
            // Arrange
            await render(<WithColumns />);
            createTaskStub.queue({ status: RESULT_STATUS.SUCCESS, task: NEW_TASK });
            createTaskSubtasksStub.queue({ status: RESULT_STATUS.SUCCESS, failedTitles: ["Make coffee"] });
            await openCreateTaskModal();
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.fill(screen.getByLabelText("Subtask 1", { exact: true }), "Make coffee");
            await userEvent.click(screen.getByRole("button", { name: "Create Task" }));
            const region = await screen.findByRole("region", { name: "Notifications" });
            await expect.element(within(region).getByText("Couldn't create 1 subtask(s).")).toBeVisible();

            // Act — the retry is held unresolved, so the button is still mounted for the second click.
            createTaskSubtasksStub.queue({ status: RESULT_STATUS.SUCCESS, failedTitles: [] });
            createTaskSubtasksStub.hold();
            const retryButton = within(region).getByRole("button", { name: "Retry" });
            await userEvent.click(retryButton);
            await userEvent.click(retryButton);
            createTaskSubtasksStub.settle();

            // Assert — the create's own fan-out plus exactly one retry, never two.
            await vi.waitFor(() => {
                expect(within(region).queryByText("Couldn't create 1 subtask(s).")).not.toBeInTheDocument();
            });
            expect(createTaskSubtasksStub.calls).toHaveLength(2);
        });
    },
});
