import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { TextField } from "./text-field";

/*
 * ADR tech/0014: every primitive's whole behavioral suite runs at both viewports by default, a
 * blanket regression net rather than a hand-picked set of viewport-conditional assertions. Most
 * tests below run identically at both sizes; the width test just below genuinely differs by
 * viewport already (it reads the live `window.innerWidth`, so no `device` branching is needed in
 * its own body).
 */
describeForEachDevice({
    name: "TextField",
    body: () => {
        it("fills its container's width at any viewport, already fluid with no fixed desktop-only width — renders at (approximately) the current viewport width when unconstrained", async () => {
            /*
             * Arrange — no wrapping width constraint (unlike the LongValue story's 320px wrapper);
             * it's TextField's own w-full under test here, not some ancestor's fixed width.
             * page.viewport already resized the test iframe for this device.
             */
            const screen = await render(<TextField label="Email" />);
            const input = screen.getByRole("textbox", { name: "Email" });

            // Act
            const inputWidth = input.element().getBoundingClientRect().width;

            /*
             * Assert — within a small tolerance of the real viewport width, proving the field's width
             * tracks whatever viewport it renders in rather than a fixed value.
             */
            expect(inputWidth).toBeGreaterThan(window.innerWidth - 20);
        });

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
                <TextField
                    label="Password"
                    type="password"
                    trailing={<span data-testid="trailing-slot">toggle</span>}
                />,
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

        it("truncates overflowing values with a native ellipsis instead of expanding the field, including on live typing", async () => {
            /*
             * Arrange — the overflow cue is now native CSS truncation (`truncate`: `overflow-hidden`,
             * `text-overflow: ellipsis`, `whitespace-nowrap`) applied to the input itself, not a
             * separate absolutely-positioned overlay span. A previous overlay-patch implementation
             * bled over the input's own border/corner radius because its offsets didn't account for
             * border width (round-9 human-reported visual bug); native truncation renders inside the
             * input's own padded box, so there's nothing to offset. `scrollWidth > clientWidth` is the
             * same overflow signal `useOverflowIndicator` uses elsewhere (Dropdown) — here read
             * directly off the input, since there's no separate indicator element to query.
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

            // Act
            await userEvent.type(input.element(), "x".repeat(200));

            /*
             * Assert — native truncation needs no explicit recheck wiring; the browser lays out the
             * ellipsis itself as `.value` grows.
             */
            await expect.poll(() => isTruncating(input.element() as HTMLElement)).toBe(true);
        });

        it("clips without an ellipsis glyph while focused, then restores the ellipsis on blur (round-10 fix)", async () => {
            /*
             * Arrange — `text-overflow: ellipsis` fights the browser's own caret-follow auto-scroll on
             * a focused `<input>`: Firefox never paints the glyph on `<input>` at all (Mozilla
             * Bugzilla #15154, unfixable via CSS), and even Chromium can render it against a stale
             * scroll offset once focus moves the caret, producing the human-reported "blank field with
             * a stray ellipsis" glitch. Neither the rendered glyph nor the native caret-scroll position
             * is introspectable via computed styles or jsdom — see round-10's SUMMARY for a
             * screenshot-based Playwright repro against the built Storybook confirming the visual fix.
             * What IS reliably assertable here is the underlying CSS decision that drives the fix:
             * `text-overflow` itself must read `clip` (no glyph) while focused and `ellipsis` again the
             * moment focus leaves — proving the `focus:text-clip` class is wired up and takes effect,
             * without depending on a real render of the glyph itself.
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
    },
});
