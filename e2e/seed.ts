import { spawnSync } from "node:child_process";

import { E2E_CONFIG } from "./test-env";

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

export const seedAccount = (): SeededAccount => JSON.parse(runSeedScript(["account"])) as SeededAccount;

export const seedBoard = ({ account, name }: { account: SeededAccount; name: string }): SeededBoard =>
    JSON.parse(
        runSeedScript(["board", "--jsession", account.jsessionId, "--user", account.id, "--name", name]),
    ) as SeededBoard;
