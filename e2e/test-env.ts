/**
 * Shared between `playwright.config.ts`'s `e2e` webServer (which forwards these as the spawned
 * `next start` process's env) and the specs themselves (which need the exact same
 * `SESSION_SECRET` to sign an already-expired token for the expired-cookie scenario). Resolving
 * both from the same module — rather than each independently reading `process.env` with its own
 * fallback — guarantees they can never see two different values.
 *
 * The fallback mirrors `vitest.config.ts`'s own test-only secret; in CI, `.github/workflows/
 * ci.yml`'s `e2e` job always sets a real workflow-generated `SESSION_SECRET` so this fallback
 * never triggers there.
 */
export const E2E_SESSION_SECRET = process.env.SESSION_SECRET ?? "test-only-session-secret-not-for-production";

export const E2E_EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL ?? "http://localhost:8080/api";

export const E2E_PORT = 4173;

export const E2E_BASE_URL = `http://localhost:${String(E2E_PORT)}`;
