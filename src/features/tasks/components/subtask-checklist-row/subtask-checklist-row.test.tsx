/*
 * Composed from the plain React renderer package, not @storybook/nextjs-vite — the latter's main
 * entry eagerly imports real Next.js internals this "browser" project deliberately does not load
 * (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { isNil } from "es-toolkit";
import { afterEach, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createSubtask } from "@/test-utils/factories/board-full";

import * as stories from "./subtask-checklist-row.stories";

const { Default, Completed, Pending, LongTitle } = composeStories(stories);

/** The deterministic default id `createSubtask()` (and so every story's default fixture) carries. */
const FIXTURE_SUBTASK_ID = createSubtask().id;

/* Narrows a render's own container to its label — mirrors `checkbox.test.tsx`'s own helper. */
const readLabel = (container: HTMLElement): HTMLElement => {
    const label = container.querySelector("label");
    if (isNil(label)) {
        throw new Error("expected the row to render a label");
    }
    return label;
};

/* A Range's client rects come one per rendered line, so the first is the first line box wherever it wrapped. */
const firstLineCentre = (label: HTMLElement): number => {
    const range = document.createRange();
    range.selectNodeContents(label);
    const firstLine = range.getClientRects().item(0);
    if (isNil(firstLine)) {
        throw new Error("expected the label's text to lay out at least one line box");
    }
    return firstLine.top + firstLine.height / 2;
};

afterEach(() => {
    document.documentElement.classList.remove("dark");
});

/*
 * ADR tech/0014: every component's suite runs at both viewports; this row has no
 * viewport-conditional behaviour of its own.
 */
describeForEachDevice({
    name: "SubtaskChecklistRow",
    body: () => {
        it("is found by role checkbox with the subtask's title as its accessible name", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(screen.getByRole("checkbox", { name: "Fixture Subtask" })).toBeInTheDocument();
        });

        /* Clicking anywhere on the row toggles through the label association, never a wrapper handler. */
        it("invokes the toggle handler with the subtask's id when the row's label area is clicked", async () => {
            // Arrange
            await render(<Default />);
            const label = screen.getByText("Fixture Subtask");

            // Act — a plain DOM node from `@testing-library/react`'s `screen`, not a locator: no await.
            label.click();

            // Assert
            expect(Default.args.onToggle).toHaveBeenCalledWith(FIXTURE_SUBTASK_ID);
        });

        it("strikes a completed row's label through and drops it to 55% of the primary colour, in both themes", async () => {
            // Arrange — two independent renders, never an unmount mid-test (mirrors checkbox.test.tsx).
            const light = await render(<Completed />);
            document.documentElement.classList.add("dark");
            const dark = await render(<Completed />);

            // Act
            const lightStyle = getComputedStyle(readLabel(light.container));
            const darkStyle = getComputedStyle(readLabel(dark.container));

            // Assert — 55% primary (the lowest whole percent clearing WCAG AA), never the muted token.
            expect(lightStyle.textDecorationLine).toContain("line-through");
            expect(lightStyle.color).toContain("0.55");
            expect(darkStyle.textDecorationLine).toContain("line-through");
            expect(darkStyle.color).toContain("0.55");
        });

        it("leaves an incomplete row's label at full primary colour with no strikethrough", async () => {
            // Act
            await render(<Default />);
            const style = getComputedStyle(screen.getByText("Fixture Subtask"));

            // Assert
            expect(style.textDecorationLine).toBe("none");
        });

        it("marks a pending row's checkbox busy", async () => {
            // Act
            await render(<Pending />);

            // Assert
            expect(screen.getByRole("checkbox", { name: "Fixture Subtask" })).toHaveAttribute("aria-busy", "true");
        });

        /*
         * Reported as "the subtasks text doesn't look centred": the label sat at the top of a 40px
         * row, 4.5px above its centre. Asserted as measured centres, never as a class name.
         */
        it("centres a single-line title against the row it sits in", async () => {
            // Act
            const screenInstance = await render(<Default />);
            const label = readLabel(screenInstance.container);
            const row = label.parentElement;
            if (isNil(row)) {
                throw new Error("expected the row's own Field.Root ancestor");
            }

            // Assert
            const labelRect = label.getBoundingClientRect();
            const rowRect = row.getBoundingClientRect();
            const labelCentre = labelRect.top + labelRect.height / 2;
            const rowCentre = rowRect.top + rowRect.height / 2;
            expect(Math.abs(labelCentre - rowCentre)).toBeLessThanOrEqual(1);
        });

        /*
         * The checkbox stays TOP-aligned to a two-line title's first line rather than centring
         * against the whole block — asserted by distance-from-edge, not an exact pixel value.
         */
        it("keeps a wrapped two-line title's checkbox aligned to the first line, not centred against the row", async () => {
            // Act
            await render(<LongTitle />);
            const checkbox = screen.getByRole("checkbox");
            const row = checkbox.closest("div");
            if (isNil(row)) {
                throw new Error("expected the row's own Field.Root ancestor");
            }

            // Assert
            const checkboxRect = checkbox.getBoundingClientRect();
            const rowRect = row.getBoundingClientRect();
            const distanceFromTop = checkboxRect.top - rowRect.top;
            const distanceFromBottom = rowRect.bottom - checkboxRect.bottom;
            expect(distanceFromTop).toBeLessThan(distanceFromBottom);
        });

        /*
         * "Aligned to the first line" is only measurable against the first LINE BOX: the row's own
         * edges cannot tell a checkbox on the first line from one 4.5px below it.
         */
        it.each([
            { name: "single-line", Story: Default },
            { name: "wrapped", Story: LongTitle },
        ])("centres the checkbox on a $name title's first line", async ({ Story }) => {
            // Act
            const screenInstance = await render(<Story />);
            const label = readLabel(screenInstance.container);
            const checkboxRect = screen.getByRole("checkbox").getBoundingClientRect();

            // Assert
            const offset = checkboxRect.top + checkboxRect.height / 2 - firstLineCentre(label);
            expect(Math.abs(offset)).toBeLessThanOrEqual(1);
        });
    },
});
