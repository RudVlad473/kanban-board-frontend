import { randomUUID } from "node:crypto";

import { isNil } from "es-toolkit";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { parseProblemDetail, PROBLEM_CODE } from "@/lib/core/api-contract/problem-detail";
import { subtaskSchema } from "@/lib/core/api-contract/task-schemas";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `updateSubtaskAction`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the action itself: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which can run in the Vitest `node` project, the same split `move-task-action.integration.test.ts`
 * records. This is the suite that proves the wire semantics SUBTASK-02 and SUBTASK-03 both rest on:
 * a completion-only write, a title-only write, and the stale-version conflict every subtask mutation
 * shares (04-BACKEND-FACTS.md T4). The session-scoped half is proved by the browser suites that drive
 * `useToggleSubtask`/`useRenameSubtask`; the invalid-input branch by `schemas.unit.test.ts`.
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
    const withBoard = isNil(boardId) ? path : path.replace("{boardId}", boardId);
    const withColumn = isNil(columnId) ? withBoard : withBoard.replace("{columnId}", columnId);
    const withTask = isNil(taskId) ? withColumn : withColumn.replace("{taskId}", taskId);
    const resolved = isNil(subtaskId) ? withTask : withTask.replace("{subtaskId}", subtaskId);

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
            email: `update-subtask-${randomUUID()}@example.com`,
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
}): Promise<{ id: string; version: number }> => {
    const subtask = await postJson({
        url: buildUpstreamUrl({ path: EXTERNAL_PATH.TASK_SUBTASKS, boardId, columnId, taskId, userId: account.id }),
        account,
        body: { title },
    });

    return z.object({ id: z.string(), version: z.number() }).parse(subtask);
};

type SeededTask = { boardId: string; columnId: string; taskId: string; subtaskId: string; version: number };

const seedTaskWithSubtask = async (account: SeededAccount): Promise<SeededTask> => {
    const boardId = await createBoardUpstream({ account, name: `Update Subtask ${randomUUID().slice(0, 8)}` });
    const columnId = await createColumnUpstream({ account, boardId, name: "Column" });
    const taskId = await createTaskUpstream({ account, boardId, columnId, title: "Fixture Task" });
    const subtask = await createSubtaskUpstream({ account, boardId, columnId, taskId, title: "Fixture Subtask" });

    return { boardId, columnId, taskId, subtaskId: subtask.id, version: subtask.version };
};

/** Exactly the call `updateSubtaskAction` issues — same path template, same query, same body. */
const updateUpstream = async ({
    account,
    boardId,
    columnId,
    taskId,
    subtaskId,
    body,
}: {
    account: SeededAccount;
    boardId: string;
    columnId: string;
    taskId: string;
    subtaskId: string;
    body: { title?: string; isCompleted?: boolean; version: number };
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
        {
            method: "PUT",
            headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
            body: JSON.stringify(body),
        },
    );

    return { status: response.status, ok: response.ok, body: await response.json().catch(() => null) };
};

describe("the subtask update against the real backend", () => {
    let owner: SeededAccount;

    beforeAll(async () => {
        owner = await signUp();
    }, 60_000);

    /* The toggle: a completion-only write, parsing with the promoted subtask shape. */
    it("applies a completion-only change and parses as the promoted subtask shape", async () => {
        // Arrange
        const seeded = await seedTaskWithSubtask(owner);

        // Act
        const { status, body } = await updateUpstream({
            account: owner,
            ...seeded,
            body: { isCompleted: true, version: seeded.version },
        });

        // Assert
        expect(status).toBe(200);
        const parsed = subtaskSchema.safeParse(body);
        expect(parsed.success).toBe(true);
        expect(parsed.success && parsed.data.isCompleted).toBe(true);
        expect(parsed.success && parsed.data.title).toBe("Fixture Subtask");
    }, 60_000);

    /* The rename: a title-only write on the SAME operation, proving one action serves both. */
    it("applies a title-only change, leaving completion untouched", async () => {
        // Arrange
        const seeded = await seedTaskWithSubtask(owner);

        // Act
        const { status, body } = await updateUpstream({
            account: owner,
            ...seeded,
            body: { title: "Renamed Subtask", version: seeded.version },
        });

        // Assert
        expect(status).toBe(200);
        const parsed = subtaskSchema.safeParse(body);
        expect(parsed.success).toBe(true);
        expect(parsed.success && parsed.data.title).toBe("Renamed Subtask");
        expect(parsed.success && parsed.data.isCompleted).toBe(false);
    }, 60_000);

    /* T4: the same 409 OPTIMISTIC_LOCK_CONFLICT every task/subtask mutation in this phase shares. */
    it("refuses a replay carrying the now-stale version with the optimistic-lock problem code", async () => {
        // Arrange
        const seeded = await seedTaskWithSubtask(owner);
        const first = await updateUpstream({
            account: owner,
            ...seeded,
            body: { isCompleted: true, version: seeded.version },
        });
        expect(first.ok).toBe(true);

        // Act — replay the same body, whose version is now behind the subtask's own.
        const { status, body } = await updateUpstream({
            account: owner,
            ...seeded,
            body: { isCompleted: false, version: seeded.version },
        });

        // Assert
        expect(status).toBe(409);
        expect(parseProblemDetail(body)?.code).toBe(PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT);
    }, 60_000);

    /*
     * T2: the three omitted ancestor segments are inert — a wrong board/column still applies the
     * write, so the action's explicit segments are a documented convention, not a runtime guard.
     */
    it("applies the write even when the ancestor segments in the path are wrong", async () => {
        // Arrange
        const seeded = await seedTaskWithSubtask(owner);

        // Act
        const { status, body } = await updateUpstream({
            account: owner,
            boardId: "no-such-board",
            columnId: "no-such-column",
            taskId: "no-such-task",
            subtaskId: seeded.subtaskId,
            body: { isCompleted: true, version: seeded.version },
        });

        // Assert
        expect(status).toBe(200);
        const parsed = subtaskSchema.safeParse(body);
        expect(parsed.success).toBe(true);
        expect(parsed.success && parsed.data.isCompleted).toBe(true);
    }, 60_000);
});
