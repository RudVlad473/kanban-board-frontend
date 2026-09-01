---
phase: 04-task-subtask-workflow
plan: 15
subsystem: ui
tags: [server-actions, zod, react-hook-form, tanstack-query, base-ui, next-cache, optimistic-ui]

requires:
  - phase: 04-task-subtask-workflow
    provides: "04-12/13/14's task drag, move action and task-card; the boards feature's createColumnAction + createBoardColumnsAction fan-out shape"
provides:
  - "TASK-01 end to end: createTaskAction posting to the counter-intuitive column resource path, the Add New Task modal, and the header's single create entry point"
  - "SUBTASK-01's create half: createSubtaskAction and createTaskSubtasksAction's sequential fan-out, keeping every subtask that landed on a partial failure"
  - "The board-detail read on the TanStack Query cache (docs/adr/tech/0030), replacing the three-hook optimistic `columns` chain and both client override providers"
  - "requireAuthenticated() — one Exclude-narrowing guard replacing the unauthenticated-redirect block repeated across the async Server Components"
affects: [04-16, 04-17, 04-18, 04-19, 04-20, 04-21, 04-22, any-plan-reading-the-board-entry]

actuals:
  tokens: n/a
  tasks: 4
  commits: 40

tech-stack:
  added: []
  patterns:
    - "A create POST whose URL names no child resource: `addTaskByColumnId` posts to the COLUMN path itself; the sibling path that does name `/tasks` refuses a POST. The action carries a comment saying so, because it reads like a mistake (Pitfall 1)."
    - "Every URL segment is written into the path parameters explicitly, including the board ancestor the generated type omits — the serializer skips a missing path parameter rather than throwing (Pitfall 2)."
    - "Client-orchestrated multi-child create: post the parent, then each non-blank child sequentially, keeping whatever landed. The array is capped at the action boundary (50, matching createBoardColumnsInputSchema) so a forged payload cannot drive an unbounded fan-out (T-04-04)."
    - "A modal mounted only while open takes `onClose`, not `isOpen`/`onOpenChange` — Base UI's open contract lives inside the component, and the `true` branch of a caller's `onOpenChange` is unreachable by construction."
    - "A header control that outlives a board-to-board navigation stores the board it was opened on, not a boolean — otherwise an open modal survives the navigation and submits the previous board's `columnId`."
    - "Cross-boundary reads go through the query cache, not a client provider: `useOpenBoardColumns` reads the same `[\"board\", boardId]` entry `BoardView` reads, with `skipToken` keeping it a pure cache read (docs/adr/tech/0030)."

key-files:
  created:
    - src/features/tasks/actions/create-task-action.ts
    - src/features/tasks/actions/create-subtask-action.ts
    - src/features/tasks/actions/create-task-subtasks-action.ts
    - src/features/tasks/hooks/use-create-task.ts
    - src/features/tasks/hooks/use-open-board-columns.ts
    - src/features/tasks/components/add-task-modal/add-task-modal.tsx
    - src/features/tasks/components/add-task-button/add-task-button.tsx
    - src/features/boards/queries/board-query.ts
    - src/features/boards/queries/boards-query.ts
    - src/features/boards/server/dehydrate-board.ts
    - src/features/boards/server/dehydrate-boards.ts
    - src/features/boards/actions/get-board-action.ts
    - src/features/boards/actions/get-boards-action.ts
    - src/lib/core/query-keys/board-query-key.ts
    - src/lib/server/require-authenticated.ts
    - src/components/layout/board-view/use-board-drag-session.ts
    - src/components/layout/board-view/use-new-column-reveal.ts
    - docs/adr/tech/0029-optimistic-writes-via-the-ui.md
    - docs/adr/tech/0030-optimistic-writes-via-the-query-cache.md
  modified:
    - src/features/tasks/schemas.ts
    - src/features/tasks/model.ts
    - src/components/layout/board-view/board-view.tsx
    - src/components/layout/dashboard-header/dashboard-header.tsx
    - app/(dashboard)/layout.tsx
    - app/(dashboard)/boards/[boardId]/page.tsx
    - app/(dashboard)/boards/page.tsx
    - src/features/boards/hooks/use-rename-column.ts
    - src/features/boards/hooks/use-reorder-columns.ts
    - src/features/tasks/hooks/use-move-task.ts
    - CONVENTIONS.md
    - CLAUDE.md
  deleted:
    - src/features/boards/components/rename-override-provider/rename-override-provider.tsx
    - src/features/tasks/components/task-creation-provider/task-creation-provider.tsx

key-decisions:
  - "The plan's `TaskCreationProvider` client bridge was BUILT (6ad4857), renamed (2bc9ce5), and then DELETED (eca1c7c). The board-detail cache migration made it redundant: the header can read the same `[\"board\", boardId]` entry `BoardView` reads. This is the plan's largest deviation and it reverses one of its own must_haves."
  - "The board detail read moved off RSC props onto the query cache (tech/0030), superseding tech/0029. This was not in the plan — it came out of the review batch — but every later plan in the phase now depends on it."
  - "04-15's blocking checkpoint was deliberately held OPEN across the review batch by user choice, so this SUMMARY describes what actually shipped rather than what the three implementation commits alone shipped."
---

# Phase 4 Plan 15: Task Creation, the Add Task Modal, and the Review Batch That Followed

## Performance

- Tasks: 4 (3 implementation + 1 blocking `checkpoint:human-verify`)
- Commits: 40 in scope (`8aecd20..HEAD`, excluding the phase-05 design docs)
- Sessions: 4 — the plan's own execution, then three review/repair sessions on the same branch

## Accomplishments

### The plan as written (tasks 1-3)

TASK-01 and SUBTASK-01's create half landed as planned, TDD RED-then-GREEN throughout:

- **`createTaskAction`** posts to the column resource path itself. The sibling path that names
  `/tasks` is read-only and returns a method error, so the existing column-detail literal is the
  create target (RESEARCH Pitfall 1). Every ancestor segment including the board is written
  explicitly, because the serializer silently skips a missing path parameter rather than throwing
  (Pitfall 2). Session check, then `.safeParse`, then the upstream call — the order
  `createColumnAction` already uses (T-04-01, T-04-02).
- **`createSubtaskAction` + `createTaskSubtasksAction`** implement D-07's sequential fan-out:
  post the task, then each non-blank subtask one at a time, keeping everything that landed on a
  partial failure. `titles` is capped at 50 at the action boundary, the same limit
  `createBoardColumnsInputSchema` uses, so a forged payload cannot drive an unbounded fan-out
  (T-04-04).
- **`AddTaskModal`** opens with exactly two blank subtask rows (matching the mock's own seeding),
  omits a blank row from the post sequence rather than validation-blocking it, and lets both rows
  be removed — a task with no subtasks is valid. Each row's remove control interpolates that row's
  title into its accessible name, because N glyph-only controls in one modal are otherwise
  indistinguishable. The modal takes its submit handler as a **prop** and calls no hook of its own,
  which is what lets its behavioural test drive it with a real local function instead of a module
  mock.
- **The header create button** is the single entry point (S-06), disabled when the open board has
  zero columns.

### What the review batch changed on top

Task 4's checkpoint was held open while seven user review comments and an external code review were
worked through. That work reversed one of the plan's own design decisions and is the more important
half of what shipped:

- **The add-task bridge was deleted** (`eca1c7c`). The plan's premise was that the header cannot
  reach the open board's columns, so a client provider must carry them across two streaming
  boundaries. The board-detail cache migration removed the premise: `useOpenBoardColumns` reads the
  same `["board", boardId]` entry `BoardView` reads, with `skipToken` keeping it a pure cache read.
  `TaskCreationProvider` / `AddTaskProvider` is gone.
- **The board detail read moved onto the query cache** (`3089a6a`, ADR `tech/0030`, superseding
  `tech/0029`). `BoardView` reads one entry hydrated by `dehydrateBoard()`; the rename, reorder and
  move hooks all write it. The three-hook `renamedColumns → reorderedColumns → renderedColumns`
  chain, `useOptimisticVariables`, and both `apply*Pending*` folds are gone.
- **All four optimistic writes unified** on TanStack Query's "via the UI" approach (`9fc3d88`),
  then onto the cache (`3089a6a`). `RenameOverrideProvider`, `RenameOverrideContext` and both
  `apply*Override` helpers deleted.
- **`requireAuthenticated(result)`** (`f0f8dac`) replaces the repeated unauthenticated-redirect
  guard. A plain function, not a hook — every call site is an async Server Component. It narrows the
  union via `Exclude`, which is the real value.
- **Review items #5 and #7** (`022e04e`, `7939718`): both column modals now take `onClose` rather
  than an always-`true` `isOpen`; `board-view.tsx` went 466 → 321 lines via `useBoardDragSession`
  and `useNewColumnReveal`.
- **One shared e2e sign-up helper** (`c309d57`) replaces the UI sign-up sequence duplicated across
  7 call sites in 3 specs.

### Defects found and fixed on the way

None of these were plan deviations — they were real bugs the review work exposed:

1. **Tasks and subtasks were being dropped.** `onSuccess` assigned tasks-less/subtask-less mutation
   responses over `ColumnFull`/`TaskFull`. Caught by the third `tsc` error, which was a real defect
   rather than a type nuisance.
2. **`buildBoardQueryKey` was `"use client"`** while `dehydrateBoard()` calls it from the server.
   Found only by driving the running app.
3. **A task moved into an EMPTY column announced nothing** on either the keyboard or the pointer
   path (`5212cc7`) — `createTaskMoveAnnouncements` resolved its target by searching for a TASK, and
   an empty column arrives as its BODY droppable. No test caught it: every keyboard cross-column
   case uses a fixture where the destination holds a card, and the one empty-destination fixture was
   only ever driven by the pointer test, which never asserts the announcement.
4. **The add-task modal survived a board-to-board navigation** (`b42ff52`) and would have submitted
   the previous board's `columnId`. Fixed by storing the board the modal was opened on rather than a
   boolean.
5. **The retry double-click guard, an unmemoised context value, and UNAUTHENTICATED collapsing into
   "all subtasks failed"** (`2bc9ce5`).
6. **A real axe colour-contrast defect** in the shipped `isDragging` treatment, exposed by a new
   backstop story.
7. **A `sortable-column` reorder-rollback test race** (`252c5b3`) — misread as a `useOptimistic`
   regression for a whole session. `useReorderColumns` raises the toast inside the transition's async
   body, but `useOptimistic` drops the optimistic order only when the transition *completes*; the
   test polled for the toast then read the order synchronously. Proved by the never-flaking polled
   sibling at `board-view.test.tsx:1423`, six consecutive green full runs, and a negative control
   that fails by timeout.

## Task Commits

| Task | Commit(s) | What |
|------|-----------|------|
| 1 — schemas + actions | `8134599` RED, `a2bb50b` GREEN | `createTaskAction`, `createSubtaskAction`, `createTaskSubtasksAction` |
| 2 — model helpers | `82966fe`/`8a70547`, `762a0ef`/`01fdce5`, `459ec5d`/`fcf438a` | subtask-row helpers, `addTaskFormSchema`, `toSubtaskRowPlaceholder` |
| 3 — modal + entry point | `2e1dda6`, `6ad4857` | `AddTaskModal`, `useCreateTask`, header create button |
| 4 — checkpoint | (held open; see below) | blocking `checkpoint:human-verify` |
| review batch | `c309d57` … `475781c` (31 commits) | see Accomplishments |

## Deviations from Plan

### Reversed: the client bridge (must_have contradicted)

The plan asserted as a must_have that "the header does not know the open board's columns today …
the columns are published from the layout-ring board view into a client provider mounted in the
dashboard layout." That was true when the plan was written and is false now. The provider was built,
shipped, renamed, then deleted once the board-detail cache migration gave the header a real source.
`CONVENTIONS.md` was corrected twice on the way — once to record the bridge as a justified
exception (`660f8f0`), then again once it stopped being one.

This is the deviation the CLAUDE.md rule "reach for the platform's own primitive before building a
mechanism" is about, and it is now recorded there against this exact case.

### Added: the board-detail cache migration

Not in the plan at all. It came out of review item #2 and grew into ADR `tech/0030`. Every later
plan in phase 04 now reads and writes that entry, so it is load-bearing for 04-16 onward.

### Auto-fixed issues

- `pnpm comments:check` violations compressed (`e63375a`, and two more inside later commits).
- Test pathnames routed through `ROUTE` per `routes:check` (`475781c`).
- The cache read moved into a `.ts` hook per `tech/0027` (`e4d6803`).

## Issues Encountered

- **Three concurrent agents in one checkout.** Their file sets were disjoint but the git index and
  pre-commit hook were not; two committed with `--no-verify` and two `comments:check` failures
  reached the branch. Recorded as a blocking anti-pattern in `.continue-here.md` and in
  `~/.claude/TOOL_GOTCHAS.md`.
- **Single-run green was reported twice and was wrong twice.** Also recorded as blocking.
- **A Gemini 3.1 Pro review returned 4 findings; 2 were false**, including a "critical" one claiming
  `next/cache` does not export `refresh` — it does in Next 16.3, and acting on it would have
  replaced a working API in three Server Actions. This is why CLAUDE.md now carries "Verify a code
  review's claims before acting on them".
- **A CI e2e failure caused by the migration was real** — the sidebar now settles before the client
  navigation, so BOARD-02 read a stale URL. Fixed test-side (`22f87d2`).

## User Setup Required

None. Test data left on the shared nonprod backend from checkpoint verification: account
`verify-0415-a@example.com`, boards `Verify Board` (3 tasks) and `Empty Board` (0 columns).
Harmless; delete if tidying.

## Next Phase Readiness

04-16 (task detail modal) depends on this plan and on the cache migration it carried. The
`["board", boardId]` entry now holds a whole `BoardFull` including tasks and subtasks, which is
exactly the "pure read off the already-parsed board, NO new fetch" that 04-16's must_have requires.

## Self-Check

Written retroactively from the commit record after the plan's own executor session ended. The
blocking checkpoint's disposition is recorded separately — see the checkpoint verification report.
