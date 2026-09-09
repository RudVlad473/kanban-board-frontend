---
phase: 04-task-subtask-workflow
plan: 13
subsystem: tasks
tags: [dnd-kit, keyboard-accessibility, multi-container-drag, announcements, within-column-reorder]

requires:
  - phase: 04-12
    provides: The move Server Action, the task card with its drag handle, the optimistic move
      hook, the layout-ring multi-container drag wiring, and the type-branching collision
      strategy the tracer slice shipped
provides:
  - The tasks feature's own boundary-legal drag sensor hook (useTaskDragSensors)
  - The corrected task-move announcement wording, distinguishing within-column from
    cross-column moves per the Copywriting Contract
  - Full keyboard-path browser and e2e coverage: lift, within-column step, cross-column step,
    drop, cancel, the two arrow-boundary no-ops, the single-request-per-move guarantee, and the
    dead-control handle split
affects: ["04-14", "04-15", "04-16", "04-17", "04-18", "04-19", "04-20", "04-21", "04-22"]

actuals:
  tokens: 6787
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A feature-owned sensor hook that would otherwise need to import a sibling feature's
      guarded keyboard sensor instead ships its own PLAIN, unguarded sensor when the two are
      behaviourally identical for its drag kind — D-15's no-cross-feature-imports rule stays
      exception-free without duplicating narrowing logic that never applies"
    - "An announcements factory that wraps another one (createTaskMoveAnnouncements wrapping
      createColumnReorderAnnouncements) must branch its OWN wording on whichever axis its
      Copywriting Contract distinguishes (here: did the column change), not reuse a single
      template across every transition — the two cases read differently to a screen reader"

key-files:
  created:
    - src/features/tasks/hooks/use-task-drag-sensors.ts
  modified:
    - src/features/tasks/model.ts
    - src/features/tasks/model.unit.test.ts
    - src/components/layout/board-view/board-view.stories.tsx
    - src/components/layout/board-view/board-view.test.tsx
    - e2e/tasks-move.e2e.spec.ts

key-decisions:
  - "Most of this plan's described production work — the move Server Action's optional
    targetPosition, the T3-derived toTaskMoveTargetPosition index math, within-column reorder
    wiring in board-view.tsx's handleDragEnd, the isTaskMoveDisabled dead-control gate, and the
    shared keyboard sensor's Pitfall-8 type-branch guard — had already shipped in 04-12's task 3
    rescue (the stranded-worktree MOBILE keyboard-reorder fix, adopted into the tracer). This
    plan's real contribution narrowed to: the new sensor-hook artifact, one genuine announcement
    bug, and the keyboard-path test coverage that proves the rest still holds."
  - "createTaskMoveAnnouncements' onDragOver had only the cross-column wording
    ('{title} moved to {column}, position {i} of {N}'), used for BOTH move kinds.
    04-UI-SPEC's Copywriting Contract requires a distinct within-column wording
    ('{title} moved to position {i} of {N} in {column}'). Fixed by branching on
    `task.column === target.column`, proven RED (0bfca21) then GREEN (b9f4e91)."
  - "useTaskDragSensors ships a PLAIN, unguarded @dnd-kit KeyboardSensor rather than importing
    use-column-drag-sensors.ts's ColumnKeyboardSensor: D-15 forbids the cross-feature import,
    and it is unneeded anyway — that sensor's own guard already falls straight through to the
    library default for a TASK drag, which is exactly what the plain sensor is. board-view.tsx's
    single shared DndContext keeps using useColumnDragSensors() alone; registering both hooks'
    sensor sets together would double-handle every pointer/keyboard event on the same drag."
  - "The plan's own <verify>/<verification> blocks ask for the FULL `pnpm exec playwright test
    --project e2e --repeat-each=3 --workers=2` (every e2e spec, not just this plan's file).
    CLAUDE.md's explicit rule overrides that: run the new spec scoped, never the whole suite
    casually, since a local run hits /admin/reset on the shared nonprod backend. Ran
    `e2e/tasks-move.e2e.spec.ts` alone at those settings — 9/9 (3 tests x 3 repeats)."

requirements-completed: []

coverage:
  - id: D1
    description: "The keyboard path is mandatory and complete: focus, lift, arrow-move, drop,
      cancel, all announced"
    verification:
      - kind: automated_ui
        ref: "board-view.test.tsx — lift/within-column-step/cross-column-step/drop/cancel
          announcement cases"
        status: pass
      - kind: e2e
        ref: "e2e/tasks-move.e2e.spec.ts — task move: moves a task into another column by
          keyboard and keeps it there across a reload"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cancel returns the card to its ORIGINAL column and index after multiple
      intermediate steps, issuing nothing"
    verification:
      - kind: automated_ui
        ref: "board-view.test.tsx — returns a task to its original column and index when
          cancelled after two steps, issuing nothing"
        status: pass
      - kind: e2e
        ref: "e2e/tasks-move.e2e.spec.ts — task move: writes nothing when a lifted task is
          moved and then cancelled"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-11: within-column keyboard reorder works, sending the contract's optional
      position field on every move"
    verification:
      - kind: automated_ui
        ref: "board-view.test.tsx — reorders a task within its column when lifted, arrowed
          down and dropped, sending exactly one request"
        status: pass
      - kind: unit
        ref: "model.unit.test.ts — toTaskMoveTargetPosition within-column cases (already
          shipped in 04-12, unchanged)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Boundary no-ops: an up-arrow at index 0 and a down-arrow at the last index
      send no request"
    verification:
      - kind: automated_ui
        ref: "board-view.test.tsx — issues no request when an up step is taken at index 0 /
          when a down step is taken at the last index"
        status: pass
    human_judgment: false
  - id: D5
    description: "One request per completed keyboard move, regardless of intermediate arrow
      steps"
    verification:
      - kind: automated_ui
        ref: "board-view.test.tsx — issues exactly one request however many arrow steps a
          task's move took"
        status: pass
    human_judgment: false
  - id: D6
    description: "04-RESEARCH Pitfall 8: the shared keyboard sensor's horizontal narrowing does
      not run for a task drag, so a task step is never measured against its own column body"
    verification:
      - kind: automated_ui
        ref: "board-view.test.tsx — moves a task into another column when lifted, arrowed
          right and dropped by keyboard (both MOBILE and DESKTOP)"
        status: pass
      - kind: other
        ref: "src/features/tasks/hooks/use-task-drag-sensors.ts — the tasks feature's own
          artifact, exporting useTaskDragSensors"
        status: pass
    human_judgment: false
  - id: D7
    description: "The column keyboard path is unchanged: every pre-existing column
      keyboard-reorder block still passes"
    verification:
      - kind: automated_ui
        ref: "board-view.test.tsx — full file, 148/148, 0 skipped"
        status: pass
    human_judgment: false
  - id: D8
    description: "The two Copywriting Contract announcement wordings — within-column vs
      cross-column — are both correct and distinct"
    verification:
      - kind: unit
        ref: "model.unit.test.ts — announces a within-column move / announces a cross-column
          move (naming the column last / first respectively)"
        status: pass
      - kind: automated_ui
        ref: "board-view.test.tsx — announces a within-column move and the drop naming the
          position and column / announces a cross-column move and the drop naming the column
          and position"
        status: pass
    human_judgment: false
  - id: D9
    description: "UI-SPEC zero-one-many: the handle is disabled only in the one-column,
      one-task board; every other combination, including a single task in a multi-column
      board, keeps a live handle"
    verification:
      - kind: automated_ui
        ref: "board-view.test.tsx — keeps a task's handle live when it is the only task in a
          multi-column board / disables a task's handle only when the board holds exactly one
          column and one task"
        status: pass
    human_judgment: false
  - id: D10
    description: "T3's position semantics are pinned by a unit case naming T3 by name"
    verification:
      - kind: unit
        ref: "model.unit.test.ts:72 — 'appends when the drop landed on the column body rather
          than a card' (comment names T3; shipped in 04-12, unchanged by this plan)"
        status: pass
    human_judgment: false
  - id: D11
    description: "The keyboard path is proven end to end against the real deployed nonprod
      backend, under contention"
    verification:
      - kind: e2e
        ref: "e2e/tasks-move.e2e.spec.ts run at `--project=e2e --repeat-each=3 --workers=2`,
          scoped to this file per CLAUDE.md's e2e-scoping rule — 9/9"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-08-30
status: complete
---

# Phase 04 Plan 13: Keyboard Task Move Summary

The keyboard path for moving tasks — lift, arrow, drop, cancel, within-column reorder, and the
two Copywriting Contract announcement wordings — proven correct with a genuine bug fixed and
comprehensive browser/e2e coverage added, on top of production code that 04-12 had already
shipped.

## Performance

- **Duration:** 55 min
- **Started:** 2026-08-30T10:45:00Z
- **Completed:** 2026-08-30T11:40:00Z
- **Tasks:** 3 completed
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments

- **`useTaskDragSensors`** (`src/features/tasks/hooks/use-task-drag-sensors.ts`) — the tasks
  feature's own boundary-legal drag sensor hook: mouse/touch mirroring the column hook's shape,
  plus a plain, unguarded `KeyboardSensor` (task steps are never narrowed against the column
  row, so no subclass is needed).
- **Fixed a real announcement bug** — `createTaskMoveAnnouncements`'s `onDragOver` had only the
  cross-column wording, used for both within-column and cross-column moves. 04-UI-SPEC's
  Copywriting Contract requires two distinct strings; fixed with a `task.column === target.column`
  branch, proven RED then GREEN.
- **Comprehensive keyboard-path browser coverage**: lift, within-column step + reorder,
  cross-column step, drop, cancel (after two steps, returning to the original column AND
  index), the two arrow-boundary no-ops, the single-request-per-move guarantee, and the
  handle live/disabled dead-control split — 20 new browser test cases across `board-view.test.tsx`.
- **Two new e2e cases** in `e2e/tasks-move.e2e.spec.ts` (which 04-12 had already created for the
  pointer path): keyboard move into a populated destination and reload persistence, and cancel
  leaving the task where it started — both gated on the library's own announcements, never a
  timer, and proven under `--repeat-each=3 --workers=2` contention (9/9).

## Task Commits

Each task was committed atomically:

1. **Task 1: Task drag sensors, with the shared keyboard sensor guarded off task drags** —
   `8a28247` (feat)
2. **Task 2: Keyboard move, within-column reorder, and the announcements** —
   `0bfca21` (test, RED) → `b9f4e91` (feat, GREEN)
3. **Task 3: Prove the keyboard path in a real browser and under contention** — `a275885` (test)

## Files Created/Modified

- `src/features/tasks/hooks/use-task-drag-sensors.ts` — new: `useTaskDragSensors`, the tasks
  feature's own mouse/touch/keyboard sensor set.
- `src/features/tasks/model.ts` — `createTaskMoveAnnouncements`'s `onDragOver` now distinguishes
  within-column from cross-column wording.
- `src/features/tasks/model.unit.test.ts` — two new `onDragOver` cases pinning both wordings.
- `src/components/layout/board-view/board-view.stories.tsx` — `ReorderableTasks` (one column,
  four named tasks) and `SingleColumnSingleTask` (the dead-control board) fixtures.
- `src/components/layout/board-view/board-view.test.tsx` — 21 new browser cases (the Task 1
  regression guard plus Task 2's keyboard-path coverage).
- `e2e/tasks-move.e2e.spec.ts` — two new cases (keyboard move + reload, cancel).

## Decisions Made

- **Most of this plan's described production work was already shipped in 04-12.** The tracer
  slice's task 3 rescue (the stranded-worktree fix for the MOBILE column keyboard-reorder
  regression) landed the move action's `targetPosition`, `toTaskMoveTargetPosition`'s T3-derived
  index math, `board-view.tsx`'s within-column reorder wiring, `isTaskMoveDisabled`'s
  dead-control gate, AND `use-column-drag-sensors.ts`'s Pitfall-8 type-branch guard as side
  effects of that fix — all confirmed present and correct before this plan touched anything.
  This plan's real scope narrowed to the new sensor-hook artifact, the one genuine announcement
  bug, and proving the rest holds under keyboard-path coverage that did not previously exist.
- **`useTaskDragSensors` does not import `use-column-drag-sensors.ts`.** D-15 forbids the
  cross-feature import (`tasks -> boards`), and it would add nothing: that hook's own guard
  already falls straight through to the plain library `KeyboardSensor` for a TASK drag, which is
  exactly what this hook's own sensor is. `board-view.tsx`'s single shared `DndContext` keeps
  using `useColumnDragSensors()` alone for both drag kinds — registering both hooks' sensor sets
  together would double-handle every pointer/keyboard event on the same drag, since dnd-kit
  instantiates every sensor it is given independently.
- **Ran the e2e contention check SCOPED to `e2e/tasks-move.e2e.spec.ts`, not the whole `e2e`
  project.** The plan's own `<verify>`/`<verification>` text asks for
  `pnpm exec playwright test --project e2e --repeat-each=3 --workers=2` with no file scoping.
  CLAUDE.md's explicit rule overrides that: a local e2e run hits `/admin/reset` on the shared
  nonprod backend and can fail concurrent CI jobs, so only the new spec was run, at the required
  settings. 9/9 (3 tests × 3 repeats).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `createTaskMoveAnnouncements`'s `onDragOver` used one wording for both move kinds**
- **Found during:** Task 2, while writing the browser test asserting the within-column
  announcement string.
- **Issue:** 04-UI-SPEC's Copywriting Contract pins two distinct strings — "moved to position
  {i} of {N} in {Column}" within a column, "moved to {Column}, position {i} of {N}" across
  columns — but the shipped code used only the cross-column template for both.
- **Fix:** Branch on `task.column === target.column` (both resolved from the pre-drop
  `columns` prop, since the actual data does not move until drop) to pick the correct wording.
- **Files modified:** `src/features/tasks/model.ts`, `src/features/tasks/model.unit.test.ts`
- **Verification:** Unit tests RED (`0bfca21`) then GREEN (`b9f4e91`); browser tests for both
  wordings pass; full `board-view.test.tsx` 148/148.
- **Committed in:** `0bfca21` (RED test), `b9f4e91` (GREEN fix)

---

**Total deviations:** 1 auto-fixed (1 bug — Rule 1).
**Impact on plan:** Necessary for correctness against the design contract. No scope creep — the
fix is exactly the wording the plan's own `<action>` text specified and the pre-existing code
did not implement.

### Out of scope (logged, not fixed)

- `pnpm folders:check` fails on a stray, untracked `src/features/boards/components/board-view/`
  directory left over from 04-04's move — pre-existing, predates this plan by a month, and
  neither this plan's files nor its scope touch it. Logged in `deferred-items.md` with a
  suggested one-line fix for whichever plan next touches that check's output.

## Issues Encountered

None beyond the announcement bug documented above as a deviation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The keyboard path for task movement is now complete, announced, and proven under contention —
  the phase's central accessibility requirement for TASK-04 no longer has a gap.
- `TASK-04` is NOT yet marked complete in REQUIREMENTS.md: 17 plans in this phase declare it as
  a shared requirement (`gsd-tools query requirements.ready-ids` confirms 0/1 ready), and most
  (04-14 through 04-22) have not yet produced a SUMMARY. It will mark complete automatically once
  the last declaring plan finishes.
- Plans 04-14 through 04-22 remain. Ready for `/gsd-execute-phase 04` to continue wave 9+.

## Self-Check: PASSED

All 6 created/modified files confirmed present on disk; all 4 task commits (`8a28247`,
`0bfca21`, `b9f4e91`, `a275885`) confirmed in `git log`. All plan-level `<verification>` gates
re-run on the final tree: `pnpm test` 1529/1529 (0 skipped), `pnpm lint` clean, `pnpm exec tsc
--noEmit` exit 0, `pnpm build` exit 0, `e2e/tasks-move.e2e.spec.ts --project=e2e
--repeat-each=3 --workers=2` 9/9 (scoped per CLAUDE.md, see Decisions Made above).

---

*Phase: 04-task-subtask-workflow*
*Completed: 2026-08-30*
