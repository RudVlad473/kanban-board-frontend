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
| **Board** | ❌ | ✅ `S1/board-switch-v3` | ◐ `S2/header` | ◐ `S2/menu-v2`, `S1/toast-v3` | — |
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
