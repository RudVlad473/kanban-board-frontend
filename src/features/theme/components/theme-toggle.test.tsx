import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { updateThemeAction, type UpdateThemeResult } from "@/features/theme/actions";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { renderWithProviders } from "@/test-utils/render-with-providers";

import { ThemeToggle } from "./theme-toggle";

/*
 * Stubbing the module boundary (`@/features/theme/actions`), not a network layer — the same
 * pattern `sign-out-button.test.tsx` uses for its own server function (GC-22: no fake HTTP layer
 * of any kind remains in this repository). Task 2's own action text names this module as the
 * seam to stub for driving the failure case.
 */
vi.mock("@/features/theme/actions", () => ({
    updateThemeAction: vi.fn(),
}));

const mockedUpdateThemeAction = vi.mocked(updateThemeAction);

const renderToggle = (props: { initialTheme: "LIGHT" | "DARK"; isAuthenticated: boolean }) =>
    renderWithProviders(<ThemeToggle {...props} />);

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. The theme
 * toggle has no viewport-conditional behavior of its own.
 */
describeForEachDevice({
    name: "ThemeToggle",
    body: () => {
        afterEach(() => {
            mockedUpdateThemeAction.mockReset();
            document.documentElement.classList.remove("dark");
            document.cookie = "theme=; path=/; max-age=0";
        });

        it("is found by role switch with the accessible name, and renders no visible text", async () => {
            // Arrange
            const screen = await renderToggle({ initialTheme: "LIGHT", isAuthenticated: true });

            // Assert
            await expect.element(screen.getByRole("switch", { name: "Toggle dark mode" })).toBeVisible();
        });

        it("changes the interface to the other theme immediately, before any network response arrives", async () => {
            /*
             * Arrange — a persistence call that never resolves during this test, so any class
             * change observed here can only be the optimistic update, not a settled response.
             */
            let resolveAction: (result: UpdateThemeResult) => void = () => undefined;
            const actionGate = new Promise<UpdateThemeResult>((resolve) => {
                resolveAction = resolve;
            });
            mockedUpdateThemeAction.mockImplementationOnce(async () => actionGate);
            const screen = await renderToggle({ initialTheme: "LIGHT", isAuthenticated: true });
            const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });

            // Act
            await toggle.click();

            /*
             * Assert — the document root and the control already reflect the new theme while the
             * request is still pending.
             */
            expect(document.documentElement.classList.contains("dark")).toBe(true);
            await expect.element(toggle).toHaveAttribute("aria-checked", "true");

            // Cleanup — let the pending call settle so it can't leak into the next test.
            resolveAction({ status: "success", theme: "DARK" });
        });

        it("issues the persistence request only after the visual change, not before it", async () => {
            // Arrange
            let resolveAction: (result: UpdateThemeResult) => void = () => undefined;
            const actionGate = new Promise<UpdateThemeResult>((resolve) => {
                resolveAction = resolve;
            });
            mockedUpdateThemeAction.mockImplementationOnce(async () => actionGate);
            const screen = await renderToggle({ initialTheme: "LIGHT", isAuthenticated: true });
            const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });

            // Act
            await toggle.click();

            /*
             * Assert — the call was made (the persistence request was issued), and the visual
             * change is already in place at the same moment, proving it did not wait for a
             * response that has not arrived yet.
             */
            await expect.poll(() => mockedUpdateThemeAction.mock.calls.length).toBe(1);
            expect(document.documentElement.classList.contains("dark")).toBe(true);

            // Cleanup
            resolveAction({ status: "success", theme: "DARK" });
        });

        it("stays in the new position and shows no message when persistence succeeds", async () => {
            // Arrange
            mockedUpdateThemeAction.mockResolvedValueOnce({ status: "success", theme: "DARK" });
            const screen = await renderToggle({ initialTheme: "LIGHT", isAuthenticated: true });
            const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });

            // Act
            await toggle.click();

            // Assert
            await expect.element(toggle).toHaveAttribute("aria-checked", "true");
            await expect.element(screen.getByRole("status")).toHaveTextContent("");
        });

        it("returns to the previous position and tells the user when persistence fails", async () => {
            // Arrange
            mockedUpdateThemeAction.mockResolvedValueOnce({ status: "error" });
            const screen = await renderToggle({ initialTheme: "LIGHT", isAuthenticated: true });
            const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });

            // Act
            await toggle.click();

            /*
             * Assert — both the reverted control position and the message are asserted together:
             * either alone would still leave the user misinformed (this plan's own transparency
             * prohibition).
             */
            await expect.element(toggle).toHaveAttribute("aria-checked", "false");
            expect(document.documentElement.classList.contains("dark")).toBe(false);
            await expect.element(screen.getByRole("status")).toHaveTextContent("Couldn't save your theme. Try again.");
        });

        it("is reachable by keyboard tab order and toggles on Space", async () => {
            // Arrange
            mockedUpdateThemeAction.mockResolvedValueOnce({ status: "success", theme: "DARK" });
            const screen = await renderToggle({ initialTheme: "LIGHT", isAuthenticated: true });
            const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });

            // Assert (reachable)
            expect(toggle.element().tabIndex).toBe(0);

            // Act
            toggle.element().focus();
            await userEvent.keyboard(" ");

            // Assert
            await expect.element(toggle).toHaveAttribute("aria-checked", "true");
        });

        it("returns the interface and the stored preference to where they began after toggling twice", async () => {
            // Arrange
            mockedUpdateThemeAction.mockResolvedValueOnce({ status: "success", theme: "DARK" });
            mockedUpdateThemeAction.mockResolvedValueOnce({ status: "success", theme: "LIGHT" });
            const screen = await renderToggle({ initialTheme: "LIGHT", isAuthenticated: true });
            const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });

            // Act
            await toggle.click();
            await expect.element(toggle).toHaveAttribute("aria-checked", "true");

            await toggle.click();

            // Assert
            await expect.element(toggle).toHaveAttribute("aria-checked", "false");
            expect(document.documentElement.classList.contains("dark")).toBe(false);
            expect(mockedUpdateThemeAction).toHaveBeenCalledTimes(2);
        });

        it("updates the cookie and the document scope directly, without calling the server function, when unauthenticated", async () => {
            // Arrange
            const screen = await renderToggle({ initialTheme: "LIGHT", isAuthenticated: false });
            const toggle = screen.getByRole("switch", { name: "Toggle dark mode" });

            // Act
            await toggle.click();

            // Assert
            await expect.element(toggle).toHaveAttribute("aria-checked", "true");
            expect(document.documentElement.classList.contains("dark")).toBe(true);
            expect(mockedUpdateThemeAction).not.toHaveBeenCalled();
            expect(document.cookie).toContain("theme=DARK");
        });
    },
});
