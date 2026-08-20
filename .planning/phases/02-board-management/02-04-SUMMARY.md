---
phase: 02-board-management
plan: 04
subsystem: auth
tags: [server-actions, nextjs, typescript, refactor, vitest, storybook]

requires:
  - phase: 02-board-management
    provides: "themeCookie/upstreamCookie factory-namespaced cookie I/O in src/lib/server/cookies/ (02-03)"
provides:
  - "features/<domain>/actions/<action-name>.ts one-Server-Action-per-file convention, project-wide going forward"
  - "signInAction/signUpAction/signOutAction relocated to src/features/auth/actions/{sign-in,sign-up,sign-out}.ts"
  - "updateThemeAction relocated to src/features/theme/actions/update-theme.ts"
  - "per-action storybook stubs (sign-in/sign-up/update-theme) and exact-specifier vitest.config.ts aliases"
affects: [phase-02-board-management]

actuals:
  tokens: 13918
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "features/<domain>/actions/<action-name>.ts, one Server Action per file with its own
      co-located *.unit.test.ts — replaces the flat multi-export actions.ts convention (GC-27).
      action-state.ts stays at the feature root when a shared type is consumed by more than one
      action in the domain; a domain with exactly one action (theme) keeps no such analogue and
      the result type lives in the action's own file."
    - "storybook Vitest project aliases must be EXACT per-module specifiers, never a prefix, when
      more than one real module shares a directory — a Vite string find is a prefix match, so a
      directory-level alias silently mis-rewrites every more-specific path under it."

key-files:
  created:
    - src/features/auth/actions/sign-in.ts
    - src/features/auth/actions/sign-in.unit.test.ts
    - src/features/auth/actions/sign-up.ts
    - src/features/auth/actions/sign-up.unit.test.ts
    - src/features/auth/actions/sign-out.ts
    - src/features/auth/actions/sign-out.unit.test.ts
    - src/features/theme/actions/update-theme.ts
    - src/features/theme/actions/update-theme.unit.test.ts
    - src/test-utils/sign-in-action-storybook-stub.ts
    - src/test-utils/sign-up-action-storybook-stub.ts
    - src/test-utils/update-theme-action-storybook-stub.ts
  modified:
    - src/features/auth/components/sign-in-form.tsx
    - src/features/auth/components/sign-in-form.test.tsx
    - src/features/auth/components/sign-up-form.tsx
    - src/features/auth/components/sign-up-form.test.tsx
    - src/features/auth/components/sign-out-button.tsx
    - src/features/auth/components/sign-out-button.test.tsx
    - src/features/theme/hooks/use-theme-preference.ts
    - src/features/theme/components/theme-toggle.test.tsx
    - vitest.config.ts

key-decisions:
  - "The plan's own vitest.config.ts acceptance grep (`grep -c 'actions/sign-in\\|actions/sign-up\\|
    actions/update-theme' vitest.config.ts` returning 3) required rewording the new ordering-
    rationale comment so it doesn't itself contain a literal 'actions/sign-in' substring — the
    first draft counted 4 matches (3 alias entries + 1 comment reference) and would have failed
    its own stated acceptance criterion."
  - "Storybook stub WHY-comments point to the design doc
    (docs/superpowers/specs/2026-08-20-theme-cookies-actions-cleanup-design.md) rather than to
    the now-deleted actions-storybook-stub.ts/theme-actions-storybook-stub.ts they replace — a
    pointer to a file this same plan deletes would be a dangling reference the moment it landed."
  - "Followed 02-03's established intermediate-broken-state sequencing: Task 1 and Task 2 each
    intentionally leave not-yet-repointed callers broken (their own action text says so, mirroring
    theme.ts/session-cookie.ts's split in 02-03) — verified each new module's own test file and
    lint output in isolation at its own commit boundary, and ran the full pnpm lint/tsc/test/
    test:a11y suite only after Task 3 landed."

requirements-completed: [PC-04, PC-05]

coverage:
  - id: D1
    description: "Each Server Action lives in its own file under features/<domain>/actions/
      <action-name>.ts with its own co-located *.unit.test.ts; no flat multi-export actions.ts
      survives in either domain"
    requirement: PC-04
    verification:
      - kind: unit
        ref: "src/features/auth/actions/{sign-in,sign-up,sign-out}.unit.test.ts (8/8) + src/features/theme/actions/update-theme.unit.test.ts (6/6)"
        status: pass
      - kind: other
        ref: "ls src/features/auth/actions/ lists exactly 6 files; ls src/features/theme/actions/ lists exactly 2; both actions/index.ts absent; head -1 of each new action file == \"use server\";"
        status: pass
    human_judgment: false
  - id: D2
    description: "action-state.ts stays at the auth feature root — a shared type consumed by all
      three actions, not an action itself"
    requirement: PC-04
    verification:
      - kind: other
        ref: "ls src/features/auth/action-state.ts (present, unmoved)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Sign-in, sign-up, sign-out and theme persistence behave identically after the
      split — same messages, same redirect targets, same error codes"
    requirement: PC-04
    verification:
      - kind: unit
        ref: "src/features/auth/actions/*.unit.test.ts, src/features/theme/actions/update-theme.unit.test.ts — every prior assertion preserved, 14/14 total passing"
        status: pass
      - kind: e2e
        ref: "pnpm test:e2e (e2e/auth.e2e.spec.ts, e2e/theme.e2e.spec.ts)"
        status: unknown
    human_judgment: true
    rationale: "pnpm test:e2e refuses to run in this worktree — e2e/global-setup.ts throws because
      NONPROD_RESET_TOKEN is unset (no .env.local in this fresh worktree checkout). Same
      pre-existing local-environment gap 02-01-SUMMARY.md and 02-03-SUMMARY.md already flag and
      defer to end-of-phase UAT with a real .env.local; the code path itself is unit-proven
      byte-identical to before the split (no message/status/redirect-target/branch changed per
      task action text, verified by diff review)."
  - id: D4
    description: "The storybook Vitest project still renders every auth and theme story — its
      aliases resolve the new per-action module specifiers to per-action stubs, so no story pulls
      node:crypto into a browser bundle"
    requirement: PC-04
    verification:
      - kind: unit
        ref: "pnpm test:a11y (storybook project) — 76/76 passing across 11 story files"
        status: pass
    human_judgment: false
---

# Phase 02 Plan 04: features/<domain>/actions/ one-file-per-Server-Action split Summary

**Replaced the flat multi-export `features/auth/actions.ts` and `features/theme/actions.ts` with
one file per Server Action under `features/<domain>/actions/`, repointing every consumer and
rebuilding the storybook Vitest project's aliases as exact per-action specifiers.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-08-20T15:10:00Z (approx.)
- **Completed:** 2026-08-20T15:22:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 22 (11 created, 9 modified, 2 deleted — plus their prior-content renamed)

## Accomplishments

- `src/features/auth/actions/{sign-in,sign-up,sign-out}.ts` — each holds exactly one Server
  Action, its own message constant (where applicable) and its own trimmed `no-restricted-syntax`
  eslint-disable comment; `src/features/auth/actions.ts` and its combined test file deleted, no
  barrel added.
- `src/features/theme/actions/update-theme.ts` — `updateThemeAction`, `UpdateThemeResult` and
  `themeSchema` moved unchanged; the theme domain deliberately keeps no `action-state.ts`
  analogue, since `UpdateThemeResult` is owned by its single action.
- Every consumer (three auth components + their tests, `use-theme-preference.ts`,
  `theme-toggle.test.tsx`) repointed to the new per-action import paths; every test's `vi.mock`
  target moved with its import.
- `vitest.config.ts`'s `storybook` project aliases rebuilt as three exact specifiers
  (`@/features/auth/actions/sign-in`, `@/features/auth/actions/sign-up`,
  `@/features/theme/actions/update-theme`), each ahead of the general `@` entry — a prefix alias
  would otherwise mis-rewrite the new per-action paths. Three new one-export stubs replace the two
  flat stubs they superseded.
- Long WHY-comments trimmed to at most 3 lines throughout (PC-05), pointing to T-01-08,
  `.planning/phases/01-foundation-auth-preferences/deferred-items.md`, and plan 01-35's summary
  instead of restating their rationale.

## Task Commits

Each task was committed atomically:

1. **Task 1: Split auth actions.ts into sign-in/sign-up/sign-out** — `298ebe1` (refactor)
2. **Task 2: Move theme actions.ts to actions/update-theme.ts** — `fa14d80` (refactor)
3. **Task 3: Repoint consumers, rebuild storybook aliases/stubs** — `1f41249` (refactor)

**Plan metadata:** committed via `gsd-tools query commit` after this summary (see completion
report).

## Files Created/Modified

- `src/features/auth/actions/sign-in.ts` / `.unit.test.ts` — `signInAction`, `INVALID_CREDENTIALS_MESSAGE`
- `src/features/auth/actions/sign-up.ts` / `.unit.test.ts` — `signUpAction`, `SIGN_UP_FAILURE_MESSAGE`
- `src/features/auth/actions/sign-out.ts` / `.unit.test.ts` — `signOutAction`
- `src/features/theme/actions/update-theme.ts` / `.unit.test.ts` — `updateThemeAction`, `UpdateThemeResult`
- `src/features/auth/components/sign-in-form.tsx`, `.test.tsx` — import repointed to `actions/sign-in`
- `src/features/auth/components/sign-up-form.tsx`, `.test.tsx` — import repointed to `actions/sign-up`
- `src/features/auth/components/sign-out-button.tsx`, `.test.tsx` — import repointed to `actions/sign-out`
- `src/features/theme/hooks/use-theme-preference.ts` — `mutationFn` import repointed to `actions/update-theme`
- `src/features/theme/components/theme-toggle.test.tsx` — import + `vi.mock` target repointed
- `src/test-utils/sign-in-action-storybook-stub.ts`, `sign-up-action-storybook-stub.ts`,
  `update-theme-action-storybook-stub.ts` — new one-export-each stubs
- `vitest.config.ts` — `storybook` project's alias array rebuilt as three exact per-action specifiers
- `src/features/auth/actions.ts`, `src/features/auth/actions.unit.test.ts` — deleted
- `src/features/theme/actions.ts`, `src/features/theme/actions.unit.test.ts` — deleted
- `src/test-utils/actions-storybook-stub.ts`, `src/test-utils/theme-actions-storybook-stub.ts` — deleted

## Decisions Made

- Reworded the new ordering-rationale comment in `vitest.config.ts` so it doesn't itself contain
  a literal `actions/sign-in` substring — Task 3's own acceptance grep expects exactly 3 matches
  (the 3 alias `find` entries), and the first draft's comment bumped that to 4.
- Pointed the three new storybook stub files' WHY-comments at the design doc
  (`docs/superpowers/specs/2026-08-20-theme-cookies-actions-cleanup-design.md`) rather than at the
  flat stubs they replace, since this same plan deletes those flat stubs.
- Followed 02-03's established sequencing: verified each of Task 1/2's new modules in isolation at
  their own commit boundary (their own action text says the intermediate state has not-yet-
  repointed callers), then ran the full `pnpm lint`/`tsc --noEmit`/`pnpm test`/`pnpm test:a11y`
  suite only after Task 3 repointed every consumer.

## Deviations from Plan

None — plan executed exactly as written, including the PC-05 comment-length trims and the
theme domain's deliberate absence of an `action-state.ts` analogue.

## Issues Encountered

- **`pnpm exec tsc --noEmit` initially failed on `app/layout.tsx`'s `LayoutProps` reference** —
  `.next/types/` had never been generated in this fresh worktree checkout, the identical gap
  02-01-SUMMARY.md and 02-03-SUMMARY.md already documented. Fixed by running
  `pnpm exec next typegen` (no source files changed; `.next/` remains gitignored).
- **`pnpm test:e2e` cannot run in this worktree** — `e2e/global-setup.ts` requires
  `NONPROD_RESET_TOKEN`, unset (no `.env.local` in this fresh worktree checkout). Same
  pre-existing gap 02-01/02-03 already flag and defer to end-of-phase UAT; see coverage D3's
  `rationale`.
- **`pnpm build` fails locally without a real `SESSION_SECRET`** — the same pre-existing gap
  STATE.md already flags (CI and the deployed Vercel build are unaffected). Not touched by this
  plan's changes.
- **`pnpm format:check` flags `.claude/settings.local.json`** — same pre-existing, untracked,
  out-of-scope file 02-01/02-03-SUMMARY.md already flagged. Left untouched.

## User Setup Required

None new — a real `.env.local` with `NONPROD_RESET_TOKEN`/`SESSION_SECRET` is required to run
`pnpm test:e2e`/`pnpm build` locally and confirm coverage D3 end-to-end, already tracked in
STATE.md and 02-03-SUMMARY.md.

## Next Phase Readiness

- `features/<domain>/actions/<action-name>.ts` is now the established, proven convention for any
  future domain that gains a Server Action (board/column/task mutations stay on TanStack Query
  per ADR tech/0002/GC-24 and are unaffected).
- The `storybook` Vitest project's alias-ordering pattern (exact per-module specifiers ahead of
  the general `@` entry) is documented in `vitest.config.ts`'s own comment for the next module
  that needs the same treatment.
- Coverage D3 (real-backend e2e proof that behavior is unchanged) is deferred to end-of-phase UAT
  with a working `NONPROD_RESET_TOKEN`, matching 02-01/02-03's identical deferral.
- No blockers for the next plan in the wave sequence.

---
*Phase: 02-board-management*
*Completed: 2026-08-20*

## Self-Check: PASSED

- FOUND: src/features/auth/actions/sign-in.ts
- FOUND: src/features/auth/actions/sign-in.unit.test.ts
- FOUND: src/features/auth/actions/sign-up.ts
- FOUND: src/features/auth/actions/sign-up.unit.test.ts
- FOUND: src/features/auth/actions/sign-out.ts
- FOUND: src/features/auth/actions/sign-out.unit.test.ts
- FOUND: src/features/theme/actions/update-theme.ts
- FOUND: src/features/theme/actions/update-theme.unit.test.ts
- FOUND: src/test-utils/sign-in-action-storybook-stub.ts
- FOUND: src/test-utils/sign-up-action-storybook-stub.ts
- FOUND: src/test-utils/update-theme-action-storybook-stub.ts
- MISSING: src/features/auth/actions.ts (expected — deleted by this plan)
- MISSING: src/features/auth/actions.unit.test.ts (expected — deleted by this plan)
- MISSING: src/features/theme/actions.ts (expected — deleted by this plan)
- MISSING: src/features/theme/actions.unit.test.ts (expected — deleted by this plan)
- MISSING: src/test-utils/actions-storybook-stub.ts (expected — deleted by this plan)
- MISSING: src/test-utils/theme-actions-storybook-stub.ts (expected — deleted by this plan)
- FOUND commit: 298ebe1
- FOUND commit: fa14d80
- FOUND commit: 1f41249
