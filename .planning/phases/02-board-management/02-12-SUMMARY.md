---
phase: 02-board-management
plan: 12
subsystem: ui
tags: [react, zod, tanstack-query, server-actions, optimistic-update, base-ui, playwright, a11y]

# Dependency graph
requires:
  - phase: 02-07
    provides: the action-menu primitive (`components/ui/menu/menu.tsx`) the sidebar kebab composes
  - phase: 02-10
    provides: "`createBoardAction`'s Server Action ordering, `boardNameSchema`, the Storybook action-stub alias pattern"
  - phase: 02-11
    provides: "`DashboardHeader` taking the board list rather than the open board, and `BoardCard`'s host row"
  - phase: 02-14
    provides: "`RESULT_STATUS`, the shared result discriminant this plan extends twice"
  - phase: 02-15
    provides: "`pnpm tsx:check` / `pnpm renders:check`, which every new file here satisfies with no exemption"
provides:
  - "BOARD-04: rename a board from a per-board sidebar overflow menu, persisted across a reload"
  - The project's first optimistic mutation over RSC-supplied props — apply into local state, revert exactly, announce the failure
  - "`RenameOverrideProvider`, which makes the sidebar row and the header title move in the same instant"
  - "The per-board overflow menu (D-07), built on the action-menu primitive, with the delete entry ready for 02-13"
  - "`PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT` and the `CONFLICT`/`DUPLICATE` result discriminants"
  - The backend's real board-name ceiling (64), closing 02-BACKEND-FACTS.md P4's Escalate item
affects: [02-13, phase-03-columns, phase-04-tasks, SYNC-01]

actuals:
  tokens: 41000
  tasks: 4
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Optimistic apply-and-revert in local state, never a query cache (docs/adr/tech/0019 Anti-pattern 2)"
    - "A stale override retires by pure derivation off the value the row held at submit time — no state written during another component's render"
    - "A React context above two Suspense boundaries, so independently streamed subtrees share one optimistic value"
    - "Upstream problem codes mapped to this project's own discriminants through one table, never branch-by-branch at the call site"

key-files:
  created:
    - src/features/boards/actions/rename-board.ts
    - src/features/boards/actions/rename-board.integration.test.ts
    - src/features/boards/hooks/use-rename-board.ts
    - src/features/boards/components/board-card.tsx
    - src/features/boards/components/edit-board-modal.tsx
    - src/features/boards/components/rename-override-provider.tsx
    - src/test-utils/rename-board-action-storybook-stub.ts
    - e2e/boards-rename.e2e.spec.ts
  modified:
    - src/lib/core/api-contract/problem-detail.ts
    - src/lib/core/api-contract/result-status.ts
    - src/features/boards/schemas.ts
    - src/features/boards/components/board-list.tsx
    - src/components/layout/dashboard-header/dashboard-header.tsx
    - app/(dashboard)/layout.tsx
    - vitest.config.ts

key-decisions:
  - "The optimistic override lives in a React context above both dashboard Suspense boundaries, not in BoardList's own state — the header title would otherwise trail the sidebar by a server round trip, which the Task 4 review rejected."
  - "A stale override retires by derivation (apply only while the row still shows the name it had at submit time) rather than by clearing state during render, because two subtrees now share one override and a child may not set a parent's state mid-render."
  - "Rename failures branch on the backend's problem code: DUPLICATE_RESOURCE, UNAUTHENTICATED and ACCESS_DENIED each get authored copy; VALIDATION_FAILED, DATA_INTEGRITY_VIOLATION, BAD_CREDENTIALS and INTERNAL_ERROR stay generic because there is nothing distinct to tell the user."
  - "A stale-version conflict deliberately keeps the generic copy — explaining it properly is SYNC-01's job in Phase 4, and half-building that reconciliation would be worse than not starting it."
  - "The plan's 'duplicate names succeed on rename' truth is false against the real backend (409 DUPLICATE_RESOURCE, probed 2026-08-25); it is a refusal with its own copy, not a success."
  - "The board-name bound is 64, binary-searched against the real backend, replacing the conservative 100 that 02-BACKEND-FACTS.md P4 left unresolved."
  - "The integration suite drives the upstream contract directly rather than importing the action, following fetch-board-full.integration.test.ts — verifySession() and refresh() cannot run in the Vitest node project (docs/adr/tech/0025)."

patterns-established:
  - "Optimistic mutation over RSC props: capture the pre-submit value, apply an override, revert by dropping it, announce with authored copy — the shape Phases 3 and 4 copy for every column/task/subtask mutation."
  - "Sharing one optimistic value across independently streamed Suspense subtrees via a context provider mounted in the route-group layout."
  - "A programmable Server Action stub with hold/settle controls, so the in-flight window an optimistic apply opens is directly observable in a browser test."

requirements-completed: [BOARD-04]

coverage:
  - id: D1
    description: "A signed-in user renames an existing board from its sidebar overflow menu and the new name persists across a reload (BOARD-04)."
    requirement: BOARD-04
    verification:
      - kind: e2e
        ref: "e2e/boards-rename.e2e.spec.ts#renames a board from its sidebar overflow menu and keeps the new name across a reload"
        status: pass
      - kind: integration
        ref: "src/features/boards/actions/rename-board.integration.test.ts#renames the board, so a later board-list read shows the new name and an incremented version"
        status: pass
    human_judgment: false
  - id: D2
    description: "The rename applies optimistically — the sidebar row shows the new name the moment the form is submitted, before the write resolves (D-15)."
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx#shows the new name in that row before the rename resolves, leaving every other row alone"
        status: pass
    human_judgment: false
  - id: D3
    description: "The dashboard header's board title moves in the same instant as the sidebar row, not a beat later on the refreshed server render."
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/rename-override-provider.test.tsx#moves the header title and the sidebar row in the same instant, before the write resolves"
        status: pass
      - kind: e2e
        ref: "e2e/boards-rename.e2e.spec.ts#renames a board from its sidebar overflow menu and keeps the new name across a reload"
        status: pass
    human_judgment: false
  - id: D4
    description: "A failing rename restores exactly the previous name in every row and in the header, and announces the reason with a danger toast carrying no upstream text."
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx#restores the whole rendered name set and announces the reason when a rename fails"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx#raises the authored rename-failure copy, with no text from the rejection"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/rename-override-provider.test.tsx#reverts the header title as well as the sidebar row when the rename fails"
        status: pass
    human_judgment: false
  - id: D5
    description: "Rename failures are told apart by the backend's problem code: a duplicate name, an expired session and an unavailable board each get their own authored copy."
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx#names the clash when a rename is refused for a duplicate board name"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx#tells the user to sign in again when the rename is refused as unauthenticated"
        status: pass
      - kind: integration
        ref: "src/features/boards/actions/rename-board.integration.test.ts#refuses a rename to a name another board already uses, with a code outside the conflict branch"
        status: pass
    human_judgment: false
  - id: D6
    description: "A stale-version rejection is recognised as its own outcome rather than collapsed into a generic failure, while still taking D-15's generic rollback path in this phase."
    verification:
      - kind: integration
        ref: "src/features/boards/actions/rename-board.integration.test.ts#rejects a version one behind the board's current one as an optimistic-lock conflict"
        status: pass
      - kind: unit
        ref: "src/lib/core/api-contract/problem-detail.unit.test.ts#parses the optimistic-lock conflict body the backend returns for a stale version"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx#keeps the generic copy for a stale-version conflict"
        status: pass
    human_judgment: false
  - id: D7
    description: "Every rename request carries the board's current version, taken from the RSC-supplied row, and the schema refuses an input without one."
    verification:
      - kind: unit
        ref: "src/features/boards/schemas.unit.test.ts#rejects an input with no version at all"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/board-list.test.tsx#sends the row's own id and current version with the rename"
        status: pass
    human_judgment: false
  - id: D8
    description: "The per-board overflow menu (D-07) behaves as an action menu — two authored items, a destructive delete entry, no persisted selection and no trigger-glyph drift after activation."
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/board-card.test.tsx#leaves no item marked as selected and no trigger-glyph drift after an activation"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/board-card.test.tsx#exposes exactly the two authored menu items when the overflow menu is opened"
        status: pass
    human_judgment: false
  - id: D9
    description: "The rename modal (D-14) mirrors the create modal's composition: seeded with the current name, inline empty-name error, loading treatment, undismissable while pending, closes on success."
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/edit-board-modal.test.tsx#calls the submit handler once with this board's id, the new name and its current version"
        status: pass
      - kind: automated_ui
        ref: "src/features/boards/components/edit-board-modal.test.tsx#closes once the rename settles successfully"
        status: pass
    human_judgment: false
  - id: D10
    description: "The overflow trigger is legible against the selected row's background in light mode (regression fix: 1.05:1 -> 5.26:1)."
    verification:
      - kind: automated_ui
        ref: "src/features/boards/components/board-card.test.tsx#keeps the overflow trigger legible against the selected row's own background"
        status: pass
    human_judgment: true
    rationale: "The computed-colour assertion proves the token is applied, and the ratio was computed from tokens.css, but whether the glyph actually reads well at both themes and both viewports is a visual judgment. No MCP browser tooling was available to this agent, so no screenshot was taken."
  - id: D11
    description: "The board-name bound matches the backend's own measured ceiling of 64 characters."
    verification:
      - kind: unit
        ref: "src/features/boards/schemas.unit.test.ts#accepts a name at the backend's ceiling and rejects the first character past it"
        status: pass
    human_judgment: false
  - id: D12
    description: "The delete entry in the overflow menu is rendered as a real, enabled item awaiting plan 02-13's confirm modal."
    verification: []
    human_judgment: true
    rationale: "Rendered but wired to a no-op handler by design (the plan's own instruction); activating it does nothing until 02-13. Recorded under Known Stubs and in .planning/WINDOWS.md."

# Metrics
duration: 95min
completed: 2026-08-25
status: complete
---

# Phase 2 Plan 12: Rename a Board Summary

**Optimistic board rename over RSC-supplied props — applied into shared local state the instant the form is submitted, reverted exactly and announced by backend-error-code on failure — reached from a new per-board sidebar overflow menu.**

## Performance

- **Duration:** ~95 min
- **Started:** 2026-08-25T16:55:00Z
- **Completed:** 2026-08-25T18:30:00Z
- **Tasks:** 4 (3 build tasks + the Task 4 checkpoint, reviewed and returned with three required changes)
- **Files created/modified:** 24

## Accomplishments

- **BOARD-04 ships.** `renameBoardAction` follows `createBoardAction`'s ordering exactly — session, `.safeParse()`, upstream `PUT`, `refresh()` — with `userId` read only off the verified session record. Proved against the real deployed nonprod backend by both an integration suite and a Playwright e2e that reloads the page.
- **The project's first optimistic mutation over RSC props.** The apply-and-revert lives in local state, never a query cache (docs/adr/tech/0019 Anti-pattern 2). This is the shape every column, task and subtask mutation in Phases 3 and 4 copies.
- **The sidebar row and the header title move together.** `RenameOverrideProvider` holds the override above both of the dashboard layout's Suspense boundaries, so there is no lag between them.
- **Failures are told apart by the backend's own error code**, each with authored copy and no upstream text.
- **The per-board overflow menu (D-07)** on the extracted `BoardCard`, built on the action-menu primitive 02-07 shipped, with the delete entry in place for 02-13.
- **Two backend facts pinned that the phase had left open:** the real board-name ceiling (64, closing 02-BACKEND-FACTS.md P4's Escalate item) and the actual behaviour of a duplicate rename (refused, not allowed).

## Task Commits

1. **Task 1 (tracer): rename end to end, menu → persisted name** — `f2ebc54` (feat)
2. **Task 2: apply optimistically, revert exactly, announce the failure** — `f3c90be` (feat)
3. **Task 3: prove BOARD-04 end to end against the real backend** — `72d3d91` (test)
4. **Deviation: pin the board-name bound to the measured 64-character ceiling** — `b607d47` (fix)
5. **Task 4 review fixes: shared override, code-mapped failures, trigger contrast** — `8b401e8` (fix)

## Files Created/Modified

- `src/lib/core/api-contract/problem-detail.ts` — adds `OPTIMISTIC_LOCK_CONFLICT`, the code the backend actually emits for a stale version
- `src/lib/core/api-contract/result-status.ts` — adds `CONFLICT` (stale version) and `DUPLICATE` (name clash), deliberately separate
- `src/features/boards/schemas.ts` — `renameBoardInputSchema` (version required), `editBoardFormSchema`, board-name bound corrected to 64
- `src/features/boards/actions/rename-board.ts` — the Server Action and its upstream-code-to-discriminant table
- `src/features/boards/hooks/use-rename-board.ts` — the override context, `applyRenameOverride`, and the code-mapped failure copy
- `src/features/boards/components/board-card.tsx` — the extracted sidebar row with the overflow menu
- `src/features/boards/components/edit-board-modal.tsx` — D-14's rename modal
- `src/features/boards/components/rename-override-provider.tsx` — the shared override above both Suspense boundaries
- `src/features/boards/components/board-list.tsx` — renders `BoardCard`s from the overridden array, holds the rename modal
- `src/components/layout/dashboard-header/dashboard-header.tsx` — applies the same override to the title
- `app/(dashboard)/layout.tsx` — mounts the provider around both boundaries
- `src/test-utils/rename-board-action-storybook-stub.ts` — programmable outcomes plus hold/settle, so the in-flight window is observable
- `e2e/boards-rename.e2e.spec.ts` — BOARD-04 against the real backend, including reload persistence

## Decisions Made

See `key-decisions` in the frontmatter. The two worth restating:

**Retirement by derivation, not by clearing state during render.** The plan specified clearing the override during render, citing React's documented "adjust state when props change" pattern. That works only while the override is owned by the component that sees the boards. Once the header and sidebar share one override held by a provider above both, clearing it from a child's render would be a child setting a parent's state mid-render, which React forbids. The override therefore carries `previousName` — the name the row showed at submit time — and `applyRenameOverride` applies it only while the server's value still equals that. The moment the server moves off it, to the new name or to anything else, the override is inert. The observable behaviour is identical to the plan's, and the "a later server change is not masked" guarantee is now unconditional rather than dependent on effect timing.

**Which codes earn their own copy.** `DUPLICATE_RESOURCE` ("A board with that name already exists." / "Choose a different name."), `UNAUTHENTICATED` ("Your session has expired." / "Sign in again to rename this board.") and `ACCESS_DENIED` → `NOT_FOUND` ("That board is no longer available." / "Refresh to see your current boards."). `VALIDATION_FAILED`, `DATA_INTEGRITY_VIOLATION`, `BAD_CREDENTIALS` and `INTERNAL_ERROR` stay generic: the first is unreachable now that the client bound matches the backend's, the second and fourth are opaque server-side conditions, and the third is only ever emitted by sign-in. `CONFLICT` also stays generic, on purpose — a `must_haves` truth of this plan reserves that explanation for SYNC-01 in Phase 4.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] The RED-then-GREEN commit split could not be honoured**

- **Found during:** Task 1
- **Issue:** The plan requires tests-first commits. The repo's `pre-commit` hook runs type-aware ESLint over staged files, so a test-only commit referencing modules that do not exist yet fails with 47 `no-unsafe-*` errors. Committing type-correct stubs first would have collapsed most of the REDs anyway (adding the enum entry turns the problem-detail RED green; a real schema turns the schema REDs green).
- **Fix:** The RED state was observed and recorded before implementing — `pnpm test:unit` reported exactly 7 failures across the new problem-detail and rename-schema cases. Each task then landed as one atomic commit containing its tests and its implementation.
- **Verification:** RED run captured before any implementation existed; all gates green after.
- **Committed in:** `f2ebc54`

**2. [Rule 3 - Blocker] The integration suite the plan describes cannot be written**

- **Found during:** Task 1
- **Issue:** The plan says to follow `load-boards.integration.test.ts`'s `next/headers` cookie-jar shim. That file does not exist and the shim was retired by ADR tech/0025; `verifySession()` reads request-scoped `cookies()` and `refresh()` is Server-Action-only, so `renameBoardAction` cannot execute in the Vitest `node` project at all. Identical to the blockers 02-10 and 02-11 both recorded.
- **Fix:** `rename-board.integration.test.ts` follows `fetch-board-full.integration.test.ts` instead, driving the same `EXTERNAL_PATH` templates against the real backend with a real seeded credential: the successful rename and its version bump, the stale-version 409 recognised through `parseProblemDetail`, the duplicate-name 409 and that its code is *not* the optimistic-lock one, and both cross-account variants including the one supplying the victim's own `userId` (P7 / T-02-57). The session-scoped half is proved by `boards-rename.e2e.spec.ts`, the no-session branch by `route-guard.e2e.spec.ts`. The file's header comment records the split.
- **Committed in:** `f2ebc54`, extended in `72d3d91`

**3. [Rule 3 - Blocker] `RESULT_STATUS` had no conflict discriminant**

- **Found during:** Task 1
- **Issue:** The plan requires a conflict branch carrying "this project's own discriminant", but D-27 makes `RESULT_STATUS` the single declaration and it had no such member.
- **Fix:** Added `CONFLICT`, with a comment separating it from `PROBLEM_CODE.OPTIMISTIC_LOCK_CONFLICT` (the backend's code) — the same axis note `UNAUTHENTICATED` already carries. `DUPLICATE` was added later for the same reason.
- **Committed in:** `f2ebc54`, `8b401e8`

**4. [Rule 1 - Bug] The plan's duplicate-name truth is false against the real backend**

- **Found during:** Task 3
- **Issue:** A `must_haves` truth states "Renaming a board to a name another board already has succeeds — boards are identified by id, not name, symmetric with create." Probed directly: `PUT /boards/{id}` with a taken name is refused with `409 DUPLICATE_RESOURCE` ("Board with that name already exists"). It *is* symmetric with create — 02-10 recorded the same refusal there — but in the opposite direction from what the plan assumed. Writing the e2e step as specified would have shipped a permanently failing test; writing the browser test as specified would have shipped a test asserting behaviour the product does not have.
- **Fix:** The e2e covers the happy path only, per ADR tech/0022, with a header comment recording what it deliberately omits and where the omitted case is proved. The refusal and the fact that its code is outside the conflict branch are asserted in the integration suite. The browser suite asserts the rollback and its copy. Later, at the checkpoint review, the case earned its own authored copy rather than the generic toast.
- **Committed in:** `72d3d91`, `8b401e8`

**5. [Rule 2 - Missing critical] The client board-name bound was 36 characters looser than the backend's**

- **Found during:** preparing the Task 4 verification environment — seeding the plan's 90-character board failed with a 400.
- **Issue:** 02-BACKEND-FACTS.md P4 left the real ceiling unpinned ("between 1 and 1000") and 02-10 shipped a conservative `max(100)`. Binary-searched against the real backend: 64 accepted, 65 rejected. A 65–100-character rename therefore passed client validation, applied optimistically, and then failed upstream with no field-level reason — precisely the "user believes it persisted" failure mode this plan's own prohibition names.
- **Fix:** `boardNameSchema` is now `max(64)` with the measurement recorded beside it, and the unit test pins both sides of the boundary. This tightens create as well as rename, correctly — the backend enforces the same bound on both.
- **Verification:** `pnpm test` 848/848; the ceiling test asserts 64 accepted and 65 rejected.
- **Committed in:** `b607d47`

**6. [Rule 3 - Blocker] `pnpm comments:check` was already failing at the base commit**

- **Found during:** Task 1
- **Issue:** `app/api/session/force-sign-out/route.ts` had two adjacent comment blocks with no blank line between them, which the checker counts as one 6-line block. Untouched by this plan, but it blocks an acceptance criterion of every task.
- **Fix:** One blank line inserted between the two blocks. No prose changed.
- **Committed in:** `f2ebc54`

### Changes required by the Task 4 checkpoint review

Recorded as plan work, not deviations — the reviewer asked for all three and each is inside what this plan built. All in `8b401e8`.

1. **The header title lagged the sidebar row.** The override was local to `BoardList`, so the header only caught up on the refreshed server render. `RenameOverrideProvider` now holds it above both Suspense boundaries; `DashboardHeader` applies the same override. Proved by `rename-override-provider.test.tsx`, which renames with the write held open and asserts both have moved, and by an added header assertion in the e2e.
2. **Every failure collapsed into one generic toast.** Now mapped by problem code through one table in the action (see Decisions Made for which codes earn distinct copy and why the rest do not).
3. **The overflow trigger was invisible on a selected row in light mode.** The ghost variant's `text-text-muted` (`#66707F`) on `bg-bg-primary` (`#635FC7`) measures **1.05:1** — confirmed by computing the WCAG ratio from `tokens.css`, matching the reviewer's screenshot. The selected row now uses its own `text-text-on-primary`, giving **5.26:1**, and `bg-bg-primary-hover` on hover, giving **6.13:1**; both clear AA for text (4.5:1) and comfortably clear SC 1.4.11 for graphics (3:1). Dark mode measured **1.60:1** before the fix and is corrected by the same change — it read better than light mode but was not actually passing. **This is why axe never caught it:** the glyph is `aria-hidden` and the button's name comes from `aria-label`, so there is no text node for the colour-contrast rule to evaluate. A regression test now asserts the trigger's computed colour matches the row's own.

---

**Total deviations:** 6 auto-fixed (1 × Rule 1, 1 × Rule 2, 4 × Rule 3), plus 3 reviewer-requested changes.
**Impact on plan:** No scope creep. Two of the six correct false statements in the plan against measured backend behaviour, which is the kind of thing that would otherwise ship as a silently broken assertion. The reviewer's three changes strengthen what the plan already built rather than extending it.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `onDelete` handler is a no-op | `src/features/boards/components/board-list.tsx` | ~113 | The plan instructs the delete entry to be rendered as a real, enabled item — plan 02-13 supplies D-06's confirm modal in the very next wave. `BoardCard` requires the prop, so 02-13 gets a compile error if it forgets. Activating "Delete Board" does nothing today. |

## Issues Encountered

- **Base UI inerts everything outside an open dialog.** Role queries return nothing for the sidebar rows and the header title exactly while the rename modal is open — which is precisely when the rollback and the header sync need reading. Both suites read those two through the DOM instead, with the reason recorded in a comment.
- **Backdrop clicks land on the panel.** A modal backdrop's centre point is under the dialog itself, so `userEvent.click(backdrop)` times out. Fixed the same way `add-board-modal.test.tsx` already does — a corner offset.
- **`pnpm test:e2e` cannot read `.env.local`.** Neither `playwright.config.ts` nor `e2e/test-env.ts` loads it, and `e2e/global-setup.ts` refuses to run without `NONPROD_RESET_TOKEN`. Worked around by invoking Playwright through `node --env-file=.env.local`. Logged in `deferred-items.md`.

## Out of Scope, Logged Not Fixed

- **`route-guard.e2e.spec.ts` fails at the base commit.** It asserts zero `region` roles on the sign-in page; `ToastProvider` has mounted a `region "Notifications"` on every page since 02-07, and the assertion's own comment predates toasts. Reproduced with the spec run alone at `ed1c6a7`; nothing in this diff touches the sign-in path, the root layout or that spec. The other 31 e2e cases pass. Full detail in `deferred-items.md`.
- **A duplicate-name rename now has copy; a duplicate-name *create* still does not.** Out of this plan's files.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **02-13 (delete a board)** has everything it needs: `BoardCard.onDelete` is a required prop wired through `BoardList`, and the destructive menu entry is already styled and placed.
- **Phases 3 and 4** have the reference optimistic shape to copy, including the two parts that are easy to get wrong — retiring the override so it cannot mask a later server change, and sharing one override across independently streamed subtrees.
- **SYNC-01 (Phase 4)** has `RESULT_STATUS.CONFLICT` already distinguished at the action layer, with no reconciliation behaviour built ahead of it.
- **One thing left for the human:** the Task 4 checkpoint's visual observations (both themes, both viewports, the truncation of the long name, and an eyeball on the fixed contrast) were not performed by this agent — no MCP browser tooling was available to it, and CLAUDE.md forbids substituting a throwaway script. Everything falsifiable was automated instead.

## Self-Check: PASSED

All eight files claimed as created exist on disk, and all six commit hashes resolve in `git log`.

---
*Phase: 02-board-management*
*Completed: 2026-08-25*
