/**
 * The single declaration of the real backend's address for every test target (`vitest.config.ts`,
 * `e2e/test-env.ts`) so no two layers can see different values — GC-22, no mock server anywhere
 * (see 01-30-SUMMARY.md). Test infrastructure only; app code's own fail-fast read is unaffected (ADR tech/0006, tech/0014).
 */
export const NONPROD_API_BASE_URL = "https://kanban-board-rud-vlad-473-nonprod.duckdns.org/api";

export const resolveTestApiBaseUrl = (): string => process.env.EXTERNAL_API_BASE_URL ?? NONPROD_API_BASE_URL;
