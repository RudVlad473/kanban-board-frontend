import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { renameBoardInputSchema, boardSchema } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { parseProblemDetail, PROBLEM_CODE } from "@/lib/core/api-contract/problem-detail";
import { recordSeededUserId, SEED_SCOPE } from "@/test-utils/seeded-user-registry";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `renameBoardAction`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the action itself: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which can run in the Vitest `node` project, and ADR tech/0025 retired the shim that used to fake
 * one — the same split `fetch-board-full.integration.test.ts` records. What is provable here is
 * everything downstream of the session: the exact request the action issues, the backend's
 * optimistic-lock rejection, its ownership control (T-02-57), and the branch each response drives.
 * The session-scoped half is proved by e2e/boards-rename.e2e.spec.ts; the no-session branch by
 * e2e/route-guard.e2e.spec.ts; the invalid-input branch by the schema cases in schemas.unit.test.ts.
 */

type SeededAccount = { id: string; jsessionId: string };

const baseUrl = process.env.EXTERNAL_API_BASE_URL ?? "";

/** Resolves an `EXTERNAL_PATH` template so this suite dials exactly the path the action does. */
const buildUpstreamUrl = ({ path, boardId = "", userId }: { path: string; boardId?: string; userId: string }): string =>
    `${baseUrl}${path.replace("{boardId}", boardId)}?userId=${userId}`;

/** Satisfies the backend's password and display-name rules (see e2e/seed.sh). */
const SEED_PASSWORD = "E2eFixturePwd1!";
const SEED_DISPLAY_NAME = "Integration Fixture";

const signUp = async (): Promise<SeededAccount> => {
    const response = await fetch(`${baseUrl}${EXTERNAL_PATH.SIGN_UP}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: `rename-${randomUUID()}@example.com`,
            password: SEED_PASSWORD,
            displayName: SEED_DISPLAY_NAME,
        }),
    });

    expect(response.ok).toBe(true);
    const body = (await response.json()) as { id: string };
    recordSeededUserId({ scope: SEED_SCOPE.VITEST, id: body.id });
    /*
     * Reuses the sign-up response's own credential rather than signing in again — the backend caps
     * one account at two concurrent sessions (docs/adr/tech/0022).
     */
    const jsessionId = response.headers
        .getSetCookie()
        .flatMap((cookie) => /JSESSIONID=([^;]+)/.exec(cookie) ?? [])
        .at(1);

    expect(jsessionId).toBeTypeOf("string");
    return { id: body.id, jsessionId: jsessionId ?? "" };
};

const createBoardUpstream = async ({ account, name }: { account: SeededAccount; name: string }) => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARDS, userId: account.id }), {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
        body: JSON.stringify({ name }),
    });

    expect(response.ok).toBe(true);
    const board = boardSchema.safeParse(await response.json());
    expect(board.success).toBe(true);
    return board.success ? board.data : null;
};

/** Exactly the call `renameBoardAction` issues — same path template, same query, same body. */
const renameUpstream = async ({
    account,
    boardId,
    name,
    version,
    userIdOverride,
}: {
    account: SeededAccount;
    boardId: string;
    name: string;
    version: number;
    userIdOverride?: string;
}): Promise<{ status: number; body: unknown }> => {
    const response = await fetch(
        buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_DETAIL, boardId, userId: userIdOverride ?? account.id }),
        {
            method: "PUT",
            headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
            body: JSON.stringify({ name, version }),
        },
    );

    return { status: response.status, body: await response.json().catch(() => null) };
};

const readBoardNames = async (account: SeededAccount): Promise<string[]> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARDS, userId: account.id }), {
        headers: { Cookie: `JSESSIONID=${account.jsessionId}` },
    });

    const boards = (await response.json()) as { name: string }[];
    return boards.map((board) => board.name);
};

describe("the board rename against the real backend", () => {
    let owner: SeededAccount;

    beforeAll(async () => {
        owner = await signUp();
    }, 60_000);

    it("renames the board, so a later board-list read shows the new name and an incremented version", async () => {
        // Arrange
        const suffix = randomUUID().slice(0, 8);
        const board = await createBoardUpstream({ account: owner, name: `Rename Before ${suffix}` });
        expect(board).not.toBeNull();

        // Act
        const { status, body } = await renameUpstream({
            account: owner,
            boardId: board?.id ?? "",
            name: `Rename After ${suffix}`,
            version: board?.version ?? 0,
        });

        // Assert — the success branch's own payload parses, and the list agrees.
        expect(status).toBe(200);
        const renamed = boardSchema.safeParse(body);
        expect(renamed.success).toBe(true);
        expect(renamed.success && renamed.data.name).toBe(`Rename After ${suffix}`);
        expect(renamed.success && renamed.data.version).toBeGreaterThan(board?.version ?? 0);
        expect(await readBoardNames(owner)).toContain(`Rename After ${suffix}`);
    }, 60_000);

    /*
     * T-02-58: the conflict is its own outcome, recognised through `parseProblemDetail` — the enum
     * entry this plan added is what makes it distinguishable from an unparseable body (P3).
     */
    it("rejects a version one behind the board's current one as an optimistic-lock conflict", async () => {
        // Arrange — rename once so the board's version advances past the one we will send.
        const suffix = randomUUID().slice(0, 8);
        const board = await createBoardUpstream({ account: owner, name: `Conflict ${suffix}` });
        const first = await renameUpstream({
            account: owner,
            boardId: board?.id ?? "",
            name: `Conflict First ${suffix}`,
            version: board?.version ?? 0,
        });
        const current = boardSchema.safeParse(first.body);
        expect(current.success).toBe(true);

        // Act — send the version that is now one behind.
        const { status, body } = await renameUpstream({
            account: owner,
            boardId: board?.id ?? "",
            name: `Conflict Stale ${suffix}`,
            version: (current.success ? current.data.version : 1) - 1,
        });

        // Assert
        expect(status).toBe(409);
        expect(parseProblemDetail(body)?.code).toBe(PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT);
        expect(await readBoardNames(owner)).not.toContain(`Conflict Stale ${suffix}`);
    }, 60_000);

    /*
     * T-02-57: the backend refuses on its own authority even when handed the victim's own id, so
     * the action's server-derived `userId` is a sufficient control (P7).
     */
    it("never renames a board belonging to a different account, whichever userId is supplied", async () => {
        // Arrange
        const suffix = randomUUID().slice(0, 8);
        const board = await createBoardUpstream({ account: owner, name: `Owned ${suffix}` });
        const stranger = await signUp();

        // Act
        const withOwnId = await renameUpstream({
            account: stranger,
            boardId: board?.id ?? "",
            name: `Stolen ${suffix}`,
            version: board?.version ?? 0,
        });
        const withOwnersId = await renameUpstream({
            account: stranger,
            boardId: board?.id ?? "",
            name: `Stolen ${suffix}`,
            version: board?.version ?? 0,
            userIdOverride: owner.id,
        });

        // Assert — refused both ways, and the owner's board still carries its original name.
        expect(withOwnId.status).toBe(403);
        expect(withOwnersId.status).toBe(403);
        expect(await readBoardNames(owner)).toContain(`Owned ${suffix}`);
    }, 60_000);

    /*
     * The plan assumed a duplicate rename succeeds. It does not — and the code it is refused with
     * is not the optimistic-lock one, so the action's conflict branch stays narrow (see SUMMARY).
     */
    it("refuses a rename to a name another board already uses, with a code outside the conflict branch", async () => {
        // Arrange
        const suffix = randomUUID().slice(0, 8);
        const first = await createBoardUpstream({ account: owner, name: `Dup First ${suffix}` });
        const second = await createBoardUpstream({ account: owner, name: `Dup Second ${suffix}` });

        // Act
        const { status, body } = await renameUpstream({
            account: owner,
            boardId: first?.id ?? "",
            name: second?.name ?? "",
            version: first?.version ?? 0,
        });

        // Assert
        expect(status).toBe(409);
        expect(parseProblemDetail(body)?.code).toBe(PROBLEM_CODE.DUPLICATE_RESOURCE);
        expect(parseProblemDetail(body)?.code).not.toBe(PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT);
        expect(await readBoardNames(owner)).toContain(`Dup First ${suffix}`);
    }, 60_000);

    /* The schema is the gate an invalid argument hits before any upstream call is made. */
    it("gates an argument missing the required version before it can reach the backend", () => {
        // Act & Assert
        expect(renameBoardInputSchema.safeParse({ boardId: "8okxhwo6oq2o", name: "Anything" }).success).toBe(false);
        expect(renameBoardInputSchema.safeParse({ boardId: "", name: "Anything", version: 0 }).success).toBe(false);
    });
});
