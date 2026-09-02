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

import * as stories from "./delete-board-confirm.stories";

const { Default, Deleting, LongBoardName, SubmitSettles } = composeStories(stories);

const CONFIRM_BODY =
    "Are you sure you want to delete the 'Platform Launch' board? " +
    "This action will remove all columns and tasks and cannot be reversed.";

/*
 * Base UI renders the backdrop as a sibling of the popup with no role of its own, so it is reached
 * by attribute rather than by role — the same lookup `edit-board-modal.test.tsx` uses.
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
    name: "DeleteBoardConfirm modal",
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

        it("asks to close when the close control is pressed", async () => {
            // Arrange
            const rendered = await render(<Default />);

            // Act
            await rendered.getByRole("button", { name: "Close" }).click();

            // Assert
            expect(Default.args.onOpenChange).toHaveBeenCalledWith(false);
        });

        it("renders the Copywriting Contract's confirmation title", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Delete this board?" })).toBeVisible();
        });

        it("names this board in the body, in the Contract's own wording", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByText(CONFIRM_BODY)).toBeVisible();
        });

        it("offers a destructive delete beside a secondary keep, with the Contract's exact labels", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            const remove = screen.getByRole("button", { name: "Delete Board" });
            const keep = screen.getByRole("button", { name: "Keep Board" });
            await expect.element(remove).toBeVisible();
            await expect.element(keep).toBeVisible();
            expect(remove.element()).toHaveClass("bg-bg-danger");
            expect(keep.element()).toHaveClass("bg-bg-surface");
        });

        /*
         * The safety-relevant case: the cascade has no undo (ADR domain/0002), so a reflexive Enter
         * on an opening modal must never be the thing that destroys a board.
         */
        it("puts initial focus on the keep action, not the destructive one", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("button", { name: "Keep Board" })).toHaveFocus();
            expect(screen.getByRole("button", { name: "Delete Board" }).element()).not.toHaveFocus();
        });

        it("deletes nothing when Enter is pressed the moment the modal opens", async () => {
            // Arrange
            await render(<Default />);

            // Act
            await userEvent.keyboard("{Enter}");

            // Assert
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("closes without deleting when the keep action is activated", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Keep Board" }));

            // Assert
            expect(Default.args.onOpenChange).toHaveBeenCalledWith(false);
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("closes without deleting on Escape", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.keyboard("{Escape}");

            // Assert
            await expect.poll(() => Default.args.onOpenChange).toHaveBeenCalledWith(false);
            expect(screen.getByRole("button", { name: "Delete Board" })).toBeDefined();
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("closes without deleting on a backdrop click", async () => {
            // Arrange
            await render(<Default />);

            // Act — a corner offset, since the panel itself covers the backdrop's centre point.
            await page.elementLocator(getBackdropElement()).click({ position: { x: 4, y: 4 } });

            // Assert
            await expect.poll(() => Default.args.onOpenChange).toHaveBeenCalledWith(false);
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("calls the submit handler once with this board's id", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Delete Board" }));

            // Assert
            await expect.poll(() => Default.args.onSubmit).toHaveBeenCalledWith({ boardId: "8okxhwo6oq2o" });
            expect(Default.args.onSubmit).toHaveBeenCalledTimes(1);
        });

        it("shows the loading treatment on the destructive control while the delete is pending", async () => {
            // Act
            const screen = await render(<Deleting />);

            // Assert
            const remove = screen.getByRole("button", { name: "Delete Board" });
            await expect.element(remove).toBeDisabled();
            await expect.element(remove).toHaveAttribute("aria-busy", "true");
        });

        /* T-02-67: the loading guard is the whole double-submit defence, so it is asserted directly. */
        it("starts no second delete when the destructive control is activated again while pending", async () => {
            // Arrange
            const screen = await render(<Deleting />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Delete Board" }), { force: true });

            // Assert
            expect(Deleting.args.onSubmit).not.toHaveBeenCalled();
        });

        it("keeps the modal open on a backdrop click while the delete is pending", async () => {
            // Arrange
            const screen = await render(<Deleting />);

            // Act
            await page.elementLocator(getBackdropElement()).click({ position: { x: 4, y: 4 } });

            // Assert
            await expect.element(screen.getByRole("dialog")).toBeVisible();
            expect(Deleting.args.onOpenChange).not.toHaveBeenCalled();
        });

        /* Escape fires the close callback regardless of the backdrop-dismissal prop, so it is guarded too. */
        it("keeps the modal open on Escape while the delete is pending", async () => {
            // Arrange
            const screen = await render(<Deleting />);

            // Act
            await userEvent.keyboard("{Escape}");

            // Assert
            await expect.element(screen.getByRole("dialog")).toBeVisible();
            expect(Deleting.args.onOpenChange).not.toHaveBeenCalled();
        });

        /* D-09: a failed delete closes the modal too — the failure is the hook's toast, not a banner here. */
        it("closes once the delete settles, whichever way it went", async () => {
            // Arrange
            const screen = await render(<SubmitSettles />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Delete Board" }));

            // Assert
            await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
        });

        it("renders no error banner of its own — a failed delete is announced by a toast (D-09)", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Delete this board?" })).toBeVisible();
            expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0);
        });

        /*
         * UI-SPEC's long-text row: the body is prose, not a label, so an overlong name has to wrap
         * across lines — truncating it would hide which board is about to be destroyed.
         */
        it("wraps a 200-character board name across lines rather than truncating it", async () => {
            // Act
            const screen = await render(<LongBoardName />);

            // Assert — the whole name is present, on more than one line, inside the panel's width.
            const body = screen.getByText(/^Are you sure you want to delete the 'L{200}' board\?/).element();
            const styles = getComputedStyle(body);
            expect(styles.textOverflow).not.toBe("ellipsis");
            expect(styles.whiteSpace).not.toBe("nowrap");
            expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);
            expect(body.getBoundingClientRect().height).toBeGreaterThan(Number.parseFloat(styles.lineHeight) * 2);
        });
    },
});
