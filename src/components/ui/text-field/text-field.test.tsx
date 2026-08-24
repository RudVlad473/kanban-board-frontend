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

import { TextField } from "./text-field";
import * as stories from "./text-field.stories";

const { Idle, Error, Disabled, Loading, Password } = composeStories(stories);

/*
 * ADR tech/0014: every primitive's suite runs at both viewports by default; the width test below
 * genuinely differs per viewport already (reads live window.innerWidth), needing no branching.
 */
describeForEachDevice({
    name: "TextField",
    body: () => {
        // Shallow: copy, prop-driven aria wiring, disabled/busy rendering — through composed stories (D-08).
        it("associates the visible label with the input as its accessible name", async () => {
            // Act
            await render(<Idle />);

            // Assert
            expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
        });

        it("renders the error message, marks the input invalid, and exposes the message as its accessible description when hasError", async () => {
            // Act
            await render(<Error />);

            // Assert
            const input = screen.getByRole("textbox", { name: "Password" });
            const message = screen.getByText("Can't be empty");
            expect(message).toBeVisible();
            expect(input).toHaveAttribute("aria-invalid", "true");
            expect(input.getAttribute("aria-describedby")).toContain(message.id);
        });

        it("renders disabled when isDisabled", async () => {
            // Act
            await render(<Disabled />);

            // Assert
            expect(screen.getByRole("textbox", { name: "Email" })).toBeDisabled();
        });

        it("renders disabled and reports itself busy when isLoading", async () => {
            // Act
            await render(<Loading />);

            // Assert
            const input = screen.getByRole("textbox", { name: "Email" });
            expect(input).toBeDisabled();
            expect(input).toHaveAttribute("aria-busy", "true");
        });

        it("renders a masked password input with its trailing node inside the field rather than beside it", async () => {
            // Act
            await render(<Password />);

            // Assert
            const input = document.body.querySelector("input[type='password']");
            const trailing = document.body.querySelector("svg");
            expect(input).not.toBeNull();
            expect(trailing?.closest(".relative")?.contains(input as Node)).toBe(true);
        });

        // Deep: real focus/typing/layout/computed-style behaviour — stay direct renders.
        it("focuses the input when its label is clicked", async () => {
            // Arrange
            const screen = await render(<TextField label="Email" />);
            const input = screen.getByRole("textbox", { name: "Email" });
            const label = screen.getByText("Email");

            // Act
            await label.click();

            // Assert
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

        it("renders the danger border using the same semantic token as Checkbox when hasError", async () => {
            // Arrange
            const screen = await render(<TextField label="Password" hasError errorMessage="Can't be empty" />);
            const input = screen.getByRole("textbox", { name: "Password" });

            // Act
            const borderColor = getComputedStyle(input.element()).borderColor;

            // Assert — border-border-danger (#C93F3C), same as Checkbox.
            expect(borderColor).toBe("rgb(201, 63, 60)");
        });

        // Deep — a prop-combination invariant (no story stages errorMessage without hasError).
        it("renders no error message element and does not mark the input invalid when hasError is unset", async () => {
            // Arrange
            const screen = await render(<TextField label="Password" errorMessage="Can't be empty" />);
            const input = screen.getByRole("textbox", { name: "Password" });

            // Assert
            expect(screen.container.textContent).not.toContain("Can't be empty");
            await expect.element(input).not.toHaveAttribute("aria-invalid");
        });

        it("prevents typing when isDisabled", async () => {
            // Arrange
            const onValueChange = vi.fn();
            const screen = await render(<TextField label="Email" isDisabled onValueChange={onValueChange} />);
            const input = screen.getByRole("textbox", { name: "Email" });

            // Act — a disabled input never becomes the active element, proving suppression is real.
            (input.element() as HTMLInputElement).focus();
            expect(input.element()).not.toBe(document.activeElement);
            await userEvent.keyboard("a");

            // Assert
            expect(onValueChange).not.toHaveBeenCalled();
        });

        it("refuses focus and typing when isLoading", async () => {
            // Arrange
            const onValueChange = vi.fn();
            const screen = await render(<TextField label="Email" isLoading onValueChange={onValueChange} />);
            const input = screen.getByRole("textbox", { name: "Email" });

            // Act — isLoading composes into native disabled (GC-17), same suppression as isDisabled.
            (input.element() as HTMLInputElement).focus();
            expect(input.element()).not.toBe(document.activeElement);
            await userEvent.keyboard("z");

            // Assert
            expect(onValueChange).not.toHaveBeenCalled();
        });

        it("a loading field visually matches disabled but keeps a distinct busy cursor", async () => {
            /*
             * Arrange — GC-17: isLoading composes into native disabled, so the base disabled:opacity-50
             * class always outranks isBusy's own class on specificity; cursor stays the sole
             * busy-vs-disabled differentiator (mirrors Checkbox's GC-14 precedent).
             */
            const loading = await render(<TextField label="Loading field" isLoading />);
            const loadingInput = loading.getByRole("textbox", { name: "Loading field" });
            const disabled = await render(<TextField label="Disabled field" isDisabled />);
            const disabledInput = disabled.getByRole("textbox", { name: "Disabled field" });

            // Act
            const loadingStyle = getComputedStyle(loadingInput.element());
            const disabledStyle = getComputedStyle(disabledInput.element());

            // Assert — loading visually matches disabled (same opacity), but a distinct cursor.
            expect(loadingStyle.opacity).toBe("0.5");
            expect(disabledStyle.opacity).toBe("0.5");
            expect(loadingStyle.cursor).toBe("progress");
            expect(disabledStyle.cursor).not.toBe("progress");
        });

        it("truncates overflowing values with a native ellipsis instead of expanding the field, including on live typing", async () => {
            /*
             * Arrange — scrollWidth > clientWidth is the same overflow signal useOverflowIndicator
             * uses elsewhere; read directly off the input since there's no separate indicator element.
             */
            const isTruncating = (el: HTMLElement) => el.scrollWidth > el.clientWidth;

            const short = await render(
                <div style={{ width: "320px" }}>
                    <TextField label="Short value" defaultValue="hi" />
                </div>,
            );
            const shortInput = short.getByRole("textbox", { name: "Short value" });
            await expect.element(shortInput).toHaveClass("truncate");
            expect(isTruncating(shortInput.element() as HTMLElement)).toBe(false);

            const long = await render(
                <div style={{ width: "320px" }}>
                    <TextField label="Long value" defaultValue={"x".repeat(300)} />
                </div>,
            );
            const longInput = long.getByRole("textbox", { name: "Long value" });
            await expect.poll(() => isTruncating(longInput.element() as HTMLElement)).toBe(true);

            const typing = await render(
                <div style={{ width: "320px" }}>
                    <TextField label="Typed value" />
                </div>,
            );
            const input = typing.getByRole("textbox", { name: "Typed value" });
            expect(isTruncating(input.element() as HTMLElement)).toBe(false);

            /*
             * Act — 60 chars, not 200: this 320px box truncates at a measured 41, and each character
             * is its own keystroke round-trip. At 200 this overran the 15s test timeout under a
             * loaded `pnpm test`, and the orphaned keystrokes then typed into later tests.
             */
            await userEvent.type(input.element(), "x".repeat(60));

            // Assert — native truncation needs no explicit recheck wiring.
            await expect.poll(() => isTruncating(input.element() as HTMLElement)).toBe(true);
        });

        it("clips without an ellipsis glyph while focused, then restores the ellipsis on blur (round-10 fix)", async () => {
            /*
             * Arrange — ellipsis fights the browser's caret-follow auto-scroll while focused (Firefox never
             * paints it — Mozilla Bugzilla #15154); asserts the focus:text-clip decision. See round-10's SUMMARY.
             */
            const overflow = await render(
                <div style={{ width: "320px" }}>
                    <TextField label="Overflow value" defaultValue={"x".repeat(300)} />
                </div>,
            );
            const input = overflow.getByRole("textbox", { name: "Overflow value" }).element() as HTMLInputElement;

            // Assert — blurred (initial) state carries the ellipsis.
            expect(getComputedStyle(input).textOverflow).toBe("ellipsis");

            // Act
            input.focus();

            // Assert — focused state clips without a glyph, avoiding the caret-scroll conflict.
            await expect.poll(() => getComputedStyle(input).textOverflow).toBe("clip");

            // Act
            input.blur();

            // Assert — blurring restores the ellipsis.
            await expect.poll(() => getComputedStyle(input).textOverflow).toBe("ellipsis");
        });

        it("holds its rendered width against a 300-character value instead of expanding or wrapping the layout", async () => {
            // Arrange — distinct labels keep each render's locator query unambiguous.
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

        it("fills its container's width at any viewport, with no fixed desktop-only width", async () => {
            // Arrange — no wrapping width constraint; page.viewport already resized the test iframe.
            const screen = await render(<TextField label="Email" />);
            const input = screen.getByRole("textbox", { name: "Email" });

            // Act
            const inputWidth = input.element().getBoundingClientRect().width;

            // Assert — within a small tolerance of the real viewport width.
            expect(inputWidth).toBeGreaterThan(window.innerWidth - 20);
        });
    },
});
