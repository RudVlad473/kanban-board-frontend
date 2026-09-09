---
phase: 03-column-management
plan: 01
subsystem: infra
tags: [backend-probe, nonprod, optimistic-locking, reorder, node-esm]

requires:
    - phase: 02-board-management
      provides: scripts/probe-board-backend.mjs (account/cookie helpers, 2-session cap guard) and 02-BACKEND-FACTS.md's document shape
provides:
    - scripts/probe-column-backend.mjs — manual, never-CI'd probe answering R1-R7 against the deployed nonprod backend
    - .planning/phases/03-column-management/03-BACKEND-FACTS.md — currently recording BLOCKED; every R section reads NOT YET OBSERVED
    - A loud, exit-2 halt distinguishing a nonprod outage (database down, or host unreachable) from a code defect
affects: [03-07, 03-10, 03-11, 03-12, column reorder, duplicate column name handling]

actuals:
    tokens: 7154
    tasks: 2
    commits: 3

tech-stack:
    added: []
    patterns:
        - "Reachability preflight that exits 2 on both outage shapes (JDBC-pool 500 and transport connect failure) before any probe work runs"

key-files:
    created:
        - scripts/probe-column-backend.mjs
        - .planning/phases/03-column-management/03-BACKEND-FACTS.md
    modified:
        - .planning/WINDOWS.md

key-decisions:
    - "Recorded the outage as the observation rather than inventing answers — 03-BACKEND-FACTS.md carries no verdict on any of A1-A5"
    - "Used the exact string NOT YET OBSERVED in every R section, because 03-07 already branches on it"
    - "Widened the preflight halt to cover transport-level failure, not just the JDBC-pool 500 the plan named"

patterns-established:
    - "Probe scripts halt with a distinct exit code (2) for environment outages so an executor never reads them as a defect"

requirements-completed: []

coverage:
    - id: D1
      description: "scripts/probe-column-backend.mjs exists, parses, lints, formats, and is wired into no package script, test glob, or CI workflow"
      verification:
          - kind: other
            ref: "node --check scripts/probe-column-backend.mjs"
            status: pass
          - kind: other
            ref: "pnpm lint && pnpm format:check"
            status: pass
          - kind: other
            ref: "grep -c 'probe-column-backend' package.json => 0; grep -rc 'probe-column-backend' .github/workflows/ => no non-zero lines"
            status: pass
      human_judgment: false
    - id: D2
      description: "The probe halts loudly with exit code 2 on a nonprod outage instead of surfacing it as a code defect — for both a database-down 500 and a transport-level connect failure"
      verification:
          - kind: other
            ref: "node --env-file=.env.local scripts/probe-column-backend.mjs (14 runs, 2026-08-26 13:21Z-13:50Z): 10 printed 'nonprod DATABASE is down', 4 printed 'UNREACHABLE at the transport layer'; every run exited 2"
            status: pass
      human_judgment: false
    - id: D3
      description: "03-BACKEND-FACTS.md records the blocked state: a ## Status: BLOCKED section with the exact failures observed, R1-R7 sections all NOT YET OBSERVED, and no verdict against A1-A5"
      verification:
          - kind: other
            ref: "grep -E '^## ' on the file lists Status: BLOCKED + R1..R7 + Supersedes + Consequences; grep -c 'CONFIRMED|REFUTED' => 0"
            status: pass
      human_judgment: false
    - id: D4
      description: "The plan's actual objective — observed answers to R1-R7 that supersede 03-RESEARCH.md's Assumptions Log A1-A5 — is NOT delivered. The nonprod database was down for the entire window."
      verification: []
      human_judgment: true
      rationale: "Requires the deployed nonprod database to be back up. Nothing in this repo can produce the observations; a human must restore the backend (or wait for it) and re-run `node --env-file=.env.local scripts/probe-column-backend.mjs`."

duration: 31 min
completed: 2026-08-26
status: complete
---

# Phase 3 Plan 1: Column Backend Probe Summary

**A manual, never-CI'd column probe that answers R1-R7 against the real nonprod backend — written, verified, and run 14 times, every run halting at its reachability preflight because the nonprod database is down; 03-BACKEND-FACTS.md therefore records BLOCKED rather than invented answers.**

## Performance

- **Duration:** 31 min
- **Started:** 2026-08-26T13:21:52Z
- **Completed:** 2026-08-26T13:52:39Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 ledger append)

## Accomplishments

- `scripts/probe-column-backend.mjs` implements all seven probes (R1 reorder semantics, R2 version bump on shifted columns, R3 stale-version replay, R4 out-of-range/no-op `targetPosition`, R5 duplicate column name, R6 cascade delete + renumbering, R7 double delete), reusing `probe-board-backend.mjs`'s `signIn`/`extractSessionCookie` helpers and its two-concurrent-session guard verbatim.
- Every probe prints raw status codes and bodies rather than an interpretation, so the facts document records observations rather than conclusions.
- The reachability preflight halts with exit code `2` on a nonprod outage and names which outage it is, so no executor reads a 500 as a defect in this phase's code.
- `03-BACKEND-FACTS.md` records the outage as the observation: 14 attempts across ~28 minutes, both failure shapes quoted verbatim, every R section left as the exact string `NOT YET OBSERVED` that plan 03-07 already branches on, and no verdict recorded against A1-A5.

## Task Commits

1. **Task 1: Write scripts/probe-column-backend.mjs answering R1-R7** — `ad08233` (feat)
2. **Task 2: Record the observed answers in 03-BACKEND-FACTS.md** — `b1be118` (docs)

## Files Created/Modified

- `scripts/probe-column-backend.mjs` — 486-line manual Node ESM probe; seeds a throwaway account, one board and four columns, then runs R1-R7 and prints a traceability line (account email + board id) in a `finally`.
- `.planning/phases/03-column-management/03-BACKEND-FACTS.md` — the phase's backend-facts document, currently in its BLOCKED state.
- `.planning/WINDOWS.md` — entry 24 (`unrun-verify`, phase 03) so the missing observations stay visible at ship time.

## Decisions Made

- **Record the outage, invent nothing.** The plan's blocked branch is explicit, and `.planning/LEARNINGS.md`'s third lesson is precisely about not letting an assumption pass as a fact. No `CONFIRMED`/`REFUTED` verdict appears anywhere in the document.
- **`NOT YET OBSERVED` is a contract string, not prose.** `03-07`'s `<read_first>` tells its executor to check whether R5 "reads `NOT YET OBSERVED`", so the exact wording is load-bearing and is used verbatim in all seven sections.
- **The whole-row in-flight lock stays prescribed for 03-10.** `03-RESEARCH.md` Pitfall 6 calls it safe under either R2 answer; narrowing it remains gated on a real observation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Preflight now also halts on a transport-level failure**

- **Found during:** Task 1 (first probe runs)
- **Issue:** The plan specified the preflight only for the JDBC-pool `500`. Mid-session the nonprod host stopped accepting TCP connections entirely, and the unguarded `fetch` threw an uncaught `TypeError: fetch failed`, exiting `1` — which both fails Task 1's own `<verify>` (`test $? -ne 1`) and presents a network outage as a crash in this phase's code, the exact confusion the preflight exists to prevent.
- **Fix:** Wrapped the preflight `fetch` in a `try`/`catch` that prints `nonprod backend is UNREACHABLE at the transport layer — halting; this is not a code defect` plus the underlying error code, then `process.exit(2)`.
- **Files modified:** `scripts/probe-column-backend.mjs`
- **Verification:** Re-ran against the then-unreachable host — exit `2`, no stack trace. Later runs against the reachable-but-database-down host still print the `nonprod DATABASE is down` line, so the original path is intact.
- **Committed in:** `ad08233` (Task 1 commit)

**2. [Rule 3 - Blocking] Generated Next.js route types so `pnpm lint` could run**

- **Found during:** Task 1 (acceptance criterion `pnpm lint` exits 0)
- **Issue:** `pnpm lint` reported 3 `no-unsafe-assignment` errors in `app/(dashboard)/boards/[boardId]/page.tsx` — a file this plan never touches. Cause: a fresh worktree has no `.next/types`, so `PageProps<"/boards/[boardId]">` (a Next-generated global, referenced from `tsconfig.json`) resolves to an error type.
- **Fix:** Ran `pnpm exec next typegen`. No repository file changed — `.next/` is gitignored build output.
- **Files modified:** none (generated, gitignored)
- **Verification:** `pnpm lint` and `pnpm format:check` both exit 0 afterwards; `git status --short` shows nothing new.
- **Committed in:** n/a (no tracked file changed)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both were necessary to satisfy the plan's own acceptance criteria. No scope creep — the probe's behaviour on a healthy backend is exactly what the plan specified.

## Issues Encountered

**The nonprod database was down for the entire execution window, so R1-R7 have no answers.** This is the plan's designed BLOCKED branch, not a failure of this plan's code, but it means the plan's `must_haves` truths about `targetPosition` semantics, version bumps, duplicate-name refusal and delete renumbering are **not** met.

Evidence, from 14 attempts between 13:21Z and 13:50Z on 2026-08-26 (2 by hand, 12 on a 45-second retry loop):

- 10 attempts: `POST /signup -> 500`, `code: INTERNAL_ERROR`, detail `Unable to acquire JDBC Connection [HikariPool-1 … total=0, active=0, idle=0, waiting=2]`. The application layer serves requests; its database opens no connections at all.
- 4 attempts (13:33Z-13:37Z): `UND_ERR_CONNECT_TIMEOUT`. DNS resolved; TCP to port 443 timed out. The deployment went away entirely, then returned to the database-down state.

This is the same outage `03-RESEARCH.md` recorded earlier the same day, so it has now persisted across two independent sessions.

## User Setup Required

None — no external service configuration required. Re-running the probe needs only the existing `EXTERNAL_API_BASE_URL` in `.env.local` and a working nonprod database.

## Next Phase Readiness

**Ready:** The probe itself is finished and verified. The moment the nonprod database is back, one command produces every answer:

```bash
node --env-file=.env.local scripts/probe-column-backend.mjs
```

Its seven labelled blocks then replace the `NOT YET OBSERVED` lines in `03-BACKEND-FACTS.md`, and that file's `## Supersedes 03-RESEARCH.md A1-A5` and `## Consequences for plan 03-10 (reorder)` sections can be filled in.

**Blocked / gated:**

- **03-10 (reorder)** must stay held by its own `<precondition>` — `targetPosition` semantics (R1) and the version-bump question (R2) are both unobserved. `03-RESEARCH.md`'s A1/A2 are assumptions rated **High** risk, and sending `arrayMove`'s `to` verbatim on that basis is exactly the failure this plan exists to prevent. The whole-row in-flight mutation lock (Pitfall 6) remains the prescribed, answer-agnostic mitigation.
- **03-07 (add column)** is *not* blocked: its plan already instructs its executor to build the duplicate-name branch while R5 reads `NOT YET OBSERVED` and to report the branch's reachability as unconfirmed.
- Any e2e or `*.integration.test.ts` work in this phase will fail for the same reason until the database recovers.

Tracked as `.planning/WINDOWS.md` entry 24 (`unrun-verify`, phase 03) so the missing observations remain visible at ship time.

## Self-Check

- `scripts/probe-column-backend.mjs` — FOUND on disk, `node --check` exits 0.
- `.planning/phases/03-column-management/03-BACKEND-FACTS.md` — FOUND on disk, contains `## Status: BLOCKED` and `## R1` … `## R7`.
- Commit `ad08233` — FOUND in `git log`.
- Commit `b1be118` — FOUND in `git log`.
- Plan-level verification: `node --check` exits 0; `pnpm lint` exits 0; `pnpm format:check` exits 0; no `probe-column-backend` reference in `package.json` or `.github/workflows/`.

## Self-Check: PASSED

---

_Phase: 03-column-management_
_Completed: 2026-08-26_
