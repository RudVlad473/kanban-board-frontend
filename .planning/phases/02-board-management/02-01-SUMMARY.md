---
phase: 02-board-management
plan: 01
subsystem: infra
tags: [theme, cookies, nextjs, typescript, refactor]

requires:
  - phase: 01-foundation-auth-preferences
    provides: session.ts/theme.ts cookie I/O, use-theme-preference hook, theme toggle
provides:
  - "THEME/Theme/isTheme const in src/lib/core/theme/theme.ts — single runtime declaration"
  - "COOKIE/CookieName/baseCookieOptions in src/lib/core/cookies/cookie-registry.ts"
  - "Every LIGHT/DARK literal and cookie-name literal in application source, tests, and e2e
    specs sourced from the two new lib/core/ modules"
affects: [board-management, phase-02-cookie-io-relocation, phase-02-actions-split]

actuals:
  tokens: 9599
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "lib/core/ enum-like const pattern (ADR tech/0012) applied to a second/third case beyond
      routes.ts: THEME and COOKIE, both `{ KEY: value } as const` + index-access derived type"
    - "baseCookieOptions() as a function (not a frozen object) so NODE_ENV is read at cookie-set
      call time, matching pre-existing session.ts/theme.ts behavior"

key-files:
  created:
    - src/lib/core/theme/theme.ts
    - src/lib/core/theme/theme.unit.test.ts
    - src/lib/core/cookies/cookie-registry.ts
    - src/lib/core/cookies/cookie-registry.unit.test.ts
  modified:
    - src/lib/server/theme.ts
    - src/lib/server/session.ts
    - src/lib/server/session-cookie.ts
    - src/features/theme/hooks/use-theme-preference.ts
    - src/features/theme/actions.ts
    - src/features/theme/components/theme-toggle.tsx
    - app/layout.tsx
    - app/(auth)/layout.tsx

key-decisions:
  - "Split Task 1 (THEME) and Task 2 (COOKIE) into two commits even though both touch
    session.ts/theme.ts, by staging the two tasks' edits to those shared files separately
    rather than committing the fully-merged working tree in one shot — keeps each commit
    independently revertable and each task's own verify command meaningful against its own
    commit."
  - "Trimmed the acceptance-criteria greps to zero false positives: both new lib/core/ files'
    header comments originally described themselves as carrying no `server-only` import using
    that literal substring, which itself tripped `grep -c 'server-only'` to 1. Reworded both
    comments to describe the same fact without the literal substring."

requirements-completed: [PC-01, PC-02]

coverage:
  - id: D1
    description: "THEME/Theme/isTheme declared once in src/lib/core/theme/theme.ts, wired into
      session.ts, theme.ts, use-theme-preference.ts and app/layout.tsx"
    requirement: PC-01
    verification:
      - kind: unit
        ref: "src/lib/core/theme/theme.unit.test.ts"
        status: pass
      - kind: unit
        ref: "src/lib/server/session.test.ts"
        status: pass
      - kind: other
        ref: "pnpm lint (zero errors, proves no lib-core -> lib-server boundary violation)"
        status: pass
    human_judgment: false
  - id: D2
    description: "COOKIE/CookieName/baseCookieOptions declared once in
      src/lib/core/cookies/cookie-registry.ts; session.ts, theme.ts and session-cookie.ts read
      their cookie name from COOKIE and spread baseCookieOptions()"
    requirement: PC-02
    verification:
      - kind: unit
        ref: "src/lib/core/cookies/cookie-registry.unit.test.ts"
        status: pass
      - kind: unit
        ref: "src/lib/server/session.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Zero LIGHT/DARK literals remain outside theme.ts, its test, and the generated
      OpenAPI contract types — every consumer (component, actions, tests, e2e specs, storybook
      stub) imports THEME/Theme instead"
    requirement: PC-01
    verification:
      - kind: other
        ref: "grep -rn '\"LIGHT\"\\|\"DARK\"' --include=*.ts --include=*.tsx src app e2e (excluding
          the three allowed files) — zero matches"
        status: pass
      - kind: unit
        ref: "pnpm exec vitest run --project unit --project node (91/91 tests)"
        status: pass
      - kind: other
        ref: "pnpm exec tsc --noEmit (zero errors)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Theme toggle, persistence and route-guard behavior unchanged — same cookie
      names, same option flags, same values, byte-for-byte"
    verification:
      - kind: unit
        ref: "src/features/theme/components/theme-toggle.test.tsx (16/16, --project browser)"
        status: pass
      - kind: other
        ref: "src/features/theme/components/theme-toggle.stories.tsx (4/4, --project storybook)"
        status: pass
    human_judgment: true
    rationale: "The plan's own <verification> block additionally calls for a real Playwright e2e
      run (pnpm exec playwright test --project e2e) against the live nonprod backend and a
      manual pnpm dev smoke test for flash-avoidance — neither was run as part of this
      autonomous plan execution, so end-to-end/visual confirmation is deferred to end-of-phase
      UAT rather than auto-passed here."

duration: 32min
completed: 2026-08-20
status: complete
---

# Phase 02 Plan 01: Theme const and cookie registry Summary

**Closed the three-way `Theme` type duplication and the one-constant-per-file cookie-name
scattering by adding `THEME`/`isTheme` (`lib/core/theme/`) and `COOKIE`/`baseCookieOptions`
(`lib/core/cookies/`), then sweeping every remaining `"LIGHT"`/`"DARK"` literal across app,
feature, test and e2e code to reference them.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-08-20T13:38:00Z (approx.)
- **Completed:** 2026-08-20T14:10:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 21 (4 created, 17 modified)

## Accomplishments

- `src/lib/core/theme/theme.ts` — the single runtime declaration of `THEME`/`Theme`/`isTheme`,
  following the same `as const` + index-access idiom `routes.ts` already established; no
  `server-only` import, so it's importable from both server and client rings.
- `src/lib/core/cookies/cookie-registry.ts` — `COOKIE`/`CookieName`/`baseCookieOptions()`,
  naming every cookie this app sets or reads (`session`, `theme`, `JSESSIONID`) and the
  `secure`/`sameSite`/`path` fields duplicated verbatim across `session.ts`/`theme.ts` before
  this plan.
- `session.ts`, `theme.ts` and `session-cookie.ts` now read their cookie name from `COOKIE` and
  spread `baseCookieOptions()` — no cookie flag values changed, only where they're declared.
- Every remaining `"LIGHT"`/`"DARK"` literal in application source, co-located tests, the
  storybook stub, and both theme/route-guard e2e specs now reads `THEME`/`Theme` from
  `@/lib/core/theme/theme`.

## Task Commits

Each task was committed atomically:

1. **Task 1: THEME const in lib/core/theme, wired end-to-end** - `021cce5` (feat)
2. **Task 2: COOKIE registry and baseCookieOptions in lib/core/cookies** - `4931a7c` (feat)
3. **Task 3: Sweep remaining LIGHT/DARK literals to THEME** - `fb87f42` (refactor)

_Note: Tasks 1 and 2 both touch `src/lib/server/session.ts` and `src/lib/server/theme.ts`.
Rather than committing the fully-merged working tree as one lump, each task's edits to those
shared files were isolated (by temporarily reverting the later task's hunks, committing, then
reapplying them) so each commit's diff matches exactly what that task's own action/acceptance
criteria describe._

## Files Created/Modified

- `src/lib/core/theme/theme.ts` - `THEME` const, `Theme` type, `isTheme` guard
- `src/lib/core/theme/theme.unit.test.ts` - unit tests for the above
- `src/lib/core/cookies/cookie-registry.ts` - `COOKIE` const, `CookieName` type,
  `baseCookieOptions()`
- `src/lib/core/cookies/cookie-registry.unit.test.ts` - unit tests for the above
- `src/lib/server/theme.ts` - reads `Theme`/`isTheme` from core; `readThemeCookie`/
  `writeThemeCookie` use `COOKIE.THEME` + `baseCookieOptions()`
- `src/lib/server/session.ts` - `SessionPayload.theme: Theme`; `isSessionPayload` calls
  `isTheme(...)`; cookie I/O uses `COOKIE.SESSION` + `baseCookieOptions()`
- `src/lib/server/session-cookie.ts` - `UPSTREAM_SESSION_COOKIE_NAME` re-exports
  `COOKIE.UPSTREAM_SESSION`
- `src/features/theme/hooks/use-theme-preference.ts` - drops its duplicated client-side `Theme`
  type, imports the shared one, uses `THEME.LIGHT`/`THEME.DARK`
- `src/features/theme/actions.ts` - imports `THEME`/`Theme` from core; `themeSchema` built from
  `THEME.LIGHT`/`THEME.DARK`
- `src/features/theme/components/theme-toggle.tsx` (+ `.test.tsx`, `.stories.tsx`) - import
  `THEME`/`Theme` from core instead of the hook's former re-export
- `app/layout.tsx`, `app/(auth)/layout.tsx` - compare against `THEME.DARK`/use `THEME.LIGHT`
- `src/features/auth/actions.unit.test.ts`, `src/lib/server/session.test.ts`,
  `src/lib/server/server-client.integration.test.ts`, `src/test-utils/theme-actions-storybook-stub.ts`,
  `e2e/theme.e2e.spec.ts`, `e2e/route-guard.e2e.spec.ts` - literal `"LIGHT"`/`"DARK"` values and
  type annotations replaced with `THEME`/`Theme`

## Decisions Made

- Split Task 1/Task 2's overlapping edits to `session.ts`/`theme.ts` into two atomic commits by
  temporarily isolating each task's hunks (see Task Commits note above) rather than emitting one
  combined commit — preserves independent revertability per task.
- Reworded both new modules' header comments to avoid the literal substring `server-only` (they
  originally documented "no `server-only` import" using that exact text, which caused
  `grep -c 'server-only'` — the acceptance criteria's own check — to return 1 instead of the
  required 0). The comments still document the same fact, just without a false-positive-inducing
  literal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Generated missing Next.js route types so `tsc --noEmit` could resolve `LayoutProps`**
- **Found during:** Task 3 verification (`pnpm exec tsc --noEmit`)
- **Issue:** `app/layout.tsx`'s pre-existing `LayoutProps<"/">` annotation (unrelated to this
  plan's changes — same signature before and after) failed to resolve because `.next/types/`
  had never been generated in this fresh worktree checkout.
- **Fix:** Ran `pnpm exec next typegen` (generates route types without a full build). No source
  files changed; `.next/` remains gitignored.
- **Files modified:** none (generated, gitignored output only)
- **Verification:** `pnpm exec tsc --noEmit` reports zero errors afterward
- **Committed in:** n/a (no tracked files changed)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to satisfy Task 3's own stated acceptance criterion
(`pnpm exec tsc --noEmit reports zero errors`); no application code touched.

## Issues Encountered

- **Full `pnpm test` intermittently OOM'd** when run in this environment. Process inspection
  showed a sibling worktree agent (`agent-afc5df7c2284c1664`, a different parallel executor in
  this wave) also running `pnpm test` concurrently, competing for the same dev-server ports and
  memory. Not a regression from this plan's changes — confirmed by running the suite in smaller
  scoped slices without concurrent contention: `--project unit --project node` (91/91 pass,
  which includes `server-client.integration.test.ts`'s real-backend calls),
  `--project browser theme-toggle` (16/16 pass), `--project storybook theme-toggle` (4/4 pass).
  A full unscoped `pnpm test` was not re-attempted after committing since the scoped runs already
  cover every file this plan touched; the phase-level verification step should re-run the full
  suite once wave contention has cleared.
- **`.claude/settings.local.json` fails `pnpm format:check`** — pre-existing untracked file (was
  already present before this plan started, not part of `files_modified`), unrelated to theme/
  cookie work. Left untouched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/lib/core/theme/theme.ts` and `src/lib/core/cookies/cookie-registry.ts` are ready for
  plans 02-02+ (PC-03 cookie I/O relocation to `lib/server/cookies/`, PC-04 actions-folder
  split) to build on without any further literal-replacement sweep.
- The plan's own `<verification>` block also calls for a real Playwright e2e run
  (`pnpm exec playwright test --project e2e`, real nonprod backend) and a manual `pnpm dev`
  flash-avoidance smoke test — neither was run in this autonomous execution; both are deferred
  to end-of-phase UAT (see coverage D4's `rationale`).
- No blockers for the next plan in the wave sequence.

---
*Phase: 02-board-management*
*Completed: 2026-08-20*

## Self-Check: PASSED

- FOUND: src/lib/core/theme/theme.ts
- FOUND: src/lib/core/theme/theme.unit.test.ts
- FOUND: src/lib/core/cookies/cookie-registry.ts
- FOUND: src/lib/core/cookies/cookie-registry.unit.test.ts
- FOUND: .planning/phases/02-board-management/02-01-SUMMARY.md
- FOUND commit: 021cce5
- FOUND commit: 4931a7c
- FOUND commit: fb87f42
