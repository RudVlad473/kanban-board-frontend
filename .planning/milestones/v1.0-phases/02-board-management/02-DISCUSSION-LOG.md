# Phase 2: Board Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-20
**Phase:** 2-Board Management
**Areas discussed:** Create-board flow, Delete confirmation, Empty & landing states, Rename interaction

---

## Pending Todos (cross-reference)

Two low-scoring todo matches (score 0.2, keyword-only) were surfaced before the gray-area
discussion: "Clear the theme cookie on sign-out" (auth) and "Fix path traversal in
scripts/serve-static.mjs" (tooling). Neither is board-domain work.

**User's choice:** Fold both into Phase 2's scope.
**Notes:** Both land in CONTEXT.md's Folded Todos section; the path-traversal fix is flagged as
an independent standalone task, not board-feature work.

---

## Create-board flow

| Option | Description | Selected |
|--------|-------------|----------|
| 3 empty rows | Matches classic Todo/Doing/Done starter shape | ✓ |
| 1 row, add more manually | Minimal default, more clicks for the common case | |
| 0 rows — columns fully separate | Column naming happens after creation, not in the modal | |

**User's choice:** 3 empty rows.

| Option | Description | Selected |
|--------|-------------|----------|
| Add and remove freely | 0 named columns valid | ✓ |
| Add freely, minimum 1 | Can't remove the last row | |
| Fixed at 3, no add/remove | Row count never changes | |

**User's choice:** Add and remove freely, 0 valid.

| Option | Description | Selected |
|--------|-------------|----------|
| Close modal, show inline error + retry | Board created, modal closes, toast/banner with retry scoped to failed column(s) | ✓ |
| Keep modal open on failure | Modal stays open showing succeeded/failed rows | |
| Silent — just show what landed | No explicit error surfaced | |

**User's choice:** Close modal, inline error + scoped retry.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep modal open, show error | Nothing created yet, form stays intact for retry | ✓ |
| Close modal, toast error | User has to reopen and retype everything | |

**User's choice:** Keep modal open, show error.

---

## Delete confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Plain confirm modal | "Delete '[Board Name]'?" + Delete/Cancel | ✓ |
| Type-to-confirm | User types the board name to enable Delete | |

**User's choice:** Plain confirm modal.

| Option | Description | Selected |
|--------|-------------|----------|
| Per-board menu in the sidebar | Kebab/overflow Dropdown menu with Rename/Delete | ✓ |
| Delete button inside the board view | Requires opening the board first | |
| Both | Sidebar menu + mirrored board-view action | |

**User's choice:** Per-board menu in the sidebar.

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to next board, or empty state | Auto-select another board if one exists | ✓ |
| Redirect to /boards, no auto-select | Generic pick-a-board screen regardless | |

**User's choice:** Redirect to next board, or empty state.

| Option | Description | Selected |
|--------|-------------|----------|
| Close modal, error toast | Board stays in sidebar, retry via toast | ✓ |
| Keep confirm modal open with inline error | Modal stays open, Delete re-enabled | |

**User's choice:** Close modal, error toast.

---

## Empty & landing states

| Option | Description | Selected |
|--------|-------------|----------|
| Empty state + prominent create CTA | Centered message + Create button, same modal | ✓ |
| Auto-open the create-board modal | Modal pops immediately on landing | |

**User's choice:** Empty state + prominent create CTA.

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-select first board | Redirect into the first board when no valid selection | ✓ |
| Explicit "pick a board" screen | Neutral prompt even when boards exist | |

**User's choice:** Auto-select first board.

| Option | Description | Selected |
|--------|-------------|----------|
| Creation order, newest first | Newest board at the top | ✓ |
| Creation order, oldest first | Oldest board at the top, new ones append | |
| Alphabetical by name | Sorted by name, renamed board jumps position | |

**User's choice:** Creation order, newest first.

**Notes:** Flagged mid-discussion that `BoardResponseDTO` has no `createdAt` field, so
"newest first" has no confirmed data source yet.

| Option | Description | Selected |
|--------|-------------|----------|
| Flag for research to verify | Keep newest-first as intended UX, verify against real backend before implementation | ✓ |
| Switch decision to alphabetical now | Sidestep the ordering-source question entirely | |

**User's choice:** Flag for research to verify.

---

## Rename interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Modal | Reuses Modal + TextField, matches EditBoardModal already named in CONVENTIONS.md | ✓ |
| Inline rename | Click-to-edit directly in the sidebar row | |

**User's choice:** Modal.

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic | Sidebar updates instantly, rolls back on failure (TanStack Query onMutate/onError) | ✓ |
| Wait for server | Modal shows loading state until PUT resolves | |

**User's choice:** Optimistic.

---

## Claude's Discretion

None — every gray area discussed had a concrete decision made; no "you decide" selections in
this round.

## Deferred Ideas

None raised beyond the phase boundary during this discussion.
