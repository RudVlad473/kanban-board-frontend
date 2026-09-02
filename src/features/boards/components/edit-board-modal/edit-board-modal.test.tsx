/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./edit-board-modal.stories";

const { Default, Renaming, EmptyNameError, LongName, SubmitSettles } = composeStories(stories);

/*
 * Base UI renders the backdrop as a sibling of the popup with no role of its own, so it is reached
 * by attribute rather than by role — the same lookup `add-board-modal.test.tsx` uses.
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
    name: "EditBoard modal",
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

        it("renders the Copywriting Contract's title and save label", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Edit Board" })).toBeVisible();
            await expect.element(screen.getByRole("button", { name: "Save Changes" })).toBeVisible();
        });

        it("seeds the name field with the board's current name", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByLabelText("Board Name")).toHaveValue("Platform Launch");
        });

        it("seeds an overlong current name without widening the panel", async () => {
            // Act
            const screen = await render(<LongName />);

            // Assert
            await expect.element(screen.getByLabelText("Board Name")).toHaveValue(LongName.args.board?.name ?? "");
        });

        it("calls the submit handler once with this board's id, the new name and its current version", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.fill(screen.getByLabelText("Board Name"), "Platform Relaunch");
            await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

            // Assert
            await expect
                .poll(() => Default.args.onSubmit)
                .toHaveBeenCalledWith({ boardId: "8okxhwo6oq2o", name: "Platform Relaunch", version: 3 });
            expect(Default.args.onSubmit).toHaveBeenCalledTimes(1);
        });

        it("blocks a submit with an empty name and reports it inline", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.clear(screen.getByLabelText("Board Name"));
            await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("renders a staged empty-name error", async () => {
            // Act
            const screen = await render(<EmptyNameError />);

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
        });

        it("shows the loading treatment on the save control while the rename is pending", async () => {
            // Act
            const screen = await render(<Renaming />);

            // Assert
            const submit = screen.getByRole("button", { name: "Save Changes" });
            await expect.element(submit).toBeDisabled();
            await expect.element(submit).toHaveAttribute("aria-busy", "true");
        });

        it("keeps the modal open on a backdrop click while the rename is pending", async () => {
            // Arrange
            const screen = await render(<Renaming />);

            // Act — a corner offset, since the panel itself covers the backdrop's centre point.
            await page.elementLocator(getBackdropElement()).click({ position: { x: 4, y: 4 } });

            // Assert
            await expect.element(screen.getByRole("dialog")).toBeVisible();
            expect(Renaming.args.onOpenChange).not.toHaveBeenCalled();
        });

        /* Escape fires the close callback regardless of the backdrop-dismissal prop, so it is guarded too. */
        it("keeps the modal open on Escape while the rename is pending", async () => {
            // Arrange
            const screen = await render(<Renaming />);

            // Act
            await userEvent.keyboard("{Escape}");

            // Assert
            await expect.element(screen.getByRole("dialog")).toBeVisible();
            expect(Renaming.args.onOpenChange).not.toHaveBeenCalled();
        });

        it("closes once the rename settles successfully", async () => {
            // Arrange
            const screen = await render(<SubmitSettles />);

            // Act
            await userEvent.fill(screen.getByLabelText("Board Name"), "Platform Relaunch");
            await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

            // Assert
            await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
        });

        it("renders no error banner of its own — a failed rename is announced by a toast (D-15)", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Edit Board" })).toBeVisible();
            expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0);
        });
    },
});
