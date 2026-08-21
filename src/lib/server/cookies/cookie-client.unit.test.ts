import { beforeEach, describe, expect, it, vi } from "vitest";

import { COOKIE } from "@/lib/core/cookies/cookie-registry";

import { createCookieClient } from "./cookie-client";

/*
 * `next/headers`'s `cookies()` requires a real Next.js request scope, which a Vitest run has none
 * of (D-19's narrow framework/environment-shim exception — this is not a business-logic double).
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

const VALID_VALUES = ["one", "two"];
const isValidValue = (raw: string | undefined): raw is string => raw !== undefined && VALID_VALUES.includes(raw);

describe("createCookieClient", () => {
    beforeEach(() => {
        cookieStore.clear();
    });

    describe("read", () => {
        it("returns the decoded value when the cookie holds something the decoder accepts", async () => {
            // Arrange
            const client = createCookieClient<string>({
                name: COOKIE.THEME,
                decode: (raw) => (isValidValue(raw) ? raw : null),
                encode: (value) => value,
                options: { httpOnly: false },
            });
            cookieStore.set(COOKIE.THEME, { value: "one" });

            // Act
            const result = await client.read();

            // Assert
            expect(result).toBe("one");
        });

        it("returns null when the cookie is absent", async () => {
            // Arrange
            const client = createCookieClient<string>({
                name: COOKIE.THEME,
                decode: (raw) => (isValidValue(raw) ? raw : null),
                encode: (value) => value,
                options: { httpOnly: false },
            });

            // Act / Assert
            await expect(client.read()).resolves.toBeNull();
        });

        it("returns null when the cookie holds a value the decoder rejects (tampered)", async () => {
            // Arrange
            const client = createCookieClient<string>({
                name: COOKIE.THEME,
                decode: (raw) => (isValidValue(raw) ? raw : null),
                encode: (value) => value,
                options: { httpOnly: false },
            });
            cookieStore.set(COOKIE.THEME, { value: "tampered" });

            // Act / Assert
            await expect(client.read()).resolves.toBeNull();
        });
    });

    describe("write", () => {
        it("sets the cookie under its registered name with the client's own configured options merged over baseCookieOptions()", async () => {
            // Arrange
            const client = createCookieClient<string>({
                name: COOKIE.THEME,
                decode: (raw) => (isValidValue(raw) ? raw : null),
                encode: (value) => value,
                options: { httpOnly: false, maxAge: 100 },
            });

            // Act
            await client.write("one");

            // Assert
            const record = cookieStore.get(COOKIE.THEME);
            expect(record?.value).toBe("one");
            expect(record?.options).toMatchObject({
                httpOnly: false,
                maxAge: 100,
                sameSite: "lax",
                path: "/",
            });
        });

        it("merges a per-call option override on top of the configured options without mutating the client's own configuration for the next call", async () => {
            // Arrange
            const client = createCookieClient<string>({
                name: COOKIE.THEME,
                decode: (raw) => (isValidValue(raw) ? raw : null),
                encode: (value) => value,
                options: { httpOnly: false, maxAge: 100 },
            });
            const overrideExpires = new Date("2030-01-01T00:00:00.000Z");

            // Act — first call carries a per-call override, second call does not.
            await client.write("one", { expires: overrideExpires });
            const overriddenRecord = cookieStore.get(COOKIE.THEME);
            await client.write("two");
            const plainRecord = cookieStore.get(COOKIE.THEME);

            // Assert
            expect(overriddenRecord?.options).toMatchObject({ expires: overrideExpires, maxAge: 100 });
            expect(plainRecord?.options).not.toHaveProperty("expires");
            expect(plainRecord?.options).toMatchObject({ maxAge: 100 });
        });
    });

    describe("clear", () => {
        it("deletes the cookie by its registered name", async () => {
            // Arrange
            const client = createCookieClient<string>({
                name: COOKIE.THEME,
                decode: (raw) => (isValidValue(raw) ? raw : null),
                encode: (value) => value,
                options: { httpOnly: false },
            });
            cookieStore.set(COOKIE.THEME, { value: "one" });

            // Act
            await client.clear();

            // Assert
            expect(cookieStore.has(COOKIE.THEME)).toBe(false);
        });
    });

    it("never sees another client's values for a different cookie name", async () => {
        // Arrange
        const themeClient = createCookieClient<string>({
            name: COOKIE.THEME,
            decode: (raw) => (isValidValue(raw) ? raw : null),
            encode: (value) => value,
            options: { httpOnly: false },
        });
        const sessionClient = createCookieClient<string>({
            name: COOKIE.SESSION,
            decode: (raw) => raw ?? null,
            encode: (value) => value,
            options: { httpOnly: true },
        });

        // Act
        await themeClient.write("one");
        await sessionClient.write("session-token");

        // Assert
        await expect(themeClient.read()).resolves.toBe("one");
        await expect(sessionClient.read()).resolves.toBe("session-token");
    });
});
