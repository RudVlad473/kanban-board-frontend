# Deferred Items — Phase 02.1

Out-of-scope discoveries logged during plan execution, per the executor's Scope Boundary rule
(only auto-fix issues directly caused by the current task's own changes).

## `src/lib/server/cookies/cookie-client.unit.test.ts` fails `pnpm format:check`

Pre-existing Prettier formatting issue, independently confirmed by both plan 02.1-12 (present at
the wave-6 base commit `3b5af88`, last touched by plan 02.1-03's `d61b80a`) and plan 02.1-14's
repo-wide `pnpm format:check` gate. Not modified by any wave-6 plan (02.1-11, 02.1-12, 02.1-13, or
02.1-14) — out of scope for a comment-only sweep. Left unfixed here; whichever future plan next
touches this file should run `prettier --write` on it, or it can be swept separately.
