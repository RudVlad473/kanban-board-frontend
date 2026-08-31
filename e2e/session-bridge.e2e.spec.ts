import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { SignJWT } from "jose";

import { seedAccount } from "./seed";
import { signUpViaUi } from "./signed-up-user";
import { E2E_CONFIG } from "./test-env";
import { COOKIE } from "../src/lib/core/cookies/cookie-registry";
import { ROUTE } from "../src/lib/core/routing/routes";
import { THEME } from "../src/lib/core/theme/theme";

/* The sidebar landmark, not the old `/boards` placeholder heading plan 02-11 replaced with D-10's empty state. */
const PROTECTED_LANDMARK = "Boards";
const FRESH_PASSWORD = "SessionRotationPwd1!";

/*
 * SESSION-01's forged token carries a well-formed identity but a jsessionId no real backend
 * session will ever match — the middleware's forced-sign-out path (server-client.ts, T-01-52)
 * is what this test proves, not JWT rejection (route-guard.e2e.spec.ts already covers that).
 */
test.describe("SESSION-01: forced sign-out on a dead upstream credential", () => {
    test("redirects and renders no board content or raw upstream error text", async ({ page, context }) => {
        // Arrange
        const account = seedAccount();
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        const cookiesBeforeForge = await context.cookies();
        const realSessionCookie = cookiesBeforeForge.find((cookie) => cookie.name === COOKIE.SESSION);
        if (!realSessionCookie) {
            throw new Error("expected a session cookie to exist after signing in");
        }

        const key = new TextEncoder().encode(E2E_CONFIG.SESSION_SECRET);
        const forgedToken = await new SignJWT({
            id: account.id,
            email: account.email,
            displayName: account.displayName,
            theme: THEME.LIGHT,
            jsessionId: "forged-e2e-jsessionid-does-not-exist-upstream",
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(Math.floor(Date.now() / 1000) + 60 * 60)
            .sign(key);
        await context.addCookies([{ ...realSessionCookie, value: forgedToken }]);

        // Act
        await page.goto(ROUTE.BOARDS);

        // Assert — destination, content absence, cookie clearance and no leaked upstream error text.
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
        await expect(page.getByRole("navigation", { name: PROTECTED_LANDMARK })).toHaveCount(0);

        const bodyText = await page.textContent("body");
        expect(bodyText).not.toContain("UNAUTHENTICATED");

        const cookiesAfterForcedSignOut = await context.cookies();
        expect(cookiesAfterForcedSignOut.some((cookie) => cookie.name === COOKIE.SESSION)).toBe(false);
    });

    /*
     * Discrimination check performed once during this task, not a permanent third test — see
     * 02.2-08-SUMMARY.md's "Discrimination Check" section for both recorded observations
     * (wrong-secret local rejection vs. correct-secret real upstream refusal).
     */
});

test.describe("SESSION-02: session rotation across two real sign-ins", () => {
    test("produces a different session cookie value on a second sign-in for the same account", async ({
        page,
        context,
    }) => {
        /*
         * A UI sign-up (not seedAccount()) already consumes one of the backend's two concurrent-
         * session slots (SETUP.md) — seedAccount() plus two more UI sign-ins would exceed the cap.
         */
        // Arrange
        const freshEmail = `e2e-session-rotation-${randomUUID()}@example.com`;

        // Act — sign-up (backend session #1).
        await signUpViaUi({ page, email: freshEmail, password: FRESH_PASSWORD });

        const cookiesAfterFirst = await context.cookies();
        const firstSessionCookie = cookiesAfterFirst.find((cookie) => cookie.name === COOKIE.SESSION);
        if (!firstSessionCookie) {
            throw new Error("expected a session cookie to exist after sign-up");
        }

        // Act — sign out (local only), then sign in again (backend session #2).
        await page.getByRole("button", { name: "Sign Out" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));

        await page.getByLabel("Email", { exact: true }).fill(freshEmail);
        await page.getByLabel("Password", { exact: true }).fill(FRESH_PASSWORD);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        const cookiesAfterSecond = await context.cookies();
        const secondSessionCookie = cookiesAfterSecond.find((cookie) => cookie.name === COOKIE.SESSION);

        // Assert
        expect(secondSessionCookie).toBeDefined();
        expect(secondSessionCookie?.value).not.toBe(firstSessionCookie.value);
    });
});

test.describe("SESSION-03: force-sign-out route rejects non-same-origin requests (WR-01 CSRF guard)", () => {
    /*
     * `SameSite=Lax` (e2e/cookie-policy.e2e.spec.ts's COOKIE-03) still attaches the session cookie
     * to a top-level cross-site GET, so without the `Sec-Fetch-Site` check these cases prove, a
     * third-party link to this route could destroy any signed-in visitor's session (logout CSRF).
     */
    const signInViaUi = async ({ page, email, password }: { page: Page; email: string; password: string }) => {
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(email);
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
    };

    test("a cross-site Sec-Fetch-Site header is rejected and leaves the session cookie intact", async ({
        page,
        context,
    }) => {
        // Arrange
        const account = seedAccount();
        await signInViaUi({ page, email: account.email, password: account.password });

        /*
         * Act — a real cross-site top-level navigation carries `Sec-Fetch-Site: cross-site`, a
         * value the browser sets itself and no page can spoof.
         */
        const response = await context.request.get(`${E2E_CONFIG.BASE_URL}${ROUTE.FORCE_SIGN_OUT}`, {
            headers: { "sec-fetch-site": "cross-site" },
        });

        // Assert
        expect(response.status()).toBe(403);
        const cookiesAfter = await context.cookies();
        expect(cookiesAfter.some((cookie) => cookie.name === COOKIE.SESSION)).toBe(true);
    });

    test("a request with no Sec-Fetch-Site header at all fails closed and leaves the session cookie intact", async ({
        page,
        context,
    }) => {
        // Arrange
        const account = seedAccount();
        await signInViaUi({ page, email: account.email, password: account.password });

        /*
         * Act — Playwright's APIRequestContext sends no browser-navigation headers unless told
         * to, exercising the same "header absent" path an older/non-navigation client would hit.
         */
        const response = await context.request.get(`${E2E_CONFIG.BASE_URL}${ROUTE.FORCE_SIGN_OUT}`);

        // Assert
        expect(response.status()).toBe(403);
        const cookiesAfter = await context.cookies();
        expect(cookiesAfter.some((cookie) => cookie.name === COOKIE.SESSION)).toBe(true);
    });

    test("a same-origin Sec-Fetch-Site header still destroys the session cookie and redirects to sign-in", async ({
        page,
        context,
    }) => {
        // Arrange
        const account = seedAccount();
        await signInViaUi({ page, email: account.email, password: account.password });

        // Act — mirrors the browser navigation produced by server-client.ts's internal redirect().
        const response = await context.request.get(`${E2E_CONFIG.BASE_URL}${ROUTE.FORCE_SIGN_OUT}`, {
            headers: { "sec-fetch-site": "same-origin" },
        });

        // Assert
        expect(response.ok()).toBe(true);
        expect(new URL(response.url()).pathname).toBe(ROUTE.SIGN_IN);
        const cookiesAfter = await context.cookies();
        expect(cookiesAfter.some((cookie) => cookie.name === COOKIE.SESSION)).toBe(false);
    });
});
