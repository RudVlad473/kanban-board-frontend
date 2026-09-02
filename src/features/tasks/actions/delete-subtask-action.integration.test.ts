import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `deleteSubtaskAction`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the action itself: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which can run in the Vitest `node` project, the same split `update-subtask-action.integration.test.ts`
 * uses. This proves the happy delete and the double-delete `404 ENTITY_NOT_FOUND` T6 observed — the
 * endpoint takes no `version`, so there is no stale-version case to prove here. The session-scoped
 * half is proved by the browser suite driving `useDeleteSubtask`; the invalid-input branch by
 * `schemas.unit.test.ts`.
 */

type SeededAccount = { id: string; jsessionId: string };

const baseUrl = process.env.EXTERNAL_API_BASE_URL ?? "";

/** Resolves an `EXTERNAL_PATH` template so this suite dials exactly the path the action does. */
const buildUpstreamUrl = ({
    path,
    boardId,
    columnId,
    taskId,
    subtaskId,
    userId,
}: {
    path: string;
    boardId?: string;
    columnId?: string;
    taskId?: string;
    subtaskId?: string;
    userId: string;
}): string => {
    /*
     * An unsupplied segment is left as its literal placeholder rather than blanked — that is what
     * `openapi-fetch`'s own serializer produces (04-RESEARCH.md Pitfall 2).
     */
    const withBoard = boardId === undefined ? path : path.replace("{boardId}", boardId);
    const withColumn = columnId === undefined ? withBoard : withBoard.replace("{columnId}", columnId);
    const withTask = taskId === undefined ? withColumn : withColumn.replace("{taskId}", taskId);
    const resolved = subtaskId === undefined ? withTask : withTask.replace("{subtaskId}", subtaskId);

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
            email: `delete-subtask-${randomUUID()}@example.com`,
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

/* Task creation posts to the COLUMN resource itself — the sibling `.../tasks` path is GET-only (Pitfall 1). */
const createTaskUpstream = async ({
    account,
    boardId,
    columnId,
    title,
}: {
    account: SeededAccount;
    boardId: string;
    columnId: string;
    title: string;
}): Promise<string> => {
    const task = await postJson({
        url: buildUpstreamUrl({ path: EXTERNAL_PATH.COLUMN_DETAIL, boardId, columnId, userId: account.id }),
        account,
        body: { title },
    });

    return z.object({ id: z.string() }).parse(task).id;
};

const createSubtaskUpstream = async ({
    account,
    boardId,
    columnId,
    taskId,
    title,
}: {
    account: SeededAccount;
    boardId: string;
    columnId: string;
    taskId: string;
    title: string;
}): Promise<string> => {
    const subtask = await postJson({
        url: buildUpstreamUrl({ path: EXTERNAL_PATH.TASK_SUBTASKS, boardId, columnId, taskId, userId: account.id }),
        account,
        body: { title },
    });

    return z.object({ id: z.string() }).parse(subtask).id;
};

type SeededTask = { boardId: string; columnId: string; taskId: string; subtaskId: string };

const seedTaskWithSubtask = async (account: SeededAccount): Promise<SeededTask> => {
    const boardId = await createBoardUpstream({ account, name: `Delete Subtask ${randomUUID().slice(0, 8)}` });
    const columnId = await createColumnUpstream({ account, boardId, name: "Column" });
    const taskId = await createTaskUpstream({ account, boardId, columnId, title: "Fixture Task" });
    const subtaskId = await createSubtaskUpstream({ account, boardId, columnId, taskId, title: "Fixture Subtask" });

    return { boardId, columnId, taskId, subtaskId };
};

/** Exactly the call `deleteSubtaskAction` issues — same path template, same query, no body. */
const deleteUpstream = async ({
    account,
    boardId,
    columnId,
    taskId,
    subtaskId,
}: {
    account: SeededAccount;
    boardId: string;
    columnId: string;
    taskId: string;
    subtaskId: string;
}): Promise<{ status: number; ok: boolean; body: unknown }> => {
    const response = await fetch(
        buildUpstreamUrl({
            path: EXTERNAL_PATH.SUBTASK_DETAIL,
            boardId,
            columnId,
            taskId,
            subtaskId,
            userId: account.id,
        }),
        { method: "DELETE", headers: { Cookie: `JSESSIONID=${account.jsessionId}` } },
    );

    const body: unknown = !response.ok ? await response.json().catch(() => null) : null;
    return { status: response.status, ok: response.ok, body };
};

describe("the subtask delete against the real backend", () => {
    let owner: SeededAccount;

    beforeAll(async () => {
        owner = await signUp();
    }, 60_000);

    /* SUBTASK-04's own happy path: a 200 with no body, exactly as `deleteColumnAction`'s twin. */
    it("deletes the subtask and returns 200 with no body", async () => {
        // Arrange
        const seeded = await seedTaskWithSubtask(owner);

        // Act
        const { status, ok } = await deleteUpstream({ account: owner, ...seeded });

        // Assert
        expect(status).toBe(200);
        expect(ok).toBe(true);
    }, 60_000);

    /*
     * T6: a double delete falls through to a 404 carrying `ENTITY_NOT_FOUND` — a code this app's own
     * `PROBLEM_CODE` enum does not recognise (03-BACKEND-FACTS.md R7's same gap for columns), so the
     * raw body is read directly rather than through `parseProblemDetail`, which would report `null`.
     */
    it("returns 404 ENTITY_NOT_FOUND on a second delete of the same subtask", async () => {
        // Arrange
        const seeded = await seedTaskWithSubtask(owner);
        const first = await deleteUpstream({ account: owner, ...seeded });
        expect(first.ok).toBe(true);

        // Act
        const { status, body } = await deleteUpstream({ account: owner, ...seeded });

        // Assert
        expect(status).toBe(404);
        expect((body as { code?: string } | null)?.code).toBe("ENTITY_NOT_FOUND");
    }, 60_000);
});
