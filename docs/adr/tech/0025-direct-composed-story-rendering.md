# 0025 — Direct composed-story rendering, superseding tech/0021

Supersedes `docs/adr/tech/0021-storybook-driven-component-tests.md`.

## Decision Drivers

- `composeStories`' `.run()` is an opaque helper — a test cannot see or control the exact rendered
  React tree it produces. This makes deep interaction assertions awkward or impossible:
  `sign-in-form.test.tsx`'s real-`FormData`-on-submit test needs to attach its own native `submit`
  listener to the actual `<form>` element before the click that triggers it, and needs to reach
  `rendered.container` to do so — neither is available through `.run()`'s return value. This
  opacity, not the two-render-mechanisms-collide symptom below, is the primary reason for this
  reversal.
- A secondary, real symptom: `.run()` (via `testingLibraryRender`) and `vitest-browser-react`'s
  `render()` (via the now-deleted `renderWithProviders`) didn't clean up after each other, forcing
  every file mixing both mechanisms to carry its own per-file DOM-wipe `afterEach`. Unifying on one
  rendering mechanism removes the need for that per-file workaround.
- A second, independent driver: `QueryProvider` was wired in two places —
  `.storybook/preview-annotations.tsx`'s decorator (consumed by every story, including through
  `.run()`) and `src/test-utils/render-with-providers.tsx`'s hand-wrapped tree (consumed only by
  deep tests). Rendering every test through `setProjectAnnotations` closes that duplication —
  `setProjectAnnotations` becomes the single provider-injection path project-wide.

## Considered Options

Not a fresh comparison against alternatives outside this project's own two already-built rendering
paths — `tech/0021` chose `.run()` over direct rendering when `composeStories` was first wired in;
this record picks the other of that same pair, now that `.run()`'s opacity has proven costly for
the deep-interaction tests it was expected to also serve. The pre-10.x direct-render pattern
`tech/0021` rejected turns out to still be a current, documented Storybook API
(`render(<Primary />)`), not an abandoned one — verified against Storybook's own current docs
(RESEARCH.md, `github.com/storybookjs/storybook`), so choosing it is not fighting the framework.

## Decision Outcome

- Every `*.test.tsx` file in the Vitest `browser` project renders composed stories directly as JSX
  through `vitest-browser-react`'s `render()` — `await render(<Empty />)` — for both shallow
  (structural/copy/staged-state) and deep (real-interaction) assertions. No test calls
  `composeStories`' `.run()` anywhere outside this record's own retrofit history.
- Decorators are inherited, deliberately: no decorator-free story variant is added to make an
  interaction test "shallow." `sign-in-form.test.tsx`'s deep tests render through
  `SignInForm`'s real `AuthCard` decorator (via the composed `Empty` story) exactly as its shallow
  tests do — closer to production usage, where `SignInForm` never renders outside `AuthCard`.
- Cleanup is one global `afterEach` in `vitest.setup.ts`, never copy-pasted per file. During this
  phase's file-by-file retrofit, both `.run()` (still used by files not yet converted) and direct
  `render()` can appear in the same test run, so the global hook calls each mechanism's own
  `cleanup()` — `@testing-library/react`'s `cleanup()` for `.run()`'s `testingLibraryRender`-tracked
  roots, `vitest-browser-react`'s `cleanup()` for directly rendered ones — rather than a raw
  `document.body.innerHTML = ""` wipe. The raw wipe was tried first and rejected: it discards DOM
  nodes without telling whichever mechanism mounted them, so `.run()`'s next call in the same file
  throws `NotFoundError: Failed to execute 'removeChild' on 'Node'` when React's own reconciler
  later tries to unmount a root whose container reference no longer matches the live DOM (found
  during this record's own tracer plan, 02.2-01 — resolves RESEARCH.md Assumption A1 against the
  manual-wipe alternative it had also offered).
- Carried forward, unchanged in substance, from `tech/0021`: the `@storybook/react`-not-
  `@storybook/nextjs-vite` import-source rule and its documented failure symptoms
  (`ReferenceError: process is not defined`, an unresolvable `sb-original/image-context`) —
  `@storybook/nextjs-vite`'s main entry still eagerly loads real Next.js internals that only
  resolve under the Vite plugin the separate "storybook" Vitest project loads, which the "browser"
  project (where every `.test.tsx` lives) does not load. Every rewritten test file keeps
  `import { composeStories } from "@storybook/react"` unchanged.
- Carried forward, unchanged in substance: the hook carve-out (non-visual hooks use `renderHook` in
  the jsdom `unit` project; `useOverflowIndicator` stays in `browser` for real layout measurement,
  since jsdom's non-functional layout engine cannot verify `scrollWidth`/`clientWidth`-driven
  behavior) and the route-file scope carve-out (`app/**/error.tsx`, `app/**/layout.tsx` are exempt
  from the stories requirement as thin composition wrappers around components that already carry
  their own stories/tests).
- Stories declare no story property named `play`, and no test calls `.run()` — both are
  mechanically enforced (D-05, D-06). `scripts/check-no-play-functions.mjs` (this plan's Task 3)
  blocks any `*.stories.tsx` declaring `play:`. A `no-restricted-syntax` selector on
  `CallExpression[callee.property.name='run']`, added to `eslint.config.mjs` by plan 02.2-09, bans
  `.run()` project-wide. That selector matches the method name on ANY object, so it bans `.run()`
  repo-wide including inside `*.stories.tsx` files — a deliberate strengthening of D-06's original
  "banned outside stories" framing, chosen because a single `no-restricted-syntax` block scoped
  with `files`/`ignores` would REPLACE, not merge with, section 8d's existing `no-restricted-syntax`
  selectors for any file matched by both blocks — the exact flat-config hazard `tech/0020`'s
  Consequences section already documents for `no-restricted-properties`. Keeping the `.run()` ban
  file-scope-unqualified (matching every file, stories included) sidesteps that hazard entirely
  rather than risk re-triggering it.
- D-08's research gate is settled: real `"use server"` Server Actions cannot execute inside
  `@storybook/nextjs-vite`'s Vite-driven Vitest rendering — its bundling has no RSC-aware transform
  for `"use server"` exports, so it attempts to bundle the action's real dependency graph (reaching
  `node:crypto`, the external API client) into a browser-loadable bundle, which fails outright.
  This is a currently open, named gap in Storybook's own issue tracker (`github.com/storybookjs/
  storybook` discussion #31127), not a version-specific bug already fixed upstream. The whole-module
  `serverActionStubAlias` in `vitest.config.ts` therefore stays; interaction coverage that depends
  on a real action's effect (redirect, cookie write, backend-rejection message) moves to Playwright
  e2e instead, which runs against a real Next.js server. See `docs/adr/tech/0020`'s D-19 carve-out
  section for the formal wording of what stays a shim and why — not duplicated here.

## Consequences

- 17 test files / 79 call sites required a retroactive `.run()`-to-direct-render rewrite (this
  plan's own tracer confirmed the 17th file, `auth-card.test.tsx`, missing from RESEARCH.md's
  original 16-file estimate).
- `src/test-utils/render-with-providers.tsx` is deleted outright (plan 02.2-06), not merely
  deprecated — its only responsibility (`QueryProvider` injection) is fully absorbed by
  `setProjectAnnotations` once every test renders through it.
- A component's `.stories.tsx` file remains load-bearing for test coverage exactly as `tech/0021`
  established — this record changes how a story is consumed by a test, not whether one is required.

Unwind trigger: none anticipated — this activates a still-current, still-documented Storybook API
path (`render(<Primary />)`) in place of an opaque helper that proved to block this project's own
deep-interaction tests; revisit only if `composeStories`' `.run()` gains a documented way to access
its own rendered tree/container.

**Enforcement:** `pnpm test:browser` runs every direct-rendered composed-story test in the
`browser` Vitest project. `pnpm stories:check` (`scripts/check-no-play-functions.mjs`) blocks any
`*.stories.tsx` declaring `play:`. The `no-restricted-syntax` `.run()` ban (plan 02.2-09) blocks any
remaining `.run()` call at lint time, project-wide.

Sources:

- `docs/adr/tech/0021-storybook-driven-component-tests.md` — the record this one supersedes; its
  import-source guidance, hook carve-out and route-file scope carve-out are carried forward here
  unchanged in substance.
- `docs/adr/tech/0020-no-mocking-policy.md` — D-19's carve-out register and flat-config
  `no-restricted-syntax`-replaces-not-merges hazard, both directly relevant to this record's
  enforcement mechanism choices.
- `docs/adr/tech/0023-comment-length-enforcement.md` — the enforcement-rule shape (mechanical,
  blocking, ADR-cited message) this record's own enforcement statements follow.
- `.planning/phases/02.2-unify-component-tests-fully-onto-storybook-stories-eliminate/02.2-CONTEXT.md`
  D-01 through D-09.
- `.planning/phases/02.2-unify-component-tests-fully-onto-storybook-stories-eliminate/02.2-RESEARCH.md`
  Summary items 1 and 2, Architecture Patterns §1-§4, Common Pitfalls §1-§5.
- `src/features/auth/components/sign-in-form.test.tsx` — this plan's tracer, the worked example for
  both the direct-render pattern and the cleanup-mechanism finding above.
- Storybook docs (`/storybookjs/storybook`) — `composeStories`/direct-render API, Storybook 10.x.
- `github.com/storybookjs/storybook` discussion #31127 — Server Action execution infeasibility in
  `@storybook/nextjs-vite`, confirming D-08's research gate.
