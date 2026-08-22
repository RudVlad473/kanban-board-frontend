import { expect, test, type Page } from "@playwright/test";

import { seedAccount } from "./seed";
import { COOKIE, THEME_COOKIE_MAX_AGE_SECONDS } from "../src/lib/core/cookies/cookie-registry";
import { ROUTE } from "../src/lib/core/routing/routes";
import { THEME } from "../src/lib/core/theme/theme";

const TOGGLE_NAME = "Toggle dark mode";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // seven days, mirrors session.ts's own constant

/*
 * Lifetime-assertion tolerances (RESEARCH.md Pattern 4) — distinguish "one year" from "seven
 * days", not measure clock skew: a day for the year-long cookie, an hour for the week-long one.
 */
const THEME_LIFETIME_TOLERANCE_SECONDS = 60 * 60 * 24;
const SESSION_LIFETIME_TOLERANCE_SECONDS = 60 * 60;

const signInViaUi = async ({
    page,
    email,
    password,
}: {
    page: Page;
    email: string;
    password: string;
}): Promise<void> => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
};

const isDarkScopeApplied = (html: string) => /<html[^>]*\bclass="[^"]*\bdark\b[^"]*"/.test(html);

/*
 * The theme cookie lags `networkidle` by ~1.5s (documented in theme.e2e.spec.ts, verified
 * directly there) — polling it avoids a race between the toggle click and the cookie write.
 */
const waitForThemeCookieValue = ({ page, value }: { page: Page; value: string }) =>
    expect.poll(() => page.evaluate(() => document.cookie)).toContain(`${COOKIE.THEME}=${value}`);

test.describe("COOKIE-01: default scope with no theme cookie", () => {
    test("renders the default (light) document scope in a fresh context", async ({ page, context }) => {
        // Arrange — a brand-new context has no theme cookie at all.

        // Act
        const response = await page.goto(ROUTE.SIGN_IN);
        if (!response) {
            throw new Error("expected page.goto() to return a Response");
        }

        // Assert
        const html = await response.text();
        expect(isDarkScopeApplied(html)).toBe(false);
        const cookies = await context.cookies();
        expect(cookies.find((cookie) => cookie.name === COOKIE.THEME)).toBeUndefined();
    });
});

test.describe("COOKIE-02: real theme cookie attributes", () => {
    test("sets a non-httpOnly, Lax, root-path theme cookie with a roughly one-year lifetime", async ({
        page,
        context,
    }) => {
        // Arrange
        const account = seedAccount();
        await signInViaUi({ page, email: account.email, password: account.password });

        // Act
        await page.getByRole("switch", { name: TOGGLE_NAME }).click();
        await waitForThemeCookieValue({ page, value: THEME.LIGHT });
        await waitForThemeCookieValue({ page, value: THEME.DARK });

        // Assert
        const cookies = await context.cookies();
        const themeCookie = cookies.find((cookie) => cookie.name === COOKIE.THEME);
        if (!themeCookie) {
            throw new Error("expected a theme cookie to exist after toggling");
        }
        expect([THEME.LIGHT, THEME.DARK]).toContain(themeCookie.value);
        expect(themeCookie.httpOnly).toBe(false);
        expect(themeCookie.sameSite).toBe("Lax");
        expect(themeCookie.path).toBe("/");

        const nowSeconds = Math.floor(Date.now() / 1000);
        expect(themeCookie.expires - nowSeconds).toBeGreaterThan(
            THEME_COOKIE_MAX_AGE_SECONDS - THEME_LIFETIME_TOLERANCE_SECONDS,
        );
        expect(themeCookie.expires - nowSeconds).toBeLessThan(
            THEME_COOKIE_MAX_AGE_SECONDS + THEME_LIFETIME_TOLERANCE_SECONDS,
        );
    });
});

test.describe("COOKIE-03: session-vs-theme lifetime isolation", () => {
    test("the session cookie keeps its own ~7-day expiry, unaffected by the theme cookie's ~1-year one", async ({
        page,
        context,
    }) => {
        // Arrange
        const account = seedAccount();
        await signInViaUi({ page, email: account.email, password: account.password });

        /*
         * Act — toggling the theme writes a per-call `expires` override on the SESSION cookie's
         * own write path only if the two clients leaked into each other; they must not.
         */
        await page.getByRole("switch", { name: TOGGLE_NAME }).click();
        await waitForThemeCookieValue({ page, value: THEME.LIGHT });
        await waitForThemeCookieValue({ page, value: THEME.DARK });

        // Assert
        const cookies = await context.cookies();
        const sessionCookie = cookies.find((cookie) => cookie.name === COOKIE.SESSION);
        if (!sessionCookie) {
            throw new Error("expected a session cookie to exist after signing in");
        }
        expect(sessionCookie.httpOnly).toBe(true);
        expect(sessionCookie.secure).toBe(true);
        expect(sessionCookie.sameSite).toBe("Lax");
        expect(sessionCookie.path).toBe("/");

        const nowSeconds = Math.floor(Date.now() / 1000);
        expect(sessionCookie.expires - nowSeconds).toBeGreaterThan(
            SESSION_DURATION_SECONDS - SESSION_LIFETIME_TOLERANCE_SECONDS,
        );
        expect(sessionCookie.expires - nowSeconds).toBeLessThan(
            SESSION_DURATION_SECONDS + SESSION_LIFETIME_TOLERANCE_SECONDS,
        );
    });
});

test.describe("COOKIE-04: cross-client value isolation across a toggle", () => {
    test("toggling the theme leaves the session cookie's value byte-identical", async ({ page, context }) => {
        // Arrange
        const account = seedAccount();
        await signInViaUi({ page, email: account.email, password: account.password });
        const cookiesBefore = await context.cookies();
        const sessionCookieBefore = cookiesBefore.find((cookie) => cookie.name === COOKIE.SESSION);
        if (!sessionCookieBefore) {
            throw new Error("expected a session cookie to exist after signing in");
        }

        // Act
        await page.getByRole("switch", { name: TOGGLE_NAME }).click();
        await waitForThemeCookieValue({ page, value: THEME.LIGHT });
        await waitForThemeCookieValue({ page, value: THEME.DARK });

        // Assert
        const cookiesAfter = await context.cookies();
        const sessionCookieAfter = cookiesAfter.find((cookie) => cookie.name === COOKIE.SESSION);
        expect(sessionCookieAfter?.value).toBe(sessionCookieBefore.value);
    });
});

test.describe("COOKIE-05: tampered theme cookie values are ignored", () => {
    const tamperedValues = ["purple", "dark", ""];

    for (const tamperedValue of tamperedValues) {
        test(`a theme cookie value of ${JSON.stringify(tamperedValue)} renders the default scope, no error page`, async ({
            page,
            context,
        }) => {
            /*
             * Arrange — the unauthenticated toggle (AuthLayout) writes a real client-side cookie,
             * establishing a genuine domain/path to spread (RESEARCH.md Security Domain: a
             * hand-built domain/path risks a false-negative "rejection" — cookie never sent).
             */
            await page.goto(ROUTE.SIGN_IN);
            await page.getByRole("switch", { name: TOGGLE_NAME }).click();
            await waitForThemeCookieValue({ page, value: THEME.DARK });
            const realCookies = await context.cookies();
            const realThemeCookie = realCookies.find((cookie) => cookie.name === COOKIE.THEME);
            if (!realThemeCookie) {
                throw new Error("expected a real theme cookie to exist after toggling while unauthenticated");
            }

            // Act
            await context.addCookies([{ ...realThemeCookie, value: tamperedValue }]);
            const response = await page.goto(ROUTE.SIGN_IN);
            if (!response) {
                throw new Error("expected page.goto() to return a Response");
            }

            // Assert
            const html = await response.text();
            expect(isDarkScopeApplied(html)).toBe(false);
            await expect(page.getByRole("heading", { name: "Something went wrong" })).toHaveCount(0);
        });
    }
});
