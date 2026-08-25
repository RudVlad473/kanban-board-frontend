---
phase: 02-board-management
plan: 13
subsystem: ui
tags: [react, zod, tanstack-query, server-actions, base-ui, playwright, a11y, destructive-action]

# Dependency graph
requires:
  - phase: 02-07
    provides: the action-menu primitive and the toast manager the failure notice is raised through
  - phase: 02-11
    provides: "`fetchBoards()`'s already-reversed newest-first array, which the destination rule reads"
  - phase: 02-12
    provides: "`renameBoardAction`'s ordering, the per-board overflow menu, and `BoardCard.onDelete` as a required prop"
  - phase: 02-14
    provides: "`RESULT_STATUS`, the shared result discriminant this plan's action returns"
  - phase: 02-15
    provides: "`pnpm tsx:check` / `pnpm renders:check`, which every new file here satisfies with no exemption"
provides:
  - "BOARD-05: delete a board, cascading to its columns and tasks, proved to have persisted across a reload"
  - "D-06's plain confirm modal, with initial focus on the non-destructive action"
  - "The project's first deliberately NON-optimistic mutation — the counterexample to 02-12's optimistic rename"
  - "`removeBoard` and `resolveDestinationAfterDelete`, D-08's three branches as pure functions"
  - "The delete Server Action stub, completing the four-stub `serverActionStubAlias` set"
affects: [phase-03-columns, phase-04-tasks, optimistic-pattern-review]

actuals:
  tokens: 31000
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A destructive confirm modal that puts initial focus on the non-destructive action via Base UI's `initialFocus`"
    - "A navigation decision extracted to a pure function, so all three branches are assertable without a router"
    - "Non-optimistic mutation: nothing changes on screen until the write succeeds, so a failure needs no rollback"

key-files:
  created:
    - src/features/boards/actions/delete-board.ts
    - src/features/boards/actions/delete-board.integration.test.ts
    - src/features/boards/hooks/use-delete-board.ts
    - src/features/boards/components/delete-board-confirm.tsx
    - src/features/boards/components/delete-board-confirm.stories.tsx
    - src/features/boards/components/delete-board-confirm.test.tsx
    - src/test-utils/delete-board-action-storybook-stub.ts
    - e2e/boards-delete.e2e.spec.ts
  modified:
    - src/features/boards/model.ts
    - src/features/boards/model.unit.test.ts
    - src/features/boards/schemas.ts
    - src/features/boards/schemas.unit.test.ts
    - src/features/boards/components/board-list.tsx
    - src/features/boards/components/board-list.test.tsx
    - src/features/boards/components/board-list.stories.tsx
    - src/features/boards/components/board-card.tsx
    - src/test-utils/next-router-shims.tsx
    - vitest.config.ts
    - .planning/phases/02-board-management/deferred-items.md

key-decisions:
  - "Delete gets ONE generic failure toast, deliberately unlike 02-12's per-error-code rename branches: nothing was changed, so there is no divergent state to explain or reconcile."
  - "Initial focus sits on 'Keep Board' via Base UI's `initialFocus`, so a reflexive Enter on an opening modal cannot trigger a cascade that has no undo."
  - "`break-words` on the confirmation body — an unbroken long board name overflowed the panel horizontally rather than wrapping, hiding which board was about to be destroyed."
  - "The post-delete move uses the router's `replace`, so the deleted board's address does not sit in the back history for a user to walk into."
  - "The destination decision lives in a pure `model.ts` function rather than inside the hook, which is what makes D-08's three branches assertable in the fast unit project instead of through a router."
  - "The tracer feedback gate was answered by re-running Task 1's own automated verify rather than by a separate mid-flight halt — the plan's own reversibility note routes that review to the Task 4 checkpoint."
  - "D-06's plain confirm is confirmed correct by the user at the Task 4 checkpoint; a 2-week soft-delete recovery window is logged as future scope, not committed work."

patterns-established:
  - "Non-optimistic destructive mutation: confirm, hold the UI still, let the action's own refresh() remove the row, and move the user only on success."
  - "A destructive modal guards its in-flight window three ways at once — loading treatment on the button, negated backdrop-dismissal, and a guarded close callback for Escape."

requirements-completed: [BOARD-05]

coverage:
  - id: D1
    description: "A signed-in user deletes a board and it disappears from the sidebar along with its columns and tasks, proved to have persisted across a reload (BOARD-05)."
    requirement: BOARD-05
    verification:
      - kind: e2e
        ref: "e2e/boards-delete.e2e.spec.ts#deletes a board with its columns, moves to the remaining board, then to the empty state"
        status: pass
      - kind: integration
        ref: "src/features/boards/actions/delete-board.integration.test.ts#deletes the board, so a later board-list read no longer contains it"
        status: pass
      - kind: integration
        ref: "src/features/boards/actions/delete-board.integration.test.ts#cascades, so a full-board read for a deleted board with columns resolves to no board"
        status: pass
    human_judgment: false
  - id: D2
    description: "Deletion is confirmed by a plain modal naming the board and stating the removal cannot be reversed — not a type-the-name-to-confirm pattern (D-06)."
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/delete-board-confirm.test.tsx#names this board in the body, in the Contract's own wording"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/delete-board-confirm.test.tsx#renders the Copywriting Contract's confirmation title"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx#opens the confirm modal naming that row's own board when its delete entry is activated"
        status: pass
    human_judgment: false
  - id: D3
    description: "Initial focus lands on the non-destructive action, so a reflexive Enter keypress cannot destroy a board whose contents cannot be recovered."
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/delete-board-confirm.test.tsx#puts initial focus on the keep action, not the destructive one"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/delete-board-confirm.test.tsx#deletes nothing when Enter is pressed the moment the modal opens"
        status: pass
      - kind: manual_procedural
        ref: "Task 4 checkpoint step 2 — user pressed Enter on the opening modal against the real app"
        status: pass
    human_judgment: false
  - id: D4
    description: "Deleting the currently-open board moves the user to the first remaining board, or to the zero-boards empty state if it was the last one, with the URL reflecting where they landed (D-08)."
    requirement: BOARD-05
    verification:
      - kind: unit
        ref: "src/features/boards/model.unit.test.ts#returns the first remaining board's path when the deleted board was the one being viewed"
        status: pass
      - kind: unit
        ref: "src/features/boards/model.unit.test.ts#returns the board-list path when the deleted board was the one being viewed and none remain"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx#moves to the first remaining board, replacing the history entry, when the open board is deleted"
        status: pass
      - kind: e2e
        ref: "e2e/boards-delete.e2e.spec.ts#deletes a board with its columns, moves to the remaining board, then to the empty state"
        status: pass
    human_judgment: false
  - id: D5
    description: "The board is never optimistically removed — a failed delete leaves the sidebar exactly as it was, navigates nowhere, and raises a danger toast (D-09)."
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx#navigates nowhere and announces the failure when the delete fails"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx#closes the confirmation once the delete settles, whichever way it went"
        status: pass
      - kind: manual_procedural
        ref: "Task 4 checkpoint step 8 — user blocked the delete request in DevTools against the real app"
        status: pass
    human_judgment: false
  - id: D6
    description: "The delete Server Action orders session-check, .safeParse(), upstream call, refresh(), and takes userId only from the verified session record (T-02-64)."
    verification:
      - kind: integration
        ref: "src/features/boards/actions/delete-board.integration.test.ts#never deletes a board belonging to a different account, whichever userId is supplied"
        status: pass
      - kind: unit
        ref: "src/features/boards/schemas.unit.test.ts#drops an unrelated userId supplied alongside the board id"
        status: pass
      - kind: other
        ref: "grep -nE 'userId' src/features/boards/actions/delete-board.ts — one non-comment occurrence, reading record.id"
        status: pass
    human_judgment: false
  - id: D7
    description: "The destructive button carries the loading treatment while in flight and cannot be double-submitted; Escape and a backdrop click both leave the modal open while pending (T-02-67)."
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/delete-board-confirm.test.tsx#starts no second delete when the destructive control is activated again while pending"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/delete-board-confirm.test.tsx#keeps the modal open on Escape while the delete is pending"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/delete-board-confirm.test.tsx#keeps the modal open on a backdrop click while the delete is pending"
        status: pass
    human_judgment: false
  - id: D8
    description: "The confirmation body wraps across lines for a long board name rather than truncating or overflowing the panel — it is prose, not a label."
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/delete-board-confirm.test.tsx#wraps a 200-character board name across lines rather than truncating it"
        status: pass
    human_judgment: false
  - id: D9
    description: "The delete flow, and the phase's three board mutations working together, read correctly in both themes and at both viewports."
    verification:
      - kind: manual_procedural
        ref: "Task 4 checkpoint step 9 — whole-phase pass by the user against the real app"
        status: pass
    human_judgment: true
    rationale: "A visual/UX judgment across themes and viewports. No browser/MCP tooling was available to this agent and CLAUDE.md forbids substituting a throwaway script, so this was verified by the user at the checkpoint, not by this agent."

# Metrics
duration: 55min
completed: 2026-08-25
status: complete
---

# Phase 2 Plan 13: Delete a Board Summary

**Hard-cascade board delete behind D-06's plain confirm modal — deliberately non-optimistic, with initial focus on the non-destructive action and a pure-function destination rule that moves the user only when the board they were looking at is the one that went away.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-08-25T18:36:00Z
- **Completed:** 2026-08-25T19:31:00Z
- **Tasks:** 4 (3 build tasks + the Task 4 checkpoint, approved with one future-scope note)
- **Files created/modified:** 19

## Accomplishments

- **BOARD-05 ships.** `deleteBoardAction` follows `renameBoardAction`'s ordering exactly — session, `.safeParse()`, upstream `DELETE`, `refresh()` — with `userId` read only off the verified session record. The cascade is proved against the real deployed nonprod backend by asserting that a full-board read for the deleted id **no longer resolves to a board at all**, not merely that the list got shorter.
- **The project's first deliberately non-optimistic mutation.** This is the counterexample to 02-12's optimistic rename, and the hook says so in its own comment so a later reader does not "fix" the apparent inconsistency. Nothing moves on screen until the write succeeds, which is why a failure needs no rollback and no divergent state to reconcile.
- **D-06's confirm modal, with the safety property that actually matters:** initial focus sits on "Keep Board", so a reflexive Enter on an opening modal cannot trigger a cascade that has no undo. Asserted twice — focus position, and that Enter-on-open submits nothing.
- **D-08's three destination branches as pure functions.** `resolveDestinationAfterDelete` returns a path or nothing, so all three cases are assertable in the fast unit project rather than through a router, and the hook's only job is to call `replace` when it gets one.
- **All six of BOARD-01 through BOARD-06 are now delivered** (BOARD-06 shipped in 02-09; only BOARD-05's own checkbox was flipped here — see Issues Encountered).

## Task Commits

1. **Task 1 (tracer): delete end to end, menu → confirmation → gone board** — `7e03b47` (feat)
2. **Task 2: move the user when the deleted board was the one being viewed** — `3ef2510` (feat)
3. **Task 3: prove the cascade and both redirect branches end to end** — `a7ecdba` (test)

**Plan metadata:** see the final `docs(02-13)` commit.

## Files Created/Modified

- `src/features/boards/actions/delete-board.ts` — the Server Action; no response body to parse, which is exactly why the session check and server-derived id are not optional
- `src/features/boards/actions/delete-board.integration.test.ts` — five cases against the real backend, including the cascade and the cross-account attempt using the victim's own `userId`
- `src/features/boards/hooks/use-delete-board.ts` — non-optimistic, one generic failure toast, `replace` navigation on success only
- `src/features/boards/components/delete-board-confirm.tsx` — D-06's modal; `initialFocus` on the keep action, `break-words` on the body
- `src/features/boards/model.ts` — `removeBoard` and `resolveDestinationAfterDelete`, both pure
- `src/features/boards/components/board-list.tsx` — holds the confirmation's open state and target board beside the rename modal's
- `src/test-utils/delete-board-action-storybook-stub.ts` — programmable outcomes plus hold/settle, completing the four-stub alias set
- `src/test-utils/next-router-shims.tsx` — gains `replace`, so the D-19 shim can observe the post-delete move
- `e2e/boards-delete.e2e.spec.ts` — BOARD-05 against the real backend, including the reload that proves persistence

## Decisions Made

See `key-decisions` in the frontmatter. The three worth restating:

**One generic failure, on purpose.** 02-12 mapped rename failures to per-error-code copy, and the obvious move was to copy that here. This plan's `must_haves` deliberately want the opposite, and the reason is sound: rename applies optimistically, so a failure leaves divergent state the user needs explaining. Delete changes nothing until it succeeds, so there is no divergence — "Couldn't delete board. / Try again." is genuinely the whole story. A repeat delete of an already-gone board lands on that same generic path rather than a special-cased branch.

**Initial focus is the load-bearing safety property.** The confirm modal is the entire mechanism between a click and permanent loss (ADR domain/0002 provides no soft delete and no undo). A modal that opens with the destructive button focused would put that loss one reflexive keypress away. Base UI's `initialFocus` takes the keep button's ref; two tests pin it, and the user checked it by hand at the checkpoint.

**`replace`, not `push`.** The deleted board's address must not sit in the back history — a user pressing Back onto a board that no longer exists would hit D-11's auto-select and get bounced somewhere else, which reads as the app losing track of where they are.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] The confirmation body overflowed the panel on an unbroken long name**

- **Found during:** Task 1
- **Issue:** The 200-character case failed on first run — `scrollWidth` 1405 against `clientWidth` 307. CSS will not break mid-word, so a board name with no spaces pushed the panel horizontally instead of wrapping, pushing the rest of the sentence — including "cannot be reversed" — out of view. The plan's own truth requires the body to wrap "rather than truncating or overflowing the panel", and this was overflowing it.
- **Fix:** `break-words` on `Modal.Description`, with the reason recorded beside it.
- **Verification:** The test now asserts no horizontal overflow, no ellipsis, no `nowrap`, **and** more than two lines of height — so it fails both if the text truncates and if it overflows.
- **Committed in:** `7e03b47`

**2. [Rule 3 - Blocker] The RED-then-GREEN commit split could not be honoured**

- **Found during:** Task 1
- **Issue:** The repo's `pre-commit` hook runs type-aware ESLint over staged files, so a test-only commit referencing modules that do not exist yet fails outright. Identical to the blocker 02-12 recorded.
- **Fix:** The RED state was observed and recorded before implementing — 3 schema failures, and the modal suite failing to import at all. Each task then landed as one atomic commit containing its tests and its implementation.
- **Committed in:** `7e03b47`, `3ef2510`

**3. [Rule 3 - Blocker] The integration suite the plan describes cannot be written as specified**

- **Found during:** Task 1
- **Issue:** The plan says to follow `load-boards.integration.test.ts`'s cookie-jar shim. That file does not exist and the shim was retired by ADR tech/0025; `verifySession()` reads request-scoped `cookies()` and `refresh()` is Server-Action-only, so `deleteBoardAction` cannot execute in the Vitest `node` project at all. The same blocker 02-10, 02-11 and 02-12 each recorded.
- **Fix:** `delete-board.integration.test.ts` follows `rename-board.integration.test.ts` instead, driving the same `EXTERNAL_PATH` templates against the real backend with a real signed-up credential. The file's header records the split and where the session-scoped half is proved.
- **Committed in:** `7e03b47`

**4. [Rule 3 - Blocker] `no-unnecessary-condition` rejected the empty-array guard**

- **Found during:** Task 2
- **Issue:** `const [first] = boards; first === undefined` is flagged, because without `noUncheckedIndexedAccess` TypeScript types the destructured element as `Board`, not `Board | undefined`.
- **Fix:** Switched to `remainingBoards.length === 0`, matching the pattern `app/(dashboard)/boards/[boardId]/page.tsx` already uses for the same decision.
- **Committed in:** `3ef2510`

### Scope adjustments (recorded, not defects)

**Task 1 touched two files the plan assigned to Task 2** — `board-list.test.tsx` and `board-list.stories.tsx`. Task 1's own last behaviour bullet ("activating the delete entry in a row's overflow menu opens the confirm modal for that board") is only assertable at the list level, and its `<files>` list did not include them.

**The tracer feedback gate was answered without a separate mid-flight halt.** Task 1 is `type="tracer"`, and in a non-auto run the executor would ordinarily stop for a human right after committing it. Task 1's `<verify>` is fully automated (re-run after the commit, green), and the plan's own `<reversibility rating="costly">` on that task says explicitly "Flagged for deliberate review at the Task 4 checkpoint" — so the confirmation-strength question was routed there, which is where the user answered it. Halting twice for the same question would have cost a dispatch for no new information.

**`board-card.tsx` needed no wiring.** 02-12 already shipped `onDelete` as a required prop with a real menu entry behind it; only its now-stale "plan 02-13 supplies this" comment changed. That plan's Known Stub is now closed.

---

**Total deviations:** 4 auto-fixed (1 × Rule 2, 3 × Rule 3), plus 3 recorded scope adjustments.
**Impact on plan:** No scope creep. The one substantive fix (deviation 1) closes a real hole in a safety-critical string — a confirmation that pushes "cannot be reversed" off-screen is not a confirmation.

## Known Stubs

None. 02-12's only stub — `BoardList`'s no-op `onDelete` — is closed by this plan.

## Issues Encountered

- **`pnpm test:e2e` still cannot read `.env.local`.** Worked around the same way 02-12 did, by invoking Playwright through `node --env-file=.env.local`. Re-logged under 02-12's existing entry in `deferred-items.md` as still true.
- **The worktree started with no `node_modules`.** `pnpm install --frozen-lockfile` first; and `pnpm lint` reports two spurious `no-unsafe-assignment` errors on `app/(dashboard)/boards/[boardId]/page.tsx` until `pnpm build` has generated `.next/types` — the same class of failure as the `LayoutProps` error 02-09 logged. Not a code defect; build first, then lint.
- **`BOARD-06`'s checkbox is still unticked in REQUIREMENTS.md.** It was delivered in 02-09 and is asserted by `boards-list.e2e.spec.ts` (hide/show sidebar), but this plan's `requirements` frontmatter is `[BOARD-05]` only, so ticking BOARD-06 was not mine to do. Flagging it for phase close-out.
- **The Task 4 verification environment could not be left running.** The plan asked for a live dev server at handoff; the orchestrator force-removes this worktree on return, which would have left a dead `next dev` squatting on port 3000 with deleted files under it. Started it, confirmed it served `/login` (200) and redirected `/boards` (307), then stopped it and handed over the seeded credentials plus the one command instead. The seeded account lives on the real backend and was unaffected.

## Out of Scope, Logged Not Fixed

- **`route-guard.e2e.spec.ts` still fails at this plan's base commit.** It asserts zero `region` roles on the sign-in page; `ToastProvider` has mounted a `region "Notifications"` on every page since 02-07. Already logged under 02-12; nothing in this diff touches the sign-in path, the root layout or that spec. All 32 other e2e cases pass, including the new `boards-delete` spec.
- **A 2-week soft-delete recovery window** — the user's own future-scope idea from the Task 4 checkpoint, logged under a new `## 02-13` section in `deferred-items.md`. Recorded there that it would require superseding ADR domain/0002 and backend support the contract does not currently expose, so it cannot be delivered frontend-only.
- **Delete's perceived responsiveness.** The user noted delete "isn't instant". That is D-09's designed behaviour, not a defect, and the user decided to address perceived responsiveness across board switching, rename, create-board and delete as one piece of work rather than by loosening D-09 here. Logged under `## 02-13` with an explicit "do not make delete optimistic as a local fix" note, since that would reintroduce exactly the failure D-09 exists to prevent.

## User Setup Required

None — no external service configuration required.

## Verification Results

- `pnpm test` — **915 passed / 74 files**, every Vitest project.
- `pnpm exec playwright test --project=e2e` — 32 passed, 1 failed (the pre-existing `route-guard` break above).
- `pnpm test:a11y` — 143 passed, zero axe violations, including the four new `DeleteBoardConfirm` stories.
- `pnpm build`, `pnpm lint`, `pnpm format:check`, `pnpm routes:check`, `pnpm handlers:check`, `pnpm comments:check`, `pnpm tsx:check`, `pnpm stories:check`, `pnpm renders:check`, `pnpm exec tsc --noEmit` — all clean.
- Every grep-based acceptance criterion across Tasks 1–3 returns its required value.
- **Task 4 checkpoint: approved by the user**, including the two load-bearing manual observations — step 2 (Enter on the opening modal deletes nothing) and step 8 (a blocked delete request leaves the board in the sidebar and raises the error toast).
- `pnpm test:visual` was **not** run: `playwright.config.ts` sets `ignoreSnapshots: !process.env.CI`, so off-CI it renders without asserting or writing baselines. No new `components/ui/` primitive was added, so no new baseline is owed.

## Next Phase Readiness

- **All six board requirements are functionally delivered.** BOARD-05's checkbox and traceability row are ticked here; BOARD-06's remain for phase close-out (see Issues Encountered).
- **Phases 3 and 4** now have both mutation shapes to copy from: 02-12's optimistic apply-and-revert for reversible edits, and this plan's non-optimistic hold-still for destructive ones. The choice between them turns on whether a failure leaves divergent state, and both hooks carry a comment saying so.
- **The queued optimistic-pattern review** has its scope recorded in `deferred-items.md` under 02-11 (create, sign-out) and 02-13 (delete's perceived responsiveness), with the D-09 constraint stated explicitly so that work does not undo this one.

## Self-Check: PASSED

All eight files claimed as created exist on disk, and all three task commit hashes resolve in `git log`.

---
*Phase: 02-board-management*
*Completed: 2026-08-25*
