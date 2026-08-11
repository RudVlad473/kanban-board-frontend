import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { TextField } from "./text-field";

describe("TextField", () => {
    it("associates the visible label with the input as its accessible name, and clicking the label focuses the input", async () => {
        // Arrange
        const screen = await render(<TextField label="Email" />);
        const input = screen.getByRole("textbox", { name: "Email" });
        const label = screen.getByText("Email");

        // Act
        await label.click();

        // Assert
        await expect.element(input).toBeVisible();
        expect(input.element()).toBe(document.activeElement);
    });

    it("updates its value and calls onValueChange when typed into", async () => {
        // Arrange
        const onValueChange = vi.fn();
        const screen = await render(<TextField label="Email" onValueChange={onValueChange} />);
        const input = screen.getByRole("textbox", { name: "Email" });

        // Act
        await userEvent.type(input.element(), "a");

        // Assert
        expect(onValueChange).toHaveBeenCalledWith("a", expect.anything());
        await expect.element(input).toHaveValue("a");
    });

    it("renders the danger border and message, marks the input invalid, and exposes the message as its accessible description when hasError", async () => {
        // Arrange
        const screen = await render(<TextField label="Password" hasError errorMessage="Can't be empty" />);
        const input = screen.getByRole("textbox", { name: "Password" });

        // Act
        const borderColor = getComputedStyle(input.element()).borderColor;
        const message = screen.getByText("Can't be empty");

        // Assert
        expect(borderColor).toBe("rgb(201, 63, 60)"); // border-border-danger (#C93F3C)
        await expect.element(message).toBeVisible();
        await expect.element(input).toHaveAttribute("aria-invalid", "true");
        expect(input.element().getAttribute("aria-describedby")).toContain(message.element().id);
    });

    it("renders no error message element and does not mark the input invalid when hasError is unset", async () => {
        // Arrange
        const screen = await render(<TextField label="Password" errorMessage="Can't be empty" />);
        const input = screen.getByRole("textbox", { name: "Password" });

        // Assert
        expect(screen.container.textContent).not.toContain("Can't be empty");
        await expect.element(input).not.toHaveAttribute("aria-invalid");
    });

    it("renders disabled and prevents typing when isDisabled", async () => {
        // Arrange
        const onValueChange = vi.fn();
        const screen = await render(<TextField label="Email" isDisabled onValueChange={onValueChange} />);
        const input = screen.getByRole("textbox", { name: "Email" });

        // Assert (rendered state)
        await expect.element(input).toBeDisabled();

        // Act + Assert (typing is suppressed) — a disabled input never becomes the active
        // element, so the browser itself refuses focus; this proves activation is genuinely
        // suppressed, not merely unasserted.
        (input.element() as HTMLInputElement).focus();
        expect(input.element()).not.toBe(document.activeElement);
        await userEvent.keyboard("a");
        expect(onValueChange).not.toHaveBeenCalled();
    });

    it("renders a masked password input, and a trailing node inside the field rather than beside it", async () => {
        // Arrange
        const screen = await render(
            <TextField label="Password" type="password" trailing={<span data-testid="trailing-slot">toggle</span>} />,
        );
        const input = screen.container.querySelector("input[type='password']");
        const trailing = screen.getByTestId("trailing-slot");

        // Assert
        expect(input).not.toBeNull();
        await expect.element(trailing).toBeVisible();
        // The trailing slot's positioned ancestor is the same relative wrapper the input renders
        // into, not a sibling elsewhere in the tree — proving it renders "inside" the field.
        expect(
            trailing
                .element()
                .closest(".relative")
                ?.contains(input as Node),
        ).toBe(true);
    });

    it("holds its rendered width against a 300-character value instead of expanding or wrapping the layout", async () => {
        // Arrange — distinct labels keep each render's locator query unambiguous, since
        // locators resolve against the full page rather than a single render's own container.
        const empty = await render(
            <div style={{ width: "320px" }}>
                <TextField label="Name (empty)" />
            </div>,
        );
        const emptyInput = empty.getByRole("textbox", { name: "Name (empty)" });
        const emptyWidth = emptyInput.element().getBoundingClientRect().width;

        const longValue = "x".repeat(300);
        const filled = await render(
            <div style={{ width: "320px" }}>
                <TextField label="Name (filled)" defaultValue={longValue} />
            </div>,
        );
        const filledInput = filled.getByRole("textbox", { name: "Name (filled)" });

        // Act
        const filledWidth = filledInput.element().getBoundingClientRect().width;

        // Assert
        expect(filledWidth).toBe(emptyWidth);
    });
});
