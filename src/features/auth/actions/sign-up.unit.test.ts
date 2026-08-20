import { beforeEach, describe, expect, it, vi } from "vitest";

import { PROBLEM_CODE, type ProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { ROUTE } from "@/lib/core/routing/routes";
import { THEME } from "@/lib/core/theme/theme";
import { externalApi } from "@/lib/server/server-client";

import { AUTH_ACTION_IDLE } from "../action-state";
import { signUpAction } from "./sign-up";

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

/*
 * `externalApi.POST`'s declared return type comes from the external contract's generated types —
 * which, per sign-up.ts's own comments, are known to be untrue at runtime for this operation.
 * Every response this file seeds is deliberately shaped like what the live backend actually
 * returns instead of what the contract claims, so it is cast through this one named seam rather
 * than fought at every call site.
 */
type UpstreamPostResult = Awaited<ReturnType<typeof externalApi.POST>>;
const mockNextUpstreamResponse = (result: { data?: unknown; error?: unknown; response: Response }): void => {
    mockedPost.mockResolvedValueOnce(result as UpstreamPostResult);
};

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
    instance: "/signin",
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
