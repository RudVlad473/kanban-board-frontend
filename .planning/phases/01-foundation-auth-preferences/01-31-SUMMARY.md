---
phase: 01-foundation-auth-preferences
plan: 31
subsystem: infra
tags: [ci, github-actions, nonprod-reset, real-backend]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences
    provides: real-backend integration (01-30) and the server-client integration test that dials nonprod from inside the quality job's `pnpm test` (01-32)
provides:
  - "A post-suite `POST /api/admin/reset` cleanup step in both `quality` and `e2e` — code is correct and pushed, but not yet proven green (see Checkpoint below)"
  - "A fix for a pre-existing, unrelated `quality`-job build failure (missing `SESSION_SECRET`) that was silently blocking every CI run on master before this plan"
affects: [01-33, 01-34, 01-35]

# Actuals (#2632)
actuals:
  tokens: 1000
  tasks: 1
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Workflow-scoped session secret generation (openssl rand -base64 32 via GITHUB_ENV), now used identically in both the quality and e2e jobs"

key-files:
  created: []
  modified:
    - .github/workflows/ci.yml

key-decisions:
  - "Task 2's reset step is added to both `quality` and `e2e`, not just `e2e` as the research's synthesized example assumed — `quality`'s `pnpm test` now runs `src/lib/api/server-client.integration.test.ts` (added by plan 01-32) inside the vitest 'node' project, which makes real authenticated calls against nonprod, so it creates rows/sessions exactly like `e2e` does. `visual` is left alone — it only ever serves a prebuilt Storybook static bundle."
  - "[Rule 3 - Blocking] Added a `Generate a workflow-scoped session secret` step to the `quality` job, mirroring the `e2e` job's existing pattern exactly. This is a pre-existing gap, not something this plan's own diff introduced — confirmed against a 2026-08-17 CI run, before this plan started, showing the identical `SESSION_SECRET is not set` failure. It blocked this plan's own acceptance criterion (a real green pipeline run) outright, so it was fixed inline rather than deferred."

requirements-completed: []

coverage:
  - id: D1
    description: "The reset step's YAML shape is correct: calls the reset route with X-Reset-Token from secrets.NONPROD_RESET_TOKEN, guarded by if: always(), checks the response against 204, no secret value ever appears literally in the file"
    requirement: "AUTH-01"
    verification:
      - kind: other
        ref: "node -e \"...\" static check against .github/workflows/ci.yml (the plan's own <verify> command) — passes"
        status: pass
    human_judgment: false
  - id: D2
    description: "A real pipeline run on the GitHub remote is green with the reset step executing successfully (204)"
    requirement: "AUTH-02"
    verification: []
    human_judgment: true
    rationale: "NOT achieved. Two live runs (32179518739, 32180145965) both show the reset step receiving 403 with an EMPTY X-Reset-Token header — secrets.NONPROD_RESET_TOKEN resolves to nothing at workflow runtime. gh api repos/RudVlad473/kanban-board-frontend/actions/secrets independently confirms total_count: 0 — no repository secret exists in this repo at all, despite the Task 1 checkpoint being resolved as \"done\" (user reported adding it and getting a manual 204). This is a genuine precondition-not-met situation discovered empirically after the checkpoint was already marked resolved, not a re-demand of the credential itself. See Checkpoint section below — a human needs to actually add the secret (or find out why the addition didn't persist) before this can be verified."

# Metrics
duration: ~35min
completed: 2026-08-18
status: halted
---

# Phase 01 Plan 31: Reset nonprod state after real-backend CI suites Summary

**The CI reset-step wiring for GC-23 is written, committed, and pushed — but the pipeline is NOT yet proven green, because the `NONPROD_RESET_TOKEN` GitHub Actions repository secret this plan's own precondition claimed was added does not actually exist in the repo (`gh api .../actions/secrets` reports zero secrets, and two live runs show the token header empty).**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-18T19:50:00Z (approx.)
- **Completed:** 2026-08-18T20:06:00Z (halted at checkpoint, not plan completion)
- **Tasks:** 1 of 2 (Task 1 was pre-resolved via checkpoint; Task 2's code is done, its own acceptance criterion — a green remote run — is not)
- **Files modified:** 1 (`.github/workflows/ci.yml`, across 2 commits)

## Accomplishments

- Added a `Reset nonprod state` step to the `quality` job (new — the plan's own research only anticipated `e2e` needing it, but 01-32's `server-client.integration.test.ts` runs inside `quality`'s `pnpm test` too) and to the `e2e` job (matching the research's synthesized pattern), each `POST`ing `https://kanban-board-rud-vlad-473-nonprod.duckdns.org/api/admin/reset` with `X-Reset-Token: ${{ secrets.NONPROD_RESET_TOKEN }}`, guarded with `if: always()`, and failing the job loudly (printing the received status) on anything but `204`.
- Left the `visual` job untouched — it serves a prebuilt Storybook static bundle only, never dials the real backend.
- Static verification (the plan's own `<verify>` command) passes: the header name, the secret reference, the route, the `always()` guard, and the `204` check are all present, and the token value never appears literally in the file.
- Discovered and fixed (Rule 3) a pre-existing, unrelated `quality`-job build failure that has been breaking every CI run on `master` since at least 2026-08-17 (well before this plan): `next build`'s page-data collection imports `session.ts` for each Route Handler, which throws when `SESSION_SECRET` is unset. Added a `Generate a workflow-scoped session secret` step mirroring the `e2e` job's existing pattern. This was necessary to get far enough into the pipeline to observe the reset step's own behavior at all.
- Pushed the branch (`worktree-agent-a234de1b618af7fe2`) directly to `origin` (not the merge target — a worktree-parallel executor doesn't own `master`) specifically so the workflow's `push`-branches-`["**"]` trigger would fire and produce a real, inspectable GitHub Actions run, per D-26c's "CI is not proven by a locally valid file" rule. Two runs were produced and inspected via `gh run watch`/`gh run view --log`.

## Task Commits

Each task was committed atomically:

1. **Task 2: Reset nonprod after every real-backend CI suite** - `1c85b4c` (feat) — the reset step itself, in both `quality` and `e2e`.
2. **[Rule 3 deviation, same task] Fix pre-existing quality-job SESSION_SECRET build gap** - `c4a3d92` (fix) — required to observe Task 2's own step actually execute.

**Plan metadata:** this commit (SUMMARY.md; STATE.md/ROADMAP.md are the orchestrator's to update after this worktree merges, per this plan's worktree-parallel execution mode)

## Files Created/Modified

- `.github/workflows/ci.yml` - adds the `Reset nonprod state` step to `quality` and `e2e`; adds `Generate a workflow-scoped session secret` to `quality` (Rule 3 fix)

## Decisions Made

- Reset step added to both `quality` and `e2e`, not just `e2e` — see key-decisions above; driven by reading `01-32-SUMMARY.md` and the current `vitest.config.ts` as the plan's own `<read_first>` instructed, rather than assuming the research synthesis's single-job placement.
- The pre-existing `SESSION_SECRET` build gap was fixed inline (Rule 3) rather than only logged to `deferred-items.md`, because — unlike the SCOPE BOUNDARY's usual carve-out examples (unrelated test files, unrelated components) — this gap directly and completely blocked verifying this plan's own stated acceptance criterion (a real green pipeline run). The fix reuses the exact, already-reviewed `e2e`-job pattern rather than inventing anything new.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `quality` job had no `SESSION_SECRET` at all, breaking every push to `master` for at least the prior day**
- **Found during:** Task 2's own verification — the first live CI run (`32179518739`)
- **Issue:** `pnpm build`'s Next.js page-data collection imports `session.ts` for each Route Handler (`/api/auth/signout`, `/api/auth/signin`, etc.), and `session.ts` throws unconditionally when `SESSION_SECRET` is unset (ADR tech/0001's deliberate "no default secret" policy). The `quality` job's workflow-level `env:` only ever set `EXTERNAL_API_BASE_URL`/`NEXT_TELEMETRY_DISABLED` — no `SESSION_SECRET` anywhere in that job. Confirmed via `gh run view` on a 2026-08-17 `master` run (`32069335666`, before this plan started) that this exact failure predates plan 01-31 entirely.
- **Fix:** Added a `Generate a workflow-scoped session secret` step to the `quality` job, identical to the `e2e` job's existing one (`echo "SESSION_SECRET=$(openssl rand -base64 32)" >> "$GITHUB_ENV"`), placed right before `Build`.
- **Files modified:** `.github/workflows/ci.yml`
- **Verification:** Second live run (`32180145965`) — `Build` and `Test` both go green (previously `Build` failed outright). This is the evidence, not an assumption.
- **Committed in:** `c4a3d92`

---

**Total deviations:** 1 auto-fixed (Rule 3, blocking).
**Impact on plan:** Necessary to observe Task 2's own reset step execute at all; without it the `quality` job never got past `Build`. No scope creep beyond `.github/workflows/ci.yml`, which is this plan's own `files_modified`.

## Issues Encountered

**The plan's Task 1 precondition is not actually satisfied, despite the checkpoint having been resolved as "done."**

The checkpoint resolution this executor was given states the user confirmed adding the `NONPROD_RESET_TOKEN` repository secret and that a manual `curl` against the backend's reset endpoint returned `204`. That manual test is not in question — it exercises the backend directly and doesn't touch this repository's GitHub configuration at all. What the two live CI runs and a direct GitHub API check both show, independently, is that **the secret does not exist in this repository as GitHub Actions consumes it:**

- Run `32179518739`: `Reset nonprod state` step's own logged command shows `-H "X-Reset-Token: "` — an empty value — and the endpoint responded `403` (the documented failure code for a wrong/absent token).
- Run `32180145965` (after the unrelated `SESSION_SECRET` fix, so the job got further): identical result — `X-Reset-Token: ` empty, `403`.
- `gh api repos/RudVlad473/kanban-board-frontend/actions/secrets` → `{"total_count":0,"secrets":[]}`. `gh secret list` (same underlying call) returns nothing. `gh api .../environments` → `{"total_count":0,...}`, ruling out an environment-scoped secret instead of a repository one.

This executor did not attempt to read, derive, or guess the secret's value — none of the above required that. It only observed that the GitHub-side half of Task 1 (adding the value as a repository secret via Settings → Secrets and variables → Actions) does not appear to have persisted, been saved to this repo, or is not visible to this authenticated `gh` session for some other reason. Per the plan's own `<precondition>` rule, an unmet precondition is never auto-approved — this is surfaced as a checkpoint below rather than silently proceeding to claim a green run that did not happen.

## User Setup Required

**Blocking — required before this plan can be marked complete:**

1. Go to `github.com/RudVlad473/kanban-board-frontend` → Settings → Secrets and variables → Actions.
2. Confirm whether `NONPROD_RESET_TOKEN` is actually listed there. (As of this run, `gh api repos/RudVlad473/kanban-board-frontend/actions/secrets` shows zero secrets of any name in this repo — so most likely it is genuinely absent, not just misnamed.)
3. If absent, add it again with the same `APP_RESET_TOKEN` value from the backend host's `.env.nonprod` (never commit it anywhere).
4. Once added, either re-run the existing pushed workflow run or push again — the code side of this plan (`.github/workflows/ci.yml`, commits `1c85b4c` and `c4a3d92`) is already correct and needs no further changes to pick it up.

## Next Phase Readiness

- The code change is complete, verified statically, committed, and pushed to `origin/worktree-agent-a234de1b618af7fe2` — nothing further to write.
- **This plan is NOT complete.** Its own `must_haves` explicitly requires "a real pipeline run on the GitHub remote, not... a locally valid workflow file" — that has not been achieved, twice, for a reason outside this executor's ability to fix (adding a GitHub repository secret requires the GitHub UI/an authenticated human, not just repo write access).
- Once the secret is genuinely present, a fresh executor (or the orchestrator) should re-trigger the workflow on this branch (or after merge) and confirm both `quality` and `e2e` go green with the `Reset nonprod state` step showing a real `204`, then update this SUMMARY's `status` to `complete` and its coverage `D2` entry accordingly.
- The `SESSION_SECRET` fix in `c4a3d92` benefits every other in-flight and future plan too — `master`'s `quality` job has been red on every push for at least a day; that fix should land regardless of this plan's own outcome.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-18 (halted at checkpoint — see Checkpoint/User Setup Required above)*

## Self-Check: PASSED

`.github/workflows/ci.yml` confirmed modified (reset steps + SESSION_SECRET fix present, static `<verify>` passes). Both commit hashes (`1c85b4c`, `c4a3d92`) confirmed present in `git log --oneline --all`. Both cited CI run IDs (`32179518739`, `32180145965`) confirmed retrievable via `gh run view` and both show the reported `403`/empty-header result — not assumed, directly observed.
