# Deferred Items — Phase 02.2

Out-of-scope discoveries surfaced during plan execution, logged per the executor's scope
boundary rule (not fixed; not that plan's files).

## From plan 02.2-04

- **`app/layout.tsx(19,41): error TS2304: Cannot find name 'LayoutProps'`** — surfaced by
  `pnpm exec tsc --noEmit` during this plan's batch gate (Task 3). `app/layout.tsx` is not among
  this plan's `files_modified` and was not touched by any of its commits (verified via `git log`/
  `git diff` — the error predates plan 02.2-04's changes). Likely a Next.js typegen artifact
  (`.next/types`) that needs regenerating outside this plan's scope, not a real type error
  introduced here.

## From plan 02.2-05 — `scripts/check-no-play-functions.mjs:2` exceeds the 3-prose-line comment limit

- **Found during:** plan 02.2-05, Task 4 (`pnpm comments:check`)
- **Owning plan:** 02.2-01 (created this file; commit `1f7d15d`)
- **Issue:** the file's own header comment block was 4 prose lines, one over
  `check-comment-length.mjs`'s own `MAX_PROSE_LINES = 3` limit — a self-referential gap where the
  comment-length checker's own source file predates (or was never re-verified against) the rule
  it enforces.
- **Status: RESOLVED** — independently fixed as an in-scope Rule 3 drive-by in plans 02.2-02,
  02.2-03 and 02.2-04 (each hit the same pre-existing `comments:check` failure in their own batch
  gate and compressed the comment to 3 lines; the wave-2 merge kept 02.2-02's wording). No further
  action needed.
