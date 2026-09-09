import { randomInt, randomUUID } from "node:crypto";

import { isNil } from "es-toolkit";
import { beforeAll, describe, expect, it } from "vitest";

import { boardSchema } from "@/features/boards/schemas";
import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail, PROBLEM_CODE } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { recordSeededUserId, SEED_SCOPE } from "@/test-utils/seeded-user-registry";

// comment-length-exempt: records what this suite measures and what it deliberately cannot reach — a scope contract a future reader would otherwise re-litigate (docs/adr/tech/0023)
/*
 * The create-with-a-client-supplied-id contract, MEASURED against the real deployed nonprod
 * backend with no mock anywhere (ADR tech/0018) — the empirical record held by asserts rather
 * than by prose in a summary, so it cannot rot. Like
 * `rename-board-action.integration.test.ts` it does NOT import the action: that calls
 * `verifySession()` (request-scoped `cookies()`) and `refresh()` (Server-Action-only), neither of
 * which runs in the Vitest `node` project, and ADR tech/0025 retired the shim that faked one. What
 * is provable here is the request the action issues and the branch each response drives. The
 * session-scoped half is proved by `e2e/boards-create.e2e.spec.ts`.
 *
 * Every board NAME here stays inside `^[a-zA-Z0-9 ]*$`: `SaveBoardRequestDTO.name` declares that
 * charset, so a hyphen or an apostrophe is refused 400 — indistinguishable from the malformed-id
 * refusal this file isolates.
 */

type SeededAccount = { id: string; jsessionId: string };

const baseUrl = process.env.EXTERNAL_API_BASE_URL ?? "";

const buildUpstreamUrl = ({ userId }: { userId: string }): string =>
    `${baseUrl}${EXTERNAL_PATH.BOARDS}?userId=${userId}`;

/** Satisfies the backend's password and display-name rules (see e2e/seed.sh). */
const SEED_PASSWORD = "E2eFixturePwd1!";
const SEED_DISPLAY_NAME = "Integration Fixture";

const BOARD_ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/*
 * The backend's own charset and ceiling (`^[0-9a-z]{1,13}$`), restated locally rather than
 * imported: what is under test is the FORMAT the backend accepts, so borrowing the app's minter
 * would let a drift in it pass unnoticed here.
 */
const mintTestBoardId = (length = 13): string =>
    Array.from({ length }, () => BOARD_ID_ALPHABET[randomInt(BOARD_ID_ALPHABET.length)]).join("");

/** An alphanumeric-only suffix — a `randomUUID` slice would smuggle a hyphen into a board name. */
const mintNameSuffix = (): string => mintTestBoardId(8);

const signUp = async (): Promise<SeededAccount> => {
    const response = await fetch(`${baseUrl}${EXTERNAL_PATH.SIGN_UP}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: `create-${randomUUID()}@example.com`,
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

/** Exactly the call `createBoardAction` issues — same path, same query, same body shape. */
const createUpstream = async ({
    account,
    name,
    id,
}: {
    account: SeededAccount;
    name: string;
    id?: string;
}): Promise<{ status: number; body: unknown }> => {
    const response = await fetch(buildUpstreamUrl({ userId: account.id }), {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
        body: JSON.stringify({ name, ...(!isNil(id) ? { id } : {}) }),
    });

    return { status: response.status, body: await response.json().catch(() => null) };
};

describe("the board create with a client-supplied id, against the real backend", () => {
    let owner: SeededAccount;

    beforeAll(async () => {
        owner = await signUp();
    }, 60_000);

    /*
     * `version: 0` is MEASURED here, not assumed: `use-create-board.ts` stages that number
     * optimistically, and this assert is what stops the staged row and the server's row diverging.
     */
    it("accepts a client-minted id, echoes it back, and seeds a fresh board at version 0", async () => {
        // Arrange
        const id = mintTestBoardId();
        const name = `Create With Id ${mintNameSuffix()}`;

        // Act
        const { status, body } = await createUpstream({ account: owner, name, id });

        // Assert — the id is the client's own, and the version is the one the optimistic row stages.
        expect(status).toBe(201);
        const created = boardSchema.safeParse(body);
        expect(created.success).toBe(true);
        expect(created.success && created.data.id).toBe(id);
        expect(created.success && created.data.name).toBe(name);
        expect(created.success && created.data.version).toBe(0);
    }, 60_000);

    /*
     * The branch the hook would see on an id collision, carried all the way through
     * `mapProblemCodeToStatus` rather than re-derived by eye when authoring the toast copy.
     */
    it("refuses a second create naming an id already taken, as DUPLICATE_RESOURCE mapped to DUPLICATE", async () => {
        // Arrange
        const id = mintTestBoardId();
        const first = await createUpstream({ account: owner, name: `Dup Id First ${mintNameSuffix()}`, id });
        expect(first.status).toBe(201);

        // Act — the same id, a different name, so nothing but the id can be what is refused.
        const { status, body } = await createUpstream({
            account: owner,
            name: `Dup Id Second ${mintNameSuffix()}`,
            id,
        });

        // Assert
        expect(status).toBe(409);
        expect(parseProblemDetail(body)?.code).toBe(PROBLEM_CODE.DUPLICATE_RESOURCE);
        expect(mapProblemCodeToStatus(parseProblemDetail(body)?.code)).toBe(RESULT_STATUS.DUPLICATE);
    }, 60_000);

    /*
     * What makes the minter's format load-bearing rather than stylistic: the shape
     * `crypto.randomUUID()` produces — this hook's own mint until 260908-g5y — is refused outright.
     */
    it("refuses an id outside ^[0-9a-z]{1,13}$ with a 400, a randomUUID included", async () => {
        // Arrange
        const malformed = [randomUUID(), mintTestBoardId().toUpperCase(), mintTestBoardId(14), ""];

        // Act
        const outcomes = await Promise.all(
            malformed.map((id) => createUpstream({ account: owner, name: `Bad Id ${mintNameSuffix()}`, id })),
        );

        // Assert
        expect(outcomes.map((outcome) => outcome.status)).toEqual([400, 400, 400, 400]);
        expect(outcomes.map((outcome) => parseProblemDetail(outcome.body)?.code)).toEqual(
            Array.from({ length: malformed.length }, () => PROBLEM_CODE.VALIDATION_FAILED),
        );
    }, 60_000);

    /*
     * What `useCreateBoard`'s onSuccess rests on since 260908-g5y: it writes no boards-list row,
     * so a backend that started normalising names would desync the sidebar silently. `.trim()` is
     * all `boardNameSchema` does, so a doubled internal space is what the client can actually send.
     */
    it("echoes the name back byte for byte, doubled internal spacing included", async () => {
        // Arrange
        const name = `Verbatim  Spacing ${mintNameSuffix()}`;

        // Act
        const { status, body } = await createUpstream({ account: owner, name, id: mintTestBoardId() });

        // Assert
        expect(status).toBe(201);
        const created = boardSchema.safeParse(body);
        expect(created.success && created.data.name).toBe(name);
    }, 60_000);

    /* An omitted id still works, which is what keeps the contract's `id` genuinely optional. */
    it("still accepts a create that supplies no id at all", async () => {
        // Act
        const { status, body } = await createUpstream({ account: owner, name: `No Id ${mintNameSuffix()}` });

        // Assert
        expect(status).toBe(201);
        const created = boardSchema.safeParse(body);
        expect(created.success).toBe(true);
        expect(created.success && created.data.id).toMatch(/^[0-9a-z]{1,13}$/);
    }, 60_000);
});
