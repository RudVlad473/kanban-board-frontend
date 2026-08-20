import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTE } from "@/lib/core/routing/routes";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { externalApi } from "@/lib/server/server-client";

import { AUTH_ACTION_IDLE } from "../action-state";
import { signOutAction } from "./sign-out";

/*
 * `@/lib/server/server-client` is stubbed here too, matching sign-in.unit.test.ts/
 * sign-up.unit.test.ts — `signOutAction` never calls it, and asserting `mockedPost` was never
 * invoked is this file's own proof that sign-out asks the backend for nothing.
 */
vi.mock("@/lib/server/server-client", () => ({
    externalApi: { POST: vi.fn() },
}));

/*
 * Mocked directly (rather than observed through the fake cookie jar below) so this test asserts
 * the exact call `signOutAction` makes, not an indirect effect on cookie storage (FT-01).
 */
vi.mock("@/lib/server/cookies/theme-cookie", () => ({
    themeCookie: { clear: vi.fn() },
}));

/*
 * `next/headers`'s `cookies()` requires a real Next.js request scope this plain Vitest test has
 * none of — stubbed with the same in-memory cookie jar `src/lib/server/session.test.ts` uses, so
 * `session.ts` itself (unmocked) runs its real create/verify/destroy logic against it.
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
 * `redirect()` signals success by throwing in real Next.js — stubbed as a plain spy so the
 * navigation is observable rather than thrown into the void.
 */
const redirectSpy = vi.fn();
vi.mock("next/navigation", () => ({
    redirect: (path: string) => {
        redirectSpy(path);
    },
}));

const mockedPost = vi.mocked(externalApi.POST);
const mockedThemeCookieClear = vi.mocked(themeCookie.clear);

const buildFormData = (fields: Record<string, string>): FormData => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
    }
    return formData;
};

beforeEach(() => {
    cookieStore.clear();
    mockedPost.mockReset();
    redirectSpy.mockReset();
    mockedThemeCookieClear.mockReset();
});

describe("signOutAction", () => {
    it("destroys the local session, clears the theme cookie, and redirects to sign-in, without calling the backend at all", async () => {
        // Arrange
        cookieStore.set("session", { value: "some-signed-session-token" });
        const formData = buildFormData({});

        // Act
        await signOutAction(AUTH_ACTION_IDLE, formData);

        // Assert
        expect(cookieStore.get("session")).toBeUndefined();
        expect(mockedThemeCookieClear).toHaveBeenCalledExactlyOnceWith();
        expect(redirectSpy).toHaveBeenCalledExactlyOnceWith(ROUTE.SIGN_IN);
        expect(mockedPost).not.toHaveBeenCalled();
    });
});
