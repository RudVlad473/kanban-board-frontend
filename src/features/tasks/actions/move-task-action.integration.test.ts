import { randomUUID } from "node:crypto";

import { isNil } from "es-toolkit";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { parseProblemDetail, PROBLEM_CODE } from "@/lib/core/api-contract/problem-detail";
import { taskFullSchema, taskSchema, type TaskFull } from "@/lib/core/api-contract/task-schemas";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `moveTaskAction`'s upstream half, against the real deployed nonprod backend, with no mock anywhere
 * (ADR tech/0018). It deliberately does NOT import the action itself: that calls `verifySession()`
 * (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of which can run in the
 * Vitest `node` project, and ADR tech/0025 retired the shim that used to fake one — the same split
 * `reorder-column-action.integration.test.ts` records. It also imports nothing from the boards
 * feature: `boundaries/dependencies` disallows `feature -> feature` in both directions, so the
 * board-full read is parsed here against the core ring's own task shape. This is the suite that
 * proves the wire semantics TASK-04 rests on. The session-scoped half is proved by
 * e2e/tasks-move.e2e.spec.ts; the invalid-input branch by the schema cases in schemas.unit.test.ts.
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
    const withBoard = isNil(boardId) ? path : path.replace("{boardId}", boardId);
    const withColumn = isNil(columnId) ? withBoard : withBoard.replace("{columnId}", columnId);
    const resolved = isNil(taskId) ? withColumn : withColumn.replace("{taskId}", taskId);

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
            email: `move-task-${randomUUID()}@example.com`,
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

/** The `/full` read, narrowed to what this suite asserts on — the core ring's shapes, not the boards feature's. */
const boardTasksSchema = z.object({
    columns: z.object({ id: z.string(), tasks: taskFullSchema.array() }).array(),
});

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

/*
 * Task creation posts to the COLUMN resource itself, with no trailing segment naming the child —
 * the sibling `.../tasks` path is GET-only and answers a POST with 405 (Pitfall 1, T1).
 */
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
}): Promise<void> => {
    await postJson({
        url: buildUpstreamUrl({ path: EXTERNAL_PATH.COLUMN_DETAIL, boardId, columnId, userId: account.id }),
        account,
        body: { title },
    });
};

/** One column's tasks in `position` order — the response array's own order carries no guarantee (T3-adjacent). */
const readTasks = async ({
    account,
    boardId,
    columnId,
}: {
    account: SeededAccount;
    boardId: string;
    columnId: string;
}): Promise<TaskFull[]> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_FULL, boardId, userId: account.id }), {
        headers: { Cookie: `JSESSIONID=${account.jsessionId}` },
    });

    const board = boardTasksSchema.safeParse(await response.json().catch(() => null));
    expect(board.success).toBe(true);
    const tasks = board.success ? (board.data.columns.find((column) => column.id === columnId)?.tasks ?? []) : [];

    return [...tasks].sort((left, right) => left.position - right.position);
};

/** Exactly the call `moveTaskAction` issues — same path template, same query, same body. */
const moveUpstream = async ({
    account,
    taskId,
    targetColumnId,
    version,
    targetPosition,
}: {
    account: SeededAccount;
    taskId: string;
    targetColumnId: string;
    version: number;
    targetPosition: number;
}): Promise<{ status: number; ok: boolean; body: unknown }> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.TASK_MOVE, taskId, userId: account.id }), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
        body: JSON.stringify({ targetColumnId, version, targetPosition }),
    });

    return { status: response.status, ok: response.ok, body: await response.json().catch(() => null) };
};

const SOURCE_TASK_TITLES = ["Move Alpha", "Move Bravo", "Move Charlie"];
const DESTINATION_TASK_TITLES = ["Dest One", "Dest Two"];

type SeededBoard = { boardId: string; sourceColumnId: string; destinationColumnId: string };

/*
 * Created strictly sequentially: the backend derives a column's and a task's position from creation
 * order (02-BACKEND-FACTS.md P5, T1), so a parallel seed would make the starting order
 * non-deterministic.
 */
const seedBoard = async (account: SeededAccount): Promise<SeededBoard> => {
    const boardId = await createBoardUpstream({ account, name: `Move ${randomUUID().slice(0, 8)}` });
    const sourceColumnId = await createColumnUpstream({ account, boardId, name: "Source" });
    const destinationColumnId = await createColumnUpstream({ account, boardId, name: "Destination" });

    for (const title of SOURCE_TASK_TITLES) {
        await createTaskUpstream({ account, boardId, columnId: sourceColumnId, title });
    }

    for (const title of DESTINATION_TASK_TITLES) {
        await createTaskUpstream({ account, boardId, columnId: destinationColumnId, title });
    }

    return { boardId, sourceColumnId, destinationColumnId };
};

describe("the task move against the real backend", () => {
    let owner: SeededAccount;

    beforeAll(async () => {
        owner = await signUp();
    }, 60_000);

    /*
     * The load-bearing case: `targetPosition` is the moved task's FINAL 0-based index in the
     * destination (T3), so the client's own index goes out verbatim and a misread of the wire
     * semantics diverges here rather than silently after a reload.
     */
    it("lands the task at the target position it was sent, and parses as the tasks-less shape", async () => {
        // Arrange
        const { boardId, sourceColumnId, destinationColumnId } = await seedBoard(owner);
        const sourceTasks = await readTasks({ account: owner, boardId, columnId: sourceColumnId });
        expect(sourceTasks.map((task) => task.title)).toEqual(SOURCE_TASK_TITLES);
        const moved = sourceTasks[0];
        const targetPosition = 1;

        // Act
        const { status, body } = await moveUpstream({
            account: owner,
            taskId: moved.id,
            targetColumnId: destinationColumnId,
            version: moved.version,
            targetPosition,
        });

        // Assert — the response parses with the mutation shape, which carries no subtasks array.
        expect(status).toBe(200);
        const parsed = taskSchema.safeParse(body);
        expect(parsed.success).toBe(true);
        expect(parsed.success && parsed.data.position).toBe(targetPosition);

        // Assert — both columns read back exactly as the client would have predicted.
        expect(
            (await readTasks({ account: owner, boardId, columnId: destinationColumnId })).map((t) => t.title),
        ).toEqual(["Dest One", "Move Alpha", "Dest Two"]);
        expect((await readTasks({ account: owner, boardId, columnId: sourceColumnId })).map((t) => t.title)).toEqual([
            "Move Bravo",
            "Move Charlie",
        ]);
    }, 60_000);

    /* T4: the move shares the board rename's conflict code, so the existing toast branch covers it. */
    it("refuses a replay carrying the now-stale version with the optimistic-lock problem code", async () => {
        // Arrange
        const { boardId, sourceColumnId, destinationColumnId } = await seedBoard(owner);
        const [target] = await readTasks({ account: owner, boardId, columnId: sourceColumnId });
        const first = await moveUpstream({
            account: owner,
            taskId: target.id,
            targetColumnId: destinationColumnId,
            version: target.version,
            targetPosition: 0,
        });
        expect(first.ok).toBe(true);

        // Act — replay the same body, whose version is now behind the task's own.
        const { status, body } = await moveUpstream({
            account: owner,
            taskId: target.id,
            targetColumnId: destinationColumnId,
            version: target.version,
            targetPosition: 0,
        });

        // Assert
        expect(status).toBe(409);
        expect(parseProblemDetail(body)?.code).toBe(PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT);
    }, 60_000);

    /*
     * T7(a) and threat T-04-03: the move path carries no board scoping, so the backend is the only
     * authorization point. A destination on a different board is refused and the task stays put.
     */
    it("refuses a move onto a column that belongs to a different board", async () => {
        // Arrange — two boards on the same account, so only the destination differs.
        const { boardId, sourceColumnId } = await seedBoard(owner);
        const otherBoard = await seedBoard(owner);
        const [target] = await readTasks({ account: owner, boardId, columnId: sourceColumnId });

        // Act
        const { ok, status } = await moveUpstream({
            account: owner,
            taskId: target.id,
            targetColumnId: otherBoard.destinationColumnId,
            version: target.version,
            targetPosition: 0,
        });

        // Assert — refused, and nothing crossed the board boundary.
        expect(ok).toBe(false);
        expect(status).toBe(400);
        expect(
            (
                await readTasks({
                    account: owner,
                    boardId: otherBoard.boardId,
                    columnId: otherBoard.destinationColumnId,
                })
            ).map((task) => task.title),
        ).toEqual(DESTINATION_TASK_TITLES);
        expect(
            (await readTasks({ account: owner, boardId, columnId: sourceColumnId })).map((task) => task.title),
        ).toEqual(SOURCE_TASK_TITLES);
    }, 120_000);
});
