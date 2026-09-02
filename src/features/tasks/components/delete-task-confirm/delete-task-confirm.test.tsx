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
import { getBackdropElement } from "@/test-utils/modal-backdrop";

import * as stories from "./delete-task-confirm.stories";

const { Default, Deleting, LongTaskTitle, SubmitSettles } = composeStories(stories);

const CONFIRM_BODY =
    "Are you sure you want to delete the 'Take coffee break' task and its subtasks? " +
    "This action cannot be reversed.";

const LONG_TASK_TITLE = "Mmmmmmmm Mmmmmmmm Mmmmmmmm Mmmmm";

describeForEachDevice({
    name: "DeleteTaskConfirm modal",
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

        it("renders the Copywriting Contract's confirmation title", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Delete this task?" })).toBeVisible();
        });

        /* The danger colour is UI-SPEC "Destructive reserved for" item 7, not incidental styling. */
        it("renders the title in the danger text colour", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            expect(screen.getByRole("heading", { name: "Delete this task?" }).element()).toHaveClass(
                "text-text-danger",
            );
        });

        /* T-04-40: the body must name BOTH the task and its subtasks, and say the action is irreversible. */
        it("names this task AND its subtasks in the body, and says the action cannot be reversed", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByText(CONFIRM_BODY)).toBeVisible();
        });

        it("offers a destructive delete beside a secondary keep, with the Contract's exact labels", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            const remove = screen.getByRole("button", { name: "Delete Task" });
            const keep = screen.getByRole("button", { name: "Keep Task" });
            await expect.element(remove).toBeVisible();
            await expect.element(keep).toBeVisible();
            expect(remove.element()).toHaveClass("bg-bg-danger");
            expect(keep.element()).toHaveClass("bg-bg-surface");
        });

        /* A bare "Cancel" is barred — the secondary button names the alternative OUTCOME. */
        it("offers no bare Cancel control", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert — the panel's two controls are named outcomes, neither of them a bare Cancel.
            await expect.element(screen.getByRole("button", { name: "Keep Task" })).toBeVisible();
            // The close control is icon-only — its name is an aria-label, so it contributes no text here.
            const labels = Array.from(document.querySelectorAll('[role="dialog"] button'))
                .map((control) => control.textContent)
                .filter(Boolean);
            expect(labels).toEqual(["Delete Task", "Keep Task"]);
        });

        /*
         * The safety-relevant case: the cascade has no undo (ADR domain/0002), so a reflexive Enter
         * on an opening modal must never be the thing that destroys a task and its subtasks.
         */
        it("puts initial focus on the keep action, not the destructive one", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("button", { name: "Keep Task" })).toHaveFocus();
            expect(screen.getByRole("button", { name: "Delete Task" }).element()).not.toHaveFocus();
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
            await userEvent.click(screen.getByRole("button", { name: "Keep Task" }));

            // Assert
            expect(Default.args.onClose).toHaveBeenCalled();
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("closes without deleting on Escape", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.keyboard("{Escape}");

            // Assert
            await expect.poll(() => Default.args.onClose).toHaveBeenCalled();
            expect(screen.getByRole("button", { name: "Delete Task" })).toBeDefined();
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("closes without deleting on a backdrop click", async () => {
            // Arrange
            await render(<Default />);

            // Act — a corner offset, since the panel itself covers the backdrop's centre point.
            await page.elementLocator(getBackdropElement()).click({ position: { x: 4, y: 4 } });

            // Assert
            await expect.poll(() => Default.args.onClose).toHaveBeenCalled();
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("calls the submit handler once with this task's own board, column and task id", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Delete Task" }));

            // Assert
            await expect
                .poll(() => Default.args.onSubmit)
                .toHaveBeenCalledWith({
                    boardId: "00000000-0000-4000-8000-000000000001",
                    columnId: "00000000-0000-4000-8000-00000000000c",
                    taskId: Default.args.task?.id,
                });
            expect(Default.args.onSubmit).toHaveBeenCalledTimes(1);
        });

        it("shows the loading treatment on the destructive control while the delete is pending", async () => {
            // Act
            const screen = await render(<Deleting />);

            // Assert
            const remove = screen.getByRole("button", { name: "Delete Task" });
            await expect.element(remove).toBeDisabled();
            await expect.element(remove).toHaveAttribute("aria-busy", "true");
        });

        /* The loading guard is the whole double-submit defence (T-04-41), so it is asserted directly. */
        it("starts no second delete when the destructive control is activated again while pending", async () => {
            // Arrange
            const screen = await render(<Deleting />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Delete Task" }), { force: true });

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
            expect(Deleting.args.onClose).not.toHaveBeenCalled();
        });

        /* Escape fires the close callback regardless of the backdrop-dismissal prop, so it is guarded too. */
        it("keeps the modal open on Escape while the delete is pending", async () => {
            // Arrange
            const screen = await render(<Deleting />);

            // Act
            await userEvent.keyboard("{Escape}");

            // Assert
            await expect.element(screen.getByRole("dialog")).toBeVisible();
            expect(Deleting.args.onClose).not.toHaveBeenCalled();
        });

        /* The delete is never optimistic — closes on settle, whichever way it went. */
        it("closes once the delete settles, whichever way it went", async () => {
            // Arrange
            const screen = await render(<SubmitSettles />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Delete Task" }));

            // Assert
            await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
        });

        it("renders no error banner of its own — a failed delete is announced by a toast", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Delete this task?" })).toBeVisible();
            expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0);
        });

        /*
         * UI-SPEC long-text/delete-confirm-body: the body is prose, not a label, so a title at the
         * backend's 32-character ceiling wraps inside the panel rather than widening it.
         */
        it("wraps a 32-character task title rather than truncating it or widening the panel", async () => {
            // Act
            const screen = await render(<LongTaskTitle />);

            // Assert — the whole title is present, wrapped, inside the panel's own width.
            const body = screen
                .getByText(new RegExp(`^Are you sure you want to delete the '${LONG_TASK_TITLE}'`))
                .element();
            const styles = getComputedStyle(body);
            expect(styles.textOverflow).not.toBe("ellipsis");
            expect(styles.whiteSpace).not.toBe("nowrap");
            expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);
            expect(body.getBoundingClientRect().height).toBeGreaterThan(Number.parseFloat(styles.lineHeight));
        });
    },
});
