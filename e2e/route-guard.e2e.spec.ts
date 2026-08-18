import { expect, test, type Page } from "@playwright/test";
import { SignJWT } from "jose";

import { E2E_SESSION_SECRET } from "./test-env";
import { DEMO_USER_DISPLAY_NAME, DEMO_USER_EMAIL, DEMO_USER_PASSWORD } from "../src/lib/mocks/store";
import { ROUTE } from "../src/lib/routes";

const SESSION_COOKIE_NAME = "session";
const PROTECTED_HEADING = "Boards";

const signIn = async (page: Page): Promise<void> => {
    await page.goto("/login");
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

        await page.goto("/login");

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
