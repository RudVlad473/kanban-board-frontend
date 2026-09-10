# Phase 5 — CRUD coverage matrix

**Date:** 2026-09-09
**Status:** Living. Update it in the same commit that adds, adopts or retires a prototype.
**Companion to:** `2026-09-01-phase-5-modernization-design.md`, which holds the decisions; this
file holds only what is and is not covered.

**Building from this?** `2026-09-10-phase-5-handover-ledger.md` names the adopted prototype and its
decisions per surface; this file only says whether a cell is covered.

## Why this exists

Phase 5's prototypes were organised by *surface* — material, transitions, overlays, landing. That
ordering makes a gap invisible when it falls between two surfaces, and one did: **every column
mutation**. `use-create-column`, `use-rename-column`, `use-delete-column` and
`use-reorder-columns` all ship today and none appeared in `G1`–`G8`. Re-indexing the same
prototypes by *entity × operation* surfaced it in one pass. **All four were then prototyped in
`column-crud-v17` and signed off on 2026-09-10** — the row reads `✅`, at a cost of 26 logged
defects.

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
| **Column** | ✅ `S1/column-crud-v17` | ✅ `S1/load2-v2`, `S1/handoff-v4` | ✅ `S1/column-crud-v17` | ✅ `S1/column-crud-v17` | ✅ `S1/column-crud-v17` |
| **Task** | ✅ `S1/task-create-v4` | ✅ `S1/task-open-v17` | ✅ `S1/task-open-v17`, `S1/optimistic-v5` | ✅ `S1/task-delete-v1` | ✅ `S1/drag-v3`, `S1/optimistic-v5` |
| **Subtask** | ✅ `S1/subtask-crud-v2` | ✅ `S1/task-open-v17` | ✅ `S1/subtask-crud-v2` | ✅ `S1/subtask-crud-v2` | — |
| **Account** | ✅ `S1/auth-v4` | ✅ `S1/auth-v4` | — | — | — |

### What each `◐` was missing, as the audit found it

**All three are now closed** — board update and delete by `board-edit-v2`, task create by
`task-create-v4`. Kept because it records what the audit was reacting to, and because the pattern
repeated: in every case an index organised by surface reported the cell as covered.

- **Board update.** `header.html` designs the board *title's* one-frame swap on rename and
  recommends it over a slide, because a rename has no direction. The rename input itself — where
  the user types — is not prototyped anywhere.
- **Board delete.** `menu-v2` covers the menu item's enter/exit and `toast-v3` the resulting
  toast. Neither the confirm modal nor the board leaving the sidebar exists.
- **Task create.** `header.html` covers `+ Add New Task`'s disabled→enabled snap. Nothing behind
  the click.

All three dead-ended at **G2** — `modal.tsx` carries zero motion classes — which is what actually
held create-board, rename, delete-confirm and create-task. G2 was therefore not one gap among
several but the single blocker behind four `◐`/`❌` cells; it closed 2026-09-10, and the three
`◐` cells closed behind it. **One `❌` is left: task delete.**

## Corrections this matrix forced

**G5 is stale as written.** It claims *"no prototype shows the tick, the fill, or the caption
updating"*. `task-open-v13` through `v17` show all three: the tick is its own
`view-transition-name` unit, `syncCard()` drives the card's 3px bar via a `width` transition, and
the panel caption updates through named digit slots rather than a `textContent` write that would
delete them. What survives of G5 is narrower and belongs in the Subtask row: **rename and delete**,
neither prototyped — the subtask labels are plain `<span>`s, not `contenteditable`, and no row can
be removed.

**Task delete remains the sharpest `❌`** — and the reason recorded here for it was **wrong**.
This said *"the one genuinely non-optimistic wait in the app"*. `use-delete-task.ts` writes the
cache in `onMutate`, snapshots the task with its subtasks plus the id of the neighbour it followed,
and restores in `onError`; it carries a `Decisions` block recording that it read *"deliberately NOT
optimistic"* until **2026-09-02** and was reversed. The audit read a spec that the code had already
superseded — #62 with the polarity flipped. `S2/waiting-task2.html` is still a 313-byte abandoned
stub. Recorded as `G6`.

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

### Column — G9, ✅ SIGNED OFF 2026-09-10

**All four operations closed** by `column-crud-v17.html`, after the user drove them and closed the
last report with *"ok good we can move on"*. G9 is done; the dossier below is the decision record.

The cost of getting here, because it is the argument for the handover rubric: **26 defects** on this
one surface (log rows 15–40), of which the user personally caught 21. Six of those were found only
after a fix for an earlier one shipped — #34 and #37 are defects introduced by fixes, and #38 was a
mechanism that had silently reverted to the thing it replaced. `2026-09-10-prototype-handover-rubric.md`
exists so the next surface costs fewer.

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

**Create — ✅ closed 2026-09-10.** The ghost column is replaced by a **34px rail** at the board's end
(fixed footprint, label as an overlay) **plus `+ Column` in the board header**, reachable at any
scroll position; the rail carries a low-key dismiss, safe only because the header button survives
it. Creation is **inline** — the column exists immediately and its header opens in edit mode — so
`add-column-modal` goes the way of `EditBoardModal`. Measured: the ghost was 210px / **15.3%** of a
1374px canvas; the rail is **2.5%**.

**Update (rename) — ✅ closed 2026-09-10.** Inline in the header, from the kebab that already ships.
**One complication that does not apply to the board:** the column caption *is* the drag handle, a
`<button>`, and `contenteditable` inside a button is not viable — so the name must be **swapped**
for an editable node with font, letter-spacing, uppercase and line box pinned to the handle's.

**Delete — ✅ closed 2026-09-10.** Kebab → confirm → the board closes up through
`startViewTransition`. Measured: 28 frames over 492ms with it, 12 over 148ms without — and that
148ms is the scrim fade alone, with the columns simply jumping.

**Reorder — ✅ closed 2026-09-10, and the source of most of the defect log.** §2's vocabulary at
column scale: a DragOverlay carries the motion, the source slot collapses to a dashed ghost, the
board FLIPs at **160ms** (deliberately shorter than the 180ms settle, because a reorder is direct
manipulation). Decided along the way: **no scale** — scale is proportional and column height ranges
over an order of magnitude, so one value is a different gesture per column; the carried panel is
**content height** while the slot it leaves is **lane-tall**; and the panel sheds its chrome in
flight so its removal is a swap of like for like.

### Task

**Create — ✅ SIGNED OFF 2026-09-10**, `task-create-v4.html`.
Two things the `◐` note got wrong, found by building it. `optimistic-v5` is about a **move** and
its rollback — it has no designed entrance for a card that did not exist a moment ago, which is the
whole of what a create produces. And the repeating rows are not the panel's rows: `subtask-crud-v2`
settled a tinted pill being *read*, while mock p38's create-form row is an empty text input with the
✕ outside it, being *filled*. The motion transferred; the material did not.

The modal is G2's, verbatim. The one genuinely new decision is that the modal's exit and the card's
arrival start on the **same frame** rather than being sequenced — the same finding as #40 and #51,
and the same call the subtask sink was changed to make.

The button took four passes and its own three defect rows (#70–#72); the short version is that
**hover may never change the top face's geometry** (a hover that moves the box un-hovers itself)
and **nothing hard-edged may animate on hover** (a 1px band crawling through fractional positions
is the "jerk").

**Delete — ✅ SIGNED OFF 2026-09-10**, `task-delete-v1.html`.
Today: `delete-task-confirm`.
**The `❌` note here was wrong about the mechanism.** It said this was the one genuinely
non-optimistic wait in the app. `use-delete-task.ts` writes the cache in `onMutate`, snapshots the
task with its subtasks plus the id of the neighbour it followed, and restores in `onError` — and it
carries a `Decisions` block recording that it read *"deliberately NOT optimistic"* until
**2026-09-02** and was reversed, because the client snapshot really can roll back and because
depending on `refresh()` alone made the board segment uncacheable.

So the card leaves on the press and there is no wait to cover. What needed designing is the half
nobody sees on a good day: the **restore** — anchored to the neighbour the task followed rather than
to an index, reusing the same element rather than rebuilding it, and entering by the opposite rule
to the way it left (box first, contents last) — and the **failure toast**, which is correct here
precisely because the modal has already gone. `S2/waiting-task2.html` is a 313-byte abandoned stub.

### Subtask — ✅ SIGNED OFF 2026-09-10

**Create, rename and delete are `subtask-crud-v2.html`**, signed off after the user drove them and
closed the last report with *"ok, perfect, approved"*. `task-open-v17` remains the reference for
read and for the completion toggle; it never had a rename affordance, any removal at all, or a
single frame of motion on its add.

The target was the panel rather than `subtask-editor-row`, and the reason is worth keeping: that
component is used only by `add-task-modal` and `edit-task-modal`, and **Phase 5's adopted panel
direction deletes `EditTaskModal`** — designing there would have designed a surface being removed.

Checked against the mock rather than assumed: p37 (view task) has **no rename and no delete
affordance at all**, p39 (edit task) has the ✕ to the right of each field — in the modal being
deleted. So only the ✕ and the panel's own `contenteditable` treatment are carried over, and the
file says so rather than filling the gap with invention.

What it settles beyond the two cells:

- **The row is a field, not a paragraph.** Everything the field draws — background, ring, outline,
  cursor, clicks — is on a block wrapper; only the strike-through is on the inline label, one box
  per line. This produced #50, #52 and #53 before it was stated as a rule, and it is now the defect
  log's recurring cause 10.
- **Which parts of the panel are pinned.** Title, description and count pinned; the list scrolls;
  `Current status` pinned. The description is clamped to four lines so the worst case costs the
  list 23px rather than an unbounded amount. **`task-open-v17` and `modal.tsx` disagree about this**
  — the modal already keeps its close control outside the scroll region and has a test for it, and
  the panel prototypes contradicted that without noticing the precedent. Carry this shape into G3.
- **Done subtasks sink, and the sink is a FLIP driven by flex `order`.** Reordering with
  `appendChild` re-inserts the node, which cancels its running transitions — so the strike died on
  frame 1 the moment the sink stopped being sequenced after it. Visual order and DOM order are now
  deliberately different objects; `S` stays indexed by DOM order and only the visual one moves.
  Every comparison has to name which ordering it means (#54).

Cost: 13 defects, rows 41–54, ten of them caught by the user.

### The pattern under all of it

Nine of the eleven cells route through a `Modal`, and `modal.tsx` has zero motion classes. **G2 was
not one gap among nine — it was the gap, and eight cells inherit their fix from it.** The two that
do not are column reorder (drag) and task delete, whose confirm still routes through `Modal`
but whose card motion does not.

**G2 closed 2026-09-10** — `modal-motion-v1.html`. It carries three requirements the implementation
cannot skip: a grid-centred wrapper (because `translate` is taken by the centring), a three-part
head/scroll/foot popup (because one scroll region loses the title and the submit button), and a
designed reduced variant that is not `transition: none`. Rows 55 and 56.

Second, four rename/edit flows are modals, and Phase 5 has already decided once that a modal over
a surface is the wrong shape. Board rename, column rename and subtask rename are the same decision
three times; taking it once closes three cells.

## Resume here — 2026-09-10

**G9 is closed.** The Column row is `✅`; `column-crud-v17.html` is the reference for column
create, rename, delete and reorder. Serve it with
`node scripts/serve-static.mjs .superpowers/brainstorm 6110`.

**Before opening any of the below, read `2026-09-10-prototype-handover-rubric.md`.** Thirteen
checks, derived from the fact that 38 of this project's 54 recorded design defects were caught by
the user rather than by a check. Check 13 — the scale pass — is deliberately deferred until the
main bulk of the surfaces exist; run it then, over every unbounded collection at once. Running them is what makes the next surface cheaper than this one was.

**Subtask CRUD and task create are closed** — `subtask-crud-v2.html` and `task-create-v4.html`,
both signed off 2026-09-10, and so is **task delete** (`task-delete-v1.html`). **Every cell in the
matrix is now `✅`** — no `◐`, no `❌`. What remains is not coverage but the gap list: G1, G3, G4, G7,
row 58, and §4c.

Open, in the order they are likely to matter:

1. **§4c reconciliation**, deferred with a reason: it is directional, a delete is not, and it uses
   zero calls to the real View Transitions API.
2. **Row 58** — the grid-centring wrapper G2 requires lets Tab escape Base UI's focus trap. It
   cannot be settled in a prototype; it needs real JSX and a Tab-containment assertion.
3. **G1** (reduced-motion variants), **G3** (toast enter/exit), **G4** (overflow affordance) and
   **G7** (theme switch) are the surfaces the matrix never covered because they are not CRUD.

**Do not re-derive:** the defect log's **nine recurring causes** explain most of what went wrong
here, and every one of the 40 entries names the assertion that would catch it. Read that file
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
