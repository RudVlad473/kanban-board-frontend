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

        /*
         * Act + Assert (typing is suppressed) — a disabled input never becomes the active
         * element, so the browser itself refuses focus; this proves activation is genuinely
         * suppressed, not merely unasserted.
         */
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
        /*
         * The trailing slot's positioned ancestor is the same relative wrapper the input renders
         * into, not a sibling elsewhere in the tree — proving it renders "inside" the field.
         */
        expect(
            trailing
                .element()
                .closest(".relative")
                ?.contains(input as Node),
        ).toBe(true);
    });

    it("shows a trailing-edge overflow indicator only once the value overflows the field, including on live typing", async () => {
        /*
         * Arrange — a small "…" cue signalling more content exists off-screen (previously a
         * gradient fade — replaced per human feedback that it wasn't obvious enough). It must
         * stay absent for short/fitting content (no visual noise over normal fields) and appear
         * once the value actually overflows, including as the user types past the field's width
         * (a native input's own `.value` change is invisible to the hook's internal
         * MutationObserver, so the fix wires an explicit `onInput` recheck).
         */
        const getIndicator = (container: HTMLElement) => container.querySelector("[data-overflow-indicator]");

        const short = await render(
            <div style={{ width: "320px" }}>
                <TextField label="Short value" defaultValue="hi" />
            </div>,
        );
        await expect.poll(() => getIndicator(short.container)).toBeNull();

        const long = await render(
            <div style={{ width: "320px" }}>
                <TextField label="Long value" defaultValue={"x".repeat(300)} />
            </div>,
        );
        await expect.poll(() => getIndicator(long.container)).not.toBeNull();
        expect(getIndicator(long.container)?.textContent).toBe("…");

        const typing = await render(
            <div style={{ width: "320px" }}>
                <TextField label="Typed value" />
            </div>,
        );
        const input = typing.getByRole("textbox", { name: "Typed value" });
        expect(getIndicator(typing.container)).toBeNull();

        // Act
        await userEvent.type(input.element(), "x".repeat(200));

        // Assert
        await expect.poll(() => getIndicator(typing.container)).not.toBeNull();
    });

    it("holds its rendered width against a 300-character value instead of expanding or wrapping the layout", async () => {
        /*
         * Arrange — distinct labels keep each render's locator query unambiguous, since
         * locators resolve against the full page rather than a single render's own container.
         */
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
