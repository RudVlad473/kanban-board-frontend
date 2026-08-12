/**
 * `server-only`'s real package (`server-only@0.0.1`) throws unconditionally when required
 * outside Next.js's own webpack build — Next.js aliases it to a no-op for server bundles and to
 * an error-throwing module for client bundles at build time; it has no idea what a plain Node
 * runtime is. Vitest's "node" project has no such build step, so any module under test that
 * starts with `import "server-only"` (session.ts, dal.ts, server-client.ts, the BFF Route
 * Handlers) crashes on import unless something stands in for the real package. `vitest.config.ts`
 * aliases the `server-only` specifier to this empty module for every test project — this file is
 * never imported by application code, only by the test config, per this project's own
 * `src/test-utils/` convention (CONVENTIONS.md).
 */
export {};
