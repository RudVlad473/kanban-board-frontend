/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { createTaskAction } from "@/features/tasks/actions/create-task-action";
import { createTaskSubtasksAction } from "@/features/tasks/actions/create-task-subtasks-action";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";
import { actionStub } from "@/test-utils/action-stub-registry";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createNextLinkShim, createNextNavigationShim } from "@/test-utils/next-router-shims";

import * as stories from "./add-task-button.stories";

/*
 * Matches `createBoards(3)[0].id` exactly (that factory's ids are positionally deterministic) —
 * inlined because `vi.mock`'s factory is hoisted above every module-scope const in this file.
 */
const openBoardId = "00000000-0000-4000-8000-000000000001";

/*
 * A getter, not a fixed string: `useOpenBoardColumns` derives the board from the pathname, so a
 * pinned one would make the no-board story assert nothing (mirrors `dashboard-header.test.tsx`).
 */
const routerState = vi.hoisted(() => ({ pathname: "/boards/00000000-0000-4000-8000-000000000001" }));

beforeEach(() => {
    routerState.pathname = buildBoardDetailPath(openBoardId);
});

// eslint-disable-next-line no-restricted-properties -- next/navigation's router has no real implementation outside a Next.js request/render cycle in Vitest
vi.mock("next/navigation", () =>
    createNextNavigationShim({
        pathname: () => routerState.pathname,
        refresh: () => undefined,
    }),
);

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode (see comment above)
vi.mock("next/link", () => createNextLinkShim());

const { WithColumns, NoColumns, BoardNotYetHydrated, NoBoardOpen, WithBoardBelow } = composeStories(stories);

/*
 * Looked up off the imported binding, so `queue` accepts only that action's own awaited result and
 * no module-key string is spelled here (04-CONTEXT.md D-01).
 */
const createTaskStub = actionStub(createTaskAction);
const createTaskSubtasksStub = actionStub(createTaskSubtasksAction);

const NEW_TASK = { id: "new-task-id", title: "Take coffee break", description: undefined, version: 0, position: 0 };

/** Deliberately unlike anything typed below, so a placeholder swapped for the server's row shows. */
const SERVER_TASK_TITLE = "Take coffee break (saved)";

const openCreateTaskModal = async (): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: "+ Add New Task" }));
};

/*
 * Read off the DOM rather than by role: Base UI marks the tree outside an open dialog `aria-hidden`,
 * so a role query would report no cards exactly when the optimistic insert needs reading. Scoped to
 * the first column, which is the one the modal's status control defaults to.
 */
const getFirstColumnTaskTitles = (): (string | null)[] =>
    Array.from(document.querySelectorAll("section")[0].querySelectorAll("li")).map(
        /* The content button's own first span, matched before the drag handle's sibling button. */
        (item) => item.querySelector("button span")?.textContent ?? null,
    );

describeForEachDevice({
    name: "AddTaskButton",
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

        /*
         * The state the SERVER renders on a board route. Disabling it there is what produced the
         * hydration mismatch: the client's first render already has the entry and enables it.
         */
        it("renders the create button enabled while the open board's entry has not hydrated yet", async () => {
            // Act
            await render(<BoardNotYetHydrated />);

            // Assert
            await expect.element(screen.getByRole("button", { name: "+ Add New Task" })).toBeEnabled();
        });

        /*
         * The entry can still be absent when the click lands, and a modal mounted then holds
         * `columnId: ""` forever. Failed 3 CI runs running as `tasks-create.e2e.spec.ts:78`, never
         * locally.
         */
        it("opens no modal while the open board's entry has not hydrated yet", async () => {
            // Arrange
            await render(<BoardNotYetHydrated />);

            // Act
            await openCreateTaskModal();

            // Assert — no dialog at all, rather than one whose status control can never be filled.
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        it("renders the create button disabled with no board open", async () => {
            // Arrange
            routerState.pathname = ROUTE.BOARDS;

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

        /*
         * TASK-01's optimistic insert (docs/adr/tech/0030): the card is on the board while the action
         * is demonstrably still unresolved, which a settle-then-assert test cannot show.
         */
        it("renders the new card in its column, the modal already gone, before the create resolves", async () => {
            // Arrange — the one story that renders the board the header writes into.
            await render(<WithBoardBelow />);
            const titlesBefore = getFirstColumnTaskTitles();
            /* A title the user never typed, so the swap below is visible rather than inferred. */
            createTaskStub.queue({ status: RESULT_STATUS.SUCCESS, task: { ...NEW_TASK, title: SERVER_TASK_TITLE } });
            createTaskStub.hold();
            await openCreateTaskModal();

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.click(screen.getByRole("button", { name: "Create Task" }));
            await vi.waitFor(() => {
                expect(createTaskStub.calls).toHaveLength(1);
            });

            // Assert — appended to the column the modal was submitted against, with the modal already closed.
            expect(getFirstColumnTaskTitles()).toEqual([...titlesBefore, "Take coffee break"]);
            expect(screen.queryByRole("heading", { name: "Add New Task" })).not.toBeInTheDocument();

            // Act — let the write land.
            createTaskStub.settle();

            // Assert — the placeholder is SWAPPED for the server's task, never appended beside it.
            await vi.waitFor(() => {
                expect(getFirstColumnTaskTitles()).toEqual([...titlesBefore, SERVER_TASK_TITLE]);
            });
        });

        /* The other half of the same mechanism: a refusal must leave no trace of the optimistic card. */
        it("removes the optimistic card and reports the failure in a toast when the create fails", async () => {
            // Arrange
            await render(<WithBoardBelow />);
            const titlesBefore = getFirstColumnTaskTitles();
            createTaskStub.queue({ status: RESULT_STATUS.ERROR });
            createTaskStub.hold();
            await openCreateTaskModal();

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.click(screen.getByRole("button", { name: "Create Task" }));
            await vi.waitFor(() => {
                expect(createTaskStub.calls).toHaveLength(1);
            });

            // Assert — the optimistic card stands while the refusal is still in flight.
            expect(getFirstColumnTaskTitles()).toEqual([...titlesBefore, "Take coffee break"]);

            // Act
            createTaskStub.settle();

            // Assert — the card is withdrawn and the refusal is reported in the toast stack.
            const region = await screen.findByRole("region", { name: "Notifications" });
            await expect.element(within(region).getByText("Couldn't create task.")).toBeVisible();
            await vi.waitFor(() => {
                expect(getFirstColumnTaskTitles()).toEqual(titlesBefore);
            });
        });

        /* The modal is gone by the time the refusal lands, so the toast is the only place left to say so. */
        it("reports the create failure in a toast carrying Retry, the modal having closed at submit", async () => {
            // Arrange
            await render(<WithColumns />);
            createTaskStub.queue({ status: RESULT_STATUS.ERROR });
            await openCreateTaskModal();

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.click(screen.getByRole("button", { name: "Create Task" }));

            // Assert
            const region = await screen.findByRole("region", { name: "Notifications" });
            await expect.element(within(region).getByText("Couldn't create task.")).toBeVisible();
            await expect.element(within(region).getByText("Try again.")).toBeVisible();
            await expect.element(within(region).getByRole("button", { name: "Retry" })).toBeVisible();
            expect(screen.queryByRole("heading", { name: "Add New Task" })).not.toBeInTheDocument();
        });

        /*
         * The Retry is the ONLY route back to the typed values, so a toast that expires takes the
         * whole attempt with it. Fake timers reach Base UI's `setTimeout` (see toast.test.tsx).
         */
        it("keeps the create-failure toast on screen past the auto-dismiss window every other toast obeys", async () => {
            // Arrange
            vi.useFakeTimers({ shouldAdvanceTime: true });
            try {
                await render(<WithColumns />);
                createTaskStub.queue({ status: RESULT_STATUS.ERROR });
                await openCreateTaskModal();
                await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
                await userEvent.click(screen.getByRole("button", { name: "Create Task" }));
                const region = await screen.findByRole("region", { name: "Notifications" });
                await expect.element(within(region).getByText("Couldn't create task.")).toBeVisible();

                // Act — past the 5000ms provider default, with the stack neither hovered nor blurred.
                window.dispatchEvent(new FocusEvent("focus"));
                await vi.advanceTimersByTimeAsync(9000);

                // Assert
                await expect.element(within(region).getByText("Couldn't create task.")).toBeVisible();
                await expect.element(within(region).getByRole("button", { name: "Retry" })).toBeVisible();
            } finally {
                vi.useRealTimers();
            }
        });

        /*
         * The trade-off closing on submit was accepted on: a refused create may cost the user a
         * click, never what they typed. Every field, including the status chosen, comes back.
         */
        it("reopens the modal prefilled with the whole attempt when the toast's Retry is clicked", async () => {
            // Arrange
            await render(<WithColumns />);
            createTaskStub.queue({ status: RESULT_STATUS.ERROR });
            await openCreateTaskModal();
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.fill(screen.getByLabelText("Description"), "Recharge the batteries a little.");
            await userEvent.click(screen.getByRole("button", { name: "+ Add New Subtask" }));
            await userEvent.fill(screen.getByLabelText("Subtask 1", { exact: true }), "Make coffee");
            await userEvent.click(screen.getByRole("button", { name: "+ Add New Subtask" }));
            await userEvent.fill(screen.getByLabelText("Subtask 2", { exact: true }), "Drink coffee & smile");
            await userEvent.click(screen.getByRole("combobox"));
            await userEvent.click(await within(document.body).findByRole("option", { name: "Doing" }));
            await userEvent.click(screen.getByRole("button", { name: "Create Task" }));
            const region = await screen.findByRole("region", { name: "Notifications" });

            // Act
            await userEvent.click(await within(region).findByRole("button", { name: "Retry" }));

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Add New Task" })).toBeVisible();
            await expect.element(screen.getByLabelText("Title")).toHaveValue("Take coffee break");
            await expect.element(screen.getByLabelText("Description")).toHaveValue("Recharge the batteries a little.");
            await expect.element(screen.getByLabelText("Subtask 1", { exact: true })).toHaveValue("Make coffee");
            await expect
                .element(screen.getByLabelText("Subtask 2", { exact: true }))
                .toHaveValue("Drink coffee & smile");
            await expect.element(screen.getByRole("combobox")).toHaveTextContent("Doing");
        });

        /* The fan-out runs behind the already-closed modal, keeping whatever succeeded. */
        it("runs the subtask fan-out after the task lands, closing the modal without waiting on it", async () => {
            // Arrange
            await render(<WithColumns />);
            createTaskStub.queue({ status: RESULT_STATUS.SUCCESS, task: NEW_TASK });
            createTaskSubtasksStub.queue({ status: RESULT_STATUS.SUCCESS, failedTitles: [] });
            createTaskSubtasksStub.hold();
            await openCreateTaskModal();
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.click(screen.getByRole("button", { name: "+ Add New Subtask" }));
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
            await userEvent.click(screen.getByRole("button", { name: "+ Add New Subtask" }));
            await userEvent.fill(screen.getByLabelText("Subtask 1", { exact: true }), "Make coffee");
            await userEvent.click(screen.getByRole("button", { name: "+ Add New Subtask" }));
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
            await userEvent.click(screen.getByRole("button", { name: "+ Add New Subtask" }));
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

        it("auto-dismisses the partial-failure toast rather than leaving it on screen indefinitely", async () => {
            // Arrange — real timers, so the create and its subtask fan-out settle normally.
            await render(<WithColumns />);
            createTaskStub.queue({ status: RESULT_STATUS.SUCCESS, task: NEW_TASK });
            createTaskSubtasksStub.queue({ status: RESULT_STATUS.SUCCESS, failedTitles: ["Make coffee"] });
            await openCreateTaskModal();
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.click(screen.getByRole("button", { name: "+ Add New Subtask" }));
            await userEvent.fill(screen.getByLabelText("Subtask 1", { exact: true }), "Make coffee");
            await userEvent.click(screen.getByRole("button", { name: "Create Task" }));
            const region = await screen.findByRole("region", { name: "Notifications" });
            await expect.element(within(region).getByText("Couldn't create 1 subtask(s).")).toBeVisible();

            /*
             * Base UI pauses every toast timer while the stack is hovered or the window is unfocused
             * (`expandedOrOutOfFocus`), and the driver leaves the pointer over the viewport after the
             * click. Resume explicitly so this asserts the timeout rather than the driver's focus state.
             */
            window.dispatchEvent(new FocusEvent("focus"));

            // Act — past Base UI's 5000ms default, which this toast must now inherit.
            await vi.waitFor(
                () => {
                    expect(within(region).queryByText("Couldn't create 1 subtask(s).")).not.toBeInTheDocument();
                },
                { timeout: 9000, interval: 250 },
            );
        });

        /* The retry is held unresolved, so the Retry button is still mounted for a second click. */
        it("fans the same titles out once when Retry is clicked twice while the first retry is in flight", async () => {
            // Arrange
            await render(<WithColumns />);
            createTaskStub.queue({ status: RESULT_STATUS.SUCCESS, task: NEW_TASK });
            createTaskSubtasksStub.queue({ status: RESULT_STATUS.SUCCESS, failedTitles: ["Make coffee"] });
            await openCreateTaskModal();
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.click(screen.getByRole("button", { name: "+ Add New Subtask" }));
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
