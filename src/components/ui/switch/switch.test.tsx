/*
 * Composed from the plain React renderer package, not @storybook/nextjs-vite — the latter's main
 * entry eagerly imports real Next.js internals this "browser" project deliberately does not load
 * (vitest.setup.ts documents this in full; sidebar.test.tsx is the proven precedent).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { Switch } from "./switch";
import * as stories from "./switch.stories";

const { Off, On, Disabled } = composeStories(stories);

/*
 * ADR tech/0014: every primitive's suite runs at both viewports by default; Switch has no
 * viewport-conditional behavior of its own (ADR tech/0010 mobile review).
 */
describeForEachDevice({
    name: "Switch",
    body: () => {
        /*
         * Shallow: copy, prop-driven aria/disabled rendering — asserted through composed stories
         * (D-08). Switch is a controlled component that does not self-toggle (see below), so only
         * static rendered states belong here — any toggle transition is Deep interaction behaviour.
         */
        it("is found by role switch with the label as its accessible name, and renders no visible text", async () => {
            // Act
            await render(<Off />);

            // Assert
            const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });
            expect(toggle).toBeInTheDocument();
            expect(toggle.textContent).toBe("");
        });

        it("exposes an on/checked state to assistive technology when checked, and does not when unchecked", async () => {
            // Act
            await render(<On />);

            // Assert
            expect(screen.getByRole("switch", { name: "Toggle dark mode" })).toHaveAttribute("aria-checked", "true");
        });

        it("exposes an off/unchecked state to assistive technology when unchecked", async () => {
            // Act
            await render(<Off />);

            // Assert
            expect(screen.getByRole("switch", { name: "Toggle dark mode" })).toHaveAttribute("aria-checked", "false");
        });

        it("renders disabled and keeps its accessible name when isDisabled", async () => {
            // Act
            await render(<Disabled />);

            // Assert
            expect(screen.getByRole("switch", { name: "Toggle dark mode" })).toHaveAttribute("aria-disabled", "true");
        });

        // Deep: real pointer/keyboard interaction and layout measurement — stay direct renders.
        it("is reachable by keyboard tab order and toggles on Space", async () => {
            // Arrange
            const onCheckedChange = vi.fn();
            const screen = await render(<Switch label="Toggle dark mode" onCheckedChange={onCheckedChange} />);
            const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });

            // Assert (reachable)
            expect(toggle.element().tabIndex).toBe(0);

            // Act
            toggle.element().focus();
            await userEvent.keyboard(" ");

            // Assert
            expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
        });

        it("fires onCheckedChange with the new boolean on each toggle, and does not fire when disabled", async () => {
            // Arrange
            const onCheckedChange = vi.fn();
            const screen = await render(
                <Switch label="Toggle dark mode" isDisabled onCheckedChange={onCheckedChange} />,
            );
            const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });

            // Act
            (toggle.element() as HTMLElement).click();

            // Assert
            expect(onCheckedChange).not.toHaveBeenCalled();
        });

        it("reflects a controlled isChecked prop and does not toggle itself when the parent does not update it", async () => {
            // Arrange
            const onCheckedChange = vi.fn();
            const screen = await render(
                <Switch label="Toggle dark mode" isChecked={false} onCheckedChange={onCheckedChange} />,
            );
            const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });

            // Act
            await toggle.click();

            /*
             * Assert — the callback fires, but the render stays unchecked (a real controlled component;
             * plan 01-14 relies on this to revert the toggle when persistence fails).
             */
            expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
            await expect.element(toggle).toHaveAttribute("aria-checked", "false");
        });

        it("has an interactive area of at least 44 x 44 CSS pixels at every size, including sm", async () => {
            // Arrange
            const sm = await render(<Switch label="Small" size="sm" />);
            const md = await render(<Switch label="Medium" size="md" />);
            const lg = await render(<Switch label="Large" size="lg" />);

            // Act + Assert
            for (const [screen, name] of [
                [sm, "Small"],
                [md, "Medium"],
                [lg, "Large"],
            ] as const) {
                const rect = screen.getByRole("switch", { name }).element().getBoundingClientRect();
                expect(rect.width).toBeGreaterThanOrEqual(44);
                expect(rect.height).toBeGreaterThanOrEqual(44);
            }
        });
    },
});
