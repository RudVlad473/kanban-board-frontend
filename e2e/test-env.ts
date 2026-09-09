/**
 * Single `as const` source (ADR tech/0012) for every E2E config value — `playwright.config.ts`'s
 * spawned `next start` process and the specs themselves must never resolve two different values.
 * See SETUP.md and .github/workflows/ci.yml for where each value comes from.
 */
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

import { resolveTestApiBaseUrl } from "../src/test-utils/api-base-url";

// comment-length-exempt: records why the load lives in this module's own body rather than in its caller, which is the ordering defect this replaces
/*
 * `.env.local` is loaded HERE, in the body that builds `E2E_CONFIG`, and deliberately not in
 * `playwright.config.ts`. It was there first (03-13) and it did not work: an `import` is evaluated
 * before the importing module's body, so this file captured `process.env.SESSION_SECRET` while it
 * was still unset, froze the fallback below, and only then did the caller populate `process.env`.
 * `E2E_CONFIG.SESSION_SECRET` and `process.env.SESSION_SECRET` then disagreed permanently — the
 * spec sealed a session cookie the running app could not verify, so `SESSION-01`'s forced sign-out
 * destroyed nothing. Statement order inside one module body is the fix that cannot be undone by an
 * import sorter; loading from the caller, or from a side-effect module imported here, both can.
 * An already-exported value still wins, so CI's own secrets are never overwritten.
 */
const loadLocalEnvFile = () => {
    if (!existsSync(".env.local")) return;

    for (const [key, value] of Object.entries(parseEnv(readFileSync(".env.local", "utf8")))) {
        process.env[key] ??= value;
    }
};

loadLocalEnvFile();

/*
 * Overridable so several checkouts can run the suite at once — each worktree exports its own
 * `E2E_PORT` and gets its own `next start`, instead of the second run silently reusing the first
 * one's server (`reuseExistingServer` is on off-CI, so a stale build would answer its requests).
 */
const E2E_PORT = Number(process.env.E2E_PORT ?? 4173);

export const E2E_CONFIG = {
    SESSION_SECRET: process.env.SESSION_SECRET ?? "test-only-session-secret-not-for-production",
    EXTERNAL_API_BASE_URL: resolveTestApiBaseUrl(),
    PORT: E2E_PORT,
    BASE_URL: `http://localhost:${String(E2E_PORT)}`,
} as const;
