---
phase: 01-foundation-auth-preferences
plan: 30
subsystem: auth
tags: [msw-removal, openapi, playwright-e2e, real-backend, testing-trophy]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences
    provides: BFF sign-up/sign-in Route Handlers, session module, auth forms and their component tests (plans 01-10..01-13)
provides:
  - A mock-free repository — no in-process fake HTTP layer remains anywhere; every test layer and local development dial the deployed nonprod backend
  - A regenerated OpenAPI contract (docs/api/kanban-board-openapi.json) matching the live backend, with a neutral servers entry
  - src/lib/api/problem-detail.ts — a hand-authored, runtime-guarded type for the backend's problem-response shape and named error codes, since the contract still declares none
  - Sign-up that stores the identity the real backend returns (id/email/displayName/theme), not one assembled from the submitted form
  - e2e/fixtures.ts — per-test throwaway account creation against the real backend, replacing the deleted seeded demo account
affects: [01-31, 01-32, 01-33, 01-34, 01-35]

# Actuals (#2632)
actuals:
  tokens: 43025
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - "Component tests stub the auth-api module boundary (vi.mock('@/features/auth/api/auth-api')) instead of intercepting the network — the same seam plan 01-33's Server Actions rewrite will re-point"
    - "e2e specs mint a throwaway fixture account per test (e2e/fixtures.ts) rather than sharing one seeded account, because the real backend caps concurrent sessions per account at 2"

key-files:
  created:
    - src/test-utils/api-base-url.ts
    - src/lib/api/problem-detail.ts
    - src/lib/api/problem-detail.unit.test.ts
    - e2e/fixtures.ts
  modified:
    - app/api/auth/signup/route.ts
    - app/api/auth/signin/route.ts (comment only)
    - docs/api/kanban-board-openapi.json
    - src/lib/api/generated-types.ts
    - vitest.config.ts
    - e2e/test-env.ts
    - e2e/auth.e2e.spec.ts
    - e2e/route-guard.e2e.spec.ts
    - .github/workflows/ci.yml
    - src/features/auth/components/sign-in-form.test.tsx
    - src/features/auth/components/sign-up-form.test.tsx
    - src/features/auth/components/sign-up-form.tsx
    - CONVENTIONS.md
    - package.json
    - .planning/phases/01-foundation-auth-preferences/COVERAGE.md

key-decisions:
  - "No mock server remains anywhere (GC-22) — local dev, unit, component and e2e tests all resolve the real nonprod backend's address from one declaration (src/test-utils/api-base-url.ts)"
  - "Hand-author the backend's problem-response shape (src/lib/api/problem-detail.ts) rather than waiting on contract regeneration to supply it — regeneration confirmed it still doesn't"
  - "Every e2e test creates its own fixture account (e2e/fixtures.ts); no account is ever shared, because the backend's 2-concurrent-session ceiling makes a shared fixture fail under parallel workers with an indistinguishable credentials error"

patterns-established:
  - "Auth-api module boundary stubbing for component tests (vi.mock at the module the component actually owns) replaces MSW network interception"
  - "e2e fixture-per-test account creation via a direct APIRequestContext call to the real backend, bypassing the application"

requirements-completed: [AUTH-01, AUTH-02]

coverage:
  - id: D1
    description: "No fake HTTP layer (MSW, mock store, worker asset) remains anywhere in the repository; every test target resolves the real nonprod backend's address"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "pnpm test (375+12 tests) — all pass with no mock server present"
        status: pass
      - kind: other
        ref: "grep -rIiln 'mockserviceworker|mocks/store|mocks/handlers|setup-msw-worker' src app e2e public package.json vitest.config.ts CONVENTIONS.md — no matches"
        status: pass
    human_judgment: false
  - id: D2
    description: "The committed OpenAPI contract is the document the live backend serves, with a neutral servers entry and no deployed hostname"
    verification:
      - kind: other
        ref: "pnpm api:generate && git diff --exit-code src/lib/api/generated-types.ts — clean"
        status: pass
    human_judgment: false
  - id: D3
    description: "A backend problem-response's named error code is readable by application code as a typed value, without re-parsing prose"
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "src/lib/api/problem-detail.unit.test.ts (12 tests: parse success, per-field errors, 9 parametrised rejection cases, never-throws)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A sign-up against the real backend stores the identity the backend returned (id/email/displayName/theme), not one assembled from the submitted form"
    requirement: "AUTH-01"
    verification:
      - kind: manual_procedural
        ref: "Non-committed throwaway smoke test exercising app/api/auth/signup/route.ts's POST handler directly against the live nonprod backend — asserted session.email/displayName/id/theme match the backend's own 201 response body, and a duplicate-email sign-up stores no session and returns the collapsed failure copy"
        status: pass
    human_judgment: true
    rationale: "No committed automated node-project test proves this — app/api/auth/routes.test.ts was deliberately deleted in Task 1 (its whole premise was driving Route Handlers through an intercepted network) and plan 01-33's forthcoming Server Action tests are the named replacement home for this coverage. Flag for a human/future-plan check rather than a false auto-pass."
  - id: D5
    description: "The end-to-end suite creates its own throwaway account per test rather than relying on a seeded fixture, and every AUTH-01/02/03 scenario from the original specs still passes against the live backend"
    requirement: "AUTH-02"
    verification:
      - kind: e2e
        ref: "pnpm exec playwright test --project e2e — 8/8 passed against https://kanban-board-rud-vlad-473-nonprod.duckdns.org"
        status: pass
      - kind: other
        ref: "grep -rIln DEMO_USER e2e — no matches"
        status: pass
    human_judgment: false

duration: 50min
completed: 2026-08-18
status: complete
---

# Phase 01 Plan 30: Delete the mock backend, point every layer at nonprod Summary

**Deleted MSW outright, regenerated the OpenAPI contract from the live nonprod backend, hand-authored a typed problem-response shape the contract still doesn't supply, fixed sign-up to store the backend's own returned identity, and rewrote both e2e specs to mint their own throwaway accounts.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-08-18T18:00:00Z (approx.)
- **Completed:** 2026-08-18T18:50:12Z
- **Tasks:** 3 (Task 2 ran TDD: RED then GREEN)
- **Files modified:** 31 (across 6 task/TDD-gate commits + 1 metadata commit)

## Accomplishments

- No fake HTTP layer (MSW, `src/lib/mocks/*`, the worker asset, `instrumentation.ts`'s startup hook) remains anywhere in the repository; `vitest.config.ts`, `e2e/test-env.ts`, and CI all resolve the real nonprod backend's address from one declaration (`src/test-utils/api-base-url.ts`)
- Component tests for the auth forms now stub the `auth-api` module boundary (`vi.mock`) instead of intercepting the network, preserving every existing assertion
- Regenerated `docs/api/kanban-board-openapi.json` from the live backend's own `/api/docs`, normalised the `servers` entry to stay hostname-free, and confirmed regeneration did *not* close GC-19's gap (sign-up is still documented as a 200 with no error schema — a finding to report to the backend, not silently worked around)
- Hand-authored `src/lib/api/problem-detail.ts` (`PROBLEM_CODE`, `ProblemCode`, `ProblemDetail`, `parseProblemDetail`), driven test-first (RED commit `8cdeb15`, GREEN commit `91900b1`)
- Rewrote `app/api/auth/signup/route.ts` to widen the upstream response through `unknown`, guard it with `isSessionPayload`, and build the session from the backend's own returned record — verified directly against the live backend (a 201 with the full identity, and a duplicate-email rejection storing no session)
- Rewrote both e2e specs to use a new `e2e/fixtures.ts` helper that mints a throwaway account per test against the real backend, since the backend caps concurrent sessions per account at 2

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete the mock backend and point every test target at nonprod** - `3390b9f` (feat)
2. **Task 2: Regenerate the contract and make sign-up read the response the backend actually sends** - TDD gated:
   - RED: `8cdeb15` (test) — failing `problem-detail.unit.test.ts`
   - GREEN: `91900b1` (feat) — `problem-detail.ts` implementation
   - `dab9de1` (feat) — contract regeneration + `generated-types.ts`
   - `63638ac` (feat) — sign-up route rewrite + COVERAGE.md
3. **Task 3: End-to-end specs that create their own accounts against the real backend** - committed together with the deviation-ledger update as `284a50a` (see Deviations below)

**Plan metadata:** this commit (SUMMARY.md, REQUIREMENTS.md if changed)

_TDD Gate Compliance: RED (`8cdeb15`) precedes GREEN (`91900b1`) in git log — sequence verified._

## Files Created/Modified

- `src/test-utils/api-base-url.ts` - single declaration of the real nonprod backend's address for every test target
- `src/lib/api/problem-detail.ts` - hand-authored, runtime-guarded backend problem-response shape and named codes
- `src/lib/api/problem-detail.unit.test.ts` - 12 tests covering parse-success and 9 parametrised rejection cases
- `e2e/fixtures.ts` - `createFixtureAccount`/`FIXTURE_PASSWORD`, per-test throwaway account creation
- `app/api/auth/signup/route.ts` - stores the backend's own returned identity, no more bare-string/default-theme assumption
- `docs/api/kanban-board-openapi.json`, `src/lib/api/generated-types.ts` - regenerated from the live backend
- `vitest.config.ts`, `e2e/test-env.ts`, `.github/workflows/ci.yml` - resolve the real backend's base URL
- `src/features/auth/components/sign-in-form.test.tsx`, `sign-up-form.test.tsx` - stub `auth-api` module instead of MSW
- `e2e/auth.e2e.spec.ts`, `e2e/route-guard.e2e.spec.ts` - mint fixture accounts instead of importing a seeded demo user
- `CONVENTIONS.md` - mock-server rule replaced with the no-fake-HTTP-layer rule
- `.planning/phases/01-foundation-auth-preferences/COVERAGE.md` - added the `/admin/reset` opt-out row

## Decisions Made

- No mock server anywhere (GC-22): local dev, unit, component and e2e all resolve the real nonprod backend from one declaration.
- Hand-author the problem-response type rather than block on contract regeneration — regeneration confirmed the gap is real, not a stale-file artifact.
- Every e2e test mints its own fixture account; none shared, per the backend's documented 2-concurrent-session ceiling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1's own verify grep required fixes outside its stated `<files>` list**
- **Found during:** Task 1
- **Issue:** Task 1's `<verify>` command greps `app/` and `e2e/` in addition to its declared file list. `app/api/auth/signin/route.ts` and `signup/route.ts` carried comments referencing the deleted `src/lib/mocks/*` modules, and both e2e specs imported the deleted `src/lib/mocks/store` — none of these four files are in Task 1's `<files>` list, but `tsc --noEmit`/`lint`/the grep all failed without touching them.
- **Fix:** Rewrote the two stale comments; replaced the e2e specs' deleted import with interim inline literals (explicitly commented as interim, replaced properly in Task 3).
- **Files modified:** `app/api/auth/signin/route.ts`, `app/api/auth/signup/route.ts` (comment only), `e2e/auth.e2e.spec.ts`, `e2e/route-guard.e2e.spec.ts`
- **Verification:** `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` all exit 0; grep clean.
- **Committed in:** `3390b9f` (Task 1 commit)

**2. [Rule 1 - Bug] TanStack Query's `mutationFn` second argument broke `toHaveBeenCalledWith` assertions**
- **Found during:** Task 1 (running the rewritten component tests)
- **Issue:** After stubbing `postSignIn`/`postSignUp` at the module boundary, `toHaveBeenCalledWith({...})` failed — TanStack Query v5 calls `mutationFn` with a second, internal context argument (`{ client, meta, mutationKey }`) that the real function signature never declares.
- **Fix:** Asserted against `mock.calls[0]?.[0]` (the first argument only) instead of `toHaveBeenCalledWith`.
- **Files modified:** `src/features/auth/components/sign-in-form.test.tsx`, `sign-up-form.test.tsx`
- **Verification:** `pnpm test` — 375/375 pass.
- **Committed in:** `3390b9f`

**3. [Documented, not auto-fixed] Behaviours 3-4 of Task 2's `<behavior>` block have no new committed automated test**
- **Found during:** Task 2
- **Issue:** The plan's acceptance criteria calls for all four `<behavior>` bullets to be asserted via `pnpm vitest run --project unit --project node`. Behaviours 1-2 (problem-response parsing) are covered by the committed unit test. Behaviours 3-4 (sign-up identity storage / failure path) have no test in either project, because Task 1 deliberately deleted `app/api/auth/routes.test.ts` (its whole premise was driving Route Handlers through an intercepted network) with plan 01-33's forthcoming Server Action tests named as the intended replacement home, and Task 2's own `<files>` list does not include a new Route Handler test file.
- **Resolution:** Verified manually instead of left silently unverified — a throwaway, non-committed vitest node-project test exercised the actual route handler function directly against the live nonprod backend (a fresh sign-up: 201 + session stores the backend's exact id/email/displayName/theme; a duplicate-email sign-up: no session stored, collapsed failure copy returned). Recorded as `coverage.D4` with `human_judgment: true` and logged to `.planning/WINDOWS.md` (entry 12) so it stays visible at ship time.
- **Committed in:** `63638ac` (route rewrite); ledger entry in `284a50a`

**4. [Process note, not a code deviation] Task 3's file changes landed in the same commit as a WINDOWS.md ledger update**
- **Found during:** Task 3 wrap-up
- **Issue:** `git add`'d Task 3's three files, then separately `git add`'d `.planning/WINDOWS.md` for Task 2's deviation-ledger entry without re-checking staged state — the resulting commit (`284a50a`) contains both, and its message only describes the ledger addition even though the diff includes `e2e/fixtures.ts`, `e2e/auth.e2e.spec.ts`, and `e2e/route-guard.e2e.spec.ts`.
- **Impact:** Cosmetic only — every file is correct and all verification (tests, e2e run, lint, build, tsc) passed against the actual committed state. No functional or scope issue; flagged for commit-message accuracy only.
- **Committed in:** `284a50a`

**5. [Plan-vs-execution-mode conflict, documented] Did not push to `origin`**
- **Found during:** Task 3
- **Issue:** Task 3's own acceptance criteria calls for pushing the whole plan once and confirming the CI run for that commit is green before writing this summary. This execution runs as a parallel worktree-isolated agent, where the orchestrator explicitly owns push/merge/STATE.md/ROADMAP.md updates after all wave agents complete (per this agent's own operating instructions) — pushing directly from an isolated worktree branch would not exercise the actual `master` CI run the plan's acceptance criterion is asking about anyway.
- **Resolution:** All work is committed locally (7 commits) on this worktree's branch. The orchestrator is responsible for merging this branch and pushing/verifying CI once the wave completes. No CI run URL to record here as a result.

---

**Total deviations:** 5 (2 auto-fixed for correctness/build-passing, 1 documented coverage gap flagged for human/future-plan follow-up, 1 cosmetic commit-scoping note, 1 execution-mode/push conflict)
**Impact on plan:** All auto-fixes were necessary for the plan's own verify gates to pass honestly; no scope creep. The coverage gap and push deferral are both consequences of this plan's own design (Task 1 deleting Route Handler tests ahead of 01-33's Server Actions migration; parallel worktree execution deferring integration to the orchestrator), not oversights, and both are explicitly flagged rather than silently swept under the rug.

## Issues Encountered

None beyond what's captured above as deviations.

## User Setup Required

None - no external service configuration required. The `NONPROD_RESET_TOKEN` CI secret (Finding 6, 01-RESEARCH.md) is plan 01-31's concern, not this plan's.

## Next Phase Readiness

- Plan 01-31 (CI reset-token wiring) can proceed — this plan already points CI's `EXTERNAL_API_BASE_URL` at nonprod.
- Plan 01-33 (Server Actions migration) inherits a clean starting point: no MSW, a corrected sign-up Route Handler, and the `problem-detail.ts` module ready to thread through Server Action return types (GC-20). It is also the named place to add committed automated coverage for Task 2's behaviours 3-4 (see Deviation 3 above).
- The orchestrator still needs to merge this worktree branch, push to `origin/master`, and confirm the CI run is green — not done here by design (see Deviation 5).

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-18*

## Self-Check: PASSED

All created files verified present (`src/test-utils/api-base-url.ts`, `src/lib/api/problem-detail.ts`,
`src/lib/api/problem-detail.unit.test.ts`, `e2e/fixtures.ts`, this SUMMARY.md). All seven commit
hashes (`3390b9f`, `8cdeb15`, `91900b1`, `dab9de1`, `63638ac`, `284a50a`) verified present in
`git log --oneline --all`.
