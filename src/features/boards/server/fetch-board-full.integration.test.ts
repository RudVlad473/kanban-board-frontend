import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { sortColumnsByPosition } from "@/features/boards/model";
import { boardFullSchema, type ColumnFull } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { recordSeededUserId, SEED_SCOPE } from "@/test-utils/seeded-user-registry";

// comment-length-exempt: records what this suite can and cannot reach and where the remainder is proved — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * `fetchBoardFull`'s upstream half, against the real deployed nonprod backend, with no mock
 * anywhere (ADR tech/0018). It deliberately does NOT import the read function itself: that calls
 * `verifySession()`, which reads `next/headers`' request-scoped `cookies()`, and ADR tech/0025
 * retired the shim that used to fake one — session-scoped behaviour is proved in the `e2e` project
 * instead (e2e/boards-detail.e2e.spec.ts). What is provable here is everything downstream of the
 * session: the request shape the read function issues, the backend's own ownership control
 * (T-02-50), and that a real response satisfies `boardFullSchema`. See 02-11-SUMMARY.md.
 */

type SeededAccount = { id: string; jsessionId: string };

const baseUrl = process.env.EXTERNAL_API_BASE_URL ?? "";

/**
 * Resolves an `EXTERNAL_PATH` template against the real backend, so this suite dials exactly the
 * paths `fetchBoardFull` does rather than a second hand-typed copy of them.
 */
const buildUpstreamUrl = ({ path, boardId = "", userId }: { path: string; boardId?: string; userId: string }): string =>
    `${baseUrl}${path.replace("{boardId}", boardId)}?userId=${userId}`;

/** Satisfies the backend's password and display-name rules (see e2e/seed.sh). */
const SEED_PASSWORD = "E2eFixturePwd1!";
const SEED_DISPLAY_NAME = "Integration Fixture";

const signUp = async (): Promise<SeededAccount> => {
    const response = await fetch(`${baseUrl}${EXTERNAL_PATH.SIGN_UP}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: `integration-${randomUUID()}@example.com`,
            password: SEED_PASSWORD,
            displayName: SEED_DISPLAY_NAME,
        }),
    });

    expect(response.ok).toBe(true);
    const body = (await response.json()) as { id: string };
    recordSeededUserId({ scope: SEED_SCOPE.VITEST, id: body.id });
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

const createBoardWithColumns = async ({
    account,
    columnNames,
}: {
    account: SeededAccount;
    columnNames: string[];
}): Promise<string> => {
    const headers = { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` };

    const boardResponse = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARDS, userId: account.id }), {
        method: "POST",
        headers,
        body: JSON.stringify({ name: `Integration Board ${randomUUID().slice(0, 8)}` }),
    });
    expect(boardResponse.ok).toBe(true);
    const board = (await boardResponse.json()) as { id: string };

    // Serial, never parallel: the backend derives a column's position from call order (P5).
    for (const name of columnNames) {
        const columnResponse = await fetch(
            buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_COLUMNS, boardId: board.id, userId: account.id }),
            { method: "POST", headers, body: JSON.stringify({ name }) },
        );
        expect(columnResponse.ok).toBe(true);
    }

    return board.id;
};

/** Exactly the call `fetchBoardFull` issues — same path template, same query parameter. */
const readBoardFull = async ({
    account,
    boardId,
}: {
    account: SeededAccount;
    boardId: string;
}): Promise<{ status: number; body: unknown }> => {
    const response = await fetch(buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_FULL, boardId, userId: account.id }), {
        headers: { Cookie: `JSESSIONID=${account.jsessionId}` },
    });

    return { status: response.status, body: await response.json().catch(() => null) };
};

/** 03-BACKEND-FACTS.md § R1: `targetPosition` is the moved column's FINAL 0-based index. */
const reorderColumn = async ({
    account,
    boardId,
    column,
    targetPosition,
}: {
    account: SeededAccount;
    boardId: string;
    column: ColumnFull;
    targetPosition: number;
}): Promise<number> => {
    const response = await fetch(
        `${baseUrl}${EXTERNAL_PATH.COLUMN_REORDER.replace("{boardId}", boardId).replace("{columnId}", column.id)}?userId=${account.id}`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
            body: JSON.stringify({ version: column.version, targetPosition }),
        },
    );

    return response.status;
};

/** The columns of a board read back, parsed — the only shape a caller of this suite should assert on. */
const readColumns = async ({
    account,
    boardId,
}: {
    account: SeededAccount;
    boardId: string;
}): Promise<ColumnFull[]> => {
    const { body } = await readBoardFull({ account, boardId });
    const parsed = boardFullSchema.safeParse(body);

    expect(parsed.success).toBe(true);
    return parsed.success ? parsed.data.columns : [];
};

describe("the full-board read against the real backend", () => {
    let owner: SeededAccount;
    let ownedBoardId: string;

    beforeAll(async () => {
        owner = await signUp();
        ownedBoardId = await createBoardWithColumns({ account: owner, columnNames: ["Todo", "Doing", "Done"] });
    }, 60_000);

    it("returns the requested board's own columns, in the order the backend supplied", async () => {
        // Act
        const { status, body } = await readBoardFull({ account: owner, boardId: ownedBoardId });

        // Assert
        expect(status).toBe(200);
        const parsed = boardFullSchema.safeParse(body);
        expect(parsed.success).toBe(true);
        expect(parsed.success && parsed.data.id).toBe(ownedBoardId);
        expect(parsed.success && parsed.data.columns.map((column) => column.name)).toEqual(["Todo", "Doing", "Done"]);
    });

    /*
     * T-02-50: the backend refuses on its own authority even when handed the victim's own id, so
     * this asserts the control itself rather than inferring it from the contract (P7).
     */
    it("never returns a board belonging to a different account", async () => {
        // Arrange
        const stranger = await signUp();

        // Act
        const withOwnId = await readBoardFull({ account: stranger, boardId: ownedBoardId });
        const withOwnersId = await fetch(
            buildUpstreamUrl({ path: EXTERNAL_PATH.BOARD_FULL, boardId: ownedBoardId, userId: owner.id }),
            { headers: { Cookie: `JSESSIONID=${stranger.jsessionId}` } },
        );

        // Assert — a non-ok status either way, and never the owner's board.
        expect(withOwnId.status).toBe(403);
        expect(withOwnersId.status).toBe(403);
    }, 60_000);

    it("resolves a board id that does not exist to a non-ok status, not to someone's contents", async () => {
        // Act
        const { status } = await readBoardFull({ account: owner, boardId: `absent-${randomUUID().slice(0, 8)}` });

        // Assert
        expect(status).not.toBe(200);
        expect([403, 404]).toContain(status);
    });

    /*
     * The malformed-body branch: `boardFullSchema` is what turns a bad payload into a handled
     * non-ok result, so a body the backend could never send must still be rejected (T-02-52).
     */
    it("rejects an upstream body that is not a well-formed full board", () => {
        // Act & Assert
        expect(boardFullSchema.safeParse({ id: "b1", name: "Board", version: 0 }).success).toBe(false);
        expect(boardFullSchema.safeParse({ id: "b1", name: "Board", version: 0, columns: [{}] }).success).toBe(false);
    });

    /*
     * COLUMN-03's own success criterion, which no gate exercised: 03-10 proved the write returns 200,
     * never that a later read reflects it. Seeded on its own board so the suite's order assertion
     * above keeps asserting an untouched board.
     */
    describe("after a reorder the same account issued", () => {
        let reorderedBoardId: string;
        let columnsAfterReorder: ColumnFull[];

        beforeAll(async () => {
            reorderedBoardId = await createBoardWithColumns({
                account: owner,
                columnNames: ["Alpha", "Beta", "Gamma"],
            });
            const seeded = await readColumns({ account: owner, boardId: reorderedBoardId });
            const alpha = seeded.find((column) => column.name === "Alpha");

            expect(alpha).toBeDefined();
            const status = await reorderColumn({
                account: owner,
                boardId: reorderedBoardId,
                column: alpha ?? seeded[0],
                targetPosition: 2,
            });

            expect(status).toBe(200);
            columnsAfterReorder = await readColumns({ account: owner, boardId: reorderedBoardId });
        }, 60_000);

        it("stores the new order as the columns' own positions", () => {
            // Act
            const positionByName = new Map(columnsAfterReorder.map((column) => [column.name, column.position]));

            // Assert
            expect(positionByName.get("Beta")).toBe(0);
            expect(positionByName.get("Gamma")).toBe(1);
            expect(positionByName.get("Alpha")).toBe(2);
        });

        it("reads back in the order the user left it once the read boundary's own sort is applied", () => {
            // Act
            const displayed = sortColumnsByPosition(columnsAfterReorder).map((column) => column.name);

            // Assert
            expect(displayed).toEqual(["Beta", "Gamma", "Alpha"]);
        });

        /*
         * What makes the assertion above falsifiable rather than decorative: were the raw array
         * already position-ordered, the sort would be a no-op and this suite could not fail on the
         * defect it exists to close.
         */
        it("carries a raw array order that does not already agree with those positions", () => {
            // Act & Assert
            expect(columnsAfterReorder.map((column) => column.name)).not.toEqual(["Beta", "Gamma", "Alpha"]);
        });
    });
});
