import { existsSync, mkdirSync, appendFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

/**
 * One append-only text file per test runner (D-C), at a repo-root-relative path both Playwright
 * (CJS-transformed `globalSetup`/`globalTeardown`, where `import.meta` throws) and Vitest can
 * resolve via `process.cwd()` alone — see 260829-kyv-SUMMARY.md "Deviations" for why.
 */
export const SEEDED_USER_REGISTRY_DIR = join(process.cwd(), ".e2e-seeded-users");

export const SEED_SCOPE = {
    PLAYWRIGHT: "PLAYWRIGHT",
    VITEST: "VITEST",
} as const;

export type SeedScope = (typeof SEED_SCOPE)[keyof typeof SEED_SCOPE];

const registryFilePath = (scope: SeedScope): string => join(SEEDED_USER_REGISTRY_DIR, `${scope.toLowerCase()}.txt`);

/**
 * Truncates the given scope's registry file (creating the directory first if this is the very
 * first call of a run). Safe to call when the file does not yet exist — a run's first `globalSetup`
 * invocation always hits that case.
 */
export const resetSeededUserRegistry = (scope: SeedScope): void => {
    mkdirSync(SEEDED_USER_REGISTRY_DIR, { recursive: true });
    rmSync(registryFilePath(scope), { force: true });
};

/**
 * Appends one id plus a newline. Called from every account-creating path this plan wires up —
 * `seedAccount()`, the UI sign-up helper, and each Vitest integration test's own sign-up.
 */
export const recordSeededUserId = ({ scope, id }: { scope: SeedScope; id: string }): void => {
    mkdirSync(SEEDED_USER_REGISTRY_DIR, { recursive: true });
    appendFileSync(registryFilePath(scope), `${id}\n`);
};

/**
 * Reads the scope's registry, deduplicated and blank-line-free. Returns an empty array (never
 * throws) when the file does not exist — a run that seeded nothing is the normal case once
 * teardown has already emptied it.
 */
export const readSeededUserIds = (scope: SeedScope): string[] => {
    const filePath = registryFilePath(scope);

    if (!existsSync(filePath)) {
        return [];
    }

    const ids = readFileSync(filePath, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    return [...new Set(ids)];
};
