# Phase 5 — design defect log, and how each one is caught

**Date:** 2026-09-09
**Status:** Living. Add a row when a prototype defect is found; carry the row into the plan that
implements the surface.
**Companion to:** `2026-09-01-phase-5-modernization-design.md` (decisions) and
`2026-09-09-phase-5-crud-coverage-matrix.md` (coverage).

## Why this exists

Every defect below was found by **a person looking at the thing** — not by a check. Each one also
passed whatever verification existed at the time: the DOM was right, the classes were right, the
numbers agreed. Recording them as prose would let them return; the point of this file is that each
row names **the assertion that would have failed**, so the plan implementing that surface can carry
the test with it.

**The honest column is the last one.** Some of these are mechanically catchable and some are not,
and pretending otherwise is how a defect ships under a green suite (`docs/adr/tech/0037`).

## The rules the defects keep breaking

Eight recur often enough to be worth stating before the table:

1. **An inline `style.transition` overrides the stylesheet's whole list**, not just the property
   you named. Setting one for a FLIP and leaving it disables everything else on that element.
2. **A transition cannot interpolate from `auto`**, and `align-self` cannot interpolate at all.
   Growth needs a concrete start value and a frame boundary — `void el.offsetHeight` inside one
   task is not enough; `requestAnimationFrame` is.
6. **`getBoundingClientRect` includes transforms; `offsetLeft`/`offsetTop` do not.** Aim at the
   settled layout position, or an in-flight FLIP will send the thing somewhere its target has
   already left.
7. **A class used to seed a start value must also suppress the transition.** Otherwise applying it
   animates *into* the start value, and removing it merely reverses a fade that never arrived.
3. **A `position: fixed` clone has no stretching parent**, so it collapses to its content whatever
   the source measured.
4. **`view-transition-name` makes an element a stacking context**, so a `z-index` set inside it
   cannot escape it.
5. **Two stacked semi-transparent layers with different backgrounds do not sum to either.** A
   cross-fade is only invisible when both halves are the same pixels.
8. **A handoff between two elements needs its two windows to overlap, not abut.** Fixing a
   double by making the first leave earlier buys a gap instead; the fix is to make the
   pair *interchangeable* — same position, same opacity — and swap them on one frame.
   `display` cannot be transitioned, so an element hidden that way always arrives as a snap.

## The log

| # | Defect | Cause | Caught by | Assertion that would fail |
|---|---|---|---|---|
| 1 | Whole window cross-fades during the panel transition | The page named its own `:root`; `::view-transition-old/new(*)` then matched it | User, watching an OBS capture | `pnpm filmstrip --region <panel>` — **outside wash** ≤ `THRESHOLDS.outsideWash`. Was 4.89, is 0.22 |
| 2 | A positive control silently did nothing, twice | `view-transition-name: root` is a **reserved value that fails to parse** | Byte-identical numbers from a "broken" and a "fixed" run | Assert the injected rule is actually in `document.styleSheets` after injection |
| 3 | `secondary` button had no perceptible hover | White → `#fafbfe` is a **5/4/1** channel step, under the filmstrip's own threshold of 8 | User | Unit: max channel delta between rest and hover fills ≥ 8 |
| 4 | `secondary` looked like a bright pill in dark mode | Three light-theme literals (`#dfe6f5`, `#fafbfe`, `#f1f4fb`); the drop edge paints **lighter** than the button | User, on a screenshot | Unit: the drop edge's luminance is below the button fill's **in both themes** |
| 5 | Kebab menu painted behind the rows below it | `view-transition-name` on each row makes every row a stacking context; `.colm:hover .ckb` (0,3,0) also beat `.colm.source > *` (0,2,0) | User, on a screenshot | e2e: `elementFromPoint` at the menu's own centre is inside the menu — **not** `toBeVisible`, which passed |
| 6 | Ghost column ate 15.3% of the canvas and was unreachable on a wide board | It is a full-width column pinned after the last one | User | e2e: the create affordance is inside the canvas viewport at `scrollLeft = 0` |
| 7 | The rail retreated as you reached for it | Growing 34 → 150px on hover lengthened the track and moved the scroll end 116px | User, on a video | e2e: `track.scrollWidth` is unchanged between rest and hover |
| 8 | Sidebar disclosure did not animate at all | `repaint()` rebuilt `innerHTML`, so the element was *born* expanded with nothing to interpolate from | User | Filmstrip: frames > 1. Was **1 frame over 0ms** |
| 9 | Drag overlay felt wrong while looking right | `background: var(--app)`, zero padding, 34px-blur shadow — contradicting the phase's hairline-first material rule | User | Visual regression on the dragging state |
| 10 | The dropped column popped into place | Overlay deleted and ghost class removed in the same frame | User | Filmstrip: the wash series has no single-frame step at the end of the settle |
| 11 | The drop flashed (fade out, fade in) | A still-tinted, still-bordered overlay cross-faded against the slot: rule 5 above | User | Filmstrip: wash after the flight is monotonic. Was 2.11 → **dip to 1.52** → 2.89 |
| 12 | Reordering repainted every column's hue | Hue keyed on the render **index**, not the id | User | Unit: `hueOf(id)` is stable across a reorder; e2e asserts the dot colour per id |
| 13 | Dragging selected text across every column it crossed | `user-select: none` was lost when two prototypes merged | User, on a video | e2e: `getSelection().toString()` is empty after a drag |
| 14 | A full-height column lifted as a stack of cards | Rule 3 above — the clone collapsed to content | User | e2e: overlay height equals the intended source measure |
| 15 | Kebab stayed lit on the dashed drag slot | Rule 5's specificity twin (see #5) | User, on a screenshot | e2e: the source column's kebab has `display: none` while dragging |
| 16 | The dashed slot arrived at full height in one frame | Rule 2 above — `align-self: stretch`, then `min-height` from `auto` | User | e2e: sample the slot's height across the transition; the midpoint is strictly between start and end. **Superseded by #21** — the growth was then removed as too much motion, so the surviving value of this row is rule 2, not the fix |
| 17 | The slot animated on the first drag only | Rule 1 above — the FLIP's inline `transition: translate …` disabled height and opacity from the second drag on | User | e2e: **drag twice** and assert both animate. A single-drag test passes through this defect |
| 18 | Columns flapped between N and N−1 with the pointer still | The swap moved the dragged slot's own rect under the pointer, satisfying the reverse test immediately | User | e2e: hold the pointer after a swap, dispatch N identical moves, assert one distinct order |
| 19 | The lifted column's header lingered visibly before fading | The source's contents faded out over 120ms while the clone — sitting exactly on top — began to move, so the two separated mid-fade | User, on a video | e2e: the source's children are `opacity: 0` with `transition-property: none` on the frame the drag starts |
| 20 | The dashed border lit and faded *after* the drop | The slot's box was transitioned, so its tint and dashes animated out once the gesture was already over | User | e2e: after the drop, the column's `border-style` and `min-height` are back at rest values within one frame |
| 22 | The slot's fade-in never ran | The element carried `transition: opacity`, so **adding** the `.opening` class animated 1 → 0 too; removing it two frames later reversed a fade that had barely left 1. `.opening` needs `transition: none` | User, then filmstrip — **1 frame over 0ms** | Filmstrip: frames > 1 on the lift. Sampling the property also works: 0 → 0.23 → 0.47 → 0.71 → 0.95 → 1 |
| 23 | The kebab blinked out the instant a column was lifted | The clone was stripped of `.ckb` as well as `.menu`, so the panel stopped being a picture of the column that was grabbed | User | e2e: the overlay contains a `.ckb` at opacity 1 and no `.menu` |
| 24 | Two kebabs on screen while a dropped column landed | The panel kept its kebab all the way down while the slot's own reappeared 120ms after the drop — offset by the overlay's 10px padding, so they read as two | User | e2e: sample both across the settle; the count of visible kebabs never exceeds 1 |
| 25 | The dashed slot painted over the column it crossed, intermittently | Every column is positioned, so paint order is DOM order; during the FLIP the slot and its neighbour genuinely overlap, and whichever came later in the list won | User, in slow motion; quantified with `elementFromPoint` | e2e: sample a neighbour's card centre across the FLIP; it is topmost on every frame. Was occluded on **12 of 57** |
| 26 | Dropping a column far from where it lands showed it in two places | Two faults compounding: the slot repopulated on a fixed 120ms while the 180ms flight was still running, and the panel was aimed at a rect that included the FLIP's in-flight `translate`, so on a long throw it never arrived at all | User, on a video | e2e: after a long drop, no frame has the panel >40px from the slot *while* the slot's header is visible. Was **5 frames**; the panel's final gap was also never 0 |
| 21 | The slot growing into the lane was too much motion for the interaction | Growth is a second animation competing with the flight, on a gesture that repeats | User | Judgement, not assertion — the height change is real and correct either way (see below) |
| 27 | No kebab on screen at all for ~90ms after a drop, then one popped in 10px lower | #24's fix overcorrected. The panel's kebab fades out over 120ms while the slot's stays `display: none` until `land()` fires on the flight's `transitionend` at ~180ms — so the two windows do not touch. `display` cannot be transitioned, so the arrival is a snap, and the panel's `.ckb` is positioned against the overlay's padded box, putting it `--ovpad` above the column's own | Orchestrator, sampling the settle at 30ms | e2e: sample the visible kebab count every frame across the settle; it is never 0 **and** never 2. #24 asserted only the upper bound |
| 28 | A neighbour column's kebab lit up while another column was being carried over it | `.colm:hover .ckb` has nothing to say about a drag in progress, so the pointer crossing a column arms its kebab exactly as a rest hover would | Orchestrator, sampling opacity mid-flight — caught at 0.139, mid-fade | e2e: during a drag, every `.ckb` outside `.overlay` is at opacity 0 |
| 29 | The delete confirm dimmed only the board card; the page header stayed lit and the dialog centred on the panel rather than the viewport | `.scrim` is `position: absolute` inside `.board`, so `inset: 0` resolves to the board's padding box — 1374×502 of a 1440×900 viewport | Orchestrator, computed style + rect | e2e: the scrim's rect equals the viewport's, and the modal's centre is the viewport's centre |
| 30 | Deleting an empty column read "removes its **0 tasks** and cannot be reversed" | The count clause has a singular and a plural branch and no zero branch, and the sentence is built to assume the column has tasks at all | Orchestrator, on a screenshot | Unit: the confirm sentence for a 0-task column contains neither `0 task` nor `0 tasks` |
| 31 | The create rail's `+` sat 78px below the bottom of every column, in a dashed strip reaching 288px past the content | `.railwrap`/`.rail` are `align-self: stretch` against a track with `min-height: 420px` — the lane height that exists for the *drag slot*. Columns are content-height by decision, so the rail was the only thing claiming the lane at rest | Orchestrator, rects: rail 34×420, columns 240×132 and 240×84 | e2e: at rest the rail's height equals the tallest column's, and its bottom is not below theirs |
| 32 | A newly created column was a caption with nothing under it — no body, no boundary, nowhere to drop | `colHTML` emits `<div class="cards">` unconditionally and an empty one has no height and no material, so a 0-task column renders as floating text | Orchestrator, on a screenshot after create | e2e: an empty column's `.cards` has a non-zero height and a visible border |

## What is not mechanically catchable

Rows 9 and, in part, 10 and 11 are judgements about how motion **reads**, and the numbers only
became meaningful once the defect was already suspected. The filmstrip narrows them — a
single-frame step and a non-monotonic wash are both real signals — but neither would have been
looked at without a person saying "that feels off".

Three more resist assertion entirely:

- **Whether a lifted column reads as a column or as a stack of tasks.** Both states are correct
  DOM; the difference is the size of the thing you are carrying relative to what it represents.
- **Whether an affordance feels "bulky" for how often it is used.** #6's 15.3% is measurable
  *after* someone decides that a rare action should not hold permanent space.
- **How much motion a repeated gesture can carry** (#21). Growth and fade were both correct; one
  of them was simply too much for something a user does several times in a row. Frequency of the
  gesture, not the quality of the animation, is what decides it.

The lesson those three carry is the one `docs/adr/tech/0037` already records, restated with a wider
sample: **verification narrows the search, it does not replace the look.**

## Carrying these into implementation

When a plan implements one of these surfaces, it takes the rows that touch it and writes the
assertion column as real tests, at the layer the row names:

- **unit** — token derivation and colour maths (#3, #4, #12)
- **e2e** (`e2e/*.e2e.spec.ts`) — geometry, selection, paint order, transition sampling (#5–#7,
  #13–#18)
- **filmstrip** — motion shape (#1, #8, #10, #11); a claim, not a gate, since it produces a sheet
  rather than a pass/fail
- **visual regression** — static material (#9)

Where a row's test is genuinely not worth its cost, say so in the plan and cite the row, rather
than leaving the omission silent.
