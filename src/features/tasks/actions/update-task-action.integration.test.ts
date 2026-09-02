import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { updateTaskInputSchema } from "@/features/tasks/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { parseProblemDetail, PROBLEM_CODE } from "@/lib/core/api-contract/problem-detail";
import { taskSchema } from "@/lib/core/api-contract/task-schemas";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `updateTaskAction`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the action itself: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which can run in the Vitest `node` project, the same split `update-subtask-action.integration.
 * test.ts` records. This is the suite that proves the wire semantics TASK-03 and SYNC-01 rest on: a
 * title/description write, the shared `409 OPTIMISTIC_LOCK_CONFLICT`, that the two omitted ancestor
 * segments are inert (04-BACKEND-FACTS.md T2), and — separately, with no network call at all — that
 * `updateTaskInputSchema` enforces the 3-32 title bound the client controls regardless of what T8
 * found about the backend's own (misleadingly worded) enforcement. The session-scoped half is proved
 * by the browser suites driving `useUpdateTask`; the inline-message branch by `edit-task-modal.test.tsx`.
 */

type SeededAccount = { id: string; jsessionId: string };

const baseUrl = process.env.EXTERNAL_API_BASE_URL ?? "";

/** Resolves an `EXTERNAL_PATH` template so this suite dials exactly the path the action does. */
const buildUpstreamUrl = ({
    path,
    boardId,
    columnId,
    taskId,
    userId,
}: {
    path: string;
    boardId?: string;
    columnId?: string;
    taskId?: string;
    userId: string;
}): string => {
    /*
     * An unsupplied segment is left as its literal placeholder rather than blanked — that is what
     * `openapi-fetch`'s own serializer produces (04-RESEARCH.md Pitfall 2).
     */
    const withBoard = boardId === undefined ? path : path.replace("{boardId}", boardId);
    const withColumn = columnId === undefined ? withBoard : withBoard.replace("{columnId}", columnId);
    const resolved = taskId === undefined ? withColumn : withColumn.replace("{taskId}", taskId);

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
            email: `update-task-${randomUUID()}@example.com`,
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
}): Promise<{ id: string; version: number }> => {
    const task = await postJson({
        url: buildUpstreamUrl({ path: EXTERNAL_PATH.COLUMN_DETAIL, boardId, columnId, userId: account.id }),
        account,
        body: { title },
    });

    return z.object({ id: z.string(), version: z.number() }).parse(task);
};

type SeededTask = { boardId: string; columnId: string; taskId: string; version: number };

const seedTask = async (account: SeededAccount): Promise<SeededTask> => {
    const boardId = await createBoardUpstream({ account, name: `Update Task ${randomUUID().slice(0, 8)}` });
    const columnId = await createColumnUpstream({ account, boardId, name: "Column" });
    const task = await createTaskUpstream({ account, boardId, columnId, title: "Fixture Task" });

    return { boardId, columnId, taskId: task.id, version: task.version };
};

/** Exactly the call `updateTaskAction` issues — same path template, same query, same body. */
const updateUpstream = async ({
    account,
    boardId,
    columnId,
    taskId,
    body,
}: {
    account: SeededAccount;
    boardId: string;
    columnId: string;
    taskId: string;
    body: { title: string; description?: string; version: number };
}): Promise<{ status: number; ok: boolean; body: unknown }> => {
    const response = await fetch(
        buildUpstreamUrl({ path: EXTERNAL_PATH.TASK_DETAIL, boardId, columnId, taskId, userId: account.id }),
        {
            method: "PUT",
            headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
            body: JSON.stringify(body),
        },
    );

    return { status: response.status, ok: response.ok, body: await response.json().catch(() => null) };
};

describe("the task update against the real backend", () => {
    let owner: SeededAccount;

    beforeAll(async () => {
        owner = await signUp();
    }, 60_000);

    /* TASK-03: a title and description write, parsing with the promoted subtasks-less task shape. */
    it("applies a title and description change and parses as the promoted task shape", async () => {
        // Arrange
        const seeded = await seedTask(owner);

        // Act
        const { status, body } = await updateUpstream({
            account: owner,
            ...seeded,
            body: { title: "Renamed Task", description: "A real description now", version: seeded.version },
        });

        // Assert
        expect(status).toBe(200);
        const parsed = taskSchema.safeParse(body);
        expect(parsed.success).toBe(true);
        expect(parsed.success && parsed.data.title).toBe("Renamed Task");
        expect(parsed.success && parsed.data.description).toBe("A real description now");
    }, 60_000);

    /* T4: the same 409 OPTIMISTIC_LOCK_CONFLICT every task/subtask mutation in this phase shares. */
    it("refuses a replay carrying the now-stale version with the optimistic-lock problem code", async () => {
        // Arrange
        const seeded = await seedTask(owner);
        const first = await updateUpstream({
            account: owner,
            ...seeded,
            body: { title: "First Rename", version: seeded.version },
        });
        expect(first.ok).toBe(true);

        // Act — replay the same body, whose version is now behind the task's own.
        const { status, body } = await updateUpstream({
            account: owner,
            ...seeded,
            body: { title: "Second Rename", version: seeded.version },
        });

        // Assert
        expect(status).toBe(409);
        expect(parseProblemDetail(body)?.code).toBe(PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT);
    }, 60_000);

    /*
     * T2: the two omitted ancestor segments are inert — a wrong board/column still applies the
     * write, so the action's explicit segments are a documented convention, not a runtime guard.
     */
    it("applies the write even when the ancestor segments in the path are wrong", async () => {
        // Arrange
        const seeded = await seedTask(owner);

        // Act
        const { status, body } = await updateUpstream({
            account: owner,
            boardId: "no-such-board",
            columnId: "no-such-column",
            taskId: seeded.taskId,
            body: { title: "Renamed Via Wrong Path", version: seeded.version },
        });

        // Assert
        expect(status).toBe(200);
        const parsed = taskSchema.safeParse(body);
        expect(parsed.success).toBe(true);
        expect(parsed.success && parsed.data.title).toBe("Renamed Via Wrong Path");
    }, 60_000);

    /*
     * T8: the backend enforces 3-32 on update too, but its own message is wrong ("cannot be empty"
     * for both ends) — this proves the CLIENT'S OWN schema rejects the same bound with the correct
     * message before any request would carry it, regardless of the backend's own wording.
     */
    it("rejects an out-of-bounds title client-side with the correct message, never the backend's misleading one", () => {
        // Act
        const tooShort = updateTaskInputSchema.safeParse({
            boardId: "b",
            columnId: "c",
            taskId: "t",
            version: 0,
            title: "ab",
        });
        const tooLong = updateTaskInputSchema.safeParse({
            boardId: "b",
            columnId: "c",
            taskId: "t",
            version: 0,
            title: "x".repeat(33),
        });

        // Assert
        expect(tooShort.success).toBe(false);
        expect(tooShort.success || tooShort.error.issues[0]?.message).toBe(
            "Task title must be between 3 and 32 characters.",
        );
        expect(tooLong.success).toBe(false);
        expect(tooLong.success || tooLong.error.issues[0]?.message).toBe(
            "Task title must be between 3 and 32 characters.",
        );
    });
});
