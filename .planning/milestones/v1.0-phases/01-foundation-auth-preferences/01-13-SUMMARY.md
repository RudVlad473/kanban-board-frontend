---
phase: 01-foundation-auth-preferences
plan: 13
subsystem: auth
tags: [nextjs, proxy, middleware, jose, playwright, e2e, ci]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (plan 01-11)
    provides: session.ts (session-service factory), dal.ts's verifySession(), the three BFF auth
      Route Handlers
  - phase: 01-foundation-auth-preferences (plan 01-12)
    provides: SignUpForm/SignInForm navigating to /boards on success, so this plan has a real
      protected destination to guard
provides:
  - Optimistic pre-render route guard (proxy.ts, Next.js 16's renamed middleware.ts convention)
  - Single shared route-policy declaration (src/lib/routes.ts) — PROTECTED_PREFIXES/PUBLIC_PATHS/
    SIGN_IN_PATH/BOARDS_PATH — read by proxy.ts, the protected layout, and the e2e specs
  - session.ts's verifyToken(token), factored out of verify() so proxy.ts (which cannot call
    next/headers's cookies(), a Server Component/Route Handler/Server Action-only API) reuses the
    same jose verification instead of reimplementing it
  - Authoritative protected route group (app/(dashboard)/layout.tsx calling verifySession()),
    with /boards and /boards/[boardId] placeholder surfaces and a SignOutButton
  - Playwright "e2e" project (real built-app server, distinct from the "visual" project's
    storybook-static server) plus two spec files proving AUTH-01/02/03 end to end, and a new CI
    "e2e" job
affects: [01-14 (theme persistence — consumes the session identity and the (dashboard) layout
  chrome), Phase 2 (boards) — replaces the /boards and /boards/[boardId] placeholders with real
  board content]

# Actuals (#2632)
actuals:
  tokens: 7135
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Route-policy-as-data (src/lib/routes.ts): PROTECTED_PREFIXES/PUBLIC_PATHS/SIGN_IN_PATH/
      BOARDS_PATH declared once and imported by every consumer (guard, layout, specs) that needs
      a route decision, so the protected/public path lists can never drift apart between the two
      guard layers."
    - "Cookie-verification split by request-scope availability: session.ts's verify() (cookies()
      via next/headers, usable only in Server Components/Route Handlers/Server Actions) and the
      newly-added verifyToken(token) (no cookies() call, usable anywhere a raw token string is
      available) share one jose jwtVerify + isSessionPayload implementation — verify() is just
      verifyToken() plus a cookies() read. proxy.ts calls verifyToken() directly with the value
      it reads via NextRequest.cookies, since it runs outside the scope cookies() requires."
    - "Playwright webServer selection scoped by parsing --project off process.argv, since
      Playwright has no first-party per-project webServer scoping and starts every array entry
      regardless of which project was requested — required so `--project visual` doesn't trigger
      a full `next build` and `--project e2e` doesn't require storybook-static to already exist."
    - "e2e/test-env.ts centralizes SESSION_SECRET/EXTERNAL_API_BASE_URL/port resolution, shared
      by verbatim import between playwright.config.ts's e2e webServer and the specs that need to
      sign an already-expired JWT with the exact same secret the running server verifies against."

key-files:
  created:
    - proxy.ts
    - src/lib/routes.ts
    - app/(dashboard)/layout.tsx
    - app/(dashboard)/boards/page.tsx
    - app/(dashboard)/boards/[boardId]/page.tsx
    - src/features/auth/components/sign-out-button.tsx
    - e2e/test-env.ts
    - e2e/auth.e2e.spec.ts
    - e2e/route-guard.e2e.spec.ts
  modified:
    - app/page.tsx
    - src/lib/session.ts
    - playwright.config.ts
    - .github/workflows/ci.yml
    - package.json

key-decisions:
  - "session.verifyToken(token) added (Rule 3 - blocking): the plan's literal text names
    `verifySessionCookie`, but 01-11 already established session.ts's factory-closure export
    shape (session.create/verify/destroy, no three standalone functions). Neither name is
    callable from proxy.ts as-is — session.verify() internally calls next/headers's cookies(),
    which throws outside a Server Component/Route Handler/Server Action request scope, and
    proxy.ts runs outside that scope. Factored the actual jose-verify + shape-check logic out of
    verify() into session.verifyToken(token), so proxy.ts calls into the same shared
    verification code (via NextRequest's own cookie API) instead of reimplementing it, and
    verify() itself becomes a thin cookies()-read wrapper around verifyToken()."
  - "playwright.config.ts's webServer is selected per invocation by reading --project off
    process.argv (Rule 3 - blocking): Playwright starts every configured webServer regardless of
    --project filtering. Without this, `--project e2e` would also try to boot the visual
    project's storybook-static server (missing unless build-storybook already ran) and
    `--project visual` would trigger a full `next build` — breaking the plan's own acceptance
    criterion that the visual project stays unchanged."
  - "ci.yml's existing 'visual' job's Playwright invocation scoped to `--project visual`, and
    package.json's test:visual script likewise (Rule 1 - bug, direct consequence of adding a
    second project): an unscoped `playwright test` now matches both projects, which would make
    the visual-only CI job attempt a full application build. Added a matching test:e2e script for
    local parity with the project's other named test:* scripts."

patterns-established:
  - "Route-policy-as-data — see tech-stack patterns."
  - "Cookie verification factored by request-scope availability — see tech-stack patterns."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

coverage:
  - id: D1
    description: "proxy.ts: optimistic pre-render redirect — unauthenticated visitor to /boards
      or /boards/:id sent to /login before render; signed-in visitor to /, /login, /register sent
      to /boards; destinations are always the shared src/lib/routes.ts constants, never
      request-derived (no searchParams/Referer read)"
    requirement: "AUTH-03"
    verification:
      - kind: other
        ref: "plan's static verify script (proxy.ts exists at repo root only, no middleware.ts
          anywhere, no query-string/Referer reference, both destinations reference
          SIGN_IN_PATH/BOARDS_PATH) — pass; pnpm build/lint/tsc --noEmit all exit 0"
        status: pass
      - kind: e2e
        ref: "e2e/route-guard.e2e.spec.ts — 5 scenarios, all pass"
        status: pass
    human_judgment: false
  - id: D2
    description: "app/(dashboard)/layout.tsx: authoritative verifySession() check, independent of
      the optimistic guard — demonstrated by temporarily removing proxy.ts, rebuilding
      (confirmed no 'Proxy (Middleware)' route in the build output), and requesting /boards with
      no session: still 307-redirects to /login with no protected content in the response body"
    requirement: "AUTH-03"
    verification:
      - kind: other
        ref: "manual behaviour check performed during Task 2 execution: proxy.ts renamed away,
          pnpm build (confirmed no Proxy/Middleware line), pnpm exec next start, curl -L
          http://localhost:4599/boards -> 307 to /login, response body scanned for the protected
          heading text (absent), proxy.ts restored and rebuilt (Proxy/Middleware line back)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SignOutButton + the three protected surfaces: signed-in identity's displayName
      and a working sign-out control render in the dashboard chrome; /boards and
      /boards/[boardId] render placeholder headings with no board API call"
    requirement: "AUTH-03"
    verification:
      - kind: other
        ref: "plan's static verify script (grep verifySession in layout.tsx; node check that
          neither placeholder route references externalApi or /api/boards) — pass"
        status: pass
      - kind: e2e
        ref: "e2e/auth.e2e.spec.ts's sign-out scenario"
        status: pass
    human_judgment: false
  - id: D4
    description: "AUTH-01/AUTH-02/AUTH-03 proven end to end in a real browser against the real
      built application: sign-up with a fresh email lands on /boards with an httpOnly session
      cookie; sign-in as the seeded demo account survives a full page reload; sign-out redirects
      to /login and /boards then redirects back; unauthenticated /boards and /boards/:id both
      redirect without ever painting protected content; a signed-in visitor hitting /login
      redirects to /boards; a tampered cookie and a validly-shaped-but-expired cookie are both
      treated as unauthenticated"
    requirement: "AUTH-01"
    verification:
      - kind: e2e
        ref: "e2e/auth.e2e.spec.ts + e2e/route-guard.e2e.spec.ts — 8/8 scenarios pass locally
          (pnpm exec playwright test --project e2e)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The e2e CI job runs on the real GitHub remote and is green"
    verification: []
    human_judgment: true
    rationale: "This plan executed inside a worktree-isolated executor agent that does not push
      to origin (the orchestrator merges and pushes centrally per the project's worktree
      workflow). The workflow YAML's correctness is verified locally instead: the e2e job's exact
      commands (pnpm exec playwright install --with-deps chromium; pnpm exec playwright test
      --project e2e) were run directly and passed, and the YAML was checked for --project e2e's
      presence via the plan's own verify script. An actual green GitHub Actions run for this
      exact workflow has not been observed in this session — same category and same reason as
      01-05-SUMMARY.md's D3/D4 deferral for the original CI setup. Confirm on the real remote
      once this worktree is merged."

# Metrics
duration: 16min (task-commit span; excludes upfront context-reading time)
completed: 2026-08-12
status: complete
---

# Phase 01 Plan 13: Route Guard — Optimistic proxy.ts + Authoritative DAL Check + E2E Proof Summary

**Defence-in-depth AUTH-03 route guard (proxy.ts optimistic redirect + `app/(dashboard)/layout.tsx`'s independent `verifySession()` check) proven end to end in a real browser via a new Playwright `e2e` project and CI job, alongside a sign-out control and two placeholder `/boards` routes.**

## Performance

- **Duration:** ~16 min (span between first and last task commit; upfront context-loading and
  package installation not separately timed)
- **Started:** 2026-08-12T22:54:10+02:00 (Task 1 commit)
- **Completed:** 2026-08-12T23:09:39+02:00 (Task 3 commit)
- **Tasks:** 3
- **Files modified:** 14 (9 created, 5 modified)

## Accomplishments

- `proxy.ts` (Next.js 16's renamed `middleware.ts` file convention) redirects an unauthenticated
  visitor away from `/boards` and any `/boards/:id` path before render, and a signed-in visitor
  away from the public auth routes to `/boards` — both destinations are always
  `src/lib/routes.ts`'s shared constants, never derived from the request.
- `app/(dashboard)/layout.tsx` establishes identity itself via `verifySession()`, independently
  of `proxy.ts` — proven during Task 2 execution by temporarily removing `proxy.ts`, rebuilding
  (confirming the build output no longer lists a `Proxy (Middleware)` route), and requesting
  `/boards` with no session cookie: it still 307-redirected to `/login` with no protected content
  in the response body.
- `SignOutButton` posts to `/api/auth/signout` via a TanStack Query mutation, then navigates to
  `/login` and refreshes the router — no confirmation modal, per UI-SPEC's Copywriting Contract.
- A new Playwright `e2e` project runs against the real built application (distinct server,
  distinct purpose from the `visual` project's `storybook-static` server) — 8 scenarios across
  `e2e/auth.e2e.spec.ts` and `e2e/route-guard.e2e.spec.ts` prove AUTH-01, AUTH-02 (including a
  real page reload), and AUTH-03 (both the board-list and board-detail prefix paths, a tampered
  cookie, and an expired-but-validly-shaped cookie), all passing locally.
- New CI `e2e` job (`needs: quality`) mirrors the existing `visual` job's setup and generates a
  workflow-scoped `SESSION_SECRET` per run.

## Task Commits

1. **Task 1: Optimistic route guard** — `66596fb` (feat)
2. **Task 2: Protected route group with its own authoritative check** — `9891a85` (feat)
3. **Task 3: End-to-end proof of AUTH-01, AUTH-02 and AUTH-03** — `cebb230` (test)

**Plan metadata:** commit created at end of this execution (see final commit list returned to the
orchestrator).

## Files Created/Modified

- `proxy.ts` — the guard: `verifyToken()` against the request's own cookie, redirect decisions
  from `src/lib/routes.ts` only, matcher excludes `/api`, `/_next/static`, `/_next/image`, and
  any static-asset-extension path
- `src/lib/routes.ts` — `PROTECTED_PREFIXES`, `PUBLIC_PATHS`, `SIGN_IN_PATH`, `BOARDS_PATH`, plus
  `isProtectedPath`/`isPublicPath` helpers shared by the guard, the layout, and the specs
- `src/lib/session.ts` — added `verifyToken(token)` (the shared jose-verify + shape-check logic,
  no `cookies()` call) and `SESSION_COOKIE_NAME`; `verify()` now delegates to `verifyToken()`
- `app/page.tsx` — public landing route; removed plan 01-04's temporary theme probe
- `app/(dashboard)/layout.tsx` — the authoritative check; renders the identity's `displayName`
  and `SignOutButton` in the chrome
- `app/(dashboard)/boards/page.tsx` / `boards/[boardId]/page.tsx` — placeholder protected
  surfaces, no board API call (COVERAGE.md scopes that to Phase 2)
- `src/features/auth/components/sign-out-button.tsx` — the sign-out control
- `playwright.config.ts` — added the `e2e` project; `webServer` selection scoped per invocation
  by parsing `--project` off `process.argv`, since Playwright has no first-party per-project
  webServer scoping
- `e2e/test-env.ts` — shared `SESSION_SECRET`/`EXTERNAL_API_BASE_URL`/port resolution
- `e2e/auth.e2e.spec.ts` / `e2e/route-guard.e2e.spec.ts` — the 8 end-to-end scenarios
- `.github/workflows/ci.yml` — new `e2e` job; scoped the existing `visual` job's Playwright
  invocation to `--project visual`
- `package.json` — `test:visual` scoped to `--project visual`; added `test:e2e`

## Decisions Made

See frontmatter `key-decisions` for the full list. Most significant: `session.verifyToken(token)`
factored out so `proxy.ts` reuses the exact same JWT verification `session.verify()` uses,
adapted to `proxy.ts`'s different cookie-reading context (`NextRequest.cookies` vs.
`next/headers`'s `cookies()`) rather than reimplementing it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `verifySessionCookie` (the plan's literal function name) is not callable
   from `proxy.ts`**
- **Found during:** Task 1 (reading `src/lib/session.ts`, written in 01-11)
- **Issue:** The plan's action text says the guard "verifies it through `verifySessionCookie`,"
  but 01-11's own established deviation exports a factory-closure service (`session.create/
  verify/destroy`), not three standalone functions — `verifySessionCookie` does not exist under
  either name. More importantly, `session.verify()` internally calls `next/headers`'s `cookies()`,
  which is only usable in a Server Component/Route Handler/Server Action request scope;
  `proxy.ts` runs outside that scope and cannot call it at all, regardless of naming.
- **Fix:** Factored the actual jose `jwtVerify` + `isSessionPayload` logic out of `verify()` into
  a new `session.verifyToken(token: string | undefined)`, which takes a raw token value instead
  of reading `cookies()` itself. `verify()` is now a thin wrapper: read the cookie via
  `next/headers`, delegate to `verifyToken()`. `proxy.ts` reads the same-named cookie via
  `NextRequest.cookies` (its own available API) and calls `verifyToken()` directly — reusing the
  shared verification code instead of reimplementing jose calls.
- **Files modified:** `src/lib/session.ts`, `proxy.ts`
- **Verification:** `src/lib/session.test.ts`'s existing 11 tests still pass unchanged (full
  `pnpm test` run: 260/260 tests pass); `e2e/route-guard.e2e.spec.ts`'s tamper/expiry scenarios
  exercise `verifyToken()` end to end through `proxy.ts`.
- **Committed in:** `66596fb` (Task 1 commit)

**2. [Rule 3 - Blocking] Playwright starts every `webServer` array entry regardless of
   `--project` filtering**
- **Found during:** Task 3 (designing the second Playwright project)
- **Issue:** The plan says "Leave the `visual` project untouched" and requires
  `pnpm exec playwright test --project visual` to still exit 0 unchanged. Playwright has no
  first-party mechanism to scope a `webServer` array entry to a specific project — by default,
  running `--project e2e` would also try to start the `visual` project's `storybook-static`
  server (which doesn't exist unless `build-storybook` already ran, so the command would fail
  outright), and running `--project visual` would trigger the `e2e` project's full `pnpm build`.
- **Fix:** Added `e2e/test-env.ts` for shared env resolution, and scoped `webServer` selection in
  `playwright.config.ts` by parsing the requested project name(s) directly off `process.argv` —
  `--project visual` boots only the storybook-static server (verified: 196/196 stories pass,
  unchanged from before this plan), `--project e2e` boots only the real app (verified: 8/8
  scenarios pass), and an unfiltered run boots both.
- **Files modified:** `playwright.config.ts`, `e2e/test-env.ts`
- **Verification:** Ran both `pnpm exec playwright test --project visual` (196 passed) and
  `pnpm exec playwright test --project e2e` (8 passed) as two separate invocations.
- **Committed in:** `cebb230` (Task 3 commit)

**3. [Rule 1 - Bug] Existing `visual` CI job's Playwright command and `package.json`'s
   `test:visual` script needed scoping once a second project existed**
- **Found during:** Task 3 (writing the `e2e` CI job)
- **Issue:** `.github/workflows/ci.yml`'s existing `visual` job ran bare `pnpm exec playwright
  test` (no `--project` flag), which matched only one project before this plan. After adding
  `e2e`, the same unscoped command would now match both projects, requiring a full `next build`
  inside a job that never installs the app's build-time env vars for that purpose — a direct,
  unavoidable consequence of this plan's own change, not a pre-existing unrelated issue.
- **Fix:** Scoped the `visual` job's command to `pnpm exec playwright test --project visual`, and
  `package.json`'s `test:visual` script identically. Added a `test:e2e` script for local parity
  with the project's other named `test:*` scripts (not required by the plan, but a natural
  companion once the pattern existed).
- **Files modified:** `.github/workflows/ci.yml`, `package.json`
- **Verification:** `pnpm exec playwright test --project visual` still exits 0 (196/196).
- **Committed in:** `cebb230` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 3 - blocking, 1 Rule 1 - bug).
**Impact on plan:** All three were necessary to make the plan's own verification gates (the
guard actually callable, both Playwright projects actually runnable independently, CI actually
green) hold true. No scope creep — no feature or architectural change beyond what Task 1/2/3
already specified; deviation 3's `test:e2e` addition is the only line item beyond
strict necessity, and it mirrors an existing, already-established script-naming pattern.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None new. This worktree's own `.env.local` (throwaway `SESSION_SECRET`/`EXTERNAL_API_BASE_URL`,
not committed — `.env*.local` is gitignored) was populated per the executor's standard worktree
setup, matching the pattern already established in 01-11/01-12. The real per-Vercel-environment
`SESSION_SECRET` setup remains deferred to plan 01-15 as previously documented.

## Next Phase Readiness

- AUTH-01, AUTH-02, and AUTH-03 are now fully proven, including defence-in-depth (the
  authoritative layout check holds even with the optimistic guard disabled) and end-to-end
  browser coverage (sign-up, sign-in-with-reload, sign-out, unauthenticated/tampered/expired
  session handling, both board-list and board-detail prefix paths).
- Plan 01-14 (theme persistence) can build directly on `app/(dashboard)/layout.tsx`'s chrome and
  the session identity's `theme` field.
- Phase 2 (boards) replaces `app/(dashboard)/boards/page.tsx` and `boards/[boardId]/page.tsx`'s
  placeholder content with real board data — both routes and the guard's prefix rule already
  exist and are proven.
- **Deferred, not a blocker:** D5's real-GitHub-Actions-remote confirmation for the new `e2e` CI
  job — this worktree-isolated executor does not push to origin; the orchestrator merges and
  pushes centrally. Confirm the `e2e` job is green on the real remote after merge (same deferral
  category as 01-05-SUMMARY.md's original CI setup).

## Known Stubs

- `app/(dashboard)/boards/page.tsx` and `app/(dashboard)/boards/[boardId]/page.tsx` render static
  placeholder headings ("Board content arrives in phase 2") with no board API call — intentional
  per COVERAGE.md's explicit OPT-OUT of every board operation to Phase 2, not an oversight. Phase
  2 replaces both files' content entirely.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-12*

## Self-Check: PASSED

- FOUND (via `git ls-files`): `proxy.ts`, `src/lib/routes.ts`, `app/(dashboard)/layout.tsx`,
  `app/(dashboard)/boards/page.tsx`, `app/(dashboard)/boards/[boardId]/page.tsx`,
  `src/features/auth/components/sign-out-button.tsx`, `e2e/test-env.ts`, `e2e/auth.e2e.spec.ts`,
  `e2e/route-guard.e2e.spec.ts`.
- FOUND (via `git log --oneline --all`): commits `66596fb`, `9891a85`, `cebb230`.
