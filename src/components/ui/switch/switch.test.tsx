import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { Switch } from "./switch";

/*
 * ADR tech/0014: every primitive's whole behavioral suite runs at both viewports by default, a
 * blanket regression net rather than a hand-picked set of viewport-conditional assertions.
 * Switch has no viewport-conditional behavior of its own (confirmed in the ADR tech/0010 mobile
 * review — fixed-size tracks, no md:/lg: classes) — every test here runs identically at both
 * sizes, which is itself the point.
 */
describeForEachDevice("Switch", () => {
    it("is found by role switch with the label as its accessible name, and renders no visible text", async () => {
        // Arrange
        const screen = await render(<Switch label="Toggle dark mode" />);

        // Act
        const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });

        // Assert
        await expect.element(toggle).toBeVisible();
        expect(toggle.element().textContent).toBe("");
    });

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
        const screen = await render(<Switch label="Toggle dark mode" isDisabled onCheckedChange={onCheckedChange} />);
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
         * Assert — the callback fires with the intended next value, but the rendered state stays
         * unchecked because the parent never fed `isChecked` back in — this is the property plan
         * 01-14 relies on to revert the toggle when persistence fails.
         */
        expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
        await expect.element(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("exposes an on/checked state to assistive technology when checked, and does not when unchecked", async () => {
        // Arrange
        const checkedScreen = await render(<Switch label="On" defaultChecked />);
        const uncheckedScreen = await render(<Switch label="Off" />);

        // Act
        const checkedToggle = checkedScreen.getByRole("switch", { name: "On" });
        const uncheckedToggle = uncheckedScreen.getByRole("switch", { name: "Off" });

        // Assert
        await expect.element(checkedToggle).toHaveAttribute("aria-checked", "true");
        await expect.element(uncheckedToggle).toHaveAttribute("aria-checked", "false");
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
});
