import "server-only";

import { randomUUID } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

import { COOKIE } from "@/lib/core/cookies/cookie-registry";
import { isTheme, type Theme } from "@/lib/core/theme/theme";

import { createCookieClient } from "./cookies/cookie-client";

/**
 * The identity shape carried inside the session cookie — the full `UserResponseDTO` returned by
 * `POST /signin` (Task 1 decision recorded in 01-10-SUMMARY.md), not just a bare user id, so
 * consumers never need a second round-trip to read a signed-in user's display name/theme.
 */
export type SessionPayload = {
    id: string;
    email: string;
    displayName: string;
    theme: Theme;
};

/**
 * Exported so `proxy.ts` can read the same cookie name from `NextRequest`'s own cookie API — it
 * runs outside the request scope `next/headers`'s `cookies()` needs, so it can't call
 * `session.verify()` directly.
 */
export const SESSION_COOKIE_NAME = COOKIE.SESSION;
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // seven days, absolute expiry (ADR tech/0001)

/**
 * Runtime guard for an unverified value claiming to be a `SessionPayload` — used by `verify()`
 * below and by the auth actions guarding a raw upstream response widened through `unknown`
 * (the generated type says `content?: never` for this operation's success case).
 */
export const isSessionPayload = (value: unknown): value is SessionPayload => {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
        typeof candidate.id === "string" &&
        typeof candidate.email === "string" &&
        typeof candidate.displayName === "string" &&
        isTheme(candidate.theme as string | undefined)
    );
};

/**
 * The identity plus the backend's own session credential — what the session cookie
 * actually carries and what `verify`/`verifyToken` return. Kept separate from `SessionPayload`
 * so callers guarding a bare upstream response body aren't forced to supply a credential.
 */
export type SessionRecord = SessionPayload & { jsessionId: string };

/**
 * Runtime guard for an unverified value claiming to be a `SessionRecord` — defers to
 * `isSessionPayload` for the identity fields and additionally requires `jsessionId` to be a
 * string.
 */
export const isSessionRecord = (value: unknown): value is SessionRecord => {
    if (!isSessionPayload(value)) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.jsessionId === "string";
};

/**
 * Builds an isolated session service over a given secret. Exported (not just the singleton below)
 * so tests can construct a throwaway instance with a test-only secret instead of mutating
 * `process.env` globally.
 */
export const createSessionService = (secret: string) => {
    const key = new TextEncoder().encode(secret);

    // The JWT string is the cookie value, so TValue is string; httpOnly stays explicit (T-02.1-09).
    const cookie = createCookieClient<string>({
        name: COOKIE.SESSION,
        decode: (raw) => raw ?? null,
        encode: (token) => token,
        options: { httpOnly: true },
    });

    const create = async (payload: SessionRecord): Promise<void> => {
        const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

        /*
         * `setJti` (a random JWT ID) guarantees a fresh value on every call even within the same
         * wall-clock second, closing the session-fixation gap (T-01-01) a byte-identical token
         * for two same-second sign-ins would otherwise reopen.
         */
        const value = await new SignJWT({ ...payload })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(expiresAt)
            .setJti(randomUUID())
            .sign(key);

        await cookie.write(value, { expires: expiresAt });
    };

    /**
     * The actual jose verify + shape check, taking a raw token rather than reading the cookie
     * itself — the piece `verify()` below and `proxy.ts`'s route guard both need, factored out
     * once so neither reimplements JWT verification.
     */
    const verifyToken = async (token: string | undefined): Promise<SessionRecord | null> => {
        if (!token) {
            return null;
        }

        try {
            const { payload } = await jwtVerify(token, key);

            if (!isSessionRecord(payload)) {
                return null;
            }

            /*
             * Return exactly the five identity-plus-credential fields — `payload` also carries
             * jose's own reserved claims (`iat`/`exp`/`jti`), which callers should never see or
             * depend on.
             */
            const { id, email, displayName, theme, jsessionId } = payload;
            return { id, email, displayName, theme, jsessionId };
        } catch {
            /*
             * Every failure mode (malformed, bad signature, expired) returns null rather than
             * throwing, so no caller can mistake a rejection for a transient error.
             */
            return null;
        }
    };

    const verify = async (): Promise<SessionRecord | null> => verifyToken((await cookie.read()) ?? undefined);

    const destroy = async (): Promise<void> => {
        await cookie.clear();
    };

    return { create, verify, verifyToken, destroy };
};

const secret = process.env.SESSION_SECRET;

if (!secret) {
    throw new Error(
        "SESSION_SECRET is not set. Generate one with `openssl rand -base64 32` and place it in " +
            ".env.local (see .env.example) — a default secret would fail silently, which is worse " +
            "than a missing one (ADR tech/0001).",
    );
}

/**
 * The single session-service instance every consumer in this app uses —
 * `session.create(...)`, `session.verify()`, `session.destroy()`.
 */
export const session = createSessionService(secret);
