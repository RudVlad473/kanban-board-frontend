// Import source: @storybook/react, not the Next.js-aware framework package — see vitest.setup.ts.
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { Dropdown } from "./dropdown";
import * as stories from "./dropdown.stories";

const { Closed, Disabled, Loading, OpenWithSelection } = composeStories(stories);

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

/*
 * Narrows `document.activeElement` (nullable) to `Element` without a non-null assertion — throws
 * with a clear message instead of a silent `null` reaching `getComputedStyle`.
 */
const getActiveElement = () => {
    const active = document.activeElement;
    if (!active) {
        throw new Error("Expected an active element, but document.activeElement is null.");
    }
    return active;
};

// ADR tech/0014: every primitive's whole suite runs at both viewports; deep tests below need it.
describeForEachDevice({
    name: "Dropdown",
    body: () => {
        it("renders a collapsed trigger whose accessible name is its content, with the list not present in the accessibility tree while closed", async () => {
            // Act
            await render(<Closed />);

            // Assert
            expect(screen.getByRole("combobox", { name: "Select a status" })).toBeVisible();
            expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        });

        // Two near-identical open-key cases, parametrized rather than hand-repeated.
        for (const [key, keyName] of [
            [" ", "Space"],
            ["{Enter}", "Enter"],
        ] as const) {
            // Deep: real focus + keyboard interaction, not expressible as a static story.
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

        // Deep: keyboard-driven active-item movement and selection, real focus behaviour.
        it("moves the active item with Arrow Down and Arrow Up, selects it with Enter, closes the list, and returns focus to the trigger", async () => {
            // Arrange
            const onValueChange = vi.fn();
            const screen = await renderDropdown({ onValueChange });
            const trigger = screen.getByRole("combobox", { name: "Select a status" });

            /*
             * Act — open, move Down twice, Up once; Up must undo the second Down (self-verified,
             * not assumed). The trigger's own name changes once a value commits, so its element is
             * captured up front rather than re-queried by name later.
             */
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
            const expectedValue =
                firstHighlighted === "Todo" ? "todo" : firstHighlighted === "Doing" ? "doing" : "done";
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenCalledWith(expectedValue, expect.anything());
            await expect.element(screen.getByRole("listbox")).not.toBeInTheDocument();
            await expect.poll(() => document.activeElement).toBe(triggerElement);
        });

        // Deep: Escape dismissal + focus restoration, real keyboard/focus behaviour.
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

        // Deep: pointer-click selection, real interaction.
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
            // Act — the OpenWithSelection story is already open with "doing" selected, no interaction needed.
            await render(<OpenWithSelection />);

            // Assert
            expect(screen.getByRole("option", { name: "Doing" })).toHaveAttribute("aria-selected", "true");
            expect(screen.getByRole("option", { name: "Todo" })).toHaveAttribute("aria-selected", "false");
        });

        it("shows a disabled, non-busy trigger with the list absent when the root isDisabled", async () => {
            // Act
            await render(<Disabled />);
            const trigger = screen.getByRole("combobox", { name: "Select a status" });

            // Assert — disabled without aria-busy, which is isLoading's alone.
            expect(trigger).toBeDisabled();
            expect(trigger).toHaveAttribute("data-disabled");
            expect(trigger).toHaveAttribute("aria-busy", "false");
            expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        });

        it("shows a disabled, aria-busy trigger with a spinner in place of the chevron when isLoading", async () => {
            // Act
            await render(<Loading />);
            const trigger = screen.getByRole("combobox", { name: "Select a status" });

            // Assert
            expect(trigger).toBeDisabled();
            expect(trigger).toHaveAttribute("aria-busy", "true");
            expect(trigger.querySelector("svg.animate-spin")).not.toBeNull();
        });

        // Deep: proves click/keyboard genuinely cannot open it, not just that the attribute is set.
        it("cannot be opened by click or by keyboard when isLoading", async () => {
            // Arrange
            const onValueChange = vi.fn();
            const screen = await renderDropdown({ isLoading: true, onValueChange });
            const trigger = screen.getByRole("combobox", { name: "Select a status" });

            // Act + Assert (click)
            await trigger.click({ force: true });
            expect(screen.getByRole("listbox").elements().length).toBe(0);

            // Act + Assert (keyboard)
            trigger.element().focus();
            await userEvent.keyboard("{Enter}");
            expect(screen.getByRole("listbox").elements().length).toBe(0);
            expect(onValueChange).not.toHaveBeenCalled();
        });

        // Deep: getComputedStyle against a Tailwind custom-property-driven token.
        it("renders the trigger with the danger border when hasError, matching TextField's token", async () => {
            // Arrange
            const screen = await renderDropdown({ hasError: true });
            const trigger = screen.getByRole("combobox", { name: "Select a status" });

            // Act
            const borderColor = getComputedStyle(trigger.element()).borderColor;

            // Assert — border-border-danger (#C93F3C), same as TextField and Checkbox.
            expect(borderColor).toBe("rgb(201, 63, 60)");
        });

        // Deep: depends on real scrollWidth/clientWidth layout measurement (useOverflowIndicator).
        it("shows a trailing-edge overflow indicator on the trigger only once the selected label overflows it", async () => {
            const getIndicator = (container: HTMLElement) => container.querySelector("[data-overflow-indicator]");
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
            await expect.poll(() => getIndicator(short.container)).toBeNull();

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
            await expect.poll(() => getIndicator(long.container)).not.toBeNull();
            expect(getIndicator(long.container)?.textContent).toBe("…");
        });

        it("rounds the first item's top corners and the last item's bottom corners when highlighted, keeping middle items square", async () => {
            /*
             * Deep: computed-style corner-radius check. The popup's rounded-md corner is large
             * enough that a square-cornered highlight on the touching item pokes past it (plan
             * 01-04); only first/last items round to match.
             */
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

            // Assert — rounded top on first, rounded bottom on last, square (equal corners) on middle.
            expect(firstRadius).toBe("8px 8px 4px 4px");
            expect(lastRadius).toBe("4px 4px 8px 8px");
            const middleCorners = middleRadius.split(" ");
            expect(new Set(middleCorners).size).toBe(1);
        });

        it("keeps the popup within the viewport when the trigger sits near a narrow edge — does not let the popup overflow past either horizontal edge", async () => {
            /*
             * Deep: real collision-detection layout. ADR tech/0010's collisionPadding={16} exists
             * for exactly this narrow-viewport case; the trigger is pinned near the right edge via
             * the live window.innerWidth so the assertion genuinely exercises it at both device sizes.
             */
            const screen = await render(
                <div style={{ marginLeft: `${String(window.innerWidth - 220)}px`, width: "200px" }}>
                    <Dropdown.Root defaultOpen={true}>
                        <Dropdown.Trigger placeholder="Select a board" />

                        <Dropdown.Content>
                            <Dropdown.Item value="a">A</Dropdown.Item>
                        </Dropdown.Content>
                    </Dropdown.Root>
                </div>,
            );
            const popup = screen.getByRole("listbox").element() as HTMLElement;

            // Act
            const popupRect = popup.getBoundingClientRect();

            // Assert
            expect(popupRect.right).toBeLessThanOrEqual(window.innerWidth);
            expect(popupRect.left).toBeGreaterThanOrEqual(0);
        });

        it("clips the rounded/shadowed silhouette to its own bounds and scrolls the listbox itself, not the silhouette wrapper, once the item list overflows", async () => {
            /*
             * Deep: computed-style + real scroll layout. ARIA requires listbox children to be
             * options directly, so the silhouette lives on an outer div and the listbox itself
             * owns the scroll — see dropdown.tsx's Content comment for the regression this guards.
             */
            const screen = await render(
                <Dropdown.Root defaultOpen={true}>
                    <Dropdown.Trigger placeholder="Select a board" />

                    <Dropdown.Content>
                        {Array.from({ length: 20 }, (_, index) => {
                            const position = String(index);
                            return (
                                <Dropdown.Item key={position} value={`board-${position}`}>
                                    {`Board ${position}`}
                                </Dropdown.Item>
                            );
                        })}
                    </Dropdown.Content>
                </Dropdown.Root>,
            );
            const listbox = screen.getByRole("listbox").element() as HTMLElement;
            const silhouetteWrapper = listbox.parentElement;
            if (!silhouetteWrapper) {
                throw new Error("Expected the listbox to have a parent element (the silhouette wrapper).");
            }

            // Act
            const wrapperStyle = getComputedStyle(silhouetteWrapper);
            const listboxStyle = getComputedStyle(listbox);

            // Assert — the outer wrapper clips the silhouette and never itself needs to scroll.
            expect(wrapperStyle.overflow).toBe("hidden");
            expect(wrapperStyle.borderRadius).not.toBe("0px");
            expect(wrapperStyle.boxShadow).not.toBe("none");
            expect(silhouetteWrapper.getBoundingClientRect().height).toBeLessThanOrEqual(290);
            // The listbox itself is the one that actually scrolls the overflowing item list.
            expect(listboxStyle.overflowY).toBe("auto");
            expect(listbox.scrollHeight).toBeGreaterThan(listbox.clientHeight);
        });

        // Deep: arrow-navigation skip + click-guard, real keyboard/pointer interaction.
        it("makes an isDisabled item unselectable and skipped by arrow navigation", async () => {
            // Arrange
            const onValueChange = vi.fn();
            const screen = await render(
                <Dropdown.Root onValueChange={onValueChange}>
                    <Dropdown.Trigger placeholder="Select a status" />

                    <Dropdown.Content>
                        <Dropdown.Item value="todo">Todo</Dropdown.Item>

                        <Dropdown.Item value="doing" isDisabled={true}>
                            Doing
                        </Dropdown.Item>

                        <Dropdown.Item value="done">Done</Dropdown.Item>
                    </Dropdown.Content>
                </Dropdown.Root>,
            );
            const trigger = screen.getByRole("combobox", { name: "Select a status" });

            // Act — open, then move down twice; navigation must skip "Doing" and land on "Done".
            trigger.element().focus();
            await userEvent.keyboard("{Enter}");
            await userEvent.keyboard("{ArrowDown}");
            await userEvent.keyboard("{ArrowDown}");

            // Assert
            expect(document.activeElement?.textContent).toBe("Done");
            await expect
                .element(screen.getByRole("option", { name: "Doing" }))
                .toHaveAttribute("aria-disabled", "true");

            // Act — force: true bypasses Playwright's own actionability guard on a disabled item.
            await screen.getByRole("option", { name: "Doing" }).click({ force: true });

            // Assert
            expect(onValueChange).not.toHaveBeenCalled();
        });
    },
});
