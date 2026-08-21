# Deferred Items

Out-of-scope discoveries logged during plan execution, per the executor's SCOPE BOUNDARY rule
(fix only issues directly caused by the current task's own changes).

## 02.1-14 (Task 3, repo-wide `pnpm format:check`)

- **`src/lib/server/cookies/cookie-client.unit.test.ts`** — `prettier --check .` flags this file
  as needing reformatting. Not modified by any plan in this phase's wave 6 (not in 02.1-11's,
  02.1-12's, or 02.1-13's `files_modified` list either); pre-existing, unrelated to this plan's
  comment-only diff. Left unfixed per the scope boundary — whichever future plan next touches this
  file should run `prettier --write` on it, or it can be swept separately.
