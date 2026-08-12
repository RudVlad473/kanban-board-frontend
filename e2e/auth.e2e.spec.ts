import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { DEMO_USER_EMAIL, DEMO_USER_PASSWORD } from "../src/lib/mocks/store";
import { BOARDS_PATH, SIGN_IN_PATH } from "../src/lib/routes";

const SESSION_COOKIE_NAME = "session";
const FRESH_PASSWORD = "E2eFreshPassword123!";

test.describe("AUTH-01: sign up", () => {
    test("creates an account, lands on the board list, and sets an httpOnly session cookie", async ({
        page,
        context,
    }) => {
        const freshEmail = `e2e-${randomUUID()}@example.com`;

        await page.goto("/register");
        await page.getByLabel("Email", { exact: true }).fill(freshEmail);
        await page.getByLabel("Name", { exact: true }).fill("E2E Tester");
        await page.getByLabel("Password", { exact: true }).fill(FRESH_PASSWORD);
        await page.getByRole("button", { name: "Create Account" }).click();

        await expect(page).toHaveURL(new RegExp(`${BOARDS_PATH}$`));

        const cookies = await context.cookies();
        const sessionCookie = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);

        expect(sessionCookie).toBeDefined();
        expect(sessionCookie?.httpOnly).toBe(true);
    });
});

test.describe("AUTH-02: sign in", () => {
    test("signs in the demo account and stays signed in across a full page reload", async ({ page }) => {
        await page.goto("/login");
        await page.getByLabel("Email", { exact: true }).fill(DEMO_USER_EMAIL);
        await page.getByLabel("Password", { exact: true }).fill(DEMO_USER_PASSWORD);
        await page.getByRole("button", { name: "Sign In" }).click();

        await expect(page).toHaveURL(new RegExp(`${BOARDS_PATH}$`));

        /*
         * The reload is the point of this test, not a formality — it proves the session survives
         * a full navigation, not just client-side router state.
         */
        await page.reload();

        await expect(page).toHaveURL(new RegExp(`${BOARDS_PATH}$`));
        await expect(page.getByRole("heading", { name: "Boards" })).toBeVisible();
    });
});

test.describe("sign-out", () => {
    test("signs out and the board list redirects back to sign-in afterward", async ({ page }) => {
        await page.goto("/login");
        await page.getByLabel("Email", { exact: true }).fill(DEMO_USER_EMAIL);
        await page.getByLabel("Password", { exact: true }).fill(DEMO_USER_PASSWORD);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${BOARDS_PATH}$`));

        await page.getByRole("button", { name: "Sign Out" }).click();
        await expect(page).toHaveURL(new RegExp(`${SIGN_IN_PATH}$`));

        await page.goto(BOARDS_PATH);
        await expect(page).toHaveURL(new RegExp(`${SIGN_IN_PATH}$`));
    });
});
