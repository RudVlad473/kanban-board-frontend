/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { getRaisedToastCount } from "@/test-utils/raised-toasts";

import * as stories from "./add-column-modal.stories";

const { Default, Submitting, NameError, CreateFailed, ShortColumnName, LongColumnName } = composeStories(stories);

describeForEachDevice({
    name: "AddColumn modal",
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

        it("renders the Copywriting Contract's title, field label, placeholder and submit label", async () => {
            // Act
            const screenResult = await render(<Default />);

            // Assert
            await expect.element(screenResult.getByRole("heading", { name: "Add New Column" })).toBeVisible();
            await expect.element(screenResult.getByLabelText("Column Name")).toBeVisible();
            await expect.element(screenResult.getByPlaceholder("e.g. Todo")).toBeVisible();
            await expect.element(screenResult.getByRole("button", { name: "Create New Column" })).toBeVisible();
        });

        it("hands the typed column name to the submit handler", async () => {
            // Arrange
            const screenResult = await render(<Default />);

            // Act
            await userEvent.fill(screenResult.getByLabelText("Column Name"), "Backlog");
            await screenResult.getByRole("button", { name: "Create New Column" }).click();

            // Assert
            await vi.waitFor(() => {
                expect(Default.args.onSubmit).toHaveBeenCalledWith({ name: "Backlog" });
            });
        });

        it("blocks submission and shows the required-field copy when the name is blank", async () => {
            // Arrange
            const screenResult = await render(<Default />);

            // Act
            await screenResult.getByRole("button", { name: "Create New Column" }).click();

            // Assert
            await expect.element(screenResult.getByText("Can't be empty")).toBeVisible();
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        /* The backend's own 3-32 bound, refused here rather than upstream (UI-SPEC long-text row). */
        it("blocks submission on a two-character name and shows the length copy", async () => {
            // Arrange
            const screenResult = await render(<ShortColumnName />);

            // Act
            await screenResult.getByRole("button", { name: "Create New Column" }).click();

            // Assert — the slot shows the counter; the prose it replaces stays the accessible description.
            await expect.element(screenResult.getByText("2/32")).toBeVisible();
            expect(
                screenResult
                    .getByText("Column name must be between 3 and 32 characters.")
                    .element()
                    .getBoundingClientRect().width,
            ).toBeLessThanOrEqual(1);
            expect(ShortColumnName.args.onSubmit).not.toHaveBeenCalled();
        });

        /* UI-SPEC loading/Add-Column-submit: the modal stays OPEN while the POST is in flight. */
        it("shows the submit control's loading treatment without closing the modal", async () => {
            // Act
            const screenResult = await render(<Submitting />);

            // Assert
            const submit = screenResult.getByRole("button", { name: "Create New Column" });
            await expect.element(submit).toBeDisabled();
            await expect.element(submit).toHaveAttribute("aria-busy", "true");
            await expect.element(screenResult.getByRole("dialog")).toBeVisible();
        });

        /*
         * UI-SPEC error/Add-Column-generic: nothing was created, so there is nothing to reconcile
         * and the failure belongs inline in the still-open modal rather than in a toast.
         */
        it("renders the generic create failure inline in the still-open modal and raises no toast", async () => {
            // Act
            const screenResult = await render(<CreateFailed />);

            // Assert
            await expect
                .element(screenResult.getByRole("alert"))
                .toHaveTextContent("Couldn't create column. Try again.");
            await expect.element(screenResult.getByRole("dialog")).toBeVisible();
            expect(getRaisedToastCount()).toBe(0);
        });

        it("renders a staged column-name error", async () => {
            // Act
            const screenResult = await render(<NameError />);

            // Assert
            await expect.element(screenResult.getByText("Can't be empty")).toBeVisible();
        });

        /* 32 characters is the backend's own ceiling, so this is the longest name that may submit. */
        it("accepts a name at the backend's own 32-character ceiling", async () => {
            // Arrange
            const screenResult = await render(<LongColumnName />);

            // Act
            await screenResult.getByRole("button", { name: "Create New Column" }).click();

            // Assert
            await vi.waitFor(() => {
                expect(LongColumnName.args.onSubmit).toHaveBeenCalledWith({ name: "A".repeat(32) });
            });
        });
    },
});
