import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { THEME, type Theme } from "@/lib/core/theme/theme";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { renderWithProviders } from "@/test-utils/render-with-providers";

import { ThemeToggle } from "./theme-toggle";
import * as stories from "./theme-toggle.stories";

const { Light, Dark, SaveFailed } = composeStories(stories);

const renderToggle = (props: { initialTheme: Theme; isAuthenticated: boolean }) =>
    renderWithProviders(<ThemeToggle {...props} />);

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. The theme
 * toggle has no viewport-conditional behavior of its own.
 */
describeForEachDevice({
    name: "ThemeToggle",
    body: () => {
        /*
         * composeStories' `.run()` and vitest-browser-react's `render()` (via renderWithProviders)
         * don't clean up after each other — wipe the page body between tests so the two mechanisms
         * never collide (the same DOM-leak fix plan 02.1-07 applied to the UI primitives).
         */
        afterEach(() => {
            document.body.innerHTML = "";
            document.documentElement.classList.remove("dark");
            document.cookie = "theme=; path=/; max-age=0";
        });

        // Shallow: accessible name, checked state, failure copy — asserted through composed stories (D-08).
        it("is found by role switch with the accessible name", async () => {
            // Act
            await Light.run();

            // Assert
            expect(screen.getByRole("switch", { name: "Toggle dark mode" })).toBeInTheDocument();
        });

        it("renders unchecked for the light theme, driven by initialTheme", async () => {
            // Act
            await Light.run();

            // Assert
            expect(screen.getByRole("switch", { name: "Toggle dark mode" })).toHaveAttribute("aria-checked", "false");
        });

        it("renders checked for the dark theme, driven by initialTheme", async () => {
            // Act
            await Dark.run();

            // Assert
            expect(screen.getByRole("switch", { name: "Toggle dark mode" })).toHaveAttribute("aria-checked", "true");
        });

        it("renders the authored failure copy when the save mutation is staged as failed", async () => {
            // Act
            await SaveFailed.run();

            // Assert
            expect(screen.getByRole("status")).toHaveTextContent("Couldn't save your theme. Try again.");
        });

        // Deep: real interaction and the live region's own empty-state shape — direct renders.
        it("renders a live region even with no message, giving assistive tech a stable node to watch", async () => {
            // Arrange
            const rendered = await renderToggle({ initialTheme: THEME.LIGHT, isAuthenticated: true });

            // Assert
            await expect.element(rendered.getByRole("status")).toHaveTextContent("");
        });

        it("toggles the interface on click and settles with no message on success", async () => {
            // Arrange
            const rendered = await renderToggle({ initialTheme: THEME.LIGHT, isAuthenticated: true });
            const toggle = rendered.getByRole("switch", { name: "Toggle dark mode" });

            // Act
            await toggle.click();

            // Assert
            expect(document.documentElement.classList.contains("dark")).toBe(true);
            await expect.element(toggle).toHaveAttribute("aria-checked", "true");
            await expect.element(rendered.getByRole("status")).toHaveTextContent("");
        });

        it("is reachable by keyboard tab order and toggles on Space", async () => {
            // Arrange
            const rendered = await renderToggle({ initialTheme: THEME.LIGHT, isAuthenticated: true });
            const toggle = rendered.getByRole("switch", { name: "Toggle dark mode" });

            // Assert (reachable)
            expect(toggle.element().tabIndex).toBe(0);

            // Act
            toggle.element().focus();
            await userEvent.keyboard(" ");

            // Assert
            await expect.element(toggle).toHaveAttribute("aria-checked", "true");
        });

        it("returns the interface to where it began after toggling twice", async () => {
            // Arrange
            const rendered = await renderToggle({ initialTheme: THEME.LIGHT, isAuthenticated: true });
            const toggle = rendered.getByRole("switch", { name: "Toggle dark mode" });

            // Act
            await toggle.click();
            await expect.element(toggle).toHaveAttribute("aria-checked", "true");
            await toggle.click();

            // Assert
            await expect.element(toggle).toHaveAttribute("aria-checked", "false");
            expect(document.documentElement.classList.contains("dark")).toBe(false);
        });

        it("updates the cookie and the document scope directly when unauthenticated", async () => {
            // Arrange
            const rendered = await renderToggle({ initialTheme: THEME.LIGHT, isAuthenticated: false });
            const toggle = rendered.getByRole("switch", { name: "Toggle dark mode" });

            // Act
            await toggle.click();

            // Assert
            await expect.element(toggle).toHaveAttribute("aria-checked", "true");
            expect(document.documentElement.classList.contains("dark")).toBe(true);
            expect(document.cookie).toContain("theme=DARK");
        });
    },
});
