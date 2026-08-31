import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { decodeJwt } from "jose";

import { seedAccount } from "./seed";
import { signUpViaUi, submitSignUpForm } from "./signed-up-user";
import { COOKIE } from "../src/lib/core/cookies/cookie-registry";
import { ROUTE } from "../src/lib/core/routing/routes";

const FRESH_PASSWORD = "E2eFreshPassword123!";
/* The sidebar landmark, not the old `/boards` placeholder heading plan 02-11 replaced with D-10's empty state. */
const PROTECTED_LANDMARK = "Boards";

test.describe("AUTH-01: sign up", () => {
    test("creates an account, lands on the board list, and sets an httpOnly session cookie whose value is an opaque JWT", async ({
        page,
        context,
    }) => {
        // Arrange
        const freshEmail = `e2e-${randomUUID()}@example.com`;

        // Act
        await signUpViaUi({ page, email: freshEmail, password: FRESH_PASSWORD });

        // Assert
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        const cookies = await context.cookies();
        const sessionCookie = cookies.find((cookie) => cookie.name === COOKIE.SESSION);

        expect(sessionCookie).toBeDefined();
        expect(sessionCookie?.httpOnly).toBe(true);
        if (!sessionCookie) {
            throw new Error("expected a session cookie to exist after sign-up");
        }

        /*
         * T-02.2-17: the session cookie must be an opaque JWT, never readable identity — three
         * dot-separated segments, and neither the account's email nor its backend id present as a
         * plaintext substring of the raw cookie value.
         */
        expect(sessionCookie.value.split(".")).toHaveLength(3);
        expect(sessionCookie.value).not.toContain(freshEmail);
        const payload = decodeJwt(sessionCookie.value);
        const accountId = payload.id;
        if (typeof accountId !== "string" || accountId.length === 0) {
            throw new Error("expected the decoded session payload to carry a string id");
        }
        expect(sessionCookie.value).not.toContain(accountId);

        const themeCookie = cookies.find((cookie) => cookie.name === COOKIE.THEME);
        expect(themeCookie).toBeDefined();
    });
});

test.describe("AUTH-02: sign in", () => {
    test("signs in a freshly created account and stays signed in across a full page reload", async ({ page }) => {
        // Arrange
        const account = seedAccount();

        // Act
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

        // Assert
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
        await expect(page.getByRole("navigation", { name: PROTECTED_LANDMARK })).toBeVisible();
    });
});

test.describe("AUTH-04: sign-in rejects a wrong password", () => {
    test("shows the anti-enumeration message and sets no session cookie", async ({ page, context }) => {
        // Arrange
        const account = seedAccount();

        // Act
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill("TotallyWrongPwd9!");
        await page.getByRole("button", { name: "Sign In" }).click();

        // Assert
        /*
         * INVALID_CREDENTIALS_MESSAGE (sign-in.ts) copied literally, not imported — module-private.
         * `getByText`, not `getByRole("alert")`: Next's own route-announcer also carries that role.
         */
        await expect(page.getByText("Invalid email or password.", { exact: true })).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
        const cookies = await context.cookies();
        expect(cookies.find((cookie) => cookie.name === COOKIE.SESSION)).toBeUndefined();
    });
});

test.describe("AUTH-05: sign-in rejects a payload failing the shared schema", () => {
    test("shows field-level errors and sets no session cookie", async ({ page, context }) => {
        // Act — a malformed email and an empty password (untouched field).
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill("not-an-email");
        await page.getByRole("button", { name: "Sign In" }).click();

        // Assert
        /*
         * EMAIL_FORMAT_MESSAGE / REQUIRED_FIELD_MESSAGE are module-private constants in
         * src/features/auth/schemas.ts — literal copies here, not imports.
         */
        await expect(page.getByText("Enter a valid email address.")).toBeVisible();
        await expect(page.getByText("Can't be empty")).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
        const cookies = await context.cookies();
        expect(cookies.find((cookie) => cookie.name === COOKIE.SESSION)).toBeUndefined();
    });
});

test.describe("AUTH-06: sign-up rejects a payload failing the shared schema", () => {
    test("shows field-level errors and sets no session cookie", async ({ page, context }) => {
        // Arrange
        const email = `e2e-signup-invalid-${randomUUID()}@example.com`;

        // Act
        /*
         * A digit-bearing name (charset) and an 8-char-under password (length, chained before
         * complexity per schemas.ts's own comment, so "short" reports length only).
         */
        await submitSignUpForm({ page, email, displayName: "User123", password: "short" });

        // Assert
        /*
         * DISPLAY_NAME_CHARSET_MESSAGE / PASSWORD_LENGTH_MESSAGE are module-private constants in
         * src/features/auth/schemas.ts — literal copies here, not imports.
         */
        await expect(page.getByText("Name can only contain letters and spaces.")).toBeVisible();
        await expect(page.getByText("Password must be between 8 and 64 characters.")).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_UP}$`));
        const cookies = await context.cookies();
        expect(cookies.find((cookie) => cookie.name === COOKIE.SESSION)).toBeUndefined();
    });
});

test.describe("AUTH-07: sign-up rejects a duplicate email", () => {
    test("shows the duplicate-account message on a second sign-up with the same email and sets no session cookie", async ({
        page,
        context,
    }) => {
        // Arrange
        const email = `e2e-signup-dup-${randomUUID()}@example.com`;

        // Act — first sign-up succeeds and signs the account in.
        await signUpViaUi({ page, email, password: FRESH_PASSWORD });

        /*
         * Sign out first — proxy.ts redirects a signed-in visitor away from /register entirely, so
         * the second attempt below could never reach the form otherwise. This app's own sign-out
         * never calls the backend (SETUP.md), so it doesn't touch the account's session budget.
         */
        await page.getByRole("button", { name: "Sign Out" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));

        // Act — second sign-up, same email.
        await submitSignUpForm({ page, email, password: FRESH_PASSWORD });

        // Assert
        /*
         * SIGN_UP_FAILURE_MESSAGE (sign-up.ts) copied literally, not imported — module-private.
         * `getByText`, not `getByRole("alert")`: Next's own route-announcer also carries that role.
         */
        await expect(
            page.getByText(
                "We couldn't create your account. If you already have one, try signing in instead, or try again in a moment.",
                { exact: true },
            ),
        ).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_UP}$`));
        const cookies = await context.cookies();
        expect(cookies.find((cookie) => cookie.name === COOKIE.SESSION)).toBeUndefined();
    });
});

test.describe("sign-out", () => {
    test("signs out and the board list redirects back to sign-in afterward", async ({ page, context }) => {
        // Arrange
        const account = seedAccount();

        // Act
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        await page.getByRole("button", { name: "Sign Out" }).click();

        // Assert
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));

        const cookies = await context.cookies();
        expect(cookies.find((cookie) => cookie.name === COOKIE.SESSION)).toBeUndefined();

        /*
         * After a sign-out, a direct request for the board list must be refused exactly as it is
         * for a visitor who never signed in (route-guard.e2e.spec.ts's own assertion) — the
         * destination alone does not prove nothing was painted first.
         */
        await page.goto(ROUTE.BOARDS);
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
        await expect(page.getByRole("navigation", { name: PROTECTED_LANDMARK })).toHaveCount(0);
    });

    /*
     * "Sign out with no session" (ledger row 11) is NOT REACHABLE via the real browser — see
     * 02.2-05-SUMMARY.md's coverage ledger for the reason (a proxy.ts/Server Action interaction),
     * restated in 02.2-09's ADR amendment.
     */
});
