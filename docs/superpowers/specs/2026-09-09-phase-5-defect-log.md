# Phase 5 — design defect log, and how each one is caught

**Date:** 2026-09-09
**Status:** Living. Add a row when a prototype defect is found; carry the row into the plan that
implements the surface.
**Companion to:** `2026-09-01-phase-5-modernization-design.md` (decisions),
`2026-09-09-phase-5-crud-coverage-matrix.md` (coverage), and
**`2026-09-10-prototype-handover-rubric.md` — the checks to run BEFORE a human sees it, derived
from this table's "Caught by" column. Read that one first; this one is the evidence behind it.**

## Why this exists

Every defect below was found by **a person looking at the thing** — not by a check. Each one also
passed whatever verification existed at the time: the DOM was right, the classes were right, the
numbers agreed. Recording them as prose would let them return; the point of this file is that each
row names **the assertion that would have failed**, so the plan implementing that surface can carry
the test with it.

**The honest column is the last one.** Some of these are mechanically catchable and some are not,
and pretending otherwise is how a defect ships under a green suite (`docs/adr/tech/0037`).

## The rules the defects keep breaking

Nine recur often enough to be worth stating before the table:

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
9. **One element, one property, two states that can be true at once — they belong in ONE
   attribute, not two.** Rows 5, 15 and 28 are all this shape (`opacity` on `.ckb`: hover vs
   slot, hover vs being-crossed-mid-drag) and all were settled by arranging specificity, which
   is invisible at the call site. On the way into the app this becomes worse, not better:
   Tailwind variants are all single-class, so overlapping states resolve by **sheet order**
   rather than intent. `docs/adr/tech/0038` makes the exclusivity structural instead.
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
| 40 | The lifted panel and the dashed slot dissolved one after the other, not together | The panel sheds its background, border and shadow across the 180ms flight; the slot's fade was started at **landing**, so it began where the panel's ended. Each fade was correct alone and the pair read as two beats of a gesture that has one | User, on a video | e2e: sample the panel's background alpha and the slot's `::after` opacity on the same rAF clock; they are equal within tolerance at every frame. Measured before: panel ran 0→144ms while the ghost sat at 1.0 and only started at ~195ms, ending at 311ms (11 frames vs 19). After: **identical at every sample** — 1/1, 0.72/0.72, 0.44/0.44, 0.17/0.17, gone together, 11 frames each |
| 41 | Grabbing a second column while the previous drop was still in flight painted **two panels and two kebabs** at once | `beginDrag` retired the last drop's *ghost* (`.colm.shedding`) but never its *panel*. The airborne overlay kept painting and kept its own kebab while the new one was staged on top — the "never 2" half of #24/#27 re-entering through a **gesture** rather than through a fade. `body.is-settling` also stayed set, so the guard for #39 was left armed under the new drag | Codex, auditing the sync run; reproduced by me with a real mouse | e2e: release a drag, wait ~40ms, grab a neighbour, and sample `.overlay` and lit-kebab counts per rAF. Measured before: **max 2 overlays, max 2 kebabs, 7 consecutive frames (~94ms)**. After: **1 and 1, 0 two-kebab frames**, with the single-drag sync unchanged (12 settling frames, ghost−panel alpha diff 0) |
| 42 | Landing still ran off the **200ms timer** half the time — #38's fix addressed the wrong half of the race | Removing `{ once: true }` stopped the wrong event consuming the listener, and left the timing race untouched: the flight is 180ms and the fallback fires at 200ms, so a `transitionend` delayed by more than one frame loses. Worse, in the runs that fell back the overlay reported **no `transitionend` at all** — the transition had not started, so no listener could ever have fired. A listener cannot distinguish "late" from "never" | Codex, on the run I had already reported as clean | e2e: measure `is-settling` add→remove over **8 real-mouse drops**, not one. Measured before: **4 of 8 at 200.4ms with zero overlay transitionend**. After (`getAnimations()` queried on a forced flush, `finished` awaited): **181.9–196.4ms, 0 of 8 on the fallback**, and a zero-travel drop now lands in **4.1ms** instead of waiting out the floor |
| 43 | Releasing a drag inside the slot's own 140ms fade-in left the panel flying home over a **hole** | `.opening` seeds the ghost at 0 and comes off on the next rAF, after which the dashes fade in. A flick released inside that window sheds from whatever the fade-in reached — 0.000 on a real flick — while `.colm.source > *` keeps the column's own contents hidden. Nothing is drawn where the column was for the entire flight. The sync fix of #40 was real but only ever sampled from a *held* drag | Codex; I first called it a probe artifact and was wrong — reproduced with a real mouse (down, two moves, up) | e2e: drive the drag with **no dwell**, and sample the ghost against the panel alpha. Measured before: ghost **0.000** for all 12 settling frames against panel 1 → 0.907 → 0.815 → 0.723. After (`.ghostlit` commits opacity 1 with the transition suppressed, then `.shedding` interpolates from it): **identical at every frame, diff 0**, with the held-drag path unchanged at 11 frames and diff 0 |
| 44 | Two interleaved gestures threw **uncaught TypeErrors**, not cosmetic slips | A row that is collapsing is out of the model but on screen for another 200ms, and a row that is entering focuses its own label. So clicking a collapsing row ran `S[-1][1]`, and deleting an entering row removed a node whose blur then ran `S[-1][0] = v`. `.leaving` correctly returned `-1`; nothing checked it. Every handler that resolves an index has to survive `-1` | Codex, auditing a prototype I had judged acceptable | e2e: drive the second gesture **inside the first's animation** (30ms into a collapse; 120ms into an entry) with `pageerror` captured, not just a state assertion. Measured before: `Cannot read properties of undefined (reading '1')` at h=18.8px/op=0.44, and `Cannot set properties of undefined (setting '0')`. After: **zero page errors**, counts correct in both, plus `pointer-events: none` on `.leaving` so the gesture is not offered either |
| 45 | A `<button>` hidden with `visibility: hidden` is **not a control** — the delete was mouse-only | `visibility: hidden` takes the hit area away, which is why it was chosen, and takes the element out of the **tab order** with it. The toggle had the mirror problem: its handler was on a `<div>`, which no styling makes focusable. `opacity: 0` alone is the other half of the trap — an invisible 18px button still swallows clicks meant for the row | Codex | e2e: press **Tab ten times** and record `document.activeElement` each time; then operate the control from the keyboard alone. Measured before: three labels, the add button and the rig — **zero ✕ buttons**, and a programmatic `focus()` + Enter left every row intact. After: tab order is tick → label → ✕ per row, Enter on a ✕ deletes, Space on a tick toggles and flips `aria-checked`, and at rest `elementsFromPoint` over the ✕ returns `.st` — the hit area is still gone |
| 46 | The add had a **third beat**: box, then selection, then a focus outline finishing 157ms after the row landed | The new row's label was focused in the entry animation's completion callback, so the outline's own 130ms transition started where the box's 200ms ended. Each was correct alone; the gesture read as three. #40 again, in a new body — and the giveaway is the same one, a duration measured per-element instead of across the gesture | Codex | e2e: sample the outline's computed colour on the **same rAF clock** as the box, and require it to resolve inside the box's own duration. Measured before: entry opacity 0.999 @ 207ms, selection @ 225ms, outline 0.14 @ 241ms → solid @ **357ms**. After (focus moved to the START of the gesture, `preventScroll` because the row is 0px tall at that instant): outline **solid at 121ms**, box lands at 188ms, everything flat thereafter |
| 47 | The strike-through on a **wrapped** subtask label was one rule across the middle of the paragraph, striking neither line | It was `::after { position: absolute; top: 52% }` — ONE rectangle over the element's whole border box, which is indistinguishable from a strike-through only while the label is one line. Now a `linear-gradient` background on a genuinely inline label with `box-decoration-break: clone`, so every line fragment gets its own line drawn from its own left edge; the label needed a wrapper because a flex child is blockified and a blockified box has one fragment | User, on a screenshot | e2e: assert `getClientRects().length > 1` on the label, then that the strike lands on the glyphs of **each** rect. Measured after: 2 line boxes, `background-size: 100% 1.5px` on both. Residual, measured not assumed: the line overhangs the last glyph by **6px** (2px padding + the trailing space at the wrap) and `text-decoration` does **not** avoid this — the space is inside the line box either way |
| 48 | The rename pencil and the delete ✕ were drawn **on top of each other** | Both were pinned to the row's right edge, which is all the room a 12px row has. The audit that passed it was asked to prove the two pseudo-elements both existed — they did, and both existing *is* the defect. There is no pencil now: the label takes a field background and an I-beam on hover, which is what this panel's title and description already do, and the right edge belongs to the ✕ alone | User, same screenshot | e2e: assert the **gap** between the label's right edge and the ✕'s left edge is positive, not that both are present. Measured after: `gapLabelToX: 11px`, and `elementsFromPoint` over a hovered ✕ returns `.stx` then `.st` |
| 49 | Nothing had ever been drawn with more than **three** subtasks | The prototype seeded three rows and every check ran against three. Codex was asked whether 15 rows broke anything and correctly answered no — a robustness question, not a look. The panel had no `max-height` at all, so a long list simply ran off the page. The panel is the scroller now, and the rig has a 12-row state | User, same screenshot | e2e: screenshot the **fullest** state, not the seeded one, and assert the controls below the list are still reachable. Measured at 12 rows in a 760px viewport: `scrollHeight 832 > clientHeight 704`, and adding a row scrolls the panel to 128 with the new row in view |
| 38 | The drop landed on a **timer**, not on arrival — silently reverting #26's whole fix | `overlay.addEventListener("transitionend", …, { once: true })` with a `propertyName === "translate"` guard *inside* it. `.overlay.settling` transitions five properties at the same 180ms — translate, background-color, four border-colors, box-shadow — so which reports first is arbitrary. `background-color` usually won, consumed the `once` listener, and the guard never ran; `land()` then fell through to the 200ms fallback | Codex, auditing a filmstrip run already judged fine | e2e: assert `land` happens within one frame of the **translate** `transitionend`, not merely "within 200ms" — the fallback makes a timing assertion pass through this defect. Measured: `background-color@175ms` fires first; landing now tracks `translateEnd` at 175→176ms, and did not fire from it at all before |
| 39 | Hovering a neighbour *after* releasing a drag lit its kebab while the panel still carried one | `body.is-dragging` is removed at pointer-up, but the panel is airborne for another ~180ms. #28's guard covered the drag and not the flight — the one part of the gesture with no rule | Codex | e2e: sample the visible kebab count across the **settle**, moving the pointer onto a neighbour. Measured **8 frames with two kebabs → 0** |
| 36 | Dragging a column on a board wide enough to scroll sent the panel to a point it never arrived at | The landing target is built from `offsetLeft`, a position in the offsetParent's **unscrolled content box**, but `.board` is `overflow-x: auto`. Without `- parent.scrollLeft` the panel misses by exactly the scroll offset | User, on a video | e2e: drag with `board.scrollLeft > 0` and assert the final panel/slot gap is 0. **Measured 300px off at `scrollLeft` 300; 0 after.** Every earlier drag test ran at `scrollLeft` 0, where the missing term is invisible |
| 37 | Empty columns grew a grey slab nobody asked for | **A regression introduced by #32's fix.** "A column with no tasks has no body" was answered by inventing a recessed well, when the mock has no empty-column state to copy at all — a decision presented as a lookup | User, on a screenshot | Judgement. The guard is procedural: when the mock has no answer, say so and take the smallest rung of type → spacing → outline → fill |
| 33 | The rail's hover label painted *underneath* the last column's card, so the one affordance that names the rail was invisible | The label overhangs the column to its left by design (`right: 38px`), but `.railwrap` had no `z-index` while every `.colm` has `z-index: 1` | User, on a screenshot | e2e: `elementsFromPoint` at the label's centre has the label first. **`elementFromPoint` cannot see it** — the label is `pointer-events: none`, so a hit test returns whatever is behind it in both the broken and the fixed build, which is how this passed a check written the obvious way |
| 34 | The create rail was too short — it read as a fifth stunted column rather than the end of the board | **A regression introduced by #31's fix.** #31 was that a tall rail *centres* its glyph 78px below the columns; the fix removed the height instead of moving the glyph | User | e2e: the rail's height equals the track's, **and** the `+` glyph's centre is on the caption row's centre line. Asserting only the second is what let the first be thrown away |
| 35 | A drop landed with the column's text visibly doubled/smeared for one beat | The panel was kept 140ms past landing on the stated ground that it was "the same pixels twice". It was not, twice over: `offsetLeft` is measured from the offsetParent's padding edge while `getBoundingClientRect()` is its border box, so a 1px border put the copies 1px apart; and the column's own contents faded 0 → 1 *underneath* an opaque copy, which rule 5 already says cannot be invisible | User, on a video frame | e2e: no frame has both the overlay's `.card` and the column's `.cards` above 0.05 opacity. Measured **7 frames → 0** |
| 32 | A newly created column was a caption with nothing under it — no body, no boundary, nowhere to drop | `colHTML` emits `<div class="cards">` unconditionally and an empty one has no height and no material, so a 0-task column renders as floating text | Orchestrator, on a screenshot after create | e2e: an empty column's `.cards` has a non-zero height and a visible border |

## Three assertions in this table that do not hold as written

Found 2026-09-10, when a Codex pass was run over two filmstrip runs that had already been judged
acceptable. None is a page defect; all three are defects in **the row's own assertion**, which is
worse, because a check that cannot pass gets quietly ignored rather than fixed.

- **Row 20 is SUPERSEDED as of 2026-09-10, by the user.** It said the slot's tint, dashes and
  height are removed with no transition, because a border fading out after the drop is motion
  arriving once the gesture is finished. Watching it, the user's call was the opposite: *"the
  dashed slot disappears too quickly when a column is dropped, it should dissolve through
  opacity."* Row 20 was right about the **cause** — motion that lands after the gesture is over —
  and wrong about the **cure**: the answer is to dissolve the ghost, not to delete it. The slot's
  material now lives on its own `::after` so the column's contents can return instantly (#35)
  while the dashes fade over 140ms. Any check still asserting "rest values within one frame" is
  asserting the superseded contract.
- **Row 10 ("no single-frame step at the end of the settle") still fails, now by less.** Before
  the dissolve: one frame of `+0.726`. After: a walk over 9 frames and 128ms whose largest single
  increment is `+0.261`. Better by 2.8×, not gone — the screencast samples the fade at ~17ms, so
  the wash climbs in visible chunks. **State the number rather than the verdict**: "the step is
  gone" was claimed once off an artifact that had not even filmed the fade (see below).
- **Row 11 ("wash after the flight is monotonic") has no tolerance, so noise fails it.** Measured
  falls of `0.004` at +124ms and +337ms — four thousandths, against a defect that was originally a
  dip of `0.59`. State a threshold or the row is unusable.
- **Row 1's outside-wash limit (0.3) cannot be applied to a page-modal interaction.** The delete's
  confirm dims the whole viewport, so once it lifts, outside wash saturates at ~72 and stays there.
  The board's own closing motion is then unmeasurable in that series: every frame differs from
  frame 0 by the scrim, not by the board. Capture the two halves separately or not at all.

**A run can end before the thing you are claiming about happens — and the totals will not say so.**
The first dissolve capture was cited as evidence the landing step was gone. It was not evidence of
anything: because of #38 the drop landed on the 200ms fallback rather than on arrival, so the
capture's last frame at +637ms fell *before* the fade, and the artifact still contained a
one-frame `+0.550` step. The conclusion happened to be true — a separate rAF measurement showed
the fade — but the artifact cited for it did not support it. **Check that the series' last frames
are flat AND that the event you are describing is inside the captured window**, before quoting a
run as proof.

**And one thing the instrument cannot do, which reading it as if it could produced a wrong number.**
Both metrics compare each frame to **frame 0**, and the screencast's sampling is irregular — so a
count of flat samples is not a duration. The gap between the confirm's scrim finishing and the
board starting to move was read off the series as "~50ms", and a re-run read it as "135ms". Neither
is right: instrumenting the actual events gives scrim opacity 0 at **163ms** and the columns
re-rendered at **192ms** — a **~29ms** gap. For a question of *when*, use the event timeline; the
filmstrip answers *what it looks like*.

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
