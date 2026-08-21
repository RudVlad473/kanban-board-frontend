---
gsd_state_version: 1.0
milestone: v1.0
current_phase: 02.1
current_phase_name: "Testing strategy overhaul and code-quality retrofit: no-mocking policy, curl-based e2e seeding, Storybook-driven component tests, plus deferred code-review fixes from 02-08 (INSERTED)"
status: executing
stopped_at: Phase 02.1 context gathered
last_updated: "2026-08-21T11:10:25.729Z"
last_activity: 2026-08-21
last_activity_desc: Phase 02.1 execution started
state_head: 0f55467cccfc1b260c395f7966768c7cf1c1c46c
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 66
  completed_plans: 46
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
Plan: 1 of 15
Status: Executing Phase 02.1
Last activity: 2026-08-21 — Phase 02.1 execution started
  to Phase 2. See Session Continuity below for full detail.

Progress: Milestone v1.0 — 1/4 phases complete (Phase 1: 38/38 plans)

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

Last session: 2026-08-21T09:04:20.319Z
Stopped at: Phase 02.1 context gathered

**This session:** Resumed with Phase 02 paused mid-checkpoint on plan 02-08 (Task 3, awaiting the
user's code-review comments). User gave a large batch of code-review feedback (App
Router/Server-Components question, project-wide no-mocking testing policy, RTL vs Vitest Browser
Mode for hooks, a typed reusable cookie client to replace `themeCookie`/`upstreamCookie`, an
abstract mock-entity-creation class, enum'd test constants, `isBoard`/`isBoardArray` placement,
OpenAPI-generated route constants, `boardDetail` naming) and explicitly deferred all of it to a
new inserted phase 2.1, choosing to close 02-08 first ("as-is") rather than implement any of it
now. Closed 02-08: wrote SUMMARY.md (capturing the deferred-2.1 scope in full), merged
`worktree-agent-aff6e55fca144924a` into master, removed the worktree, updated ROADMAP/STATE
tracking. Next: scope and insert Phase 2.1 (urgent decimal insertion) to carry this deferred
work plus the broader test-strategy overhaul (no-mocking outside Storybook, curl-based seeding,
Storybook-story-driven component tests, e2e limited to real happy-path business logic) applied
retroactively across Phase 1 and Phase 2.

Resume file: .planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-CONTEXT.md
Next step: `/gsd-discuss-phase 2` or `/gsd-plan-phase 2` to start Board Management (no CONTEXT.md
exists yet for Phase 2).
