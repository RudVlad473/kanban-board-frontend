# Deferred Items — Phase 02.2

Out-of-scope discoveries logged during plan execution, per the executor's scope-boundary rule
(fix only issues directly caused by the current task's own changes).

## `scripts/check-no-play-functions.mjs:2` exceeds the 3-prose-line comment limit

- **Found during:** plan 02.2-05, Task 4 (`pnpm comments:check`)
- **Owning plan:** 02.2-01 (created this file; commit `1f7d15d`)
- **Issue:** the file's own header comment block is 4 prose lines, one over
  `check-comment-length.mjs`'s own `MAX_PROSE_LINES = 3` limit — a self-referential gap where the
  comment-length checker's own source file predates (or was never re-verified against) the rule
  it enforces.
- **Not fixed here:** `scripts/check-no-play-functions.mjs` is outside plan 02.2-05's
  `files_modified` list and was untouched by any of this plan's tasks — out of scope per the
  executor's scope-boundary rule.
- **Suggested fix:** compress the header comment to 3 lines or fewer, following the same pattern
  already used elsewhere in that file's own body comments.
