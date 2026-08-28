import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { sortColumnsByPosition } from "@/features/boards/model";
import { boardFullSchema, columnSchema, boardSchema, type Column, type ColumnFull } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { parseProblemDetail, PROBLEM_CODE } from "@/lib/core/api-contract/problem-detail";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `deleteColumnAction`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the action itself: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which can run in the Vitest `node` project, and ADR tech/0025 retired the shim that used to fake
 * one — the same split `delete-board-action.integration.test.ts` records. What is provable here is
 * everything downstream of the session: the exact request the action issues, the cascade actually
 * having happened rather than being cited from ADR domain/0002, and the ownership control that
 * guards the one column operation which cannot be undone. The session-scoped half is proved by
 * e2e/columns-delete.e2e.spec.ts; the invalid-input branch by the schema cases in
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
            email: `delete-column-${randomUUID()}@example.com`,
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

/* `SaveTaskRequestDTO` is POSTed to the column detail path, not to a `/tasks` one (kanban-board-openapi.json). */
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
    const response = await fetch(
        buildUpstreamUrl({ path: EXTERNAL_PATH.COLUMN_DETAIL, boardId, columnId, userId: account.id }),
        {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
            body: JSON.stringify({ title }),
        },
    );

    expect(response.ok).toBe(true);
};

/** Exactly the call `deleteColumnAction` issues — same path template, same query, no body. */
const deleteUpstream = async ({
    account,
    boardId,
    columnId,
}: {
    account: SeededAccount;
    boardId?: string;
    columnId: string;
}): Promise<{ status: number; ok: boolean; body: unknown }> => {
    const response = await fetch(
        buildUpstreamUrl({ path: EXTERNAL_PATH.COLUMN_DETAIL, boardId, columnId, userId: account.id }),
        { method: "DELETE", headers: { Cookie: `JSESSIONID=${account.jsessionId}` } },
    );

    return { status: response.status, ok: response.ok, body: await response.json().catch(() => null) };
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
    const board = await createBoardUpstream({ account, name: `Delete ${randomUUID().slice(0, 8)}` });
    const boardId = board?.id ?? "";

    for (const name of SEED_COLUMN_NAMES) {
        await createColumnUpstream({ account, boardId, name });
    }

    return { boardId, columns: await readColumns({ account, boardId }) };
};

describe("the column delete against the real backend", () => {
    let owner: SeededAccount;

    beforeAll(async () => {
        owner = await signUp();
    }, 60_000);

    /*
     * COLUMN-04's success criterion as an observation rather than a citation of ADR domain/0002:
     * a shorter column list would also pass if the task were merely orphaned rather than removed.
     */
    it("cascades, so a column holding a task leaves neither the column nor the task behind", async () => {
        // Arrange
        const { boardId, columns } = await seedBoard(owner);
        const target = columns[1];
        const title = `Cascade Task ${randomUUID().slice(0, 8)}`;
        await createTaskUpstream({ account: owner, boardId, columnId: target.id, title });
        const seeded = await readColumns({ account: owner, boardId });
        expect(seeded.flatMap((column) => column.tasks).map((task) => task.title)).toContain(title);

        // Act
        const { status } = await deleteUpstream({ account: owner, boardId, columnId: target.id });

        // Assert — the column is gone, and its task went with it.
        expect(status).toBe(200);
        const after = await readColumns({ account: owner, boardId });
        expect(after.map((column) => column.id)).not.toContain(target.id);
        expect(after.flatMap((column) => column.tasks).map((task) => task.title)).not.toContain(title);
    }, 60_000);

    /* 03-BACKEND-FACTS.md § R6: positions renumber contiguously, but the surviving order is preserved. */
    it("keeps the surviving columns in their relative order after a middle column is removed", async () => {
        // Arrange
        const { boardId, columns } = await seedBoard(owner);
        const target = columns[1];
        const expected = columns.filter((column) => column.id !== target.id).map((column) => column.name);

        // Act
        const { ok } = await deleteUpstream({ account: owner, boardId, columnId: target.id });
        expect(ok).toBe(true);

        // Assert — same relative order, renumbered from zero with no gap.
        const after = await readColumns({ account: owner, boardId });
        expect(after.map((column) => column.name)).toEqual(expected);
        expect(after.map((column) => column.position)).toEqual([0, 1, 2]);
    }, 60_000);

    /*
     * Refutes 03-RESEARCH Pitfall 2's premise for this endpoint: a dropped `boardId` is inert, not
     * refused, so the spec omitting it is accurate rather than defective (03-BACKEND-FACTS § R8).
     */
    it("resolves the column from its own id, so an unresolved board segment still deletes it", async () => {
        // Arrange
        const { boardId, columns } = await seedBoard(owner);
        const target = columns[0];

        // Act — the board placeholder left in, exactly as the serializer would leave it.
        const { ok } = await deleteUpstream({ account: owner, boardId: undefined, columnId: target.id });

        // Assert — it succeeded, and it removed the column from the board that owns it.
        expect(ok).toBe(true);
        expect((await readColumns({ account: owner, boardId })).map((column) => column.id)).not.toContain(target.id);
    }, 60_000);

    /*
     * The control that actually guards an irreversible delete, given the path's board segment does
     * not: the backend authorises from the session, so no board id in the URL widens a caller's reach.
     */
    it("refuses a stranger's delete whichever board id the path carries", async () => {
        // Arrange
        const { boardId, columns } = await seedBoard(owner);
        const target = columns[0];
        const stranger = await signUp();
        const strangerBoard = await createBoardUpstream({
            account: stranger,
            name: `Stranger ${randomUUID().slice(0, 8)}`,
        });

        // Act — once with the segment unresolved, once with the stranger's own board id in it.
        const withPlaceholder = await deleteUpstream({ account: stranger, boardId: undefined, columnId: target.id });
        const withOwnBoard = await deleteUpstream({
            account: stranger,
            boardId: strangerBoard?.id ?? "",
            columnId: target.id,
        });

        // Assert — refused both ways, and the owner's column is still there.
        expect(withPlaceholder.status).toBe(403);
        expect(withOwnBoard.status).toBe(403);
        expect(parseProblemDetail(withOwnBoard.body)?.code).toBe(PROBLEM_CODE.ACCESS_DENIED);
        expect((await readColumns({ account: owner, boardId })).map((column) => column.id)).toContain(target.id);
    }, 60_000);
});
