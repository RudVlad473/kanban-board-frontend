---
phase: 01-foundation-auth-preferences
plan: 32
subsystem: auth
tags: [session-bridging, jsessionid, openapi-fetch-middleware, real-backend]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences
    provides: no-mock-server real-backend integration and problem-detail parsing (plan 01-30)
provides:
  - "SessionRecord (src/lib/session.ts) — the identity plus the backend's own JSESSIONID credential, carried inside the existing signed session cookie with no new server-side store"
  - "A single, general externalApi request/response middleware (src/lib/api/server-client.ts) that authenticates every outbound call for a signed-in user and forces a full sign-out on upstream session expiry"
  - "src/lib/api/session-cookie.ts — extracting the upstream credential from a raw Set-Cookie response and building the Cookie request header"
  - "The permanent proof (src/lib/api/server-client.integration.test.ts) that the bridge authenticates a real call against the real backend"
affects: [01-33, 01-14, phase-2-board-management]

# Actuals (#2632)
actuals:
  tokens: 8500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "openapi-fetch's externalApi.use({ onRequest, onResponse }) as the one general session-bridging mechanism — every present and future caller of externalApi is authenticated and monitored by this single module-scope registration, not an auth-specific special case"
    - "onResponse checks request.headers.has('Cookie') before treating a 401 as an expired session — an anonymous call made with no bridged credential in the first place is expected to 401 and must not trigger a forced sign-out"

key-files:
  created:
    - src/lib/api/session-cookie.ts
    - src/lib/api/session-cookie.unit.test.ts
    - src/lib/api/server-client.integration.test.ts
  modified:
    - src/lib/session.ts
    - src/lib/session.test.ts
    - src/lib/dal.ts
    - src/lib/api/server-client.ts
    - app/api/auth/signin/route.ts
    - app/api/auth/signup/route.ts
    - vitest.config.ts
    - e2e/route-guard.e2e.spec.ts
    - .planning/phases/01-foundation-auth-preferences/deferred-items.md

key-decisions:
  - "SessionRecord (identity + jsessionId) added beside the untouched SessionPayload/isSessionPayload, per the plan's assumption-delta decision — folding the credential into SessionPayload would have broken its second caller (a raw upstream response body, which never carries a credential)"
  - "The forced sign-out only fires when the refused request itself carried a bridged Cookie header (request.headers.has('Cookie')) — matches the plan's own qualifier ('on a call made with a bridged credential') and keeps sign-in/sign-up's own BAD_CREDENTIALS refusal and an anonymous visitor's ordinary 401 from ever reaching session.destroy()"
  - "vitest.config.ts's 'unit' (jsdom) project now uses the same server-only alias stub as the 'node' project — the stub file's own comment already claimed this was true project-wide; it wasn't, and session-cookie.unit.test.ts needed it to import a server-only module"

patterns-established:
  - "A raw Response's Set-Cookie is always read via headers.getSetCookie() (the array form), never headers.get() — an Expires attribute's own comma would corrupt a naive comma-split read"

requirements-completed: [AUTH-02, AUTH-03, THEME-01]

coverage:
  - id: D1
    description: "A session token carries the backend's own JSESSIONID credential; a token with the identity but no credential fails verification and returns null without throwing"
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "src/lib/session.test.ts — 'returns the identity and the upstream credential it was created for on verification', 'returns null and does not throw for a token carrying the identity but no upstream credential'"
        status: pass
    human_judgment: false
  - id: D2
    description: "extractUpstreamSessionId/toUpstreamCookieHeader correctly read and build the JSESSIONID Set-Cookie/Cookie header pair, including a value whose own Expires attribute contains a comma"
    verification:
      - kind: unit
        ref: "src/lib/api/session-cookie.unit.test.ts (7 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every outbound externalApi call for a signed-in user is authenticated by one request middleware, and the same call is refused without a bridged credential and accepted with one — proven against the live backend"
    requirement: "AUTH-02"
    verification:
      - kind: integration
        ref: "src/lib/api/server-client.integration.test.ts — 'bridges a signed-in user's session to an authenticated upstream call, and refuses the same call without one' (against https://kanban-board-rud-vlad-473-nonprod.duckdns.org)"
        status: pass
      - kind: e2e
        ref: "pnpm exec playwright test --project e2e — 8/8 passed, including AUTH-01/AUTH-02/AUTH-03 scenarios exercising the bridged theme/board calls in a real browser session"
        status: pass
    human_judgment: false
  - id: D4
    description: "Sign-in and sign-up requests are never sent carrying a stale bridged credential, even when a session already exists"
    requirement: "AUTH-02"
    verification:
      - kind: other
        ref: "src/lib/api/server-client.ts's UNAUTHENTICATED_SCHEMA_PATHS skip, unit-proven indirectly by the wrong-password test asserting no Cookie-triggered sign-out fires for /signin's own refusal"
        status: pass
    human_judgment: false
  - id: D5
    description: "An upstream 401 UNAUTHENTICATED on an already-bridged call clears this app's session and redirects to sign-in; a wrong-password BAD_CREDENTIALS refusal does neither"
    requirement: "AUTH-03"
    verification:
      - kind: integration
        ref: "src/lib/api/server-client.integration.test.ts — 'clears this app's session when a bridged call is refused as unauthenticated', 'does not clear the session on a genuinely failed sign-in (wrong password)'"
        status: pass
    human_judgment: false
  - id: D6
    description: "Both auth mint sites (signin/signup) refuse to create a session when the upstream success response carried no credential"
    requirement: "AUTH-02"
    verification:
      - kind: manual_procedural
        ref: "Code inspection of app/api/auth/{signin,signup}/route.ts's jsessionId-required branch — no dedicated automated test exercises the Route Handler's own no-credential failure path (the Route Handlers become Server Actions in plan 01-33, which is the named place for that coverage, per plan 01-30's precedent)"
        status: pass
    human_judgment: true
    rationale: "Verified by direct code review (extractUpstreamSessionId(response) result gates the isSessionPayload branch identically to the upstream-error branch in both route.ts files), not by a committed automated test against a real backend response with no credential — such a response cannot currently be produced against the live backend (it always sets JSESSIONID on 201/200), so the branch is defensive code proven by inspection rather than by exercising a real failure case."

duration: ~25min
completed: 2026-08-18
status: complete
---

# Phase 01 Plan 32: Bridge session to the real backend's JSESSIONID cookie Summary

**Every outbound call to the real backend is now authenticated by attaching the backend's own JSESSIONID credential (carried inside this app's existing signed session cookie), and an upstream session expiry forces a full sign-out instead of leaving the UI looking signed in while every call silently fails.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-18T21:05:00Z (approx.)
- **Completed:** 2026-08-18T21:27:01Z
- **Tasks:** 2
- **Files modified:** 12 (3 created, 9 modified, across 2 task commits)

## Accomplishments

- Settled research Assumption A1 directly against live nonprod before building anything on it: `response.headers.getSetCookie()` does surface the real backend's `Set-Cookie: JSESSIONID=...` through Next.js's server-side `fetch` unmodified.
- Added `SessionRecord`/`isSessionRecord` beside the byte-for-byte-unchanged `SessionPayload`/`isSessionPayload` in `src/lib/session.ts`, and threaded the credential through `create`/`verify`/`verifyToken`/`verifySession` (`dal.ts`).
- Added `src/lib/api/session-cookie.ts` — the one place that reads the upstream credential out of a `Set-Cookie` response and builds the `Cookie` request header back, using the array-returning `getSetCookie()` (never the comma-joined single-string form, which an `Expires` attribute's own comma would corrupt).
- Registered a single, general `externalApi.use({ onRequest, onResponse })` in `src/lib/api/server-client.ts`: `onRequest` attaches the bridged credential to every outbound call except sign-in/sign-up; `onResponse` forces a full sign-out (session cleared, redirected to sign-in) on an upstream 401 whose request actually carried a bridged credential, while a wrong-password `BAD_CREDENTIALS` refusal or an anonymous visitor's ordinary 401 is left untouched.
- Both mint sites (`app/api/auth/{signin,signup}/route.ts`) now capture the raw upstream `Response`, extract its credential, and refuse to create a session when a success response carried none.
- `server-client.integration.test.ts` is the permanent proof: it creates a real account, proves the identical authenticated read is refused (401 `UNAUTHENTICATED`) before the session exists and succeeds after it's stored, proves a bad credential clears the session, and proves a wrong password does not — all against the live nonprod backend, no mocks.
- Recorded the one gap this mechanism does not yet cover — a Server Component cannot clear a cookie mid-render — in `deferred-items.md`, naming Phase 2 as the owner.

## Task Commits

Each task was committed atomically:

1. **Task 1: One authenticated round trip against the real backend** - `eaf5b6e` (feat)
2. **Task 2: Sign the user out when the backend's session has expired** - `e70cad8` (feat)

**Plan metadata:** this commit (SUMMARY.md; STATE.md/ROADMAP.md are the orchestrator's to update after this worktree merges, per this plan's worktree-parallel execution mode)

## Files Created/Modified

- `src/lib/api/session-cookie.ts` - reads the upstream `JSESSIONID` out of a `Set-Cookie` response, builds the `Cookie` request header
- `src/lib/api/session-cookie.unit.test.ts` - 7 tests: single/multiple pairs, a comma-containing `Expires` value, no match
- `src/lib/session.ts` - additive `SessionRecord`/`isSessionRecord`; `create`/`verify`/`verifyToken` now work over the record type
- `src/lib/session.test.ts` - extended for the new verify-with/without-credential behaviours
- `src/lib/dal.ts` - `verifySession`'s return type follows `session.ts`
- `src/lib/api/server-client.ts` - the single `onRequest`/`onResponse` middleware registration
- `src/lib/api/server-client.integration.test.ts` - the permanent live-backend proof (3 tests)
- `app/api/auth/signin/route.ts`, `app/api/auth/signup/route.ts` - capture the raw response, extract the credential, refuse a credential-less session
- `vitest.config.ts` - `node` project gains `src/**/*.integration.test.ts`; `unit` project gains the `server-only` alias stub
- `e2e/route-guard.e2e.spec.ts` - forged expired-session payload now carries `jsessionId`
- `.planning/phases/01-foundation-auth-preferences/deferred-items.md` - records the Server Component cookie-write gap for Phase 2

## Decisions Made

- `SessionRecord` sits beside `SessionPayload`, not folded into it — see this plan's own assumption-delta decision; `isSessionPayload`'s second caller (a raw upstream response body) never carries a credential.
- The forced sign-out only fires on a refusal whose own request carried a bridged `Cookie` header — this reads directly from the plan's stated behaviour ("on a call made with a bridged credential") and is what keeps `/signin`'s own `BAD_CREDENTIALS` refusal (which never carries a bridged credential, since sign-in/sign-up are skipped from credential attachment) and an anonymous visitor's ordinary 401 from ever reaching `session.destroy()`.
- Fixed `vitest.config.ts`'s `unit` project to actually use the `server-only` alias stub — the stub file's own long-standing comment claimed it applied "for every test project," which was not true of the `unit`/`browser`/`storybook` projects; only `unit` needed the fix for this plan's `session-cookie.unit.test.ts` to import a `server-only` module.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `vitest.config.ts`'s `unit` project was missing the `server-only` alias stub its own documentation claimed it had**
- **Found during:** Task 1, writing `session-cookie.unit.test.ts`
- **Issue:** The plan calls for `session-cookie.unit.test.ts` to live in the jsdom `unit` Vitest project. `session-cookie.ts` (the module under test) starts with `import "server-only"`, which throws unconditionally when loaded outside Next.js's own webpack build. `src/test-utils/server-only-stub.ts`'s own doc comment states the stub "applies for every test project," but the `unit` project's `resolve.alias` was actually just the plain `alias` array (no `server-only` alias) — only the `node` project had it. Importing `session-cookie.ts` from the `unit` project would have crashed on import.
- **Fix:** Changed the `unit` project's `resolve` to `{ alias: aliasWithServerOnlyStub }`, matching the stub file's own documented intent (and the `node` project's existing pattern).
- **Files modified:** `vitest.config.ts`
- **Verification:** `pnpm vitest run --project unit --project node` — 79/79 pass, including `session-cookie.unit.test.ts`'s 7 tests.
- **Committed in:** `eaf5b6e` (Task 1 commit)

**2. [Rule 1 - Bug] Task 2's `onResponse` middleware initially broke Task 1's own "refused before session exists" integration test**
- **Found during:** Task 2, first `pnpm vitest run --project unit --project node` after adding the `onResponse` half
- **Issue:** The first `onResponse` implementation redirected on *any* 401, including the anonymous "no session exists yet" read Task 1's own test performs deliberately (to prove the call genuinely needs auth). `redirect()` throws unconditionally, so that call started rejecting instead of returning `{ error, response }`, breaking Task 1's assertion that inspects `refusedResult.response.status`/`refusedProblem?.code` directly.
- **Fix:** Gated the forced-sign-out branch on `request.headers.has("Cookie")` — matches the plan's own stated behaviour ("on a call made with a bridged credential") and correctly distinguishes "a call that had a credential and got refused" (expired session, should sign out) from "a call that never had a credential" (an anonymous read, or sign-in/sign-up's own refusal — should not sign out). This also makes the mechanism more correct, not just compatible: an anonymous visitor probing a protected endpoint should never trigger a session-clearing redirect.
- **Files modified:** `src/lib/api/server-client.ts`
- **Verification:** `pnpm vitest run --project unit --project node` — 79/79 pass (Task 1's original test unchanged and passing, plus Task 2's two new tests). `pnpm exec playwright test --project e2e` — 8/8 pass.
- **Committed in:** `e70cad8` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — correctness bugs found and fixed during this plan's own verification loop, not scope creep).
**Impact on plan:** Both fixes were necessary for the plan's own stated behaviour and verify gates to pass honestly. No scope creep — both stayed within this plan's `files_modified` list.

## Issues Encountered

None beyond what's captured above as deviations.

## User Setup Required

None - no external service configuration required. Local `pnpm build`/`pnpm exec tsc --noEmit` still need `SESSION_SECRET`/`EXTERNAL_API_BASE_URL` set (the pre-existing gap `STATE.md` already tracks, unrelated to this plan) — this plan's own verification set them temporarily in the shell environment to confirm a clean build, matching what CI's `quality`/`e2e` jobs already do.

## Next Phase Readiness

- Plan 01-33 (Route Handler → Server Actions migration) inherits session bridging already wired: both mint sites already capture and store the credential, so 01-33 only needs to change the delivery mechanism (`Response.json` → `useActionState`-compatible return value, `redirect()` on success), not the credential logic itself.
- Plan 01-14 (theme persistence) can call `externalApi` directly for `GET`/`PUT /users/me/theme` — the credential is attached automatically by this plan's `onRequest` middleware, with no theme-specific plumbing needed.
- Phase 2 (board management) is the named owner of the one recorded gap: the forced sign-out's `session.destroy()`/`redirect()` only work from a Server Action or Route Handler context. The moment Phase 2 adds a Server Component reading board data through `externalApi`, that Server Component needs its own redirect-to-a-clearing-route pattern rather than the in-render mutation this plan uses (`deferred-items.md`, item 5).
- The orchestrator still needs to merge this worktree branch, push to `origin/master`, and confirm CI is green — not done here (this plan ran as a worktree-isolated parallel agent; STATE.md/ROADMAP.md updates and push/merge are the orchestrator's responsibility after all wave agents complete).

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-18*

## Self-Check: PASSED

All created files verified present (`src/lib/api/session-cookie.ts`, `src/lib/api/session-cookie.unit.test.ts`,
`src/lib/api/server-client.integration.test.ts`, this SUMMARY.md). Both task commit hashes
(`eaf5b6e`, `e70cad8`) verified present in `git log --oneline --all`.
