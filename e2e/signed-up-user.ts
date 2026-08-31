import { expect, type Page } from "@playwright/test";
import { decodeJwt } from "jose";

import { COOKIE } from "../src/lib/core/cookies/cookie-registry";
import { ROUTE } from "../src/lib/core/routing/routes";
import { recordSeededUserId, SEED_SCOPE } from "../src/test-utils/seeded-user-registry";

/*
 * "Letters and spaces" only (GC-02) — a digit-bearing name like "E2E Tester" fails the sign-up
 * form's own name validation, so every default fixture value here satisfies the shared schema.
 */
export const SIGN_UP_DISPLAY_NAME = "End To End Tester";

type SignUpCredentials = {
    page: Page;
    email: string;
    password: string;
    /** Override only to exercise the name field's own validation. */
    displayName?: string;
};

/**
 * Drive the sign-up form and submit it, asserting nothing about the outcome.
 *
 * For specs whose subject is a rejected submission; a spec expecting the account to be
 * created wants `signUpViaUi`, which also asserts arrival and registers it for teardown.
 */
export const submitSignUpForm = async ({
    page,
    email,
    password,
    displayName = SIGN_UP_DISPLAY_NAME,
}: SignUpCredentials): Promise<void> => {
    await page.goto(ROUTE.SIGN_UP);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Name", { exact: true }).fill(displayName);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create Account" }).click();
};

/**
 * Registers a UI sign-up's backend user id for teardown, read from the session cookie's own JWT
 * payload -- unverified, since the value only names test data for deletion and this avoids a
 * second sign-in against the backend's two-concurrent-session cap.
 */
export const registerSignedUpUser = async (page: Page): Promise<string> => {
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((cookie) => cookie.name === COOKIE.SESSION);

    if (!sessionCookie) {
        throw new Error(`registerSignedUpUser: no "${COOKIE.SESSION}" cookie found after sign-up`);
    }

    const payload = decodeJwt(sessionCookie.value);

    if (typeof payload.id !== "string" || payload.id.length === 0) {
        throw new Error(`registerSignedUpUser: session cookie payload carries no string "id"`);
    }

    recordSeededUserId({ scope: SEED_SCOPE.PLAYWRIGHT, id: payload.id });
    return payload.id;
};

/**
 * Create an account through the real sign-up form and return its backend id.
 *
 * Waits for the board list the successful sign-up lands on, so a caller can assert on the
 * signed-in surface directly, and records the new account for teardown.
 */
export const signUpViaUi = async (credentials: SignUpCredentials): Promise<string> => {
    await submitSignUpForm(credentials);
    await expect(credentials.page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
    return registerSignedUpUser(credentials.page);
};
