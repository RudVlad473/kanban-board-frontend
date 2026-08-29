import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { seedAccount } from "./seed";
import { registerSignedUpUser } from "./signed-up-user";
import { E2E_CONFIG } from "./test-env";
import { EXTERNAL_PATH } from "../src/lib/core/api-contract/external-paths";
import { ROUTE } from "../src/lib/core/routing/routes";
import { isTheme, THEME, type Theme } from "../src/lib/core/theme/theme";
import { recordSeededUserId, SEED_SCOPE } from "../src/test-utils/seeded-user-registry";

const TOGGLE_NAME = "Toggle dark mode";
/* The sidebar landmark, not the old `/boards` placeholder heading plan 02-11 replaced with D-10's empty state. */
const PROTECTED_LANDMARK = "Boards";

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

/**
 * Signs up directly against the real backend, capturing the assigned theme `seedAccount()`'s
 * script (D-07) doesn't return — a pre-mutation baseline for THEME-03's untouched account.
 */
const signUpDirectCapturingTheme = async (): Promise<{ email: string; password: string; theme: Theme }> => {
    const email = `e2e-theme-cross-${randomUUID()}@example.com`;
    const response = await fetch(`${E2E_CONFIG.EXTERNAL_API_BASE_URL}${EXTERNAL_PATH.SIGN_UP}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: ACCOUNT_PASSWORD, displayName: ACCOUNT_DISPLAY_NAME }),
    });
    const identity = (await response.json()) as { id?: unknown; theme?: unknown };
    const theme = typeof identity.theme === "string" ? identity.theme : undefined;
    if (!response.ok || !isTheme(theme) || typeof identity.id !== "string") {
        throw new Error(
            `signUpDirectCapturingTheme: expected an id/theme-carrying signup response, got: ${String(theme)}`,
        );
    }
    recordSeededUserId({ scope: SEED_SCOPE.PLAYWRIGHT, id: identity.id });
    return { email, password: ACCOUNT_PASSWORD, theme };
};

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
        await registerSignedUpUser(page);

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
        await expect(page.getByRole("navigation", { name: PROTECTED_LANDMARK })).toBeVisible();
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

/*
 * THEME-02: ledger row 2 — an unauthenticated toggle updates the cookie/document scope
 * client-side (useThemePreference's `isAuthenticated` branch) and never calls
 * `updateThemeAction`, so a real signed-in account's own stored preference stays untouched.
 */
test.describe("THEME-02: unauthenticated toggle writes only the client-side cookie", () => {
    test("leaves the signed-in account's stored theme preference untouched", async ({ page }) => {
        // Arrange — a fresh account via sign-up (session slot 1 of 2).
        const email = `e2e-theme-unauth-${randomUUID()}@example.com`;
        await page.goto(ROUTE.SIGN_UP);
        await page.getByLabel("Email", { exact: true }).fill(email);
        await page.getByLabel("Name", { exact: true }).fill(ACCOUNT_DISPLAY_NAME);
        await page.getByLabel("Password", { exact: true }).fill(ACCOUNT_PASSWORD);
        await page.getByRole("button", { name: "Create Account" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        const initialChecked = await page.getByRole("switch", { name: TOGGLE_NAME }).getAttribute("aria-checked");

        /*
         * Act — sign out (this app's sign-out never calls the backend, so no session slot is
         * freed or spent) then toggle while unauthenticated: `AuthLayout` renders with
         * `isAuthenticated={false}`, so this click only writes a client-side cookie.
         */
        await page.getByRole("button", { name: "Sign Out" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
        const unauthToggle = page.getByRole("switch", { name: TOGGLE_NAME });
        await expect(unauthToggle).toHaveAttribute("aria-checked", "false");
        await unauthToggle.click();
        await waitForThemeCookie({ page, theme: THEME.DARK });

        // Act — sign back in (session slot 2 of 2) as the same account.
        await page.getByLabel("Email", { exact: true }).fill(email);
        await page.getByLabel("Password", { exact: true }).fill(ACCOUNT_PASSWORD);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        /*
         * Assert — sign-in always overwrites the theme cookie from the account's own stored value
         * (sign-in.ts). Seeing the ORIGINAL state here, not the unauthenticated toggle's DARK
         * value, proves that toggle never reached the backend.
         */
        await expect(page.getByRole("switch", { name: TOGGLE_NAME })).toHaveAttribute(
            "aria-checked",
            initialChecked ?? "false",
        );
    });
});

/*
 * THEME-03: ledger row 4 — the update-theme action derives its userId from the session, so
 * toggling one account's theme never writes another account's stored preference.
 */
test.describe("THEME-03: cross-account isolation", () => {
    test("toggling one account's theme leaves a second account's stored preference untouched", async ({ page }) => {
        /*
         * Arrange — two real accounts; account B's own default theme is captured at creation,
         * since seedAccount() (D-07) doesn't return it and this test needs a pre-mutation baseline.
         */
        const accountA = seedAccount();
        const accountB = await signUpDirectCapturingTheme();

        // Act — sign in as A (session slot 2 of 2) and toggle its theme.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(accountA.email);
        await page.getByLabel("Password", { exact: true }).fill(accountA.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
        const aInitialChecked = await page.getByRole("switch", { name: TOGGLE_NAME }).getAttribute("aria-checked");
        await page.getByRole("switch", { name: TOGGLE_NAME }).click();
        const aToggledTheme: Theme = aInitialChecked === "true" ? THEME.LIGHT : THEME.DARK;
        await waitForThemeCookie({ page, theme: aToggledTheme });
        await page.getByRole("button", { name: "Sign Out" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));

        // Act — sign in as B (session slot 2 of 2, its only UI sign-in).
        await page.getByLabel("Email", { exact: true }).fill(accountB.email);
        await page.getByLabel("Password", { exact: true }).fill(accountB.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        // Assert — B's toggle state is still B's own pre-mutation default, unaffected by A's write.
        await expect(page.getByRole("switch", { name: TOGGLE_NAME })).toHaveAttribute(
            "aria-checked",
            accountB.theme === THEME.DARK ? "true" : "false",
        );
        await waitForThemeCookie({ page, theme: accountB.theme });
    });
});
