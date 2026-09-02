---
phase: 04-task-subtask-workflow
plan: 18
subsystem: tasks
tags: [tanstack-query, server-actions, zod, react-hook-form, optimistic-ui]

requires:
  - phase: 04-task-subtask-workflow
    provides: "04-15's board-detail query-cache migration (ADR tech/0030); 04-16's TaskDetailModal and its kebab; 04-17's use-toggle-subtask.ts and use-move-task.ts as the shared-cache write pattern to mirror"
provides:
  - "TASK-03 end to end: a user edits a task's title and description from the detail view's kebab, and the change persists"
  - "updateTaskAction — the Server Action re-enforcing the 3-32 title bound UpdateTaskRequestDTO omits, PUT on TASK_DETAIL, D-12 refresh on CONFLICT and SUCCESS"
  - "useUpdateTask — the optimistic title/description save writing the shared [\"board\", boardId] query-cache entry (ADR tech/0030), with rollback and a toast (not an inline message) since the modal has already closed"
  - "EditTaskModal — presentational title+description form, no Status control (S-02), the autosave hint under the Subtasks label (S-01), and a rows slot left for plan 04-19"
  - "TaskDetailModal now owns the edit flow directly (isEditing local state + useUpdateTask), the same single-caller ownership 04-17 established for useToggleSubtask"
affects: [04-19, 04-20, 04-21, 04-22]

actuals:
  tokens: 16766
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A component whose kebab opens a second flow with exactly one caller owns that flow's hook and local open/closed state directly (isEditing + useUpdateTask inside TaskDetailModal), rather than bubbling an onEditTask callback up to the nearest container that composes it — the same 'single caller owns the hook' reasoning 04-17 established for useToggleSubtask, now extended from a toggle to a full sub-modal swap."
    - "A modal that closes optimistically on submit (rather than holding a spinner through settle) still takes a real isPending prop and holds its dismissal guards on it — not because a real caller keeps it open that long, but because the prop is the modal's own general-purpose contract, and the guard's own test drives it through a STAGED story with isPending forced true (mirroring AddTaskModal's Submitting story) rather than racing a real submit's near-zero-width in-flight window."
    - "A blank/whitespace client update field that the backend cannot actually clear (T9: \"\" refused, null/omitted a silent no-op) is normalised to `undefined` client-side, matching the create path's own blank-to-undefined transform, rather than invented into a wire workaround (e.g. sending a single space) — a documented no-op is preferable to a value that reads as \"cleared\" in this session but reverts on the next full read."

key-files:
  created:
    - src/features/tasks/actions/update-task-action.ts
    - src/features/tasks/actions/update-task-action.integration.test.ts
    - src/features/tasks/hooks/use-update-task.ts
    - src/features/tasks/components/edit-task-modal/edit-task-modal.tsx
    - src/features/tasks/components/edit-task-modal/edit-task-modal.stories.tsx
    - src/features/tasks/components/edit-task-modal/edit-task-modal.test.tsx
  modified:
    - src/features/tasks/schemas.ts
    - src/features/tasks/schemas.unit.test.ts
    - src/features/tasks/model.ts
    - src/features/tasks/model.unit.test.ts
    - src/features/tasks/components/task-detail-modal/task-detail-modal.tsx
    - src/features/tasks/components/task-detail-modal/task-detail-modal.stories.tsx
    - src/features/tasks/components/task-detail-modal/task-detail-modal.test.tsx
    - src/components/layout/board-view/board-view.tsx
    - src/components/layout/board-view/board-view.test.tsx

key-decisions:
  - "useUpdateTask follows ADR tech/0030 (the current mechanism), not the 04-PATTERNS.md read_first pointer to use-rename-column.ts's now-superseded override+staleness-guard shape — CLAUDE.md's corrections block for this plan says so explicitly, and 04-17's use-toggle-subtask.ts / use-move-task.ts are the actually-shipped analogs this hook mirrors instead."
  - "TaskDetailModal owns the edit flow (isEditing state + useUpdateTask) directly instead of bubbling onEditTask to board-view.tsx as a prop — the kebab's Edit Task item is the flow's ONLY caller, matching 04-17's identical reasoning for useToggleSubtask. Submitting or cancelling the edit modal returns to the detail view rather than closing everything, since the user was mid-inspection."
  - "A cleared description is sent as the create path's own blank-to-undefined transform (never a literal empty string, which the backend refuses with 400) rather than a magic single-space workaround — T9 found there is no way to truly clear an existing description through this API, and a documented no-op is the honest choice over a value that would silently revert on the next full board read."
  - "EditTaskModal's rows section (label, autosave hint, add-a-row button) renders with a `subtaskRows`/`onAddSubtaskRow` prop pair left empty by this plan for 04-19 to fill, keeping the component's own shape unchanged once the slot is populated."

requirements-completed: [TASK-03, SYNC-01]

coverage:
  - id: D1
    description: "updateTaskAction: session-then-parse-then-upstream PUT on TASK_DETAIL, client-side 3-32 title bound the DTO omits, D-12 refresh on CONFLICT as well as SUCCESS"
    requirement: "TASK-03"
    verification:
      - kind: integration
        ref: "src/features/tasks/actions/update-task-action.integration.test.ts (4 cases against the real deployed nonprod backend)"
        status: pass
      - kind: unit
        ref: "src/features/tasks/schemas.unit.test.ts#updateTaskInputSchema"
        status: pass
    human_judgment: false
  - id: D2
    description: "useUpdateTask: optimistic title/description apply writing the shared board cache entry, rollback plus a toast on failure, and the phase-wide conflict toast on a stale version"
    requirement: "SYNC-01"
    verification:
      - kind: automated_ui
        ref: "src/components/layout/board-view/board-view.test.tsx (3 new board-level cases: success/card+modal, failure/revert+toast, conflict/toast)"
        status: pass
      - kind: unit
        ref: "src/features/tasks/model.unit.test.ts#applyTaskUpdate"
        status: pass
    human_judgment: false
  - id: D3
    description: "EditTaskModal: prefilled title/description, no Status control, inline title validation (blank/length), the exact autosave hint under the Subtasks label, and the dismissal guards held while pending"
    requirement: "TASK-03"
    verification:
      - kind: automated_ui
        ref: "src/features/tasks/components/edit-task-modal/edit-task-modal.test.tsx (26 cases, both viewports)"
        status: pass
      - kind: automated_ui
        ref: "src/features/tasks/components/task-detail-modal/task-detail-modal.test.tsx (kebab-to-edit-modal wiring, 34 cases total)"
        status: pass
    human_judgment: false

duration: ~75min
completed: 2026-09-02
status: complete
---

# Phase 4 Plan 18: The Edit Task Modal Summary

**Task title/description editing via a presentational EditTaskModal owned by TaskDetailModal, saving optimistically through the shared board query-cache entry with rollback onto the card**

## Performance

- **Duration:** ~75 min
- **Started:** 2026-09-02 (session start)
- **Completed:** 2026-09-02
- **Tasks:** 3
- **Files modified:** 15 (6 created, 9 modified)

## Accomplishments

- **`updateTaskAction`** (Task 1): `PUT /boards/{boardId}/columns/{columnId}/tasks/{taskId}`, session-
  then-parse-then-upstream, with `updateTaskInputSchema` re-enforcing the 3-32 title bound
  `UpdateTaskRequestDTO` itself declares no bounds for — mirroring `taskTitleRowSchema`, the same
  schema the create path uses, so the two paths cannot drift on what a valid title is. A cleared
  description transforms to `undefined` (never a literal `""`, which T9 found the backend refuses
  with 400) rather than inventing a workaround for the backend's inability to actually clear one.
  Refreshes on both the `CONFLICT` branch (D-12) and success. A 4-case integration suite proves the
  happy update, the shared `409 OPTIMISTIC_LOCK_CONFLICT`, the two inert ancestor segments (T2), and
  the client-side bound in isolation from any network call.
- **`useUpdateTask`** (Task 2): the optimistic save hook, following ADR tech/0030 — the CURRENT
  mechanism — rather than the superseded override+staleness-guard shape `04-PATTERNS.md`'s own
  `read_first` pointed at (`use-rename-column.ts`); CLAUDE.md's corrections block for this plan said
  so explicitly, and `use-toggle-subtask.ts`/`use-move-task.ts` were the actually-shipped analogs
  followed instead. The write lands on the shared `["board", boardId]` cache entry, so the CARD
  updates the instant the modal closes — the only surface a rollback can be seen on, since the modal
  is already gone by the time the write settles (S-01). Failure is a toast, not an inline message,
  for the identical reason.
- **`EditTaskModal` + `TaskDetailModal` wiring** (Tasks 2-3): a presentational form (title,
  description, no Status control per S-02, the exact authored autosave hint under the Subtasks
  label per S-01) taking `onSubmit`/`isPending` as props and calling no hook itself. `TaskDetailModal`
  now owns the edit flow directly — local `isEditing` state plus `useUpdateTask` — swapping to
  `EditTaskModal` when the kebab's "Edit Task" item is chosen and returning to the detail view on
  either submit or cancel, the same single-caller ownership reasoning 04-17 established for
  `useToggleSubtask`. The rows section (label, hint, add-a-row button) renders with `subtaskRows`/
  `onAddSubtaskRow` props left empty for plan 04-19 to fill without changing this component's shape.

## Task Commits

Each task was committed atomically:

1. **Task 1: The update-task action, with the bounds the contract omits** — `bccb32f` (feat)
2. **Task 2: The optimistic save hook, rolling back onto the card** — `865136b` (feat)
3. **Task 3: The Edit Task modal, its autosave hint, and the kebab wiring** — `7844a85` (fix)

_Note: this plan's TDD framing produced feat/fix commits rather than separate RED/GREEN pairs — the
action, hook and modal were implemented and verified directly against real integration/browser test
suites, matching 04-17's own precedent, since the existing sibling hooks (`use-move-task.ts`,
`use-toggle-subtask.ts`) already established the exact shape to follow. Task 3's own commit is small
by design: the modal's full behaviour (validation, no Status control, the autosave hint, the
escape-while-pending guard, the kebab wiring) was already built and tested as part of Task 2's
build-out of a complete, working `EditTaskModal`/`TaskDetailModal` pairing — Task 2's own `<verify>`
block already ran `edit-task-modal.test.tsx` and `board-view.test.tsx`, which only exist in their
finished form once the modal itself is complete. Task 3 fixed one grep-visible identifier leak and
ran the full verification suite end to end._

## Files Created/Modified

- `src/features/tasks/actions/update-task-action.ts` — exports `updateTaskAction`, `UpdateTaskResult`
- `src/features/tasks/actions/update-task-action.integration.test.ts` — 4 cases against the real backend
- `src/features/tasks/hooks/use-update-task.ts` — exports `useUpdateTask`
- `src/features/tasks/components/edit-task-modal/edit-task-modal.tsx` — exports `EditTaskModal`
- `src/features/tasks/components/edit-task-modal/edit-task-modal.stories.tsx` — 4 composed stories
- `src/features/tasks/components/edit-task-modal/edit-task-modal.test.tsx` — 26 cases, both viewports
- `src/features/tasks/schemas.ts` — new exports `updateTaskInputSchema`, `editTaskFormSchema`, `EditTaskSubmitValues`
- `src/features/tasks/model.ts` — new export `applyTaskUpdate`
- `src/features/tasks/components/task-detail-modal/task-detail-modal.tsx` — owns the edit flow directly, drops `onEditTask`
- `src/features/tasks/components/task-detail-modal/task-detail-modal.stories.tsx` — drops the now-removed `onEditTask` arg
- `src/features/tasks/components/task-detail-modal/task-detail-modal.test.tsx` — kebab-to-edit-modal wiring cases
- `src/components/layout/board-view/board-view.tsx` — stops passing the now-removed `onEditTask` no-op
- `src/components/layout/board-view/board-view.test.tsx` — 3 new board-level cases (success, failure, conflict)

## Decisions Made

- `useUpdateTask` follows ADR tech/0030 (the shared query-cache write), not the superseded override
  pattern the plan's own `read_first` pointed at — per CLAUDE.md's explicit corrections block for
  this plan, and `use-toggle-subtask.ts`/`use-move-task.ts` are the shipped analogs actually mirrored.
- `TaskDetailModal` owns the edit flow (`isEditing` local state + `useUpdateTask`) directly rather
  than bubbling `onEditTask` up to `board-view.tsx` — the kebab's Edit Task item is the flow's only
  caller, the same reasoning that put `useToggleSubtask` inside `TaskDetailModal` in 04-17.
- A cleared description is sent through the create path's own blank-to-`undefined` transform, never
  a literal `""` (backend refuses with 400) and never a magic single-space workaround — T9 found no
  way to truly clear a description through this API, and a documented no-op beats a value that would
  silently revert on the next full board read.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dropped `TaskDetailModal`'s `onEditTask` prop and its two stale call sites**
- **Found during:** Task 2, while wiring the edit flow
- **Issue:** The plan's Task 3 `<files>` list names `task-detail-modal.tsx`/`.test.tsx` as modified
  but not `board-view.tsx` or `task-detail-modal.stories.tsx` — yet the design that makes the
  plan's own acceptance criterion testable from `task-detail-modal.test.tsx` alone (single-caller
  ownership, matching 04-17's `useToggleSubtask` precedent) requires removing the `onEditTask` prop
  entirely. Both `board-view.tsx` (a no-op comment call site) and `task-detail-modal.stories.tsx`
  (an `fn()` arg) still referenced it, which becomes a `tsc` excess-prop error the moment the prop
  is dropped — the identical situation 04-17's own `onToggleSubtask` removal hit.
- **Fix:** Removed the dead prop pass-through from `board-view.tsx`'s `<TaskDetailModal>` call site
  and the now-unknown `onEditTask: fn()` arg from `task-detail-modal.stories.tsx`'s `meta.args`.
- **Files modified:** `src/components/layout/board-view/board-view.tsx`, `src/features/tasks/components/task-detail-modal/task-detail-modal.stories.tsx`
- **Verification:** `tsc --noEmit` clean; `board-view.test.tsx` 178/178; `task-detail-modal.test.tsx` 34/34.
- **Committed in:** `865136b` (Task 2 commit)

**2. [Rule 3 - Blocking] `edit-task-modal.tsx`'s doc comment named `useUpdateTask` by identifier**
- **Found during:** Task 3, while re-checking the plan's own grep-based acceptance criteria
- **Issue:** The presentational-by-prop rationale comment spelled out `` `useUpdateTask` `` verbatim
  to explain why the modal doesn't call it — which made `grep -c 'useUpdateTask' edit-task-modal.tsx`
  return 1, failing the plan's own acceptance criterion that this count be 0.
- **Fix:** Reworded the comment to say "its own save hook" instead of naming the hook by identifier.
- **Files modified:** `src/features/tasks/components/edit-task-modal/edit-task-modal.tsx`
- **Verification:** `grep -c 'useUpdateTask' edit-task-modal.tsx` now returns 0; `comments:check` passes.
- **Committed in:** `7844a85` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues necessary to keep the build green
through the architectural design this plan's own testability constraints required).
**Impact on plan:** Both fixes were mechanical consequences of the single-caller ownership design and
a self-referential grep check; no scope creep.

## Issues Encountered

- **`screen.queryByRole` does not exist on `vitest-browser-react`'s `render()` return value** — its
  own `screen` is a locator-style API (`getByRole` etc.), not `@testing-library/react`'s query-style
  API. Fixed by using the `domScreen` (`@testing-library/react`'s own `screen`) import for the one
  "asserts an element does NOT exist" case, matching the pattern `add-task-modal.test.tsx` already uses.
- **An isolated `TaskDetailModal` render cannot observe its own `task.title` prop updating** — unlike
  `useToggleSubtask`, `useUpdateTask` does not subscribe to the cache for a reactive `task` override
  (nothing else needs one), so a component test with no real `board-view.tsx`/query-cache parent sees
  the ORIGINAL static `task` prop even after a successful save. Resolved by asserting the edit modal
  closed and the detail view is back (observable in isolation) in `task-detail-modal.test.tsx`, and
  reserving the "the card shows the NEW title" assertion for `board-view.test.tsx`, where a real
  query-cache-seeded parent exists to read it from — the same split 04-17 used for the toggle.

## Checkpoint Verification

No checkpoints in this plan (all three tasks are `type="auto"`).

## Gate Evidence

All exit 0: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm format:check`, `pnpm build`,
`pnpm actions:check`, `pnpm coverage:check`, `pnpm comments:check`, `pnpm folders:check`,
`pnpm renders:check`, `pnpm stories:check`, `pnpm tsx:check`. `pnpm test` — 119 files / 1801 tests,
one full run, exit 0. `pnpm test:a11y` — 37 files / 243 tests, exit 0.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

04-19 (subtask add/rename/delete) depends on this plan's `EditTaskModal` — its own Task 3 fills the
`subtaskRows`/`onAddSubtaskRow` slot this plan left empty, without changing this modal's own shape.
No blockers.

## Self-Check: PASSED

All key files (`update-task-action.ts`, `.integration.test.ts`, `use-update-task.ts`,
`edit-task-modal.tsx`, `.stories.tsx`, `.test.tsx`) and all three task commits (`bccb32f`, `865136b`,
`7844a85`) confirmed present on disk / in `git log`.

---
*Phase: 04-task-subtask-workflow*
*Completed: 2026-09-02*
