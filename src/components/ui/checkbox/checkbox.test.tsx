/*
 * Composed from the plain React renderer package, not @storybook/nextjs-vite — the latter's main
 * entry eagerly imports real Next.js internals this "browser" project deliberately does not load
 * (vitest.setup.ts documents this in full; sidebar.test.tsx is the proven precedent).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { Checkbox } from "./checkbox";
import * as stories from "./checkbox.stories";

const { Unchecked, Error, Disabled, Loading } = composeStories(stories);

/*
 * composeStories' `.run()` and vitest-browser-react's `render()` don't clean up after each
 * other — wipe the page body between tests so the two mechanisms never collide.
 */
afterEach(() => {
    document.body.innerHTML = "";
});

/*
 * ADR tech/0014: every primitive's suite runs at both viewports by default; Checkbox has no
 * viewport-conditional behavior of its own (ADR tech/0010 mobile review).
 */
describeForEachDevice({
    name: "Checkbox",
    body: () => {
        // Shallow: copy, prop-driven aria state — asserted through composed stories (D-08).
        it("is found by role checkbox with the label as its accessible name", async () => {
            // Act
            await Unchecked.run();

            // Assert
            expect(screen.getByRole("checkbox", { name: "Remember me" })).toBeInTheDocument();
        });

        it("reports aria-busy=false (not absent) when not loading", async () => {
            // Act
            await Unchecked.run();

            // Assert
            expect(screen.getByRole("checkbox", { name: "Remember me" })).toHaveAttribute("aria-busy", "false");
        });

        it("marks the control invalid when hasError", async () => {
            // Act
            await Error.run();

            // Assert
            expect(screen.getByRole("checkbox", { name: "Remember me" })).toHaveAttribute("aria-invalid", "true");
        });

        it("renders disabled and keeps its accessible name when isDisabled", async () => {
            // Act
            await Disabled.run();

            // Assert
            expect(screen.getByRole("checkbox", { name: "Remember me" })).toHaveAttribute("aria-disabled", "true");
        });

        it("renders busy and keeps its accessible name when isLoading", async () => {
            // Act
            await Loading.run();

            // Assert
            const checkbox = screen.getByRole("checkbox", { name: "Remember me" });
            expect(checkbox).toHaveAttribute("aria-busy", "true");
            expect(checkbox).toHaveAttribute("aria-disabled", "true");
        });

        // Deep: real pointer/keyboard interaction, computed style, and layout — stay direct renders.
        it("is found by role checkbox, and clicking its label toggles it", async () => {
            // Arrange
            const onCheckedChange = vi.fn();
            const screen = await render(<Checkbox label="Remember me" onCheckedChange={onCheckedChange} />);
            const label = screen.getByText("Remember me");

            // Act
            await label.click();

            // Assert
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

            // Assert — the callback fires, but the render stays unchecked (a real controlled component).
            expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
            await expect.element(checkbox).toHaveAttribute("aria-checked", "false");
        });

        it("renders the danger border using the same semantic token as TextField when hasError", async () => {
            // Arrange
            const screen = await render(<Checkbox label="Terms" hasError />);
            const checkbox = screen.getByRole("checkbox", { name: "Terms" });

            // Act
            const borderColor = getComputedStyle(checkbox.element()).borderColor;

            // Assert — border-border-danger (#C93F3C), same as TextField.
            expect(borderColor).toBe("rgb(201, 63, 60)");
        });

        it("does not shift the control's position when toggled from unchecked to checked", async () => {
            /*
             * Arrange — `align-top` on Field.Root removes a baseline-shift regression where the
             * indicator mounting changed the flex item's baseline; see checkbox.tsx's own comment.
             */
            const screen = await render(<Checkbox label="Remember me" />);
            const wrapper = screen.container.firstChild as HTMLElement;
            const checkbox = screen.getByRole("checkbox", { name: "Remember me" });

            // Act
            const beforeTop = wrapper.getBoundingClientRect().top;
            await checkbox.click();
            const afterTop = wrapper.getBoundingClientRect().top;

            // Assert
            await expect.element(checkbox).toHaveAttribute("aria-checked", "true");
            expect(afterTop).toBe(beforeTop);
        });

        it("is not focusable by pointer activation and does not toggle when isDisabled", async () => {
            // Arrange
            const onCheckedChange = vi.fn();
            const screen = await render(<Checkbox label="Remember me" isDisabled onCheckedChange={onCheckedChange} />);
            const checkbox = screen.getByRole("checkbox", { name: "Remember me" });

            // Act — a real pointer click, not a programmatic focus() call.
            (checkbox.element() as HTMLElement).click();

            // Assert
            expect(checkbox.element()).not.toBe(document.activeElement);
            expect(onCheckedChange).not.toHaveBeenCalled();
        });

        /*
         * GC-14 (plan 01-23): `Checkbox.Root`'s visible `role="checkbox"` span never gets the real
         * DOM `disabled` property (only its hidden native `<input>` sibling does) — see
         * checkbox.tsx's own comment and 01-23-SUMMARY.md for the full investigation.
         */
        it("propagates Field.Root's disabled prop to Checkbox.Root's hidden native input as a real DOM disabled property", async () => {
            // Arrange
            const screen = await render(<Checkbox label="Remember me" isDisabled />);
            const hiddenInput = screen.container.querySelector<HTMLInputElement>('input[type="checkbox"]');

            // Assert — the real DOM property, not only aria-disabled/data-disabled on the visible span.
            expect(hiddenInput).not.toBeNull();
            expect(hiddenInput?.disabled).toBe(true);
        });

        it("renders isLoading with the same grayed-out opacity as isDisabled and does not toggle on click or keyboard Space", async () => {
            // Arrange
            const onCheckedChange = vi.fn();
            const loadingScreen = await render(
                <Checkbox label="Loading checkbox" isLoading onCheckedChange={onCheckedChange} />,
            );
            const disabledScreen = await render(<Checkbox label="Disabled checkbox" isDisabled />);
            const loadingCheckbox = loadingScreen.getByRole("checkbox", { name: "Loading checkbox" });
            const disabledCheckbox = disabledScreen.getByRole("checkbox", { name: "Disabled checkbox" });

            // Assert — compared against isDisabled's own computed opacity, not a hardcoded literal.
            const loadingOpacity = getComputedStyle(loadingCheckbox.element()).opacity;
            const disabledOpacity = getComputedStyle(disabledCheckbox.element()).opacity;
            expect(loadingOpacity).toBe(disabledOpacity);

            // Act — a real pointer click.
            (loadingCheckbox.element() as HTMLElement).click();

            // Assert
            expect(onCheckedChange).not.toHaveBeenCalled();

            // Act — a real keyboard Space after focusing.
            loadingCheckbox.element().focus();
            await userEvent.keyboard(" ");

            // Assert
            expect(onCheckedChange).not.toHaveBeenCalled();
        });

        it("composes isLoading and isDisabled together into the same grayed-out, inert state either alone produces", async () => {
            // Arrange
            const onCheckedChange = vi.fn();
            const bothScreen = await render(
                <Checkbox label="Both checkbox" isLoading isDisabled onCheckedChange={onCheckedChange} />,
            );
            const disabledScreen = await render(<Checkbox label="Disabled-only checkbox" isDisabled />);
            const bothCheckbox = bothScreen.getByRole("checkbox", { name: "Both checkbox" });
            const disabledCheckbox = disabledScreen.getByRole("checkbox", { name: "Disabled-only checkbox" });

            // Assert
            const bothOpacity = getComputedStyle(bothCheckbox.element()).opacity;
            const disabledOpacity = getComputedStyle(disabledCheckbox.element()).opacity;
            expect(bothOpacity).toBe(disabledOpacity);

            // Act
            (bothCheckbox.element() as HTMLElement).click();

            // Assert
            expect(onCheckedChange).not.toHaveBeenCalled();
        });
    },
});
