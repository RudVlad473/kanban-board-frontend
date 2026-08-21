import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { THEME, type Theme } from "@/lib/core/theme/theme";
import { externalApi } from "@/lib/server/server-client";
import { isSessionPayload, session } from "@/lib/server/session";

import { updateThemeAction } from "./update-theme";

/*
 * No real Next.js request scope exists in a Vitest run, so next/headers' cookies() is mocked with
 * the same in-memory jar server-client.integration.test.ts uses (D-19). Nothing else is mocked —
 * every call below dials the real deployed nonprod backend.
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

// eslint-disable-next-line no-restricted-properties -- cookies() requires a real Next.js request scope no Vitest run provides (D-19)
vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve(fakeCookieJar)),
}));

const TEST_PASSWORD = "IntegrationPwd1!";
const TEST_DISPLAY_NAME = "Integration Test User";

type DirectAccount = { id: string; email: string; jsessionId: string; theme: Theme };

/**
 * Creates a throwaway account directly against the real backend, bypassing the SUT — a fixture,
 * not the behaviour under test (mirrors e2e/seed.ts's own seedAccount).
 */
const signUpDirect = async (email: string): Promise<DirectAccount> => {
    const result = await externalApi.POST(EXTERNAL_PATH.SIGN_UP, {
        body: { email, password: TEST_PASSWORD, displayName: TEST_DISPLAY_NAME },
    });
    const identity: unknown = result.data;
    if (!isSessionPayload(identity)) {
        throw new Error(`signUpDirect: expected a session-payload-shaped identity, got: ${JSON.stringify(identity)}`);
    }
    const setCookiePairs = result.response.headers.getSetCookie();
    const jsessionCookie = setCookiePairs.find((pair) => pair.startsWith("JSESSIONID="));
    const jsessionId = jsessionCookie?.slice("JSESSIONID=".length).split(";")[0];
    if (!jsessionId) {
        throw new Error("signUpDirect: expected a JSESSIONID value to be extractable from the Set-Cookie header");
    }
    return { id: identity.id, email, jsessionId, theme: identity.theme };
};

// Stages a real session for the given account, exactly as server-client.integration.test.ts does.
const stageSession = async (account: DirectAccount): Promise<void> => {
    await session.create({
        id: account.id,
        email: account.email,
        displayName: TEST_DISPLAY_NAME,
        theme: account.theme,
        jsessionId: account.jsessionId,
    });
};

const readTheme = async (account: DirectAccount): Promise<unknown> => {
    const result = await externalApi.GET(EXTERNAL_PATH.USER_THEME, { params: { query: { userId: account.id } } });
    return result.data;
};

describe("updateThemeAction (real backend)", () => {
    beforeEach(() => {
        cookieStore.clear();
    });

    it("returns success and the backend now stores the new theme, read back independently", async () => {
        // Arrange
        const account = await signUpDirect(`e2e-theme-${randomUUID()}@example.com`);
        await stageSession(account);

        // Act
        const result = await updateThemeAction(THEME.DARK);

        // Assert
        expect(result).toEqual({ status: "success", theme: THEME.DARK });
        const readBack = await readTheme(account);
        expect(readBack).toMatchObject({ theme: THEME.DARK });
    });

    it("returns the error result and performs no upstream write when no session exists in the cookie jar", async () => {
        // Arrange — a real account with a known initial theme, no session staged.
        const account = await signUpDirect(`e2e-theme-nosession-${randomUUID()}@example.com`);

        // Act
        const result = await updateThemeAction(THEME.DARK);

        // Assert
        expect(result).toEqual({ status: "error" });
        await stageSession(account);
        const readBack = await readTheme(account);
        expect(readBack).toMatchObject({ theme: account.theme });
    });

    it("returns the error result and performs no upstream write for a value the schema rejects", async () => {
        // Arrange
        const account = await signUpDirect(`e2e-theme-invalid-${randomUUID()}@example.com`);
        await stageSession(account);

        // Act
        const result = await updateThemeAction("PURPLE" as unknown as Theme);

        // Assert
        expect(result).toEqual({ status: "error" });
        const readBack = await readTheme(account);
        expect(readBack).toMatchObject({ theme: account.theme });
    });

    it("never touches a different account's stored theme — the userId always comes from the session", async () => {
        // Arrange — two real accounts; only account A's session is staged.
        const accountA = await signUpDirect(`e2e-theme-a-${randomUUID()}@example.com`);
        const accountB = await signUpDirect(`e2e-theme-b-${randomUUID()}@example.com`);
        await stageSession(accountA);

        // Act
        await updateThemeAction(THEME.DARK);

        // Assert — account B's stored theme is untouched.
        await stageSession(accountB);
        const readBackB = await readTheme(accountB);
        expect(readBackB).toMatchObject({ theme: accountB.theme });
    });
});
