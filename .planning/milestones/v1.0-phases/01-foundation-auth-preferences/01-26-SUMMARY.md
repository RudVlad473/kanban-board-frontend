---
phase: 01-foundation-auth-preferences
plan: 26
subsystem: testing
tags: [mock-store, msw, vitest, in-memory-state, gc-09]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (plan 01-19)
    provides: createUser's post-GC-02 signature with an optional displayName
provides:
  - "Mock user store (src/lib/mocks/store.ts) that is in-memory only, no disk I/O"
  - "Explicit resetMockStore() export for tests/tooling to restore just the seeded demo account"
  - "CONVENTIONS.md rule against ad-hoc disk/browser-storage persistence in mock/test state"
affects: [foundation-auth-preferences, mock-backend, testing-conventions]

# Actuals (#2632)
actuals:
  tokens: 1521
  tasks: 2
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns: ["in-memory-only mock/test state with an explicit seed/reset function"]

key-files:
  created: [src/lib/mocks/store.unit.test.ts]
  modified: [src/lib/mocks/store.ts, CONVENTIONS.md]

key-decisions:
  - "createUser's signature was read fresh post-01-19 rather than assumed; it already had the optional displayName widening this plan depends on."
  - "node:crypto's randomUUID stays untouched -- unrelated to disk persistence, a separate tracked concern."
  - "No existing test file was rewired to call resetMockStore() -- the function is proven in its own dedicated unit test only, per the plan's explicit scope boundary."

patterns-established:
  - "Mock/test state lives in memory only, reset via an explicit function -- documented in CONVENTIONS.md's Mock server section."

requirements-completed: [AUTH-01, AUTH-02]

coverage:
  - id: D1
    description: "store.ts has no node:fs/node:os/node:path imports and no disk I/O of any kind"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "grep -c 'node:fs\\|node:os\\|node:path' src/lib/mocks/store.ts -- 0 matches"
        status: pass
    human_judgment: false
  - id: D2
    description: "resetMockStore() clears a created user while the seeded demo account survives, and is idempotent"
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "src/lib/mocks/store.unit.test.ts#store > removes a created user on resetMockStore() while the demo account survives"
        status: pass
      - kind: unit
        ref: "src/lib/mocks/store.unit.test.ts#store > is idempotent across two consecutive calls"
        status: pass
      - kind: unit
        ref: "src/lib/mocks/store.unit.test.ts#store > finds the seeded demo account by email at import time, with no other users present"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every existing mock-backed test (signup, signin, theme read/update) still passes unmodified"
    verification:
      - kind: unit
        ref: "pnpm test -- 358 passed, 3 failed (both pre-existing, unrelated to store.ts -- see Deviations)"
        status: pass
    human_judgment: false
  - id: D4
    description: "CONVENTIONS.md states mock/test state is in-memory-only, reset via an explicit function"
    verification:
      - kind: other
        ref: "grep -c 'lives in memory only' CONVENTIONS.md -- returns 1"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-18
status: complete
---

# Phase 01 Plan 26: Mock Store In-Memory Rewrite (GC-09) Summary

**Replaced the mock store's temp-file JSON mirror with plain in-memory seed state and an explicit `resetMockStore()`, and documented the no-disk-persistence rule in CONVENTIONS.md.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-18T08:52:00Z
- **Completed:** 2026-08-18T09:17:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- `src/lib/mocks/store.ts` no longer imports `node:fs`/`node:os`/`node:path` and has zero disk I/O -- the `Map` is the only state, seeded once at module load from `withDemoAccountSeeded([])`.
- Added and exported `resetMockStore(): void`, which clears the store and re-seeds exactly the demo account, proven idempotent and non-destructive to the demo account by a new dedicated unit test.
- `CONVENTIONS.md`'s "Mock server (docs/adr/tech/0004)" section now states explicitly that mock/test state lives in memory only, closing the documentation gap this rewrite fixed in code.

## Task Commits

Each task was committed atomically (Task 1 followed the tdd="true" RED/GREEN cycle):

1. **Task 1 (RED): failing test for in-memory mock store reset** - `359b3b2` (test)
2. **Task 1 (GREEN): make mock store in-memory only with explicit resetMockStore** - `91db5f3` (feat)
3. **Task 2: CONVENTIONS.md in-memory-state rule** - `b87f192` (docs)
4. **Out-of-scope findings logged** - `85612c5` (docs -- deferred-items.md + WINDOWS.md)

**Plan metadata:** (this commit, made after SUMMARY.md is written)

## Files Created/Modified
- `src/lib/mocks/store.ts` - Removed `node:fs`/`node:os`/`node:path` imports, `STORE_MIRROR_FILE_PATH`, `PersistedShape`, `readPersistedUsers`, `persistUsers`; added exported `resetMockStore()`; every mutation call site (`createUser`, `updateUserTheme`) no longer calls `persistUsers`.
- `src/lib/mocks/store.unit.test.ts` - New jsdom `unit`-project test: demo account seeded at import, `resetMockStore()` removes a created user while the demo account survives, and the reset is idempotent.
- `CONVENTIONS.md` - One new bullet under "Mock server (docs/adr/tech/0004)": mock/test state is in-memory-only, reset via an explicit function.

## Decisions Made
- `createUser`'s post-01-19 signature (`{ displayName?: string; email: string; password: string }`) was confirmed by reading `store.ts` fresh rather than assumed -- it already matched the plan's expectation, so no further widening was needed.
- `node:crypto`'s `randomUUID` import and use in `createUser` were left untouched, per the plan's explicit scope boundary (a separate, already-tracked concern).
- No existing test file (`handlers.test.ts`, `routes.test.ts`) was rewired to call `resetMockStore()` -- per-test random emails remain the isolation strategy; wiring `resetMockStore()` into the broader suite is explicitly deferred, not silently expanded into this plan.

## Deviations from Plan

### Auto-fixed Issues

None - the implementation followed the plan's `<action>` instructions exactly (remove the three Node built-in imports and the file-mirror functions, seed via `withDemoAccountSeeded([])` directly, add `resetMockStore()`, drop every `persistUsers` call site).

### Other Findings (logged, not fixed -- out of scope per SCOPE BOUNDARY)

**1. Pre-existing browser-mode test failures, unrelated to this plan**
- **Found during:** Task 1 verification (`pnpm test`, full suite).
- **Issue:** `src/components/ui/modal/modal.test.tsx` (1 test, 15000ms timeout) and `src/components/ui/text-field/text-field.test.tsx` (2 tests: a 15000ms timeout and an `onValueChange` assertion mismatch receiving raw keystroke event objects instead of expected string args) fail. Neither file is in this plan's `files_modified`, and grepping both for any reference to the mock store found none (the only "store" substring matches are the unrelated word "restores").
- **Why not fixed inline:** Out of scope per the SCOPE BOUNDARY rule -- these files were not touched by, and have no code path through, this plan's changes.
- **Logged:** `.planning/phases/01-foundation-auth-preferences/deferred-items.md` (items 3), `.planning/WINDOWS.md` (ids 9, 10).

**2. Pre-existing `tsc --noEmit` error in `app/layout.tsx`, unrelated to this plan**
- **Found during:** Task 1 verification (`pnpm exec tsc --noEmit`).
- **Issue:** `app/layout.tsx(11,35): error TS2304: Cannot find name 'LayoutProps'.` This plan never touches `app/layout.tsx`; likely a missing/stale `.next/types` ambient declaration in this worktree's build output.
- **Why not fixed inline:** Out of this plan's `files_modified` scope entirely.
- **Logged:** `.planning/phases/01-foundation-auth-preferences/deferred-items.md` (item 4), `.planning/WINDOWS.md` (id 11).

**3. Plan's own Task 2 `<automated>` verify command has an off-by-one context window**
- **Found during:** Task 2 verification.
- **Issue:** The plan's literal `<verify><automated>` command (`grep -A2 "Mock server..." CONVENTIONS.md | grep -c "lives in memory only"`) returns `0` because `-A2` only captures 2 lines after the heading match (the two pre-existing bullets), not the newly added third bullet 3 lines down. The plan's own `acceptance_criteria` check (`grep -c "lives in memory only" CONVENTIONS.md` returns `1`) is the substantively correct assertion and passes.
- **Why not fixed inline:** This is a discrepancy in the plan's verify command wording, not a code defect; the `acceptance_criteria` (the actual bar for "done") passes cleanly and the bullet is correctly placed under the existing heading with no other line changed.
- **Impact:** None on the delivered functionality -- documented here for transparency only.

---

**Total deviations:** 0 auto-fixed. 3 out-of-scope findings logged (not fixed, per SCOPE BOUNDARY).
**Impact on plan:** No scope creep. All three findings are demonstrably unrelated to `src/lib/mocks/store.ts`, `store.unit.test.ts`, or `CONVENTIONS.md`.

## Issues Encountered
None beyond the logged out-of-scope findings above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GC-09 closed: the mock store is in-memory-only with a tested, explicit reset function, and the convention against ad-hoc persistence is documented for future contributors.
- Three pre-existing, unrelated issues (Modal/TextField browser-mode test failures, `app/layout.tsx` tsc error) remain open in `.planning/WINDOWS.md` (ids 9-11) for a future dedicated plan.
- No blockers for the remaining wave-13 plans (01-20, 01-21) or downstream waves.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-18*

## Self-Check: PASSED
