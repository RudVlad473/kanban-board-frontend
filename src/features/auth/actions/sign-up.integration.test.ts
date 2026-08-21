import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH_ACTION_IDLE } from "@/features/auth/action-state";
import { PROBLEM_CODE } from "@/lib/core/api-contract/problem-detail";
import { ROUTE } from "@/lib/core/routing/routes";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { session } from "@/lib/server/session";

import { signUpAction } from "./sign-up";

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

/*
 * Satisfies the backend's real password/display-name rules — mirrors
 * server-client.integration.test.ts's own constants.
 */
const TEST_PASSWORD = "IntegrationPwd1!";
const TEST_DISPLAY_NAME = "Integration Test User";

const buildFormData = (fields: Record<string, string>): FormData => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
    }
    return formData;
};

describe("signUpAction (real backend)", () => {
    beforeEach(() => {
        cookieStore.clear();
        redirectTarget = undefined;
    });

    it("stores a session cookie whose value is a JWT, not readable identity data, on a well-formed sign-up", async () => {
        // Arrange
        const email = `e2e-signup-${randomUUID()}@example.com`;
        const formData = buildFormData({ email, displayName: TEST_DISPLAY_NAME, password: TEST_PASSWORD });

        // Act
        await expect(signUpAction(AUTH_ACTION_IDLE, formData)).rejects.toThrow();

        // Assert
        const storedSession = cookieStore.get("session");
        expect(storedSession).toBeDefined();
        expect(storedSession?.value.split(".")).toHaveLength(3);
        expect(storedSession?.value).not.toContain(email);
        const record = await session.verify();
        expect(record?.email).toBe(email);
    });

    it("writes the real theme cookie through the real cookie jar shim on a well-formed sign-up", async () => {
        // Arrange
        const email = `e2e-signup-theme-${randomUUID()}@example.com`;
        const formData = buildFormData({ email, displayName: TEST_DISPLAY_NAME, password: TEST_PASSWORD });

        // Act
        await expect(signUpAction(AUTH_ACTION_IDLE, formData)).rejects.toThrow();

        // Assert
        const theme = await themeCookie.read();
        expect(theme).not.toBeNull();
    });

    it("returns the field-error result and performs no upstream call for a payload failing the shared schema", async () => {
        // Arrange
        const formData = buildFormData({
            email: `e2e-signup-invalid-${randomUUID()}@example.com`,
            displayName: "User123",
            password: "short",
        });

        // Act
        const state = await signUpAction(AUTH_ACTION_IDLE, formData);

        // Assert
        expect(state.status).toBe("error");
        if (state.status === "error") {
            expect(state.code).toBe(PROBLEM_CODE.VALIDATION_FAILED);
            expect(state.fieldErrors).toBeDefined();
        }
        expect(cookieStore.get("session")).toBeUndefined();
    });

    it("returns the backend's duplicate-account error mapped into the result on a repeated sign-up", async () => {
        // Arrange
        const email = `e2e-signup-dup-${randomUUID()}@example.com`;
        const firstFormData = buildFormData({ email, displayName: TEST_DISPLAY_NAME, password: TEST_PASSWORD });
        await expect(signUpAction(AUTH_ACTION_IDLE, firstFormData)).rejects.toThrow();
        cookieStore.clear();
        const secondFormData = buildFormData({ email, displayName: TEST_DISPLAY_NAME, password: TEST_PASSWORD });

        // Act
        const state = await signUpAction(AUTH_ACTION_IDLE, secondFormData);

        // Assert
        expect(state.status).toBe("error");
        if (state.status === "error") {
            expect(state.code).toBe(PROBLEM_CODE.DUPLICATE_RESOURCE);
        }
        expect(cookieStore.get("session")).toBeUndefined();
    });

    it("redirects to the board list on a well-formed sign-up", async () => {
        // Arrange
        const email = `e2e-signup-redirect-${randomUUID()}@example.com`;
        const formData = buildFormData({ email, displayName: TEST_DISPLAY_NAME, password: TEST_PASSWORD });

        // Act
        await expect(signUpAction(AUTH_ACTION_IDLE, formData)).rejects.toThrow();

        // Assert
        expect(redirectTarget).toBe(ROUTE.BOARDS);
    });
});
