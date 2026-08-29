import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { boardFullSchema, deleteBoardInputSchema, BoardSchema } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { recordSeededUserId, SEED_SCOPE } from "@/test-utils/seeded-user-registry";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `deleteBoardAction`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the action itself: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which can run in the Vitest `node` project, and ADR tech/0025 retired the shim that used to fake
 * one — the same split `rename-board.integration.test.ts` records. What is provable here is
 * everything downstream of the session: the exact request the action issues, the cascade actually
 * having happened, and the backend's ownership control (T-02-64). The session-scoped half is proved
 * by e2e/boards-delete.e2e.spec.ts; the no-session branch by e2e/route-guard.e2e.spec.ts; the
 * invalid-input branch by the schema cases in schemas.unit.test.ts.
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
            email: `delete-${randomUUID()}@example.com`,
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
    const board = BoardSchema.safeParse(await response.json());
    expect(board.success).toBe(true);
    return board.success ? board.data : null;
};

const createColumnUpstream = async ({
    account,
    boardId,
    name,
}: {
    account: SeededAccount;
    boardId: string;
    name: string;
}): Promise<void> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_COLUMNS, boardId, userId: account.id }), {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
        body: JSON.stringify({ name }),
    });

    expect(response.ok).toBe(true);
};

/** Exactly the call `deleteBoardAction` issues — same path template, same query, no body. */
const deleteUpstream = async ({
    account,
    boardId,
    userIdOverride,
}: {
    account: SeededAccount;
    boardId: string;
    userIdOverride?: string;
}): Promise<number> => {
    const response = await fetch(
        buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_DETAIL, boardId, userId: userIdOverride ?? account.id }),
        { method: "DELETE", headers: { Cookie: `JSESSIONID=${account.jsessionId}` } },
    );

    return response.status;
};

const readBoardNames = async (account: SeededAccount): Promise<string[]> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARDS, userId: account.id }), {
        headers: { Cookie: `JSESSIONID=${account.jsessionId}` },
    });

    const boards = (await response.json()) as { name: string }[];
    return boards.map((board) => board.name);
};

/** Whether a full-board read for this id still resolves to a board at all — the cascade's own proof. */
const readsAsABoard = async ({ account, boardId }: { account: SeededAccount; boardId: string }): Promise<boolean> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_FULL, boardId, userId: account.id }), {
        headers: { Cookie: `JSESSIONID=${account.jsessionId}` },
    });

    if (!response.ok) {
        return false;
    }

    return boardFullSchema.safeParse(await response.json().catch(() => null)).success;
};

describe("the board delete against the real backend", () => {
    let owner: SeededAccount;

    beforeAll(async () => {
        owner = await signUp();
    }, 60_000);

    it("deletes the board, so a later board-list read no longer contains it", async () => {
        // Arrange
        const suffix = randomUUID().slice(0, 8);
        const name = `Delete Me ${suffix}`;
        const board = await createBoardUpstream({ account: owner, name });
        expect(await readBoardNames(owner)).toContain(name);

        // Act
        const status = await deleteUpstream({ account: owner, boardId: board?.id ?? "" });

        // Assert
        expect(status).toBe(200);
        expect(await readBoardNames(owner)).not.toContain(name);
    }, 60_000);

    /*
     * The load-bearing case (ADR domain/0002): a shorter list would also pass if the row were merely
     * hidden, so this asserts the board itself no longer reads back at all, columns and all.
     */
    it("cascades, so a full-board read for a deleted board with columns resolves to no board", async () => {
        // Arrange
        const suffix = randomUUID().slice(0, 8);
        const board = await createBoardUpstream({ account: owner, name: `Cascade ${suffix}` });
        const boardId = board?.id ?? "";
        await createColumnUpstream({ account: owner, boardId, name: "Todo" });
        await createColumnUpstream({ account: owner, boardId, name: "Doing" });
        expect(await readsAsABoard({ account: owner, boardId })).toBe(true);

        // Act
        const status = await deleteUpstream({ account: owner, boardId });

        // Assert
        expect(status).toBe(200);
        expect(await readsAsABoard({ account: owner, boardId })).toBe(false);
    }, 60_000);

    /*
     * T-02-64: the phase's highest-consequence access-control point. The backend refuses on its own
     * authority even when handed the victim's own id (P7), so the action's server-derived `userId`
     * is a sufficient control — and a cross-account delete cannot be undone.
     */
    it("never deletes a board belonging to a different account, whichever userId is supplied", async () => {
        // Arrange
        const suffix = randomUUID().slice(0, 8);
        const name = `Owned ${suffix}`;
        const board = await createBoardUpstream({ account: owner, name });
        const stranger = await signUp();

        // Act
        const withOwnId = await deleteUpstream({ account: stranger, boardId: board?.id ?? "" });
        const withOwnersId = await deleteUpstream({
            account: stranger,
            boardId: board?.id ?? "",
            userIdOverride: owner.id,
        });

        // Assert — refused both ways, and the owner's board is still there.
        expect(withOwnId).toBe(403);
        expect(withOwnersId).toBe(403);
        expect(await readBoardNames(owner)).toContain(name);
    }, 60_000);

    /* The failure branch the action maps to a bare `ERROR`: an id that names no board of this owner's. */
    it("refuses a delete of a board id that does not exist, so the action takes its error branch", async () => {
        // Act
        const status = await deleteUpstream({ account: owner, boardId: "no-such-board" });

        // Assert
        expect(status).toBeGreaterThanOrEqual(400);
    }, 60_000);

    /* The schema is the gate an invalid argument hits before any upstream call is made. */
    it("gates an empty board id before it can reach the backend", () => {
        // Act & Assert
        expect(deleteBoardInputSchema.safeParse({ boardId: "" }).success).toBe(false);
        expect(deleteBoardInputSchema.safeParse({ boardId: "8okxhwo6oq2o" }).success).toBe(true);
    });
});
