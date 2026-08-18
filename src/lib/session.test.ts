import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionService, type SessionPayload, type SessionRecord } from "@/lib/session";

type CookieRecord = { value: string; options?: Record<string, unknown> };

/*
 * `session.ts` reads/writes through Next.js's `cookies()` (next/headers), which requires an
 * active request scope Next.js only provides inside a real Server Component/Route Handler render.
 * A plain Vitest test has no such scope, so `cookies()` is mocked here with an in-memory jar that
 * records exactly what a real cookie store would receive — the options passed to `.set()` are the
 * same values Next.js would serialise onto the real `Set-Cookie` header, so asserting against them
 * is equivalent to reading that header directly.
 */
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

const TEST_SECRET = "unit-test-session-secret-do-not-use-in-production";

const testPayload: SessionRecord = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "test@example.com",
    displayName: "Test User",
    theme: "LIGHT",
    jsessionId: "upstream-jsessionid-abc123",
};

describe("session", () => {
    beforeEach(() => {
        cookieStore.clear();
    });

    it("writes a cookie whose value is not the user id in readable form", async () => {
        const service = createSessionService(TEST_SECRET);
        await service.create(testPayload);

        const record = cookieStore.get("session");

        expect(record).toBeDefined();
        expect(record?.value).not.toContain(testPayload.id);
        // A JWT is header.payload.signature — three base64url segments, not plaintext JSON.
        expect(record?.value.split(".")).toHaveLength(3);
    });

    it("writes the cookie with httpOnly, Secure and SameSite set", async () => {
        /*
         * Force the non-development branch explicitly (Vercel Preview/Production) rather than
         * asserting against whatever NODE_ENV happens to be in this test run — a real check on
         * the flag's value, not a tautology against the same expression session.ts itself uses.
         */
        vi.stubEnv("NODE_ENV", "production");
        const service = createSessionService(TEST_SECRET);
        await service.create(testPayload);
        vi.unstubAllEnvs();

        const record = cookieStore.get("session");

        expect(record?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax" });
    });

    it("relaxes Secure only for local development (gated on NODE_ENV, not a custom flag)", async () => {
        vi.stubEnv("NODE_ENV", "development");
        const service = createSessionService(TEST_SECRET);
        await service.create(testPayload);
        vi.unstubAllEnvs();

        const record = cookieStore.get("session");

        expect(record?.options).toMatchObject({ secure: false });
    });

    it("returns the identity and the upstream credential it was created for on verification", async () => {
        const service = createSessionService(TEST_SECRET);
        await service.create(testPayload);

        await expect(service.verify()).resolves.toEqual(testPayload);
    });

    it("returns null and does not throw for a token carrying the identity but no upstream credential", async () => {
        const service = createSessionService(TEST_SECRET);
        const key = new TextEncoder().encode(TEST_SECRET);
        const identityOnlyPayload: SessionPayload = {
            id: testPayload.id,
            email: testPayload.email,
            displayName: testPayload.displayName,
            theme: testPayload.theme,
        };
        const tokenWithNoCredential = await new SignJWT({ ...identityOnlyPayload })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(Math.floor(Date.now() / 1000) + 60 * 60)
            .sign(key);
        cookieStore.set("session", { value: tokenWithNoCredential });

        await expect(service.verify()).resolves.toBeNull();
    });

    it("returns null for a session whose value has had a character altered", async () => {
        const service = createSessionService(TEST_SECRET);
        await service.create(testPayload);

        const record = cookieStore.get("session");
        if (!record) {
            throw new Error("expected create() to have written a cookie");
        }
        /*
         * Flip a character inside the PAYLOAD segment, not the signature's last character — a
         * naive last-character flip can land on HS256's unused trailing padding bits (32 bytes
         * base64url-encodes to 43 characters, so the final character's low 2 bits are never
         * decoded), leaving the signature bytes — and therefore verification — unchanged. Altering
         * the payload instead guarantees the recomputed signature no longer matches.
         */
        const [header, payload, signature] = record.value.split(".");
        if (!header || !payload || !signature) {
            throw new Error("expected create() to have written a well-formed JWT");
        }
        const tamperIndex = Math.floor(payload.length / 2);
        const originalChar = payload[tamperIndex];
        const flippedChar = originalChar === "A" ? "B" : "A";
        const tamperedPayload = payload.slice(0, tamperIndex) + flippedChar + payload.slice(tamperIndex + 1);
        cookieStore.set("session", {
            value: `${header}.${tamperedPayload}.${signature}`,
            options: record.options,
        });

        await expect(service.verify()).resolves.toBeNull();
    });

    it("returns null for a session created with an expiry in the past", async () => {
        const service = createSessionService(TEST_SECRET);
        const key = new TextEncoder().encode(TEST_SECRET);
        const expiredToken = await new SignJWT({ ...testPayload })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
            .sign(key);
        cookieStore.set("session", { value: expiredToken });

        await expect(service.verify()).resolves.toBeNull();
    });

    it("returns null and does not throw for a malformed (non-JWT) cookie value", async () => {
        const service = createSessionService(TEST_SECRET);
        cookieStore.set("session", { value: "not-a-jwt" });

        await expect(service.verify()).resolves.toBeNull();
    });

    it("returns null and does not throw when no cookie is present", async () => {
        const service = createSessionService(TEST_SECRET);

        await expect(service.verify()).resolves.toBeNull();
    });

    it("produces a different cookie value on two consecutive creates for the same identity", async () => {
        const service = createSessionService(TEST_SECRET);

        await service.create(testPayload);
        const first = cookieStore.get("session")?.value;

        await service.create(testPayload);
        const second = cookieStore.get("session")?.value;

        expect(first).toBeDefined();
        expect(second).toBeDefined();
        expect(first).not.toBe(second);
    });

    it("makes the next verification return null after deletion", async () => {
        const service = createSessionService(TEST_SECRET);
        await service.create(testPayload);
        await service.destroy();

        await expect(service.verify()).resolves.toBeNull();
    });
});
