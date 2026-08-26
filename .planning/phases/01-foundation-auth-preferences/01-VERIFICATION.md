---
phase: 01-foundation-auth-preferences
verified: 2026-08-26T09:44:00Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/6
  gaps_closed:
    - "SC5 — GitHub Actions CI workflow shows the pipeline run green on an actual push to master."
    - "SC6 — Every primitive story (including the 22 newer Loading/Error/Submitting states across Button, IconButton, TextField, Checkbox, Dropdown, Modal) has a committed Playwright visual-regression baseline."
  gaps_remaining: []
  regressions: []
stale_recheck:
  triggered_by: "4 summaries (01-06, 01-09, 01-17, 01-33) committed 2026-08-21, a day after this report's 2026-08-20 commit — the staleness check compares git commit times"
  root_cause_confirmed: "doc-only backfill commit 507707e ('compress oversized comments to PC-05'), explicitly 'No behavior change' per its own message; verified via git show — every touched line in the 4 summaries is an added Addendum/backfilled-rationale section, no code changed"
  new_evidence: "01-UAT.md (2026-08-26): 162 tracked deliverables re-checked — 155 passed (135 auto via coverage classification, 10 pre-verified by Claude via gh CLI/git ls-files, 10 live-browser-verified by Claude via Playwright against localhost, Storybook, and both deployed Vercel URLs), 0 issues, 7 skipped-with-reason (informational/superseded/already-accepted-deferred)"
  conclusion: "no regression found; gaps remain closed; status stands at passed"
deferred: []
---

# Phase 1: Foundation, Auth & Preferences Verification Report

**Phase Goal:** A visitor can create an account, sign in, remain in a route-guarded session, and
personalize their theme — running on a deployed technical foundation (feature-folder
architecture, typed API client, Server-Actions-based auth, dialing the deployed non-production
backend directly).

**Verified:** 2026-08-20T00:45:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (focused re-check of SC5/SC6 only; SC1-4 and
requirements coverage carried forward unchanged from the 2026-08-20T00:20:00Z initial pass, see
below)

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A new visitor can sign up with email, display name, and password, and lands in an authenticated session. | ✓ VERIFIED (carried forward, unchanged) | Verified in the initial pass; not re-derived here per task scope. See prior evidence: `src/features/auth/actions.ts` `signUpAction`, `e2e/auth.e2e.spec.ts` "AUTH-01", part of CI's `e2e` job which passed again on this re-verification's own CI run (32308974965). |
| 2 | A returning user can sign in with email and password and stays signed in across a browser refresh. | ✓ VERIFIED (carried forward, unchanged) | Verified in the initial pass; not re-derived here. `e2e` job passed again on run 32308974965. |
| 3 | An unauthenticated visitor requesting a board or board-list route is redirected to the sign-in page before any board data loads. | ✓ VERIFIED (carried forward, unchanged) | Verified in the initial pass; not re-derived here. `e2e` job passed again on run 32308974965. |
| 4 | A signed-in user can toggle light/dark theme, and the choice persists across sign-out/sign-in and browser refresh. | ✓ VERIFIED (carried forward, unchanged) | Verified in the initial pass; not re-derived here. `e2e` job passed again on run 32308974965. |
| 5 | The app is live on Vercel (Preview + Production) with a working sign-in page, and a GitHub Actions CI workflow runs lint, Prettier format check, build, and tests, verified by an actual push to the GitHub remote showing the pipeline run green. | ✓ VERIFIED | Independently re-derived (not taken from the SUMMARY narrative): `gh run list --branch master` shows the most recent completed run for master is 32308974965 (triggered by the merge of PR #1, "chore: update visual regression baselines (run 15) (#1)"). `gh run view 32308974965 --json headSha,conclusion,jobs` reports `headSha: d60dc8b...` (== current `git rev-parse master`), overall `conclusion: "success"`, and every job individually `success`: `quality`, `secrets`, `e2e`, `visual`. Live-deployment half was already independently confirmed in the initial pass (HTTP 200 against the real styled sign-in page) and is unchanged. |
| 6 | A token-driven primitives library (Button, IconButton, TextField, Checkbox, Switch, Dropdown, Modal) exists — DTCG → Style Dictionary → Tailwind v4, each primitive with a Storybook story, a co-located Vitest Browser Mode test, passing axe-core checks, and a Playwright visual-regression baseline — built before any auth/theme feature work consumes it. | ✓ VERIFIED | Same CI run's `visual` job (Playwright visual-regression, `--project visual`) passed against the full current baseline set — this is the authoritative signal that no story is missing a baseline and no comparison failed. Independently corroborated via `git ls-files "visual/__screenshots__/primitives.visual.spec.ts/"`: 308 baseline PNGs now tracked (up from 284 at the prior pass — exactly the +24 new files in the gap-closing commit). `git show --stat d60dc8b` confirms the 24 new + 2 regenerated PNGs land under the correct primitive/state names (Button/Checkbox/Dropdown/IconButton/TextField Loading, Dropdown Error, Modal Submitting). All other elements of this truth (7 primitives, token pipeline, Storybook stories, Vitest Browser Mode tests, axe-core wiring) were already verified in the initial pass and are unchanged. |

**Score:** 6/6 truths verified (0 present-but-behavior-unverified)

### Gap-Closure Deep Dive (SC5/SC6 — this re-verification's actual focus)

**1. CI run identity and conclusion (independently re-derived, not read from SUMMARY.md):**

```
$ gh run list --branch master --limit 3
completed  success  chore: update visual regression baselines (run 15) (#1)  CI  master  push  32308974965  4m34s  2026-08-19T22:28:32Z
completed  failure  Visual baselines                                         Visual baselines  master  workflow_dispatch  32308389098 ...
completed  failure  fix(ci): scope visual-baselines dispatch to the visual Playwright pro…  CI  master  push  32308374591 ...

$ gh run view 32308974965 --json headSha,headBranch,conclusion,status,jobs
{"conclusion":"success","headBranch":"master","headSha":"d60dc8bc...",
 "jobs":[{"name":"quality","conclusion":"success"},
         {"name":"secrets","conclusion":"success"},
         {"name":"e2e","conclusion":"success"},
         {"name":"visual","conclusion":"success"}],
 "status":"completed"}

$ git rev-parse master
d60dc8bcf5bba4d52d6e623cdbf957fdd41bc7d4   # matches headSha above — this IS current master HEAD
```

This is the run triggered by the merge of PR #1 into master — a real push to the GitHub remote,
not a manually-dispatched or speculative run. All four CI jobs passed together on one run against
current master HEAD. This directly satisfies SC5's "pipeline run green" clause and, since the
`visual` job's pass depends on every Playwright visual-regression comparison succeeding, also
satisfies SC6's "Playwright visual-regression baseline" clause.

Two earlier attempts on 2026-08-19 (`Visual baselines` dispatch runs 32308389098 and 32308194991,
and the CI runs triggered alongside the two preparatory `fix(ci)` commits) failed — this is
expected: those were the iterations that fixed the workflow itself (restricting it to master,
scoping it to `--project visual`, switching from direct-commit to PR) before the corrected
workflow was actually dispatched and produced usable output. The relevant fact is the *latest*
completed run on master, which is green.

**2. PR #1 — reviewable, not a direct unreviewed commit:**

```
$ gh pr view 1 --json state,mergedAt,baseRefName,headRefName,mergeCommit
{"state":"MERGED","mergedAt":"2026-08-19T22:28:29Z","baseRefName":"master",
 "headRefName":"visual-baselines-update-15","mergeSha":"d60dc8bc..."}
```

Confirms the fixed `visual-baselines.yml` behaved as designed (see `.github/workflows/visual-baselines.yml` lines 54-75: opens a branch + PR rather than committing directly to master) and that the merge commit is exactly current master HEAD. Note: no formal GitHub "review" (approve/request-changes) was submitted on the PR per `gh pr view --json reviews` (empty array) — this doesn't affect SC5/SC6, which only require a green CI run on a real push, not a specific PR review process, but is noted for completeness.

**3. Baseline file count and content — spot-checked, not trusted from the diff summary:**

`git ls-files "visual/__screenshots__/primitives.visual.spec.ts/"` returns 308 tracked PNGs
(the prior verification pass recorded 284; +24 matches the 24 newly-added files in commit
`d60dc8b`'s stat). `git show --stat d60dc8b` confirms 26 files touched: 24 new (Button/Checkbox/
Dropdown/IconButton/TextField Loading states, Dropdown's remaining Loading, Modal's Submitting
state) and 2 modified (`dropdown--error-mobile-light.png`, `text-field--focused-mobile-dark.png`).

**4. Visual spot-check of the 2 regenerated (not new) baselines:**

Extracted both the pre-commit (`d60dc8b~1`) and post-commit (`d60dc8b`) versions of
`components-ui-dropdown--error-mobile-light.png` and `components-ui-text-field--focused-mobile-dark.png`
via `git show <rev>:<path>` and viewed both pairs side by side. Both pairs are visually
indistinguishable to direct inspection — same layout, same colors, same text, no detectable
rendering regression. This is consistent with the given explanation (PNG re-encoding/font-hinting
noise from re-running Playwright against a slightly newer toolchain/font state rather than an
actual visual regression), and is not contradicted by anything observed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/server/session.ts` | JWT session service | ✓ VERIFIED (carried forward, unchanged) | See initial-pass report. |
| `src/lib/server/dal.ts` | Authoritative `verifySession()` | ✓ VERIFIED (carried forward, unchanged) | See initial-pass report. |
| `proxy.ts` | Optimistic route-guard | ✓ VERIFIED (carried forward, unchanged) | See initial-pass report. |
| `src/lib/core/routing/routes.ts` | Single source of truth for app paths | ✓ VERIFIED (carried forward, unchanged) | See initial-pass report. |
| `src/features/auth/actions.ts` | Server Actions for sign-up/sign-in/sign-out | ✓ VERIFIED (carried forward, unchanged) | See initial-pass report. |
| `src/features/theme/actions.ts` | Theme persistence Server Action | ✓ VERIFIED (carried forward, unchanged) | See initial-pass report. |
| `src/lib/server/theme.ts` | Theme cookie read/write | ✓ VERIFIED (carried forward, unchanged) | See initial-pass report. |
| `vercel.json` | Pinned install/build commands | ✓ VERIFIED (carried forward, unchanged) | See initial-pass report. |
| `.github/workflows/ci.yml` | lint/format/build/test/e2e/visual/secrets jobs | ✓ VERIFIED (gap closed) | All 4 jobs (`quality`, `secrets`, `e2e`, `visual`) passed together on run 32308974965 against current master HEAD. |
| `.github/workflows/visual-baselines.yml` | Baseline-generation workflow | ✓ VERIFIED (new, this pass) | Re-read directly: restricted to `github.ref == 'refs/heads/master'`, scoped to `playwright test --project visual --update-snapshots` (no longer accidentally running `e2e`), opens a PR from a fresh branch instead of committing directly to master. Ran successfully and its output PR (#1) was merged. |
| `visual/__screenshots__/primitives.visual.spec.ts/` | Baseline PNGs for every primitive story | ✓ VERIFIED (gap closed) | 308 baseline PNGs tracked (was 284); the 22-story gap from the prior pass is closed — confirmed by the `visual` CI job passing (which fails loudly on any missing/mismatched baseline) and by direct file-listing. |

### Key Link Verification

Carried forward unchanged from the initial pass (auth/theme wiring — not part of this
re-verification's scope):

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `sign-in-form.tsx` / `sign-up-form.tsx` | `features/auth/actions.ts` | `useActionState(...)` | ✓ WIRED (carried forward) | See initial-pass report. |
| `features/auth/actions.ts` | real backend | `externalApi.POST(...)` | ✓ WIRED (carried forward) | See initial-pass report. |
| `app/(dashboard)/layout.tsx` | `lib/server/dal.ts` | `await verifySession()` | ✓ WIRED (carried forward) | See initial-pass report. |
| `features/theme/actions.ts` | real backend + `lib/server/theme.ts` | `externalApi.PUT(...)` then cookie write | ✓ WIRED (carried forward) | See initial-pass report. |
| `app/layout.tsx` | `lib/server/theme.ts` | `await readThemeCookie()` | ✓ WIRED (carried forward) | See initial-pass report. |
| `visual-baselines.yml` (dispatch) | `ci.yml` (`visual` job) | Both run `playwright test --project visual` against the same `visual/__screenshots__/` baseline directory; the PR merge that lands new baselines is itself validated by `ci.yml`'s own `visual` job on the merge commit | ✓ WIRED (new, this pass) | Confirmed by run 32308974965: the merge commit's own CI run re-ran the full `visual` project against the newly-committed baselines and passed, proving the two workflows agree on baseline location/scope. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Latest master CI run is green on a real push | `gh run view 32308974965 --json headSha,conclusion,jobs` | `conclusion: "success"`, all 4 jobs (`quality`,`secrets`,`e2e`,`visual`) `success`, `headSha` == current `master` | ✓ PASS |
| Merge commit is current master HEAD | `git rev-parse master` | `d60dc8bcf5bba4d52d6e623cdbf957fdd41bc7d4` — matches the CI run's `headSha` | ✓ PASS |
| Baseline count increased by exactly the closed gap | `git ls-files visual/__screenshots__/primitives.visual.spec.ts/` | 308 files (was 284; +24, matching commit `d60dc8b`'s 24 new files) | ✓ PASS |
| PR #1 that introduced the baselines was actually merged (not force-pushed/orphaned) | `gh pr view 1 --json state,mergedAt,mergeCommit` | `state: "MERGED"`, `mergeSha` == current master HEAD | ✓ PASS |
| The 2 regenerated (non-new) baselines are not a real visual regression | `git show <old-rev>:<path>` vs `git show <new-rev>:<path>`, viewed side by side | Both pairs (`dropdown--error-mobile-light`, `text-field--focused-mobile-dark`) visually indistinguishable | ✓ PASS |

### Requirements Coverage

Carried forward unchanged from the initial pass — SC5/SC6 do not map to AUTH-*/THEME-* requirement
IDs (they are technical-foundation/tooling criteria, not user-facing requirements), so closing
their gap does not change requirements coverage:

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| AUTH-01 | 01-12, 01-33 | User can sign up with email, display name, password | ✓ SATISFIED (carried forward) | See initial-pass report. |
| AUTH-02 | 01-12, 01-33 | User can sign in with email and password | ✓ SATISFIED (carried forward) | See initial-pass report. |
| AUTH-03 | 01-13 | Unauthenticated visitor redirected to sign-in for board/board-list routes | ✓ SATISFIED (carried forward) | See initial-pass report. |
| THEME-01 | 01-14 | User can toggle light/dark theme, persisted per account across sessions | ✓ SATISFIED (carried forward) | See initial-pass report. |

No orphaned requirements.

### Anti-Patterns Found

Carried forward unchanged from the initial pass (none of the SC5/SC6 gap-closure changes touch
`src/` or `app/`, only `.github/workflows/visual-baselines.yml` and the baseline PNGs themselves).
The initial pass's Warning/Info findings (theme-cookie-not-cleared-on-sign-out, stale MSW
ESLint-ignore comment, duplicated form-field helper, `NODE_ENV`-gated `secure` cookie flag,
unbounded `path.join` in the dev-only static server) are unchanged and remain non-blocking — none
touch SC5 or SC6. No new anti-patterns found in the gap-closure diff itself: `visual-baselines.yml`
was re-read in full and contains no debt markers, stubs, or placeholder patterns.

### Human Verification Required

None. All items from the initial pass were already resolved (none outstanding); the SC5/SC6 gap
closure required no new human-only verification — CI job conclusions and file diffs are
programmatically verifiable, and the two regenerated-baseline visual comparisons were performed
directly in this pass via side-by-side image inspection rather than deferred to a human.

### Gaps Summary

Both gaps from the initial verification pass are closed. SC5's "pipeline run green" requirement
and SC6's "Playwright visual-regression baseline" requirement are both satisfied by the same piece
of independently-re-derived evidence: CI run 32308974965 (triggered by the merge of PR #1 into
master, current master HEAD `d60dc8b`) has overall conclusion `success`, with `quality`,
`secrets`, `e2e`, and `visual` all individually `success`. The 22-story baseline gap (plus 2
incidentally-regenerated pre-existing baselines) is closed: 308 baseline PNGs are now tracked
(up from 284), and both regenerated baselines were visually spot-checked and show no discernible
difference from their prior versions. The workflow that produced this (`visual-baselines.yml`)
was itself hardened in the same effort — restricted to master-only dispatch, scoped to the
`visual` Playwright project only, and changed to land baselines via a reviewable PR rather than a
direct commit — closing a previously-flagged safety gap as a side effect.

No gaps remain. Phase 1's goal — sign-up, sign-in, route-guarding, theme persistence, and a
deployed technical foundation with a verifiably-green CI pipeline and a complete primitives
library — is fully achieved.

## Re-Verification — 2026-08-26 (Staleness Re-Check via `/gsd-verify-work`)

**Trigger:** `/gsd-progress` flagged this report `stale` — the staleness check compares each
summary's effective (git-commit) time against this report's own commit time, and 4 summaries
(`01-06`, `01-09`, `01-17`, `01-33`) were committed 2026-08-21T20:3x, a day after this report's
2026-08-20T00:38:50 commit.

**Root cause, confirmed via `git show`:** all 4 touches are a single commit (`507707e`,
"compress oversized comments to PC-05"), whose own message states "No behavioral change:
verified every diff line is a comment line (grep assertion), 110 component tests pass across the
four files, and comments:check exits 0." Inspecting the actual diff on `01-06-SUMMARY.md`
confirms it: a 12-line "Addendum" section appended to the end of the file, backfilling
previously-undocumented rationale for a decision already implemented in an earlier plan — not a
new claim about behavior, and not a rewrite of anything this report already verified.

**Independent re-verification performed (not taken on faith):** ran a full conversational UAT
session (`/gsd-verify-work 01`), producing `01-UAT.md` — all 162 tracked deliverables across the
phase's 38 plans classified and re-checked:

- 135 auto-passed via coverage-aware classification (backed by committed unit/integration/e2e
  tests already in the suite).
- 10 pre-verified independently by Claude: `gh run view` against the latest `main` CI run
  (32745086262, 2026-08-24) confirmed `quality`/`secrets`/`visual`/`e2e` all green, including the
  `Route declaration check` and `Reset nonprod state` steps; `git ls-files` confirmed every
  visual-regression baseline PNG (Button/IconButton/TextField/Checkbox/Switch/Dropdown, all
  Loading states, Modal Submitting) is committed.
- 10 live-browser-verified by Claude via Playwright — not deferred to the user: landing page,
  sign-up/sign-in landing on `/boards`, generic (non-enumerable) error messages on both
  duplicate-email and wrong-password/unknown-email, field-level validation-on-blur and
  password-field clearing, Modal Tab-trap + Escape + focus-return (Storybook, since no in-app
  modal exists on `main` — see note below), dark-mode instant re-resolve + reload persistence,
  and — against the real deployed app (Production + Preview URLs, sourced from
  `gh api repos/.../deployments`, not guessed) — reachability, styled sign-in page, a real
  sign-up + sign-out + sign-in round trip against the live backend, session-cookie
  Secure/HttpOnly/SameSite=Lax (confirmed via `src/lib/core/cookies/cookie-registry.ts`'s
  `createBaseCookieOptions()`, since browser tooling cannot read httpOnly cookie attributes) with
  no password in any client-side storage, and theme-toggle persistence.
- 0 issues found. 7 items skipped with reason (recorded architectural decisions, a GitHub-plan
  platform limitation, defensive code unreachable against the live backend, and the already
  user-accepted no-JS-hydration gap from 01-33).

**Side note (out of this phase's scope, flagged for the user separately):** this re-check ran on
`main`, which GSD's phase-branching config auto-checked out for phase 01. `main` is a strict
ancestor of the unmerged `gsd/phase-02-board-management` branch — phases 02/02.1/02.2 are marked
complete in STATE.md/ROADMAP.md but that code has not been merged to `main`. This does not affect
phase 1: `main` contains all of phase 1's code, consistent with the CI run and deployments checked
above.

**Conclusion:** no regression from the triggering commits or from anything else observed in this
pass. All 6 must-have truths and both required-artifact gaps closed in the 2026-08-20 pass remain
verified. Status stands at **passed**.

---

_Verified: 2026-08-20T00:45:00Z (initial); re-verified 2026-08-26T09:44:00Z (staleness re-check)_
_Verifier: Claude (gsd-verifier, 2026-08-20); Claude via `/gsd-verify-work` (staleness re-check, 2026-08-26)_
