---
phase: 04-task-subtask-workflow
plan: 16
subsystem: ui
tags: [task-detail, subtask-checklist, dropdown, optimistic-ui, react-hook-form-free, tanstack-query]

requires:
  - phase: 04-task-subtask-workflow
    provides: "04-15's board-detail query-cache migration (tech/0030) — the `[\"board\", boardId]` entry already holds tasks and subtasks, so this plan needed no new fetch; and use-move-task.ts, the drag path's mutation hook"
provides:
  - "TASK-02 end to end: a task detail modal showing title, description, subtask checklist and current column, reading only off the already-parsed board"
  - "D-10's second move entry point: the modal's Current Status control calls the SAME use-move-task.ts hook the drag path calls — one hook, two callers, proven by a zero-count grep on moveTaskAction"
  - "SubtaskChecklistRow — a checkbox-plus-label row whose whole body is the label's click target through the shipped Field/peer wiring, never a wrapping onClick"
  - "The board's open-detail callback, left deliberately unwired by the 04-1x tracer, now opens this modal; D-13's card-vs-handle split proven at the board integration point"
affects: [04-17, 04-18, 04-20]

actuals:
  tokens: 11300
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "A second mutation entry point is a second CALLER of the existing hook, never a second implementation — the status dropdown and the drag handler both call use-move-task.ts's useMoveTask, sharing one optimistic apply, one rollback, and one conflict branch (T-04-37, asserted by a zero-count grep on moveTaskAction in the modal)."
    - "The modal is keyed on the task id, not a snapshot, so it re-derives its live task and live column from the board query cache on every render — no stale-props risk while the mutation settles behind it."
    - "An empty state omits its block/caption entirely rather than rendering a placeholder or a zero count — no description block when there is none, no subtasks caption at zero subtasks, in favour of two authored empty-state lines."
    - "The 12px mock inset for a checklist row is a barred step; the 16px result is a recorded, accepted deviation rather than a resolved one."

key-files:
  created:
    - src/features/tasks/components/subtask-checklist-row/subtask-checklist-row.tsx
    - src/features/tasks/components/subtask-checklist-row/subtask-checklist-row.stories.tsx
    - src/features/tasks/components/subtask-checklist-row/subtask-checklist-row.test.tsx
    - src/features/tasks/components/task-detail-modal/task-detail-modal.tsx
    - src/features/tasks/components/task-detail-modal/task-detail-modal.stories.tsx
    - src/features/tasks/components/task-detail-modal/task-detail-modal.test.tsx
  modified:
    - src/features/tasks/model.ts
    - src/features/tasks/model.unit.test.ts
    - src/components/layout/board-view/board-view.tsx
    - src/components/layout/board-view/board-view.test.tsx

key-decisions:
  - "Completed-subtask label ships at 55% opacity of the primary colour rather than the mock's sampled ~50% — the lowest whole percent clearing WCAG AA against the shipped checkbox.tsx treatment. Pre-recorded in the plan, not a deviation found during execution."
  - "The modal reuses the shipped Modal.Content width (448px) unchanged rather than re-deriving a wider primitive to match the mock's ~480px panel — pre-recorded in the plan as the cost of not forking a shared component for one caller."
  - "onToggleSubtask, onEditTask and onDeleteTask are wired as props but left as deliberate no-ops in this plan; their mutations land in 04-17 (toggle), 04-18 (edit) and 04-20 (delete) respectively."

requirements-completed: [TASK-02, TASK-04]

coverage:
  - id: D1
    description: "SubtaskChecklistRow: whole-row click target via label association, completed-row strikethrough at 55% opacity in both themes, checkbox top-aligned on a wrapped two-line title, no wrapping onClick handler"
    requirement: "TASK-02"
    verification:
      - kind: unit
        ref: "src/features/tasks/components/subtask-checklist-row/subtask-checklist-row.test.tsx"
        status: pass
      - kind: other
        ref: "grep -c 'onClick' subtask-checklist-row.tsx == 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "TaskDetailModal read surface: title/description/checklist/column render off the already-parsed board, both empty states handled (no description block, suppressed subtasks caption), kebab with two authored menu items, no visible close control, single scroll region"
    requirement: "TASK-02"
    verification:
      - kind: unit
        ref: "src/features/tasks/components/task-detail-modal/task-detail-modal.test.tsx"
        status: pass
      - kind: other
        ref: "grep -c 'Modal.Close' task-detail-modal.tsx == 0; grep -c 'overflow-y-auto|overflow-auto|max-h-' task-detail-modal.tsx == 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Status control as the move mutation's second caller (D-10), busy/disabled while in flight with no doubled pending signal, revert-on-failure of both dropdown value and card position; board wires the card's open-detail callback to this modal with D-13's card-vs-handle split proven at the integration point"
    requirement: "TASK-04"
    verification:
      - kind: unit
        ref: "src/components/layout/board-view/board-view.test.tsx"
        status: pass
      - kind: unit
        ref: "src/features/tasks/components/task-detail-modal/task-detail-modal.test.tsx"
        status: pass
      - kind: other
        ref: "grep -c 'moveTaskAction' task-detail-modal.tsx == 0 (T-04-37)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Checkpoint: the running app matches the mock (PDF p5 light / p15 dark) for vertical rhythm, row fill, and completed-row treatment; focus returns to the originating card on both escape and backdrop dismissal; a long title wraps and never runs under the kebab; a moved task survives a reload"
    verification:
      - kind: manual_procedural
        ref: "checkpoint:human-verify, task 4 — driven headless through this project's own mcp__playwright__ server"
        status: pass
    human_judgment: true
    rationale: "Pixel-level mock comparison and real focus-return behavior across escape/backdrop dismissal are judgment calls no automated assertion in this suite covers; verified directly in the running app per the Checkpoint Verification section below, user responded \"approved\"."

duration: 2h23m
completed: 2026-09-01
status: complete
---

# Phase 4 Plan 16: The Task Detail Modal and the Status Control's Second Move Path Summary

**TaskDetailModal reading title/description/checklist/column off the already-cached board, with a Current Status dropdown that is the drag mutation's second caller, and SubtaskChecklistRow as its whole-row-clickable checklist primitive**

## Performance

- **Duration:** 2h23m (first RED commit to checkpoint approval)
- **Started:** 2026-09-01T17:29:10Z
- **Completed:** 2026-09-01T19:52:39Z
- **Tasks:** 3 implementation tasks (TDD RED/GREEN each) + 1 blocking `checkpoint:human-verify`
- **Files modified:** 10

## Accomplishments

- **SubtaskChecklistRow** (Task 1): a 40px-min-height checkbox-plus-label row reproducing `checkbox.tsx`'s own Field/peer wiring at row scale, so the whole row is the label's click target with no wrapping `onClick`. Completed rows strike through at 55% opacity of the primary colour in both themes; the checkbox stays top-aligned rather than centred so a wrapped two-line title doesn't drift its target off the first line. Hover tints the row (`hover:bg-bg-primary/25`); the focus ring lands on the checkbox itself, never the row — both prescribed rather than mock-measured, since the mock shows neither state.
- **TaskDetailModal — read surface** (Task 2): reuses the shipped `Modal.Content` clamp unchanged. Title reserves right padding so it never runs under the kebab; description is omitted entirely when absent, not rendered as a placeholder; the subtasks caption is suppressed at zero subtasks in favour of two authored empty-state lines naming the edit modal as the next step. The kebab is a 44px ghost icon button whose accessible name interpolates the full task title, opening a two-item menu (`Edit Task`, `Delete Task`, the second marked destructive) built from the same composition `column-header.tsx`'s menu uses. No visible close control ships (S-09); escape and backdrop dismiss, focus returns to the originating card. No second scroll container — the modal content's own clamp is the one scroll region.
- **Status control as the move mutation's second caller, and board wiring** (Task 3): the Current Status dropdown lists the board's columns in board order with the task's current column selected, and calls `use-move-task.ts`'s `useMoveTask` — the SAME hook the drag path calls, not a parallel implementation (D-10, T-04-37). The dropdown's own loading axis (busy attribute, spinner, disabled trigger) is the only pending signal while the move is in flight; the board has already re-parented the card optimistically, so nothing doubles with the card's own pending state behind the modal. `board-view.tsx` mounts the modal keyed on the task id (not a snapshot, so it re-derives its live task/column every render) and wires the card's open-detail callback the tracer left unwired. A board-level browser case proves D-13's split at the integration point: a card click opens the modal, a handle click does not.
- **Checkpoint (Task 4, blocking):** all six verification steps driven headless through the running app via this project's own `mcp__playwright__` server, plus a mock comparison at 300 DPI (divisor 4.1667). User responded "approved" — see Checkpoint Verification below.

## Task Commits

Each task was committed atomically as a TDD RED/GREEN pair:

1. **Task 1: SubtaskChecklistRow** — `bf10b93` (test, RED: 12/12 fail against a skeleton), `1667ba3` (feat, GREEN: 12/12 pass)
2. **Task 2: TaskDetailModal read surface, kebab, empty states** — `bd591d1` (test, RED: 22/24 fail against a skeleton), `3d00d49` (feat, GREEN: 24/24 pass)
3. **Task 3: Status control as move mutation's second caller, board wiring** — `222bc41` (test, RED: 4/26 modal + 8/8 new board-view tests fail), `1680605` (feat, GREEN: 200/200 pass across both files)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified

- `src/features/tasks/components/subtask-checklist-row/subtask-checklist-row.tsx` — the whole-row-clickable checklist item, exports `SubtaskChecklistRow`
- `src/features/tasks/components/subtask-checklist-row/subtask-checklist-row.stories.tsx` / `.test.tsx` — visual states and browser-mode behavior
- `src/features/tasks/components/task-detail-modal/task-detail-modal.tsx` — TASK-02's detail view plus the kebab and status control, exports `TaskDetailModal`
- `src/features/tasks/components/task-detail-modal/task-detail-modal.stories.tsx` / `.test.tsx` — visual states and browser-mode behavior, including the move mutation flow
- `src/features/tasks/model.ts` / `model.unit.test.ts` — added `toSubtaskDetailCaption`, the parenthesised "Subtasks (N of M)" formatter
- `src/components/layout/board-view/board-view.tsx` / `.test.tsx` — mounts `TaskDetailModal` keyed on task id, wires the card's open-detail callback, adds the card-vs-handle integration test

## Decisions Made

- Completed-subtask label ships at 55% opacity rather than the mock's sampled ~50% — the lowest whole percent clearing WCAG AA against the shipped `checkbox.tsx` treatment. Pre-recorded in the plan.
- Modal content width stays at the shipped 448px rather than re-deriving a ~480px primitive to match the mock's wider panel. Pre-recorded in the plan.
- `onToggleSubtask`, `onEditTask`, `onDeleteTask` are wired as props and deliberately left as no-ops here; their mutations land in 04-17, 04-18 and 04-20 respectively. In-scope, not a gap.

## Deviations from Plan

None — plan executed exactly as written across all three implementation tasks. Both divergences from the mock (55% opacity, 448px width) were pre-recorded design decisions in the plan itself, not deviations discovered during execution.

## Issues Encountered

- **`comments:check` was RED at the branch tip**, on `eslint.config.mjs:412` and `src/lib/core/api-contract/problem-detail.ts:22`. Both blocks arrived with the review-driven refactor commits `8c750dc` and `98bc6d2` — out of scope for this plan, not introduced by it. Compressed past the PC-05 three-line cap in `454c3dd` (hooks ran, no `--no-verify`) so this plan's gate run would be green; this is an out-of-plan repair, not a plan deviation, since it fixed a defect this plan did not create.

## Checkpoint Verification

Task 4's blocking `checkpoint:human-verify` was resolved by driving all six steps headless through this project's own `mcp__playwright__` server against the running app. User responded "approved" after the report below.

1. **Card click opens the detail view** with correct title/description/checklist/status; clicking the drag handle leaves `dialogOpen=false` with focus on the handle — D-13's split proven at the integration point.
2. **Changing Current Status** moved the task Todo→Doing behind the still-open modal (Todo 3→2, Doing 1→2), the combobox followed, and the move survived a full page reload.
3. **Empty states:** no subtasks → the two authored lines with the caption suppressed (no "0 of 0"); no description → the block omitted entirely, no placeholder prose.
4. **Long title:** 16px clearance from the kebab at desktop AND at 375px where it wraps to two lines; the kebab's accessible name interpolates the FULL untruncated title. Task titles are capped at 32 characters by validation, so that is the real worst case reachable through the UI.
5. **Escape and backdrop click** both dismiss, and `document.activeElement` returns to the originating card both times (S-09: no visible close control is shipped).
6. **Mock comparison**, PDF p5 (light) and p15 (dark) rendered at 300 DPI (divisor 4.1667):
   - row fill light: mock `rgb(244,247,253)` vs live `rgb(244,247,253)` — exact token match
   - row fill dark: mock `rgb(32,33,44)` vs live `rgb(32,33,44)` — exact token match
   - row height 40 / gap 8 / dropdown height 40 — all match
   - rhythm title→desc 24, desc→caption 24, caption→rows 16, rows→label 24, label→dropdown 8 — all match the UI-SPEC
   - all three rows share one fill in both themes, differing only in label treatment

Zero console errors or warnings across the whole session.

## Gate Evidence

Run at commit `8c750dc` plus the `comments:check` fix `454c3dd`, all exit 0: `tsc --noEmit`, `lint`, `format:check`, `build`, `routes:check`, `handlers:check`, `stories:check`, `comments:check`, `tsx:check`, `renders:check`, `folders:check`, `actions:check`, `coverage:check`. `pnpm test` — three consecutive full runs, 115 files / 1722 tests each, all exit 0. T-04-37 confirmed: `grep -c 'moveTaskAction' task-detail-modal.tsx` is 0.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

04-17 (subtask toggle), 04-18 (edit task) and 04-20 (delete task) each depend on this plan's `TaskDetailModal` shape — `onToggleSubtask`, `onEditTask` and `onDeleteTask` are already wired as props with no-op stubs, so each of those plans changes only the handler, never the component's shape. No blockers.

---
*Phase: 04-task-subtask-workflow*
*Completed: 2026-09-01*
