import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { createFixtureAccount } from "./fixtures";
import { ROUTE } from "../src/lib/core/routing/routes";

const SESSION_COOKIE_NAME = "session";
const FRESH_PASSWORD = "E2eFreshPassword123!";
const PROTECTED_HEADING = "Boards";

test.describe("AUTH-01: sign up", () => {
    test("creates an account, lands on the board list, and sets an httpOnly session cookie", async ({
        page,
        context,
    }) => {
        const freshEmail = `e2e-${randomUUID()}@example.com`;

        await page.goto(ROUTE.SIGN_UP);
        await page.getByLabel("Email", { exact: true }).fill(freshEmail);
        /*
         * "Letters and spaces" only (GC-02) — a digit-bearing fixture name like "E2E Tester" now
         * fails the sign-up form's own name validation, so this fixture must satisfy the same
         * rules as the password fixture below.
         */
        await page.getByLabel("Name", { exact: true }).fill("End To End Tester");
        await page.getByLabel("Password", { exact: true }).fill(FRESH_PASSWORD);
        await page.getByRole("button", { name: "Create Account" }).click();

        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        const cookies = await context.cookies();
        const sessionCookie = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);

        expect(sessionCookie).toBeDefined();
        expect(sessionCookie?.httpOnly).toBe(true);
    });
});

test.describe("AUTH-02: sign in", () => {
    test("signs in a freshly created account and stays signed in across a full page reload", async ({
        page,
        request,
    }) => {
        const account = await createFixtureAccount(request);

        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();

        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        /*
         * The reload is the point of this test, not a formality — it proves the session survives
         * a full navigation, not just client-side router state.
         */
        await page.reload();

        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
        await expect(page.getByRole("heading", { name: "Boards" })).toBeVisible();
    });
});

test.describe("sign-out", () => {
    test("signs out and the board list redirects back to sign-in afterward", async ({ page, request }) => {
        const account = await createFixtureAccount(request);

        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        await page.getByRole("button", { name: "Sign Out" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));

        /*
         * After a sign-out, a direct request for the board list must be refused exactly as it is
         * for a visitor who never signed in (route-guard.e2e.spec.ts's own assertion) — the
         * destination alone does not prove nothing was painted first.
         */
        await page.goto(ROUTE.BOARDS);
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
        await expect(page.getByRole("heading", { name: PROTECTED_HEADING })).toHaveCount(0);
    });
});
