# Phase 5 — Visual and Motion Modernization

**Date:** 2026-09-01
**Status:** Design agreed; not yet planned
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

## The four rules

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

320ms, `cubic-bezier(.2,0,0,1)`, feature-detected — where unsupported the modal opens as today.

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

## Surfaces not yet examined

Designed in this session: board material, drag, optimistic states, transitions, landing, auth, form,
toast, loading and empty states. **Never opened**, and therefore carrying no decisions yet:

### Sidebar (`src/components/layout/sidebar/sidebar.tsx`, `board-list.tsx`)

On screen 100% of the time, and the largest uncovered geometric change in the app.

- **Collapse/expand teleports.** `w-75` panel to a `fixed bottom-8 left-0` icon button, with no
  transition on either direction. This is rule-2-licensed movement — something genuinely moved — and
  it is the single most valuable motion still unspecified.
- The collapsed trigger is a fifth entry on the UI-SPEC accent-reservation list; any restyling must
  keep that reservation intact.
- Active-board indication is `isSelected` on `BoardCard`, changing with no transition.
- `Hide Sidebar` is `rounded-full` and becomes 4px under the app-wide button decision.
- The board list is the panel's only scroll region and has no overflow affordance.

### Dashboard header (`src/components/layout/dashboard-header/dashboard-header.tsx`)

Not read. Note it is under active Phase 4 modification at time of writing.

### Dropdown and Menu primitives

`dropdown.tsx` and `menu.tsx` have no enter/exit transition. Base UI supplies the state attributes
to drive one; the material rules already cover their surface.

### Task detail modal — blocked

**It does not exist yet.** `onOpenTaskDetail` is an optional prop on `board-view.tsx` with no
caller; the view is delivered by plan `04-16`. The card→modal morph specified above therefore has
no target until Phase 4 reaches that plan.

## State changes with no visual consequence

The filter, which does the work that brainstorming effects does not: *enumerate every state change
the user causes that currently paints nothing.* Each qualifies under rule 2 by construction, because
the user caused it.

| Change | Status | Note |
|--------|--------|------|
| Sidebar collapse / expand | **built, instant** | Highest value; see above |
| Card create | **built, instant** | Appears fully formed |
| Board switch (active indicator) | **built, instant** | |
| Column scrolled past overflow | **built, no affordance** | Nothing indicates more content below |
| Column rename commit | **built, instant** | |
| Subtask check | plan `04-17` | Tick, `2/3` caption and progress bar all jump |
| Task delete | plan `04-20` | Should collapse — something genuinely moved |
| Subtask add / rename / delete | plan `04-19` | |
| Task edit save | plan `04-18` | |

**The sequencing consequence is the important part.** Most of this list is not yet written. Phase 5
can either retrofit motion onto code Phase 4 is about to produce, or Phase 4 can build it correctly
once. Retrofitting is the more expensive of the two and touches the same files twice. This wants a
decision before Phase 5 is planned, not during it.

## Reduced motion

**Open decision, and a more consequential one than it looks.** The current policy, documented in
`task-card.tsx`, is that motion is *"dropped entirely under reduce-motion rather than shortened."*
Phase 5's entire value is motion, so under that policy a reduced-motion user receives **none of this
phase** — no drag choreography, no settle, no rollback reversal, no card morph, no staggered load.
The optimistic-state work in particular reverts to exactly the defect it was written to fix
(`isMoving` painting nothing).

Discovered 2026-09-01 the hard way: a prototype screen that honoured the setting appeared completely
broken on the reviewer's own machine, because Windows had animations disabled. The person driving
this phase is in the population it is switched off for.

**Adopted provisionally as "reduce, don't remove" — assumed, not confirmed by the user.** Drop large movement — drag travel, the card→modal morph,
staggers, directional slides — but keep short (≤120ms) opacity and colour changes, so the pending
tint, the settle confirmation, the skeleton→content crossfade and the rollback (as a fade rather
than a journey) all survive. That is the mainstream reading of the spec: the setting asks for less
vestibular motion, not a static app. Cost: a second set of behaviours to define and test per
animation, rather than one guard.

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
3. **Confirm the reduced-motion policy.** "Reduce, don't remove" is currently an *assumption*, not
   a decision. It changes the acceptance criteria of every animation in the phase, so it wants an
   explicit yes before those criteria are written into plans.
4. Confirm the 12px columns/modals radius, which was inferred rather than reviewed.
5. Look at buttons-at-4px inside inputs-at-6px during planning.
6. Write three ADRs: source-of-truth re-pointing; rejection of experimental React for route
   transitions; frontend-invented password policy.
7. Confirm the dropped "wire" under Optimistic state.
8. These auth screens need their own UI-SPEC — Phase 1's is what produced the current state.
