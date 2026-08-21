/*
 * Composed from the plain React renderer package, not @storybook/nextjs-vite — the latter's main
 * entry eagerly imports real Next.js internals this "browser" project deliberately does not load
 * (vitest.setup.ts documents this in full; sidebar.test.tsx is the proven precedent).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { Eye } from "lucide-react";
import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { IconButton } from "./icon-button";
import * as stories from "./icon-button.stories";

const { Default, Disabled, Loading } = composeStories(stories);

/*
 * composeStories' `.run()` and vitest-browser-react's `render()` don't clean up after each
 * other — wipe the page body between tests so the two mechanisms never collide.
 */
afterEach(() => {
    document.body.innerHTML = "";
});

/*
 * ADR tech/0014: every primitive's suite runs at both viewports by default; IconButton has no
 * viewport-conditional behavior of its own (ADR tech/0010 mobile review).
 */
describeForEachDevice({
    name: "IconButton",
    body: () => {
        // Shallow: copy, prop-driven aria/disabled/loading state — asserted through composed stories (D-08).
        it("exposes the label prop as its accessible name even though it renders no visible text", async () => {
            // Act
            await Default.run();

            // Assert
            const button = screen.getByRole("button", { name: "Show password" });
            expect(button).toBeVisible();
            expect(button.textContent).toBe("");
        });

        it("reports itself not busy — the attribute reads the string false, not absent — when isLoading is unset", async () => {
            // Act
            await Default.run();

            // Assert
            expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("aria-busy", "false");
        });

        it("renders disabled and keeps its accessible name when isDisabled", async () => {
            // Act
            await Disabled.run();

            // Assert
            expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
        });

        it("renders busy, renders a spinner in place of the icon, and keeps its accessible name when isLoading", async () => {
            // Act
            await Loading.run();

            // Assert
            const button = screen.getByRole("button", { name: "Show password" });
            expect(button).toBeDisabled();
            expect(button).toHaveAttribute("aria-busy", "true");
            expect(button.querySelector("svg.animate-spin")).not.toBeNull();
        });

        // Deep: real pointer/keyboard interaction and layout measurement — stay direct renders.
        it("invokes onClick exactly once on click", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(<IconButton label="Show password" icon={<Eye />} onClick={onClick} />);

            // Act
            await screen.getByRole("button", { name: "Show password" }).click();

            // Assert
            expect(onClick).toHaveBeenCalledOnce();
        });

        it("invokes onClick on keyboard Enter", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(<IconButton label="Show password" icon={<Eye />} onClick={onClick} />);
            const button = screen.getByRole("button", { name: "Show password" });

            // Act
            button.element().focus();
            await userEvent.keyboard("{Enter}");

            // Assert
            expect(onClick).toHaveBeenCalledOnce();
        });

        // Deep — real pointer/keyboard events; disabled-state rendering itself is the Disabled story above.
        it("suppresses activation when isDisabled", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(
                <IconButton label="Show password" icon={<Eye />} isDisabled onClick={onClick} />,
            );
            const button = screen.getByRole("button", { name: "Show password" });

            // Act + Assert (click)
            (button.element() as HTMLButtonElement).click();
            expect(onClick).not.toHaveBeenCalled();

            // Act + Assert (keyboard)
            button.element().focus();
            await userEvent.keyboard("{Enter}");
            expect(onClick).not.toHaveBeenCalled();
        });

        // Deep — real pointer/keyboard events; busy-state rendering itself is the Loading story above.
        it("suppresses activation when isLoading", async () => {
            // Arrange
            const onClick = vi.fn();
            const screen = await render(
                <IconButton label="Show password" icon={<Eye />} isLoading onClick={onClick} />,
            );
            const button = screen.getByRole("button", { name: "Show password" });

            // Act + Assert (click)
            (button.element() as HTMLButtonElement).click();
            expect(onClick).not.toHaveBeenCalled();

            // Act + Assert (keyboard)
            button.element().focus();
            await userEvent.keyboard("{Enter}");
            expect(onClick).not.toHaveBeenCalled();
        });

        it("has a hit area of at least 44 x 44 CSS pixels at every size, including sm", async () => {
            // Arrange
            const sm = await render(<IconButton label="Small" icon={<Eye />} size="sm" />);
            const md = await render(<IconButton label="Medium" icon={<Eye />} size="md" />);
            const lg = await render(<IconButton label="Large" icon={<Eye />} size="lg" />);

            // Assert
            for (const [screen, name] of [
                [sm, "Small"],
                [md, "Medium"],
                [lg, "Large"],
            ] as const) {
                const rect = screen.getByRole("button", { name }).element().getBoundingClientRect();
                expect(rect.width).toBeGreaterThanOrEqual(44);
                expect(rect.height).toBeGreaterThanOrEqual(44);
            }
        });

        it("lets a consumer className win over a conflicting base background class (merge, not concatenation)", async () => {
            // Arrange
            const screen = await render(<IconButton label="Delete" icon={<Eye />} className="bg-bg-danger" />);
            const button = screen.getByRole("button", { name: "Delete" });

            // Act
            const backgroundColor = getComputedStyle(button.element()).backgroundColor;

            // Assert — #C93F3C (the danger background) must win, proving merge over concatenation.
            expect(backgroundColor).toBe("rgb(201, 63, 60)");
        });
    },
});
