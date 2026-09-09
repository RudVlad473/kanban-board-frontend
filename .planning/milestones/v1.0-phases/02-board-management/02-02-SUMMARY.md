---
phase: 02-board-management
plan: 02
subsystem: testing
tags: [node-http, path-traversal, vitest, playwright, tdd]

# Dependency graph
requires: []
provides:
  - "resolveWithinRoot({ root, pathname }) exported containment guard in scripts/serve-static.mjs"
  - "scripts/serve-static.unit.test.mjs — first automated test for the Playwright visual webServer script"
  - "scripts/**/*.unit.test.mjs wired into vitest's node project"
affects: [visual-regression-suite, ci-pipeline]

# Actuals (#2632)
actuals:
  tokens: 1394
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Node script containment guard: decodeURIComponent -> path.resolve(root, '.' + pathname) -> compare against path.resolve(root) + path.sep, never a bare string prefix"
    - "isMainModule guard (process.argv[1] vs fileURLToPath(import.meta.url)) so a script with a listen()/server side effect stays import-safe for unit testing"

key-files:
  created:
    - scripts/serve-static.unit.test.mjs
  modified:
    - scripts/serve-static.mjs
    - vitest.config.ts

key-decisions:
  - "RED/GREEN verified via a throwaway in-worktree vitest config (never committed) pointed only at scripts/**/*.unit.test.mjs, since Task 1's test can't be picked up by the real vitest.config.ts until Task 2 wires it in — confirmed 8/8 assertions fail pre-implementation (resolveWithinRoot is not a function) and pass post-implementation, before committing either half."
  - "Refusals stay on the existing 404 branch (same 'Not found' body) rather than a new 403, per the plan's threat-register mitigation for T-02-06 — denies a filesystem-existence oracle."

patterns-established:
  - "Node script containment/import-safety pattern (see tech-stack.patterns) — reusable for any future standalone Node script in scripts/ that needs both a CLI entry point and a testable export."

requirements-completed: [FT-02]

coverage:
  - id: D1
    description: "resolveWithinRoot refuses every path-escape form (../, encoded .., deep ../../, sibling-prefix dir, malformed percent-escape) and accepts every legitimate form (top-level file, nested file, root itself)"
    requirement: FT-02
    verification:
      - kind: unit
        ref: "scripts/serve-static.unit.test.mjs — all 8 tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "The request handler 404s (not 200) on a refused path, and the listen() call never fires on plain import"
    requirement: FT-02
    verification:
      - kind: manual_procedural
        ref: "node scripts/serve-static.mjs storybook-static 6007; curl -s -o /dev/null -w '%{http_code}' http://localhost:6007/../package.json -> 404; curl same for / -> 200; node -e \"import('./scripts/serve-static.mjs')\" exits 0 without binding a port"
        status: pass
    human_judgment: false
  - id: D3
    description: "scripts/**/*.unit.test.mjs runs as part of pnpm test's node project, and the visual-regression suite still passes with zero baseline diffs"
    requirement: FT-02
    verification:
      - kind: unit
        ref: "pnpm exec vitest run --project node (3 files, 22 tests, includes serve-static.unit.test.mjs) — pass"
      - kind: unit
        ref: "pnpm exec vitest run --project unit/tokens/browser/storybook (69/6/266/76 tests) — pass"
      - kind: e2e
        ref: "pnpm test:visual — visual/primitives.visual.spec.ts, 220/220 passed, zero baseline diffs"
      - kind: other
        ref: "pnpm lint (0 errors); pnpm exec prettier --check on this plan's 3 files (clean)"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-08-20
status: complete
---

# Phase 02 Plan 02: Path-Traversal Containment for the Visual webServer Script Summary

**Closed WR-01 by extracting a `resolveWithinRoot` containment guard into `scripts/serve-static.mjs`, gave it the script's first automated test via RED/GREEN TDD, and wired `scripts/**/*.unit.test.mjs` into vitest's `node` project — re-proving the full 439-test suite plus all 220 Playwright visual-regression specs green with zero baseline diffs.**

## Performance

- **Duration:** ~45 min (most of it spent waiting out heavy resource contention from other parallel wave agents running full test suites concurrently on the same machine — see Issues Encountered)
- **Tasks:** 2/2 completed
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments

- `resolveWithinRoot({ root, pathname })` closes the path-traversal hole flagged by Phase 01's
  code review (WR-01): decodes the pathname, resolves it against `root` (a leading `/` cannot
  discard root), and refuses anything that isn't `root` itself or doesn't start with
  `root + path.sep` — so `../`, an encoded `..`, a deep `../../`, and a sibling directory whose
  name merely starts with root's name are all refused, not just a naive `../` check.
- The request handler falls through to the existing 404 branch (same `Not found` body) on
  refusal instead of a new status code, per the plan's threat register — denying a probe a
  filesystem-existence oracle.
- `scripts/serve-static.mjs` gained its first automated test
  (`scripts/serve-static.unit.test.mjs`, 8 assertions), built RED-first: verified failing against
  the pre-fix module (`resolveWithinRoot is not a function`) before the implementation existed,
  then verified passing after.
- The `listen()` call is now guarded behind an `isMainModule` check
  (`process.argv[1]` vs `fileURLToPath(import.meta.url)`), so importing the module for its export
  never binds a port — proven by `node -e "import('./scripts/serve-static.mjs')"` exiting 0.
- `scripts/**/*.unit.test.mjs` is now part of vitest's `node` project `include` array, so the new
  test runs as part of `pnpm test`.
- Re-ran the full test surface end to end against the fixed script: all 5 vitest projects green
  (node 22, unit 69, tokens 6, browser 266, storybook 76 — 439 tests), `pnpm test:visual` green
  (220/220, zero baseline diffs against `storybook-static`), `pnpm lint` clean, this plan's 3
  files clean under `prettier --check`.

## Task Commits

Each task was committed atomically (Task 1 as a TDD RED/GREEN pair):

1. **Task 1 (RED): add failing test for resolveWithinRoot** - `01a84da` (test)
2. **Task 1 (GREEN): contain resolved request paths inside served root** - `0a7620b` (feat)
3. **Task 2: wire scripts/\*\*/\*.unit.test.mjs into the node vitest project** - `aa1a38b` (feat)

_No refactor commit was needed — the GREEN implementation was already the intended shape._

## Files Created/Modified

- `scripts/serve-static.mjs` - Extracted and exported `resolveWithinRoot`; handler now refuses
  out-of-root paths via the existing 404 branch; `listen()` guarded behind an `isMainModule` check
- `scripts/serve-static.unit.test.mjs` - New: 8 assertions covering every legitimate-path and
  escape-form case in the plan's `<behavior>` block
- `vitest.config.ts` - Added `"scripts/**/*.unit.test.mjs"` to the `node` project's `include`
  array, with a 3-line comment on why it belongs there instead of `unit`

## Decisions Made

- **RED verified via a throwaway config, never committed.** Task 1's own `<verify>`
  (`pnpm test -- scripts/serve-static.unit.test.mjs`) cannot succeed until Task 2 wires the glob
  into `vitest.config.ts` — no project's `include` array would pick up the file before that. To
  still prove genuine RED-then-GREEN (not just "write both files and hope"), I created a
  throwaway `scripts/.tmp-vitest.config.mjs` (`include: ["scripts/**/*.unit.test.mjs"]`, never
  staged or committed), used it to confirm all 8 assertions failed against the pre-fix
  `serve-static.mjs` (`resolveWithinRoot is not a function`), then confirmed all 8 passed against
  the fix, then deleted the temp file before either commit. This keeps the two task commits'
  content matching the plan exactly while still enforcing the RED-before-GREEN discipline the
  `tdd="true"` task type requires.
- **Refusals reuse the 404 branch, not a new 403.** Matches the plan's explicit T-02-06
  mitigation: an attacker probing for `../secret.txt` gets the identical response whether the
  path is outside root or simply doesn't exist.

## Deviations from Plan

None — plan executed exactly as written. The RED-verification workaround above is a testing
technique to satisfy the plan's own TDD requirement given its task ordering, not a deviation from
scope, files touched, or behavior.

## Issues Encountered

- **Heavy resource contention from concurrent wave agents.** A single unified `pnpm test`
  invocation (all 5 vitest projects at once) stalled for 30+ minutes under system memory pressure
  (2.8GB free of 16.7GB, ~20 headless Chrome processes alive across sibling worktree agents
  running their own suites in parallel). Killed it and re-ran each vitest project individually
  (`--project node/unit/tokens/browser/storybook`), which completed reliably in seconds-to-tens-
  of-seconds each — same 439 total tests, all passing. `pnpm test:visual` (220 Playwright specs)
  also completed cleanly once run standalone. This is an artifact of the parallel-wave execution
  environment on a resource-constrained machine, not a defect in the plan's code changes.

## Known Stubs

None.

## Threat Flags

None — `T-02-05` and `T-02-06` from the plan's own threat register are the mitigations this plan
implements, not new surface. No new network endpoints, auth paths, or schema changes were
introduced.

## Next Phase Readiness

- `scripts/serve-static.mjs` is now safe against path-traversal reads and has real test coverage;
  no follow-up work required for FT-02.
- The `visual` project's webServer contract (`node scripts/serve-static.mjs <root> <port>`) is
  byte-for-byte unchanged, so no other plan's Playwright config needs adjustment.
- `.claude/settings.local.json` fails `pnpm format:check` — untracked, harness-managed, unrelated
  to this plan's 3 files; logged in `deferred-items.md`, not fixed (out of scope).

## Self-Check: PASSED

- FOUND: scripts/serve-static.mjs
- FOUND: scripts/serve-static.unit.test.mjs
- FOUND: vitest.config.ts
- FOUND: .planning/phases/02-board-management/02-02-SUMMARY.md
- FOUND commit: 01a84da (test)
- FOUND commit: 0a7620b (feat)
- FOUND commit: aa1a38b (feat)

---
*Phase: 02-board-management*
*Completed: 2026-08-20*
