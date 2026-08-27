---
phase: 03-column-management
plan: 08
subsystem: ui
tags: [react, next, server-actions, tanstack-query, react-hook-form, zod, base-ui, optimistic-concurrency]

requires:
    - phase: 03-column-management
      provides: "renameColumnInputSchema / renameColumnFormSchema (plan 03-04), the extracted ColumnHeader (03-06), the wired board container and its create path (03-05, 03-07)"
    - phase: 02-board-management
      provides: "renameBoardAction + use-rename-board's optimistic-override pattern, the Menu/IconButton/Modal/TextField primitives, the Server-Action Storybook stub carve-out"
provides:
    - "renameColumnAction — PUT /boards/{boardId}/columns/{columnId} carrying the column's own version, returning bare RESULT_STATUS discriminants"
    - "useRenameColumn — optimistic apply, derivation-based retirement, rollback, and a version-conflict toast distinct from the generic one"
    - "RenameColumnModal — single-field rename form with no pending state, closing on submit"
    - "The column-header kebab: a sibling of the heading, 44px, carrying the first live Rename Column entry"
    - "The column <section>'s redundant tab stop removed, with test:a11y still green"
    - "rename-column-action-storybook-stub — queue/hold/reset programmable stub for the rename action"
affects: [03-09 delete-column, 03-10 column-reorder, 03-11 integration-tests, phase-04 sync-reconciliation]

actuals:
    tokens: 22556
    tasks: 3
    commits: 3

tech-stack:
    added: []
    patterns:
        - "A column-scoped optimistic override retired by pure derivation (id match AND server name still equals previousName), never cleared during render"
        - "A per-mutation copy table that carries CONFLICT as its own branch where the board analog deliberately folds it into the generic path"
        - "A kebab rendered as a sibling of its heading so a later drag handle on that heading cannot make Enter ambiguous"

key-files:
    created:
        - src/features/boards/actions/rename-column.ts
        - src/features/boards/hooks/use-rename-column.ts
        - src/features/boards/components/rename-column-modal.tsx
        - src/features/boards/components/rename-column-modal.stories.tsx
        - src/features/boards/components/rename-column-modal.test.tsx
        - src/test-utils/rename-column-action-storybook-stub.ts
    modified:
        - src/features/boards/components/column-header.tsx
        - src/features/boards/components/column-header.stories.tsx
        - src/features/boards/components/column-header.test.tsx
        - src/features/boards/components/board-view.tsx
        - src/features/boards/components/board-view.stories.tsx
        - src/features/boards/components/board-view.test.tsx
        - vitest.config.ts

key-decisions:
    - "The column copy table carries a CONFLICT entry the board analog omits — retrying a stale version fails identically, so generic retry copy would loop the user"
    - "DUPLICATE is left falling through to the generic copy: 03-BACKEND-FACTS R5 observed the backend ACCEPTING a duplicate column name, so a bespoke duplicate sentence would be dead copy"
    - "board-view's rename wiring landed in Task 2 rather than Task 3, so that no commit in this plan ships a kebab entry that does nothing"
    - "Task 1's derivation behaviours are asserted in board-view.test.tsx, matching where the shipped applyRenameOverride is asserted — a unit test cannot import the hook at all (see Deviations)"

patterns-established:
    - "Derivation-based override retirement for a column-scoped optimistic rename, with no context provider — exactly one container consumes it"
    - "A failure test HOLDS the stubbed call, observes the optimistic value, then settles the failure — proving apply-then-rollback rather than 'the value never changed'"

requirements-completed: [COLUMN-02]

coverage:
    - id: D1
      description: "renameColumnAction sends BOTH boardId and columnId in params.path, the column's own version in the body, userId only from the verified session, and returns bare discriminants"
      requirement: "COLUMN-02"
      verification:
          - kind: other
            ref: "grep -c 'boardId: parsed.data.boardId, columnId: parsed.data.columnId' src/features/boards/actions/rename-column.ts == 1"
            status: pass
          - kind: other
            ref: "grep -c 'query: { userId: record.id }' && grep -c 'version: parsed.data.version' == 1 each"
            status: pass
          - kind: other
            ref: "pnpm exec tsc --noEmit"
            status: pass
      human_judgment: false
    - id: D2
      description: "The optimistic hook: apply before the call, retire by derivation, roll back on failure, and give CONFLICT its own toast copy"
      requirement: "COLUMN-02"
      verification:
          - kind: integration
            ref: "src/features/boards/components/board-view.test.tsx#closes the modal and shows the new name in that header before the rename resolves"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view.test.tsx#restores the whole rendered name set and announces the reason when a rename fails"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view.test.tsx#raises the distinct version-conflict copy, not the generic one, for a stale version"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view.test.tsx#retires the override once the refreshed props carry it, so a later server change renders"
            status: pass
      human_judgment: false
    - id: D3
      description: "RenameColumnModal matches the Copywriting Contract, validates the 3-32 bound before submit, and has no pending state"
      requirement: "COLUMN-02"
      verification:
          - kind: integration
            ref: "src/features/boards/components/rename-column-modal.test.tsx (9 cases x 2 viewports, 18 passing)"
            status: pass
          - kind: other
            ref: "grep -c 'isPending' src/features/boards/components/rename-column-modal.tsx == 0"
            status: pass
      human_judgment: false
    - id: D4
      description: "Every column header carries a kebab named 'Column actions for {NAME}', 44px, a sibling of the heading, whose only entry is Rename Column"
      requirement: "COLUMN-02"
      verification:
          - kind: integration
            ref: "src/features/boards/components/column-header.test.tsx#names the kebab after its own column and keeps it outside the heading"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/column-header.test.tsx#gives the kebab a 44px touch target"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/column-header.test.tsx#opens the menu on a plain click without activating the heading"
            status: pass
      human_judgment: false
    - id: D5
      description: "The column <section>'s tabIndex and focus ring are gone, with no scrollable-region-focusable regression"
      verification:
          - kind: automated_ui
            ref: "pnpm test:a11y (storybook project, 29 files / 170 tests)"
            status: pass
          - kind: other
            ref: "grep -c 'tabIndex' && grep -c 'focus-visible:ring' src/features/boards/components/board-view.tsx == 0 each"
            status: pass
      human_judgment: false
    - id: D6
      description: "COLUMN-02 end to end through the container: kebab -> modal -> optimistic name -> persist or roll back with the right toast"
      requirement: "COLUMN-02"
      verification:
          - kind: integration
            ref: "src/features/boards/components/board-view.test.tsx (33 cases x 2 viewports, 66 passing)"
            status: pass
          - kind: integration
            ref: "pnpm test — 83 files / 1105 tests across all five Vitest projects"
            status: pass
      human_judgment: false
    - id: D7
      description: "Visual conformance of the new header row and rename modal in the running app — kebab placement, caption-to-kebab spacing, truncation against a real board at 375px and 1440px"
      verification: []
      human_judgment: true
      rationale: "Playwright MCP tools are not visible to spawned subagents (project-scoped .mcp.json is not inherited), so no live-app pass was possible from this executor. Static/DOM-level proof exists (44px measured from getBoundingClientRect, truncation measured from scrollWidth vs clientWidth), and the PDF mock was compared page 3 / page 13 — but nobody has looked at the running board."

duration: 27min
completed: 2026-08-27
status: complete
---

# Phase 3 Plan 8: Rename a column from its header kebab Summary

**A per-column kebab whose `Rename Column` entry opens a single-field modal, an optimistic rename carrying the column's own `version`, and a rollback whose stale-version branch gets its own toast copy — plus the removal of the per-column tab stop the kebab made obsolete.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-08-27T11:44:00Z
- **Completed:** 2026-08-27T12:11:00Z
- **Tasks:** 3
- **Files modified:** 13 (6 created, 7 modified)

## Accomplishments

- `renameColumnAction` writes **both** path parameters explicitly (T-03-21), sends the column's own `version` (T-03-04), takes `userId` only from the verified session (T-03-05), and returns bare `RESULT_STATUS` discriminants so no upstream text can reach a toast (T-03-03).
- `useRenameColumn` applies the new name before the call and retires the override by pure derivation — the override stops applying the moment the refreshed RSC props no longer carry `previousName`, so nothing is ever cleared during render (T-03-29).
- The version-conflict branch has copy of its own — `This board changed somewhere else.` / `Refresh to see the latest.` — proved *different* from the generic `Couldn't rename column.` / `Try again.`, not merely proved to raise something.
- Every column header now carries a 44px kebab that is a **sibling** of the heading, never a descendant, which is what keeps plan 03-10's Enter-activated drag handle unambiguous (D-06).
- The column `<section>`'s `tabIndex={0}` and focus ring are gone and `pnpm test:a11y` stays green — the kebab is the real focusable content axe's `scrollable-region-focusable` rule was asking for.

## Task Commits

1. **Task 1: the rename action, its stub and the optimistic hook** — `b1aa47f` (feat)
2. **Task 2: the rename modal, the column kebab, and the section tab stop's removal** — `8f82a27` (feat)
3. **Task 3: the optimistic rename proved through the board container** — `996e724` (test)

## Files Created/Modified

- `src/features/boards/actions/rename-column.ts` — the `"use server"` write path, mirroring `rename-board.ts` step for step.
- `src/features/boards/hooks/use-rename-column.ts` — `useRenameColumn`, `ColumnRenameOverride`, the pure `applyColumnRenameOverride`, and the copy table.
- `src/features/boards/components/rename-column-modal.tsx` — the single-field RHF form; no `isPending`, closes on submit.
- `src/features/boards/components/rename-column-modal.{stories,test}.tsx` — 4 stories, 9 cases at both viewports.
- `src/test-utils/rename-column-action-storybook-stub.ts` — queue/hold/reset programmable stub.
- `src/features/boards/components/column-header.tsx` — gains the kebab, `onRename` and `defaultIsMenuOpen`; the sticky treatment moves to a flex row wrapping the heading and the kebab.
- `src/features/boards/components/column-header.{stories,test}.tsx` — `MenuOpen` story, 4 new cases.
- `src/features/boards/components/board-view.tsx` — `useRenameColumn`, the keyed rename modal, `defaultRenameColumnTargetIndex`; `tabIndex`/focus ring removed.
- `src/features/boards/components/board-view.{stories,test}.tsx` — `RenameColumnOpen` + `ServerColumnsAdvance` stories, 10 new cases.
- `vitest.config.ts` — one `serverActionStubAlias` entry (prefix rule re-checked: `rename-column` neither starts with nor is started by any existing entry).

## Decisions Made

- **`CONFLICT` earns its own copy here, unlike the board analog.** `use-rename-board.ts` deliberately folds a stale version into its generic path because explaining reconciliation is Phase 4's job. The column hook cannot: retrying with the same stale `version` fails identically, so "Try again." would loop the user. This is the UI-SPEC's own error/version-conflict row.
- **`DUPLICATE` is *not* given bespoke copy** and falls through to the generic sentence. `03-BACKEND-FACTS` R5 observed the backend accepting a duplicate column name, so a "that name is taken" sentence would be copy nothing can select — the same reasoning `use-create-column.ts` records for its own advisory entry, taken one step further.
- **No context provider.** The board rename needed one because the sidebar row and the dashboard header assert the name in the same instant; exactly one container consumes the column override, so local state is the whole requirement.
- **The kebab is a sibling of the heading**, and the heading keeps the `id` the section's `aria-labelledby` points at. Task cards, the count suffix and the dot are untouched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `.next/types` absent in a fresh worktree made `tsc --noEmit` report two phantom errors**

- **Found during:** Task 1 (first type check)
- **Issue:** `app/(dashboard)/boards/[boardId]/page.tsx: Cannot find name 'PageProps'` and `app/layout.tsx: Cannot find name 'LayoutProps'`. `tsconfig.json` includes `.next/types/**/*.ts`, which only exists after Next has generated route types; a `git worktree add` never carries them.
- **Fix:** Ran `pnpm exec next typegen`. No source change, nothing committed — an environment gap, not a defect. Any executor in a fresh worktree will hit this before its first `tsc` run.
- **Verification:** `pnpm exec tsc --noEmit` exits 0 afterwards, and stayed at 0 for every later run.
- **Committed in:** n/a (no file change)

**2. [Rule 1 - Bug] Two shipped tests asserted the pre-kebab header DOM and would have failed**

- **Found during:** Task 2
- **Issue:** `board-view.test.tsx` asserted each section's `firstElementChild.tagName === "H2"`, and `column-header.test.tsx` asserted `document.querySelectorAll("button")).toHaveLength(0)` for a column with no tasks. Both encode the header shape the kebab changes.
- **Fix:** The board-view assertion now reads `firstElementChild.firstElementChild` (the header row wraps the heading); the column-header one now asserts the kebab is the header's *only* control, which is the stronger form of the original "no add-a-task affordance" claim.
- **Files modified:** `board-view.test.tsx`, `column-header.test.tsx`
- **Verification:** both suites green.
- **Committed in:** `8f82a27`

### Judgment calls that departed from the plan's letter

**3. Task 1's five behaviour cases live in `board-view.test.tsx`, not a new `*.unit.test.ts`.**
The criterion says to put them "in whichever suite the shipped `applyRenameOverride` coverage lives in" — that is `board-list.test.tsx`, the container's browser suite, so the column analog belongs in `board-view.test.tsx`. Independently, a `unit`-project test **cannot** import `use-rename-column.ts` at all: its chain reaches `src/lib/server/server-client.ts`, which throws at module load when `EXTERNAL_API_BASE_URL` is unset, and the `unit` project's `env` block sets only `SESSION_SECRET`. Task 1's own `<verify>` (`tsc --noEmit && pnpm test:unit`) ran clean as a no-regression gate; the five behaviours are covered by Task 3's cases (see coverage D2).

**4. Task 1's criterion `grep -c 'verifySession' … returns 1` is unsatisfiable as written.**
It returns **2** — the import plus the call. The shipped analog `rename-board.ts` returns 2 for the same reason (verified). The substantive requirement the criterion is reaching for — `verifySession()` as the first statement of the action body — holds.

**5. board-view's rename wiring landed in Task 2, not Task 3.**
The plan gives Task 2 a required `onRename` on `ColumnHeader` but assigns all board-view wiring to Task 3, which would have left one commit shipping a `Rename Column` entry that does nothing — the dead-control failure this codebase explicitly refuses. Task 2 therefore wires `useRenameColumn`, the keyed modal and `onRename`; Task 3 adds `defaultRenameColumnTargetIndex`, the two new stories and the ten behaviour cases. Every commit in the plan leaves the tree shipping only live controls.

**6. Ten behaviour cases in `board-view.test.tsx`, not seven.**
The plan's seven, plus a null-override case (Task 1 Test 1), an unauthenticated-copy case, and the `ServerColumnsAdvance` retirement case (Task 1 Test 3), which needed a story host mirroring `board-list.stories.tsx`'s `ServerPropsHost`.

**7. Both failure cases were strengthened to hold the stubbed call.**
Asserting only that the name set matched its pre-submit value would have passed whether or not the override was ever applied. Each failure case now queues the failure, holds the call, asserts the optimistic name is on screen, *then* settles — so apply-then-rollback is genuinely observed.

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug) + 5 documented judgment calls.
**Impact on plan:** No scope creep. Deviations 3-5 resolve internal tensions in the plan's own task split; 6-7 strengthen coverage beyond what was asked.

## Verification Results

Every command below was run in this worktree and its real result is reported.

| Command | Result |
|---------|--------|
| `pnpm exec tsc --noEmit` | exit 0 (after `next typegen`, see deviation 1) |
| `pnpm test` (all five Vitest projects) | **83 files, 1105 tests, 0 failures** |
| `pnpm test:a11y` (storybook/axe) | **29 files, 170 tests, 0 failures** — no `scrollable-region-focusable` regression |
| `pnpm test:unit` | 11 files, 154 tests, 0 failures |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm routes:check` / `handlers:check` / `stories:check` / `renders:check` / `tsx:check` / `comments:check` | all exit 0 |
| `pnpm api:generate` | no diff |
| `test ! -d src/features/columns` | passes |

Per-suite counts: `rename-column-modal.test.tsx` 18 passing (9 cases x 2 viewports), `column-header.test.tsx` 26 passing (13 x 2), `board-view.test.tsx` 66 passing (33 x 2, up from 46).

**One caveat on a single earlier run:** a standalone `pnpm test:browser` invocation part-way through Task 2 reported 12 failures across 4 files, including `theme-toggle.test.tsx`, which this plan does not touch. Those did **not** reproduce in the full `pnpm test` run above, nor in any targeted re-run, and CONVENTIONS.md's "Test runner concurrency" section already records this suite's known timeout flakiness. Reported rather than omitted; not investigated further, as it is outside this plan's scope.

## Verification Gaps — read this before signing COLUMN-02 off

**1. No live-app visual pass.** Playwright MCP tools are not visible to spawned subagents (a project-scoped `.mcp.json` is not inherited), so nobody has driven the running board. What *is* proven at DOM level from real layout in Chromium: the kebab measures ≥44x44px (`getBoundingClientRect`), the column name still truncates while the count stays whole (`scrollWidth` vs `clientWidth`), and the rename panel does not exceed `min(90vw, 28rem)`. What is **not** proven: how the header row actually looks on a real board at 375px and 1440px. Recorded in `.planning/WINDOWS.md` as an `unrun-verify`.

**2. The mock disagrees with the UI-SPEC here, and the UI-SPEC was followed deliberately.** Rendered `docs/kanban-task-management-web-app.pdf` pages 3 (light) and 13 (dark): **neither shows any per-column kebab.** The mock's column headers are dot + caption only, and the PDF instead batches column editing into a `Board Columns` section inside Edit Board. That is precisely the design `03-UI-SPEC.md`'s **U-01** names and rejects, with a stated rationale (per-column `version` makes one `Save Changes` across N columns N independently-failing calls), and **D-06** then builds on. So this is a recorded, reasoned departure from the mock — not an oversight — but it is a real divergence and it is flagged here rather than left implicit. The rename modal's own chrome *does* match the mock: PDF page 7's `Edit Task` panel is a left-aligned bold title, a labelled field, and a full-width primary `Save Changes` — the silhouette `RenameColumnModal` renders.

**3. The live request URL is unproven, by design.** `T-03-21` — a dropped `boardId` produces a URL containing the literal `%7BboardId%7D` placeholder, and neither the compiler nor the fetch-layer serializer complains. This plan mitigates it with an explicit source assertion; only plan **03-11**'s integration test against the real backend can actually catch it. Do not read D1's `pass` as proof the request reaches the right URL.

**4. Unicode counting is a backstop, not a verified fact.** The client's 3-32 check counts UTF-16 code units; nothing in the OpenAPI contract or `02-BACKEND-FACTS.md` says what the backend counts. A name with astral characters or combining marks may be accepted here and refused upstream, surfacing as a generic failure toast. Unchanged from the plan's own `must_haves` backstop.

## Known Stubs

None. Every control this plan ships does what it says: the kebab's one entry opens a real modal, and the modal's submit reaches a real action. `Delete Column` is deliberately **absent** rather than present-and-inert — it lands with plan 03-09.

## Issues Encountered

- The plan's Task 2/Task 3 split could not be executed literally without one commit shipping an inert menu entry (deviation 5). Resolved by moving the container wiring one task earlier.
- `pnpm test:browser -- <file>` does **not** filter to that file — pnpm swallows the argument and the whole browser project runs. Use `pnpm exec vitest run --project browser <file>` for a targeted run.

## Next Phase Readiness

- **03-09 (delete column)** can add its `Delete Column` entry to the kebab that now exists; `Menu.Item`'s `isDestructive` is already wired and the UI-SPEC's copy is settled.
- **03-10 (reorder)** gets what D-06 asked for: the kebab is a control separate from the heading, so the heading can become an Enter-lifting drag handle without ambiguity. Note the heading is now wrapped in a `sticky flex` row — the drag handle goes *inside* the `<h2>`, per the UI-SPEC anatomy.
- **03-11 (integration tests)** must cover `renameColumnAction` against the real backend; that is the only thing that can close T-03-21.
- **Phase 4 (SYNC-01)** now has a live `CONFLICT` branch with real copy to build reconciliation from, rather than a discriminant nothing selects.

## Self-Check: PASSED

- All six `key-files.created` entries exist on disk (`ls -1` on each path returns it).
- All three task commits resolve in `git log`: `b1aa47f`, `8f82a27`, `996e724`.
- Every task's `<acceptance_criteria>` grep was executed and its real count recorded; the one
  criterion that cannot hold as written (`verifySession` == 1) is documented as deviation 4, with
  the shipped analog measured for comparison.
- Every plan-level `<verification>` command was run; results are in the table above.
- No file was deleted by any commit (`git diff --diff-filter=D` empty for all three).

---

_Phase: 03-column-management_
_Completed: 2026-08-27_
