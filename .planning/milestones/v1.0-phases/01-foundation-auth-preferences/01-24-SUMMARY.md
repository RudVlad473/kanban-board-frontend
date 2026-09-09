---
phase: 01-foundation-auth-preferences
plan: 24
subsystem: ui
tags: [react, tailwind, cva, vitest-browser, textfield, accessibility]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences
    provides: "TextField primitive with isLoading/readOnly mechanism (01-16)"
provides:
  - "TextField isBusy cva branch with a real opacity+background visual treatment, distinct from idle and disabled"
affects: [ui, text-field, checkbox, dropdown]

# Actuals (#2632)
actuals:
  tokens: 938
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Loading-state visual treatment: opacity strictly between idle (1) and disabled (0.5), plus a recessed background token (bg-bg-app), distinguishing 'busy' from both 'idle' and 'unavailable'"

key-files:
  created: []
  modified:
    - src/components/ui/text-field/text-field.tsx
    - src/components/ui/text-field/text-field.test.tsx

key-decisions:
  - "opacity-70 chosen as a distinct third value strictly between idle's 1 and disabled's 0.5 (per plan's Decisions block)"
  - "bg-bg-app (not a new token) reused as the 'recessed' background, since it already renders lighter/darker than bg-bg-surface in both light and dark mode"

patterns-established:
  - "Investigation-then-fix TDD flow for visual-only defects: a tracer task first proves the defect live via getComputedStyle equality, then a tdd=true task flips that assertion to prove the fix (RED then GREEN)"

requirements-completed: [AUTH-01, AUTH-02]

coverage:
  - id: D1
    description: "A loading TextField is visually distinguishable from an idle TextField (real opacity+background change, not merely an invisible cursor style)"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "src/components/ui/text-field/text-field.test.tsx#GC-15 fix: a loading field is visually distinct from both idle and disabled, not merely 'not idle'"
        status: pass
    human_judgment: false
  - id: D2
    description: "A loading TextField remains visually distinct from a disabled TextField (three-way pairwise-distinct opacity: 1 / 0.7 / 0.5)"
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "src/components/ui/text-field/text-field.test.tsx#GC-15 fix: a loading field is visually distinct from both idle and disabled, not merely 'not idle'"
        status: pass
    human_judgment: false
  - id: D3
    description: "The pre-existing readOnly-not-disabled mechanism (loading field stays focusable, value frozen mid-typing) is unchanged by this visual-only fix"
    verification:
      - kind: unit
        ref: "src/components/ui/text-field/text-field.test.tsx#refuses a typed character, stays focusable, and reports itself busy when isLoading"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-08-17
status: complete
---

# Phase 1 Plan 24: TextField Loading Visual Fix (GC-15) Summary

**Gave TextField's `isBusy` cva branch a real `opacity-70 bg-bg-app` visual treatment, replacing the `cursor-progress`-only styling that was computed-style-identical to idle.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-08-17T09:38:00Z (approx.)
- **Completed:** 2026-08-17T10:33:00Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- Confirmed live, via a browser-mode `getComputedStyle` assertion, that a loading TextField and an idle TextField previously rendered with identical `opacity` ("1") and `backgroundColor` ("rgb(255, 255, 255)") — proving GC-15's source-level finding rather than assuming it
- Fixed the `isBusy` cva branch: `cursor-progress` → `cursor-progress bg-bg-app opacity-70`, giving a loading field a distinct third opacity value (0.7) strictly between idle (1) and disabled (0.5), plus a background tint distinguishing it from idle's `bg-bg-surface`
- Proved the fix with a three-way pairwise-distinctness assertion (idle/loading/disabled opacity all different) and a loading-vs-idle `backgroundColor` inequality assertion
- Confirmed the pre-existing readOnly-not-disabled mechanism (D-16: a loading field stays focusable, its value frozen mid-typing) is untouched — its dedicated behavioral test still passes unmodified
- Verified no regression across the full suite: 302 tests / 28 files (including both auth forms' `isLoading={isPending}` consumers), `pnpm build`, `pnpm lint`, and `pnpm exec tsc --noEmit` all clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Investigate — confirm live whether a loading field is actually visually distinguishable from idle** - `abfa503` (test)
2. **Task 2: Fix — a real, distinct visual treatment for the loading state** - `b0115f4` (test, RED) then `6d87d0f` (feat, GREEN)

_Task 2 carried `tdd="true"`: the RED commit flipped Task 1's equality assertion into a three-way distinctness assertion and confirmed it failed against the unfixed source (`AssertionError: expected '1' to be '0.7'`) before the GREEN commit landed the actual cva change._

## Files Created/Modified
- `src/components/ui/text-field/text-field.tsx` - `isBusy` cva branch now contributes `opacity-70 bg-bg-app` alongside the existing `cursor-progress`
- `src/components/ui/text-field/text-field.test.tsx` - investigation test (Task 1) later evolved in place into the GC-15 fix's three-way distinctness assertion (Task 2)

## Decisions Made
- `opacity-70` chosen precisely because it is strictly between idle's `1` and disabled's `0.5` — a distinct third value, not a coincidental match to either neighbor, per the plan's Decisions block
- `bg-bg-app` (an existing token, `#F4F7FD` light / `#20212C` dark, already lighter/darker than `bg-bg-surface`'s `#FFFFFF`/`#2B2C37` in both modes) reused rather than introducing a new token, since it already reads as "recessed" against the field's own idle surface

## Deviations from Plan

None — plan executed exactly as written. The lint auto-fix step (Prettier/ESLint via lint-staged, run automatically on `git commit`) reordered the new Tailwind classes to `cursor-progress bg-bg-app opacity-70` for `tailwindcss/classnames-order` compliance; this is a cosmetic reordering with no behavioral effect, verified by re-running the full browser test suite and lint (0 errors/warnings) afterward — not treated as a deviation requiring separate documentation since it is standard project tooling behavior (docs/adr/tech/0007), not a manual code change.

## Issues Encountered
- `pnpm build` fails in this worktree with `SESSION_SECRET is not set` unless the env var is supplied — this is a documented, pre-existing environment prerequisite (per PROJECT.md's Constraints and prior plans' SUMMARYs, e.g. 01-16/01-17), unrelated to this plan's TextField change. Verified the build succeeds cleanly (all 10 routes generated) when `SESSION_SECRET`/`EXTERNAL_API_BASE_URL` are supplied inline for the verification run only; no `.env.local` was created or committed, since that remains an out-of-scope, deliberate per-developer/CI setup step (tracked separately as GC-11/SETUP.md).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
GC-15 is closed. TextField's loading state now reads as a real, distinct "busy" state in both light and dark mode, matching the visual-treatment bar every other non-idle TextField state (error, disabled) already met. No blockers for subsequent gap-closure plans in this wave.

## Self-Check: PASSED

- FOUND: `.planning/phases/01-foundation-auth-preferences/01-24-SUMMARY.md`
- FOUND: commit `abfa503` (Task 1 investigation)
- FOUND: commit `b0115f4` (Task 2 RED)
- FOUND: commit `6d87d0f` (Task 2 GREEN)
- FOUND: commit `6afc89e` (plan metadata)

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-17*
