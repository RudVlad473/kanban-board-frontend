# Phase 5 — CRUD coverage matrix

**Date:** 2026-09-09
**Status:** Living. Update it in the same commit that adds, adopts or retires a prototype.
**Companion to:** `2026-09-01-phase-5-modernization-design.md`, which holds the decisions; this
file holds only what is and is not covered.

## Why this exists

Phase 5's prototypes were organised by *surface* — material, transitions, overlays, landing. That
ordering makes a gap invisible when it falls between two surfaces, and one did: **every column
mutation**. `use-create-column`, `use-rename-column`, `use-delete-column` and
`use-reorder-columns` all ship today, none appears in `G1`–`G8`, and none has a prototype.
Re-indexing the same prototypes by *entity × operation* surfaced it in one pass.

The operation list is not invented here. It is the 21 mutation hooks under
`src/features/*/hooks/`, so a row cannot quietly omit something the app can already do.

## Legend

| | meaning |
|---|---|
| ✅ | a prototype shows this operation's own motion |
| ◐ | only a fragment is prototyped — the trigger, the toast, the button — never the operation |
| ❌ | nothing |
| — | the app has no such operation |

`◐` is the cell to distrust. It is what an index organised by surface reports as covered.

## The matrix

Paths are relative to `.superpowers/brainstorm/`; `S1` is `23940-1788251793/content/` and `S2` is
`316005-1788260529/content/`.

| Entity | Create | Read | Update | Delete | Move / reorder |
|---|---|---|---|---|---|
| **Board** | ✅ `S1/sidebar-boards-v1` | ✅ `S1/board-switch-v3`, `S1/sidebar-boards-v4` | ◐ `S2/header` | ◐ `S2/menu-v2`, `S1/toast-v3` | — |
| **Column** | ❌ | ✅ `S1/load2-v2`, `S1/handoff-v4` | ❌ | ❌ | ❌ |
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

**Update (rename) — ◐**
Today: `edit-board-modal`, opened from the header kebab.
Carries over: `header.html` already designs the *result* — the title's one-frame swap, chosen over
a slide because a rename has no direction — and `title-v2` the settle. What is missing is
everything before that frame. **`task-open`'s inline-edit decision is the live question here:**
Phase 5 already concluded a modal on top of a surface is two surfaces where one will do, and the
board title is a `contenteditable` candidate for the same reason the task title was.

**Delete — ◐**
Today: `delete-board-confirm` — a `Modal` with `variant="destructive"` and a `secondary` cancel.
Carries over: `menu-v2` for the kebab that opens it, `toast-v3` for the outcome,
`buttons-v4`'s destructive press. Missing: the confirm modal's own motion (G2) and the board
leaving the sidebar list. `sidebar.html`'s collapse is the nearest mechanism for the second.

### Column — G9, the empty row

**Create — ❌**
Today: `add-column-placeholder` — PDF p3's ghost column, a real `<button>` spanning the column's
full height — opening `add-column-modal`.
Carries over: `load2-v2`/`handoff-v4` is a close fit and nobody has noticed — it already choreographs
a column's contents arriving, which is exactly what a new column does on landing.
`empty.html`'s drop zone is the same surface in a different state.

**Update (rename) — ❌**
Today: `rename-column-modal`, from `column-header`'s kebab (`Menu` + `IconButton`).
Carries over: identical in shape to board rename — same kebab mechanism from `menu-v2`, same
inline-vs-modal question from `task-open`. These two cells should be decided together or they will
diverge.

**Delete — ❌**
Today: `delete-column-confirm`, same construction as the board one.
Carries over: same as board delete, plus the harder half — a column leaving takes horizontal space
with it and the board must reflow. `sidebar.html` is the only prototype in the set that animates a
container's width; `drag-v3`'s source-slot collapse is the only one that shows a board making room.

**Reorder — ❌**
Today: `sortable-column` + `use-column-drag-sensors` + `use-reorder-columns`.
Carries over: `drag-v3` is the whole choreography — lift, carry, source-slot collapse, drop
settle — but it drags *cards*. Whether `scale(1.03)` and a 2px lift read the same on a 280px-wide
full-height column is unknown and is the one question in G9 with no analogue anywhere in the set.

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
