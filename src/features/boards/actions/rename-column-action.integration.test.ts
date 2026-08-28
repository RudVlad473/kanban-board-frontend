import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { boardFullSchema, columnSchema, boardSchema, type Column } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { parseProblemDetail, PROBLEM_CODE } from "@/lib/core/api-contract/problem-detail";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `renameColumnAction`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the action itself: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which can run in the Vitest `node` project, and ADR tech/0025 retired the shim that used to fake
 * one — the same split `rename-board-action.integration.test.ts` records. What is provable here is
 * everything downstream of the session: the exact request the action issues, the optimistic-lock
 * refusal its `CONFLICT` branch hangs off, and what the board segment this endpoint's generated
 * `path` type omits actually does — which is nothing (see the two segment cases at the foot of this
 * file, and 03-11-SUMMARY.md). The session-scoped half is proved by e2e/columns-rename.e2e.spec.ts;
 * the invalid-input branch by the schema cases in schemas.unit.test.ts.
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
            email: `rename-column-${randomUUID()}@example.com`,
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
    const board = boardSchema.safeParse(await response.json());
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
}): Promise<Column | null> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_COLUMNS, boardId, userId: account.id }), {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
        body: JSON.stringify({ name }),
    });

    expect(response.ok).toBe(true);
    const column = columnSchema.safeParse(await response.json());
    expect(column.success).toBe(true);
    return column.success ? column.data : null;
};

/** Exactly the call `renameColumnAction` issues — same path template, same query, same body. */
const renameUpstream = async ({
    account,
    boardId,
    columnId,
    name,
    version,
}: {
    account: SeededAccount;
    boardId?: string;
    columnId: string;
    name: string;
    version: number;
}): Promise<{ status: number; ok: boolean; body: unknown }> => {
    const response = await fetch(
        buildUpstreamUrl({ path: EXTERNAL_PATH.COLUMN_DETAIL, boardId, columnId, userId: account.id }),
        {
            method: "PUT",
            headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
            body: JSON.stringify({ name, version }),
        },
    );

    return { status: response.status, ok: response.ok, body: await response.json().catch(() => null) };
};

const readColumnNames = async ({
    account,
    boardId,
}: {
    account: SeededAccount;
    boardId: string;
}): Promise<string[]> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_FULL, boardId, userId: account.id }), {
        headers: { Cookie: `JSESSIONID=${account.jsessionId}` },
    });

    const board = boardFullSchema.safeParse(await response.json().catch(() => null));
    expect(board.success).toBe(true);
    return board.success ? board.data.columns.map((column) => column.name) : [];
};

describe("the column rename against the real backend", () => {
    let owner: SeededAccount;
    let boardId: string;

    beforeAll(async () => {
        owner = await signUp();
        const board = await createBoardUpstream({ account: owner, name: `Rename Column ${randomUUID().slice(0, 8)}` });
        boardId = board?.id ?? "";
    }, 60_000);

    it("renames the column, so a later full-board read shows the new name and a higher version", async () => {
        // Arrange
        const suffix = randomUUID().slice(0, 8);
        const column = await createColumnUpstream({ account: owner, boardId, name: `Before ${suffix}` });

        // Act
        const { status, body } = await renameUpstream({
            account: owner,
            boardId,
            columnId: column?.id ?? "",
            name: `After ${suffix}`,
            version: column?.version ?? 0,
        });

        // Assert — the success branch's own payload parses, and the board agrees.
        expect(status).toBe(200);
        const renamed = columnSchema.safeParse(body);
        expect(renamed.success).toBe(true);
        expect(renamed.success && renamed.data.name).toBe(`After ${suffix}`);
        expect(renamed.success && renamed.data.version).toBeGreaterThan(column?.version ?? 0);
        expect(await readColumnNames({ account: owner, boardId })).toContain(`After ${suffix}`);
    }, 60_000);

    /*
     * The refusal `renameColumnAction`'s `CONFLICT` branch — and the rename hook's conflict copy —
     * hangs off, proved reachable rather than assumed (03-BACKEND-FACTS.md § R3).
     */
    it("refuses a rename carrying a now-stale version with the optimistic-lock problem code", async () => {
        // Arrange — rename once so the column's version advances past the one we will send.
        const suffix = randomUUID().slice(0, 8);
        const column = await createColumnUpstream({ account: owner, boardId, name: `Stale ${suffix}` });
        const first = await renameUpstream({
            account: owner,
            boardId,
            columnId: column?.id ?? "",
            name: `Stale First ${suffix}`,
            version: column?.version ?? 0,
        });
        expect(first.ok).toBe(true);

        // Act — replay with the version that is now behind the column's own.
        const { status, body } = await renameUpstream({
            account: owner,
            boardId,
            columnId: column?.id ?? "",
            name: `Stale Second ${suffix}`,
            version: column?.version ?? 0,
        });

        // Assert
        expect(status).toBe(409);
        expect(parseProblemDetail(body)?.code).toBe(PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT);
        expect(await readColumnNames({ account: owner, boardId })).not.toContain(`Stale Second ${suffix}`);
    }, 60_000);

    /*
     * Refutes 03-RESEARCH Pitfall 2's premise for this endpoint: a dropped `boardId` is inert, not
     * refused, so the spec omitting it is accurate rather than defective (03-BACKEND-FACTS § R8).
     */
    it("resolves the column from its own id, so an unresolved board segment still renames it", async () => {
        // Arrange
        const suffix = randomUUID().slice(0, 8);
        const column = await createColumnUpstream({ account: owner, boardId, name: `Segment ${suffix}` });

        // Act — the board placeholder left in, exactly as `openapi-fetch`'s serializer would leave it.
        const { ok } = await renameUpstream({
            account: owner,
            boardId: undefined,
            columnId: column?.id ?? "",
            name: `Segment Kept ${suffix}`,
            version: column?.version ?? 0,
        });

        // Assert — it succeeded, and the rename really landed on the owner's board.
        expect(ok).toBe(true);
        expect(await readColumnNames({ account: owner, boardId })).toContain(`Segment Kept ${suffix}`);
    }, 60_000);

    /*
     * The control that actually protects a column, given the path's board segment does not: the
     * backend authorises from the session, so no board id a caller can put in the URL widens reach.
     */
    it("refuses a stranger's rename whichever board id the path carries", async () => {
        // Arrange
        const suffix = randomUUID().slice(0, 8);
        const column = await createColumnUpstream({ account: owner, boardId, name: `Owned ${suffix}` });
        const stranger = await signUp();
        const strangerBoard = await createBoardUpstream({ account: stranger, name: `Stranger ${suffix}` });

        // Act — once with the segment unresolved, once with the stranger's own board id in it.
        const withPlaceholder = await renameUpstream({
            account: stranger,
            boardId: undefined,
            columnId: column?.id ?? "",
            name: `Stolen ${suffix}`,
            version: column?.version ?? 0,
        });
        const withOwnBoard = await renameUpstream({
            account: stranger,
            boardId: strangerBoard?.id ?? "",
            columnId: column?.id ?? "",
            name: `Stolen ${suffix}`,
            version: column?.version ?? 0,
        });

        // Assert — refused both ways, and the owner's column keeps its name.
        expect(withPlaceholder.status).toBe(403);
        expect(withOwnBoard.status).toBe(403);
        expect(parseProblemDetail(withOwnBoard.body)?.code).toBe(PROBLEM_CODE.ACCESS_DENIED);
        expect(await readColumnNames({ account: owner, boardId })).toContain(`Owned ${suffix}`);
    }, 60_000);
});
