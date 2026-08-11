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
