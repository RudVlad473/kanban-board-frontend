---
created: 2026-08-23T08:14:09.326Z
title: Spike closing the untested router.refresh() convention with a play-function exception or alternative
area: testing
severity: minor
files:
  - CONVENTIONS.md
  - src/features/boards/components/board-list.tsx
  - scripts/check-no-play-functions.mjs
  - docs/adr/tech/0025-direct-composed-story-rendering.md
---

## Problem

CONVENTIONS.md's Data-fetching section states: "Every mutating Server Action calls `refresh()`...
after its write succeeds" (its own wording misattributes this to `next/cache` — the real call site
is `router.refresh()` from `next/navigation`, invoked client-side in
`src/features/boards/components/board-list.tsx:38`). Enforcement is "code review" only — there is
zero automated test anywhere in the repo asserting a mutation actually triggers `router.refresh()`.

`@storybook/nextjs-vite/navigation.mock`'s `getRouter()` exposes `refresh` as an inspectable spy —
the framework's own documented way to assert this exact behavior. But every documented usage pattern
for it runs through a story's `play()` function, and this project has a blocking, mechanically
enforced, repo-wide ban on `play:` in any `.stories.tsx` file (`scripts/check-no-play-functions.mjs`,
`docs/adr/tech/0025`'s D-25) — for an unrelated reason (composeStories' `.run()` hid the rendered
tree from deep-interaction assertions). That ban forecloses the framework's own intended mechanism
for testing this convention, repo-wide, not just per-file.

## Solution

TBD — needs a decision, not just an implementation:

1. First resolve the sibling todo (spike on `navigation.mock`'s import safety) — if that mock can't
   even be imported into the "browser" project, this todo's premise (using its `refresh` spy at all)
   may be moot until/unless that changes.
2. Decide whether closing this gap is worth a narrow, explicitly-scoped exception to the play-function
   ban (e.g. only inside the "storybook" Vitest project, never "browser") — weigh that against
   re-opening a decision that already drove a 17-file/79-call-site rewrite (ADR tech/0025).
3. Alternative worth considering instead of touching D-25 at all: assert on `router.refresh()` from
   an ordinary (non-story, non-play-function) `.test.tsx` test using a hand-written `vi.fn()` spy on
   `useRouter()`'s returned object — check whether this is meaningfully different from the pattern
   D-19 already permits for `next/navigation`, or whether it just re-introduces the maintenance
   burden the sibling todo is trying to avoid.
4. Also worth a fresh look, per this session's Storybook nextjs-vite discussion: Storybook's newer,
   currently-experimental "CSF Next" syntax (`preview.meta()`/`meta.story()`, `play({ canvas, userEvent })`)
   hands the play function a direct `canvas` handle — possibly resolving the exact "opaque rendered
   tree" problem that drove D-25's ban in the first place. Confirm current stability/support before
   treating this as a real option, not just a "watch this" note.
