# Phase 5 — Visual and Motion Modernization

**Date:** 2026-09-01 (second session same day: the three remaining surfaces, rule 5, sequencing)
**Status:** Design agreed and complete; not yet planned
**Supersedes for the surfaces it touches:** the mock's material, typography and control geometry
(see "The source-of-truth problem")

## Problem

The app looks dated. It is a faithful port of a 2021-era Frontend Mentor mock, and the port is the
problem: two corner radii, a three-step shadow scale whose smallest step is invisible on
`#F4F7FD` and entirely invisible on `#2B2C37`, flat surfaces, and — measured across all of `src`
and `app` — one `transition-colors`, `animate-spin` on loaders, one `animate-pulse`, and eight
`motion-reduce` guards. That is the whole motion layer.

This was anticipated. `SEED-001` (planted 2026-08-11) reserved an animation pass for "once core
board/task CRUD is stable"; Phase 4 is that trigger.

## Scope

**One phase covering material, motion and visual identity.** Layout and palette stay as the mock
defines them. Everything else — material, motion, typography, control geometry — is governed by
this document.

The identity work (typeface, button geometry) was considered as a separate Phase 6 and
**deliberately folded in**: one baseline rewrite instead of two, and the app never sits in an
in-between state where new material meets old typography. The cost accepted is a longer phase
whose motion work cannot ship ahead of the font migration.

Out of scope: new palette, new layout language.

## Direction

**Restrained precision** — Linear, Vercel, Raycast. Hairline borders rather than shadows, tight
density, purple spent sparingly as a true accent, motion that is fast and functional.

This resolves an apparent tension in the original ask ("more animations, cool effects, creative
visual approaches"). In a precision language the effects budget does not disappear, it
*concentrates*. There is no ambient glow, gradient mesh or animated border. There are a small
number of moments executed at a level of craft the mock never attempted, and restraint everywhere
else is what makes them land.

## The five rules

Derived during design review; each is falsifiable and each outlives any specific animation.

### 1. Hover and focus change colour only

Never position, never size, never shadow.

Found by review: a `transform: translateY(-1px)` on card hover. Measured, neighbours never moved
(`box-sizing: border-box`, constant border, height constant at 73.5px) — but the hovered card
shifting 1px grew the gap above it and shrank the one below, and the eye reads that as the card
swelling and shoving its neighbours. A perceptual bug is worse than a layout bug because you
cannot point at it.

**Carve-out: focus rings.** A focus indicator is an accessibility affordance, not elevation. It is
drawn with `outline` and `outline-offset` (never `box-shadow`), which paints outside the border
box and cannot shift layout. This matches what the primitives already do
(`focus-visible:ring-2 ring-ring-focus ring-offset-2`). The exception is written down rather than
left as a rule the codebase visibly violates.

**Carve-out: a button's own press, added 2026-09-09.** `:active` on a button may move it, and it
does — 2px down onto a solid bottom edge. Hover stays colour-only; this licenses the *press*
alone. The rule's evidence was a hover lift on a card in a stack, where the shifting gap read as
the card swelling and shoving its neighbours; a button has no such stack, and a press is movement
that genuinely happened, which is rule 2's own test. The carve-out is deliberately narrow: it is a
button, it is `:active`, and it is 2px. See "Buttons — decided 2026-09-09".

### 2. Geometry is reserved for movement that actually happened

Drag, reorder, insert, delete. Nothing else moves. This is what gives rule 1 its payoff: if
nothing else ever moves, movement *means* something.

**One licensed exception: rollback.** Something genuinely *un*moved, and animating the reversal is
the only way a user learns their action was undone rather than that the board was always like
this.

**No exception for "decorative" surfaces.** A landing-page parallax was prototyped on the split
canvas (2026-09-01) on the argument that the marketing surface is exempt because nothing is being
operated there. It was rejected on review, and the reasoning generalises:

- **No causal grounding.** Parallax reads as depth only where a spatial frame already exists —
  scrolling through a scene, tilting a device. A cursor crossing a flat panel gives the board no
  reason to move; the effect is arbitrary, which is rule 2's actual complaint, not a dosage problem.
- **Not tunable.** Text translated at fractional pixels re-rasterises and reads soft, and the
  interpolation that stops it feeling jittery is what makes it lag the cursor. There is no setting
  that is both crisp and immediate.
- The panel already carries motion that *is* caused by something — the drag choreography loop,
  which shows the product performing a real action.

So the exception was withdrawn: rule 2 holds on every surface, including the ones whose job is to
impress.

### 3. State borders are derived per theme from `--border`, never borrowed from fill tokens

`color.purple.500` and `color.red.500` are *fill* colours, darkened to carry white text at 4.5:1.
Borrowing them for a 1px hairline imports a contrast obligation that does not apply.

Contrast against each theme's own surface, resting border at 1.20 (light) / 1.33 (dark):

| | light hover | light in-flight | light rolled-back | dark hover | dark in-flight | dark rolled-back |
|---|---|---|---|---|---|---|
| Rejected (brand colours) | 1.58 | 1.94 | **4.93** | 2.16 | **7.15** | 2.81 |
| **Adopted** | 1.34 | 1.44 | 1.81 | 1.69 | 1.68 | 1.63 |

The rejected row is incoherent as well as loud: the same `#C93F3C` reads 4.93 in light and 2.81 in
dark, so one state looked like two different severities depending on theme.

| State | Light | Dark |
|-------|-------|------|
| rest (`--border`, unchanged) | `#E4EBFA` | `#3E3F4E` |
| hover | `#D6DFEF` | `#4C4E60` |
| in flight | `#D1D6F2` | `#4B4A78` |
| rolled back | `#DCB7C1` | `#6F3F48` |

Hover is one step from `--border`; in-flight is `--border` blended ~15% toward `purple.500`;
rolled-back ~30% toward `red.500`. Same step for all three.

### 4. Text never crossfades

It swaps in one frame, or moves behind a mask so only one string is ever visible. A card can
crossfade because it is a rectangle at every intermediate frame; two strings cannot. Measured on
the rejected board-title crossfade: 8 sampled frames (~160ms) with both strings inked at `dy = 0`,
worst case both at 45% opacity.

Applies to the board name, column names after a rename, count pills, and the `2/3` caption.

#### The mechanical form: a masked text move animates layout, never `transform`

Rule 4 says *what* is forbidden; this says *how* the permitted version is built, and it was found the
hard way. The board-title masked slide was first prototyped with `transform: translateY()`. Review
reported the text "moves 1 pixel to the right before becoming stable". Measured: horizontal position
was **exactly 0.000 at every frame** — nothing moved. The artefact is rasterisation. While a
`transform` is applied the span is composited on its own layer and antialiased in **grayscale**; when
the transform ends the element drops back to **subpixel (RGB)** antialiasing. The glyph edges gain and
lose colour fringing, and the eye reads that as a sideways nudge that settles.

Verified fix — animate the element's layout position (`top`) inside the mask that already exists:

| | distinct x | transform values seen | layer promoted |
|---|---|---|---|
| `transform: translateY()` | `[0]` | 26, incl. `matrix(…)`, ending `none` | **yes** |
| animate `top` | `[0]` | **`["none"]` — one value, every frame** | **no** |

Both travel identically smoothly (25 vs 24 distinct y positions). Only the second keeps the text
rasterised the same way mid-flight and at rest, so there is nothing left to settle.

**This is the same finding that rejected the landing-page parallax** — *"text translated at fractional
pixels re-rasterises and reads soft"* — arrived at independently from the opposite direction. The two
should be read as one rule, not two coincidences.

It generalises past the title. It is why the Dropdown/Menu enter transition is **opacity-only with no
scale**: a menu is entirely text at 15px, and a `scale()` enter resamples every glyph at fractional
factors (`.96 → .968 → .982 → .989 → .994 → .996 → .998 → .9992 → .9998 → matrix(1) → none`, measured
against the real Base UI popup) before dropping the layer. The 24px title was the mild case.

**So: anything whose content is text animates opacity or layout, never `transform`.** Applies to the
board title, column names after a rename, the count pills, the `2/3` caption, and both popup
primitives.

### 5. Animation never gates interaction

Where no real work is happening, the user can act at any point during the motion. Motion may
*describe* a state change; it may never *delay* one. Where there genuinely is a wait — an RSC fetch, a
mutation in flight — the animation may cover that wait, but may not add latency of its own.

Added 2026-09-01 on review, from the concrete case: a user opening the board kebab menu wants
`Rename` or `Delete`, there is no loading involved, and making them wait for a fade to finish buys
nothing.

**The test is a measurement, not a judgement:** at every frame of the animation, is the control the
user is reaching for hit-testable? Not *visible* — **hit-testable**. `document.elementFromPoint` at
the control's centre, every frame, counting dead frames.

Audited against every moment already decided:

| Moment | Real work behind it? | Verdict |
|--------|---------------------|---------|
| Menu / dropdown open | no | **passes** — item hit-testable at 28ms at opacity 0, `pointer-events: auto` every frame, 0 dead frames |
| Sidebar collapse → expand control | no | **failed as first designed** — 245ms dead, 11 of 29 frames. Fixed; see Sidebar |
| Card → task detail morph | no | **fails** — inherent to the API; see below |
| Board → board directional load | **yes** — RSC fetch | exempt, the animation covers a real wait |
| Skeleton → content handoff (0/70/110) | **yes** — RSC fetch | exempt |
| Optimistic in-flight tint | **yes** — PATCH in flight | exempt, and colour-only regardless |
| Board title masked slide | varies | passes — a title is not a control |
| Drag lift / drop settle, rollback travel | no | **unbuilt** — rule 5 becomes an acceptance criterion, see below |

Two consequences worth stating rather than leaving to be rediscovered:

- **A control may be live while still invisible.** The corrected sidebar trigger is hit-testable at
  opacity 0 from frame 1. That is not a compromise, it is the rule: Base UI's own menu already behaves
  this way, and it is what lets a fast user click straight through an enter animation.
- **`@dnd-kit/core` 6.3.1 sets no `pointer-events` anywhere.** So the `DragOverlay` is a live
  hit-target throughout its drop animation. The drop settle and the rollback travel are not built yet,
  so this is a build-time acceptance criterion on them, not a defect found today: **the card must be
  grabbable again from the first frame of its settle.**

## Material

- **Hairline border replaces shadow as the primary edge.** Works identically in both themes, which
  the current single diffuse shadow does not. Shadow demoted to `0 1px 2px rgba(16,18,32,.04)`,
  dropped entirely in dark mode.
- **Density.** Card padding 14px (from 23px vertical), 10px gutter (from 20px) — ~40% more cards
  visible per column.
- **Hover.** Border `#E4EBFA → #D6DFEF`, surface `#FFFFFF → #FAFBFE`, plus a 2px purple grab-rail
  on the card's left edge. 130ms, no geometry.
- **Subtask progress** becomes a 3px bar plus tabular-numeral `2/3`, replacing the prose caption.
  The call site's existing zero-subtask suppression stays.

### Control geometry

| Element | Radius | Note |
|---------|--------|------|
| Buttons | **4px** | Replaces `rounded-full`. One line in `button-variants.ts`, app-wide. |
| Inputs, dropdowns | 6px | |
| Toast | 6px | Follows inputs, preserving the relationship `toast-variants.ts` documents. |
| Cards | 8px | Unchanged |
| Columns, modals | 12px | **Proposed, never reviewed** — see open items |

Buttons at 4px sit inside inputs at 6px. That is the recorded choice, not an oversight, but it is
the one place the scale disagrees with itself; worth a look during planning.

### Focus treatment

**A single 2px border that exists at rest; only its colour changes on focus.** No ring, no halo,
so there is nothing to double.

The rejected alternative was a purple 1px border plus a 2px outline at `outline-offset: 1px` —
which renders as three concentric edges in one colour and reads as a doubled border. Resting
border is `#DCE3F2` (slightly lighter than the card's `#E4EBFA`) to offset the extra weight of
2px.

## Typography

**Inter**, replacing Plus Jakarta Sans. Chosen for small-size legibility — most of this app's text
is 11–13px — and for real tabular figures, which carry the column counts and `2/3` captions.

Migration cost, all of it required:

- New self-hosted woff2 files under `public/fonts/inter/`. Self-hosting is not optional: Storybook's
  Vite builder resolves `next/font` without erroring but emits no `@font-face`, which once shipped
  the wrong typeface to a screenshot review. The reasoning is recorded in `src/styles/fonts.css`
  and must be carried across, not dropped.
- Rewritten `src/styles/fonts.css`.
- `fontFamily` in all eight `tokens/typography.tokens.json` entries.
- Every visual baseline in the app re-recorded.

## Drag choreography

Already good and **not** being replaced: `useSortable`'s default transition is passed through so
neighbours animate; the insertion bar is drawn in the gutter so it does not wait on reflow; motion
is dropped entirely under `prefers-reduced-motion`; the keyboard path is carefully built and its
two `comment-length-exempt` dnd-kit notes must survive untouched.

1. **`DragOverlay`.** The card leaves the list and is carried above it. Today it stays in place at
   `opacity-50`, so the user smears a translucent copy rather than holding a card.
2. **Lift: `scale(1.03)` plus a real shadow. No rotation.** A tilt was prototyped and rejected as
   soft-depth vocabulary.
3. **Source slot collapses** to a dashed ghost over ~180ms.
4. **Drop settles** — scale and shadow release over ~160ms on `cubic-bezier(.2,0,0,1)` rather than
   the transform snapping. The single largest perceived-quality change in the phase.

## Optimistic state

`useMoveTask` already reads pending moves back from in-flight mutation variables (TanStack "via the
UI", adopted 2026-09-01), so the state is available to render — it simply is not.
`isMoving`/`isReordering` are threaded down into `TaskCard`/`SortableColumn` and their entire
visual effect is `aria-busy` plus disabling the handle. Both invisible.

| Moment | Treatment |
|--------|-----------|
| In flight | Border tint to the in-flight value. Colour only. |
| Settled | Tint releases over ~200ms; single confirmation ring pulse. |
| Rolled back | Card **travels back** along the reverse path (~220ms), border flashes rolled-back and decays over ~500ms. Toast unchanged. |

**Decided, flag on review:** the 2px indeterminate "wire" is **dropped** — most of these PATCHes
resolve under 200ms, so it would flash and vanish, which reads worse than nothing.

## Transitions

### Verified constraint

```
react 19.2.8   'ViewTransition' in React            = false
               'unstable_ViewTransition' in React    = false
next 16.3.0    no `viewTransition` key in the config schema
               (present only inside bundled react-dom-experimental)
```

React's `<ViewTransition>` route morph needs the React experimental channel plus a Next canary —
a foundation change disguised as polish. **Rejected**; needs its own ADR so it is not re-opened.

### Card → task detail: native morph

Task detail is local state, not a route, so this is a same-document `document.startViewTransition()`
needing no framework support.

Verified against the real API with a 12-task scrollable column — **the column does not reflow**,
because the card's box is never mutated; the browser animates a snapshot of the card's rect toward
a snapshot of the modal's in the overlay layer above the page.

```
open  (card #3)                scrollHeight 918→918  scrollTop 0→0     card#9 y 896→896  identical
close (after scrolling to 588) scrollHeight 918→918  scrollTop 588→588 card#9 y 308→308  identical
```

Two required guards:

- **Name uniqueness.** `view-transition-name` goes on the *clicked* card only. Naming every card
  breaks the transition and costs real snapshot time.
- **Closing after a scroll.** Check the card's rect against the list viewport at close time and
  skip the morph if it is not visible, falling back to the plain fade. Verified working.

**180ms**, `cubic-bezier(.2,0,0,1)`, feature-detected — where unsupported the modal opens as today.

#### Rule 5 carve-out — the one exception in the phase, and why

`startViewTransition()` blocks pointer input for its whole duration. Measured in the running app
against a fixed `z-index: 99999` button:

```
elementFromPoint     returns HTML on 12 of 12 sampled frames — the live DOM is not
                     hit-testable for the entire transition
keydown listeners    12 of 12 delivered, first at 2ms — keyboard is not hit-tested,
                     so Escape, Tab and typing keep working throughout
```

The block is **pointer-only and inherent to the API**, not to our timing: shortening the duration
shortens the dead window but cannot remove it. Three options were weighed — keep 320ms, shorten, or
drop the morph for a front-loaded fade. **Shortened from 320ms to 180ms** (decided 2026-09-01): the
morph is the phase's most distinctive transition and worth one carve-out, but 320ms was chosen before
rule 5 existed and nearly halving the dead window costs the effect nothing.

This is the only place in the phase where rule 5 is knowingly broken. It is recorded here, dated, with
the API named as the cause, so that it reads as a decision rather than an oversight — and so that a
future reader who finds a way to morph without the input block knows exactly what to reclaim.

### Board → board: directional + streaming

The board is an RSC fetch behind Suspense, so there is a real wait we do not control. Animating
*over* it means the animation and the wait fight: on a fast connection the flourish is gratuitous,
on a slow one it finishes and leaves the user staring at nothing.

So the transition **is** the load: a Suspense boundary per column, skeletons holding the column
shape, and content replacing it when the data lands, entering *from* the navigated direction (down
the sidebar → from below; up → from above). Plain CSS keyed on `boardId`. No experimental
dependency.

**No artificial stagger** (see Timing below). The per-column Suspense boundaries stay, so if columns
genuinely resolve at different moments the user sees that ordering — but it is real data arrival,
not a CSS delay imitating it.

**Board title: masked slide.** The title well clips; old string leaves and new arrives from the
navigated direction, so the two are never in the same place (rule 4). Chosen over an instant swap
to keep the header part of the same gesture as the columns.

## Landing and auth

These are the only surfaces with **no mock behind them** — the Frontend Mentor design has no auth
screens, so the Phase 1 UI-SPEC specified them from tokens alone ("the auth card is the sole focal
point — everything else deliberately quiet"). With nothing to be quiet around, that produced a
369×160 card occupying **4.5% of a 1440×900 viewport**, zero `svg`/`img` brand marks, and two CTAs
that are bare text links (`background: rgba(0,0,0,0)`, `border-width: 0px`).

No ADR is needed to depart here. There is no source of truth to depart *from*; this fills a gap.

**Composition: split canvas.** Form in a left column (~44%) with a brand lockup; right panel shows
a real board in the app's own material, cropped behind a fade at the right edge, playing this
phase's drag choreography on a loop. The interaction the app is best at is the first thing a
visitor sees.

Deliberately not adopted: the blurred-product-backdrop treatment, which is the atmospheric
vocabulary ruled out by the chosen direction.

### The landing page

**Kept, not deleted**, and rebuilt on the same split canvas — the form column is replaced by a
pitch column: brand lockup, headline, sub-copy, and **one primary `Get started` with sign-in
demoted to a link**. Chosen over two equal buttons: calmer, and it matches how the auth screens
already cross-link to each other. The trade-off accepted is that returning users — the majority on
a tool like this — reach sign-in through a link rather than a button.

**Below the `md` breakpoint the board panel is dropped, not stacked.** A cropped board at 375px
wide reads as a rendering bug. Mobile gets the lockup, headline, sub-copy and CTAs.

Landing copy is **not yet decided**. The Phase 1 UI-SPEC's Copywriting Contract covers auth form
strings and is silent on landing copy, so this is a gap rather than a departure; the prototype's
headline is a placeholder that happens to read well, not an agreed string.

### The form

The contract offers only email and password — no OAuth, no magic link. The form cannot be made
less plain by adding content; only by craft on what exists.

| Change | Detail |
|--------|--------|
| Focus | The 2px single-edge treatment above. Today's border-colour-only focus is nearly invisible. |
| Reserved message line | `min-height:17px`, opacity-toggled. Measured: today's error shifts the password field **22px**; reserved shifts **0px**. |
| Caps-lock hint | Shares that same reserved line — a field shows an error or a caps hint, never both. Measured: today **23px** shift, reserved **0px**. |
| Password rules | **Chips on one row** — `8+ chars` / `letter` / `number`, ticking green as satisfied, occupying the one reserved row. |
| Icons and placeholders | Leading icon per field; real `autocomplete` values. |
| Server errors | Bordered block at the top of the form, not a bare red sentence between field and button. |
| Button states | Idle → loading (spinner, changed label) → briefly confirmed. |

A vertical requirements checklist was prototyped and **rejected**: measured at **+42px** of form
region for three short strings, against 0px for the chips row.

A password **strength meter** was proposed and **withdrawn**. The contract is explicit —
`SignupRequestDTO.password = { "type": "string" }`, no `minLength`, no `pattern`. The backend
declares no policy at all, so "Strong" is a verdict nobody authorised, and a backend rejection
after that verdict would make the app a liar. The chips state rules *this app* enforces, which is
honest. **Needs an ADR** recording that the policy is frontend-invented and the backend may accept
weaker passwords.

## Toast

Today: `rounded-sm` (4px) with `border-l-4` (4px). The radius equals the stripe width, so the
accent curves through its whole top and bottom — a tapered wedge, not a bar. And
`border-l-transparent` on the default variant still reserves its 4px, so **every** toast, danger or
not, has 20px left / 16px right content inset.

**Adopted: inset pill stripe.** A 3px pill at `left: 6px`, 12px clear of top and bottom, living
*inside* the existing 16px padding rather than adding a gutter. Uniform 6px radius.

```
today         content inset  L 20  R 16   off by 4px
adopted       content inset  L 16  R 16   symmetric
stripe        left 6px · width 3px · radius 2px · 7px gap to text
```

The accent costs no layout, nothing touches a corner, and the asymmetry is gone. Squaring the left
corners was also prototyped; it fixes the bending stripe but leaves the 20/16 asymmetry, so it
addresses only half the problem.

## Entry, empty and loading states

Prototyped 2026-09-01; awaiting sign-off.

Today's board skeleton is **already layout-matched** (three columns, header bar, card blocks), so
the gap is narrower than "skeletons don't match the layout". What changes:

- **Skeleton blocks take the real card material** — 1px border, 8px radius, surface fill, with
  interior lines where the title and progress bar will be — so they read as a card arriving rather
  than a grey slab. Block count per column matches what is actually coming.
- **One shimmer sweep per column replaces nine independently pulsing blocks.** Today every
  `SkeletonRow` runs its own `animate-pulse`, so the whole screen throbs in unison.
- **Skeleton hands off to content per column**, with no artificial stagger — see Timing below.
- **An empty column gets a dashed drop zone.** Today it is a header floating above nothing, which
  reads as broken rather than empty — and it conceals that the column body *is* a drop target (the
  code gives it a minimum height precisely so it stays reachable).
- **The empty board list gets a ghosted preview** of what a board is, a heading in `text-primary`
  rather than muted grey, and one line explaining the board→column→task model. Same button.

Shimmer and the handoff drop under `prefers-reduced-motion` (subject to open item 3); the drop
zone and ghost preview are static and unaffected.

### Timing

| Value | Setting |
|-------|---------|
| Stagger between columns | **0ms** |
| Skeleton fade-out | **70ms** |
| Content fade-in | **110ms** |
| Whole board settled | **180ms** |

Content's `animation-delay` is `column-index × stagger + skeleton-out`, so **overlap is impossible
by construction** — a column's content cannot begin before its own skeleton has finished. Verified
across four candidate timings: worst simultaneous visibility 0.000 in every case, against 1.00 for
the whole-layer crossfade this replaces, where a real card was painted at full opacity over a
placeholder at full opacity.

The rejected candidate took **880ms** for a board to settle. There is no rising `translateY` on
entry either: content offset from the skeleton it replaced was the other half of the ghosting,
since the two never lined up.

An artificial stagger was prototyped at 180ms, 60ms and 35ms and **rejected**. Its justification was
honesty about a real per-column wait; if the columns resolve in one RSC flush, a CSS cascade is
decoration imitating latency — the same argument that withdrew the password strength meter.

These numbers apply to the board→board transition too, since it is the same mechanism.

## The three remaining surfaces

Designed 2026-09-01, second session. Everything below was measured against the running app rather
than reasoned about; the numbers are reproducible from the prototypes in `.superpowers/brainstorm/`.

### Sidebar (`src/components/layout/sidebar/sidebar.tsx`, `board-list.tsx`)

On screen 100% of the time, and the largest geometric change in the app.

**The defect is bigger than "the sidebar teleports" — the board teleports.** On collapse the panel
unmounts and, in a single frame, the board title and every column jump 300px left while the expand
control materialises from nothing at the bottom-left corner:

```
              nav             header       title x    first column x
expanded      0,0 300×720     300 · 980    324        324
collapsed     (unmounted)       0 · 1280    24         24        ← one frame
```

**Adopted: the panel closes like a door.** Width `300px → 0` over 220ms on `cubic-bezier(.2,0,0,1)`.
The content region is already `flex-1`, so it flows into the space for free.

Two things this buys that a hand-rolled version would not:

- **The title glides and the right-hand header cluster holds perfectly still**, because it is anchored
  right. Measured across the whole collapse: `+ Add New Task` sits at `x = 934.5` at **every** sample,
  range `[934.5, 934.5]`. That falls out of the existing flex layout; it is not staged.
- **No FLIP machinery.** Animating the honest layout is free. Measured at 6 columns / 72 cards, both
  directions: `300→283→217→150→83→17→1`, median **16.7ms**, max **17.1ms**, **0 frames over 20ms**.
  The usual reason to reach for a transform fake does not apply, which keeps this inside CLAUDE.md's
  "reach for the platform's own primitive" rule.

**The panel needs a fixed-width inner inside `overflow: hidden`.** Measured: naively animating the
width reflows the panel's own contents — the `ALL BOARDS (3)` caption grows **66px → 102px**, wrapping
to two lines, once the panel narrows past ~133px. With a fixed inner the contents slide out of the clip
intact. This is also what satisfies rule 4: the strings move behind a mask rather than changing shape.

**Collapsed state: full hide, as the mock specifies** (decided on review; a 72px icon rail was
prototyped and rejected as new layout language, which this phase puts out of scope). The collapsed
trigger keeps its fifth entry on the UI-SPEC accent-reservation list untouched.

**Rule 5 correction to this design.** The expand control was first specified to arrive *after* the
panel had gone, so that two things never moved at once — a rule-1 instinct applied where rule 5
governs. That left no way to re-expand with the mouse for 220ms:

| | first hittable | dead frames |
|---|---|---|
| as first designed (translated off-screen, `pointer-events: none`, 220ms delay) | 245ms | 11 of 29 |
| **adopted** (in final position, live from frame 0, only opacity animates) | **1ms** | **0 of 33** |

The adopted control is briefly clickable while still invisible. That is the rule, not a compromise.

Also in scope here: `Hide Sidebar` is `rounded-full` and becomes 4px under the app-wide button
decision; active-board indication on `BoardCard` picks up the standard colour transition; the board
list is the panel's only scroll region and still has no overflow affordance.

### Dashboard header (`src/components/layout/dashboard-header/dashboard-header.tsx`)

Mostly one real defect, plus one thing deliberately not built.

**`+ Add New Task` snaps.** It is disabled until the open board has a column, so creating that first
column is a user action that should land. Measured: a hard `1 → 0.5` opacity jump, **zero intermediate
frames in either direction**, because Tailwind's `transition-colors` does not list `opacity`:

```
transition-property = color, background-color, border-color, outline-color,
                      text-decoration-color, fill, stroke, --tw-gradient-*
```

**Adopted: disabled becomes its own token trio** — surface `--bg-app`, text `--text-muted`, border
`--border` — instead of "the brand colour, faded". That is a *colour* change, so it rides the
transition that already exists at 130ms: no new property, no opacity, no geometry, rules 1 and 3 both
hold. Verified: background walks `#635FC7 → #8886D5 → #C0C0EA → #F4F7FD` across 9 distinct values with
opacity never leaving 1. It also reads better — a translucent fill washes the label out along with the
button, which is why the current disabled state is hard to read at all. `Sign Out` picks up the same
idle → loading contract already settled for the auth form.

**The title well already is the mask rule 4 asks for**: `overflow: hidden`, `text-overflow: ellipsis`,
`white-space: nowrap`, height 36px at line-height 36px. The masked slide needs no new wrapper, only two
stacked spans in the box that exists. Re-measured independently, confirming the earlier crossfade
rejection:

| | frames with both strings inked in the same place |
|---|---|
| masked slide — board switch | **0** |
| one-frame swap — rename | **0** |
| crossfade | **9** — rejected |

**A rename swaps in one frame; only a board *switch* slides.** A rename has no direction, so sliding it
invents one, and the sidebar row renaming underneath it does not slide either — the two would disagree
about what just happened.

**Deliberately NOT added: scroll-elevation on the header.** The obvious restrained-precision move is a
border or surface that reacts as content scrolls under the header. Measured: nothing ever scrolls under
it. The board scrolls *horizontally* in its own container and each column *vertically* in its own;
`main.scrollHeight === main.clientHeight` (647 = 647). There is no trigger, so the state could never
fire. Recorded because silence reads as coverage.

### Dropdown and Menu primitives

`dropdown.tsx` and `menu.tsx` have no enter/exit transition. Base UI 1.7.0 supplies nearly all of this.

**Adopted: opacity-only, front-loaded, 70ms in / 120ms out**, on `cubic-bezier(0,.85,.25,1)`.

The brief was "instant, but with some animation", which is a timing constraint rather than a
contradiction — resolved by *where the time goes*, not by adding an effect. Measured time from click to
legible (opacity ≥ 0.9, sampled every frame):

| enter | legible at | full at | opacity steps |
|-------|-----------|---------|---------------|
| 120ms linear | 138ms | 154ms | 9 |
| 90ms ease-out | 88ms | 121ms | 7 |
| **70ms front-loaded (adopted)** | **55ms** | 88ms | 5 |
| 0ms — instant in, animated out | 5ms | 5ms | 1 |

The 120ms linear candidate's problem was never that it was animated; it was that it was *linear*, so
the menu was still visibly faint at 100ms. A front-loaded curve spends most of its duration in the last
sliver of opacity, so it is readable in under four frames while still visibly arriving.

**No scale**, per rule 4's mechanical form above. Base UI supplies `--transform-origin` on the
positioner and the scale is the conventional choice, but it resamples every glyph for the whole
animation and then drops the layer.

**Already rule-5 clean**: the first menu item is hit-testable at **28ms at opacity 0**, with
`pointer-events: auto` on every frame and 0 dead frames. A user who knows where `Delete Board` is can
click straight through the fade.

Three things Base UI gives us, all verified against the real component rather than the docs:

- **The exit needs no bookkeeping.** No `keepMounted`, no exit-state machine. Base UI stamps
  `data-closed` + `data-ending-style` and then *waits for the CSS transition before unmounting* — a
  200ms transition kept the node alive 242ms. `menu.tsx` and `dropdown.tsx` gain **zero lines of
  state**.
- **Keyboard users are handled for free.** Base UI stamps `data-instant` when the popup was opened by
  keyboard or assistive tech, meaning "animate instantly" — the correct accessibility behaviour,
  costing nothing.
- **`Select` has no `data-instant`.** `Dropdown` wraps `Select`, which exposes
  `data-open/closed/starting-style/ending-style/side/align` but not `data-instant`. The dropdown
  therefore cannot get the keyboard suppression the menu gets. Recorded because anyone writing a shared
  helper will assume the two behave alike.

**Testing gotcha, found the hard way.** Base UI detects keyboard activation as
`nativeEvent.detail === 0` (`menu/root/MenuRoot.js`). A programmatic `el.click()` in a Storybook or
vitest test therefore classifies as a **keyboard** activation and will not animate. This inverted the
first reading of `data-instant` during design. Any test asserting a popup transition must drive a real
pointer event.

### Task detail modal — unblocked by 04-16

`onOpenTaskDetail` is an optional prop on `board-view.tsx` with no caller; the view is delivered by
plan `04-16`, which is wave 11 — the next plan after the one executing at time of writing. The
card→modal morph therefore has a target as soon as 04-16 lands, rather than at some distant point in
the phase.

## State changes with no visual consequence

The filter, which does the work that brainstorming effects does not: *enumerate every state change
the user causes that currently paints nothing.* Each qualifies under rule 2 by construction, because
the user caused it.

| Change | Status | Note |
|--------|--------|------|
| Sidebar collapse / expand | **designed** | See "The three remaining surfaces" |
| Card create | **built, instant** | Appears fully formed |
| Board switch (active indicator) | **built, instant** | |
| Column scrolled past overflow | **built, no affordance** | Nothing indicates more content below |
| Column rename commit | **built, instant** | Rule 4: one-frame swap, no direction to slide |
| Subtask check | plan `04-17` | Tick, `2/3` caption and progress bar all jump |
| Task delete | plan `04-20` | **Not optimistic — see correction below** |
| Subtask add / rename / delete | plan `04-19` | |
| Task edit save | plan `04-18` | |

**Correction: the task delete collapse cannot be an optimistic disappearance.** Plan 04-20 is explicit
and deliberate — *"the delete is NEVER optimistic… the cascade is irreversible, so there is nothing to
roll back to if an optimistic removal turns out to be wrong."* The card stays on the board until the
server confirms. So there **is** real work behind this one: under rule 5 the collapse covers a real
wait rather than adding latency, and it must not begin until the server confirms. Different animation
and a different justification from the one this table originally implied.

### Sequencing — decided 2026-09-01

**Phase 5 owns all motion. Plans 04-16 through 04-20 are not edited.** Phase 5 is planned and executed
after 04-22 closes with CI green.

The question was originally framed as "Phase 4 builds the motion correctly once, or Phase 5 retrofits
onto code Phase 4 is about to produce". Both premises turned out to be false:

- **The plans are not unwritten.** `04-16` through `04-22` all have full `PLAN.md` files — wave
  numbers, `depends_on` chains, file lists, `must_haves`, TDD task breakdowns. Only `04-15` is
  unexecuted. "Build it once" would therefore mean editing five already-checked plans mid-phase,
  while one of them executes.
- **It would not be a retrofit.** The state Phase 5's motion needs is *already being threaded*:
  04-17 — "the toggle is OPTIMISTIC with rollback… the card's caption and the detail view's caption
  derive from the SAME optimistic state"; 04-18 — "the optimistic title override reaches the CARD, not
  only the modal"; 04-19 — "a failed delete reinstates the row at its ORIGINAL index". This is exactly
  the relationship already documented for `isMoving`/`isReordering`: Phase 4 threads the state and
  paints nothing with it. Phase 5's job is to paint state Phase 4 already produces — additive CSS on
  existing props.

Three further reasons, in order of weight:

1. Editing five checked plans mid-phase invalidates the plan-checker verification they already passed,
   and couples Phase 4's completion to a Phase 5 design that is still moving — rule 5 was added after
   those plans were written and changed three decisions on the day it was adopted, including one made
   earlier in the same session.
2. **Motion built in Phase 4 would be built on the wrong material.** Phase 5 replaces the typeface, all
   button geometry, card padding and elevation. A collapse authored against Plus Jakarta Sans and
   `rounded-full` has its baselines rewritten regardless — building it in Phase 4 guarantees the double
   work the "build it once" option was meant to avoid.
3. Phase 5 rewrites every visual baseline, so it must assume Phase 4 lands first rather than racing it.
   Editing Phase 4's plans to carry Phase 5's motion is racing it under another name.

**One thing does belong to Phase 4** — a check, not new work. Confirm that 04-17..04-19 *expose* their
pending/optimistic state to the component that will paint it rather than consuming it internally. That
is already in their `must_haves`; it only needs to not regress. A review checklist item, not a plan
edit.

## Reduced motion

**Decided 2026-09-01: "reduce, don't remove".** More consequential than it looks. The current policy, documented in
`task-card.tsx`, is that motion is *"dropped entirely under reduce-motion rather than shortened."*
Phase 5's entire value is motion, so under that policy a reduced-motion user receives **none of this
phase** — no drag choreography, no settle, no rollback reversal, no card morph, no staggered load.
The optimistic-state work in particular reverts to exactly the defect it was written to fix
(`isMoving` painting nothing).

Discovered 2026-09-01 the hard way: a prototype screen that honoured the setting appeared completely
broken on the reviewer's own machine, because Windows had animations disabled. The person driving
this phase is in the population it is switched off for.

**Adopted, and confirmed by the user on 2026-09-01** — this is a decision, not the assumption it
was first recorded as. Drop large movement — drag travel, the card→modal morph,
staggers, directional slides — but keep short (≤120ms) opacity and colour changes, so the pending
tint, the settle confirmation, the skeleton→content crossfade and the rollback (as a fade rather
than a journey) all survive. That is the mainstream reading of the spec: the setting asks for less
vestibular motion, not a static app. Cost: a second set of behaviours to define and test per
animation, rather than one guard.

**Rule 5 narrows what this decision can cost.** Under reduced motion every duration shortens or drops
to zero, which can only *improve* a rule-5 hit-test — a control that is live from frame 0 with a
220ms fade is live from frame 0 with no fade. So the reduced-motion variants need no separate rule-5
audit. The one place the two rules interact is the card→modal morph, whose input block is a property
of `startViewTransition()` rather than of its duration: forcing `animation-duration: 0s` on the
view-transition pseudo-elements (the CSS below) removes the animation but the transition still runs,
so the pointer-dead window shrinks rather than disappearing.

The sections above should be read against this policy rather than the old drop-everything one.
Parallax is the one effect removed outright rather than reduced, since it carries no information.
View transitions additionally need:

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) {
    animation-duration: 0s !important;
  }
}
```

## The source-of-truth problem

The repo's notion of "correct UI" is anchored to `docs/kanban-task-management-web-app.pdf`.
`CLAUDE.md` mandates comparing every surface against it; there are Playwright baselines, per-phase
`UI-SPEC.md` contracts, and token descriptions citing PDF pages and DPI math.

Phase 5 departs from that anchor deliberately. Without re-pointing it, every gate will read these
improvements as regressions.

The ADR should record: for the surfaces Phase 5 touches, the mock is demoted to a **layout and
palette** reference. Material, motion, typography and control geometry are governed by this
document. (Typography and control geometry were mock-governed until this phase; folding identity in
is what moved them.)

Baseline impact:

- **Material, typeface and button geometry rewrite baselines wholesale**, app-wide. Must be done
  with `CI=1` locally, since `playwright.config.ts` sets `ignoreSnapshots: !process.env.CI`
  (ADR tech/0008) and an off-CI run silently compares nothing.
- **The card→modal morph needs no baseline change** — it starts at the card's exact rect and ends
  at the identical rect the modal occupies today. Only the 300ms between differs.

## Open items for planning

1. **Landing copy.** The headline and sub-copy are placeholders; the Copywriting Contract does not
   cover this surface and should be extended to it.
2. Empty-column drop zone is settled as "whisper" — a faint 56px outline with a quiet "No tasks",
   which brightens to a purple target only while a task drag is in progress. Nothing outstanding.
3. ~~Confirm the reduced-motion policy.~~ **Settled 2026-09-01: "reduce, don't remove", confirmed
   explicitly.** Every animation in the phase therefore carries two acceptance criteria — its full
   behaviour and its reduced one — rather than a single drop-everything guard. See "Reduced motion".
4. Confirm the 12px columns/modals radius, which was inferred rather than reviewed.
5. Look at buttons-at-4px inside inputs-at-6px during planning.
6. Write three ADRs: source-of-truth re-pointing; rejection of experimental React for route
   transitions; frontend-invented password policy.
7. Confirm the dropped "wire" under Optimistic state.
8. These auth screens need their own UI-SPEC — Phase 1's is what produced the current state.
9. **Rule 5 against the two unbuilt drag moments.** The drop settle (~160ms) and the rollback travel
   (~220ms) could not be measured because neither is built. `@dnd-kit/core` 6.3.1 sets no
   `pointer-events` anywhere, so the `DragOverlay` is a live hit-target throughout — the acceptance
   criterion is that **the card is grabbable again from the first frame of its settle**. Verify at
   build rather than assuming.
10. **A rule-5 hit-test is a cheap, real gate.** `document.elementFromPoint` at a control's centre
    every frame, counting dead frames, caught a defect in this session's own sidebar design that
    review had not spotted. Worth considering as a Playwright assertion on the animated surfaces
    rather than a manual check. Note the trap that made the first run of it worthless:
    `elementFromPoint` is **viewport-relative**, so an off-screen element silently reports as
    unhittable — scroll into view and assert the point is in the viewport before trusting a result.

---

# Amendment — 2026-09-09

Review session held against the prototypes themselves, eight days after the design was agreed.
Everything below is dated to this session; the sections above are unchanged except where a
correction is noted here.

## How the design becomes something that cannot drift

Agreed 2026-09-09, replacing no prior decision — the question had not been asked. The problem it
answers: the repo's existing anchor is a 115MB gitignored PDF that exceeds the read limit of every
tool that would check it, requires `pdftoppm` plus DPI arithmetic to inspect, and **carried a wrong
divisor (÷6.25 against the correct ÷8.3333, over-reading by 1.333×) for long enough that
`tokens/radius.tokens.json` had to be re-derived on 2026-08-29.** A PDF also cannot carry an
animation, which is most of this phase.

The principle: **express a decision as a value or a measurement, never as a picture or a
paragraph.** Three layers, in dependency order.

1. **Tokens are the contract.** The DTCG → Style Dictionary → Tailwind pipeline exists but has
   **no motion category** — verified 2026-09-09, `tokens/` holds breakpoint, color ×3, radius,
   shadow, spacing, typography and nothing else. A `motion.tokens.json` carrying this phase's
   durations (70 / 110 / 130 / 180 / 220ms), its two curves (`cubic-bezier(.2,0,0,1)`,
   `cubic-bezier(0,.85,.25,1)`) and rule 3's four border states makes mock and app read one
   source, so those values cannot drift rather than being caught after they have.
2. **A settled mock becomes a Storybook story.** Storybook is already the visual-regression
   harness — prebuilt `storybook-static/`, Playwright `toHaveScreenshot`, axe at error severity.
   Promoting a prototype into a story makes "does the build still match the design" the existing
   `pnpm test:visual` gate rather than new infrastructure.
3. **Motion is enforced by traces, not pictures.** Per animated moment, two artifacts: a
   **filmstrip** (fixed-offset samples composited into one contact sheet, for a human or a model to
   look at) and a **computed-value trace** (per-frame `getComputedStyle` / `elementFromPoint` →
   JSON: opacity steps, distinct transform values, dead-frame count). The JSON is the gate because
   it is deterministic and diffable; the filmstrip is the eyeball check. **This is not new
   tooling — it is the method that produced this document** ("opacity steps: 5", "legible at 55ms",
   "0 of 33 dead frames", "transform values seen: `['none']`"), promoted from ad-hoc measurement
   into standing fixtures. `e2e/quality-fixtures.ts` is the home; `flickerTracker` and
   `layoutShiftTracker` are already this shape.

Rejected: **video as a design artifact.** It cannot be diffed, cannot be asserted on, and cannot be
read by a model at all — the open `board-create-optimistic` debug session already needed ffmpeg
frame extraction to make a screen recording usable. Frames and numbers are the only two forms that
survive the trip.

## The prototypes are now tracked

`.gitignore` previously carried a blanket `.superpowers/`, so the entire visual record behind this
phase — 44 files — existed in one copy, on no branch, in no diff, backed up by nothing. Changed
2026-09-09 to track the prototypes while still excluding `**/state/`, `**/.last-port` and
`**/.last-token`, which hold pids, ports and a 64-hex local server token that gitleaks would
rightly refuse.

`.superpowers/brainstorm/index.html` was added the same day: a rail-plus-frame index over both
sessions in the order of this document, with version chains collapsed per row and the adopted
revision marked — and the gaps below rendered as entries **in position**, so the absences are
visible while skimming rather than only discoverable by reading this file.

## Gaps found on review

Numbered `G1`–`G8` and carried in the index. None of these were known on 2026-09-01; each is
either a decision recorded in prose with no prototype behind it, or a surface neither the document
nor the mocks ever covered.

| | Gap | Status |
|---|---|---|
| **G1** | Reduced-motion variants, every animation | **open — largest** |
| **G2** | Modal enter / exit | **closed 2026-09-10** — `modal-motion-v1.html`; one requirement (the centring wrapper) is **open**, row 58 |
| **G3** | Toast enter / exit motion | open |
| **G4** | Overflow affordance, columns and board list | open |
| **G5** | Subtask check · task edit · subtask CRUD | **narrowed 2026-09-09** — rename and delete only |
| **G6** | Task delete collapse **and restore** | **prototyped 2026-09-10** — `task-delete-v1.html`. Its original framing (*"non-optimistic"*) was wrong; see defect log #78 |
| **G7** | Theme switch, light ↔ dark | open |
| **G8** | Inter's justifications, tested where they apply | **closed** — `type-board.html` |
| **G9** | Every column mutation — create, rename, delete, reorder | **closed 2026-09-10** — `column-crud-v17.html` |

**Coverage is tracked per entity and operation in
`2026-09-09-phase-5-crud-coverage-matrix.md`**, which is what produced G9 and narrowed G5. Read it
before claiming a surface is covered: this list is organised by surface, and a gap falling between
two surfaces is invisible in it.

- **G1** is the one that voids the phase for part of its audience. The policy is "reduce, don't
  remove" and this document states every animation therefore carries two acceptance criteria — yet
  measured 2026-09-09, only **15 of 44** prototypes carry a `prefers-reduced-motion` guard at all,
  and the reduced variant is designed nowhere. What a reduced-motion user sees today is undefined
  and inconsistent across the set, not a designed variant.
- **G2 closed 2026-09-10** — `modal-motion-v1.html`, signed off by the user. It is the first
  prototype in this phase built on the component's **real** lifecycle rather than a class toggle,
  and that was necessary rather than fastidious: `board-edit-v2` and `column-crud-v17` both toggle
  `.open` on a permanently-mounted div, while Base UI portals its popup and **unmounts** it, so a
  rule that reverses on class removal never runs at all. Measured on the shipped component:
  `data-starting-style` is dropped one frame after mount (13ms), and on close the element is held
  **18ms with no CSS versus 172ms once a transition exists** — Base UI waits, so the exit is a real
  design surface and not a reversal.

  Three things it settles, and all three are requirements on the implementation, not preferences:

  1. **`translate` is already occupied** — settled. `modal.tsx` centres with `-translate-1/2`, so
     the prototypes' `translate: 0 8px` replaces the centring instead of offsetting it: measured,
     the popup flew **228px** diagonally. Both prototypes are immune only because they centre with
     grid `place-items: center` (row 55).

     **How to free it is NOT settled, and this is the one part of G2 that is still open.** The
     recommended grid-centring wrapper breaks Base UI's focus trap: its focus guards are siblings
     of the popup inside the portal, so a wrapper between them puts the guards outside and the
     popup inside. Confirmed on the real component — Tab from Close escaped the dialog (row 58).
     The fallback that needs no structural change is `translate: -50% calc(-50% + 8px)`, which
     works and costs the coupling row 55 objects to. **Resolve this before implementing**, and
     resolve it in real JSX with a Tab-containment assertion, not by injecting DOM.
  2. **The popup is a three-part column, not one scroll region.** Today everything is inside a
     single `overflow-y-auto` div, so a long form scrolls away its title *and* its submit button —
     confirmed on the `LongContent` story. The close control was deliberately made a sibling of the
     scroller so it survives; that is the right rule applied to one control out of three.
     `min-height: 0` on the scroller is load-bearing (row 56).
  3. **The reduced variant is designed, not deleted** — opacity survives, `translate` and `scale`
     go, and it must *not* become `transition: none` or Base UI unmounts in ~18ms and the popup
     vanishes mid-scrim. One surface of G1 answered, and the shape the rest should follow.

  Still true and unchanged: `modal.tsx` carries **zero** motion classes today, and the claim that
  "Dropdown and Menu received a fully measured treatment" refers to their prototypes — the shipped
  components have state styling (`data-[highlighted]`, `data-[disabled]`) and no motion at all.
- **G3** verified: one `transition-colors`, on the close button. §5e designed the stripe geometry,
  never the toast's own motion.
- **G4** — **`src/hooks/use-overflow-indicator.ts` already exists** and is consumed by
  `dropdown.tsx` alone. The mechanism is in-repo and unused by exactly the two scroll regions this
  document names as lacking an affordance. Cheapest gap here.
- **G5 narrowed 2026-09-09.** Its claim — "no prototype shows the tick, the fill, or the caption
  updating" — was true when written and is no longer. `task-open-v13` through `v17` show all
  three: the tick is its own `view-transition-name` unit, `syncCard()` drives the card's 3px bar
  through a `width` transition, and the panel caption updates via named digit spans rather than a
  `textContent` write that would delete them. What remains of G5 is **subtask rename and subtask
  delete** — the labels are plain `<span>`s, not `contenteditable`, and no row can be removed.
- **G9 — every column mutation, found 2026-09-09.** Four hooks ship (`use-create-column`,
  `use-rename-column`, `use-delete-column`, `use-reorder-columns`) and the Column row of the
  coverage matrix is empty apart from Read. This gap was invisible for eight days because the
  index is organised by surface and a column mutation falls between two of them.
- **G7** — this document mentions the theme toggle **zero times**, yet
  `src/features/theme/components/theme-toggle/` ships. It is a user-caused whole-app colour change,
  squarely rule 2, and rule 3 gives all four border states separate light and dark values.
- **G8 re-scoped, then closed.** `controls-v3.html` (§5c) does contain a live five-way font
  switcher — Plus Jakarta Sans, Inter, Geist, IBM Plex Sans, Manrope — so the typeface *was*
  compared. It was compared **on form controls**, while the two justifications this document gives
  (legibility at 11–13px, real tabular figures carrying the column counts and the `2/3` caption)
  both live on the board, which the switcher never shows.

  Closed by **`type-board.html` (§5f)**: the same five faces on the board surfaces, rendered at the
  six roles read verbatim from `tokens/typography.tokens.json` rather than approximated —
  `heading-xl` 700 24/30, `heading-l` 700 18/23, `heading-m` 700 15/19, `heading-s` 700 12/15 at
  +2.4px uppercase, `body-l` 500 13/23, `body-m` 700 12/15. This incidentally confirms the
  document's "most of this app's text is 11–13px" claim: four of the six roles sit at 12–15px.
  Plus Jakarta Sans is pinned in the left pane as the control, with a `font-variant-numeric` toggle
  and a stack of counts (`2/3`, `10/12`, `1/2`, `11/14`) whose alignment is the tabular-figures
  claim made checkable rather than asserted.

## Prototype defects found and fixed

Three of the four review findings were defects in the prototypes rather than open questions. Each
is fixed in a new revision rather than edited in place, so what was reviewed on 2026-09-01 stays
readable.

**§3 settle ring → `optimistic-v4.html`.** Reported as "the border highlight is a bit wider than
it's supposed to be."

*A first reading of this — that it was a 1px→2px change on the card's own border, violating rules 1
and 2 — was wrong, and is recorded because the wrong version is the more attractive one.* `.ringy`
is a separately positioned overlay carrying `pointer-events:none`; nothing reflows and no geometry
rule is engaged. The actual defect is narrower: it drew `2px solid var(--purple)` — `#635FC7`, a
**fill** token — which is exactly rule 3's rejected row, and it sat on top of a `s-border` keyframe
that was *already* doing the correct thing (`#B9B4F0` → `--line`, a 1px colour excursion). The
confirmation was being stated twice, once correctly and once loudly. v4 makes the ring
`1px solid #B9B4F0`, matching the excursion beneath it. Verified: `1px rgb(185, 180, 240)`.

**Correction, same day — v4 was a half-fix; `optimistic-v5.html` is the real one.** Reported again
after v4 as unchanged, which it visually almost was. Measured mid-settle:

| | rect | border |
|---|---|---|
| card (`.moved`) | `874, 218.9, 190×56` | `1px rgb(185,180,240)` |
| ring (`.ringy`) | `874, 218.9, **192×58**` | `1px rgb(185,180,240)` |

Same origin, 2px larger in each dimension — `.ringy` has no `box-sizing:border-box`, so it drew a
hairline **concentric and exactly 1px outside the card's own border, in the same colour.** Two
1px lines separated by 1px read as a single 2px band, so halving each line's width changed the
weight by almost nothing. The lesson generalises past this prototype: **a "ring" drawn as a second
element inevitably restates an edge the element already has.**

v5 removes the ring outright. `s-border` was always the correct statement of the confirmation, on
the card's own edge, in the derived colour — which this amendment had already observed ("stated
twice, once correctly and once loudly") without acting on it. Verified: `.ringy` computes
`display:none`, the card retains a single 1px border.

Left as-is and worth a look during planning: `.ringy` is a fixed `190×56`, so it aligns only with
the one card size the prototype uses.

**§2 drop-settle ring → `drag-v3.html`, and the finding this turned into.** The same defect was
then reported on §2, which prompted a sweep of the whole set. `border:2px solid var(--purple)`
appears in **five** prototypes — `drag`, `drag-v2`, `optimistic`, `optimistic-v2`,
`optimistic-v3` — with the same fixed-size absolutely-positioned overlay, the same opacity-pulse
keyframes, and the same fill-token colour. It is one idiom authored once and copied, not two
isolated slips.

That matters more than either instance. **Rule 3 was stated in this document and then violated
five times inside the artifacts the document itself points at**, which is the exact failure the
amendment's "tokens are the contract" section exists to prevent: had `#B9B4F0` and its siblings
been token references rather than retyped literals, the copy would have carried the correct value.
Treat this as the first piece of evidence for that section rather than as a prototype bug.

Fixed in the adopted revisions (`drag-v3`, `optimistic-v4`); the superseded revisions keep the
2px purple deliberately, since rewriting them would falsify what was reviewed on 2026-09-01.

**Also surfaced, and NOT resolved:** this document specifies the drop settle as *"scale and shadow
release over ~160ms"* and never mentions a confirmation ring for §2 at all. The ring in the drag
prototypes is an unbriefed addition. `drag-v3` keeps it, at hairline weight, so the question is
visible rather than silently decided — but whether the drop settle carries a ring is an open
question for planning, not something a prototype should settle by default.

**§5 right panel → `auth-v4.html`.** Reported as the blue background cropping wrongly. The panel
applied a right-edge `linear-gradient` *and* `mask-image: radial-gradient(ellipse 70% 60% at 50%
45%, ...)`. A radial ellipse falls off toward **every** edge, so its left falloff landed mid-panel
over the `--app` fill and read as a hard vertical seam rather than a crop. This document specifies
a fade "at the right edge"; the radial mask was simply the wrong instrument. v4 uses
`linear-gradient(to right, #000 58%, transparent 100%)`.

**§5 pill buttons → `auth-v4.html`.** Reported as wanting to leave pill buttons behind — which is
already this document's decision ("Buttons **4px** … replaces `rounded-full`, one line in
`button-variants.ts`, app-wide"). The three auth prototypes simply predate it and still carried
`border-radius:20px`, while `landing.html` had already been re-rendered at 4px. Nothing to
re-decide; v4 applies the adopted geometry. Verified: `.cta` computes `4px`.

**§4b morph under reduced motion — not a defect, and not fixable in the page.** Reported as the
card not morphing. `morph-real.html` carries no `prefers-reduced-motion` guard of its own, so the
suppression is the **user agent's**, applied to `startViewTransition()` itself. Measured on the
real prototype, 650ms sample window:

| context | animation samples | still running at 650ms |
|---|---|---|
| `no-preference` | **148** | 10 |
| `reduce` | **20** | 0 |

The View Transition API reports as available in both, so this is suppression, not absence. **No
in-page toggle can undo it** — the animation the UA declined to run cannot be restored by author
CSS. Reviewing full motion requires overriding the preference at the browser level: DevTools ▸
Rendering ▸ *Emulate CSS media feature `prefers-reduced-motion`* ▸ `no-preference`. The index now
detects the setting and surfaces that instruction only when it is actually active, since it
silently changes what every mock shows.

This is the **second** time the reduced-motion policy has been discovered by a prototype appearing
broken on the reviewer's own machine. It is the argument for G1 being ranked first.

**And a design question the morph exposed, which this document never asked.** Reported as "it
isn't opening the task in place, it opens as a separate modal". That is an accurate description of
what was designed, not a prototype fault — §4b's destination is the existing centred
`TaskDetailModal`, and this document's own reasoning for needing no baseline change is that the
morph "ends at the identical rect the modal occupies today". Measured in the prototype:

```
card    26, 168.9   274 × 63
modal  440, 220.0   442 × 229
```

So the morph travels **414px right and 51px down** while growing 1.6× in width and 3.6× in height.
Under reduced motion the intermediate frames are absent entirely, so what remains is a card
vanishing on the left and a panel appearing in the middle — which is exactly how it was described.

The question is therefore **not** whether the morph is implemented correctly, but whether a 414px
journey to a different region of the screen is the continuity the morph was adopted to provide, or
whether the task detail should open *in place* — expanding within the column from the card's own
position. That is a change of surface, not of animation, and it is materially larger than anything
else in this phase: it would replace `TaskDetailModal`'s composition rather than transition into
it, and it would invalidate the "needs no baseline change" claim above. Recorded as open item 16;
**not** decided here.

## Four further rules — proposed 2026-09-09, NOT yet adopted

Raised in response to "are there other rules like rule 5 worth hammering down". Recorded as
proposals so that adopting or rejecting them is a decision someone makes, not something that
happens by drift. The first two are the ones worth arguing about.

**Proposed rule 6 — reduced motion changes duration and distance, never information.** Every state
currently communicated by motion must remain communicated under `reduce`, via colour, opacity or an
instant swap. Test: emulate `prefers-reduced-motion: reduce` and assert each end state is still
reachable and distinguishable. This is the rule that turns "reduce, don't remove" from a policy
into something checkable, and G1 is it failing today.

**Proposed rule 7 — nothing animates on first paint.** Mount and hydration must not replay enter
animations. The concrete hazard is this repo's own: `CLAUDE.md` records that `loading.tsx` is the
navigation fallback and that **BoardView remounts on `refresh()`**, so a board enter animation
re-fires on every optimistic refresh — many times a minute in normal use. Test: count animation
starts within *N*ms of load and expect zero for content already present.

**Proposed rule 8 — an animation may not outlive the state it describes.** A 200ms settle over an
80ms PATCH claims "in flight" for 120ms after it is not. This generalises the reasoning that
already dropped the 2px wire ("most of these PATCHes resolve under 200ms, so it would flash and
vanish"). Test: assert animation end ≤ state resolution + tolerance.

**Proposed rule 9 — motion must be interruptible.** Re-triggering mid-flight continues from the
current visual position; it never queues and never snaps back to the origin. Distinct from rule 5,
which guarantees the click *lands* but says nothing about what happens once it lands mid-animation.
The cases are spamming the sidebar collapse, double board-switch, and rapid subtask toggling. Test:
fire the trigger at frame *N*, assert no positional discontinuity beyond a threshold and no replay
from the origin.

## Editing in the panel — three findings from v4

Reported against `task-open-v3.html`: the editable fields gave no cue, editing shifted the layout,
the subtask strike-through switched on rather than drawing, and C still read as instant. All four
were real; two of them share one cause.

**A re-render destroys the animation it was supposed to play.** `render()` rebuilt the panel on
every mutation, so the subtask row was recreated *already* in its final state and the CSS
transition had nothing to run from. Toggling the class in place is the whole fix. This is the same
shape as the settle-ring error earlier in this amendment — the artifact was correct and the thing
driving it was not — and it is worth stating as a rule of its own: **if a state change must
animate, mutate the node; do not re-render it.**

**`contenteditable` on the same element removes the layout shift by construction.** Swapping the
title `<div>` for an `<input>` measured at +2px on the box and **−8px** on the description below
it. Editing the element in place swaps nothing, so the measured deltas are 0/0/0. The focus ring
is drawn with `outline`, which paints outside the border box and cannot displace anything — rule
1's own focus carve-out, reused here for a reason it was not written for.

**A duration is only defensible relative to its distance.** C was always interpolating — 16
distinct heights, measured — and still read as instant, because 515px of growth in 220ms is about
2300px/s. The panel travels 400px in the same 220ms and reads fine because it is a *slide*, not an
eightfold size change. Raised to 420ms. **The lesson is that this document's timing table cannot
be applied by role; it has to be applied per distance.**

Also fixed here: the strike-through draws left-to-right as a scaled pseudo-element rather than
`text-decoration`, which cannot be transitioned. It scales the *line*, never the text, so rule 4's
prohibition on transforming text is untouched.

## A served charset is part of the artifact

Found 2026-09-09 while checking the new glyphs. `scripts/serve-static.mjs` sent `text/html` with
no charset, so Chrome fell back to **windows-1252** and every prototype without its own
`<meta charset>` mojibaked — `✕` rendering as `âœ•`. This was not new: `sidebar.html` and
`rule5.html` from the original session carry raw `·×—""→▶` and had been rendering wrongly in the
index the whole time.

Fixed at the server rather than in the files, specifically so the historical prototypes did not
have to be rewritten to display correctly. Verified inert for the visual-regression suite before
changing it: Storybook's own `index.html` and `iframe.html` both declare `charset="utf-8"`, and a
page served through the unmodified server already resolved to UTF-8 — so the header can only agree
with what was already happening there. `serve-static.unit.test.mjs` stays green, 8/8.

## Does the panel look wrong on a large screen?

Asked 2026-09-09: a 400px full-height panel on a wide monitor is mostly empty, where a modal
compresses to its content. Measured at 2560x1440 on the *shortest* task in the set — the panel's
worst case:

| | size | empty |
|---|---|---|
| panel | 400 x 1100 | **63.9%** |
| modal | 496 x 405 | ~0% |

The premise is correct and the conclusion does not follow, for two reasons.

**The modal reads worse at that size, not better.** It is a small box adrift in a *dimmed* void,
and the scrim makes every one of those wasted pixels dead — the board is greyed out and
unusable. The panel's empty space at least sits beside a live board. The modal also lands nowhere
near the card it came from.

**Most of the emptiness was the dataset, not the design.** The 3-column demo everything had been
judged on needs **924px of a 2560px viewport**. Rebuilt with a realistic board — six columns,
23 tasks, a backlog and a blocked column — it occupies **1836px**, and the panel then reads as
proportionate to the columns rather than as an oversized slab. Prototyped as `task-open-v5.html`,
which toggles the two datasets and a capped measure so the comparison can be made rather than
argued.

Panel emptiness is **63.9% in all three configurations**, because it is a property of the *task*
(a two-subtask task with one line of description) and not of the board or the viewport. The
honest statement is therefore: a short task under-fills the panel at any width, a realistic task
does not, and the modal trades that for a scrim over an equally empty board.

**Capping the measure is a separate, real question and is not settled here.** A cap was
prototyped at 1180px, left-aligned — never centred, since centring would slide the whole board
sideways the moment the panel opened, which is precisely the layout shift this phase exists to
remove. Whether a kanban board *should* be capped is genuinely arguable: more columns visible is
useful, which is why Trello and Jira do not cap theirs.

## Swapping the panel between tasks

With the panel adopted, clicking one task then another replaces its contents in a single frame.
Proposed on review that view transitions would suit this. **Measured, and they are the one option
that cannot be used here.**

Four strategies, each sampled every 16ms across a swap, counting frames where a *different* card
was not hit-testable — the same `elementFromPoint` harness §R5 established:

| swap | dead frames | dead time |
|---|---|---|
| instant (one-frame) | 0 / 44 | 0ms |
| sequenced fade, 70ms out / 110ms in | 0 / 44 | 0ms |
| directional, entering from the new card's side | 0 / 44 | 0ms |
| **`startViewTransition()`** | **20 / 44** | **320ms** |

This confirms rather than contradicts §4b, where the same API measured 12 of 12 frames dead. And
it is the worst possible surface to pay that cost on: clicking through tasks is a *repeated* action,
so every swap blocks the next click for a third of a second. **Choosing the panel over the modal
retired this phase's only rule-5 carve-out; using a view transition for the swap would reintroduce
it, at a higher frequency than the carve-out it replaced.** Rejected.

Both surviving options reuse mechanisms this document already adopted rather than inventing one:
the sequenced fade is §7c's skeleton-to-content handoff (out finishes before in starts, so two
strings are never inked in the same place — rule 4), and the directional variant is §4c's
board-to-board entry, one level down. The directional version moves the content by its layout
position inside the existing clip, never by `transform`, because the panel is 400px of text and
rule 4's mechanical form forbids transforming it.

**Not yet chosen between fade and directional.** Both are free under rule 5; the question is
whether a direction derived from the card's position carries meaning or is decoration, which is
the same argument that rejected the artificial stagger.

### A measurement that reported success on a branch that never ran

The first pass of this table returned **0 dead frames for all four strategies**, including view
transitions. That was not a result, it was a broken harness: `render()` clears `is-panel` before
the panel branch reads it, so the "was the panel already open" test was always false and every
strategy silently fell through to `instant`. The tell was `startViewTransition` having been called
**zero** times while the row still reported a clean pass.

Worth recording because the failure is invisible by construction: a strategy that never executes
and a strategy that executes perfectly produce the same zero. **Any harness asserting the absence
of something needs a positive control** — here, counting the API calls — or it cannot distinguish
"clean" from "never ran".

## Making the view transition "more dynamic", and what it costs

The un-named `startViewTransition()` is a root cross-fade, which is why it reads as clean but
low-effort. Structure is added by giving elements a `view-transition-name` so they morph
individually. Prototyped in `task-open-v7.html` on the title, description and subtask list:

| | dead frames | dead time | frames morphing |
|---|---|---|---|
| unnamed (root cross-fade) | 20 / 44 | 320ms | — |
| **named parts** | 22 / 56 | **352ms** | 20 |

**Making it more dynamic makes it more expensive, not less** — the input block scales with the
transition, so the better it looks the longer the panel refuses clicks. This is the argument for
the sequenced fade and the directional entry standing: both are structural, and both cost zero.

## Push or overlay — how the panel docks

Reported that on a full board, opening the panel "shifts everything too much and feels rushy".
Measured, and the cause is not what it looks like.

**The columns never move.** Displacement is **0 of 6 columns** in both docking modes, because the
board is left-aligned and already overflows: narrowing its container changes what is *visible*,
not where anything sits. The sensation is entirely the board **scrolling**, and the scroll is
something this session added — a `scrollIntoView` to keep the opened card clear of the panel.

With the target card already on screen and the board scrolled right:

| dock | board scrolls | card travels | card clears panel |
|---|---|---|---|
| push | **382px** | 382px | yes |
| overlay | **0** | 0 | no |

From a cold scroll position the push case measured **737px** — three-quarters of a column-set
sliding away for the act of opening a detail view.

**Recommended: overlay, and drop the reveal.** Four reasons.

1. **Rule 2.** The user opened a panel. The columns did not move, so nothing about them should
   move. Pushing displaces content as a side effect of an action that was not about that content.
2. The reveal was **an assumption, not a requirement**. The card's contents are now in the panel,
   larger. Keeping the 280px card visible alongside its own 400px expansion is redundant, and it
   is what costs the 382–737px of travel.
3. **The reference set overlays** — Jira, Linear, GitHub Projects all float the detail over the
   list rather than reflowing it.
4. **The sidebar-mirror argument that produced `push` was wrong on intent.** Collapsing the sidebar
   is *about* reclaiming space, so the board flowing into it is the point. Opening a task panel is
   about showing detail; space reclamation is not the goal, so borrowing the sidebar's behaviour
   imported a justification that does not transfer.

The accepted cost is that the panel covers ~400px of board, including possibly the card just
clicked. On a narrow laptop that is a meaningful fraction — but the board still scrolls, so nothing
is unreachable, and it is strictly less disruptive than the modal's full-board scrim that this
phase already rejected.

## Closing is slower than opening

Set to **360ms close against 220ms open** (was symmetric at 220). Opening races an intention the
user has already formed; closing is a dismissal, and a panel that vanishes at the same speed it
arrived reads as a glitch rather than as a movement. Asymmetry here is the point, not an oversight.

## The decided shape of the task panel — 2026-09-09

`task-open-v8.html` is the resolution of open item 16. Three decisions, one of which overrides a
recommendation made earlier in this same amendment.

**Docking: overlay. The board never moves.** Verified from a mid-scroll position: board scrolled
0px, maximum column travel 0px. Push is kept in the prototype for comparison only. The
`scrollIntoView` reveal is **off** under overlay — an overlay whose argument is "nothing moves"
cannot then scroll the thing behind it. (An "overlay, no scroll" variant was briefly offered
alongside "overlay" and withdrawn: the two differ only when the opened card is partly covered
*and* scroll room remains, which is too narrow to be a choice. Offering both was a mistake.)

**Swap: `startViewTransition()`, adopted over this document's own measured objection.** The
objection stands on the numbers — 320ms unnamed, 352ms with named parts, against 0ms for the fade
and the directional entry. It was overridden on a product judgement: **a user does not click
through tasks fast enough for a 320ms window to be reachable**, and the view transition is the
only option that reads as a considered movement rather than a swap. Recorded as a decision with
its cost stated, not as an oversight.

Two consequences worth writing down rather than rediscovering:

- **Rule 5 now has exactly two exceptions, and they are the same exception.** Both are
  `startViewTransition()` — the card-to-panel case and this one. The API blocks pointer input for
  its full duration by design, which no timing choice removes. The clean statement of rule 5 is
  therefore: *animation never gates interaction, except where the View Transition API is used,
  which does so by construction; it is used in two places and both are named here.*
- **This decision does not survive keyboard navigation between tasks.** If arrowing from task to
  task is ever added, each step pays the block, and the "nobody clicks that fast" premise no longer
  holds — a held arrow key is exactly the fast repetition the measurement warns about. Revisit this
  decision at that point rather than treating it as settled forever.

**The directional swap is withdrawn, and was not fairly tested.** Reported as jumpy, correctly: it
travelled 14px in 160ms, which is a twitch rather than a movement, and a bug derived its direction
from the task's array index instead of its position, so the first swap always came from the same
side. Fixed in v8 to read the cards' on-screen positions, but it is no longer a candidate. Its
being under-built is recorded so nobody re-reads "directional was rejected" as a verdict on the
pattern — §4c still uses it for board-to-board, where it works.

## Tuning the view transition — five fixes, `task-open-v9.html`

Reported as "smoother, but there is still work to do". There was, and the largest item was a
rule violation this document had already measured once in another form.

**1. It was cross-fading text.** A view transition fades `::view-transition-old(x)` against
`::view-transition-new(x)` by default. Measured on the panel title: **15 of 21 frames had both the
old and the new string inked at once** — the identical defect that got the board-title crossfade
rejected on 2026-09-01 at 9 frames. Doubled glyphs read as blur, which is most of what "not quite
smooth" was. Fixed by sequencing them — out over 90ms, in over 140ms starting at 90ms — so one is
always finished before the other begins. **Verified in both directions: 15 frames before, 0 after.**

**2. ~~The root group was cross-fading the whole panel underneath the named parts.~~ REVERTED in
`task-open-v10.html` — this fix was wrong and made the transition worse than any version before
it.** `::view-transition-old(root), ::view-transition-new(root) { animation:none; opacity:1 }` does
not disable the root transition. It pins **both** root snapshots fully opaque, so the new state is
visible from frame 0 while every named group animates underneath an opaque cover, and the only
visible event is the snapshots being removed at the end — a hard cut. Measured: `oldRoot` and
`newRoot` both `1` across all 50 sampled frames, root fading on **0** of them. After the revert,
root fades on 13. The chrome it covers barely changes, so its cross-fade was invisible anyway;
suppressing it bought nothing and cost the whole effect.

**3. The snapshots were being stretched.** `::view-transition-old/new` are bitmaps, and when a
group changes size — a four-subtask task replacing a two-subtask one — the default sizing scales
them to fit the new box, distorting every glyph. Pinned to `object-fit:none` with
`object-position:top left` and clipped, so content is never resampled.

**4. The morph ran on the UA's default easing.** Only `animation-duration` had been set, so the
position/size animation used the browser default and matched nothing else in the phase. Now
carries `cubic-bezier(.2,0,0,1)`.

**5. No reduced-motion guard.** Added, per this document's own CSS block. Note what it can and
cannot do: it removes the *animation*, never the API's input block, which is a property of
`startViewTransition()` and not of its duration.

### Panel view A into panel view B — `task-open-v13.html`

v12 morphed the wrong pair. The ask was never card-into-panel (§4b already owns that); it was the
**already-open panel showing task A becoming the panel showing task B**. v12 is superseded.

The earlier claim in this section — that two unrelated tasks share no identity, so only a
cross-fade is possible — **was wrong, and wrong in an instructive way.** The tasks share no
identity, but the panel's *structural slots* do: the title box, the description box, each subtask
row, the section labels, the status field all exist in both views. Their **boxes** have
counterparts to travel to even though their **text** does not.

**The last sentence of this paragraph was itself wrong and is corrected below (v14-v17).** It
claimed the slots "genuinely move, because tasks differ in description length and subtask count".
Measured across all seven tasks on 2026-09-09: the title box is `318x29` every time and the
description `356x52` in six of seven. The boxes are identical **by construction** — a full-width
block's box cannot depend on its text — so naming the slots bought correct structure and no
movement at all.

So the name goes on the slot, never on the task: `tp-title`, `tp-desc`, `tp-sub-0…n`,
`tp-lab-subs`, `tp-lab-status`, `tp-sel`, `tp-add`. **Ten groups now animate independently** where
v9–v12 had three. Naming the subtask list as one group was the specific error — it scaled as a
single bitmap, so rows could not move relative to each other.

Two failures worth keeping, because both were invisible until measured:

- **A duplicate name aborts the entire transition, silently.** `.tp-lab` matches two elements
  ("Subtasks (n of m)" and "Current status"), so both received `tp-lab`, and Chrome threw
  *"Transition was aborted because of invalid state"* with zero groups animating. A
  `view-transition-name` must be unique **per document**, which makes any class-based rule a
  latent hazard the moment a second element matches it. Assert uniqueness before transitioning
  rather than trusting the selector.
- **The phase's own easing cannot drive an opacity fade.** `cubic-bezier(.2,0,0,1)` is heavily
  front-loaded, so the outgoing text reached ~0 opacity in the first third of its 130ms and left a
  **blank frame** between old and new — a flash, which reads worse than either a fade or a cut.
  The fades are `linear`; the easing stays on the group, where it animates the box. **Curve choice
  is per-property, not per-phase.**

### No animation library — decided 2026-09-09

**Phase 5 animates with plain CSS and the View Transitions API. No animation library is added.**
Before this the question had never been asked in this document, and the answer was accidental
rather than chosen: nothing is installed today beyond `@dnd-kit` (which owns drag transforms) and
Tailwind v4, and the whole app's animation surface is 10 x `transition-colors`, 6 x `animate-spin`,
one `transition-transform`, and **zero authored `@keyframes`**.

Three reasons, in the order they matter:

1. **A locked rule already forbids the main thing a library would do for us.** Motion's `layout`
   prop animates layout via **transform**, and rule 4 of this phase is *"animate layout, never
   transform"* — because transforms distort text. That is not a theoretical objection: it is
   exactly the v9-v12 defect, where the subtask list was named as one group and scaled as a single
   bitmap instead of its rows moving.
2. **We now depend on a browser behaviour no library reproduces.** The panel swap's correctness
   rests on the UA's `::view-transition-old`/`new` pair being *complementary* under
   `mix-blend-mode: plus-lighter`, so an unchanged slot is invisible by construction. That is
   compositor behaviour, not something a JS tween can hand back.
3. **`::view-transition-*` is document-level and unreachable from a utility class anyway**, so
   "plain Tailwind" and "plain CSS" are the same answer. Tailwind's `transition-*`/`duration-*`/
   `ease-*` utilities still cover the ordinary hover and colour cases.

Where a library would earn its keep is interruptible, velocity-aware motion — drag follow-through
— and `@dnd-kit` already owns that surface.

**The gap this exposed, and closed: motion tokens.** `tokens/` had eight files and none for
duration or easing, while the prototypes carried 420ms, 110ms, 150ms, a 50ms delay and
`cubic-bezier(.2,0,0,1)` as loose literals. `tokens/motion.tokens.json` now emits eight custom
properties through the same DTCG -> Style Dictionary -> `tokens.css` pipeline as the radii, each
carrying the measurement that produced it. Two notes for whoever extends it:

- **`--ease-fade` is authored as `cubic-bezier(0, 0, 1, 1)`, not the `linear` keyword**, so it
  survives the DTCG `cubicBezier` type. Its description carries the rule it encodes: opacity never
  uses `--ease-standard`, which is front-loaded enough to reach ~0 in the first third and leave a
  blank frame.
- **A `cubicBezier` value is a four-number array**, so the generic emitter produced an unusable
  `0.2,0,0,1` until `style-dictionary.config.mjs` grew a case for it. The regression test asserts
  the emitted *value*, not the token's presence — the broken form still looks like a token was
  emitted.

Keep the set small. A duration nobody measured is drift wearing a token's costume; add one when a
prototype produces it.

### Locked — `task-open-v17.html`, adopted 2026-09-09

**The panel-to-panel swap is settled.** Four corrections got there, and each one was a different
misunderstanding of the API rather than a tuning miss.

**1. A view transition animates two things at once, and only one is conditional.**
`::view-transition-group` interpolates the box; `::view-transition-old`/`new` cross-fade the
contents as bitmaps. Both always run at every granularity. "It reads as a fade, not a morph"
therefore means *the geometry delta was zero*, never that the wrong animation was chosen. It is a
layout question wearing an animation costume.

**2. So the layout has to offer a delta.** Every animated slot was a full-width block, which
discards the difference it had: the title's natural text width ranges **121px to 277px** across
the seven tasks while its box stayed `318x29`. `width: fit-content` restores it — 201px → 308px on
one pair, and every subtask pill gets its own width. `.tp-head .tp-t { flex: 1 }` silently defeated
this for two attempts: **the title is a flex item, so flex sizing wins and `width` is ignored.**
This is a real design consequence, not a free win — subtask rows become content-width pills.

**3. The UA's cross-fade is complementary; ours were not.** The default pairs old and new under
`mix-blend-mode: plus-lighter`, so `old x (1-t) + new x t` sums back to the original wherever the
snapshots agree — **an unchanged slot is invisible by construction**. Every custom opacity curve
written between v9 and v15 broke that sum and made unchanged text blink. Measured on a label whose
text and position never change: **8.74 max wash with our curves against 1.11 with the default.**
The override is now injected at run time for only those slots whose content actually differs.

**4. Granularity is capped by the DOM, not the CSS.** A named element is captured as one bitmap
and the API cannot diff inside it, so anything sharing an element fades together. Splitting where
parts change on *different occasions* took the panel from 9 named units to **17** — each subtask
row into pill + tick + label, the counter into done + total, the select into box + value. The
result is that **fewer** units animate: 8 of 17 on a swap, the other 9 held invisible by the
default. Measured on a checkbox whose state is identical in both tasks but whose neighbouring
label changed: **42.16 wash and 44.32% of pixels moved before the split, 0.81 and 0.00% after.**

Two consequences for implementation:

- **An ancestor's change-detection must exclude its named descendants**, which are lifted out of
  its snapshot. Without that the pill and the select box are flagged as changed by their own
  children and animate a bitmap that never changed.
- **Anything that rewrites a container's `textContent` will delete named child spans inside it.**
  The subtask toggle did exactly this to the counter and had to be rewritten to write into the
  spans. Any element carrying a `view-transition-name` is a structural dependency of the code that
  updates it.

Splits that were considered and rejected: the title, description, add button and status label. A
single string has no seam, and naming something that never changes adds a group whose default
animation is already invisible.

### Why every version up to v11 could only ever cross-fade

Reported after v11 that it was still "a fade in, fade out situation we're trying to avoid". That
is not a tuning complaint, it is a structural one, and it is correct.

**A view transition morphs elements that share an identity. Two unrelated tasks share none.** Task
A's title and task B's title are not the same object — they are different strings occupying the
same box. With no counterpart to morph *to*, `::view-transition-group()` has no geometry to
animate, so everything the API can do collapses to a cross-fade. Sequencing that cross-fade
(v9-v11) made it slower and rule-4-clean, but it could not make it a morph, because there was
nothing to morph.

**The thing that genuinely is one entity is the clicked card and the panel it becomes.** So
`tp-morph` is set on the *card* in the old state and on the *panel body* in the new one. The
browser then animates one rect into the other: the card leaves the board, travels, and grows into
the panel. Filmstripped at 50ms, the card is visibly in flight between its column and the panel.
That is real movement, and it is the same shared-element idea as §4b's card-to-modal morph — which
this document adopted on 2026-09-01 and which the panel decision then made homeless.

**One artifact is inherent and cannot be fully removed.** The card is 280x63 and the panel is
400x~1000; the aspect ratios do not match, so whichever snapshot is on screen mid-flight is being
stretched. Neither can be shown while it distorts. The resolution used here is to let the *group*
carry the visible movement — the box travels and grows on the phase's curve — while the outgoing
snapshot is dropped in 70ms and the incoming one resolves only at 260ms, once the box has arrived
at its destination size. What remains is a brief scale during flight, which reads as the card
growing rather than as distortion because it is in transit rather than stationary.

**How this was found is the point.** Three rounds of numeric verification passed while the screen
showed a cross-fade. The structural error was only visible once the transition was rendered as a
filmstrip over the *whole stage* rather than the panel alone — the travel happens across the board,
so a clip around the panel could not have shown it at any sampling rate.

### What was actually wrong: the duration, again

v10 was reported as no better than v9 — still snapping. It was, and every measurement in this
section had been passing while the thing on screen was a cut. The proxies (opacity samples, frame
counts, double-ink counts) were all true and all beside the point.

Settled by rendering the transition as a **filmstrip** — screenshots at fixed offsets, then read
as images rather than as numbers. That is the artifact this amendment's own "motion is enforced by
traces, not pictures" section specifies for exactly this situation, and it was not used until the
numbers had failed three times.

| offset | v10 | v11 (420ms) |
|---|---|---|
| 50ms | old, fully solid | old at ~60% |
| 110ms | **new, fully solid** | old at ~35% |
| 170ms | new, solid | new at ~50% |
| 230ms | new, solid | new at ~85% |
| 290ms+ | new, solid | settled |

**v10 had zero transitional frames; v11 has four.** The whole swap had been ~250ms for a *total
content replacement* — different title, different description, a different number of subtask rows.
Raised to 420ms (170ms out, then 250ms in) and the identical mechanism reads as a movement.

This is the third time in this amendment that a duration was wrong for its distance: the inline
expansion at 515px in 220ms, the panel's close at the same speed as its open, and now a full
content replacement in 250ms. **The timing table in this document is not a set of values to apply
by role — it is a starting point that has to be re-derived per change.** Stated once here so the
next surface does not rediscover it a fourth time.

### The second harness failure of the session

v9 was verified as `framesTitleBothInked: 0` and reported as fixed. That number was true and
meaningless: nothing was visible at all, so of course no two strings were inked together. The
measurement checked the named groups in isolation and never asked whether they were on screen.

This is the same failure as the swap-strategy harness earlier in this amendment, in a new costume:
**an assertion about an absence passed because the thing it measured never ran.** The first time,
the tell was `startViewTransition` having been called zero times. Here it would have been root
opacity never leaving 1. Both are positive controls that were not there.

The rule, stated once so it stops recurring: **when asserting that something does not happen,
measure that the surrounding mechanism did happen.** A silent pass and a real pass are otherwise
indistinguishable.

**The input cost is unchanged at 336ms** — identical before and after. Tuning bought fidelity, not
latency, which is worth stating precisely because the earlier named-versus-unnamed measurement
showed the opposite direction: adding *groups* costs time, adding *quality to existing groups* does
not.

## Typeface — Manrope, decided 2026-09-09

Supersedes Inter, chosen on 2026-09-01. The decision came from reviewing `type-board.html`, and
the measurement taken to check it invalidated half of Inter's original case.

**This document gave Inter two justifications. Only one of them was ever a differentiator.**
Measured across all five candidates at 700 12px — digit-width spread with `font-variant-numeric`
proportional versus `tabular-nums`:

| | proportional spread | tabular spread | real tabular figures |
|---|---|---|---|
| Plus Jakarta Sans | 40 | **0** | yes |
| Inter | 30 | **0** | yes |
| Geist | 30 | **0** | yes |
| IBM Plex Sans | 0 | 0 | yes (tabular by default) |
| **Manrope** | 30 | **0** | yes |

Every candidate has real tabular figures, **including the incumbent**. So "real tabular figures,
which carry the column counts and `2/3` captions" never selected Inter over anything — the
`2/3` alignment argument was true of Plus Jakarta Sans the whole time and could not have
justified a migration on its own.

That leaves small-size legibility at 11–13px, which is a judgement and was made by eye against
the board surfaces rather than the form controls §5c used. **Manrope.** The migration cost stated
above is unchanged and applies identically — self-hosted woff2, rewritten `src/styles/fonts.css`,
`fontFamily` in all eight `tokens/typography.tokens.json` entries, every visual baseline
re-recorded.

## Buttons — decided 2026-09-09

Raised as "they still are kinda boring and basic". Prototyped as `buttons-v1.html` (four
treatments side by side) through `buttons-v4.html` (the adopted one).

**The diagnosis was not the resting look.** `rg ':active'` across `src` returns zero button hits:
the entire vocabulary is six `cva` rows of `bg-X text-Y hover:bg-X-hover`, so the button
acknowledges a pointer *approaching* and says nothing when pressed. `transition-colors` is the only
animated property in either variants file.

### The treatment

| State | Fill | Geometry | Edge |
|---|---|---|---|
| Rest | token fill | — | inset top highlight, 1px inner hairline, solid 2px bottom edge |
| Hover | `-hover` token | none | unchanged |
| `:active` | one step darker than `-hover` | **`translate: 0 2px`** | bottom edge to `0`, top highlight inverts to an inner shadow |
| Pending | unchanged, `opacity: .75` | held at `2px` down | bottom edge gone |
| Disabled | unchanged, `opacity: .5` | held at `2px` down | bottom edge gone |

Pending and disabled hold the pressed geometry rather than resetting it: the control is visibly
already down, so there is nothing left to press. That falls out of the press treatment for free and
needs no separate affordance.

Radius follows the control-geometry table's 4px, replacing `rounded-full`. The pill is the single
loudest 2021 tell in the current UI and its removal is already specified above.

### Amendment 2026-09-09 — `secondary` was three light-theme literals

Reported by the user against a dark canvas, where the button read as a bright white pill. The
adopted treatment hardcoded **`#dfe6f5`** (drop edge), **`#fafbfe`** (hover) and **`#f1f4fb`**
(press) — all sampled in the light theme, which is exactly what rule 3 forbids. On a dark surface
the drop edge therefore paints *lighter* than the button it sits under, turning a shadow into a
highlight.

The same report caught a second defect: **`secondary` had no perceptible hover.** White →
`#fafbfe` is a **5/4/1** channel step, below `CHANNEL_THRESHOLD` (8) — the filmstrip's own noise
floor. The state existed and could not be seen.

Replaced with values derived from the theme, and with the hover doing its work through the
**border** rather than the fill:

```css
--btn-quiet-hover: color-mix(in srgb, var(--text) 4%, var(--surface));
--btn-quiet-press: color-mix(in srgb, var(--text) 8%, var(--surface));
--btn-quiet-edge:  color-mix(in srgb, #000 14%, var(--surface));
```

Mixing toward `--text` moves the right way in both themes — darkening on light, lightening on
dark. The drop edge mixes toward black instead, because it must stay a shadow in both. Hover also
moves the border `--border → --border-hover`, which is where the visible change actually comes
from. Shown side by side in `column-crud-v3.html`.

### Pending is opacity, and the contrast objection was wrong

`opacity: .75`, chosen off a 50/65/75/85 ladder. 50% — today's value — is unreadable; 85% barely
registers as a change.

**I argued against opacity on contrast grounds and was mistaken.** WCAG 1.4.3 and 1.4.11 both
exempt *inactive user interface components* from every contrast requirement, and a button that
cannot be clicked is inactive. Today's `disabled:opacity-50` was never a violation. Recorded
because the wrong version of this reasoning generated a whole discarded prototype (`buttons-v3`,
four bespoke greys re-darkened to pass a bar that did not apply) — the failure was answering a
compliance question nobody had asked.

The one real cost stands: `opacity` on the button fades the spinner and progress rail with it, so
the more clearly it reads "inactive" the less clearly it reads "working". Scoping the fade to an
inner wrapper was prototyped and **rejected at 75%** — with the fill left at full strength the
button barely reads as pending at all, which is the opposite of the point. At 50% the trade would
go the other way; it does not arise at the adopted value.

### Not yet measured

The press is **90ms, chosen rather than measured**, and it is below what a screenshot can resolve —
`pnpm filmstrip` is the instrument, and no filmstrip run has been made against it. No
`duration.press` token exists until one has, per `tokens/motion.tokens.json`'s own rule that a
duration nobody measured is drift wearing a token's costume.

## The sidebar board list, and creating a board — decided 2026-09-09

Raised as "a pretty basic generic list". Prototyped as `sidebar-boards-v1.html` (four row
treatments plus a live create flow) through `v4.html` (adopted).

**Why it reads as generic is measurable.** Each row carries exactly one thing — its name — in a
44px box with 8px of air, under an identical `PanelLeft` glyph repeated on every row, beside a
kebab that permanently reserves 44px of a 300px panel. Three boards produce three near-identical
stripes. Measured on an eight-board list: **519px today against 383px adopted**, 26% shorter for
the same content.

### The row

| | Adopted | Replaces |
|---|---|---|
| Height | 36px, 2px apart | 44px, 8px apart |
| Radius | 4px | full-bleed `rounded-r-full` pill |
| Selected | 2px purple left rail + `bg-app` tint + weight | solid purple slab, white text |
| Leading | per-board monogram, hue hashed from `board.id` | the same `PanelLeft` glyph on every row |
| Kebab | revealed on `:hover` and `:focus-within`, reserving no width | always rendered, `pr-11` reserved |

The rail matches the grab-rail the card hover already adopted, so selection and affordance stop
speaking two dialects. The monogram's hue is hashed from the **id, never the index** — the column
palette settled that already, because deleting an entry renumbers positions and repaints every
survivor. Both `id` and `name` are in the sidebar's own payload, so the monogram **paints on the
first frame**.

**No per-board count.** `taskFullSchema` has no completion field — `isCompleted` exists only on
`subtask` — so a `5/12` invents a notion of "done" the data model cannot express, and the
alternatives are a guess (*"in a column named Done"*) or broken on the common case (subtask
completion reads `0/0` for a board of subtask-less tasks). A raw count is honest but near-static.
Separately, anything richer than name comes from `usePrefetchAllBoards`, which fires in an effect
*after* the list paints, so every such value pops in raggedly, board by board.

**The palette caps at six**, so past six boards the monogram hues repeat by pigeonhole (measured:
eight boards put three on `#67E2AE`). The **letter** is the durable identifier; the hue is a
secondary cue.

### The column outline

The open board's columns appear as sub-rows, each carrying the dot colour its column header
already shows.

- **Collapsed by default, and selecting a board does not open it.** Strictly manual, so a board
  with many columns can never ambush the list.
- **The chevron is its own control, never the row.** The row navigates; a control that does two
  things depending on where you land inside it cannot be described. A board with no columns gets
  no chevron rather than an inert one.
- **Cap at six, then `+ N more`.** Six is the column palette's own ceiling — past it the dots
  repeat and stop telling columns apart, which is exactly where the outline stops paying for
  itself. Collapsing forgets the expansion, so reopening starts capped. Rejected: an inner scroll
  (nests a scrollbar inside a panel that already scrolls — G4's own complaint) and no rule at all
  (one open board triples the sidebar, 619px against ~230px collapsed).

**Both disclosures animate `grid-template-rows: 0fr → 1fr`, never a transform** — rows of text,
rule 4 — which reaches an unknown height without measuring one in JS. Late rows animate their own
height and opacity while the track is already `1fr`, so the container follows their growth instead
of two animations contending for the same pixels. No stagger, matching §7c's dialled 0ms.

**Both were silently missing at first, and the filmstrip is what caught it.** `repaint()` rebuilt
the list's `innerHTML` on every toggle, so the element was *born* expanded and had no previous
value to interpolate from. The numbers, same trigger: **v3 one frame over 0ms** — a cut — against
**v4 13 frames over 165ms** for the disclosure and 12 over 174ms for the overflow reveal. A
class-flip in the DOM looked correct and read as instant.

### Creating a board into it

The modal enters at 160ms position and 120ms opacity on the adopted curves. Column rows animate
`height` and `opacity` only, so no glyph re-rasterises while the form grows. The new row **lands
at full size immediately** — the create is optimistic and the row genuinely exists, so delaying it
would be the animation lying about the state; only the tint and a crawl rail recede.

This is also the phase's first modal treatment, so it is a first pass at **G2**, which eight other
uncovered cells inherit.

**Rejected: `⌘1`–`⌘9` on the first nine rows.** The affordance is only honest if the bindings
exist, and adding them is scope creep out of this phase.

### `view-transition-name` on a list row creates a stacking context

Found 2026-09-09 in `board-edit-v2.html`, by the user watching it rather than by any check.
Naming each sidebar row — which the delete transition below requires — makes **every row its own
stacking context**, so a `z-index` set *inside* one row can no longer rise above the next row. The
kebab menu rendered behind the board names below it, half-legible, while every assertion about it
passed: it was in the DOM, it had the right size, and it was on top within its own row.

The fix is to lift **the row**, not the thing inside it (`li.menu-open { z-index: 20 }`).

**This is a prediction about the shipping code, not only the prototype.** `BoardCard` renders a
Base UI `Menu` inside the same `<li>` that will carry the name, so it hits this the moment the
transition lands. Verified in the prototype with `elementFromPoint` at the menu's own centre —
the check that distinguishes "painted" from "painted on top", which a snapshot assertion does not.

## Board rename and delete — decided 2026-09-09

Prototyped as `board-edit-v1.html` (modal vs inline, and delete's two cases) and
`board-edit-v2.html` (adopted).

**Both flows start from the row's own three-dot menu.** No new entry point — `BoardCard` already
renders `Edit Board` / `Delete Board` and that stays the way in.

### Rename — inline, replacing the modal

`edit-board-modal` holds **exactly one text field**: a modal, a scrim and a "Save Changes" button
to change one word, covering both places the name is visible while it does it. The row's own name
becomes `contenteditable` in place instead — the same element, so nothing is swapped and there is
no layout to absorb. Enter commits, Esc cancels. This is the third surface to arrive at that
construction, after the task title and description.

**`EditBoardModal` is deleted by this**, exactly as the panel work deletes `EditTaskModal`. The
same decision now covers two of the four rename flows; column rename is the third and should
follow rather than diverge.

**The board title slides.** A masked vertical slide inside a fixed 26px well: the outgoing line
rises out while the incoming rises in, 180ms out against 200ms in on `--ease-standard`.

This does **not** reopen §4d, which rejected a slide for rename on the grounds that a rename has no
direction. §4d's rejected candidate was the *directional* slide used for a board switch, which
implies the title travelled in from another board. A masked replacement inside a stationary well
implies substitution, not travel — a different claim, and the true one.

### Delete — the kebab, a confirm, and one view transition

Two cases from one action, because `use-delete-board` rewrites the URL with
`window.history.replaceState` **in the same commit** as the cache write (deliberately —
`router.replace` left the address naming a deleted board for a measured 247ms):

- **A background board.** A row leaves. Nothing else moves.
- **The open board.** The row leaves, the selection rail moves, and the whole board view is
  replaced.

The second ran as three independent clocks and read as janky. It now runs through
**`document.startViewTransition`**, with every row and both columns as named units, so the list
closing over the deleted row is the `group` animation rather than an authored keyframe and the
sidebar and board move on one clock.

**The existing hook is already the right shape.** `startViewTransition` requires its callback to
apply the DOM change synchronously, which is exactly what the cache write plus `replaceState`
already do. This is a wrapper, not a rewrite.

Nothing overrides `::view-transition-old/new`. The UA cross-fade is complementary under
`plus-lighter` and therefore invisible where pixels agree; a custom curve is what made unchanged
text visibly fade in v9–v12. `:root` is un-named, since `view-transition-name: root` is a reserved
value that fails to parse.

**§4c is deliberately not reused here, and reconciling them is deferred.** `board-switch-v3` is
adopted and is *directional* — but after a delete the source board no longer exists, so a
directional slide would imply travel that did not happen, which is §4d's own argument. §4c also
uses **zero** calls to the real API; it is a CSS simulation. Re-proving it against
`startViewTransition`, and deciding how a directional switch and a non-directional delete coexist,
is its own session.

**Rollback stays rule 2's licensed exception.** The row returns to the position the hook already
captures as `afterBoardId`, with a fading danger tint — something genuinely un-happened, and that
is the one case where reversal is animated.

## Every prototype defect is logged with the assertion that would catch it

`2026-09-09-phase-5-defect-log.md` carries all 18 found so far: what broke, why, who caught it,
and the test that would fail. **Every one was found by a person looking at the thing**, and every
one passed whatever verification existed at the time.

Its value is not the list — it is the five recurring causes the list exposes, and the last column,
which is honest about the three defects no assertion reaches. A plan implementing one of these
surfaces takes its rows and writes that column as real tests.

## Backend asks — where an endpoint change would buy real UX

Opened 2026-09-09 on the user's instruction to call these out rather than design around them.
Each names what it unblocks and what the frontend does without it. None is required for Phase 5 to
ship; all three were reached by designing into a wall.

| Ask | Unblocks | Without it |
|---|---|---|
| **`taskCount` on the board list DTO** | A per-board figure in the sidebar, on the first frame | No count at all. Anything richer than the name needs `usePrefetchAllBoards`, which resolves *after* the list paints, so every value pops in raggedly board by board |
| **`position` on `createColumn`** | Inserting a column *between* two others — a `+` in the gap | Append only. `createColumnInputSchema` takes `{ boardId, name, color }` and the optimistic write appends at `columns.length`, so insert-at-position is a create followed by a reorder: two round trips, a compound failure mode, and an intermediate state where the column is briefly in the wrong place |
| **A task completion field** | A true done/total ratio anywhere — sidebar, board header, column | No ratio is expressible. `taskFullSchema` has no completion field; `isCompleted` exists only on `subtask`, and a task with no subtasks contributes nothing, so a subtask-derived ratio reads `0/0` on the common case |

The first is the cheapest and the one with the widest reach — it is a single integer per board and
it would also settle whether the sidebar row carries a number at all, which is currently decided
*by the absence of the data* rather than on design grounds.

## Open items added by this session

11. Adopt or reject proposed rules 6–9. Rules 6 and 7 both have a named failure already present in
    the codebase; 8 and 9 are real but less urgent.
12. Decide which of G1–G8 enter Phase 5's scope and which are deferred. G1 is not optional if the
    "reduce, don't remove" policy is to mean anything.
13. `.ringy`'s fixed `190×56` (and `.ring`'s `200×56`) should derive from the card each confirms.
15. Decide whether the drop settle carries a confirmation ring at all — this document specifies
    only "scale and shadow release over ~160ms", and the ring in the drag prototypes was never
    briefed. Note §3 resolved the same question by **removing** its ring; §2 differs in that its
    card carries no border excursion underneath, so removing the ring there leaves no confirmation.
16. **RESOLVED 2026-09-09 — a right-side panel.** Adopted after reviewing §4e v1-v5. Raised
    2026-09-09 off §4b, measured at a 414px journey. A change of surface rather than of animation,
    and the largest open question in the phase — it would replace `TaskDetailModal`'s composition
    and invalidate this document's "the morph needs no baseline change" claim.

    Prototyped as **§4e** (`task-open-v2.html`), all three options at real dimensions — columns
    `280px` (`w-70`), modal `448px` (`w-[min(90vw,28rem)]`), panel `400px`. Three findings the
    prototype produced rather than the argument:

    - **The panel must animate `width`, not `transform`.** A panel is 400px of 13–18px text, and
      rule 4's mechanical form says anything whose content is text animates opacity or layout
      because a transform re-rasterises every glyph mid-flight. So the correct construction is the
      one the sidebar collapse already arrived at independently: animate the width, with a
      **fixed-width inner inside `overflow:hidden`** so the contents cannot reflow as it opens.
      This is the third time that same construction has turned out to be the answer.
    - **The board must scroll, not be clipped.** The first version narrowed the board and let the
      panel cover the rightmost column, which sliced its cards mid-card and looked broken. The
      board scrolls horizontally in the real app and must keep doing so here. Opening a task also
      scrolls its own column into view — and that reveal has to wait for the panel's width
      transition to finish, because scrolling while the container is still narrowing aims at a
      target that is still moving (measured: card overran the panel by 45px before the fix, and
      lands flush at 870/870 after).
    - **Edit becomes inline, and `EditTaskModal` disappears.** A modal opened on top of a detail
      panel is two stacked surfaces where one will do, and it covers the thing it came from. In
      the prototype the title and description are edited in place and subtasks are added, ticked
      and renamed in the panel itself. This needs no new server work: it is exactly the optimistic
      hooks plans 04-18 and 04-19 already build. **Recorded as the recommended answer to "would
      edit still be a modal", not yet adopted** — it deletes a component, so it is a decision.
14. Landing copy remains undecided — unchanged from open item 1, restated because the v4 auth
    prototypes still carry placeholder strings.
