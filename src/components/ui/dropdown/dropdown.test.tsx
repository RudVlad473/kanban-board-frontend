import type { ComponentProps } from "react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

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

/*
 * ADR tech/0014: every primitive's whole behavioral suite runs at both viewports by default, a
 * blanket regression net rather than a hand-picked set of viewport-conditional assertions. Most
 * tests below run identically at both sizes; the edge-collision test further down genuinely
 * differs by viewport already (it reads the live `window.innerWidth`, so no `device` branching
 * is needed in its own body).
 */
describeForEachDevice({
    name: "Dropdown",
    body: () => {
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

            /*
             * Act — open, then move down twice and back up once. Whatever item Down first lands on
             * (self-verified below, not assumed), Up must return to it — proving both keys move the
             * active item rather than just one of them being a no-op. The raw DOM node is captured
             * up front since the trigger's accessible name changes to the selected item's label once
             * a selection commits, which would break a later name-scoped re-query for the same node.
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
            await expect
                .element(screen.getByRole("option", { name: "Doing" }))
                .toHaveAttribute("aria-selected", "true");
            await expect
                .element(screen.getByRole("option", { name: "Todo" }))
                .toHaveAttribute("aria-selected", "false");
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

        it("shows a trailing-edge overflow indicator on the trigger only once the selected label overflows it", async () => {
            /*
             * Arrange — same "…" cue as TextField's (previously a gradient fade — replaced per human
             * feedback that it wasn't obvious enough), over the trigger's rendered selected-value
             * label. `Select.Value` falls back to the raw `value` string as its own label until a
             * matching `Dropdown.Item` registers a different one, which is a convenient way to force a
             * genuinely long rendered label without depending on that registration timing.
             */
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
             * Arrange — the popup's own `rounded-md` corner is large enough (measured plan 01-04
             * token) that a square-cornered highlight on the item touching that corner visibly pokes
             * past the popup's own rounded silhouette. Only the item actually adjacent to a rounded
             * corner should round to match; a middle item has no rounded popup edge to clash with.
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

            /*
             * Assert — top-left/top-right rounded on first, bottom-left/bottom-right rounded on last,
             * and all four corners equal (square, un-rounded relative to the popup's curve) on middle.
             */
            expect(firstRadius).toBe("24px 24px 4px 4px");
            expect(lastRadius).toBe("4px 4px 24px 24px");
            const middleCorners = middleRadius.split(" ");
            expect(new Set(middleCorners).size).toBe(1);
        });

        it("keeps the popup within the viewport when the trigger sits near a narrow edge — does not let the popup overflow past either horizontal edge", async () => {
            /*
             * Arrange — ADR tech/0010 mobile review: collisionPadding=16 (dropdown.tsx) exists
             * specifically because a trigger near a viewport's edge is far more likely on a narrow
             * mobile viewport than a wide desktop one. Pin the trigger near the right edge (a left
             * margin computed from the live viewport width, so it's genuinely near the edge at both
             * device sizes, not just a fixed pixel offset that only reaches the edge at one of them)
             * to actually exercise Floating UI's collision handling.
             */
            const screen = await render(
                <div style={{ marginLeft: `${String(window.innerWidth - 220)}px`, width: "200px" }}>
                    <Dropdown.Root defaultOpen>
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
             * Arrange — `rounded-md`/`shadow-md`/`overflow-hidden` live on a plain outer wrapper div;
             * `role="listbox"` (Select.Popup) is the scrollable element itself. ARIA requires a
             * listbox's children to be `option`s directly, so — unlike Modal, whose Dialog.Popup has
             * no ARIA role of its own — the scroll wrapper can't sit *between* the listbox and its
             * options; it has to wrap the listbox from the outside instead. Putting the scroll
             * directly on the rounded/shadowed element (the original layout) let the scrollable
             * region's edge — and an in-flow scrollbar, which Firefox reserves layout width for even
             * though Chrome's overlay scrollbar mostly hides the same bug — render against/outside the
             * rounded corner once the list actually needed to scroll.
             */
            const screen = await render(
                <Dropdown.Root defaultOpen>
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

            /*
             * Assert — the outer wrapper carries the silhouette and clips to it; its own rendered
             * height never exceeds the listbox's own `max-h-72` (288px) + 2px border, i.e. it never
             * needs to scroll itself.
             */
            expect(wrapperStyle.overflow).toBe("hidden");
            expect(wrapperStyle.borderRadius).not.toBe("0px");
            expect(wrapperStyle.boxShadow).not.toBe("none");
            expect(silhouetteWrapper.getBoundingClientRect().height).toBeLessThanOrEqual(290);
            // The listbox itself is the one that actually scrolls the overflowing item list.
            expect(listboxStyle.overflowY).toBe("auto");
            expect(listbox.scrollHeight).toBeGreaterThan(listbox.clientHeight);
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

            /*
             * Act — open, then move down twice; navigation must skip the disabled "Doing" item and
             * land directly on "Done".
             */
            trigger.element().focus();
            await userEvent.keyboard("{Enter}");
            await userEvent.keyboard("{ArrowDown}");
            await userEvent.keyboard("{ArrowDown}");

            // Assert
            expect(document.activeElement?.textContent).toBe("Done");
            await expect
                .element(screen.getByRole("option", { name: "Doing" }))
                .toHaveAttribute("aria-disabled", "true");

            /*
             * Act — a pointer click on the disabled item must not select it. `force: true` bypasses
             * Playwright's own actionability guard (which itself refuses to click an
             * `aria-disabled="true"` element) so the assertion exercises the primitive's own
             * Base UI-driven guard, not Playwright's.
             */
            await screen.getByRole("option", { name: "Doing" }).click({ force: true });

            // Assert
            expect(onValueChange).not.toHaveBeenCalled();
        });
    },
});
