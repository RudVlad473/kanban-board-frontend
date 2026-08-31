import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { taskFullSchema, taskSchema } from "@/lib/core/api-contract/task-schemas";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `createTaskAction`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the action itself: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which can run in the Vitest `node` project, and ADR tech/0025 retired the shim that used to fake
 * one — the same split `move-task-action.integration.test.ts` records. What is provable here is
 * everything downstream of the session: the exact request the action issues (the column-detail
 * path with no `/tasks` segment, Pitfall 1), the tasks-less shape of its response (Pitfall 3), and
 * the every-ancestor-explicit convention Pitfall 2 documents. The invalid-input branch is proved by
 * the schema cases in `schemas.unit.test.ts`.
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
     * `openapi-fetch`'s own serializer produces (04-RESEARCH.md Pitfall 2).
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
            email: `create-task-${randomUUID()}@example.com`,
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

const postJson = async ({
    url,
    account,
    body,
}: {
    url: string;
    account: SeededAccount;
    body: unknown;
}): Promise<unknown> => {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
        body: JSON.stringify(body),
    });

    expect(response.ok).toBe(true);
    return response.json();
};

const createBoardUpstream = async ({ account, name }: { account: SeededAccount; name: string }): Promise<string> => {
    const board = await postJson({
        url: buildUpstreamUrl({ path: EXTERNAL_PATH.BOARDS, userId: account.id }),
        account,
        body: { name },
    });

    return z.object({ id: z.string() }).parse(board).id;
};

const createColumnUpstream = async ({
    account,
    boardId,
    name,
}: {
    account: SeededAccount;
    boardId: string;
    name: string;
}): Promise<string> => {
    const column = await postJson({
        url: buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_COLUMNS, boardId, userId: account.id }),
        account,
        body: { name },
    });

    return z.object({ id: z.string() }).parse(column).id;
};

/** Exactly the call `createTaskAction` issues — same path template, same query, same body. */
const createTaskUpstream = async ({
    account,
    boardId,
    columnId,
    title,
    description,
}: {
    account: SeededAccount;
    boardId?: string;
    columnId?: string;
    title: string;
    description?: string;
}): Promise<{ status: number; ok: boolean; body: unknown }> => {
    const response = await fetch(
        buildUpstreamUrl({ path: EXTERNAL_PATH.COLUMN_DETAIL, boardId, columnId, userId: account.id }),
        {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
            body: JSON.stringify({ title, description }),
        },
    );

    return { status: response.status, ok: response.ok, body: await response.json().catch(() => null) };
};

const readColumnTaskTitles = async ({
    account,
    boardId,
    columnId,
}: {
    account: SeededAccount;
    boardId: string;
    columnId: string;
}): Promise<string[]> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_FULL, boardId, userId: account.id }), {
        headers: { Cookie: `JSESSIONID=${account.jsessionId}` },
    });

    const board = z
        .object({ columns: z.object({ id: z.string(), tasks: z.object({ title: z.string() }).array() }).array() })
        .safeParse(await response.json().catch(() => null));
    expect(board.success).toBe(true);
    const column = board.success ? board.data.columns.find((each) => each.id === columnId) : undefined;
    return (column?.tasks ?? []).map((task) => task.title);
};

describe("the task create against the real backend", () => {
    let owner: SeededAccount;
    let boardId: string;
    let columnId: string;

    beforeAll(async () => {
        owner = await signUp();
        boardId = await createBoardUpstream({ account: owner, name: `Create Task ${randomUUID().slice(0, 8)}` });
        columnId = await createColumnUpstream({ account: owner, boardId, name: "Todo" });
    }, 60_000);

    /* Pitfall 1: the create target is the COLUMN resource itself, not a `.../tasks` segment. */
    it("creates the task on the column path and answers with a body the action's own taskSchema parses", async () => {
        // Arrange
        const title = `Create ${randomUUID().slice(0, 8)}`;

        // Act
        const { ok, body } = await createTaskUpstream({ account: owner, boardId, columnId, title });

        // Assert
        expect(ok).toBe(true);
        const task = taskSchema.safeParse(body);
        expect(task.success).toBe(true);
        expect(task.success && task.data.title).toBe(title);
        expect(await readColumnTaskTitles({ account: owner, boardId, columnId })).toContain(title);
    }, 60_000);

    /*
     * Pitfall 3: the create response carries no `subtasks`, so the full-task shape would reject
     * every successful call — this is why the action parses with `taskSchema`, not `taskFullSchema`.
     */
    it("answers with a subtasks-less body, so the full-task shape would reject every success", async () => {
        // Arrange
        const title = `Shape ${randomUUID().slice(0, 8)}`;

        // Act
        const { body } = await createTaskUpstream({ account: owner, boardId, columnId, title });

        // Assert
        expect(taskSchema.safeParse(body).success).toBe(true);
        expect(taskFullSchema.safeParse(body).success).toBe(false);
        expect(Object.keys(body as Record<string, unknown>)).not.toContain("subtasks");
    }, 60_000);

    /* T9: omitting description is "no description" — the action never sends an explicit "". */
    it("creates a task with no description when the field is omitted", async () => {
        // Arrange
        const title = `NoDescription ${randomUUID().slice(0, 8)}`;

        // Act
        const { ok, body } = await createTaskUpstream({ account: owner, boardId, columnId, title });

        // Assert
        expect(ok).toBe(true);
        const task = taskSchema.safeParse(body);
        expect(task.success).toBe(true);
        expect(task.success && task.data.description).toBeUndefined();
    }, 60_000);

    it("creates a task carrying the description it was sent", async () => {
        // Arrange
        const title = `WithDescription ${randomUUID().slice(0, 8)}`;
        const description = "A real description";

        // Act
        const { ok, body } = await createTaskUpstream({ account: owner, boardId, columnId, title, description });

        // Assert
        expect(ok).toBe(true);
        const task = taskSchema.safeParse(body);
        expect(task.success).toBe(true);
        expect(task.success && task.data.description).toBe(description);
    }, 60_000);

    /* T9: an explicit empty-string description is refused outright — this app never sends one. */
    it("refuses an explicit empty-string description", async () => {
        // Act
        const { ok, status, body } = await createTaskUpstream({
            account: owner,
            boardId,
            columnId,
            title: `EmptyDescription ${randomUUID().slice(0, 8)}`,
            description: "",
        });

        // Assert
        expect(ok).toBe(false);
        expect(status).toBe(400);
        expect(parseProblemDetail(body)?.code).toBe("VALIDATION_FAILED");
    }, 60_000);

    /*
     * The sibling `.../tasks` path Pitfall 1 warns against reading like the right one — observed
     * this session: it refuses the POST outright (500, not the 405 a GET-only path might suggest),
     * and creates nothing.
     */
    it("refuses a POST on the tasks-suffixed path a plan-by-analogy would guess, and creates nothing", async () => {
        // Arrange
        const title = `WrongPath ${randomUUID().slice(0, 4)}`;

        // Act
        const response = await fetch(
            `${baseUrl}${EXTERNAL_PATH.COLUMN_DETAIL.replace("{boardId}", boardId).replace("{columnId}", columnId)}/tasks?userId=${owner.id}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${owner.jsessionId}` },
                body: JSON.stringify({ title }),
            },
        );

        // Assert
        expect(response.ok).toBe(false);
        expect(await readColumnTaskTitles({ account: owner, boardId, columnId })).not.toContain(title);
    }, 60_000);

    /*
     * Observed this session: unlike `addColumnByBoardId`, the board segment is INERT here — the
     * backend resolves the column from `columnId` alone, extending T2's PUT/DELETE finding to create.
     */
    it("still creates the task when the board segment was left unresolved, because the backend resolves by columnId alone", async () => {
        // Arrange
        const title = `Unresolved ${randomUUID().slice(0, 4)}`;

        // Act
        const { ok } = await createTaskUpstream({ account: owner, boardId: undefined, columnId, title });

        // Assert
        expect(ok).toBe(true);
        expect(await readColumnTaskTitles({ account: owner, boardId, columnId })).toContain(title);
    }, 60_000);
});
