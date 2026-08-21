/**
 * The real `server-only` package throws unconditionally outside Next.js's own webpack build, which
 * Vitest has none of — `vitest.config.ts` aliases the `server-only` specifier to this empty module
 * for every test project. Never imported by application code, only by the test config.
 */
export {};
