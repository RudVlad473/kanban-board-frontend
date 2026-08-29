---
created: 2026-08-29T18:45:00.000Z
title: 5 board-view.test.tsx failures remain — MOBILE keyboard column reorder across a scroll-needed step
area: testing
severity: major
files:
  - src/features/boards/hooks/use-column-drag-sensors.ts
  - src/features/tasks/task-drag-model.ts
  - src/components/layout/board-view/board-view.test.tsx
---

## Problem

`board-view.test.tsx` has 120 tests across MOBILE/DESKTOP. 5 still fail, all MOBILE-only, all
involving a keyboard column reorder where at least one arrow-key step needs the column row to
scroll (the destination isn't already visible at the narrow viewport):

- `scrolls the row only for a keyboard step whose destination is not already fully on screen`
- `still moves a column past the fold by keyboard and leaves it on screen`
- `issues exactly one request however many arrow steps the move took`
- `announces the lift, each move and the drop in the contract's own wording`
- `restores the rendered order and raises the rollback toast when the reorder fails`
- `moves a column relative to that already-reordered order, not to creation order` (a single-step
  test that fails only as **collateral damage** from one of the above timing out and leaving a
  dangling keyboard listener — see "Test pollution" below)

These were part of the original 20 failures introduced by plan 04-12 (documented in the phase's own
`.continue-here.md` and STATE.md). Root cause #1 below is fixed and committed (`eb1b80a` on
`gsd/phase-04-task-subtask-workflow`); these 5 are what's left.

## Root cause #1 — FIXED, committed in `eb1b80a`

`createTaskAwareCollisionDetection`'s column-drag branch called `closestCenter(args)` unfiltered.
Once tasks share the same `DndContext` as columns, `args.droppableContainers` also holds every task
card and column body, so an unfiltered `closestCenter` often picked a nearby task card as "closest"
instead of the neighboring column — `over.id` resolved to a task id (confirmed live-debugging:
values like `d10000000001`/`d20000000001`, never a column's own `c0000...` id), so
`resolveColumn(over.id)` always returned `null` and the announcement never advanced past "Picked
up ...". Fixed by scoping that `closestCenter` call to column-type droppables only. This alone
fixed 15 of the original 20 failures.

## Root cause #2 — diagnosed, NOT fixed, needs the decision below

**`sortableKeyboardCoordinates` (the coordinate getter `ColumnKeyboardSensor` and the base library
both use) ignores the `currentCoordinates` a caller passes it.** Confirmed by reading its source
(`@dnd-kit/sortable` dist, function `sortableKeyboardCoordinates`): it destructures
`collisionRect`/`droppableRects`/`over` straight off `_ref.context`, never touching the
`currentCoordinates` argument at all. `collisionRect` is `draggingNodeRect + modifiedTranslate` —
it does **not** include a scroll the row itself just did. So after one scroll-driven step,
`collisionRect` silently goes stale, and a second consecutive scroll-needed step computes its
target from the wrong starting point. This is why the announcement freezes specifically on the
*second* step of a 3-step move on the narrow viewport (confirmed by patching a scratch copy of
`node_modules/@dnd-kit/core`'s `core.esm.js` to trace the actual delta dnd-kit computed, then
reverting it — no lasting change to node_modules).

**Attempted fix (tried this session, reverted — not committed):** replaced the coordinate-getter
call with a hand-rolled "find the nearest column droppable in the arrow's direction" using each
column's own live `getBoundingClientRect()` (via `props.context.current.droppableContainers`),
bypassing `sortableKeyboardCoordinates` and its stale `collisionRect`/`droppableRects` entirely for
the *move itself*, then separately/independently scrolling the row to reveal an off-screen
destination (since the transform delta doesn't need the scroll to have happened first — both
active and target rects are read in the same frame regardless of where the row is scrolled to).

**Why it was reverted:** it fixed root cause #2 (single-scroll-step case went from 5→2 failures)
but surfaced a **third, worse bug**: dnd-kit's own internal `over` resolution — which drives the
`SortableContext`'s visual reordering of every OTHER column via CSS transform — started advancing
by **two** columns per keypress instead of one, specifically on scroll-needed steps. Confirmed
live: on a 5-column MOBILE board, `over` went `c1(self) → c3 → c5` across 3 steps instead of
`c1 → c2 → c3 → c4`. Net effect was worse than the original 5 failures (7, with cascading test
pollution from the timeout leaking a dangling keyboard listener into the next test — see below).

**Working theory for the overshoot (not verified further):** dnd-kit tracks the dragged column's
position via CSS `transform` (translate-based, `modifiedTranslate`, not scroll-aware), while other
columns' `droppableRects` may get re-measured against the *scrolled* viewport once `useScrollOffsets`
picks up the native 'scroll' event my `scrollBy()` call triggers. Once a scroll enters the picture,
these two positions disagree by roughly the scroll delta, and the resulting collision computation
effectively double-counts: one advance from the transform, another from the scroll-adjusted
remeasurement of the neighboring columns. This was not independently confirmed with the same
rigor as root cause #2 (time-boxed after the first fix attempt made things worse) — treat it as a
strong lead, not a settled fact.

## What a real fix likely needs

The two dnd-kit-internal position trackers (translate-based `collisionRect` for the active item,
and viewport-measured `droppableRects` for everyone else) need to agree once a scroll happens
mid-drag. Candidate directions, none attempted:

1. **Stop using dnd-kit's `onMove`/translate mechanism for columns entirely.** Drive the visual
   position and the `over` resolution from a fully custom state (e.g. track "current logical index"
   directly, render each column's transform from that index yourself instead of delegating to
   `SortableContext`). Bigger change, touches `sortable-column.tsx` too, but sidesteps the
   translate-vs-scroll inconsistency at its root instead of routing around it.
2. **Force a `droppableRects`/`collisionRect` remeasurement synchronously right after the row
   scrolls**, before the next keydown can fire — if dnd-kit exposes a public re-measure hook
   (`measureDroppableContainers` is on `PublicContextDescriptor`) this might be enough to make both
   trackers agree without replacing the mechanism. Not investigated.
3. **Scroll the row by exactly the column width/gap and nothing else**, so both trackers land on a
   position where their disagreement happens to cancel out for a single-step move (fragile,
   probably breaks again for a `steps > 1` scroll-heavy sequence like the 5-column past-the-fold
   test — the exact case that regressed above).

## Test pollution note (why one extra test fails)

`moves a column relative to that already-reordered order, not to creation order` (steps: 1, no
scroll needed on its own) fails only when it runs *after* one of the timing-out tests above in the
same file — the timed-out test's `reorderFromKeyboard` throws mid-drag (before the drop keypress),
leaving the `ColumnKeyboardSensor`'s keydown listener attached past that test's own cleanup. The
next test's own lift+step then gets processed twice (once by its own fresh listener, once by the
stale one), producing 2 `reorderColumnStub` calls instead of 1. Not a bug in this test itself —
fixing root cause #2 properly should make this one pass again as a side effect.

## Verification when this is picked back up

`pnpm exec vitest run src/components/layout/board-view/board-view.test.tsx --project browser` from
repo root — should go from 115/120 to 120/120. Isolate a single failing test with `-t "<test name>"`
first; the pollution above means the full-file run and an isolated run can disagree on which tests
fail.
