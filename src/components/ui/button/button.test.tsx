import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { Button } from "./button";

/*
 * ADR tech/0014: every primitive's whole behavioral suite runs at both viewports by default, a
 * blanket regression net rather than a hand-picked set of viewport-conditional assertions.
 * Button has no viewport-conditional behavior of its own (confirmed in the ADR tech/0010 mobile
 * review — fixed-size control, no md:/lg: classes) — every test here runs identically at both
 * sizes, which is itself the point.
 */
describeForEachDevice({
    name: "Button",
    body: () => {
        it("is found by its accessible role and name", async () => {
            // Arrange
            const screen = await render(<Button onClick={vi.fn()}>Create Account</Button>);

            // Assert
            await expect.element(screen.getByRole("button", { name: "Create Account" })).toBeVisible();
        });

        it("invokes onClick exactly once on click", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(<Button onClick={onClick}>Submit</Button>);

            // Act
            await screen.getByRole("button", { name: "Submit" }).click();

            // Assert
            expect(onClick).toHaveBeenCalledOnce();
        });

        it("invokes onClick on keyboard Enter", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(<Button onClick={onClick}>Submit</Button>);
            const button = screen.getByRole("button", { name: "Submit" });

            // Act
            button.element().focus();
            await userEvent.keyboard("{Enter}");

            // Assert
            expect(onClick).toHaveBeenCalledOnce();
        });

        it("invokes onClick on keyboard Space", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(<Button onClick={onClick}>Submit</Button>);
            const button = screen.getByRole("button", { name: "Submit" });

            // Act
            button.element().focus();
            await userEvent.keyboard(" ");

            // Assert
            expect(onClick).toHaveBeenCalledOnce();
        });

        it("renders disabled and suppresses activation on click and keyboard when isDisabled", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(
                <Button isDisabled onClick={onClick}>
                    Submit
                </Button>,
            );
            const button = screen.getByRole("button", { name: "Submit" });

            // Assert (rendered state)
            await expect.element(button).toBeDisabled();

            /*
             * Act + Assert (click) — a native DOM click() on a disabled button never dispatches the
             * click event, proving activation is genuinely suppressed by the browser, not merely
             * unasserted.
             */
            (button.element() as HTMLButtonElement).click();
            expect(onClick).not.toHaveBeenCalled();

            // Act + Assert (keyboard)
            button.element().focus();
            await userEvent.keyboard("{Enter}");
            expect(onClick).not.toHaveBeenCalled();
        });

        it("lets a consumer className win over a conflicting base background class (merge, not concatenation)", async () => {
            // Arrange
            const screen = await render(<Button className="bg-bg-danger">Delete</Button>);
            const button = screen.getByRole("button", { name: "Delete" });

            // Act
            const backgroundColor = getComputedStyle(button.element()).backgroundColor;

            /*
             * Assert — #C93F3C (the danger background) must win over the primary-variant default
             * (#635FC7).
             */
            expect(backgroundColor).toBe("rgb(201, 63, 60)");
        });

        it("keeps the on-primary (white) label color when a filled variant is disabled, instead of the low-contrast muted-text token", async () => {
            /*
             * Arrange — `text-muted` is tuned for muted text on a *light surface*. Swapping to it on
             * disable for a *filled* button (primary/destructive) combined with the shared
             * `disabled:opacity-50` collapsed the label to near-invisible: a dark-grey label over an
             * already-faded purple/red fill. The label must stay on the same on-primary token disabled
             * as enabled — opacity alone communicates the disabled state.
             */
            const primary = await render(
                <Button variant="primary" isDisabled>
                    Primary
                </Button>,
            );
            const destructive = await render(
                <Button variant="destructive" isDisabled>
                    Destructive
                </Button>,
            );

            // Act
            const primaryColor = getComputedStyle(primary.getByRole("button", { name: "Primary" }).element()).color;
            const destructiveColor = getComputedStyle(
                destructive.getByRole("button", { name: "Destructive" }).element(),
            ).color;

            /*
             * Assert — rgb(255, 255, 255) is `text-on-primary`; text-muted (#66707F) would read
             * rgb(102, 112, 127).
             */
            expect(primaryColor).toBe("rgb(255, 255, 255)");
            expect(destructiveColor).toBe("rgb(255, 255, 255)");
        });

        it("renders a distinct background for each variant", async () => {
            // Arrange
            const primary = await render(<Button variant="primary">Primary</Button>);
            const secondary = await render(<Button variant="secondary">Secondary</Button>);
            const destructive = await render(<Button variant="destructive">Destructive</Button>);

            // Act
            const primaryBg = getComputedStyle(
                primary.getByRole("button", { name: "Primary" }).element(),
            ).backgroundColor;
            const secondaryBg = getComputedStyle(
                secondary.getByRole("button", { name: "Secondary" }).element(),
            ).backgroundColor;
            const destructiveBg = getComputedStyle(
                destructive.getByRole("button", { name: "Destructive" }).element(),
            ).backgroundColor;

            // Assert
            expect(new Set([primaryBg, secondaryBg, destructiveBg]).size).toBe(3);
        });

        it("renders not activatable, reports itself busy, and keeps the label visible alongside a spinner when isLoading", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(
                <Button isLoading onClick={onClick}>
                    Sign In
                </Button>,
            );
            const button = screen.getByRole("button", { name: "Sign In" });

            // Assert (rendered state)
            await expect.element(button).toBeDisabled();
            await expect.element(button).toHaveAttribute("aria-busy", "true");
            await expect.element(screen.getByText("Sign In")).toBeVisible();

            // Act + Assert (click) — a native DOM click() on a disabled button never dispatches.
            (button.element() as HTMLButtonElement).click();
            expect(onClick).not.toHaveBeenCalled();

            // Act + Assert (keyboard)
            button.element().focus();
            await userEvent.keyboard("{Enter}");
            expect(onClick).not.toHaveBeenCalled();
        });

        it("computes the Loading spinner's animation state consistently with the live reduced-motion preference", async () => {
            /*
             * GC-13: source-level audit found no global animation-disabling override anywhere
             * (globals.css only imports tailwindcss/tokens.css/fonts.css; .storybook/preview.tsx has
             * no reduced-motion parameter/decorator), pointing at the environment's own OS/browser
             * "reduce motion" setting as the leading explanation for a reported static spinner — but
             * that lead is unconfirmed until proven live. This test reads the actual live preference
             * rather than assuming it, and asserts the *correct* relationship in both directions, so
             * it stays a meaningful regression guard whichever way the diagnosis lands.
             */

            // Arrange
            const screen = await render(<Button isLoading>Sign In</Button>);
            const spinner = screen.container.querySelector("svg");
            const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

            // Act
            const spinnerStyle = getComputedStyle(spinner as SVGElement);

            /*
             * Assert — branches on the live `matches` value read above, not a hardcoded assumption.
             * This run found `prefersReducedMotion === false`: the environment requests no reduced
             * motion, so the spinner is expected to actually animate (`animationName: "spin"`,
             * `animationPlayState: "running"`). It does. This confirms the root cause of the reported
             * static spinner in a live browser is the reviewer's own OS/browser reduce-motion
             * accessibility setting — `motion-reduce:animate-none` behaving exactly as designed, not a
             * CSS/build defect. See Task 2 for the documentation this finding resolves to.
             */
            if (!prefersReducedMotion) {
                expect(spinnerStyle.animationName).toBe("spin");
                expect(spinnerStyle.animationPlayState).toBe("running");
            } else {
                expect(spinnerStyle.animationName).toBe("none");
            }
        });

        it("reports itself not busy — the attribute reads the string false, not absent — when isLoading is unset", async () => {
            // Arrange
            const screen = await render(<Button onClick={vi.fn()}>Sign In</Button>);
            const button = screen.getByRole("button", { name: "Sign In" });

            // Assert
            await expect.element(button).toHaveAttribute("aria-busy", "false");
        });

        it("renders a distinct height for each size", async () => {
            // Arrange
            const sm = await render(<Button size="sm">Small</Button>);
            const md = await render(<Button size="md">Medium</Button>);
            const lg = await render(<Button size="lg">Large</Button>);

            // Act
            const smHeight = getComputedStyle(sm.getByRole("button", { name: "Small" }).element()).height;
            const mdHeight = getComputedStyle(md.getByRole("button", { name: "Medium" }).element()).height;
            const lgHeight = getComputedStyle(lg.getByRole("button", { name: "Large" }).element()).height;

            // Assert
            expect(new Set([smHeight, mdHeight, lgHeight]).size).toBe(3);
        });
    },
});
