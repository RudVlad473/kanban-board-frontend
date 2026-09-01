# 0029 — Optimistic writes read the mutation's variables, retired by the submitted version

## Decision Drivers

- Phase 4 grew four optimistic writes — board rename, column rename, column reorder, task move —
  under three different mechanisms: two hand-rolled `apply*Override` helpers with
  snapshot-and-compare staleness, and two on React's `useOptimistic`. One problem, three shapes.
- `CLAUDE.md` and `CONVENTIONS.md` both recorded that TanStack Query's optimistic-updates guide
  "does not apply here… it writes to the query cache," which `tech/0019` keeps reads out of. That
  is true of the guide's **first** approach only. Its second, "via the UI", reads the mutation's
  own `variables` and touches no cache. The over-broad note kept it out of consideration for a
  whole phase.
- `useOptimistic` cannot serve the board rename. `app/(dashboard)/layout.tsx` streams the sidebar
  (`SidebarBoards`) and the header (`HeaderBoards`) as two independent Suspense boundaries, so
  they have no common client owner to hold the optimistic state. That is precisely why
  `RenameOverrideProvider` existed: a hand-rolled global store standing in for one the app already
  had.

## Decision

All four optimistic writes read their pending value from the mutation's own variables via
`useOptimisticVariables` (`src/lib/client/optimistic-mutation.ts`), built on `useMutationState`
with a `mutationKey`. `RenameOverrideProvider`, `RenameOverrideContext` and both `apply*Override`
helpers are deleted; `useOptimistic` is no longer used for board state.

Two rules make it correct, and both were established by measurement rather than reading:

**1. Filter on the action's RESULT, not the promise.** These Server Actions *return* a
non-`SUCCESS` `status` rather than throwing, so TanStack records a refused write as a settled
success. Filtering `mutation.state.status === "error"` alone left every refused write applied
forever — the rollback cases in `board-list.test.tsx` and `sortable-column.test.tsx` caught this
as 20 failures.

**2. The submitted `version` is the retirement signal, because `status: "pending"` is too short.**
The guide's own example filters on `pending`. That drops the optimistic value the moment the
mutation settles — but the authoritative value arrives on a *later* render, when the action's
`refresh()` lands. Measured 2026-09-01 against the running app with a `MutationObserver`, a
successful board rename read:

| t (ms) | Sidebar | Header | |
|--------|---------------|---------------|---------------------------------|
| 0      | ORIGINAL NAME | ORIGINAL NAME | baseline |
| 17260  | RENAMED VALUE | ORIGINAL NAME | optimistic applies |
| 17266  | RENAMED VALUE | RENAMED VALUE | header follows, cross-tree |
| 17608  | ORIGINAL NAME | RENAMED VALUE | **mutation settles → reverts** |
| 17612  | ORIGINAL NAME | ORIGINAL NAME | |
| 17722  | RENAMED VALUE | RENAMED VALUE | refreshed props land |

114ms — roughly seven frames — of the name the user had already changed. Every optimistic write
submits the version it read, so applying the change only while the entity still carries that
version spans the gap and retires itself when the bump lands. Re-measured after the change: three
DOM transitions, monotonic, no revert.

## Consequences

- One mechanism for all four writes, and one fewer provider in the dashboard layout.
- A story that lands a "refreshed server render" must bump the version too. A fixture that changes
  only the name models a server the backend cannot produce, and will not retire the optimistic
  value. Both `ServerPropsAdvance` and `ServerColumnsAdvance` were corrected for this.
- **What would make this false:** if a mutating Server Action stopped calling `refresh()`, a
  succeeded write would never see its version bump and its optimistic value would persist until
  `gcTime`. `CONVENTIONS.md` requires that call, and the `e2e/*.e2e.spec.ts` specs assert a
  mutation's result is visible without a manual reload, which is that requirement observed.
- `useOptimistic` remains the right default for optimistic state that is *not* server-owned, where
  no version exists to retire against. This record governs the four board writes only.
- Recorded against advice: the drag sites (column reorder, task move) had working `useOptimistic`
  implementations, and folding an array of pending variables through `reorderColumns` /
  `moveTaskInColumns` is more machinery than the primitive's own reducer. The user chose one
  mechanism over two on consistency grounds, which is a legitimate call this record exists to
  document rather than re-litigate.

## Sources

- TanStack Query — Optimistic Updates, "Via the UI" and "If the mutation and the query don't live
  in the same component" (`useMutationState` + `mutationKey`), fetched 2026-09-01.
- `examples/react/nextjs-app-optimistic-updates` — the App Router worked example.
