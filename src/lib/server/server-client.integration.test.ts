import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { PROBLEM_CODE, parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { externalApi } from "@/lib/server/server-client";
import { isSessionPayload, session } from "@/lib/server/session";
import { createSessionRecord } from "@/test-utils/factories/session-record";

/*
 * This is the permanent proof the session bridge authenticates a real call against the real
 * backend (docs/adr/tech/0018) — nothing but `next/headers`'s `cookies()` is mocked here (D-19
 * framework shim), and only because a Vitest run has no real Next.js request scope (docs/adr/tech/0020).
 */
type CookieRecord = { value: string; options?: Record<string, unknown> };
const cookieStore = new Map<string, CookieRecord>();

const fakeCookieJar = {
    get: (name: string) => {
        const record = cookieStore.get(name);
        return record ? { name, value: record.value } : undefined;
    },
    // eslint-disable-next-line no-restricted-syntax -- mocks next/headers' cookies().set(name, value, options); positional shape is dictated by that external API, not this project (ADR tech/0016 exemption)
    set: (name: string, value: string, options?: Record<string, unknown>) => {
        cookieStore.set(name, { value, options });
    },
    delete: (name: string) => {
        cookieStore.delete(name);
    },
};

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve(fakeCookieJar)),
}));

// Satisfies the backend's own password rule (8-64 chars, upper/lower/digit/special) — mirrors e2e/seed.sh's SEED_PASSWORD.
const TEST_PASSWORD = "IntegrationPwd1!";
const TEST_DISPLAY_NAME = "Integration Test User";

describe("server-client session bridge (real backend)", () => {
    beforeEach(() => {
        cookieStore.clear();
    });

    it("bridges a signed-in user's session to an authenticated upstream call, and refuses the same call without one", async () => {
        // Arrange — create a randomised account against the real backend.
        const email = `integration-${randomUUID()}@example.com`;
        const signUpResult = await externalApi.POST(EXTERNAL_PATH.SIGN_UP, {
            body: { email, password: TEST_PASSWORD, displayName: TEST_DISPLAY_NAME },
        });

        const upstreamError: unknown = signUpResult.error;
        const identity: unknown = signUpResult.data;
        expect(upstreamError).toBeUndefined();
        if (!isSessionPayload(identity)) {
            throw new Error(
                `expected POST /signup to return a session-payload-shaped identity, got: ${JSON.stringify(identity)}`,
            );
        }

        // Assert — a credential was actually present on the sign-up response (settles Assumption A1).
        const setCookiePairs = signUpResult.response.headers.getSetCookie();
        const jsessionCookie = setCookiePairs.find((pair) => pair.startsWith("JSESSIONID="));
        expect(jsessionCookie).toBeDefined();
        const jsessionId = jsessionCookie?.slice("JSESSIONID=".length).split(";")[0];
        expect(jsessionId).toBeTruthy();
        if (!jsessionId) {
            throw new Error("expected a JSESSIONID value to be extractable from the Set-Cookie header");
        }

        // Act (before any session exists) — the identical read, with no bridged credential.
        const refusedResult = await externalApi.GET(EXTERNAL_PATH.USER_THEME, {
            params: { query: { userId: identity.id } },
        });

        // Assert — refused specifically with the unauthenticated code, proving the call genuinely needs auth.
        const refusedProblem = parseProblemDetail(refusedResult.error);
        expect(refusedResult.response.status).toBe(401);
        expect(refusedProblem?.code).toBe(PROBLEM_CODE.UNAUTHENTICATED);

        // Act — store the session, then repeat the identical call.
        await session.create({ ...identity, displayName: TEST_DISPLAY_NAME, jsessionId });
        const authenticatedResult = await externalApi.GET(EXTERNAL_PATH.USER_THEME, {
            params: { query: { userId: identity.id } },
        });

        // Assert — the identical call now succeeds and returns this account's own record.
        expect(authenticatedResult.response.status).toBe(200);
        expect(authenticatedResult.error).toBeUndefined();
        expect(authenticatedResult.data).toMatchObject({ id: identity.id, email });
    });

    it("clears this app's session when a bridged call is refused as unauthenticated (an expired upstream session)", async () => {
        // Arrange — a syntactically valid session whose credential does not correspond to any real upstream session.
        const expiredRecord = createSessionRecord({ jsessionId: "syntactically-valid-but-nonexistent-jsessionid" });
        await session.create(expiredRecord);

        // Act — the real backend refuses this credential; the response middleware clears the session and redirects.
        const refusedCall = externalApi.GET(EXTERNAL_PATH.USER_THEME, {
            params: { query: { userId: expiredRecord.id } },
        });

        // Assert — `redirect()` throws (the expected Next.js signal), and this app's session cookie is gone afterward.
        await expect(refusedCall).rejects.toThrow();
        await expect(session.verify()).resolves.toBeNull();
    });

    it("does not clear the session on a genuinely failed sign-in (wrong password)", async () => {
        // Arrange — a real account with a real, stored session for it.
        const email = `integration-badcred-${randomUUID()}@example.com`;
        const signUpResult = await externalApi.POST(EXTERNAL_PATH.SIGN_UP, {
            body: { email, password: TEST_PASSWORD, displayName: TEST_DISPLAY_NAME },
        });
        const identity: unknown = signUpResult.data;
        if (!isSessionPayload(identity)) {
            throw new Error(
                `expected POST /signup to return a session-payload-shaped identity, got: ${JSON.stringify(identity)}`,
            );
        }
        const setCookiePairs = signUpResult.response.headers.getSetCookie();
        const jsessionCookie = setCookiePairs.find((pair) => pair.startsWith("JSESSIONID="));
        const jsessionId = jsessionCookie?.slice("JSESSIONID=".length).split(";")[0];
        if (!jsessionId) {
            throw new Error("expected a JSESSIONID value to be extractable from the Set-Cookie header");
        }
        const storedRecord = createSessionRecord({ ...identity, displayName: TEST_DISPLAY_NAME, jsessionId });
        await session.create(storedRecord);

        // Act — a genuinely wrong password against the real backend, for the same account.
        const wrongPasswordResult = await externalApi.POST(EXTERNAL_PATH.SIGN_IN, {
            body: { email, password: "TotallyWrongPwd9!" },
        });

        // Assert — refused as BAD_CREDENTIALS (not UNAUTHENTICATED), and this app's own session is left untouched.
        const wrongPasswordProblem = parseProblemDetail(wrongPasswordResult.error);
        expect(wrongPasswordResult.response.status).toBe(401);
        expect(wrongPasswordProblem?.code).toBe(PROBLEM_CODE.BAD_CREDENTIALS);
        await expect(session.verify()).resolves.toEqual(storedRecord);
    });
});
