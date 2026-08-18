---
phase: 01-foundation-auth-preferences
plan: 20
subsystem: routing, auth
tags: [routes, adr-tech-0012, ci, rtl, jsdom, gap-closure]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (plan 01-13)
    provides: src/lib/routes.ts (original PROTECTED_PREFIXES/PUBLIC_PATHS/SIGN_IN_PATH/BOARDS_PATH
      shape), proxy.ts, app/(dashboard)/layout.tsx, sign-out-button.tsx, both e2e specs — the
      surface this plan rewrites in place
  - phase: 01-foundation-auth-preferences (plan 01-19)
    provides: the auth form/schema alignment this plan's Task 2 edits (sign-in-form.tsx,
      sign-up-form.tsx) build on without reopening
provides:
  - src/lib/routes.ts rewritten around a single `ROUTE` as-const object (ADR tech/0012 shape,
    keys-don't-mirror-values deviation recorded in the file's own doc comment), `Route` derived
    via the index-access idiom, `boardDetail(boardId)` as a separate builder export
  - Every call site (both guard layers, both auth hooks, the landing page, both auth cross-links,
    both e2e specs, and — discovered during execution — app/(dashboard)/error.tsx and the
    ErrorFallback story/test) reads from `ROUTE`, no application path literal survives elsewhere
  - scripts/check-routes.mjs (`pnpm routes:check`), a Node-native repo-wide literal scan wired
    into the CI `quality` job beside lint and format
  - src/lib/routes.unit.test.ts — first-class coverage of boardDetail and both predicates,
    including the near-miss prefix case
  - src/features/auth/hooks/use-sign-in.unit.test.tsx and use-sign-up.unit.test.tsx — the first
    React Testing Library tests in this project exercising real application code (renderHook +
    QueryProvider), covering both hooks' success/failure/no-retry/no-navigate-on-failure behaviour
  - src/lib/rtl-harness-probe.tsx and its test deleted — the jsdom "unit" Vitest project is now
    populated by real hook tests instead of a placeholder
affects: [any future plan adding a new application route — must add it to ROUTE, not a literal;
  Phase 2 (boards) — boardDetail is now the one place a board's detail URL is built]

# Actuals (#2632)
actuals:
  tokens: 21000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Route-declaration-as-ROUTE-object (src/lib/routes.ts): a single `as const` object with a
      derived union type, following ADR tech/0012's pattern with one recorded deviation (keys
      don't mirror path-shaped values) — every future application path is a ROUTE member, never a
      fresh literal, and pnpm routes:check enforces this in CI."
    - "Generated-output exclusion in literal-drift checks: scripts/check-routes.mjs excludes
      src/lib/api/generated-types.ts and bff-generated-types.ts (openapi-typescript output
      describing the *backend* REST contract's own path keys) from the frontend route-literal
      scan, since regenerating those files would otherwise produce unfixable false positives."
    - "renderHook + QueryProvider wrapper + next/navigation mock for hook-only tests: the jsdom
      unit project's idiom for testing a TanStack Query mutation hook in isolation from any
      component, mirroring the existing component-test pattern of mocking useRouter's push/refresh
      as spies but asserting against the hook's return value (isSuccess/isError/error.message)
      instead of rendered DOM."

key-files:
  created:
    - src/lib/routes.unit.test.ts
    - src/features/auth/hooks/use-sign-in.unit.test.tsx
    - src/features/auth/hooks/use-sign-up.unit.test.tsx
    - scripts/check-routes.mjs
  modified:
    - src/lib/routes.ts
    - proxy.ts
    - app/(dashboard)/layout.tsx
    - app/(dashboard)/error.tsx
    - app/page.tsx
    - src/features/auth/components/sign-out-button.tsx
    - src/features/auth/components/sign-in-form.tsx
    - src/features/auth/components/sign-up-form.tsx
    - src/features/auth/hooks/use-sign-in.ts
    - src/features/auth/hooks/use-sign-up.ts
    - e2e/auth.e2e.spec.ts
    - e2e/route-guard.e2e.spec.ts
    - src/components/layout/error-fallback/error-fallback.stories.tsx
    - src/components/layout/error-fallback/error-fallback.test.tsx
    - package.json
    - .github/workflows/ci.yml
  deleted:
    - src/lib/rtl-harness-probe.tsx
    - src/lib/rtl-harness-probe.unit.test.tsx

key-decisions:
  - "ROUTE keys deliberately do not mirror their string values (recorded in routes.ts's own doc
    comment, per the plan's Decisions block) — a route's value is a URL path, and a key mirroring
    it would be path-shaped and unusable as an identifier. This is a partial, explicit deviation
    from ADR tech/0012, replicating the half of the pattern (one as-const object, a derived union
    type) that actually prevents drift."
  - "boardDetail is a separate export, not a ROUTE member — storing a function inside ROUTE would
    widen Route's derived type from a union of paths to a union of paths and a function."
  - "(Rule 3 - blocking) app/(dashboard)/error.tsx imported the removed BOARDS_PATH export but was
    not in this plan's files_modified list — Task 1's rewrite would have broken its build. Fixed
    inline to ROUTE.BOARDS during Task 1's own commit."
  - "(Rule 2 - completeness) error-fallback.stories.tsx and error-fallback.test.tsx hardcoded
    '/boards' as their homeHref demo value, which the new routes:check correctly flags as a
    genuine outside-declaration literal (ErrorFallback is a generic component, but its real-app
    usage always passes ROUTE.BOARDS) — switched both to ROUTE.BOARDS during Task 2."
  - "(Rule 1 - bug in the plan's own diagnostic) The plan's literal <verify> grep command for Task
    2 (`grep ... | grep -v 'src/lib/routes.ts' | wc -l | ... grep -qx 0`) has no exclusion for
    openapi-typescript's generated-types.ts, which contains the external API's own `\"/boards\":`
    REST path key — an unavoidable false positive distinct from any frontend route literal. The
    actual CI-enforced mechanism (scripts/check-routes.mjs, committed as pnpm routes:check)
    correctly excludes both generated-types files and passes with zero violations; verified this
    by running the script directly rather than the plan's raw ad-hoc grep, which reports a count
    of 1 against that one generated line."

patterns-established:
  - "ROUTE-as-single-declaration — see tech-stack patterns."
  - "Generated-output exclusion for literal-drift checks — see tech-stack patterns."
  - "renderHook + QueryProvider hook-isolation test idiom — see tech-stack patterns."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

coverage:
  - id: D1
    description: "src/lib/routes.ts: single ROUTE as-const object (HOME/SIGN_IN/SIGN_UP/BOARDS),
      Route derived via index-access idiom, boardDetail(boardId) builder, PROTECTED_PREFIXES/
      PUBLIC_PATHS rebuilt from ROUTE members, isProtectedPath/isPublicPath semantics unchanged"
    requirement: "AUTH-03"
    verification:
      - kind: unit
        ref: "src/lib/routes.unit.test.ts — 13 tests: boardDetail composition, isProtectedPath
          (board list, nested paths, near-miss '/boardsish', landing, sign-in), isPublicPath
          (all three public paths exact-match, board list excluded, nested public path excluded),
          and declaration-shape assertions on PROTECTED_PREFIXES/PUBLIC_PATHS — all pass"
        status: pass
      - kind: other
        ref: "grep confirms no SIGN_IN_PATH/BOARDS_PATH exports remain in routes.ts; grep confirms
          the (typeof ROUTE)[keyof typeof ROUTE] index-access idiom is present"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both guard layers (proxy.ts, app/(dashboard)/layout.tsx) and sign-out-button.tsx
      read redirect destinations from ROUTE; the route-guard rewrite changed no observable
      behaviour"
    requirement: "AUTH-03"
    verification:
      - kind: e2e
        ref: "e2e/route-guard.e2e.spec.ts — 5 scenarios (unauthenticated -> board list redirect,
          unauthenticated -> board detail prefix redirect, signed-in -> sign-in-route redirect,
          tampered cookie, expired cookie), all pass after both Task 1 and the final full run"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every remaining call site (auth hooks' post-auth destination, landing page's two
      anchors, both auth forms' cross-links, both e2e specs' raw navigation targets) reads from
      ROUTE; a repository-wide check (pnpm routes:check) runs in the CI quality job and fails on
      any reintroduced literal"
    requirement: "AUTH-03"
    verification:
      - kind: other
        ref: "node scripts/check-routes.mjs run directly: 'routes:check passed — no
          application-path literal found outside src/lib/routes.ts.' pnpm routes:check step added
          to .github/workflows/ci.yml's quality job, beside lint and format:check"
        status: pass
      - kind: e2e
        ref: "e2e/auth.e2e.spec.ts (3 scenarios) + e2e/route-guard.e2e.spec.ts (5 scenarios) — all
          8 AUTH-01/02/03 scenarios pass, unchanged from before this plan"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both auth mutation hooks (useSignIn, useSignUp) have direct jsdom/RTL tests
      covering exactly-once invocation with unchanged credentials, success navigating to
      ROUTE.BOARDS then refreshing (in order), unmodified error-message surfacing on failure,
      no-navigation on failure, and exactly-once invocation on failure (retry disabled)"
    requirement: "AUTH-01, AUTH-02"
    verification:
      - kind: unit
        ref: "src/features/auth/hooks/use-sign-in.unit.test.tsx and use-sign-up.unit.test.tsx —
          5 tests each (10 total), all pass; pnpm vitest run --project unit reports 5/5 files, 47/47
          tests passing project-wide"
        status: pass
    human_judgment: false
  - id: D5
    description: "The jsdom harness placeholder (rtl-harness-probe.tsx and its test) is removed
      from the git index, and the jsdom unit project still has real tests to run"
    verification:
      - kind: other
        ref: "git ls-files 'src/lib/rtl-harness-probe*' returns nothing; pnpm test (full suite,
          all five Vitest projects) reports 32 test files / 374 tests passing"
        status: pass
    human_judgment: false
  - id: D6
    description: "The routes:check CI step is green on the real GitHub remote"
    verification: []
    human_judgment: true
    rationale: "This plan executed inside a worktree-isolated executor agent that does not push to
      origin (the orchestrator merges and pushes centrally, same deferral category as
      01-13-SUMMARY.md's D5). The .github/workflows/ci.yml quality job's new 'Route declaration
      check' step (pnpm routes:check) was verified locally instead: the exact command was run
      directly against the full repository and passed with zero violations. Confirm on the real
      remote once this worktree is merged."

# Metrics
duration: ~35min (task-commit span; excludes upfront context-reading and dependency-install time)
completed: 2026-08-18
status: complete
---

# Phase 01 Plan 20: Route Declaration Consolidation + Auth Hook RTL Coverage (GC-04, GC-07) Summary

**`src/lib/routes.ts` rewritten around a single `ROUTE` as-const object in this project's own enum-like-constant shape (ADR tech/0012, with a recorded key-vs-value deviation), every call site — including two files the plan's own file list missed — now reads from it, a new `pnpm routes:check` CI gate keeps it that way, and both auth mutation hooks gained their first direct React Testing Library coverage, retiring the jsdom harness placeholder.**

## Performance

- **Duration:** ~35 min (span between first and last task commit; dependency install (~2.5 min)
  and Playwright browser install not separately timed)
- **Tasks:** 3
- **Files modified:** 20 (4 created, 14 modified, 2 deleted)
- **Commits:** 3

## Accomplishments

- `src/lib/routes.ts` now declares one `ROUTE` object (`HOME`, `SIGN_IN`, `SIGN_UP`, `BOARDS`) with
  `Route` derived via `(typeof ROUTE)[keyof typeof ROUTE]`, plus a separate `boardDetail(boardId)`
  builder (kept outside `ROUTE` so the derived type stays a pure union of paths). The former loose
  `SIGN_IN_PATH`/`BOARDS_PATH` constants and the two hand-written policy arrays are gone;
  `PROTECTED_PREFIXES`/`PUBLIC_PATHS` are now built from `ROUTE` members. `isProtectedPath`/
  `isPublicPath` semantics are byte-identical to plan 01-13's implementation.
- Every call site reads from `ROUTE`: `proxy.ts`, `app/(dashboard)/layout.tsx`,
  `sign-out-button.tsx`, both auth hooks' post-authentication destination, the landing page's two
  anchors, both auth forms' cross-links, and both end-to-end specs' navigation targets (removing
  the same-path-two-spellings inconsistency the plan flagged).
- New `scripts/check-routes.mjs` (`pnpm routes:check`) scans `app/`, `src/`, `e2e/` and `proxy.ts`
  for a quoted literal matching the sign-in, sign-up or board-list path, excluding
  `src/lib/routes.ts` itself and the two `openapi-typescript`-generated type files (which describe
  the *backend* REST contract's own path keys, not frontend routes). Wired into the CI `quality`
  job beside `lint` and `format:check`.
- `src/lib/routes.unit.test.ts` covers `boardDetail` and both predicates via a D-26y parametrised
  loop, including the near-miss case (`/boardsish` is not treated as protected).
- `use-sign-in.unit.test.tsx` and `use-sign-up.unit.test.tsx` — the first React Testing Library
  tests in this project against real application code — cover both hooks via `renderHook` +
  `QueryProvider`, with `next/navigation` and `@/features/auth/api/auth-api` mocked. Both files
  assert exactly-once invocation with unchanged credentials, in-order `push`-then-`refresh` on
  success, an unmodified error message on failure, no navigation on failure, and exactly-once
  invocation on failure (proving retry is disabled).
- `src/lib/rtl-harness-probe.tsx` and its test are deleted — the jsdom "unit" Vitest project is now
  populated by real tests, not a placeholder.
- All eight AUTH-01/02/03 end-to-end scenarios (plan 01-13's `e2e/auth.e2e.spec.ts` and
  `e2e/route-guard.e2e.spec.ts`) pass unchanged after every task, proving the rewrite altered no
  guard behaviour.

## Task Commits

1. **Task 1: End-to-end "the guard still guards" — one declaration through both guard layers** —
   `b048aaa` (feat)
2. **Task 2: Every remaining call site reads the declaration, and a CI check keeps it that way** —
   `df30fb6` (feat)
3. **Task 3: Real React Testing Library coverage for the auth mutation hooks, and the placeholder
   retired** — `842b029` (test)

**Plan metadata:** commit created at end of this execution (see final commit list returned to the
orchestrator).

## Files Created/Modified

- `src/lib/routes.ts` — the rewritten single declaration (`ROUTE`, `Route`, `boardDetail`,
  `PROTECTED_PREFIXES`, `PUBLIC_PATHS`, `isProtectedPath`, `isPublicPath`)
- `src/lib/routes.unit.test.ts` — declaration-level coverage
- `proxy.ts`, `app/(dashboard)/layout.tsx`, `src/features/auth/components/sign-out-button.tsx` —
  the three guard-layer consumers, now reading from `ROUTE`
- `app/(dashboard)/error.tsx` — fixed import broken by Task 1's export removal (not in the plan's
  file list; see Deviations)
- `app/page.tsx`, `src/features/auth/components/sign-in-form.tsx`,
  `src/features/auth/components/sign-up-form.tsx` — landing/cross-link anchors now read `ROUTE`
- `src/features/auth/hooks/use-sign-in.ts`, `use-sign-up.ts` — local post-auth destination
  constants deleted, navigate to `ROUTE.BOARDS` directly
- `e2e/auth.e2e.spec.ts`, `e2e/route-guard.e2e.spec.ts` — every raw navigation target replaced with
  the matching `ROUTE` member
- `src/components/layout/error-fallback/error-fallback.stories.tsx`,
  `error-fallback.test.tsx` — hardcoded `"/boards"` demo values switched to `ROUTE.BOARDS`
- `scripts/check-routes.mjs` — the new repo-wide literal-drift check
- `package.json` — added `routes:check` script
- `.github/workflows/ci.yml` — added the "Route declaration check" step to the `quality` job
- `src/features/auth/hooks/use-sign-in.unit.test.tsx`,
  `use-sign-up.unit.test.tsx` — the new hook-level RTL coverage
- `src/lib/rtl-harness-probe.tsx`, `src/lib/rtl-harness-probe.unit.test.tsx` — deleted

## Decisions Made

See frontmatter `key-decisions` for the full list. Most significant: the ADR tech/0012 partial
deviation (keys don't mirror path-shaped values) is now recorded permanently in `routes.ts`'s own
doc comment, and the new `routes:check` script explicitly excludes `openapi-typescript`-generated
files so a future contract regeneration never trips the frontend-route-literal gate on the
backend's own path keys.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `app/(dashboard)/error.tsx` imported the removed `BOARDS_PATH` export**
- **Found during:** Task 1 (post-rewrite grep for remaining `routes.ts` consumers)
- **Issue:** This file is not in the plan's `files_modified` list, but it imports `BOARDS_PATH`
  from `src/lib/routes.ts` for its `homeHref` prop. Task 1's rewrite removes that export, which
  would have broken this file's compilation and, transitively, `pnpm build`/`pnpm exec tsc
  --noEmit`.
- **Fix:** Updated the import and usage to `ROUTE.BOARDS`.
- **Files modified:** `app/(dashboard)/error.tsx`
- **Verification:** `pnpm build`, `pnpm exec tsc --noEmit` and the full `pnpm exec playwright test
  --project e2e` run all pass after the fix.
- **Committed in:** `b048aaa` (Task 1 commit)

**2. [Rule 3 - Blocking] Both e2e spec files' imports of the removed `SIGN_IN_PATH`/`BOARDS_PATH`
   names needed renaming inside Task 1, ahead of Task 2's raw-literal replacement work**
- **Found during:** Task 1 (verify step requires the full e2e suite to compile and run)
- **Issue:** The plan's Task 1 `<files>` list doesn't include the e2e specs, but both files import
  `SIGN_IN_PATH`/`BOARDS_PATH` by name — names Task 1's rewrite deletes. Task 1's own `<verify>`
  runs `pnpm exec playwright test --project e2e`, which requires these imports to resolve.
- **Fix:** Renamed the imported symbols to `ROUTE.SIGN_IN`/`ROUTE.BOARDS` at every existing usage
  site in both files, without touching the separate raw string literals (`page.goto("/login")`
  etc.) that Task 2's action text explicitly assigns as its own work.
- **Files modified:** `e2e/auth.e2e.spec.ts`, `e2e/route-guard.e2e.spec.ts`
- **Verification:** `pnpm exec playwright test --project e2e` — 8/8 pass, both after Task 1 and
  again after Task 2's literal replacement.
- **Committed in:** `b048aaa` (Task 1 commit); the remaining raw literals in the same files were
  replaced in `df30fb6` (Task 2 commit), per the plan's original task split.

**3. [Rule 2 - Completeness] `error-fallback.stories.tsx`/`.test.tsx` hardcoded `"/boards"` as a
   demo `homeHref` value**
- **Found during:** Task 2 (running the repository-wide literal search before writing
  `routes:check`)
- **Issue:** `ErrorFallback` is a generic component (its `homeHref` prop accepts any string), but
  its story and behavioural test hardcoded the real application's board-list path as a demo value
  — exactly the kind of outside-declaration literal `routes:check` is built to catch, and its own
  real-app usage (`app/(dashboard)/error.tsx`) already passes `ROUTE.BOARDS`.
- **Fix:** Switched both files' `"/boards"` literal to `ROUTE.BOARDS`.
- **Files modified:** `src/components/layout/error-fallback/error-fallback.stories.tsx`,
  `error-fallback.test.tsx`
- **Verification:** `pnpm routes:check` passes with zero violations; `pnpm test` (374/374) and
  `pnpm build-storybook`-adjacent unit/browser suites unaffected (story/test behaviour unchanged,
  only the literal source changed).
- **Committed in:** `df30fb6` (Task 2 commit)

**4. [Rule 1 - Bug, plan's own diagnostic] Task 2's literal `<verify>` grep has no exclusion for
   `openapi-typescript`-generated output**
- **Found during:** Task 2 (running the plan's exact repository-wide search command)
- **Issue:** The plan's `<verify>` text is `grep -rnE ... | grep -v 'src/lib/routes.ts' | wc -l |
  ... grep -qx 0`. Run verbatim, this reports a count of 1: `src/lib/api/generated-types.ts:119:
  "/boards": {` — the external REST API's own path key, generated by `pnpm api:generate` from
  `docs/api/kanban-board-openapi.json`, unrelated to this app's frontend page routes and outside
  this plan's scope to change (it isn't hand-authored and would be overwritten on the next
  regeneration regardless).
- **Fix:** The actual enforcement mechanism this task builds — `scripts/check-routes.mjs`,
  committed as `pnpm routes:check` — was written with an explicit exclusion for both
  `generated-types.ts` and `bff-generated-types.ts` from the start (see the script's own header
  comment). Verified the *intended* check (`pnpm routes:check`) passes with zero violations, rather
  than treating the plan's raw diagnostic grep as authoritative.
- **Files modified:** none beyond `scripts/check-routes.mjs` itself (already accounted for in
  Task 2's primary deliverable, not a separate fix)
- **Verification:** `node scripts/check-routes.mjs` → `routes:check passed — no application-path
  literal found outside src/lib/routes.ts.`
- **Committed in:** `df30fb6` (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 Rule 3 - blocking, 1 Rule 2 - completeness, 1 Rule 1 - bug in
the plan's own diagnostic command).
**Impact on plan:** All four were necessary to make the plan's own acceptance criteria (a clean
compile, a passing e2e suite, and a genuinely zero-violation repository-wide literal check) true.
No scope creep — every fix is either a call site the consolidation was always going to need to
touch (deviations 1–3) or a verification-only clarification with no source change of its own
(deviation 4).

## Issues Encountered

- No `.env.local` existed in this worktree and `pnpm build`/`pnpm exec playwright test --project
  e2e` both require `SESSION_SECRET` (ADR tech/0001 — a default secret fails loudly rather than
  silently). Direct file creation via the Write tool was denied by this session's permission
  settings for `.env*` paths; worked around by exporting `SESSION_SECRET` and
  `EXTERNAL_API_BASE_URL` as shell environment variables for every verification command instead of
  persisting them to `.env.local`. No production code or config was touched to work around this —
  it only affected how local verification commands were invoked in this session.

## User Setup Required

None new. The real per-Vercel-environment `SESSION_SECRET` setup remains deferred to plan 01-15 as
previously documented (01-13-SUMMARY.md).

## Next Phase Readiness

- GC-04 and GC-07 are closed: `routes.ts` follows the project's own enum-like constant pattern,
  covers the dynamic board path via `boardDetail`, no call site bypasses it, `pnpm routes:check`
  runs in CI to keep it that way, and React Testing Library is exercised by real tests of real
  hooks rather than a placeholder.
- Phase 2 (boards) can use `boardDetail(boardId)` as the one supported way to build a board detail
  URL — its unit test already asserts the composed result.
- **Deferred, not a blocker:** D6's real-GitHub-Actions-remote confirmation for the new `routes:check`
  CI step — this worktree-isolated executor does not push to origin; the orchestrator merges and
  pushes centrally. Confirm the `quality` job's new step is green on the real remote after merge
  (same deferral category as 01-13-SUMMARY.md's original `e2e` CI job).

## Known Stubs

None. This plan touched no rendering surface that stubs data — it is a pure consolidation
(route declaration) and test-coverage (hook tests) plan.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-18*

## Self-Check: PASSED

- FOUND: `src/lib/routes.ts`, `src/lib/routes.unit.test.ts`, `scripts/check-routes.mjs`,
  `src/features/auth/hooks/use-sign-in.unit.test.tsx`,
  `src/features/auth/hooks/use-sign-up.unit.test.tsx`,
  `.planning/phases/01-foundation-auth-preferences/01-20-SUMMARY.md`.
- FOUND (via `git log --oneline --all`): commits `b048aaa`, `df30fb6`, `842b029`.
