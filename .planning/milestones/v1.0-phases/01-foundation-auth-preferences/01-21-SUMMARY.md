---
phase: 01-foundation-auth-preferences
plan: 21
subsystem: testing
tags: [vitest, msw, storybook, composeStories, testing-library, react]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (plan 01-12)
    provides: SignUpForm/SignInForm, their .test.tsx suites and .stories.tsx staging props
      (defaultValues/forceFieldErrors/forceServerError/forceSubmitting/defaultPasswordRevealed)
provides:
  - setupMswWorker (src/test-utils/setup-msw-worker.ts) — a handler-less MSW browser worker with
    its start/reset/stop lifecycle registered at call time, replacing each form test file's own
    hand-rolled worker + three lifecycle hooks
  - renderWithProviders (src/test-utils/render-with-providers.tsx) — mounts an element inside
    QueryProvider via vitest-browser-react's render, replacing each form test file's own local
    render helper
  - .storybook/preview-annotations.tsx — the raw parameters/globalTypes/initialGlobals/decorators
    project-annotations object, extracted out of .storybook/preview.tsx so it can be registered
    for a Vitest project (the "browser" project) that cannot load @storybook/nextjs-vite
  - composeStories-based staged-state assertions in sign-in-form.test.tsx/sign-up-form.test.tsx,
    reusing each file's sibling .stories.tsx Filled/WithFieldErrors/WithServerError/Submitting/
    PasswordRevealed staging instead of restating it
affects: [any future *.test.tsx composing a sibling story, any future edit to
  .storybook/preview.tsx's decorators/parameters (must stay in preview-annotations.tsx to remain
  importable from the "browser" project), any future addition to package.json's Storybook family
  of devDependencies (must stay pinned in lockstep with @storybook/react@10.5.7)]

# Actuals (#2632)
actuals:
  tokens: 7959
  tasks: 2
  commits: 2

tech-stack:
  added: ["@storybook/react@10.5.7 (exact-pinned devDependency, matching the version already
    locked transitively via @storybook/nextjs-vite)"]
  patterns:
    - "A Vitest project without a Next.js runtime (the 'browser' project) cannot import anything
      from @storybook/nextjs-vite's main entry point — its browser preview bundle unconditionally
      imports real Next.js internals (an unresolvable sb-original/image-context virtual module,
      then next/dist/client/components/navigation.js, which reads process.env at
      module-evaluation time) that only resolve under vite-plugin-storybook-nextjs, the plugin
      only the 'storybook' Vitest project loads via storybookTest(). composeStories/
      composeStory/setProjectAnnotations must be sourced from @storybook/react (the
      framework-agnostic renderer package @storybook/nextjs-vite itself depends on and
      re-exports from) instead, for any Vitest project without that plugin."
    - "A Storybook preview config's parameters/globalTypes/initialGlobals/decorators live in
      their own module with no @storybook/nextjs-vite import (preview-annotations.tsx), imported
      by both .storybook/preview.tsx (which wraps it in definePreview for real Storybook/the
      'storybook' project) and vitest.setup.ts (which registers it directly via
      setProjectAnnotations from @storybook/react for the 'browser' project) — so the config is
      declared once and reused by both, never restated."
    - "That extracted object is deliberately left without a type annotation (no `: Preview` /
      `satisfies Preview`) — either pins it to @storybook/react's ReactRenderer-specific shape,
      which then fails to structurally satisfy .storybook/preview.tsx's Next.js-augmented
      definePreview parameter type when spread in. Left untyped, its natural object-literal
      inference (literals stay literals) satisfies both consumers. The two decorators are typed
      via a `Parameters<Decorator>` alias applied inline inside the decorators array (not
      extracted to named consts, which would trip ADR tech/0016's positional-argument rule) —
      giving Story/context real types without pinning the rest of the object."
    - "composeStories(csfExports) + a parametrised (D-26y) case array/loop is how a form test
      asserts every sibling story's staged state without repeating near-identical it() blocks —
      one array of {name, Story, verify} entries, one loop generating one it() per story."

key-files:
  created:
    - src/test-utils/setup-msw-worker.ts
    - src/test-utils/render-with-providers.tsx
    - .storybook/preview-annotations.tsx
  modified:
    - src/features/auth/components/sign-in-form.test.tsx
    - src/features/auth/components/sign-up-form.test.tsx
    - vitest.setup.ts
    - .storybook/preview.tsx
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Task 1's two helpers (setupMswWorker, renderWithProviders) have distinct jobs and both have
    real consumers: renderWithProviders renders a component bare (behavioural tests), a composed
    story is used instead when a test needs a story's staged props (never both at once for the
    same assertion)."
  - "composeStories is sourced from @storybook/react, not @storybook/nextjs-vite as originally
    planned — the plan's own flagged assumption (parameters.nextjs.appDirectory is inert in the
    browser project) undersold the actual risk; the framework package cannot be imported into the
    browser project at all. This is a deliberate, approved deviation from the plan's stated
    package choice (package install approved by the coordinator after a checkpoint), not a
    silent substitution — see Deviations below."
  - "The Storybook preview config is split into preview-annotations.tsx (values) and
    preview.tsx (the definePreview(...) call) specifically so vitest.setup.ts can register the
    same config without ever importing @storybook/nextjs-vite, keeping GC-08's 'declared once,
    reused' goal intact despite the package swap."

patterns-established:
  - "Shared browser-mode test infrastructure (worker lifecycle, provider-wrapped render) lives in
    src/test-utils/, each helper with a single real job and a doc comment stating where it may be
    imported from (CONVENTIONS.md rule 7)."
  - "A Vitest project's setup file registers Storybook project annotations by importing the raw
    config object directly, never through .storybook/preview.tsx itself, if that project has no
    Storybook Vite plugin loaded."

requirements-completed: [AUTH-01, AUTH-02]

coverage:
  - id: D1
    description: "setupMswWorker and renderWithProviders extracted to src/test-utils/, consumed
      by both form suites; the duplicated worker lifecycle and provider wrap exist once"
    requirement: "AUTH-01"
    verification:
      - kind: automated_ui
        ref: "pnpm vitest run --project browser src/features/auth (70/70 tests pass, including
          the pre-existing 50 behavioural tests with unchanged assertions/names)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Storybook preview annotations registered for the 'browser' Vitest project
      (vitest.setup.ts), sourced via @storybook/react to avoid @storybook/nextjs-vite's
      Next.js-internals coupling; the 'storybook' project's own suite is unaffected"
    requirement: "AUTH-01"
    verification:
      - kind: automated_ui
        ref: "pnpm test:a11y (72/72 storybook-project tests pass, same story count as before this
          plan)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both form test files compose their sibling stories' staged states (Filled,
      WithFieldErrors, WithServerError, Submitting, PasswordRevealed) and assert them directly —
      staging props previously rendered for a human to look at in Storybook only"
    requirement: "AUTH-02"
    verification:
      - kind: automated_ui
        ref: "pnpm test (375/375 tests pass across every Vitest project); grep -rn 'play:'
          src/features/auth/components src/components/ui reports 0 matches"
        status: pass
    human_judgment: false
  - id: D4
    description: "Static analysis clean after the full change set"
    requirement: "AUTH-01"
    verification:
      - kind: other
        ref: "pnpm lint (0 errors); pnpm exec tsc --noEmit (0 errors)"
        status: pass
    human_judgment: false

duration: 44min (task-commit span; excludes upfront context-reading time and the mid-plan
  checkpoint pause awaiting coordinator approval, not separately timed)
completed: 2026-08-18
status: complete
---

# Phase 01 Plan 21: Test-Utils Extraction and Story-Reuse Summary

**Extracted the duplicated MSW-worker lifecycle and provider-wrapped render into `src/test-utils/`,
then wired `composeStories` (sourced from `@storybook/react`, not `@storybook/nextjs-vite`, after a
real blocking-issue discovery) so both auth form test suites assert their sibling stories' staged
states directly instead of leaving them unverified in Storybook.**

## Performance

- **Duration:** 44 min (span between first and last task commit; excludes upfront context-reading
  time and the mid-plan pause awaiting the coordinator's package-install approval)
- **Started:** 2026-08-18T11:09:45+02:00 (first task commit)
- **Completed:** 2026-08-18T11:53:40+02:00 (last task commit)
- **Tasks:** 2
- **Files modified:** 9 (3 created, 6 modified)

## Accomplishments

- `setupMswWorker` (`src/test-utils/setup-msw-worker.ts`) creates a handler-less browser worker and
  registers its start/reset/stop lifecycle at call time; both form test files switched to it,
  deleting their own byte-for-byte-parallel worker declarations and lifecycle hooks.
- `renderWithProviders` (`src/test-utils/render-with-providers.tsx`) mounts a bare component inside
  `QueryProvider`; both form test files switched to it, deleting their own local render helpers.
  Switching to both helpers changed no assertion, no test name, and no test count (50/50 unchanged).
- `.storybook/preview-annotations.tsx` holds the Storybook preview's parameters/globalTypes/
  initialGlobals/decorators as a plain, un-annotated object with no `@storybook/nextjs-vite`
  import; `.storybook/preview.tsx` imports it and still owns the real `definePreview(...)` call for
  Storybook/the "storybook" Vitest project (unaffected: 72/72 story tests still pass).
- `vitest.setup.ts` registers that same config for the "browser" Vitest project via
  `setProjectAnnotations` from `@storybook/react`, so a composed story in a `.test.tsx` file renders
  with the same provider tree and theme-class decorator Storybook applies.
- Both form test files now `composeStories` their sibling `.stories.tsx` file and assert five staged
  states each (Filled, WithFieldErrors, WithServerError, Submitting, PasswordRevealed) via a
  parametrised (D-26y) loop — props declared in the stories files and previously asserted nowhere.
  Behavioural tests still render the bare component through `renderWithProviders`, never through a
  composed story, keeping the two helpers' jobs distinct (per the plan's Decisions block).
- No `play` function exists anywhere in the auth feature or the primitives (D-25 intact) — confirmed
  by `grep -rn 'play:' src/features/auth/components src/components/ui` returning 0 matches.

## Task Commits

1. **Task 1: End-to-end "one helper call replaces fifteen copied lines"** — `905be1b` (feat)
2. **Task 2: Stories supply the staging, tests supply the assertions** — `ebef913` (feat)

**Plan metadata:** commit created at end of this execution (see final commit list returned to the
orchestrator).

## Files Created/Modified

- `src/test-utils/setup-msw-worker.ts` — `setupMswWorker`, the shared handler-less browser worker
  lifecycle
- `src/test-utils/render-with-providers.tsx` — `renderWithProviders`, the shared provider-wrapped
  browser render
- `src/features/auth/components/sign-in-form.test.tsx` / `sign-up-form.test.tsx` — switched to both
  helpers; each now also composes its sibling stories and asserts their staged states
- `.storybook/preview-annotations.tsx` — the raw preview config, importable without
  `@storybook/nextjs-vite`
- `.storybook/preview.tsx` — now imports `preview-annotations.tsx` and spreads it into
  `definePreview(...)`; its own exported behaviour for real Storybook/the "storybook" project is
  unchanged
- `vitest.setup.ts` — registers the preview annotations for the "browser" project via
  `@storybook/react`'s `setProjectAnnotations`
- `package.json` / `pnpm-lock.yaml` — added `@storybook/react@10.5.7` (exact-pinned devDependency)

## Decisions Made

See frontmatter `key-decisions`/`patterns-established` for the full list. Most significant: sourcing
`composeStories`/`setProjectAnnotations` from `@storybook/react` instead of the plan's originally
specified `@storybook/nextjs-vite`, and splitting the Storybook preview config into its own module so
both the real Storybook config and the "browser" Vitest project's setup file can share it without
either importing the other.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking, `.next/types` missing] `pnpm exec tsc --noEmit` failed on
`LayoutProps<"/">` in a fresh worktree**
- **Found during:** Task 1 verification
- **Issue:** This worktree had never run `next build`/`next dev`, so `.next/types` (which
  `tsconfig.json` includes) didn't exist yet, and `app/layout.tsx`'s `LayoutProps<"/">` type
  couldn't resolve.
- **Fix:** Ran `pnpm exec next typegen` (a lightweight, build-free route-type generator) once.
  `.next/` is gitignored; no committed change.
- **Verification:** `pnpm exec tsc --noEmit` exits 0.

### Architectural Deviation (Rule 4 — coordinator-approved package install)

**2. [Rule 4 - Architectural, coordinator-approved] `composeStories`/`setProjectAnnotations`
sourced from `@storybook/react`, not `@storybook/nextjs-vite` as the plan specified**
- **Found during:** Task 2, first `pnpm test` run after wiring `vitest.setup.ts` exactly as the
  plan's action text specified (`import { setProjectAnnotations } from "@storybook/nextjs-vite"`).
- **Issue:** Importing anything from `@storybook/nextjs-vite`'s main entry point unconditionally
  pulls in its browser preview bundle, which eagerly imports real Next.js internals: first an
  unresolvable `sb-original/image-context` virtual module (normally supplied by
  `vite-plugin-storybook-nextjs`, a plugin only the "storybook" Vitest project loads via
  `storybookTest()`), then — once that's worked around — `next/dist/client/components/
  navigation.js`, which reads `process.env` at module-evaluation time and crashes because the
  "browser" Vitest project deliberately has no Next.js runtime (the same root cause already
  documented in 01-12-SUMMARY.md's `next/link` deviation). This broke every test file in the
  "browser" project, not just the two auth forms. The plan's own flagged assumption
  ("`parameters.nextjs.appDirectory` is inert in the browser project") undersold the actual risk —
  it assumed the import itself would succeed.
- **Investigation:** Reproduced directly (not assumed) via two full `pnpm test` runs, confirmed the
  crash originates unconditionally at `@storybook/nextjs-vite`'s `index.js` top level regardless of
  which named export is used, and confirmed `@storybook/react` (the plain renderer package
  `@storybook/nextjs-vite` itself depends on and re-exports from) declares the identical
  `composeStories`/`composeStory`/`setProjectAnnotations` API with zero Next.js-specific imports.
- **Checkpoint:** Per this project's deviation rules, a package-manager install is excluded from
  auto-fix and requires human verification before proceeding. A `checkpoint:human-verify` was
  returned documenting the root cause and the proposed fix; the coordinator approved installing
  `@storybook/react@10.5.7` (exact-pinned, matching the version already locked transitively via
  `@storybook/nextjs-vite`) and directed the exact fix already scoped out.
- **Fix:** Installed `@storybook/react@10.5.7` as an explicit devDependency. Switched
  `composeStories` (both test files) and `setProjectAnnotations` (`vitest.setup.ts`) to import from
  `@storybook/react`. Discovered a second, independent instance of the same root cause: `vitest.
  setup.ts`'s `import previewAnnotations from "./.storybook/preview"` also pulled in
  `@storybook/nextjs-vite` (via `.storybook/preview.tsx`'s own `definePreview` import), regardless
  of which package sourced `setProjectAnnotations`. Fixed by extracting `.storybook/preview.tsx`'s
  parameters/globalTypes/initialGlobals/decorators into a new `.storybook/preview-annotations.tsx`
  module with no `@storybook/nextjs-vite` import; `.storybook/preview.tsx` now imports that object
  and still owns the real `definePreview(...)` call, and `vitest.setup.ts` imports the same object
  directly, registering it via `setProjectAnnotations([a11yAddonAnnotations, previewAnnotations])`
  (an array — `setProjectAnnotations` composes multiple annotation sources the same way
  `definePreview`'s `addons: [...]` composition does internally).
- **Type-safety follow-up:** The extracted config object triggered `@typescript-eslint/
  no-unsafe-*` (decorator `Story`/`context` params had no contextual type once outside
  `definePreview`'s call) and several `tsc` widening errors (`icon`/`type` string literals widened
  to `string`; a full `: Preview`/`satisfies Preview` annotation on the whole object pinned it to
  `@storybook/react`'s `ReactRenderer`-specific shape, which then failed to satisfy
  `.storybook/preview.tsx`'s Next.js-augmented `definePreview` parameter type when spread in).
  Resolved by leaving the object itself un-annotated (natural literal inference satisfies both
  consumers), adding `as const` to the handful of literal string values that needed it, and typing
  the two decorators inline inside the `decorators` array via a `Parameters<Decorator>` alias
  (not extracted to named consts, which would have tripped ADR tech/0016's one-destructured-
  parameter rule — its own carve-out only exempts a function sitting directly in a call/array
  argument list).
- **Files modified:** `package.json`, `pnpm-lock.yaml`, `vitest.setup.ts`, `.storybook/preview.tsx`,
  `.storybook/preview-annotations.tsx` (new), `src/features/auth/components/sign-in-form.test.tsx`,
  `src/features/auth/components/sign-up-form.test.tsx`
- **Verification:** `pnpm test` (375/375), `pnpm test:a11y` (72/72, same story count as before this
  plan), `pnpm lint` (0 errors), `pnpm exec tsc --noEmit` (0 errors), play-function grep (0 matches).
- **Committed in:** `ebef913` (Task 2)

---

**Total deviations:** 2 (1 Rule 3 - blocking, auto-fixed without permission; 1 Rule 4 - architectural,
coordinator-approved before proceeding).
**Impact on plan:** The package-source swap changes *which* package supplies `composeStories`/
`setProjectAnnotations`, not the plan's actual goal or design (GC-08's "declared once, reused"
config, the two-helper split from Task 1's Decisions block, D-25's no-play-function rule) — all of
which landed exactly as planned. No scope creep beyond what was necessary to make the plan's own
stated approach actually run in this project's "browser" Vitest project.

## Issues Encountered

A transient flaky timeout hit two unrelated primitive test files (`icon-button.test.tsx`,
`text-field.test.tsx`) during one `pnpm test` run under heavy repeated-full-suite load; both passed
cleanly in isolation immediately after, and a subsequent full `pnpm test` run was clean (375/375).
Not caused by this plan's changes — neither file is touched by it.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- GC-05 and GC-08 are closed: the duplicated test scaffolding is gone, and a story's staged
  arrangement is declared once and reused by the test that asserts it.
- D-25 (no play functions, assertions live only in Vitest) is intact and explicitly re-verified.
- Any future `.test.tsx` composing a sibling story should source `composeStories`/`composeStory`/
  `setProjectAnnotations` from `@storybook/react`, not `@storybook/nextjs-vite`, if it runs in the
  "browser" Vitest project (no Next.js runtime) — the pattern and rationale are fully documented in
  `vitest.setup.ts` and `.storybook/preview-annotations.tsx`'s own doc comments for the next person
  who needs it.
- No blockers.

## Known Stubs

None — every helper and assertion added is fully wired to real consumers; no hardcoded empty/
placeholder responses ship as part of this plan's scope.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-18*

## Self-Check: PASSED

- FOUND: `src/test-utils/setup-msw-worker.ts`, `src/test-utils/render-with-providers.tsx`,
  `.storybook/preview-annotations.tsx`, this SUMMARY.md itself.
- FOUND (via `git log --oneline --all`): commits `905be1b`, `ebef913`.
