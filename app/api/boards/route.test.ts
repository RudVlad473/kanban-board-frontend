import { beforeEach, describe, expect, it, vi } from "vitest";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

import { GET } from "./route";

/*
 * `@/lib/server/server-client` is the real network boundary and the only thing worth stubbing
 * (GC-22) — `externalApi.GET` is seeded per test with the response shapes the live backend
 * actually returns, mirroring `src/features/theme/actions/update-theme.unit.test.ts`'s pattern.
 */
vi.mock("@/lib/server/server-client", () => ({
    externalApi: { GET: vi.fn() },
}));

/*
 * `@/lib/server/dal`'s `verifySession` is this handler's own authentication check — stubbed
 * directly so each test can drive the authenticated/unauthenticated cases without a real session
 * cookie or `next/headers` request scope.
 */
vi.mock("@/lib/server/dal", () => ({
    verifySession: vi.fn(),
}));

const mockedGet = vi.mocked(externalApi.GET);
const mockedVerifySession = vi.mocked(verifySession);

const validRecord = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "demo@kanban-board.dev",
    displayName: "Demo User",
    theme: "LIGHT" as const,
    jsessionId: "upstream-jsessionid-abc123",
};

const validBoards = [
    { id: "board-1", name: "Platform Launch", version: 0 },
    { id: "board-2", name: "Marketing Plan", version: 0 },
];

type UpstreamGetResult = Awaited<ReturnType<typeof externalApi.GET>>;
const mockUpstreamResponse = (result: { data?: unknown; error?: unknown }): void => {
    mockedGet.mockResolvedValueOnce({
        ...result,
        response: new Response(null, { status: result.error !== undefined ? 500 : 200 }),
    } as UpstreamGetResult);
};

beforeEach(() => {
    mockedGet.mockReset();
    mockedVerifySession.mockReset();
});

describe("GET /api/boards", () => {
    it("refuses an unauthenticated request with 401 and no board data", async () => {
        // Arrange
        mockedVerifySession.mockResolvedValue(null);

        // Act
        const response = await GET();
        const body: unknown = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(body).not.toHaveProperty("id");
        expect(JSON.stringify(body)).not.toContain("Platform Launch");
        expect(mockedGet).not.toHaveBeenCalled();
    });

    it("calls the upstream with userId equal to the session record's own id", async () => {
        // Arrange
        mockedVerifySession.mockResolvedValue(validRecord);
        mockUpstreamResponse({ data: validBoards });

        // Act
        await GET();

        /*
         * Assert — the load-bearing assertion (T-02-32): the exact argument object, not just that
         * externalApi.GET was called.
         */
        expect(mockedGet).toHaveBeenCalledExactlyOnceWith(EXTERNAL_PATH.BOARDS, {
            params: { query: { userId: validRecord.id } },
        });
    });

    /*
     * The contract declares `userId` a client-suppliable query parameter, but this handler never
     * reads anything from a request object at all (it takes zero parameters) — calling it as if a
     * request carrying a hostile `userId` had been passed proves that arity, not just an unused
     * value, is what makes the client-supplied parameter unreachable.
     */
    it("ignores a client-supplied userId even when the handler is invoked as if a request carried one", async () => {
        // Arrange
        mockedVerifySession.mockResolvedValue(validRecord);
        mockUpstreamResponse({ data: validBoards });
        const maliciousRequest = new Request("http://localhost/api/boards?userId=someone-elses-id");
        const handler = GET as unknown as (request: Request) => ReturnType<typeof GET>;

        // Act
        await handler(maliciousRequest);

        // Assert
        expect(mockedGet).toHaveBeenCalledExactlyOnceWith(EXTERNAL_PATH.BOARDS, {
            params: { query: { userId: validRecord.id } },
        });
    });

    it("responds 502 when the upstream returns an error, without forwarding the upstream error's own text", async () => {
        // Arrange
        mockedVerifySession.mockResolvedValue(validRecord);
        mockUpstreamResponse({
            error: {
                type: "about:blank",
                title: "Internal Server Error",
                status: 500,
                detail: "database connection refused on host db-primary-7",
                instance: EXTERNAL_PATH.BOARDS,
                code: "INTERNAL_ERROR",
            },
        });

        // Act
        const response = await GET();
        const body: unknown = await response.json();

        // Assert
        expect(response.status).toBe(502);
        expect(JSON.stringify(body)).not.toContain("database connection refused");
    });

    it("responds 502 when the upstream body is not an array of well-formed boards", async () => {
        // Arrange
        mockedVerifySession.mockResolvedValue(validRecord);
        mockUpstreamResponse({ data: [{ id: "board-1", name: "Missing version" }] });

        // Act
        const response = await GET();

        // Assert
        expect(response.status).toBe(502);
    });
});
