/**
 * The single declaration of the real backend's address for every test target — `vitest.config.ts`
 * (the `node` project) and `e2e/test-env.ts` both resolve their base URL from here instead of each
 * independently hardcoding a fallback, so the two can never see two different values (GC-22: no
 * mock server remains anywhere in the codebase; every test layer dials the deployed nonprod
 * backend). Deliberately dependency-free and free of anything browser-only — `vitest.config.ts`
 * imports this module directly at config-evaluation time, outside any test environment.
 *
 * Application code is unaffected by this module — `src/lib/api/server-client.ts` keeps its
 * fail-fast read with no fallback of its own, since ADR tech/0006 forbids a hardcoded default
 * there; this file exists only for test infrastructure (ADR tech/0014).
 */
export const NONPROD_API_BASE_URL = "https://kanban-board-rud-vlad-473-nonprod.duckdns.org/api";

export const resolveTestApiBaseUrl = (): string => process.env.EXTERNAL_API_BASE_URL ?? NONPROD_API_BASE_URL;
