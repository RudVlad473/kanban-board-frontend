# Deferred Items — Phase 02.2

Out-of-scope discoveries surfaced during plan execution, logged per the executor's scope
boundary rule (not fixed; not this plan's files).

## From plan 02.2-04

- **`app/layout.tsx(19,41): error TS2304: Cannot find name 'LayoutProps'`** — surfaced by
  `pnpm exec tsc --noEmit` during this plan's batch gate (Task 3). `app/layout.tsx` is not among
  this plan's `files_modified` and was not touched by any of its commits (verified via `git log`/
  `git diff` — the error predates plan 02.2-04's changes). Likely a Next.js typegen artifact
  (`.next/types`) that needs regenerating outside this plan's scope, not a real type error
  introduced here.
