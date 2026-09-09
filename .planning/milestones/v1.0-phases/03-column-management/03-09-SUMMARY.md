---
phase: 03-column-management
plan: 09
subsystem: ui
tags: [react, next, server-actions, tanstack-query, base-ui, cascade-delete, optimistic-concurrency]

requires:
    - phase: 03-column-management
      provides: "deleteColumnInputSchema (plan 03-04), the column-header kebab and its Rename Column entry (03-08), the wired board container (03-05, 03-07)"
    - phase: 02-board-management
      provides: "deleteBoardAction + use-delete-board's wait-for-server shape, DeleteBoardConfirm, the Menu/Modal/Button primitives, the Server-Action Storybook stub carve-out"
provides:
    - "deleteColumnAction — DELETE /boards/{boardId}/columns/{columnId}, routing the upstream failure through the shared problem-code mapping so a stale version is distinguishable"
    - "useDeleteColumn — a wait-for-server delete that applies nothing optimistically and performs no navigation, with CONFLICT carrying its own toast copy"
    - "DeleteColumnConfirm — U-04's confirmation, mirroring DeleteBoardConfirm one containment level down"
    - "The column kebab completed: Rename Column plus a destructive Delete Column, both live on a lone column"
    - "delete-column-action-storybook-stub — queue/hold/reset programmable stub for the delete action"
affects: [03-10 column-reorder, 03-11 integration-tests, phase-04 sync-reconciliation]

actuals:
    tokens: 27571
    tasks: 3
    commits: 3

tech-stack:
    added: []
    patterns:
        - "A wait-for-server destructive mutation whose container closes the modal on SETTLE, the deliberate inverse of the same phase's close-on-submit optimistic rename"
        - "A delete action folding DUPLICATE into ERROR at the mapping boundary, since a delete names nothing that could clash"
        - "A stories-file host that lands a post-delete refreshed render, so container-level ordering can be asserted without the container ever removing a column itself"

key-files:
    created:
        - src/features/boards/actions/delete-column.ts
        - src/features/boards/hooks/use-delete-column.ts
        - src/features/boards/components/delete-column-confirm.tsx
        - src/features/boards/components/delete-column-confirm.stories.tsx
        - src/features/boards/components/delete-column-confirm.test.tsx
        - src/test-utils/delete-column-action-storybook-stub.ts
    modified:
        - src/features/boards/components/column-header.tsx
        - src/features/boards/components/column-header.stories.tsx
        - src/features/boards/components/column-header.test.tsx
        - src/features/boards/components/board-view.tsx
        - src/features/boards/components/board-view.stories.tsx
        - src/features/boards/components/board-view.test.tsx
        - vitest.config.ts

key-decisions:
    - "The delete action routes through mapProblemCodeToStatus where the shipped board delete returns a bare error status — the UI-SPEC's distinct version-conflict branch cannot be expressed by a bare status"
    - "DUPLICATE is folded into ERROR inside the action rather than added to the result union: a delete names nothing, so DUPLICATE_RESOURCE cannot describe one, and exposing it would be a branch nothing selects"
    - "The container closes the confirmation on SETTLE, not on submit — the exact inverse of plan 03-08's rename handler, which is U-05's whole point"
    - "board-view's delete wiring landed in Task 2 rather than Task 3, because onDelete is a required prop: deferring it would not merely ship an inert entry, it would not compile"
    - "Task 1's four hook behaviours are asserted in board-view.test.tsx — a unit-project test cannot import the hook at all (see Deviations)"

patterns-established:
    - "Wait-for-server delete: no override, no local filtering, and the destructive button's pending state as the user's only in-flight signal"
    - "An in-flight case that HOLDS the stubbed call and asserts the whole rendered name set is unchanged — proving nothing was removed, not merely that the target survived"

requirements-completed: [COLUMN-04]

coverage:
    - id: D1
      description: "deleteColumnAction sends BOTH boardId and columnId in params.path, takes userId only from the verified session, parses its own arguments after the session check, and returns bare discriminants"
      requirement: "COLUMN-04"
      verification:
          - kind: other
            ref: "grep -c 'boardId: parsed.data.boardId, columnId: parsed.data.columnId' src/features/boards/actions/delete-column.ts == 1"
            status: pass
          - kind: other
            ref: "grep -c 'query: { userId: record.id }' src/features/boards/actions/delete-column.ts == 1"
            status: pass
          - kind: other
            ref: "pnpm exec tsc --noEmit"
            status: pass
      human_judgment: false
    - id: D2
      description: "The wait-for-server hook: nothing removed optimistically, no navigation, and CONFLICT carrying copy distinct from the generic failure"
      requirement: "COLUMN-04"
      verification:
          - kind: integration
            ref: "src/features/boards/components/board-view.test.tsx#still renders the column while the delete is in flight, removing nothing optimistically"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view.test.tsx#closes the modal, leaves the column on the board and announces a generic delete failure"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view.test.tsx#raises the distinct version-conflict copy, not the generic one, when the delete conflicts"
            status: pass
          - kind: other
            ref: "grep -cE '(useRouter|router\\.(push|replace|refresh))' src/features/boards/hooks/use-delete-column.ts == 0"
            status: pass
      human_judgment: false
    - id: D3
      description: "DeleteColumnConfirm carries the Copywriting Contract's exact title, body and actions, with Keep Column holding initial focus and both halves of the dismissal guard"
      requirement: "COLUMN-04"
      verification:
          - kind: integration
            ref: "src/features/boards/components/delete-column-confirm.test.tsx (17 cases x 2 viewports, 34 passing)"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/delete-column-confirm.test.tsx#puts initial focus on the keep action, not the destructive one"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/delete-column-confirm.test.tsx#deletes nothing when Enter is pressed the moment the modal opens"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/delete-column-confirm.test.tsx#keeps the modal open on Escape while the delete is pending"
            status: pass
      human_judgment: false
    - id: D4
      description: "The kebab is complete: Rename Column then a destructive Delete Column, both offered on a lone column, with only the delete entry carrying the danger treatment"
      requirement: "COLUMN-04"
      verification:
          - kind: integration
            ref: "src/features/boards/components/column-header.test.tsx#offers Rename Column then Delete Column, in that order, when staged open"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/column-header.test.tsx#marks only the delete entry with the shared destructive treatment"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/column-header.test.tsx#still offers both entries on a board's only column"
            status: pass
      human_judgment: false
    - id: D5
      description: "COLUMN-04 end to end through the container: kebab -> confirmation naming that column -> exactly one call carrying both ids -> the column stands until the server agrees"
      requirement: "COLUMN-04"
      verification:
          - kind: integration
            ref: "src/features/boards/components/board-view.test.tsx (43 cases x 2 viewports, 86 passing)"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view.test.tsx#sends that column's own board id and column id with the delete, exactly once"
            status: pass
          - kind: integration
            ref: "pnpm test — 85 files / 1176 tests across all five Vitest projects"
            status: pass
      human_judgment: false
    - id: D6
      description: "Deleting the last column falls through to the shipped zero-columns empty state, and surviving columns keep their relative order"
      requirement: "COLUMN-04"
      verification:
          - kind: integration
            ref: "src/features/boards/components/board-view.test.tsx#falls through to the zero-columns empty state when no columns remain"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view.test.tsx#keeps the surviving columns in their relative order when a middle one is removed"
            status: pass
      human_judgment: false
    - id: D7
      description: "No new axe violations from the destructive menu entry or the confirmation panel"
      verification:
          - kind: automated_ui
            ref: "pnpm test:a11y (storybook project, 30 files / 179 tests)"
            status: pass
      human_judgment: false
    - id: D8
      description: "Visual conformance of the destructive kebab entry and the delete confirmation in the running app — danger colour, panel width against a 32-character name, at 375px and 1440px"
      verification: []
      human_judgment: true
      rationale: "Playwright MCP tools are not visible to spawned subagents (project-scoped .mcp.json is not inherited), so no live-app pass was possible from this executor. DOM-level proof exists from real Chromium layout (the body's scrollWidth stays inside clientWidth at a 32-char name, the title carries text-text-danger, the delete entry carries it and the rename entry does not) — but nobody has looked at the running board."

duration: 24min
completed: 2026-08-27
status: complete
---

# Phase 3 Plan 9: Delete a column from its header kebab Summary

**A destructive `Delete Column` entry completing the column kebab, a confirmation mirroring the shipped board-delete confirm one containment level down, and a delete that removes nothing from the screen until the server has agreed — the deliberate inverse of the same phase's optimistic rename.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-08-27T12:27:00Z
- **Completed:** 2026-08-27T12:51:41Z
- **Tasks:** 3
- **Files modified:** 13 (6 created, 7 modified)

## Accomplishments

- `deleteColumnAction` writes **both** path parameters explicitly (T-03-21), takes `userId` only from the verified session (T-03-09), runs `verifySession()` as its first statement (T-03-11), and parses its own two ids after that (T-03-01).
- Unlike the shipped board delete's single bare error status, the column delete routes its upstream failure through `mapProblemCodeToStatus`, so a stale `version` reaches the user as **`This board changed somewhere else.` / `Refresh to see the latest.`** rather than the generic retry copy that would loop them.
- `useDeleteColumn` applies **nothing** optimistically and navigates nowhere. The in-flight case proves this by *holding* the stubbed call and asserting the whole rendered name set is unchanged — not merely that the target column survived.
- The confirmation carries all three of U-04's safety mechanisms: `Keep Column` holds initial focus (so a reflexive Enter keeps the column), the body wraps rather than truncating, and the dismissal guard has **both** halves — the pending early return *and* `isDismissableOnBackdropClick={!isPending}`, because Base UI fires the close callback on Escape regardless of the backdrop prop.
- The kebab is now complete at two entries, both live on a lone column, with the danger colour coming from `Menu.Item`'s shared `isDestructive` prop rather than a local choice.

## Task Commits

1. **Task 1: the delete action, its stub and the wait-for-server hook** — `62e4f7f` (feat)
2. **Task 2: the delete confirmation and the kebab's destructive entry** — `dd23832` (feat)
3. **Task 3: the confirmed delete proved through the board container** — `dbfb6b7` (test)

## Files Created/Modified

- `src/features/boards/actions/delete-column.ts` — the `"use server"` write path, mirroring `delete-board.ts` step for step except at the failure mapping.
- `src/features/boards/hooks/use-delete-column.ts` — `useDeleteColumn`, `DeleteColumnArgs`, and the copy table carrying `CONFLICT`, `UNAUTHENTICATED` and `NOT_FOUND`.
- `src/features/boards/components/delete-column-confirm.tsx` — U-04's confirmation; `boardId` is a prop because a `ColumnFull` does not carry its board's id.
- `src/features/boards/components/delete-column-confirm.{stories,test}.tsx` — 4 stories, 17 cases at both viewports.
- `src/test-utils/delete-column-action-storybook-stub.ts` — queue/hold/reset programmable stub.
- `src/features/boards/components/column-header.tsx` — gains `onDelete` and the destructive `Delete Column` entry after `Rename Column`.
- `src/features/boards/components/column-header.{stories,test}.tsx` — `MenuOpenWithDelete` + `LoneColumnMenuOpen` stories, 4 new cases (one existing "only entry" case rewritten to the two-entry form).
- `src/features/boards/components/board-view.tsx` — `useDeleteColumn`, the keyed confirmation, `onDelete`, `defaultDeleteColumnTargetIndex`, and the close-on-settle submit handler.
- `src/features/boards/components/board-view.{stories,test}.tsx` — `DeleteColumnOpen`, `LoneColumn` and `ServerColumnRemoved` stories, 10 new cases.
- `vitest.config.ts` — one `serverActionStubAlias` entry (prefix rule re-checked: `delete-column` neither starts with nor is started by `delete-board`, `rename-column` or any other entry).

## Decisions Made

- **`DUPLICATE` is folded into `ERROR` inside the action, not added to the result union.** `mapProblemCodeToStatus` returns the shared `UpstreamFailureStatus`, which includes `DUPLICATE`; the plan's stated union omits it. A delete names nothing, so `DUPLICATE_RESOURCE` cannot describe one — exposing the branch would be a discriminant nothing can select. Folded at the mapping boundary with a one-line reason.
- **`NOT_FOUND` gets copy, and that is where a double submit lands.** `03-BACKEND-FACTS` R7 confirms a second `DELETE` answers `404 ENTITY_NOT_FOUND`, so the double-submit path falls through to the same not-found sentence as any other missing-id lookup rather than needing a branch of its own.
- **The container closes the confirmation on settle, not on submit.** This is the exact inverse of plan 03-08's rename handler and is deliberate: the rename had already applied its optimistic value before the modal closed, whereas nothing here changes until the server agrees, so the destructive button's pending state is the user's only signal.
- **`boardId` is a prop on `DeleteColumnConfirm`.** A `ColumnFull` carries no board id, so the confirm takes it the same way `RenameColumnModal` does.

## Backstop truths — all three are now RESOLVED, not pending

The plan carried three `verification: backstop` truths waiting on plan 03-01's probes. `03-BACKEND-FACTS.md` records all of them as **CONFIRMED**, so they are answered rather than outstanding:

- **Adjacency after a delete (A4 / probe R6):** positions **do** renumber contiguously (`[3,0,1,4]` → `[2,0,1,3]`, and again for a middle delete). The `position % 3` dot cycle therefore genuinely reshuffles after a delete for every column past the deleted one — cosmetic, and correct, because `ColumnHeader` reads the live `position` off its RSC-supplied column rather than a cached index.
- **Idempotency (probe R7):** a second `DELETE` answers `404 ENTITY_NOT_FOUND`. Covered by the hook's `NOT_FOUND` copy; the client-side guard (modal closes on settle, destructive button reports pending, asserted call count of exactly 1) remains the first line of defence.
- **Concurrency (probes R2/R3):** a reorder does **not** bump merely-shifted columns' `version`, so a delete straight after a reorder does not conflict for a reason the user could not have caused. Plan 03-10's in-flight lock stays worth having for the *moved* column, but the shifted ones are safe.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `mapProblemCodeToStatus`'s return type does not fit the plan's stated result union**

- **Found during:** Task 1
- **Issue:** The plan specifies a union of `SUCCESS`, `UNAUTHENTICATED`, `INVALID`, `CONFLICT`, `NOT_FOUND`, `ERROR`, but `mapProblemCodeToStatus` returns `UpstreamFailureStatus`, which also includes `DUPLICATE`. Assigning it directly does not typecheck.
- **Fix:** Folded `DUPLICATE` to `ERROR` at the call site with a one-line reason, keeping the union exactly as the plan states.
- **Files modified:** `src/features/boards/actions/delete-column.ts`
- **Verification:** `pnpm exec tsc --noEmit` exits 0.
- **Committed in:** `62e4f7f`

**2. [Rule 3 - Blocking] `vitest-browser-react`'s render result exposes no `queryByRole`**

- **Found during:** Task 2
- **Issue:** The "no bare Cancel" case was written with `screen.queryByRole(...)`, which does not exist on that package's `RenderResult` — `tsc` reported `TS2339`.
- **Fix:** Rewrote the assertion to read the panel's button labels off the DOM, which is also the stronger claim: the two controls are exactly `Delete Column` and `Keep Column`, so no third control can slip in either.
- **Files modified:** `src/features/boards/components/delete-column-confirm.test.tsx`
- **Verification:** `tsc --noEmit` exits 0; the case passes at both viewports.
- **Committed in:** `dd23832`

**3. [Rule 3 - Blocking] A 4-prose-line comment tripped the blocking `comments:check`**

- **Found during:** Task 1
- **Issue:** `delete-column.ts`'s result docstring ran to 4 prose lines; ADR tech/0023's `check-comment-length.mjs` caps it at 3 and fails CI.
- **Fix:** Compressed to 3 lines with no loss of the load-bearing claim (why `CONFLICT` is a real branch here and not in the board analog).
- **Files modified:** `src/features/boards/actions/delete-column.ts`
- **Verification:** `pnpm comments:check` passes.
- **Committed in:** `62e4f7f`

### Judgment calls that departed from the plan's letter

**4. Four acceptance-criteria greps are unsatisfiable as written; all four substantive requirements hold.**
The plan asks for `== 1` where the real count is 2, because each symbol appears on its import line *or* in the comment that explains it as well as at its use site. Measured against the shipped analogs for comparison:

| Criterion | Actual | Shipped analog | Substantive requirement |
|-----------|--------|----------------|-------------------------|
| `grep -c 'verifySession' delete-column.ts` == 1 | **2** | `rename-column.ts` = 2 | `verifySession()` is the first statement of the action body — holds |
| `grep -c 'mapProblemCodeToStatus' delete-column.ts` == 1 | **2** | `rename-column.ts` = 2 | the conflict branch is reachable — holds |
| `grep -c 'break-words' delete-column-confirm.tsx` == 1 | **2** | `delete-board-confirm.tsx` = 2 | the class is on `Modal.Description` — holds |
| `grep -c 'isDestructive' column-header.tsx` == 1 | **2** | `menu.tsx` = 3 | only the delete entry is marked destructive — holds, and is asserted by a test rather than a grep |

This is the same class of finding as plan 03-08's deviation 4.

**5. board-view's delete wiring landed in Task 2, not Task 3.**
The plan gives Task 2 a required `onDelete` on `ColumnHeader` but assigns all board-view wiring to Task 3. Here that is not merely the dead-control problem 03-08 hit — it is stronger: `onDelete` is a **required** prop, so a Task 2 commit without the container wiring would not compile. Task 2 therefore wires `useDeleteColumn`, the keyed confirmation, `onDelete` and `defaultDeleteColumnTargetIndex`; Task 3 adds the three stories and the ten behaviour cases.

**6. Task 1's four hook behaviours are asserted in `board-view.test.tsx`, not a new `*.unit.test.ts`.**
A `unit`-project test **cannot** import `use-delete-column.ts` at all: its chain reaches `src/lib/server/server-client.ts`, which throws at module load when `EXTERNAL_API_BASE_URL` is unset, and the `unit` project's `env` block (`vitest.config.ts:186-188`) sets only `SESSION_SECRET`. Re-verified in this worktree rather than assumed from plan 03-08. Task 1's own `<verify>` (`tsc --noEmit && pnpm test:unit`) ran clean as a no-regression gate; the four behaviours are covered by Task 3's cases (see coverage D2), which is also where the shipped analog's coverage lives.

**7. Ten board-view cases, not eight; four column-header cases, not two.**
The board-view extras are a staged-open case (mirroring the shipped `DeleteOpen` precedent in `board-list.test.tsx`) and a lone-column case at container level. The column-header extras are a destructive-treatment case and a lone-column case — the plan's Task 2 Test 7 asks for the lone-column claim, and it is asserted at both levels because the header is what actually decides it.

**8. Task 3 needed a third story the plan did not name: `ServerColumnRemoved`.**
Test 7 asks that surviving columns keep their relative order, but the container deliberately **never** removes a column itself — `refresh()` does. The only honest way to read post-delete order through the container is to land the refreshed render a completed delete produces, which needs a stories-file host (the same route `ServerPropsHost` already takes for the rename override). Asserting order on a hand-trimmed fixture would have tested the fixture, not the component.

**9. TDD discipline: no separate RED commit exists, and Task 1 added no new test file.**
For Tasks 2 and 3 the tests and their implementation landed in one commit each, because this repo's type-aware `eslint --fix` pre-commit hook rejects a RED-only commit whose staged test imports a not-yet-existing export (structural; recorded in project memory and confirmed on plans 03-04 and 03-08). `--no-verify` was not used. Task 1 has no test file of its own for the reason in deviation 6.

---

**Total deviations:** 3 auto-fixed (all Rule 3 - blocking) + 6 documented judgment calls.
**Impact on plan:** No scope creep. Deviations 1-3 were compile/lint gates; 5-6 resolve tensions internal to the plan's own task split; 7-8 strengthen coverage beyond what was asked.

## Verification Results

Every command below was run in this worktree and its real result is reported.

| Command | Result |
|---------|--------|
| `pnpm exec tsc --noEmit` | exit 0 |
| `pnpm test` (all five Vitest projects) | **85 files, 1176 tests, 0 failures** (up from 83 / 1105) |
| `pnpm test:a11y` (storybook/axe) | **30 files, 179 tests, 0 failures** (up from 29 / 170) |
| `pnpm test:unit` | 11 files, 154 tests, 0 failures |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm routes:check` / `handlers:check` / `stories:check` / `renders:check` / `tsx:check` / `comments:check` | all exit 0 |
| `pnpm api:generate` | no diff |
| `test ! -d src/features/columns` | passes |

Per-suite counts: `delete-column-confirm.test.tsx` 34 passing (17 cases x 2 viewports), `column-header.test.tsx` 34 passing (17 x 2, up from 26), `board-view.test.tsx` 86 passing (43 x 2, up from 66).

**Environment note (not a defect):** `pnpm exec next typegen` was run once before the first type check. A fresh worktree has no `.next/types`, which `tsconfig.json` includes, so the first `tsc --noEmit` otherwise reports phantom `PageProps`/`LayoutProps` errors. Plan 03-08 recorded the same; running it up front meant the error was never hit here.

## Verification Gaps — read this before signing COLUMN-04 off

**1. No live-app visual pass.** Playwright MCP tools are not visible to spawned subagents (a project-scoped `.mcp.json` is not inherited), so nobody has driven the running board. What *is* proven at DOM level from real Chromium layout: the confirmation title carries `text-text-danger`, only the delete menu entry carries it (the rename entry is `text-text-primary`), the destructive button carries `bg-bg-danger` and the secondary `bg-bg-surface`, `Keep Column` holds focus on open, and the body's `scrollWidth` stays inside its `clientWidth` at a 32-character name while wrapping to more than one line. What is **not** proven: how the open kebab and the confirmation actually look on a real board at 375px and 1440px. Recorded in `.planning/WINDOWS.md` as an `unrun-verify`.

**2. The live request URL is unproven, by design.** `T-03-21` — a dropped `boardId` produces a URL containing the literal `%7BboardId%7D` placeholder, and neither the compiler nor the fetch-layer serializer complains. This plan mitigates it with an explicit source assertion; only plan **03-11**'s integration test against the real backend can actually catch it. This matters more here than for rename: a delete against a malformed URL is the failure it is worst to discover late. Do not read D1's `pass` as proof the request reaches the right URL.

**3. The mock shows no per-column kebab at all.** Rendered `docs/kanban-task-management-web-app.pdf` pages 3 and 13 during plan 03-08: the mock's column headers are dot + caption only, and it batches column editing into a `Board Columns` section inside Edit Board. `03-UI-SPEC.md`'s **U-01** names and rejects that design with a stated rationale, and **D-06** builds on it — so this is a recorded, reasoned departure, not an oversight. It is repeated here because this plan adds the *second* entry to that kebab and the divergence therefore widens. The confirmation panel itself has no mock disagreement: it mirrors the shipped board-delete confirm, which was verified against the mock in Phase 2.

**4. The cascade itself is proven only against the backend, not through this UI.** `03-BACKEND-FACTS` R6 confirms deleting a column removes its tasks server-side, observed by probe. Nothing in this plan's tests exercises a real cascade — the stub returns a status. Plan 03-11 is what closes that.

## Known Stubs

None. Both kebab entries do what they say, the confirmation's submit reaches a real action, and the failure branches raise real authored copy. `delete-column-action-storybook-stub.ts` is a test-only alias target under ADR tech/0020's carve-out, not a stub shipped to users.

## Issues Encountered

- The plan's Task 2/Task 3 split could not be executed literally: `onDelete` is a required prop, so deferring the container wiring to Task 3 would have left Task 2's commit failing to compile (deviation 5). Resolved by moving the wiring one task earlier, as plan 03-08 did for the same structural reason.
- Test 7's ordering claim has no honest container-level assertion without a refreshed-render host, because the container never removes a column itself (deviation 8).

## Next Phase Readiness

- **03-10 (reorder)** gets the kebab in its final two-entry shape, so the heading can become an Enter-lifting drag handle without ambiguity (D-06). Note R2's finding: shifted columns' versions are **not** bumped, so the in-flight lock only needs to cover the moved column.
- **03-11 (integration tests)** must cover `deleteColumnAction` against the real backend — that is the only thing that can close T-03-21 for this endpoint, and it is the endpoint where a malformed URL is worst.
- **Phase 4 (SYNC-01)** now has a second live `CONFLICT` branch with real copy, alongside the rename's, to build reconciliation from.

## Self-Check: PASSED

- All six `key-files.created` entries exist on disk (`ls -1` on each path returns it).
- All three task commits resolve in `git log`: `62e4f7f`, `dd23832`, `dbfb6b7`.
- Every task's `<acceptance_criteria>` grep was executed and its real count recorded; the four that cannot hold as written are documented in deviation 4, with the shipped analogs measured for comparison.
- Every plan-level `<verification>` command was run; results are in the table above.
- No file was deleted by any commit (`git diff --diff-filter=D --name-only c432b2b9 HEAD` is empty).
- `actuals.tokens` is chars/4 over the 13 files actually changed (110,282 chars), the same scale the plan's `estimate` used.

---

_Phase: 03-column-management_
_Completed: 2026-08-27_
