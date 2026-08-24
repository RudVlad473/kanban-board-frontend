completed: 2026-08-24
---
created: 2026-08-23T08:14:09.326Z
title: Spike whether @storybook/nextjs-vite's navigation.mock avoids the import pitfall
area: testing
severity: minor
files:

  - src/components/layout/sidebar/sidebar.test.tsx
  - src/features/boards/components/board-list.test.tsx
  - docs/adr/tech/0020-no-mocking-policy.md
  - docs/adr/tech/0021-storybook-driven-component-tests.md

---

## Problem

`sidebar.test.tsx` and `board-list.test.tsx` each hand-write their own `vi.mock("next/navigation")`
shim — a documented, ADR-justified carve-out (`docs/adr/tech/0020`'s D-19) to a platform limitation:
no real Next.js router exists outside an actual request/render cycle in Vitest.

`@storybook/nextjs-vite` (the framework package this project already depends on, `10.5.7`) ships
its own pre-built, officially-maintained mock for exactly this: `@storybook/nextjs-vite/navigation.mock`,
exporting a `getRouter()` that returns a mocked router object (`push`/`replace`/`refresh`/etc. as
inspectable spies). Nobody has checked whether it can actually be used here.

The blocker: `docs/adr/tech/0021` documents a hard-hit pitfall — importing anything from
`@storybook/nextjs-vite`'s *main entry* eagerly pulls in real Next.js internals (an unresolvable
`sb-original/image-context` virtual module, then `next/dist/client/components/navigation.js`, which
reads `process.env` at module-evaluation time) that only resolve under the Vite plugin the separate
"storybook" Vitest project loads — this is literally what produced the historical "01-33 Storybook
stub files" bug. `composeStories`/`setProjectAnnotations` are therefore imported from `@storybook/react`
instead, never `@storybook/nextjs-vite`, in every `.test.tsx` (which lives in the "browser" project).

It's unverified whether the `navigation.mock` *subpath* export carries the same eager-import problem
as the main entry, or whether subpath exports are self-contained enough to import safely from the
"browser" project. Nobody has spiked it.

## Solution

TBD — spike first, then decide:

1. In a scratch/throwaway test file inside the "browser" Vitest project, try
   `import { getRouter } from "@storybook/nextjs-vite/navigation.mock"` and confirn whether the test
   file loads without hitting the `sb-original/image-context`/`process is not defined` failures
   ADR tech/0021 documents for the main entry.

2. If it's safe: replace both hand-written `vi.mock("next/navigation")` bodies with the framework's
   `getRouter()`-backed mock, update ADR tech/0020's Surviving Mock Register and D-19 wording
   accordingly (still a framework/environment shim, just no longer hand-maintained), and confirm
   `pnpm test:browser` stays green.

3. If it's not safe (subpath still drags in the same eager internals): close this todo with that
   finding recorded — the hand-written shim stays, and ADR tech/0020 gains a note explaining why the
   framework's own mock was evaluated and rejected, so this isn't re-investigated from scratch later.

## Resolution (2026-08-24) — spiked, rejected (path 3)

The subpath export is **not** safe here, and unlike the main entry the failure does not stop at
one workaround. Empirically, in the "browser" Vitest project:

1. `import { getRouter } from "@storybook/nextjs-vite/navigation.mock"` fails with
   `ReferenceError: process is not defined` at `next/dist/client/components/navigation.js:94` —
   the subpath statically imports that module, so it carries ADR tech/0021's pitfall exactly.
   Fixable with `define: { "process.env": "{}" }` on the project.

2. Past the import, the mock only *spies*; it does not substitute. `useRouter` is
   `fn(actual.useRouter)` — it delegates to real Next.js and throws `invariant expected app router
   to be mounted`. Storybook's framework preview wraps every story in
   `AppRouterContext.Provider value={getRouter()}`; the "browser" project deliberately does not
   load those annotations.

3. Supplying that provider by hand still fails: Vite's dep optimizer pre-bundles its own copy of
   the context module into the mock, so the imported `AppRouterContext` is a different React
   context instance than the one the mock reads. `optimizeDeps.exclude` then breaks unrelated CJS
   interop (`aria-query` stops providing `elementRoles`), failing every test file in the project.

Four stacked Vite-config workarounds, one cascading into unrelated breakage, to replace the
six-line shim in `src/test-utils/next-router-shims.tsx`. The hand-written shim stays. Recorded in
`docs/adr/tech/0020` ("Evaluated and rejected") so this isn't re-investigated from scratch;
re-evaluate only if the framework ships a context-provider decorator usable outside its own
preview.
