---
phase: 02-board-management
plan: 06
subsystem: testing
tags: [backend-probe, vitest, api-contract, access-control, optimistic-locking]

requires:
  - phase: 02-board-management
    provides: "features/<domain>/actions/, lib/server/cookies/upstream-cookie.ts, lib/core/api-contract/problem-detail.ts (02-01..02-05)"
provides:
  - "02-BACKEND-FACTS.md: literal observed answers to 02-RESEARCH.md's A1/A2/A3 and Open Questions 1-2, plus the Task 4 checkpoint's ordering and access-control decisions"
  - "scripts/probe-board-backend.mjs: reusable standalone diagnostic against the real nonprod backend (never wired into pnpm test/test:all/CI)"
  - "vitest.config.ts node project now collects every app/api/**/*.test.ts Route Handler test, not just the dead app/api/auth/** glob"
affects: [phase-02-board-management]

actuals:
  tokens: 7800
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Standalone probe scripts (scripts/*.mjs) that dial the real nonprod backend directly, sign each account in exactly once via a throwing signIn() helper, and print SESSIONS: <n> to make the session-budget constraint observable in output, not just in source"

key-files:
  created:
    - scripts/probe-board-backend.mjs
    - .planning/phases/02-board-management/02-BACKEND-FACTS.md
  modified:
    - vitest.config.ts
    - .planning/phases/02-board-management/02-VALIDATION.md

key-decisions:
  - "Ordering (D-12/D-13): reverse the fetched GET /boards array client-side for newest-first, per the Task 4 checkpoint (ordering-developer-choice) — GET /boards returns creation order (oldest-first), and reversing it is equivalent in output to a descending id sort for this backend's data, but keeps the sort anchored to the array the backend actually returns."
  - "Access control (P7): backend enforces board ownership server-side by session identity, independent of the client-supplied userId query parameter — confirmed by 403 ACCESS_DENIED on all three cross-account attempts including the one passing account A's own userId. Task 4's checkpoint (access-control-proceed) trusts this finding; no additional frontend ownership check is needed."
  - "A3 error shape: parseProblemDetail's shape is reusable verbatim for board 409s, but PROBLEM_CODE (src/lib/core/api-contract/problem-detail.ts) needs a new OPTIMISTIC_LOCK_CONFLICT entry — the real backend's stale-version response uses that code, which the current enum doesn't include."
  - "Board-name maxLength was not precisely pinned (only two data points tested: 0 chars and 1000 chars, both rejected) — recorded in 02-BACKEND-FACTS.md's Escalate section as a non-blocking follow-up rather than guessed at."

requirements-completed: [BOARD-01, BOARD-04]

coverage:
  - id: D1
    description: "scripts/probe-board-backend.mjs observes seven backend behaviours (P1-P7) against the real nonprod backend, signing each of 2 throwaway accounts in exactly once"
    requirement: BOARD-01
    verification:
      - kind: other
        ref: "node scripts/probe-board-backend.mjs (manual run, real backend) — exited 0, printed all seven labelled blocks ending with SESSIONS: 2"
        status: pass
    human_judgment: false
  - id: D2
    description: "02-BACKEND-FACTS.md records literal observed responses for P1-P7, a decisions table, the Task 4 checkpoint's final ordering/access-control decisions, and an Escalate section"
    requirement: BOARD-01
    verification:
      - kind: other
        ref: "grep -qE '^## (P1|P2|...|P7)' and grep -q Escalate and grep -c 'TBD|TODO|unknown' == 0, all pass"
        status: pass
    human_judgment: false
  - id: D3
    description: "vitest.config.ts's node project include glob widened to app/api/**/*.test.ts, proven by a throwaway collection-probe file collected and executed by pnpm test, then deleted"
    requirement: BOARD-04
    verification:
      - kind: unit
        ref: "pnpm exec vitest run --project node --reporter=verbose app/api/boards/collection-probe.test.ts (transient, deleted after proving collection) — 1 passed"
      - kind: other
        ref: "grep -c 'app/api/auth/\\*\\*/\\*.test.ts' vitest.config.ts == 0; grep -c 'app/api/\\*\\*/\\*.test.ts' vitest.config.ts == 1"
        status: pass
    human_judgment: false
  - id: D4
    description: "Full pnpm test suite green and pnpm lint clean after the glob widening"
    requirement: BOARD-04
    verification:
      - kind: unit
        ref: "pnpm test (all Vitest projects) — 43 test files / 456 tests passed on the confirming run"
        status: pass
      - kind: other
        ref: "pnpm lint — 0 errors"
        status: pass
    human_judgment: false
  - id: D5
    description: "Task 4 checkpoint decisions (ordering: reverse GET /boards client-side; access control: proceed) recorded in 02-BACKEND-FACTS.md for downstream plans to consume"
    requirement: BOARD-01
    human_judgment: true
    verification: []
    rationale: "The decisions themselves were made by the developer via the coordinator's checkpoint response, not derivable from automated verification — recording them faithfully is the deliverable, and a human already made the judgment call this task exists to gate."

duration: 35min
completed: 2026-08-20
status: complete
---

# Phase 02 Plan 06: Real-backend board probe and Vitest collection-glob fix Summary

**A standalone probe script observed the deployed nonprod backend directly, resolving three previously-unverified assumptions (board list order, id format, error-body shape) plus four more backend behaviours, and closed the Wave-0 gap that would have left every board Route Handler test silently uncollected by `pnpm test`.**

## Performance

- **Duration:** ~35 min (including a checkpoint round-trip for the Task 4 decision)
- **Started:** 2026-08-20T15:38:00Z (approx.)
- **Completed:** 2026-08-20T16:03:06Z
- **Tasks:** 4 (3 auto + 1 checkpoint:decision)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- `scripts/probe-board-backend.mjs` performs seven labelled observations (P1-P7) against the real deployed nonprod backend using exactly one sign-in per throwaway account (`SESSIONS: 2`), enforced by a `signIn` helper that throws on a repeat sign-in for the same email.
- `.planning/phases/02-board-management/02-BACKEND-FACTS.md` records every observation verbatim: `GET /boards` returns creation order (oldest-first); board ids are opaque 12-char alphanumeric tokens that string-sort in creation order; a stale-version `PUT` returns `409 OPTIMISTIC_LOCK_CONFLICT` (a code the current `PROBLEM_CODE` enum lacks); board-name validation rejects both empty and 1000-char names (exact `maxLength` not pinned); column-name validation enforces exactly 3-32 characters; sequential column creation produces strictly ascending `position`; and cross-account access is rejected with `403 ACCESS_DENIED` in all three attempts, including the one using the victim account's own `userId`.
- `vitest.config.ts`'s `node` project `include` glob was widened from the dead `app/api/auth/**/*.test.ts` (its Route Handlers were deleted in plan 01-33) to `app/api/**/*.test.ts`, proven by a throwaway `app/api/boards/collection-probe.test.ts` file that `pnpm test` collected and passed before being deleted. `02-VALIDATION.md` records this gap closed and sets `wave_0_complete: true`.
- The Task 4 checkpoint's decisions — reverse the fetched `GET /boards` array client-side for newest-first, and trust the P7 access-control finding to proceed — are recorded in `02-BACKEND-FACTS.md` for plan 02-08 onward to consume directly.

## Task Commits

Each task was committed atomically:

1. **Task 1: A probe script that observes the seven unresolved backend behaviours** - `bf7c98d` (feat)
2. **Task 2: Record the observed facts in 02-BACKEND-FACTS.md and mark the affected decisions resolved** - `1fcdf7c` (docs)
3. **Task 3: Make the Vitest node project collect board Route Handler tests** - `c047e33` (fix)
4. **Task 4: checkpoint:decision — record Task 4 decisions** - `e376b17` (docs)

**Plan metadata:** committed via `gsd-tools query commit` after this summary (see completion report) — skipped in worktree mode per orchestrator instructions (STATE.md/ROADMAP.md owned centrally).

## Files Created/Modified

- `scripts/probe-board-backend.mjs` - standalone Node ESM diagnostic against the real nonprod backend; P1-P7 observations, never wired into `pnpm test`/`test:all`/CI
- `.planning/phases/02-board-management/02-BACKEND-FACTS.md` - seven observation sections, decisions table, Task 4 checkpoint decisions, Escalate section
- `vitest.config.ts` - `node` project `include` glob widened to `app/api/**/*.test.ts`
- `.planning/phases/02-board-management/02-VALIDATION.md` - framework-install line ticked, config-glob gap recorded closed, `wave_0_complete: true`

## Decisions Made

- **Ordering (Task 4 checkpoint):** reverse the fetched `GET /boards` array client-side for newest-first, rather than a separate id-descending sort — equivalent output on this backend's data, simpler to reason about since it's anchored to the array the backend already returns.
- **Access control (Task 4 checkpoint):** the P7 finding (403 on all three cross-account attempts, including the one using the victim's own `userId`) is trusted; board plans proceed as written with no additional frontend ownership check.
- **A3 error shape:** `parseProblemDetail`'s shape is reusable verbatim for board 409s; `PROBLEM_CODE` needs a new `OPTIMISTIC_LOCK_CONFLICT` entry (not a board-specific parser) before board Route Handlers can recognize the real conflict code.
- **Board-name `maxLength`:** not precisely pinned by this probe run (only 0-char and 1000-char data points tested); recorded as a non-blocking Escalate item rather than guessed at — a conservative client-side bound is safe until a follow-up probe narrows it.
- **Vercel project linking (setup, not a plan task):** the worktree had no `.env.local`. An initial bare `vercel link --yes` (before adding `--project`) auto-created a stray Vercel project named after the worktree directory; this was detected via `vercel project ls` and removed with `vercel remove` before relinking correctly to `kanban-board-frontend` and running `vercel env pull --yes`. No stray project or config remains.

## Deviations from Plan

None — plan executed exactly as written. Tasks 1-3 followed the plan's action text and all stated acceptance-criteria commands/greps passed. Task 4's checkpoint (gate="blocking-human") was correctly not auto-approved; execution paused and returned the structured checkpoint to the coordinator, which supplied the developer's ordering and access-control decisions, now recorded in `02-BACKEND-FACTS.md`.

## Issues Encountered

- **Transient timeout in an unrelated pre-existing test.** The first `pnpm test` run reported one failure — `src/lib/server/server-client.integration.test.ts` timing out at 5000ms — while running all Vitest projects concurrently in this sandbox. Re-running that file in isolation passed in 7.52s, and a second full `pnpm test` run passed all 43 test files / 456 tests cleanly. This matches the same resource-contention flakiness pattern `02-05-SUMMARY.md` already documented (concurrent unit+browser+storybook Vitest projects in this sandbox), not a regression caused by this plan's glob change — the file touched (`server-client.integration.test.ts`) was not modified by this plan.
- **Stray Vercel project from an initial `vercel link --yes` without `--project`.** Detailed in Decisions Made above. Cleaned up before the probe ran; no lasting effect on the repository or deployment.

## User Setup Required

None — this plan's own Task 1 precondition (`EXTERNAL_API_BASE_URL` reachable) was satisfied by the executor via `vercel link --yes --project kanban-board-frontend` + `vercel env pull --yes .env.local`, both fully automated.

## Next Phase Readiness

- 02-RESEARCH.md's Assumptions Log entries A1, A2, A3 and Open Questions 1-2 are all closed with observed evidence.
- Board-name and column-name validation bounds are known (column: exact 3-32; board: `minLength: 1` confirmed, `maxLength` bounded but not exactly pinned — non-blocking).
- Board ownership is confirmed enforced server-side; plan 02-08 onward can proceed without an additional frontend ownership check.
- `PROBLEM_CODE` needs an `OPTIMISTIC_LOCK_CONFLICT` entry before board Route Handlers parse 409 responses correctly — flagged for whichever plan first builds a board mutation Route Handler.
- A Route Handler test under `app/api/boards/` will now be collected and executed by `pnpm test` — no further config changes needed for Phases 3-4's column/task handlers either.
- No blockers for the next plan in the wave sequence.

---
*Phase: 02-board-management*
*Completed: 2026-08-20*

## Self-Check: PASSED

- FOUND: scripts/probe-board-backend.mjs
- FOUND: .planning/phases/02-board-management/02-BACKEND-FACTS.md
- FOUND: vitest.config.ts (app/api/\*\*/\*.test.ts glob present)
- FOUND: .planning/phases/02-board-management/02-VALIDATION.md (wave_0_complete: true)
- FOUND commit: bf7c98d
- FOUND commit: 1fcdf7c
- FOUND commit: c047e33
- FOUND commit: e376b17
