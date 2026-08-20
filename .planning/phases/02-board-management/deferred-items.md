# Deferred Items — Phase 02

Out-of-scope discoveries logged during plan execution. Not fixed — outside the scope of the
plan that surfaced them.

## 02-02

- **`.claude/settings.local.json` fails `pnpm format:check`** — untracked, harness-managed local
  settings file (not part of `scripts/serve-static.mjs`, `scripts/serve-static.unit.test.mjs`, or
  `vitest.config.ts`, the only files this plan touches). Pre-existing before this plan's session
  started; unrelated to the path-traversal fix or the vitest wiring. `pnpm format:check` scoped to
  this plan's own files passes cleanly.
