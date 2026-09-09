---
phase: 03-column-management
plan: 14
subsystem: ui
tags: [dnd-kit, keyboard-a11y, rsc, zod, vitest-browser-mode, ordering]

# Dependency graph
requires:
  - phase: 03-column-management
    provides: "Plan 03-10's shipped reorder write path, its sortable column row, and the 03-10 checkpoint that surfaced both defects closed here"
  - phase: 02-board-crud
    provides: "`fetchBoardFull` — the RSC read boundary this plan makes position-ordering"
provides:
  - "`sortColumnsByPosition` — the pure, non-mutating position ordering applied once at the read boundary, so every consumer of a board's columns is display-ordered by construction"
  - "A real-backend integration assertion that a reorder READ BACK matches the order the user left, plus the observation that the backend's response array is NOT position-ordered"
  - "`useColumnDragSensors` + `ColumnKeyboardSensor` — dnd-kit's KeyboardSensor with its midpoint scroll heuristic narrowed to destinations that are actually off screen"
  - "`isColumnDestinationVisible` — the pure predicate that decides whether a keyboard step needs a scroll at all"
affects: [tasks, task-drag-and-drop, board-detail-read-path]

actuals:
  tokens: 33032
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Ordering is derived ONCE, at the read boundary, never at a render site"
    - "A library sensor is narrowed by structural subclass + delegation, so unnarrowed branches still run the library's shipped code"

key-files:
  created:
    - src/features/boards/hooks/use-column-drag-sensors.ts
  modified:
    - src/features/boards/model.ts
    - src/features/boards/model.unit.test.ts
    - src/features/boards/server/fetch-board-full.ts
    - src/features/boards/server/fetch-board-full.integration.test.ts
    - src/features/boards/components/board-view/board-view.tsx
    - src/features/boards/components/board-view/board-view.stories.tsx
    - src/features/boards/components/board-view/board-view.test.tsx

key-decisions:
  - "The sort lives in `fetch-board-full.ts` and nowhere else — a second sort site would derive the optimistic order and the refreshed order by different rules"
  - "The integration test asserts the raw response array does NOT already agree with its positions, so the case can genuinely fail on the defect it closes"
  - "`scrollBehavior` was rejected as a lever after reading dnd-kit's shipped source: it only chooses smooth/auto/instant, never whether a scroll happens"
  - "The keyboard fix narrows `KeyboardSensor.handleKeyDown` via a structural subclass rather than re-implementing the sensor, so Escape, Enter/Space lift, announcements and past-the-fold scrolling still run library code"
  - "Sensor wiring moved out of `board-view.tsx` into `use-column-drag-sensors.ts` because `pnpm tsx:check` forbids declaring a non-component at a `.tsx` top level"

patterns-established:
  - "Ordering derivation at the read boundary: a field is not an ordering until something orders by it, and the ordering happens once where data enters the app"
  - "Fixtures that deliberately disagree with themselves: an ordering test whose array order matches its positions cannot fail on an ordering bug"
  - "Library-behaviour narrowing: delegate to `super` for every case not being narrowed, so the narrowing's blast radius is provably one branch"

requirements-completed: [COLUMN-03]

coverage:
  - id: D1
    description: "A board's rendered column order is derived from `position`, once, at the read boundary — so a reorder survives a reload"
    requirement: COLUMN-03
    verification:
      - kind: unit
        ref: "src/features/boards/model.unit.test.ts#sortColumnsByPosition"
        status: pass
      - kind: integration
        ref: "src/features/boards/server/fetch-board-full.integration.test.ts#after a reorder the same account issued"
        status: pass
    human_judgment: false
  - id: D2
    description: "The board container adds no ordering of its own, so the optimistic `arrayMove` and the refreshed server order are derived by the same rule"
    requirement: COLUMN-03
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/board-view/board-view.test.tsx#adds no ordering of its own when the props' array order and positions disagree"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/board-view/board-view.test.tsx#moves a column relative to that already-reordered order, not to creation order"
        status: pass
    human_judgment: false
  - id: D3
    description: "A keyboard step no longer scrolls the column row when its destination is already fully on screen"
    requirement: COLUMN-03
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/board-view/board-view.test.tsx#scrolls the row only for a keyboard step whose destination is not already fully on screen"
        status: pass
      - kind: unit
        ref: "src/features/boards/model.unit.test.ts#isColumnDestinationVisible"
        status: pass
    human_judgment: false
  - id: D4
    description: "A column beyond the fold is still reachable, announced and on screen after a multi-step keyboard move — the auto-scroll was narrowed, not removed"
    requirement: COLUMN-03
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/board-view/board-view.test.tsx#still moves a column past the fold by keyboard and leaves it on screen"
        status: pass
    human_judgment: false
  - id: D5
    description: "COLUMN-03 holds in the RUNNING application: pointer and keyboard reorders survive a reload, neighbours stay visible, nothing regressed, both themes"
    requirement: COLUMN-03
    verification: []
    human_judgment: true
    rationale: "The plan's Task 4 checkpoint. This executor could not drive it: project-scoped `.mcp.json` servers are not inherited by spawned subagents, so `mcp__playwright__*` was not resolvable here. The orchestrating session owns the live-app pass after merge (see § Outstanding checkpoint)."

# Metrics
duration: 33min
completed: 2026-08-27
status: complete
---

# Phase 3 Plan 14: Reorder Read-Order and Keyboard-Scroll Gap Closure Summary

**Column render order is now derived from `position` once at the RSC read boundary, and dnd-kit's KeyboardSensor no longer scrolls the row for a destination that is already on screen.**

## Performance

- **Duration:** 33 min
- **Started:** 2026-08-27T14:53:00Z
- **Completed:** 2026-08-27T15:26:18Z
- **Tasks:** 3 of 4 (Task 4 is the human checkpoint — see below)
- **Files modified:** 8 (1 created, 7 modified)

## Accomplishments

- **The read-order defect is closed at its root.** `sortColumnsByPosition` is a pure, non-mutating derivation in `model.ts`, applied exactly once — in `fetch-board-full.ts`, immediately after `boardFullSchema.safeParse` succeeds. Every consumer of a `BoardFull` is now display-ordered by construction, so no component and no hook has to remember to order columns.
- **The defect is now provable against the real backend.** A new integration case seeds a three-column board, issues a real reorder through the deployed nonprod backend, reads the board back and asserts the display order. It ALSO asserts that the raw response array does not already agree with its positions — which is what makes the first assertion falsifiable rather than decorative.
- **The keyboard-scroll defect is closed at the sensor.** dnd-kit's `KeyboardSensor` scrolls whenever an arrow step's destination lies past the scroll container's MIDPOINT. On a column row several columns wide that fires while the destination is fully visible, throwing an on-screen neighbour off the box. `ColumnKeyboardSensor` narrows exactly that one branch; every other destination still falls through to the library's own code, so columns past the fold stay reachable.
- **Both fixes were watched failing first** (T-03-44), against three separate reverts — recorded below.

## Task Commits

1. **Task 1: Derive the render order from position, at the read boundary** — `a8919d0` (fix)
2. **Task 2: Prove the reorder survives a reload, against the real backend** — `034e19c` (test)
3. **Task 3: Stop the keyboard move from scrolling a neighbour off screen** — `2beffba` (fix)

## Files Created/Modified

- `src/features/boards/hooks/use-column-drag-sensors.ts` — **created.** Owns the three drag sensors and the narrowed `ColumnKeyboardSensor`. It lives here rather than in `board-view.tsx` because `pnpm tsx:check` forbids a `.tsx` from declaring anything but components and prop types.
- `src/features/boards/model.ts` — adds `sortColumnsByPosition` (the ordering authority) and `isColumnDestinationVisible` (the pure predicate the sensor narrowing decides on).
- `src/features/boards/model.unit.test.ts` — 10 new cases across both derivations, including fixtures whose array order deliberately disagrees with their positions.
- `src/features/boards/server/fetch-board-full.ts` — applies the sort at the one boundary where board data enters the app.
- `src/features/boards/server/fetch-board-full.integration.test.ts` — a `reorderColumn` helper plus three real-backend cases for the read-back order.
- `src/features/boards/components/board-view/board-view.tsx` — sensor block replaced by `useColumnDragSensors()`; the component's ordering responsibility is unchanged, which is to say none.
- `src/features/boards/components/board-view/board-view.stories.tsx` — three new stories: `ReorderedServerOrder`, `ColumnsOutOfPositionOrder`, `FiveReorderableColumns`.
- `src/features/boards/components/board-view/board-view.test.tsx` — six new browser-mode cases plus two measurement helpers.

## Evidence: each fix was observed failing first

| Revert applied | Suite run | Observed |
|---|---|---|
| `sortColumnsByPosition` reduced to the identity function | `model.unit.test.ts` | 2 failed — `expected [2, 0, 1] to deeply equal [0, 1, 2]` |
| Same revert | `fetch-board-full.integration.test.ts` | 1 failed — `expected ['Alpha','Beta','Gamma'] to deeply equal ['Beta','Gamma','Alpha']` |
| `ColumnKeyboardSensor` swapped back for the stock `KeyboardSensor` | `board-view.test.tsx` | 1 failed (DESKTOP) — `expected [false, false, true, true] to deeply equal [false, false, false, false]` |

The integration failure is the important one: the real backend returned `Alpha, Beta, Gamma` — creation order — for a board where Alpha had been moved to position 2. **The response array's order carries no ordering guarantee, and the app had been treating it as one for the whole phase.**

## Measured geometry of the keyboard defect

Recorded in the Vitest browser project at 1440×900, five columns, before and after the fix (`scrollLeft` and each column's viewport box, read once the layout settled):

| Step | Before the fix | After the fix |
|---|---|---|
| 1 | `scrollLeft 0` | `scrollLeft 0` |
| 2 | `scrollLeft 0` | `scrollLeft 0` |
| 3 | `scrollLeft 0 → 304`; Fixture Column 2 pushed to `-280..0`, entirely off screen — while the destination `936..1216` was **already fully inside** the row's `0..1440` box | `scrollLeft 0`; every column stays where it was |
| 4 | `scrollLeft 304 → 408`; two columns clipped | `scrollLeft 0 → 304` — the destination (`1240..1520`) genuinely IS past the fold, so the library's own scroll runs and the moved column lands fully visible at `936..1216` |
| drop | `scrollLeft` stays 408 — "the scroll did not recover" | order is 2,3,4,5,1; the one scroll taken was the one that was needed |

This is the same mechanism the 03-10 checkpoint saw in the live app one step earlier: with the dashboard sidebar beside it, the row is ~1140px wide, so its midpoint threshold sits proportionally further left and the unnecessary scroll fires sooner.

## Decisions Made

- **One sort site, at the read boundary.** `grep -rn "sortColumnsByPosition" src/features/boards/components/` returns nothing, and a browser-mode case pins that `BoardView` renders props whose array order and positions disagree in ARRAY order. Both are the mechanical form of T-03-43.
- **`scrollBehavior` rejected as a lever.** Reading `@dnd-kit/core@6.3.1`'s shipped `KeyboardSensor.handleKeyDown`: `scrollBehavior` is passed straight to `scrollTo`/`scrollBy` as the `behavior` option. It chooses smooth vs. instant and nothing else — the scroll still happens, and the sensor still returns early without moving. It cannot fix this.
- **A custom `coordinateGetter` alone also rejected.** The scroll decision is `clampedCoordinates.x !== newCoordinates.x`, where the clamp ceiling for a rightward step is `scrollElementRect.right - scrollElementRect.width / 2`. Any coordinate low enough to clear that ceiling is too far from the destination for `closestCenter` to still resolve the right droppable (the slack is half a column pitch, ~152px; the shortfall at 1440px is ~216px). The getter cannot both move correctly and avoid the scroll.
- **So the narrowing lives in a structural subclass.** `KeyboardSensor` marks `props`, `referenceCoordinates` and `handleKeyDown` `private` in its `.d.ts`, so the base is reached through one documented cast. The override handles exactly one case — a horizontal arrow step whose destination is already fully inside the row's visible box — and delegates everything else to `super.handleKeyDown`. Escape/cancel, Enter and Space lifts, vertical keys, and every off-screen destination therefore still run the library's own shipped code.
- **The integration test asserts the disagreement, on purpose.** `expect(columnsAfterReorder.map(name)).not.toEqual(['Beta','Gamma','Alpha'])` fails loudly if the backend ever starts returning position-ordered columns. That is a deliberate trade: at that point the read-boundary sort becomes redundant rather than load-bearing, and this suite should say so rather than silently stop testing anything.

## Deviations from Plan

### 1. [Rule 3 - Blocking] The sensor could not live in `board-view.tsx`

- **Found during:** Task 3
- **Issue:** The plan named `board-view.tsx` as the file to change. `pnpm tsx:check` (ADR tech/0027, D-28) fails the build if a `.tsx` declares anything at top level other than a component or a prop type, and the narrowed sensor is a class.
- **Fix:** Created `src/features/boards/hooks/use-column-drag-sensors.ts`, which owns the sensor class and the `useSensors` call. `board-view.tsx` now calls `useColumnDragSensors()` and its dnd-kit imports shrank accordingly. This also matches CONVENTIONS.md's placement rule for a domain's non-pure, React-coupled logic.
- **Files modified:** `src/features/boards/hooks/use-column-drag-sensors.ts`, `src/features/boards/components/board-view/board-view.tsx`
- **Verification:** `pnpm tsx:check`, `pnpm lint`, `pnpm exec tsc --noEmit`, and all 120 `board-view.test.tsx` cases pass.
- **Committed in:** `2beffba`

### 2. [Rule 1 - Bug] The plan's stated reproduction is not reproducible in the harness as written

- **Found during:** Task 3
- **Issue:** The plan asks for a test where ONE arrow step on a five-column board at 1440px throws a neighbour off screen. In the Vitest browser project the row spans the full 1440px (no dashboard sidebar), so the midpoint threshold sits at 720px and step 1's destination (328px) clears it comfortably. Asserting "one step must not scroll" would have passed vacuously at desktop and failed legitimately at mobile, where `describeForEachDevice` re-runs the whole body at 375px and a scroll on every step is correct.
- **Fix:** Reformulated the reproduction as the device-independent invariant the defect actually violates — *the row scrolls only for a step whose destination is not already fully on screen* — measured per step across a four-step move. It fails at DESKTOP against the stock sensor (steps 3 and 4) and holds at both viewports after the fix.
- **Files modified:** `src/features/boards/components/board-view/board-view.test.tsx`
- **Verification:** Observed failing against the stock `KeyboardSensor`, passing after; see the evidence table above.
- **Committed in:** `2beffba`

### 3. [Rule 1 - Bug] Rect measurements were being taken mid-animation

- **Found during:** Task 3
- **Issue:** Reading `getBoundingClientRect()`/`scrollLeft` as soon as the live-region announcement changed produced fractional, mid-flight values (`movedLeft=87.24` where the settled value is 632), because both the sortable strategy's transform transition and the sensor's smooth scroll are animated. The first settle helper made it worse: it seeded its "previous" reading synchronously, so the first poll compared a value against itself and reported settled immediately.
- **Fix:** `waitForColumnLayoutToSettle` now seeds an empty string — forcing a second poll pass a frame later — and includes `scrollLeft` alongside every column's left edge in the signature it compares.
- **Files modified:** `src/features/boards/components/board-view/board-view.test.tsx`
- **Verification:** The invariant test is stable across repeated runs at both viewports and fails deterministically against the stock sensor.
- **Committed in:** `2beffba`

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs — both in this plan's own new test code)
**Impact on plan:** No scope creep. Deviation 1 moved code to the location the repo's own checkers require; deviations 2 and 3 made this plan's new tests actually able to fail, which is precisely what T-03-44 demands of them.

## Prohibitions — how each was honoured

- **"Never sort inside the component that renders columns."** `grep -rn "sortColumnsByPosition" src/features/boards/components/` returns nothing, and `board-view.test.tsx` pins that props whose array order and positions disagree render in array order.
- **"Never fix the keyboard scroll by removing overflow, pinning scroll, or suppressing scroll wholesale."** The row's `overflow-x-auto scroll-smooth` classes are untouched; nothing writes `scrollLeft`; the narrowing applies only to `ArrowLeft`/`ArrowRight` steps whose destination is already fully visible, and a dedicated case proves a column past the fold is still reachable, announced and on screen after a four-step keyboard move.

## Issues Encountered

- **`pnpm exec tsc --noEmit` reported two phantom errors** (`Cannot find name 'PageProps'` / `'LayoutProps'`) in a freshly created worktree. These are Next.js 16 generated route types; running `pnpm exec next typegen` once produced them and the typecheck has been clean since. Not a code problem — an artefact of a worktree with no `.next/`.
- **Three environment constraints carried in from the phase handoff were all confirmed and none blocked this plan:** the pre-commit hook's RED-only refusal never came up (no TDD task here); `pnpm storybook`'s dev-server crash was not needed (the Storybook Vitest project applies the alias and is green); and `mcp__playwright__*` was indeed not resolvable — see below.

## Outstanding checkpoint — the live-application pass is NOT done

**Task 4 of the plan (`checkpoint:human-verify`, `gate="blocking"`) has not been executed.** Playwright MCP tools were not resolvable in this executor: project-scoped `.mcp.json` servers are not inherited by spawned subagents, so neither `mcp__playwright__*` nor a headless fallback was available. Per the dispatching session's own instruction, the live-app verification is deferred to the orchestrating session after merge. **Nothing below has been observed in the running application by this executor — every claim in this SUMMARY rests on the automated suites named above.**

Still to drive, in the running app, in both themes:

1. **Persistence, pointer.** Drag a column two positions right, reload, confirm the order — then confirm the same order against the backend directly, so a passing UI is not a cache coincidence.
2. **Persistence, keyboard.** Same move by keyboard, same reload expectation.
3. **Neighbours stay visible.** On a five-column board at 1440px WITH the sidebar (the geometry that made the defect fire a step earlier than in the harness), one arrow step must leave every previously-visible column visible.
4. **Past the fold.** On a board wide enough to overflow, move a column first→last by keyboard; it must arrive, be announced, and end on screen.
5. **Nothing regressed.** Escape still cancels with its announcement, a kebab click still opens the menu without starting a drag, and no hydration warning appears in the console.
6. **Both themes.** Drag state and drop indicator in light and dark.

CI is also still to report; per CLAUDE.md, CI green is the sign-off and a local run is weaker by design.

## Verification run at close

- `pnpm test` — **87 files, 1269 tests, all passing** across all five projects (`tokens`, `node`, `browser`, `unit`, `storybook`).
- `pnpm lint` — clean.
- `pnpm exec tsc --noEmit` — clean.
- `pnpm comments:check`, `pnpm tsx:check`, `pnpm stories:check`, `pnpm renders:check`, `pnpm routes:check`, `pnpm handlers:check` — all passing.

No pre-existing assertion was weakened or deleted. The existing integration case that asserts `['Todo','Doing','Done']` still runs against an untouched board — the reorder case seeds its own.

## Known Stubs

None. No stub, placeholder, `TODO`, `FIXME` or skipped test was introduced by this plan.

## Threat Flags

None. This plan added no network endpoint, no auth path, no file access and no schema change; `sortColumnsByPosition` runs downstream of `boardFullSchema.safeParse`, and the sensor narrowing is client-side geometry only. The plan installed nothing (T-03-SC holds).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- COLUMN-03's read half is closed and pinned by a test that fails against the pre-fix code. Phase 4's task drag-and-drop inherits a board whose columns arrive in display order, so a task-level reorder can assume the same guarantee for columns without re-deriving it.
- **Blocker on declaring the phase done:** the Task 4 checkpoint above, plus CI. Both are the orchestrating session's to close.
- Worth carrying forward: `tasks` inside a column carry a `position` field too (`taskFullSchema`), and nothing orders by it yet. The same defect is latent one level down.

## Self-Check: PASSED

- `src/features/boards/hooks/use-column-drag-sensors.ts` — FOUND
- `.planning/phases/03-column-management/03-14-SUMMARY.md` — FOUND
- Commits `a8919d0`, `034e19c`, `2beffba` — FOUND in `git log`
- `git diff --diff-filter=D ccb369c..HEAD` — no deletions
- `git status --short` — clean, no untracked residue

---
*Phase: 03-column-management*
*Completed: 2026-08-27*
