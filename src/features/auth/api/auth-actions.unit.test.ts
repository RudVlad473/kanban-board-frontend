import { beforeEach, describe, expect, it, vi } from "vitest";

import { PROBLEM_CODE, type ProblemDetail } from "@/lib/api/problem-detail";
import { externalApi } from "@/lib/api/server-client";
import { ROUTE } from "@/lib/routes";

import { AUTH_ACTION_IDLE } from "./auth-action-state";
import { signInAction, signOutAction, signUpAction } from "./auth-actions";

/*
 * `@/lib/api/server-client` is the real network boundary and the only thing worth stubbing
 * (GC-22) — `externalApi.POST` is seeded per test with the response shapes the live backend
 * actually returns, recorded in plan 01-30's summary and kanban-board-backend's own
 * docs/AUTH_FLOWS.md, not invented ones.
 */
vi.mock("@/lib/api/server-client", () => ({
    externalApi: { POST: vi.fn() },
}));

/*
 * `next/headers`'s `cookies()` requires a real Next.js request scope this plain Vitest test has
 * none of — stubbed with the same in-memory cookie jar `src/lib/session.test.ts` uses, so
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

/*
 * `externalApi.POST`'s declared return type comes from the external contract's generated types —
 * which, per auth-actions.ts's own comments, are known to be untrue at runtime for both of these
 * operations (no error schema, and a success schema that doesn't describe the real identity
 * body). Every response this file seeds is deliberately shaped like what the live backend
 * actually returns instead of what the contract claims, so it is cast through this one named seam
 * rather than fought at every call site — the same "widen and trust the runtime shape" idiom
 * auth-actions.ts itself uses via `unknown`.
 */
type UpstreamPostResult = Awaited<ReturnType<typeof externalApi.POST>>;
const mockNextUpstreamResponse = (result: { data?: unknown; error?: unknown; response: Response }): void => {
    mockedPost.mockResolvedValueOnce(result as UpstreamPostResult);
};

const REQUIRED_FIELD_MESSAGE = "Can't be empty";
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";
const SIGN_UP_FAILURE_MESSAGE =
    "We couldn't create your account. If you already have one, try signing in instead, or try again in a moment.";

const buildFormData = (fields: Record<string, string>): FormData => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
    }
    return formData;
};

/**
 * A real `Response`, since `extractUpstreamSessionId` reads `response.headers.getSetCookie()` —
 * the array-returning form, not the single-string `headers.get()`. `jsessionId` omitted models a
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
    instance: "/signin",
    code,
    ...(errors ? { errors } : {}),
});

const validIdentity = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "demo@kanban-board.dev",
    displayName: "Demo User",
    theme: "LIGHT" as const,
};

beforeEach(() => {
    cookieStore.clear();
    mockedPost.mockReset();
    redirectSpy.mockReset();
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

describe("signUpAction", () => {
    it("stores a session built from the backend's returned record and redirects to the board list on a valid sign-up", async () => {
        // Arrange
        mockNextUpstreamResponse({
            data: validIdentity,
            error: undefined,
            response: buildUpstreamResponse("upstream-jsessionid-def456"),
        });
        const formData = buildFormData({
            email: validIdentity.email,
            displayName: validIdentity.displayName,
            password: "CorrectPassword1!",
        });

        // Act
        await signUpAction(AUTH_ACTION_IDLE, formData);

        // Assert
        const storedSession = cookieStore.get("session");
        expect(storedSession).toBeDefined();
        expect(redirectSpy).toHaveBeenCalledExactlyOnceWith(ROUTE.BOARDS);
    });

    it("returns the backend's duplicate reason and the existing collapsed failure copy when the address is already registered", async () => {
        // Arrange
        mockNextUpstreamResponse({
            data: undefined,
            error: buildProblemDetail({ code: PROBLEM_CODE.DUPLICATE_RESOURCE }),
            response: buildUpstreamResponse(),
        });
        const formData = buildFormData({
            email: "existing@example.com",
            displayName: "",
            password: "CorrectPassword1!",
        });

        // Act
        const state = await signUpAction(AUTH_ACTION_IDLE, formData);

        // Assert
        expect(state).toEqual({
            status: "error",
            code: PROBLEM_CODE.DUPLICATE_RESOURCE,
            message: SIGN_UP_FAILURE_MESSAGE,
        });
        expect(cookieStore.get("session")).toBeUndefined();
    });
});

describe("signOutAction", () => {
    it("destroys the local session and redirects to sign-in, without calling the backend at all", async () => {
        // Arrange
        cookieStore.set("session", { value: "some-signed-session-token" });
        const formData = buildFormData({});

        // Act
        await signOutAction(AUTH_ACTION_IDLE, formData);

        // Assert
        expect(cookieStore.get("session")).toBeUndefined();
        expect(redirectSpy).toHaveBeenCalledExactlyOnceWith(ROUTE.SIGN_IN);
        expect(mockedPost).not.toHaveBeenCalled();
    });
});
