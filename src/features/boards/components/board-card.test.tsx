/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { buildBoardDetailPath } from "@/lib/core/routing/routes";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createNextLinkShim } from "@/test-utils/next-router-shims";

import * as stories from "./board-card.stories";

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode (D-19)
vi.mock("next/link", () => createNextLinkShim());

const { Default, Selected, MenuOpen, LongName } = composeStories(stories);

const SEEDED_BOARD_ID = "8okxhwo6oq2o";
const TRIGGER_NAME = "Board actions for Platform Launch";

describeForEachDevice({
    name: "BoardCard",
    body: () => {
        it("renders the board name as a truncated link to that board's detail path", async () => {
            // Act
            await render(<Default />);

            // Assert
            const link = screen.getByRole("link", { name: "Platform Launch" });
            expect(link).toHaveAttribute("href", buildBoardDetailPath(SEEDED_BOARD_ID));
            expect(screen.getByText("Platform Launch")).toHaveClass("truncate");
        });

        it("keeps an overlong name inside the row rather than widening it", async () => {
            // Act
            await render(<LongName />);

            // Assert
            const label = screen.getByRole("link").querySelector("span");
            expect(label).toHaveClass("truncate");
            expect(screen.getByRole("button", { name: /^Board actions for Platform Launch/ })).toBeInTheDocument();
        });

        it("carries a board-scoped accessible name on the overflow trigger", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(screen.getByRole("button", { name: TRIGGER_NAME })).toBeInTheDocument();
        });

        it("takes the selected treatment only when the row is the selected one", async () => {
            // Act
            await render(<Selected />);

            // Assert
            expect(screen.getByRole("link", { name: "Platform Launch" })).toHaveClass("bg-bg-primary");
        });

        it("takes the unselected treatment otherwise", async () => {
            // Act
            await render(<Default />);

            // Assert
            const link = screen.getByRole("link", { name: "Platform Launch" });
            expect(link).not.toHaveClass("bg-bg-primary");
            expect(link).toHaveClass("text-text-muted");
        });

        it("exposes exactly the two authored menu items when the overflow menu is opened", async () => {
            // Arrange
            await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: TRIGGER_NAME }));

            // Assert
            const items = await screen.findAllByRole("menuitem");
            expect(items.map((item) => item.textContent)).toEqual(["Edit Board", "Delete Board"]);
        });

        it("renders the staged open menu without a play function", async () => {
            // Act
            await render(<MenuOpen />);

            // Assert
            expect(await screen.findAllByRole("menuitem")).toHaveLength(2);
        });

        it("renders the delete entry in the destructive text token", async () => {
            // Act
            await render(<MenuOpen />);

            // Assert
            expect(await screen.findByRole("menuitem", { name: "Delete Board" })).toHaveClass("text-text-danger");
        });

        it("calls the edit handler once with this row's board", async () => {
            // Arrange
            await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: TRIGGER_NAME }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Board" }));

            // Assert
            expect(Default.args.onEdit).toHaveBeenCalledTimes(1);
            expect(Default.args.onEdit).toHaveBeenCalledWith(Default.args.board);
        });

        it("calls the delete handler once with this row's board", async () => {
            // Arrange
            await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: TRIGGER_NAME }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Delete Board" }));

            // Assert
            expect(Default.args.onDelete).toHaveBeenCalledTimes(1);
            expect(Default.args.onDelete).toHaveBeenCalledWith(Default.args.board);
        });

        /*
         * 02-RESEARCH.md Pitfall 3: a value-picker dropdown would leave the activated entry marked
         * and rewrite the trigger's label — this is an action menu, so neither may ever happen.
         */
        it("leaves no item marked as selected and no trigger-glyph drift after an activation", async () => {
            // Arrange
            await render(<Default />);
            const trigger = screen.getByRole("button", { name: TRIGGER_NAME });
            const glyphBefore = trigger.innerHTML;

            // Act — activate an item, then reopen the menu.
            await userEvent.click(trigger);
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Board" }));
            await userEvent.click(screen.getByRole("button", { name: TRIGGER_NAME }));

            // Assert — the reopened menu has plain action items and the trigger is untouched.
            const items = await screen.findAllByRole("menuitem");
            for (const item of items) {
                expect(item).not.toHaveAttribute("aria-checked");
                expect(item).not.toHaveAttribute("aria-selected");
                expect(item).not.toHaveAttribute("data-selected");
            }
            expect(screen.queryAllByRole("menuitemradio")).toHaveLength(0);
            expect(screen.queryAllByRole("menuitemcheckbox")).toHaveLength(0);
            expect(screen.getByRole("button", { name: TRIGGER_NAME }).innerHTML).toBe(glyphBefore);
        });
    },
});
