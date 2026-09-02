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

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./edit-task-modal.stories";

const { Default, NoDescription, Submitting, TitleError } = composeStories(stories);

/*
 * Base UI renders the backdrop as a sibling of the popup with no role of its own, so it is reached
 * by attribute rather than by role — the same lookup `add-task-modal.test.tsx` uses.
 */
const getBackdropElement = (): HTMLElement => {
    const backdrop = Array.from(document.querySelectorAll<HTMLElement>("[data-open]")).find(
        (element) => element.getAttribute("role") !== "dialog",
    );
    if (!backdrop) {
        throw new Error("Modal backdrop element not found — is the dialog open?");
    }
    return backdrop;
};

describeForEachDevice({
    name: "EditTask modal",
    body: () => {
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

        it("renders the add-a-subtask-row control with no rows", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("button", { name: "+ Add New Subtask" })).toBeVisible();
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

            // Assert
            await expect.element(screen.getByText("Task title must be between 3 and 32 characters.")).toBeVisible();
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

        it("renders no visible close control", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(domScreen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
        });
    },
});
