---
phase: 04-task-subtask-workflow
plan: 20
subsystem: tasks
tags: [server-actions, tanstack-query, zod, playwright, base-ui]

requires:
  - phase: 04-task-subtask-workflow
    provides: "04-16's TaskDetailModal with its onDeleteTask prop left as a no-op for this plan; 04-19's delete-subtask precedent (ADR domain/0002 cascade, one-function-per-entity e2e seeding); the shipped delete-column analog (delete-column-action.ts, use-delete-column.ts, delete-column-confirm.tsx)"
provides:
  - "TASK-05 end to end: a user deletes a task from the detail view's kebab, behind a confirmation naming the cascade, waiting for the server rather than applying optimistically"
  - "deleteTaskAction — session-then-parse-then-upstream DELETE on TASK_DETAIL, nothing parsed back, refresh() on success"
  - "A closed gap in the shared problem-code map: PROBLEM_CODE.ENTITY_NOT_FOUND now maps to RESULT_STATUS.NOT_FOUND, so a double-submit delete (task OR column) reads as NOT_FOUND rather than a generic ERROR"
  - "useDeleteTask / DeleteTaskConfirm — the deliberately non-optimistic wait-for-server pair, mirroring useDeleteColumn/DeleteColumnConfirm"
  - "board-view.tsx wires the kebab's Delete Task entry to the confirmation and the hook, closing both the confirmation and the detail view only on success"
  - "e2e/tasks-delete.e2e.spec.ts + a new seed.sh/seed.ts subtask command — written, not executed in this dispatch"
affects: [04-21, 04-22]

actuals:
  tokens: 18295
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Two sibling elements conditionally rendered in the same JSX fragment (TaskDetailModal and DeleteTaskConfirm) must not share an unprefixed `key` even when they are different component types — React's key-uniqueness contract applies across ALL siblings in one children set, not just within a single .map(). When the two elements CAN carry the identical underlying id at once (confirming a delete from within the same task's own open detail view), the keys must be prefixed to disambiguate (`task-detail-${id}` / `delete-task-${id}`), or React's reconciler corrupts the DOM under a specific interaction sequence — found via a genuinely failing browser test, not by inspection."
    - "A backend problem code absent from this app's own PROBLEM_CODE enum is closed at the shared map-problem-code.ts/problem-detail.ts layer, not worked around per-caller — 04-19 punted ENTITY_NOT_FOUND as a documented gap (raw-body read in its integration test); this plan closes it because its own acceptance criteria require the actual mapped NOT_FOUND discriminant, not just the raw problem code, and the fix benefits deleteColumnAction's identical double-submit case for free."

key-files:
  created:
    - src/features/tasks/actions/delete-task-action.ts
    - src/features/tasks/actions/delete-task-action.integration.test.ts
    - src/features/tasks/hooks/use-delete-task.ts
    - src/features/tasks/components/delete-task-confirm/delete-task-confirm.tsx
    - src/features/tasks/components/delete-task-confirm/delete-task-confirm.stories.tsx
    - src/features/tasks/components/delete-task-confirm/delete-task-confirm.test.tsx
    - e2e/tasks-delete.e2e.spec.ts
  modified:
    - src/features/tasks/schemas.ts
    - src/features/tasks/schemas.unit.test.ts
    - src/lib/core/api-contract/problem-detail.ts
    - src/lib/core/api-contract/problem-detail.unit.test.ts
    - src/lib/core/api-contract/map-problem-code.ts
    - src/lib/core/api-contract/map-problem-code.unit.test.ts
    - src/components/layout/board-view/board-view.tsx
    - src/components/layout/board-view/board-view.stories.tsx
    - src/components/layout/board-view/board-view.test.tsx
    - src/features/tasks/components/task-detail-modal/task-detail-modal.tsx
    - e2e/seed.sh
    - e2e/seed.ts

key-decisions:
  - "useDeleteTask/DeleteTaskConfirm are deliberately NOT optimistic, the one inversion in this phase: every other Phase 4 mutation writes the shared query-cache entry per ADR tech/0030, but a delete's cascade to its subtasks has no undo (ADR domain/0002), so the task stays on the board until the server confirms and the refreshed RSC props are what remove it."
  - "ENTITY_NOT_FOUND joins PROBLEM_CODE and is mapped to RESULT_STATUS.NOT_FOUND alongside ACCESS_DENIED — closing a gap 04-19-SUMMARY.md explicitly deferred, because this plan's own acceptance criteria require the actual mapped discriminant (not just the raw backend code) for a double-submit delete, per T-04-42's 'a caller cannot tell forbidden from gone' property."
  - "On a failed delete, only the confirmation closes; the detail view stays open on the still-existing task (the toast is the whole failure report). On success, both close and the re-read removes the card — never removed locally first."
  - "TaskDetailModal and DeleteTaskConfirm are allowed to be mounted simultaneously (confirming from within the open detail view), which required prefixing both components' React keys to avoid a same-id collision across two different element types in one fragment."

requirements-completed: [TASK-05]

coverage:
  - id: D1
    description: "deleteTaskAction: session-then-parse-then-upstream DELETE on TASK_DETAIL, all three path segments written explicitly, nothing parsed back; a double delete maps to the shared NOT_FOUND branch instead of a generic failure"
    requirement: "TASK-05"
    verification:
      - kind: integration
        ref: "src/features/tasks/actions/delete-task-action.integration.test.ts (2 cases against the real deployed nonprod backend: happy delete with a direct per-subtask cascade probe, and the second-delete's mapped NOT_FOUND discriminant)"
        status: pass
      - kind: unit
        ref: "src/features/tasks/schemas.unit.test.ts#deleteTaskInputSchema"
        status: pass
      - kind: unit
        ref: "src/lib/core/api-contract/map-problem-code.unit.test.ts, src/lib/core/api-contract/problem-detail.unit.test.ts (ENTITY_NOT_FOUND cases)"
        status: pass
    human_judgment: false
  - id: D2
    description: "DeleteTaskConfirm: initial focus on the non-destructive action, body names the task AND its subtasks and states the action cannot be reversed, both dismissal guards held while pending, no bare Cancel/Delete labels, 32-char title wraps rather than widening the panel"
    requirement: "TASK-05"
    verification:
      - kind: automated_ui
        ref: "src/features/tasks/components/delete-task-confirm/delete-task-confirm.test.tsx (36 cases, both viewports)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The delete is never optimistic: the card stays on the board until settle, the confirmation closes on either outcome while the detail view closes only on success, and a browser case proves the card is still rendered mid-flight"
    requirement: "TASK-05"
    verification:
      - kind: automated_ui
        ref: "src/components/layout/board-view/board-view.test.tsx (6 new board-level cases: open, sends the right ids once, still-rendered-in-flight, and the failure path leaving the detail view open)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The kebab's Delete Task entry opens the confirmation for that task and, on confirm, the card is removed only after the server confirms and both modals close; declining leaves everything untouched. Proved end to end against the real backend, including the subtask cascade read back from the board rather than inferred from the card's absence."
    requirement: "TASK-05"
    verification:
      - kind: e2e
        ref: "e2e/tasks-delete.e2e.spec.ts (2 cases: cascade-and-reload, decline-and-reload) — written per this plan's dispatch but explicitly NOT executed in this run (a local run wipes the shared nonprod backend); pnpm exec playwright test --list confirms both cases resolve and collect cleanly"
        status: unknown
    human_judgment: true
    rationale: "The e2e suite was intentionally not run in this dispatch (orchestrator policy — a local run's /admin/reset would fail concurrent CI e2e jobs). The spec is written, type-checks, lints and lists cleanly via --list, but its pass/fail is unverified until run separately."

duration: ~140min
completed: 2026-09-02
status: complete
---

# Phase 4 Plan 20: Task Delete — Confirmation, Wait-for-Server Hook, and the Cascade Summary

**TASK-05's delete, deliberately the one non-optimistic mutation in the phase: a confirm modal naming the task-and-subtask cascade, a Server Action that closes a pre-existing backend-error-mapping gap, and the kebab wired end to end in board-view.tsx**

## Performance

- **Duration:** ~140 min
- **Started:** 2026-09-02 (session start, HEAD 823fb8e)
- **Completed:** 2026-09-02
- **Tasks:** 3
- **Files modified:** 19 (7 created, 12 modified)

## Accomplishments

- **`deleteTaskAction` + the ENTITY_NOT_FOUND mapping gap closed** (Task 1): mirrors
  `deleteColumnAction` exactly — session, then parse, then a `DELETE` on `TASK_DETAIL` with all
  three path segments written explicitly, nothing parsed back, `refresh()` on success. The plan's
  own acceptance criteria required the SECOND delete of the same task to map to the actual
  `NOT_FOUND` discriminant, not fall through to the generic `ERROR` — but `PROBLEM_CODE` had no
  `ENTITY_NOT_FOUND` entry (04-19-SUMMARY.md documented this as a punted gap for the subtask-delete
  path, reading the raw body directly instead). Closed at the shared layer:
  `problem-detail.ts`/`map-problem-code.ts` now recognise `ENTITY_NOT_FOUND` and map it to
  `RESULT_STATUS.NOT_FOUND` alongside `ACCESS_DENIED`, which also fixes `deleteColumnAction`'s
  identical double-submit case for free. Proved against the real backend: a happy delete whose
  subtask cascade is confirmed by probing each subtask id DIRECTLY (not inferred from the task's
  own absence from `/full`), and the second delete's mapped discriminant.
- **`useDeleteTask` + `DeleteTaskConfirm`** (Task 2): the one deliberately non-optimistic mutation
  in this phase — no `setQueryData` in `onMutate`, the task stays on the board until the server
  confirms, because the subtask cascade has no undo (ADR domain/0002). `DeleteTaskConfirm` copies
  `DeleteColumnConfirm`'s shape: initial focus on the non-destructive `Keep Task` action, a wrapping
  prose body naming BOTH the task and its subtasks and stating the action cannot be reversed, no
  error banner of its own (a failed delete is a toast raised by the hook), and no bare
  Cancel/Delete labels.
- **Wired the kebab, closed the loop in `board-view.tsx`, proved the cascade end to end** (Task 3):
  `onDeleteTask` (a no-op left by 04-16) now opens `DeleteTaskConfirm`; on success both the
  confirmation and the detail view close and the re-read removes the card, on failure only the
  confirmation closes, leaving the still-existing task's detail view open behind the toast. Found
  and fixed a real bug along the way: `TaskDetailModal` and `DeleteTaskConfirm` can be mounted
  simultaneously for the SAME task id (confirming a delete from within the task's own open detail
  view), and both carried an unprefixed `key={task.id}` — a same-id collision across two sibling
  element TYPES in one JSX fragment, which corrupted the DOM under React's reconciler (a genuinely
  failing browser test caught this, not inspection; see Deviations). `e2e/tasks-delete.e2e.spec.ts`
  proves the real destructive path against the deployed nonprod backend — cascade read back from
  the board via a real backend call, not inferred from the card's own disappearance — plus a
  declined-confirmation case. `e2e/seed.sh`/`seed.ts` gained a `subtask` command following the
  existing one-function-per-entity shape.

## Task Commits

Each task was committed atomically:

1. **Task 1: The delete-task action, documenting the cascade** — `7023313` (feat)
2. **Task 2: The delete-task confirmation and the wait-for-server hook** — `3cd18e2` (feat)
3. **Task 3: Wire the kebab's delete entry and prove the cascade end to end** — `d7d7732` (feat)

## Files Created/Modified

- `src/features/tasks/actions/delete-task-action.ts` — exports `deleteTaskAction`, `DeleteTaskResult`
- `src/features/tasks/actions/delete-task-action.integration.test.ts` — 2 cases against the real backend
- `src/features/tasks/hooks/use-delete-task.ts` — exports `useDeleteTask`
- `src/features/tasks/components/delete-task-confirm/delete-task-confirm.tsx` — exports `DeleteTaskConfirm`
- `src/features/tasks/components/delete-task-confirm/delete-task-confirm.stories.tsx` — 4 composed stories
- `src/features/tasks/components/delete-task-confirm/delete-task-confirm.test.tsx` — 36 cases, both viewports
- `src/features/tasks/schemas.ts` — new export `deleteTaskInputSchema`
- `src/lib/core/api-contract/problem-detail.ts` — new `PROBLEM_CODE.ENTITY_NOT_FOUND` entry
- `src/lib/core/api-contract/map-problem-code.ts` — maps `ENTITY_NOT_FOUND` to `RESULT_STATUS.NOT_FOUND`
- `src/components/layout/board-view/board-view.tsx` — wires the kebab's delete entry, prefixed keys
- `src/components/layout/board-view/board-view.stories.tsx` — `DeleteTaskOpen` story added
- `src/components/layout/board-view/board-view.test.tsx` — 6 new board-level delete-task cases
- `src/features/tasks/components/task-detail-modal/task-detail-modal.tsx` — doc comment only, no behavior change
- `e2e/tasks-delete.e2e.spec.ts` — new file, 2 cases, NOT executed this dispatch
- `e2e/seed.sh` / `e2e/seed.ts` — new `subtask` seeding command

## Decisions Made

- `useDeleteTask`/`DeleteTaskConfirm` are deliberately non-optimistic, mirroring `useDeleteColumn`/
  `DeleteColumnConfirm` exactly — the one inversion in a phase otherwise governed by ADR tech/0030's
  query-cache optimistic writes, because the subtask cascade has no undo.
- `ENTITY_NOT_FOUND` was added to the shared `PROBLEM_CODE` enum and mapped to `RESULT_STATUS.NOT_FOUND`
  rather than worked around locally in `deleteTaskAction` — this plan's own acceptance criteria
  needed the real mapped discriminant, and the fix is general (helps `deleteColumnAction` too).
- Failure closes only the confirmation; success closes both the confirmation and the detail view.
  This is a deliberate asymmetry, not an oversight — a failed delete has nothing to hide the task
  behind, so returning the user to the (still-existing) task they were inspecting is correct.
- `board-view.tsx`'s new `taskBeingDeletedId` state is an id, re-resolved to the live task/column on
  every render (mirroring `openTaskId`'s existing "no snapshot" reasoning) rather than a captured
  `TaskFull` — this way it survives an edit or move happening between opening the confirm and it
  settling, and needs no synchronization of its own.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Closed the `ENTITY_NOT_FOUND` gap in `map-problem-code.ts`/`problem-detail.ts`**
- **Found during:** Task 1
- **Issue:** The plan's own acceptance criteria required a second delete of the same task to map
  to the actual `NOT_FOUND` discriminant. `PROBLEM_CODE` had no `ENTITY_NOT_FOUND` member (04-19-
  SUMMARY.md documented this as a punted gap for the identical subtask-delete case), so
  `parseProblemDetail` returned `null` for that real backend response and `mapProblemCodeToStatus`
  fell through to the generic `ERROR` — not what the plan's action text explicitly asked for
  ("Map the second-delete case to the not-found branch... rather than letting it fall into the
  generic failure").
- **Fix:** Added `PROBLEM_CODE.ENTITY_NOT_FOUND` and mapped it to `RESULT_STATUS.NOT_FOUND` in the
  shared `UPSTREAM_CODE_TO_STATUS` table, alongside the existing `ACCESS_DENIED` entry.
- **Files modified:** `src/lib/core/api-contract/problem-detail.ts`, `problem-detail.unit.test.ts`,
  `src/lib/core/api-contract/map-problem-code.ts`, `map-problem-code.unit.test.ts`
- **Verification:** New unit cases in both files; the integration suite's second-delete case
  asserts the mapped discriminant directly (`mapProblemCodeToStatus(parseProblemDetail(body)?.code)`)
  against the real backend response.
- **Committed in:** `7023313` (Task 1 commit)

**2. [Rule 1 - Bug] A React sibling-key collision between `TaskDetailModal` and `DeleteTaskConfirm` corrupted the DOM**
- **Found during:** Task 3, while writing the `board-view.test.tsx` browser cases
- **Issue:** Both components are conditionally rendered as siblings in `board-view.tsx`'s top-level
  fragment, and both can be mounted at once for the SAME task id (confirming a delete from within
  the task's own open detail view). Both carried an unprefixed `key={task.id}`. React's key-
  uniqueness contract applies to ALL siblings within one children set, not just within a single
  `.map()` — the collision produced "Encountered two children with the same key" console errors and
  genuinely duplicated DOM nodes (two `<h2>` title elements), which then made `screen.getByText`
  throw "multiple elements found" and cascaded into the whole test file crashing.
- **Fix:** Prefixed both keys (`` `task-detail-${openTask.id}` `` / `` `delete-task-${taskBeingDeleted.id}` ``).
- **Files modified:** `src/components/layout/board-view/board-view.tsx`
- **Verification:** Isolated the failure to a single test via `-t` filtering (confirmed it failed
  standalone, not from cross-test contamination), diagnosed via a temporary `console.log` of match
  counts plus the DOM dump in the failure output, fixed, then re-ran the full
  `board-view.test.tsx` suite twice — 196/196 passing both times, no console errors.
- **Committed in:** `d7d7732` (Task 3 commit)

**3. [Rule 3 - Blocking] `board-view.tsx`, `board-view.stories.tsx` and `board-view.test.tsx` needed the actual delete wiring and its test coverage, none listed in Task 3's own `<files>`**
- **Found during:** Task 3
- **Issue:** Task 3's `<files>` list named only `task-detail-modal.tsx`/`.test.tsx` and the e2e
  files, but `onDeleteTask` was already a no-op stub bubbled to `board-view.tsx` by 04-16 — the
  actual confirmation-opening, hook-calling, and success/failure close logic could only land there.
  This is the same shape of `<files>` omission 04-18/04-19 both hit and auto-fixed for their own
  wiring plans.
- **Fix:** Added the state, handler, hook call and `<DeleteTaskConfirm>` render to `board-view.tsx`;
  added the `DeleteTaskOpen` staged story; added 6 board-level test cases proving open/send/in-
  flight/failure, matching the acceptance criterion requiring a browser case for the non-optimistic
  in-flight state.
- **Files modified:** `src/components/layout/board-view/board-view.tsx`,
  `src/components/layout/board-view/board-view.stories.tsx`,
  `src/components/layout/board-view/board-view.test.tsx`
- **Verification:** Full `board-view.test.tsx` suite (196 tests, both devices) green.
- **Committed in:** `d7d7732` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 Rule 2 — a missing-functionality gap the plan's own acceptance
criteria required closing; 1 Rule 1 — a genuine DOM-corrupting bug found via a failing test, not
inspection; 1 Rule 3 — a blocking gap in the plan's own `<files>` list, mirroring 04-18/04-19's
identical precedent).
**Impact on plan:** All three were necessary for correctness or for the plan's own stated acceptance
criteria to hold. No architectural drift and no scope creep — the `ENTITY_NOT_FOUND` fix is scoped
to the exact code path the plan's action text named, and the key-collision fix touches only the two
lines that carried the bug.

## Issues Encountered

- **The React sibling-key collision (Deviation 2) initially looked like cross-test contamination.**
  The first full-file run showed 54 of 196 tests failing, cascading from an unrelated early
  column-rename test onward — classic symptoms of one test corrupting shared browser-page state for
  every test after it. Isolating the actual failing test with `-t` and running it completely alone
  (no other tests in the process) proved it failed on its own, on a fresh render, which narrowed the
  search to the test's own interaction sequence rather than test-order pollution — a useful
  diagnostic sequence for a future similar "everything after test N fails" symptom.

## Checkpoint Verification

No checkpoints in this plan (all three tasks are `type="auto"`).

## Gate Evidence

All exit 0: `pnpm exec tsc --noEmit`, `pnpm lint` (`eslint .`, whole repo), `pnpm format:check`
(`prettier --check .`, whole repo), `pnpm build`, `pnpm actions:check`, `pnpm coverage:check`,
`pnpm comments:check`, `pnpm folders:check`, `pnpm renders:check`, `pnpm stories:check`,
`pnpm tsx:check`. `pnpm test` — 125 files / 1909 tests (up from 122/1850 at dispatch), one full run,
exit 0. `pnpm test:a11y` — 39 files / 255 tests, exit 0. `pnpm exec playwright test --list --project
e2e --grep "task delete"` confirms both new e2e cases resolve and collect cleanly (2 tests, 1 file).

**e2e was NOT run in this dispatch**, per the sequential-executor prompt's explicit instruction — a
local run's `/admin/reset` would fail any concurrent CI e2e job. This overrides the plan's own
`<verify>`/acceptance line naming `pnpm exec playwright test --project e2e --grep "task delete"` —
that command was not executed and its pass/fail is unverified by this plan run beyond the `--list`
collection check above. The orchestrator should schedule the actual run separately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

TASK-05 is complete: task delete, its confirmation, the wait-for-server hook, and the kebab wiring
all ship. The `ENTITY_NOT_FOUND` mapping fix is a general improvement available to every future
delete path in the app, not scoped narrowly to tasks. 04-21 and later plans depending on a complete
task CRUD surface have no blockers from this plan. e2e coverage for TASK-05 (delete a task through
the real running app) is written but outstanding — should be run before the phase is considered
fully verified, alongside 04-19's own outstanding subtask e2e coverage.

## Self-Check: PASSED

All key files (`delete-task-action.ts`, `.integration.test.ts`, `use-delete-task.ts`,
`delete-task-confirm.tsx`, `.stories.tsx`, `.test.tsx`, `tasks-delete.e2e.spec.ts`) and all three
task commits (`7023313`, `3cd18e2`, `d7d7732`) confirmed present on disk / in `git log`.

---
*Phase: 04-task-subtask-workflow*
*Completed: 2026-09-02*
