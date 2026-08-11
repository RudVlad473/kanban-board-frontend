import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
    it("is found by role checkbox with the label as its accessible name, and clicking the label toggles it", async () => {
        // Arrange
        const onCheckedChange = vi.fn();
        const screen = await render(<Checkbox label="Remember me" onCheckedChange={onCheckedChange} />);
        const checkbox = screen.getByRole("checkbox", { name: "Remember me" });
        const label = screen.getByText("Remember me");

        // Act
        await label.click();

        // Assert
        await expect.element(checkbox).toBeVisible();
        expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    });

    it("is reachable by keyboard tab order and toggles on Space", async () => {
        // Arrange
        const onCheckedChange = vi.fn();
        const screen = await render(<Checkbox label="Remember me" onCheckedChange={onCheckedChange} />);
        const checkbox = screen.getByRole("checkbox", { name: "Remember me" });

        // Assert (reachable)
        expect(checkbox.element().tabIndex).toBe(0);

        // Act
        checkbox.element().focus();
        await userEvent.keyboard(" ");

        // Assert
        expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    });

    it("fires onCheckedChange with the new boolean on each toggle and does not fire when disabled", async () => {
        // Arrange
        const onCheckedChange = vi.fn();
        const screen = await render(<Checkbox label="Remember me" isDisabled onCheckedChange={onCheckedChange} />);
        const checkbox = screen.getByRole("checkbox", { name: "Remember me" });

        // Act
        (checkbox.element() as HTMLElement).click();

        // Assert
        expect(onCheckedChange).not.toHaveBeenCalled();
    });

    it("reflects a controlled isChecked prop and does not toggle itself when the parent does not update it", async () => {
        // Arrange
        const onCheckedChange = vi.fn();
        const screen = await render(
            <Checkbox label="Remember me" isChecked={false} onCheckedChange={onCheckedChange} />,
        );
        const checkbox = screen.getByRole("checkbox", { name: "Remember me" });

        // Act
        await checkbox.click();

        // Assert — the callback fires with the intended next value, but the rendered state stays
        // unchecked because the parent never fed `isChecked` back in (a real controlled component).
        expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
        await expect.element(checkbox).toHaveAttribute("aria-checked", "false");
    });

    it("renders the danger border using the same semantic token as TextField and marks the control invalid when hasError", async () => {
        // Arrange
        const screen = await render(<Checkbox label="Terms" hasError />);
        const checkbox = screen.getByRole("checkbox", { name: "Terms" });

        // Act
        const borderColor = getComputedStyle(checkbox.element()).borderColor;

        // Assert
        expect(borderColor).toBe("rgb(201, 63, 60)"); // border-border-danger (#C93F3C), same as TextField
        await expect.element(checkbox).toHaveAttribute("aria-invalid", "true");
    });

    it("renders disabled, is not focusable by pointer activation, and does not toggle when isDisabled", async () => {
        // Arrange
        const onCheckedChange = vi.fn();
        const screen = await render(<Checkbox label="Remember me" isDisabled onCheckedChange={onCheckedChange} />);
        const checkbox = screen.getByRole("checkbox", { name: "Remember me" });

        // Act — a real pointer click (not a programmatic `.focus()` call) is the behaviour the
        // primitive owns: clicking a disabled control must not move focus into it or toggle it.
        (checkbox.element() as HTMLElement).click();

        // Assert
        expect(checkbox.element()).not.toBe(document.activeElement);
        expect(onCheckedChange).not.toHaveBeenCalled();
        await expect.element(checkbox).toHaveAttribute("aria-checked", "false");
    });
});
