import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { PROBLEM_CODE, parseProblemDetail } from "@/lib/api/problem-detail";
import { externalApi } from "@/lib/api/server-client";
import { isSessionPayload, session } from "@/lib/session";

/*
 * There is no real Next.js request scope in a Vitest run, so `next/headers`' `cookies()` is
 * mocked with the same in-memory jar `src/lib/session.test.ts` uses. Nothing else is mocked —
 * every call in this file dials the real, deployed nonprod backend (GC-22: no mock server remains
 * anywhere), which is the entire point of this test: it is the permanent proof that the session
 * bridge authenticates a real call against the real backend, not a fake.
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

/*
 * Satisfies the backend's own password rule (8-64 characters, at least one upper-case letter, one
 * lower-case letter, one digit and one special character — mirrors `e2e/fixtures.ts`'s own
 * `FIXTURE_PASSWORD`).
 */
const TEST_PASSWORD = "IntegrationPwd1!";
const TEST_DISPLAY_NAME = "Integration Test User";

describe("server-client session bridge (real backend)", () => {
    beforeEach(() => {
        cookieStore.clear();
    });

    it("bridges a signed-in user's session to an authenticated upstream call, and refuses the same call without one", async () => {
        // Arrange — create a randomised account against the real backend.
        const email = `integration-${randomUUID()}@example.com`;
        const signUpResult = await externalApi.POST("/signup", {
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
        const refusedResult = await externalApi.GET("/users/me/theme", { params: { query: { userId: identity.id } } });

        // Assert — refused specifically with the unauthenticated code, proving the call genuinely needs auth.
        const refusedProblem = parseProblemDetail(refusedResult.error);
        expect(refusedResult.response.status).toBe(401);
        expect(refusedProblem?.code).toBe(PROBLEM_CODE.UNAUTHENTICATED);

        // Act — store the session, then repeat the identical call.
        await session.create({ ...identity, displayName: TEST_DISPLAY_NAME, jsessionId });
        const authenticatedResult = await externalApi.GET("/users/me/theme", {
            params: { query: { userId: identity.id } },
        });

        // Assert — the identical call now succeeds and returns this account's own record.
        expect(authenticatedResult.response.status).toBe(200);
        expect(authenticatedResult.error).toBeUndefined();
        expect(authenticatedResult.data).toMatchObject({ id: identity.id, email });
    });

    it("clears this app's session when a bridged call is refused as unauthenticated (an expired upstream session)", async () => {
        // Arrange — a syntactically valid session whose credential does not correspond to any real upstream session.
        await session.create({
            id: "00000000-0000-4000-8000-000000000000",
            email: "expired-session@example.com",
            displayName: "Expired Session",
            theme: "LIGHT",
            jsessionId: "syntactically-valid-but-nonexistent-jsessionid",
        });

        // Act — the real backend refuses this credential; the response middleware clears the session and redirects.
        const refusedCall = externalApi.GET("/users/me/theme", {
            params: { query: { userId: "00000000-0000-4000-8000-000000000000" } },
        });

        // Assert — `redirect()` throws (the expected Next.js signal), and this app's session cookie is gone afterward.
        await expect(refusedCall).rejects.toThrow();
        await expect(session.verify()).resolves.toBeNull();
    });

    it("does not clear the session on a genuinely failed sign-in (wrong password)", async () => {
        // Arrange — a real account with a real, stored session for it.
        const email = `integration-badcred-${randomUUID()}@example.com`;
        const signUpResult = await externalApi.POST("/signup", {
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
        const storedRecord = { ...identity, displayName: TEST_DISPLAY_NAME, jsessionId };
        await session.create(storedRecord);

        // Act — a genuinely wrong password against the real backend, for the same account.
        const wrongPasswordResult = await externalApi.POST("/signin", {
            body: { email, password: "TotallyWrongPwd9!" },
        });

        // Assert — refused as BAD_CREDENTIALS (not UNAUTHENTICATED), and this app's own session is left untouched.
        const wrongPasswordProblem = parseProblemDetail(wrongPasswordResult.error);
        expect(wrongPasswordResult.response.status).toBe(401);
        expect(wrongPasswordProblem?.code).toBe(PROBLEM_CODE.BAD_CREDENTIALS);
        await expect(session.verify()).resolves.toEqual(storedRecord);
    });
});
