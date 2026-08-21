import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionService, type SessionPayload, type SessionRecord } from "@/lib/server/session";
import { createSessionRecord } from "@/test-utils/factories/session-record";

type CookieRecord = { value: string; options?: Record<string, unknown> };

/*
 * `next/headers`'s `cookies()` needs a real Next.js request scope this plain Vitest test has
 * none of — mocked with an in-memory jar; see docs/adr/tech/0020 for the policy (D-19 shim).
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

// eslint-disable-next-line no-restricted-properties -- next/headers' cookies() has no real request scope in a Vitest run (D-19)
vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve(fakeCookieJar)),
}));

const TEST_SECRET = "unit-test-session-secret-do-not-use-in-production";

const testPayload: SessionRecord = createSessionRecord();

describe("session", () => {
    beforeEach(() => {
        cookieStore.clear();
    });

    it("writes a cookie whose value is not the user id in readable form", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);

        // Act
        await service.create(testPayload);

        // Assert
        const record = cookieStore.get("session");
        expect(record).toBeDefined();
        expect(record?.value).not.toContain(testPayload.id);
        // A JWT is header.payload.signature — three base64url segments, not plaintext JSON.
        expect(record?.value.split(".")).toHaveLength(3);
    });

    it("writes the cookie with httpOnly, Secure and SameSite set", async () => {
        // Arrange — force the non-development branch explicitly, not whatever NODE_ENV this run happens to have.
        vi.stubEnv("NODE_ENV", "production");
        const service = createSessionService(TEST_SECRET);

        // Act
        await service.create(testPayload);
        vi.unstubAllEnvs();

        // Assert
        const record = cookieStore.get("session");
        expect(record?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax" });
    });

    it("relaxes Secure only for local development (gated on NODE_ENV, not a custom flag)", async () => {
        // Arrange
        vi.stubEnv("NODE_ENV", "development");
        const service = createSessionService(TEST_SECRET);

        // Act
        await service.create(testPayload);
        vi.unstubAllEnvs();

        // Assert
        const record = cookieStore.get("session");
        expect(record?.options).toMatchObject({ secure: false });
    });

    it("returns the identity and the upstream credential it was created for on verification", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);
        await service.create(testPayload);

        // Act / Assert
        await expect(service.verify()).resolves.toEqual(testPayload);
    });

    it("returns null and does not throw for a token carrying the identity but no upstream credential", async () => {
        // Arrange
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

        // Act / Assert
        await expect(service.verify()).resolves.toBeNull();
    });

    it("returns null for a session whose value has had a character altered", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);
        await service.create(testPayload);

        const record = cookieStore.get("session");
        if (!record) {
            throw new Error("expected create() to have written a cookie");
        }
        /*
         * Flip a character inside the PAYLOAD segment, not the signature — a last-character flip
         * can land on HS256's unused base64url padding bits, leaving the signature unchanged.
         */
        const [header, payload, signature] = record.value.split(".");
        if (!header || !payload || !signature) {
            throw new Error("expected create() to have written a well-formed JWT");
        }
        const tamperIndex = Math.floor(payload.length / 2);
        const originalChar = payload[tamperIndex];
        const flippedChar = originalChar === "A" ? "B" : "A";
        const tamperedPayload = payload.slice(0, tamperIndex) + flippedChar + payload.slice(tamperIndex + 1);

        // Act
        cookieStore.set("session", {
            value: `${header}.${tamperedPayload}.${signature}`,
            options: record.options,
        });

        // Assert
        await expect(service.verify()).resolves.toBeNull();
    });

    it("returns null for a session created with an expiry in the past", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);
        const key = new TextEncoder().encode(TEST_SECRET);
        const expiredToken = await new SignJWT({ ...testPayload })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
            .sign(key);
        cookieStore.set("session", { value: expiredToken });

        // Act / Assert
        await expect(service.verify()).resolves.toBeNull();
    });

    it("returns null and does not throw for a malformed (non-JWT) cookie value", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);
        cookieStore.set("session", { value: "not-a-jwt" });

        // Act / Assert
        await expect(service.verify()).resolves.toBeNull();
    });

    it("returns null and does not throw when no cookie is present", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);

        // Act / Assert
        await expect(service.verify()).resolves.toBeNull();
    });

    it("produces a different cookie value on two consecutive creates for the same identity", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);

        // Act
        await service.create(testPayload);
        const first = cookieStore.get("session")?.value;

        await service.create(testPayload);
        const second = cookieStore.get("session")?.value;

        // Assert
        expect(first).toBeDefined();
        expect(second).toBeDefined();
        expect(first).not.toBe(second);
    });

    it("makes the next verification return null after deletion", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);
        await service.create(testPayload);

        // Act
        await service.destroy();

        // Assert
        await expect(service.verify()).resolves.toBeNull();
    });
});
