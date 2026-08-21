---
gsd_state_version: 1.0
milestone: v1.0
current_phase: 02.1
current_phase_name: "Testing strategy overhaul and code-quality retrofit: no-mocking policy, curl-based e2e seeding, Storybook-driven component tests, plus deferred code-review fixes from 02-08 (INSERTED)"
status: executing
stopped_at: Wave 6 complete (02.1-11..14), starting Wave 7
last_updated: "2026-08-21T22:00:00.000Z"
last_activity: 2026-08-21
last_activity_desc: Wave 6 (02.1-11..14 comment-length sweep) merged, gated, e2e+visual-verified, tracked
state_head: dcc0c40
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 66
  completed_plans: 60
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
Plan: 14 of 15 (Waves 1-6 done; Wave 7 next — human checkpoint)
Status: Ready to execute
Last activity: 2026-08-21 — Wave 6 (02.1-11..14) merged, gated, e2e+visual-verified, tracked

Progress: Milestone v1.0 — 1/4 phases complete (Phase 1: 38/38 plans); Phase 02.1: 14/15 plans

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

Last session: 2026-08-21T22:00:00.000Z
Stopped at: Wave 6 complete (02.1-11..14), starting Wave 7

**This session:** Resumed from a HANDOFF.json pause mid-Wave-5 (NONPROD_RESET_TOKEN question),
closed out Wave 5's tracking, then dispatched Wave 6 — 4 parallel `gsd-executor` agents
(02.1-11..14, the repo-wide comment-length sweep) in isolated worktrees. All 4 completed and
merged; 3 of 4 conflicted on files touched by more than one plan (`sidebar.stories.tsx`,
`sidebar.test.tsx`, `load-boards.integration.test.ts`, all resolved by combining both sides'
improvements) — the same cross-plan-overlap pattern Wave 3 hit. The post-merge gate then surfaced
two real gaps neither individual plan could have caught:

1. `scripts/check-comment-length.unit.test.mjs` asserted against `text-field.tsx`'s live 26-line
   comment block as a fixture — Wave 6 compressed that block by design, so the test regressed
   against its own retrofit's success. Fixed: replaced with a synthetic-source fixture.
2. `storybook-static/` was stale (built 2026-08-13, four days before the `isLoading` Button
   feature it was supposed to represent) — visual regression hung indefinitely on Button/IconButton
   "loading" stories waiting for a story root that didn't match the stale manifest. Not a Wave 6
   regression; fixed by rebuilding (`pnpm build-storybook`) before re-running. All 260 visual
   assertions and all 10 e2e tests then passed clean.

Also found and killed a runaway 3.4GB `tsserver` process — the editor had been indexing every
parallel worktree's full copy of the codebase (`.claude/worktrees/agent-*`) as a separate inferred
project. Fixed durably by excluding `.claude/worktrees` from `tsconfig.json`'s `include` set (plus
a local, gitignored `.vscode/settings.json` for the file watcher).

Wave 6 tracking (`roadmap.update-plan-progress` ×3 — 02.1-12 was self-tracked by its executor)
is done; this commit finishes it. Next: Wave 7 (02.1-15) — the phase's one `autonomous: false`
checkpoint plan (flips both policy gates from advisory to blocking, finishes CONVENTIONS.md's
Enforcement columns, full-suite sign-off) — requires human interaction, not a plain background
dispatch. Then post-execution: aggregate_results → code_review_gate → verify_phase_goal (spawn
`gsd-verifier`) → update_roadmap (phase.complete).

Resume file: None
Next step: read `02.1-15-PLAN.md`, re-read `execute-phase.md`'s checkpoint_handling step, and
dispatch Wave 7 as a human-interaction plan rather than a background `Agent()` call.
