import { randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node-server";
import { DEMO_USER_EMAIL, DEMO_USER_PASSWORD } from "@/lib/mocks/store";

type CookieRecord = { value: string; options?: Record<string, unknown> };

/*
 * Same rationale as src/lib/session.test.ts: the Route Handlers under test call `session.create`/
 * `session.destroy`, which read/write through Next.js's `cookies()` — a real request scope only
 * Next.js's own render/Route Handler pipeline provides. Mocked here with an in-memory jar so the
 * options passed to `.set()` (asserted below) are the same values Next.js would serialise onto
 * the real `Set-Cookie` header.
 */
const cookieStore = new Map<string, CookieRecord>();

const fakeCookieJar = {
    get: (name: string) => {
        const record = cookieStore.get(name);
        return record ? { name, value: record.value } : undefined;
    },
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
 * `openapi-fetch`'s `createClient()` (used once, at module scope, by src/lib/api/server-client.ts)
 * snapshots `globalThis.fetch` as a default parameter at the moment that module is first
 * evaluated — the same pitfall 01-10-SUMMARY.md documents for its own test client. The Route
 * Handlers under test import that module-scope singleton transitively, so MSW's Node server MUST
 * already be listening (patching `globalThis.fetch`) BEFORE the dynamic imports below trigger
 * that first evaluation — starting it inside `beforeAll` would run too late.
 */
server.listen({ onUnhandledRequest: "error" });

const { POST: signUp } = await import("./signup/route");
const { POST: signIn } = await import("./signin/route");
const { POST: signOut } = await import("./signout/route");
const { verifySession } = await import("@/lib/dal");

const jsonRequest = (body: unknown) =>
    new Request("http://localhost/api/auth/irrelevant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });

const uniqueEmail = () => `signup-${randomUUID()}@test.dev`;

beforeEach(() => {
    cookieStore.clear();
});
afterEach(() => {
    server.resetHandlers();
});
afterAll(() => {
    server.close();
});

describe("POST /api/auth/signup", () => {
    it("creates the account upstream and returns success with a session cookie set", async () => {
        const email = uniqueEmail();
        const response = await signUp(jsonRequest({ displayName: "New User", email, password: "correct-password" }));

        expect(response.status).toBe(200);
        expect(cookieStore.get("session")).toBeDefined();
        await expect(verifySession()).resolves.toMatchObject({ email, displayName: "New User" });
    });

    it("returns 400 with a per-field message and sets no cookie for a missing required field", async () => {
        const response = await signUp(jsonRequest({ displayName: "", email: uniqueEmail(), password: "irrelevant" }));
        const body = (await response.json()) as { errors: Record<string, string> };

        expect(response.status).toBe(400);
        expect(body.errors.displayName).toBe("Can't be empty");
        expect(cookieStore.get("session")).toBeUndefined();
    });

    it("returns a non-2xx response with the generic failure copy for an already-registered email, and sets no cookie", async () => {
        const response = await signUp(
            jsonRequest({ displayName: "Duplicate Demo", email: DEMO_USER_EMAIL, password: "whatever" }),
        );
        const body = (await response.json()) as { message: string };

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(600);
        expect(body.message).toContain("couldn't create your account");
        expect(cookieStore.get("session")).toBeUndefined();
    });
});

describe("POST /api/auth/signin", () => {
    it("returns success with a fresh session cookie for valid credentials", async () => {
        /*
         * Force the non-development branch explicitly — see src/lib/session.test.ts's identical
         * rationale for not asserting against whatever NODE_ENV happens to be in this test run.
         */
        vi.stubEnv("NODE_ENV", "production");
        const response = await signIn(jsonRequest({ email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD }));
        vi.unstubAllEnvs();

        expect(response.status).toBe(200);
        const record = cookieStore.get("session");
        expect(record).toBeDefined();
        expect(record?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax" });

        await expect(verifySession()).resolves.toMatchObject({ email: DEMO_USER_EMAIL });
    });

    it("issues a different session value than a prior sign-in for the same account", async () => {
        await signIn(jsonRequest({ email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD }));
        const first = cookieStore.get("session")?.value;

        await signIn(jsonRequest({ email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD }));
        const second = cookieStore.get("session")?.value;

        expect(first).toBeDefined();
        expect(second).toBeDefined();
        expect(first).not.toBe(second);
    });

    it("returns byte-identical responses for a wrong password and an unknown email, and sets no cookie", async () => {
        const wrongPasswordResponse = await signIn(
            jsonRequest({ email: DEMO_USER_EMAIL, password: "not-the-right-password" }),
        );
        const wrongPasswordBody = (await wrongPasswordResponse.json()) as { message: string };
        expect(cookieStore.get("session")).toBeUndefined();

        const unknownEmailResponse = await signIn(jsonRequest({ email: uniqueEmail(), password: "irrelevant" }));
        const unknownEmailBody = (await unknownEmailResponse.json()) as { message: string };
        expect(cookieStore.get("session")).toBeUndefined();

        expect(wrongPasswordResponse.status).toBe(unknownEmailResponse.status);
        expect(wrongPasswordBody).toEqual(unknownEmailBody);
    });

    it("returns 400 without ever reaching the upstream mock for a schema-invalid body", async () => {
        let signinMatchCount = 0;
        const countSigninMatch = ({ request }: { request: Request }) => {
            if (request.url.includes("/signin")) {
                signinMatchCount += 1;
            }
        };
        server.events.on("request:match", countSigninMatch);

        try {
            const response = await signIn(jsonRequest({ email: "", password: "" }));
            const body = (await response.json()) as { errors: Record<string, string> };

            expect(response.status).toBe(400);
            expect(body.errors.email).toBe("Can't be empty");
            expect(signinMatchCount).toBe(0);
        } finally {
            server.events.removeListener("request:match", countSigninMatch);
        }
    });
});

describe("POST /api/auth/signout", () => {
    it("clears the session cookie so a subsequent identity check returns nothing", async () => {
        await signIn(jsonRequest({ email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD }));
        await expect(verifySession()).resolves.not.toBeNull();

        const response = await signOut();

        expect(response.status).toBe(200);
        expect(cookieStore.get("session")).toBeUndefined();
        await expect(verifySession()).resolves.toBeNull();
    });
});

describe("password leakage", () => {
    it("never includes the submitted password in any response body, on success or on any error path", async () => {
        const password = `super-secret-${randomUUID()}`;

        const responses = await Promise.all([
            signUp(jsonRequest({ displayName: "", email: uniqueEmail(), password })),
            signUp(jsonRequest({ displayName: "Leak Check", email: DEMO_USER_EMAIL, password })),
            signIn(jsonRequest({ email: DEMO_USER_EMAIL, password })),
            signIn(jsonRequest({ email: "", password })),
        ]);

        for (const response of responses) {
            const text = await response.text();
            expect(text).not.toContain(password);
        }
    });
});
