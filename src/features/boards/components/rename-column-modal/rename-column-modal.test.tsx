/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./rename-column-modal.stories";

const { Default, NameError, LongColumnName, SubmitSettles } = composeStories(stories);

/** `modal.tsx`'s own `w-[min(90vw,28rem)]` silhouette, resolved against the running viewport. */
const getPanelWidthCeiling = (): number => Math.min(window.innerWidth * 0.9, 448);

describeForEachDevice({
    name: "RenameColumn modal",
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

        it("renders the Copywriting Contract's title, field label and save label", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Rename Column" })).toBeVisible();
            await expect.element(screen.getByLabelText("Column Name")).toBeVisible();
            await expect.element(screen.getByRole("button", { name: "Save Changes" })).toBeVisible();
        });

        it("seeds the name field with the column's current name", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByLabelText("Column Name")).toHaveValue("Todo");
        });

        it("calls the submit handler once with this column's board id, column id, new name and version", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.fill(screen.getByLabelText("Column Name"), "In Progress");
            await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

            // Assert
            await expect
                .poll(() => Default.args.onSubmit)
                .toHaveBeenCalledWith({
                    boardId: Default.args.boardId,
                    columnId: Default.args.column?.id,
                    name: "In Progress",
                    version: 3,
                });
            expect(Default.args.onSubmit).toHaveBeenCalledTimes(1);
        });

        it("blocks a submit with an empty name and reports it inline", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.clear(screen.getByLabelText("Column Name"));
            await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        /* The blank case earns the required-field copy and only an out-of-bounds one the length copy. */
        it("blocks a submit with a two-character name and reports the 3-32 bound", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.fill(screen.getByLabelText("Column Name"), "Ab");
            await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

            // Assert — the slot shows the counter; the prose it replaces stays the accessible description.
            await expect.element(screen.getByText("2/32")).toBeVisible();
            expect(
                screen.getByText("Column name must be between 3 and 32 characters.").element().getBoundingClientRect()
                    .width,
            ).toBeLessThanOrEqual(1);
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("renders a staged empty-name error", async () => {
            // Act
            const screen = await render(<NameError />);

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
        });

        /* UI-SPEC long-text/name-in-modals: a 32-character name submits and never widens the panel. */
        it("submits a 32-character name without widening the panel", async () => {
            // Arrange
            const screen = await render(<LongColumnName />);
            const longName = LongColumnName.args.column?.name ?? "";

            // Assert — seeded in full inside a panel still on its own width contract.
            await expect.element(screen.getByLabelText("Column Name")).toHaveValue(longName);
            const panel = screen.getByRole("dialog").element();
            expect(panel.getBoundingClientRect().width).toBeLessThanOrEqual(getPanelWidthCeiling() + 1);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

            // Assert
            await expect
                .poll(() => LongColumnName.args.onSubmit)
                .toHaveBeenCalledWith({
                    boardId: LongColumnName.args.boardId,
                    columnId: LongColumnName.args.column?.id,
                    name: longName,
                    version: 3,
                });
        });

        /* U-05: no pending state at all — the optimistic name is already on screen underneath. */
        it("closes on submit rather than holding a loading treatment", async () => {
            // Arrange
            const screen = await render(<SubmitSettles />);
            await expect.element(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();

            // Act
            await userEvent.fill(screen.getByLabelText("Column Name"), "In Progress");
            await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

            // Assert
            await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
        });

        it("renders no error banner of its own — a failed rename is announced by a toast (U-05)", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Rename Column" })).toBeVisible();
            expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0);
        });
    },
});
