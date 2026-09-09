import { randomUUID } from "node:crypto";

import { isNil } from "es-toolkit";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { taskFullSchema } from "@/lib/core/api-contract/task-schemas";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `deleteTaskAction`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the action itself: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which can run in the Vitest `node` project, the same split `delete-subtask-action.integration.test.ts`
 * uses. This proves the cascade (T6) — the task's subtasks are probed DIRECTLY after the delete,
 * since `/full` merely hiding them (the task is gone) would not distinguish "cascaded" from
 * "orphaned" — and the mapped NOT_FOUND discriminant a second delete produces. The session-scoped
 * half is proved by `e2e/tasks-delete.e2e.spec.ts`; the invalid-input branch by the schema cases in
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
            email: `delete-task-${randomUUID()}@example.com`,
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

/* Task creation posts to the COLUMN resource itself — the sibling `.../tasks` path is GET-only (Pitfall 1, T1). */
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

type SeededTaskWithSubtasks = { boardId: string; columnId: string; taskId: string; subtaskIds: string[] };

const seedTaskWithSubtasks = async (account: SeededAccount): Promise<SeededTaskWithSubtasks> => {
    const boardId = await createBoardUpstream({ account, name: `Delete Task ${randomUUID().slice(0, 8)}` });
    const columnId = await createColumnUpstream({ account, boardId, name: "Column" });
    const taskId = await createTaskUpstream({ account, boardId, columnId, title: "Fixture Task" });
    const subtaskOneId = await createSubtaskUpstream({ account, boardId, columnId, taskId, title: "Subtask One" });
    const subtaskTwoId = await createSubtaskUpstream({ account, boardId, columnId, taskId, title: "Subtask Two" });

    return { boardId, columnId, taskId, subtaskIds: [subtaskOneId, subtaskTwoId] };
};

/** Exactly the call `deleteTaskAction` issues — same path template, same query, no body. */
const deleteTaskUpstream = async ({
    account,
    boardId,
    columnId,
    taskId,
}: {
    account: SeededAccount;
    boardId: string;
    columnId: string;
    taskId: string;
}): Promise<{ status: number; ok: boolean; body: unknown }> => {
    const response = await fetch(
        buildUpstreamUrl({ path: EXTERNAL_PATH.TASK_DETAIL, boardId, columnId, taskId, userId: account.id }),
        { method: "DELETE", headers: { Cookie: `JSESSIONID=${account.jsessionId}` } },
    );

    const body: unknown = !response.ok ? await response.json().catch(() => null) : null;
    return { status: response.status, ok: response.ok, body };
};

/** Probes one subtask directly — `/full` hiding it (the task is gone) cannot distinguish cascaded from orphaned. */
const probeSubtaskUpstream = async ({
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
}): Promise<{ status: number; body: unknown }> => {
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
            body: JSON.stringify({ version: 0, title: "Probe" }),
        },
    );

    return { status: response.status, body: await response.json().catch(() => null) };
};

/** The `/full` read, narrowed to what this suite asserts on. */
const readTaskIds = async ({
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

    const boardTasksSchema = z.object({
        columns: z.object({ id: z.string(), tasks: taskFullSchema.array() }).array(),
    });
    const board = boardTasksSchema.safeParse(await response.json().catch(() => null));
    expect(board.success).toBe(true);
    const tasks = board.success ? (board.data.columns.find((column) => column.id === columnId)?.tasks ?? []) : [];

    return tasks.map((task) => task.id);
};

describe("the task delete against the real backend", () => {
    let owner: SeededAccount;

    beforeAll(async () => {
        owner = await signUp();
    }, 60_000);

    /* T6: the delete cascades — both subtasks are genuinely gone, not merely hidden by the task's own absence. */
    it("deletes the task and cascades to its subtasks, confirmed by probing each subtask directly", async () => {
        // Arrange
        const seeded = await seedTaskWithSubtasks(owner);

        // Act
        const { status, ok } = await deleteTaskUpstream({ account: owner, ...seeded });

        // Assert — the happy delete
        expect(status).toBe(200);
        expect(ok).toBe(true);

        // Assert — the read-back: the task itself is gone from the column
        expect(await readTaskIds({ account: owner, boardId: seeded.boardId, columnId: seeded.columnId })).not.toContain(
            seeded.taskId,
        );

        // Assert — each subtask is genuinely gone, not merely orphaned and hidden by the task's absence
        for (const subtaskId of seeded.subtaskIds) {
            const probe = await probeSubtaskUpstream({ account: owner, ...seeded, subtaskId });
            expect(probe.status).toBe(404);
        }
    }, 60_000);

    /*
     * T6 + T-04-42: a second delete falls through to `404 ENTITY_NOT_FOUND`, and this suite asserts
     * the MAPPED discriminant (not just the raw code) — `mapProblemCodeToStatus` is a pure function,
     * so it is safe to call directly here without importing the action itself.
     */
    it("maps a second delete of the same task to the NOT_FOUND discriminant", async () => {
        // Arrange
        const seeded = await seedTaskWithSubtasks(owner);
        const first = await deleteTaskUpstream({ account: owner, ...seeded });
        expect(first.ok).toBe(true);

        // Act
        const { status, body } = await deleteTaskUpstream({ account: owner, ...seeded });

        // Assert
        expect(status).toBe(404);
        expect(mapProblemCodeToStatus(parseProblemDetail(body)?.code)).toBe(RESULT_STATUS.NOT_FOUND);
    }, 60_000);
});
