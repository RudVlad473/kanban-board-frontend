---
gsd_state_version: 1.0
milestone: v1.0
current_phase: 02.2
current_phase_name: "Unify component tests fully onto Storybook stories: eliminate renderWithProviders and hand-rendered tests, move every provider into Storybook decorators (closing the QueryProvider duplication between .storybook/preview-annotations.tsx and src/test-utils/render-with-providers.tsx), render every component test directly from composeStories() output instead of .run(), no play functions in stories (INSERTED, PULLED FORWARD)"
status: executing
stopped_at: Phase 02.2 context gathered
last_updated: "2026-08-22T16:43:43.033Z"
last_activity: 2026-08-22
last_activity_desc: Phase 02.2 execution started
state_head: d3465d8fe70c407ab88a5027b8c669928828eee1
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 75
  completed_plans: 62
milestone_name: milestone
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-22)

**Core value:** A signed-in user can create boards, organize tasks across columns via
drag-and-drop, and trust that every change is reliably persisted and reconciled against the
real backend.
**Current focus:** Phase 02.2 — Unify component tests fully onto Storybook stories: eliminate renderWithProviders and hand-rendered tests, move every provider into Storybook decorators (closing the QueryProvider duplication between .storybook/preview-annotations.tsx and src/test-utils/render-with-providers.tsx), render every component test directly from composeStories() output instead of .run(), no play functions in stories (INSERTED, PULLED FORWARD)
board create, board detail view, rename, delete — 02-09..13)

## Current Position

Phase: 02.2 (Unify component tests fully onto Storybook stories: eliminate renderWithProviders and hand-rendered tests, move every provider into Storybook decorators (closing the QueryProvider duplication between .storybook/preview-annotations.tsx and src/test-utils/render-with-providers.tsx), render every component test directly from composeStories() output instead of .run(), no play functions in stories (INSERTED, PULLED FORWARD)) — EXECUTING
Phase 02 (Board Management): PAUSED at Wave 8 (9 of 13 plans done; 02-10 not started)
Status: Executing Phase 02.2
explicit user decision, to resolve 4 pending testing-pattern todos before 02-10/02-12/02-13 add
more instances of the pattern under review (see `.continue-here.md` and `HANDOFF.json`)
Last activity: 2026-08-22 — Phase 02.2 execution started

Progress: Milestone v1.0 — 1/4 phases complete (Phase 1: 38/38 plans; Phase 02.1: 15/15 plans);
Phase 02: 9/13 plans (paused); Phase 02.2: 0 plans (not yet planned, next up)

## Performance Metrics

**Velocity:**

- Total plans completed: 53
- Average duration: n/a
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 38 | - | - |
| 02.1 | 15 | - | - |

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

- [Phase 02.1 close-out]: code review (02.1-REVIEW.md, 0 critical/2 warning/3 info) fixed rather
  than deferred — theme cookie name/max-age promoted to `cookie-registry.ts`'s single source of
  truth, `buildClientCookieString()` added as the `document.cookie` counterpart to
  `createCookieClient()`, both reusing `createBaseCookieOptions()`'s secure/sameSite/path policy.
  Generalized into a durable convention (CONVENTIONS.md): any structured delimiter-joined string
  built from named fields goes through one named builder once a second call site needs the same
  shape, never a repeated inline template literal.

### Pending Todos

- Investigate stricter Prettier config for React/Next.js formatting (and whether the real gap is
  ESLint rules instead) —
  `.planning/todos/pending/2026-08-19-investigate-stricter-prettier-config-for-react-and-next-js-f.md`.
  Not scoped to a phase yet.

- Trim `src/features/boards/schemas.unit.test.ts`'s rejection cases that just re-test zod's own
  primitives —
  `.planning/todos/pending/2026-08-21-trim-boards-schema-unit-tests-that-just-retest-zod.md`.

- Investigate a shared integration-testing/mocking module vs. the current per-action Storybook
  stub files in `src/test-utils/` — a barrel re-export was floated as a lighter-weight middle
  ground. Needs discussion with the user before deciding —
  `.planning/todos/pending/2026-08-22-investigate-a-shared-integration-testing-mocking-module-for-.md`.

- Regenerate stale `02-VALIDATION.md` and mark `02-RESEARCH.md`'s open questions resolved —
  `.planning/todos/pending/2026-08-22-regenerate-stale-02-validation-and-research-open-questions.md`.

- Reconcile the `*-action-storybook-stub.ts` whole-module aliasing with ADR tech/0020's no-mock
  policy — currently unenforced/undocumented as an exception, flagged by the user as a likely
  policy gap. Feeds Phase 02.2 —
  `.planning/todos/pending/2026-08-22-reconcile-action-stub-aliasing-with-the-no-mock-policy.md`.

- Research e2e coverage for cookie-writing behavior as an alternative to the `next/headers` mock
  shim (ADR tech/0020 D-19) used across 8 test files. Feeds Phase 02.2 —
  `.planning/todos/pending/2026-08-22-research-e2e-coverage-for-cookie-writing-instead-of-next-hea.md`.

- Investigate centralizing the repeated `vi.mock("next/headers"/"next/navigation")` declarations
  across the 8-file surviving-mock register into one shared module. Feeds Phase 02.2 —
  `.planning/todos/pending/2026-08-22-investigate-centralizing-vi-mock-declarations-for-next-heade.md`.

- Reopen the local pre-commit gitleaks investigation — CI-only secret scanning was a deliberate
  Phase 1 call (npm gitleaks wrappers rejected on supply-chain grounds); worth re-checking whether
  the tooling landscape has better options now —
  `.planning/todos/pending/2026-08-22-reopen-local-pre-commit-gitleaks-investigation.md`.

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

- Phase 02.1 inserted after Phase 2: Testing strategy overhaul and code-quality retrofit (no-mocking policy, curl-based e2e seeding, Storybook-driven component tests) plus deferred 02-08 code-review scope (URGENT) — **complete** 2026-08-22, 15/15 plans, verified 22/22 D-IDs
- Phase 02.2 inserted after Phase 2: Follow-up from 02.1's own retrospective: unify component tests fully onto Storybook stories (delete renderWithProviders, move all providers into Storybook decorators, render composed stories directly instead of .run(), no play functions) — closes a live QueryProvider duplication between .storybook/preview-annotations.tsx and src/test-utils/render-with-providers.tsx — **pulled forward 2026-08-22**: `depends_on` changed from "Phase 2" to "Phase 1, Phase 02.1" so it now runs before Phase 2's remaining plans (02-10..13) instead of after full Phase 2 completion; still not yet planned

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-22T15:42:37.108Z
Stopped at: Phase 02.2 context gathered

**This session:** Resumed from a HANDOFF.json pause at the Wave 7 (02.1-15) Task 3 human
checkpoint — user replied "approved". Ran the phase's post-execution gate in full:

1. **Code review** (`gsd-code-reviewer`, standard depth, 141 files): 0 critical, 2 warning, 3
   info (02.1-REVIEW.md, commit `9679a83`).

2. **Phase-goal verification** (`gsd-verifier`): independently re-checked all 22 D-01..D-22
   truths against the live codebase (not SUMMARY claims) — all verified. Routed to
   `human_needed` only for two process items: confirm the approval (already given) and decide
   fix-vs-defer on the 4 review findings.

3. **User chose "fix now"** — fixed all 4: promoted `THEME_COOKIE_MAX_AGE_SECONDS` into
   `cookie-registry.ts` alongside `COOKIE.THEME`; added `buildClientCookieString()` as the
   `document.cookie` counterpart to the existing server-side `createCookieClient()`, both
   sharing `createBaseCookieOptions()`'s secure/sameSite/path policy (closes WR-01/WR-02);
   corrected two stale `CONVENTIONS.md` claims and moved their todos to `completed/`
   (IN-01/IN-02). User separately asked for the fix to generalize into a durable convention —
   added a CONVENTIONS.md rule: any structured delimiter-joined string built from named fields
   goes through one named builder once a 2nd call site needs the same shape (commits `5f3b62b`,
   `eca3b5d`).

4. **VERIFICATION.md** updated to `status: passed` with a resolution note, then
   `phase.complete` run — ROADMAP.md/STATE.md advanced, PROJECT.md's Key Decisions table gained
   the 6 ADRs this phase produced (tech/0019-0024).

All commits pushed as fast-forwards (`c701467..19ee0ca`). Phase 02.1 is fully closed: 15/15
plans, 22/22 D-IDs verified, code review clean.

**Next:** Phase 2 (Board Management) has 8/13 plans done. Waves 7-11 (02-09..13) were flagged
stale (predated 02.1's RSC rebuild) and have now been fully replanned against the current
codebase — `gsd-planner` regenerated all 5, `gsd-plan-checker` verified them clean (BOARD-01..06
covered, dependency chain intact, all 02-REVIEWS.md findings incorporated). Two
documentation-hygiene items (stale `02-VALIDATION.md`, `02-RESEARCH.md`'s unmarked open
questions) filed as a pending todo, non-blocking. Phase 02.2 (Storybook test unification) is
inserted after Phase 2 but not yet planned (no CONTEXT.md).

**This session (WSL, resumed via `/gsd-resume-work`):** Reconstructed a stale `HANDOFF.json`
against actual git state — a fresh worktree-isolated `gsd-executor` had already applied plan
02-09's BUG A fix and 8b spec amendment in a *different* live worktree
(`agent-a738a127deda3ab5a`) than the handoff pointed at. Dispatched a new `gsd-executor` into
that worktree to finish Task 4 (re-verify all 8 checkpoint observations headlessly via Chrome
DevTools MCP, run full acceptance criteria, write `02-09-SUMMARY.md`); a sandbox guard forced it
into its own fresh worktree instead, so it fast-forward-merged the prior commits in rather than
editing the other worktree's git state directly. User approved the Task 4 checkpoint; the branch
was rebased onto current `main` (which had advanced with unrelated commits in the meantime) and
fast-forward merged — plan 02-09 is complete, 9/13 plans of Phase 02 done. Both worktrees and
their branches cleaned up after merging.

Also this session: added a `CLAUDE.md` rule requiring Playwright/Chrome DevTools MCP (headless)
for UI debugging instead of scratch scripts, after finding two leftover `*.tmp.mjs` debug
scripts in a worktree. Fixed two small duplications surfaced during a testing-architecture
discussion — `formDataToObject` (deduped into `src/test-utils/`) and `SkeletonRow` (extracted
into `src/components/ui/skeleton/`) — and captured three deeper open questions from that
discussion as todos feeding Phase 02.2's eventual planning (action-stub aliasing vs. the
no-mock policy, e2e-vs-mocked cookie coverage, centralizing `vi.mock` declarations). Added
`docs/kanban-task-management-web-app.pdf` (115MB Figma export) as a gitignored, local-only
reference file — over GitHub's 100MB limit, so never committed.

`HANDOFF.json` and both phase `.continue-here.md` checkpoint files removed as resolved/stale.

**This session:** Began dispatching Phase 02 Wave 8 (plan 02-10) — ISOLATION resolved to
`harness-worktree`, no worktree/agent actually spawned yet. User interrupted to ask about
alternatives to the action-stub and `renderWithProviders` test patterns; investigating surfaced
that this exact ground was already captured in the prior session as 4 dated pending todos plus
the Phase 02.2 ROADMAP insertion — nothing new needed researching from scratch. User then decided
(offered 3 scopes: resolve stub-aliasing only / resolve all 4 testing todos / pull full Phase
02.2 forward) to pull Phase 02.2 forward in full, ahead of Phase 02's remaining plans, rather
than let 02-10/02-12/02-13 add three more instances of the stub pattern under review.

Edited `.planning/ROADMAP.md`'s Phase 02.2 section: `depends_on` "Phase 2" → "Phase 1, Phase
02.1"; title marked "(INSERTED, PULLED FORWARD)"; Goal/Requirements rewritten to name the driving
todos; added a sequencing note. Verified via `roadmap milestone-scope` that the phase set is
unchanged (no accidental milestone-scope break). Wrote `.planning/HANDOFF.json` and
`.planning/phases/02-board-management/.continue-here.md` to record the pause.

Resume file: .planning/phases/02.2-unify-component-tests-fully-onto-storybook-stories-eliminate/02.2-CONTEXT.md
Next: `/gsd-discuss-phase 02.2` (no CONTEXT.md exists yet for 02.2).
