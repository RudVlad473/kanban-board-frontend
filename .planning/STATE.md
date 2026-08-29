---
gsd_state_version: 1.0
milestone: v1.0
current_phase: 04
current_phase_name: Task & Subtask Workflow
status: executing
stopped_at: Plan 04-12 task 3 of 4 — keyboard-reorder regression open
last_updated: "2026-08-29T00:00:00.000Z"
last_activity: 2026-08-29
last_activity_desc: 04-12 tasks 1-3 cherry-picked onto phase branch; regression open
state_head: 4a5b4fc431f509b414604e4fdb94e052f2f6c858
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 114
  completed_plans: 101
milestone_name: milestone
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-22)

**Core value:** A signed-in user can create boards, organize tasks across columns via
drag-and-drop, and trust that every change is reliably persisted and reconciled against the
real backend.
**Current focus:** Phase 04 — Task & Subtask Workflow
cover board create + initial columns (BOARD-02), board detail view, rename, and delete.

## Current Position

Phase: 04 (Task & Subtask Workflow) — EXECUTING, wave 7 of 17
Plan: 04-12 (the tracer slice) — task 3 of 4, partial and RED
Status: Executing Phase 04
Last activity: 2026-08-29 — quick task 260829-kyv (regenerate OpenAPI contract from backend,
scope e2e reset cleanup to seeded user ids instead of full-db wipe) merged onto this branch;
04-12 tasks 1-3 remain cherry-picked onto the phase branch with the keyboard-reorder regression
still open

Progress: Milestone v1.0 — Phase 1: 38/38; Phase 02.1: 15/15; Phase 02.2: 9/9;
Phase 02: 15/15 (complete); Phase 03: 14/14 (complete); Phase 04: 11/22 (in progress)

## Performance Metrics

**Velocity:**

- Total plans completed: 92
- Average duration: n/a
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 38 | - | - |
| 02.1 | 15 | - | - |
| 02.2 | 9 | - | - |
| 02 | 16 | - | - |
| 03 | 14 | - | - |

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

Refreshed 2026-08-24 — the two Storybook-mock spikes were resolved this session and moved to
`.planning/todos/completed/`; this list now matches `.planning/todos/pending/` exactly (3 items).
**Not re-audited since** — `.planning/todos/pending/` now holds 7 items total (this prose lists a
subset); check the directory directly for the full, current list. Newest addition (2026-08-26):
`pnpm storybook`'s dev server crashes on any story reaching `session.ts` (pre-existing, found while
verifying phase 03 wave 4) —
`.planning/todos/pending/2026-08-26-storybook-dev-server-crashes-on-any-story-reaching-session-ts.md`.

- Trim `src/features/boards/schemas.unit.test.ts`'s rejection cases that just re-test zod's own
  primitives —
  `.planning/todos/pending/2026-08-21-trim-boards-schema-unit-tests-that-just-retest-zod.md`.

- Reopen the local pre-commit gitleaks investigation — CI-only secret scanning was a deliberate
  Phase 1 call (npm gitleaks wrappers rejected on supply-chain grounds); worth re-checking whether
  the tooling landscape has better options now —
  `.planning/todos/pending/2026-08-22-reopen-local-pre-commit-gitleaks-investigation.md`.

- Fold e2e seeding logic into a single service/module — `theme.e2e.spec.ts`'s
  `signUpDirectCapturingTheme()` duplicates `seed.ts`'s `seedAccount()` because the seed script
  doesn't return the `theme` field; also needs a design decision for seeding future entities
  (columns, tasks) as Phase 2+ lands —
  `.planning/todos/pending/2026-08-22-fold-e2e-seeding-logic-into-a-single-service-module.md`.

### Blockers/Concerns

- **RESOLVED 2026-08-24** — `pnpm comments:check` was red on `main` and CI *does* gate on it, so
  the `quality` job had been failing since 2026-08-22 (4+ consecutive runs), short-circuiting every
  step after it: API-types drift, Build, Test, and the whole `visual` and `e2e` jobs. Both comment
  violations compressed; confirmed green on CI in run 32740030630 (`quality` 2m8s, `secrets`,
  `visual` 2m54s, `e2e` 1m41s) — the first fully passing run since 2026-08-22, and the first time
  `visual`/`e2e` have executed at all in that window.

- **RESOLVED 2026-08-24** — the `text-field.test.tsx` flake was root-caused: it typed 200 chars at
  one driver round-trip each, overran the 15s `testTimeout` under contention, and Vitest could not
  cancel the in-flight keystrokes, which then typed into a *later* test (that test failed with
  `onValueChange` receiving `"x"` instead of `"a"`). Count cut to 60 against a measured 41-char
  overflow threshold; 0 failures in 8 full runs, from 2-in-6 before.

- `toast.test.tsx` races Base UI's 5s auto-dismiss — 1 failure in 8 `pnpm test` runs.
  `renderToastHarness` renders a bare `<ToastProvider>` while the `Default` story sets `timeout: 0`,
  so harness toasts vanish mid-test under load. Diagnosed but **not yet fixed** — one-line change
  plus a verification loop. See
  `.planning/todos/pending/2026-08-24-toast-harness-races-the-5s-auto-dismiss-under-load.md`.

- **01-33's no-JS submission must-have does not actually hold** — `sign-up-form.tsx`'s
  `formAction` wraps `useActionState`'s `dispatch` in a plain client closure, so React can't
  generate a real progressively-enhanceable POST target. Explicitly de-scoped by the user ("not
  sure that's needed in 2026") — see `01-33-SUMMARY.md` coverage D4 if ever revisited. Still
  live: not addressed by any later plan.

- **RESOLVED 2026-08-29** — local `pnpm build` no longer fails on a missing `SESSION_SECRET`.
  Verified this session: `pnpm build` exit 0 against the current `.env.local`.

- **PARTIALLY FIXED, still blocking plan 04-12** — 15 of 20 `board-view.test.tsx` failures fixed
  in `eb1b80a`: `createTaskAwareCollisionDetection`'s column-drag branch called `closestCenter(args)`
  unfiltered, so a column drag's `over` often resolved to a nearby task card instead of the
  neighboring column once tasks shared the same `DndContext`. 5 failures remain, all MOBILE-only
  keyboard reorders that need the row to scroll mid-drag — a separate, deeper root cause
  (`sortableKeyboardCoordinates` ignores any `currentCoordinates` a caller passes and reads
  dnd-kit's own stale `collisionRect` instead) diagnosed but not fixed; a first fix attempt
  regressed further (dnd-kit's own `over` started double-advancing on scroll-needed steps) and was
  reverted. Full diagnosis, the reverted attempt, and candidate directions:
  `.planning/todos/pending/2026-08-29-mobile-keyboard-column-reorder-past-fold-still-broken.md`.

- **RESOLVED 2026-08-29** — the sibling `kanban-board-backend` repo's targeted-user-delete reset
  route (commits `14dd89d`/`c29a32d`) was local-only, unpushed to its `origin/main`, when quick task
  260829-kyv's branch was created. Pushed this session (user-authorized); backend CI/CD deployed to
  nonprod cleanly and the live `/api/docs` now confirms the new two-route `/admin/reset` contract.
  ("backend still serves the old contract... must be redeployed") — not a regression to chase.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260829-kyv | Regenerate OpenAPI contract from backend and scope e2e reset cleanup to seeded user ids instead of full-db wipe | 2026-08-29 | 5f325f8 | Verified | [260829-kyv-regenerate-openapi-contract-from-backend](./quick/260829-kyv-regenerate-openapi-contract-from-backend/) |

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Testing strategy overhaul and code-quality retrofit (no-mocking policy, curl-based e2e seeding, Storybook-driven component tests) plus deferred 02-08 code-review scope (URGENT) — **complete** 2026-08-22, 15/15 plans, verified 22/22 D-IDs
- Phase 02.2 inserted after Phase 2: Follow-up from 02.1's own retrospective: unify component tests fully onto Storybook stories (delete renderWithProviders, move all providers into Storybook decorators, render composed stories directly instead of .run(), no play functions) — closes a live QueryProvider duplication between .storybook/preview-annotations.tsx and src/test-utils/render-with-providers.tsx — **pulled forward 2026-08-22**: `depends_on` changed from "Phase 2" to "Phase 1, Phase 02.1" so it now runs before Phase 2's remaining plans (02-10..13) instead of after full Phase 2 completion; still not yet planned
- Wave 9/10 inserted into Phase 02 after Wave 8 (2026-08-25, user decision recorded in
  `.continue-here.md` and `02-CONTEXT.md` D-27..D-30): `02-14-PLAN.md` (shared `RESULT_STATUS`
  enum across 18 files, `usehooks-ts` for boolean toggle state) and `02-15-PLAN.md` (`.tsx`
  declaration hygiene + composed-story test enforcement) — inserted so board detail/rename/delete
  (02-11/12/13, shifted to waves 11/12/13) are written against the replacement patterns, not
  three more instances of the ones being replaced. Phase 02 total: 13 → 15 plans.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-29
Stopped at: Plan 04-12 task 3 of 4 — cherry-pick complete, keyboard-reorder regression open

**This session (2026-08-29, `/gsd-resume-work`):** Resumed from the 2026-08-28 `HANDOFF.json`
pause at wave 7 / plan 04-12, task 3 of 4. Its blocking human action was the 04-12 resume strategy;
the user chose cherry-pick-then-re-dispatch.

Executed that path and verified each step rather than assuming it:

1. **Recovered the stranded work.** Three commits lived only on
   `origin/worktree-agent-a89cf10a707dfba36` — `8edb3eb` (task 1: move Server Action + schema),
   `92b3292` (task 2: task card, models, optimistic hook) and `d6e3664` (task 3, WIP). All three
   cherry-picked onto `gsd/phase-04-task-subtask-workflow` with no conflicts, landing as `54dbb03`,
   `1e43a9c`, `4a5b4fc`. Confirmed `git diff origin/worktree-agent-... HEAD -- src/` was empty
   before deleting the remote branch, so nothing was traded away for tidiness. No worktrees remain.

2. **Corrected a stale artifact.** The phase `.continue-here.md`'s `<current_state>` block still
   claimed task 3's edits "were discarded and no longer exist" — commit `0a609a2` had corrected
   `HANDOFF.json` and the Infrastructure State section but left that prose behind. It has been
   rewritten. `HANDOFF.json` is retired; its decision is consumed.

3. **Ran the gates.** `pnpm build` exit 0 — which also retires the long-carried "local build fails
   without `SESSION_SECRET`" concern. `pnpm test` exit 1: **20 failed / 1474 passed**, all in one
   file.

4. **Diagnosed the regression rather than deferring it.** Every failure is a keyboard column
   reorder in `board-view.test.tsx`, MOBILE and DESKTOP alike, with one signature — the announcement
   never advances past "Picked up …", so `expect.poll(getAnnouncement).not.toBe(...)` times out at
   line 193. Every pointer block still passes. This is precisely the regression 04-12's own
   must-have #3 predicted ("column drag is the thing most likely to regress here"). Prime suspect:
   `board-view.tsx` now wraps the announcer as `createTaskMoveAnnouncements({ columns, fallback:
   createColumnReorderAnnouncements({ columns }) })`, and a COLUMN drag's `onDragOver` may not be
   delegating to that fallback. Secondary: the new `active?.data.current?.type !==
   DRAG_ITEM_TYPE.COLUMN` guard at `use-column-drag-sensors.ts:47` — it falls through to
   `super.handleKeyDown`, so it should be harmless, but that assumes `props.context.current.active`
   is populated when the coordinate getter runs. `sortable-column.tsx:53` does declare the COLUMN
   data, so the plumbing itself is present.

The phase branch is pushed and matches origin. The tree is deliberately red at a WIP boundary:
task 3 is unfinished by definition and clearing these 20 tests is part of finishing it, not a
separate cleanup.

**Next:** finish 04-12 task 3 (fix the announcement regression, prove one cross-column drag end to
end), then its task-4 human-verify checkpoint, then `/gsd-execute-phase 04` from wave 8.
