---
phase: 01-foundation-auth-preferences
plan: 17
subsystem: ui
tags: [nextjs, error-boundary, accessibility, storybook, vitest]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (plan 01-13)
    provides: "app/(dashboard)/layout.tsx and the protected route group this plan's segment
      boundary now guards"
provides:
  - "ErrorFallback (src/components/layout/error-fallback/error-fallback.tsx) — the shared
    recovery surface both route boundaries render"
  - "app/(dashboard)/error.tsx — the protected route group's segment error boundary"
  - "app/global-error.tsx — the root fallback replacing the whole document when the root
    layout itself fails"
  - "vitest.config.ts's browser project now collects app/**/*.test.tsx, so route-colocated
    boundary tests actually run"
affects: [Phase 2 (boards, columns, tasks) — any future route segment gets crash isolation by
  adding its own thin error.tsx wrapping ErrorFallback; widget-level isolation deferred until
  board/column/task rendering exists]

# Actuals (#2632)
actuals:
  tokens: 4180
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Route-boundary-as-thin-wrapper: app/(dashboard)/error.tsx and app/global-error.tsx are
      both minimal client components that read only error.digest and forward { title,
      description, digest, onRetry, homeHref } to the shared ErrorFallback — no boundary reads
      error.message or error.stack, verified by a comment-stripped grep in Task 2's automated
      verify step."
    - "Root-fallback singleton-element testing: a document permits exactly one <html>, so
      rendering app/global-error.tsx's returned html/body into a Vitest Browser Mode test
      container does not nest a second <html> — the browser reconciles the component's html
      element onto the real document.documentElement instead. The test asserts
      document.documentElement's lang/class attributes rather than querying the render
      container for a nested html tag."

key-files:
  created:
    - src/components/layout/error-fallback/error-fallback.tsx
    - src/components/layout/error-fallback/error-fallback.test.tsx
    - src/components/layout/error-fallback/error-fallback.stories.tsx
    - app/(dashboard)/error.tsx
    - app/(dashboard)/error.test.tsx
    - app/global-error.tsx
    - app/global-error.test.tsx
  modified:
    - vitest.config.ts
    - eslint.config.mjs
    - .gitignore

key-decisions:
  - "eslint.config.mjs's import-x/no-default-export exemption list (Rule 3 - blocking): the
    existing app/**/error.tsx glob does not match app/global-error.tsx (different filename, not
    a nested error.tsx), so the framework-forced default export in the new root boundary still
    tripped the rule. Added app/global-error.tsx explicitly alongside the other exempted
    Next.js-forced files."
  - ".gitignore's Vitest Browser Mode screenshot ignore (Rule 1 - bug): only covered
    src/**/__screenshots__/ before this plan added the first app/-located test files. Extended
    the same pattern to app/**/__screenshots__/ so failure screenshots from route-boundary tests
    don't become untracked artifacts."

patterns-established:
  - "Route-boundary-as-thin-wrapper — see tech-stack patterns."
  - "Root-fallback singleton-element testing — see tech-stack patterns."

requirements-completed: [AUTH-03]

coverage:
  - id: D1
    description: "ErrorFallback shared recovery surface: heading + description (never the
      thrown error's own text), an opaque digest reference line when supplied and none when
      absent, a Try again control wired to onRetry (called exactly once, reachable and
      operable by keyboard), and an optional boards link"
    requirement: "AUTH-03"
    verification:
      - kind: unit
        ref: "src/components/layout/error-fallback/error-fallback.test.tsx — 7 cases x 2
          viewports (14 tests), all pass"
        status: pass
      - kind: unit
        ref: "src/components/layout/error-fallback/error-fallback.stories.tsx Default/
          WithReference stories — pnpm vitest run --project storybook, 0 axe violations"
        status: pass
    human_judgment: false
  - id: D2
    description: "app/(dashboard)/error.tsx: the protected route group's segment boundary,
      rendered with a real Error and asserted to never leak the constructed error's own message
      text onto the screen"
    requirement: "AUTH-03"
    verification:
      - kind: unit
        ref: "app/(dashboard)/error.test.tsx — 1 case x 2 viewports, both pass; asserts
          screen.container.textContent does not contain error.message"
        status: pass
    human_judgment: false
  - id: D3
    description: "app/global-error.tsx: the root document fallback with its own html/body, its
      own globals.css import, no QueryProvider, app-wide copy, retry wired to reset (called
      exactly once), no homeHref"
    requirement: "AUTH-03"
    verification:
      - kind: unit
        ref: "app/global-error.test.tsx — 2 cases x 2 viewports (4 tests), all pass"
        status: pass
      - kind: other
        ref: "grep -vE comment-stripped search over both boundary files for .message/.stack
          property access — 0 matches"
        status: pass
      - kind: other
        ref: "pnpm build exits 0; .next/server/app/(dashboard) compiled output directory exists"
        status: pass
    human_judgment: false

# Metrics
duration: 17min (task-commit span; excludes upfront context-reading time)
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 17: Route-Level Crash Isolation (GC-03) Summary

**Shared `ErrorFallback` recovery surface plus a dashboard segment boundary (`app/(dashboard)/error.tsx`) and a root `app/global-error.tsx`, both rendered with a real `Error` in tests and mechanically proven never to leak the error's own message or stack.**

## Performance

- **Duration:** ~17 min (span between first RED commit and last GREEN commit; upfront
  context-loading not separately timed)
- **Started:** 2026-08-17T10:28:51+02:00 (Task 1 RED commit)
- **Completed:** 2026-08-17T10:45:54+02:00 (Task 2 GREEN commit)
- **Tasks:** 2 (both TDD, 4 commits total: RED+GREEN per task)
- **Files modified:** 10 (7 created, 3 modified)

## Accomplishments

- `ErrorFallback` (`src/components/layout/error-fallback/error-fallback.tsx`) — a centred
  recovery card on the same `bg-bg-app`/`bg-bg-surface` silhouette `app/page.tsx` already uses:
  heading, description, an optional muted "Reference: {digest}" line, a `Button`-primitive
  retry control, and an optional link back to the boards list.
- `app/(dashboard)/error.tsx` — the protected route group's segment boundary. A crash inside
  `/boards` or `/boards/[boardId]` now recovers to this surface instead of a blank page, leaving
  the surrounding dashboard chrome (header, sign-out) intact.
- `app/global-error.tsx` — the root document fallback for a root-layout-level crash. Restates
  `app/layout.tsx`'s `lang`/class lists and imports `globals.css` directly (Next.js swaps the
  root layout out entirely when this fires), and deliberately omits `QueryProvider` since it
  could itself be the thing that failed.
- Both boundaries mechanically proven to never read the thrown error's own text: a
  comment-stripped `grep` over both files for `.message`/`.stack` property access returns zero
  matches, and the dashboard boundary's test constructs a real `Error` and asserts its message
  text is absent from the rendered output.
- `vitest.config.ts`'s `browser` project now collects `app/**/*.test.tsx` (excluding
  `app/**/*.unit.test.tsx`), so route-colocated boundary tests actually run — verified by the
  RED phase failing to import before the boundary files existed, then passing once written.
- Two new axe-clean Storybook stories (`Default`, `WithReference`), no
  `visual/*.visual.spec.ts` entry per ADR tech/0011.

## Task Commits

Each task followed RED → GREEN (TDD):

1. **Task 1: End-to-end "a crashed dashboard route recovers"**
   - RED: `9d45c6b` (test) — failing `error-fallback.test.tsx` and
     `app/(dashboard)/error.test.tsx`, plus the `vitest.config.ts` include/exclude extension
   - GREEN: `a15eb4f` (feat) — `ErrorFallback`, `app/(dashboard)/error.tsx`, and
     `error-fallback.stories.tsx`
2. **Task 2: Root global-error fallback and the no-leak gate**
   - RED: `746a1b6` (test) — failing `app/global-error.test.tsx`
   - GREEN: `052970e` (feat) — `app/global-error.tsx`, plus the `eslint.config.mjs` and
     `.gitignore` fixes it required

**Plan metadata:** commit created at end of this execution (see final commit list returned to
the orchestrator).

## Files Created/Modified

- `src/components/layout/error-fallback/error-fallback.tsx` — the shared recovery surface,
  `Props` named plainly per D-26w
- `src/components/layout/error-fallback/error-fallback.test.tsx` — 7 behaviours x 2 viewports
- `src/components/layout/error-fallback/error-fallback.stories.tsx` — `Default`,
  `WithReference` CSF3 stories
- `app/(dashboard)/error.tsx` — dashboard segment boundary, `homeHref` pointed at `BOARDS_PATH`
- `app/(dashboard)/error.test.tsx` — renders the real default export with a constructed `Error`
- `app/global-error.tsx` — root document fallback, own `html`/`body`, own `globals.css` import
- `app/global-error.test.tsx` — renders the real default export, asserts against
  `document.documentElement` (see key-decisions)
- `vitest.config.ts` — `browser` project `include`/`exclude` extended to `app/**/*.test.tsx` /
  `app/**/*.unit.test.tsx`
- `eslint.config.mjs` — `app/global-error.tsx` added to the `import-x/no-default-export`
  exemption list
- `.gitignore` — `app/**/__screenshots__/` added alongside the existing `src/**/__screenshots__/`
  ignore

## Decisions Made

See frontmatter `key-decisions` for the full list. Most significant: the root-fallback test
asserts against `document.documentElement` rather than querying the render container for a
nested `<html>` — a document permits exactly one `<html>` element, so a browser reconciles the
component's returned `html`/`body` onto the page's real document root instead of nesting a
second one inside the test container (observed directly: `document.documentElement` picked up
`lang="en"` and the `h-full antialiased` classes after render, while the container held only the
`body`'s children).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `eslint.config.mjs`'s framework-file exemption list didn't cover
   `app/global-error.tsx`**
- **Found during:** Task 2 (running `pnpm lint` after writing `app/global-error.tsx`)
- **Issue:** `import-x/no-default-export` is `"error"` by default, with an exemption block for
  Next.js framework-forced default-export files. That block's `app/**/error.tsx` glob matches a
  nested `error.tsx`, but `app/global-error.tsx` has a different filename entirely and isn't
  covered by any existing entry — the newly-written, framework-mandated default export tripped
  the rule.
- **Fix:** Added `"app/global-error.tsx"` to the exemption `files` list alongside
  `app/**/page.tsx`, `app/**/layout.tsx`, `app/**/error.tsx`, etc.
- **Files modified:** `eslint.config.mjs`
- **Verification:** `pnpm lint` exits 0.
- **Committed in:** `052970e` (Task 2 GREEN commit)

**2. [Rule 1 - Bug] `.gitignore`'s Vitest Browser Mode screenshot ignore didn't cover `app/`**
- **Found during:** Task 2 (a failed test run before the fix above left a stray
  `app/__screenshots__/` directory as an untracked artifact)
- **Issue:** The existing ignore pattern (`src/**/__screenshots__/`) was written before any test
  files existed under `app/`. This plan added the first ones (`app/(dashboard)/error.test.tsx`,
  `app/global-error.test.tsx`), so a failing run's screenshot output would have shown up as an
  untracked file needing manual cleanup on every future contributor's machine.
- **Fix:** Added `app/**/__screenshots__/` alongside the existing pattern; removed the stray
  directory that had already been generated.
- **Files modified:** `.gitignore`
- **Verification:** `git status --short` shows no untracked screenshot artifacts after a full
  `pnpm test` run.
- **Committed in:** `052970e` (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 3 - blocking, 1 Rule 1 - bug).
**Impact on plan:** Both were direct, unavoidable consequences of this plan's own changes (a new
framework-forced file, new test file locations) — necessary to make the plan's own verification
gates (`pnpm lint` exits 0, no untracked artifacts) hold true. No scope creep.

## Issues Encountered

- This worktree had no `.env.local`, so `pnpm build` initially failed with `SESSION_SECRET is
  not set` while collecting `/boards` and `/boards/[boardId]` page data (an existing
  `app/(dashboard)/layout.tsx` requirement from plan 01-11, unrelated to this plan's own files).
  Generated a throwaway `SESSION_SECRET` into `.env.local` (gitignored, matching the pattern
  01-11/01-12/01-13 already established for worktree-local builds) to unblock `pnpm build` and
  `pnpm exec tsc --noEmit` (the latter needs `.next/types`, only generated by a build). Not
  committed; not part of this plan's deliverable.

## User Setup Required

None new. This worktree's own `.env.local` (throwaway `SESSION_SECRET`/`EXTERNAL_API_BASE_URL`,
not committed) was populated to unblock local build/typecheck verification, per the same pattern
established in 01-11/01-12/01-13.

## Next Phase Readiness

- GC-03 is closed: a render failure in a protected route, or in the root layout itself, now
  produces a styled recovery screen with a working retry instead of a blank page, and never puts
  the thrown exception's own text on the user's screen.
- Any future route segment (Phase 2's boards/columns/tasks) gets the same crash isolation by
  adding its own thin `error.tsx` that renders `ErrorFallback` — the pattern is established and
  proven.
- Widget-level isolation stays deferred per the plan's own scope note: nothing renders list or
  board UI yet, so there is no widget to isolate. Revisit once board/column/task rendering
  exists (Phase 2).
- Full suite (`pnpm test`) is 282/282 passing after this plan (up from 260 pre-plan), plus
  `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` all exit 0.

## Known Stubs

None. Both boundary files are real, non-placeholder implementations; the plan's own
`flagged_assumptions` note (no production crash is forced end to end, since every current route
is a placeholder with no failure path) is an explicitly accepted scope boundary, not a stub —
both boundaries are proven by rendering the real components with a constructed `Error`, and the
compiled build confirms Next.js registered them.

## Addendum — 02.1-11 comment-length sweep (backfilled rationale)

`ErrorFallback`'s optional "Back to boards" link is a plain `<a href>`, not `next/link`'s `Link`,
with an `eslint-disable-next-line no-restricted-syntax` for the raw-anchor ban this repo otherwise
enforces. This was implemented in this plan but never narrated in the SUMMARY at the time;
backfilled here during plan `02.1-11`'s comment-compression sweep. Rationale: `ErrorFallback` is a
hard-crash recovery surface (`app/(dashboard)/error.tsx`/`app/global-error.tsx`) — a full page
reload is the deliberately safer choice there, since it discards whatever in-memory state (React
tree, TanStack Query cache) triggered or was left corrupted by the error, rather than carrying it
forward via a client-side transition the way `Link` would.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-17*

## Self-Check: PASSED

- FOUND (via `git ls-files`): `src/components/layout/error-fallback/error-fallback.tsx`,
  `error-fallback.test.tsx`, `error-fallback.stories.tsx`, `app/(dashboard)/error.tsx`,
  `app/(dashboard)/error.test.tsx`, `app/global-error.tsx`, `app/global-error.test.tsx`.
- FOUND (via `git log --oneline`): `9d45c6b`, `a15eb4f`, `746a1b6`, `052970e`, `75af843`.
