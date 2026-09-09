---
phase: 03-column-management
plan: 05
subsystem: ui
tags: [server-action, react-hook-form, zod, tanstack-query, storybook, vitest, base-ui]

# Dependency graph
requires:
  - phase: 02-board-crud
    provides: "rename-board.ts's six-step Server Action order, board-list.tsx's container template, add-board-modal.tsx's RHF form shape, the serverActionStubAlias carve-out, RESULT_STATUS/mapProblemCodeToStatus"
  - phase: 03-column-management
    provides: "plan 03-02's --color-bg-column-add-{from,to} gradient tokens; plan 03-04's columnSchema, createColumnInputSchema and addColumnFormSchema"
provides:
  - "createColumnAction + CreateColumnResult — POST /boards/{boardId}/columns as a Server Action returning bare RESULT_STATUS discriminants"
  - "useCreateColumn — create orchestration with inline error state, no toast, modal stays open on failure"
  - "AddColumnModal — the presentational single-field create form"
  - "AddColumnPlaceholder — the 280px gradient ghost column"
  - "BoardView as the board's client container, with the defaultIsAddColumnOpen staging prop"
  - "create-column-action-storybook-stub.ts — the programmable queue/hold/reset stub, aliased in the browser and storybook projects"
affects: [03-06, 03-07, 03-08, 03-09, 03-10, 03-11]

actuals:
  tokens: 11740
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Tracer slice: one entry point wired through every layer and proven before any second call site exists"
    - "An unreachable upstream branch folded into ERROR at the action, rather than carried as a union member no hook could author honest copy for"
    - "Ghost-column gradient applied as an arbitrary Tailwind background layered directly on --color-bg-app"

key-files:
  created:
    - src/features/boards/actions/create-column.ts
    - src/features/boards/hooks/use-create-column.ts
    - src/features/boards/components/add-column-modal.tsx
    - src/features/boards/components/add-column-modal.stories.tsx
    - src/features/boards/components/add-column-modal.test.tsx
    - src/features/boards/components/add-column-placeholder.tsx
    - src/features/boards/components/add-column-placeholder.stories.tsx
    - src/features/boards/components/add-column-placeholder.test.tsx
    - src/test-utils/create-column-action-storybook-stub.ts
  modified:
    - src/features/boards/components/board-view.tsx
    - src/features/boards/components/board-view.stories.tsx
    - src/features/boards/components/board-view.test.tsx
    - vitest.config.ts

key-decisions:
  - "CONFLICT is folded into ERROR inside createColumnAction rather than added to its result union — a create carries no version, so an optimistic-lock 409 is unreachable, and the plan's own enumerated union (which omits CONFLICT) is right. Required a narrowing at the mapProblemCodeToStatus call site, since that helper's return type includes CONFLICT"
  - "AddColumnModal carries a defaultValues staging prop the plan's prop list omitted — the required LongColumnName and ShortColumnName stories cannot stage a filled field without it, and add-board-modal.tsx already establishes the shape"
  - "The zero-columns branch of board-view.tsx is untouched, so this slice has exactly one create entry point; its CTA is plan 03-07's"
  - "The section tabIndex={0} stays for now — UI-SPEC removes it only once the column header holds a real focusable button (plan 03-06/03-08), and removing it here would reopen axe's scrollable-region-focusable"

patterns-established:
  - "Container/presentational split for column surfaces: BoardView owns the hook and modal state, AddColumnModal and AddColumnPlaceholder take onSubmit/onOpen/isPending props and call no hook of their own"
  - "The ghost column as the last flex child inside the existing overflow-x-auto row, asserted structurally rather than visually"
  - "A container test that pins the aliased action's recorded call count at exactly 1, so a double-submit regression fails the suite"

requirements-completed: [COLUMN-01]

coverage:
  - id: D1
    description: "COLUMN-01's happy path reaches the action layer with the board's own id and the typed name, exactly once, and the modal closes"
    requirement: "COLUMN-01"
    verification:
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > reaches the create action once with the board's own id, then closes the modal"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > opens the Add Column modal when the ghost column is pressed"
        status: pass
    human_judgment: false
  - id: D2
    description: "A failed create keeps the modal open with the authored inline copy and raises no toast (UI-SPEC error/Add-Column-generic)"
    requirement: "COLUMN-01"
    verification:
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > keeps the modal open with inline copy and no toast when the create fails"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/add-column-modal.test.tsx#AddColumn modal > renders the generic create failure inline in the still-open modal and raises no toast"
        status: pass
    human_judgment: false
  - id: D3
    description: "The submit button shows its loading state and the modal refuses Escape while the POST is in flight; settling the held call closes it (T-03-22)"
    verification:
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > shows the pending treatment and refuses Escape while the create is in flight"
        status: pass
    human_judgment: false
  - id: D4
    description: "The ghost column is the last child of the horizontal scroll row, after every column (D-01 append-at-the-end + UI-SPEC overflow/many-columns)"
    verification:
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > renders the ghost column as the last child of the horizontal scroll row"
        status: pass
    human_judgment: true
    rationale: "The ordering and the overflow-x-auto containment are asserted structurally, which is what D-01 actually constrains. Whether the gradient, the 24px label and the hover/focus accent swap READ correctly against the PDF at both themes is a visual judgement no assertion here makes — see Outstanding for human verification."
  - id: D5
    description: "The Add Column form refuses a blank name with the required-field copy and an out-of-bounds one with the 3-32 copy, before submit rather than after"
    requirement: "COLUMN-01"
    verification:
      - kind: browser
        ref: "src/features/boards/components/add-column-modal.test.tsx#AddColumn modal > blocks submission and shows the required-field copy when the name is blank"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/add-column-modal.test.tsx#AddColumn modal > blocks submission on a two-character name and shows the length copy"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/add-column-modal.test.tsx#AddColumn modal > accepts a name at the backend's own 32-character ceiling"
        status: pass
    human_judgment: false
  - id: D6
    description: "The action's security triad holds: verifySession first, safeParse of its own arguments, and userId taken only from the session record (T-03-11, T-03-01, T-03-02)"
    verification:
      - kind: other
        ref: "verifySession() is the first statement of the action body; grep 'query: { userId: record.id }' returns 1; grep 'path: { boardId: parsed.data.boardId }' returns 1"
        status: pass
    human_judgment: false
  - id: D7
    description: "U-01 holds — the shipped board modals gained no column-management surface"
    verification:
      - kind: other
        ref: "git diff --name-only src/features/boards/components/add-board-modal.tsx src/features/boards/components/edit-board-modal.tsx produces no output"
        status: pass
    human_judgment: false
  - id: D8
    description: "T-03-21 — the dropped-boardId URL failure is mitigated by an explicit params.path assertion, but NOT proven against the real backend"
    verification:
      - kind: other
        ref: "Source assertion only; 03-RESEARCH Pitfall 2 states the integration test in plan 03-11 is the only thing that can actually catch this"
        status: deferred
    human_judgment: false
    rationale: "By plan design, not an omission — the plan's own threat register assigns the real-backend proof to plan 03-11."

# Metrics
duration: 26min
completed: 2026-08-26
status: complete
---

# Phase 3 Plan 05: Add Column Tracer Slice Summary

**COLUMN-01 wired end to end on one narrow path — ghost column → Add Column modal → `useCreateColumn` → `createColumnAction` → upstream POST → `refresh()` — so the architecture every later column plan builds on has been run, not just designed.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-08-26T22:12:00Z
- **Completed:** 2026-08-26T22:38:00Z
- **Tasks:** 3
- **Files created/modified:** 13

## Accomplishments

- **The spine exists and is proven, not asserted.** `board-view.test.tsx` drives a real create through the aliased Server Action stub and reads back the recorded call — `{ boardId, name }` — rather than watching a spy prop fire. The call array is pinned at exactly 1, so a double-submit regression fails the suite (T-03-22).
- **`createColumnAction` follows the shipped six-step order without deviation**, and writes `boardId` into `params.path` explicitly. That line looks redundant and is not: the generated `path` type for the column endpoints omits `boardId`, so omitting it compiles cleanly and silently produces a URL carrying the literal `%7BboardId%7D` (03-RESEARCH Pitfall 2).
- **No position is sent on create and none is needed** (D-01) — the backend derives `position` from call order (02-BACKEND-FACTS P5), so a new column appends at the end. There is no position picker anywhere in the modal.
- **The ghost column is the last flex child _inside_ the `overflow-x-auto` row**, asserted structurally: eight `SECTION`s then the button, with the row proved to carry `overflow-x-auto`. That is what makes it scroll away with the columns rather than pin to the viewport edge.
- **`BoardView` became a client container without breaking the RSC boundary** — `pnpm build` compiles and prerenders all 8 routes clean.
- **U-01 is intact:** `add-board-modal.tsx` and `edit-board-modal.tsx` have zero diff.

## Task Commits

Each task was committed atomically:

1. **Task 1 (TRACER): create one column end to end, from the ghost column to a new swimlane** — `21ec628` (feat)
2. **Task 2: Stories and composed-story tests for AddColumnModal and AddColumnPlaceholder** — `9b51fb7` (feat)
3. **Task 3: Prove the container spine through the aliased create action** — `d4f04a8` (feat)

## Files Created/Modified

- `src/features/boards/actions/create-column.ts` — the Server Action and its `CreateColumnResult` union
- `src/features/boards/hooks/use-create-column.ts` — create orchestration plus the authored failure-copy table
- `src/features/boards/components/add-column-modal.tsx` — presentational single-field RHF create form
- `src/features/boards/components/add-column-placeholder.tsx` — the 280px gradient ghost column
- `src/features/boards/components/board-view.tsx` — now `"use client"`, owning modal state and the create hook
- `src/test-utils/create-column-action-storybook-stub.ts` — queue/hold/reset stub with a locally re-declared result type
- `vitest.config.ts` — one `serverActionStubAlias` entry
- Five stories/test files: `add-column-modal.{stories,test}.tsx`, `add-column-placeholder.{stories,test}.tsx`, and new coverage on `board-view.{stories,test}.tsx`

## Decisions Made

- **`CONFLICT` is folded into `ERROR` inside the action rather than added to its result union.** `mapProblemCodeToStatus` returns `UpstreamFailureStatus`, which includes `CONFLICT`, so the plan's enumerated union (SUCCESS/UNAUTHENTICATED/INVALID/DUPLICATE/NOT_FOUND/ERROR) does not typecheck against a bare pass-through. Folding is the semantically right resolution rather than a convenience: a create carries no `version`, so an optimistic-lock 409 is unreachable here, and carrying `CONFLICT` would hand plan 03-06's hook a branch it could only author dishonest copy for. See Deviations.
- **`AddColumnModal` carries a `defaultValues` staging prop the plan's prop list omitted.** Task 2 mandates `LongColumnName` (32 characters) and Test 3 mandates a real-validation two-character case; neither can be staged without pre-filling the field. `add-board-modal.tsx` already establishes the prop verbatim, so this is reuse, not invention.
- **The section's `tabIndex={0}` stays.** UI-SPEC removes it, but only as a consequence of the column header gaining a real focusable button (plans 03-06/03-08). Removing it in this slice would reopen axe's `scrollable-region-focusable` on every column, which `pnpm test:a11y` enforces as an error.
- **The zero-columns branch is untouched**, so the phase has exactly one create entry point until 03-07 adds the empty-state CTA. `board-view.test.tsx` asserts the omission both ways — neither `+ Add New Column` nor `+ New Column` appears on an empty board.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `CreateColumnResult` did not typecheck against `mapProblemCodeToStatus`'s return type**

- **Found during:** Task 1
- **Issue:** The plan enumerates the result union as `SUCCESS`, `UNAUTHENTICATED`, `INVALID`, `DUPLICATE`, `NOT_FOUND`, `ERROR` — no `CONFLICT`. But the prescribed `return { status: mapProblemCodeToStatus(parseProblemDetail(...)?.code) }` returns `UpstreamFailureStatus`, which **includes** `CONFLICT`. As written the action does not compile. (`rename-board.ts`, the analog, carries `CONFLICT` in its union, which is why the pattern transfers cleanly there and not here.)
- **Fix:** Narrowed at the call site — `status === RESULT_STATUS.CONFLICT ? RESULT_STATUS.ERROR : status` — keeping the plan's enumerated union exactly as specified. Resolved toward folding rather than toward widening the union because a create sends no `version`, so `OPTIMISTIC_LOCK_CONFLICT` is genuinely unreachable on this path; a `CONFLICT` branch here would be dead code that plan 03-06 would nonetheless have to write user-facing copy for.
- **Files modified:** `src/features/boards/actions/create-column.ts`
- **Verification:** `pnpm exec tsc --noEmit` exits 0.
- **Committed in:** `21ec628`

**2. [Rule 2 - Missing functionality] `AddColumnModal` gained a `defaultValues` staging prop**

- **Found during:** Task 2
- **Issue:** The plan's prop list for `AddColumnModal` is `isOpen`, `onOpenChange`, `onSubmit`, `isPending`, `errorMessage`, `forceNameError`. The same plan mandates a `LongColumnName` story ("a 32-character name") and a behaviour test for a two-character name driven by *real* validation rather than `forceNameError`. Neither state is reachable without a way to pre-fill the field.
- **Fix:** Added `defaultValues?: { name?: string }`, a plain React Hook Form passthrough, JSDoc'd Storybook-only — copied verbatim from `add-board-modal.tsx`, which carries it for the identical reason.
- **Files modified:** `src/features/boards/components/add-column-modal.tsx`
- **Verification:** `LongColumnName` and `ShortColumnName` stories render and their tests pass; `pnpm test:a11y` clean.
- **Committed in:** `21ec628` (prop) / `9b51fb7` (stories using it)

### Acceptance-criterion wording artifacts (no code change)

- **`grep -c 'verifySession' src/features/boards/actions/create-column.ts` returns 2, not the criterion's 1.** Line 1 is the `import`, line 2 the call. The shipped analog `rename-board.ts` returns 2 for the same grep. The criterion's substantive half — "it is the first statement of the exported action body" — holds.
- **The `columnFullSchema` criterion initially returned 1** because a code comment named the symbol while explaining why it is *not* used. Reworded to "the full-column one" so the mechanical check reads 0; no behavioural change.

---

**Total deviations:** 2 auto-fixed (1 blocking type error, 1 missing staging affordance). No architectural change, no new dependency, nothing installed.
**Impact on plan:** Corrective only. Both resolutions stayed inside the plan's own stated contracts rather than widening them.

## Issues Encountered

- **The worktree started with no `node_modules` and no Next.js route types** — the same fresh-worktree artifact plan 03-04 recorded. `pnpm install --frozen-lockfile` plus `pnpm exec next typegen` were both needed before `tsc --noEmit` could run clean. `.env.local` was copied in per `CLAUDE.md`; the `node` (real-backend integration) project needs it and passed.
- **`pnpm test:browser -- <file>` does not filter.** The positional path after `--` is ignored and the whole browser project runs (580 tests). Used `pnpm exec vitest run --project browser <file>` for the per-task loops. Not a defect — worth knowing, since the plan's `<verify>` blocks are written in the non-filtering form.

## TDD Gate Compliance

Tasks 2 and 3 are `tdd="true"`; both RED gates were **run and observed failing** before the implementing code existed.

| Task | RED failures observed | GREEN result |
|------|----------------------|--------------|
| 2 | Both suites failed to import — 0 tests collected (the stories modules did not exist) | 22 passed |
| 3 | 2 failed / 18 passed (the two `AddColumnOpen` cases; the story did not exist) | 20 passed |

**No separate `test(...)` commit exists**, for the structural reason plan 03-04 already documented: the repo's `husky` pre-commit hook runs type-aware `eslint --fix` over staged files, and a test importing not-yet-existing exports produces 40+ `no-unsafe-*` errors. Committing RED would require `--no-verify`, which this executor is forbidden to pass. Each task therefore landed as one `feat(...)` commit containing the already-failing test plus the code that turns it green, with the RED evidence recorded above and in each commit body.

**One honest qualification on Task 3's RED.** Only 2 of its 20 cases went red — the two needing the missing `AddColumnOpen` story. The other 18 passed immediately, because Task 3's subject (the container spine) was necessarily *already built* by Task 1, the tracer. That is inherent to a `tracer` task followed by a `tdd` task over the same code, not a compliance shortcut: a tracer that did not implement the spine would not be a tracer. Recording it rather than presenting "RED observed" without qualification.

## Verification Run

| Gate | Result |
|------|--------|
| `pnpm test` (all five Vitest projects) | 997 passed / 79 files |
| `pnpm exec tsc --noEmit` | exit 0 |
| `pnpm test:a11y` | 151 passed, no axe violation |
| `pnpm lint`, `pnpm format:check` | clean |
| `pnpm routes:check`, `handlers:check`, `stories:check`, `comments:check`, `tsx:check`, `renders:check` | all pass |
| `pnpm api:generate` | no diff |
| `test ! -d src/features/columns` | passes |
| `pnpm build` | compiles, all 8 routes prerender |

## Outstanding — needs human eyes

**Not verified through the running app.** This project's `CLAUDE.md` requires driving UI changes through the dev server with the headless Playwright MCP before reporting them. **No Playwright MCP tools resolve in this executor's tool set** (neither `mcp__playwright__*` nor the plugin variant), so this was impossible here rather than skipped. Everything above is test-, type- and build-level evidence; the following are visual/functional judgements nothing in this plan has actually looked at:

1. **The ghost column's appearance against PDF p3/p13** — the 180deg gradient at both themes, the 24px `heading-xl` label, `rounded-lg`, and the hover/focus-visible swap to `--color-bg-primary`. Storybook's `AddColumnPlaceholder` `InRow` story and `BoardView` `ManyColumns` are the two places to look.
2. **A real create against the deployed backend.** T-03-21's dropped-`boardId` failure mode is mitigated by a source assertion only. Per the plan's own threat register this is proven by plan 03-11's integration test — deliberately deferred, not forgotten, but it means no code in this plan has yet produced a real `POST /boards/{id}/columns` URL.
3. **That the new column visibly appears as a new swimlane after `refresh()`.** The tests prove the action is called and the modal closes; the RSC re-render that paints the swimlane is a server round-trip only the running app exercises.

## Next Phase Readiness

- Plans 03-06 through 03-10 expand onto a spine that has been run: container + presentational children + hook + Server Action + `refresh()`.
- **The stub/alias pattern is now established for column actions.** Adding `rename-column`, `reorder-column` and `delete-column` is three more `serverActionStubAlias` entries; the shipped prefix rule was re-checked and none of them prefixes another.
- **`DUPLICATE` is already in `CreateColumnResult`** but has no copy entry in `use-create-column.ts`'s table, so it currently falls through to the generic message. Wiring `"A column with that name already exists on this board."` is plan 03-07's, and it is a one-line change to the table rather than a shape change.
- **Two things this plan deliberately did not do:** the zero-columns CTA (03-07) and removing the section's `tabIndex={0}` (blocked until the column header holds a focusable button, 03-06/03-08).
- No stubs, no skipped tests, no unrun `<verify>` — every acceptance criterion in all three tasks was executed. The one deferred item (D8, real-backend URL proof) is deferred **by the plan's own design**, not by this execution.

## Self-Check: PASSED

All 9 created files and 4 modified files exist on disk; all three task commits (`21ec628`, `9b51fb7`, `d4f04a8`) resolve in `git log`; the working tree is clean.

---

_Phase: 03-column-management_
_Completed: 2026-08-26_
