/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { AddBoardModal } from "./add-board-modal";
import * as stories from "./add-board-modal.stories";

const { Default, Filled, Submitting, NameError, CreateFailed } = composeStories(stories);

/*
 * Base UI renders the backdrop as a sibling of the popup with no role of its own, so it is reached
 * by attribute rather than by role — the same lookup `modal.test.tsx` uses for its dismissal cases.
 */
const getBackdropElement = (): HTMLElement => {
    const backdrop = document.querySelector<HTMLElement>("[data-base-ui-dialog-backdrop], [role='presentation']");
    if (!backdrop) {
        throw new Error("no dialog backdrop rendered");
    }
    return backdrop;
};

describeForEachDevice({
    name: "AddBoardModal",
    body: () => {
        it("renders the Copywriting Contract's title, board-name field and submit label", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Add New Board" })).toBeVisible();
            await expect.element(screen.getByLabelText("Board Name")).toBeVisible();
            await expect.element(screen.getByRole("button", { name: "Create New Board" })).toBeVisible();
        });

        it("shows a supplied board name in the field", async () => {
            // Act
            const screen = await render(<Filled />);

            // Assert
            await expect.element(screen.getByLabelText("Board Name")).toHaveValue("Platform Launch");
        });

        it("shows the loading treatment on the submit control while a submit is pending", async () => {
            // Act
            const screen = await render(<Submitting />);

            // Assert
            const submit = screen.getByRole("button", { name: "Create New Board" });
            await expect.element(submit).toBeDisabled();
            await expect.element(submit).toHaveAttribute("aria-busy", "true");
        });

        it("renders a staged board-name error", async () => {
            // Act
            const screen = await render(<NameError />);

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
        });

        it("renders a form-level create failure as an alert", async () => {
            // Act
            const screen = await render(<CreateFailed />);

            // Assert
            await expect.element(screen.getByRole("alert")).toHaveTextContent("Couldn't create board. Try again.");
        });

        it("blocks submission and shows the empty-name message when the board name is blank", async () => {
            // Arrange
            const onSubmit = vi.fn();
            const screen = await render(
                <AddBoardModal isOpen onOpenChange={() => undefined} onSubmit={onSubmit} isPending={false} />,
            );

            // Act
            await screen.getByRole("button", { name: "Create New Board" }).click();

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
            expect(onSubmit).not.toHaveBeenCalled();
        });

        it("hands the typed board name to the submit handler", async () => {
            // Arrange
            const onSubmit = vi.fn();
            const screen = await render(
                <AddBoardModal isOpen onOpenChange={() => undefined} onSubmit={onSubmit} isPending={false} />,
            );

            // Act
            await userEvent.fill(screen.getByLabelText("Board Name"), "Launch");
            await screen.getByRole("button", { name: "Create New Board" }).click();

            // Assert
            await vi.waitFor(() => {
                expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Launch" }));
            });
        });

        /*
         * Both guards are needed together: Base UI's Dialog fires `onOpenChange(false)` on Escape
         * regardless of the backdrop-dismissal prop (documented in `modal.tsx` itself).
         */
        it("keeps the modal open on a backdrop click and on Escape while pending", async () => {
            // Arrange
            const onOpenChange = vi.fn();
            const screen = await render(
                <AddBoardModal isOpen onOpenChange={onOpenChange} onSubmit={() => undefined} isPending />,
            );
            await expect.element(screen.getByRole("dialog")).toBeVisible();

            // Act
            await page.elementLocator(getBackdropElement()).click({ position: { x: 4, y: 4 } });
            await userEvent.keyboard("{Escape}");

            // Assert
            await expect.element(screen.getByRole("dialog")).toBeVisible();
            expect(onOpenChange).not.toHaveBeenCalled();
        });

        /*
         * D-05: a failed create keeps the modal open with the typed name intact — nothing was
         * created, so there is nothing to reconcile and nothing to clear.
         */
        it("keeps the typed name and shows an inline error when the submit handler reports failure", async () => {
            // Arrange
            const FailingHost = () => {
                const [errorMessage, setErrorMessage] = useState<string | null>(null);
                const [isOpen, setIsOpen] = useState(true);

                return (
                    <AddBoardModal
                        isOpen={isOpen}
                        onOpenChange={setIsOpen}
                        isPending={false}
                        errorMessage={errorMessage}
                        onSubmit={() => {
                            setErrorMessage("Couldn't create board. Try again.");
                        }}
                    />
                );
            };
            const screen = await render(<FailingHost />);

            // Act
            await userEvent.fill(screen.getByLabelText("Board Name"), "Launch");
            await screen.getByRole("button", { name: "Create New Board" }).click();

            // Assert
            await expect.element(screen.getByRole("alert")).toHaveTextContent("Couldn't create board. Try again.");
            await expect.element(screen.getByRole("dialog")).toBeVisible();
            await expect.element(screen.getByLabelText("Board Name")).toHaveValue("Launch");
        });
    },
});
