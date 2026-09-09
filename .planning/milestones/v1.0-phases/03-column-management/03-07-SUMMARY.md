---
phase: 03-column-management
plan: 07
subsystem: ui
tags: [react, storybook, vitest, base-ui, toast, scroll-behavior, accessibility]

# Dependency graph
requires:
  - phase: 03-column-management
    provides: "plan 03-05's BoardView container, useCreateColumn failure table, AddColumnModal, AddColumnPlaceholder and the aliased create stub; plan 03-06's ColumnHeader; plan 03-04's shouldNudgeOnColumnCount and COLUMN_COUNT_NUDGE_THRESHOLD; plan 03-01's R5 probe"
  - phase: 02-board-crud
    provides: "the shipped Toast and useToast, use-rename-board.ts's title/description toast shape, use-create-board.ts's DUPLICATE table entry precedent, mapProblemCodeToStatus"
provides:
  - "The zero-columns empty state's live `+ Add New Column` primary CTA, opening the same AddColumnModal instance the ghost column opens"
  - "AddColumnModal rendered for BOTH board states — the zero-columns branch no longer returns before the modal exists"
  - "The DUPLICATE entry in useCreateColumn's failure-copy table (advisory only — see Known Stubs)"
  - "D-04's post-create auto-scroll, governed by one CSS declaration on the row rather than a JavaScript branch"
  - "D-03/D-05's neutral nine-column nudge toast, raised strictly after the create succeeds"
  - "AddColumnPlaceholder's optional `ref` prop — the scroll target D-04 brings into view"
  - "board-view.stories.tsx's DuplicateColumnName, SevenColumns, EightColumns, NineColumns"
affects: [03-08, 03-09, 03-10, 03-11]

actuals:
  tokens: 8656
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Motion expressed once in CSS on the scrolling box, with the scroll call passing no motion argument so `motion-reduce:` can vary it"
    - "A pending-scroll request held in a ref rather than state, because React Compiler's lint bars clearing it with setState inside the effect"
    - "A container branch rendered as a conditional inside one fragment, so a shared modal instance survives both branches"

key-files:
  created: []
  modified:
    - src/features/boards/components/board-view.tsx
    - src/features/boards/components/board-view.stories.tsx
    - src/features/boards/components/board-view.test.tsx
    - src/features/boards/components/add-column-placeholder.tsx
    - src/features/boards/hooks/use-create-column.ts

key-decisions:
  - "The pending-scroll request is a `useRef`, not `useState` — the plan's two-phase design (scroll once at success, again once refresh() grows the row, then retire) needs the request cleared from inside the effect, and `react-hooks/set-state-in-effect` refuses that as an error"
  - "The immediate scroll is called directly from the create-success branch and the second from the effect, both through one local function, so `scrollIntoView` still appears exactly once"
  - "AddColumnPlaceholder gained an optional `ref` prop although the plan's files_modified list omitted the file — its own key_links require a ref on the ghost column, and React 19 takes `ref` as a plain prop"
  - "The duplicate copy lands in the modal's existing inline `role=\"alert\"` region beneath the Column Name field, not in TextField's own errorMessage slot — the plan mandates 'no new prop, no new modal state'"
  - "EightColumns/SevenColumns/NineColumns are all staged with the modal already open, so no ghost-column click can scroll the row before the create under test does"

patterns-established:
  - "Reduced-motion for a scroll: the scroll call names no motion, the row names both the motion and its opt-out"
  - "A count-transition nudge tested at its threshold and at both neighbours, so 'fires once' is proved by the transition rather than by remembered state"

requirements-completed: [COLUMN-01]

coverage:
  - id: D1
    description: "UI-SPEC empty/0-columns: a board with no columns offers the PDF's empty heading plus a filled, auto-width, centred `+ Add New Column` button, and no ghost column"
    requirement: "COLUMN-01"
    verification:
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > offers the empty-state call to action and no ghost column on a board with no columns"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > renders the verbatim empty-board message and no columns for a board with none"
        status: pass
      - kind: a11y
        ref: "pnpm test:a11y — 163 passed across 28 files, no axe violation on the four new stories"
        status: pass
      - kind: automated_ui
        ref: "Checkpoint walkthrough step 1 (headless Playwright, running app, light and dark) — CTA 143px against a 980px main (14.6%, auto-width), centred to 0px offset, accent rgb(99,95,199), no ghost column in this state"
        status: pass
    human_judgment: false
  - id: D2
    description: "The two CTA labels stay distinct and PDF-verbatim: `+ Add New Column` in the empty state, `+ New Column` on the ghost column, each owned by its own component"
    requirement: "COLUMN-01"
    verification:
      - kind: other
        ref: "grep -c '+ Add New Column' board-view.tsx = 1; grep -c '+ New Column' add-column-placeholder.tsx = 1"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > offers the empty-state call to action and no ghost column on a board with no columns"
        status: pass
    human_judgment: false
  - id: D3
    description: "COLUMN-01 is reachable from the zero-columns state: the CTA opens the same modal and a submit reaches the create action once with the board's own id"
    requirement: "COLUMN-01"
    verification:
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > opens the same Add Column modal from the empty-state call to action"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > reaches the create action once from the empty state, with the board's own id"
        status: pass
    human_judgment: false
  - id: D4
    description: "UI-SPEC error/Add-Column-duplicate: a duplicate-name refusal shows its own copy inline in the still-open modal, never a toast, and does not swallow the generic failure branch"
    requirement: "COLUMN-01"
    verification:
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > keeps the modal open with the duplicate-name copy when the name is refused as a duplicate"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > still renders the generic create-failure copy for a failure that is not a duplicate"
        status: pass
      - kind: automated_ui
        ref: "Checkpoint walkthrough step 5 (running app, real nonprod backend) — submitting a duplicate name SUCCEEDED: 10 -> 11 columns, two identically named, modal closed, no inline error"
        status: pass
    human_judgment: false
    rationale: "Wiring proved through the aliased stub; the branch itself is CONFIRMED UNREACHABLE against the real backend, exactly as 03-BACKEND-FACTS R5 predicts. Recorded under Known Stubs as client-only advisory UX with no server backstop. `status: pass` records that the observation matched the prediction, not that a duplicate is refused."
  - id: D5
    description: "D-04: a successful create scrolls the column row to bring the end of the row — and so the new column — into view; a failed create does not"
    requirement: "COLUMN-01"
    verification:
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > scrolls the column row to its end after a successful create, with motion governed by CSS"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > leaves the column row where it was when the create fails"
        status: pass
      - kind: automated_ui
        ref: "Checkpoint walkthrough step 3 (running app) — creating a 9th column moved scrollLeft 0 -> 2060 and the new column landed fully in view; settles 24px short of max, which is the row's own p-6"
        status: pass
    human_judgment: false
    rationale: "The tests prove only the FIRST of the two passes — a composed story's board prop is static, so no test here can grow the column count. The second pass, which fires once the action's own refresh() grows the row, was observed in the running app: it is what carried scrollLeft to 2060 and put the new column in view."
  - id: D6
    description: "D-04's motion is one CSS declaration: the scroll call names no motion, and the row carries the smooth-scroll utility with its reduced-motion opt-out"
    verification:
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > scrolls the column row to its end after a successful create, with motion governed by CSS — asserts getComputedStyle(row).scrollBehavior === 'smooth'"
        status: pass
      - kind: other
        ref: "grep -c 'behavior' board-view.tsx = 0; grep -c 'motion-reduce:' board-view.tsx = 1, on the horizontal scroll row"
        status: pass
      - kind: automated_ui
        ref: "Checkpoint walkthrough step 3 under prefers-reduced-motion: reduce (running app) — computed scroll-behavior flipped smooth -> auto and the scroll had already jumped the full 2084px at 150ms; the new column still ended up in view"
        status: pass
    human_judgment: false
    rationale: "The tests read `smooth` off real computed style but assert the reduced-motion opt-out structurally only (the class), because Vitest Browser Mode exposes no reduced-motion emulation. The preference was exercised for real in the running app: one CSS declaration governs both, with no JavaScript branch."
  - id: D7
    description: "D-03/D-05: exactly one neutral informational toast on the create that takes the board to nine columns; none at eight, none at ten"
    verification:
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > raises one neutral nudge on the create that takes the board to nine columns"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > raises no nudge on the create that takes the board to eight columns"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > raises no nudge on the create that takes the board to ten columns"
        status: pass
    human_judgment: false
  - id: D8
    description: "T-03-28: the nudge is raised in the shipped Toast's neutral treatment, and D-02 holds — it never blocks, delays or gates the create"
    verification:
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > raises one neutral nudge ... — asserts the toast root lacks border-l-border-danger, the action was called once, and the modal still closed"
        status: pass
      - kind: other
        ref: "The nudge is raised after the success branch returns; grep for 'danger' in use-create-column.ts (comments stripped) returns 0 — the hook raises no danger toast at all"
        status: pass
    human_judgment: false
  - id: D9
    description: "The nudge copy states a fact and stops — no scolding, no judgement, no undo offer (the plan's two minted prohibitions)"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint walkthrough step 4 — the user read the raised toast in the running app and approved its tone"
        status: pass
    human_judgment: true
    rationale: "Both prohibitions are `verification: judgment` in the plan itself, and tone is not assertable. The user rendered that judgment at the 03-07 checkpoint and approved the copy; kept `true` because any later re-wording needs the same human read, not a passing test."
  - id: D10
    description: "T-03-03: the duplicate sentence is authored client-side, selected by a mapped RESULT_STATUS discriminant — no upstream detail string reaches the field"
    verification:
      - kind: other
        ref: "The copy is a constant in CREATE_FAILURE_MESSAGE keyed by RESULT_STATUS.DUPLICATE; createColumnAction returns bare discriminants only (03-05), so the hook has no upstream text to render"
        status: pass
    human_judgment: false
  - id: D11
    description: "T-03-27: the auto-scroll effect cannot loop or re-fire on an unrelated render"
    verification:
      - kind: other
        ref: "The effect depends on the primitive columnCount alone; the request is a ref set only in the create-success branch and nulled before the second scroll runs, so a later count change (a delete) finds it already retired"
        status: pass
      - kind: browser
        ref: "src/features/boards/components/board-view.test.tsx#BoardView > leaves the column row where it was when the create fails"
        status: pass
    human_judgment: false

# Metrics
duration: 22min
completed: 2026-08-27
status: complete
---

# Phase 3 Plan 07: Empty-State CTA, Post-Create Confirmation and the Nine-Column Nudge Summary

**COLUMN-01 now holds on a board with zero columns as well as one with many: the empty state has a live `+ Add New Column` CTA opening the same modal the ghost column opens, every successful create scrolls the row to show the new column under one CSS-governed motion declaration, and the create that reaches nine columns raises a single neutral toast that never stands in the way.**

## Performance

- **Duration:** 22 min of execution, plus the checkpoint walkthrough run separately by the orchestrating session
- **Started:** 2026-08-27T10:12:00Z
- **Completed:** 2026-08-27T10:34:00Z (checkpoint approved after that)
- **Tasks:** 3 (2 executed, 1 human checkpoint — approved)
- **Files modified:** 5
- **Commits:** 5

## Accomplishments

- **The empty state is no longer a dead end.** `board-view.tsx`'s zero-columns branch used to `return` before `AddColumnModal` existed in the tree at all; both branches now render inside one fragment above a single shared modal instance, so the CTA and the ghost column open literally the same modal through the same handler.
- **The two PDF-verbatim labels stayed distinct.** `+ Add New Column` lives only in `board-view.tsx`, `+ New Column` only in `add-column-placeholder.tsx`, one occurrence each, and the empty state asserts exclusivity in both directions — exactly one control matching `/Add New Column/`, and no control named `+ New Column`.
- **"Auto-width, not full-width" is proved rather than asserted.** UI-SPEC's accent reserved-for item 6 is the kind of claim a class rename silently breaks, so the test reads `getBoundingClientRect().width` off the button and its container in real Chromium. Nothing in the plan's acceptance criteria checked this; it is now a regression guard.
- **D-04's motion is one CSS declaration, and the code proves it mechanically.** `grep -c 'behavior' board-view.tsx` returns **0** — the scroll call names no motion at all, so the default resolves to the row's own `scroll-behavior`, and `scroll-smooth motion-reduce:scroll-auto` on the row governs both. The test reads `getComputedStyle(row).scrollBehavior === "smooth"` rather than a class name.
- **The scroll fires twice by design and retires itself.** Once at the instant of success (against the row as it stands) and once more when the action's own `refresh()` grows the row, which is the pass that actually brings the new column into view. The request is nulled before that second scroll runs, so a later count change — a delete, in 03-09 — finds nothing armed (T-03-27).
- **The nudge is proved at the threshold and at both neighbours.** Seven→eight raises nothing, eight→nine raises exactly one, nine→ten raises nothing. Because `shouldNudgeOnColumnCount` tests one exact transition, "fires once" is a property of the predicate rather than of remembered state — there is no "already nudged" flag anywhere to go stale.
- **The nudge cannot gate a create.** It is raised after the success branch has been taken, and the same test that reads its copy also asserts the action was called once and the modal closed.

## Task Commits

1. **Task 1: Empty-state CTA and the duplicate-name inline branch** — `63977eb` (feat)
2. **Task 2: Post-create auto-scroll (D-04) and the column-count nudge (D-03/D-05)** — `f4a23fc` (feat)
3. **Auto-width regression guard for the empty-state CTA** — `9f3fe2d` (test)

_Task 3 is a `checkpoint:human-verify` gate — **approved**. It produced no code commit; its record is the plan-metadata commits `5fdefa6` and this one._

## Files Created/Modified

- `src/features/boards/components/board-view.tsx` — the modal hoisted above the branch, the empty-state CTA, the ghost-column ref, the pending-scroll request and its effect, and `scroll-smooth motion-reduce:scroll-auto` on the row
- `src/features/boards/hooks/use-create-column.ts` — the `DUPLICATE` copy entry, the `columnCount` argument, `useToast()`, and `COLUMN_COUNT_NUDGE_COPY`
- `src/features/boards/components/add-column-placeholder.tsx` — an optional `ref` prop forwarded to its `<button>`
- `src/features/boards/components/board-view.stories.tsx` — `DuplicateColumnName`, `SevenColumns`, `EightColumns`, `NineColumns`
- `src/features/boards/components/board-view.test.tsx` — ten new behaviour cases plus the shared `submitOpenColumnForm`/`submitFirstColumn`/`getScrollRow`/`getRaisedToasts` helpers

## Decisions Made

- **The pending-scroll request is a `useRef`, not `useState`.** The plan prescribes a flag "set on success, cleared once it runs", and this repo's ESLint runs React Compiler's `react-hooks/set-state-in-effect` as an **error**: clearing a state flag from inside the effect that consumes it does not compile past lint. Holding the request in a ref keeps the plan's two-phase semantics exactly (scroll now, scroll again when the count moves, then retire) at no render cost. See Deviations.
- **`scrollIntoView` is still called from exactly one line.** Both passes go through one local `scrollGhostColumnIntoView()`, so the plan's `grep -c 'scrollIntoView' = 1` criterion holds substantively as well as literally, and the two call sites cannot drift on their arguments.
- **The duplicate sentence renders in the modal's existing inline alert region**, immediately beneath the `Column Name` field, rather than inside `TextField`'s own error slot. UI-SPEC says "on the `Column Name` field"; the plan says "through the existing `errorMessage` prop — no new prop, no new modal state, and never a toast". Those two cannot both be satisfied without widening `AddColumnModal`'s contract, and the plan's instruction is the narrower and more explicit one. Flagged for the checkpoint's step 5.
- **All three count stories stage the modal already open.** Clicking the ghost column to open the modal focuses it, and a browser scrolls a newly-focused element into view — which would have moved `scrollLeft` before the create ever ran and made the auto-scroll test pass for the wrong reason.
- **`EightColumns` was added rather than reusing `ManyColumns`** (also eight columns) because the modal-open staging above makes it a genuinely different state, not a clone: `ManyColumns` remains the modal-closed overflow story its existing test asserts nine row children against.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The prescribed pending-scroll flag does not pass this repo's lint**

- **Found during:** Task 2
- **Issue:** The plan prescribes "set a pending-scroll flag; in an effect that depends on the rendered column count, scroll when the flag is set and then clear it", and the threat register (T-03-27) restates it as "cleared as soon as it runs". Implemented literally with `useState`, `pnpm lint` fails with `react-hooks/set-state-in-effect` — React Compiler's rule, configured as an error here, refuses `setState` in an effect body.
- **Fix:** The request moved to a `useRef` holding the column count at success. The success branch scrolls immediately and arms the ref; the effect (dependency: `columnCount` alone) fires when the count moves, nulls the ref, and scrolls again. Semantics are the plan's, unchanged: armed only by a success, retired as it runs, cannot loop.
- **Files modified:** `src/features/boards/components/board-view.tsx`
- **Verification:** `pnpm lint` exits 0; the two scroll cases pass; `grep -c 'scrollIntoView'` still returns 1.
- **Committed in:** `f4a23fc`

**2. [Rule 3 - Blocking] `AddColumnPlaceholder` had no way to receive a ref**

- **Found during:** Task 2
- **Issue:** The plan's `key_links` require "a ref on the ghost column is the scroll target D-04 brings into view", and its `<action>` says "attach a ref to the `AddColumnPlaceholder` element" — but `add-column-placeholder.tsx` is a plain function component taking only `onOpen`, and the plan's `files_modified` list omits it, so the prescribed wiring had nowhere to land.
- **Fix:** Added an optional `ref?: Ref<HTMLButtonElement>` to its `Props` and forwarded it to the `<button>`. React 19 takes `ref` as an ordinary prop, so no `forwardRef` and no shape change; every existing caller and story is unaffected.
- **Files modified:** `src/features/boards/components/add-column-placeholder.tsx`
- **Verification:** `pnpm exec tsc --noEmit` exits 0; `add-column-placeholder`'s own stories/tests still pass inside the 1050-test full run.
- **Committed in:** `f4a23fc`

**3. [Rule 2 - Missing critical] Nothing asserted the empty-state CTA is not full-width**

- **Found during:** Post-Task-2 review against the checkpoint's own step 1
- **Issue:** UI-SPEC's accent reserved-for item 6 and the plan's action text both require the CTA be auto-width and centred, "**not** full-width" — the one detail that separates this button from the modal's `className="w-full"` submit. No acceptance criterion checked it, so a stray `w-full` would have shipped green.
- **Fix:** The empty-state case now compares the button's `getBoundingClientRect().width` against its container's, in real Chromium at both viewports.
- **Files modified:** `src/features/boards/components/board-view.test.tsx`
- **Verification:** 46 passed; `pnpm lint`, `pnpm format:check`, `pnpm renders:check` clean.
- **Committed in:** `9f3fe2d`

### Acceptance-criterion wording artifacts (no code change)

Three criteria cannot hold literally, all of the same kind plans 03-05 and 03-06 already recorded (`grep -c` counts matching **lines**, and an import line matches too):

- **`grep -c 'toast' add-column-modal.tsx` returns 1, not the criterion's 0.** The single match is `add-column-modal.tsx:16`, a doc comment reading "rendered inline in the still-open modal — never a toast". The substantive half — a create failure is inline only — holds: the file imports no toast module and raises nothing.
- **`grep -c 'shouldNudgeOnColumnCount' use-create-column.ts` returns 2, not 1.** Line 8 is the `import`, line 69 the single call site. Making it literally 1 would mean not importing the predicate, i.e. re-deriving it locally — the exact thing the criterion protects against.
- **`grep -v '^\s*\*' use-create-column.ts | grep -c 'danger'` returns 0, not 1.** The criterion explicitly allows this: the create hook raises no danger toast at all, so there is no danger reference for the nudge path to be absent from.

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing critical). No architectural change, no new dependency, nothing installed.
**Impact on plan:** Corrective only. Deviations 1 and 2 preserve the plan's stated semantics through a different mechanism forced by this repo's own lint and component shapes; deviation 3 adds a guard the plan's prose demanded but its criteria omitted.

## Backend reality: the duplicate-name branch has no server backstop

`03-BACKEND-FACTS.md` § R5 **refutes assumption A3**. The probe posted `{"name":"Alpha"}` to a board that already held a column named "Alpha" and got **`201`**, not a refusal — the board then held two columns both named "Alpha", and no `DUPLICATE_RESOURCE` (or any) problem-detail code came back.

Consequences, as this plan handled them:

- The branch **was still built**, as the plan's `verification: backstop` statement directs. The problem-code mapping already existed and `DUPLICATE` was already in `CreateColumnResult` from 03-05; this plan added one entry to a copy table.
- **Nothing was wired to expect a `DUPLICATE_RESOURCE` response.** No new mapping, no new branch, no client-side pre-check against the board's existing names. The entry is selected only if some upstream response ever maps to `RESULT_STATUS.DUPLICATE`.
- **It ships as client-side-only advisory UX with no server backstop, and is unreachable against the real backend today.** Its test drives it through the aliased stub, which is the only place `DUPLICATE` can currently originate. A duplicate name can still reach a board via any path — including this one — and two clients racing could produce duplicates regardless.

**Confirmed in the running app at the Task 3 checkpoint**, not just from the probe record: submitting a name already used on the board **succeeded** — 10 → 11 columns, two identically named, modal closed, no inline error. The branch never fires.

This is a recorded, expected condition, not a defect found during execution.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `DUPLICATE` failure copy is dead against the real backend | `src/features/boards/hooks/use-create-column.ts` | 22 | 03-BACKEND-FACTS R5 observed the backend ACCEPTING duplicate column names (201), and the Task 3 checkpoint re-confirmed it in the running app (10 → 11 columns, two identically named, no inline error). Kept deliberately per the plan's `verification: backstop` statement and UI-SPEC's Copywriting Contract row; advisory only, no server enforcement behind it. Reachable only through the aliased stub. |

No placeholder value, no dead control and no skipped test was introduced. The zero-columns branch's deliberate omission of the ghost column is asserted, not stubbed.

## Issues Encountered

- **The worktree started with no `node_modules` and no Next.js route types** — the same fresh-worktree artifact plans 03-04/03-05 recorded. `pnpm install --frozen-lockfile` and `pnpm exec next typegen` were both needed before `tsc --noEmit` could run. `.env.local` was copied in per `CLAUDE.md`.
- **The raised toast has `role="dialog"` too.** The nudge test's first draft asserted the modal had closed via `queryByRole("dialog")` and failed — it was finding the toast. Re-scoped to the modal's `Add New Column` heading; noted here because the same trap will catch 03-08/03-09's delete and rename toasts.
- **`pnpm test:browser -- <file>` still does not filter** (03-05 recorded this). `pnpm exec vitest run --project browser <file>` was used for the per-task loops.
- **`next typegen` and `next build` write different paths into the tracked `next-env.d.ts`** — `./.next/dev/types/…` versus `./.next/types/…`. Running both in one session leaves that file dirty for reasons wholly unrelated to the plan. Restored to `HEAD` rather than committed, per the scope boundary; worth knowing before a future executor stages it by reflex.

## TDD Gate Compliance

Both tasks are `tdd="true"`; both RED gates were **run and observed failing** before the implementing code existed.

| Task | RED failures observed | GREEN result |
|------|----------------------|--------------|
| 1 | 8 failed / 28 passed of 36 | 36 passed |
| 2 | 4 failed / 42 passed of 46 | 46 passed |

**No separate `test(...)` RED commit exists** for tasks 1 and 2, for the structural reason plans 03-04, 03-05 and 03-06 all recorded: this repo's `husky` pre-commit hook runs type-aware `eslint --fix` over staged files, and a test importing a not-yet-existing surface produces 40+ `no-unsafe-*` errors. Committing RED would require `--no-verify`, which this executor is forbidden to pass. Each task landed as one `feat(...)` commit carrying the already-failing test plus the code that turns it green, with the RED evidence recorded above and in each commit body. (The third commit is a genuine `test(...)` — it adds a guard to code that already existed.)

**Honest qualification on both REDs.** Task 1's five new cases went red four-of-five: "still renders the generic create-failure copy for a failure that is not a duplicate" passed before the change, because it is the *unchanged-behaviour* guard proving the new table entry does not swallow the fallback — a test that went red there would have meant the guard was wrong. Task 2's went red two-of-five for the same reason: the three negative cases ("no scroll on failure", "no nudge at eight", "no nudge at ten") pass trivially when neither the scroll nor the nudge exists yet.

## Verification Run

| Gate | Result |
|------|--------|
| `pnpm test` (all five Vitest projects) | **1050 passed / 81 files** (baseline after 03-06: 1026 / 81) |
| `pnpm test:a11y` | **163 passed / 28 files**, no axe violation (baseline 159) |
| `pnpm exec tsc --noEmit` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm routes:check`, `handlers:check`, `stories:check`, `renders:check`, `tsx:check`, `comments:check` | all pass |
| `pnpm build` | compiles, all 8 routes prerender |
| Human checkpoint (Task 3) | **approved** — all five observations confirmed against the running app; zero console errors, zero dev-log errors |

## Checkpoint (Task 3): APPROVED

**Not run by this executor.** The plan directs the executor to drive all five observations through the headless `mcp__playwright__*` tools before handing over, as `CLAUDE.md` requires. **No Playwright MCP tool resolved in this executor's tool set** — neither `mcp__playwright__*` nor the plugin variant, because project-scoped `.mcp.json` servers are not inherited by worktree-isolated subagents (every wave 2-4 executor in this phase hit the same wall). Writing a throwaway browser script instead is what the same instruction forbids, so it was **impossible here rather than skipped**, and the executor handed the gate over saying so.

**The orchestrating main session then ran the walkthrough** against the dev server on this branch, the real nonprod backend, and headless Playwright. All five observations confirmed; **zero console errors, zero dev-log errors**.

| # | Observation | Result |
|---|-------------|--------|
| 1 | Empty board | **CONFIRMED**, light and dark. Heading plus `+ Add New Column` at **143px against a 980px main** — 14.6% of the width, so genuinely auto-width, not full-width — centred to a 0px offset, accent `rgb(99,95,199)`. No ghost column in this state. |
| 2 | Ghost column | **CONFIRMED** present as the last child of the row on a populated board. |
| 3 | Auto-scroll (D-04) | **CONFIRMED, including the second pass no test here could reach.** Creating a 9th column moved `scrollLeft` **0 → 2060** and the new column landed fully in view. It settles 24px short of max, which is the row's own `p-6` — expected, not a shortfall. |
| 3b | Reduced motion | **CONFIRMED.** Under `prefers-reduced-motion: reduce`, computed `scroll-behavior` flipped **smooth → auto** and the scroll had already jumped the full 2084px at 150ms: it jumps rather than animates, and the column still ends up in view. One CSS declaration governs both, with no JavaScript branch — exactly what D-04's `must_haves` truth requires. |
| 4 | Nudge (D-03/D-05) | **CONFIRMED.** 8 → 9 raised exactly one toast with the exact copy in the neutral treatment, the column was created and the modal closed; 7 → 8 silent; 9 → 10 silent. **Copy tone approved by the user** — the one thing no assertion could settle. |
| 5 | Duplicate name | **CONFIRMED UNREACHABLE**, exactly as R5 predicts. Submitting a duplicate name succeeded: 10 → 11 columns, two identically named, modal closed, no inline error. |

Observation 3 is the one that matters most for this plan's confidence: the second scroll pass is unreachable from a composed-story test (the `board` prop is static, so nothing can grow the column count), and it is the pass that actually brings the new column into view. It is now observed rather than argued.

## Out-of-scope UI findings (deferred, NOT fixed here)

The user raised three findings while reviewing the running app. **None is in 03-07's scope and none was touched by this plan** — the orchestrator is deferring all three to their own plan:

1. The sidebar's `+ Create New Board` is pinned to the bottom instead of flowing under the board list.
2. The theme-toggle container's corner radius reads too round.
3. The ghost column's corner radius reads too round — `rounded-lg` (28px) where the mock wants ~6px.

Finding 3 touches `add-column-placeholder.tsx`, which this plan modified (for the `ref` prop only), so it is worth being precise about who owns it: the 28px radius is a **known, deliberate deviation recorded in `03-UI-SPEC.md`** under "The `+ New Column` ghost column", chosen so the placeholder matches every other shipped surface rather than becoming the only one with its own radius. Revisiting it is a design-contract change, not a 03-07 bug.

**Constraint on whichever plan takes findings 2 and 3:** the fix must reuse the closest **existing** radius token, `--radius-sm` (4px). **The user has ruled out minting a new token** — so `~6px` is to be met with the 4px tier already in `tokens.css`, not with a new `--radius-*` entry and the Phase 1 token-pipeline plus visual-regression re-baseline that would drag in.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **COLUMN-01 is functionally complete on every board state.** `requirements-completed` carries it; plan 03-05 also declared it, so the shared-ID gate resolves once both summaries exist — which they now do.
- **`board-view.tsx` now owns a scroll target and a scroll request.** Plan 03-09's delete must not re-arm it (it cannot: the ref is set only in the create-success branch), and plan 03-10's reorder should reuse `scroll-smooth motion-reduce:scroll-auto` on the row rather than adding a second motion story.
- **The section's `tabIndex={0}` still stands**, unchanged and still 03-08's to remove alongside the header kebab. This plan touched neither the section nor `ColumnHeader`.
- **`AddColumnPlaceholder` now takes an optional `ref`.** 03-10 will need the same row to auto-scroll during a drag near its edges; the ref and the CSS declaration are already in place.
- **The toast-is-a-`dialog` trap is documented above** — 03-08's rename and 03-09's delete both raise toasts over a modal and will hit it.
- **Three out-of-scope UI findings were raised at this checkpoint and deliberately left alone** (sidebar CTA placement, and two corner radii). They are the orchestrator's to schedule; see "Out-of-scope UI findings" above, including the user's ruling that the radius fix reuse `--radius-sm` rather than mint a token.

## Self-Check: PASSED

All 5 modified files exist on disk; all three task commits (`63977eb`, `f4a23fc`, `9f3fe2d`) resolve in `git log`; `git diff --diff-filter=D` across all three reports no deletions; the working tree is clean and no untracked file was left behind. `STATE.md` and `ROADMAP.md` are untouched, as parallel-mode execution requires. No source file changed after the checkpoint — this revision is documentation only.

---

_Phase: 03-column-management_
_Completed: 2026-08-27_
