import { afterEach, describe, expect, it, vi } from "vitest";

import { createBaseCookieOptions, COOKIE } from "./cookie-registry";

describe("COOKIE", () => {
    it("names every cookie this app sets or reads, byte-identical to the values in use today", () => {
        expect(COOKIE.SESSION).toBe("session");
        expect(COOKIE.THEME).toBe("theme");
        expect(COOKIE.UPSTREAM_SESSION).toBe("JSESSIONID");
    });
});

describe("createBaseCookieOptions", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("returns sameSite lax and path / on every call", () => {
        expect(createBaseCookieOptions()).toMatchObject({ sameSite: "lax", path: "/" });
    });

    it("is not secure in development", () => {
        vi.stubEnv("NODE_ENV", "development");
        expect(createBaseCookieOptions().secure).toBe(false);
    });

    it("is secure outside development", () => {
        vi.stubEnv("NODE_ENV", "production");
        expect(createBaseCookieOptions().secure).toBe(true);
    });

    it("returns a fresh object per call — mutating one caller's result cannot affect another's", () => {
        const first = createBaseCookieOptions();
        const second = createBaseCookieOptions();

        expect(first).not.toBe(second);

        first.path = "/mutated";
        expect(second.path).toBe("/");
    });
});
