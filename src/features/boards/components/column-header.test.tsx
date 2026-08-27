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

import * as stories from "./column-header.stories";

const { Default, SecondPosition, ThirdPosition, FourthPositionCyclesBack, NoTasks, LongColumnName, MenuOpen } =
    composeStories(stories);

/** The dot is `aria-hidden`, so it is reached through the DOM rather than by role. */
const getDotElement = (): HTMLElement => {
    const dot = document.querySelector<HTMLElement>('h2 [aria-hidden="true"]');
    if (!dot) {
        throw new Error("Column header dot not found — is the header rendered?");
    }
    return dot;
};

describeForEachDevice({
    name: "ColumnHeader",
    body: () => {
        it("carries the first column accent on the dot of a column at position 0", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(getDotElement()).toHaveClass("bg-accent-column-1");
        });

        it("carries the second column accent at position 1", async () => {
            // Act
            await render(<SecondPosition />);

            // Assert
            expect(getDotElement()).toHaveClass("bg-accent-column-2");
        });

        it("carries the third column accent at position 2", async () => {
            // Act
            await render(<ThirdPosition />);

            // Assert
            expect(getDotElement()).toHaveClass("bg-accent-column-3");
        });

        it("cycles back to the first column accent at position 3", async () => {
            // Act
            await render(<FourthPositionCyclesBack />);

            // Assert
            expect(getDotElement()).toHaveClass("bg-accent-column-1");
        });

        /*
         * The dot carries no meaning a caption-reading user would miss, so it must contribute
         * nothing to the accessible name — U-03 puts the column's identity in the text beside it.
         */
        it("reads as the composed caption alone, with the dot contributing no accessible text", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Todo (4)" })).toBeVisible();
            expect(getDotElement()).toHaveTextContent("");
        });

        /*
         * The kebab is now the header's one and only control — task creation is Phase 4, and a
         * dead "add a task" affordance is worse than none (UI-SPEC empty/column-with-0-tasks).
         */
        it("renders a zero count and no add-a-task control for a column holding no tasks", async () => {
            // Act
            const screen = await render(<NoTasks />);

            // Assert
            const heading = screen.getByRole("heading", { name: "Backlog (0)" }).element();
            expect(heading.textContent).toBe("Backlog (0)");
            const controls = Array.from(document.querySelectorAll("button"));
            expect(controls.map((control) => control.getAttribute("aria-label"))).toEqual([
                "Column actions for Backlog",
            ]);
        });

        /* UI-SPEC overflow/long-column-name: the count is what must stay readable at any width. */
        it("truncates a 32-character name while rendering the count in full beside it", async () => {
            // Arrange
            const screen = await render(<LongColumnName />);

            // Act
            const name = screen.getByText("Mmmmmmmm Mmmmmmmm Mmmmmmmm Mmmmm").element();
            const count = name.nextElementSibling;

            // Assert
            expect(getComputedStyle(name).textOverflow).toBe("ellipsis");
            expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
            expect(count).toHaveTextContent("(2)");
            expect(count?.scrollWidth).toBeLessThanOrEqual((count?.clientWidth ?? 0) + 1);
        });

        it("keeps the id the column section's aria-labelledby points at", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            expect(screen.getByRole("heading", { name: "Todo (4)" }).element()).toHaveAttribute(
                "id",
                "board-column-00000000-0000-4000-8000-00000000000c",
            );
        });

        /*
         * D-06's direct consequence: the kebab is a SIBLING of the heading, never inside it, so it
         * can never be confused with the drag handle plan 03-10 puts on the heading itself.
         */
        it("names the kebab after its own column and keeps it outside the heading", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            const kebab = screen.getByRole("button", { name: "Column actions for Todo" }).element();
            const heading = screen.getByRole("heading", { name: "Todo (4)" }).element();
            expect(kebab).toBeVisible();
            expect(heading.contains(kebab)).toBe(false);
        });

        /* UI-SPEC's 44px floor — an icon-only control the whole header row is sized around. */
        it("gives the kebab a 44px touch target", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            const kebab = screen.getByRole("button", { name: "Column actions for Todo" }).element();
            const { width, height } = kebab.getBoundingClientRect();
            expect(width).toBeGreaterThanOrEqual(44);
            expect(height).toBeGreaterThanOrEqual(44);
        });

        /* Only the entry that works today — `Delete Column` lands with plan 03-09 (dead-control rule). */
        it("offers Rename Column as the kebab's only entry when staged open", async () => {
            // Act
            const screen = await render(<MenuOpen />);

            // Assert
            await expect.element(screen.getByRole("menuitem", { name: "Rename Column" })).toBeVisible();
            expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(1);
        });

        it("reports this column back to its caller when Rename Column is chosen", async () => {
            // Arrange
            const screen = await render(<MenuOpen />);

            // Act
            await userEvent.click(screen.getByRole("menuitem", { name: "Rename Column" }));

            // Assert
            await expect.poll(() => MenuOpen.args.onRename).toHaveBeenCalledWith(MenuOpen.args.column);
            expect(MenuOpen.args.onRename).toHaveBeenCalledTimes(1);
        });

        /*
         * The regression UI-SPEC calls the most likely one here: a plain click must open the menu
         * rather than reaching the heading, which plan 03-10 turns into a drag handle.
         */
        it("opens the menu on a plain click without activating the heading", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Column actions for Todo" }));

            // Assert
            await expect.element(screen.getByRole("menuitem", { name: "Rename Column" })).toBeVisible();
            expect(Default.args.onRename).not.toHaveBeenCalled();
        });
    },
});
