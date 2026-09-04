import { spawnSync } from "node:child_process";

import { E2E_CONFIG } from "./test-env";
import { recordSeededUserId, SEED_SCOPE } from "../src/test-utils/seeded-user-registry";

export type SeededAccount = {
    id: string;
    email: string;
    password: string;
    displayName: string;
    jsessionId: string;
};

export type SeededBoard = { id: string; name: string; version: number };

/*
 * Invoked via `bash` explicitly (not the shebang), so this also runs on the Windows dev machine
 * this project is developed on — Git Bash supplies `bash` there.
 */
const runSeedScript = (args: string[]): string => {
    const result = spawnSync("bash", ["e2e/seed.sh", ...args], {
        /*
         * `E2E_SEED_SKIP_REGISTRY` because `seedAccount` records the id itself, into the scope
         * `globalTeardown` reads — letting the script also record it would list the same account
         * twice and 404 the whole delete batch on the second, already-deleted id.
         */
        env: {
            ...process.env,
            EXTERNAL_API_BASE_URL: E2E_CONFIG.EXTERNAL_API_BASE_URL,
            E2E_SEED_SKIP_REGISTRY: "1",
        },
        encoding: "utf8",
    });

    if (result.status !== 0) {
        throw new Error(`e2e/seed.sh ${args.join(" ")} failed: ${result.stderr}`);
    }

    return result.stdout;
};

export const seedAccount = (): SeededAccount => {
    const account = JSON.parse(runSeedScript(["account"])) as SeededAccount;
    recordSeededUserId({ scope: SEED_SCOPE.PLAYWRIGHT, id: account.id });
    return account;
};

export const seedBoard = ({ account, name }: { account: SeededAccount; name: string }): SeededBoard =>
    JSON.parse(
        runSeedScript(["board", "--jsession", account.jsessionId, "--user", account.id, "--name", name]),
    ) as SeededBoard;

export type SeededColumn = { id: string; name: string; version: number; position: number };

/**
 * Creates one column on an already-seeded board, in call order — the backend derives `position`
 * from that order, so two columns are seeded with two calls, never one parallel pair (P5).
 */
export const seedColumn = ({
    account,
    boardId,
    name,
}: {
    account: SeededAccount;
    boardId: string;
    name: string;
}): SeededColumn =>
    JSON.parse(
        runSeedScript([
            "column",
            "--jsession",
            account.jsessionId,
            "--user",
            account.id,
            "--board",
            boardId,
            "--name",
            name,
        ]),
    ) as SeededColumn;

export type SeededTask = { id: string; title: string; version: number; position: number };

/**
 * Creates one task on an already-seeded column — the same "one call at a time" rule as
 * `seedColumn`. `description` is optional and omitted from the wire body entirely when unset
 * (T9: an explicit `""` is refused with 400), for specs that need a task with real description text.
 */
export const seedTask = ({
    account,
    boardId,
    columnId,
    title,
    description,
}: {
    account: SeededAccount;
    boardId: string;
    columnId: string;
    title: string;
    description?: string;
}): SeededTask =>
    JSON.parse(
        runSeedScript([
            "task",
            "--jsession",
            account.jsessionId,
            "--user",
            account.id,
            "--board",
            boardId,
            "--column",
            columnId,
            "--title",
            title,
            ...(description !== undefined ? ["--description", description] : []),
        ]),
    ) as SeededTask;

/**
 * SYNC-01's out-of-band write: bumps a task's `version` through the SAME seeded session that
 * created it (never a second sign-in), so a conflict spec can make the UI's already-loaded
 * `version` stale without spending the account's other session slot.
 */
export const updateTaskOutOfBand = ({
    account,
    boardId,
    columnId,
    taskId,
    title,
    version,
}: {
    account: SeededAccount;
    boardId: string;
    columnId: string;
    taskId: string;
    title: string;
    version: number;
}): SeededTask =>
    JSON.parse(
        runSeedScript([
            "task-update",
            "--jsession",
            account.jsessionId,
            "--user",
            account.id,
            "--board",
            boardId,
            "--column",
            columnId,
            "--task",
            taskId,
            "--title",
            title,
            "--version",
            String(version),
        ]),
    ) as SeededTask;

export type SeededSubtask = { id: string; title: string; isCompleted: boolean; version: number };

/** Creates one subtask on an already-seeded task — the same "one call at a time" rule as `seedTask`. */
export const seedSubtask = ({
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
}): SeededSubtask =>
    JSON.parse(
        runSeedScript([
            "subtask",
            "--jsession",
            account.jsessionId,
            "--user",
            account.id,
            "--board",
            boardId,
            "--column",
            columnId,
            "--task",
            taskId,
            "--title",
            title,
        ]),
    ) as SeededSubtask;

/*
 * `columns[].tasks` is widened here rather than in a second type: existing callers destructure
 * only `id`/`name`/`position` and stay unaffected, while TASK-05's cascade specs need to read a
 * task's own id back from the real backend — the "read the board, don't infer it" proof.
 */
export type SeededBoardFull = SeededBoard & {
    columns: { id: string; name: string; position: number; tasks: { id: string; title: string }[] }[];
};

/**
 * Reads a board back through the real backend — the board-detail UI is Phase 3 scope, so a spec
 * asserting what a create actually persisted has nothing on screen to read it from yet.
 */
export const readBoardFull = ({ account, boardId }: { account: SeededAccount; boardId: string }): SeededBoardFull =>
    JSON.parse(
        runSeedScript(["board-full", "--jsession", account.jsessionId, "--user", account.id, "--board", boardId]),
    ) as SeededBoardFull;
