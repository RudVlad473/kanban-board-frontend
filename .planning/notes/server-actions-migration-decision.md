---
title: Server Actions migration + testing strategy overhaul
date: 2026-08-18
context: Phase 01 (foundation-auth-preferences), explored via /gsd-explore before wave 14
---

# Server Actions migration + testing strategy overhaul

## Motivation

Current auth mutations (sign-up/sign-in/sign-out) go through a long chain for one action:
form → mutation hook → `auth-api.ts` fetch wrapper → `app/api/auth/*/route.ts` Route Handler →
DAL. That's 4-5 files to trace for a single button click, with hand-written request/response
shapes and TanStack Query mutation boilerplate at every step. Also a general distrust of mocking
in tests: "mocking just replaces real thing with test, basically creating a new environment."

## Scope

**Mutations only.** Sign-up, sign-in, sign-out, theme toggle, and future writes become Server
Actions. **Reads stay on TanStack Query** — Server Components / TanStack Query keep the
caching/revalidation Server Actions don't give you for free. This was a deliberate choice, not
an oversight — Server Actions for reads was explicitly considered and rejected.

## Sequencing

1. Refactor already-shipped, merged auth (sign-up/sign-in/sign-out) to Server Actions first.
2. Then revise plan 01-14 (theme preference — currently spec'd as `app/api/users/me/theme/route.ts`)
   to use the new pattern before it's built.

This is real, deliberate scope: it touches ~10+ already-tested, already-merged files (auth-api.ts
removed, both auth hooks rewritten from TanStack Query mutations to `useActionState`/
`useFormStatus`, both MSW-mocked component test suites rewritten, both e2e specs reworked). Not a
quick patch — needs proper planning (`/gsd-plan-phase` or a new gap-closure round) before
execution, not ad-hoc changes.

## ADR tech/0002 implications

`docs/adr/tech/0002-client-data-fetching-strategy.md` is a bigger decision than "Route Handlers vs
Server Actions for auth" — its real driver is the **kanban board's optimistic drag-and-drop**
(every task/column move carries a `version`; a stale write is rejected and rolled back). It
explicitly considered and rejected Server Actions for two reasons:

1. `useOptimistic` has no auto-rollback on Action failure — you'd hand-roll error/resync UI.
2. Server Actions are "harder to intercept with MSW from a component test."

Auth mutations never needed optimistic-rollback semantics, so reason (1) never applied to them —
this refactor doesn't reopen the ADR's real load-bearing decision. Reason (2) is now **partially
obsolete**: the new testing strategy (below) no-ops the action in component tests instead of
trying to intercept it via MSW, which is exactly the weakness that reason cited. Worth revisiting
whether the ADR's core-domain conclusion still holds — **not decided now**, flagged as a future
question. The board/task mutations staying on TanStack Query is a separate, bigger decision for a
different day.

A formal ADR entry superseding/amending tech/0002 for the auth-scoped carve-out is still needed
before implementation — not written yet.

## New testing strategy

Three layers, replacing the current MSW-per-test-case pattern entirely:

### Layer 1 — Unit tests (hooks, Server Actions, selectors)
Seed real state directly, don't fake it. TanStack Query's cache is this project's "store" (per
ADR tech/0002: no Redux/Zustand exists — server state lives in TanStack Query's cache, local UI
state in React state/Context). Seed via `queryClient.setQueryData(queryKey, data)`.

Open question, deferred to planning: for Server Actions specifically, does the unit test call
`src/lib/mocks/store.ts` directly (bypassing `server-client.ts`'s HTTP-shaped boundary entirely),
or mock `server-client.ts` with seeded return values? Not resolved — pick during actual planning.

### Layer 2 — Component tests (Storybook `composeStories`/play functions + RTL)
Real component tree, real client-side logic (zod validation, conditional rendering, text/element
positioning) — the action/API call is replaced with an **inert no-op**, not a faked response. This
tests UI/interaction correctness in isolation from business logic; it does not simulate business
scenarios (that's layer 1's and layer 3's job).

Form validation, error rendering, text/positioning all belong here — explicitly **not** pushed
into e2e, which stays thin.

### Layer 3 — E2E (Playwright)
Thin. Full business flows only (sign up, sign in, create board, etc.), against a **real deployed
non-prod backend** (in progress, not yet ready — this whole layer is blocked until then). CI
pipeline only, not run locally on every change.

### MSW's fate
Deprecated completely — both test layers (all three, above) and local dev (`instrumentation.ts`
currently starts MSW's Node-side interception at server-process startup, backing `pnpm dev`).
**Gated**: can't actually remove MSW from dev until the non-prod backend is stable enough to also
serve local development, not just CI e2e.

## Research grounding (2026-08-18)

- Layer 1 (seed real state, mock only the true boundary) = **"sociable unit tests"**, Martin
  Fowler's term for the classical/Detroit school of testing, vs. the mockist/London school
  (Freeman & Pryce, *Growing Object-Oriented Software, Guided by Tests* — mock every collaborator
  for full isolation). Currently the mainstream framing for React/Next.js state logic.
- The overall shape echoes Kent C. Dodds' **Testing Trophy**. Correction made mid-conversation:
  layer 2's "no-op the action, render the real component tree" is *not* the shallow/isolated
  rendering Dodds discourages — mocking only the outermost network boundary while rendering real
  components is exactly his own definition of an "integration test," the trophy's thickest,
  most-recommended layer.
- Next.js/Vercel has **no official recommended pattern for testing Server Actions** as of this
  research (nextjs.org/docs/app/guides/testing only says "they're async functions, test with
  Jest/Vitest"; community threads show ad hoc request-context mocking, no blessed answer).
- Storybook's play functions/`composeStories` are documented for interaction/DOM testing, not
  specifically for "no-op the API call" — that's a reasonable, common team convention layered on
  top of the docs, not an officially endorsed Storybook pattern by name.
- Named risk: an in-memory fake store can silently drift from what a real backend actually
  returns — neither seeded unit tests nor no-op'd component tests catch that, only e2e would,
  eventually. Standard mitigation: consumer-driven contract testing (Pact) or OpenAPI-schema-
  validated mocks (Prism). This project already has half of this via its committed OpenAPI
  contract + generated types (catches *shape* drift automatically, not *behavioral* drift).

## TanStack Query cache-seeding Storybook decorator (sketch, not yet implemented)

**This is a first-pass sketch, not a locked design.** The function-per-story approach
(`queryCacheSeed: (client) => ...`) works but isn't very declarative — worth revisiting at
planning time for something closer to a plain data shape (e.g. a `queryCacheSeed` object mapping
query keys to values, with the decorator doing the `setQueryData` calls) if that can be done
without inventing a serialization format that drifts from real query keys.


`src/lib/query-client.tsx`'s `QueryProvider` currently creates a fresh `QueryClient` per mount
with no way for a decorator to seed it before render. `.storybook/preview-annotations.tsx`
already wraps every story in `QueryProvider` (comment: "TanStack Query's provider today, the
future global store once one exists").

Design: give `QueryProvider` an `onCreateClient` escape hatch; the Storybook decorator reads a
`queryCacheSeed` function off `context.parameters` and calls it with the fresh client; individual
stories seed via the real `queryClient.setQueryData(queryKey, data)` API — no custom
serialization format, so there's no drift between what a story seeds and what a real `useQuery`
call would read.

```tsx
// src/lib/query-client.tsx
export const QueryProvider = ({ children, onCreateClient }: PropsWithChildren<{
  onCreateClient?: (client: QueryClient) => void;
}>) => {
    const [queryClient] = useState(() => {
        const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
        onCreateClient?.(client);
        return client;
    });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
```

```tsx
// .storybook/preview-annotations.tsx decorator
(Story, context) => (
    <QueryProvider onCreateClient={(client) => context.parameters.queryCacheSeed?.(client)}>
        {Story()}
    </QueryProvider>
),
```

```tsx
// some-component.stories.tsx
export const SignedIn: Story = {
    parameters: {
        queryCacheSeed: (client: QueryClient) => client.setQueryData(["user", "me"], mockUser),
    },
};
```

## Not yet decided / needs planning

- Server Action unit-test path: direct store call vs. mocked `server-client.ts`.
- Formal ADR entry superseding/amending tech/0002 for the auth-scoped carve-out.
- Whether to reopen the core-domain (board/task) Server Actions question now that reason (2) of
  tech/0002's rejection is weaker — explicitly not decided, flagged as a future question only.
- How/when the actual refactor gets planned (new gap-closure round in Phase 01, vs. a separate
  phase) — not decided.
