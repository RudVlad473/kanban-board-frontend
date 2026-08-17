import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { Checkbox } from "./checkbox";

/*
 * ADR tech/0014: every primitive's whole behavioral suite runs at both viewports by default, a
 * blanket regression net rather than a hand-picked set of viewport-conditional assertions.
 * Checkbox has no viewport-conditional behavior of its own (confirmed in the ADR tech/0010
 * mobile review — fixed-size boxes, no md:/lg: classes) — every test here runs identically at
 * both sizes, which is itself the point.
 */
describeForEachDevice({
    name: "Checkbox",
    body: () => {
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

            /*
             * Assert — the callback fires with the intended next value, but the rendered state stays
             * unchecked because the parent never fed `isChecked` back in (a real controlled component).
             */
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

        it("does not shift the control's position when toggled from unchecked to checked", async () => {
            /*
             * Arrange — the wrapping Field.Root is `inline-flex`, so it participates in its parent's
             * inline formatting context and is baseline-aligned by default. An empty flex item (the
             * checkbox root before its tick-mark indicator mounts) and a non-empty one (after) can
             * resolve to different baselines, shifting the whole control vertically purely from the
             * indicator mounting — the root's own box size never changes, only its position. `align-top`
             * on Field.Root removes the baseline dependency entirely; this test guards the regression.
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

        it("renders disabled, is not focusable by pointer activation, and does not toggle when isDisabled", async () => {
            // Arrange
            const onCheckedChange = vi.fn();
            const screen = await render(<Checkbox label="Remember me" isDisabled onCheckedChange={onCheckedChange} />);
            const checkbox = screen.getByRole("checkbox", { name: "Remember me" });

            /*
             * Act — a real pointer click (not a programmatic `.focus()` call) is the behaviour the
             * primitive owns: clicking a disabled control must not move focus into it or toggle it.
             */
            (checkbox.element() as HTMLElement).click();

            // Assert
            expect(checkbox.element()).not.toBe(document.activeElement);
            expect(onCheckedChange).not.toHaveBeenCalled();
            await expect.element(checkbox).toHaveAttribute("aria-checked", "false");
        });

        /*
         * GC-14 (plan 01-23) investigation: confirms `Field.Root`'s `disabled` prop reaches
         * `Checkbox.Root` as a real DOM `disabled` property, not merely an ARIA attribute — the
         * single propagation point `isLoading` (Task 2) will compose into via
         * `disabled={isDisabled || isLoading}` on `Field.Root`, rather than adding a second,
         * parallel `disabled` prop directly on `Checkbox.Root`. Task 2 will also add an `isBusy`
         * cva axis mirroring `text-field.tsx`'s, with no spinner glyph — the tick box has no room
         * for one, and the user's own words ("grayed out") describe an opacity treatment, not a
         * spinner.
         *
         * Finding this investigation surfaced: Base UI's `Checkbox.Root` (v1.7.0) renders TWO
         * elements — the visible `role="checkbox"` <span> `getByRole` returns (which only ever
         * gets `data-disabled`/`aria-disabled`, never the DOM `disabled` property, since a <span>
         * has no such property) and a visually-hidden, `aria-hidden` native <input type="checkbox">
         * sibling that DOES receive the real `disabled` DOM property. `Field.Root`'s `disabled`
         * prop genuinely reaches `Checkbox.Root` (confirmed on the hidden input below) — but the
         * checkboxVariants `disabled:opacity-50 disabled:cursor-not-allowed` base classes on the
         * visible span target the CSS `:disabled` pseudo-class, which can never match a <span>.
         * That's a pre-existing bug this plan's own premise depends on (isLoading must produce
         * "the same grayed-out opacity treatment isDisabled already gets" — it didn't, visually,
         * until fixed here to `data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed`,
         * matching the file's existing `data-[checked]:*` presence-based convention).
         */
        it("propagates Field.Root's disabled prop to Checkbox.Root's hidden native input as a real DOM disabled property", async () => {
            // Arrange
            const screen = await render(<Checkbox label="Remember me" isDisabled />);
            const hiddenInput = screen.container.querySelector<HTMLInputElement>('input[type="checkbox"]');

            /*
             * Assert — the real DOM property, not only `aria-disabled`/`data-disabled` on the
             * visible role="checkbox" span.
             */
            expect(hiddenInput).not.toBeNull();
            expect(hiddenInput?.disabled).toBe(true);
        });

        it("renders isLoading with the same grayed-out opacity as isDisabled, reports aria-busy, and does not toggle on click or keyboard Space", async () => {
            // Arrange
            const onCheckedChange = vi.fn();
            const loadingScreen = await render(
                <Checkbox label="Loading checkbox" isLoading onCheckedChange={onCheckedChange} />,
            );
            const disabledScreen = await render(<Checkbox label="Disabled checkbox" isDisabled />);
            const loadingCheckbox = loadingScreen.getByRole("checkbox", { name: "Loading checkbox" });
            const disabledCheckbox = disabledScreen.getByRole("checkbox", { name: "Disabled checkbox" });

            /*
             * Assert — comparing directly against isDisabled's own computed opacity (not a
             * hardcoded "0.5" literal alone) proves the visual treatment is genuinely shared, not
             * merely both non-1.
             */
            const loadingOpacity = getComputedStyle(loadingCheckbox.element()).opacity;
            const disabledOpacity = getComputedStyle(disabledCheckbox.element()).opacity;
            expect(loadingOpacity).toBe(disabledOpacity);
            await expect.element(loadingCheckbox).toHaveAttribute("aria-busy", "true");

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

        it("reports aria-busy=false (not absent) when not loading", async () => {
            // Arrange
            const screen = await render(<Checkbox label="Remember me" />);
            const checkbox = screen.getByRole("checkbox", { name: "Remember me" });

            // Assert
            await expect.element(checkbox).toHaveAttribute("aria-busy", "false");
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
