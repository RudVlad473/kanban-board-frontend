import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { Dropdown } from "./dropdown";

type RootProps = ComponentProps<typeof Dropdown.Root>;

const renderDropdown = (props: RootProps = {}) =>
    render(
        <Dropdown.Root {...props}>
            <Dropdown.Trigger placeholder="Select a status" />
            <Dropdown.Content>
                <Dropdown.Item value="todo">Todo</Dropdown.Item>
                <Dropdown.Item value="doing">Doing</Dropdown.Item>
                <Dropdown.Item value="done">Done</Dropdown.Item>
            </Dropdown.Content>
        </Dropdown.Root>,
    );

// Narrows `document.activeElement` (nullable) to `Element` without a non-null assertion — throws
// with a clear message instead of a silent `null` reaching `getComputedStyle`.
const getActiveElement = () => {
    const active = document.activeElement;
    if (!active) {
        throw new Error("Expected an active element, but document.activeElement is null.");
    }
    return active;
};

describe("Dropdown", () => {
    it("renders a collapsed trigger whose accessible name is its content, with the list not present in the accessibility tree while closed", async () => {
        // Arrange
        const screen = await renderDropdown();

        // Act
        const trigger = screen.getByRole("combobox", { name: "Select a status" });

        // Assert
        await expect.element(trigger).toBeVisible();
        await expect.element(screen.getByRole("listbox")).not.toBeInTheDocument();
    });

    // D-26y: two near-identical open-key cases, parametrized rather than hand-repeated.
    for (const [key, keyName] of [
        [" ", "Space"],
        ["{Enter}", "Enter"],
    ] as const) {
        it(`opens the list and moves focus into it on ${keyName}`, async () => {
            // Arrange
            const screen = await renderDropdown();
            const trigger = screen.getByRole("combobox", { name: "Select a status" });

            // Act
            trigger.element().focus();
            await userEvent.keyboard(key);

            // Assert
            await expect.element(screen.getByRole("listbox")).toBeVisible();
            expect(document.activeElement?.getAttribute("role")).toBe("option");
        });
    }

    it("moves the active item with Arrow Down and Arrow Up, selects it with Enter, closes the list, and returns focus to the trigger", async () => {
        // Arrange
        const onValueChange = vi.fn();
        const screen = await renderDropdown({ onValueChange });
        const trigger = screen.getByRole("combobox", { name: "Select a status" });

        // Act — open, then move down twice and back up once. Whatever item Down first lands on
        // (self-verified below, not assumed), Up must return to it — proving both keys move the
        // active item rather than just one of them being a no-op. The raw DOM node is captured
        // up front since the trigger's accessible name changes to the selected item's label once
        // a selection commits, which would break a later name-scoped re-query for the same node.
        const triggerElement = trigger.element();
        triggerElement.focus();
        await userEvent.keyboard("{Enter}");
        await userEvent.keyboard("{ArrowDown}");
        const firstHighlighted = document.activeElement?.textContent;
        await userEvent.keyboard("{ArrowDown}");
        const secondHighlighted = document.activeElement?.textContent;
        expect(secondHighlighted).not.toBe(firstHighlighted);
        await userEvent.keyboard("{ArrowUp}");

        // Assert — Up undid the second Down.
        expect(document.activeElement?.textContent).toBe(firstHighlighted);
        expect(document.activeElement?.getAttribute("role")).toBe("option");

        // Act — commit the selection.
        await userEvent.keyboard("{Enter}");

        // Assert
        const expectedValue = firstHighlighted === "Todo" ? "todo" : firstHighlighted === "Doing" ? "doing" : "done";
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenCalledWith(expectedValue, expect.anything());
        await expect.element(screen.getByRole("listbox")).not.toBeInTheDocument();
        await expect.poll(() => document.activeElement).toBe(triggerElement);
    });

    it("closes the list without selecting on Escape and returns focus to the trigger", async () => {
        // Arrange
        const onValueChange = vi.fn();
        const screen = await renderDropdown({ onValueChange });
        const trigger = screen.getByRole("combobox", { name: "Select a status" });

        // Act
        trigger.element().focus();
        await userEvent.keyboard("{Enter}");
        await expect.element(screen.getByRole("listbox")).toBeVisible();
        await userEvent.keyboard("{Escape}");

        // Assert
        expect(onValueChange).not.toHaveBeenCalled();
        await expect.element(screen.getByRole("listbox")).not.toBeInTheDocument();
        await expect.element(trigger).toHaveFocus();
    });

    it("fires onValueChange with the selected item's value exactly once per selection", async () => {
        // Arrange
        const onValueChange = vi.fn();
        const screen = await renderDropdown({ onValueChange });
        const trigger = screen.getByRole("combobox", { name: "Select a status" });

        // Act
        await trigger.click();
        await screen.getByRole("option", { name: "Done" }).click();

        // Assert
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenCalledWith("done", expect.anything());
    });

    it("marks the currently selected item as selected to assistive technology", async () => {
        // Arrange
        const screen = await renderDropdown({ defaultValue: "doing" });
        const trigger = screen.getByRole("combobox");

        // Act
        await trigger.click();

        // Assert
        await expect.element(screen.getByRole("option", { name: "Doing" })).toHaveAttribute("aria-selected", "true");
        await expect.element(screen.getByRole("option", { name: "Todo" })).toHaveAttribute("aria-selected", "false");
    });

    it("renders the trigger with the danger border when hasError, matching TextField's token", async () => {
        // Arrange
        const screen = await renderDropdown({ hasError: true });
        const trigger = screen.getByRole("combobox", { name: "Select a status" });

        // Act
        const borderColor = getComputedStyle(trigger.element()).borderColor;

        // Assert — border-border-danger (#C93F3C), same as TextField and Checkbox.
        expect(borderColor).toBe("rgb(201, 63, 60)");
    });

    it("shows a trailing-edge fade on the trigger only once the selected label overflows it", async () => {
        // Arrange — same Safari-address-bar affordance as TextField's, over the trigger's
        // rendered selected-value label. `Select.Value` falls back to the raw `value` string as
        // its own label until a matching `Dropdown.Item` registers a different one, which is a
        // convenient way to force a genuinely long rendered label without depending on that
        // registration timing.
        const getFade = (container: HTMLElement) => container.querySelector('[aria-hidden="true"].bg-linear-to-r');
        const longValue = "A very long board name that will definitely overflow the trigger width";

        const short = await render(
            <div style={{ width: "200px" }}>
                <Dropdown.Root defaultValue="todo">
                    <Dropdown.Trigger placeholder="Select a status" />
                    <Dropdown.Content>
                        <Dropdown.Item value="todo">Todo</Dropdown.Item>
                    </Dropdown.Content>
                </Dropdown.Root>
            </div>,
        );
        await expect.poll(() => getFade(short.container)).toBeNull();

        const long = await render(
            <div style={{ width: "150px" }}>
                <Dropdown.Root defaultValue={longValue}>
                    <Dropdown.Trigger placeholder="Select a board" />
                    <Dropdown.Content>
                        <Dropdown.Item value={longValue}>{longValue}</Dropdown.Item>
                    </Dropdown.Content>
                </Dropdown.Root>
            </div>,
        );

        // Assert
        await expect.poll(() => getFade(long.container)).not.toBeNull();
    });

    it("rounds the first item's top corners and the last item's bottom corners when highlighted, keeping middle items square", async () => {
        // Arrange — the popup's own `rounded-md` corner is large enough (measured plan 01-04
        // token) that a square-cornered highlight on the item touching that corner visibly pokes
        // past the popup's own rounded silhouette. Only the item actually adjacent to a rounded
        // corner should round to match; a middle item has no rounded popup edge to clash with.
        const screen = await render(
            <Dropdown.Root>
                <Dropdown.Trigger placeholder="Select a status" />
                <Dropdown.Content>
                    <Dropdown.Item value="a">A</Dropdown.Item>
                    <Dropdown.Item value="b">B</Dropdown.Item>
                    <Dropdown.Item value="c">C</Dropdown.Item>
                </Dropdown.Content>
            </Dropdown.Root>,
        );
        const trigger = screen.getByRole("combobox", { name: "Select a status" });
        trigger.element().focus();
        await userEvent.keyboard("{Enter}");

        // Act — walk the highlight through first (A), middle (B), last (C).
        const firstRadius = getComputedStyle(getActiveElement()).borderRadius;
        await userEvent.keyboard("{ArrowDown}");
        const middleRadius = getComputedStyle(getActiveElement()).borderRadius;
        await userEvent.keyboard("{ArrowDown}");
        const lastRadius = getComputedStyle(getActiveElement()).borderRadius;

        // Assert — top-left/top-right rounded on first, bottom-left/bottom-right rounded on last,
        // and all four corners equal (square, un-rounded relative to the popup's curve) on middle.
        expect(firstRadius).toBe("24px 24px 4px 4px");
        expect(lastRadius).toBe("4px 4px 24px 24px");
        const middleCorners = middleRadius.split(" ");
        expect(new Set(middleCorners).size).toBe(1);
    });

    it("makes an isDisabled item unselectable and skipped by arrow navigation", async () => {
        // Arrange
        const onValueChange = vi.fn();
        const screen = await render(
            <Dropdown.Root onValueChange={onValueChange}>
                <Dropdown.Trigger placeholder="Select a status" />
                <Dropdown.Content>
                    <Dropdown.Item value="todo">Todo</Dropdown.Item>
                    <Dropdown.Item value="doing" isDisabled>
                        Doing
                    </Dropdown.Item>
                    <Dropdown.Item value="done">Done</Dropdown.Item>
                </Dropdown.Content>
            </Dropdown.Root>,
        );
        const trigger = screen.getByRole("combobox", { name: "Select a status" });

        // Act — open, then move down twice; navigation must skip the disabled "Doing" item and
        // land directly on "Done".
        trigger.element().focus();
        await userEvent.keyboard("{Enter}");
        await userEvent.keyboard("{ArrowDown}");
        await userEvent.keyboard("{ArrowDown}");

        // Assert
        expect(document.activeElement?.textContent).toBe("Done");
        await expect.element(screen.getByRole("option", { name: "Doing" })).toHaveAttribute("aria-disabled", "true");

        // Act — a pointer click on the disabled item must not select it. `force: true` bypasses
        // Playwright's own actionability guard (which itself refuses to click an
        // `aria-disabled="true"` element) so the assertion exercises the primitive's own
        // Base UI-driven guard, not Playwright's.
        await screen.getByRole("option", { name: "Doing" }).click({ force: true });

        // Assert
        expect(onValueChange).not.toHaveBeenCalled();
    });
});
