/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { screen, within } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import {
    holdNextReorderColumn,
    queueReorderColumnFailure,
    reorderColumnActionCalls,
    resetReorderColumnStub,
    settleReorderColumn,
} from "@/test-utils/reorder-column-action-storybook-stub";

import * as stories from "./sortable-column.stories";

const { Default, Reordering, LoneColumn, OptimisticReorder } = composeStories(stories);

/** The two authored toast strings, as the user reads them — title and description run together. */
const GENERIC_REORDER_TOAST = "Couldn't reorder columns.Try again.";
const CONFLICT_REORDER_TOAST = "This board changed somewhere else.Refresh to see the latest.";

/*
 * Read off the DOM rather than by role: an open menu marks the tree outside it `aria-hidden`, so a
 * role query would report zero headings exactly when a rolled-back order needs reading.
 */
const getRenderedColumnNames = (): (string | null | undefined)[] =>
    Array.from(document.querySelectorAll("section h2")).map(
        (heading) => heading.firstElementChild?.children[1]?.textContent,
    );

const getRaisedToastTexts = (): (string | null)[] => {
    const region = screen.queryByRole("region", { name: "Notifications" });

    return region === null
        ? []
        : within(region)
              .queryAllByRole("dialog")
              .map((toast) => toast.textContent);
};

const moveFirstColumnToThirdPosition = async (): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: "Move the first column to the third position" }));
};

describeForEachDevice({
    name: "SortableColumn",
    body: () => {
        beforeEach(() => {
            resetReorderColumnStub();
        });

        /*
         * U-02: the whole header is the handle, and the role description is what tells a screen
         * reader it can be lifted at all. It comes from the library's spread, never a hand-written copy.
         */
        it("gives a column with somewhere to go a drag handle announced as a draggable column", async () => {
            // Act
            await render(<Default />);

            // Assert
            const handle = screen.getAllByRole("button", { name: /Fixture Column 1/ })[0];
            expect(handle).toHaveAttribute("aria-roledescription", "draggable column");
            expect(handle.tabIndex).toBe(0);
        });

        /*
         * UI-SPEC zero-one-many/exactly-1-column: an affordance that visibly does nothing is the
         * dead control this codebase already refuses, so the lone column gets no handle at all.
         */
        it("gives a board's only column no drag handle, no role description and no tab stop", async () => {
            // Act
            await render(<LoneColumn />);

            // Assert
            expect(document.querySelector("h2 button")).toBeNull();
            expect(document.querySelector('h2 [aria-roledescription="draggable column"]')).toBeNull();
            const controls = Array.from(document.querySelectorAll("button"));
            expect(controls.map((control) => control.getAttribute("aria-label"))).toEqual([
                "Column actions for Only Column",
            ]);
        });

        /* The kebab is a SIBLING of the heading, which is the first of the two defences in T-03-32. */
        it("keeps the kebab outside the drag handle so it can never receive the drag listeners", async () => {
            // Act
            await render(<Default />);

            // Assert
            const kebab = screen.getByRole("button", { name: "Column actions for Fixture Column 1" });
            const handle = screen.getAllByRole("button", { name: /Fixture Column 1 \(2\)/ })[0];
            expect(handle.contains(kebab)).toBe(false);
        });

        /* UI-SPEC loading/reorder-in-flight: no spinner — the moved column carries the busy state. */
        it("marks only the moved column busy while its reorder is unsettled", async () => {
            // Act
            await render(<Reordering />);

            // Assert
            const sections = Array.from(document.querySelectorAll("section[aria-labelledby]"));
            expect(sections.map((section) => section.getAttribute("aria-busy"))).toEqual([
                "true",
                "false",
                "false",
                "false",
            ]);
        });

        /*
         * T-03-31: a rename fired against the version the reorder just invalidated would 409 for a
         * reason the user could not have caused, so both entries are closed until it settles.
         */
        it("disables both of the moved column's menu entries while its reorder is unsettled", async () => {
            // Arrange
            await render(<Reordering />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Column actions for Fixture Column 1" }));

            // Assert
            const items = await screen.findAllByRole("menuitem");
            expect(items.map((item) => item.textContent)).toEqual(["Rename Column", "Delete Column"]);
            expect(items.map((item) => item.getAttribute("data-disabled"))).toEqual(["", ""]);
        });

        it("leaves a column that is not being reordered with both entries available", async () => {
            // Arrange
            await render(<Reordering />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Column actions for Fixture Column 2" }));

            // Assert
            const items = await screen.findAllByRole("menuitem");
            expect(items.map((item) => item.getAttribute("data-disabled"))).toEqual([null, null]);
        });

        /* U-05: the reordered array renders before the action settles, never after it. */
        it("renders the new order before the reorder settles, and sends exactly one request", async () => {
            // Arrange
            await render(<OptimisticReorder />);
            holdNextReorderColumn();

            // Act
            await moveFirstColumnToThirdPosition();

            // Assert
            await expect
                .poll(getRenderedColumnNames)
                .toEqual(["Fixture Column 2", "Fixture Column 3", "Fixture Column 1", "Fixture Column 4"]);
            expect(reorderColumnActionCalls).toHaveLength(1);
            settleReorderColumn();
        });

        /*
         * 03-BACKEND-FACTS § R1: `targetPosition` is where the column ENDS UP, so the third position
         * on a four-column board goes out as 2, carrying the moved column's own version.
         */
        it("sends the moved column's own version and its final 0-based index", async () => {
            // Arrange
            await render(<OptimisticReorder />);

            // Act
            await moveFirstColumnToThirdPosition();

            // Assert
            await expect.poll(() => reorderColumnActionCalls).toHaveLength(1);
            expect(reorderColumnActionCalls[0]).toEqual({
                boardId: "00000000-0000-4000-8000-000000000001",
                columnId: "00000000-0000-4000-8000-c00000000001",
                version: 0,
                targetPosition: 2,
            });
        });

        /*
         * U-05: the WHOLE board's order comes back, not just the dragged column — the move shifted
         * every column between the two indices, and dropping the override restores all of them.
         */
        it("restores the whole board's order and raises the rollback toast when a reorder fails", async () => {
            // Arrange
            await render(<OptimisticReorder />);
            queueReorderColumnFailure(RESULT_STATUS.ERROR);

            // Act
            await moveFirstColumnToThirdPosition();

            // Assert
            await expect.poll(getRaisedToastTexts).toEqual([GENERIC_REORDER_TOAST]);
            expect(getRenderedColumnNames()).toEqual([
                "Fixture Column 1",
                "Fixture Column 2",
                "Fixture Column 3",
                "Fixture Column 4",
            ]);
        });

        /*
         * 03-BACKEND-FACTS § R3 observed a stale reorder returns `OPTIMISTIC_LOCK_CONFLICT`: retrying
         * the same stale version fails identically, so the copy must send the user to a refresh.
         */
        it("raises the distinct version-conflict copy instead when the reorder is refused as stale", async () => {
            // Arrange
            await render(<OptimisticReorder />);
            queueReorderColumnFailure(RESULT_STATUS.CONFLICT);

            // Act
            await moveFirstColumnToThirdPosition();

            // Assert
            await expect.poll(getRaisedToastTexts).toEqual([CONFLICT_REORDER_TOAST]);
            expect(getRenderedColumnNames()).toEqual([
                "Fixture Column 1",
                "Fixture Column 2",
                "Fixture Column 3",
                "Fixture Column 4",
            ]);
        });

        it("reports the moved column as busy while its own request is still in flight", async () => {
            // Arrange
            await render(<OptimisticReorder />);
            holdNextReorderColumn();

            // Act
            await moveFirstColumnToThirdPosition();

            // Assert
            await expect
                .poll(() =>
                    Array.from(document.querySelectorAll("section[aria-labelledby]")).map((section) => [
                        section.getAttribute("aria-labelledby"),
                        section.getAttribute("aria-busy"),
                    ]),
                )
                .toEqual([
                    ["board-column-00000000-0000-4000-8000-c00000000002", "false"],
                    ["board-column-00000000-0000-4000-8000-c00000000003", "false"],
                    ["board-column-00000000-0000-4000-8000-c00000000001", "true"],
                    ["board-column-00000000-0000-4000-8000-c00000000004", "false"],
                ]);
            settleReorderColumn();
        });
    },
});
