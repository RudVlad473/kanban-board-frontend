import { beforeEach, describe, expect, it, vi } from "vitest";

import { THEME } from "@/lib/core/theme/theme";

import { themeCookie } from "./theme-cookie";

/*
 * `next/headers`'s `cookies()` requires a real Next.js request scope this plain Vitest test has
 * none of — mocked with the same in-memory jar `session.test.ts` already uses.
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

// eslint-disable-next-line no-restricted-properties -- next/headers' cookies() has no real request scope in a Vitest run (D-19)
vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve(fakeCookieJar)),
}));

describe("themeCookie", () => {
    beforeEach(() => {
        cookieStore.clear();
    });

    describe("read", () => {
        it("returns the theme when the cookie holds a valid value", async () => {
            cookieStore.set("theme", { value: THEME.DARK });

            await expect(themeCookie.read()).resolves.toBe(THEME.DARK);
        });

        it("returns null when the cookie is absent", async () => {
            await expect(themeCookie.read()).resolves.toBeNull();
        });

        const tamperedValues = ["purple", "dark", ""];
        for (const value of tamperedValues) {
            it(`returns null for a tampered value (${JSON.stringify(value)})`, async () => {
                cookieStore.set("theme", { value });

                await expect(themeCookie.read()).resolves.toBeNull();
            });
        }
    });

    describe("write", () => {
        it("writes the cookie with the expected name, value, flags and one-year maxAge", async () => {
            await themeCookie.write(THEME.DARK);

            const record = cookieStore.get("theme");

            expect(record?.value).toBe(THEME.DARK);
            expect(record?.options).toMatchObject({
                httpOnly: false,
                sameSite: "lax",
                path: "/",
                maxAge: 31536000,
            });
        });
    });

    describe("clear", () => {
        it("deletes the theme cookie", async () => {
            cookieStore.set("theme", { value: THEME.DARK });

            await themeCookie.clear();

            expect(cookieStore.has("theme")).toBe(false);
        });
    });
});
