---
phase: 01-foundation-auth-preferences
plan: 14
subsystem: ui
tags: [theme, tanstack-query, server-actions, cookies, playwright-e2e, storybook]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (plan 01-13)
    provides: app/(dashboard)/layout.tsx chrome, verifySession()-based session identity, the
      Playwright "e2e" project and its CI job
  - phase: 01-foundation-auth-preferences (plan 01-32)
    provides: the session-bridging externalApi middleware that authenticates every outbound call
      for a signed-in user, consumed unchanged by updateThemeAction
  - phase: 01-foundation-auth-preferences (plan 01-35)
    provides: the Task 3 checkpoint decision (server function, option-b) this plan's Task 1/Task 2
      actions were already reshaped around before this execution began
provides:
  - updateThemeAction (src/features/theme/actions.ts) — session-derived-only theme persistence
    server function
  - THEME_COOKIE/readThemeCookie/writeThemeCookie (src/lib/server/theme.ts) — the pre-hydration
    cookie module, created ahead of schedule in Task 1 (see Deviations)
  - useThemePreference (src/features/theme/hooks/use-theme-preference.ts) — optimistic mutation
    hook with client-side cookie write for the unauthenticated path
  - ThemeToggle (src/features/theme/components/theme-toggle.tsx) — the Switch + live-region
    failure message, mounted in both app/(dashboard)/layout.tsx and app/(auth)/layout.tsx
  - e2e/theme.e2e.spec.ts — the THEME-01 end-to-end proof
  - e2e/global-setup.ts + playwright.config.ts globalSetup wiring — the e2e suite now refuses to
    run at all without a working nonprod reset capability (see Deviations, user-directed)
affects: [Phase 2 (any future feature that adds its own theme-derived UI), CI (.github/workflows/
  ci.yml's e2e job now requires NONPROD_RESET_TOKEN in the Playwright process env, not just the
  post-suite cleanup step)]

# Actuals (#2632)
actuals:
  tokens: 13576
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A domain's own Server Action lives in that domain's flat actions.ts (features/<domain>/
      actions.ts) — applied to theme, matching the round-4 reorg convention auth's actions.ts
      already established."
    - "A TanStack Query mutationFn can be a server function called directly with no wrapper
      (mutationFn: updateThemeAction) — the hook owns optimistic apply-then-persist-then-revert;
      the unauthenticated path bypasses the mutation entirely rather than branching inside
      mutationFn."
    - "A client-only type/constant duplicated deliberately (with a comment) rather than imported,
      when the only alternative would be importing a server-only-guarded module into client code —
      applied to the Theme type and the theme cookie's literal name in
      use-theme-preference.ts."
    - "Playwright globalSetup gating a whole project on an external precondition (nonprod reset
      capability) rather than best-effort post-suite cleanup — see Deviations."

key-files:
  created:
    - src/features/theme/actions.ts
    - src/features/theme/actions.unit.test.ts
    - src/lib/server/theme.ts
    - src/features/theme/hooks/use-theme-preference.ts
    - src/features/theme/components/theme-toggle.tsx
    - src/features/theme/components/theme-toggle.test.tsx
    - src/features/theme/components/theme-toggle.stories.tsx
    - src/test-utils/theme-actions-storybook-stub.ts
    - e2e/theme.e2e.spec.ts
    - e2e/global-setup.ts
  modified:
    - app/layout.tsx
    - app/(dashboard)/layout.tsx
    - app/(auth)/layout.tsx
    - vitest.config.ts
    - playwright.config.ts
    - eslint.config.mjs
    - .github/workflows/ci.yml
    - SETUP.md

key-decisions:
  - "src/lib/server/theme.ts created in Task 1, not Task 2 (Rule 3 - blocking): Task 1's own
    action text instructs updateThemeAction to call Task 2's writeThemeCookie on success, but
    that function does not exist until Task 2's own turn. Since a working build is required to
    verify Task 1, the whole theme.ts module (THEME_COOKIE/readThemeCookie/writeThemeCookie) was
    written in Task 1, matching exactly the shape Task 2's own action text calls for; Task 2
    consumed it unchanged."
  - "app/(dashboard)/layout.tsx prefers the theme cookie over the session JWT's own theme field
    (Rule 1 - bug, found via the Task 3 e2e run): the session JWT's theme is a snapshot taken at
    sign-in time, never refreshed by updateThemeAction (which only writes the separate theme
    cookie) — a plain reload after toggling showed the toggle reverted to the stale sign-in-time
    value even though the cookie and the account were already correct. Falls back to the
    session's own value only when no cookie exists yet (a fresh sign-in with no prior toggle)."
  - "e2e/theme.e2e.spec.ts signs up through the real form rather than
    e2e/fixtures.ts's createFixtureAccount (Rule 1 - bug, found via the Task 3 e2e run):
    createFixtureAccount's own raw POST /signup call already consumes one of the account's two
    concurrent-session slots on the real backend — verified directly while writing this test, the
    second sign-in after this scenario's required sign-out was refused identically to a wrong
    password when the fixture helper was used. Signing up through the browser form (mirroring
    auth.e2e.spec.ts's own AUTH-01 test) uses exactly one session at sign-up, leaving exactly one
    more for the explicit sign-in after sign-out — precisely the two-session budget."
  - "The theme e2e scenario polls document.cookie rather than page.waitForLoadState('networkidle')
    to know the persistence call has settled (Rule 1 - bug, found via the Task 3 e2e run):
    networkidle resolved before the cookie the Server Action sets was actually visible on
    document.cookie (confirmed empty immediately after networkidle, present ~1.5s later in a
    debug run) — an unreliable proxy for the actual condition every downstream assertion depends
    on."
  - "The e2e Playwright project now refuses to run at all without a working nonprod reset
    capability (globalSetup calling POST /admin/reset before any spec runs) — wired at the user's
    explicit direction mid-Task-3, not a Rule 1-3 auto-fix. Previously reset was CI-only,
    best-effort, post-suite cleanup (plan 01-31); local runs (including this plan's own
    verification passes) created real, permanent accounts on the shared nonprod backend with no
    cleanup capability at all. Scoped narrowly to the e2e (Playwright) project only, per the
    user's literal wording — the separate Vitest node-project integration test
    (server-client.integration.test.ts) was left untouched."

patterns-established:
  - "Server function forward-dependency resolution — see tech-stack patterns."
  - "Client-side duplication of a server-only constant/type, with a comment — see tech-stack
    patterns."
  - "Playwright globalSetup as a hard precondition gate, not best-effort cleanup — see tech-stack
    patterns and Deviations."

requirements-completed: [THEME-01]

coverage:
  - id: D1
    description: "updateThemeAction authenticates itself via verifySession() and carries no
      caller-suppliable user id at all — the function's signature is (theme: Theme), with no
      argument position through which a different user's id could be supplied"
    requirement: "THEME-01"
    verification:
      - kind: unit
        ref: "src/features/theme/actions.unit.test.ts — 6 tests: valid update, idempotent
          repeat, invalid value rejected before upstream, no caller-suppliable user id,
          unauthenticated refusal, upstream failure reported as failure"
        status: pass
    human_judgment: false
  - id: D2
    description: "The toggle flips instantly client-side (document root class + local state)
      before any network response, issues the persistence call second, stays in place on
      success, and reverts with a polite live-region message on failure"
    requirement: "THEME-01"
    verification:
      - kind: unit
        ref: "src/features/theme/components/theme-toggle.test.tsx — 8 behaviours x 2 viewports
          (16 tests): accessible name, optimistic-before-response ordering (both directions),
          success stays/no message, failure reverts/shows message, keyboard operability,
          toggle-twice returns to origin, unauthenticated path never calls the server function"
        status: pass
    human_judgment: false
  - id: D3
    description: "The saved theme is present in the server-rendered HTML before any script runs —
      no flash of the other theme"
    requirement: "THEME-01"
    verification:
      - kind: manual_procedural
        ref: "curl against the built app with no theme cookie (html class: 'h-full antialiased',
          no dark) and with theme=DARK (html class: '...dark') — confirmed the class is present
          in the raw HTTP response body, before any script runs"
        status: pass
      - kind: e2e
        ref: "e2e/theme.e2e.spec.ts — reads reloadResponse.text() directly (not the post-hydration
          DOM) and asserts the dark class against the raw response body"
        status: pass
    human_judgment: false
  - id: D4
    description: "Persistence holds across a full reload and across sign-out and sign-in, proven
      end to end in a real browser against the real backend"
    requirement: "THEME-01"
    verification:
      - kind: e2e
        ref: "pnpm exec playwright test --project e2e — 9/9 scenarios pass (theme.e2e.spec.ts's
          single continuous THEME-01 scenario alongside auth.e2e.spec.ts/route-guard.e2e.spec.ts),
          run twice to confirm stability, no flake observed"
        status: pass
    human_judgment: false
  - id: D5
    description: "No visual/theme.visual.spec.ts entry or baseline is created — visual-regression
      coverage stays scoped to components/ui/ primitives per ADR tech/0011"
    verification:
      - kind: other
        ref: "ls visual/ shows only primitives.visual.spec.ts and __screenshots__; no theme file
          present"
        status: pass
    human_judgment: false
  - id: D6
    description: "The e2e CI job is green on the real GitHub remote for this exact commit"
    verification: []
    human_judgment: true
    rationale: "This plan executed inside a worktree-isolated executor agent that does not push
      to origin (the orchestrator merges and pushes centrally). The e2e project's exact command
      (pnpm exec playwright test --project e2e) was run twice locally against the live nonprod
      backend and passed both times; ci.yml was also updated in this plan to forward
      NONPROD_RESET_TOKEN into the Run E2E tests step (previously it was only visible to the
      separate post-suite Reset nonprod state step), a change not yet observed on the real
      GitHub remote. Same deferral category as 01-13-SUMMARY.md's D5. Confirm once merged."

duration: ~44min (span between first and last task commit)
completed: 2026-08-19
status: complete
---

# Phase 01 Plan 14: Theme Persistence — Server Function, Optimistic Toggle, Pre-Hydration Scope, and E2E Proof Summary

**THEME-01 closed end to end: `updateThemeAction` persists a signed-in user's light/dark choice through the session-bridged `externalApi`, the toggle flips optimistically and reverts honestly on failure, the root layout paints the saved theme with no flash, and a real Playwright run proves it survives a reload and a sign-out/sign-in cycle — with a real stale-session bug and two e2e-harness bugs found and fixed along the way.**

## Performance

- **Duration:** ~44 min (span between first and last task commit; upfront context-reading and
  package installation not separately timed)
- **Started:** 2026-08-19T17:59:58+02:00 (Task 1 commit)
- **Completed:** 2026-08-19T18:43:26+02:00 (Task 3 commit)
- **Tasks:** 3
- **Files modified:** 18 (10 created, 8 modified)

## Accomplishments

- `src/features/theme/actions.ts` exports `updateThemeAction`, a server function that calls
  `verifySession()` first and returns a failure state when it yields nothing, validates the value
  with a Zod schema before calling upstream, forwards the calling session's own id (never a
  caller-suppliable one) to `PUT /users/me/theme`, and writes the theme cookie only on confirmed
  success.
- `src/features/theme/hooks/use-theme-preference.ts` owns the optimistic toggle: apply the new
  theme to the document root and local state first, issue `updateThemeAction` second (as the
  mutation's own `mutationFn`, no wrapper), and revert both on failure. An unauthenticated toggle
  updates the cookie and document scope directly and never calls the server function.
- `src/features/theme/components/theme-toggle.tsx` composes the `Switch` primitive with sun/moon
  glyphs and a polite live-region failure message — the plan's own recorded replacement for
  UI-SPEC's unconfirmed toast recommendation, since no toast primitive exists.
- `app/layout.tsx` reads the theme cookie server-side and applies the `dark` class before
  hydration — confirmed via direct `curl` against the built app that the class is present in the
  raw HTML response, not applied after load.
- `e2e/theme.e2e.spec.ts` proves the whole THEME-01 flow — toggle, reload-persists,
  sign-out-and-sign-in-persists, toggle-back — in a real browser against the real backend,
  alongside the existing AUTH-01/02/03 specs (9/9 passing, run twice for stability).
- Along the way, found and fixed one real product bug (dashboard layout reading a stale
  session-JWT theme field instead of the freshly-written cookie) and two e2e-harness bugs
  (`createFixtureAccount` exceeding the real backend's two-session cap for this scenario;
  `networkidle` resolving before the persistence cookie was actually visible) — see Deviations.
- At the user's explicit mid-task direction, wired a hard precondition onto the whole `e2e`
  Playwright project: it now refuses to run at all (via `globalSetup`) unless
  `NONPROD_RESET_TOKEN` is set and the reset endpoint responds successfully, closing a real gap
  where local runs (including this plan's own verification) created permanent orphaned accounts
  on the shared nonprod backend with no cleanup capability.

## Task Commits

1. **Task 1: Theme persistence server function** — `186e263` (feat)
2. **Task 2: Theme toggle with optimistic update, pre-hydration scope, and honest failure** —
   `72ebc54` (feat)
3. **Task 3: End-to-end theme persistence** — `d3e84eb` (test)

**Plan metadata:** commit created at end of this execution (see final commit list returned to the
orchestrator).

## Files Created/Modified

- `src/features/theme/actions.ts` / `actions.unit.test.ts` — the server function and its 6-test
  suite
- `src/lib/server/theme.ts` — `THEME_COOKIE`/`readThemeCookie`/`writeThemeCookie`
- `src/features/theme/hooks/use-theme-preference.ts` — the mutation hook
- `src/features/theme/components/theme-toggle.{tsx,test.tsx,stories.tsx}` — the toggle component,
  its 16-test suite (8 behaviours x 2 viewports), and 4 Storybook stories
- `src/test-utils/theme-actions-storybook-stub.ts` — no-op stand-in for the storybook Vitest
  project (mirrors the existing auth-actions stub)
- `app/layout.tsx` — pre-hydration cookie read + `dark` class
- `app/(dashboard)/layout.tsx` — mounts `ThemeToggle` (authenticated), prefers the cookie over
  the session's own `theme` field
- `app/(auth)/layout.tsx` — mounts `ThemeToggle` (unauthenticated), resolves the theme cookie
  itself
- `vitest.config.ts` — storybook project alias for the new theme-actions stub
- `e2e/theme.e2e.spec.ts` — the THEME-01 end-to-end scenario
- `e2e/global-setup.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, `SETUP.md` — the
  reset-capability precondition gate
- `eslint.config.mjs` — added `e2e/global-setup.ts` to the framework-forced default-export
  allowlist

## Decisions Made

See frontmatter `key-decisions` for the full list. Most significant: reading the theme cookie
(not the session JWT) in the dashboard layout, and gating the whole e2e project on a working
reset capability.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `src/lib/server/theme.ts` created in Task 1, not Task 2**
- **Found during:** Task 1
- **Issue:** Task 1's own action text instructs `updateThemeAction` to write the theme cookie "on
  success" via "Task 2's `writeThemeCookie`" — but that module is officially Task 2's own file,
  which does not exist yet when Task 1 runs, so the build cannot pass.
- **Fix:** Wrote the whole `src/lib/server/theme.ts` module (cookie name constant, reader, writer)
  in Task 1, exactly matching the shape Task 2's own action text separately calls for. Task 2
  consumed it unchanged — no duplicate or conflicting implementation.
- **Files modified:** `src/lib/server/theme.ts`
- **Verification:** `pnpm test && pnpm build && pnpm lint && pnpm exec tsc --noEmit` all pass in
  both Task 1 and Task 2.
- **Committed in:** `186e263` (Task 1 commit)

**2. [Rule 1 - Bug] Dashboard layout read the stale session-JWT theme field instead of the fresh
   cookie**
- **Found during:** Task 3, first e2e run (a reload after toggling showed the control reverted to
  the pre-toggle value even though the raw HTML's `dark` class was already correct)
- **Issue:** `app/(dashboard)/layout.tsx` passed `identity.theme` (the session JWT's own `theme`
  field, a snapshot taken at sign-in time) as `ThemeToggle`'s `initialTheme`. `updateThemeAction`
  never re-mints the session — it only writes the separate theme cookie — so after a toggle, a
  plain reload showed the toggle reverted to the stale sign-in-time value while the root layout's
  `dark` class (which reads the cookie) was already correct: the two surfaces disagreed.
- **Fix:** The dashboard layout now reads `readThemeCookie()` and prefers it over
  `identity.theme`, falling back to the session's own value only when no cookie exists yet (a
  fresh sign-in that has never toggled here before).
- **Files modified:** `app/(dashboard)/layout.tsx`
- **Verification:** `e2e/theme.e2e.spec.ts`'s reload scenario passes; `pnpm build`/`lint`/
  `tsc --noEmit` all exit 0.
- **Committed in:** `d3e84eb` (Task 3 commit)

**3. [Rule 1 - Bug] `createFixtureAccount` exceeds the real backend's two-concurrent-session cap
   for this scenario**
- **Found during:** Task 3, second e2e run (the sign-in after sign-out was refused identically to
  a wrong password)
- **Issue:** `e2e/fixtures.ts`'s `createFixtureAccount` makes its own raw `POST /signup` call,
  which itself establishes a live upstream session — verified directly against the live backend.
  This plan's scenario needs a sign-in, a sign-out, and a second sign-in on the same account (to
  prove persistence across sign-out/sign-in); combined with the fixture's own session that is
  three live sessions on one account, one more than the backend's real two-session cap allows.
- **Fix:** Sign up through the real form instead (mirroring `auth.e2e.spec.ts`'s own AUTH-01
  test), which establishes exactly one session at sign-up, leaving exactly one more for the
  explicit sign-in after sign-out — precisely the two-session budget.
- **Files modified:** `e2e/theme.e2e.spec.ts`
- **Verification:** `pnpm exec playwright test --project e2e` — 9/9 pass, run twice.
- **Committed in:** `d3e84eb` (Task 3 commit)

**4. [Rule 1 - Bug] `page.waitForLoadState("networkidle")` resolved before the persistence cookie
   was actually visible**
- **Found during:** Task 3, debugging deviation 3/the reload assertion's continued flakiness
- **Issue:** Added a temporary debug log and confirmed `document.cookie` read empty immediately
  after `networkidle` resolved, and correctly showed the new theme value ~1.5s later — an
  unreliable proxy for "the persistence call has settled."
- **Fix:** Replaced `networkidle` waits with `expect.poll(() => page.evaluate(() =>
  document.cookie)).toContain(...)`, polling for the actual condition every downstream assertion
  depends on.
- **Files modified:** `e2e/theme.e2e.spec.ts`
- **Verification:** `pnpm exec playwright test --project e2e` — 9/9 pass, run twice for stability.
- **Committed in:** `d3e84eb` (Task 3 commit)

### User-Directed Addition (not a Rule 1-3 auto-fix)

**5. e2e Playwright project gated on a working nonprod reset capability**
- **Found during:** Task 3, after the user asked mid-task whether the e2e command calls the
  cleanup endpoint automatically (it does not — `POST /admin/reset` is only invoked from
  `.github/workflows/ci.yml`'s separate post-suite step, never by the Playwright process itself,
  and never locally) and then explicitly directed that availability of the endpoint and secret be
  made a hard prerequisite, refusing to run by default otherwise.
- **Change:** Added `e2e/global-setup.ts` (Playwright `globalSetup`), wired into
  `playwright.config.ts` only when a run includes the `e2e` project. It throws (aborting the
  whole run before any spec executes) if `NONPROD_RESET_TOKEN` is unset or the reset endpoint
  does not respond successfully. Updated `.github/workflows/ci.yml`'s "Run E2E tests" step to
  forward `NONPROD_RESET_TOKEN` into the Playwright process's own environment (previously only
  the separate post-suite cleanup step had it). Documented the new local requirement in
  `SETUP.md`. Added `e2e/global-setup.ts` to `eslint.config.mjs`'s framework-forced
  default-export allowlist (Playwright's `globalSetup` loading convention requires it).
- **Scope:** Deliberately narrowed to the `e2e` (Playwright) project only, per the user's literal
  wording — the separate Vitest "node" project's `server-client.integration.test.ts` (which also
  creates real accounts) was left untouched.
- **Verification:** Confirmed the refusal path directly — running `pnpm exec playwright test
  --project e2e` with `NONPROD_RESET_TOKEN` unset throws the expected error before any test
  executes and creates zero accounts. Could not verify the success path (calling the real reset
  endpoint) — this agent does not have `NONPROD_RESET_TOKEN` (a GitHub Actions repository secret,
  never committed).
- **Files modified:** `e2e/global-setup.ts` (new), `playwright.config.ts`,
  `.github/workflows/ci.yml`, `eslint.config.mjs`, `SETUP.md`
- **Committed in:** `d3e84eb` (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (1 Rule 3 - blocking, 3 Rule 1 - bugs, all found via this
plan's own end-to-end verification loop), 1 user-directed infrastructure addition (not a
deviation-rule auto-fix — an explicit mid-task instruction).
**Impact on plan:** All four auto-fixes were necessary for the plan's own stated behaviour and
verify gates to hold true — none were scope creep, and three of the four were only discoverable
by actually running the e2e suite against the real backend rather than trusting the plan's
literal text. The reset-capability gate is a deliberate, user-requested hardening of the e2e
harness that goes beyond this plan's own `<files>` list but stays scoped to the exact concern
raised (this plan's own e2e spec is what surfaced the gap).

## Issues Encountered

**This session ran the e2e suite locally multiple times while debugging deviations 2-4 above**
(and `pnpm test` several times for Task 1/2 verification), each creating real, permanent
throwaway accounts on the shared nonprod backend (`e2e-*@example.com`,
`e2e-theme-*@example.com`). Per this project's own GC-23 decision, the reset endpoint was
CI-only, best-effort cleanup at the time — this agent has no `NONPROD_RESET_TOKEN` and could not
clean these up itself. Deviation 5 above closes this gap going forward (any future local e2e run
now requires and consumes a working reset first), but the accounts created *during this session*
before that gate existed are not retroactively cleaned up. They will be cleared by the next CI
run's post-suite reset step, or by a manual `curl` against `/admin/reset` with the real token.

## User Setup Required

**New:** Running `pnpm exec playwright test --project e2e` locally now requires
`NONPROD_RESET_TOKEN` in the environment or `.env.local` — see `SETUP.md`'s new section. Without
it, the suite refuses to run at all (by design, per deviation 5 above). This is a new local
requirement introduced by this plan; it was not needed before.

None beyond this — no other external service configuration required.

## Next Phase Readiness

- THEME-01 is fully proven: server-side authentication and idempotency (unit), optimistic
  toggle/revert (component), and persistence across a reload and a sign-out/sign-in cycle (e2e).
- Any future phase adding its own theme-derived UI can rely on `readThemeCookie()`
  (`src/lib/server/theme.ts`) for pre-hydration scope resolution and on the
  `ThemeToggle`/`useThemePreference` pair as the established pattern for a session-optional,
  optimistic-with-revert control.
- **Deferred, not a blocker:** D6's real-GitHub-Actions-remote confirmation for the updated `e2e`
  CI job (now forwarding `NONPROD_RESET_TOKEN` into the Playwright process itself) — this
  worktree-isolated executor does not push to origin; the orchestrator merges and pushes
  centrally. Confirm the `e2e` job is still green on the real remote after merge, specifically
  that `globalSetup`'s reset call succeeds there (same deferral category as 01-13-SUMMARY.md's
  D5).
- **Deferred, not a blocker:** the throwaway accounts created during this session's own local
  verification runs (see Issues Encountered) remain on nonprod until the next reset. Not a code
  defect — a one-time consequence of debugging before deviation 5's gate existed.

## Known Stubs

None — every deliverable in this plan is fully wired (no hardcoded empty values, no placeholder
copy, no unwired data sources).

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-19*

## Self-Check: PASSED

- FOUND (via `git ls-files`): `src/features/theme/actions.ts`,
  `src/features/theme/actions.unit.test.ts`, `src/lib/server/theme.ts`,
  `src/features/theme/hooks/use-theme-preference.ts`,
  `src/features/theme/components/theme-toggle.tsx`,
  `src/features/theme/components/theme-toggle.test.tsx`,
  `src/features/theme/components/theme-toggle.stories.tsx`,
  `src/test-utils/theme-actions-storybook-stub.ts`, `e2e/theme.e2e.spec.ts`,
  `e2e/global-setup.ts`.
- FOUND (via `git log --oneline --all`): commits `186e263`, `72ebc54`, `d3e84eb`.
