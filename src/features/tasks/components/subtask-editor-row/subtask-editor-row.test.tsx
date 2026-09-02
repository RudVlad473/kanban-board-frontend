/*
 * Composed from the plain React renderer package, not @storybook/nextjs-vite — the latter's main
 * entry eagerly imports real Next.js internals this "browser" project deliberately does not load
 * (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./subtask-editor-row.stories";

const { Default, Draft, Pending, EmptyError } = composeStories(stories);

/*
 * ADR tech/0014: every component's suite runs at both viewports; this row has no
 * viewport-conditional behaviour of its own.
 */
describeForEachDevice({
    name: "SubtaskEditorRow",
    body: () => {
        /*
         * PDF p7 centres the row's ✕ on its field. A `mt-6` written to clear a label the row never
         * renders pushed it 26px down instead. Asserted as measured centres, not as a class name.
         */
        it("centres the remove control on the field it belongs to", async () => {
            // Arrange
            const screenInstance = await render(<Default />);

            // Act
            const inputRect = screenInstance.getByRole("textbox").element().getBoundingClientRect();
            const removeRect = screenInstance
                .getByRole("button", { name: "Remove subtask 'Make coffee'" })
                .element()
                .getBoundingClientRect();

            // Assert
            const inputCentre = inputRect.top + inputRect.height / 2;
            const removeCentre = removeRect.top + removeRect.height / 2;
            expect(Math.abs(removeCentre - inputCentre)).toBeLessThanOrEqual(1);
        });

        it("commits a rename on blur when the value changed and is non-empty", async () => {
            // Arrange
            const screenInstance = await render(<Default />);

            // Act
            await userEvent.fill(screenInstance.getByRole("textbox"), "Renamed Subtask");
            await userEvent.tab();

            // Assert
            await vi.waitFor(() => {
                expect(Default.args.onCommit).toHaveBeenCalledWith("Renamed Subtask");
            });
        });

        it("commits a rename on Enter, the same way blur does", async () => {
            // Arrange
            const screenInstance = await render(<Default />);

            // Act
            await userEvent.fill(screenInstance.getByRole("textbox"), "Renamed Via Enter");
            await userEvent.keyboard("{Enter}");

            // Assert
            await vi.waitFor(() => {
                expect(Default.args.onCommit).toHaveBeenCalledWith("Renamed Via Enter");
            });
        });

        it("commits nothing on a blur with an unchanged value", async () => {
            // Arrange
            const screenInstance = await render(<Default />);

            // Act
            await screenInstance.getByRole("textbox").click();
            await userEvent.tab();

            // Assert
            expect(Default.args.onCommit).not.toHaveBeenCalled();
        });

        it("shows the required-field message and commits nothing on a blur with an empty value", async () => {
            // Arrange
            const screenInstance = await render(<Default />);

            // Act
            await userEvent.fill(screenInstance.getByRole("textbox"), "");
            await userEvent.tab();

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
            expect(Default.args.onCommit).not.toHaveBeenCalled();
        });

        /* Staged rather than driven through a real blur — proves the error rendering alone. */
        it("renders a staged empty-value error with no length message", async () => {
            // Act
            await render(<EmptyError />);

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
            expect(screen.queryByText(/between/)).not.toBeInTheDocument();
        });

        it("gives the remove control an accessible name interpolating the row's own title", async () => {
            // Act
            await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("button", { name: "Remove subtask 'Make coffee'" })).toBeVisible();
        });

        it("falls back to the row label for the remove control's name when the row is blank", async () => {
            // Act
            await render(<Draft />);

            // Assert
            await expect.element(screen.getByRole("button", { name: "Remove Subtask 2" })).toBeVisible();
        });

        /*
         * S-03: a draft row carries the seeded placeholder; a live row shows none. Two SIMULTANEOUS
         * renders, scoped by their own `container` (never the page-global locator API — both mount
         * into the same document, so an unscoped query resolves to both rows' inputs at once).
         */
        it("shows the seeded placeholder on a draft row and none on a live row", async () => {
            // Act
            const draft = await render(<Draft />);
            const live = await render(<Default />);

            // Assert
            expect(within(draft.container).getByRole("textbox")).toHaveAttribute("placeholder", "e.g. Make coffee");
            expect(within(live.container).getByRole("textbox")).not.toHaveAttribute("placeholder");
        });

        /*
         * UI-SPEC loading/subtask-checklist-row: the BUSY row's own remove disabled; a sibling stays
         * live. Scoped by `container`, for the same simultaneous-render reason as the placeholder case.
         */
        it("disables a busy row's own remove control while a sibling row's stays enabled", async () => {
            // Arrange
            const busy = await render(<Pending />);
            const live = await render(<Default />);

            // Assert
            expect(within(busy.container).getByRole("button", { name: /Remove/ })).toBeDisabled();
            expect(within(live.container).getByRole("button", { name: /Remove/ })).toBeEnabled();
        });

        it("invokes onRemove when the remove control is activated", async () => {
            // Arrange
            const screenInstance = await render(<Default />);

            // Act
            await screenInstance.getByRole("button", { name: /Remove/ }).click();

            // Assert
            expect(Default.args.onRemove).toHaveBeenCalledTimes(1);
        });
    },
});
