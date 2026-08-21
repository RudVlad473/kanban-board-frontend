/**
 * Single `as const` source (ADR tech/0012) for every E2E config value — `playwright.config.ts`'s
 * spawned `next start` process and the specs themselves must never resolve two different values.
 * See SETUP.md and .github/workflows/ci.yml for where each value comes from.
 */
import { resolveTestApiBaseUrl } from "../src/test-utils/api-base-url";

const E2E_PORT = 4173;

export const E2E_CONFIG = {
    SESSION_SECRET: process.env.SESSION_SECRET ?? "test-only-session-secret-not-for-production",
    EXTERNAL_API_BASE_URL: resolveTestApiBaseUrl(),
    PORT: E2E_PORT,
    BASE_URL: `http://localhost:${String(E2E_PORT)}`,
} as const;
