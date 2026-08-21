import { beforeEach, describe, expect, it, vi } from "vitest";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { PROBLEM_CODE, type ProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { ROUTE } from "@/lib/core/routing/routes";
import { THEME } from "@/lib/core/theme/theme";
import { themeCookie } from "@/lib/server/cookies/theme-cookie";
import { externalApi } from "@/lib/server/server-client";

import { AUTH_ACTION_IDLE } from "../action-state";
import { signInAction } from "./sign-in";

/*
 * `@/lib/server/server-client` is the real network boundary and the only thing worth stubbing
 * (GC-22) — `externalApi.POST` is seeded per test with the response shapes the live backend
 * actually returns, recorded in plan 01-30's summary and kanban-board-backend's own
 * docs/AUTH_FLOWS.md, not invented ones.
 */
vi.mock("@/lib/server/server-client", () => ({
    externalApi: { POST: vi.fn() },
}));

/*
 * Mocked directly so a success test can assert the exact theme written, and a failure test can
 * assert `write` was never called — neither is observable through the fake cookie jar alone (FT-01).
 */
vi.mock("@/lib/server/cookies/theme-cookie", () => ({
    themeCookie: { write: vi.fn() },
}));

/*
 * `next/headers`'s `cookies()` requires a real Next.js request scope this plain Vitest test has
 * none of — stubbed with the same in-memory cookie jar `src/lib/server/session.test.ts` uses, so
 * `session.ts` itself (unmocked) runs its real create/verify logic against it.
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

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve(fakeCookieJar)),
}));

/*
 * `redirect()` signals success by throwing in real Next.js — stubbed as a plain spy so the
 * navigation is observable rather than thrown into the void, per this task's own instruction.
 */
const redirectSpy = vi.fn();
vi.mock("next/navigation", () => ({
    redirect: (path: string) => {
        redirectSpy(path);
    },
}));

const mockedPost = vi.mocked(externalApi.POST);
const mockedThemeCookieWrite = vi.mocked(themeCookie.write);

/*
 * `externalApi.POST`'s declared return type comes from the external contract's generated types —
 * which, per sign-in.ts's own comments, are known to be untrue at runtime for this operation (no
 * error schema, and a success schema that doesn't describe the real identity body). Every response
 * this file seeds is deliberately shaped like what the live backend actually returns instead of
 * what the contract claims, so it is cast through this one named seam rather than fought at every
 * call site — the same "widen and trust the runtime shape" idiom sign-in.ts itself uses via
 * `unknown`.
 */
type UpstreamPostResult = Awaited<ReturnType<typeof externalApi.POST>>;
const mockNextUpstreamResponse = (result: { data?: unknown; error?: unknown; response: Response }): void => {
    mockedPost.mockResolvedValueOnce(result as UpstreamPostResult);
};

const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

const buildFormData = (fields: Record<string, string>): FormData => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
    }
    return formData;
};

/**
 * A real `Response`, since `upstreamCookie.extract` reads `response.headers.getSetCookie()` — the
 * array-returning form, not the single-string `headers.get()`. `jsessionId` omitted models a
 * success body carrying no upstream credential (GC-18, T-01-50).
 */
const buildUpstreamResponse = (jsessionId?: string): Response => {
    const headers = new Headers();
    if (jsessionId) {
        headers.append("set-cookie", `JSESSIONID=${jsessionId}; Path=/; HttpOnly`);
    }
    return new Response(null, { headers });
};

const buildProblemDetail = ({
    code,
    errors,
}: {
    code: ProblemDetail["code"];
    errors?: Record<string, string>;
}): ProblemDetail => ({
    type: "about:blank",
    title: "Problem",
    status: 401,
    detail: "Rejected",
    instance: EXTERNAL_PATH.SIGN_IN,
    code,
    ...(errors ? { errors } : {}),
});

const validIdentity = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "demo@kanban-board.dev",
    displayName: "Demo User",
    theme: THEME.LIGHT,
};

beforeEach(() => {
    cookieStore.clear();
    mockedPost.mockReset();
    redirectSpy.mockReset();
    mockedThemeCookieWrite.mockReset();
});

describe("signInAction", () => {
    it("stores a session carrying the backend's credential and redirects to the board list on a valid sign-in", async () => {
        // Arrange
        mockNextUpstreamResponse({
            data: validIdentity,
            error: undefined,
            response: buildUpstreamResponse("upstream-jsessionid-abc123"),
        });
        const formData = buildFormData({ email: validIdentity.email, password: "CorrectPassword1!" });

        // Act
        await signInAction(AUTH_ACTION_IDLE, formData);

        // Assert
        const storedSession = cookieStore.get("session");
        expect(storedSession).toBeDefined();
        expect(mockedThemeCookieWrite).toHaveBeenCalledExactlyOnceWith(validIdentity.theme);
        expect(redirectSpy).toHaveBeenCalledExactlyOnceWith(ROUTE.BOARDS);
    });

    it("returns a failure carrying the backend's own named reason and the generic credentials copy, and stores no session, on a rejected sign-in", async () => {
        // Arrange
        mockNextUpstreamResponse({
            data: undefined,
            error: buildProblemDetail({ code: PROBLEM_CODE.BAD_CREDENTIALS }),
            response: buildUpstreamResponse(),
        });
        const formData = buildFormData({ email: "nobody@example.com", password: "WrongPassword1!" });

        // Act
        const state = await signInAction(AUTH_ACTION_IDLE, formData);

        // Assert
        expect(state).toEqual({
            status: "error",
            code: PROBLEM_CODE.BAD_CREDENTIALS,
            message: INVALID_CREDENTIALS_MESSAGE,
        });
        expect(cookieStore.get("session")).toBeUndefined();
        expect(mockedThemeCookieWrite).not.toHaveBeenCalled();
        expect(redirectSpy).not.toHaveBeenCalled();
    });

    /*
     * Per kanban-board-backend's own docs/AUTH_FLOWS.md, `/signin`'s 401 collapses an unknown
     * email, a wrong password AND a refused third concurrent session into the exact same
     * `BAD_CREDENTIALS` response — the backend gives no per-cause code to distinguish them, which
     * is the anti-enumeration property T-01-54 mitigates. This is a stronger proof than two
     * distinct codes would have been: it shows this app doesn't invent a distinction the backend
     * itself never provides on the wire.
     */
    const rejectionArms: { name: string; upstreamError: ProblemDetail }[] = [
        { name: "a wrong password", upstreamError: buildProblemDetail({ code: PROBLEM_CODE.BAD_CREDENTIALS }) },
        {
            name: "a refused third concurrent session (the session ceiling)",
            upstreamError: buildProblemDetail({ code: PROBLEM_CODE.BAD_CREDENTIALS }),
        },
    ];

    it("renders the identical message for a wrong password and a session-ceiling rejection", async () => {
        const messages: string[] = [];

        for (const { upstreamError } of rejectionArms) {
            // Arrange
            mockNextUpstreamResponse({ data: undefined, error: upstreamError, response: buildUpstreamResponse() });
            const formData = buildFormData({ email: "demo@kanban-board.dev", password: "SomePassword1!" });

            // Act
            const state = await signInAction(AUTH_ACTION_IDLE, formData);

            // Assert
            expect(state.status).toBe("error");
            if (state.status === "error") {
                expect(state.code).toBe(PROBLEM_CODE.BAD_CREDENTIALS);
                messages.push(state.message);
            }
        }

        expect(messages).toHaveLength(rejectionArms.length);
        expect(new Set(messages).size).toBe(1);
        expect(messages[0]).toBe(INVALID_CREDENTIALS_MESSAGE);
    });

    it("returns per-field errors and never calls the backend when the submitted values fail validation", async () => {
        // Arrange
        const formData = buildFormData({ email: "demo@kanban-board.dev", password: "" });

        // Act
        const state = await signInAction(AUTH_ACTION_IDLE, formData);

        // Assert
        expect(state).toEqual({
            status: "error",
            code: PROBLEM_CODE.VALIDATION_FAILED,
            message: INVALID_CREDENTIALS_MESSAGE,
            fieldErrors: { password: REQUIRED_FIELD_MESSAGE },
        });
        expect(mockedPost).not.toHaveBeenCalled();
        expect(mockedThemeCookieWrite).not.toHaveBeenCalled();
    });

    it("treats a successful response carrying no upstream credential as a failure and stores no session", async () => {
        // Arrange
        mockNextUpstreamResponse({
            data: validIdentity,
            error: undefined,
            response: buildUpstreamResponse(),
        });
        const formData = buildFormData({ email: validIdentity.email, password: "CorrectPassword1!" });

        // Act
        const state = await signInAction(AUTH_ACTION_IDLE, formData);

        // Assert
        expect(state).toEqual({
            status: "error",
            code: PROBLEM_CODE.INTERNAL_ERROR,
            message: INVALID_CREDENTIALS_MESSAGE,
        });
        expect(cookieStore.get("session")).toBeUndefined();
        expect(redirectSpy).not.toHaveBeenCalled();
    });
});
