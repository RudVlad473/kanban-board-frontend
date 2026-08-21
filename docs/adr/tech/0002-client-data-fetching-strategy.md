# 0002 — Client data-fetching & mutation strategy

> **Superseded in part** by `docs/adr/tech/0017-auth-server-actions-carve-out.md` — auth mutations
> (sign-up, sign-in, sign-out) now use Server Actions; board/column/task mutations stay as decided
> below.

> **Superseded in part** by `docs/adr/tech/0019-server-entry-points.md` — the *read* half of this
> decision is superseded outright: board/column/task/subtask list/detail reads no longer go
> through `useQuery`; they are server-side React Server Component fetches instead. The *write*
> half survives only as the optimistic-rollback wrapper `0019` describes — a `useMutation` around
> a Server Action's `mutationFn`, never a direct `openapi-fetch` call from inside a query/mutation
> hook. The Route Handler transport this decision assumed (`app/api/**/route.ts`) is banned
> outright by `0019`.

## Decision Drivers

- Every Column/Task/Subtask update, move, and reorder carries a
  `version` and a stale value is REJECTED, not merged (CONTEXT.md,
  ADR domain/0002); dragging a task is optimistic-first, so the chosen
  layer must snapshot pre-mutation state and cleanly restore it on a
  rejected write.
- No same-repo database — every read/write is a call to a separate,
  not-yet-deployed REST service; Server Actions can only proxy to it,
  not mutate a local DB directly.
- Must be realistically mockable inside both Vitest Browser Mode (real
  Chromium component tests) and Playwright E2E, the project's fixed
  testing stack.
- This is the single most consequential frontend architecture decision
  in the app — every mutation-heavy flow runs through it, rewrite-level
  to change later.

## Considered Options

**TanStack Query** (recommended)
- Pros: `onMutate`/`onError`/`onSettled` gives an explicit
  snapshot-and-restore lifecycle that maps directly onto "reject a stale
  `version`, restore prior state"; trivially mockable with MSW in both
  Vitest Browser Mode and Playwright; its cache is inherently global and
  shared across components with no extra store.
- Cons: adds a real dependency (~16KB) and its own mental model for a
  solo developer to learn.

**SWR**
- Pros: smaller (~5.3KB), simpler API, equally solid external-API fit.
- Cons: `rollbackOnError`/`optimisticData` are looser, per-call options
  rather than TanStack's structured per-mutation lifecycle object —
  matters more for rapid successive card-drag mutations.
- Why not the recommendation: rollback is real but less structured than
  TanStack Query's for a UI where snapshot/restore is the central
  interaction, not an edge case.

**RTK Query**
- Pros: `updateQueryData(...).undo()` gives an equally explicit
  patch/undo mechanism.
- Cons: requires adopting a global Redux store for a project with no
  other reason to need one.
- Why not the recommendation: the operational/learning cost of Redux is
  paid every day; nothing else in this app needs a Redux store.

**RSC fetch + Server Actions (`useOptimistic` + `revalidatePath`/`revalidateTag`)**
- Pros: no extra client-side dependency, stays inside Next.js's own
  primitives.
- Cons: `useOptimistic` does not auto-rollback on Action failure — the
  developer must hand-roll error UI and any re-sync; Server Actions run
  serially rather than in parallel when invoked from a client `queryFn`
  per TanStack's own Advanced SSR guide; harder to intercept with MSW
  from a component test since Server Actions execute inside Next.js's
  own server pipeline.
- Why not the recommendation: the two things this decision most needs —
  structured rollback and dual-layer testability — are exactly what this
  option is weakest at.

## Decision Outcome

Chosen: **TanStack Query**. Confirmed by the user at Phase 4's
walkthrough after a clarifying question about global state management —
resolved as: server state (boards/columns/tasks/subtasks) lives in
TanStack Query's cache, which is already global and shared; local-only
UI state (sidebar, modal-open, drag-in-progress) is handled separately
by React's built-in state/Context (see `DEFAULTS.md`, C-009) — no Redux
store needed for either. User: "yes let's go with recommended solution."

## Consequences

Unwind trigger: the app's optimistic-update/rollback needs outgrow what
TanStack Query's mutation lifecycle comfortably expresses (e.g. complex
multi-entity transactions with partial rollback) → re-open against RTK
Query or a hand-rolled solution.

Sources:
- https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
  — fetched 2026-08-09 (primary-docs).
- https://react.dev/reference/react/useOptimistic — fetched 2026-08-09
  (primary-docs): confirms no automatic rollback on Action failure.
- https://swr.vercel.app/docs/mutation — fetched 2026-08-09
  (primary-docs).
- https://tanstack.com/query/v5/docs/framework/react/guides/advanced-ssr
  — fetched 2026-08-09 (primary-docs).
- https://redux-toolkit.js.org/rtk-query/usage/manual-cache-updates —
  fetched 2026-08-09 (primary-docs).
- https://mswjs.io/docs/quick-start/ — fetched 2026-08-09 (primary-docs).
- https://nextjs.org/docs/app/api-reference/functions/revalidateTag —
  fetched 2026-08-09 (primary-docs).
