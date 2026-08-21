import { randomUUID } from "node:crypto";

import type { APIRequestContext } from "@playwright/test";

import { E2E_CONFIG } from "./test-env";
import { EXTERNAL_PATH } from "../src/lib/core/api-contract/external-paths";

/*
 * Satisfies the backend's own password rule (8-64 characters, at least one upper-case letter, one
 * lower-case letter, one digit and one special character — src/features/auth/schemas.ts
 * mirrors the same rule) so this fixture is valid both for the direct API call below and for any
 * form that later retypes it (the sign-up scenario drives the real form, not this helper).
 */
export const FIXTURE_PASSWORD = "E2eFixturePwd1!";

/*
 * Satisfies the backend's display-name rule too (3-32 characters, letters and spaces only — no
 * digits, unlike "E2E").
 */
const FIXTURE_DISPLAY_NAME = "End To End Fixture";

export type FixtureAccount = {
    id: string;
    email: string;
    password: string;
    displayName: string;
    /**
     * The backend's own session credential, bridged from the sign-up response's `Set-Cookie`
     * header — lets `createFixtureBoard` seed data using this same sign-up session instead of
     * spending the account's two-concurrent-session budget on a second sign-in of its own.
     */
    jsessionId: string;
};

/**
 * Playwright's `response.headers()` collapses repeated headers (like `Set-Cookie`, which the
 * backend may send more than once) into a single combined string — `headersArray()` is the one
 * that preserves each occurrence as its own entry, which is what a raw `JSESSIONID=...` value
 * needs to survive intact.
 */
const extractJsessionId = (headers: { name: string; value: string }[]): string => {
    const setCookieHeaders = headers.filter((header) => header.name.toLowerCase() === "set-cookie");
    const jsessionCookie = setCookieHeaders.find((header) => header.value.startsWith("JSESSIONID="));

    if (!jsessionCookie) {
        throw new Error("extractJsessionId: no JSESSIONID cookie found in the response's Set-Cookie headers.");
    }

    return jsessionCookie.value.split(";")[0]?.split("=")[1] ?? "";
};

/**
 * Creates a throwaway account directly against the real backend's own sign-up route
 * (`E2E_CONFIG.EXTERNAL_API_BASE_URL`), bypassing this application entirely — a fixture is setup, not
 * the behaviour under test. The sign-up scenario in `auth.e2e.spec.ts` is the one place that still
 * drives the real form instead of calling this helper, since AUTH-01 has to be proven through the
 * interface a user actually touches.
 *
 * Every call mints a brand-new, randomised email, and every test must call this itself rather than
 * sharing one account across tests — the backend caps a single account at two concurrent sessions
 * (`kanban-board-backend/docs/AUTH_FLOWS.md`, "What will break your E2E suite") and answers a
 * third sign-in attempt with the exact same `401` a wrong password produces, so a shared fixture
 * would fail under parallel workers as an indistinguishable, mysterious credentials error. Do not
 * "optimise" this into one shared demo account. Fixtures that seed data (`createFixtureBoard`) use
 * this sign-up session's own credential rather than signing in a second time — a spec that also
 * needs to sign in through the real form (e.g. `boards-list.e2e.spec.ts`) still has exactly one
 * sign-in left after seeding.
 */
export const createFixtureAccount = async (request: APIRequestContext): Promise<FixtureAccount> => {
    const email = `e2e-${randomUUID()}@example.com`;

    const response = await request.post(`${E2E_CONFIG.EXTERNAL_API_BASE_URL}${EXTERNAL_PATH.SIGN_UP}`, {
        data: { email, password: FIXTURE_PASSWORD, displayName: FIXTURE_DISPLAY_NAME },
    });

    if (response.status() !== 201) {
        const body = await response.text();
        throw new Error(
            `createFixtureAccount: expected 201 Created from POST /signup, received ${String(response.status())}: ${body}`,
        );
    }

    const body = (await response.json()) as { id: string; email: string; displayName: string };
    const jsessionId = extractJsessionId(response.headersArray());

    return { id: body.id, email: body.email, displayName: body.displayName, password: FIXTURE_PASSWORD, jsessionId };
};

/**
 * Seeds one board directly against the real backend's own `/boards` route, using the fixture
 * account's sign-up session (`jsessionId`) rather than a fresh sign-in — a fixture is setup, not
 * the behaviour under test, and this keeps the account's two-concurrent-session budget untouched
 * for whatever sign-in the spec itself still needs to perform.
 */
export const createFixtureBoard = async ({
    request,
    account,
    name,
}: {
    request: APIRequestContext;
    account: FixtureAccount;
    name: string;
}): Promise<{ id: string; name: string; version: number }> => {
    const response = await request.post(`${E2E_CONFIG.EXTERNAL_API_BASE_URL}${EXTERNAL_PATH.BOARDS}`, {
        params: { userId: account.id },
        headers: { Cookie: `JSESSIONID=${account.jsessionId}` },
        data: { name },
    });

    if (response.status() !== 201) {
        const body = await response.text();
        throw new Error(
            `createFixtureBoard: expected 201 Created from POST /boards, received ${String(response.status())}: ${body}`,
        );
    }

    return (await response.json()) as { id: string; name: string; version: number };
};
