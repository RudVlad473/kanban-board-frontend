---
phase: 02-board-management
verified: 2026-08-26T11:05:00Z
status: human_needed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Sign out of an account that has boards, then sign in as a different account on the same browser — confirm no board name, board list, or board-detail content from the first account is ever visible, even for a frame, before the second account's own boards load."
    expected: "No cross-account board data ever renders. The sidebar and board view show only the newly signed-in account's own data (or an empty/loading state), never a flash of the previous account's boards."
    why_human: "Plan must_haves (02-01, 02-05, 02-08) flag this exact scenario as a judgment-tier prohibition ('flagged-unverified') that only a live cross-session browser check can confirm — grep/static analysis can show boards are RSC-fetched with no client cache (a strong structural argument this holds), but cannot observe an actual paint sequence across a real sign-out/sign-in transition."
  - test: "Trigger a create-board duplicate-name refusal, a rename refusal, and a board-detail 403/404, and read every character of the resulting banner/toast/error text."
    expected: "Every message is this app's own authored copy (e.g. 'A board with that name already exists. Choose a different name.') — never a raw backend string, error code, or stack trace fragment."
    why_human: "Multiple plans (02-07, 02-08, 02-10, 02-11, 02-12, 02-13, 02-16) carry this as a 'flagged-unverified' prohibition. Code inspection confirms every error path routes through bare RESULT_STATUS discriminants and this project's own copy tables (map-problem-code.ts, RENAME_FAILURE_COPY, CREATE_FAILURE_MESSAGE) with no interpolation of upstream text — strong static evidence — but a live check against the real backend's actual problem-detail bodies is what the plans themselves ask for before calling it resolved."
  - test: "Delete a board and confirm the confirmation modal cannot be bypassed (no auto-confirm, no one-click destroy), and that a rolled-back rename shows a visible danger toast rather than silently reverting."
    expected: "Delete always requires an explicit affirmative click on 'Delete Board' with initial focus on 'Keep Board'; a failed rename always raises a visible toast at the moment of rollback."
    why_human: "02-12 and 02-13 flag these as judgment-tier prohibitions. Code and component tests both confirm the mechanism (initialFocus={keepBoardRef}, toast.add(...) on non-SUCCESS), which is strong evidence, but the plans classify the *user-perceptible* guarantee as needing a live-eyes check, not just a passing assertion."
---

# Phase 2: Board Management Verification Report

**Phase Goal:** A signed-in user can create, browse, organize, and remove boards from their
personal sidebar.
**Verified:** 2026-08-26T11:05:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can view a sidebar listing all of their own boards | ✓ VERIFIED | `app/(dashboard)/layout.tsx` renders `<Sidebar>` wrapping `<SidebarBoards>` which awaits `fetchBoards()` (RSC read, `src/features/boards/server/fetch-boards.ts`) — real `externalApi.GET(EXTERNAL_PATH.BOARDS, { params: { query: { userId: record.id } } })` call, `userId` taken only from `verifySession()`. `board-list.test.tsx` (218 tests, all passing) and `e2e/boards-list.e2e.spec.ts` (2 tests) exercise this. |
| 2 | User can create a new board, optionally naming its initial columns, and it appears in the sidebar immediately | ✓ VERIFIED | `create-board.ts` (`createBoardAction`) + `create-board-columns.ts` two-phase write, orchestrated by `use-create-board.ts`; `refresh()` (next/cache) called on success so the persistent dashboard layout re-fetches `fetchBoards()` and the sidebar updates without a manual reload. `add-board-modal.test.tsx`, `board-list.test.tsx`, `e2e/boards-create.e2e.spec.ts` all cover this. Column-row default changed from 3→1 via a documented, approved reversal (D-01a/D-02a, 02-10-SUMMARY.md) — behavior (optional named columns) unchanged. |
| 3 | User can select a board from the sidebar and see its full contents (columns, tasks, subtasks) load in the board view | ✓ VERIFIED | `app/(dashboard)/boards/[boardId]/page.tsx` → `fetchBoardFull()` (RSC, zod-validated `.safeParse` through `boardFullSchema`) → `BoardView` renders columns, each column's task list, and `toSubtaskSummary()` per task ("X of Y subtasks"). Auto-select/redirect logic (D-11) and empty-board/zero-boards states also present and tested (`board-view.test.tsx`, `boards-empty-state.test.tsx`, `e2e/boards-detail.e2e.spec.ts`). |
| 4 | User can rename an existing board and the new name persists | ✓ VERIFIED | `rename-board.ts` (`renameBoardAction`) issues `externalApi.PUT`, calls `refresh()` on success. `use-rename-board.ts` applies an optimistic override with rollback + danger toast on failure (D-15). `edit-board-modal.test.tsx`, `board-list.test.tsx` (including the two new WR-01/WR-02 regression tests, both passing — see below), `e2e/boards-rename.e2e.spec.ts` cover this. |
| 5 | User can delete a board and it disappears from the sidebar along with all of its columns, tasks, and subtasks | ✓ VERIFIED | `delete-board.ts` (`deleteBoardAction`) issues a real `externalApi.DELETE` against `BOARD_DETAIL`, `refresh()` on success; cascade is a backend guarantee per `docs/adr/domain/0002-hard-cascade-delete.md`. `DeleteBoardConfirm` requires an explicit affirmative click, initial focus on the non-destructive "Keep Board" action. `delete-board-confirm.test.tsx`, `board-list.test.tsx`, `e2e/boards-delete.e2e.spec.ts` cover this. |
| 6 | User can collapse and expand the sidebar | ✓ VERIFIED | `sidebar.tsx` toggles `useBoolean` (`usehooks-ts`) between the full `<nav>` panel and a "Show Sidebar" `IconButton`; ephemeral state only (no cookie/storage), matches DEFAULTS.md C-009. `sidebar.test.tsx` — 22/22 passing, including explicit "restores expanded on fresh mount", keyboard-activation, and no-horizontal-overflow-when-collapsed cases. |

**Score:** 6/6 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/boards/server/fetch-boards.ts` | Real RSC board-list read | ✓ VERIFIED | `cache()`-wrapped, session-verified, calls real external API, `.safeParse` validated |
| `src/features/boards/server/fetch-board-full.ts` | Real RSC board-detail read | ✓ VERIFIED | Same pattern, keyed `cache()` by boardId, zod-validated nested schema |
| `src/features/boards/actions/create-board.ts`, `create-board-columns.ts` | Board + column creation writes | ✓ VERIFIED | Real `externalApi.POST` calls, session-derived `userId`, `refresh()` on success |
| `src/features/boards/actions/rename-board.ts` | Board rename write | ✓ VERIFIED | Real `externalApi.PUT`, shared `mapProblemCodeToStatus` error mapping |
| `src/features/boards/actions/delete-board.ts` | Board delete write | ✓ VERIFIED | Real `externalApi.DELETE`, session-derived `userId` and `boardId` re-validated server-side |
| `src/components/layout/sidebar/sidebar.tsx` | Collapsible sidebar chrome | ✓ VERIFIED | Toggles full panel vs. collapsed trigger, ephemeral `useState`/`useBoolean` |
| `src/features/boards/components/board-list.tsx` | Board list + create/rename/delete orchestration | ✓ VERIFIED | Wires `useCreateBoard`, `useRenameBoard`, `useDeleteBoard`; WR-01/WR-02 fixes present (`pendingRenameBoardId` scoping, `isEditDisabled`) |
| `src/features/boards/components/board-card.tsx` | Per-board row + overflow menu | ✓ VERIFIED | `Menu.Item isDisabled={isEditDisabled}` correctly wired to Base UI's `disabled` prop |
| `src/features/boards/components/board-view.tsx` | Board detail read-only render | ✓ VERIFIED | Renders columns, tasks, subtask summary; horizontal/vertical scroll regions present |
| `app/(dashboard)/boards/page.tsx`, `[boardId]/page.tsx`, `loading.tsx` (x2) | Routing + instant-pending navigation | ✓ VERIFIED | Server-side redirect for auto-select/zero-boards; `loading.tsx` files reuse `BoardViewSkeleton` per D-03 |

**Note on `app/api/boards/route.ts`:** Plan 02-08 originally built this Route Handler (BFF) as the tracer slice for BOARD-01. It was deliberately deleted and replaced by direct RSC reads (`fetchBoards`/`fetchBoardFull`) in the interleaved Phase 02.1 (commit `aac9b4f`, "rebuild board list read as RSC, delete Route Handler") per `docs/adr/tech/0019-server-entry-points.md`. This is a documented architectural evolution, not a missing artifact — the current RSC-based implementation is what all later Phase 2 plans (02-09 through 02-16) build on and is what's live in the codebase today.

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `board-list.tsx` | `create-board.ts` / `rename-board.ts` / `delete-board.ts` | `useCreateBoard()` / `useRenameBoard()` / `useDeleteBoard()` hooks calling the Server Actions | ✓ WIRED | Confirmed by reading all four files; mutation results drive UI state, toasts, and `router.push`/`refresh()` |
| `app/(dashboard)/layout.tsx` | `fetch-boards.ts` | `await fetchBoards()` inside `SidebarBoards`/`HeaderBoards` RSC components | ✓ WIRED | Both consumers share one upstream call via `cache()` |
| `board-card.tsx` | `board-list.tsx` | `onEdit`/`onDelete` callback props opening the row's modal state | ✓ WIRED | `isEditDisabled` prop correctly threaded from `pendingRenameBoardId` comparison |
| `[boardId]/page.tsx` | `fetch-board-full.ts` | `await fetchBoardFull({ boardId })` inside `BoardContents`, Suspense-keyed on `boardId` | ✓ WIRED | Confirmed the Suspense `key={boardId}` fix (commit `56ada39`) is present |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `board-list.tsx` (`renderedBoards`) | `boards` prop | `fetchBoards()` → real `externalApi.GET` | Yes | ✓ FLOWING |
| `board-view.tsx` (`board.columns`) | `board` prop | `fetchBoardFull()` → real `externalApi.GET` | Yes | ✓ FLOWING |
| `dashboard-header.tsx` (board title) | `boards` prop | Same `fetchBoards()` cache entry as sidebar | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| WR-01 regression test (per-board rename pending scoping) | `pnpm exec vitest run --project browser -t "does not show an unrelated board's edit modal as pending"` | 2 passed | ✓ PASS |
| Full `src/features/boards` browser suite | `pnpm exec vitest run --project browser src/features/boards` | 218 passed (8 files) | ✓ PASS |
| Full `src/features/boards` node suite (integration/unit) | `pnpm exec vitest run --project node src/features/boards` | 14 passed (3 files) | ✓ PASS |
| Sidebar collapse/expand suite | `pnpm exec vitest run --project browser src/components/layout/sidebar` | 22 passed (1 file) | ✓ PASS |
| Type check | `pnpm exec tsc --noEmit` | exit 0, no output | ✓ PASS |
| Lint | `pnpm exec eslint src/features/boards src/components/layout/sidebar "app/(dashboard)"` | exit 0, no output | ✓ PASS |

e2e specs (`e2e/boards-{list,create,rename,delete,detail}.e2e.spec.ts`) exist with real assertions for every success criterion but were not executed live against the dev server/backend in this verification pass (would require starting services, outside spot-check constraints) — their presence and content were inspected, not run.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| BOARD-01 | 02-08, 02-09, 02-11, 02-14 | Sidebar lists own boards | ✓ SATISFIED | `fetch-boards.ts`, `board-list.tsx`, `sidebar.tsx` |
| BOARD-02 | 02-07, 02-10, 02-14, 02-16 | Create board + optional columns | ✓ SATISFIED | `create-board.ts`, `create-board-columns.ts`, `add-board-modal.tsx`, D-01 duplicate-name mapping |
| BOARD-03 | 02-06, 02-11 | Select board, view full contents | ✓ SATISFIED | `fetch-board-full.ts`, `board-view.tsx`, auto-select redirect |
| BOARD-04 | 02-06, 02-07, 02-12, 02-16 | Rename board, persists | ✓ SATISFIED | `rename-board.ts`, `use-rename-board.ts`, optimistic + rollback |
| BOARD-05 | 02-07, 02-13 | Delete board, cascades | ✓ SATISFIED | `delete-board.ts`, `delete-board-confirm.tsx`, ADR domain/0002 |
| BOARD-06 | 02-09 | Collapse/expand sidebar | ✓ SATISFIED | `sidebar.tsx`, 22/22 passing tests |

**Prerequisite scope (PC-01..05, FT-01/02):** Not v1 requirements in `REQUIREMENTS.md` (theme/cookie architecture cleanup ahead of board work per 02-CONTEXT.md). No orphaned requirements found — `REQUIREMENTS.md`'s Phase 2 traceability row for all six BOARD-* IDs reads "Complete", matching what the codebase shows.

### Anti-Patterns Found

None. Scanned all files touched in this phase's most recent commits (02-16's fix/test commits) and swept the full `src/features/boards`, `src/components/layout/sidebar`, `app/(dashboard)` trees for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/"not yet implemented"/"coming soon" markers — none found outside legitimate HTML `placeholder=` input attributes and skeleton-component naming.

### Requirements / Design Deviations (documented, not gaps)

- **D-01a/D-02a (02-10):** Create-board modal default column-row count reduced from the plan's original 3 to 1, and blank rows now block submission instead of being silently trimmed. Documented, user-approved reversal at a live checkpoint (02-10-SUMMARY.md). Does not affect BOARD-02's substance (optional named columns still supported).
- **Route Handler → RSC (02-08 → Phase 02.1):** `app/api/boards/route.ts` from 02-08 was deleted and replaced with direct RSC reads. Documented architectural decision (docs/adr/tech/0019), confirmed via `git log --diff-filter=D`.
- **Code review WR-01/WR-02 (02-16):** Both warnings fixed via dedicated commits (`c17c09f` test, `5fa1a2c` fix), verified present in current `board-list.tsx`/`board-card.tsx` and passing.

### Human Verification Required

Three items, all rooted in this phase's own `must_haves.prohibitions` entries marked `(flagged-unverified)` by the plans themselves — judgment-tier checks that static/code inspection can support but not conclusively prove. Static evidence for all three is strong (see each item's rationale above); none surfaced a counter-indication during this review. Listed as human-verification per the phase's own prohibition framing, not because a defect was found:

1. **Cross-account board-data leakage after sign-out/sign-in on a shared browser** — see frontmatter `human_verification[0]`.
2. **No raw backend text ever reaches user-facing error copy** — see frontmatter `human_verification[1]`.
3. **Delete confirmation cannot be bypassed; rename rollback is always visibly announced** — see frontmatter `human_verification[2]`.

### Gaps Summary

No gaps found. All six ROADMAP success criteria are backed by real, wired, tested implementation:
sidebar board listing, board creation with optional columns, board-detail viewing with full
columns/tasks/subtasks, board rename with optimistic update and persistence, board delete with
confirmed cascade, and sidebar collapse/expand. The one deviation from a plan's literal frontmatter
(02-10's column-row default) is a documented, approved checkpoint reversal, not an unaddressed gap.
The 02-16 code-review warnings (WR-01, WR-02) were fixed in dedicated commits and are confirmed
present and passing in the current codebase — not just claimed in SUMMARY.md. The phase's own
`deferred-items.md` correctly scopes out-of-phase items (board/sign-out optimism, soft-delete,
cross-navigation caching, a stale AUTH-03 e2e assertion) that do not block this phase's goal.

Status is `human_needed` rather than `passed` solely because of the three judgment-tier
prohibitions above, which this phase's own plans explicitly flagged as needing a live check rather
than a static one.

---

_Verified: 2026-08-26T11:05:00Z_
_Verifier: Claude (gsd-verifier)_
