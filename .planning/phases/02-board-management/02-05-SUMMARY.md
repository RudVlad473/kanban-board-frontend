---
phase: 02-board-management
plan: 05
subsystem: auth
tags: [server-actions, cookies, nextjs, typescript, vitest, playwright, conventions]

requires:
  - phase: 02-board-management
    provides: "features/<domain>/actions/<action-name>.ts one-Server-Action-per-file convention and themeCookie factory (02-04, 02-03)"
provides:
  - "Symmetric theme-cookie lifecycle: signOutAction clears it, signInAction/signUpAction write it from the backend's own identity.theme on success only"
  - "THEME-01 e2e spec strengthened to assert the served HTML's dark scope after sign-in and the cookie's absence after sign-out, not just the toggle's aria-checked attribute"
  - "CONVENTIONS.md brought up to date with PC-01..PC-05: lib/core/theme/, lib/core/cookies/, lib/server/cookies/, features/<domain>/actions/ per-file rule, and the 1-3 line WHY-comment rule"
affects: [phase-02-board-management]

actuals:
  tokens: 5165
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "No new patterns — reuses the existing themeCookie factory (02-03) and features/<domain>/actions/ per-file convention (02-04)"

key-files:
  created: []
  modified:
    - src/features/auth/actions/sign-out.ts
    - src/features/auth/actions/sign-out.unit.test.ts
    - src/features/auth/actions/sign-in.ts
    - src/features/auth/actions/sign-in.unit.test.ts
    - src/features/auth/actions/sign-up.ts
    - src/features/auth/actions/sign-up.unit.test.ts
    - e2e/theme.e2e.spec.ts
    - CONVENTIONS.md

key-decisions:
  - "TDD RED was proven by reverting the three action files with `git checkout -- <file>` (never `git stash`, which is prohibited in a worktree — it shares refs/stash across sibling worktrees) before re-applying the implementation for GREEN."
  - "Task 4's checkpoint accounts must be created with exactly one session slot spent, not two — POST /signup itself opens session 1 of the backend's 2-concurrent-session cap. The DARK account's theme is set by reusing signup's own session cookie for PUT /users/me/theme rather than a separate /signin call, leaving one full slot for the human verifier. A first attempt that ignored this consumed both slots via signup+signin before the human's turn and produced an indistinguishable BAD_CREDENTIALS 401 (see Issues Encountered) — not a defect in signInAction/signOutAction."

requirements-completed: [FT-01, PC-04, PC-05]

coverage:
  - id: D1
    description: "signOutAction clears the theme cookie alongside session.destroy(); signInAction/signUpAction write it from the backend's own identity.theme, success path only, never from submitted FormData"
    requirement: FT-01
    verification:
      - kind: unit
        ref: "src/features/auth/actions/{sign-out,sign-in,sign-up}.unit.test.ts (85/85 across the unit project)"
        status: pass
      - kind: other
        ref: "grep -c 'themeCookie.clear' sign-out.ts == 1; grep -c 'themeCookie.write' sign-in.ts/sign-up.ts == 1 each"
        status: pass
    human_judgment: false
  - id: D2
    description: "THEME-01 e2e spec asserts the served dark scope after sign-in (not just aria-checked) and the theme cookie's absence right after sign-out"
    requirement: FT-01
    verification:
      - kind: e2e
        ref: "e2e/theme.e2e.spec.ts (THEME-01) — compiles clean under tsc/eslint/prettier; acceptance greps (isDarkScopeApplied x4, not.toContain x1, exactly one test() block) all pass"
        status: unknown
    human_judgment: true
    rationale: "pnpm test:e2e refuses to run in this worktree — e2e/global-setup.ts requires NONPROD_RESET_TOKEN, unset (no .env.local in this fresh worktree checkout; .env* files are permission-denied to read/write in this sandbox). Same pre-existing local-environment gap 02-01/02-03/02-04-SUMMARY.md already flag, deferred to end-of-phase UAT with a real .env.local. The underlying behavior was proven directly against the real backend via curl during Task 4's checkpoint debugging (signup opens session 1, sign-in after sign-out is session 2, both succeed within the documented 2-session cap) and by the human's own Task 4 sign-off."
  - id: D3
    description: "CONVENTIONS.md documents lib/core/theme/, lib/core/cookies/, lib/server/cookies/, features/<domain>/actions/<name>.ts (PC-04), and the 1-3 line WHY-comment rule (PC-05)"
    requirement: PC-04
    verification:
      - kind: other
        ref: "grep -c 'features/<domain>/actions/' >=2, 'lib/server/cookies' >=1, 'lib/core/theme' >=1, 'at most 1' present in Linting & formatting, superseded api/ sentence grep == 0"
        status: pass
      - kind: other
        ref: "pnpm format:check CONVENTIONS.md / pnpm lint"
        status: pass
    human_judgment: false
  - id: D4
    description: "A human confirmed the two-account shared-browser scenario in a real browser: DARK account renders dark pre-paint, sign-out leaves no theme cookie, LIGHT account renders light immediately after, and a manual toggle + hard-reload persists"
    requirement: FT-01
    verification:
      - kind: manual_procedural
        ref: "Task 4 checkpoint — human ran all 4 steps against http://localhost:3000 with fresh throwaway accounts against the real nonprod backend and reported 'works as expected' — approved"
        status: pass
    human_judgment: true
    rationale: "Pre-paint flash/no-flash and cross-account cookie leakage on a shared browser profile are visual/timing judgments no automated assertion in this repo currently covers end-to-end; the plan explicitly scopes this as a checkpoint:human-verify task."

duration: 119min
completed: 2026-08-20
status: complete
---

# Phase 02 Plan 05: Symmetric theme-cookie lifecycle Summary

**Sign-out now clears the theme cookie and sign-in/sign-up write it from the backend's own `identity.theme` on success only, closing the FT-01 shared-browser theme-leak gap; THEME-01's e2e spec and CONVENTIONS.md (PC-04/PC-05) were brought in line with the actual behavior and shipped shape.**

## Performance

- **Duration:** 119 min (13:34:45Z first commit → 15:33:42Z sign-off, including two checkpoint round-trips: the tracer/checkpoint's own human-verify wait, and a second round-trip diagnosing and fixing a false-negative sign-in failure caused by the checkpoint's own account-setup script, not by the shipped code)
- **Started:** 2026-08-20T13:34:45Z
- **Completed:** 2026-08-20T15:33:42Z
- **Tasks:** 4 (3 auto + 1 checkpoint:human-verify)
- **Files modified:** 8 (0 created)

## Accomplishments

- `signOutAction` calls `themeCookie.clear()` alongside `session.destroy()`, before the redirect, with a WHY-comment tying it to `app/layout.tsx`'s cookie-only pre-paint resolution.
- `signInAction`/`signUpAction` call `themeCookie.write(identity.theme)` immediately after `session.create(...)`, using the guarded upstream identity record — never `formData` — and only on the success path (verified by dedicated failure-branch unit assertions).
- `e2e/theme.e2e.spec.ts`'s THEME-01 scenario now asserts the theme cookie is absent from `document.cookie` right after sign-out, and that a post-sign-in reload's served HTML actually carries the `dark` scope — not just the toggle's `aria-checked` attribute (which is sourced from the session record and would have kept passing through the exact regression this plan closes).
- `CONVENTIONS.md`'s directory tree, Server Action placement rule, quick-reference table, and Linting & formatting section now match the code the project actually has: `lib/core/theme/`, `lib/core/cookies/`, `lib/server/cookies/`, `features/<domain>/actions/<name>.ts` (superseding the old "lives in `api/`" sentence), and the PC-05 1-3 line WHY-comment rule.
- A human verified the two-account shared-browser scenario end to end in a real browser against the real backend and approved.

## Task Commits

Each task was committed atomically:

1. **Task 1a: Add failing assertions for the symmetric theme-cookie lifecycle (RED)** - `b1c3545` (test)
2. **Task 1b: Make the theme-cookie lifecycle symmetric across sign-in/up/out (GREEN)** - `9012dfa` (feat)
3. **Task 2: Strengthen the THEME-01 e2e spec** - `9fc4afd` (test)
4. **Task 3: Bring CONVENTIONS.md up to date with PC-01..PC-05** - `7d4bd8d` (docs)
5. **Task 4: checkpoint:human-verify** - no commit (verification-only task); human reported "works as expected — approved"

**Plan metadata:** committed via `gsd-tools query commit` after this summary (see completion report).

## Files Created/Modified

- `src/features/auth/actions/sign-out.ts` - `themeCookie.clear()` added before `session.destroy()`
- `src/features/auth/actions/sign-out.unit.test.ts` - asserts `themeCookie.clear` called exactly once
- `src/features/auth/actions/sign-in.ts` - `themeCookie.write(identity.theme)` added after `session.create(...)`, success path only
- `src/features/auth/actions/sign-in.unit.test.ts` - asserts `themeCookie.write` called with the upstream theme on success, never on a rejection or validation failure
- `src/features/auth/actions/sign-up.ts` - same write, mirroring sign-in
- `src/features/auth/actions/sign-up.unit.test.ts` - same assertions, mirroring sign-in
- `e2e/theme.e2e.spec.ts` - Scenario 3 gains a post-sign-out cookie-absence poll and a post-sign-in served-HTML dark-scope assertion
- `CONVENTIONS.md` - directory tree, Server Action placement rule, quick-reference table, Linting & formatting section

## Decisions Made

- TDD RED was proven honestly: reverted the three action files with `git checkout -- <file>` (not `git stash`, which is prohibited in worktree mode since `refs/stash` is shared across sibling worktrees), ran the extended unit tests to confirm all 3 new assertions failed for the right reason (mock never called), then reapplied the implementation for GREEN.
- Chose to mock `@/lib/server/cookies/theme-cookie` directly in the three unit test files (as the plan's action text specified) rather than relying on the existing fake `next/headers` cookie jar, so each test asserts the exact call (`clear()`/`write(theme)`) instead of an indirect storage side-effect.
- Task 4's checkpoint account setup reuses `POST /signup`'s own session cookie for the DARK account's `PUT /users/me/theme` call instead of a separate `/signin` — `/signup` itself opens 1 of the backend's 2 concurrent-session slots, so a naive signup+signin setup exhausts both slots before the human's own sign-in, producing a false "invalid password" (see Issues Encountered). This is a setup-script correction, not a change to any shipped code path.

## Deviations from Plan

None — plan executed exactly as written. Task 1 followed the plan's specified RED→GREEN sequence; Task 2 and Task 3's edits match the plan's action text and all stated acceptance-criteria greps pass; Task 4 is the designed checkpoint.

## Issues Encountered

- **False "invalid password" during Task 4's first checkpoint attempt** — not a bug in `signInAction`/`signOutAction`. The real nonprod backend caps each account at 2 concurrent sessions, and `POST /signup` itself opens session 1 (confirmed by inspecting its `Set-Cookie` header directly). The original checkpoint setup called `/signup` (session 1) then a separate `/signin` to reach the authenticated `PUT /users/me/theme` endpoint (session 2) for the DARK account, exhausting both slots before the human's browser sign-in — a 3rd session request, correctly rejected by the backend with the same collapsed `BAD_CREDENTIALS` 401 a wrong password produces (the same anti-enumeration behavior `sign-in.unit.test.ts`/T-01-08 already documents). Diagnosed with a disposable throwaway account (signup → probe signins with delays up to 8s) before touching the real handoff accounts, root-caused precisely, then fixed by reusing signup's own session cookie for the theme `PUT` — verified the corrected mechanism on a disposable account first, then applied it to fresh handoff accounts without a redundant verification sign-in (which would have re-consumed the human's only remaining slot and reproduced the exact bug). Human then verified successfully on the first real attempt.
- **`pnpm test` (all Vitest projects run together) showed 5 flaky 15s timeouts** in `switch.stories.tsx`, `text-field.stories.tsx`, and `checkbox.test.tsx` — all `components/ui/` files untouched by this plan. Re-ran each in isolation (`pnpm test:browser -- checkbox`, `pnpm test:a11y -- switch text-field`) and both passed 100% (266/266, 76/76), confirming resource contention from running unit+browser+storybook Vitest projects concurrently in this sandbox, not a regression.
- **`pnpm test:e2e -- theme` cannot run in this worktree** — `e2e/global-setup.ts` requires `NONPROD_RESET_TOKEN`, unset (no `.env.local`; `.env*` files are permission-denied to read/write in this sandbox). Same pre-existing gap 02-01/02-03/02-04-SUMMARY.md already flag and defer to end-of-phase UAT. `pnpm build`/`pnpm exec tsc --noEmit`/`pnpm lint`/`pnpm exec prettier --check` all ran clean by supplying `SESSION_SECRET`/`EXTERNAL_API_BASE_URL` as inline env vars (not committed to `.env.local`, since that file is permission-denied in this sandbox).
- **`pnpm format:check` flags `.claude/settings.local.json`** — same pre-existing, untracked, out-of-scope file 02-01/02-03/02-04-SUMMARY.md already flagged. Left untouched.

## User Setup Required

None new — a real `.env.local` with `NONPROD_RESET_TOKEN`/`SESSION_SECRET`/`EXTERNAL_API_BASE_URL` is required to run `pnpm test:e2e`/`pnpm build`/`pnpm dev` locally without inline env vars, already tracked in STATE.md and prior plan summaries in this phase.

## Next Phase Readiness

- FT-01 (theme cookie survives sign-out) is closed; the prerequisite scope PC-01..PC-05 folded into Phase 2's wave sequence is now complete (PC-04/PC-05 finished here, PC-01..PC-03 in earlier waves per `02-CONTEXT.md`).
- Coverage D2 (real-backend e2e proof of the strengthened THEME-01 spec) is deferred to end-of-phase UAT with a working `NONPROD_RESET_TOKEN`, matching every prior plan's identical deferral in this phase — worth prioritizing early in that UAT pass given this plan's own checkpoint surfaced a real (if setup-side) session-budget trap that the actual Playwright spec's account-creation strategy should be double-checked against.
- No blockers for the next plan in the wave sequence.

---
*Phase: 02-board-management*
*Completed: 2026-08-20*

## Self-Check: PASSED

- FOUND: src/features/auth/actions/sign-out.ts (themeCookie.clear present)
- FOUND: src/features/auth/actions/sign-in.ts (themeCookie.write present)
- FOUND: src/features/auth/actions/sign-up.ts (themeCookie.write present)
- FOUND: e2e/theme.e2e.spec.ts (strengthened assertions present)
- FOUND: CONVENTIONS.md (PC-04/PC-05 edits present)
- FOUND commit: b1c3545
- FOUND commit: 9012dfa
- FOUND commit: 9fc4afd
- FOUND commit: 7d4bd8d
