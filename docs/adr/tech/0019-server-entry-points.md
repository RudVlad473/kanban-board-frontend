# 0019 — Server entry points: Route Handlers banned, RSC reads, Server Action writes

## Decision Drivers

- Plan 02-08 shipped `app/api/boards/route.ts` + `useBoards()` (a Route Handler proxied through a
  TanStack Query `useQuery`) for the board-list read, following `tech/0002` exactly as originally
  written.
- The user's 02-08 checkpoint review rejected that pattern project-wide, in their own words: "we
  must explicitly forbid route handler in our app. it's either tanstack query or server
  components" (`02.1-CONTEXT.md` D-01/D-02) — a direct instruction, not a re-opened options
  analysis.
- `tech/0017` already carved auth mutations out to Server Actions, reasoning that `tech/0018`'s
  removal of MSW retired one of `tech/0002`'s two original rejection reasons (harder to intercept
  with a mock from a component test). This decision extends that same carve-out from auth alone to
  every domain, and additionally settles the *read* half, which `tech/0017` never addressed.
- Next.js 16 (this project's pinned version) introduces `refresh()` from `next/cache` — a
  Server-Action-only primitive purpose-built for "re-render a sibling UI element after a
  mutation," a materially better fit than `revalidatePath`/`updateTag` for this app's persistent
  `app/(dashboard)/layout.tsx`, which does not re-render on ordinary navigation. `tech/0002`'s own
  Sources list cites `revalidateTag` docs fetched before this API existed.

## Considered Options

Not a new options analysis — `tech/0002` already compared TanStack Query, SWR, RTK Query, and
RSC-fetch-plus-Server-Actions, and chose TanStack Query for both reads and writes. This record
revisits only the read half, given the user's explicit instruction above and a mechanism
(`refresh()`) `tech/0002` didn't have available when it was written. The write-side machinery
`tech/0002` chose TanStack Query for — structured `onMutate`/`onError` rollback — survives,
narrowed to that one job: wrapping a Server Action's `mutationFn`, never fetching data directly.

## Decision Outcome

Route Handlers (`app/**/route.ts`) are banned project-wide as a data-access mechanism. Every
server entry point is either:

1. **A React Server Component, for reads** — a server-side fetch, validated with zod
   (`tech/0024`), passed to a Client Component as plain, serializable props. No client-side query
   for list/detail data.
2. **A Server Action, for writes** — create/rename/delete/move/reorder, invoked directly by an
   RSC/form, or wrapped as a TanStack Query `mutationFn` when the caller needs client-side
   optimistic `onMutate`/`onError` rollback.

This is a blanket rule applied without re-deciding per feature — extending `tech/0017`'s
auth-only Server Actions carve-out to every domain (boards, columns, tasks, subtasks). TanStack
Query survives only as a mutation-lifecycle mechanism (the `useMutation` wrapper around a Server
Action); it is never a data source again. There is no more `useQuery` anywhere in this app for a
board/column/task/subtask read.

**The shape later plans copy** — this phase's own tracer (plan `02.1-01`) is the worked example
that shipped this pattern first:

- **Read side:** `src/features/boards/server/load-boards.ts` is a server-only function (`import
  "server-only"`) that calls `verifySession()` itself — never trusting that an outer guard already
  ran, the CVE-2025-29927 proxy-bypass class `app/(dashboard)/layout.tsx`'s own comment names —
  reads `userId` only from the session record (never from a caller, even though the OpenAPI
  contract declares it a client-suppliable query parameter), calls `externalApi.GET`, and returns
  a discriminated union (`LoadBoardsResult: {status:"ok"|"unauthenticated"|"error"}`) rather than
  throwing. It is composed as `<Suspense fallback={<SidebarSkeleton />}><SidebarBoards /></Suspense>`
  inside `app/(dashboard)/layout.tsx`, feeding a plain prop-driven `Sidebar` — no business logic
  leaks into `app/`, which stays routing/composition only per this project's own placement rule.
- **Write side (the pattern plans 02-10 through 02-13 must follow):** a `"use server"` action per
  file under `features/<domain>/actions/<action-name>.ts` — mirroring the per-file Server Action
  convention `tech/0017` already established for auth — in this fixed ordering:
  `verifySession()` (identity, never client-sent) → schema `.safeParse()` (`tech/0024`, runtime
  defense against an arbitrary wire payload TypeScript's compile-time types don't protect against)
  → the `externalApi` call → `refresh()` from `next/cache`.

`refresh()` is required after every board/column/task/subtask mutation because
`app/(dashboard)/layout.tsx` is a **persistent layout that does not re-render on ordinary
navigation** — a layout "preserves state, remains interactive, and does not rerender" when a
sibling page changes. Without an explicit `refresh()` call from inside the mutating Server Action,
a board created or deleted from a modal deeper in the tree would leave the Sidebar's board list
stale until a manual reload; the invoking navigation does not do this automatically.

## Consequences

- **Anti-pattern 1:** calling `refresh()`/`revalidatePath`/`updateTag` from anywhere other than a
  Server Action — `refresh()` throws when called from a Route Handler, and `updateTag` is
  Server-Action-only too.
- **Anti-pattern 2:** wrapping a Server Action in `useMutation` and expecting
  `queryClient.setQueryData` to update a component that never called `useQuery` — since reads
  never go through `useQuery` under this decision, there is no cache entry for that call to
  update. The optimistic apply/rollback belongs in local `useState` instead — the pattern
  `load-boards.ts`/`Sidebar` and the already-shipped `useThemePreference`
  (`src/features/theme/hooks/use-theme-preference.ts`) both already use.
- **Anti-pattern 3:** assuming a mutation triggered deeper in the tree (e.g. a modal on
  `/boards/[boardId]`) automatically refreshes the Sidebar's board list — it does not; every
  board-mutating Server Action must call `refresh()` itself, every time.
- Five files per mutation (form → mutation hook → fetch wrapper → Route Handler → DAL) collapse
  toward two or three (form/component → Server Action, optionally a thin `useMutation` wrapper for
  rollback) — the same collapse `tech/0017` already recorded for auth, now project-wide.
- `app/api/boards/route.ts` and its whole TanStack-Query-for-reads stack (`useBoards()`,
  `boardsApi`, `isBoard`/`isBoardArray`) are deleted outright, not deprecated in place — plan
  `02.1-01` already did this for boards; the same deletion applies to columns/tasks/subtasks as
  Phase 3/4 build them.

Unwind trigger: none anticipated — this is a direct, explicit user instruction, not a reversible
experiment. A future revisit belongs to a new record, not this one.

**Enforcement:** `pnpm handlers:check` (`scripts/check-no-route-handlers.mjs`), wired into CI's
`quality` job — fails the build if any `app/**/route.ts` file exists anywhere in the tree.

Sources:

- Next.js docs, `01-app/03-building-your-application/01-routing/01-layouts-and-pages.mdx` — layout
  non-rerender-on-navigation behavior ("preserve state, remain interactive, and do not rerender").
- Next.js docs, `01-app/03-api-reference/04-functions/refresh.mdx` — the Server-Action-only
  `refresh()` primitive (Next.js 16).
- Next.js docs, `01-app/02-guides/client-side-data-fetching/tanstack-query.mdx` — the RSC-rendered
  read + Server-Action-`mutationFn` combination this decision's write side follows.
- `docs/adr/tech/0017-auth-server-actions-carve-out.md` — the carve-out precedent this record
  extends from auth to every domain.
- `docs/adr/tech/0002-client-data-fetching-strategy.md` — the record this narrows (see its own
  supersession note).
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-CONTEXT.md`
  D-01/D-02/D-03 — the user's decision this record documents.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-RESEARCH.md`
  Architecture Patterns §1, Common Pitfalls §1/§4 — the `refresh()` reasoning and anti-patterns.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-01-SUMMARY.md`
  — what plan `02.1-01` actually shipped as this decision's tracer.
