# Before you hand a prototype to a human — the rubric

**Date:** 2026-09-10
**Status:** Living. Add a row when the user reports something this list would not have caught.
**Companion to:** `2026-09-09-phase-5-defect-log.md` (what broke and why) and
`2026-09-09-phase-5-crud-coverage-matrix.md` (what is covered).

## Why this exists

The defect log's "Caught by" column is the finding. Of 46 entries, **32 say "User"** — the person
who was supposed to be the last check has been the first one, over and over, and several of those
were reported more than once in different clothes.

This file is the other half. The log says *why the code broke*; this says **what to run before
handing anything over**, so the human's look is spent on whether it reads right rather than on
finding a column that flies 300px past its slot.

The bar is not "I tested it". Every defect below was found on a surface someone had just finished
testing. The bar is: **each check below has been run in the state where it can actually fail.**

## The eleven checks

### 1. Drive it in a non-default state — this is the big one

A fresh page has every dangerous quantity at zero: nothing scrolled, no empty collections, no
second gesture, one theme. Bugs live where those are non-zero, and a default-state pass cannot see
them by construction.

Run each interaction at least once with the container **scrolled**, with a collection **empty**,
with **many** items, in the **other theme**, **twice in a row**, and — where a gesture has an
after-life — **again while the previous one is still finishing**.

| Skipped it | Cost |
|---|---|
| scrolled | #36 — the drag panel flew to a point exactly `scrollLeft` away and never arrived. Invisible until there were enough columns to scroll |
| empty | #30 "removes its **0 tasks**", #32 a column with no body at all |
| twice | #17 — the slot animated on the first drag only. A single-drag test passes straight through it |
| other theme | #4 — a button that read as a bright pill in dark mode |
| long throw | #26 — the column visibly in two places at once |
| second gesture *during* the first's settle | #41 — two panels and two kebabs at once; the cleanup retired the last drop's ghost but not its still-airborne clone |
| gesture *released inside* an entry animation | #43 — the slot never finished fading in, so the panel flew home over a hole. A held drag can never reach this |
| a *different* gesture during the first's animation | #44 — two uncaught TypeErrors. Capture `pageerror`, not just end state: both left the counts correct |

### 2. Enumerate every term of a coordinate conversion, and prove each one non-zero

Aiming a `fixed`/`absolute` clone at an in-flow element is a change of coordinate space, and it has
more terms than it looks. `offsetLeft` is a position in the offsetParent's **unscrolled content
box**; a client rect is a **viewport** position of its **border box**. Converting needs the
container's rect, **plus its border** (`clientLeft`), **minus its scroll** (`scrollLeft`) — and
`getBoundingClientRect` includes in-flight transforms while `offsetLeft` does not.

Write the terms out. Then construct a state where each is non-zero and check the landing is exact.
A term that is zero in your test state is a term you have not tested.

Cost of skipping: #26 (transform term), #35 (border term, 1px — the doubled-text smear), #36
(scroll term, 300px).

### 3. Anything that overhangs a sibling needs an explicit `z-index` — and a hit test will not tell you

Paint order among positioned siblings is DOM order. Any element that visually extends over a
neighbour — a hover label, a menu, a drag artifact — must say where it paints.

**`elementFromPoint` does not answer this question.** A `pointer-events: none` element is skipped
entirely, so the hit test returns the same answer in the broken and the fixed build. Use
`elementsFromPoint` (plural) and check position 0, or sample a pixel.

Cost: #5 (menu behind rows), #25 (slot over its neighbour on 12 of 57 frames), #33 (the rail's
label invisible under a card — and a check written the obvious way passed).

### 4. A clone→original handoff is a same-frame swap of identical pixels

Whenever a drag clone, an overlay or a view-transition snapshot stands in for a real element, the
moment they trade places is the defect site. Two failure shapes, and fixing one naively creates the
other:

- **Both visible** → doubling. Two copies 1px apart read as smeared text (#35); two kebabs 10px
  apart read as two kebabs (#24).
- **Neither visible** → a hole, then a pop (#27, ~90ms of nothing).

The fix is never a cross-fade. Make the pair *interchangeable* — same position, same opacity, same
material — then swap on one frame and delete the clone. Assert: no frame has both above 0.05
opacity, and no frame has neither.

### 5. Do not invent material

If the mock has no state for what you are building, that is a decision to surface, not a gap to
fill with a new box. When the defect is "there is nothing here", the ladder is **type → spacing →
outline → fill**, and you stop at the first rung that answers it.

Cost: #9 (a drag overlay contradicting the phase's hairline-first rule), #37 (a grey slab added to
empty columns that nobody asked for — fixing #32 by inventing a surface).

Corollary: check the mock *before* choosing, and say explicitly when it has no answer. The mock has
no empty-column state at all; that is worth one sentence, not a guess presented as a lookup.

### 6. Exercise zero, one, and many on every count-driven string and layout

Pluralisation, empty bodies and singular/plural copy are the cheapest bugs to find and the most
embarrassing to ship.

Cost: #30 ("removes its 0 tasks"), #32 (empty column with no body).

### 7. Check the fix against the complaint, not against the assertion

The most expensive failure mode here, because it *looks* like success and it re-costs the human a
second report of the same surface.

Before calling a fix done, re-read the sentence the user actually wrote and ask whether the new
behaviour satisfies **that**. An assertion is a proxy; a proxy can be satisfied by removing the
thing it was measuring.

Cost: #34 — #31 was *"a tall rail centres its glyph 78px below the columns"*. The fix made the rail
short. The assertion passed; the large target for a rare action was gone, and the user had to
report the same rail twice.

### 8. A `{ once: true }` listener with a guard inside it fires once on the WRONG event

`addEventListener("transitionend", e => { if (e.propertyName === "x") …}, { once: true })` removes
itself on the **first** event, whether or not the guard passed. Any element transitioning more than
one property therefore has an arbitrary chance of consuming the listener on a property you did not
care about — and if there is a fallback timer, the code keeps working while the mechanism it was
built for silently never runs.

That is the trap: it degrades to the thing you were trying to replace, and a timing assertion
passes straight through it because the fallback lands in about the right time.

Better still, **do not listen — ask.** `getAnimations()` after a forced flush answers both halves of
the question a listener only infers: is there an animation at all, and when does it finish. A
listener cannot tell "late" from "never", and a fallback timer set near the duration makes the two
look identical. Measured (#42): four of eight real drops fell back at 200.4ms, and in those the
overlay fired **no** `transitionend` — the transition had never started.

Check it by **asserting which event caused the effect** over **several runs**, not that the effect
happened by some deadline in one. Cost: #38 — `.overlay.settling` transitions five properties at the same duration,
`background-color` won at 175ms, and landing fell back to the 200ms timer, silently undoing #26's
whole reason for existing.

### 9. Two fades in one gesture share a clock, or they read as two gestures

When a gesture retires more than one thing — a clone and the placeholder it stood in for, a scrim
and the layout behind it — each fade can be individually correct and the pair still read as
sequential. Sequencing is a *choice*, and the default should be simultaneous: same start frame,
same duration, same easing.

Check it by sampling both on **one rAF clock** and comparing values frame by frame, not by checking
each in isolation. Equal at every sample is the pass.

Cost: #40 — the panel shed its chrome across the 180ms flight, then the slot's fade started at
landing; the user saw the container dissolve and then the dashes follow.

### 10. A capture that ends before the thing you are describing proves nothing

Check the last frames of a series are flat **and** that the event you are claiming about is inside
the captured window. A run whose totals look settled may simply have stopped early.

Cost: #38's discovery — a dissolve capture was quoted as evidence the landing step was gone, when
it had ended before the fade even started, and still contained a one-frame `+0.550` step.

### 11. A control you hid is still a control — press Tab ten times

Hiding an affordance until hover is normal. The three ways to do it are not
interchangeable, and the two obvious ones are each half wrong:

| | hit area gone | still tabbable |
|---|---|---|
| `visibility: hidden` | yes | **no** — it leaves the tab order |
| `opacity: 0` | **no** — an invisible button still eats the click | yes |
| `opacity: 0` + `pointer-events: none` | yes | yes |

Only the third is both. And a handler on a `<div>` is not reachable at all, however
it is styled.

Check it by pressing **Tab ten times and recording `document.activeElement` each
time**, then operating the control from the keyboard alone — a hidden control that
focus can never reach is a picture of a control. Cost: #45, where the only way to
delete a subtask was with a mouse.

## And two rules about your own claims

Not page defects — reporting defects. Both cost a correction to the user.

- **Durations come from the event timeline, appearance comes from the filmstrip.** The filmstrip's
  series compares every frame to frame 0 and samples irregularly, so a count of flat frames is not
  a duration. One gap was read off the sheet as ~50ms, off a re-run as 135ms, and instrumenting the
  actual events gave **29ms**.
- **"Smooth", "monotonic", "no dip" and "nothing moved outside" are claims with numbers behind
  them.** Quote the numbers, or do not make the claim. A wash series falling by 0.004 is not
  monotonic, and an assertion with no stated tolerance cannot be run.

When any of those four words is about to appear in a report, the artifacts go to a Codex sanity
pass first — see the project `CLAUDE.md` under _Motion is the case an assertion cannot settle_.
