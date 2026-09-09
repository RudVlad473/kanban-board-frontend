# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-09-09
**Phases:** 6 (1, 2, 02.1, 02.2, 3, 4) | **Plans:** 117 | **Sessions:** not tracked per-session in this project's summaries

### What Was Built
- Foundation: Next.js 16 + React 19 scaffold, a DTCG-token-driven design system, Server-Actions-based auth with no client-fetch layer, CI green on every push, deployed live to Vercel.
- Board, column, task and subtask CRUD across the full containment hierarchy, with drag-and-drop reordering/movement (dnd-kit) and optimistic updates with rollback throughout.
- Version-conflict (409) detection and reconciliation on every mutable resource — a stale write reverts, notifies the user, and re-reads from the server rather than silently overwriting.
- Every Server Action generated from one OpenAPI-driven transform, enforced by a blocking CI gate against hand-written doubles.

### What Worked
- Real-backend-only testing (ADR tech/0018, no mock server anywhere) caught real bugs mocks would have hidden — e.g. the 409 duplicate-board-name behavior (02-10), the description-clearing defect (Phase 3), and the sign-out cookie-clearing gap (02-05) were all found by dialing the live nonprod backend, not by asserting against a stub.
- Falsify-both-directions discipline (RED before the fix, GREEN after) caught a real production-only regression in the board-delete stranding fix (quick task 260907-q83): a `status: "pending"`-scoped filter passed in dev and reopened the exact bug once re-verified against `next build && next start`.
- The generated-Server-Action transform (04-10/04-11) eliminated a whole class of hand-written-double drift in one migration, then locked it shut with `pnpm actions:check` in CI rather than leaving it as a convention to remember.

### What Was Inefficient
- The optimistic-write mechanism took three ADR iterations to settle (tech/0029 → tech/0030 → tech/0036 amendment): two hand-rolled override mechanisms were built and deleted before the query-cache-based convention, and the four-responsibility ownership model that should have shipped with the first version arrived only after three separate hooks had each re-derived their own shape.
- 02-15's migration-debt estimate was scoped from one sampled file (nine call sites) and missed the true population by roughly 13x (121 direct renders across 10 files) once the gate ran repository-wide — the estimate was never checked against the actual tool before the plan committed to a number.
- The `next typegen`/`LayoutProps` stale-typegen false positive was independently hit and investigated as a "pre-existing, unrelated failure" in at least three separate plans (02-02, 02-09, 02.2-04) before `pnpm setup:worktree` was written to close it — each investigation reached the same correct conclusion at the cost of re-deriving it from scratch.

### Patterns Established
- Four-slot optimistic mutation convention (ADR tech/0036): every optimistic command accounts for the same four responsibilities, with `use-toggle-subtask.ts`/`use-move-task.ts` as the copyable exemplar.
- Playwright quality-verification fixture harness (ADR tech/0035): two always-on instruments (axe scan, layout-shift score) plus four opt-in ones, enforced by a lint rule so a spec cannot silently skip them.
- Direct composed-story JSX rendering for every component test (ADR tech/0025), closing the whole `composeStories().run()` pattern that hid the rendered tree from deep-interaction assertions.

### Key Lessons
1. When a footgun is hit twice by independent plans reaching the same "pre-existing, unrelated" conclusion, script it away on the second occurrence rather than the third — `pnpm setup:worktree` should have existed after 02-09, not after 02.2-04.
2. Before a plan commits to a migration's scope, run the actual enforcement tool repository-wide first — a single sampled file is not a population count, and the gap compounds (13x here) exactly when the plan's task budget is sized against the wrong number.
3. A shared mutation pattern used across more than one hook needs its ownership/shape convention written down at the SAME time as the mechanism ADR, not three iterations later — the gap is what gets re-paid by each new hook deriving its own shape.

### Cost Observations
- Model mix: not tracked in this project's phase/plan summaries.
- Sessions: not tracked as a discrete count; work spanned 2026-08-09 to 2026-09-08 (~30 days) across 1,275 commits.
- Notable: the generated-Server-Action transform (04-10/04-11) is the clearest efficiency win recorded — one 35-line config change replaced twelve hand-written doubles and closed a maintenance surface permanently via a CI gate, rather than a convention that would need re-enforcing by hand.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | not tracked | 6 (1, 2, 02.1, 02.2, 3, 4) | First milestone — established the real-backend-only testing philosophy, the DTCG/Style-Dictionary token pipeline, and the generated-Server-Action transform as standing conventions. |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | not centrally tracked as one number (unit + component + e2e across 20 `pnpm verify` gates) | diagnostic, not a gate (per PROJECT.md's Test pyramid constraint) | not tracked |

### Top Lessons (Verified Across Milestones)

1. Real-backend-only testing surfaces real defects mocks hide — confirmed repeatedly within v1.0 alone (409 duplicate-name, description-clearing, sign-out cookie gap); worth re-validating whether it still holds once a second milestone's data exists.
