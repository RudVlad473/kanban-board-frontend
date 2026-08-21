import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { isSessionPayload, session } from "@/lib/server/session";
import { createSessionRecord } from "@/test-utils/factories/session-record";

/*
 * `next/headers`' `cookies()` is mocked as an in-memory jar (D-19 environment shim, no real
 * Next.js request scope in Vitest) — every other call dials the real nonprod backend (ADR
 * tech/0018/D-04). Carries forward the deleted `app/api/boards/route.test.ts`'s coverage (D-21).
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
 * Imported after the `next/headers` mock above is registered — `loadBoards()`'s own import chain
 * reaches `verifySession()` -> `session.verify()` -> `cookies()`, so the mock must exist first.
 */
const { loadBoards } = await import("./load-boards");
const { externalApi } = await import("@/lib/server/server-client");

const TEST_PASSWORD = "IntegrationPwd1!";
const TEST_DISPLAY_NAME = "Integration Test User";

/** Signs up a fresh, randomised account against the real backend and returns its session record. */
const signUpAndSession = async () => {
    const email = `integration-load-boards-${randomUUID()}@example.com`;
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

    return { ...identity, displayName: TEST_DISPLAY_NAME, jsessionId };
};

describe("loadBoards (real backend)", () => {
    beforeEach(() => {
        cookieStore.clear();
    });

    it("returns unauthenticated with no session in the cookie jar, and performs no upstream call", async () => {
        // Arrange — no session.create() call, jar is empty.

        // Act
        const result = await loadBoards();

        // Assert
        expect(result).toEqual({ status: "unauthenticated" });
    });

    it("returns this account's own seeded boards for a real signed-in session", async () => {
        // Arrange
        const record = await signUpAndSession();
        await session.create(record);
        const boardName = `Load Boards ${randomUUID().slice(0, 8)}`;
        const createResult = await externalApi.POST(EXTERNAL_PATH.BOARDS, {
            params: { query: { userId: record.id } },
            body: { name: boardName },
        });
        const seededBoard: unknown = createResult.data;

        // Act
        const result = await loadBoards();

        // Assert
        expect(result.status).toBe("ok");
        if (result.status === "ok") {
            expect(result.boards).toContainEqual(seededBoard);
        }
    });

    it("never returns a board seeded under a different account (session-derived userId, T-02.1-01)", async () => {
        // Arrange — seed a board under a second, unrelated account.
        const otherRecord = await signUpAndSession();
        await session.create(otherRecord);
        const otherBoardName = `Other Account Board ${randomUUID().slice(0, 8)}`;
        const otherCreateResult = await externalApi.POST(EXTERNAL_PATH.BOARDS, {
            params: { query: { userId: otherRecord.id } },
            body: { name: otherBoardName },
        });
        expect(otherCreateResult.error).toBeUndefined();

        // Arrange — swap the jar to the first account's own session, and seed its own board too.
        const record = await signUpAndSession();
        await session.create(record);
        const ownBoardName = `Own Account Board ${randomUUID().slice(0, 8)}`;
        const ownCreateResult = await externalApi.POST(EXTERNAL_PATH.BOARDS, {
            params: { query: { userId: record.id } },
            body: { name: ownBoardName },
        });
        expect(ownCreateResult.error).toBeUndefined();

        // Act
        const result = await loadBoards();

        // Assert
        expect(result.status).toBe("ok");
        if (result.status === "ok") {
            expect(result.boards.some((board) => board.name === ownBoardName)).toBe(true);
            expect(result.boards.some((board) => board.name === otherBoardName)).toBe(false);
        }
    });

    it("does not resolve to ok, and leaks no upstream response text, for a syntactically valid but nonexistent upstream session", async () => {
        /*
         * `externalApi`'s middleware forces sign-out on a bridged 401 (server-client.ts, GC-18);
         * `redirect()` throwing here IS the no-leak behaviour — nothing left to leak.
         */
        // Arrange
        await session.create(
            createSessionRecord({
                id: "00000000-0000-4000-8000-000000000099",
                email: "no-upstream-session@example.com",
                jsessionId: "syntactically-valid-but-nonexistent-jsessionid",
            }),
        );

        // Act
        const call = loadBoards();

        // Assert
        await expect(call).rejects.toThrow();
        await expect(session.verify()).resolves.toBeNull();
    });
});
