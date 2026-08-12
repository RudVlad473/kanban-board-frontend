import { randomUUID } from "node:crypto";

import createClient from "openapi-fetch";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { paths } from "@/lib/api/generated-types";
import { DEMO_USER_EMAIL, DEMO_USER_ID, DEMO_USER_PASSWORD, THEME, type Theme } from "@/lib/mocks/store";

import { server } from "./node-server";

/*
 * `POST /signin`'s documented contract response is a bare 200 with no body — the Task 1
 * checkpoint decision fills that gap with the full UserResponseDTO shape, so the generated
 * client type still says `content?: never` for its success case. openapi-fetch's runtime always
 * calls `.json()` by default (it doesn't sniff the actual Content-Type header), so the mock's
 * real JSON body still lands in `data` at runtime — it's just mistyped as `never`/`undefined`
 * from the generated type's perspective. Widen through `unknown` to read it.
 */
type MockUserResponseBody = { id: string; email: string; displayName: string; theme: Theme };
type MockErrorResponseBody = { message: string };

const getExternalApiBaseUrlForTest = () => {
    const baseUrl = process.env.EXTERNAL_API_BASE_URL;

    if (!baseUrl) {
        throw new Error("EXTERNAL_API_BASE_URL must be set for this test (see vitest.config.ts's node project).");
    }

    return baseUrl;
};

const baseUrl = getExternalApiBaseUrlForTest();

/*
 * `createClient` snapshots `globalThis.fetch` at call time (openapi-fetch's `baseFetch =
 * globalThis.fetch` default parameter) rather than resolving it per-request — so the client MUST
 * be created only after `server.listen()` has already patched the global, or every request
 * silently bypasses MSW and hits the real network. Declared here, assigned inside `beforeAll`.
 */
let client: ReturnType<typeof createClient<paths>>;

beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
    client = createClient<paths>({ baseUrl });
});
afterEach(() => {
    server.resetHandlers();
});
afterAll(() => {
    server.close();
});

const uniqueEmail = () => `signup-${randomUUID()}@test.dev`;

/**
 * `POST /signup`'s contract response is a bare string body, not JSON — openapi-fetch's runtime
 * always defaults to `.json()` unless told otherwise, so every signup call in this file must
 * pass `parseAs: "text"` or `JSON.parse` chokes on the raw id string.
 */
const signUp = (input: { displayName: string; email: string; password: string }) =>
    client.POST("/signup", { body: input, parseAs: "text" });

describe("POST /signup", () => {
    it("returns the new user's bare id and makes the account signinable afterward", async () => {
        const email = uniqueEmail();
        const password = "correct-password";

        const { data, error } = await signUp({ displayName: "New User", email, password });

        expect(error).toBeUndefined();
        expect(typeof data).toBe("string");

        const signinResult = await client.POST("/signin", { body: { email, password } });
        const signinBody = signinResult.data as unknown as MockUserResponseBody;

        expect(signinResult.response.status).toBe(200);
        expect(signinBody).toMatchObject({ email, displayName: "New User", theme: THEME.LIGHT });
    });

    it("returns a non-2xx response for an email that already exists", async () => {
        const { response } = await signUp({
            displayName: "Duplicate Demo",
            email: DEMO_USER_EMAIL,
            password: "whatever",
        });

        expect(response.ok).toBe(false);
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(600);
    });
});

describe("POST /signin", () => {
    it("returns the full identity shape for correct credentials", async () => {
        const signinResult = await client.POST("/signin", {
            body: { email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD },
        });
        const body = signinResult.data as unknown as MockUserResponseBody;

        expect(signinResult.response.status).toBe(200);
        expect(body).toEqual({
            id: DEMO_USER_ID,
            email: DEMO_USER_EMAIL,
            displayName: "Demo User",
            theme: THEME.LIGHT,
        });
    });

    it("returns an indistinguishable failure for a wrong password and an unknown email", async () => {
        const wrongPassword = await client.POST("/signin", {
            body: { email: DEMO_USER_EMAIL, password: "not-the-right-password" },
        });
        const unknownEmail = await client.POST("/signin", {
            body: { email: uniqueEmail(), password: "irrelevant" },
        });

        const wrongPasswordBody = wrongPassword.error as unknown as MockErrorResponseBody;
        const unknownEmailBody = unknownEmail.error as unknown as MockErrorResponseBody;

        expect(wrongPassword.response.status).toBe(unknownEmail.response.status);
        expect(wrongPasswordBody).toEqual(unknownEmailBody);
        expect(wrongPassword.response.ok).toBe(false);
    });
});

describe("GET /users/me/theme", () => {
    it("returns the known user's record with its stored theme", async () => {
        const { data, error } = await client.GET("/users/me/theme", {
            params: { query: { userId: DEMO_USER_ID } },
        });

        expect(error).toBeUndefined();
        expect(data).toEqual({
            id: DEMO_USER_ID,
            email: DEMO_USER_EMAIL,
            displayName: "Demo User",
            theme: THEME.LIGHT,
        });
    });
});

describe("PUT /users/me/theme", () => {
    it("stores the new value and returns the updated record", async () => {
        const email = uniqueEmail();
        const signupResult = await signUp({ displayName: "Theme Tester", email, password: "irrelevant" });

        if (typeof signupResult.data !== "string") {
            throw new Error("Expected signup to return the new user's bare id.");
        }
        const userId = signupResult.data;

        const { data, error } = await client.PUT("/users/me/theme", {
            params: { query: { userId } },
            body: { theme: THEME.DARK },
        });

        expect(error).toBeUndefined();
        expect(data?.theme).toBe(THEME.DARK);

        const readBack = await client.GET("/users/me/theme", { params: { query: { userId } } });
        expect(readBack.data?.theme).toBe(THEME.DARK);
    });

    it("leaves the stored record identical after a second update with the same value", async () => {
        const email = uniqueEmail();
        const signupResult = await signUp({ displayName: "Idempotent Tester", email, password: "irrelevant" });

        if (typeof signupResult.data !== "string") {
            throw new Error("Expected signup to return the new user's bare id.");
        }
        const userId = signupResult.data;

        const first = await client.PUT("/users/me/theme", {
            params: { query: { userId } },
            body: { theme: THEME.DARK },
        });
        const second = await client.PUT("/users/me/theme", {
            params: { query: { userId } },
            body: { theme: THEME.DARK },
        });

        expect(first.data).toEqual(second.data);
    });
});

describe("unhandled requests", () => {
    it("errors rather than reaching the network for a path no handler covers", async () => {
        await expect(fetch(`${baseUrl}/definitely-not-a-real-path`)).rejects.toThrow();
    });
});
