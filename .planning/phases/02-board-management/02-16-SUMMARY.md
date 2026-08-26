---
phase: 02-board-management
plan: 16
subsystem: ui
tags: [nextjs, react, tanstack-query, suspense, server-actions]

requires:
  - phase: 02-board-management
    provides: board create/rename/delete flows (02-10..02-13), rename optimistic override (02-12)
provides:
  - shared upstream-error-to-result-status mapping used by both create and rename Server Actions
  - duplicate-name recognition on board creation
  - instant (submit-time, not settle-time) rename modal close
  - instant loading skeletons on board-to-board and /boards navigation via Next's loading.tsx
affects: [boards, error-handling, navigation]

actuals:
  tokens: 65000
  tasks: 4
  commits: 9

tech-stack:
  added: []
  patterns:
    - "Shared upstream-code-to-result-status mapping lives in one module (map-problem-code.ts), consumed by every Server Action that needs it, rather than a per-action local table."
    - "Next.js route-segment loading.tsx as the Suspense fallback for a blocking server read, instead of a component-local <Suspense> wrapper."

key-files:
  created:
    - src/lib/core/api-contract/map-problem-code.ts
    - src/lib/core/api-contract/map-problem-code.unit.test.ts
    - "app/(dashboard)/boards/[boardId]/loading.tsx"
    - "app/(dashboard)/boards/loading.tsx"
  modified:
    - src/features/boards/actions/rename-board.ts
    - src/features/boards/actions/create-board.ts
    - src/features/boards/hooks/use-create-board.ts
    - src/features/boards/components/board-list.tsx
    - src/features/boards/components/board-list.test.tsx
    - src/test-utils/create-board-action-storybook-stub.ts
    - "app/(dashboard)/boards/[boardId]/page.tsx"
    - src/features/boards/server/fetch-board-full.ts
    - src/features/boards/components/rename-override-provider.test.tsx

key-decisions:
  - "Reconfirmed deferral of optimistic board-creation and delete-adjacent work when re-raised at this plan's checkpoint — no new information changed the prior sessions' analysis."
  - "Declined experimental.staleTimes.dynamic (would stop the board-detail fetch refetching on every navigation) — a genuine architectural addition needing an ADR-0019 amendment, logged as backlog instead."
  - "Declined fixing two new UX findings (missing close-X on create/edit-board modals; column-remove-X 4px misalignment) — confirmed real but outside this plan's declared scope, logged as backlog."

patterns-established:
  - "Any upstream-error-to-result-status mapping a new Server Action needs goes through map-problem-code.ts, not a local table — closes the drift risk that motivated extracting rename-board.ts's original table."

requirements-completed: [BOARD-02, BOARD-03, BOARD-04]

coverage:
  - id: D1
    description: "Board creation recognises a duplicate name distinctly ('A board with that name already exists. Choose a different name.') via the shared map-problem-code.ts module, instead of a generic 'Couldn't create board. Try again.'"
    requirement: BOARD-02
    verification:
      - kind: unit
        ref: "src/lib/core/api-contract/map-problem-code.unit.test.ts"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx (duplicate-name and generic-error create cases)"
        status: pass
      - kind: manual_procedural
        ref: "Task 4 checkpoint step 1, live Playwright re-verification (orchestrator, this session) and user sign-off"
        status: pass
    human_judgment: false
  - id: D2
    description: "Rename modal closes the instant it is submitted, not once the mutation settles; a later failure still restores the previous name and raises the danger toast even though the modal is already gone."
    requirement: BOARD-03
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx (rewritten timing test, held/settled mutation)"
        status: pass
      - kind: manual_procedural
        ref: "Task 4 checkpoint step 2/3 — user live-verified via Chrome DevTools (fetch monkey-patch hold, then reject): modal closed instantly, sidebar reverted, danger toast appeared"
        status: pass
    human_judgment: true
    rationale: "The failure-after-close rollback path is timing-sensitive UI behavior a human needed to see fire live against a genuinely held/rejected request, not just a passing assertion."
  - id: D3
    description: "Both board-navigation routes (per-board detail and the bare /boards redirect) show the existing BoardViewSkeleton immediately on navigation via Next's own loading.tsx convention, before their blocking server read resolves."
    requirement: BOARD-04
    verification:
      - kind: automated_ui
        ref: "pnpm build (route-segment recognition), pnpm routes:check"
        status: pass
      - kind: manual_procedural
        ref: "Task 4 checkpoint step 4/5 — orchestrator reproduced via CDP network throttling (~400kbps/300ms latency) across 3 repeated board-to-board clicks, skeleton shown every time; user separately confirmed live"
        status: pass
    human_judgment: true
    rationale: "The regression this plan exists to fix (skeleton not showing) could not be distinguished from correct behavior on localhost's fast round-trip without artificial network throttling — needed a live pass, not just a unit assertion."

duration: n/a (multi-session)
completed: 2026-08-26
status: complete
---

# Phase 02: Board Management — Plan 16 Summary

**Shared upstream-error mapping closes the duplicate-name gap on board creation; rename modal now closes on submit, not on settle; both board-navigation routes get an instant Suspense-fallback skeleton via Next's loading.tsx convention.**

## Performance

- **Duration:** multi-session (spanned two sessions across a `checkpoint:human-verify` pause)
- **Tasks:** 4
- **Files modified:** 13

## Accomplishments
- Extracted `rename-board.ts`'s ad-hoc `UPSTREAM_CODE_TO_STATUS` table into a shared, unit-tested `map-problem-code.ts` module; board creation now consumes the same mapping and recognises a duplicate name distinctly instead of a generic failure.
- Rename modal closes the instant the user submits, not once the mutation resolves — the sidebar's existing optimistic override already shows the new name underneath; a later failure still restores the name and raises the danger toast after the modal is gone.
- Both board-navigation routes (`[boardId]` detail and the bare `/boards` redirect) show `BoardViewSkeleton` immediately on navigation via Next's own `loading.tsx` file convention.
- Fixed a genuine regression the first checkpoint round surfaced: the board-detail Suspense boundary wasn't keyed on `boardId`, so switching boards didn't always remount/show the skeleton — fixed by keying the boundary and deduping the fetch via React's `cache()`.
- Fixed a stale test assertion in `rename-override-provider.test.tsx` left red by Task 2's own change to a sibling file.

## Task Commits

1. **Task 1: Extract shared error-code mapping + create's duplicate-name branch (D-01)** - `906557e` (test), `6bcbf0a` (feat)
2. **Task 2: Close the rename modal on submit, not on settle (D-02)** - `c5bad6e` (test), `36a13e7` (feat)
3. **Task 3: Instant pending feedback via loading.tsx (D-03)** - `beb0a81` (feat)
4. **Task 4: checkpoint:human-verify** — approved after two rounds; round 1 fixes: `56ada39` (key Suspense boundary on boardId), `937a40d` (dedupe board-detail fetch with `cache()`), `46b3d75` (fix stale rename-modal assertion)

**Plan metadata:** `ba57dcb` (docs: create supplemental plan 02-16)

## Files Created/Modified
- `src/lib/core/api-contract/map-problem-code.ts` - shared upstream-code-to-result-status mapping
- `src/lib/core/api-contract/map-problem-code.unit.test.ts` - unit coverage for all four known codes + fallback
- `src/features/boards/actions/rename-board.ts` - now consumes the shared mapping, local table deleted
- `src/features/boards/actions/create-board.ts` - now consumes the shared mapping, recognises `DUPLICATE`
- `src/features/boards/hooks/use-create-board.ts` - per-status failure copy lookup, replacing one static string
- `src/features/boards/components/board-list.tsx` - `handleRenameSubmit` closes the modal unconditionally and immediately
- `src/features/boards/components/board-list.test.tsx` - rewritten timing test + two new create-duplicate/create-generic cases
- `src/test-utils/create-board-action-storybook-stub.ts` - queueable failure branch matching rename's stub shape
- `app/(dashboard)/boards/[boardId]/loading.tsx` - Suspense fallback for the board detail segment
- `app/(dashboard)/boards/loading.tsx` - Suspense fallback for the bare `/boards` redirect route
- `app/(dashboard)/boards/[boardId]/page.tsx` - Suspense boundary keyed on `boardId` (round-1 fix)
- `src/features/boards/server/fetch-board-full.ts` - wrapped in React `cache()`, matching `fetch-boards.ts` (round-1 fix)
- `src/features/boards/components/rename-override-provider.test.tsx` - fixed stale "Save Changes" assertion (round-1 fix)

## Decisions Made
- Reconfirmed deferral of optimistic board-creation and delete-adjacent work when re-raised at the checkpoint — no new information changed the prior sessions' analysis.
- Declined `experimental.staleTimes.dynamic` (would stop the board-detail fetch refetching on every navigation) — a genuine architectural addition needing an ADR-0019 amendment; logged as backlog.
- Declined fixing two new UX findings (missing close-X on create/edit-board modals; column-remove-X 4px misalignment) — confirmed real but outside this plan's declared scope; logged as backlog in `deferred-items.md`.
- Used the globally-installed headed Playwright integration for part of this session's live verification rather than restarting for the project's own headless server — a one-session tradeoff, not a standing preference change.

## Deviations from Plan

### Auto-fixed Issues

**1. Board-detail Suspense boundary not remounting on board switch**
- **Found during:** Task 4, round 1 checkpoint (first live pass)
- **Issue:** The `[boardId]` detail route's Suspense boundary wasn't keyed on `boardId`, so switching between two boards didn't reliably show the new `loading.tsx` skeleton — a genuine regression in what Task 3 was meant to deliver.
- **Fix:** Keyed the Suspense boundary on the bare `boardId` string in `app/(dashboard)/boards/[boardId]/page.tsx`.
- **Verification:** Re-verified live via Playwright (orchestrator) and via CDP network throttling reproducing the skeleton reliably across repeated clicks; user confirmed live.
- **Committed in:** `56ada39`

**2. Board-detail fetch not deduplicated**
- **Found during:** Task 4, round 1 investigation
- **Issue:** `fetch-board-full.ts` wasn't wrapped in React's `cache()`, unlike the existing `fetch-boards.ts` pattern.
- **Fix:** Wrapped the fetch in `cache()`, keyed on the bare `boardId` string (not an object, since `cache()` compares args with `Object.is`).
- **Committed in:** `937a40d`

**3. Stale test assertion in a sibling file**
- **Found during:** Task 4, round 1 — full suite was red before this fix
- **Issue:** `rename-override-provider.test.tsx` (last touched in plan 02-12) still asserted a "Save Changes" button that Task 2's modal-close change had unmounted; Task 2's own commit fixed the equivalent assertion in `board-list.test.tsx` but missed this sibling file.
- **Fix:** Updated the stale assertion to match the new modal-close timing.
- **Committed in:** `46b3d75`

---

**Total deviations:** 3 auto-fixed (all found live during the Task 4 checkpoint, not from a subagent's own self-check).
**Impact on plan:** All three necessary for correctness; the first was a real shipped-but-broken regression the checkpoint process caught exactly as intended, not scope creep.

## Issues Encountered
- The Task 4 checkpoint round took two full passes because the first live-verification pass surfaced a genuine regression (see Deviation 1) plus several tangential findings (missing modal close buttons, a cookie/httpOnly question, a refetch-caching gap) that needed real investigation, not guesswork.
- Verifying step 3 (block the rename request, confirm rollback) resisted automated network-interception: Chrome's "Offline" network condition queued the request rather than rejecting it (only failing once connectivity was restored, and then succeeding for real); a pre-hydration `window.fetch` monkey-patch via `initScript` was never invoked because this app's Server Action transport doesn't go through `window.fetch` directly. The user verified this step live with real DevTools "block request URL," which is the only reliable way to reproduce it.
- Two executor dispatches earlier in the session hit transient API connection drops mid-task; both recovered cleanly with no lost work since commits are atomic per-task (see the phase's own `.continue-here.md` history for the "failed ≠ stopped" lesson this surfaced).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Phase 02 (Board Management) is now fully complete: all 16 plans across BOARD-01 through BOARD-06 delivered and verified. Ready for phase-goal verification and roadmap close-out.

---
*Phase: 02-board-management*
*Completed: 2026-08-26*
