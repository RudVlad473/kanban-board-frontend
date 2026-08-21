# Deferred Items — Phase 02.1

Out-of-scope discoveries logged during plan execution, per the executor's Scope Boundary rule
(only auto-fix issues directly caused by the current task's own changes).

## Plan 02.1-12

- **`src/lib/server/cookies/cookie-client.unit.test.ts` fails `pnpm format:check`** — pre-existing
  Prettier formatting issue, confirmed present at the wave-6 base commit (`3b5af88`), before any of
  this plan's comment-compression edits. Not touched by plan 02.1-12 (last commit affecting this
  file: `d61b80a`, plan 02.1-03). Out of scope for a comment-only sweep — left unfixed here.
