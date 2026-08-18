import { randomUUID } from "node:crypto";

import type { APIRequestContext } from "@playwright/test";

import { E2E_EXTERNAL_API_BASE_URL } from "./test-env";

/*
 * Satisfies the backend's own password rule (8-64 characters, at least one upper-case letter, one
 * lower-case letter, one digit and one special character — src/lib/validation/auth-schemas.ts
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
};

/**
 * Creates a throwaway account directly against the real backend's own sign-up route
 * (`E2E_EXTERNAL_API_BASE_URL`), bypassing this application entirely — a fixture is setup, not
 * the behaviour under test. The sign-up scenario in `auth.e2e.spec.ts` is the one place that still
 * drives the real form instead of calling this helper, since AUTH-01 has to be proven through the
 * interface a user actually touches.
 *
 * Every call mints a brand-new, randomised email, and every test must call this itself rather than
 * sharing one account across tests — the backend caps a single account at two concurrent sessions
 * (`kanban-board-backend/docs/AUTH_FLOWS.md`, "What will break your E2E suite") and answers a
 * third sign-in attempt with the exact same `401` a wrong password produces, so a shared fixture
 * would fail under parallel workers as an indistinguishable, mysterious credentials error. Do not
 * "optimise" this into one shared demo account.
 */
export const createFixtureAccount = async (request: APIRequestContext): Promise<FixtureAccount> => {
    const email = `e2e-${randomUUID()}@example.com`;

    const response = await request.post(`${E2E_EXTERNAL_API_BASE_URL}/signup`, {
        data: { email, password: FIXTURE_PASSWORD, displayName: FIXTURE_DISPLAY_NAME },
    });

    if (response.status() !== 201) {
        const body = await response.text();
        throw new Error(
            `createFixtureAccount: expected 201 Created from POST /signup, received ${String(response.status())}: ${body}`,
        );
    }

    const body = (await response.json()) as { id: string; email: string; displayName: string };

    return { id: body.id, email: body.email, displayName: body.displayName, password: FIXTURE_PASSWORD };
};
