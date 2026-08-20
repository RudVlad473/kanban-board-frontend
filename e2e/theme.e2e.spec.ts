import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { ROUTE } from "../src/lib/core/routing/routes";
import { THEME, type Theme } from "../src/lib/core/theme/theme";

const TOGGLE_NAME = "Toggle dark mode";
const PROTECTED_HEADING = "Boards";

/*
 * Matches the backend's password rule (`e2e/fixtures.ts`'s `FIXTURE_PASSWORD` comment) and the
 * display-name rule (letters and spaces only, per `auth.e2e.spec.ts`'s AUTH-01 test).
 */
const ACCOUNT_PASSWORD = "E2eThemePwd1!";
const ACCOUNT_DISPLAY_NAME = "Theme Fixture Tester";

const readBodyBackgroundColor = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

const isDarkScopeApplied = (html: string) => /<html[^>]*\bclass="[^"]*\bdark\b[^"]*"/.test(html);

/*
 * `page.waitForLoadState("networkidle")` resolves before the theme cookie the Server Action sets
 * is actually visible on `document.cookie` — verified directly while writing this test (the
 * cookie read empty immediately after "networkidle" and was present ~1.5s later). Polling for the
 * cookie itself is the actual condition every downstream assertion in this file depends on, not a
 * proxy for it.
 */
const waitForThemeCookie = ({ page, theme }: { page: Page; theme: Theme }) =>
    expect.poll(() => page.evaluate(() => document.cookie)).toContain(`theme=${theme}`);

/*
 * ROADMAP Success Criterion 4 / THEME-01, proven end to end against the real, built application —
 * a single continuous scenario, not four independent tests, and driving the real sign-up form
 * (not `e2e/fixtures.ts`'s `createFixtureAccount`) rather than a plan-literal reading of "create
 * an account with createFixtureAccount": `createFixtureAccount`'s own raw `POST /signup` call
 * establishes a real upstream session exactly like a form-driven sign-up does (verified directly
 * against the live backend while writing this test), so calling it AND then signing in twice more
 * below (sign-in, sign-out, sign-in again) would need a *third* live session on one account — one
 * more than the backend's own two-concurrent-session cap allows (`e2e/fixtures.ts`'s doc comment;
 * `kanban-board-backend/docs/AUTH_FLOWS.md`, "What will break your E2E suite"), and the second
 * sign-in was refused with the same indistinguishable 401 a wrong password produces when this was
 * first written and run against the real backend. Signing up through the browser form instead
 * (mirroring `auth.e2e.spec.ts`'s own AUTH-01 test, which drives the same form for the same
 * reason) establishes exactly one session at sign-up, leaving exactly one more for the explicit
 * sign-in after sign-out below — precisely the two-session budget, no more. Do not "simplify" this
 * back to `createFixtureAccount`, and do not split this test or add a second test that reuses this
 * account (signing in a third time on it is refused identically to a wrong password).
 */
test.describe("THEME-01: theme persistence", () => {
    test("toggles, persists across a reload, persists across sign-out and sign-in, and toggles back", async ({
        page,
    }) => {
        const email = `e2e-theme-${randomUUID()}@example.com`;

        // Sign up through the real form — this is the account's first (of two) live sessions.
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

        /*
         * Scenario 1 — toggling changes the document root scope and a visible surface colour, not
         * just an inert class: asserting only the class would still pass even if the design
         * tokens were never actually wired to it.
         */
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-checked", initialChecked === "true" ? "false" : "true");
        const toggledColor = await readBodyBackgroundColor(page);
        expect(toggledColor).not.toBe(initialColor);
        await waitForThemeCookie({ page, theme: toggledTheme });

        /*
         * Scenario 2 — the toggled theme survives a full reload, and is present in the server's
         * own HTML response before any script runs, not applied after load.
         */
        const reloadResponse = await page.reload();
        if (!reloadResponse) {
            throw new Error("expected page.reload() to return a Response");
        }
        const html = await reloadResponse.text();
        expect(isDarkScopeApplied(html)).toBe(toggledTheme === THEME.DARK);
        await expect(toggle).toHaveAttribute("aria-checked", initialChecked === "true" ? "false" : "true");

        /*
         * Scenario 3 — the tightest step in this file (see the file-level comment above): sign
         * out, then sign back in as the same account (session 2 of 2), and confirm the toggled
         * theme is still the one stored against the account, not reset to a default.
         */
        await page.getByRole("button", { name: "Sign Out" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));

        await page.getByLabel("Email", { exact: true }).fill(email);
        await page.getByLabel("Password", { exact: true }).fill(ACCOUNT_PASSWORD);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
        await expect(page.getByRole("heading", { name: PROTECTED_HEADING })).toBeVisible();

        const toggleAfterSignIn = page.getByRole("switch", { name: TOGGLE_NAME });
        await expect(toggleAfterSignIn).toHaveAttribute("aria-checked", initialChecked === "true" ? "false" : "true");

        /*
         * Scenario 4 — toggling back returns both the interface and the persisted preference to
         * where they started. No further sign-in is needed (still within the sign-in from
         * Scenario 3), so this stays inside the two-session budget.
         */
        const originalTheme: Theme = toggledTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK;
        await toggleAfterSignIn.click();
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
