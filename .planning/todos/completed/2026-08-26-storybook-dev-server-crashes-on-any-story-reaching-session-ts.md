---
created: 2026-08-26T21:05:00.000Z
title: "pnpm storybook"'s manual dev server crashes any story whose import chain reaches src/lib/server/session.ts
area: tooling
severity: major
files:
  - .storybook/main.ts
  - vitest.config.ts
  - src/lib/server/session.ts
---

## Problem

Running `pnpm storybook` and opening any story that transitively imports
`src/lib/server/session.ts` (e.g. `board-view.stories.tsx`'s `Populated`/`ManyColumns`, both
pre-existing since Phase 2) renders Storybook's own "component failed to render" error page
instead of the story:

```
Error: Module "node:crypto" has been externalized for browser compatibility. Cannot access
"node:crypto.randomUUID" in client code.
  at Object.get (http://localhost:6006/@id/__vite-browser-external:node:crypto:3:11)
  at http://localhost:6006/src/lib/server/session.ts:1:50
```

Confirmed this is not new: reproduces identically on `Populated` (Phase 2, untouched by Phase 3).
A component-only story with no such import (e.g. `column-header.stories.tsx`) renders fine.

## Suspected cause

`vitest.config.ts` defines a `serverActionStubAlias` (Pitfall 9's per-action stub aliasing,
ADR tech/0020) that Vitest's own Storybook-browser-mode project applies when running
`pnpm test`/`pnpm test:a11y` — which is why the identical stories render fine there (confirmed:
`pnpm test` passes 1026/1026 including these exact stories). `.storybook/main.ts`'s own Vite config
for the plain `pnpm storybook` dev server does not appear to apply the same alias, so any story
reaching a real server-only module (`session.ts`'s `node:crypto` usage) crashes only in that one
entry point.

## Impact

Anyone manually browsing Storybook via `pnpm storybook` (as opposed to running the test suite) to
visually inspect a board-view-based component sees a crash, not the component — as encountered
this session trying to verify plan 03-06's `ColumnHeader` dot colours/proportions live. Worked
around by checking `column-header.stories.tsx` directly instead, which doesn't reach the alias gap.

## Next steps

- Check whether `.storybook/main.ts` (or a Vite config it composes) needs the same
  `serverActionStubAlias` map `vitest.config.ts` defines, or an equivalent `resolve.alias`.
- Reproduce against `board-view.stories.tsx > Populated` directly via `pnpm storybook` to confirm
  the fix.

## Resolution (plan 04-07, 2026-08-28)

The suspected cause was right about the mechanism but wrong about the fix. `.storybook/main.ts`
did lack what `vitest.config.ts` had, but copying `serverActionStubAlias` across would not have
worked: `src/test-utils/sign-out-action-storybook-stub.ts` imports `@/lib/server/session` itself,
so the alias only moves the crash one module along.

What closes it is `viteFinal` adding `serverActionStubPlugin` (`scripts/vite-plugin-server-action-stub.mjs`),
which replaces the `"use server"` module wholesale at `enforce: "pre"` — the import chain to
`session.ts` never forms.

Verified by observation, both directions, against `pnpm storybook` on
`components-layout-board-view--populated` in headless Chromium:

- **With `viteFinal`:** the story renders (three columns, task cards, `+ New Column`). HAR shows
  131×200 / 2×101 and zero requests, `__vite-browser-external` or otherwise, for `node:crypto` or
  `src/lib/server/session.ts`. Dev-server log clean.
- **Control, `viteFinal` reverted:** reproduces this file's error verbatim — `Module "node:crypto"
  has been externalized …` at `__vite-browser-external:node:crypto:3:11` / `session.ts:1:50`.

The dev server also serves `src/features/boards/actions/create-column-action.ts` and
`src/features/auth/actions/sign-out-action.ts` as recorder modules, confirming the transform fires
against real module ids rather than only fixtures.
