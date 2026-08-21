import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH_ACTION_IDLE } from "@/features/auth/action-state";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { ROUTE } from "@/lib/core/routing/routes";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { upstreamCookie } from "@/lib/server/cookies/upstream-cookie";
import { externalApi } from "@/lib/server/server-client";
import { isSessionPayload, session } from "@/lib/server/session";

import { signOutAction } from "./sign-out";

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

describe("signOutAction (real backend)", () => {
    beforeEach(() => {
        cookieStore.clear();
        redirectTarget = undefined;
    });

    it("clears both the session cookie and the theme cookie and redirects to sign-in with a real session", async () => {
        // Arrange — a real account, staged exactly as server-client.integration.test.ts does.
        const email = `e2e-signout-${randomUUID()}@example.com`;
        const signUpResult = await externalApi.POST(EXTERNAL_PATH.SIGN_UP, {
            body: { email, password: TEST_PASSWORD, displayName: TEST_DISPLAY_NAME },
        });
        const identity: unknown = signUpResult.data;
        if (!isSessionPayload(identity)) {
            throw new Error(
                `expected POST /signup to return a session-payload-shaped identity, got: ${JSON.stringify(identity)}`,
            );
        }
        const jsessionId = upstreamCookie.extract(signUpResult.response);
        if (!jsessionId) {
            throw new Error("expected a bridged upstream session credential on the sign-up response");
        }
        await session.create({ ...identity, jsessionId });
        await themeCookie.write(identity.theme);
        const formData = buildFormData({});

        // Act
        await expect(signOutAction(AUTH_ACTION_IDLE, formData)).rejects.toThrow();

        // Assert
        expect(cookieStore.get("session")).toBeUndefined();
        await expect(themeCookie.read()).resolves.toBeNull();
        expect(redirectTarget).toBe(ROUTE.SIGN_IN);
    });

    it("clears cookies and redirects rather than throwing when there is no session", async () => {
        // Arrange — no session and no theme cookie staged.
        const formData = buildFormData({});

        // Act
        await expect(signOutAction(AUTH_ACTION_IDLE, formData)).rejects.toThrow();

        // Assert
        expect(cookieStore.get("session")).toBeUndefined();
        expect(redirectTarget).toBe(ROUTE.SIGN_IN);
    });
});
