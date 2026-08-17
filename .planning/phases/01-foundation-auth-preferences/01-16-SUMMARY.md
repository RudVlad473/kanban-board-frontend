---
phase: 01-foundation-auth-preferences
plan: 16
subsystem: ui
tags: [design-system, accessibility, react-hook-form, tanstack-query, lucide-react]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (plans 01-06, 01-08)
    provides: Button/IconButton/Dropdown primitives (`isDisabled`, cva variant shape)
  - phase: 01-foundation-auth-preferences (plan 01-07)
    provides: TextField primitive (Field.Root/Field.Control composition, cva variant shape)
  - phase: 01-foundation-auth-preferences (plan 01-12)
    provides: SignUpForm/SignInForm wired to useSignUp/useSignIn's `isPending`, the existing
      hand-written `isDisabled`/`aria-busy` submit-button wiring this plan replaces
provides:
  - "isLoading prop on Button, TextField, IconButton and Dropdown.Root — a transient
    'request in flight' state distinct from isDisabled, always rendering aria-busy as
    true/false (never omitted), composing with isDisabled for non-activatability"
  - "TextField's isLoading goes readOnly (not disabled) so a frozen field stays focusable and
    legible instead of blurring the user mid-typing"
  - "Both auth forms drive every field, the password-visibility toggle and the submit button
    from the mutation's isPending flag, closing GC-01 (only the submit button was previously
    wired)"
  - "Four new Loading stories (Button/TextField/IconButton/Dropdown) and their storyIds
    entries in visual/primitives.visual.spec.ts, awaiting a post-merge Visual baselines
    dispatch"
affects: [any future primitive consumer needing a pending/busy visual state (e.g. Phase 2's
  board selector Dropdown), any future form wiring a TanStack Query mutation's isPending]

# Actuals (#2632)
actuals:
  tokens: 9183
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "isLoading as a prop distinct from isDisabled on every input/button/dropdown primitive:
      composes with isDisabled for non-activatability, but only isLoading sets aria-busy and
      swaps in a lucide-react LoaderCircle glyph (animate-spin motion-reduce:animate-none).
      Button/IconButton keep their label/accessible-name visible beside or instead of the
      icon; Dropdown threads isLoading through its existing DropdownContext alongside
      hasError rather than a second context."
    - "A loading TextField goes readOnly, not disabled — the value must not diverge from what
      an in-flight request already carries, but the field must stay focusable/legible rather
      than have the browser blur it."

key-files:
  modified:
    - src/components/ui/button/button.tsx
    - src/components/ui/button/button.test.tsx
    - src/components/ui/button/button.stories.tsx
    - src/components/ui/text-field/text-field.tsx
    - src/components/ui/text-field/text-field.test.tsx
    - src/components/ui/text-field/text-field.stories.tsx
    - src/components/ui/icon-button/icon-button.tsx
    - src/components/ui/icon-button/icon-button.test.tsx
    - src/components/ui/icon-button/icon-button.stories.tsx
    - src/components/ui/dropdown/dropdown.tsx
    - src/components/ui/dropdown/dropdown.test.tsx
    - src/components/ui/dropdown/dropdown.stories.tsx
    - src/features/auth/components/sign-in-form.tsx
    - src/features/auth/components/sign-in-form.test.tsx
    - src/features/auth/components/sign-in-form.stories.tsx
    - src/features/auth/components/sign-up-form.tsx
    - src/features/auth/components/sign-up-form.test.tsx
    - src/features/auth/components/sign-up-form.stories.tsx
    - visual/primitives.visual.spec.ts

key-decisions:
  - "isLoading is a separate prop from isDisabled, not a variant of it — they compose (either
    makes a control non-activatable) but only isLoading carries the aria-busy/spinner
    semantics assistive technology needs to distinguish 'temporarily busy' from 'unavailable'."
  - "A loading TextField becomes read-only, not disabled — disabled drops the field from the
    tab order and blurs it (yanking focus mid-typing); readOnly freezes the value while
    keeping the field focusable, selectable and legible, with aria-busy carrying the 'working'
    signal separately."
  - "Loading copy is a glyph, not text — the button keeps its own label visible beside the
    spinner so its width doesn't jump mid-submit, matching UI-SPEC's 'no dedicated copy' rule."
  - "aria-busy is always rendered as the string 'true'/'false', never omitted — proven by an
    explicit non-loading-state assertion in every primitive's test file, guarding against a
    regression that removes the attribute instead of setting it false."

patterns-established:
  - "Same pattern documented in tech-stack.patterns above (isLoading composition, TextField
    readOnly-not-disabled) — first established here, expected to be the template for any
    future primitive gaining a pending/busy state."

requirements-completed: [AUTH-01, AUTH-02]

coverage:
  - id: D1
    description: "Button, TextField, IconButton and Dropdown.Root each accept isLoading:
      non-activatable, aria-busy true/false always rendered, spinner glyph shown in place of
      or alongside the existing content, accessible name/label preserved"
    requirement: "AUTH-01"
    verification:
      - kind: automated_ui
        ref: "src/components/ui/button/button.test.tsx, src/components/ui/text-field/text-field.test.tsx, src/components/ui/icon-button/icon-button.test.tsx, src/components/ui/dropdown/dropdown.test.tsx (pnpm vitest run --project browser)"
        status: pass
      - kind: automated_ui
        ref: "Loading story per primitive, axe via pnpm vitest run --project storybook"
        status: pass
    human_judgment: false
  - id: D2
    description: "A TextField with isLoading refuses a typed character (its value after typing
      equals its value before typing) while staying focusable — not just readOnly-attribute
      presence"
    requirement: "AUTH-01"
    verification:
      - kind: automated_ui
        ref: "src/components/ui/text-field/text-field.test.tsx > 'refuses a typed character, stays focusable, and reports itself busy when isLoading'"
        status: pass
    human_judgment: false
  - id: D3
    description: "A Dropdown.Root with isLoading cannot be opened by a real click or keyboard
      activation attempt, and shows a busy trigger with a spinner in place of the chevron"
    requirement: "AUTH-01"
    verification:
      - kind: automated_ui
        ref: "src/components/ui/dropdown/dropdown.test.tsx > 'cannot be opened by click or by keyboard...'"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both auth forms freeze every field, the password-visibility toggle and the
      submit button while their mutation is pending, and recover on both the success and the
      failure path"
    requirement: "AUTH-02"
    verification:
      - kind: automated_ui
        ref: "src/features/auth/components/sign-in-form.test.tsx (in-flight test extended), src/features/auth/components/sign-up-form.test.tsx ('disables the submit control...freezes all three fields...' and 'recovers every control...once a pending submission fails')"
        status: pass
      - kind: e2e
        ref: "e2e/auth.e2e.spec.ts, e2e/route-guard.e2e.spec.ts (pnpm exec playwright test --project e2e, 8/8 passed) — plans 01-12/01-13's flows still pass against the now-frozen-while-pending forms"
        status: pass
    human_judgment: false
  - id: D5
    description: "Four new Loading storyIds (Button/IconButton/TextField/Dropdown) registered
      in visual/primitives.visual.spec.ts for post-merge baseline generation"
    requirement: "AUTH-01"
    verification:
      - kind: other
        ref: "grep -c -- '--loading' visual/primitives.visual.spec.ts returns 4"
        status: pass
    human_judgment: true
    rationale: "Visual-regression PNG baselines cannot be generated inside this executor
      worktree (same constraint plan 01-09 hit) — the 'Visual baselines' CI workflow must be
      dispatched and its output committed after this plan merges, and a human should confirm
      the four new baselines actually look right before they become the permanent comparison
      target."

duration: 9min (task-commit span; excludes upfront context-reading time, not separately timed)
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 16: Primitive and Auth-Form Loading States Summary

**`isLoading` prop added to Button, TextField, IconButton and Dropdown (readOnly-not-disabled
for TextField, a lucide-react spinner glyph for the rest), with both auth forms now driving
every field, password toggle and submit button from their mutation's `isPending` flag — closing
GC-01.**

## Performance

- **Duration:** 9 min (span between first and last task commit; upfront context-reading time
  not separately captured)
- **Started:** 2026-08-17T10:35:06+02:00 (first task commit)
- **Completed:** 2026-08-17T10:44:23+02:00 (last task commit)
- **Tasks:** 3
- **Files modified:** 19

## Accomplishments

- `Button` gets `isLoading` (composes with `isDisabled`, always renders `aria-busy` as
  `"true"`/`"false"`, shows a `LoaderCircle` spinner beside its still-visible label so width
  doesn't jump mid-submit).
- `TextField` gets `isLoading` → `readOnly` (not `disabled`) + `aria-busy`, keeping a frozen
  field focusable and legible instead of having the browser blur it mid-typing; a new `isBusy`
  cva axis contributes `cursor-progress`.
- `IconButton` gets `isLoading` (swaps the glyph for a spinner inside the existing
  `aria-hidden` span, inheriting the primitive's own `[&_svg]` size rules; `label` keeps
  supplying the accessible name unchanged).
- `Dropdown.Root` gets `isLoading`, threaded through the existing `DropdownContext` alongside
  `hasError`; `Trigger` reads it, sets `aria-busy`, and swaps the chevron for a spinner. The
  trigger cannot be opened by click or keyboard while loading — proven with a real open
  attempt, not just an attribute check.
- Both `SignInForm` and `SignUpForm` now pass `isLoading={isPending}` to every `TextField`,
  the password-visibility `IconButton`, and the submit `Button` — replacing the hand-written
  `aria-busy={isPending}` the primitive now owns. A pending sign-in/sign-up submission freezes
  every control the user could otherwise edit or press mid-request, and every control recovers
  on both the success and the failure path (a dedicated recovery-after-failure test rules out
  the form staying frozen after an error).
- 12 new browser-mode tests across the four primitives and both forms, four new `Loading`
  stories (Button/TextField/IconButton/Dropdown), and their four `storyIds` entries in
  `visual/primitives.visual.spec.ts`.

## Task Commits

1. **Task 1: End-to-end "submitting sign-in freezes the form"** — `63d8394` (feat, tracer)
2. **Task 2: IconButton and Dropdown loading states** — `447749c` (feat)
3. **Task 3: Sign-up form wired, both forms' Submitting stories staged across every control** — `d4371ee` (feat)

**Plan metadata:** commit created at end of this execution (see final commit list returned to
the orchestrator).

## Files Created/Modified

- `src/components/ui/button/button.tsx` / `.test.tsx` / `.stories.tsx` — `isLoading` prop,
  spinner, 2 new tests, `Loading` story
- `src/components/ui/text-field/text-field.tsx` / `.test.tsx` / `.stories.tsx` — `isLoading`
  prop, `isBusy` cva axis, 1 new test, `Loading` story
- `src/components/ui/icon-button/icon-button.tsx` / `.test.tsx` / `.stories.tsx` — `isLoading`
  prop, spinner swap, 2 new tests, `Loading` story
- `src/components/ui/dropdown/dropdown.tsx` / `.test.tsx` / `.stories.tsx` — `isLoading` prop
  on `DropdownContext`, spinner swap on `Trigger`, 1 new test, `Loading` story
- `src/features/auth/components/sign-in-form.tsx` / `.test.tsx` / `.stories.tsx` — `isLoading`
  wired to all controls, in-flight test extended, `Submitting` story doc comment updated
- `src/features/auth/components/sign-up-form.tsx` / `.test.tsx` / `.stories.tsx` — same wiring,
  in-flight test extended plus a new recovery-after-failure test, `Submitting` story doc
  comment updated
- `visual/primitives.visual.spec.ts` — 4 new `--loading` storyIds entries

## Decisions Made

See frontmatter `key-decisions`/`patterns-established` for the full list — most significant:
`isLoading` as a distinct, composable prop from `isDisabled` (never folded together, since only
`isLoading` owns `aria-busy`/spinner semantics), and TextField's read-only-not-disabled choice
so a frozen field stays focusable instead of being blurred out from under the user.

## Deviations from Plan

None — plan executed exactly as written. All 12 new behaviours, both forms' full wiring, and
the four visual-regression storyIds entries landed as specified; no Rule 1-4 fixes were needed.

## Issues Encountered

- `next build`/`tsc --noEmit` initially failed on `Cannot find name 'LayoutProps'` — this
  worktree had no `.next/types` yet (Next.js generates that ambient type file on a build, not
  on a fresh checkout) and no `.env.local`, so `SESSION_SECRET is not set` also failed the
  build. Neither is a defect in this plan's own changes: a throwaway `SESSION_SECRET`/
  `EXTERNAL_API_BASE_URL` `.env.local` (uncommitted, gitignored) was created per this
  project's standard worktree setup (documented precedent in 01-12-SUMMARY.md), and running
  `next build` once populated `.next/types`. Both `pnpm lint` and `pnpm exec tsc --noEmit` pass
  clean afterward.

## User Setup Required

None — no external service configuration required. This worktree's own `.env.local` was
populated with throwaway values (not committed), same as every prior plan's worktree setup.

## Next Phase Readiness

- GC-01 is closed: no primitive that is an input, a button or a dropdown is left without a
  loading state, and neither auth form can have its submitted values edited out from under an
  in-flight request.
- Dropdown's `isLoading` has no real consumer yet in this phase (no data-backed select exists
  until Phase 2's board selector) — its story and test are the proof the primitive itself
  works; wiring a real pending-data dropdown is out of this plan's scope by design (see the
  plan's `flagged_assumptions`).
- **Visual baselines for the four new Loading stories still need generating.** Per this plan's
  `flagged_assumptions` (same constraint plan 01-09 hit), the `visual` Playwright job is
  expected to fail on missing snapshots until the "Visual baselines" CI workflow is dispatched
  post-merge and its PNGs committed. This is the established process in this repo, not a
  defect introduced here.
- No blockers.

## Known Stubs

None — every `isLoading` prop is fully wired to a real consumer path (`isPending` from
`useSignIn`/`useSignUp`) in both auth forms; Dropdown's `isLoading` has no application consumer
yet, which is a documented, deliberate scope boundary (see `flagged_assumptions` in the plan),
not a stub standing in for missing wiring.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-17*

## Self-Check: PASSED
