import { expect, test, type Page } from "@playwright/test";
import { SignJWT } from "jose";

import { createFixtureAccount, type FixtureAccount } from "./fixtures";
import { E2E_CONFIG } from "./test-env";
import { ROUTE } from "../src/lib/core/routing/routes";
import { THEME } from "../src/lib/core/theme/theme";

const SESSION_COOKIE_NAME = "session";
const PROTECTED_HEADING = "Boards";

const signIn = async ({ page, account }: { page: Page; account: FixtureAccount }): Promise<void> => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
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

    test("redirects a signed-in visitor away from the sign-in route to the board list", async ({ page, request }) => {
        const account = await createFixtureAccount(request);
        await signIn({ page, account });

        await page.goto(ROUTE.SIGN_IN);

        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
    });

    test("treats a tampered session cookie exactly as unauthenticated", async ({ page, context, request }) => {
        const account = await createFixtureAccount(request);
        await signIn({ page, account });

        const cookies = await context.cookies();
        const sessionCookie = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);
        if (!sessionCookie) {
            throw new Error("expected a session cookie to exist after signing in");
        }

        await context.addCookies([{ ...sessionCookie, value: `${sessionCookie.value}tampered` }]);

        await page.goto(ROUTE.BOARDS);

        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
    });

    test("treats an expired session cookie exactly as unauthenticated", async ({ page, context, request }) => {
        const account = await createFixtureAccount(request);
        await signIn({ page, account });

        const cookies = await context.cookies();
        const sessionCookie = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);
        if (!sessionCookie) {
            throw new Error("expected a session cookie to exist after signing in");
        }

        const key = new TextEncoder().encode(E2E_CONFIG.SESSION_SECRET);
        const nowSeconds = Math.floor(Date.now() / 1000);
        const expiredToken = await new SignJWT({
            id: account.id,
            email: account.email,
            displayName: account.displayName,
            theme: THEME.LIGHT,
            jsessionId: "forged-e2e-jsessionid-does-not-matter",
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
