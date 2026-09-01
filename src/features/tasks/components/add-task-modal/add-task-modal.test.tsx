/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { screen as domScreen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./add-task-modal.stories";

const { Default, Filled, Submitting, TitleError, CreateFailed, ManySubtasks, NoSubtasks, SingleColumn, SubmitFails } =
    composeStories(stories);

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
    name: "AddTask modal",
    body: () => {
        it("renders the Copywriting Contract's title, fields and submit label", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Add New Task" })).toBeVisible();
            await expect.element(screen.getByLabelText("Title")).toBeVisible();
            await expect.element(screen.getByLabelText("Description")).toBeVisible();
            await expect.element(screen.getByRole("button", { name: "Create Task" })).toBeVisible();
        });

        /* UI-SPEC empty/add-task-modal: the mock's own two seeded draft rows. */
        it("opens with exactly two blank subtask rows", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByLabelText("Subtask 1", { exact: true })).toHaveValue("");
            await expect.element(screen.getByLabelText("Subtask 2", { exact: true })).toHaveValue("");
            await expect.element(screen.getByLabelText("Subtask 3", { exact: true })).not.toBeInTheDocument();
        });

        it("lists the board's columns in order, defaulting to the first", async () => {
            // Arrange — filled first so blurring Title never reflows this row mid-click (below).
            const screen = await render(<Default />);
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");

            // Assert
            await expect.element(screen.getByRole("combobox", { name: "Todo" })).toBeVisible();
            await screen.getByRole("combobox", { name: "Todo" }).click();
            await expect.element(screen.getByRole("option", { name: "Todo" })).toBeVisible();
            await expect.element(screen.getByRole("option", { name: "Doing" })).toBeVisible();
            await expect.element(screen.getByRole("option", { name: "Done" })).toBeVisible();
        });

        it("shows every supplied field value", async () => {
            // Act
            const screen = await render(<Filled />);

            // Assert
            await expect.element(screen.getByLabelText("Title")).toHaveValue("Take coffee break");
            await expect.element(screen.getByLabelText("Description")).toHaveValue("Recharge for fifteen minutes");
            await expect.element(screen.getByLabelText("Subtask 1", { exact: true })).toHaveValue("Make coffee");
            await expect
                .element(screen.getByLabelText("Subtask 2", { exact: true }))
                .toHaveValue("Drink coffee & smile");
        });

        it("shows the loading treatment on the submit control while a submit is pending", async () => {
            // Act
            const screen = await render(<Submitting />);

            // Assert
            const submit = screen.getByRole("button", { name: "Create Task" });
            await expect.element(submit).toBeDisabled();
            await expect.element(submit).toHaveAttribute("aria-busy", "true");
        });

        it("renders a staged title error", async () => {
            // Act
            const screen = await render(<TitleError />);

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
        });

        it("renders a form-level create failure as an alert, with no toast", async () => {
            // Act
            const screen = await render(<CreateFailed />);

            // Assert
            await expect.element(screen.getByRole("alert")).toHaveTextContent("Couldn't create task. Try again.");
            const region = domScreen.queryByRole("region", { name: "Notifications" });
            expect(region ? within(region).queryAllByRole("dialog") : []).toHaveLength(0);
        });

        it("blocks submission and shows the required-field message when the title is blank", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await screen.getByRole("button", { name: "Create Task" }).click();

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("blocks submission and shows the length message for a two-character title", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Do");
            await screen.getByRole("button", { name: "Create Task" }).click();

            // Assert
            await expect.element(screen.getByText("Task title must be between 3 and 32 characters.")).toBeVisible();
            expect(Default.args.onSubmit).not.toHaveBeenCalled();
        });

        it("hands a valid submit exactly one create request with every subtask row kept", async () => {
            // Arrange
            const screen = await render(<Filled />);

            // Act
            await screen.getByRole("button", { name: "Create Task" }).click();

            // Assert
            await vi.waitFor(() => {
                expect(Filled.args.onSubmit).toHaveBeenCalledWith({
                    columnId: "doing",
                    title: "Take coffee break",
                    description: "Recharge for fifteen minutes",
                    subtasks: ["Make coffee", "Drink coffee & smile"],
                });
            });
        });

        /* UI-SPEC empty/add-task-modal: a blank row is omitted from the fan-out, not validation-blocked. */
        it("omits a blank subtask row from the submitted values rather than blocking submission", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await userEvent.fill(screen.getByLabelText("Subtask 1", { exact: true }), "Make coffee");
            await screen.getByRole("button", { name: "Create Task" }).click();

            // Assert
            await vi.waitFor(() => {
                expect(Default.args.onSubmit).toHaveBeenCalledWith(
                    expect.objectContaining({ subtasks: ["Make coffee"] }),
                );
            });
        });

        /* UI-SPEC empty/add-task-modal: removing both seeded rows is legal. */
        it("submits with no subtasks when every row is removed", async () => {
            // Arrange
            const screen = await render(<NoSubtasks />);

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await screen.getByRole("button", { name: "Create Task" }).click();

            // Assert
            await vi.waitFor(() => {
                expect(NoSubtasks.args.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ subtasks: [] }));
            });
        });

        it("appends a further blank row when the add-row control is activated", async () => {
            // Arrange — filled first so blurring Title never reflows this row mid-click (below).
            const screen = await render(<Default />);
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");

            // Act
            await screen.getByRole("button", { name: "+ Add New Subtask" }).click();

            // Assert
            await expect.element(screen.getByLabelText("Subtask 3", { exact: true })).toHaveValue("");
        });

        it("removes a subtask row on its own remove control", async () => {
            // Arrange — `Filled` seeds both rows with real values, so the survivor is unambiguous.
            const screen = await render(<Filled />);

            // Act
            await screen.getByRole("button", { name: "Remove subtask 'Make coffee'" }).click();

            // Assert
            await expect
                .element(screen.getByLabelText("Subtask 1", { exact: true }))
                .toHaveValue("Drink coffee & smile");
            await expect.element(screen.getByLabelText("Subtask 2", { exact: true })).not.toBeInTheDocument();
        });

        /*
         * UI-SPEC zero-one-many: N identical glyph-only remove controls in one modal are otherwise
         * indistinguishable — a fallback name still disambiguates the blank case.
         */
        it("names an untouched row's remove control by its position, not a bare 'Remove'", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("button", { name: "Remove Subtask 1" })).toBeVisible();
            await expect.element(screen.getByRole("button", { name: "Remove Subtask 2" })).toBeVisible();
        });

        /*
         * The mock (PDF p6) labels the subtask GROUP once and shows bare inputs under it; a visible
         * per-row label repeats it and takes the 30px that pushed rows to a 36px pitch against the
         * mock's 12px. Asserted geometrically — the design constrains that it takes no space, not how.
         */
        it("keeps each subtask row's label announced but out of the layout", async () => {
            // Act
            const screen = await render(<Default />);
            await expect.element(screen.getByLabelText("Subtask 1", { exact: true })).toBeVisible();

            // Assert — still associated (the query above resolves), but occupying no vertical space.
            const input = document.querySelector<HTMLInputElement>('input[name="subtasks.0.value"]');
            const label = document.querySelector<HTMLLabelElement>(`label[for="${input?.id ?? ""}"]`);
            expect(label?.textContent).toBe("Subtask 1");
            expect(label?.getBoundingClientRect().height).toBeLessThanOrEqual(1);
        });

        it("renders every staged subtask row in the order supplied", async () => {
            // Act
            const screen = await render(<ManySubtasks />);

            // Assert
            await expect.element(screen.getByLabelText("Subtask 1", { exact: true })).toHaveValue("Make coffee");
            await expect.element(screen.getByLabelText("Subtask 4", { exact: true })).toHaveValue("Return to desk");
        });

        it("renders no subtask rows when staged with none", async () => {
            // Act
            const screen = await render(<NoSubtasks />);

            // Assert
            await expect.element(screen.getByLabelText("Subtask 1", { exact: true })).not.toBeInTheDocument();
        });

        it("submits the single available column when only one exists", async () => {
            // Arrange
            const screen = await render(<SingleColumn />);

            // Act
            await userEvent.fill(screen.getByLabelText("Title"), "Take coffee break");
            await screen.getByRole("button", { name: "Create Task" }).click();

            // Assert
            await vi.waitFor(() => {
                expect(SingleColumn.args.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ columnId: "todo" }));
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

        /*
         * D-05: a failed create keeps the modal open with everything typed intact — nothing was
         * created, so there is nothing to reconcile.
         */
        it("keeps the typed fields and shows an inline error when the submit handler reports failure", async () => {
            // Arrange
            const screen = await render(<SubmitFails />);

            // Act
            await screen.getByRole("button", { name: "Create Task" }).click();

            // Assert
            await expect.element(screen.getByRole("alert")).toHaveTextContent("Couldn't create task. Try again.");
            await expect.element(screen.getByRole("dialog")).toBeVisible();
            await expect.element(screen.getByLabelText("Title")).toHaveValue("Take coffee break");
        });
    },
});
