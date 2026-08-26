/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./column-header.stories";

const { Default, SecondPosition, ThirdPosition, FourthPositionCyclesBack, NoTasks, LongColumnName } =
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

        it("renders a zero count and no add-a-task control for a column holding no tasks", async () => {
            // Act
            const screen = await render(<NoTasks />);

            // Assert
            const heading = screen.getByRole("heading", { name: "Backlog (0)" }).element();
            expect(heading.textContent).toBe("Backlog (0)");
            expect(document.querySelectorAll("button")).toHaveLength(0);
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
    },
});
