import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { ROUTE } from "../src/lib/core/routing/routes";
import { THEME, type Theme } from "../src/lib/core/theme/theme";

const TOGGLE_NAME = "Toggle dark mode";
const PROTECTED_HEADING = "Boards";

// Matches the backend's password/display-name rules (e2e/seed.sh's SEED_PASSWORD comment).
const ACCOUNT_PASSWORD = "E2eThemePwd1!";
const ACCOUNT_DISPLAY_NAME = "Theme Fixture Tester";

const readBodyBackgroundColor = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

const isDarkScopeApplied = (html: string) => /<html[^>]*\bclass="[^"]*\bdark\b[^"]*"/.test(html);

/*
 * The theme cookie lags `page.waitForLoadState("networkidle")` by ~1.5s (verified directly) —
 * polling it is the actual condition every downstream assertion in this file depends on.
 */
const waitForThemeCookie = ({ page, theme }: { page: Page; theme: Theme }) =>
    expect.poll(() => page.evaluate(() => document.cookie)).toContain(`theme=${theme}`);

/*
 * THEME-01, one continuous scenario rather than four independent tests: driving the real sign-up
 * form (not `e2e/seed.ts`'s `seedAccount`) keeps this account within the backend's two-concurrent-
 * session cap across sign-up plus one later sign-in. See docs/adr/tech/0022 for the full reasoning.
 */
test.describe("THEME-01: theme persistence", () => {
    test("toggles, persists across a reload, persists across sign-out and sign-in, and toggles back", async ({
        page,
    }) => {
        // Arrange
        const email = `e2e-theme-${randomUUID()}@example.com`;
        await page.goto(ROUTE.SIGN_UP);
        await page.getByLabel("Email", { exact: true }).fill(email);
        await page.getByLabel("Name", { exact: true }).fill(ACCOUNT_DISPLAY_NAME);
        await page.getByLabel("Password", { exact: true }).fill(ACCOUNT_PASSWORD);
        await page.getByRole("button", { name: "Create Account" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        const toggle = page.getByRole("switch", { name: TOGGLE_NAME });
        const initialChecked = await toggle.getAttribute("aria-checked");
        const initialColor = await readBodyBackgroundColor(page);
        const toggledTheme: Theme = initialChecked === "true" ? THEME.LIGHT : THEME.DARK;

        // Act
        await toggle.click();

        // Assert — toggling changes the toggle state, a visible surface colour, and the cookie.
        await expect(toggle).toHaveAttribute("aria-checked", initialChecked === "true" ? "false" : "true");
        const toggledColor = await readBodyBackgroundColor(page);
        expect(toggledColor).not.toBe(initialColor);
        await waitForThemeCookie({ page, theme: toggledTheme });

        // Act
        const reloadResponse = await page.reload();
        if (!reloadResponse) {
            throw new Error("expected page.reload() to return a Response");
        }

        // Assert — the toggled theme survives the reload, present in the server's own HTML.
        const html = await reloadResponse.text();
        expect(isDarkScopeApplied(html)).toBe(toggledTheme === THEME.DARK);
        await expect(toggle).toHaveAttribute("aria-checked", initialChecked === "true" ? "false" : "true");

        // Act
        await page.getByRole("button", { name: "Sign Out" }).click();

        // Assert — redirected to sign-in, and the theme cookie is cleared alongside the session.
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
        await expect.poll(() => page.evaluate(() => document.cookie)).not.toContain("theme=");

        // Act — sign back in as the same account (session 2 of 2).
        await page.getByLabel("Email", { exact: true }).fill(email);
        await page.getByLabel("Password", { exact: true }).fill(ACCOUNT_PASSWORD);
        await page.getByRole("button", { name: "Sign In" }).click();

        // Assert — the toggled theme is still the one stored against the account, not reset.
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
        await expect(page.getByRole("heading", { name: PROTECTED_HEADING })).toBeVisible();
        const toggleAfterSignIn = page.getByRole("switch", { name: TOGGLE_NAME });
        await expect(toggleAfterSignIn).toHaveAttribute("aria-checked", initialChecked === "true" ? "false" : "true");
        await waitForThemeCookie({ page, theme: toggledTheme });
        const postSignInReloadResponse = await page.reload();
        if (!postSignInReloadResponse) {
            throw new Error("expected page.reload() to return a Response");
        }
        const postSignInHtml = await postSignInReloadResponse.text();
        expect(isDarkScopeApplied(postSignInHtml)).toBe(toggledTheme === THEME.DARK);

        // Act — toggle back (still inside the sign-in above; no further session spent).
        const originalTheme: Theme = toggledTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK;
        await toggleAfterSignIn.click();

        // Assert — both the interface and the persisted preference return to where they started.
        await expect(toggleAfterSignIn).toHaveAttribute("aria-checked", initialChecked ?? "false");
        const finalColor = await readBodyBackgroundColor(page);
        expect(finalColor).toBe(initialColor);
        await waitForThemeCookie({ page, theme: originalTheme });
        const finalReloadResponse = await page.reload();
        if (!finalReloadResponse) {
            throw new Error("expected page.reload() to return a Response");
        }
        const finalHtml = await finalReloadResponse.text();
        expect(isDarkScopeApplied(finalHtml)).toBe(originalTheme === THEME.DARK);
    });
});
