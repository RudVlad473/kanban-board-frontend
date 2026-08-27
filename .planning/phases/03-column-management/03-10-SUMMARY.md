---
phase: 03-column-management
plan: 10
subsystem: ui
tags: [dnd-kit, react-19, drag-and-drop, keyboard-accessibility, optimistic-update, server-actions, aria-live]

# Dependency graph
requires:
    - phase: 03-01
      provides: "03-BACKEND-FACTS.md § R1-R4 — the observed `targetPosition` semantics, the version-bump width, and the server-side clamp"
    - phase: 03-03
      provides: "03-SPIKE-DNDKIT.md — the live keyboard contract under React 19, sibling-control safety, and the finding that `@dnd-kit/modifiers` is not needed"
    - phase: 03-08
      provides: "the optimistic-override + version-conflict copy pattern this reorder mirrors"
    - phase: 03-09
      provides: "the extracted `ColumnHeader` and the board container this plan turns into a sortable row"
provides:
    - "COLUMN-03: columns reorder by pointer drag and by keyboard, persisted with exactly one PATCH per completed move"
    - "`toReorderTargetPosition` — the single named home for the wire's position semantics, citing the probe that established them"
    - "`reorderColumnAction` — the PATCH /boards/{boardId}/columns/{columnId}/reorder write path"
    - "`useReorderColumns` — order override, whole-board rollback, conflict copy, and the moved-column mutation lock"
    - "`SortableColumn` — the per-column sortable wrapper owning the section, the handle wiring and the drop indicator"
    - "A drag handle on the column header that carries the library's own ARIA and no click action of its own"
affects: [04-task-management, drag-and-drop for tasks between columns, SYNC-01 conflict reconciliation]

actuals:
    tokens: 41654
    tasks: 3
    commits: 3

# Tech tracking
tech-stack:
    added: []
    patterns:
        - "dnd-kit sortable with an explicit, entity-derived `DndContext` id (hydration-safe `aria-describedby`)"
        - "Mouse + touch + keyboard sensors rather than the combined pointer sensor, each with an activation constraint"
        - "Order-shaped optimistic override retired by pure derivation in `model.ts`, mirroring the name-shaped one"

key-files:
    created:
        - src/features/boards/actions/reorder-column-action.ts
        - src/features/boards/hooks/use-reorder-columns.ts
        - src/features/boards/components/sortable-column/sortable-column.tsx
        - src/features/boards/components/sortable-column/sortable-column.stories.tsx
        - src/features/boards/components/sortable-column/sortable-column.test.tsx
        - src/test-utils/reorder-column-action-storybook-stub.ts
    modified:
        - src/features/boards/model.ts
        - src/features/boards/model.unit.test.ts
        - src/features/boards/components/board-view/board-view.tsx
        - src/features/boards/components/column-header/column-header.tsx
        - vitest.config.ts

key-decisions:
    - "`targetPosition` is sent as dnd-kit's post-`arrayMove` final index verbatim — R1 observed exactly that, so `toReorderTargetPosition` is a named pass-through rather than a translation, and carries the citation so a future reader can tell it apart from a guess."
    - "No client-side clamp: R4 observed the backend silently clamps an out-of-range position, and the client only ever computes an in-range index from its own array, so a redundant clamp would hide a real bug."
    - "The in-flight mutation lock is narrowed to the MOVED column alone, on R2's observation that merely shifted columns keep a valid pre-reorder version. The plan allowed either width; the narrow one keeps every other column's kebab usable for the length of a PATCH."
    - "The lock is held until the refreshed props land, not merely until the PATCH settles, and it retires itself through the same reference-equality signal that retires the order override — so nothing has to clear it."
    - "A lone column renders NO handle button at all rather than a disabled one; the absence of handle props is the single source of truth for that, so `ColumnHeader` gained no separate `isReorderDisabled` boolean."
    - "The drop target is indicated by an accent bar drawn in the inter-column gutter, in addition to the strategy's reflow rather than instead of it — see Deviations."

patterns-established:
    - "Handle-props object: a sortable wrapper hands its activator ref, listeners and ARIA attributes to a presentational child as one optional prop; absent means 'this item cannot be dragged'."
    - "Keyboard-first drag testing: the automated coverage drives lift/arrow/drop/cancel through the real keyboard sensor, waiting on the live-region announcement rather than a timer, because a harness pointer drag raises one intermediate move and this library does not register that as a drag."

requirements-completed: [COLUMN-03]

coverage:
    - id: D1
      description: "The wire's `targetPosition` has exactly one named home, encoding R1's observed final-index semantics with a dated citation."
      requirement: COLUMN-03
      verification:
          - kind: unit
            ref: "src/features/boards/model.unit.test.ts#toReorderTargetPosition"
            status: pass
      human_judgment: false
    - id: D2
      description: "`reorderColumnAction` PATCHes the reorder endpoint with both path parameters, the session-derived userId and the column's own version."
      requirement: COLUMN-03
      verification:
          - kind: other
            ref: "grep -c 'EXTERNAL_PATH.COLUMN_REORDER' / 'query: { userId: record.id }' / 'boardId: parsed.data.boardId, columnId: parsed.data.columnId' — each returns 1"
            status: pass
          - kind: other
            ref: "pnpm exec tsc --noEmit && pnpm build"
            status: pass
      human_judgment: true
      rationale: "No integration test dials the real reorder endpoint in this plan — plan 03-11 owns that. Static assertions prove the request is SHAPED right, not that the deployed backend accepts it."
    - id: D3
      description: "A reorder applies optimistically and, on failure, the whole board's order rolls back with the generic toast; a stale version raises the distinct version-conflict copy instead."
      requirement: COLUMN-03
      verification:
          - kind: integration
            ref: "src/features/boards/components/sortable-column/sortable-column.test.tsx#restores the whole board's order and raises the rollback toast when a reorder fails"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/sortable-column/sortable-column.test.tsx#raises the distinct version-conflict copy instead when the reorder is refused as stale"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view/board-view.test.tsx#restores the rendered order and raises the rollback toast when the reorder fails"
            status: pass
      human_judgment: false
    - id: D4
      description: "The keyboard path reorders a column: lift on space OR enter, arrow to move, drop, escape to cancel — with exactly one request per completed move regardless of step count."
      requirement: COLUMN-03
      verification:
          - kind: integration
            ref: "src/features/boards/components/board-view/board-view.test.tsx#moves a column one position later when it is lifted, arrowed right and dropped"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view/board-view.test.tsx#lifts and drops on the enter key as well as the space bar"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view/board-view.test.tsx#returns the column to its original index and issues nothing when the move is cancelled"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view/board-view.test.tsx#issues exactly one request however many arrow steps the move took"
            status: pass
      human_judgment: false
    - id: D5
      description: "Every lift, move, drop and cancel is announced in the Copywriting Contract's own wording with 1-based positions, in a region separate from the toast viewport."
      requirement: COLUMN-03
      verification:
          - kind: integration
            ref: "src/features/boards/components/board-view/board-view.test.tsx#announces the lift, each move and the drop in the contract's own wording"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view/board-view.test.tsx#announces a cancelled move as a return to the position the column started at"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view/board-view.test.tsx#keeps the reorder announcements out of the toast area"
            status: pass
      human_judgment: true
      rationale: "The strings and the region are asserted, but the region dnd-kit renders is `aria-live=\"assertive\"` and not configurable (see Issues Encountered). Whether that is acceptable in a real screen reader is a human call this suite cannot make."
    - id: D6
      description: "A plain kebab click opens the menu and starts no drag; the kebab is a sibling of the handle and never receives its listeners."
      requirement: COLUMN-03
      verification:
          - kind: integration
            ref: "src/features/boards/components/board-view/board-view.test.tsx#opens a column's menu on a plain kebab click and starts no reorder"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/sortable-column/sortable-column.test.tsx#keeps the kebab outside the drag handle so it can never receive the drag listeners"
            status: pass
      human_judgment: false
    - id: D7
      description: "While a reorder is unsettled the moved column is `aria-busy` and its own two menu entries are disabled; a merely shifted column stays usable."
      requirement: COLUMN-03
      verification:
          - kind: integration
            ref: "src/features/boards/components/board-view/board-view.test.tsx#disables the moved column's own two entries while its reorder is in flight"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view/board-view.test.tsx#leaves a merely shifted column's entries available while the reorder is in flight"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/sortable-column/sortable-column.test.tsx#marks only the moved column busy while its reorder is unsettled"
            status: pass
      human_judgment: false
    - id: D8
      description: "A board with exactly one column offers no drag, no keyboard lift and no draggable role description, while both kebab entries stay available."
      requirement: COLUMN-03
      verification:
          - kind: integration
            ref: "src/features/boards/components/sortable-column/sortable-column.test.tsx#gives a board's only column no drag handle, no role description and no tab stop"
            status: pass
          - kind: integration
            ref: "src/features/boards/components/board-view/board-view.test.tsx#offers both kebab entries on a board holding exactly one column"
            status: pass
      human_judgment: false
    - id: D9
      description: "The pointer drag itself: lifted-column appearance, the gutter drop indicator, the follow preview, reduced-motion behaviour, horizontal auto-scroll past the fold, and both themes."
      requirement: COLUMN-03
      verification: []
      human_judgment: true
      rationale: "The plan's own checkpoint, and the phase's validation strategy, record the pointer drag FEEL as the one behaviour with no reliable automated coverage. This executor additionally had no browser tooling at all (see Issues Encountered), so nothing here was observed live."
    - id: D10
      description: "The board detail route hydrates with no `aria-describedby` mismatch, because the DndContext id is derived from the board's own id."
      requirement: COLUMN-03
      verification:
          - kind: other
            ref: "@dnd-kit/utilities@3.2.2 `useUniqueId(prefix, value)` returns `value` verbatim when supplied — read from the shipped dist; the id is therefore `board-columns-{boardId}` on server and client alike"
            status: pass
      human_judgment: true
      rationale: "The mechanism is proven from the library's source, but the plan asks for a dev-server console with no hydration warning. That needs a real browser, which this executor could not drive."

# Metrics
duration: 45 min
completed: 2026-08-27
status: complete
---

# Phase 3 Plan 10: Column Reorder Summary

**COLUMN-03 delivered on dnd-kit 6.3.1: columns reorder by pointer drag and by a fully announced keyboard path, applied optimistically with a whole-board rollback, and persisted with exactly one `PATCH .../reorder` per completed move carrying the final index R1 actually observed.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-08-27T13:41:00Z
- **Completed:** 2026-08-27T14:26:38Z
- **Tasks:** 3 of 4 (the fourth is the human checkpoint — see Outstanding below)
- **Files modified:** 15

## Accomplishments

- `toReorderTargetPosition` gives the wire's position semantics one named home in `model.ts`, encoding R1's observed "final 0-based index" with the probe date beside it, so a future reader can tell the fact apart from an assumption.
- `reorderColumnAction` reaches `PATCH /boards/{boardId}/columns/{columnId}/reorder` with both path parameters, a session-derived `userId`, and the moved column's own `version`.
- `useReorderColumns` holds an order-shaped optimistic override, restores the WHOLE board's order on failure, and carries the distinct version-conflict copy R3 made reachable.
- `SortableColumn` turns each column into a sortable item — node ref on the `<section>`, activator on the header handle, a gutter accent bar at the insertion point, and no affordance at all on a board's only column.
- `ColumnHeader` renders the caption row as a real drag handle carrying the library's own ARIA (never a hand-written copy) and no click action of its own, with the kebab a sibling that can never receive the drag listeners.
- `board-view` wires the drag context with a board-derived id, three sensors, the announcements factory and a horizontal sortable context, plus a drag overlay whose settle is dropped entirely under reduce-motion.

## Task Commits

1. **Task 1: Encode the observed wire semantics, then the reorder action and its stub** — `0fb6e97` (feat)
2. **Task 2: The optimistic reorder hook, the sortable column wrapper, and the header's drag handle** — `9df5fcb` (feat)
3. **Task 3: Wire the drag-and-drop context, the keyboard path, and the announcements** — `d2eb2d1` (feat)

Task 1 is TDD: the three `toReorderTargetPosition` cases were written first and observed failing (`TypeError: toReorderTargetPosition is not a function`, 3 failed) before the implementation landed. RED and GREEN share one commit because this repo's type-aware pre-commit hook refuses a RED-only commit whose staged test imports a not-yet-existing export — the known repo constraint recorded by earlier waves, not an executor shortcut. `--no-verify` was never used.

## Files Created/Modified

- `src/features/boards/model.ts` — adds `toReorderTargetPosition`; the reorder announcements now say nothing when a column is only over its own place (see Deviations)
- `src/features/boards/model.unit.test.ts` — four new cases (three for the wire semantics, one for the self-target announcement guard)
- `src/features/boards/actions/reorder-column-action.ts` — the `"use server"` reorder write path and its `ReorderColumnResult`
- `src/test-utils/reorder-column-action-storybook-stub.ts` — the queue/hold/reset stub for the browser and storybook projects
- `vitest.config.ts` — one alias entry routing the action to that stub
- `src/features/boards/hooks/use-reorder-columns.ts` — the optimistic order override, rollback, copy table and mutation lock
- `src/features/boards/components/sortable-column/sortable-column.{tsx,stories.tsx,test.tsx}` — the per-column sortable wrapper, four stories, eleven behaviour cases
- `src/features/boards/components/column-header/column-header.{tsx,stories.tsx,test.tsx}` — the drag handle, `DragHandleFocused`/`MutationsDisabled`, three new cases
- `src/features/boards/components/board-view/board-view.{tsx,stories.tsx,test.tsx}` — the drag context, sensors, overlay, `ReorderableColumns`/`ReorderInFlight`, eleven new cases

## Decisions Made

- **Lock width narrowed to the moved column.** R2 observed a merely shifted column's pre-reorder version stays valid for its next mutation, and the plan explicitly left the choice to this plan. The narrow lock costs nothing in version safety and keeps three of four columns' menus usable for the length of a PATCH; the whole-board lock would have disabled them for no observed reason.
- **The lock is held until the refreshed props land**, not merely until the PATCH settles — the moved column's own version IS bumped, so a rename fired in that window would 409 for a reason the user could not have caused (T-03-31). It retires itself through the same reference-equality signal that retires the order override, so there is nothing to clear and no way to leave it stuck on a path where the props do arrive.
- **No `isReorderDisabled` prop on `ColumnHeader`.** The plan named one, but the absence of `handleProps` already states the same fact; two props saying it would be two sources of truth. `SortableColumn` still takes `isReorderDisabled`, because the sortable hook needs it.
- **The drop indicator is an accent bar in the gutter, drawn IN ADDITION TO the strategy's reflow.** See Deviations for why "instead of" was not taken.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The lift announcement was unreachable**

- **Found during:** Task 3
- **Issue:** `createColumnReorderAnnouncements` (shipped by plan 03-04) announced `onDragOver` unconditionally. dnd-kit fires one `onDragOver` on the lift itself, with the column over its OWN droppable, so the live region went straight from empty to `"Fixture Column 1 moved to position 1 of 4."` — overwriting `"Picked up …"` before a screen reader could reach it. The UI-SPEC's required lift wording never actually reached the user. Observed live: the first keyboard test read the "moved to position 1" string where "Picked up" was expected.
- **Fix:** `onDragOver` now returns `undefined` when `over.id === active.id`. dnd-kit's `announce()` ignores a nullish value, so the lift announcement survives — and "moved to its own position" was never a meaningful report anyway.
- **Files modified:** `src/features/boards/model.ts`, `src/features/boards/model.unit.test.ts`
- **Verification:** New unit case `says nothing when the column is only over its own place`; the three board-view announcement cases now pass at both viewports (they failed before the fix).
- **Committed in:** `d2eb2d1`

**2. [Rule 3 - Blocking] `react-hooks/refs` rejected the handle-props object**

- **Found during:** Task 2
- **Issue:** Passing `handleProps.ref` into `ref=` made the React Compiler lint treat the whole `handleProps` object as a ref, failing every property read on it during render (3 errors).
- **Fix:** Renamed the field to `setNode` (it is a callback ref, not a ref object) and read all three fields into locals above the JSX. Both moves are commented at the point they matter.
- **Files modified:** `src/features/boards/components/column-header/column-header.tsx`, `.../sortable-column/sortable-column.tsx`, `.../column-header/column-header.stories.tsx`
- **Verification:** `pnpm lint` exits 0.
- **Committed in:** `9df5fcb`

**3. [Rule 3 - Blocking] `DUPLICATE` is unreachable for a reorder but the shared mapper returns it**

- **Found during:** Task 1
- **Issue:** The plan specifies a six-branch result union without `DUPLICATE`, but `mapProblemCodeToStatus` returns `UpstreamFailureStatus`, which includes it — a type error.
- **Fix:** Folded `DUPLICATE` into `ERROR` at the mapping site with a comment: a reorder sends no name, and R5 observed the backend never raises `DUPLICATE_RESOURCE` for a column at all. The plan's union is preserved exactly.
- **Files modified:** `src/features/boards/actions/reorder-column-action.ts`
- **Verification:** `pnpm exec tsc --noEmit` exits 0.
- **Committed in:** `0fb6e97`

### Planned-shape deviations

**4. `toReorderTargetPosition({ toIndex })`, not `({ fromIndex, toIndex })`**

R1 makes the function a pass-through, so `fromIndex` would have been an unused parameter that lint rejects. The three behaviour cases still exercise forward, backward and every from/to pair on a four-column board — they read the moved column back out of `reorderColumns`' output, which is what makes the "final index" claim falsifiable rather than tautological.

**5. `SortableColumn`'s `Dragging` story is named `Reordering` and stages the busy state**

`isDragging` is dnd-kit-internal state with no declarative staging path, and `pnpm stories:check` bans play functions, so a story literally named `Dragging` could only have faked it. The genuinely lifted state IS exercised — by the board-view keyboard tests, which drive the real sensor.

**6. `board-view` gained no `defaultLiftedColumnIndex` prop**

Same reason: a Storybook-only prop that paints a drag state the library never entered would assert nothing. The real lift is driven through the keyboard sensor in `board-view.test.tsx`.

**7. Hook behaviour tests live in `sortable-column.test.tsx`, driven by an `OptimisticReorder` host story**

The plan assigns tests 1-4 of Task 2 to the hook, but lists no test file for it. A host story in the sortable-column stories (the `ServerPropsHost` pattern `board-view.stories.tsx` already established) gives the hook a focused harness; board-view then re-proves rollback end-to-end.

**8. The gutter accent bar is added TO the reflow, not substituted FOR it**

The backstop truth says the drop target is indicated by a bar "not by a shifted-preview reflow". Suppressing the reflow would have made `horizontalListSortingStrategy` inert — which the plan's own acceptance criterion requires to be present — and would have removed the only visual feedback a sighted keyboard user gets from an arrow press. The bar is implemented as prescribed (4px, full column height, drawn in the 24px gutter on the insertion side, derived from the strategy's own `activeIndex`/`overIndex`); the reflow is kept underneath it. This is a judgment call on a `verification: backstop` prescription and is flagged for the checkpoint.

**9. The bar uses `bg-bg-primary`, which the UI-SPEC's accent list does not enumerate**

The UI-SPEC's "Accent reserved for" is an explicit closed list of seven uses and a drop indicator is not among them, but the must-have calls for an "accent bar". Read as an eighth reserved-for use minted by this plan. Surfaced rather than resolved silently.

### Acceptance criteria whose literal grep counts were unmet

Every one of these is satisfied in substance; the counts were written without allowing for the import line, and are recorded here rather than quietly passed over.

| Criterion | Expected | Actual | Why |
| --- | --- | --- | --- |
| `grep -c 'verifySession' reorder-column-action.ts` | 1 | 2 | Import + call. It IS the first statement of the action body (`rename-column-action.ts` counts 2 for the same reason). |
| `grep -c 'useSortable' sortable-column.tsx` | 1 | 2 | Import + call. The hook is called exactly once, in the wrapper; `column-header.tsx` returns 0 as required. |
| `grep -c 'setActivatorNodeRef' sortable-column.tsx` | 1 | 2 | Destructure + use. |
| `grep -c 'applyColumnOrderOverride' use-reorder-columns.ts` | 1 | 2 | Import + call (the helper lives in `model.ts`, as the plan requires). |
| `grep -c 'toReorderTargetPosition' use-reorder-columns.ts` | 1 | 2 | Import + use — the translation is used, not re-derived, which is what the criterion is for. |
| `grep -c 'horizontalListSortingStrategy' board-view.tsx` | 1 | 2 | Import + use. |
| `grep -c 'createColumnReorderAnnouncements' board-view.tsx` | 1 | 2 | Import + use. |
| `grep -c 'onClick' column-header.tsx` | 1 | 2 | Both belong to menu entries (lines 123 and 134); the handle button carries none, which is the criterion's actual subject. |
| `grep -c 'aria-pressed' column-header.tsx` | 0 | 1 | The single occurrence is the Tailwind variant `aria-pressed:cursor-grabbing` — it READS the library's attribute to give the handle its grabbing cursor while lifted (including a keyboard lift, which `active:` cannot reach). No ARIA attribute is written by hand; `aria-roledescription` returns 0 as required. |
| `grep -rn 'role="status"' src/features/boards/` | 0 | 1 | The one match is a selector in `board-view.test.tsx` reading the LIBRARY's region. No source file renders a status element. |

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking) plus 6 documented shape deviations and 10 over-specified grep counts.
**Impact on plan:** No scope creep. The one behavioural change beyond the plan (deviation 1) fixes a real accessibility defect in shipped code that the plan's own UI-SPEC requirement would otherwise have gone unmet by.

## Issues Encountered

- **dnd-kit's live region is `aria-live="assertive"`, not polite, and is not configurable.** `@dnd-kit/accessibility@3.1.1`'s `LiveRegion` hardcodes `role="status"` with `ariaLiveType` defaulting to `"assertive"`, and `DndContext`'s `accessibility` prop exposes only `announcements`, `container`, `restoreFocus` and `screenReaderInstructions` — there is no way through. The must-have asks for a polite region. Hand-rolling a second one is explicitly forbidden by the plan ("do not add a status element of your own", "Don't Hand-Roll" the live region), so the library's own region is what ships. The UI-SPEC's actual concern — that reorder chatter must not bury real errors in the toast viewport — IS met: the region is separate from the toast viewport by construction, and a test asserts it. Recorded as an observed library constraint, not as satisfied.
- **The keyboard sensor scrolls before it moves at narrow viewports.** At 375px only one column is visible, and `KeyboardSensor` returns early after a smooth scroll when the target is outside the visible half of the scroll container ("the scroll adjustment alone will trigger logic to auto-detect the new container we are over"). The first test run failed all five reorder cases at MOBILE while passing at DESKTOP for exactly this reason. Fixed in the test harness by waiting on the live-region announcement after each arrow press instead of assuming a synchronous move — which is also the honest model of what a user experiences. Not a product bug; the move does land, it just lands after the scroll.
- **No browser tooling was available to this executor.** Playwright MCP tools are not inherited by spawned subagents (project-scoped `.mcp.json`), so nothing in this plan was driven through the running app. The checkpoint below is therefore entirely unattempted rather than partially verified.

## Outstanding: the human checkpoint (Task 4) is NOT approved

`auto_advance` is `false` and this plan's Task 4 is a `checkpoint:human-verify` with `gate="blocking"`. It was not auto-approved and it was not driven — see the last bullet above. **The plan's `<verification>` block is therefore not fully satisfied: "The human checkpoint is approved" remains open.** SUMMARY.md is committed regardless because a worktree executor's uncommitted output is destroyed when the worktree is removed.

Everything below still needs to be observed on the running app, in the order the plan gives it:

1. **Pointer drag** on a board of four or more columns, across two neighbours — lifted appearance, drop indication, landing position, and survival of a reload. Use the low-level mouse API with a multi-step move; a single-step drag helper does not register as a drag with this library (03-SPIKE-DNDKIT §3).
2. **Kebab safety** — a plain kebab click opens the menu and starts no drag. Asserted automatically at both viewports, but named by the UI-SPEC as the single most likely regression, so worth a human's own eyes.
3. **Keyboard path** with both space and enter, and escape mid-lift. Covered automatically; the checkpoint asks whether it FEELS right.
4. **Announcements** through a screen reader or the accessibility inspector — and specifically whether the assertive region documented above is acceptable in practice.
5. **Reduced motion** — a drag and a failed drag with the OS setting on. Untested anywhere: `useMediaQuery` drives `dropAnimation` and the sortable transition, and no automated case exercises the reduce-motion branch.
6. **Lone column** — nothing lifts on space or enter, no grab cursor, both kebab entries still offered.
7. **Overflow auto-scroll** under a POINTER drag near the row's right edge. The keyboard path's auto-scroll was verified live by the spike and again by this plan's tests; the pointer path's was never observed, and is the case `@dnd-kit/modifiers` exists for. The package was NOT added, on the spike's finding.
8. **Both themes** — repeat observation 1 in dark.

Also unverified: **no hydration warning mentioning `aria-describedby`** on the board detail route. The mechanism is proven from `@dnd-kit/utilities`' shipped source (`useUniqueId(prefix, value)` returns `value` verbatim, so the id is `board-columns-{boardId}` on both sides), but the dev-server console was never opened.

## Verification Run

All from the worktree, after the final task commit:

- `pnpm test` — **87 files, 1241 tests passed** across all five Vitest projects (including the real-backend `node` integration project).
- `pnpm test:a11y` — **31 files, 185 tests passed**; the new drag stories raise no axe violation.
- `pnpm exec tsc --noEmit` — exits 0.
- `pnpm build` — compiles and type-checks clean; all seven routes build.
- `pnpm lint`, `pnpm format:check`, `pnpm routes:check`, `pnpm handlers:check`, `pnpm stories:check`, `pnpm renders:check`, `pnpm tsx:check`, `pnpm comments:check` — all exit 0.
- `test ! -d src/features/columns` — passes.

Not run: CI. Local green is weaker than CI green in this repo by design.

One assertion was mutation-checked rather than taken on trust: removing `setOverride(null)` from the failure branch made exactly the two rollback cases fail at both viewports, and restoring it made them pass — so those assertions are not vacuous. Task 1 was written RED-first and observed failing. Task 2's and Task 3's cases were authored after their implementations within the same task; the mutation check above is the compensating evidence for the most load-bearing of them.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- COLUMN-03 is code-complete and every automated gate is green; the outstanding work is the human/visual checkpoint above, which the orchestrating session is positioned to drive after merge.
- Plan 03-11 (integration) should cover `reorderColumnAction` against the real backend — this plan's coverage of the request is static only (D2).
- Plan 03-12 (e2e) owns the low-level multi-step pointer drag that neither this plan's harness nor the spike could produce.
- Phase 4's task drag-and-drop can reuse the whole pattern: entity-derived context id, mouse/touch/keyboard sensors with activation constraints, handle-props handoff, and the order-shaped optimistic override.

---

_Phase: 03-column-management_
_Completed: 2026-08-27_
