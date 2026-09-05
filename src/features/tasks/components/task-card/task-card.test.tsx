/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { isNil } from "es-toolkit";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./task-card.stories";

const { Default, NoSubtasks, OneSubtask, LongTitle, Moving, LoneTask } = composeStories(stories);

/*
 * Read off the DOM rather than by role: a card renders TWO buttons, and the handle's accessible name
 * interpolates the same title the content button's does, so a name-based query is ambiguous by
 * construction — which is the whole point rather than an accident of these fixtures.
 */
const getCards = (): HTMLElement[] => Array.from(document.querySelectorAll("li"));

/** A card's open-detail control: the first button inside it, with the handle always the second. */
const getContentButton = (card: Element): HTMLElement => {
    const content = card.querySelector("button");
    if (isNil(content)) {
        throw new Error("a task card rendered no open-detail control");
    }

    return content;
};

/** A card's caption element, or null when the card suppressed it — an absent node, not empty text. */
const getCaption = (card: Element): string | null => {
    const spans = getContentButton(card).querySelectorAll(":scope > span");

    return spans.length >= 2 ? spans[1].textContent : null;
};

describeForEachDevice({
    name: "TaskCard",
    body: () => {
        /*
         * UI-SPEC populated/task-card: title and caption live inside ONE button, so a screen reader
         * announces progress with the title rather than as a second unrelated stop.
         */
        it("renders the task's title and its subtask caption inside a single open-detail control", async () => {
            // Act
            await render(<Default />);

            // Assert
            const contents = getCards().map((card) => getContentButton(card).textContent);
            expect(contents).toEqual([
                "Fixture Task 10 of 3 subtasks",
                "Fixture Task 21 of 3 subtasks",
                "Fixture Task 32 of 3 subtasks",
            ]);
        });

        /* D-13, first half: a plain click on the card body opens the detail view. */
        it("invokes the open-detail callback when the card's content region is clicked", async () => {
            // Arrange
            await render(<Default />);

            // Act
            await userEvent.click(getContentButton(getCards()[0]));

            // Assert
            expect(Default.args.onOpenDetail).toHaveBeenCalledTimes(1);
            expect(Default.args.onOpenDetail).toHaveBeenCalledWith(Default.args.task);
        });

        /*
         * D-13, second half, and the opposing assertion the UI-SPEC requires alongside the one
         * above: the handle carries the drag listeners and no click handler of its own.
         */
        it("does not invoke the open-detail callback when the drag handle is clicked", async () => {
            // Arrange
            await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Reorder Fixture Task 1" }));

            // Assert
            expect(Default.args.onOpenDetail).not.toHaveBeenCalled();
        });

        /* The handle is a SIBLING of the content button, never nested inside it. */
        it("keeps the handle outside the content button so it can never receive a card click", async () => {
            // Act
            await render(<Default />);

            // Assert
            const handle = screen.getByRole("button", { name: "Reorder Fixture Task 1" });
            const content = getContentButton(getCards()[0]);
            expect(content.contains(handle)).toBe(false);
            expect(handle).toHaveAttribute("aria-roledescription", "draggable task");
        });

        /* UI-SPEC empty/task-card: no caption ELEMENT, not a caption reading "0 of 0 subtasks". */
        it("renders a zero-subtask card with its title alone and no caption element", async () => {
            // Act
            await render(<NoSubtasks />);

            // Assert
            expect(screen.queryByText("0 of 0 subtasks")).not.toBeInTheDocument();
            expect(getCaption(getCards()[0])).toBeNull();
            expect(getContentButton(getCards()[0]).textContent).toBe("Nothing broken down yet");
        });

        /* UI-SPEC zero-one-many: the plural WORD never varies, matching the mock's own p4 cards. */
        it("keeps the caption's plural word at exactly one subtask", async () => {
            // Act
            await render(<OneSubtask />);

            // Assert
            expect(getCaption(getCards()[0])).toBe("1 of 1 subtasks");
        });

        /*
         * UI-SPEC long-text/task-card: the title wraps rather than truncating, and an unbroken token
         * is broken rather than allowed to widen the fixed-width column.
         */
        it("wraps a long title instead of truncating it, and never lets one token widen the column", async () => {
            // Act
            await render(<LongTitle />);

            // Assert
            const title = getContentButton(getCards()[0]).querySelectorAll(":scope > span")[0];
            const styles = getComputedStyle(title);
            expect(styles.overflowWrap).toBe("break-word");
            expect(styles.textOverflow).not.toBe("ellipsis");
        });

        /* The accessible name interpolates the FULL title — an accessible name is never truncated. */
        it("names the handle with the task's full title", async () => {
            // Act
            await render(<LongTitle />);

            // Assert
            expect(
                screen.getByRole("button", { name: "Reorder Supercalifragilisticexpialidocious-pricing-research" }),
            ).toBeInTheDocument();
        });

        /* UI-SPEC loading/task-card: no spinner — the card is busy and its own handle is closed. */
        it("marks only the moved card busy and disables its handle while the move is unsettled", async () => {
            // Act
            await render(<Moving />);

            // Assert
            expect(getCards().map((card) => card.getAttribute("aria-busy"))).toEqual(["true", "false", "false"]);
            expect(screen.getByRole("button", { name: "Reorder Fixture Task 1" })).toBeDisabled();
            expect(screen.getByRole("button", { name: "Reorder Fixture Task 2" })).not.toBeDisabled();
        });

        /*
         * UI-SPEC zero-one-many: S-04 keeps the handle rendered on every card, so the lone-task case
         * disables it rather than withholding it the way a lone COLUMN's handle is withheld.
         */
        it("renders the lone task's handle but disables it, since there is nowhere to drag to", async () => {
            // Act
            await render(<LoneTask />);

            // Assert
            const handle = screen.getByRole("button", { name: "Reorder Fixture Task 1" });
            expect(handle).toBeInTheDocument();
            expect(handle).toBeDisabled();
        });
    },
});
