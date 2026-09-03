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

const {
    Idle,
    HiddenLabel,
    Error: ErrorState,
    Disabled,
    Loading,
    Password,
    CharacterCounter,
    CharacterCounterFilled,
    CharacterCounterUnderMinimum,
    CharacterCounterLengthInvalid,
    CharacterCounterRequiredEmpty,
} = composeStories(stories);

/*
 * The field's visual box — a flex row wrapping the input and, on error, the message. It carries the
 * border, the size and the disabled treatment, so anything asserting those reads it, not the input.
 */
const getFieldBox = (input: Element): HTMLElement => {
    const box = input.parentElement;
    if (box === null) {
        throw new Error("Field box not found — is the input still wrapped?");
    }
    return box;
};

/*
 * ADR tech/0014: every primitive's suite runs at both viewports by default; the width test below
 * genuinely differs per viewport already (reads live window.innerWidth), needing no branching.
 */
describeForEachDevice({
    name: "TextField",
    body: () => {
        // Shallow: copy, prop-driven aria wiring, disabled/busy rendering — through composed stories.
        it("associates the visible label with the input as its accessible name", async () => {
            // Act
            await render(<Idle />);

            // Assert
            expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
        });

        /* isLabelHidden trades the label's layout box for nothing else — the accessible name stays. */
        it("keeps the label as the accessible name but out of the layout when isLabelHidden", async () => {
            // Act
            await render(<HiddenLabel />);

            // Assert
            const input = screen.getByRole("textbox", { name: "Email" });
            const label = document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`);
            expect(label?.textContent).toBe("Email");
            expect(label?.getBoundingClientRect().height).toBeLessThanOrEqual(1);
        });

        it("renders the error message, marks the input invalid, and exposes the message as its accessible description when hasError", async () => {
            // Act
            await render(<ErrorState />);

            // Assert
            const input = screen.getByRole("textbox", { name: "Password" });
            const message = screen.getByText("Can't be empty");
            expect(message).toBeVisible();
            expect(input).toHaveAttribute("aria-invalid", "true");
            expect(input.getAttribute("aria-describedby")).toContain(message.id);
        });

        /*
         * An error must cost the field no height. In flow it grew the form by 23.5px mid-click, and
         * a control's mousedown and mouseup then landed on different elements, silently losing the
         * click (04-15-CHECKPOINT.md). Asserted as height, not as a class name.
         */
        it("shows its error message without extending the field below the input", async () => {
            // Act
            await render(<ErrorState />);

            // Assert — the message is shown, but sits outside the field's own box.
            const input = screen.getByRole("textbox", { name: "Password" });
            const root = input.closest<HTMLElement>("[class*='flex-col']");
            const overhang =
                (root?.getBoundingClientRect().bottom ?? 0) - getFieldBox(input).getBoundingClientRect().bottom;
            expect(screen.getByText("Can't be empty")).toBeVisible();
            expect(overhang).toBeLessThanOrEqual(1);
        });

        /*
         * PDF p1's "Text Field (Error)" renders the message INSIDE the field box, right-aligned and
         * vertically centred — the placement that lets the slot cost no layout height and overlap no
         * sibling control. Asserted as measured geometry, not as a class name.
         */
        it("renders its error message inside the input's own box rather than beneath it", async () => {
            // Act
            await render(<ErrorState />);

            // Assert
            const input = screen.getByRole("textbox", { name: "Password" });
            const boxRect = getFieldBox(input).getBoundingClientRect();
            const inputRect = input.getBoundingClientRect();
            const messageRect = screen.getByText("Can't be empty").getBoundingClientRect();
            expect(messageRect.top).toBeGreaterThanOrEqual(boxRect.top - 1);
            expect(messageRect.bottom).toBeLessThanOrEqual(boxRect.bottom + 1);
            expect(messageRect.right).toBeLessThanOrEqual(boxRect.right - 1);
            // Beside the value, never over it — the input's own box ends where the message begins.
            expect(messageRect.left).toBeGreaterThanOrEqual(inputRect.right);
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
            const screen = await render(<TextField label="Password" hasError={true} errorMessage="Can't be empty" />);
            const input = screen.getByRole("textbox", { name: "Password" });

            // Act
            const borderColor = getComputedStyle(getFieldBox(input.element())).borderColor;

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
            const screen = await render(<TextField label="Email" isDisabled={true} onValueChange={onValueChange} />);
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
            const screen = await render(<TextField label="Email" isLoading={true} onValueChange={onValueChange} />);
            const input = screen.getByRole("textbox", { name: "Email" });

            // Act — isLoading composes into native disabled, same suppression as isDisabled.
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
            const loading = await render(<TextField label="Loading field" isLoading={true} />);
            const loadingInput = loading.getByRole("textbox", { name: "Loading field" });
            const disabled = await render(<TextField label="Disabled field" isDisabled={true} />);
            const disabledInput = disabled.getByRole("textbox", { name: "Disabled field" });

            // Act
            const loadingStyle = getComputedStyle(loadingInput.element());
            const disabledStyle = getComputedStyle(disabledInput.element());

            /*
             * Assert — loading visually matches disabled (same opacity, dimmed on the box that owns
             * the border), but a distinct cursor.
             */
            expect(getComputedStyle(getFieldBox(loadingInput.element())).opacity).toBe("0.5");
            expect(getComputedStyle(getFieldBox(disabledInput.element())).opacity).toBe("0.5");
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

        /*
         * The counter's own copy is the whole point of the slot: a limit the user can see before
         * they cross it, in ~30px that cannot truncate at any field width.
         */
        it("counts the typed characters against the limit inside the message slot", async () => {
            // Arrange
            const screen = await render(<CharacterCounter />);
            const input = screen.getByRole("textbox", { name: "Column Name" });

            // Act
            await userEvent.type(input.element(), "ab");

            // Assert
            await expect.element(screen.getByText("2/32")).toBeVisible();
        });

        /*
         * Two bounds, one slot: while the value is too SHORT the upper limit is not what stands in
         * the user's way, so the counter counts toward the lower one and swaps once it is met.
         */
        it("counts toward the minimum while under it, and toward the limit once it is met", async () => {
            // Arrange
            const screen = await render(<CharacterCounterUnderMinimum />);
            const input = screen.getByRole("textbox", { name: "Column Name" });

            /* Read exactly: a substring matcher would find "2/3" inside "2/32" and pass either way. */
            const counterText = () => screen.container.querySelector('[aria-hidden="true"].tabular-nums')?.textContent;

            // Assert — staged at two characters, one short of the minimum.
            await expect.poll(counterText).toBe("2/3 min");

            // Act — reaching the minimum.
            await userEvent.type(input.element(), "c");

            // Assert
            await expect.poll(counterText).toBe("3/32");
        });

        /* An always-on counter on an untouched empty field is noise, so it waits for a first character. */
        it("shows no counter while the value is empty", async () => {
            // Act
            const screen = await render(<CharacterCounter />);

            // Assert
            expect(screen.container.textContent).not.toContain("0/32");
        });

        /*
         * Precedence, half one: an empty value is the required-field case and keeps its prose, which
         * already fits the slot. A "0/32" there would lose the only word the user needs.
         */
        it("keeps the required-empty prose in the slot instead of a counter when the value is empty", async () => {
            // Act
            const screen = await render(<CharacterCounterRequiredEmpty />);

            // Assert
            await expect.element(screen.getByText("Can't be empty")).toBeVisible();
            expect(screen.container.textContent).not.toContain("0/32");
        });

        /*
         * Precedence, half two: a non-empty value is a length case, so the slot shows the counter and
         * the prose that truncated to "Column name must be between 3 and…" there moves out of sight
         * without leaving `aria-describedby`.
         */
        it("replaces the length prose with a red counter once the value is non-empty, keeping the prose as the accessible description", async () => {
            // Arrange
            const screen = await render(<CharacterCounterLengthInvalid />);
            const input = screen.getByRole("textbox", { name: "Column Name" });

            // Act
            const counter = screen.getByText("2/32").element() as HTMLElement;

            // Assert — the counter is what the eye gets, and it fits the slot whole.
            await expect.element(screen.getByText("2/32")).toBeVisible();
            expect(counter.scrollWidth).toBeLessThanOrEqual(counter.clientWidth + 1);

            // Assert — the prose is still what assistive tech gets, in full and out of the layout.
            const describedById = input.element().getAttribute("aria-describedby") ?? "";
            const message = screen.container.querySelector(`[id="${describedById}"]`);
            expect(message?.textContent).toBe("Column name must be between 3 and 32 characters.");
            expect(message?.getBoundingClientRect().width).toBeLessThanOrEqual(1);

            // Assert — polled past globals.css's 200ms colour transition, which reads mid-flight.
            await expect.poll(() => getComputedStyle(counter).color).toBe("rgb(201, 63, 60)");
        });

        /*
         * The rule the slot exists for. Below the field in flow the message grew the form 23.5px
         * mid-click and swallowed the click (04-15-CHECKPOINT.md); the counter costs the same zero.
         */
        it("costs the field no height when the counter appears, valid or invalid", async () => {
            // Arrange
            const quiet = await render(<CharacterCounter />);
            const quietInput = quiet.getByRole("textbox", { name: "Column Name" });
            const quietRoot = quietInput.element().closest<HTMLElement>("[class*='flex-col']");
            const baselineRootHeight = quietRoot?.getBoundingClientRect().height ?? 0;
            const baselineBoxHeight = getFieldBox(quietInput.element()).getBoundingClientRect().height;

            // Act — the counter appears on the first character.
            await userEvent.type(quietInput.element(), "ab");
            await expect.element(quiet.getByText("2/32")).toBeVisible();

            // Assert
            expect(quietRoot?.getBoundingClientRect().height).toBe(baselineRootHeight);
            expect(getFieldBox(quietInput.element()).getBoundingClientRect().height).toBe(baselineBoxHeight);

            /*
             * Arrange — the same field length-invalid. Reached through this render's own container,
             * not a role locator: both fields carry the same label and the locator is page-wide.
             */
            const invalid = await render(<CharacterCounterLengthInvalid />);
            const invalidInput = invalid.container.querySelector("input");
            const invalidRoot = invalidInput?.closest<HTMLElement>("[class*='flex-col']");

            // Assert
            expect(invalidRoot?.getBoundingClientRect().height).toBe(baselineRootHeight);
            expect(getFieldBox(invalidInput as Element).getBoundingClientRect().height).toBe(baselineBoxHeight);
        });

        /* Same slot as the message: inside the box, right-aligned, never over the value. */
        it("renders the counter inside the input's own box rather than beneath it", async () => {
            // Arrange
            const screen = await render(<CharacterCounterFilled />);
            const input = screen.getByRole("textbox", { name: "Column Name" });

            // Act
            const boxRect = getFieldBox(input.element()).getBoundingClientRect();
            const counterRect = screen.getByText("2/32").element().getBoundingClientRect();

            // Assert
            expect(counterRect.top).toBeGreaterThanOrEqual(boxRect.top - 1);
            expect(counterRect.bottom).toBeLessThanOrEqual(boxRect.bottom + 1);
            expect(counterRect.right).toBeLessThanOrEqual(boxRect.right - 1);
            expect(counterRect.left).toBeGreaterThanOrEqual(input.element().getBoundingClientRect().right);
        });

        it("fills its container's width at any viewport, with no fixed desktop-only width", async () => {
            // Arrange — no wrapping width constraint; page.viewport already resized the test iframe.
            const screen = await render(<TextField label="Email" />);
            const input = screen.getByRole("textbox", { name: "Email" });

            // Act
            const boxWidth = getFieldBox(input.element()).getBoundingClientRect().width;

            // Assert — within a small tolerance of the real viewport width.
            expect(boxWidth).toBeGreaterThan(window.innerWidth - 20);
        });
    },
});
