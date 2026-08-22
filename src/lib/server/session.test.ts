import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { createSessionService, type SessionPayload } from "@/lib/server/session";
import { createSessionRecord } from "@/test-utils/factories/session-record";

/*
 * D-13: mock-free — the request-scoped cookies module is never imported here. `verifyToken` never
 * calls `cookies()`, so every JWT rejection path is driven directly through it with no jar.
 *
 * Relocated assertions (ledger rows 8, 9, 10, 17, 18 — see 02.2-08-SUMMARY.md for the full table):
 * - row 8 (cookie value is not the user id; three-segment JWT) -> plan 02.2-05's extended AUTH-01
 * - row 9 (httpOnly/Secure/SameSite flags) -> plan 02.2-07's e2e/cookie-policy.e2e.spec.ts
 * - row 10 (Secure relaxed only in development) -> src/lib/core/cookies/cookie-registry.unit.test.ts
 * - row 17 (two consecutive creates differ) -> this plan's e2e/session-bridge.e2e.spec.ts SESSION-02
 * - row 18 (verify() returns null after destroy) -> plan 02.2-05's sign-out tests + AUTH-03
 */

const TEST_SECRET = "unit-test-session-secret-do-not-use-in-production";
const key = new TextEncoder().encode(TEST_SECRET);

describe("createSessionService(secret).verifyToken", () => {
    it("returns exactly the five identity-plus-credential fields, stripping jose's reserved claims", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);
        const record = createSessionRecord();
        const token = await new SignJWT({ ...record })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(Math.floor(Date.now() / 1000) + 60 * 60)
            .setJti("fixture-jti")
            .sign(key);

        // Act
        const resolved = await service.verifyToken(token);

        // Assert
        expect(resolved).toEqual(record);
        expect(resolved && Object.keys(resolved)).toHaveLength(5);
    });

    it("returns null for a token carrying the identity but no upstream credential", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);
        const record = createSessionRecord();
        const identityOnlyPayload: SessionPayload = {
            id: record.id,
            email: record.email,
            displayName: record.displayName,
            theme: record.theme,
        };
        const tokenWithNoCredential = await new SignJWT({ ...identityOnlyPayload })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(Math.floor(Date.now() / 1000) + 60 * 60)
            .sign(key);

        // Act / Assert
        await expect(service.verifyToken(tokenWithNoCredential)).resolves.toBeNull();
    });

    it("returns null for a token whose payload segment has had a character altered", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);
        const record = createSessionRecord();
        const token = await new SignJWT({ ...record })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(Math.floor(Date.now() / 1000) + 60 * 60)
            .sign(key);

        const [header, payload, signature] = token.split(".");
        if (!header || !payload || !signature) {
            throw new Error("expected a well-formed JWT");
        }
        /*
         * Flip a character inside the PAYLOAD segment, not the signature — a last-character flip
         * can land on HS256's unused base64url padding bits, leaving the signature unchanged.
         */
        const tamperIndex = Math.floor(payload.length / 2);
        const originalChar = payload[tamperIndex];
        const flippedChar = originalChar === "A" ? "B" : "A";
        const tamperedPayload = payload.slice(0, tamperIndex) + flippedChar + payload.slice(tamperIndex + 1);
        const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

        // Act / Assert
        await expect(service.verifyToken(tamperedToken)).resolves.toBeNull();
    });

    it("returns null for a token with an expiry in the past", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);
        const record = createSessionRecord();
        const expiredToken = await new SignJWT({ ...record })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
            .sign(key);

        // Act / Assert
        await expect(service.verifyToken(expiredToken)).resolves.toBeNull();
    });

    it("returns null and does not throw for a malformed (non-JWT) value", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);

        // Act / Assert
        await expect(service.verifyToken("not-a-jwt")).resolves.toBeNull();
    });

    it("returns null and does not throw for an absent token", async () => {
        // Arrange
        const service = createSessionService(TEST_SECRET);

        // Act / Assert
        await expect(service.verifyToken(undefined)).resolves.toBeNull();
    });
});
