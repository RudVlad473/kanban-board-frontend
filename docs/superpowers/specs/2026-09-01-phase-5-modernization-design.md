# Phase 5 — Visual and Motion Modernization

**Date:** 2026-09-01
**Status:** Design agreed; not yet planned
**Supersedes for the surfaces it touches:** the mock's material treatment (see "The source-of-truth
problem" below)

## Problem

The app looks dated. It is a faithful port of a 2021-era Frontend Mentor mock, and the port is the
problem: two corner radii, a three-step shadow scale whose smallest step is invisible on
`#F4F7FD` and entirely invisible on `#2B2C37`, flat surfaces, and — measured across all of `src`
and `app` — one `transition-colors`, `animate-spin` on loaders, one `animate-pulse`, and eight
`motion-reduce` guards. That is the whole motion layer.

This was anticipated. `SEED-001` (planted 2026-08-11) reserved an animation pass for "once core
board/task CRUD is stable"; Phase 4 is that trigger.

## Scope

**Motion plus surface modernization.** Palette, typography and layout stay as the mock defines
them. What changes is the *material* — how elevation, density, state and movement are expressed —
and the motion layer, which barely exists.

Explicitly out of scope: new palette, new type scale, new layout language. That is a milestone,
not a phase, and it would invalidate the token pipeline's PDF-derived provenance.

## Direction

**Restrained precision** — Linear, Vercel, Raycast. Hairline borders rather than shadows, tight
density, purple spent sparingly as a true accent, motion that is fast and functional.

This resolves an apparent tension in the original ask ("more animations, cool effects, creative
visual approaches"). In a precision language the effects budget does not disappear, it
*concentrates*. There is no ambient glow, gradient mesh or animated border. There are a small
number of moments executed at a level of craft the mock never attempted, and restraint everywhere
else is what makes them land.

## The four rules

These were derived during design review and each one is falsifiable. They matter more than any
individual animation, because they are what keeps the phase coherent as it grows.

### 1. Hover and focus change colour only

Never position, never size, never shadow.

Found by review: a `transform: translateY(-1px)` on card hover. Measured, the neighbours never
moved (`box-sizing: border-box`, constant 1px border, height constant at 73.5px) — but the hovered
card shifting 1px grew the gap above it and shrank the gap below, and the eye reads that as the
card swelling and shoving its neighbours. A perceptual bug is worse than a layout bug because you
cannot point at it.

Colour-only transitions also never invalidate layout or paint on neighbours.

### 2. Geometry is reserved for movement that actually happened

Drag, reorder, insert, delete. Nothing else moves. This is what gives rule 1 its payoff: if
nothing else in the app ever moves, then movement *means something*, and a card lifting under the
cursor during a real drag reads as physics rather than decoration.

**One licensed exception: rollback.** In a rollback something genuinely *un*moved, and animating
the reversal is the only way a user learns their action was undone rather than that the board was
always like this. See "Optimistic state" below.

### 3. State borders are derived per theme from `--border`, never borrowed from fill tokens

`color.purple.500` and `color.red.500` are *fill* colours, darkened specifically to carry white
text at 4.5:1 (see their token descriptions). Borrowing them for a 1px hairline imports a contrast
obligation that does not apply and produces shouting.

A hairline on a resting card has no contrast obligation at all. It is decoration, and every state
it hints at is also carried by something with real affordance — the toast, `aria-busy`, the card's
position.

Measured contrast against each theme's own surface, where the **resting** border sits at 1.20
(light) / 1.33 (dark):

| | light hover | light in-flight | light rolled-back | dark hover | dark in-flight | dark rolled-back |
|---|---|---|---|---|---|---|
| Rejected (brand colours) | 1.58 | 1.94 | **4.93** | 2.16 | **7.15** | 2.81 |
| **Adopted** | 1.34 | 1.44 | 1.81 | 1.69 | 1.68 | 1.63 |

The rejected row is incoherent as well as loud: the same `#C93F3C` reads 4.93 in light and 2.81 in
dark, so the state looked like two different severities depending on theme.

Adopted values:

| State | Light | Dark |
|-------|-------|------|
| rest (`--border`, unchanged) | `#E4EBFA` | `#3E3F4E` |
| hover | `#D6DFEF` | `#4C4E60` |
| in flight | `#D1D6F2` | `#4B4A78` |
| rolled back | `#DCB7C1` | `#6F3F48` |

Derivation: hover is one step from `--border`; in-flight is `--border` blended ~15% toward
`purple.500`; rolled-back is `--border` blended ~30% toward `red.500`. Same step size for all
three states.

### 4. Text never crossfades

It swaps in one frame, or it moves behind a mask so only one string is ever visible.

A card can crossfade because it is a rectangle at every intermediate frame. Two strings cannot —
different widths and different glyphs mean every intermediate frame is noise. Measured on the
rejected board-title crossfade: 8 sampled frames (~160ms) with both strings inked at `dy = 0`,
worst case both at 45% opacity.

Applies to the board name, column names after a rename, count pills, and the subtask `2/3` caption.

## Material

Same palette, same type, same layout. What changes:

- **Hairline border replaces shadow as the primary edge.** Works identically in both themes, which
  the current single diffuse shadow does not. Shadow demoted to a 1px ambient hint
  (`0 1px 2px rgba(16,18,32,.04)`), and dropped entirely in dark mode.
- **Density.** Card padding 14px (from 23px vertical), 10px gutter (from 20px). Roughly 40% more
  cards visible per column.
- **Hover is a real affordance.** Border `#E4EBFA → #D6DFEF`, surface `#FFFFFF → #FAFBFE`, plus a
  2px purple grab-rail on the left edge. 130ms. No geometry (rule 1).
- **Subtask progress becomes glanceable** — a 3px bar plus tabular-numeral `2/3`, replacing the
  prose caption. Note the call site's existing zero-subtask suppression stays as is.
- **Radius scale grows to three steps** — *proposed, not yet reviewed*: 4px controls (unchanged),
  8px cards (unchanged), 12px columns and modals. Buttons stay `rounded-full` per the existing
  token note. Every prototype in this design used the current two-step scale, so this one is an
  inference from the direction rather than something that was looked at; treat it as an open item.

## Drag choreography

What is already good and is **not** being replaced: `useSortable`'s default transition is passed
through, so neighbours already animate; the insertion bar is already drawn in the gutter so it
does not wait on reflow; motion is dropped entirely (not shortened) under
`prefers-reduced-motion`; the keyboard drag path is carefully built and its two
`comment-length-exempt` dnd-kit notes must survive this phase untouched.

Four changes:

1. **`DragOverlay`.** The card leaves the list and is carried above it. Today it stays in place at
   `opacity-50` and moves by transform, so the user is smearing a translucent copy rather than
   holding a card.
2. **Lift: `scale(1.03)` plus a real shadow. No rotation.** A tilt was prototyped and rejected —
   it is soft-depth vocabulary and does not belong in a precision language.
3. **Source slot collapses** to a dashed ghost over ~180ms, so the column visibly makes room.
4. **Drop settles** — scale and shadow release over ~160ms on a decelerate curve
   (`cubic-bezier(.2,0,0,1)`) instead of the transform snapping. This is the single largest
   perceived-quality change in the phase.

## Optimistic state

`useMoveTask` already reads pending moves back from in-flight mutation variables and folds them
onto the server columns (the TanStack "via the UI" pattern adopted 2026-09-01). The pending state
is therefore already available to render — it simply is not rendered. `isMoving` and
`isReordering` are threaded from `board-view.tsx` down into `TaskCard`/`SortableColumn` and their
entire visual effect is `aria-busy` plus disabling the handle. Both are invisible.

| Moment | Treatment |
|--------|-----------|
| In flight | Border tint to the in-flight value (rule 3). Colour only. |
| Settled | Tint releases over ~200ms; single confirmation ring pulse. |
| Rolled back | Card **travels back** along the reverse path (~220ms), border flashes the rolled-back value and decays over ~500ms. Existing toast unchanged. |

**Decided, flag on review:** the 2px indeterminate "wire" along the card's bottom edge is
**dropped**. Most of these PATCHes resolve in under 200ms, so it would usually flash and vanish,
which reads worse than nothing. The border tint carries the state alone.

The rollback is rule 2's licensed exception and is the highest-value item in this section: today
the card vanishes from where the user put it and reappears elsewhere in the same frame, with the
toast as the only evidence a move was attempted.

## Transitions

### Verified constraint

```
react 19.2.8   'ViewTransition' in React            = false
               'unstable_ViewTransition' in React    = false
next 16.3.0    no `viewTransition` key in the config schema
               (present only inside bundled react-dom-experimental)
```

React's `<ViewTransition>` route morph would require the React experimental channel plus a Next
canary. For a repo with pinned dependencies, required CI status checks and committed visual
baselines, that is a foundation change disguised as polish. **Rejected.** This needs its own ADR
so a future reader does not re-open it.

### Card → task detail: native morph

Task detail is local state, not a route, so this is a same-document
`document.startViewTransition()` and needs no framework support.

Verified against the real API with a 12-task scrollable column: **the column does not reflow.**
The card's box is never mutated; the browser animates a snapshot of the card's rect toward a
snapshot of the modal's rect in the view-transition overlay layer above the page.

```
open  (card #3)                scrollHeight 918→918  scrollTop 0→0    card#9 y 896→896  identical
close (after scrolling to 588) scrollHeight 918→918  scrollTop 588→588 card#9 y 308→308  identical
```

This is precisely why the native API is right and a hand-rolled FLIP morph is wrong — a
hand-rolled one really would have to pull the card out of flow and leave a placeholder.

Two guards, both required:

- **Name uniqueness.** `view-transition-name` must be unique per document state, so it is applied
  to the *clicked* card only, never to every card. Naming all of them breaks the transition and
  costs real snapshot time.
- **Closing after a scroll.** If the column is scrolled while the modal is open, the card's rect
  may be off-screen at close and the morph would animate toward nothing. Check the card's rect
  against the list viewport at close time and skip the morph if not visible, falling back to the
  plain fade. Verified working.

Duration 320ms, `cubic-bezier(.2,0,0,1)`. Feature-detected: where unsupported the modal opens
exactly as it does today.

### Board → board: directional + streaming

The board is an RSC fetch behind Suspense, so there is a real wait whose length we do not control.
Animating *over* it means the animation and the wait fight each other — on a fast connection the
flourish is gratuitous, on a slow one it finishes and leaves the user staring at nothing.

So the transition **is** the load: a Suspense boundary per column, skeletons holding the column
shape, and each column landing as its data arrives, staggered ~180ms apart, entering *from* the
direction navigated (down the sidebar → columns rise from below; up → from above). Plain CSS enter
animation keyed on `boardId`. No experimental dependency.

**Board title: masked slide.** The title well clips; the old string leaves and the new arrives
from the navigated direction, so the two are never in the same place (rule 4). Chosen over an
instant swap to keep the header part of the same gesture as the columns, accepting ~180ms of
movement on a value that was not actually pending.

## Entry, empty and loading states

Agreed in scope but **not yet visually reviewed** — this is the one section of the phase with no
prototype behind it, and it should get one before planning:

- Column and card entry stagger on first board load (shares the mechanism with the board→board
  transition above).
- Skeletons that match final layout rather than generic rows.
- Designed empty column and empty board states.

## Reduced motion

Everything above is dropped, not shortened, under `prefers-reduced-motion: reduce` — matching the
existing `useMediaQuery` pattern in `task-card.tsx` and `sortable-column.tsx`. View transitions
additionally need:

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) {
    animation-duration: 0s !important;
  }
}
```

## The source-of-truth problem

This is the phase's biggest non-visual risk and it needs an ADR before any implementation.

The repo's entire notion of "correct UI" is anchored to `docs/kanban-task-management-web-app.pdf`.
`CLAUDE.md` mandates comparing every surface against it; there are Playwright screenshot baselines,
per-phase `UI-SPEC.md` contracts, and token descriptions citing PDF page numbers and DPI math.

Phase 5 is a deliberate departure from that anchor. Without re-pointing it explicitly, every gate
in the repo will read these improvements as regressions, and the phase will be spent re-baselining
screenshots and arguing with its own conventions.

The ADR should record: for the surfaces Phase 5 touches, the mock is demoted to a **layout and
brand** reference; material and motion are governed by this document. Palette, typography and
layout remain mock-governed, so the existing comparison discipline still applies to them.

Baseline impact:

- **Material changes rewrite visual baselines wholesale.** Expected, and must be done with
  `CI=1` locally, since `playwright.config.ts` sets `ignoreSnapshots: !process.env.CI` (ADR
  tech/0008) and an off-CI run silently compares nothing.
- **The card→modal morph needs no baseline change.** Verified: it starts at the card's exact rect
  and ends at the identical rect today's modal occupies. Only the 300ms between them differs.

## Open items for planning

1. Prototype the entry / empty / loading states before they are planned.
2. Write the two ADRs (source-of-truth re-pointing; rejection of experimental React for route
   transitions).
3. Confirm the dropped "wire" decision under Optimistic state.
