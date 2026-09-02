/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./add-board-modal.stories";

const {
    Default,
    Filled,
    Submitting,
    NameError,
    CreateFailed,
    ManyColumns,
    NoColumns,
    ColumnNameError,
    BlankNameNoColumnRows,
    BlankNameOneNamedColumn,
    ShortColumnRow,
    BlankRowBesideFilledRow,
    SubmitFails,
} = composeStories(stories);

/*
 * Base UI renders the backdrop as a sibling of the popup with no role of its own, so it is reached
 * by attribute rather than by role — the same lookup `modal.test.tsx` uses for its dismissal cases.
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
    name: "AddBoard modal",
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
            // Arrange — no column rows, so the only required-field message on screen is the name's.
            const screen = await render(<BlankNameNoColumnRows />);

            // Act
            await screen.getByRole("button", { name: "Create New Board" }).click();

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
            expect(BlankNameNoColumnRows.args.onSubmit).not.toHaveBeenCalled();
        });

        it("hands the typed board name to the submit handler", async () => {
            // Arrange
            const screen = await render(<BlankNameOneNamedColumn />);

            // Act
            await userEvent.fill(screen.getByLabelText("Board Name"), "Launch");
            await screen.getByRole("button", { name: "Create New Board" }).click();

            // Assert
            await vi.waitFor(() => {
                expect(BlankNameOneNamedColumn.args.onSubmit).toHaveBeenCalledWith(
                    expect.objectContaining({ name: "Launch" }),
                );
            });
        });

        // D-01a: exactly one row, so nothing has to be cleared that the user did not ask for.
        it("opens with exactly one empty column row", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByLabelText("Column 1", { exact: true })).toHaveValue("");
            await expect.element(screen.getByLabelText("Column 2", { exact: true })).not.toBeInTheDocument();
        });

        it("appends a further empty row when the add-row control is activated", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await screen.getByRole("button", { name: "+ Add New Column" }).click();

            // Assert
            await expect.element(screen.getByLabelText("Column 2", { exact: true })).toHaveValue("");
        });

        it("removes rows one at a time, down to none at all", async () => {
            // Arrange — two added rows on top of the default one, so removal has something to walk.
            const screen = await render(<Default />);
            await screen.getByRole("button", { name: "+ Add New Column" }).click();
            await screen.getByRole("button", { name: "+ Add New Column" }).click();

            // Act
            await screen.getByRole("button", { name: "Remove Column 3" }).click();
            await screen.getByRole("button", { name: "Remove Column 2" }).click();
            await screen.getByRole("button", { name: "Remove Column 1" }).click();

            // Assert
            await expect.element(screen.getByLabelText("Column 1", { exact: true })).not.toBeInTheDocument();
            await expect.element(screen.getByRole("button", { name: "+ Add New Column" })).toBeVisible();
        });

        it("renders every staged column row in the order supplied", async () => {
            // Act
            const screen = await render(<ManyColumns />);

            // Assert
            await expect.element(screen.getByLabelText("Column 1", { exact: true })).toHaveValue("Todo");
            await expect.element(screen.getByLabelText("Column 5", { exact: true })).toHaveValue("Done");
        });

        // D-02a keeps this: zero rows is a valid submission — the board is simply created with none.
        it("submits with an empty column set when there are no rows", async () => {
            // Arrange
            const screen = await render(<BlankNameNoColumnRows />);

            // Act
            await userEvent.fill(screen.getByLabelText("Board Name"), "Launch");
            await screen.getByRole("button", { name: "Create New Board" }).click();

            // Assert
            await vi.waitFor(() => {
                expect(BlankNameNoColumnRows.args.onSubmit).toHaveBeenCalledWith({ name: "Launch", columns: [] });
            });
        });

        it("blocks submission on a two-character column entry and shows that row's own error", async () => {
            // Arrange
            const screen = await render(<ShortColumnRow />);

            // Act
            await userEvent.fill(screen.getByLabelText("Board Name"), "Launch");
            await screen.getByRole("button", { name: "Create New Board" }).click();

            // Assert
            await expect.element(screen.getByText("Column name must be between 3 and 32 characters.")).toBeVisible();
            expect(ShortColumnRow.args.onSubmit).not.toHaveBeenCalled();
        });

        it("renders a staged column-row error", async () => {
            // Act
            const screen = await render(<ColumnNameError />);

            // Assert
            await expect.element(screen.getByText("Column name must be between 3 and 32 characters.")).toBeVisible();
        });

        /*
         * The user-reported overlap: with the message out of flow beneath the field, it covered
         * "+ Add New Column" by 9.5px vertically and 95.6px horizontally. Asserted as an
         * intersection of measured rects — a class-name assertion would survive the regression.
         */
        it("keeps a column row's error message clear of the add-row control", async () => {
            // Arrange
            const screen = await render(<ColumnNameError />);

            // Act
            const messageRect = screen
                .getByText("Column name must be between 3 and 32 characters.")
                .element()
                .getBoundingClientRect();
            const addRowRect = screen
                .getByRole("button", { name: "+ Add New Column" })
                .element()
                .getBoundingClientRect();

            // Assert — no intersection means at least one axis has no positive overlap.
            const verticalOverlap =
                Math.min(messageRect.bottom, addRowRect.bottom) - Math.max(messageRect.top, addRowRect.top);
            const horizontalOverlap =
                Math.min(messageRect.right, addRowRect.right) - Math.max(messageRect.left, addRowRect.left);
            expect(Math.min(verticalOverlap, horizontalOverlap)).toBeLessThanOrEqual(0);
        });

        /*
         * D-02a: a blank row left on screen blocks submission rather than being silently dropped,
         * so what gets created can never differ from what the user is looking at.
         */
        it("blocks submission on a blank row sitting alongside a filled one", async () => {
            // Arrange
            const screen = await render(<BlankRowBesideFilledRow />);

            // Act
            await userEvent.fill(screen.getByLabelText("Board Name"), "Launch");
            await screen.getByRole("button", { name: "Create New Board" }).click();

            // Assert — the board name is filled, so this required-field message is the row's own.
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
            expect(BlankRowBesideFilledRow.args.onSubmit).not.toHaveBeenCalled();
        });

        /* The default state itself: one untouched row must be named or removed, never ignored. */
        it("blocks submission on the single default row when it is left untouched", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.fill(screen.getByLabelText("Board Name"), "Launch");
            await screen.getByRole("button", { name: "Create New Board" }).click();

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        /* Removing that row instead of naming it is the sanctioned way to create with no columns. */
        it("submits with no columns once the single default row is removed", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.fill(screen.getByLabelText("Board Name"), "Launch");
            await screen.getByRole("button", { name: "Remove Column 1" }).click();
            await screen.getByRole("button", { name: "Create New Board" }).click();

            // Assert
            await vi.waitFor(() => {
                expect(Default.args.onSubmit).toHaveBeenCalledWith({ name: "Launch", columns: [] });
            });
        });

        it("renders no column rows when staged with none", async () => {
            // Act
            const screen = await render(<NoColumns />);

            // Assert
            await expect.element(screen.getByLabelText("Column 1", { exact: true })).not.toBeInTheDocument();
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
            expect(Submitting.args.onOpenChange).not.toHaveBeenCalled();
        });

        /*
         * D-05: a failed create keeps the modal open with the typed name intact — nothing was
         * created, so there is nothing to reconcile and nothing to clear.
         */
        it("keeps the typed name and shows an inline error when the submit handler reports failure", async () => {
            // Arrange
            const screen = await render(<SubmitFails />);

            // Act
            await userEvent.fill(screen.getByLabelText("Board Name"), "Launch");
            await screen.getByRole("button", { name: "Create New Board" }).click();

            // Assert — both the name and the column rows survive the failure (D-05).
            await expect.element(screen.getByRole("alert")).toHaveTextContent("Couldn't create board. Try again.");
            await expect.element(screen.getByRole("dialog")).toBeVisible();
            await expect.element(screen.getByLabelText("Board Name")).toHaveValue("Launch");
            await expect.element(screen.getByLabelText("Column 1", { exact: true })).toHaveValue("Todo");
        });

        /*
         * Story args are shared across every case that renders the same story, so a leaked call
         * count would make a later negative assertion pass for the wrong reason. Proven, not assumed.
         */
        it("starts every case from a zero call count on a story rendered by an earlier case", async () => {
            // Arrange
            const screen = await render(<BlankNameOneNamedColumn />);

            // Assert — the preceding cases already submitted through this same story's spy.
            expect(BlankNameOneNamedColumn.args.onSubmit).not.toHaveBeenCalled();

            // Act
            await userEvent.fill(screen.getByLabelText("Board Name"), "Launch");
            await screen.getByRole("button", { name: "Create New Board" }).click();

            // Assert
            await vi.waitFor(() => {
                expect(BlankNameOneNamedColumn.args.onSubmit).toHaveBeenCalledTimes(1);
            });
        });
    },
});
