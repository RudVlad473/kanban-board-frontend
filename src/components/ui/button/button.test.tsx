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

import { Button } from "./button";
import * as stories from "./button.stories";

const { Primary, Disabled, Loading } = composeStories(stories);

/*
 * ADR tech/0014: every primitive's suite runs at both viewports by default; Button has no
 * viewport-conditional behavior of its own (ADR tech/0010 mobile review).
 */
describeForEachDevice({
    name: "Button",
    body: () => {
        // Shallow: copy, prop-driven aria/disabled state — asserted through composed stories.
        it("renders the accessible name from its copy", async () => {
            // Act
            await render(<Primary />);

            // Assert
            expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
        });

        it("renders disabled and keeps its accessible name when isDisabled", async () => {
            // Act
            await render(<Disabled />);

            // Assert
            expect(screen.getByRole("button", { name: "Create Account" })).toBeDisabled();
        });

        it("renders busy and keeps its label visible when isLoading", async () => {
            // Act
            await render(<Loading />);

            // Assert
            const button = screen.getByRole("button", { name: "Create Account" });
            expect(button).toBeDisabled();
            expect(button).toHaveAttribute("aria-busy", "true");
            expect(screen.getByText("Create Account")).toBeVisible();
        });

        it("reports itself not busy — the attribute reads the string false, not absent — when isLoading is unset", async () => {
            // Act
            await render(<Primary />);

            // Assert
            expect(screen.getByRole("button", { name: "Create Account" })).toHaveAttribute("aria-busy", "false");
        });

        // Deep: real pointer/keyboard interaction and computed style — stay direct renders.
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

        // Deep — real pointer/keyboard events; disabled-state rendering itself is the Disabled story above.
        it("suppresses activation on click and keyboard when isDisabled", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(
                <Button isDisabled={true} onClick={onClick}>
                    Submit
                </Button>,
            );
            const button = screen.getByRole("button", { name: "Submit" });

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

        // Deep — real pointer/keyboard events; busy-state rendering itself is the Loading story above.
        it("suppresses activation on click and keyboard when isLoading", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(
                <Button isLoading={true} onClick={onClick}>
                    Sign In
                </Button>,
            );
            const button = screen.getByRole("button", { name: "Sign In" });

            // Act + Assert (click)
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
             * Arrange — disabled filled variants must keep the same on-primary label color as
             * enabled (opacity alone signals disabled); see button.tsx's own token comment.
             */
            const primary = await render(
                <Button variant="primary" isDisabled={true}>
                    Primary
                </Button>,
            );
            const destructive = await render(
                <Button variant="destructive" isDisabled={true}>
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

        it("computes the Loading spinner's animation state consistently with the live reduced-motion preference", async () => {
            /*
             * A static spinner is the live "reduce motion" preference, not a CSS defect —
             * read the real preference rather than assuming it (see button.tsx's own comment).
             */

            // Arrange
            const screen = await render(<Button isLoading={true}>Sign In</Button>);
            const spinner = screen.container.querySelector("svg");
            const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

            // Act
            const spinnerStyle = getComputedStyle(spinner as SVGElement);

            // Assert — branches on the live `matches` value read above, not a hardcoded assumption.
            if (!prefersReducedMotion) {
                expect(spinnerStyle.animationName).toBe("spin");
                expect(spinnerStyle.animationPlayState).toBe("running");
            } else {
                expect(spinnerStyle.animationName).toBe("none");
            }
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
