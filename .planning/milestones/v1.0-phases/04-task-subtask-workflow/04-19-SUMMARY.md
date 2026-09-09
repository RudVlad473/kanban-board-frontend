---
phase: 04-task-subtask-workflow
plan: 19
subsystem: tasks
tags: [subtasks, optimistic-ui, tanstack-query, server-actions, zod, react-hook-form]

requires:
  - phase: 04-task-subtask-workflow
    provides: "04-17's updateSubtaskAction and use-toggle-subtask.ts (the shared subtask update operation and the ADR tech/0030 cache-write pattern); 04-18's EditTaskModal with the subtaskRows/onAddSubtaskRow slot left empty for this plan"
provides:
  - "SUBTASK-01, SUBTASK-03, SUBTASK-04 end to end: a user adds, inline-renames and deletes a subtask from the Edit Task modal, each its own immediate mutation with its own rollback, none of it behind Save Changes"
  - "deleteSubtaskAction — SUBTASK-04's Server Action, DELETE on SUBTASK_DETAIL, no version (the endpoint takes none), no confirm step (a subtask destroys nothing beneath it)"
  - "useCreateSubtask / useRenameSubtask / useDeleteSubtask — the three ADR tech/0030 cache-write hooks, each with a per-entity in-flight lock"
  - "SubtaskEditorRow — the live/draft editable row, committing on blur or Enter, calling no hook itself"
  - "EditTaskModal now renders live subtask rows driven by its own mutation hooks, and a draft row committed via create becomes a live row with no visible seam"
affects: [04-20, 04-21, 04-22]

actuals:
  tokens: 21741
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A create mutation's optimistic insert uses a client-generated id (crypto.randomUUID()) as the placeholder subtask's id, inserted via a pure `with*Insert` reducer on onMutate and swapped for the server's real id via `with*Remove` + `with*Insert` composed together on onSuccess — the whole-board snapshot restore on onError removes the placeholder for free, with no bespoke undo path."
    - "A row component that must restore its own value AND refocus after a failed commit does so by remounting itself (a local retry-token state used as `key`) with `autoFocus` on the remount, rather than reaching for a ref or an effect — the commit handler is a single async event-handler function with no lifecycle hook involved."
    - "One modal component (EditTaskModal) is the sanctioned, documented exception to the presentational-by-prop rule every sibling modal follows: its title/description save still takes onSubmit as a prop, but its subtask rows are the one place it owns mutation hooks directly, because there is no other single caller for them to live in."
    - "A create/rename/delete hook resolves its target's columnId (and, for rename, the current version) from the query cache AT CALL TIME via queryClient.getQueryData, matching useUpdateTask/useMoveTask, rather than taking columns as a prop — only the ONE hook that must render a reactive row list (useCreateSubtask, which owns EditTaskModal's own subtasks read) takes columns, mirroring useToggleSubtask's identical reasoning."

key-files:
  created:
    - src/features/tasks/actions/delete-subtask-action.ts
    - src/features/tasks/actions/delete-subtask-action.integration.test.ts
    - src/features/tasks/hooks/use-create-subtask.ts
    - src/features/tasks/hooks/use-rename-subtask.ts
    - src/features/tasks/hooks/use-delete-subtask.ts
    - src/features/tasks/components/subtask-editor-row/subtask-editor-row.tsx
    - src/features/tasks/components/subtask-editor-row/subtask-editor-row.stories.tsx
    - src/features/tasks/components/subtask-editor-row/subtask-editor-row.test.tsx
  modified:
    - src/features/tasks/schemas.ts
    - src/features/tasks/schemas.unit.test.ts
    - src/features/tasks/model.ts
    - src/features/tasks/model.unit.test.ts
    - src/features/tasks/components/edit-task-modal/edit-task-modal.tsx
    - src/features/tasks/components/edit-task-modal/edit-task-modal.stories.tsx
    - src/features/tasks/components/edit-task-modal/edit-task-modal.test.tsx
    - src/features/tasks/components/task-detail-modal/task-detail-modal.tsx
    - src/components/layout/board-view/board-view.stories.tsx
    - src/components/layout/board-view/board-view.test.tsx

key-decisions:
  - "The optimistic mechanism is ADR tech/0030 (the query-cache write) throughout, per the dispatch's explicit correction block — no override store, no staleness guard against a previous server value, no useEffect. All three hooks follow the shipped use-toggle-subtask.ts/use-update-task.ts/use-move-task.ts shape exactly."
  - "deleteSubtaskInputSchema carries no version field, matching deleteColumnInputSchema exactly — the DELETE endpoint's OpenAPI operation takes no request body, so there is nothing for a client to be stale against. The CONFLICT branch stays in DeleteSubtaskResult for symmetry/defensiveness but is unreachable from a real version mismatch on this path."
  - "EditTaskModal owns the three subtask hooks directly rather than TaskDetailModal owning them and threading rows down as a ReactNode slot — Task 3's own file list (edit-task-modal.tsx/.test.tsx, task-card.tsx) and action text ('where a hook must be owned here rather than passed in, say so in a comment') pointed at this shape, and it keeps the draft-row local state (client-generated ids for not-yet-committed rows) co-located with the rows it renders."
  - "SubtaskEditorRow restores its value and refocuses after a failed commit via a local retry-token remount + autoFocus, never a ref forwarded through TextField (TextField's own Props type is not ComponentPropsWithRef, and no in-repo precedent forwards a ref through it) and never a useEffect (barred by the dispatch's optimistic-mechanism block for the mutation hooks, and avoided here too for consistency)."
  - "The 404 ENTITY_NOT_FOUND code this app's own backend returns on a double-delete is not in PROBLEM_CODE's enum (a pre-existing gap shared with deleteColumnAction, 03-BACKEND-FACTS R7) — the integration test reads the raw response body's code field directly rather than through parseProblemDetail, which would report null for it. Not fixed here; out of this plan's scope."

requirements-completed: [SUBTASK-01, SUBTASK-03, SUBTASK-04, SYNC-01]

coverage:
  - id: D1
    description: "deleteSubtaskAction: session-then-parse-then-upstream DELETE on SUBTASK_DETAIL, all four path segments written explicitly, D-12 refresh on CONFLICT, nothing parsed back"
    requirement: "SUBTASK-04"
    verification:
      - kind: integration
        ref: "src/features/tasks/actions/delete-subtask-action.integration.test.ts (2 cases against the real deployed nonprod backend: happy delete, double-delete 404)"
        status: pass
      - kind: unit
        ref: "src/features/tasks/schemas.unit.test.ts#deleteSubtaskInputSchema"
        status: pass
    human_judgment: false
  - id: D2
    description: "useCreateSubtask/useRenameSubtask/useDeleteSubtask: each optimistic, each rolling back to exactly the prior state, each with a per-entity in-flight lock; a failed delete reinstates the row at its original index for free via the whole-board snapshot restore"
    requirement: "SUBTASK-01, SUBTASK-03, SUBTASK-04"
    verification:
      - kind: unit
        ref: "src/features/tasks/model.unit.test.ts#withSubtaskInsert, #withSubtaskRename, #withSubtaskRemove"
        status: pass
      - kind: automated_ui
        ref: "src/features/tasks/components/edit-task-modal/edit-task-modal.test.tsx (32 cases, both viewports, including the add/rename/remove tracer case and the empty-shape case)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SubtaskEditorRow: commits on blur/Enter when changed and non-empty, no-ops on an unchanged blur, shows the required-field message on an empty blur, disambiguating remove accessible name, own-row-only busy state"
    requirement: "SUBTASK-01, SUBTASK-03"
    verification:
      - kind: automated_ui
        ref: "src/features/tasks/components/subtask-editor-row/subtask-editor-row.test.tsx (20 cases, both viewports)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The card's caption follows every subtask add/rename/delete in the same instant a cache write lands, and reverts together with a failed delete's row reinstatement"
    requirement: "SYNC-01"
    verification:
      - kind: automated_ui
        ref: "src/components/layout/board-view/board-view.test.tsx (1 new board-level case proving the delete-rollback/caption pairing; task-card.tsx itself needed no change)"
        status: pass
    human_judgment: false

duration: ~110min
completed: 2026-09-02
status: complete
---

# Phase 4 Plan 19: The Delete-Subtask Action, the Live Editable Row, and Per-Item Saves Summary

**Add, inline-rename and delete a subtask from the Edit Task modal, each its own immediate optimistic mutation with its own rollback — three new hooks, one new action, and a live editable row that becomes the modal's own subtask surface**

## Performance

- **Duration:** ~110 min
- **Started:** 2026-09-02 (session start)
- **Completed:** 2026-09-02
- **Tasks:** 3
- **Files modified:** 18 (8 created, 10 modified)

## Accomplishments

- **`deleteSubtaskAction` + the three hooks** (Task 1): the delete action mirrors `deleteColumnAction`
  exactly — session, then parse, then a `DELETE` with all four path segments written explicitly
  (three of them inert per 04-BACKEND-FACTS.md T2, kept anyway as the documented URL), `refresh()`
  on success, `refresh()` on the (defensive, currently unreachable) `CONFLICT` branch. `useCreateSubtask`,
  `useRenameSubtask` and `useDeleteSubtask` follow ADR tech/0030's cache-write triple exactly: `onMutate`
  cancels queries, snapshots `["board", boardId]`, and writes optimistically via a new pure `model.ts`
  reducer; `onError` restores the snapshot (which is also the delete's own "reinstate at original
  index" mechanism — nothing bespoke); `onSuccess` merges the server response. `withSubtaskInsert`,
  `withSubtaskRename` and `withSubtaskRemove` join `withSubtaskCompletion`/`withTaskUpdate` in `model.ts`,
  same naming, same shape. Create's optimistic row uses a client-generated id as a placeholder,
  swapped for the server's real id/version on success via `withSubtaskRemove` + `withSubtaskInsert`
  composed together.
- **`SubtaskEditorRow`** (Task 2): the row IS the text field (S-03) — committing a rename on blur or
  Enter when its value changed and is non-empty, showing the required-field message and committing
  nothing on an empty blur, doing nothing on an unchanged blur. `isDraft` is caller-supplied and gates
  only the seeded placeholder text, never inferred. A failed commit restores the prior value and
  refocuses via a local retry-token remount with `autoFocus` — no ref, no effect, matching CLAUDE.md's
  "reach for the platform's own primitive" directive by simply not needing either. The remove control's
  accessible name interpolates the row's own live-typed title, falling back to the row's own label when
  blank.
- **`EditTaskModal` wired to real hooks, `task-detail-modal.tsx` threading `boardId`/`columns` through**
  (Task 3): `EditTaskModal` is now the one modal in this codebase that owns mutation hooks directly —
  a documented, scoped exception to the presentational-by-prop rule every sibling modal follows, kept
  to the subtask surface only. Live subtasks render as `SubtaskEditorRow`s reading reactively off the
  shared board cache (mirroring `useToggleSubtask`'s own reactive-read pattern); local draft rows (a
  `crypto.randomUUID()` client id, never touching the cache until first commit) render alongside them
  and promote to live automatically once their create succeeds. The `subtaskRows`/`onAddSubtaskRow`
  slot props 04-18 left empty are gone, replaced by direct `boardId`/`columns` props.
  `board-view.test.tsx` gained one new case proving a failed subtask delete reinstates the row at its
  original index AND reverts the card's caption in the same case — `task-card.tsx` itself needed no
  production change, since its caption already derives from the same cache-backed `task` prop every
  other subtask mutation already writes through (mirroring 04-17's identical finding for the toggle).

## Task Commits

Each task was committed atomically:

1. **Task 1: The delete-subtask action and the three hooks** — `7d3865c` (feat)
2. **Task 2: The live editable subtask row** — `8081e21` (feat)
3. **Task 3: Fill the edit modal's rows slot and prove the per-item semantics** — `80e7d35` (feat)

## Files Created/Modified

- `src/features/tasks/actions/delete-subtask-action.ts` — exports `deleteSubtaskAction`, `DeleteSubtaskResult`
- `src/features/tasks/actions/delete-subtask-action.integration.test.ts` — 2 cases against the real backend
- `src/features/tasks/hooks/use-create-subtask.ts` — exports `useCreateSubtask`
- `src/features/tasks/hooks/use-rename-subtask.ts` — exports `useRenameSubtask`
- `src/features/tasks/hooks/use-delete-subtask.ts` — exports `useDeleteSubtask`
- `src/features/tasks/components/subtask-editor-row/subtask-editor-row.tsx` — exports `SubtaskEditorRow`
- `src/features/tasks/components/subtask-editor-row/subtask-editor-row.stories.tsx` — 4 composed stories
- `src/features/tasks/components/subtask-editor-row/subtask-editor-row.test.tsx` — 20 cases, both viewports
- `src/features/tasks/schemas.ts` — new export `deleteSubtaskInputSchema`
- `src/features/tasks/model.ts` — new exports `withSubtaskInsert`, `withSubtaskRename`, `withSubtaskRemove`, `SUBTASK_ROW_REQUIRED_FIELD_MESSAGE`
- `src/features/tasks/components/edit-task-modal/edit-task-modal.tsx` — owns the three subtask hooks directly, new `boardId`/`columns` props, drops `subtaskRows`/`onAddSubtaskRow`
- `src/features/tasks/components/edit-task-modal/edit-task-modal.stories.tsx` — `Populated`/`SingleSubtask` stories added
- `src/features/tasks/components/edit-task-modal/edit-task-modal.test.tsx` — 32 cases, including the add/rename/remove tracer case
- `src/features/tasks/components/task-detail-modal/task-detail-modal.tsx` — threads `boardId`/`columns` into `EditTaskModal`
- `src/components/layout/board-view/board-view.stories.tsx` — `TaskWithMultipleSubtasks` story added
- `src/components/layout/board-view/board-view.test.tsx` — 1 new case (delete-rollback + caption)

## Decisions Made

- ADR tech/0030 (the query-cache write) governs every new hook, per the dispatch's explicit
  correction block — no override store, no staleness guard, no `useEffect`.
- `deleteSubtaskInputSchema` carries no `version` (the endpoint takes none); `DeleteSubtaskResult`
  keeps a `CONFLICT` branch for symmetry with the other subtask writes, though it is currently
  unreachable from a real version mismatch on this path.
- `EditTaskModal` owns the three subtask hooks directly — the documented, scoped exception to the
  presentational-by-prop rule, kept to the subtask rows only; title/description save still takes
  `onSubmit` as a prop.
- `SubtaskEditorRow` restores value/focus after a failed commit via a retry-token remount with
  `autoFocus`, never a ref (no in-repo precedent forwards one through `TextField`) and never an effect.
- The 404 `ENTITY_NOT_FOUND` code is absent from this app's own `PROBLEM_CODE` enum (a pre-existing
  gap shared with `deleteColumnAction`) — the integration test reads the raw body directly rather
  than through `parseProblemDetail`. Not fixed here; out of scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Threaded `boardId`/`columns` into `EditTaskModal` from `task-detail-modal.tsx`, not listed in Task 3's own `<files>`**
- **Found during:** Task 3
- **Issue:** Filling the rows slot with hooks that read/write the shared board cache entry requires
  `boardId` and `columns`, which only `task-detail-modal.tsx` has readily available — but Task 3's
  `<files>` list names only `edit-task-modal.tsx`/`.test.tsx` and `task-card.tsx`. The plan's own
  action text anticipated this ("where a hook must be owned here rather than passed in, say so in a
  comment"), which is exactly what the deviation is: EditTaskModal owns the hooks, task-detail-modal
  supplies their inputs.
- **Fix:** Added `boardId={boardId}` and `columns={columns}` to `<EditTaskModal>`'s call site in
  `task-detail-modal.tsx`; no other change to that file.
- **Files modified:** `src/features/tasks/components/task-detail-modal/task-detail-modal.tsx`
- **Verification:** `tsc --noEmit` clean; `task-detail-modal.test.tsx` and `board-view.test.tsx` both
  green (220 combined cases).
- **Committed in:** `80e7d35` (Task 3 commit)

**2. [Rule 3 - Blocking] `board-view.stories.tsx`/`.test.tsx` needed a multi-subtask fixture and a new case, not listed in Task 3's own `<files>`**
- **Found during:** Task 3
- **Issue:** The plan's own acceptance criterion — "a single browser case asserts a failed delete
  reinstates the row at its ORIGINAL index and reverts the card's caption" — can only be proved where
  the card's caption exists (`board-view.test.tsx`), and needs a task with 2+ subtasks to distinguish
  "reinstated at its original index" from "reinstated somewhere." Neither the story fixture nor the
  test file appear in Task 3's `<files>`, an omission of the same shape 04-17/04-18 both hit and
  auto-fixed.
- **Fix:** Added the `TaskWithMultipleSubtasks` story and one new `board-view.test.tsx` case.
- **Files modified:** `src/components/layout/board-view/board-view.stories.tsx`, `src/components/layout/board-view/board-view.test.tsx`
- **Verification:** `board-view.test.tsx` 184/184 pre-existing plus the new case, all green.
- **Committed in:** `80e7d35` (Task 3 commit)

**3. [Rule 1 - Bug] `getByLabelText` in `edit-task-modal.test.tsx` ambiguously matched both a subtask row's input and its remove button**
- **Found during:** Task 3, first browser test run of the tracer case
- **Issue:** `screen.getByLabelText("Subtask 1")` resolved to two elements — the row's own `<input>`
  (via `aria-labelledby`) and its remove `<button aria-label="Remove subtask 'Fixture Subtask 1'">`,
  whose accessible name contains "Subtask 1" as a substring.
- **Fix:** Switched to `screen.getByRole("textbox", { name: "Subtask 1" })`, which is role-scoped and
  unambiguous.
- **Files modified:** `src/features/tasks/components/edit-task-modal/edit-task-modal.test.tsx`
- **Verification:** All 32 cases in that suite pass at both viewports.
- **Committed in:** `80e7d35` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 3 — blocking gaps in the plan's own `<files>` lists,
mirroring 04-17/04-18's identical precedent; 1 Rule 1 — a genuine test-authoring bug found and fixed
before it ever reached the plan's own verification gate).
**Impact on plan:** All three were mechanical consequences of wiring real hooks into a modal the plan's
own `<files>` list under-scoped; no architectural drift and no scope creep.

## Issues Encountered

- **A DOM `.blur()` call on a `vitest-browser-react` locator's `.element()` did not fire a real blur
  event in the real Chromium runner**, even though the identical call succeeds when the target came
  from `@testing-library/react`'s own `screen`. Resolved by using `userEvent.tab()` instead, the
  established in-repo pattern for triggering a real blur via a real focus change.
- **Two simultaneous `render()` calls in one test resolve `getByRole` ambiguously** — `vitest-browser`
  locators query the whole page, not a per-render container, so two mounted `SubtaskEditorRow`
  instances collide on an unscoped query. Resolved by scoping with `@testing-library/react`'s
  `within(container)`, the same fix `subtask-checklist-row.test.tsx`'s light/dark test already uses
  for the identical reason.

## Checkpoint Verification

No checkpoints in this plan (all three tasks are `type="auto"`).

## Gate Evidence

All exit 0: `pnpm exec tsc --noEmit`, `pnpm lint` (via targeted `eslint` runs on every changed file),
`pnpm exec prettier --check` (via targeted runs on every changed file), `pnpm build`, `pnpm actions:check`,
`pnpm coverage:check`, `pnpm comments:check`, `pnpm folders:check`, `pnpm renders:check`,
`pnpm stories:check`, `pnpm tsx:check`. `pnpm test` — 122 files / 1850 tests, one full run, exit 0.
`pnpm test:a11y` — 38 files / 250 tests, exit 0.

**e2e was NOT run in this dispatch.** The sequential-executor prompt explicitly instructed skipping
`pnpm test:e2e`/any Playwright `e2e` project run, because a local run wipes the shared nonprod backend
via `/admin/reset`. This overrides the plan's own `<verify>`/acceptance line naming
`pnpm exec playwright test --project e2e --repeat-each=3 --workers=2` — that command was not executed
and its pass/fail is unverified by this plan run. The orchestrator should schedule it separately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

SUBTASK-01, SUBTASK-03, SUBTASK-04 and SYNC-01 (for this plan's three paths) are complete. 04-20
(task delete, with its confirm modal) and later plans depending on a complete subtask CRUD surface
have no blockers from this plan. e2e coverage for the three new mutations (add/rename/delete a
subtask through the real running app) is outstanding and should be run before the phase is
considered fully verified.

## Self-Check: PASSED

All key files (`delete-subtask-action.ts`, `.integration.test.ts`, `use-create-subtask.ts`,
`use-rename-subtask.ts`, `use-delete-subtask.ts`, `subtask-editor-row.tsx`, `.stories.tsx`,
`.test.tsx`) and all three task commits (`7d3865c`, `8081e21`, `80e7d35`) confirmed present on disk /
in `git log`.

---
*Phase: 04-task-subtask-workflow*
*Completed: 2026-09-02*
