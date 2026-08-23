import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./theme-toggle.stories";

const { Light, Dark, SaveFailed, Unauthenticated } = composeStories(stories);

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. The theme
 * toggle has no viewport-conditional behavior of its own.
 */
describeForEachDevice({
    name: "ThemeToggle",
    body: () => {
        /*
         * File-local: these two are real cross-test state this component writes, unlike the
         * centralized body-wipe hook (D-04) which does not cover them.
         */
        afterEach(() => {
            document.documentElement.classList.remove("dark");
            document.cookie = "theme=; path=/; max-age=0";
        });

        // Shallow: accessible name, checked state, failure copy — asserted through composed stories (D-08).
        it("is found by role switch with the accessible name", async () => {
            // Act
            await render(<Light />);

            // Assert
            expect(screen.getByRole("switch", { name: "Toggle dark mode" })).toBeInTheDocument();
        });

        it("renders unchecked for the light theme, driven by initialTheme", async () => {
            // Act
            await render(<Light />);

            // Assert
            expect(screen.getByRole("switch", { name: "Toggle dark mode" })).toHaveAttribute("aria-checked", "false");
        });

        it("renders checked for the dark theme, driven by initialTheme", async () => {
            // Act
            await render(<Dark />);

            // Assert
            expect(screen.getByRole("switch", { name: "Toggle dark mode" })).toHaveAttribute("aria-checked", "true");
        });

        it("renders the authored failure copy when the save mutation is staged as failed", async () => {
            // Act
            await render(<SaveFailed />);

            // Assert
            expect(screen.getByRole("status")).toHaveTextContent("Couldn't save your theme. Try again.");
        });

        // Deep: real interaction and the live region's own empty-state shape — direct renders.
        it("renders a live region even with no message, giving assistive tech a stable node to watch", async () => {
            // Arrange
            const rendered = await render(<Light />);

            // Assert
            await expect.element(rendered.getByRole("status")).toHaveTextContent("");
        });

        it("toggles the interface on click and settles with no message on success", async () => {
            // Arrange
            const rendered = await render(<Light />);
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
            const rendered = await render(<Light />);
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
            const rendered = await render(<Light />);
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
            const rendered = await render(<Unauthenticated />);
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
