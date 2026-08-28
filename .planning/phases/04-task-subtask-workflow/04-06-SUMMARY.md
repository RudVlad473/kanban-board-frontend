---
phase: 04-task-subtask-workflow
plan: 06
subsystem: api
tags: [zod, openapi, typescript, schemas, api-contract, rsc]

# Dependency graph
requires:
  - phase: 03-column-management
    provides: "`sortColumnsByPosition`, the single-ordering-site return in `fetch-board-full.ts`, and the `columnNameSchema` / `columnNameRowSchema` `.pipe` split this plan mirrors"
  - phase: 02-board-management
    provides: "`EXTERNAL_PATH`, `RESULT_STATUS`, the `boardFullSchema` containment hierarchy, and the `src/test-utils/factories/` fixture mechanism"
provides:
  - "`src/lib/core/api-contract/task-schemas.ts` — the task/subtask contract in the ring both `features/boards/` and `features/tasks/` may import (D-16)"
  - "`taskSchema`, the derived mutation-response shape that carries no `subtasks` (RESEARCH Pitfall 3)"
  - "`taskTitleSchema` / `taskTitleRowSchema` — 3-32 bounds re-enforced on UPDATE, split so a blank field reports the required-field copy (RESEARCH Pitfall 4)"
  - "`EXTERNAL_PATH.TASK_DETAIL`, `TASK_MOVE`, `TASK_SUBTASKS`, `SUBTASK_DETAIL`"
  - "`sortTasksByPosition` and its application at the one ordering site — tasks are position-ordered by construction downstream (D-11)"
affects: [04-task-subtask-workflow waves 7-16, tasks feature actions, tasks feature hooks, task drag-and-drop]

actuals:
  tokens: 20000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "ADR tech/0024's promotion rule exercised for the first time: a feature-owned schema moves to `lib/core/api-contract/` when a second domain needs it, rather than the second domain importing the first"
    - "A mutation-response schema is DERIVED from the full shape via `.omit()`, never restated — `taskSchema` follows `columnSchema`"
    - "A bounded free-text field ships as a pair: `<field>Schema` carrying the length copy and `<field>RowSchema` piping a `.min(1)` required-field check in front of it"

key-files:
  created:
    - src/lib/core/api-contract/task-schemas.ts
    - src/lib/core/api-contract/task-schemas.unit.test.ts
  modified:
    - src/lib/core/api-contract/external-paths.ts
    - src/lib/core/api-contract/external-paths.unit.test.ts
    - src/features/boards/schemas.ts
    - src/features/boards/schemas.unit.test.ts
    - src/features/boards/model.ts
    - src/features/boards/model.unit.test.ts
    - src/features/boards/server/fetch-board-full.ts
    - src/test-utils/factories/board-full.ts

key-decisions:
  - "`Subtask` and `TaskFull` were REMOVED from `features/boards/schemas.ts` rather than re-exported — a re-export would leave two import paths for one type and let the promotion silently un-happen"
  - "`REQUIRED_FIELD_MESSAGE` is duplicated a third time in the core ring rather than promoted, because promoting it would touch `features/auth/` and is out of this plan's scope"
  - "`TASK_MOVE`'s comment points at 04-RESEARCH.md Pitfall 5's probe question T7, not at 04-BACKEND-FACTS.md, which plan 04-02 has not yet produced — `coverage:check`-style dangling pointers are the failure this avoids"
  - "`taskSchema` also exports a `Task` type via `z.infer`, matching how every other schema in the repository pairs shape and type"

patterns-established:
  - "Core-ring promotion: the promoted module carries the original comments verbatim (the dated `description`-null observation is load-bearing) and imports no feature — proven by `grep -c 'features/' == 0` plus `boundaries/dependencies`"
  - "Ordering happens once, at the read, at BOTH levels — `fetch-board-full.ts` sorts columns and each column's tasks, so no component ever sorts a list"

requirements-completed: []

# The nine IDs this plan DECLARES. `requirements.ready-ids` returned 0/9 ready: every one is also
# declared by an unfinished sibling plan in this phase, so none may read Complete yet (#2388).
requirements-declared: [TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, SUBTASK-01, SUBTASK-02, SUBTASK-03, SUBTASK-04]

coverage:
  - id: D1
    description: "`subtaskSchema` and `taskFullSchema` live in the core ring, parse a task with an empty subtask array, and normalise a `null` description to absent"
    verification:
      - kind: unit
        ref: "src/lib/core/api-contract/task-schemas.unit.test.ts#taskFullSchema"
        status: pass
      - kind: unit
        ref: "src/lib/core/api-contract/task-schemas.unit.test.ts#subtaskSchema"
        status: pass
    human_judgment: false
  - id: D2
    description: "`taskSchema` accepts a `TaskResponseDTO`-shaped payload carrying no `subtasks` key, which `taskFullSchema` rejects"
    verification:
      - kind: unit
        ref: "src/lib/core/api-contract/task-schemas.unit.test.ts#taskSchema"
        status: pass
    human_judgment: false
  - id: D3
    description: "`taskTitleSchema` reports the length copy at both bounds; `taskTitleRowSchema` reports the required-field copy for a blank title and never the length copy"
    verification:
      - kind: unit
        ref: "src/lib/core/api-contract/task-schemas.unit.test.ts#taskTitleRowSchema"
        status: pass
      - kind: unit
        ref: "src/lib/core/api-contract/task-schemas.unit.test.ts#taskTitleSchema"
        status: pass
    human_judgment: false
  - id: D4
    description: "The four task/subtask URL templates are declared once and type against the generated OpenAPI path map; no create-task literal was invented"
    verification:
      - kind: unit
        ref: "src/lib/core/api-contract/external-paths.unit.test.ts#EXTERNAL_PATH task and subtask templates"
        status: pass
      - kind: other
        ref: "pnpm exec tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D5
    description: "`sortTasksByPosition` orders a column's tasks ascending by `position` and never mutates its input"
    verification:
      - kind: unit
        ref: "src/features/boards/model.unit.test.ts#sortTasksByPosition"
        status: pass
    human_judgment: false
  - id: D6
    description: "The board-full read still parses and now orders both levels, verified against the real deployed nonprod backend"
    verification:
      - kind: integration
        ref: "src/features/boards/server/fetch-board-full.integration.test.ts"
        status: pass
      - kind: other
        ref: "pnpm test (96 files, 1336 tests) and pnpm build"
        status: pass
    human_judgment: false

# Metrics
duration: 37 min
completed: 2026-08-28
status: complete
---

# Phase 4 Plan 06: Task & Subtask Data Contract Summary

**Task and subtask zod shapes promoted into `lib/core/api-contract/` under D-16, the derived `taskSchema` mutation-response shape and 3-32 title-bounds split added, four `EXTERNAL_PATH` templates declared, and tasks now ordered at the single read site alongside columns.**

## Performance

- **Duration:** 37 min (approximate — start time reconstructed from the first tool call, not recorded at spawn)
- **Started:** 2026-08-28T12:04:00Z (approx.)
- **Completed:** 2026-08-28T12:41:55Z
- **Tasks:** 3
- **Files modified:** 10 (2 created, 8 modified)

## Accomplishments

- **The tasks feature is now legal without a boundary-policy change.** `subtaskSchema` and `taskFullSchema` moved to `src/lib/core/api-contract/task-schemas.ts`, the ring both features may import, exercising ADR tech/0024's stated promotion rule rather than requiring an ADR-level feature-folder exception. `columnFullSchema` composes the promoted shape, so `boardFullSchema` parses an unchanged fixture identically.
- **The mutation-response shape cannot drift from the full one.** `taskSchema = taskFullSchema.omit({ subtasks: true })`, derived exactly as `columnSchema` is, with a comment naming why: `TaskResponseDTO` declares no `subtasks`, so parsing a create/update/move response with `taskFullSchema` would fail on every successful call (RESEARCH Pitfall 3). The same DTO's absent `columnId` is recorded next to it — a move response cannot report where the task landed.
- **A title that could never have been created cannot become savable.** `taskTitleSchema` re-enforces `SaveTaskRequestDTO`'s 3-32 on UPDATE, which `UpdateTaskRequestDTO` declares no bounds for at all; `taskTitleRowSchema` pipes a `.min(1)` required-field check in front of it so a blank field reports "Can't be empty" and never the length copy.
- **The two counter-intuitive URLs are explained where they are declared.** `COLUMN_DETAIL` now carries a comment recording that task creation POSTs to it — the sibling `.../tasks` path is GET-only, so "correcting" it produces a 405 — and `TASK_MOVE` carries one recording that it is root-level and unscoped, so cross-board authorization is entirely the backend's.
- **Tasks are ordered once, at the read.** `sortTasksByPosition` sits beside `sortColumnsByPosition` and is applied inside `fetch-board-full.ts`'s existing single-ordering-site return, so every consumer downstream is position-ordered by construction and no component sorts a task list.

## Task Commits

Each task was committed atomically:

1. **Task 1: Promote the task and subtask schemas into the core ring** — `30d9291` (feat)
2. **Task 2: Add the task and subtask URL templates** — `2423c4f` (feat)
3. **Task 3: Order tasks at the single read site** — `f7642cc` (feat)

_All three tasks were `tdd="true"`. See "TDD Gate Compliance" below for why each is one commit rather than a `test(...)` / `feat(...)` pair._

## Files Created/Modified

- `src/lib/core/api-contract/task-schemas.ts` — **created.** `subtaskSchema`, `taskFullSchema`, `taskSchema`, `taskTitleSchema`, `taskTitleRowSchema`, and the `Subtask` / `TaskFull` / `Task` types. Imports nothing outside `zod`.
- `src/lib/core/api-contract/task-schemas.unit.test.ts` — **created.** 20 cases: the three moved `taskFullSchema` cases plus new `subtaskSchema`, `taskSchema`, and title-bounds coverage.
- `src/lib/core/api-contract/external-paths.ts` — four new `as const` members plus the two explanatory comments.
- `src/lib/core/api-contract/external-paths.unit.test.ts` — a literal assertion per new entry, a case proving no create-task literal was invented, and a new empty-segment (`//`) guard over every member.
- `src/features/boards/schemas.ts` — task/subtask declarations and their two type exports removed; imports `taskFullSchema` from the core ring.
- `src/features/boards/schemas.unit.test.ts` — the `taskFullSchema` describe block moved out; board/column cases untouched.
- `src/features/boards/model.ts` — new `sortTasksByPosition` export.
- `src/features/boards/model.unit.test.ts` — five `sortTasksByPosition` cases, fixtures authored deliberately out of position order.
- `src/features/boards/server/fetch-board-full.ts` — the one ordering site now sorts both levels; its comment says so.
- `src/test-utils/factories/board-full.ts` — import path only; the four factory bodies are unchanged.

## Decisions Made

- **`Subtask` / `TaskFull` were removed from `features/boards/schemas.ts`, not re-exported.** The plan's `artifacts_produced` called for removal, and a re-export would have left two import paths for one type — the promotion would have been reversible by accident.
- **`REQUIRED_FIELD_MESSAGE` is duplicated a third time.** The core ring may not import a feature, so the constant is redeclared in `task-schemas.ts` with a comment saying why, exactly as `features/boards/schemas.ts` already redeclares it from `features/auth/`. Promoting the shared copy would touch auth and is a separate decision.
- **`toSubtaskSummary` stays in `features/boards/model.ts`.** As the plan directs: it is a presentation formatter, not a contract shape, and its eventual sole consumer does not exist yet. It moves in the tracer plan.
- **A `Task` type is exported alongside `taskSchema`.** Not in the plan's named export list, but every other schema in the repository pairs a shape with its `z.infer` type, and the actions in Waves 7-16 will need it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Generated the missing Next.js route types in the fresh worktree**

- **Found during:** Task 1 (first `pnpm lint` run)
- **Issue:** `pnpm lint` reported three `no-unsafe-assignment` errors in `app/(dashboard)/boards/[boardId]/page.tsx` on `PageProps<"/boards/[boardId]">`. `tsconfig.json` includes `.next/types/**/*.ts`, which a freshly-created worktree has never generated, so the framework-supplied type resolved to `error` and every read off it was unsafe. Pre-existing environmental gap, not introduced by this plan.
- **Fix:** `pnpm exec next typegen`. Nothing under `.next/` is tracked, so no file was committed.
- **Files modified:** none (generated output is gitignored)
- **Verification:** `pnpm lint` exits 0; the three errors are gone and no others appeared.
- **Committed in:** n/a — no tracked file changed.

**2. [Rule 3 - Blocking] Retargeted `TASK_MOVE`'s probe-finding pointer**

- **Found during:** Task 2
- **Issue:** The plan asks for a comment on `TASK_MOVE` "with a pointer to the probe finding that confirms it". That finding lives in `04-BACKEND-FACTS.md`, which plan 04-02 has not yet produced — the file does not exist in this phase directory. Writing the pointer as specified would have shipped a citation to a nonexistent document, the exact failure `coverage:check` was built to stop.
- **Fix:** The comment points at `04-RESEARCH.md`'s Pitfall 5 and its probe question T7, both of which exist today.
- **Files modified:** `src/lib/core/api-contract/external-paths.ts`
- **Verification:** the cited section resolves — `.planning/phases/04-task-subtask-workflow/04-RESEARCH.md` line 745 (Pitfall 5) and line 1291 (T7).
- **Committed in:** `2423c4f`

**3. [Rule 3 - Blocking] Reworded a comment so an acceptance criterion's literal grep passes**

- **Found during:** Task 1
- **Issue:** `grep -c 'features/' src/lib/core/api-contract/task-schemas.ts` returned 1, failing the criterion. The single hit was prose inside the header comment ("promoted out of `features/boards/schemas.ts`"), not an import — the criterion's intent (no feature import) already held.
- **Fix:** Reworded to "the boards feature's own `schemas.ts`", so the literal check and its intent agree.
- **Files modified:** `src/lib/core/api-contract/task-schemas.ts`
- **Verification:** `grep -c 'features/' …` returns 0; `pnpm lint` reports no `boundaries/dependencies` error.
- **Committed in:** `30d9291`

---

**Total deviations:** 3 auto-fixed (3 blocking). None was a bug in shipped code.
**Impact on plan:** No scope creep. Two were environmental/documentation-integrity fixes and one was a comment rewording; the plan's own design was followed unchanged.

## TDD Gate Compliance

All three tasks carry `tdd="true"`, and all three RED gates were **actually run and observed failing** before any implementation existed:

| Task | RED observed | GREEN observed |
|------|--------------|----------------|
| 1 | Suite failed to import — `./task-schemas` did not exist | 60 tests pass across both schema suites |
| 2 | 4 failed / 4 passed — the four new template assertions read `undefined` | 8/8 pass |
| 3 | 5 failed / 42 passed — `sortTasksByPosition` was not exported | 47/47 pass |

**No separate `test(...)` RED commit exists for any of the three, and this is structural rather than a shortcut.** This repository's husky pre-commit hook runs type-aware `eslint --fix` over staged files; a test importing a not-yet-existing export produces dozens of `no-unsafe-*` errors and the commit is refused. Bypassing with `--no-verify` is forbidden by the project's own conventions. Each task therefore landed as one `feat(...)` commit holding the failing-test-then-passing state. This was first documented in `03-04-SUMMARY.md` and is a known property of this repo, not an executor-compliance defect.

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm test` (all five Vitest projects) | **pass** — 96 files, 1336 tests |
| `pnpm build` | **pass** — compiled in 12.6s, all 8 static pages generated |
| `pnpm lint` | **pass** — 0 problems, `eslint.config.mjs` unmodified (`git diff` empty) |
| `pnpm exec tsc --noEmit` | **pass** — no output |
| `pnpm coverage:check` | **pass** — 106 source files scanned |
| `pnpm comments:check` | **pass** |
| `pnpm format:check` | **pass** |
| `pnpm routes:check` | **pass** — no path literal outside its declaration file |
| `pnpm tsx:check` | **pass** |
| `fetch-board-full.integration.test.ts` (real backend) | **pass** — 7/7 |

## Known Stubs

None. No file changed by this plan contains a TODO, FIXME, placeholder value, or hardcoded empty value flowing to a UI surface.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: unscoped-mutation-path | `src/lib/core/api-contract/external-paths.ts` | `TASK_MOVE` (`/tasks/{taskId}/move`) is a root-level template carrying no board or column segment, so it is the one declared mutation path in this app with **no client-side scoping whatsoever**. The plan's STRIDE register (T-04-22..24) covers the schemas but has no row for this path. Cross-board and cross-account authorization is entirely the backend's; 04-RESEARCH.md's probe question T7 exists to confirm it refuses, and **that probe has not yet been run** (plan 04-02, which produces `04-BACKEND-FACTS.md`, has not landed). No code in this plan calls the path — it is a declared literal only — so nothing is exposed yet, but the action plan that first uses it must not ship before T7 is answered. |

## Issues Encountered

- **A fresh worktree has no `node_modules` and no `.next/types`.** `pnpm install --frozen-lockfile` and `pnpm exec next typegen` were both needed before any gate could run. The second is easy to misread as a lint regression in `app/(dashboard)/boards/[boardId]/page.tsx` — see deviation 1.
- **The first full `pnpm test` run reported 4 failures; the next two runs were green.** All four were 15s timeouts in the `browser` project (`board-view.test.tsx`, `board-list.test.tsx`), zero assertion failures. This is the documented contention residue in CONVENTIONS.md § "Test runner concurrency" (measured there as 0-2 per run), not a regression from this plan — the second run passed 1325/1325 on identical code and the post-Task-3 run passed 1336/1336. Flagged rather than buried: a green run here is weaker evidence than a green CI run, and CI is the sign-off.
- **No requirement was marked complete.** `requirements.ready-ids` returned 0/9: every ID this plan declares is also declared by a sibling plan in this phase that has not yet produced a SUMMARY, so the shared-ID gate (#2388) correctly withholds all nine. `REQUIREMENTS.md` is therefore unchanged by this plan.

## User Setup Required

None — no external service configuration required. (`.env.local` was copied into the worktree per project CLAUDE.md so the real-backend integration test could run; it is gitignored and disappears with the worktree.)

## Next Phase Readiness

**Ready.** Every artifact Waves 7-16 import now exists:

- Actions can parse mutation responses with `taskSchema` and build URLs from `EXTERNAL_PATH.TASK_DETAIL` / `TASK_MOVE` / `TASK_SUBTASKS` / `SUBTASK_DETAIL`, and create a task against `COLUMN_DETAIL`.
- Forms can validate titles with `taskTitleRowSchema` on create and edit alike.
- Components receive position-ordered task lists and must not sort.

**Carry forward:**

- RESEARCH Pitfall 2 is **not** addressed by this plan — declaring the templates does not make the call sites supply every segment. `openapi-fetch` silently skips a missing path parameter, and three of the seven operations need segments the generated type does not require. Every action must write all segments into `params.path` explicitly.
- `toSubtaskSummary` still lives in `features/boards/model.ts` and moves in the tracer plan, deliberately (see Decisions).
- The `TASK_MOVE` authorization probe (T7) is still open — see Threat Flags.

---
*Phase: 04-task-subtask-workflow*
*Completed: 2026-08-28*

## Self-Check: PASSED

- `src/lib/core/api-contract/task-schemas.ts` — FOUND on disk
- `src/lib/core/api-contract/task-schemas.unit.test.ts` — FOUND on disk
- `.planning/phases/04-task-subtask-workflow/04-06-SUMMARY.md` — FOUND on disk
- Commits `30d9291`, `2423c4f`, `f7642cc`, `08f2d75` — all present in `git log`
