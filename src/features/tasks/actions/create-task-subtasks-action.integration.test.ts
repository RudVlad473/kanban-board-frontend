import { randomUUID } from "node:crypto";

import { isNil } from "es-toolkit";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `createTaskSubtasksAction`'s upstream half, against the real deployed nonprod backend, with no
 * mock anywhere (ADR tech/0018). It does NOT import the action itself, for the reason
 * `create-task-action.integration.test.ts` records — neither `verifySession()` nor `refresh()` can
 * run in the Vitest `node` project. What is provable here is the sequential per-title POST loop
 * against the real subtasks-collection path (Pitfall 2's three-ancestor case), and that a partial
 * failure (a malformed title never reaching the wire) keeps every title that landed — the same
 * upstream shape `createSubtaskAction` itself calls per item (ADR domain/0003).
 */

type SeededAccount = { id: string; jsessionId: string };

const baseUrl = process.env.EXTERNAL_API_BASE_URL ?? "";

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
    const withBoard = isNil(boardId) ? path : path.replace("{boardId}", boardId);
    const withColumn = isNil(columnId) ? withBoard : withBoard.replace("{columnId}", columnId);
    const resolved = isNil(taskId) ? withColumn : withColumn.replace("{taskId}", taskId);

    return `${baseUrl}${resolved}?userId=${userId}`;
};

const SEED_PASSWORD = "E2eFixturePwd1!";
const SEED_DISPLAY_NAME = "Integration Fixture";

const signUp = async (): Promise<SeededAccount> => {
    const response = await fetch(`${baseUrl}${EXTERNAL_PATH.SIGN_UP}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: `create-task-subtasks-${randomUUID()}@example.com`,
            password: SEED_PASSWORD,
            displayName: SEED_DISPLAY_NAME,
        }),
    });

    expect(response.ok).toBe(true);
    const body = (await response.json()) as { id: string };
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

/** Exactly the call each loop iteration of `createTaskSubtasksAction` issues. */
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
}): Promise<{ status: number; ok: boolean; body: unknown }> => {
    const response = await fetch(
        buildUpstreamUrl({ path: EXTERNAL_PATH.TASK_SUBTASKS, boardId, columnId, taskId, userId: account.id }),
        {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
            body: JSON.stringify({ title }),
        },
    );

    return { status: response.status, ok: response.ok, body: await response.json().catch(() => null) };
};

const readSubtaskTitles = async ({
    account,
    boardId,
    taskId,
}: {
    account: SeededAccount;
    boardId: string;
    taskId: string;
}): Promise<string[]> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_FULL, boardId, userId: account.id }), {
        headers: { Cookie: `JSESSIONID=${account.jsessionId}` },
    });

    const board = z
        .object({
            columns: z
                .object({
                    tasks: z.object({ id: z.string(), subtasks: z.object({ title: z.string() }).array() }).array(),
                })
                .array(),
        })
        .safeParse(await response.json().catch(() => null));
    expect(board.success).toBe(true);
    const task = board.success
        ? board.data.columns.flatMap((column) => column.tasks).find((each) => each.id === taskId)
        : undefined;
    return (task?.subtasks ?? []).map((subtask) => subtask.title);
};

describe("the task-subtasks fan-out against the real backend", () => {
    let owner: SeededAccount;
    let boardId: string;
    let columnId: string;

    beforeAll(async () => {
        owner = await signUp();
        boardId = await createBoardUpstream({ account: owner, name: `Subtasks ${randomUUID().slice(0, 8)}` });
        columnId = await createColumnUpstream({ account: owner, boardId, name: "Todo" });
    }, 60_000);

    it("creates one subtask per title, in order", async () => {
        // Arrange
        const taskId = await createTaskUpstream({ account: owner, boardId, columnId, title: "Fan-out task" });
        const titles = ["Make coffee", "Drink coffee & smile"];

        // Act
        for (const title of titles) {
            const { ok } = await createSubtaskUpstream({ account: owner, boardId, columnId, taskId, title });
            expect(ok).toBe(true);
        }

        // Assert
        expect(await readSubtaskTitles({ account: owner, boardId, taskId })).toEqual(titles);
    }, 60_000);

    it("keeps a subtask that landed even when a later one in the same fan-out is refused", async () => {
        // Arrange — a title far past the backend's own bound refuses (T8's mirrored create-side rule).
        const taskId = await createTaskUpstream({ account: owner, boardId, columnId, title: "Partial fan-out task" });
        const landed = "Make coffee";
        const tooLong = "x".repeat(2000);

        // Act
        const first = await createSubtaskUpstream({ account: owner, boardId, columnId, taskId, title: landed });
        expect(first.ok).toBe(true);
        const second = await createSubtaskUpstream({ account: owner, boardId, columnId, taskId, title: tooLong });

        // Assert — the first subtask is kept regardless of what the second call answered.
        expect(await readSubtaskTitles({ account: owner, boardId, taskId })).toContain(landed);
        expect(second.status).not.toBe(200);
    }, 60_000);
});
