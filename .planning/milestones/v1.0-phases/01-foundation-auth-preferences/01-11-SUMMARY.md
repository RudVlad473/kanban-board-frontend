---
phase: 01-foundation-auth-preferences
plan: 11
subsystem: auth
tags: [jose, zod, jwt, nextjs, route-handlers, bff, cookies]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (plans 01-01 through 01-10)
    provides: Next.js scaffold, design token pipeline, primitives library, test harness, CI,
      committed OpenAPI contract, server-only externalApi client, MSW mock backend
provides:
  - Session-service singleton (src/lib/session.ts) — session.create/verify/destroy over a signed
    httpOnly/Secure/SameSite=lax jose JWT cookie, one fresh value per create, null-not-throw on
    every failure mode
  - Authoritative identity check (src/lib/dal.ts's verifySession(), React-cache-wrapped)
  - Shared Zod schemas (src/lib/validation/auth-schemas.ts) for sign-up/sign-in field validation
  - Three BFF Route Handlers (POST /api/auth/signup, /signin, /signout) — validate, forward
    through externalApi, issue/clear the session cookie, indistinguishable sign-in failures
affects: [01-12 (auth forms — consumes signUpSchema/signInSchema and these endpoints), 01-13
  (route guard — consumes verifySession as the authoritative check), 01-14 (theme persistence —
  consumes the session identity)]

# Actuals (#2632)
actuals:
  tokens: 8634
  tasks: 3
  commits: 3

tech-stack:
  added: [jose@6.2.8, zod@4.4.3]
  patterns:
    - "Session-service factory (createSessionService) returning create/verify/destroy closures,
      instantiated once as a module-scope singleton — chosen over three standalone exported
      functions or a class, per explicit user direction on Task 2's export shape"
    - "server-only stubbed via a Vitest alias (src/test-utils/server-only-stub.ts) so modules
      starting with import \"server-only\" can be unit-tested — the real package throws
      unconditionally outside Next.js's own webpack build"
    - "next/headers's cookies() mocked with an in-memory Map-backed jar in tests, since no real
      Next.js request scope exists outside an actual render/Route Handler invocation"
    - "Widen an openapi-fetch response field through `unknown` when the generated type's claim
      (data: never / error: always undefined) contradicts documented runtime behavior, established
      in 01-10 and reused here for both the signin identity payload and both routes' error field"

key-files:
  created:
    - src/lib/session.ts
    - src/lib/session.test.ts
    - src/lib/dal.ts
    - src/lib/validation/auth-schemas.ts
    - app/api/auth/signup/route.ts
    - app/api/auth/signin/route.ts
    - app/api/auth/signout/route.ts
    - app/api/auth/routes.test.ts
    - src/test-utils/server-only-stub.ts
  modified:
    - .env.example
    - package.json
    - pnpm-lock.yaml
    - vitest.config.ts

key-decisions:
  - "Task 1 checkpoint resolved before this execution (user pre-approval): jose, not iron-session
    — explicit control over JWT claims/expiry via setJti() closes the session-fixation vector
    deterministically (see below), matching RESEARCH.md's option table."
  - "Task 2 export-shape deviation (user-directed, not the plan's literal text): session.ts
    exports a factory function createSessionService(secret) plus a module-scope singleton
    session = createSessionService(secret), instantiated once. Consumers call session.create(...),
    session.verify(), session.destroy() instead of three standalone named exports
    (createSession/verifySessionCookie/deleteSession). All of Task 2's original behavioral
    acceptance criteria (server-only, no SESSION_SECRET fallback, all three cookie flags, fresh
    value per create, null-not-throw) still apply unchanged — only the export shape changed. Every
    consumer in this plan (dal.ts, all three Route Handlers) and the test file were written
    against this shape from the start."
  - "session.verify() takes no argument and reads the session cookie itself (rather than the
    plan's literal verifySessionCookie(value) taking a pre-read value) — a natural consequence of
    the factory-closure shape: cookies() is captured once per service instance, not threaded
    through every call site."
  - "New-account sessions (signup) default to theme LIGHT, matching src/lib/mocks/store.ts's
    createUser() default — POST /signup's response is a bare id string, not the full identity
    shape, so there is no theme value to read from upstream for a session created immediately
    after signup without a second /signin round-trip."
  - "Sign-up's generic failure status is fixed at 409 regardless of upstream cause (duplicate
    email vs. unknown failure) — deliberately not forwarding the upstream response's actual
    status, so this BFF boundary's behavior can never depend on (or leak) which specific cause
    the upstream returned."
  - "SignJWT calls .setJti(randomUUID()) in addition to .setIssuedAt()/.setExpirationTime() —
    without a random claim, two create() calls landing in the same wall-clock second would
    produce a byte-identical token (iat/exp are both whole-second granularity), silently failing
    the session-fixation freshness guarantee. Found and fixed before it could reach a flaky test."

patterns-established:
  - "Route Handler validation order: parse+validate with the shared Zod schema BEFORE any upstream
    call, so a request that never touched the client-side form still can't reach externalApi with
    an invalid body — verified by counting MSW's request:match events before/after."
  - "Wrong-password and unknown-email sign-in failures return one fixed status (401) and message
    at this BFF's boundary, never forwarding the upstream's own per-cause status/body, so
    indistinguishability holds even if the upstream API's behavior later changes."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

coverage:
  - id: D1
    description: "session.ts: session-service factory issuing a signed httpOnly/Secure/SameSite=lax
      jose JWT cookie, one fresh value per create (session-fixation closed via a random jti),
      null-not-throw on tamper/expiry/malformed/absent"
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "src/lib/session.test.ts (11 tests: fresh-value-not-readable, cookie flags in both
          production and development branches, round-trip verify, tamper, expiry, malformed,
          absent, two-create freshness, delete-then-verify)"
        status: pass
    human_judgment: false
  - id: D2
    description: "dal.ts: verifySession(), the authoritative React-cache-wrapped identity check"
    requirement: "AUTH-03"
    verification:
      - kind: integration
        ref: "app/api/auth/routes.test.ts (verifySession() exercised after signup/signin/signout)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Shared Zod schemas (signUpSchema/signInSchema) matching 01-UI-SPEC.md's exact
      Copywriting Contract; zodErrorToFieldErrors maps failures to per-field messages"
    requirement: "AUTH-01"
    verification:
      - kind: integration
        ref: "app/api/auth/routes.test.ts (missing-field and schema-invalid-body cases)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Three BFF Route Handlers: signup/signin create a session on success; signin's
      wrong-password and unknown-email failures are byte-identical; signout clears the session;
      no handler ever includes the submitted password in any response body"
    requirement: "AUTH-01"
    verification:
      - kind: integration
        ref: "app/api/auth/routes.test.ts (9 tests covering all 8 specified behaviours plus a
          password-leakage scan across every success/failure response)"
        status: pass
      - kind: other
        ref: "pnpm build (next build succeeds; all three routes compile as dynamic server routes)"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-08-12
status: complete
---

# Phase 01 Plan 11: Auth Boundary — Session, DAL & BFF Route Handlers Summary

**Signed httpOnly/Secure/SameSite jose-JWT session cookie behind a factory-closure service
(session.create/verify/destroy), an authoritative React-cache DAL check, and three BFF Route
Handlers (signup/signin/signout) that validate with Zod before ever touching the mocked upstream.**

## Performance

- **Duration:** ~40 min
- **Started:** ~2026-08-12T13:10Z (context-loading + research reading, before first commit)
- **Completed:** 2026-08-12T13:49:42Z (last commit)
- **Tasks:** 3 (Task 1 checkpoint decision pre-resolved; Task 2 and Task 3 executed)
- **Files modified:** 13

## Accomplishments

- `src/lib/session.ts` exports `createSessionService(secret)` and the singleton `session` built
  from it — `session.create(payload)`/`session.verify()`/`session.destroy()` — signing a jose
  HS256 JWT into an httpOnly/Secure/SameSite=lax cookie, with a random `jti` closing the
  session-fixation vector deterministically (not just relying on second-granularity timestamps).
- `src/lib/dal.ts` exposes `verifySession()`, the authoritative identity check, wrapped in React's
  `cache()`.
- `src/lib/validation/auth-schemas.ts` exports `signUpSchema`/`signInSchema` using 01-UI-SPEC.md's
  exact Copywriting Contract strings, plus `zodErrorToFieldErrors()` for per-field 400 responses.
- Three Route Handlers under `app/api/auth/` validate before ever calling upstream, forward
  through `externalApi`, and issue/clear the session cookie — sign-in's wrong-password and
  unknown-email failures are proven byte-identical by direct comparison in the test.
- Discovered and fixed a real bug in the session module's own test: flipping a JWT's very last
  base64url character can be a no-op on the actual signature bytes (HS256's 32-byte signature
  encodes to 43 characters, so the last character's low 2 bits are unread padding) — the tamper
  test now mutates the payload segment instead, which always changes the signed content.

## Task Commits

1. **Task 1: Session library selection** — pre-resolved by the user before this execution (jose).
   No commit of its own; recorded here per the objective's instruction.
2. **Task 2: Session module and Data Access Layer** — `02f9bfe` (feat)
3. **Task 3: BFF sign-up, sign-in and sign-out Route Handlers** — `e725876` (feat)
4. **Fix: tamper-test flakiness found via 5x repeated local runs** — `cf18861` (fix)

**Plan metadata:** commit created at end of this execution (see final commit list returned to
orchestrator).

## Files Created/Modified

- `src/lib/session.ts` — session-service factory + singleton; `import "server-only"` first; no
  `SESSION_SECRET` fallback (fails fast at module load)
- `src/lib/session.test.ts` — 11 behaviour tests via `createSessionService()` + a mocked
  `next/headers` cookie jar
- `src/lib/dal.ts` — `verifySession()`, `React.cache`-wrapped
- `src/lib/validation/auth-schemas.ts` — `signUpSchema`, `signInSchema`, `zodErrorToFieldErrors`
- `app/api/auth/signup/route.ts` — validates, forwards to `externalApi`, creates a session from
  the request body + the bare returned id (theme defaults to `LIGHT`)
- `app/api/auth/signin/route.ts` — validates, forwards to `externalApi`, creates a session from
  the full identity shape; one fixed 401 + generic copy for any failure cause
- `app/api/auth/signout/route.ts` — clears the session cookie, no upstream call
- `app/api/auth/routes.test.ts` — 9 tests against the real MSW node server
- `src/test-utils/server-only-stub.ts` — empty module the `server-only` package specifier is
  aliased to in the `node` Vitest project (the real package throws unconditionally outside
  Next.js's own webpack build)
- `.env.example` — documents `SESSION_SECRET` and its generation command
- `package.json`/`pnpm-lock.yaml` — added `jose@6.2.8` and `zod@4.4.3` (installed together in one
  `pnpm add --save-exact` call; Task 3 needed no further `package.json` diff)
- `vitest.config.ts` — `node` project now also covers `src/lib/session.test.ts` and
  `app/api/auth/**/*.test.ts`; added `SESSION_SECRET` to its `env` block; aliased `server-only`

## Decisions Made

See frontmatter `key-decisions` for the full list. Most significant: the user-directed Task 2
export-shape change (factory + singleton instead of three standalone functions), and the
`setJti()` addition to guarantee freshness regardless of timestamp granularity.

## Deviations from Plan

### User-directed (not auto-fixed — explicit instruction from the objective)

**1. Task 1 checkpoint pre-resolved: jose**
- Recorded, not re-prompted, per the objective's explicit instruction. jose was chosen over
  iron-session; RESEARCH.md's own comparison table (explicit claim/expiry control vs. less
  boilerplate) applies — see `key-decisions`.

**2. Task 2 export shape: factory + singleton instead of three standalone functions**
- The plan's literal text specifies `session.ts` exporting `createSession`, `verifySessionCookie`,
  `deleteSession` as three independent functions. Per the objective's explicit instruction, this
  plan instead exports `createSessionService(secret)` (a factory returning `{create, verify,
  destroy}` closures) plus a singleton `session` built from it at module scope. Every consumer in
  this plan (`dal.ts`, all three Route Handlers) and the test file were written against this
  shape from the start — no rework needed. All of Task 2's original behavioral acceptance criteria
  (server-only, no `SESSION_SECRET` fallback, all three cookie flags, fresh value per create,
  null-not-throw) hold unchanged.

### Auto-fixed Issues

**3. [Rule 3 - Blocking] `server-only` throws unconditionally outside Next.js's webpack build**
- **Found during:** Task 2 (first test run)
- **Issue:** `server-only@0.0.1`'s real package body is `throw new Error(...)` unconditionally —
  Next.js's own webpack config aliases it away at build time; Vitest's Node environment has no
  such build step, so any test importing a module starting with `import "server-only"`
  (session.ts, dal.ts, the three Route Handlers) crashed on import.
- **Fix:** Added `src/test-utils/server-only-stub.ts` (an empty module) and aliased the
  `server-only` specifier to it in `vitest.config.ts`'s `node` project only.
- **Files modified:** `src/test-utils/server-only-stub.ts`, `vitest.config.ts`
- **Verification:** `src/lib/session.test.ts` and `app/api/auth/routes.test.ts` both import
  `server-only`-gated modules and run cleanly.
- **Committed in:** `02f9bfe` (Task 2 commit)

**4. [Rule 1 - Bug] React's `cache()` from `next/headers`/`react` requires a mocked request scope**
- **Found during:** Task 2 (writing `session.test.ts`)
- **Issue:** `session.ts`'s `create`/`verify`/`destroy` all call Next.js's `cookies()`, which
  throws outside a real Route Handler/Server Component render — no such scope exists in a plain
  Vitest test.
- **Fix:** Mocked `next/headers` with an in-memory `Map`-backed cookie jar whose `.set()` options
  are the same values Next.js would serialise onto the real `Set-Cookie` header, satisfying the
  plan's "a test reads the Set-Cookie header" requirement functionally.
- **Files modified:** `src/lib/session.test.ts`, `app/api/auth/routes.test.ts`
- **Verification:** All cookie-flag and lifecycle assertions pass against the mocked jar.

**5. [Rule 1 - Bug] `openapi-fetch`'s `createClient()` fetch snapshot ordering (same class of bug
   as 01-10-SUMMARY.md's deviation #3)**
- **Found during:** Task 3 (first `routes.test.ts` run — `ECONNREFUSED`)
- **Issue:** `src/lib/api/server-client.ts`'s module-scope `externalApi = createClient(...)`
  snapshots `globalThis.fetch` at the moment that module is first evaluated. The Route Handlers
  under test import it transitively via a top-level dynamic `import()`, which ran before
  `beforeAll`'s `server.listen()` had patched `globalThis.fetch`.
- **Fix:** Moved `server.listen({ onUnhandledRequest: "error" })` to run synchronously before the
  dynamic imports, not inside `beforeAll`.
- **Files modified:** `app/api/auth/routes.test.ts`
- **Verification:** All 9 tests pass; no `ECONNREFUSED` errors.

**6. [Rule 1 - Bug] Tautological cookie-flag assertion; then a genuine tamper-test flake**
- **Found during:** Task 3 (writing the analogous cookie-flag test), then again post-lint-staged
  (5x repeated local runs)
- **Issue:** The cookie-flag test originally asserted `secure: process.env.NODE_ENV !==
  "development"` — the same expression `session.ts` itself uses, proving nothing about the actual
  flag value under real conditions. Separately, the tamper test flipped the JWT's last character,
  which occasionally left verification passing (see Accomplishments).
- **Fix:** Both `session.test.ts` and `routes.test.ts` now use `vi.stubEnv("NODE_ENV", ...)` to
  force each branch explicitly and assert the literal `true`/`false` value; the tamper test now
  mutates the payload segment instead of the last character.
- **Files modified:** `src/lib/session.test.ts`, `app/api/auth/routes.test.ts`
- **Verification:** Ran the full session test file 5 times consecutively with no flakiness.
- **Committed in:** `e725876` (cookie-flag fix), `cf18861` (tamper-test fix)

**7. [Rule 1 - Bug] `zod`'s `.email()` chain method is deprecated in v4; `.pipe()` needed to avoid
   double error messages**
- **Found during:** Task 3 (`pnpm lint`)
- **Issue:** ESLint's `@typescript-eslint/no-deprecated` flagged `z.string().email(msg)` — v4
  prefers the top-level `z.email()`. A naive `.min(1, required).pipe(z.email(format))` swap risked
  emitting both the required AND format messages for an empty string if not piped correctly.
- **Fix:** Used `.pipe()` specifically (verified via a scratch script: an empty string produces
  only the `min(1)` issue, since `.pipe()` short-circuits on the left schema's failure).
- **Files modified:** `src/lib/validation/auth-schemas.ts`
- **Verification:** `routes.test.ts`'s missing-field/blank-email tests assert exactly the required
  message, not the format message.

**8. [Rule 3 - Blocking] `openapi-fetch`'s generated types wrongly claim `error` is always
   `undefined` for signup/signin (no declared error-response schema)**
- **Found during:** Task 3 (`pnpm lint` — `no-unnecessary-condition`)
- **Issue:** Neither operation's OpenAPI spec declares an error response, so the generated type
  narrows `error` to `undefined` — untrue at runtime (the mock returns 401/409 bodies).
- **Fix:** Widened `error` through `unknown` before comparing, mirroring the existing `data`
  widening pattern already established in 01-10 for the same contract gap.
- **Files modified:** `app/api/auth/signin/route.ts`, `app/api/auth/signup/route.ts`
- **Verification:** `pnpm lint` and `pnpm exec tsc --noEmit` both exit 0.

---

**Total deviations:** 2 user-directed (Task 1/Task 2 export shape, both explicitly instructed) +
6 auto-fixed (5 Rule 1 - bug, 1 Rule 3 - blocking).
**Impact on plan:** All auto-fixes were necessary to make the plan's own verification gates
(tests actually running, lint passing, no flaky assertions) hold true. No scope creep — no
feature or architectural change beyond what Task 2/3 already specified.

## Issues Encountered

**Static grep verify has one unavoidable false positive.** Task 3's `<verify>` block includes
`! grep -rnE '\bpassword\b' app/api/auth/*/route.ts | grep -viE 'signUpSchema|signInSchema|
body\.password|password:'`. This flags `INVALID_CREDENTIALS_MESSAGE = "Invalid email or
password."` in `signin/route.ts` — the literal, required UI-SPEC copy string — because the word
"password" appears in a user-facing message, not because the submitted password value is echoed
anywhere. The actual guarantee this check is a coarse proxy for ("no response body ever contains
the submitted password") is proven directly and far more strongly by
`app/api/auth/routes.test.ts`'s "password leakage" test, which scans the real response bodies of
every success/failure path for the actual submitted password value. Changing the required UI copy
to dodge the grep pattern would violate 01-UI-SPEC.md's Copywriting Contract, so this one line is
accepted as a known, justified static-analysis limitation rather than "fixed."

## User Setup Required

**`SESSION_SECRET` must be generated and set locally and per Vercel environment** (plan
frontmatter's `user_setup`). Generate with `openssl rand -base64 32`, place in `.env.local`
(documented in `.env.example`), never commit a real value. For CI/test runs, `vitest.config.ts`'s
`node` project already supplies a test-only fallback (`test-only-session-secret-not-for-
production`) so `pnpm test` works without a real secret set; `pnpm build`/`pnpm dev` still require
a real `SESSION_SECRET` in the environment, same pattern as `EXTERNAL_API_BASE_URL` from 01-10.
Setting this per Vercel environment (Preview/Production) is deferred to plan 01-15 per the plan's
own `user_setup` note.

## Next Phase Readiness

- The auth boundary is fully in place: a signed, fresh, correctly-flagged session cookie; an
  authoritative DAL check; and three working BFF Route Handlers proven against the real MSW mock.
  Plan 01-12 (auth forms) can build directly against `signUpSchema`/`signInSchema` and these three
  endpoints; plan 01-13 (route guard) can build against `verifySession()`; plan 01-14 (theme
  persistence) can build against the session identity's `theme` field.
- No blockers. One flagged item carried forward: the static grep false positive documented above
  under Issues Encountered — informational only, the real guarantee is proven by a passing test.

## Known Stubs

None — every handler is fully wired to the session module and the real (mocked) upstream; no
hardcoded empty/placeholder responses ship as part of this plan's scope.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-12*

## Self-Check: PASSED

- FOUND: src/lib/session.ts, src/lib/session.test.ts, src/lib/dal.ts,
  src/lib/validation/auth-schemas.ts, app/api/auth/signup/route.ts, app/api/auth/signin/route.ts,
  app/api/auth/signout/route.ts, app/api/auth/routes.test.ts, src/test-utils/server-only-stub.ts
  (confirmed via `git ls-files` — tracked and committed)
- FOUND: commits `02f9bfe`, `e725876`, `cf18861` (confirmed via `git log --oneline --all`)
