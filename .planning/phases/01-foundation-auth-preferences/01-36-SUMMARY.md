---
phase: 01-foundation-auth-preferences
plan: 36
subsystem: infra
tags: [eslint, eslint-plugin-boundaries, lib-restructure, module-layering, static-analysis]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences
    provides: "01-33/01-34/01-35 merged — Server Actions auth migration and CONVENTIONS.md edits complete, so this round's file moves don't race in-flight edits on the same files"
provides:
  - "Three-ring eslint-plugin-boundaries policy (lib-core/lib-server/lib-client) plus transitional lib-legacy* elements, enforcing GC-25 ring directionality at lint time"
  - "src/lib/core/ holding the whole pure ring (styling/, routing/, viewport/, api-contract/), with every importer repointed"
  - "The mechanical pattern (ring elements before legacy elements, transitional blanket policy) plan 01-37 repeats to move the server and client rings"
affects: ["01-37", "01-38"]

# Actuals (#2632)
actuals:
  tokens: 9419
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-ring eslint-plugin-boundaries element split (lib-core/lib-server/lib-client) with transitional lib-legacy*/lib-legacy-api/lib-legacy-validation elements that keep not-yet-moved flat files lint-recognised mid-round, removed wholesale once the last file moves (01-37 Task 3)"
    - "git mv preserves file history through a directory restructure; import-x/order's fixer (pnpm lint --fix) resettles alphabetization after a bulk import-path repoint rather than hand-ordering"

key-files:
  created: []
  modified:
    - eslint.config.mjs
    - src/lib/core/styling/cn.ts (moved from src/lib/cn.ts)
    - src/lib/core/routing/routes.ts (moved from src/lib/routes.ts)
    - src/lib/core/routing/routes.unit.test.ts (moved)
    - src/lib/core/viewport/viewport-breakpoints.ts (moved from src/lib/viewport-breakpoints.ts)
    - src/lib/core/api-contract/problem-detail.ts (moved from src/lib/api/problem-detail.ts)
    - src/lib/core/api-contract/problem-detail.unit.test.ts (moved)
    - src/lib/core/api-contract/generated-types.ts (moved from src/lib/api/generated-types.ts)
    - scripts/check-routes.mjs
    - package.json
    - .github/workflows/ci.yml
    - .prettierignore
    - .storybook/preview-annotations.tsx
    - .storybook/preview.tsx

key-decisions:
  - "Split Task 1's cn.ts move into two commits (eslint.config.mjs + rename in one, the 7 component importers in a second) after `git add` with a stale pathspec silently dropped the non-renamed files from the first `git add` invocation without erroring the whole command — caught before the second commit by re-checking `git status --short`."
  - "Ran pnpm build/api:generate locally with an inline, non-persisted SESSION_SECRET/EXTERNAL_API_BASE_URL (never written to .env.local) to work around the pre-existing documented gap (STATE.md Blockers) that blocks local pnpm build without real secrets — EXTERNAL_API_BASE_URL was deliberately left unset for the vitest node-project integration tests so they still hit the real nonprod backend via src/test-utils/api-base-url.ts's fallback."
  - "Widened the importer grep beyond the plan's listed @/lib/* alias patterns to also catch relative-path imports (../src/lib/routes in e2e/auth.e2e.spec.ts and e2e/route-guard.e2e.spec.ts, ../src/lib/viewport-breakpoints in visual/primitives.visual.spec.ts) — the plan's read_first list didn't enumerate these two e2e specs, and pnpm build's tsc step caught the miss."

patterns-established:
  - "Ring-element-before-legacy-element ordering in eslint-plugin-boundaries settings, with a blanket transitional policy on legacy elements, as the repeatable mechanism for moving files under a strict boundaries policy without a lint-red intermediate state."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, THEME-01]

coverage:
  - id: D1
    description: "eslint-plugin-boundaries recognises three lib rings (lib-core/lib-server/lib-client) plus three transitional lib-legacy* elements, enforcing GC-25 ring directionality; lint stays green through both tasks even though src/lib/api/server-client.ts, session-cookie.ts, session.ts, dal.ts, query-client.tsx, display-name.ts and validation/ are still flat"
    verification:
      - kind: other
        ref: "pnpm lint (eslint . via eslint-plugin-boundaries) — exit 0 after each task"
        status: pass
      - kind: unit
        ref: "src/lib/core/routing/routes.unit.test.ts, src/lib/core/api-contract/problem-detail.unit.test.ts — moved unchanged, same assertions"
        status: pass
    human_judgment: false
  - id: D2
    description: "The whole pure ring (cn.ts, routes.ts, viewport-breakpoints.ts, problem-detail.ts, generated-types.ts and their tests) lives under src/lib/core/ in four concern subfolders, every importer across src/app/scripts/.storybook/e2e/visual repointed, no pre-move import path remains"
    verification:
      - kind: other
        ref: "pnpm build && pnpm exec tsc --noEmit — exit 0 (an unresolved import fails both)"
        status: pass
      - kind: other
        ref: "grep -rIn for every pre-move @/lib/* and relative src/lib/* path across src, app, scripts, .storybook, e2e, visual — zero matches"
        status: pass
      - kind: unit
        ref: "pnpm vitest run --project browser --project unit --project storybook --project node — 399/399 passed"
        status: pass
      - kind: e2e
        ref: "pnpm exec playwright test --project visual — 220/220 passed"
        status: pass
    human_judgment: false
  - id: D3
    description: "All four toolchain references to generated-types.ts's new location (package.json api:generate output, ci.yml drift-diff target, eslint.config.mjs globalIgnores, .prettierignore) repointed; pnpm api:generate regenerates byte-identical content at the new path"
    verification:
      - kind: other
        ref: "pnpm api:generate && git diff --exit-code src/lib/core/api-contract/generated-types.ts — exit 0, no diff"
        status: pass
      - kind: other
        ref: "pnpm routes:check — exit 0 against the relocated routes.ts declaration site"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-08-19
status: complete
---

# Phase 01 Plan 36: Three-Ring `lib/` Boundaries + Pure-Ring Move Summary

**Turned on eslint-plugin-boundaries' three-ring lib-core/lib-server/lib-client policy (with a transitional lib-legacy scaffold) and moved the entire pure ring of `src/lib/` (cn, routes, viewport-breakpoints, problem-detail, generated-types) into `src/lib/core/` by concern, with every importer repointed.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 2 (Task 1 tracer + Task 2 auto)
- **Files modified:** 41 (7 moved via `git mv`, 34 importer/toolchain repoints)

## Accomplishments
- `eslint.config.mjs` now declares `lib-core`/`lib-server`/`lib-client` ring elements (`**` patterns) plus `lib-legacy`/`lib-legacy-api`/`lib-legacy-validation` transitional elements (`*` patterns), with GC-25's ring-directional dependency policies and a blanket transitional policy for the legacy elements — lint stayed green at every intermediate step of the move, proving the mechanism plan 01-37 repeats.
- The tracer (Task 1) moved `cn.ts` end-to-end through the whole toolchain first, before batching the remaining four modules in Task 2 — exactly as the plan's two-failure-mode analysis required.
- The entire pure ring (`cn.ts`, `routes.ts` + test, `viewport-breakpoints.ts`, `problem-detail.ts` + test, `generated-types.ts`) now lives under `src/lib/core/` in four concern subfolders (`styling/`, `routing/`, `viewport/`, `api-contract/`).
- All four toolchain references to `generated-types.ts`'s relocated path (`package.json`'s `api:generate` output, `.github/workflows/ci.yml`'s drift-diff target, `eslint.config.mjs`'s `globalIgnores` entry, `.prettierignore`'s entry) repointed; `pnpm api:generate` regenerates byte-identical content with zero drift.
- `scripts/check-routes.mjs`'s declaration-site path, exclusion list and console messages all repointed and re-verified green.
- Full gate green after both tasks: `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit`, all four Vitest projects (399/399 tests, including the `node` project's real-backend integration tests), and Playwright's `visual` project (220/220 screenshot comparisons).

## Task Commits

Each task was committed atomically (Task 1 split into two commits — see Deviations):

1. **Task 1a: eslint ring elements + cn.ts move** - `71df8b5` (feat)
2. **Task 1b: repoint cn.ts's 7 importers** - `1f54c12` (feat)
3. **Task 2: move remaining pure ring files + repoint all importers/toolchain refs** - `e4535a9` (feat)

_No plan-metadata commit in this worktree — the orchestrator writes STATE.md/ROADMAP.md/REQUIREMENTS.md after the wave merges._

## Files Created/Modified
- `eslint.config.mjs` - three `lib-*` ring elements + three transitional `lib-legacy*` elements, GC-25 ring-directional dependency policies, rewritten block comment
- `src/lib/core/styling/cn.ts` - moved from `src/lib/cn.ts` (git mv, history preserved)
- `src/lib/core/routing/routes.ts`, `routes.unit.test.ts` - moved from `src/lib/`
- `src/lib/core/viewport/viewport-breakpoints.ts` - moved from `src/lib/`
- `src/lib/core/api-contract/problem-detail.ts`, `problem-detail.unit.test.ts`, `generated-types.ts` - moved from `src/lib/api/`
- `scripts/check-routes.mjs` - declaration-site path, exclusion list, console messages repointed
- `package.json` - `api:generate` script's `-o` output path repointed
- `.github/workflows/ci.yml` - "API types drift" step's `git diff --exit-code` target repointed
- `.prettierignore`, `eslint.config.mjs` `globalIgnores` - generated-types.ts ignore entries repointed
- `.storybook/preview-annotations.tsx`, `.storybook/preview.tsx` - import and comment repointed
- ~20 importer files across `src/components/`, `src/features/auth/`, `src/lib/api/server-client.ts`, `src/test-utils/`, `app/`, `proxy.ts`, `e2e/`, `visual/` - repointed to the new `@/lib/core/...` paths

## Decisions Made
- Split Task 1's commit in two after discovering `git add` with a mix of an already-git-mv'd path and a stale-pathspec path (`src/lib/cn.ts`, already moved) silently staged only the rename and dropped the rest without erroring the compound command — caught via `git status --short` before the commit closed out Task 1, so no work was lost, just split into two atomic commits.
- Ran `pnpm build`/`pnpm api:generate` with an inline, non-persisted `SESSION_SECRET`/`EXTERNAL_API_BASE_URL` passed only as shell environment variables (never written to `.env.local`) to route around the pre-existing, previously-documented local-build gap (STATE.md Blockers/Concerns) — no repo files were touched to work around this.
- Deliberately left `EXTERNAL_API_BASE_URL` unset when running the Vitest `node` project so its real-backend integration tests kept hitting the actual nonprod backend via `src/test-utils/api-base-url.ts`'s fallback, rather than the dummy build-only URL — an initial run with the dummy URL set globally caused 3 spurious integration-test failures (DNS/timeout on `example.invalid`), which cleared on rerun without it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two e2e specs' relative-path imports of `@/lib/routes` missed by the plan's read_first grep**
- **Found during:** Task 2, `pnpm build`'s TypeScript step
- **Issue:** `e2e/auth.e2e.spec.ts` and `e2e/route-guard.e2e.spec.ts` both import `ROUTE` via a relative path (`../src/lib/routes`), not the `@/lib/routes` alias the plan's `read_first`/verify grep patterns searched for. `pnpm build` failed with `TS2307: Cannot find module '../src/lib/routes'` after the file moved.
- **Fix:** Repointed both to `../src/lib/core/routing/routes`. Also ran a broader repo-wide grep for bare `src/lib/routes|viewport-breakpoints|api/problem-detail|api/generated-types` substrings (not just the `@/lib/*` alias form) to confirm no other relative-import miss existed — none found.
- **Files modified:** `e2e/auth.e2e.spec.ts`, `e2e/route-guard.e2e.spec.ts`
- **Verification:** `pnpm build` and `pnpm exec tsc --noEmit` both exit 0 after the fix.
- **Committed in:** `e4535a9` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — missed relative-import importers)
**Impact on plan:** Necessary for correctness (an unresolved import fails the build, which the plan's own verify gate would have caught anyway); no scope creep, no architectural change.

## Issues Encountered
- `git add` with a mixed pathspec (one already-`git mv`'d rename, one stale pre-move path) silently staged only the successfully-matched paths and printed a `fatal:` line for the stale one without aborting the whole invocation — the eslint.config.mjs and 7 component-importer edits were left unstaged after the first commit. Caught immediately via `git status --short`; resolved by staging and committing them in a second commit before moving to Task 2.
- Running the full Vitest suite (`--project browser --project unit --project storybook`) concurrently produced 7 spurious Storybook interaction-test timeouts (resource contention, matching the same class of flake STATE.md's 01-33 session already documented) — re-running the `storybook` project alone, then all three projects together again, both came back fully green (30/30 and later 32/32 files passed), confirming no regression.
- Local `pnpm build` and `pnpm api:generate` hit the pre-existing documented `.env.local` gap (missing real `SESSION_SECRET`/`EXTERNAL_API_BASE_URL`) — worked around with inline, non-persisted shell env vars for build-only runs; the Vitest `node` project's real-backend integration tests were run without any `EXTERNAL_API_BASE_URL` override so they exercised the real nonprod backend as designed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The three-ring boundaries policy and its transitional `lib-legacy*` scaffold are live; plan 01-37 repeats this exact mechanism to move the server ring (`session.ts`, `dal.ts`, `server-client.ts`, `session-cookie.ts`), the client ring (`query-client.tsx`), and the feature-local moves (`display-name.ts` → `features/auth/model.ts`, `validation/auth-schemas.ts`, `auth-api.ts`/`auth-actions.ts` renames), then deletes the `lib-legacy*` elements in its own Task 3 once every flat file has moved.
- No blockers for 01-37. The pre-existing `.env.local` local-build gap remains open (documented in STATE.md, not this plan's scope) and will again need the same inline-env-var workaround (or a real `.env.local`) for 01-37's own `pnpm build` verification.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-19*

## Self-Check: PASSED

All created files verified present on disk (src/lib/core/styling/cn.ts,
src/lib/core/routing/routes.ts, src/lib/core/viewport/viewport-breakpoints.ts,
src/lib/core/api-contract/problem-detail.ts,
src/lib/core/api-contract/generated-types.ts, this SUMMARY.md). All four task
commits (71df8b5, 1f54c12, e4535a9) plus the summary commit (82fa466) verified
present in `git log`.
