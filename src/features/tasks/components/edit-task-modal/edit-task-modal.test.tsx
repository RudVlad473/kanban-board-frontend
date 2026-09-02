/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { screen as domScreen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { createSubtaskAction } from "@/features/tasks/actions/create-subtask-action";
import { deleteSubtaskAction } from "@/features/tasks/actions/delete-subtask-action";
import { updateSubtaskAction } from "@/features/tasks/actions/update-subtask-action";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { actionStub } from "@/test-utils/action-stub-registry";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { getBackdropElement } from "@/test-utils/modal-backdrop";

import * as stories from "./edit-task-modal.stories";

const { Default, NoDescription, Populated, SingleSubtask, Submitting, TitleError } = composeStories(stories);

const createSubtaskStub = actionStub(createSubtaskAction);
const updateSubtaskStub = actionStub(updateSubtaskAction);
const deleteSubtaskStub = actionStub(deleteSubtaskAction);

describeForEachDevice({
    name: "EditTask modal",
    body: () => {
        it("offers a labelled, enabled close control so dismissal is not Escape-or-backdrop only", async () => {
            // Act
            const rendered = await render(<Default />);

            // Assert
            const close = rendered.getByRole("button", { name: "Close" });
            await expect.element(close).toBeVisible();
            await expect.element(close).toBeEnabled();
            // A real <button>, so it is in the tab order without a tabindex of its own.
            expect(close.element().tagName).toBe("BUTTON");
        });

        it("renders the Copywriting Contract's title, fields and submit label, prefilled from the task", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Edit Task" })).toBeVisible();
            await expect.element(screen.getByLabelText("Title")).toHaveValue("Take coffee break");
            await expect.element(screen.getByLabelText("Description")).toHaveValue("Recharge for fifteen minutes");
            await expect.element(screen.getByRole("button", { name: "Save Changes" })).toBeVisible();
        });

        it("opens with a blank description when the task has none", async () => {
            // Act
            const screen = await render(<NoDescription />);

            // Assert
            await expect.element(screen.getByLabelText("Description")).toHaveValue("");
        });

        /* S-02: no third live move control inside a modal whose button says "Save Changes". */
        it("renders no Status or column-selection control", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(domScreen.queryByRole("combobox")).not.toBeInTheDocument();
            expect(domScreen.queryByText("Status", { exact: true })).not.toBeInTheDocument();
        });

        /* S-01: the mitigation for two visually identical row sets with two different save semantics. */
        it("renders the exact authored autosave hint directly under the Subtasks label", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            const label = screen.getByText("Subtasks", { exact: true });
            const hint = screen.getByText("Subtask changes save as you make them.");
            await expect.element(hint).toBeVisible();
            expect(label.element().nextElementSibling).toBe(hint.element());
        });

        /* UI-SPEC empty/edit-task-modal: the label, the hint and the add-a-row button — no rows. */
        it("renders the add-a-subtask-row control with no rows when the task has none", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("button", { name: "+ Add New Subtask" })).toBeVisible();
            expect(domScreen.queryByRole("button", { name: /^Remove subtask/ })).not.toBeInTheDocument();
        });

        it("renders one live row per existing subtask", async () => {
            // Act
            const screen = await render(<Populated />);

            // Assert
            await expect
                .element(screen.getByRole("button", { name: "Remove subtask 'Fixture Subtask 1'" }))
                .toBeVisible();
            await expect
                .element(screen.getByRole("button", { name: "Remove subtask 'Fixture Subtask 2'" }))
                .toBeVisible();
        });

        it("shows the loading treatment on the submit control while a submit is pending", async () => {
            // Act
            const screen = await render(<Submitting />);

            // Assert
            const submit = screen.getByRole("button", { name: "Save Changes" });
            await expect.element(submit).toBeDisabled();
            await expect.element(submit).toHaveAttribute("aria-busy", "true");
        });

        it("renders a staged title error", async () => {
            // Act
            const screen = await render(<TitleError />);

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
        });

        it("blocks submission and shows the required-field message when the title is cleared", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "");
            await screen.getByRole("button", { name: "Save Changes" }).click();

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("blocks submission and shows the length message for a two-character title", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Do");
            await screen.getByRole("button", { name: "Save Changes" }).click();

            // Assert — the slot shows the counter; the prose it replaces stays the accessible description.
            await expect.element(screen.getByText("2/32")).toBeVisible();
            expect(
                screen.getByText("Task title must be between 3 and 32 characters.").element().getBoundingClientRect()
                    .width,
            ).toBeLessThanOrEqual(1);
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("hands a valid submit exactly the title and description, and nothing else", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Renamed Task");
            await screen.getByRole("button", { name: "Save Changes" }).click();

            // Assert
            await vi.waitFor(() => {
                expect(Default.args.onSubmit).toHaveBeenCalledWith({
                    title: "Renamed Task",
                    description: "Recharge for fifteen minutes",
                });
            });
        });

        /*
         * Both guards are needed together: Base UI's Dialog fires `onOpenChange(false)` on Escape
         * regardless of the backdrop-dismissal prop (documented in `modal.tsx` itself).
         */
        it("keeps the modal open on a backdrop click and on Escape while pending", async () => {
            // Arrange
            const screen = await render(<Submitting />);
            await expect.element(screen.getByRole("dialog")).toBeVisible();

            // Act
            await page.elementLocator(getBackdropElement()).click({ position: { x: 4, y: 4 } });
            await userEvent.keyboard("{Escape}");

            // Assert
            await expect.element(screen.getByRole("dialog")).toBeVisible();
            expect(Submitting.args.onClose).not.toHaveBeenCalled();
        });

        it("invokes onClose on Escape while idle", async () => {
            // Arrange
            const screen = await render(<Default />);
            await expect.element(screen.getByRole("dialog")).toBeVisible();

            // Act
            await userEvent.keyboard("{Escape}");

            // Assert
            await vi.waitFor(() => {
                expect(Default.args.onClose).toHaveBeenCalledTimes(1);
            });
        });

        /*
         * The tracer proof this modal exists for (S-01): add a row, rename an existing row and
         * remove a row, each WITHOUT the submit ever being pressed, and each one persists.
         */
        it("adds, renames and removes a subtask row, none of it behind the submit", async () => {
            // Arrange
            const screen = await render(<Populated />);

            // Act — rename the first existing row.
            updateSubtaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                subtask: {
                    id: "00000000-0000-4000-8000-a00000000001",
                    title: "Renamed Subtask",
                    isCompleted: true,
                    version: 1,
                },
            });
            await userEvent.fill(screen.getByRole("textbox", { name: "Subtask 1" }), "Renamed Subtask");
            await userEvent.tab();

            // Assert — the rename persisted with no submit pressed.
            await expect
                .element(screen.getByRole("button", { name: "Remove subtask 'Renamed Subtask'" }))
                .toBeVisible();

            // Act — remove the second existing row.
            deleteSubtaskStub.queue({ status: RESULT_STATUS.SUCCESS });
            await screen.getByRole("button", { name: "Remove subtask 'Fixture Subtask 2'" }).click();

            // Assert
            await expect
                .element(screen.getByRole("button", { name: "Remove subtask 'Fixture Subtask 2'" }))
                .not.toBeInTheDocument();

            // Act — add a new row via the seeded "+ Add New Subtask" control.
            createSubtaskStub.queue({
                status: RESULT_STATUS.SUCCESS,
                subtask: {
                    id: "00000000-0000-4000-8000-a00000000099",
                    title: "New Subtask",
                    isCompleted: false,
                    version: 0,
                },
            });
            await screen.getByRole("button", { name: "+ Add New Subtask" }).click();
            await userEvent.fill(screen.getByRole("textbox", { name: "Subtask 2" }), "New Subtask");
            await userEvent.tab();

            // Assert — all three persisted with the submit never pressed.
            await expect.element(screen.getByRole("button", { name: "Remove subtask 'New Subtask'" })).toBeVisible();
            expect(Populated.args.onSubmit).not.toHaveBeenCalled();
        });

        /* UI-SPEC zero-one-many/edit-task-modal: removing the last row returns to the empty shape. */
        it("returns to the empty shape when the last row is removed", async () => {
            // Arrange
            const screen = await render(<SingleSubtask />);
            const removeButton = screen.getByRole("button", { name: /^Remove subtask/ });

            // Act
            deleteSubtaskStub.queue({ status: RESULT_STATUS.SUCCESS });
            await removeButton.click();

            // Assert
            await expect.element(screen.getByRole("button", { name: "+ Add New Subtask" })).toBeVisible();
            await vi.waitFor(() => {
                expect(domScreen.queryByRole("button", { name: /^Remove subtask/ })).not.toBeInTheDocument();
            });
        });
    },
});
