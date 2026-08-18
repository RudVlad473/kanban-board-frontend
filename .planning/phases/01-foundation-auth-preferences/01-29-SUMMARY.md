---
phase: 01-foundation-auth-preferences
plan: 29
subsystem: ui
tags: [design-system, accessibility, cva, tailwind-merge, textfield, auth-forms]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (plan 01-16)
    provides: "TextField's isLoading/readOnly mechanism and both auth forms' isLoading wiring"
  - phase: 01-foundation-auth-preferences (plan 01-24)
    provides: "TextField's isBusy opacity-70/bg-bg-app visual treatment (GC-15), reconciled here"
  - phase: 01-foundation-auth-preferences (plans 01-19, 01-21)
    provides: "sign-up-form.test.tsx/sign-in-form.test.tsx surrounding structure (validation
      assertions, setupMswWorker()/renderWithProviders()) this plan edits on top of"
provides:
  - "TextField's isLoading composes into the single disabled prop (isDisabled || isLoading),
    matching Button/IconButton/Checkbox/Dropdown's established pattern — readOnly mechanism
    fully removed"
  - "TextField's isBusy cva branch simplified to disabled:cursor-progress only — the sole
    remaining busy-vs-disabled visual differentiator, opacity/background now identical"
  - "Both auth forms' pending-state tests assert disabled-refuses-focus instead of the old
    readOnly-stays-focusable behaviour"
affects: [any future TextField consumer relying on isLoading's interactivity semantics, any
  future primitive gaining a loading state (now zero exceptions to the disabled-composition
  convention across Button/IconButton/Checkbox/Dropdown/TextField)]

# Actuals (#2632)
actuals:
  tokens: 3652
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "isLoading composes into the single disabled prop everywhere now — TextField was the last
      holdout using readOnly; zero primitives remain with divergent loading-interactivity
      semantics (closes T-01-70 from this plan's own threat register)."
    - "cva variants meant to win a CSS cascade fight against a base disabled: class must
      themselves carry the disabled: modifier (not a bare class) so cn()/tailwind-merge's
      conflict-group resolution — not raw CSS specificity/source-order — decides the winner
      deterministically."

key-files:
  modified:
    - src/components/ui/text-field/text-field.tsx
    - src/components/ui/text-field/text-field.test.tsx
    - src/features/auth/components/sign-in-form.test.tsx
    - src/features/auth/components/sign-up-form.test.tsx

key-decisions:
  - "GC-17 overrides the prior readOnly-not-disabled decision (mislabeled 'D-16' by GC-15's own
    text — the real D-16 is about Storybook stories and is untouched): loading now implies
    disabled on TextField exactly like every other primitive, per an explicit user decision made
    during a live review of all loading-state primitives."
  - "GC-15's opacity-70/bg-bg-app isBusy treatment is retired, not preserved — confirmed live
    that native :disabled always outranks a plain class on CSS specificity the moment isLoading
    implies disabled, so the fix simplifies the cva branch instead of fighting the cascade with
    !important or a disabled:-prefixed opacity override."
  - "The isBusy cursor-progress class itself had to move behind the disabled: modifier (not left
    as a bare class) — confirmed live that a bare class shares the exact same specificity
    disadvantage against the base disabled:cursor-not-allowed class as the opacity class did, so
    'cursor is the sole differentiator' would have silently been false without this correction."

patterns-established:
  - "When a cva variant needs to win a Tailwind conflict against a base disabled:-scoped class in
    a project using cn()/tailwind-merge, scope the variant to the same disabled: modifier rather
    than leaving it bare — puts both in the same tailwind-merge conflict group so the
    later-declared class wins deterministically, instead of falling back to raw CSS cascade
    order (which the :disabled pseudo-class selector's higher specificity would otherwise win)."

requirements-completed: [AUTH-01, AUTH-02]

coverage:
  - id: D1
    description: "A loading TextField refuses focus and typed input exactly like a disabled
      TextField — native browser-enforced disabled behaviour, not an app-level readOnly
      convention"
    requirement: "AUTH-01"
    verification:
      - kind: automated_ui
        ref: "src/components/ui/text-field/text-field.test.tsx > 'renders disabled, refuses
          focus and typing, and reports itself busy when isLoading' (pnpm vitest run --project
          browser)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A loading TextField still reports aria-busy=\"true\", independent of the
      disabled mechanism"
    requirement: "AUTH-01"
    verification:
      - kind: automated_ui
        ref: "src/components/ui/text-field/text-field.test.tsx (same test as D1, aria-busy
          assertion)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A loading field's computed opacity now equals a disabled field's (both 0.5),
      differentiated only by cursor (progress vs not-allowed) — confirmed live, not assumed"
    requirement: "AUTH-01"
    verification:
      - kind: automated_ui
        ref: "src/components/ui/text-field/text-field.test.tsx > 'a loading field now visually
          matches disabled — native :disabled wins on CSS specificity — but keeps a distinct
          busy cursor'"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both auth forms' pending-state tests assert the new refuses-focus behaviour on
      every frozen field (sign-in: email; sign-up: email, name, password), with every other
      assertion (submit button disabled/aria-busy, fields' aria-busy, password-toggle
      non-activatability, post-resolve recovery) unchanged"
    requirement: "AUTH-02"
    verification:
      - kind: automated_ui
        ref: "src/features/auth/components/sign-in-form.test.tsx, sign-up-form.test.tsx (pnpm
          vitest run --project browser src/features/auth — 70/70 passed)"
        status: pass
    human_judgment: false
  - id: D5
    description: "01-CONTEXT.md records GC-17 as an explicit, traceable override of the prior
      readOnly-not-disabled decision, with a corrected citation next to GC-15's paragraph and
      the real (unrelated) D-16 bullet left untouched"
    requirement: "AUTH-01"
    verification:
      - kind: other
        ref: "01-CONTEXT.md's 'Gap Closure — 2026-08-17' section, GC-17 entry plus GC-15's
          'Superseded note' — applied ahead of this plan's execution per the plan's own frontmatter"
        status: pass
    human_judgment: false

duration: 7min (task-commit span; excludes upfront context-reading time, not separately timed)
completed: 2026-08-18
status: complete
---

# Phase 01 Plan 29: TextField isLoading Composes Into Disabled (GC-17) Summary

**TextField's `isLoading` now composes into the shared `disabled` prop exactly like Button,
IconButton, Checkbox and Dropdown — the `readOnly`-based mechanism 01-16 built and GC-15
preserved is fully removed, with GC-15's now-unreachable `opacity-70` visual fix simplified and
both auth forms' pending-state tests updated to match.**

## Performance

- **Duration:** 7 min (span between first and last task commit; upfront context-reading time not
  separately captured)
- **Started:** 2026-08-18T12:21:58+02:00 (first task commit)
- **Completed:** 2026-08-18T12:29:22+02:00 (last task commit)
- **Tasks:** 3
- **Files modified:** 4
- **Commits:** 5

## Accomplishments

- `TextField`'s `Field.Root` now sets `disabled={isDisabled || isLoading}` — the exact
  composition `checkbox.tsx` and `button.tsx` already use. `readOnly={isLoading}` is removed
  entirely from `Field.Control`; `aria-busy={isLoading}` stays independently wired, unchanged.
- A new/renamed test proves the browser itself refuses focus and typed input on a loading field
  (`.focus()` does not move `document.activeElement`, a subsequent keypress never fires
  `onValueChange`), replacing the old test that asserted the opposite (stays focusable, value
  frozen only at the app level).
- Live investigation (not assumption) confirmed GC-15's `opacity-70`/`bg-bg-app` `isBusy`
  treatment became CSS-unreachable the instant `isLoading` implies `disabled`: a
  `:disabled`-qualified selector always outranks a plain class on specificity, so
  `disabled:opacity-50` silently wins regardless of source order. The `isBusy` cva branch is
  simplified back to a cursor-only affordance, matching Checkbox's (GC-14) own precedent of a
  loading state visually identical to disabled.
- A second, non-obvious live finding: a bare `cursor-progress` class shares the identical
  specificity disadvantage against the base `disabled:cursor-not-allowed` class — it never won
  either, so "cursor is the sole differentiator" would have been silently false. Fixed by scoping
  the class to `disabled:cursor-progress`, which puts it in the same `cn()`/tailwind-merge
  conflict group as the base class so the later-declared one wins deterministically instead of
  falling back to CSS specificity.
- Both `sign-in-form.test.tsx` and `sign-up-form.test.tsx`'s pending-state tests now assert
  disabled-refuses-focus on every frozen field (sign-in: email; sign-up: email, name, password),
  with their post-resolve "editable again" assertions updated to explicitly re-focus each field
  first — the earlier `.focus()` call is now genuinely refused by the browser while pending
  (unlike the old readOnly mechanism, which kept the field focused straight through the whole
  interaction).
- All other assertions in both forms' tests (submit button disabled/`aria-busy`, fields'
  `aria-busy`, password-toggle non-activatability, post-resolve recovery) left exactly as-is.

## Task Commits

1. **Task 1: TextField's isLoading composes into disabled, not readOnly (GC-17)** — `286d632`
   (test, RED) + `1f7aa96` (feat, GREEN)
2. **Task 2: Reconcile GC-15's isBusy visual treatment** — `ff1b7db` (test) + `890ffa3` (fix)
3. **Task 3: Update both auth forms' pending-state tests** — `e1cffbb` (test)

**Plan metadata:** commit created at end of this execution (see final commit list returned to
the orchestrator).

## Files Created/Modified

- `src/components/ui/text-field/text-field.tsx` — `Field.Root`'s `disabled` composition,
  `readOnly` prop removed, `isLoading` doc comment rewritten, `isBusy` cva branch simplified to
  `disabled:cursor-progress`
- `src/components/ui/text-field/text-field.test.tsx` — disabled-refuses-focus test replacing the
  old readOnly-stays-focusable one; GC-15 visual test rewritten to assert loading-matches-disabled
  opacity, cursor-differentiated
- `src/features/auth/components/sign-in-form.test.tsx` — pending-state test's email-field
  assertion updated to disabled-refuses-focus; post-resolve re-focus added
- `src/features/auth/components/sign-up-form.test.tsx` — pending-state test's three-field
  (email/name/password) assertions updated to disabled-refuses-focus; post-resolve re-focus added

## Decisions Made

See frontmatter `key-decisions`/`patterns-established` for the full list — most significant:
GC-17 is a deliberate, user-directed override of the prior readOnly-based decision (not a bug
fix), and confirming "cursor is the sole differentiator" live (rather than trusting the plan's
own stated assumption) caught a second CSS-specificity trap the plan's author hadn't anticipated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The isBusy cursor class needed the same `disabled:` scoping as the opacity
class, not a bare class**
- **Found during:** Task 2
- **Issue:** Task 2's plan text assumed a bare `cursor-progress` class would remain the "sole
  busy-vs-disabled differentiator" once the opacity classes were removed. Live verification (per
  the task's own investigate-then-fix mandate) showed this was false: the base
  `disabled:cursor-not-allowed` class shares the exact same specificity advantage over a bare
  class that `disabled:opacity-50` had over `opacity-70` — a loading field's cursor read
  `not-allowed`, identical to a disabled field's, not `progress`.
- **Fix:** Scoped the `isBusy` branch's cursor class to `disabled:cursor-progress` instead of a
  bare `cursor-progress`. Since this project's `cn()` helper runs every class list through
  `tailwind-merge`, two classes sharing the same modifier (`disabled:`) land in the same conflict
  group, and the later-declared one (the variant class, appended after the base string) wins
  deterministically — sidestepping the CSS-specificity trap entirely rather than fighting it.
- **Files modified:** `src/components/ui/text-field/text-field.tsx`
- **Commit:** `890ffa3`

**2. [Rule 1 - Bug] Both auth forms' post-resolve "editable again" assertions needed an explicit
re-focus**
- **Found during:** Task 3
- **Issue:** The plan's Task 3 action only called for replacing the pending-state focus-then-type
  block with a disabled-refuses-focus assertion. Running the full verification chain surfaced a
  second-order consequence the plan text didn't anticipate: both tests' later "editable again once
  the request settles" assertions relied on the field still holding focus from the earlier
  `.focus()` call. Under the old readOnly mechanism that call succeeded and focus persisted
  straight through; under the new disabled mechanism it's refused, so once the field re-enables,
  nothing has focus and the trailing `userEvent.keyboard("z")` typed into void, failing both
  "disables the submit control..." tests with a stale (unchanged) field value.
  Confirmed live via a full `pnpm test` run.
- **Fix:** Added an explicit `.focus()` call immediately before the post-resolve keyboard
  assertion in both tests, with a comment explaining why re-acquiring focus is now necessary.
- **Files modified:** `src/features/auth/components/sign-in-form.test.tsx`,
  `src/features/auth/components/sign-up-form.test.tsx`
- **Commit:** `e1cffbb`

## Issues Encountered

- Two full-suite (`pnpm test`) runs were flaky under load (2-4 unrelated tests failing with
  cross-test element/value leakage or a timeout, in files this plan never touched) — both
  isolated re-runs of the same files and a clean full-suite re-run (400/400) confirmed these were
  resource-contention flakes from running all 5 Vitest projects (tokens/node/browser/unit/
  storybook) concurrently under `pnpm test`, not a regression from this plan's changes.
- `pnpm build` initially failed with `SESSION_SECRET is not set` — this fresh worktree had no
  `.env.local` yet (Next.js only fails this at build time, not at `pnpm test` time, which has its
  own test-only fallback in `vitest.config.ts`). Same documented, pre-existing constraint plan
  01-16 and 01-12's worktree setups hit — not a defect in this plan's own changes. A throwaway,
  gitignored `.env.local` (`SESSION_SECRET`/`EXTERNAL_API_BASE_URL`) was created per the
  established worktree-setup precedent, after which `pnpm build` passed clean.

## User Setup Required

None — no external service configuration required. This worktree's own `.env.local` was
populated with throwaway values (not committed, gitignored), same precedent as prior plans'
worktree setups.

## Next Phase Readiness

- GC-17 is closed: zero primitives remain with divergent loading-interactivity semantics — every
  input/button/dropdown/checkbox/text-field composes `isLoading` into `disabled` identically.
- GC-15's visual fix is retired cleanly (no dead CSS classes left in the `isBusy` cva branch), its
  supersession recorded in 01-CONTEXT.md's GC-15 entry rather than silently deleted.
- No blockers.

## Known Stubs

None — every change lands in a real, already-wired consumer path (`TextField` itself and both
real auth forms' `isLoading={isPending}` wiring from plan 01-16); no placeholder or stub data
introduced.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-18*

## Self-Check: PASSED
