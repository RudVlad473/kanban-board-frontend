---
phase: quick-260907-exb
plan: 01
subsystem: ui
tags: [react, nextjs, tanstack-query, optimistic-ui, e2e, playwright]

requires:
  - phase: quick-260905-tz5
    provides: "The task-create subtask fan-out's optimistic-staging shape (onMutate placeholder rows, clientIds on mutation variables, useUnconfirmedIds plural read), the precedent this plan's fix mirrors for the second (and last) fan-out case."
provides:
  - "BOARD-02's columns fan-out no longer stalls the whole board-create navigation — router.push() commits independently of when the fan-out settles."
  - "Typed columns paint under client-generated ids the instant the new board mounts, reconciled/rolled back/retried per docs/adr/tech/0030, sharing MUTATION_KEY.CREATE_COLUMN's isUnconfirmed guards and colour picker with the single-column create."
  - "A one-shot module-registry handoff pattern (pending-column-fan-out.ts) for passing data across a navigation boundary between two components with no ancestor/descendant relationship."
affects: [board-create, board-view, e2e-suite, optimistic-writes]

actuals:
  tokens: 17833
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Mount-time fan-out trigger: a Server Action fired concurrently with router.push() shares Next's pending-transition commit and stalls the whole navigate until it settles — defer the fan-out to the destination component's OWN mount effect instead of firing it from the create flow."
    - "One-shot module-scope Map registry for a same-tick-unsafe handoff between two components with no ancestor/descendant relationship (claim/take, destructive read)."

key-files:
  created:
    - src/features/boards/pending-column-fan-out.ts
    - src/features/boards/hooks/use-create-board-columns.ts
    - src/features/boards/hooks/use-run-pending-column-fan-out.ts
  modified:
    - src/features/boards/hooks/use-create-board.ts
    - src/components/layout/board-view/board-view.tsx
    - src/features/boards/model.ts
    - src/features/boards/column-palette.ts
    - e2e/boards-create.e2e.spec.ts

key-decisions:
  - "Redirected scope mid-execution, on the coordinator's explicit authorization, after Task 1's live measurement showed the plan's original diagnosis (columns simply arrive late) was wrong: the whole navigation stalls until the fan-out settles, which is a worse and different bug than the plan's must-haves assumed."
  - "Reused MUTATION_KEY.CREATE_COLUMN for the fan-out (not a new key) — reaches board-view.tsx's isUnconfirmed guard and use-open-board-columns.ts's add-task gate with zero call-site changes, at the cost of widening toInFlightColumns to a union type."
  - "Colours for the fan-out's placeholders are picked ONCE in use-create-board-columns.ts's createColumns(), before mutateAsync is called, and carried on the mutation variables (colors: []) so toInFlightColumns can read the SAME hexes a concurrent single-column create needs to avoid colliding with."

requirements-completed: [QT-EXB-01, QT-EXB-02, QT-EXB-03]

coverage:
  - id: D1
    description: "Board navigation commits fast regardless of the columns fan-out's own timing (no re-coupling to router.push's pending transition)."
    verification:
      - kind: e2e
        ref: "e2e/boards-create.e2e.spec.ts#BOARD-02: create a board — optimistic columns > navigates fast and paints the typed columns immediately, while the fan-out is still held"
        status: pass
    human_judgment: false
  - id: D2
    description: "Typed columns stage under client-generated ids the instant the board mounts, reconcile to server ids on success, roll back on wholesale failure, and a retry owns no placeholders."
    verification:
      - kind: integration
        ref: "src/components/layout/board-view/board-view.test.tsx#stages the typed columns under client-generated ids while the fan-out is held"
        status: pass
      - kind: integration
        ref: "src/components/layout/board-view/board-view.test.tsx#reconciles every staged column with the server's real id once the fan-out fully lands"
        status: pass
      - kind: integration
        ref: "src/components/layout/board-view/board-view.test.tsx#keeps exactly what landed on a partial failure, never a stale placeholder beside a real one"
        status: pass
      - kind: integration
        ref: "src/components/layout/board-view/board-view.test.tsx#retires every placeholder and reports all three when the fan-out fails wholesale"
        status: pass
      - kind: integration
        ref: "src/components/layout/board-view/board-view.test.tsx#a retry owns no placeholders of its own — it appends only what lands"
        status: pass
    human_judgment: false
  - id: D3
    description: "No ADR-0029-superseded machinery reintroduced (override store, staleness guard, override-retired-by-reference-equality)."
    verification:
      - kind: other
        ref: "rg -n -e 'useOptimistic' -e 'optimistic-mutation' src/features/boards src/components/layout src/lib/client — 0 hits"
        status: pass
    human_judgment: false

duration: ~5h (including the mid-execution investigation and redirect)
completed: 2026-09-07
status: complete
---

# Quick Task 260907-exb: Fix the board-create column fan-out (redirected scope) Summary

**Decoupled BOARD-02's column fan-out from `router.push()`'s own transition — it was stalling the WHOLE
board-create navigation, not just leaving the columns blank — then re-applied optimistic column
staging on top, now meaningful because `BoardView` is mounted and watching before the fan-out settles.**

## Performance

- **Duration:** ~5h (majority spent on Task 1's live-browser investigation into why the plan's
  original test design was structurally unsatisfiable)
- **Tasks:** 3 (redirected mid-flight per coordinator instruction; see Deviations)
- **Files modified:** 14 (3 created, 11 modified)
- **Commits:** 3

## Accomplishments

- Measured, in the real browser against the real nonprod backend, that firing the columns fan-out's
  Server Action concurrently with `router.push()` (both dispatched in `createBoard()`'s own
  synchronous continuation) makes Next.js hold the WHOLE pending navigation open until the fan-out
  (and the `router.refresh()` chained after it) also settles — no URL change, no skeleton, nothing
  paints. This reproduces with or without an artificial hold; an unheld run showed the exact same
  ordering compressed into well under a second.
- Fixed it by moving the fan-out's dispatch out of the create flow entirely, into `BoardView`'s own
  mount effect (`useRunPendingColumnFanOut`), handed off via a one-shot module registry
  (`pending-column-fan-out.ts`) rather than fired synchronously alongside the navigate.
- Re-applied BOARD-02's optimistic column staging (`use-create-board-columns.ts`) on top of that fix
  — staged under client-generated ids, reconciled to server ids on success, rolled back on wholesale
  failure, retried owning no placeholders — mirroring `use-create-task.ts`'s existing fan-out shape
  and ADR tech/0030 throughout.
- Widened `toInFlightColumns`/`MUTATION_KEY.CREATE_COLUMN` reuse so the fan-out's placeholders get
  the same `isUnconfirmed` guard and colour-collision avoidance the single-column create already has,
  with zero changes to the consuming components.
- Rewrote the e2e case around the newly-measured mechanism, falsified in both directions, and moved/
  added browser-level coverage for the mount-time trigger's full behavioral surface.

## Task Commits

1. **Core fix: decouple the fan-out from the navigate, restage optimistically** - `9ee9d44` (fix)
2. **Browser/unit test coverage for the mount-time fan-out and widened picker** - `23671c5` (test)
3. **e2e case rewrite around the measured navigation-stall mechanism** - `6717037` (test)

**Plan metadata:** _pending — this SUMMARY / STATE.md / ROADMAP.md commit, made by the orchestrator per this project's `commit_docs` convention._

## Files Created/Modified

- `src/features/boards/pending-column-fan-out.ts` - **created.** One-shot module-scope Map handoff
  (`claimPendingColumnFanOut`/`takePendingColumnFanOut`, destructive read) between `createBoard()`
  and `BoardView`'s mount effect — no shared ancestor, so a Context/prop was not an option.
- `src/features/boards/hooks/use-create-board-columns.ts` - **created.** The column fan-out's own
  mutation (`onMutate`/`onError`/`onSuccess`), `createColumns`, `retryColumns`,
  `raiseColumnFailureToast` — extracted from `use-create-board.ts` so both the create flow (retry
  path) and the mount-time trigger can use it independently.
- `src/features/boards/hooks/use-run-pending-column-fan-out.ts` - **created.** The mount-time trigger:
  takes the claim, runs `createColumns`, calls `router.refresh()` and raises the failure toast on
  settle. A `useRef` guard makes it a true one-shot per mount; the registry's destructive read makes
  a Strict-Mode double-invoke harmless regardless.
- `src/features/boards/hooks/use-create-board.ts` - `createBoard()` no longer calls the column phase;
  it claims it via `claimPendingColumnFanOut` and returns immediately after `router.push()`.
- `src/components/layout/board-view/board-view.tsx` - wires `useRunPendingColumnFanOut({ boardId })`.
- `src/features/boards/model.ts` - `InFlightColumnCreate`/`toInFlightColumns` widened to a union
  accepting either a single `clientId`/`color` or a plural `clientIds`/`colors` fan-out shape.
- `src/features/boards/column-palette.ts` - new `pickColorsForNewColumns`, threading
  `pickNextColumnColor` across a batch the same way the server action's own `createdSoFar`
  accumulator does.
- `e2e/boards-create.e2e.spec.ts` - new `BOARD-02: create a board — optimistic columns` case;
  original BOARD-02 case fixed to wait for the fan-out's own response before reading the backend
  (a real race the decoupling introduced — see Deviations).
- `src/components/layout/board-view/board-view.test.tsx` - six new cases covering stage/reconcile/
  partial-failure/wholesale-failure/retry/refresh, plus the toast auto-dismiss and narrows-on-retry
  cases moved here from `board-list.test.tsx`.
- `src/components/layout/board-view/board-view.stories.tsx` - adds `nextjs.appDirectory` (mirrors
  `board-list.stories.tsx`) — required once `useRunPendingColumnFanOut` calls `useRouter()`.
- `src/features/boards/components/board-list/board-list.test.tsx` - three tests that assumed the
  column phase runs synchronously through `BoardList` alone (no longer true) replaced with one
  asserting the phase is claimed but never run, and nothing refreshes, from here.
- `src/features/boards/model.unit.test.ts`, `src/features/boards/column-palette.unit.test.ts` - unit
  coverage for the widened `toInFlightColumns` union and the new `pickColorsForNewColumns`.
- `e2e/quality-baseline.json` - new axe/layout-shift baseline entry for the rewritten e2e case,
  recorded via `pnpm e2e:baseline`, 3/3 clean.

## Decisions Made

- **Redirected scope mid-execution**, on the coordinator's explicit authorization (see Deviations
  below for the full investigation that produced it). The original plan's Task 2/3 file scope
  (`use-create-board.ts` alone) was insufficient once Task 1's live measurement showed the real
  defect — this is documented as a deviation, not silently absorbed.
- **Reused `MUTATION_KEY.CREATE_COLUMN`** for the fan-out rather than a new key — the plan's own
  interface_context flagged this as the two live options, and reuse cost (widening
  `toInFlightColumns`) was smaller than the alternative cost (every `useUnconfirmedIds` consumer
  reading two keys).
- **Colours picked once, in `createColumns()`, before `mutateAsync`** — not inside `onMutate` — so a
  concurrent single-column create's own `toInFlightColumns` read (which happens before the fan-out's
  `onMutate` has necessarily run, since variables are visible to the mutation cache immediately) sees
  the exact hexes the fan-out is about to stage.

## Deviations from Plan

### Architectural redirect (Rule 4 — reported and approved, not auto-applied)

**Task 1's live-browser measurement invalidated the plan's own diagnosis and test strategy.**

- **Found during:** Task 1 (falsify the bug in the real browser).
- **What was found:** The plan assumed the bug was "columns arrive late — RSC hydration or the
  switch-triggered invalidate erases an already-visible optimistic write." Nine-plus live runs
  against the real nonprod backend (with and without artificial holds, with response-timestamp
  logging, with raw `window.location.pathname` polling to rule out a Playwright/CDP artifact) showed
  instead: firing the columns fan-out's Server Action concurrently with `router.push()` — both
  dispatched in `createBoard()`'s own synchronous continuation — makes Next.js hold the WHOLE pending
  navigation open until the fan-out (and its own trailing `router.refresh()`) also settles. Nothing
  renders — not the URL, not the skeleton, not a column — until then. This reproduces identically
  whether the fan-out is artificially held or not (an unheld run showed the same ordering, compressed
  to under a second), and deferring the fan-out's dispatch by 2000ms let the navigate commit in
  ~300ms on its own, confirming the mechanism is about *concurrent dispatch*, not fan-out duration.
  This means the plan's e2e test strategy (hold the network request, assert DOM state while held)
  could never observe the intended "columns visible while genuinely in flight" state — that state is
  unreachable by construction against the unfixed code, since nothing paints until the fan-out settles.
- **Why this is Rule 4, not Rule 1-3:** the fix the plan's Task 2 scoped (add `onMutate` staging to
  `createColumns`) cannot by itself make anything appear sooner, because no component is mounted to
  read the staged cache entry until the transition commits — and the transition doesn't commit until
  the fan-out settles regardless of staging. A structurally different fix (move the fan-out's trigger
  point) was required, touching a file (`board-view.tsx`) outside the plan's stated Task 2 scope.
- **Action:** halted after Task 1, reverted the workspace to clean, and returned a `checkpoint:decision`
  to the coordinator with the full measurement, the reasoning above, and three options (decouple the
  dispatch; reframe the bug's scope; investigate further). The coordinator authorized Option 1 —
  decouple via a mount-time trigger, then re-apply staging on top — with explicit approval that this
  is a bigger structural change than the original file scope implied.
- **Files affected:** the entire redirected scope (see Files Created/Modified above).
- **Verification:** falsified in both directions per the redirected design (see below); full gate
  suite green; CI to confirm.
- **Committed in:** `9ee9d44`, `23671c5`, `6717037`.

### Auto-fixed Issues

**1. [Rule 1 - Bug] The original BOARD-02 e2e case raced the now-decoupled fan-out**

- **Found during:** the first `pnpm exec playwright test --project=e2e --workers=2 --repeat-each=3`
  contention run after the fix landed.
- **Issue:** the pre-existing `"creates a board with its named columns..."` case read the backend
  (`readBoardFull`) immediately after the URL moved to the new board — an assumption that held only
  because, pre-fix, the navigate itself was gated on the fan-out completing. Once decoupled, the
  navigate can genuinely land before the fan-out's own POST has reached the backend, and the backend
  read raced it (observed: `[]` columns instead of `["Todo", "Doing"]` in 1 of 3 contention runs).
- **Fix:** armed a `page.waitForResponse` for the fan-out's own POST before submit (mirroring the new
  case's own pattern) and awaited it before reading the backend.
- **Files modified:** `e2e/boards-create.e2e.spec.ts`.
- **Verification:** 6/6 at `--workers=2 --repeat-each=3` after the fix, where it had been 5/6 before.
- **Committed in:** `6717037`.

**2. [Rule 3 - Blocking] `board-view.stories.tsx` had no App Router context for the new `useRouter()` call**

- **Found during:** the first full `pnpm exec vitest run` across all four projects after the core fix.
- **Issue:** `useRunPendingColumnFanOut` calls `useRouter()`; the `storybook` project's own render
  pipeline for `board-view.stories.tsx` threw `invariant expected app router to be mounted` on every
  story, since the meta's `parameters` carried no `nextjs.appDirectory` flag (unlike
  `board-list.stories.tsx`, whose hooks already needed it).
- **Fix:** added `nextjs: { appDirectory: true }` to the meta's `parameters`, mirroring
  `board-list.stories.tsx` exactly.
- **Files modified:** `src/components/layout/board-view/board-view.stories.tsx`.
- **Verification:** `pnpm exec vitest run --project storybook src/components/layout/board-view/board-view.stories.tsx` — 27/27.
- **Committed in:** `23671c5`.

**3. [Rule 1 - Bug] `pending-column-fan-out.ts` missing a required `Covered by:` pointer**

- **Found during:** `pnpm verify`'s `coverage:check` gate.
- **Issue:** the new module has no co-located direct test and no header pointer naming the file(s)
  that cover it, which `coverage:check` requires.
- **Fix:** added `// Covered by: board-view.test.tsx, board-list.test.tsx`.
- **Files modified:** `src/features/boards/pending-column-fan-out.ts`.
- **Verification:** `node scripts/check-coverage-pointers.mjs` passes.
- **Committed in:** `9ee9d44`.

**4. [Rule 1 - Bug] e2e timing budget too tight under full-suite local contention**

- **Found during:** a `pnpm verify` run immediately following the full unit/browser/storybook suite —
  the new e2e case's `NAVIGATE_TIMEOUT_MS` (2500ms) was exceeded once (columns took longer than
  2500ms to appear, though the mechanism itself was unaffected — a re-run alone passed cleanly).
- **Fix:** raised `NAVIGATE_TIMEOUT_MS` 2500ms → 4000ms and `COLUMN_FAN_OUT_HOLD_MS` 4000ms → 6000ms,
  keeping the same ~2x margin between them so RED still fails deterministically (a re-coupled
  navigate cannot land in 4000ms regardless — confirmed by re-running the RED check at the new
  values) while GREEN gets more headroom against local resource contention (natural navigate+paint
  measured at ~300-900ms in isolation).
- **Files modified:** `e2e/boards-create.e2e.spec.ts`.
- **Verification:** RED re-confirmed at the new values; GREEN 6/6 at `--workers=2 --repeat-each=3`.
- **Committed in:** `6717037`.

---

**Total deviations:** 1 architectural redirect (Rule 4, coordinator-approved) + 4 auto-fixed
(2 Rule 1 bugs from the redirect's own ripple effects, 1 Rule 3 blocking, 1 Rule 1 timing).
**Impact on plan:** substantial — the redirect changed which files were in scope and why, but stayed
entirely within ADR tech/0030's terms throughout (verified: zero `useOptimistic`/`optimistic-mutation`
hits in the affected rings). No scope creep beyond what the redirect required.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary schema changes. The mount-time trigger
reads a module-scope registry populated only by this same client session's own prior action; it
introduces no new attack surface.

## Issues Encountered

- **Local `pnpm verify` did not complete clean in a single run**, twice, on two SEPARATE, unrelated
  pre-existing flakes — each independently confirmed as reproducible in isolation and NOT caused by
  this work:
  1. `optimistic-guards.e2e.spec.ts`'s `"board: a middle click on the unconfirmed row opens nothing
     either"` failed once on a `color-contrast` axe finding not in its baseline — this is the exact
     flake this repo's own git history already tracked and re-recorded before this session
     (`5b8b4fc fix(04-25): re-record optimistic-guards' flaky color-contrast finding`). Re-run alone,
     3/3 clean.
  2. `boards-detail.e2e.spec.ts`'s `"board switch: paints a previously visited board..."` failed once
     on the sign-in itself redirecting to `/login` instead of a board — consistent with this
     project's documented nonprod account-eviction-under-contention flake (CLAUDE.md: "a 401 from a
     seed helper there may be account eviction mid-session, not a code defect"). Re-run alone, clean.
- **The pre-push hook's own full `pnpm verify` run (20 steps, including the full e2e project,
  80/80) passed clean** on the push that landed `6717037` — so the two flakes above were local-only
  noise from running the ad-hoc verification loop repeatedly back-to-back, not something that
  recurred at push time.
- **CI's first run (34115922800) also hit ONE unrelated pre-existing flake**, isolated to the
  `quality` job: `board-view.test.tsx`'s `"BoardView (MOBILE) > leaves the column row where it was
  when the create fails"` — a scroll-position assertion whose OWN comment already documents this
  exact CI-only race, dated 2026-09-05, predating this task entirely ("asserted 0 locally and 2 on
  CI, twice in four runs against identical component code"). Not a test this task touched, and
  unrelated to the fan-out/navigate mechanism. `gh run rerun --failed` reran only the failed
  `quality` job; it, and every other job, passed clean on the rerun.
- **Final state: CI run 34115922800 is fully green** — `quality`, `secrets`, `visual`, `e2e` all
  `success`. https://github.com/RudVlad473/kanban-board-frontend/actions/runs/34115922800

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The fix is complete, covered at the unit, browser, and e2e layers, pushed, and CI-green on all
  four jobs. Nothing is deferred.
- The redirected scope's investigation (Task 1's full measurement chain) is preserved in this
  SUMMARY's Deviations section rather than in a separate document, since no other artifact needed it.

---
*Phase: quick-260907-exb*
*Completed: 2026-09-07*

## Self-Check: PASSED

All created files verified present on disk; all three task commits (`9ee9d44`, `23671c5`, `6717037`) verified present in git history.
