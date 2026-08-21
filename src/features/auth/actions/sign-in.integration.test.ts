import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH_ACTION_IDLE } from "@/features/auth/action-state";
import { PROBLEM_CODE } from "@/lib/core/api-contract/problem-detail";
import { ROUTE } from "@/lib/core/routing/routes";
import { type Theme } from "@/lib/core/theme/theme";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { externalApi } from "@/lib/server/server-client";
import { isSessionPayload } from "@/lib/server/session";

import { signInAction } from "./sign-in";

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

let redirectTarget: string | undefined;

// eslint-disable-next-line no-restricted-properties -- redirect() is a framework control-flow primitive that only resolves inside a real Next.js render/action scope (D-19)
vi.mock("next/navigation", () => ({
    redirect: (path: string) => {
        redirectTarget = path;
        throw new Error("NEXT_REDIRECT");
    },
}));

const TEST_PASSWORD = "IntegrationPwd1!";
const TEST_DISPLAY_NAME = "Integration Test User";

const buildFormData = (fields: Record<string, string>): FormData => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
    }
    return formData;
};

/**
 * Creates a throwaway account directly against the real backend, bypassing the SUT — a fixture,
 * not the behaviour under test (mirrors e2e/fixtures.ts's own createFixtureAccount).
 */
const signUpDirect = async (email: string): Promise<{ id: string; theme: Theme }> => {
    const result = await externalApi.POST("/signup", {
        body: { email, password: TEST_PASSWORD, displayName: TEST_DISPLAY_NAME },
    });
    const identity: unknown = result.data;
    if (!isSessionPayload(identity)) {
        throw new Error(`signUpDirect: expected a session-payload-shaped identity, got: ${JSON.stringify(identity)}`);
    }
    return { id: identity.id, theme: identity.theme };
};

describe("signInAction (real backend)", () => {
    beforeEach(() => {
        cookieStore.clear();
        redirectTarget = undefined;
    });

    it("stores a session cookie and redirects to the board list on sign-in with real credentials", async () => {
        // Arrange
        const email = `e2e-signin-${randomUUID()}@example.com`;
        await signUpDirect(email);
        const formData = buildFormData({ email, password: TEST_PASSWORD });

        // Act
        await expect(signInAction(AUTH_ACTION_IDLE, formData)).rejects.toThrow();

        // Assert
        expect(cookieStore.get("session")).toBeDefined();
        expect(redirectTarget).toBe(ROUTE.BOARDS);
    });

    it("writes the theme cookie from the backend's stored preference for that account", async () => {
        // Arrange
        const email = `e2e-signin-theme-${randomUUID()}@example.com`;
        const account = await signUpDirect(email);
        const formData = buildFormData({ email, password: TEST_PASSWORD });

        // Act
        await expect(signInAction(AUTH_ACTION_IDLE, formData)).rejects.toThrow();

        // Assert
        const theme = await themeCookie.read();
        expect(theme).toBe(account.theme);
    });

    it("returns BAD_CREDENTIALS and writes no session cookie on a wrong password", async () => {
        // Arrange
        const email = `e2e-signin-badpwd-${randomUUID()}@example.com`;
        await signUpDirect(email);
        const formData = buildFormData({ email, password: "TotallyWrongPwd9!" });

        // Act
        const state = await signInAction(AUTH_ACTION_IDLE, formData);

        // Assert
        expect(state.status).toBe("error");
        if (state.status === "error") {
            expect(state.code).toBe(PROBLEM_CODE.BAD_CREDENTIALS);
        }
        expect(cookieStore.get("session")).toBeUndefined();
    });

    it("returns the field-error result and performs no upstream call for a payload failing the shared schema", async () => {
        // Arrange
        const formData = buildFormData({ email: "not-an-email", password: "" });

        // Act
        const state = await signInAction(AUTH_ACTION_IDLE, formData);

        // Assert
        expect(state.status).toBe("error");
        if (state.status === "error") {
            expect(state.code).toBe(PROBLEM_CODE.VALIDATION_FAILED);
            expect(state.fieldErrors).toBeDefined();
        }
        expect(cookieStore.get("session")).toBeUndefined();
    });
});
