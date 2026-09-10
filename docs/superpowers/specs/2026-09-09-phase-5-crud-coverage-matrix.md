# Phase 5 — CRUD coverage matrix

**Date:** 2026-09-09
**Status:** Living. Update it in the same commit that adds, adopts or retires a prototype.
**Companion to:** `2026-09-01-phase-5-modernization-design.md`, which holds the decisions; this
file holds only what is and is not covered.

## Why this exists

Phase 5's prototypes were organised by *surface* — material, transitions, overlays, landing. That
ordering makes a gap invisible when it falls between two surfaces, and one did: **every column
mutation**. `use-create-column`, `use-rename-column`, `use-delete-column` and
`use-reorder-columns` all ship today and none appeared in `G1`–`G8`. Re-indexing the same
prototypes by *entity × operation* surfaced it in one pass. **All four have been prototyped since
(`column-crud-v17`) and none is signed off** — the row reads `◑`.

The operation list is not invented here. It is the 21 mutation hooks under
`src/features/*/hooks/`, so a row cannot quietly omit something the app can already do.

## Legend

| | meaning |
|---|---|
| ✅ | a prototype shows this operation's own motion |
| ◐ | only a fragment is prototyped — the trigger, the toast, the button — never the operation |
| ◑ | prototyped end to end, **not yet signed off** — the surface exists and works, refinement is open |
| ❌ | nothing |
| — | the app has no such operation |

`◐` is the cell to distrust. It is what an index organised by surface reports as covered.

## The matrix

Paths are relative to `.superpowers/brainstorm/`; `S1` is `23940-1788251793/content/` and `S2` is
`316005-1788260529/content/`.

| Entity | Create | Read | Update | Delete | Move / reorder |
|---|---|---|---|---|---|
| **Board** | ✅ `S1/sidebar-boards-v1` | ✅ `S1/board-switch-v3`, `S1/sidebar-boards-v4` | ✅ `S1/board-edit-v2` | ✅ `S1/board-edit-v2` | — |
| **Column** | ◑ `S1/column-crud-v17` | ✅ `S1/load2-v2`, `S1/handoff-v4` | ◑ `S1/column-crud-v17` | ◑ `S1/column-crud-v17` | ◑ `S1/column-crud-v17` |
| **Task** | ◐ `S2/header` | ✅ `S1/task-open-v17` | ✅ `S1/task-open-v17`, `S1/optimistic-v5` | ❌ | ✅ `S1/drag-v3`, `S1/optimistic-v5` |
| **Subtask** | ✅ `S1/task-open-v17` | ✅ `S1/task-open-v17` | ✅ `S1/task-open-v17` | ❌ | — |
| **Account** | ✅ `S1/auth-v4` | ✅ `S1/auth-v4` | — | — | — |

### What each `◐` is actually missing

- **Board update.** `header.html` designs the board *title's* one-frame swap on rename and
  recommends it over a slide, because a rename has no direction. The rename input itself — where
  the user types — is not prototyped anywhere.
- **Board delete.** `menu-v2` covers the menu item's enter/exit and `toast-v3` the resulting
  toast. Neither the confirm modal nor the board leaving the sidebar exists.
- **Task create.** `header.html` covers `+ Add New Task`'s disabled→enabled snap. Nothing behind
  the click.

All three dead-end at **G2** — `modal.tsx` carries zero motion classes — which is what actually
holds create-board, rename, delete-confirm and create-task. G2 is therefore not one gap among
several; it is the single blocker behind four `◐`/`❌` cells.

## Corrections this matrix forced

**G5 is stale as written.** It claims *"no prototype shows the tick, the fill, or the caption
updating"*. `task-open-v13` through `v17` show all three: the tick is its own
`view-transition-name` unit, `syncCard()` drives the card's 3px bar via a `width` transition, and
the panel caption updates through named digit slots rather than a `textContent` write that would
delete them. What survives of G5 is narrower and belongs in the Subtask row: **rename and delete**,
neither prototyped — the subtask labels are plain `<span>`s, not `contenteditable`, and no row can
be removed.

**Task delete remains the sharpest `❌`.** It is the one genuinely non-optimistic wait in the app
(the card must survive until the server confirms), and `S2/waiting-task2.html` is a 313-byte
abandoned stub. Recorded as `G6`.

## Cell dossiers — every cell that is not ✅

One entry per uncovered cell: what ships today, and which adopted Phase 5 work already answers
most of it. The point of the third column is that **almost nothing here is a blank sheet** — the
mechanisms exist and are measured; what is missing is the decision to point them at this surface.

### Board

**Create — ✅ closed 2026-09-09** by `sidebar-boards-v1`, together with the sidebar surface it
lands in (`v2`–`v4`). Decisions in the design doc under "The sidebar board list, and creating a
board". The modal half is also the phase's first `Modal` treatment, so it is a first pass at G2.

**Update (rename) — ✅ closed 2026-09-09** by `board-edit-v2`. Inline in the row, entered from the
existing kebab; `EditBoardModal` is deleted by it. The board title slides inside a masked well.

**Delete — ✅ closed 2026-09-09** by `board-edit-v2`. Kebab → confirm → one
`document.startViewTransition` covering the row's departure, the rail's move and the board swap.
Reconciling it with §4c's directional board switch is deferred to its own session.

### Column — G9, all four prototyped, none signed off

**State on 2026-09-09: `column-crud-v17.html` is one working surface covering all four operations.**
Thirteen defects were found and fixed against it in a single sitting (log entries 15–26). The user's
verdict at close: *"what we have now feels better, but still needs a bit of refining"* — so the row
is `◑`, not `✅`, and G9 stays open.

**2026-09-10 — the refinement pass that verdict asked for.** Driving all four operations turned up
six more (log entries 27–32), each falsified against the pre-fix file in the same run: the kebab
handoff left ~90ms with no kebab on screen and then popped one in 10px lower (27); a neighbour's
kebab lit while a column was being carried over it (28); the delete confirm dimmed only the board
card and centred on it rather than the viewport (29); an empty column's confirm read "removes its
**0 tasks**" (30); the create rail claimed the 420px lane while columns are content-height, putting
its `+` 78px below everything (31); and a newly created column had no body at all (32). All six are
fixed. **The row stays `◑`** — the fixes are measured, but nobody has watched the result yet, and
this file's own history says a look is what closes a cell, not a green number.

**Then someone watched it, and the point was made again (entries 33–35).** Three more, none of
which any measurement in that pass had reached: the rail's hover label painted under a card and was
simply never visible; the rail was now too *short*, because #31's fix removed the height when the
real defect was the centred glyph; and a drop landed with the column's text doubled and smeared for
one beat, from a panel deliberately kept 140ms past landing on the stated ground that it was "the
same pixels twice" — a claim that was 1px wrong and cross-fading besides. Every one was found by
looking. **34 is the row to reread before touching this surface:** it is a defect introduced by a
fix for another defect, because the fix satisfied the assertion instead of the intent.

**Create — ◑ decided in shape.** The ghost column is replaced by a **34px rail** at the board's end
(fixed footprint, label as an overlay) **plus `+ Column` in the board header**, reachable at any
scroll position; the rail carries a low-key dismiss, safe only because the header button survives
it. Creation is **inline** — the column exists immediately and its header opens in edit mode — so
`add-column-modal` goes the way of `EditBoardModal`. Measured: the ghost was 210px / **15.3%** of a
1374px canvas; the rail is **2.5%**.

**Update (rename) — ◑ decided in shape.** Inline in the header, from the kebab that already ships.
**One complication that does not apply to the board:** the column caption *is* the drag handle, a
`<button>`, and `contenteditable` inside a button is not viable — so the name must be **swapped**
for an editable node with font, letter-spacing, uppercase and line box pinned to the handle's.

**Delete — ◑ decided in shape.** Kebab → confirm → the board closes up through
`startViewTransition`. Measured: 28 frames over 492ms with it, 12 over 148ms without — and that
148ms is the scrim fade alone, with the columns simply jumping.

**Reorder — ◑ the least settled, and the source of most of the defect log.** §2's vocabulary at
column scale: a DragOverlay carries the motion, the source slot collapses to a dashed ghost, the
board FLIPs at **160ms** (deliberately shorter than the 180ms settle, because a reorder is direct
manipulation). Decided along the way: **no scale** — scale is proportional and column height ranges
over an order of magnitude, so one value is a different gesture per column; the carried panel is
**content height** while the slot it leaves is **lane-tall**; and the panel sheds its chrome in
flight so its removal is a swap of like for like.

### Task

**Create — ◐**
Today: `add-task-button` → `add-task-modal`, with subtask rows built from `subtask-editor-row`.
Carries over: `header.html` covers the trigger's disabled→enabled snap; `optimistic-v5` covers the
card arriving in its column before the server answers, which this flow already does. Missing: the
modal itself (G2), and the same repeating-row problem as board create.

**Delete — ❌**
Today: `delete-task-confirm`.
Carries over: least of any cell, by design. G6 records why: this is the one genuinely
**non-optimistic** wait in the app — the card must stay until the server confirms, so the collapse
covers real latency instead of adding it. Every other motion in the phase assumes the optimistic
case. `S2/waiting-task2.html` is a 313-byte abandoned stub.

### Subtask

**Rename — ❌** and **Delete — ❌** (what remains of G5)
Today: both live in `subtask-editor-row`, which is used only by `add-task-modal` and
`edit-task-modal` — a text input plus a remove `IconButton`.
Carries over: **the host component is scheduled for deletion.** Phase 5's adopted panel direction
replaces `EditTaskModal` with inline editing, so designing these two against today's UI designs a
surface that is being removed. The right target is the panel: `task-open-v17` already makes the
title and description `contenteditable` and already adds a subtask row live — rename is the same
treatment applied to a label that is currently a plain `<span>`, and delete is the row-removal
counterpart of the add it already performs.

### The pattern under all of it

Nine of the eleven cells route through a `Modal`, and `modal.tsx` has zero motion classes. **G2 is
not one gap among nine — it is the gap, and eight cells inherit their fix from it.** The two that
do not are column reorder (drag) and task delete (a non-optimistic wait).

Second, four rename/edit flows are modals, and Phase 5 has already decided once that a modal over
a surface is the wrong shape. Board rename, column rename and subtask rename are the same decision
three times; taking it once closes three cells.

## Resume here — 2026-09-10

**Where to pick up:** `column-crud-v17.html`, served by
`node scripts/serve-static.mjs .superpowers/brainstorm 6110`.

Open, in the order they are likely to matter:

1. **G9 sign-off — now a look, not an audit.** Step 1 of the 2026-09-09 note (drive the four
   operations, list what reads wrong) is done: six defects found, logged as 27–32, all fixed and
   falsified both ways. What is left is the half a measurement cannot do — watch a drag and a
   delete at full speed and say whether they read right. Only then does the row go `✅`.
2. **The remaining `◐` cells** — task create, subtask rename, subtask delete — plus task delete,
   which is still `❌` and is the one non-optimistic wait in the app.
3. **G2**, which eight cells inherit and which the board-create and column-delete prototypes have
   now given a first treatment twice over.
4. **§4c reconciliation**, deferred with a reason: it is directional, a delete is not, and it uses
   zero calls to the real View Transitions API.

**Do not re-derive:** the defect log's **nine recurring causes** explain most of what went wrong
here, and every one of the 39 entries names the assertion that would catch it. Read that file
before writing new motion code, not after.

## Keeping it true

Two failure modes, and only the first is cheap to catch:

1. **A cited prototype is renamed or deleted**, leaving a citation pointing at nothing.
2. **A prototype is added and no cell is updated**, which is how the column row stayed empty
   without anyone noticing.

Neither is guarded mechanically today. A `scripts/check-phase5-coverage.mjs` gate could close
both — assert every cited path resolves, and every `.superpowers/brainstorm/*/content/*.html`
is either cited here or named in an explicit not-a-CRUD-surface list. Not built: the matrix is one
day old and the cost of a gate that outlives the phase it guards is real. Revisit if a citation
rots before Phase 5 closes.

Until then the rule is the status line at the top: **a commit that touches a prototype touches
this file.**
