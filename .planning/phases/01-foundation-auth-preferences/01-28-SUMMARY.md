---
phase: 01-foundation-auth-preferences
plan: 28
subsystem: testing
tags: [conventions, vitest, testing-library, renderHook, docs]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (plan 01-20)
    provides: "src/features/auth/hooks/use-sign-in.unit.test.tsx as a real renderHook/RTL precedent"
  - phase: 01-foundation-auth-preferences (plan 01-26)
    provides: "CONVENTIONS.md file-overlap boundary (GC-09), landed same wave-1 file so this plan had to run after it"
provides:
  - "CONVENTIONS.md 'Where tests live' table documenting which Vitest/Playwright project a new test file targets, by kind"
  - "CONVENTIONS.md 'Where code lives (quick reference)' compact table summarizing the eight-step Placement rule"
affects: [future-hook-tests, future-conventions-edits]

actuals:
  tokens: 692
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Test-kind-to-Vitest/Playwright-project routing table (component/behavioral, hook/logic, story/a11y, visual regression, e2e)"

key-files:
  created: []
  modified:
    - CONVENTIONS.md

key-decisions:
  - "Both additions land in CONVENTIONS.md, not a new PROJECT_ROUTER.md or 01-CONTEXT.md — CONVENTIONS.md is already the placement/pattern source of truth."
  - "The renderHook/RTL precedent citation points at the real, verified src/features/auth/hooks/use-sign-in.unit.test.tsx (confirmed to exist and call renderHook before citing it), not an assumed future file."
  - "The 'where code lives' table summarizes but does not replace the existing eight-step Placement rule, which is left textually unchanged."

patterns-established:
  - "New CONVENTIONS.md quick-reference tables are added inside the existing 'Project organization' section, after the Placement rule's numbered list, rather than as new top-level headings."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

coverage:
  - id: D1
    description: "CONVENTIONS.md documents the renderHook/RTL convention for hook tests, citing 01-20's real use-sign-in.unit.test.tsx as verified precedent"
    verification:
      - kind: other
        ref: "grep -c \"Where tests live\" CONVENTIONS.md && grep -c \"use-sign-in.unit.test.tsx\" CONVENTIONS.md && test -f src/features/auth/hooks/use-sign-in.unit.test.tsx && grep -q renderHook src/features/auth/hooks/use-sign-in.unit.test.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "CONVENTIONS.md has a compact 'where code lives' quick-reference alongside the unchanged existing Placement rule"
    verification:
      - kind: other
        ref: "grep -c \"Where code lives\" CONVENTIONS.md"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-08-18
status: complete
---

# Phase 01 Plan 28: CONVENTIONS.md test-placement and code-placement quick-reference Summary

**Documented the renderHook/RTL convention for hook tests (citing 01-20's real use-sign-in.unit.test.tsx) and added a compact "where code lives" quick-reference table to CONVENTIONS.md**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-18T10:12:00Z
- **Completed:** 2026-08-18T10:20:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added a "Where tests live" table to CONVENTIONS.md's "Project organization" section, covering all five test kinds (component/behavioral, hook/logic, story/a11y, visual regression, e2e) with their suffix, location, Vitest/Playwright project, and when-to-use guidance
- Cited `src/features/auth/hooks/use-sign-in.unit.test.tsx` (landed by 01-20) as the real, verified precedent for the hook/logic `renderHook`/React Testing Library convention — confirmed the file exists and actually calls `renderHook` before citing it
- Added a compact "Where code lives (quick reference)" table summarizing the existing eight-step Placement rule without altering the rule's own text

## Task Commits

Each task was committed atomically:

1. **Task 1: "Where tests live" table and "where code lives" quick-reference** - `bbfe10d` (docs)

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified
- `CONVENTIONS.md` - Added "Where tests live" and "Where code lives (quick reference)" tables inside the existing "Project organization" section

## Decisions Made
- Both additions land in CONVENTIONS.md (not a new PROJECT_ROUTER.md or 01-CONTEXT.md entry), consistent with the 2026-08-16 decision that CONVENTIONS.md is the placement/pattern source of truth
- The precedent citation was verified against the real file on disk (existence + `renderHook` usage) rather than trusted from the 01-20 plan text alone

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

GC-12 is closed. CONVENTIONS.md now gives any future contributor (or agent) a compact, categorized answer to "where does this new hook/type/test go" and "which test project does a new file target," reducing the need to re-derive either from reading existing file suffixes. No blockers for downstream plans in wave 14 or later.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-18*
