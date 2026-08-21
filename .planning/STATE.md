---
gsd_state_version: 1.0
milestone: v1.0
current_phase: 02.1
current_phase_name: "Testing strategy overhaul and code-quality retrofit: no-mocking policy, curl-based e2e seeding, Storybook-driven component tests, plus deferred code-review fixes from 02-08 (INSERTED)"
status: executing
stopped_at: Completed 02.1-12-PLAN.md
last_updated: "2026-08-21T18:32:52.268Z"
last_activity: 2026-08-21
last_activity_desc: Wave 5 (02.1-10 curl-based e2e seeding CLI) merged, gated, e2e-verified, tracked
state_head: 8326175e040d52e73e0987d5a60eea8d7546a111
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 66
  completed_plans: 57
milestone_name: milestone
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-20)

**Core value:** A signed-in user can create boards, organize tasks across columns via
drag-and-drop, and trust that every change is reliably persisted and reconciled against the
real backend.
**Current focus:** Phase 02.1 — Testing strategy overhaul and code-quality retrofit: no-mocking policy, curl-based e2e seeding, Storybook-driven component tests, plus deferred code-review fixes from 02-08 (INSERTED)

## Current Position

Phase: 02.1 (Testing strategy overhaul and code-quality retrofit: no-mocking policy, curl-based e2e seeding, Storybook-driven component tests, plus deferred code-review fixes from 02-08 (INSERTED)) — EXECUTING
Plan: 11 of 15 (Waves 1-5 done; Wave 6 next)
Status: Ready to execute
Last activity: 2026-08-21 — Wave 5 (02.1-10) merged, gated, e2e-verified, tracked

Progress: Milestone v1.0 — 1/4 phases complete (Phase 1: 38/38 plans); Phase 02.1: 10/15 plans

## Performance Metrics

**Velocity:**

- Total plans completed: 38
- Average duration: n/a
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 38 | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: n/a

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 02.1 P12 | 55min | 3 tasks | 13 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: Auth mutations carved out to Server Actions (ADR tech/0017); boards/columns/tasks
  stay on TanStack Query per the original ADR tech/0002 — a deliberate split, not an oversight.

- Phase 1: No mock server anywhere — dev, every test layer, and CI all dial the real deployed
  nonprod backend (ADR tech/0018, supersedes tech/0004's MSW choice).

- Phase 1: `visual-baselines.yml` restricted to master-only dispatch and changed to open a PR
  (image-diff review) instead of committing screenshots directly, closing a previously-flagged
  unreviewed-overwrite risk.

- [Phase 02.1]: update-theme.ts's session-check-then-validate comment compressed to one sentence + docs/adr/tech/0019 pointer; every T-01-NN/T-02.1-NN threat identifier preserved verbatim through compression (plan 02.1-12)

### Pending Todos

- Investigate stricter Prettier config for React/Next.js formatting (and whether the real gap is
  ESLint rules instead) —
  `.planning/todos/pending/2026-08-19-investigate-stricter-prettier-config-for-react-and-next-js-f.md`.
  Not scoped to a phase yet.

- Fix path traversal in `scripts/serve-static.mjs` (Playwright visual webServer, dev/CI-only,
  low exposure) — `.planning/todos/pending/2026-08-20-fix-path-traversal-in-serve-static-visual-test-server.md`.

- Clear the theme cookie on sign-out (narrow shared-browser cross-account edge case, no data
  exposure) — `.planning/todos/pending/2026-08-20-clear-theme-cookie-on-sign-out.md`.

### Blockers/Concerns

- **01-33's no-JS submission must-have does not actually hold** — `sign-up-form.tsx`'s
  `formAction` wraps `useActionState`'s `dispatch` in a plain client closure, so React can't
  generate a real progressively-enhanceable POST target. Explicitly de-scoped by the user ("not
  sure that's needed in 2026") — see `01-33-SUMMARY.md` coverage D4 if ever revisited. Still
  live: not addressed by any later plan.

- Local `pnpm build` still fails without a real `SESSION_SECRET` in `.env.local` (pre-existing
  gap; CI and the deployed Vercel build are unaffected — CI generates its own secret, Vercel has
  per-environment secrets set). User was asked to run `vercel env pull --yes` to fix locally;
  unconfirmed whether that happened.

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Testing strategy overhaul and code-quality retrofit (no-mocking policy, curl-based e2e seeding, Storybook-driven component tests) plus deferred 02-08 code-review scope (URGENT)

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-21T18:32:52.024Z
Stopped at: Completed 02.1-12-PLAN.md

**This session:** Resumed from a HANDOFF.json pause mid-Wave-5, with one open question: whether
to set `NONPROD_RESET_TOKEN` (to unblock a real e2e Playwright run) or skip it. User resumed with
"NONPROD_RESET_TOKEN is set". Confirmed the token in `.env.local`, ran the full
`pnpm exec playwright test --project e2e` suite against the real nonprod backend (10 tests; 2
failed on the first full-suite pass, both confirmed flaky-under-parallel-load and passing cleanly
on isolated re-run — not a regression). Also re-ran `server-client.integration.test.ts`'s 3
real-backend tests directly (previously blocked by sandboxed-executor network egress) — all pass.
Closed WINDOWS.md ledger items 14 and 15 (both unrun-verify gaps, now verified). Completed Wave 5
tracking: `roadmap.update-plan-progress 02.1 02.1-10 complete`, STATE.md updated. Next: tracking
commit + push, then Wave 6 (02.1-11..14, comment-length sweep, 4 parallel plans), then Wave 7
(02.1-15, human-checkpoint plan), then phase close-out.

Resume file: None
Next step: dispatch Wave 6 — 4 parallel `gsd-executor` agents in worktree isolation for
02.1-11..14 (same pattern as Waves 1-5: capture HEAD, check intra-wave file overlap, dispatch,
merge, full post-merge gate, track, push).
