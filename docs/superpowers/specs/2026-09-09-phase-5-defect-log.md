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

Five recur often enough to be worth stating before the table:

1. **An inline `style.transition` overrides the stylesheet's whole list**, not just the property
   you named. Setting one for a FLIP and leaving it disables everything else on that element.
2. **A transition cannot interpolate from `auto`**, and `align-self` cannot interpolate at all.
   Growth needs a concrete start value and a forced reflow.
3. **A `position: fixed` clone has no stretching parent**, so it collapses to its content whatever
   the source measured.
4. **`view-transition-name` makes an element a stacking context**, so a `z-index` set inside it
   cannot escape it.
5. **Two stacked semi-transparent layers with different backgrounds do not sum to either.** A
   cross-fade is only invisible when both halves are the same pixels.

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
| 16 | The dashed slot arrived at full height in one frame | Rule 2 above — `align-self: stretch`, then `min-height` from `auto` | User | e2e: sample the slot's height across the transition; the midpoint is strictly between start and end |
| 17 | The slot animated on the first drag only | Rule 1 above — the FLIP's inline `transition: translate …` disabled height and opacity from the second drag on | User | e2e: **drag twice** and assert both animate. A single-drag test passes through this defect |
| 18 | Columns flapped between N and N−1 with the pointer still | The swap moved the dragged slot's own rect under the pointer, satisfying the reverse test immediately | User | e2e: hold the pointer after a swap, dispatch N identical moves, assert one distinct order |

## What is not mechanically catchable

Rows 9 and, in part, 10 and 11 are judgements about how motion **reads**, and the numbers only
became meaningful once the defect was already suspected. The filmstrip narrows them — a
single-frame step and a non-monotonic wash are both real signals — but neither would have been
looked at without a person saying "that feels off".

Two more that resist assertion entirely:

- **Whether a lifted column reads as a column or as a stack of tasks.** Both states are correct
  DOM; the difference is the size of the thing you are carrying relative to what it represents.
- **Whether an affordance feels "bulky" for how often it is used.** #6's 15.3% is measurable
  *after* someone decides that a rare action should not hold permanent space.

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
