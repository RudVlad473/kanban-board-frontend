---
phase: 04-task-subtask-workflow
plan: 17
subsystem: tasks
tags: [subtasks, optimistic-ui, tanstack-query, server-actions, zod]

requires:
  - phase: 04-task-subtask-workflow
    provides: "04-15's board-detail query-cache migration (tech/0030) — the [\"board\", boardId] entry holds tasks and subtasks; 04-16's TaskDetailModal, SubtaskChecklistRow, and use-move-task.ts's second-caller pattern"
provides:
  - "SUBTASK-02 end to end: a user toggles a subtask's completion from the detail view, independent of the task's column, and the change persists"
  - "updateSubtaskAction — the ONE Server Action serving both the completion toggle (this plan) and the inline rename (04-19), carrying all four id segments, the version, and both mutable fields"
  - "useToggleSubtask — the optimistic toggle hook with a per-subtask in-flight lock, reading and writing the shared board query-cache entry, and subscribing to it directly (via its own initialData-seeded useQuery) so TaskDetailModal reflects the toggle even rendered without a BoardView parent"
  - "applySubtaskCompletion in model.ts — the pure reducer behind the optimistic write, proven independently in model.unit.test.ts"
affects: [04-19]

actuals:
  tokens: 15200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A hook that must be visible to BOTH an isolated component render (Storybook/its own test) and a shared board-level cache subscribes to that cache entry ITSELF, seeded via `initialData` built from its own caller's already-available props — `initialData` only takes effect while no entry yet exists, so a live BoardView parent's own seed always wins, and an isolated render still gets a reactive one. This is what let useToggleSubtask's checkbox-flip tests run inside task-detail-modal.test.tsx alone, without needing a BoardView wrapper."
    - "A second toggle on the same entity while the first is in flight is dropped by COMPOSITION (the pending flag disables the control), never a separate in-hook guard — proven in a browser test with `{ force: true }`, which bypasses Playwright's own actionability wait so the assertion targets Base UI's own internal disabled check rather than hanging on Playwright's guard."
    - "A story fixture that constructs `columns` and `task` as two SEPARATE calls to the same factory (sharing an id by coincidence) silently drifts once a consumer starts deriving state from `columns` instead of trusting `task` directly — task-detail-modal.stories.tsx now builds its \"Todo\" column from the SAME task object every story renders."

key-files:
  created:
    - src/features/tasks/actions/update-subtask-action.ts
    - src/features/tasks/actions/update-subtask-action.integration.test.ts
    - src/features/tasks/hooks/use-toggle-subtask.ts
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
  - "TaskDetailModal owns useToggleSubtask directly (calling it internally, like it already owns useMoveTask), rather than board-view.tsx owning it and threading onToggleSubtask/pendingSubtaskId down as props. The checklist is the toggle's only caller, unlike move (which has two: drag and the dropdown), so there is no cross-hook composition reason to lift it — matching the codebase's own precedent of putting a mutation hook wherever its callers actually are."
  - "useToggleSubtask reads its live subtasks off the shared [\"board\", boardId] cache entry via its OWN useQuery (seeded with initialData from the columns it's already given), not off the raw task prop. This follows CLAUDE.md's read_first directive to use ADR tech/0030's cache mechanism rather than reintroducing a hand-rolled local override — and it is what makes the checkbox-flip/rollback assertions observable from an isolated task-detail-modal render, since the modal itself is not otherwise a cache subscriber."
  - "The per-subtask in-flight lock is a local React state Set, not TanStack's own mutation.isPending/variables — a single useMutation() instance's aggregate state reflects only the most recent call, which cannot distinguish two subtasks toggled concurrently. onMutate/onSettled update the Set per-invocation, which TanStack does call correctly scoped even under concurrent mutateAsync calls on one mutation object."

requirements-completed: [SUBTASK-02, SYNC-01]

coverage:
  - id: D1
    description: "updateSubtaskAction: one action serving both the toggle and the rename, all four id segments written explicitly, session-then-parse-then-upstream ordering, conflict branch re-reads the board (D-12)"
    requirement: "SUBTASK-02"
    verification:
      - kind: integration
        ref: "src/features/tasks/actions/update-subtask-action.integration.test.ts (4 cases against the real deployed nonprod backend)"
        status: pass
      - kind: unit
        ref: "src/features/tasks/schemas.unit.test.ts#updateSubtaskInputSchema"
        status: pass
    human_judgment: false
  - id: D2
    description: "useToggleSubtask: optimistic flip before the write settles, per-subtask in-flight lock (same row dropped, different row independent), failure reverts, conflict raises the phase-wide toast title"
    requirement: "SUBTASK-02"
    verification:
      - kind: automated_ui
        ref: "src/features/tasks/components/task-detail-modal/task-detail-modal.test.tsx (6 new browser cases)"
        status: pass
      - kind: unit
        ref: "src/features/tasks/model.unit.test.ts#applySubtaskCompletion"
        status: pass
    human_judgment: false
  - id: D3
    description: "The board's card caption and the detail view's checklist derive from the same optimistic state: a toggle updates both in one instant, and a failure reverts both together in one case"
    requirement: "SYNC-01"
    verification:
      - kind: automated_ui
        ref: "src/components/layout/board-view/board-view.test.tsx (2 new board-level cases)"
        status: pass
    human_judgment: false

duration: ~50min
completed: 2026-09-01
status: complete
---

# Phase 4 Plan 17: The Subtask Completion Toggle Summary

**Optimistic subtask completion toggle sharing one Server Action with the rename, keyed per-subtask against the shared board query-cache entry so the card's caption and the checklist can never disagree**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-01 (session start)
- **Completed:** 2026-09-01T20:33:28Z
- **Tasks:** 3
- **Files modified:** 12 (3 created, 9 modified)

## Accomplishments

- **`updateSubtaskAction`** (Task 1): the one Server Action `PUT .../subtasks/{subtaskId}` serves —
  carrying all four id segments explicitly (three of which the generated `path` type omits and the
  backend ignores, per 04-BACKEND-FACTS.md T2), the version, and both mutable fields (`title`,
  `isCompleted`) each independently optional. Refreshes and re-reads on the conflict branch (D-12).
  A 4-case integration suite proves a completion-only write, a title-only write (the rename this
  action will also serve in 04-19), the shared `409 OPTIMISTIC_LOCK_CONFLICT`, and that the omitted
  ancestor segments are inert — all against the real deployed nonprod backend.
- **`useToggleSubtask`** (Task 2): the optimistic toggle hook, reading and writing the shared
  `["board", boardId]` query-cache entry (ADR tech/0030) — the same mechanism `useMoveTask` uses.
  The hook also subscribes to that entry itself via its own `useQuery`, seeded with `initialData`
  built from the `columns` it's already given; `initialData` only takes effect while no entry yet
  exists, so a live `BoardView` parent's own seed always wins in the real app, while an isolated
  render (a story, this hook's own test) still gets a reactive one. The in-flight lock is a local
  per-subtask `Set`, not TanStack's own aggregate mutation state (which cannot distinguish two
  concurrent calls on one `useMutation()` instance). `TaskDetailModal` now owns this hook directly,
  mirroring its existing `useMoveTask` ownership, and the dead `onToggleSubtask`/`pendingSubtaskId`
  no-op props `board-view.tsx` was threading are gone.
- **Board-level proof** (Task 3): no production code was needed here — `TaskCard` already renders
  from the same query-cache-derived `renderedColumns` `board-view.tsx` passes down, so the card's
  caption and the checklist were already single-source by construction once Tasks 1–2 landed. This
  task added the board-level tests proving it: a toggle changes the card's caption behind the modal
  in the same instant the checkbox flips, and a failure reverts BOTH together in one case (not two),
  which is the exact caption-only-rollback-miss regression the UI-SPEC names as most likely here.

## Task Commits

Each task was committed atomically:

1. **Task 1: The subtask update action** — `b475b9d` (feat)
2. **Task 2: The optimistic toggle hook, with its per-subtask lock** — `5a95136` (feat)
3. **Task 3: Make the card's caption roll back with the checkbox** — `a72493f` (test)

_Note: this plan's TDD framing produced feat/test commits rather than separate RED/GREEN pairs —
the action and hook were implemented and verified directly against real integration/browser test
suites rather than staged through a failing skeleton, since the existing sibling hooks
(`use-move-task.ts`, `use-rename-column.ts`) already established the exact shape to follow._

## Files Created/Modified

- `src/features/tasks/actions/update-subtask-action.ts` — the shared subtask update Server Action, exports `updateSubtaskAction`
- `src/features/tasks/actions/update-subtask-action.integration.test.ts` — 4 cases against the real backend
- `src/features/tasks/hooks/use-toggle-subtask.ts` — the optimistic toggle hook, exports `useToggleSubtask`
- `src/features/tasks/schemas.ts` — new export `updateSubtaskInputSchema`
- `src/features/tasks/model.ts` — new export `applySubtaskCompletion`
- `src/features/tasks/components/task-detail-modal/task-detail-modal.tsx` — owns `useToggleSubtask` directly, drops the two no-op props
- `src/features/tasks/components/task-detail-modal/task-detail-modal.stories.tsx` — fixture columns now embed the same task object every story renders
- `src/components/layout/board-view/board-view.tsx` — stops threading the removed `onToggleSubtask`/`pendingSubtaskId` props
- `src/components/layout/board-view/board-view.test.tsx` — 2 new board-level cases proving card/checklist consistency

## Decisions Made

- `TaskDetailModal` owns `useToggleSubtask` directly rather than board-view threading it down — the checklist is the toggle's only caller, unlike move's two callers (drag + dropdown), so there's no composition reason to lift it.
- `useToggleSubtask` subscribes to the shared cache itself (via its own `initialData`-seeded `useQuery`) rather than trusting the `task` prop for subtask state — this is what makes the hook's own tests observable in isolation while staying on ADR tech/0030's cache mechanism, per CLAUDE.md's explicit directive to follow the existing mechanism rather than reintroduce a hand-rolled override.
- The in-flight lock is a local `Set<string>` state, not TanStack's aggregate `mutation.isPending`/`variables` — a single `useMutation()` instance's aggregate state can't distinguish two subtasks toggled concurrently, which the acceptance criteria require.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed a fixture-drift bug in `task-detail-modal.stories.tsx` surfaced by the new query-cache-subscribing hook**
- **Found during:** Task 2, first browser test run
- **Issue:** `FIXTURE_COLUMNS`'s own "Todo" column held a SEPARATE `createTaskFull()` call sharing the same default id as the story's own `task` arg, but with different (1-subtask, default) content. Once `useToggleSubtask` began deriving subtasks from `columns` (needed for isolated-render reactivity), the modal rendered the WRONG subtask list — 1 checkbox instead of 3.
- **Fix:** Rebuilt the story fixture so every story's "Todo" column embeds the SAME task object the story itself renders (`createFixtureColumns(task)`), never a separately-constructed stand-in.
- **Files modified:** `src/features/tasks/components/task-detail-modal/task-detail-modal.stories.tsx`
- **Verification:** All 32 cases in `task-detail-modal.test.tsx` pass at both viewports.
- **Committed in:** `5a95136` (Task 2 commit)

**2. [Rule 3 - Blocking] `board-view.tsx` still passed the removed `onToggleSubtask` prop**
- **Found during:** Task 2, after dropping the prop from `TaskDetailModal`'s public API
- **Issue:** `TaskDetailModal` no longer accepts `onToggleSubtask`/`pendingSubtaskId` (now owned internally), but `board-view.tsx`'s JSX still passed a no-op `onToggleSubtask` — a `tsc` error (excess JSX prop).
- **Fix:** Removed the dead prop from the `<TaskDetailModal>` call site.
- **Files modified:** `src/components/layout/board-view/board-view.tsx`
- **Verification:** `tsc --noEmit` clean; `board-view.test.tsx` 174/174.
- **Committed in:** `5a95136` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues necessary to keep the build green through the architectural design this plan required).
**Impact on plan:** Both fixes were mechanical consequences of the cache-subscribing hook design; no scope creep.

## Issues Encountered

- **Playwright's `locator.click()` hangs, rather than no-ops, on a genuinely disabled ARIA control.** The "second press on the same row is dropped" test originally called `userEvent.click()` a second time on the now-disabled checkbox and hit a 15s timeout, because Playwright's actionability wait retries indefinitely for the element to become enabled rather than failing fast. Fixed by using `{ force: true }` on the second click, which bypasses Playwright's own guard and lets the assertion target Base UI's own internal disabled check instead — the thing the test actually needed to prove.

## Checkpoint Verification

No checkpoints in this plan (all three tasks are `type="auto"`).

## Gate Evidence

All exit 0: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm routes:check`, `pnpm handlers:check`, `pnpm stories:check`, `pnpm comments:check`, `pnpm tsx:check`, `pnpm renders:check`, `pnpm folders:check`, `pnpm actions:check`, `pnpm coverage:check`. `pnpm test` — 116 files / 1744 tests, one full run, exit 0. `pnpm exec playwright test --project e2e --repeat-each=3 --workers=2` — 138 passed (46 × 3), exit 0.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

04-19 (subtask add/rename/delete) depends on this plan's `updateSubtaskAction` — its rename hook
(`use-rename-subtask.ts`) calls the SAME action this plan built, sending only `title` where this
plan's toggle sends only `isCompleted`. No blockers.

## Self-Check: PASSED

All key files (`update-subtask-action.ts`, `.integration.test.ts`, `use-toggle-subtask.ts`) and all
three task commits (`b475b9d`, `5a95136`, `a72493f`) confirmed present on disk / in `git log`.

---
*Phase: 04-task-subtask-workflow*
*Completed: 2026-09-01*
