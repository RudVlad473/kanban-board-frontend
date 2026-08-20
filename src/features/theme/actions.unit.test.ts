import { beforeEach, describe, expect, it, vi } from "vitest";

import { THEME, type Theme } from "@/lib/core/theme/theme";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

import { updateThemeAction } from "./actions";

/*
 * `@/lib/server/server-client` is the real network boundary and the only thing worth stubbing
 * (GC-22) — `externalApi.PUT` is seeded per test with the response shapes the live backend
 * actually returns, mirroring `src/features/auth/actions.unit.test.ts`'s established pattern.
 */
vi.mock("@/lib/server/server-client", () => ({
    externalApi: { PUT: vi.fn() },
}));

/*
 * `@/lib/server/dal`'s `verifySession` is this function's own authentication check — stubbed
 * directly so each test can drive the authenticated/unauthenticated cases without a real session
 * cookie.
 */
vi.mock("@/lib/server/dal", () => ({
    verifySession: vi.fn(),
}));

/*
 * `next/headers`'s `cookies()` needs a real request scope this test has none of — stubbed with
 * the same in-memory jar `session.test.ts` uses, so the real (unmocked) `themeCookie.write` from
 * `@/lib/server/cookies/theme-cookie` runs against it.
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

const mockedPut = vi.mocked(externalApi.PUT);
const mockedVerifySession = vi.mocked(verifySession);

const validRecord = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "demo@kanban-board.dev",
    displayName: "Demo User",
    theme: THEME.LIGHT,
    jsessionId: "upstream-jsessionid-abc123",
};

/**
 * `externalApi.PUT`'s declared return type comes from the external contract's generated types,
 * which — per `actions.ts`'s own comment — are known to be incomplete at runtime for this
 * operation (no error schema declared). Cast through this one named seam, mirroring
 * `src/features/auth/actions.unit.test.ts`'s identical idiom.
 */
type UpstreamPutResult = Awaited<ReturnType<typeof externalApi.PUT>>;
const mockUpstreamResponse = (result: { data?: unknown; error?: unknown }): void => {
    mockedPut.mockResolvedValueOnce({
        ...result,
        response: new Response(null, { status: result.error !== undefined ? 500 : 200 }),
    } as UpstreamPutResult);
};

beforeEach(() => {
    cookieStore.clear();
    mockedPut.mockReset();
    mockedVerifySession.mockReset();
});

describe("updateThemeAction", () => {
    it("updates the theme and returns the updated value when the caller is signed in", async () => {
        // Arrange
        mockedVerifySession.mockResolvedValue(validRecord);
        mockUpstreamResponse({ data: { ...validRecord, theme: THEME.DARK } });

        // Act
        const result = await updateThemeAction(THEME.DARK);

        // Assert
        expect(result).toEqual({ status: "success", theme: THEME.DARK });
        expect(mockedPut).toHaveBeenCalledExactlyOnceWith("/users/me/theme", {
            params: { query: { userId: validRecord.id } },
            body: { theme: THEME.DARK },
        });
    });

    it("is idempotent — a repeated identical update leaves the stored value equal after both calls, and both calls succeed", async () => {
        // Arrange
        mockedVerifySession.mockResolvedValue(validRecord);
        mockUpstreamResponse({ data: { ...validRecord, theme: THEME.DARK } });
        mockUpstreamResponse({ data: { ...validRecord, theme: THEME.DARK } });

        // Act
        const first = await updateThemeAction(THEME.DARK);
        const second = await updateThemeAction(THEME.DARK);

        // Assert
        expect(first).toEqual({ status: "success", theme: THEME.DARK });
        expect(second).toEqual({ status: "success", theme: THEME.DARK });
        expect(mockedPut).toHaveBeenCalledTimes(2);
    });

    it("rejects a value outside the two the contract allows, without calling upstream", async () => {
        // Arrange
        mockedVerifySession.mockResolvedValue(validRecord);

        /*
         * Act — a value no legitimate caller's TypeScript types would produce, modelling a
         * Server Action invoked directly over the wire with an arbitrary body.
         */
        const result = await updateThemeAction("PURPLE" as unknown as Theme);

        // Assert
        expect(result).toEqual({ status: "error" });
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it("carries no caller-suppliable user id — the record updated is always the calling session's own", async () => {
        // Arrange
        mockedVerifySession.mockResolvedValue(validRecord);
        mockUpstreamResponse({ data: { ...validRecord, theme: THEME.DARK } });

        // Act
        await updateThemeAction(THEME.DARK);

        /*
         * Assert — `updateThemeAction`'s own signature is `(theme: Theme) => ...`: there is no
         * second parameter position through which a different user id could be supplied. The only
         * id ever forwarded upstream is the one `verifySession()` returned.
         */
        const [, options] = mockedPut.mock.calls[0] as [string, { params: { query: { userId: string } } }];
        expect(options.params.query.userId).toBe(validRecord.id);
    });

    it("refuses an unauthenticated call by its own check, without calling upstream", async () => {
        // Arrange
        mockedVerifySession.mockResolvedValue(null);

        // Act
        const result = await updateThemeAction(THEME.DARK);

        // Assert
        expect(result).toEqual({ status: "error" });
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it("reports an upstream failure back to the caller as a failure rather than a success", async () => {
        // Arrange
        mockedVerifySession.mockResolvedValue(validRecord);
        mockUpstreamResponse({
            error: {
                type: "about:blank",
                title: "Internal Server Error",
                status: 500,
                detail: "Something went wrong",
                instance: "/users/me/theme",
                code: "INTERNAL_ERROR",
            },
        });

        // Act
        const result = await updateThemeAction(THEME.DARK);

        // Assert
        expect(result).toEqual({ status: "error" });
    });
});
