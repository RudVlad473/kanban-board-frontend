# Phase 5 — handover ledger

**Date:** 2026-09-10
**Status:** Living. Update it in the same commit that adopts, supersedes or retires a prototype.
**Companions:** `2026-09-01-phase-5-modernization-design.md` (the reasoning),
`2026-09-09-phase-5-crud-coverage-matrix.md` (what is and is not covered),
`2026-09-09-phase-5-defect-log.md` (88 rows: what broke and the assertion that catches it),
`2026-09-10-prototype-handover-rubric.md` (the ten checks before a human sees a prototype).

## Why this exists

The phase produced **108 HTML prototypes across two brainstorm sessions** (101 in S1, 7 in S2), of
which **26 are adopted** and the rest are superseded revisions of them. The decisions behind them are spread over
a 1900-line design document written across three sessions, an 88-row defect log, a coverage matrix
and a prototype index — and in four places those sources **disagree**, because a later session
reversed an earlier decision without editing the paragraph that stated it. Two examples, both real:
the design document's Typography section still selects **Inter** while a later section selects
**Manrope**; the "State changes" table still calls task delete **non-optimistic** while the shipped
hook is optimistic and the prototype was rebuilt to match.

The next phase should not have to re-derive any of that. **This file is the single ordered list of
what to build, what each one has already decided, and what has been measured to break.** Read a
row, open the one file it names, implement it. Nothing else in the phase's paperwork needs to be
open to do the work.

## How to read a row

- **Adopted mock** is the *only* revision to open. Every earlier number in the same chain is
  superseded and kept for history — do not diff against them, and do not treat a value found in
  `v3` as current because `v4` did not repeat it.
- **Ships into** is the file the Storybook story is written against. A row naming two files is one
  decision landing in both, not two decisions.
- **Signed off** means the user watched it and said so. **Adopted** means it is the current
  revision and its defects are fixed, but no human has approved it.
- Paths are relative to `.superpowers/brainstorm/`. `S1` = `23940-1788251793/content/`,
  `S2` = `316005-1788260529/content/`.

---

## A. The adopted set

| # | Surface | Adopted mock | Ships into | Status |
|---|---|---|---|---|
| A1 | Card material — hairline border, density, hover rail | `S1/material-v2` | `task-card.tsx`, tokens | adopted |
| A2 | Buttons — press, pending, disabled | `S1/buttons-v4` | `button-variants.ts`, `button.tsx`, `icon-button.tsx` | **signed off** |
| A3 | Typeface on board surfaces | `S1/type-board` | `src/styles/fonts.css`, `tokens/typography.tokens.json` | **signed off** (closes G8) |
| A4 | State borders, per theme | `S1/borders-v2` | `tokens/color.tokens.json` | adopted |
| A5 | Drag choreography — lift, slot collapse, drop settle | `S1/drag-v3` | `task-card.tsx`, `sortable-column.tsx` | adopted |
| A6 | Optimistic state — in flight, settled, rolled back | `S1/optimistic-v5` | `task-card.tsx`, `sortable-column.tsx` | adopted |
| A7 | Card → task detail morph | `S1/morph-real` | `board-view.tsx`, `task-detail-modal.tsx` | adopted |
| A8 | Board → board switch | `S1/board-switch-v3` | `board-screen.tsx` | adopted — **§4c reconciliation open** |
| A9 | Board title well | `S1/title`, `S2/title-v2` | `dashboard-header.tsx` | adopted |
| A10 | Task panel — open, and panel A → panel B | `S1/task-open-v17` | `task-detail-modal.tsx` | **signed off** |
| A11 | Sidebar collapse / expand | `S2/sidebar` | `sidebar.tsx` | adopted |
| A12 | Dashboard header — disabled snap, title mask | `S2/header` | `dashboard-header.tsx`, `add-task-button.tsx` | adopted |
| A13 | Column CRUD — create · rename · delete · reorder | `S1/column-crud-v17` | `column-header.tsx`, `sortable-column.tsx`, `add-column-placeholder.tsx` | **signed off** (closes G9) |
| A14 | Board rename + delete | `S1/board-edit-v2` | `board-card.tsx`, `board-list.tsx`, `delete-board-confirm.tsx` | **signed off** |
| A15 | Sidebar board list + board create | `S1/sidebar-boards-v4` | `board-list.tsx`, `board-card.tsx` | **signed off** |
| A16 | Dropdown & Menu enter/exit | `S2/menu-v2` | `menu.tsx`, `dropdown.tsx` | adopted |
| A17 | Modal enter / exit | `S1/modal-motion-v4` | `modal.tsx` | **signed off** (closes G2) |
| A18 | Toast accent stripe | `S1/toast-v3` | `toast-variants.ts`, `toast.tsx` | adopted |
| A19 | Toast enter / exit + the queue window | `S1/toast-motion-v1` | `toast.tsx` | **signed off** (closes G3) |
| A20 | Task create | `S1/task-create-v4` | `add-task-modal.tsx` | **signed off** |
| A21 | Task delete — collapse and restore | `S1/task-delete-v1` | `delete-task-confirm.tsx`, `task-card.tsx` | **signed off** (closes G6) |
| A22 | Subtask create · rename · delete | `S1/subtask-crud-v2` | `subtask-checklist-row.tsx`, `subtask-editor-row.tsx` | **signed off** (closes G5) |
| A23 | Auth — the form itself | `S1/form-v2` | `auth-card.tsx`, `sign-in-form.tsx`, `sign-up-form.tsx` | adopted — **opens on sign-up**, see W5 |
| A23b | Auth — which screen the root leads to | `S1/auth-v4` | `app/page.tsx`, `proxy.ts` | adopted |
| A24 | Form controls — focus, caps lock, button shape | `S1/controls-v3` | `text-field.tsx`, `textarea.tsx` | adopted |
| A25 | Password rules | `S1/pwrules-v2` | `sign-up-form.tsx` | adopted |
| A27 | Landing page | `S1/landing-v2` | `app/page.tsx` | adopted — three geometry defects fixed 2026-09-10 |
| A26 | Skeleton → content handoff, per column | `S1/load2-v2`, `S1/handoff-v4` | `board-view-skeleton.tsx`, `skeleton-row.tsx`, `board-list-skeleton.tsx` | adopted |

**Rejected outright, do not resurrect:** parallax (`S1/parallax*` — no causal grounding), the
artificial per-column stagger (180/60/35ms, all rejected), the 72px collapsed icon rail, the
directional panel-to-panel swap, React's experimental `<ViewTransition>` route morph, the 2px
indeterminate "wire" under optimistic state, and the password strength meter.

**Superseded chains — the numbers to ignore:** `task-open` v1–v16, `column-crud` v1–v16,
`column-reorder` v1–v3 (folded into A13), `optimistic` v1–v4, `buttons` v1–v3, `auth` v1–v3,
`sidebar-boards` v1–v3, `handoff` v1–v3, `toast` v1–v2, `modal-motion` v1–v3, `task-create` v1–v3,
`board-switch` v1–v2, `drag` v1–v2, `material` v1, `subtask-crud` v1, `board-edit` v1, `borders` v1,
`controls` v1–v2, `pwrules` v1, `load2` v1, `form` v1, `landing` v1.

---

## W. The build order

**Read this before planning a wave.** Table A is organised by *surface*, which is how the design
was reviewed and is the wrong order to build in: it puts the task-create modal beside the button
treatment that modal is made of. The order below is by *dependency*, and it exists because the
duplication in table A is real — **most rows do not own the components they show.**

### Owns vs borrows — why table A looks like it repeats itself

| A row shows a… | Owned by | Everyone else |
|---|---|---|
| Button, in any state | **A2** | A13, A14, A15, A17, A20, A21, A22, A23, A27 all render one and decide nothing about it |
| Modal shell and its motion | **A17** | A14 (confirm), A20 (create), A21 (confirm) — each owns only what happens *after* submit |
| Toast | **A18** (material) + **A19** (motion) | Every failing mutation raises one; none of them decides how it looks or moves |
| Text field / focus ring | **A24** | A13, A14, A15, A20, A22, A23 all put text in one |
| Card material | **A1** | A5, A6, A10, A21 all animate a card whose material is A1's |
| A view transition | **A7**, **A10**, **A14** | Three separate uses of one API; the *rules* (C15–C17) are shared |

So a row like **A20 Task create** owns exactly one thing — the submit → card-arrival on one frame
— and borrows the button, the modal, the text field and the toast. Building A20 before A2 and A17
means building all four, badly, and then rebuilding them.

### The waves

Each wave is buildable once its `depends on` is green. `W5` is independent of the board entirely
and can run beside `W2`–`W4`.

| Wave | Build | Satisfies | Depends on |
|---|---|---|---|
| **W0** | **Foundation.** Manrope self-hosted + all eight `typography.tokens.json` entries; the radius scale; per-theme state-border tokens; the three easing tokens as CSS custom properties in one place; the reduced-motion utility every later wave uses | B1–B8, A3, A4 | — |
| **W1.1** | `button`, `icon-button` — press, pending, disabled, 4px | A2 | W0 |
| **W1.2** | `text-field`, `textarea`, `checkbox`, `switch` — the 2px resting focus border, caps lock, error | A24 | W0 |
| **W1.3** | `modal` — enter/exit, the three-part column, `inset-0` centring | A17 | W0, W1.1 |
| **W1.4** | `toast` — stripe geometry, two exits, the queue window | A18, A19 | W0 |
| **W1.5** | `menu`, `dropdown` — 70/120 opacity only | A16 | W0 |
| **W1.6** | `skeleton-row` — real card material, one sweep per column | part of A26 | W0 |
| **W2.1** | `task-card` material — hairline, density, hover rail | A1 | W0 |
| **W2.2** | Drag choreography — overlay, lift, slot collapse, drop settle | A5 | W2.1 |
| **W2.3** | Optimistic state — tint, settle, rollback travel | A6 | W2.1 |
| **W3.1** | Sidebar collapse / expand | A11 | W0, W1.1 |
| **W3.2** | Dashboard header — disabled trio, title well | A12, A9 | W0, W1.1 |
| **W3.3** | Skeleton → content handoff | A26 | W1.6, W3.2 |
| **W4.1** | Sidebar board list + board create | A15 | W1.1, W1.3, W3.1 |
| **W4.2** | Board rename + delete | A14 | W4.1, W1.5, W1.4 |
| **W4.3** | Column CRUD — create, rename, delete, reorder | A13 | W1.1, W1.3, W1.5, W2.2 |
| **W4.4** | Task create | A20 | W1.1, W1.2, W1.3, W1.4 |
| **W4.5** | Task delete — collapse and restore | A21 | W1.3, W1.4, W2.1 |
| **W4.6** | Task panel — open, and panel A → panel B | A10 | W2.1, W1.2 |
| **W4.7** | Subtask create, rename, delete | A22 | W4.6 |
| **W4.8** | Card → panel morph | A7 | W4.6 |
| **W4.9** | Board → board switch | A8 | W3.2, W3.3, **and the §4c reconciliation** |
| **W5.1** | Auth form — **opens on sign-up** — and the password rules | A23, A25 | W1.1, W1.2 |
| **W5.2** | Landing page | A27, A23b | W1.1 |
| **W6** | Cross-cutting, last: reduced-motion variants per surface, the overflow affordance, the theme switch | G1, G4, G7 | every wave it varies |

**W0 is a wave on its own for one reason: it rewrites every visual baseline in the app.** Doing it
first means one re-record; doing it anywhere else means re-recording after each wave that lands
before it. Run `pnpm build-storybook` and then `CI=1 pnpm test:visual --update-snapshots` once, at
the end of W0 — off-CI the comparison is a silent no-op (ADR tech/0008).

**Three components have no ledger row at all and are in W1.2 by inheritance:** `checkbox`, `switch`
and `skeleton-row` are drawn by prototypes that were reviewed for something else. They inherit A24's
focus rule and A1's material; if that is not enough, they need a prototype, not an invention at
build time.

---

## B. Cross-cutting decisions — true of every row above

| # | Decision | Value | Why it is here rather than in a row |
|---|---|---|---|
| B1 | Easing — standard | `--e: cubic-bezier(.2, 0, 0, 1)` | Every surface in the phase; the one curve for movement that continues |
| B2 | Easing — enter | `--enter: cubic-bezier(.16, 1, .3, 1)` | Overlays arriving (A17, A19, A20) |
| B3 | Easing — exit | `--exit: cubic-bezier(.5, 0, .9, .4)` | Overlays leaving; an exit is faster and front-loaded, never the enter reversed |
| B4 | Button radius | **4px**, replacing `rounded-full` | One line in `button-variants.ts`, app-wide. The pill is the loudest dated tell in the UI |
| B5 | Radius scale | inputs/dropdowns/toast **6px**, cards **8px**, columns/modals **12px** | 12px is *inferred, never reviewed* — see open items |
| B6 | Focus | one **2px border present at rest**, only its colour changes | No ring, no halo, so there is nothing to double. Rest border `#DCE3F2` |
| B7 | Typeface | **Manrope**, superseding Inter | Every candidate has real tabular figures including the incumbent, so only small-size legibility ever selected anything |
| B8 | Reduced motion | **reduce, don't remove** — drop travel, keep ≤120ms opacity and colour | The reviewer's own machine has animations off; drop-everything voids the phase for them |
| B9 | Skeleton handoff | stagger **0ms**, out **70ms**, in **110ms**, settled **180ms** | Overlap impossible by construction; an artificial stagger is decoration imitating latency |
| B10 | Menu/dropdown | **70ms in / 120ms out**, `cubic-bezier(0, .85, .25, 1)`, opacity only | Legible at 55ms. No scale: it resamples every glyph and then drops the layer |
| B11 | Colour transition | **130ms** | The one already in the app; hover and disabled both ride it rather than adding a property |

### The five rules, restated as build constraints

1. **Hover and focus change colour only** — never geometry. A hover that moves the top face
   un-hovers itself.
2. **Geometry is reserved for movement that actually happened.** Rollback is the one licensed
   exception, because something genuinely un-happened.
3. **State borders are derived per theme from `--border`**, never borrowed from a fill token.
4. **Text never crossfades.** Replace it in one frame, or slide it behind a mask. Measured:
   a crossfade inks both strings in the same place for 9 frames.
5. **Animation never gates interaction** — a control is hit-testable from frame 0 even at opacity 0.
   **Exactly two exceptions, both `startViewTransition()`** (card → panel, panel A → panel B),
   which blocks pointer input for its full duration by construction.

---

## C. The decision ledger

One row per decision that is expensive to rediscover. **"Held by"** is what stops it drifting — an
existing test where one exists, and the assertion to write where one does not.

| # | Row | Decision | Held by |
|---|---|---|---|
| C1 | A1 | Hairline border replaces shadow as the primary edge; shadow demoted to `0 1px 2px rgba(16,18,32,.04)` and **dropped entirely in dark mode** | Visual baselines, both themes |
| C2 | A1 | Card padding 14px, gutter 10px — ~40% more cards per column | Visual baseline |
| C3 | A1 | Hover is border + surface + a 2px purple left grab-rail, 130ms, **no geometry** | Screenshot rest vs hover over a clip including the rail; assert max channel delta ≥ 8 |
| C4 | A2 | Press is `translate: 0 2px` with the bottom edge collapsing to `0`; **pending and disabled hold the pressed geometry** | `getAnimations({subtree:true})` on hover returns exactly `[{opacity, ::after}]` |
| C5 | A2 | Hover is a **flat `::after` wash at `opacity: 0 → 1`**, never a fill change | Defect log #66, #70 — a darkened saturated fill reads as dirt; an animated hard edge is the jerk |
| C6 | A2 | `danger` washes with **ink, not light** (3.54:1 → 3.27:1 under white) | Contrast assertion per variant |
| C7 | A2 | `box-shadow` lists must be **equal length in every state** or the transition cuts | Defect log; assert the shadow count matches across rest/hover/active |
| C8 | A5 | Lift is `scale(1.03)` + real shadow, **no rotation**; slot collapses over ~180ms; drop settles over ~160ms on `--e` | Rule-5 hit test: the card is grabbable from frame 1 of its settle |
| C9 | A6 | In flight = border tint only; settled = tint release ~200ms + one ring pulse; rolled back = travel back ~220ms + tint decay ~500ms | Defect log #66-adjacent; assert the ring is not drawn twice (v5's fix) |
| C10 | A8 | Board → board is directional **and is a CSS simulation — zero calls to the real API** | Must be re-proven against `startViewTransition` before shipping |
| C11 | A9/A12 | A **rename swaps in one frame**; only a **switch** slides. The title well already is the mask — `overflow:hidden`, ellipsis, nowrap, 36px | Frames-with-both-strings-inked = 0 for both, 9 for the rejected crossfade |
| C12 | A10 | Docking is **overlay; the board never moves**, and `scrollIntoView` is off | Board scroll travel = 0px from a mid-scroll start |
| C13 | A10 | Panel A → panel B is `startViewTransition()`, adopted **over this document's own measured objection** (320–352ms vs 0ms) on the judgement that nobody clicks that fast. **Revisit if keyboard task-to-task navigation is ever added** | Recorded as a decision with its cost; no test can hold a judgement |
| C14 | A10 | The layout must **offer a geometry delta** — `width: fit-content`, and `.tp-head .tp-t { flex: 1 }` silently defeats it because flex sizing beats `width` | Title width range 121–277px must survive into the rendered box |
| C15 | A10 | **Do not override `::view-transition-old/new` except on slots whose content differs.** The UA pairs them under `plus-lighter`, so an unchanged slot is invisible by construction | Measured wash: 8.74 with custom curves vs 1.11 with the default |
| C16 | A10 | Granularity is capped by the DOM: 17 named units, of which only 8 animate on a swap. An ancestor's change-detection must **exclude its named descendants** | Wash 42.16 → 0.81 on an unchanged checkbox after the split |
| C17 | A10 | **Anything that rewrites `textContent` deletes named child spans.** A `view-transition-name` is a structural dependency of the code that updates it | Assert the counter's digit spans still exist after a toggle |
| C18 | A11 | Panel closes like a door: width `300 → 0` over **220ms** on `--e`, with a **fixed-width inner inside `overflow: hidden`** | Without the fixed inner the caption reflows 66px → 102px and wraps |
| C19 | A11 | The expand control is **in final position and live from frame 0**, only opacity animates | First hittable at 1ms, 0 dead frames — against 245ms and 11 dead frames as first designed |
| C20 | A12 | Disabled is **its own token trio** (`--bg-app` / `--text-muted` / `--border`), not the brand colour faded — so it rides the existing 130ms colour transition | Background walks 9 distinct values with opacity never leaving 1 |
| C21 | A12 | **No scroll-elevation on the header.** Nothing ever scrolls under it (`main.scrollHeight === main.clientHeight`) | Recorded because silence reads as coverage |
| C22 | A13/A14 | Inline `contenteditable` rename **replaces the modal**; `EditBoardModal` and `EditTaskModal` are **deleted**. Column rename follows, it does not diverge | Three of four rename flows now share one construction |
| C23 | A14 | Board delete runs the row, the rail and the board swap through **one `startViewTransition`**, because `use-delete-board` already applies the DOM change synchronously. This is a wrapper, not a rewrite | Three independent clocks read as janky |
| C24 | A14 | `:root` stays **un-named** — `view-transition-name: root` is a reserved value that fails to parse | — |
| C25 | A15 | Rows 36px / 2px apart, radius 4px, selected = 2px purple left rail + tint + weight, monogram hue hashed from **`board.id`, never the index** | 519px → 383px on an eight-board list; deleting renumbers indices and repaints every survivor |
| C26 | A15 | **No per-board count.** `taskFullSchema` has no completion field | A `5/12` invents a notion of done the data model cannot express |
| C27 | A16 | Base UI needs **zero lines of exit state** — it stamps `data-closed`/`data-ending-style` and waits for the CSS transition before unmounting (200ms transition kept the node alive 242ms) | Do not add `keepMounted` or an exit state machine |
| C28 | A16 | `Select` has **no `data-instant`**, so `Dropdown` cannot get the keyboard suppression `Menu` gets | Anyone writing a shared helper will assume they behave alike |
| C29 | A16 | Base UI reads `nativeEvent.detail === 0` as keyboard activation, so **a programmatic `el.click()` will not animate** | Any test asserting a popup transition must drive a real pointer event |
| C30 | A17 | Enter: `opacity 90ms linear`, and `translate 18px→0` / `scale .96→1` / `box-shadow` all **300ms `--enter`**. Backdrop `opacity 220ms` + `blur(0)→blur(1.5px) 260ms`. Exit: **130ms `--exit` on popup and backdrop, one clock** | `data-starting-style` is released on the **second** rAF, not the first |
| C31 | A17 | The popup is a **three-part column, not one scroll region** — title and footer pinned, only the collection scrolls. `min-height: 0` on the scroller is load-bearing | Scroll to the end and assert title and footer are still inside the popup's box |
| C32 | A17 | `modal.tsx` centres with **`fixed inset-0` + auto margins**, so `translate` is free for motion | `modal.test.tsx`: `transform: none`, `translate: none`, centred box. Measured 224.8px → 8px travel |
| C33 | A17 | The reduced variant is **designed, not deleted** — opacity survives, `translate`/`scale` go, and it must **not** become `transition: none` or Base UI unmounts in ~18ms and the popup vanishes mid-scrim | The shape every other G1 variant should follow |
| C34 | A18 | Inset pill stripe: `left: 6px`, width 3px, radius 2px, 12px clear top and bottom, 7px to text — content inset symmetric **16 / 16** | Today's 4px `border-l` reserves its width even when transparent, giving every toast 20 / 16 |
| C35 | A19 | Two exits, not one: **timeout fades** (`opacity 200ms linear`); **dismiss leaves** (`opacity` + `translate 0 10px` + `scale .98`, 130ms `--exit`) | A dismissed toast and an expired one did not happen for the same reason |
| C36 | A19 | `limit` is a **window over a queue, not a cull** — Base UI keeps limited toasts mounted, promotes newest-first, and skips anything already `ending`, so a promotion overlaps the departure. A queued toast's timer does not run | Raise 8, close one at a time, assert all 8 surface in order |
| C37 | A19 | The pile stays **silent about the queue** — no "+N waiting" row | What Base UI ships, and what was approved |
| C38 | A19 | The timer **pauses on hover and focus**, and `startTimer` must be idempotent and `held`-aware | Defect log #84, reintroduced once as #87 by a refactor |
| C39 | A20/A21 | Modal exit and the list mutation run on **one frame**, not sequenced | A second clock is what read as janky |
| C40 | A21 | Delete is **optimistic** — the shipped `use-delete-task.ts` writes the cache in `onMutate` and restores in `onError`. The design doc's "never optimistic" paragraph is **stale** | Defect log #78 |
| C41 | A21 | The row collapses via a **wrapper height → 0**, never a FLIP: a FLIP leaves the departing card painted while survivors travel through it | Overlapping frames 8 → 0; intersect each card with its clipping wrapper |
| C42 | A21 | Restore has **three anchor cases**: `afterTaskId === null` → prepend, anchor found → after it, **anchor missing → append** | `withTaskRestore`, `model.ts:195` |
| C43 | A21/A22 | Leaving sequences contents (90ms linear) **then** the box (200ms `--e`); entering does the box first, contents delayed (`opacity 110ms linear 90ms`). One clock guillotines the content | Measured: box at 9px while opacity was 0.58 |
| C44 | A22 | A done subtask strikes through via `background-size` / `text-decoration-color` over 280ms, and sinks via `translate` 240ms — never a re-append, which cancels running transitions | Defect log #54: DOM order stopped being visual order once reordering moved to flex `order` |
| C45 | A26 | Content's `animation-delay` is `columnIndex × stagger + skeletonOut`, so **overlap is impossible by construction** | Worst simultaneous visibility 0.000, against 1.00 for the whole-layer crossfade |
| C46 | A26 | **No rising `translateY` on entry** — content offset from the skeleton it replaced was the other half of the ghosting | — |
| C47 | all | A spinner needs a **deferred threshold *and* a minimum-display floor** — a threshold alone moves the flash | At exactly 400ms of server time the bar showed 3 frames peaking at opacity 0.94 |
| C48 | all | `height` cannot interpolate from `auto`: the start value must be seeded inline, which commits you to setting the end value inline too | An inline value outranks any class |
| C49 | all | A reduced-motion block must **repeat the full selector** or it loses on specificity to `.animating.entering` | Defect log #80 — masked by a rig's own `body.force-reduced` |
| C51 | A23b | **The root leads with Create Account, and `/` resolves to `/register`.** This supersedes `auth-v4`'s own recorded option — *"delete it, redirect `/` to `/login`"* — decided by the user 2026-09-10 | `app/page.tsx` still offers Sign In first; `e2e/auth.e2e.spec.ts` is where the redirect is pinned |
| C52 | A23 | The auth form **opens on sign-up**; the sign-in variant is the toggle. The alt line under the submit is part of the swap, since it is the only route to the other screen | `form-v2` round-trips both ways: heading, submit label, alt line, display-name field, meter, `autocomplete` and the password hint all follow |
| C53 | A27 | The landing board panel is **three columns that fit inside the backdrop**, not four with the fourth under a fade. A column chopped at the frame's own border reads as broken, which is what was reported | Board overflow ≤ 0 against the right pane |
| C54 | A27 | Every mock card stays **single-line**. The gap-open and gap-close shifts are a hard-coded 47px, which is one card's height — a card that wraps makes the flyer land on top of its neighbour | Zero cards over 41px tall, and zero overlapping pairs across 11 samples of the 7s loop |
| C55 | A27 | The flyer's travel is `var(--pitch)`, never a literal | A hard-coded 136px landed 20px wide of the target column the moment the column width changed |
| C50 | all | Read `getAnimations()` **inside** the rAF that adds the class, never before it | Defect log #73: read early it returns `[]`, the completion callback fires immediately, and followers are stranded |

---

## D. What this ledger does **not** cover

Everything below is open. None of it has an adopted mock, so a Storybook story written against it
would be inventing the design at build time.

| Gap | What is missing | Cheapest path |
|---|---|---|
| **G1** | Reduced-motion variants, every animation — **the one that voids the phase for part of its audience**. Only 15 of 44 prototypes carry a guard, and the reduced variant is designed nowhere | C33 is the one worked example; apply its shape surface by surface |
| **G4** | Overflow affordance, columns and board list | `src/hooks/use-overflow-indicator.ts` **already exists** and is consumed by `dropdown.tsx` alone |
| **G7** | Theme switch, light ↔ dark. The design document mentions the toggle **zero times** while `src/features/theme/components/theme-toggle/` ships | Rule 3 already gives all four border states separate light and dark values |
| §4c | Reconciling the **directional** board switch (A8) with the **non-directional** delete (A14), and re-proving A8 against the real API | Its own session |
| Swipe | Base UI installs swipe-to-dismiss on `Toast.Root` regardless of styling, `swipeDirection` defaulting to `["down","right"]` — undesigned | — |
| Roles | `Toast.Root` renders `role="dialog"`; `toast.tsx` overrides it nowhere, so `alert`/`status` is design, not behaviour | — |
| B5 | The **12px** columns/modals radius is *proposed, never reviewed*, and buttons at 4px sit inside inputs at 6px | One review pass |
| A2 | `danger` at rest is **3.54:1** white-on-`#EA5555`, under AA, and the value is the mock's own token | Needs a `--red` decision |
| A17 | The modal's lift `0 24px 48px -16px` is an unbriefed value | One review pass |

## E. Two ways this phase's paperwork has already misled a reader

Both are recorded so the next one is caught by pattern rather than by accident.

**A decision reversed without editing the paragraph that stated it.** Typography selects Inter and
a later section selects Manrope; the state-changes table calls task delete non-optimistic and the
shipped hook is optimistic. Table B and row C40 are now the answer in both cases. **When prose and
code disagree, find the dated decision — one of them is downstream of it.**

**An index organised by surface hides a gap that falls between two surfaces.** Every column
mutation was invisible for eight days for exactly this reason, and was found only by re-indexing
the same prototypes as entity × operation. That is what the coverage matrix is for, and it is why
this ledger is ordered by *what you build*, not by *what it looks like*.
