# 0030 — Optimistic writes go through the query cache, one entry per read

> **Supersedes [`docs/adr/tech/0029`](./0029-optimistic-writes-via-the-ui.md)** — the four writes
> that record moved off the mutation's own variables and onto the cache entry described here.

## Decision Drivers

- `tech/0029` put all four optimistic writes on TanStack Query's "via the UI" approach: each hook
  folded its in-flight `variables` over a `columns` array arriving as RSC props. That works, but it
  made every write's output an input to the next one. `BoardView` chained three hooks —
  `renamedColumns → reorderedColumns → renderedColumns` — purely so a column could be renamed and
  moved in the same session. The chain is not incidental complexity; it is what "via the UI"
  costs once more than one mutation targets the same data.
- The same shape has a second cost the chain hides: each hook needs its own retirement rule. 0029's
  rule 2 (the submitted `version` retires the override) had to be re-derived and re-tested per hook,
  and a story that models a refreshed server render has to bump versions to match.
- `tech/0019` keeps board reads out of the query cache **as props**, which is why the cache looked
  unavailable. That constraint is about where the *read* is issued, not about where the client holds
  it: an RSC read can hand its result to the client as a dehydrated cache entry instead of a prop,
  which is what `HydrationBoundary` is for.

## Decision

Every server-owned board read is one TanStack Query entry, seeded by the RSC render through
`HydrationBoundary`, and every optimistic write is TanStack's cache-based optimistic update
(`onMutate` snapshot → `setQueryData` → `onError` rollback → `onSuccess` settle).

Two entries exist:

| Entry | Key | Seeded by | Read by | Written by |
|-------|-----|-----------|---------|------------|
| Board list | `["boards"]` | `dehydrateBoards()` in `app/(dashboard)/layout.tsx` | `BoardList`, `DashboardHeader` | board create / rename / delete |
| Open board | `["board", boardId]` | `dehydrateBoard()` in `app/(dashboard)/boards/[boardId]/page.tsx` | `BoardView` | column rename / reorder, task move |

Three rules make it correct:

**1. Hydration, not `initialData`, is what retires an optimistic write.** `initialData` seeds an
entry that does not exist and is ignored once one does — a refreshed server render would never
reach the cache through it. `HydrationBoundary` compares `dataUpdatedAt` and does overwrite, so the
`refresh()` every mutating action already calls is what lands the authoritative value. The
`initialData` on `BoardView` and `BoardList` remains, and its only job is a story or a component
test that renders the component bare with no boundary above it.

**2. `onSuccess` MERGES the action's response, never assigns it.** The mutation responses are the
contract's tasks-less `ColumnResponseDTO` and subtask-less `TaskResponseDTO`, while these entries
hold `ColumnFull`/`TaskFull`. Assigning the response wholesale drops every task on a renamed column
and empties a moved card's checklist. `{ ...entry, ...response }` is the shape; the type error that
catches a violation is real, not a nuisance.

**3. A failed RSC read seeds nothing.** An entry holding `[]` or a half-board reads as authoritative
emptiness and never corrects itself. `dehydrateBoards()`/`dehydrateBoard()` seed only on success and
report `loadFailed`, and the query's own `queryFn` covers the refetch.

## Consequences

- `BoardView`'s three-hook chain collapses to one `useQuery`. `useRenameColumn`, `useReorderColumns`
  and `useMoveTask` return only their action plus their in-flight lock; none returns `columns`.
- `src/lib/client/optimistic-mutation.ts` (`useOptimisticVariables`) is deleted — 0029's mechanism
  had no remaining caller. So are the per-hook `apply*Pending*` folds and `*_MUTATION_KEY` exports.
- `buildBoardQueryKey` lives in `src/lib/core/query-keys/`, not in `features/boards/`. Both features write the
  open board's entry and D-18 forbids `features/tasks → features/boards`; `useMoveTask` types that
  entry structurally (`{ columns: TaskColumn[] }`) for the same reason.
- 0029's rule 1 (filter on the action's RESULT, not the promise) survives in a different form: these
  actions still *return* a refusal rather than throwing, so each `mutationFn` rethrows a non-`SUCCESS`
  status as an `Error` subclass. Without that throw, TanStack settles a refused write as a success and
  `onError` never rolls it back.
- 0029's rule 2 (the submitted `version` retires the override) is no longer needed. There is nothing
  to retire: the optimistic value IS the cache entry, and the next authoritative value replaces it.
  The 114ms revert window 0029 measured cannot occur, because no render reads a pre-mutation array.
- **What would make this false:** if a mutating Server Action stopped calling `refresh()`, its entry
  would hold the optimistically-written value until something else refetched it. `CONVENTIONS.md`
  requires that call, and the `e2e/*.e2e.spec.ts` specs assert a mutation's result survives without a
  manual reload, which is that requirement observed.
- `useOptimistic` remains the right default for optimistic state that is not server-owned. This
  record governs the two board entries only.

## Sources

- TanStack Query — Optimistic Updates, "Via the cache"; Advanced SSR, `HydrationBoundary` and
  `dataUpdatedAt`-based overwrite. Fetched 2026-09-01.
- `docs/adr/tech/0019-server-entry-points.md` — the read-placement constraint this works within.
