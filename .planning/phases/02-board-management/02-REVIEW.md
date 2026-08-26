---
phase: 02-board-management
reviewed: 2026-08-26T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/lib/core/api-contract/map-problem-code.ts
  - src/lib/core/api-contract/map-problem-code.unit.test.ts
  - src/features/boards/actions/rename-board.ts
  - src/features/boards/actions/create-board.ts
  - src/test-utils/create-board-action-storybook-stub.ts
  - src/features/boards/hooks/use-create-board.ts
  - src/features/boards/components/board-list.tsx
  - src/features/boards/components/board-list.test.tsx
  - app/(dashboard)/boards/[boardId]/loading.tsx
  - app/(dashboard)/boards/loading.tsx
  - app/(dashboard)/boards/[boardId]/page.tsx
  - src/features/boards/server/fetch-board-full.ts
  - src/features/boards/components/rename-override-provider.test.tsx
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-08-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed plan 02-16's shared problem-code-to-result-status mapping, the create/rename board Server
Actions that consume it, the create-board hook, the sidebar board list, the two new loading.tsx
Suspense fallbacks, the board-detail page's Suspense/redirect wiring, the deduped `fetchBoardFull`
read, and the two related test files.

`map-problem-code.ts` and its unit test are clean — the mapping table, the fallback behaviour, and
the test's use of `Object.values(RESULT_STATUS)` to assert exhaustiveness are all sound. The three
round-1 checkpoint fixes (Suspense keyed on `boardId`, `fetchBoardFull` deduped via `cache()`, the
raw-status 403/404 check for board-detail reads) all check out.

The one substantive concern is in `board-list.tsx`: the D-02 change that closes the rename modal on
submit rather than on settle removes the only thing that previously made a second, overlapping
rename on the same row hard to trigger. Nothing in this file (or in `board-card.tsx`, checked for
context) gates the "Edit Board" menu item on a rename already being in flight, and the rename hook's
`isPending` flag is a single, ungated value shared across every row rather than being scoped per
board. Both problems are demonstrable from the code as written; see WR-01 and WR-02 below.

## Warnings

### WR-01: Rename's `isPending` is global, not per-board, and gets applied to the wrong modal

**File:** `src/features/boards/components/board-list.tsx:58, 178`
**Issue:** `useRenameBoard({ boards })` is called once per `BoardList`, backed by a single
`useMutation()` inside the hook (`use-rename-board.ts`). `isRenamePending` is therefore true for
*any* board's rename while *any* rename is in flight — it is not keyed by board id. `board-list.tsx`
passes this single flag straight through to whichever `EditBoardModal` happens to be open:
```tsx
const { renameBoard, isPending: isRenamePending, boards: renderedBoards } = useRenameBoard({ boards });
...
<EditBoardModal ... isPending={isRenamePending} />
```
Sequence that reproduces it 100% of the time, no race required: rename board A, then — while A's
`renameBoardAction` is still in flight (any real network latency is enough) — open "Edit Board" on
*board B* from the same list. `board-card.tsx`'s menu item is never disabled on `isRenamePending`
(confirmed: no `disabled`/`isPending` prop reaches it), so the menu opens B's `EditBoardModal` fine,
but that modal immediately renders with `isPending={true}` (spinner on the submit button, backdrop
dismiss disabled) even though nothing about board B is pending — only A is. The user is briefly
blocked from submitting a rename for a board that has no in-flight write of its own.
**Fix:** Scope pending state per board, e.g. track the boardId of the in-flight rename in
`useRenameBoard`/`board-list.tsx` and only pass `isPending` through when
`boardBeingRenamed?.id === pendingBoardId`:
```tsx
const isRenamePendingForOpenBoard =
    isRenamePending && pendingRenameBoardId === boardBeingRenamed?.id;
...
<EditBoardModal ... isPending={isRenamePendingForOpenBoard} />
```

### WR-02: Overlapping renames on the same row can roll back to a stale name/version

**File:** `src/features/boards/components/board-list.tsx:94-97`
**Issue:** D-02's own comment states the design: "closed on submit, not on settle... a later
failure still reverts it." `handleRenameSubmit` fires the mutation and immediately clears
`boardBeingRenamed`, so nothing prevents the user from reopening "Edit Board" on the *same* row
and submitting a second rename before the first one settles (the menu item isn't gated — see
WR-01 — and once the first mutation resolves, `isRenamePending` flips back to `false`
synchronously, well before the Server Action's `refresh()` round-trip repopulates `boards` with
the new server state). If a second rename is submitted in that window:
- The reopened modal's `version` comes from `renderedBoards` (only `name` is overridden by
  `applyRenameOverride` in `use-rename-board.ts` — `version` is never patched), so it still carries
  the pre-first-rename version. If the first rename already landed server-side, the second request
  is sent with a stale version and gets refused as an optimistic-lock conflict.
- If that second rename itself fails, `useRenameBoard`'s rollback (`setOverride(null)`) falls back
  to the raw `boards` prop, whose `name` is computed once via
  `boards.find((board) => board.id === boardId)?.name` at the time the second rename started — i.e.
  the name from *before the first rename*, not the (possibly already-persisted) intermediate name.
  The row can flash back to a name older than what the server actually holds until the next
  `refresh()`-driven re-render corrects it.
**Fix:** Disable (or hide) the "Edit Board" menu entry for a row whose id matches an in-flight
rename, so a second submit on the same row cannot start until the first has settled and its
`refresh()` has repopulated props:
```tsx
<Menu.Item
    disabled={pendingRenameBoardId === board.id}
    onClick={() => { onEdit(board); }}
>
    Edit Board
</Menu.Item>
```

## Info

### IN-01: Storybook stub redeclares `CreateBoardResult` instead of importing the type

**File:** `src/test-utils/create-board-action-storybook-stub.ts:9-16`
**Issue:** The stub hand-copies the real action's result union rather than importing it as a
type-only import from `@/features/boards/actions/create-board`:
```ts
type CreateBoardResult =
    | { status: typeof RESULT_STATUS.SUCCESS; board: Board }
    ...
```
This is currently identical to `CreateBoardResult` in `create-board.ts`, but the duplication means
a future change to the real action's result shape (e.g. adding a field to the `SUCCESS` branch)
would not be caught by the type checker here — the stub would keep compiling against its own
stale copy, and Storybook/tests would silently exercise a shape the real action no longer returns.
**Fix:** `import type { CreateBoardResult } from "@/features/boards/actions/create-board";` — a
type-only import is erased at compile time and does not pull the "use server" module's runtime
(session/crypto) import chain into the browser bundle, so it should not run into the bundling
constraint the file's own comment describes for value imports.

### IN-02: Two different mechanisms decide the same kind of "upstream failure" question

**File:** `src/features/boards/server/fetch-board-full.ts:18, 51-53` vs.
`src/lib/core/api-contract/map-problem-code.ts`
**Issue:** Writes (`create-board.ts`, `rename-board.ts`) now resolve upstream failures through the
single shared `mapProblemCodeToStatus`/`parseProblemDetail` mechanism this plan introduced
specifically so "create and rename cannot drift apart on what a 409 means." The board-detail read
in the same feature area (`fetchBoardFull`) still resolves its own upstream failure with a
separate, ad hoc raw-HTTP-status set (`UNREACHABLE_BOARD_STATUSES = new Set([403, 404])`) that
never parses a problem body at all. Functionally fine today, but it means the codebase now carries
two independent places that encode "which upstream signal means 'this resource is not yours'" —
if the backend's `ACCESS_DENIED`/403 semantics ever changed, only one of the two would be updated.
**Fix:** No change required for this phase; worth a follow-up note (or an ADR cross-reference) if
reads are ever brought onto the same problem-code mapping as writes.

---

_Reviewed: 2026-08-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
