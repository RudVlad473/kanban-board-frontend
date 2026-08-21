// @storybook/react (not @storybook/nextjs-vite) — see dropdown.test.tsx / vitest.setup.ts for why.
import { composeStories } from "@storybook/react";
import { cleanup, screen } from "@testing-library/react";
import { EllipsisVertical } from "lucide-react";
import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { Menu } from "./menu";
import * as stories from "./menu.stories";
import { IconButton } from "../icon-button/icon-button";

const { Open, WithDisabledItem } = composeStories(stories);

// Composed stories mount via RTL's own render, which RTL never auto-unmounts between calls here.
afterEach(cleanup);

/*
 * A single options object (ADR tech/0016) whose two callbacks default to fresh spies — every
 * scenario below either uses the defaults or supplies its own spy to assert against.
 */
const renderMenu = async ({
    onRename = vi.fn(),
    onDelete = vi.fn(),
}: { onRename?: () => void; onDelete?: () => void } = {}) => {
    const screen = await render(
        <Menu.Root>
            <Menu.Trigger render={<IconButton label="Board actions" icon={<EllipsisVertical />} />} />

            <Menu.Content>
                <Menu.Item onClick={onRename}>Edit Board</Menu.Item>

                <Menu.Item isDestructive onClick={onDelete}>
                    Delete Board
                </Menu.Item>
            </Menu.Content>
        </Menu.Root>,
    );
    return { screen, onRename, onDelete };
};

// ADR tech/0014: every primitive's whole behavioral suite runs at both viewports by default.
describeForEachDevice({
    name: "Menu",
    body: () => {
        // Deep: real click interaction proving the trigger's accessible name never flips.
        it("renders a trigger reachable by its accessible name, whose visible glyph does not change after an item is activated", async () => {
            /*
             * Arrange — 02-RESEARCH.md Pitfall 3: unlike Dropdown, no rendered "selected value"
             * exists to flip to the last-clicked item's label, so IconButton's own fixed `label`
             * must stay identical before and after activation.
             */
            const { screen } = await renderMenu();
            const trigger = screen.getByRole("button", { name: "Board actions" });
            const nameBefore = trigger.element().getAttribute("aria-label");

            // Act
            await trigger.click();
            await screen.getByRole("menuitem", { name: "Edit Board" }).click();

            // Assert
            const triggerAfter = screen.getByRole("button", { name: "Board actions" });
            expect(triggerAfter.element().getAttribute("aria-label")).toBe(nameBefore);
        });

        it("exposes a menu role containing menuitem-role items, not listbox/option", async () => {
            // Act — Open is already rendered open, no interaction needed for this rendered-state check.
            await Open.run();

            // Assert
            expect(screen.getByRole("menu")).toBeVisible();
            expect(screen.getByRole("menuitem", { name: "Edit Board" })).toBeVisible();
            expect(screen.getByRole("menuitem", { name: "Delete Board" })).toBeVisible();
            expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
            expect(screen.queryByRole("option")).not.toBeInTheDocument();
        });

        // Deep: real click interaction, before/after an activation.
        it("renders no selected-state indicator on any item, before or after activation", async () => {
            /*
             * Arrange — the other half of Pitfall 3: no checkmark-like indicator equivalent exists
             * here, so this asserts the DOM never carries one, not merely that it's absent initially.
             */
            const { screen, onRename } = await renderMenu();
            const trigger = screen.getByRole("button", { name: "Board actions" });
            await trigger.click();
            const itemBefore = screen.getByRole("menuitem", { name: "Edit Board" }).element();
            expect(itemBefore.hasAttribute("aria-selected")).toBe(false);
            expect(itemBefore.querySelector('[data-selected], svg[class*="check" i]')).toBeNull();

            // Act
            await screen.getByRole("menuitem", { name: "Edit Board" }).click();
            await trigger.click();

            // Assert — reopened, the same item still carries no selected indicator.
            expect(onRename).toHaveBeenCalledTimes(1);
            const itemAfter = screen.getByRole("menuitem", { name: "Edit Board" }).element();
            expect(itemAfter.hasAttribute("aria-selected")).toBe(false);
            expect(itemAfter.querySelector('[data-selected], svg[class*="check" i]')).toBeNull();
        });

        // Deep: real click interaction + callback spy.
        it("calls the activated item's onClick exactly once and closes the menu", async () => {
            // Arrange
            const { screen, onDelete } = await renderMenu();
            const trigger = screen.getByRole("button", { name: "Board actions" });
            await trigger.click();

            // Act
            await screen.getByRole("menuitem", { name: "Delete Board" }).click();

            // Assert
            expect(onDelete).toHaveBeenCalledTimes(1);
            await expect.element(screen.getByRole("menu")).not.toBeInTheDocument();
        });

        // Deep: Escape dismissal + focus restoration, real keyboard/focus behaviour.
        it("closes on Escape without activating anything and returns focus to the trigger", async () => {
            // Arrange
            const { screen, onRename, onDelete } = await renderMenu();
            const trigger = screen.getByRole("button", { name: "Board actions" });
            const triggerElement = trigger.element();

            // Act
            triggerElement.focus();
            await userEvent.keyboard("{Enter}");
            await expect.element(screen.getByRole("menu")).toBeVisible();
            await userEvent.keyboard("{Escape}");

            // Assert
            expect(onRename).not.toHaveBeenCalled();
            expect(onDelete).not.toHaveBeenCalled();
            await expect.element(screen.getByRole("menu")).not.toBeInTheDocument();
            await expect.poll(() => document.activeElement).toBe(triggerElement);
        });

        // Deep: keyboard-driven highlight movement and activation, real focus behaviour.
        it("moves the highlight with Arrow Down/Up and activates the highlighted item on Enter", async () => {
            // Arrange
            const { screen, onDelete } = await renderMenu();
            const trigger = screen.getByRole("button", { name: "Board actions" });

            // Act
            trigger.element().focus();
            await userEvent.keyboard("{Enter}");
            await userEvent.keyboard("{ArrowDown}");
            const firstHighlighted = document.activeElement?.textContent;
            await userEvent.keyboard("{ArrowDown}");
            const secondHighlighted = document.activeElement?.textContent;
            expect(secondHighlighted).not.toBe(firstHighlighted);
            await userEvent.keyboard("{ArrowUp}");

            // Assert — Up undid the second Down.
            expect(document.activeElement?.textContent).toBe(firstHighlighted);

            // Act — activate whichever item Down first landed on.
            await userEvent.keyboard("{Enter}");

            // Assert
            if (firstHighlighted === "Edit Board") {
                expect(onDelete).not.toHaveBeenCalled();
            } else {
                expect(onDelete).toHaveBeenCalledTimes(1);
            }
        });

        it("announces an isDisabled item as disabled to assistive technology", async () => {
            // Act — WithDisabledItem is already open, no interaction needed for this rendered check.
            await WithDisabledItem.run();

            // Assert
            expect(screen.getByRole("menuitem", { name: "Edit Board" })).toHaveAttribute("aria-disabled", "true");
        });

        // Deep: real click interaction proving the disabled guard, not merely the attribute.
        it("does not call onClick when an isDisabled item is activated by click", async () => {
            // Arrange
            const onArchive = vi.fn();
            const screen = await render(
                <Menu.Root>
                    <Menu.Trigger render={<IconButton label="Board actions" icon={<EllipsisVertical />} />} />

                    <Menu.Content>
                        <Menu.Item isDisabled onClick={onArchive}>
                            Archive Board
                        </Menu.Item>
                    </Menu.Content>
                </Menu.Root>,
            );
            await screen.getByRole("button", { name: "Board actions" }).click();

            /*
             * Act — `force: true` bypasses Playwright's own actionability guard (which itself
             * refuses to click an `aria-disabled="true"` element), so this exercises the
             * primitive's own Base UI-driven guard, not Playwright's.
             */
            await screen.getByRole("menuitem", { name: "Archive Board" }).click({ force: true });

            // Assert
            expect(onArchive).not.toHaveBeenCalled();
        });

        // Deep: getComputedStyle against a Tailwind custom-property-driven token.
        it("renders an isDestructive item in the danger text token", async () => {
            // Arrange
            const { screen } = await renderMenu();
            await screen.getByRole("button", { name: "Board actions" }).click();

            // Act
            const destructiveColor = getComputedStyle(
                screen.getByRole("menuitem", { name: "Delete Board" }).element(),
            ).color;
            const defaultColor = getComputedStyle(screen.getByRole("menuitem", { name: "Edit Board" }).element()).color;

            // Assert — border-border-danger / text-text-danger token (#C93F3C).
            expect(destructiveColor).toBe("rgb(201, 63, 60)");
            expect(defaultColor).not.toBe("rgb(201, 63, 60)");
        });
    },
});
