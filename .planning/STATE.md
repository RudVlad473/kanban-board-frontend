---
gsd_state_version: 1.0
milestone: v1.0
current_phase: 04
current_phase_name: Task & Subtask Workflow
status: executing
stopped_at: Plan 04-22 tasks complete; awaiting the blocking human phase sign-off checkpoint
last_updated: "2026-09-02T12:32:39.074Z"
last_activity: 2026-09-02
last_activity_desc: Plan 04-22 close-out complete; awaiting human phase sign-off
state_head: c0ab07e41dd5ce9d946af6210940848ecf15f2b8
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 114
  completed_plans: 114
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

Phase: 04 (Task & Subtask Workflow) — EXECUTING
Plan: 22 of 22 — all three tasks complete; `04-22-SUMMARY.md` written.
Plan 04-22's final `checkpoint:human-verify` gate is open and blocking.
Status: Awaiting human phase sign-off
Last activity: 2026-09-02 — Plan 04-22 close-out complete; awaiting human phase sign-off

Progress: Milestone v1.0 — Phase 1: 38/38; Phase 02.1: 15/15; Phase 02.2: 9/9;
Phase 02: 15/15 (complete); Phase 03: 14/14 (complete); Phase 04: 22/22 (awaiting sign-off)

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
| Phase 04 P13 | 55min | 3 tasks | 6 files |
| Phase 04 P14 | 70min | 3 tasks | 6 files |

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

- [Phase 04, plan 13]: `createTaskMoveAnnouncements`'s `onDragOver` was fixed to distinguish
  within-column ("moved to position {i} of {N} in {Column}") from cross-column ("moved to
  {Column}, position {i} of {N}") wording, per 04-UI-SPEC's Copywriting Contract — a real bug,
  not a plan deviation, found while writing browser test coverage.

- [Phase 04, plan 13]: `useTaskDragSensors` ships a plain, unguarded `KeyboardSensor` rather than
  importing `use-column-drag-sensors.ts`'s guarded one — D-15 forbids the cross-feature import,
  and it is unneeded: that hook's guard already falls through to the plain library handler for a
  TASK drag. `board-view.tsx`'s shared `DndContext` keeps using `useColumnDragSensors()` alone.

- [Phase 04, plan 14]: a browser test recovering a drag pointer's position after a hold-and-hover
  MUST re-read the element's current position (`centerOf(source)`) rather than reuse a pre-drag
  point — an intervening auto-scroll (Pitfall 8) moves the element on screen; reusing the stale
  point produced a real, deterministic MOBILE-only flake in two new browser cases.

- [Phase 04, plan 14]: a decorative Storybook backstop story (ADR tech/0025) that reproduces a
  transient drag-only visual state (e.g. `opacity-50` lifted treatment) must narrow its OWN
  fixture rather than suppress a resulting axe failure — D-21 forbids per-story a11y suppression.
  The `Lifted` story's caption-contrast failure was a real, previously-unexercised defect in the
  shipped `isDragging` treatment, not a testing artifact.

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

- **RESOLVED 2026-09-01 (`252c5b3`)** — the `sortable-column.test.tsx` reorder-rollback failure that
  put `81568db`'s `useOptimistic` column-reorder refactor "under suspicion" was a **test-side race**,
  not a regression. `useReorderColumns` raises the toast inside the transition's async body, but
  `useOptimistic` drops the optimistic order only when the transition *completes*; the test polled
  for the toast then read the order synchronously. `board-view.test.tsx:1423` covers the same
  production path, already polls, and has never flaked — that sibling is the proof. Both rollback
  cases now poll. Six consecutive green full runs (3 pre-fix, 3 post-fix), 1659/1659 each;
  tsc/lint/comments:check clean; negative control fails by timeout in both device variants.

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

- **RESOLVED (confirmed 2026-09-02 in 04-22)** — `toast.test.tsx`'s race with Base UI's 5s
  auto-dismiss is fixed: `toast.test.tsx:52` renders `<ToastProvider timeout={0}>`, matching the
  `Default` story, so harness toasts no longer vanish mid-test under load. The todo is in
  `.planning/todos/completed/`, alongside the dropdown `Disabled` hang. This entry had read "not yet
  fixed" since 2026-08-24; the close-out audit found the fix already shipped.

- **01-33's no-JS submission must-have does not actually hold** — `sign-up-form.tsx`'s
  `formAction` wraps `useActionState`'s `dispatch` in a plain client closure, so React can't
  generate a real progressively-enhanceable POST target. Explicitly de-scoped by the user ("not
  sure that's needed in 2026") — see `01-33-SUMMARY.md` coverage D4 if ever revisited. Still
  live: not addressed by any later plan.

- **RESOLVED 2026-08-29** — local `pnpm build` no longer fails on a missing `SESSION_SECRET`.
  Verified this session: `pnpm build` exit 0 against the current `.env.local`.

- **RESOLVED 2026-08-29 (in 04-12)** — the 5 remaining MOBILE-only `board-view.test.tsx` keyboard
  reorder failures (of the 20 first found; 15 were fixed in `eb1b80a`) were fixed by disabling the
  column-body and task-card droppables outside their own drag kind, adopted from the stranded
  worktree `worktree-agent-ae6e78084fa8fe8f8` and merged as `b0b141f`. `board-view.test.tsx` was
  126/126 with zero skips as of 04-12's close, and remains so through 04-13 (now 148/148 with the
  new keyboard-path coverage this plan added). The todo this entry pointed at is closed.

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

Last session: 2026-09-02
Stopped at: Plan 04-22's three tasks complete; the blocking human sign-off checkpoint is open

**2026-08-29 session (`/gsd-resume-work`):** Recovered 04-12's three stranded worktree commits by
cherry-pick, then diagnosed and fixed the resulting MOBILE keyboard column-reorder regression
(root cause: `sortableKeyboardCoordinates` walks the droppable registry directly, so scoping only
the collision function left cross-kind droppables enabled). Merged as `b0b141f`; also re-derived
the project-wide radius scale after the tracer's checkpoint found a wrong DPI divisor. 04-12 closed
at `159fef8` with `board-view.test.tsx` 126/126, zero skips. Full narrative: `04-12-SUMMARY.md`.

**This session (2026-08-30):** Executed `04-13-PLAN.md`. Found most of its described production
work already shipped as a side effect of 04-12's regression fix (the move action's
`targetPosition`, T3's index math, within-column reorder wiring, the dead-control gate, and the
Pitfall-8 keyboard-sensor guard). Added the missing artifact (`useTaskDragSensors`), fixed one
genuine announcement-wording bug (RED `0bfca21` → GREEN `b9f4e91`), and added 21 browser cases plus
2 e2e cases proving the keyboard path end to end, including under `--repeat-each=3 --workers=2`
contention. All gates green: `pnpm test` 1529/1529, `pnpm lint`/`tsc`/`build` clean. Full
narrative: `04-13-SUMMARY.md`.

**This session (2026-08-30, resumed):** Picked up `04-14-PLAN.md` mid-plan after a prior session
died. Task 1 was already committed (`5b75d60`, test-only — production already shipped by 04-12).
Task 2's WIP was uncommitted and green but incomplete: reviewed it, added the empty-column half of
S-08's drop indicator (`isEmptyBodyInsertionPoint`), fixed a genuine MOBILE-only browser-test flake
(Pitfall 8 auto-scroll not accounted for in the drag-hold-and-return test helper) and a real axe
color-contrast defect the new `Lifted` story exposed in the shipped `isDragging` treatment,
compressed several comment-length violations, then committed as `9d81673`. Task 3 (SYNC-01) found
the production conflict branch already shipped (04-12); added the missing browser coverage proving
revert/toast/no-client-re-read together, committed as `293f1cc`. All gates green: `pnpm test`
1552/1552, `pnpm build`, `pnpm test:a11y` 217/217, visual 300/300 (no baseline changes — feature-
ring, out of visual-regression scope), e2e 46/46 (the full project ran instead of the intended
scoped `tasks-move.e2e.spec.ts` — a `--` filter-syntax mistake, harmless but noted). Full
narrative: `04-14-SUMMARY.md`.

**This session (2026-09-01, `/gsd-resume-work`):** Resumed from `HANDOFF.json`. Settled the one open
correctness question from the previous session: the `sortable-column` reorder-rollback failure was a
test race, not a regression from `81568db`'s `useOptimistic` rewrite — proved by the never-flaking
polled sibling in `board-view.test.tsx:1423`, by six consecutive green full runs, and by a negative
control that fails by timeout. Fixed test-only in `252c5b3`.

**This session (2026-09-01, `/gsd-resume-work`, 2nd):** Finished the board-detail migration the
previous session paused half-done. `BoardView` reads one `["board", boardId]` entry hydrated by
`dehydrateBoard()`, and the rename/reorder/move hooks all write it — the three-hook `columns` chain
is gone, as are `useOptimisticVariables` and both `apply*Pending*` folds. Two real defects fixed
rather than typed around: `onSuccess` was assigning tasks-less/subtask-less mutation responses over
`ColumnFull`/`TaskFull` (dropping tasks and subtasks), and `buildBoardQueryKey` was `"use client"`
where `dehydrateBoard()` calls it from the server — the latter found only by driving the running
app. ADR `tech/0030` written; `tech/0029` marked superseded. One CI e2e failure was real and caused
by the conversion (the sidebar now settles before the client navigation, so BOARD-02 read a stale
URL) and was fixed test-side. Commits `3089a6a`, `8395348`, `22f87d2`; CI run 33512659945 green on
quality/secrets/e2e/visual.

**This session, part 2:** Fixed a real a11y defect found by driving the app — a task moved into an
EMPTY column announced nothing on either the keyboard or the pointer path, because
`createTaskMoveAnnouncements` resolved its target by searching for a TASK and an empty column is
handed over as its BODY droppable. No test caught it: every keyboard cross-column case uses
`TasksAcrossColumns` (Column 2 holds a card), and the one empty-destination fixture was only ever
driven by the pointer test, which never asserts the announcement (`5212cc7`). Then review item #5
(both column modals take `onClose`; `isOpen` was always `true` and `onOpenChange`'s `true` branch
unreachable — `022e04e`) and item #7 (`board-view.tsx` 466 -> 321 via `useBoardDragSession` and
`useNewColumnReveal`, both in the layout ring because the drag session needs both features —
`7939718`). CI run 33518793528 green on all four jobs.

**This session (2026-09-02, `/gsd-execute-phase 04`):** Manual close-out recovery of plan 04-22.
`c0ab07e` (Task 1) was preserved and verified rather than re-run, per the `.continue-here.md`
blocking constraint. Task 2 ran the full gate — `pnpm test` 1909/1909, `CI=1 pnpm test:visual`
300/300 against a freshly built `storybook-static`, e2e 57/57, contention `--repeat-each=3
--workers=2` 171/171 with zero flaky, build/build-storybook/lint/tsc/format and all nine check
scripts exit 0 — and reconciled `04-VALIDATION.md` (Wave 0 resolved item by item, 20 map rows
updated, sign-off answered; `nyquist_compliant` deliberately left `false` because
`/gsd-validate-phase` was never run). Task 3 measured all six rendered surfaces in both themes
against mock pages p4/p5/p6/p7/p11 and p14/p15/p16/p17/p21 through this project's own headless
Playwright MCP. Two NEW divergences surfaced, not fixed: the Edit modal's subtask remove control
sits 26px below its field centre (`subtask-editor-row.tsx:105`'s `mt-6` against
`isLabelHidden={true}`), and the design line-heights reach no rendered element project-wide (the
`leading-*` utility appears in zero `.tsx` files, so all 59 `text-*` token usages render at 1.5).
Full narrative: `04-22-SUMMARY.md`.

**Next:** the blocking human phase sign-off checkpoint at the end of 04-22.
