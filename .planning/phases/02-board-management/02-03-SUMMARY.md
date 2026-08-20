---
phase: 02-board-management
plan: 03
subsystem: infra
tags: [cookies, nextjs, typescript, refactor, tdd]

requires:
  - phase: 02-board-management
    provides: "THEME/Theme/isTheme in src/lib/core/theme/theme.ts; COOKIE/CookieName/baseCookieOptions in src/lib/core/cookies/cookie-registry.ts (02-01)"
provides:
  - "themeCookie (read/write/clear) — factory-namespaced theme cookie I/O in src/lib/server/cookies/theme-cookie.ts"
  - "upstreamCookie (extract/toHeader) — factory-namespaced upstream-credential cookie I/O in src/lib/server/cookies/upstream-cookie.ts"
  - "themeCookie.clear() — new member, unused by this plan, wired for plan 02-04's sign-out cookie-clearing (folded todo FT-01)"
affects: [phase-02-actions-split, board-management]

actuals:
  tokens: 6315
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "lib/server/cookies/ subfolder mirroring lib/core/'s own concern-subfolder convention;
      each module opens with `import \"server-only\"` and exports one factory-namespaced const
      (read/write/clear, extract/toHeader) matching session.ts's createSessionService shape"
    - "TDD RED-phase stub pattern for pre-commit type-aware lint: when the RED test statically
      imports a module that doesn't exist yet, husky's eslint --fix (typescript-eslint
      no-unsafe-call/no-unsafe-member-access) fails on the resulting `any`-typed import — a
      minimal correctly-typed stub (bodies throwing `not implemented`) satisfies lint while
      still failing every assertion, keeping the RED commit both truthfully failing and
      committable"

key-files:
  created:
    - src/lib/server/cookies/theme-cookie.ts
    - src/lib/server/cookies/theme-cookie.unit.test.ts
    - src/lib/server/cookies/upstream-cookie.ts
    - src/lib/server/cookies/upstream-cookie.unit.test.ts
  modified:
    - src/lib/server/server-client.ts
    - src/features/auth/actions.ts
    - src/features/auth/actions.unit.test.ts
    - src/features/theme/actions.ts
    - src/features/theme/actions.unit.test.ts
    - src/test-utils/theme-actions-storybook-stub.ts
    - app/layout.tsx
    - app/(auth)/layout.tsx
    - app/(dashboard)/layout.tsx

key-decisions:
  - "Used a typed 'not implemented' stub for each RED commit instead of a dynamic import or a
    genuinely absent module — a static import of a nonexistent module, or a dynamic import cast
    through `any`, both trip typescript-eslint's no-unsafe-call/no-unsafe-member-access rules
    inside husky's pre-commit eslint --fix. A stub with the real call signatures (throwing) keeps
    the commit both lint-clean and honestly RED (every behavior assertion still fails)."
  - "Task 1 and Task 2's own `pnpm lint`/full-suite acceptance criteria could not literally pass
    at their own commit boundary — deleting theme.ts/session-cookie.ts before Task 3 repoints
    every caller leaves those callers importing a module that no longer exists, exactly as the
    plan's own Task 1 action text predicts ('every remaining importer is repointed in Task 3').
    Verified each task's own new files lint/test clean in isolation at their commit boundary, and
    ran the full pnpm lint/tsc/test suite only after Task 3 landed, matching the plan's designed
    intermediate-broken-state sequencing."
  - "src/test-utils/theme-actions-storybook-stub.ts and src/features/auth/actions.unit.test.ts
    (not in this plan's files_modified list) each had one comment referencing the old
    @/lib/server/theme path / extractUpstreamSessionId name — updated so Task 3's own acceptance
    grep (`@/lib/server/theme` etc. producing no output) actually holds; no behavior changed in
    either file (Rule 1/PC-05)."

requirements-completed: [PC-03, PC-05]

coverage:
  - id: D1
    description: "themeCookie.read/write/clear replace readThemeCookie/writeThemeCookie as a
      factory-namespaced object in src/lib/server/cookies/theme-cookie.ts; src/lib/server/theme.ts
      deleted"
    requirement: PC-03
    verification:
      - kind: unit
        ref: "src/lib/server/cookies/theme-cookie.unit.test.ts (7/7)"
        status: pass
      - kind: other
        ref: "grep -c 'export const themeCookie' src/lib/server/cookies/theme-cookie.ts == 1; head -1 == import \"server-only\";"
        status: pass
    human_judgment: false
  - id: D2
    description: "upstreamCookie.extract/toHeader replace extractUpstreamSessionId/
      toUpstreamCookieHeader as a factory-namespaced object in
      src/lib/server/cookies/upstream-cookie.ts; src/lib/server/session-cookie.ts and its test
      deleted"
    requirement: PC-03
    verification:
      - kind: unit
        ref: "src/lib/server/cookies/upstream-cookie.unit.test.ts (7/7, includes the new malformed-pair case)"
        status: pass
      - kind: other
        ref: "grep -c 'getSetCookie' upstream-cookie.ts >= 1 (array-form read preserved)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every caller repointed: server-client.ts, features/auth/actions.ts,
      features/theme/actions.ts, and all three app/**/layout.tsx files import from the new
      lib/server/cookies/ modules; no source file references the two deleted modules or their old
      exported names"
    requirement: PC-03
    verification:
      - kind: other
        ref: "grep -rn '@/lib/server/theme\\|@/lib/server/session-cookie' --include=*.ts --include=*.tsx src app e2e — zero matches"
        status: pass
      - kind: other
        ref: "grep -rn 'readThemeCookie\\|writeThemeCookie\\b\\|extractUpstreamSessionId\\|toUpstreamCookieHeader' --include=*.ts --include=*.tsx src app e2e — zero matches (word-boundary on writeThemeCookie to exclude the unrelated, pre-existing writeThemeCookieClientSide in use-theme-preference.ts)"
        status: pass
      - kind: other
        ref: "pnpm exec tsc --noEmit"
        status: pass
      - kind: other
        ref: "pnpm lint"
        status: pass
      - kind: unit
        ref: "pnpm exec vitest run --project unit --project node (107/107 passing in isolation; one integration test times out only under concurrent-worktree resource contention, confirmed unrelated to this plan's changes — see Issues Encountered)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real-backend end-to-end proof that upstreamCookie.toHeader still authenticates
      against the live nonprod backend, and that the theme cookie round-trips unchanged
      (pnpm test:e2e, e2e/auth.e2e.spec.ts + e2e/theme.e2e.spec.ts)"
    verification: []
    human_judgment: true
    rationale: "pnpm test:e2e refuses to run in this worktree — e2e/global-setup.ts throws
      because NONPROD_RESET_TOKEN is unset (no .env.local in this fresh worktree checkout; the
      Vitest unit/node projects inject SESSION_SECRET/EXTERNAL_API_BASE_URL test-only fallbacks
      via vitest.config.ts, but Playwright's global-setup has no such fallback and none is
      appropriate for a real-account-creating token). This is the same class of pre-existing
      local-environment gap STATE.md already flags for SESSION_SECRET/pnpm build. Deferred to
      end-of-phase UAT with a real .env.local, matching 02-01-SUMMARY.md's identical deferral of
      its own real-backend e2e run."
  - id: D5
    description: "themeCookie.clear() added (folded todo FT-01) so plan 02-04's sign-out flow can
      clear the theme cookie without reopening this module"
    requirement: PC-03
    verification:
      - kind: unit
        ref: "src/lib/server/cookies/theme-cookie.unit.test.ts > clear > deletes the theme cookie"
        status: pass
    human_judgment: false

duration: 42min
completed: 2026-08-20
status: complete
---

# Phase 02 Plan 03: Cookie I/O relocation (themeCookie/upstreamCookie) Summary

**Relocated theme and upstream-credential cookie I/O out of `lib/server/theme.ts` and
`lib/server/session-cookie.ts` into factory-namespaced `themeCookie`/`upstreamCookie` objects
under a new `lib/server/cookies/` subfolder, matching `session.ts`'s existing
`createSessionService` shape, and repointed every caller.**

## Performance

- **Duration:** 42 min
- **Started:** 2026-08-20T14:41:00Z (approx.)
- **Completed:** 2026-08-20T15:23:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 15 (4 created, 9 modified, 2 deleted — plus their prior-content test file
  renamed/split out)

## Accomplishments

- `src/lib/server/cookies/theme-cookie.ts` — `themeCookie.read()`/`write(theme)`/`clear()`,
  moved verbatim from `readThemeCookie`/`writeThemeCookie` with the same cookie name, flags and
  one-year `maxAge`; `clear()` is new, added for plan 02-04's sign-out flow (folded todo FT-01).
- `src/lib/server/cookies/upstream-cookie.ts` — `upstreamCookie.extract(response)`/
  `toHeader(jsessionId)`, moved verbatim from `extractUpstreamSessionId`/`toUpstreamCookieHeader`,
  still parsing via `response.headers.getSetCookie()` (not the comma-joined `headers.get()`) so a
  `Set-Cookie`'s own `Expires` comma can't split an entry in two.
- `src/lib/server/theme.ts`, `src/lib/server/session-cookie.ts` and
  `src/lib/server/session-cookie.unit.test.ts` deleted; every caller (`server-client.ts`,
  `features/auth/actions.ts`, `features/theme/actions.ts`, all three `app/**/layout.tsx`)
  repointed to the new modules.
- Comments trimmed to at most 3 lines (PC-05) in every file this plan touched, including
  `app/(dashboard)/layout.tsx`'s long cookie-vs-session-snapshot rationale, now a one-sentence WHY
  plus a pointer to `01-14-SUMMARY.md`.

## Task Commits

Each task was committed atomically (TDD tasks got two commits — RED then GREEN):

1. **Task 1: themeCookie factory** — `182ad38` (test, RED) → `a374ec0` (feat, GREEN)
2. **Task 2: upstreamCookie factory** — `569aa0a` (test, RED) → `24367f0` (feat, GREEN)
3. **Task 3: Repoint every caller** — `ba6517c` (refactor)

_Note: Task 1 and Task 2's GREEN commits each delete their respective old module
(`theme.ts`/`session-cookie.ts`) as their own action text specifies, before Task 3 repoints the
remaining callers — an intentional intermediate state where the whole-project `pnpm lint`/
`pnpm test` would fail on those not-yet-repointed callers. Verified each new module's own test
file and lint output in isolation at Task 1/2's commit boundary; ran the full
`pnpm lint`/`tsc --noEmit`/`pnpm test` suite only after Task 3 landed, per the plan's own stated
sequencing (see key-decisions)._

## Files Created/Modified

- `src/lib/server/cookies/theme-cookie.ts` — `themeCookie.read/write/clear`
- `src/lib/server/cookies/theme-cookie.unit.test.ts` — 7 tests covering every behavior bullet
- `src/lib/server/cookies/upstream-cookie.ts` — `upstreamCookie.extract/toHeader`
- `src/lib/server/cookies/upstream-cookie.unit.test.ts` — 7 tests (moved from
  `session-cookie.unit.test.ts`, plus the new malformed-pair case)
- `src/lib/server/server-client.ts` — `onRequest` middleware calls `upstreamCookie.toHeader(...)`
- `src/features/auth/actions.ts` — both sign-in/sign-up call sites use `upstreamCookie.extract(...)`
- `src/features/theme/actions.ts` — `updateThemeAction` calls `themeCookie.write(...)`
- `src/features/theme/actions.unit.test.ts` — comment repointed to the new module path
- `src/test-utils/theme-actions-storybook-stub.ts` — stale `@/lib/server/theme` comment reference removed
- `app/layout.tsx`, `app/(auth)/layout.tsx`, `app/(dashboard)/layout.tsx` — `themeCookie.read()`
  replaces `readThemeCookie()`; the dashboard layout's rationale comment trimmed per PC-05
- `src/lib/server/theme.ts` — deleted
- `src/lib/server/session-cookie.ts`, `src/lib/server/session-cookie.unit.test.ts` — deleted

## Decisions Made

- RED-phase stubs (typed, throwing `not implemented`) used instead of a dynamic `await import()`
  or a genuinely absent module for both TDD tasks — husky's pre-commit `eslint --fix` runs
  type-aware linting on staged files, and both alternatives left the imported symbol typed `any`,
  tripping `@typescript-eslint/no-unsafe-call`/`no-unsafe-member-access` on every call site in the
  test. A correctly-typed stub keeps the RED commit lint-clean while still genuinely failing every
  behavior assertion.
- Deferred the whole-project `pnpm lint`/`tsc --noEmit`/`pnpm test` verification to after Task 3,
  since Task 1/2 each intentionally leave not-yet-repointed callers broken (their own action text
  says so) — verified each new module in isolation at its own commit boundary instead.
- Fixed two comment references outside this plan's `files_modified` list
  (`src/test-utils/theme-actions-storybook-stub.ts`, `src/features/auth/actions.unit.test.ts`) so
  Task 3's own acceptance-criteria greps for the old path/name actually hold — no behavior change,
  Rule 1/PC-05 scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Generated missing Next.js route types so `tsc --noEmit` could resolve `LayoutProps`**
- **Found during:** Task 3 verification (`pnpm exec tsc --noEmit`)
- **Issue:** `app/layout.tsx`'s pre-existing `LayoutProps<"/">` annotation failed to resolve
  because `.next/types/` had never been generated in this fresh worktree checkout — the identical
  gap 02-01-SUMMARY.md already documented and fixed the same way.
- **Fix:** Ran `pnpm exec next typegen`. No source files changed; `.next/` remains gitignored.
- **Files modified:** none (generated, gitignored output only)
- **Verification:** `pnpm exec tsc --noEmit` reports zero errors afterward
- **Committed in:** n/a (no tracked files changed)

**2. [Rule 1 - Bug] Repointed two stale comment references outside this plan's `files_modified` list**
- **Found during:** Task 3's own acceptance-criteria grep for `@/lib/server/theme`/
  `extractUpstreamSessionId`
- **Issue:** `src/test-utils/theme-actions-storybook-stub.ts` and
  `src/features/auth/actions.unit.test.ts` each had a comment naming the pre-relocation
  path/function, which the plan's own acceptance grep would otherwise flag as a false failure.
- **Fix:** Reworded both comments to the new path/name; also trimmed the storybook stub's comment
  to 3 lines per PC-05 while touching it.
- **Files modified:** `src/test-utils/theme-actions-storybook-stub.ts`,
  `src/features/auth/actions.unit.test.ts`
- **Verification:** the two acceptance-criteria greps now produce no output
- **Committed in:** `ba6517c` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both necessary to satisfy Task 3's own stated acceptance criteria; no
application behavior changed by either.

## Issues Encountered

- **`server-client.integration.test.ts`'s real-backend session-bridge test times out under
  concurrent worktree load.** Its default 5000ms Vitest timeout is tight for a real network round
  trip against the live nonprod backend; running the full `pnpm test`/`pnpm exec vitest run
  --project unit --project node` suite in this environment (likely competing with sibling wave
  agents for network/CPU, the same contention 02-01-SUMMARY.md documented) intermittently exceeds
  it. Re-run in isolation three separate times (`pnpm exec vitest run --project node
  src/lib/server/server-client.integration.test.ts`), it passed 3/3 every time in ~6.3-7.3s — well
  under a realistic timeout, and this test's own logic and the code path it exercises
  (`upstreamCookie.toHeader`) are unchanged in behavior from before this plan. Not a regression;
  the phase-level verification step should re-run the full suite once wave contention has cleared,
  same recommendation 02-01 made.
- **A `text-field.test.tsx` browser-mode test also timed out once** during the same full-suite
  run, for the same contention reason — this file is entirely unrelated to this plan's changes
  (not in `files_modified`) and passed cleanly (24/24) when re-run in isolation.
- **`pnpm test:e2e` cannot run in this worktree** — `e2e/global-setup.ts` requires
  `NONPROD_RESET_TOKEN`, which has no fallback and is unset (no `.env.local` in this fresh
  worktree checkout). See coverage D4's `rationale` for the full explanation and the pointer to
  02-01's identical deferral.
- **`.claude/settings.local.json` fails `pnpm format:check`** — same pre-existing, untracked,
  out-of-scope file 02-01-SUMMARY.md already flagged. Left untouched.

## User Setup Required

A real `.env.local` with `NONPROD_RESET_TOKEN` (plus `SESSION_SECRET`/`EXTERNAL_API_BASE_URL`,
already flagged in STATE.md) is required to run `pnpm test:e2e` and confirm coverage D4
end-to-end. No new external service configuration beyond what STATE.md already tracks.

## Next Phase Readiness

- `themeCookie`/`upstreamCookie` are the only ways to reach either cookie concern; plan 02-04
  (actions-folder split) can import from `@/lib/server/cookies/theme-cookie` and
  `@/lib/server/cookies/upstream-cookie` directly, and its sign-out action can call
  `themeCookie.clear()` without touching this module again.
- Coverage D4 (real-backend e2e proof) is deferred to end-of-phase UAT with a working
  `NONPROD_RESET_TOKEN` — the code path is unchanged from before this plan (verified via unit
  tests pinning the exact `JSESSIONID=<value>` header string and the exact cookie flags), but the
  live round trip itself has not been re-confirmed post-relocation.
- No blockers for the next plan in the wave sequence.

---
*Phase: 02-board-management*
*Completed: 2026-08-20*

## Self-Check: PASSED

- FOUND: src/lib/server/cookies/theme-cookie.ts
- FOUND: src/lib/server/cookies/theme-cookie.unit.test.ts
- FOUND: src/lib/server/cookies/upstream-cookie.ts
- FOUND: src/lib/server/cookies/upstream-cookie.unit.test.ts
- MISSING: src/lib/server/theme.ts (expected — deleted by this plan)
- MISSING: src/lib/server/session-cookie.ts (expected — deleted by this plan)
- MISSING: src/lib/server/session-cookie.unit.test.ts (expected — deleted by this plan)
- FOUND commit: 182ad38
- FOUND commit: a374ec0
- FOUND commit: 569aa0a
- FOUND commit: 24367f0
- FOUND commit: ba6517c
