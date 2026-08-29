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
        env: { ...process.env, EXTERNAL_API_BASE_URL: E2E_CONFIG.EXTERNAL_API_BASE_URL },
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

export type SeededBoardFull = SeededBoard & { columns: { id: string; name: string; position: number }[] };

/**
 * Reads a board back through the real backend — the board-detail UI is Phase 3 scope, so a spec
 * asserting what a create actually persisted has nothing on screen to read it from yet.
 */
export const readBoardFull = ({ account, boardId }: { account: SeededAccount; boardId: string }): SeededBoardFull =>
    JSON.parse(
        runSeedScript(["board-full", "--jsession", account.jsessionId, "--user", account.id, "--board", boardId]),
    ) as SeededBoardFull;
