import { expect, test, type Page } from "@playwright/test";
import { SignJWT } from "jose";

import { E2E_SESSION_SECRET } from "./test-env";
import { ROUTE } from "../src/lib/routes";

const SESSION_COOKIE_NAME = "session";
const PROTECTED_HEADING = "Boards";

/*
 * Interim literals — Task 1 (01-30-PLAN.md) deletes the mock backend this suite previously
 * imported a seeded demo account from; Task 3 replaces every use below with a throwaway account
 * this suite creates itself against the real nonprod backend (`e2e/fixtures.ts`). Kept here only
 * so this file still type-checks and the plan's other two tasks can be verified independently —
 * this suite is knowingly red until Task 3 lands.
 */
const DEMO_USER_EMAIL = "demo@kanban-board.dev";
const DEMO_USER_DISPLAY_NAME = "Demo User";
const DEMO_USER_PASSWORD = "DemoPassword123!";

const signIn = async (page: Page): Promise<void> => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(DEMO_USER_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(DEMO_USER_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
};

test.describe("AUTH-03: route guard", () => {
    test("redirects an unauthenticated visitor away from the board list and never paints it", async ({ page }) => {
        await page.goto(ROUTE.BOARDS);

        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
        /*
         * Assert on the absence of the content, not only the destination — the destination alone
         * does not prove nothing was painted first.
         */
        await expect(page.getByRole("heading", { name: PROTECTED_HEADING })).toHaveCount(0);
    });

    test("redirects an unauthenticated visitor away from a board detail path, covering the /boards prefix", async ({
        page,
    }) => {
        await page.goto(`${ROUTE.BOARDS}/some-board-id`);

        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
        await expect(page.getByRole("heading", { name: PROTECTED_HEADING })).toHaveCount(0);
        await expect(page.getByRole("heading", { name: "Board", exact: true })).toHaveCount(0);
    });

    test("redirects a signed-in visitor away from the sign-in route to the board list", async ({ page }) => {
        await signIn(page);

        await page.goto(ROUTE.SIGN_IN);

        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
    });

    test("treats a tampered session cookie exactly as unauthenticated", async ({ page, context }) => {
        await signIn(page);

        const cookies = await context.cookies();
        const sessionCookie = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);
        if (!sessionCookie) {
            throw new Error("expected a session cookie to exist after signing in");
        }

        await context.addCookies([{ ...sessionCookie, value: `${sessionCookie.value}tampered` }]);

        await page.goto(ROUTE.BOARDS);

        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
    });

    test("treats an expired session cookie exactly as unauthenticated", async ({ page, context }) => {
        await signIn(page);

        const cookies = await context.cookies();
        const sessionCookie = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);
        if (!sessionCookie) {
            throw new Error("expected a session cookie to exist after signing in");
        }

        const key = new TextEncoder().encode(E2E_SESSION_SECRET);
        const nowSeconds = Math.floor(Date.now() / 1000);
        const expiredToken = await new SignJWT({
            id: "expired-session-user",
            email: DEMO_USER_EMAIL,
            displayName: DEMO_USER_DISPLAY_NAME,
            theme: "LIGHT",
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt(nowSeconds - 60 * 60 * 24 * 8)
            .setExpirationTime(nowSeconds - 60)
            .sign(key);

        await context.addCookies([{ ...sessionCookie, value: expiredToken }]);

        await page.goto(ROUTE.BOARDS);

        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
    });
});
