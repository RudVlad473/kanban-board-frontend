import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { reorderColumns } from "@/features/boards/column-drag-model";
import { sortColumnsByPosition, toReorderTargetPosition } from "@/features/boards/model";
import { boardFullSchema, columnSchema, BoardSchema, type ColumnFull } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { parseProblemDetail, PROBLEM_CODE } from "@/lib/core/api-contract/problem-detail";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `reorderColumnAction`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the action itself: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which can run in the Vitest `node` project, and ADR tech/0025 retired the shim that used to fake
 * one — the same split `rename-board-action.integration.test.ts` records. This is the suite that
 * proves the wire semantics COLUMN-03 rests on: it sends `toReorderTargetPosition`'s own output and
 * predicts the result with `reorderColumns`, so a wrong reading of `targetPosition` diverges here
 * rather than silently after a reload. The session-scoped half is proved by
 * e2e/columns-reorder.e2e.spec.ts; the invalid-input branch by the schema cases in
 * schemas.unit.test.ts.
 */

type SeededAccount = { id: string; jsessionId: string };

const baseUrl = process.env.EXTERNAL_API_BASE_URL ?? "";

/** Resolves an `EXTERNAL_PATH` template so this suite dials exactly the path the action does. */
const buildUpstreamUrl = ({
    path,
    boardId,
    columnId,
    userId,
}: {
    path: string;
    boardId?: string;
    columnId?: string;
    userId: string;
}): string => {
    /*
     * An unsupplied segment is left as its literal placeholder rather than blanked — that is what
     * `openapi-fetch`'s own serializer produces (03-RESEARCH.md Pitfall 2).
     */
    const withBoard = boardId === undefined ? path : path.replace("{boardId}", boardId);
    const resolved = columnId === undefined ? withBoard : withBoard.replace("{columnId}", columnId);

    return `${baseUrl}${resolved}?userId=${userId}`;
};

/** Satisfies the backend's password and display-name rules (see e2e/seed.sh). */
const SEED_PASSWORD = "E2eFixturePwd1!";
const SEED_DISPLAY_NAME = "Integration Fixture";

const signUp = async (): Promise<SeededAccount> => {
    const response = await fetch(`${baseUrl}${EXTERNAL_PATH.SIGN_UP}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: `reorder-column-${randomUUID()}@example.com`,
            password: SEED_PASSWORD,
            displayName: SEED_DISPLAY_NAME,
        }),
    });

    expect(response.ok).toBe(true);
    const body = (await response.json()) as { id: string };
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

const readColumns = async ({
    account,
    boardId,
}: {
    account: SeededAccount;
    boardId: string;
}): Promise<ColumnFull[]> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_FULL, boardId, userId: account.id }), {
        headers: { Cookie: `JSESSIONID=${account.jsessionId}` },
    });

    const board = boardFullSchema.safeParse(await response.json().catch(() => null));
    expect(board.success).toBe(true);
    /* `position` is the ordering authority, not the response array's order (03-14-SUMMARY.md). */
    return board.success ? sortColumnsByPosition(board.data.columns) : [];
};

const SEED_COLUMN_NAMES = ["Alpha", "Bravo", "Charlie", "Delta"];

/*
 * Created strictly sequentially: the backend derives a column's position from creation order
 * (02-BACKEND-FACTS.md P5), so a parallel seed would make the starting order non-deterministic.
 */
const seedBoard = async (account: SeededAccount): Promise<{ boardId: string; columns: ColumnFull[] }> => {
    const board = await createBoardUpstream({ account, name: `Reorder ${randomUUID().slice(0, 8)}` });
    const boardId = board?.id ?? "";

    for (const name of SEED_COLUMN_NAMES) {
        await createColumnUpstream({ account, boardId, name });
    }

    return { boardId, columns: await readColumns({ account, boardId }) };
};

/** Exactly the call `reorderColumnAction` issues — same path template, same query, same body. */
const reorderUpstream = async ({
    account,
    boardId,
    columnId,
    version,
    targetPosition,
}: {
    account: SeededAccount;
    boardId?: string;
    columnId: string;
    version: number;
    targetPosition: number;
}): Promise<{ status: number; ok: boolean; body: unknown }> => {
    const response = await fetch(
        buildUpstreamUrl({ path: EXTERNAL_PATH.COLUMN_REORDER, boardId, columnId, userId: account.id }),
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
            body: JSON.stringify({ version, targetPosition }),
        },
    );

    return { status: response.status, ok: response.ok, body: await response.json().catch(() => null) };
};

describe("the column reorder against the real backend", () => {
    let owner: SeededAccount;

    beforeAll(async () => {
        owner = await signUp();
    }, 60_000);

    /*
     * The load-bearing case: both the sent value and the predicted order come from the shipped
     * functions, so a misread of the wire semantics diverges here instead of being re-derived.
     */
    it("produces exactly the order the client predicted, from toReorderTargetPosition's own output", async () => {
        // Arrange
        const { boardId, columns } = await seedBoard(owner);
        expect(columns.map((column) => column.name)).toEqual(SEED_COLUMN_NAMES);
        const fromIndex = 0;
        const toIndex = 2;
        const predicted = reorderColumns({ columns, fromIndex, toIndex }).map((column) => column.name);

        // Act — the wire value is the shipped translation's output, never a hand-written index.
        const { status, body } = await reorderUpstream({
            account: owner,
            boardId,
            columnId: columns[fromIndex].id,
            version: columns[fromIndex].version,
            targetPosition: toReorderTargetPosition({ toIndex }),
        });

        // Assert — the server's own order equals the client's prediction.
        expect(status).toBe(200);
        const moved = columnSchema.safeParse(body);
        expect(moved.success).toBe(true);
        expect(moved.success && moved.data.position).toBe(toIndex);
        expect((await readColumns({ account: owner, boardId })).map((column) => column.name)).toEqual(predicted);
    }, 60_000);

    /* 03-BACKEND-FACTS.md § R3: the reorder shares the board rename's conflict code, so the existing toast branch covers it. */
    it("refuses a replay carrying the now-stale version with the optimistic-lock problem code", async () => {
        // Arrange
        const { boardId, columns } = await seedBoard(owner);
        const target = columns[0];
        const first = await reorderUpstream({
            account: owner,
            boardId,
            columnId: target.id,
            version: target.version,
            targetPosition: toReorderTargetPosition({ toIndex: 2 }),
        });
        expect(first.ok).toBe(true);

        // Act — replay the same body, whose version is now behind the column's own.
        const { status, body } = await reorderUpstream({
            account: owner,
            boardId,
            columnId: target.id,
            version: target.version,
            targetPosition: toReorderTargetPosition({ toIndex: 2 }),
        });

        // Assert
        expect(status).toBe(409);
        expect(parseProblemDetail(body)?.code).toBe(PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT);
    }, 60_000);

    /*
     * 03-BACKEND-FACTS.md § R2, the observation the in-flight mutation lock's width was chosen
     * from: a column that merely shifted keeps its version, so its pre-reorder value stays usable.
     */
    it("bumps only the moved column's version, leaving the merely-shifted ones untouched", async () => {
        // Arrange
        const { boardId, columns } = await seedBoard(owner);
        const [alpha, bravo, charlie, delta] = columns;

        // Act
        const { ok } = await reorderUpstream({
            account: owner,
            boardId,
            columnId: alpha.id,
            version: alpha.version,
            targetPosition: toReorderTargetPosition({ toIndex: 2 }),
        });
        expect(ok).toBe(true);

        // Assert — Bravo and Charlie shifted, Delta did not, and none of the three changed version.
        const after = await readColumns({ account: owner, boardId });
        const versionOf = (id: string): number | undefined => after.find((column) => column.id === id)?.version;
        expect(versionOf(alpha.id)).toBeGreaterThan(alpha.version);
        expect(versionOf(bravo.id)).toBe(bravo.version);
        expect(versionOf(charlie.id)).toBe(charlie.version);
        expect(versionOf(delta.id)).toBe(delta.version);
    }, 60_000);

    /*
     * Refutes 03-RESEARCH Pitfall 2's premise for this endpoint: a dropped `boardId` is inert, not
     * refused, so the spec omitting it is accurate rather than defective (03-BACKEND-FACTS § R8).
     */
    it("resolves the column from its own id, so an unresolved board segment still reorders it", async () => {
        // Arrange
        const { boardId, columns } = await seedBoard(owner);
        const toIndex = 2;
        const predicted = reorderColumns({ columns, fromIndex: 0, toIndex }).map((column) => column.name);

        // Act — the board placeholder left in, exactly as the serializer would leave it.
        const { ok } = await reorderUpstream({
            account: owner,
            boardId: undefined,
            columnId: columns[0].id,
            version: columns[0].version,
            targetPosition: toReorderTargetPosition({ toIndex }),
        });

        // Assert — it succeeded, and it moved the column on the board that owns it.
        expect(ok).toBe(true);
        expect((await readColumns({ account: owner, boardId })).map((column) => column.name)).toEqual(predicted);
    }, 60_000);
});
