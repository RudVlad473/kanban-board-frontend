import "server-only";

import { randomUUID } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

/**
 * The identity shape carried inside the session cookie — the full `UserResponseDTO` returned by
 * `POST /signin` (Task 1 decision recorded in 01-10-SUMMARY.md), not just a bare user id, so
 * consumers never need a second round-trip to read a signed-in user's display name/theme.
 */
export type SessionPayload = {
    id: string;
    email: string;
    displayName: string;
    theme: "LIGHT" | "DARK";
};

const COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // seven days, absolute expiry (ADR tech/0001)

const isSessionPayload = (value: unknown): value is SessionPayload => {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
        typeof candidate.id === "string" &&
        typeof candidate.email === "string" &&
        typeof candidate.displayName === "string" &&
        (candidate.theme === "LIGHT" || candidate.theme === "DARK")
    );
};

/**
 * Builds an isolated session service over a given secret. Exported (not just the singleton below)
 * so tests can construct a throwaway instance with a test-only secret instead of mutating
 * `process.env` globally.
 */
export const createSessionService = (secret: string) => {
    const key = new TextEncoder().encode(secret);

    const create = async (payload: SessionPayload): Promise<void> => {
        const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

        /*
         * `setJti` (a random JWT ID) guarantees a fresh value on every call even when two calls
         * land within the same wall-clock second — `setIssuedAt`/`setExpirationTime` alone would
         * otherwise produce a byte-identical token for two sign-ins in the same second, silently
         * reintroducing the session-fixation gap (T-01-01) this function exists to close.
         */
        const value = await new SignJWT({ ...payload })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(expiresAt)
            .setJti(randomUUID())
            .sign(key);

        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, value, {
            httpOnly: true,
            /*
             * Vercel Preview/Production are always HTTPS; only a local `next dev` over
             * http://localhost needs this relaxed, gated on the Node environment rather than a
             * custom flag per the plan's explicit instruction.
             */
            secure: process.env.NODE_ENV !== "development",
            sameSite: "lax",
            path: "/",
            expires: expiresAt,
        });
    };

    const verify = async (): Promise<SessionPayload | null> => {
        const cookieStore = await cookies();
        const value = cookieStore.get(COOKIE_NAME)?.value;

        if (!value) {
            return null;
        }

        try {
            const { payload } = await jwtVerify(value, key);

            if (!isSessionPayload(payload)) {
                return null;
            }

            /*
             * Return exactly the four identity fields — `payload` also carries jose's own
             * reserved claims (`iat`/`exp`/`jti`), which callers should never see or depend on.
             */
            const { id, email, displayName, theme } = payload;
            return { id, email, displayName, theme };
        } catch {
            /*
             * Every failure mode (malformed, bad signature, expired) returns null rather than
             * throwing, so no caller can mistake a rejection for a transient error.
             */
            return null;
        }
    };

    const destroy = async (): Promise<void> => {
        const cookieStore = await cookies();
        cookieStore.delete(COOKIE_NAME);
    };

    return { create, verify, destroy };
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
