import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { boardFullSchema, columnFullSchema, columnSchema, boardSchema } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `createColumnAction`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the action itself: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which can run in the Vitest `node` project, and ADR tech/0025 retired the shim that used to fake
 * one — the same split `rename-board-action.integration.test.ts` records. What is provable here is
 * everything downstream of the session: the exact request the action issues, the tasks-less shape
 * of its response (which is why the action parses with `columnSchema` and not `columnFullSchema`),
 * and the backend's real duplicate-name policy (03-BACKEND-FACTS.md § R5). The session-scoped half
 * is proved by e2e/columns-create.e2e.spec.ts; the invalid-input branch by the schema cases in
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
            email: `create-column-${randomUUID()}@example.com`,
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

/** Exactly the call `createColumnAction` issues — same path template, same query, same body. */
const createColumnUpstream = async ({
    account,
    boardId,
    name,
    color,
}: {
    account: SeededAccount;
    boardId?: string;
    name: string;
    color?: string;
}): Promise<{ status: number; ok: boolean; body: unknown }> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_COLUMNS, boardId, userId: account.id }), {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
        /* Mirrors the action's own `parsed.data.color !== undefined` guard — an omitted key, not an explicit `undefined`. */
        body: JSON.stringify({ name, ...(color !== undefined ? { color } : {}) }),
    });

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

describe("the column create against the real backend", () => {
    let owner: SeededAccount;
    let boardId: string;

    beforeAll(async () => {
        owner = await signUp();
        const board = await createBoardUpstream({ account: owner, name: `Create Column ${randomUUID().slice(0, 8)}` });
        boardId = board?.id ?? "";
    }, 60_000);

    it("creates the column and answers with a body the action's own columnSchema parses", async () => {
        // Arrange
        const name = `Create ${randomUUID().slice(0, 8)}`;

        // Act
        const { ok, body } = await createColumnUpstream({ account: owner, boardId, name });

        // Assert — parsed with the action's own contract, so a drift in either fails here.
        expect(ok).toBe(true);
        const column = columnSchema.safeParse(body);
        expect(column.success).toBe(true);
        expect(column.success && column.data.name).toBe(name);
        expect(await readColumnNames({ account: owner, boardId })).toContain(name);
    }, 60_000);

    /*
     * Why the action parses with `columnSchema` rather than `columnFullSchema`: the create response
     * carries no `tasks`, so the full shape would fail on every successful call.
     */
    it("answers with a tasks-less body, so the full-column shape would reject every success", async () => {
        // Arrange
        const name = `Shape ${randomUUID().slice(0, 8)}`;

        // Act
        const { body } = await createColumnUpstream({ account: owner, boardId, name });

        // Assert
        expect(columnSchema.safeParse(body).success).toBe(true);
        expect(columnFullSchema.safeParse(body).success).toBe(false);
        expect(Object.keys(body as Record<string, unknown>)).not.toContain("tasks");
    }, 60_000);

    /*
     * 03-BACKEND-FACTS.md § R5 refuted the assumption that duplicates are refused: they are accepted
     * outright, so 03-07's inline duplicate copy is client-side-only UX with no server backstop.
     */
    it("accepts a second column whose name duplicates an existing one on the same board", async () => {
        // Arrange
        const name = `Dup ${randomUUID().slice(0, 8)}`;
        const first = await createColumnUpstream({ account: owner, boardId, name });
        expect(first.ok).toBe(true);

        // Act
        const { status, ok, body } = await createColumnUpstream({ account: owner, boardId, name });

        // Assert — accepted, with no problem detail of any kind, and both columns now exist.
        expect(ok).toBe(true);
        expect(status).toBeLessThan(300);
        expect(parseProblemDetail(body)).toBeNull();
        expect(columnSchema.safeParse(body).success).toBe(true);
        expect((await readColumnNames({ account: owner, boardId })).filter((each) => each === name)).toHaveLength(2);
    }, 60_000);

    /*
     * The ONLY column endpoint whose board segment is load-bearing — rename, reorder and delete
     * resolve by column id and ignore it (03-BACKEND-FACTS § R8 refutes 03-RESEARCH Pitfall 2).
     */
    it("does not create a column when the board segment was left unresolved", async () => {
        // Arrange
        const name = `Unresolved ${randomUUID().slice(0, 4)}`;

        // Act
        const { ok } = await createColumnUpstream({ account: owner, boardId: undefined, name });

        // Assert
        expect(ok).toBe(false);
        expect(await readColumnNames({ account: owner, boardId })).not.toContain(name);
    }, 60_000);

    /* The mixed-case round trip the brief records — the backend must not normalise the stored hex. */
    it("returns a submitted colour back byte-identical, including a mixed-case hex", async () => {
        // Arrange
        const name = `Coloured ${randomUUID().slice(0, 8)}`;
        const color = "#49C4e5";

        // Act
        const { ok, body } = await createColumnUpstream({ account: owner, boardId, name, color });

        // Assert
        expect(ok).toBe(true);
        const column = columnSchema.safeParse(body);
        expect(column.success).toBe(true);
        expect(column.success && column.data.color).toBe(color);
    }, 60_000);

    /*
     * Whichever of `null` or an absent key the backend emits for a colourless column, the app's own
     * `columnSchema` must parse it without throwing — this is the live fact the SUMMARY records.
     */
    it("still succeeds and parses when no colour is submitted", async () => {
        // Arrange
        const name = `Colourless ${randomUUID().slice(0, 8)}`;

        // Act
        const { ok, body } = await createColumnUpstream({ account: owner, boardId, name });

        // Assert
        expect(ok).toBe(true);
        expect(columnSchema.safeParse(body).success).toBe(true);
    }, 60_000);
});
