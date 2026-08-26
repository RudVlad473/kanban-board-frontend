# Roadmap: Kanban Board

## Overview

Kanban Board is a solo-developer Next.js frontend built against a fixed OpenAPI contract,
dialing a deployed non-production backend directly. The journey starts by standing up the
technical foundation — feature-folder architecture, typed API client, and Server-Actions-based
auth — while delivering account creation, sign-in, route-guarding, and theme preference
(Phase 1). From
there, each phase builds one level deeper into the Board → Column → Task/Subtask containment
hierarchy: board management with the sidebar (Phase 2), column management within a board
(Phase 3), and finally the full task/subtask workflow including drag-and-drop movement and
version-conflict reconciliation (Phase 4). Each phase depends on the containment level below
it existing first.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation, Auth & Preferences** - Project scaffold, mock backend, and (completed 2026-08-20)
  BFF-proxied auth let a user sign up, sign in, stay in a route-guarded session, and set a
  persisted theme

- [ ] **Phase 2: Board Management** - Signed-in users create, view, rename, delete, and
  browse their boards from a collapsible sidebar

- [ ] **Phase 3: Column Management** - Users shape a board's workflow by adding, naming,
  reordering, and removing columns

- [ ] **Phase 4: Task & Subtask Workflow** - Users create, inspect, edit, drag-and-drop move,
  and delete tasks and their subtask checklists, with version-conflict reconciliation

## Phase Details

### Phase 1: Foundation, Auth & Preferences

**Goal**: A visitor can create an account, sign in, remain in a route-guarded session, and
personalize their theme — running on a deployed technical foundation (feature-folder
architecture, typed API client, Server-Actions-based auth, dialing the deployed
non-production backend directly).
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, THEME-01
**Success Criteria** (what must be TRUE):

  1. A new visitor can sign up with email, display name, and password, and lands in an
     authenticated session.

  2. A returning user can sign in with email and password and stays signed in across a
     browser refresh.

  3. An unauthenticated visitor requesting a board or board-list route is redirected to the
     sign-in page before any board data loads.

  4. A signed-in user can toggle light/dark theme, and the choice persists across
     sign-out/sign-in and browser refresh.

  5. The app is live on Vercel (Preview + Production) with a working sign-in page, running
     against the deployed non-production backend. A GitHub Actions CI workflow runs lint,
     Prettier format check, build, and tests as required status checks on every push/PR,
     verified by an actual push to the GitHub remote showing the pipeline run green (not
     just a locally-valid workflow file).

  6. A token-driven primitives library (Button, IconButton, TextField, Checkbox, Switch,
     Dropdown, Modal) exists — built from DTCG JSON via Style Dictionary into Tailwind v4
     tokens, each primitive with a Storybook story, a co-located Vitest Browser Mode test,
     passing axe-core checks, and a Playwright visual-regression baseline — and is built
     before any auth/theme feature work consumes it.
**Plans**: 38/38 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Next.js 16 scaffold, folder skeleton and path aliases, browser-verified

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — ESLint 10 strict type-checked config, Prettier, Husky + lint-staged

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — GitHub Actions CI, verified green by a real push

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md — DTCG token pipeline through Style Dictionary into Tailwind v4 @theme

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-05-PLAN.md — Vitest Browser Mode, Storybook with axe-core, Playwright visual regression

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 01-06-PLAN.md — Button and IconButton primitives

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 01-07-PLAN.md — TextField and Checkbox primitives with built-in error state

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 01-08-PLAN.md — Switch and Dropdown primitives

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 01-09-PLAN.md — Modal primitive and design-system library sign-off

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 01-10-PLAN.md — committed OpenAPI contract, typed client, MSW mock backend

**Wave 11** *(blocked on Wave 10 completion)*

- [x] 01-11-PLAN.md — session cookie, Data Access Layer, BFF auth endpoints

**Wave 12** *(blocked on Wave 11 completion)*

- [x] 01-12-PLAN.md — sign-up and sign-in forms and routes (AUTH-01, AUTH-02)

**Wave 13** *(blocked on Wave 12 completion)*

- [x] 01-13-PLAN.md — route guard with defence in depth and auth end-to-end specs (AUTH-03)

**Wave 22** *(blocked on 01-38; re-sequenced from wave 19 per 01-REVIEWS.md HIGH #2 to run after the round-4 lib reorg rather than concurrently with it)*

- [x] 01-14-PLAN.md — theme persistence and toggle (THEME-01)

**Wave 23** *(blocked on Wave 22 completion)*

- [x] 01-15-PLAN.md — Vercel Preview and Production deployment, verified on the live URLs

Gap closure (added 2026-08-16 from the post-wave-13 UI review and architecture discussion —
01-CONTEXT.md items GC-01..GC-08). These carry waves 11-13 and so execute *before* 01-14:

- [x] 01-16-PLAN.md — loading states across the input, button and dropdown primitives (GC-01)
- [x] 01-17-PLAN.md — route-level error boundaries for the protected group and the root (GC-03)
- [x] 01-18-PLAN.md — gitleaks secret scanning in the pre-commit chain and CI (GC-06)
- [x] 01-19-PLAN.md — validation schemas aligned to the real backend rules (GC-02)
- [x] 01-20-PLAN.md — route declaration consolidated, call sites fixed, auth hooks unit-tested (GC-04, GC-07)
- [x] 01-21-PLAN.md — shared test utilities and story reuse in tests (GC-05, GC-08)

Gap closure round 2 (added 2026-08-17 from a live UI review of wave 11's primitives, plus a
folded-in pending todo — 01-CONTEXT.md items GC-09..GC-16). These carry wave 13 (parallel with
01-20/01-21, no file overlap) except 01-28, which carries wave 14 (parallel with 01-14, since it
depends on 01-20 having landed):

- [x] 01-22-PLAN.md — Button loading-spinner animation investigated and resolved (GC-13)
- [x] 01-23-PLAN.md — Checkbox isLoading/disabled visual treatment (GC-14)
- [x] 01-24-PLAN.md — TextField isLoading visual treatment investigated and fixed (GC-15)
- [x] 01-25-PLAN.md — Modal loading-composition convention established (GC-16)
- [x] 01-26-PLAN.md — mock store persistence replaced with in-memory seed/reset (GC-09)
- [x] 01-27-PLAN.md — dal.ts comment and SETUP.md (GC-10, GC-11)
- [x] 01-28-PLAN.md — RTL-for-hooks convention and CONVENTIONS.md "where code lives" section (GC-12)

Gap closure round 2 follow-up (added 2026-08-17, single item appended to the same 01-CONTEXT.md
gap-closure section — GC-17). Carries wave 14 (parallel with 01-28): 01-19 (wave 12) and 01-21
(wave 13) both rewrite the auth forms' test files this plan also edits, so it depends on both and
runs no earlier than wave 14:

- [x] 01-29-PLAN.md — TextField's isLoading composes into disabled instead of readOnly, overriding D-16 (GC-17)

Gap closure round 3 (added 2026-08-18 — 01-CONTEXT.md items GC-18..GC-24: real-backend integration,
session-cookie bridging, the auth Server Actions migration, mock removal, CI reset wiring and the
ADR carve-out). Nonprod going live turned "point the base URL at a real backend" into real work, and
these carry waves 14-18. They execute *before* 01-14 and 01-15, which carry waves 22 and 23 (see the
round-4 note below — re-sequenced per 01-REVIEWS.md HIGH #2 to run after the lib reorg). 01-35 still
settles the shape 01-14's theme persistence takes, and 01-14 now depends on 01-38 so it lands after
both that decision and the reorg:

- [x] 01-30-PLAN.md — contract regenerated from the live backend, the fake HTTP layer deleted, every test target repointed (GC-19, GC-22)
- [x] 01-32-PLAN.md — session-cookie bridging to the real backend, proven end to end, with forced sign-out on upstream expiry (GC-18)
- [x] 01-31-PLAN.md — CI clears nonprod state after every real-backend suite (GC-23)
- [x] 01-33-PLAN.md — sign-in and sign-up become Server Actions carrying the backend's error code (GC-20, GC-24)
- [x] 01-34-PLAN.md — sign-out becomes a Server Action and the dead BFF client layer is removed (GC-24)
- [x] 01-35-PLAN.md — ADR carve-out, setup docs, and repair of the two unexecuted plans (GC-24)

Gap closure round 4 (added 2026-08-19 — 01-CONTEXT.md items GC-25..GC-30 and
`docs/superpowers/specs/2026-08-19-lib-module-layering-design.md`: the three-ring `lib/` split,
per-feature `model.ts`, feature-file naming, `eslint-plugin-boundaries` policy, and the
CONVENTIONS.md update). A pure reorganisation — file moves, renames, import-path updates, one eslint
config change, no behaviour change. Per GC-29 these carry waves 19-21 and must land *after* 01-33 and
01-34 merge (they rename/move `features/auth/actions.ts`, formerly `auth-actions.ts`), and after
01-35 (which also edits CONVENTIONS.md). Per 01-REVIEWS.md HIGH #2, 01-14/01-15 were re-sequenced to
waves 22/23 (01-14 `depends_on: ["01-38"]`) so they run *after* this reorg rather than concurrently —
01-14 was creating `src/lib/theme.ts` and touching `app/api/` at the exact moment 01-36 turned on the
three-ring boundaries and 01-37 moved `dal.ts`; its theme cookie module now lands at
`src/lib/server/theme.ts` in the server ring (01-REVIEWS.md LOW #5):

- [x] 01-36-PLAN.md — three-ring boundaries policy turned on (with a transitional legacy scaffold so lint stays green mid-move) and the pure `lib/core/` ring moved (GC-25, GC-28)
- [x] 01-37-PLAN.md — `lib/server/` and `lib/client/` rings moved, `model.ts`/`actions.ts`/`schemas.ts` relocated into the auth feature, emptied folders removed, transitional legacy eslint scaffold removed (GC-25, GC-26, GC-27)
- [x] 01-38-PLAN.md — CONVENTIONS.md's project-organization section rewritten for the three rings and `model.ts` (GC-30)

**UI hint**: yes

### Phase 2: Board Management

**Goal**: A signed-in user can create, browse, organize, and remove boards from their
personal sidebar.
**Depends on**: Phase 1
**Requirements**: BOARD-01, BOARD-02, BOARD-03, BOARD-04, BOARD-05, BOARD-06
**Success Criteria** (what must be TRUE):

  1. User can view a sidebar listing all of their own boards.
  2. User can create a new board, optionally naming its initial columns, and it appears in
     the sidebar immediately.

  3. User can select a board from the sidebar and see its full contents (columns, tasks,
     subtasks) load in the board view.

  4. User can rename an existing board and the new name persists.
  5. User can delete a board and it disappears from the sidebar along with all of its
     columns, tasks, and subtasks.

  6. User can collapse and expand the sidebar.

**Plans**: 16/16 plans executed

Plans:

Prerequisite scope (02-CONTEXT.md items PC-01..PC-05 plus two folded pending todos FT-01/FT-02 —
the theme/cookie/actions cleanup design at
`docs/superpowers/specs/2026-08-20-theme-cookies-actions-cleanup-design.md`). Per 02-CONTEXT.md
these execute *before* any BOARD-01..06 work, same pattern Phase 1's gap-closure rounds used:

**Wave 1**

- [x] 02-01-PLAN.md — `THEME` const and `COOKIE` registry in new `lib/core/` concern folders (PC-01, PC-02)
- [x] 02-02-PLAN.md — path-traversal containment in `scripts/serve-static.mjs`, with its first test (FT-02)

**Wave 2** *(blocked on 02-01)*

- [x] 02-03-PLAN.md — theme and upstream cookie I/O relocated to `lib/server/cookies/`, factory-namespaced (PC-03)

**Wave 3** *(blocked on 02-03)*

- [x] 02-04-PLAN.md — auth and theme Server Actions split one-per-file under `features/<domain>/actions/` (PC-04)

**Wave 4** *(blocked on 02-04)*

- [x] 02-05-PLAN.md — theme cookie cleared on sign-out and written on sign-in; CONVENTIONS.md rules (FT-01, PC-05)

Board management (BOARD-01..06). Wave 5 resolves the backend facts 02-RESEARCH.md could not verify
and adds the two missing primitives; wave 6 is the tracer slice proving the whole data spine on one
narrow path before any breadth is added:

**Wave 5** *(blocked on 02-05)*

- [x] 02-06-PLAN.md — live-backend probe resolving list order, id format, error shape and board ownership; Route Handler test glob
- [x] 02-07-PLAN.md — `Toast` and `Menu` primitives (BOARD-02, BOARD-04, BOARD-05)

**Wave 6** *(blocked on 02-06)*

- [x] 02-08-PLAN.md — TRACER: sidebar lists real boards end to end through a BFF Route Handler (BOARD-01)

**Wave 7** *(blocked on 02-08)*

- [x] 02-09-PLAN.md — sidebar chrome, pinned controls, collapse and expand (BOARD-06)

**Wave 8** *(blocked on 02-09, 02-07)*

- [x] 02-10-PLAN.md — client-orchestrated board creation with optional initial columns (BOARD-02)

Refactor insertion (added 2026-08-25 from `.continue-here.md`'s "Wave 9 content" decision, recorded
as 02-CONTEXT.md items D-27..D-30). Inserted between Wave 8 and the remaining feature plans by
explicit user decision, so board detail, rename and delete are written against the replacement
patterns rather than adding three more instances of the ones being replaced. 02-11/12/13 keep their
IDs and shift to waves 11/12/13:

**Wave 9** *(blocked on 02-10)*

- [x] 02-14-PLAN.md — shared `RESULT_STATUS` enum across 18 call sites, and `usehooks-ts`'s `useBoolean` for boolean toggle state (D-27, D-30)

**Wave 10** *(blocked on 02-14)*

- [x] 02-15-PLAN.md — `.tsx` holds only components and prop types, and a test renders only composed stories — both made mechanical, both live violations fixed (D-28, D-29)

**Wave 11** *(blocked on 02-15)*

- [x] 02-11-PLAN.md — board detail view, empty state and auto-select routing (BOARD-03)

**Wave 12** *(blocked on 02-11)*

- [x] 02-12-PLAN.md — per-board overflow menu and optimistic rename with rollback (BOARD-04)

**Wave 13** *(blocked on 02-12)*

- [x] 02-13-PLAN.md — confirmed board delete, cascade and post-delete redirect (BOARD-05)

Supplemental scope (added 2026-08-25 from approved post-checkpoint follow-ups, not a formal
CONTEXT.md — decisions D-01..D-03 recorded directly in 02-16-PLAN.md): shared upstream-error
mapping plus a duplicate-name branch on board creation, an immediate rename-modal close, and
instant-pending board-switching via Next's loading.tsx convention. Reuses BOARD-02/03/04 rather
than a new requirement id, same pattern 02-14 used:

**Wave 14** *(blocked on 02-13)*

- [x] 02-16-PLAN.md — shared error-code mapping with a duplicate-name branch on create, instant rename-modal close, and loading.tsx skeletons for board navigation (BOARD-02, BOARD-03, BOARD-04)

**UI hint**: yes

### Phase 02.2: Unify component tests fully onto Storybook stories: eliminate renderWithProviders and hand-rendered tests, move every provider into Storybook decorators (closing the QueryProvider duplication between .storybook/preview-annotations.tsx and src/test-utils/render-with-providers.tsx), render every component test directly from composeStories() output instead of .run(), no play functions in stories (INSERTED, PULLED FORWARD)

**Goal:** Resolve the four pending testing-pattern todos surfaced during Phase 2 execution
(stub-aliasing's undocumented exception to ADR tech/0020, the per-action stub boilerplate,
centralizing the next/headers `vi.mock` shims, and e2e-vs-mock coverage for cookie writing), and
eliminate `renderWithProviders`/hand-rendered tests in favor of Storybook-decorator-driven
`composeStories()` output — so plans 02-10 through 02-13 do not add further instances of a pattern
still under review.
**Requirements**: Derived from `.planning/todos/pending/2026-08-22-reconcile-action-stub-aliasing-with-the-no-mock-policy.md`, `2026-08-22-investigate-a-shared-integration-testing-mocking-module-for-.md`, `2026-08-22-investigate-centralizing-vi-mock-declarations-for-next-heade.md`, `2026-08-22-research-e2e-coverage-for-cookie-writing-instead-of-next-hea.md` — see `/gsd-plan-phase 02.2`
**Depends on:** Phase 1, Phase 02.1
**Plans:** 9/9 plans complete

**Sequencing note (2026-08-22):** Pulled forward by explicit user decision — this phase now runs
*before* Phase 2's remaining plans (02-10 through 02-13, waves 8-11: create/detail/rename/delete
board), not after full Phase 2 completion as originally inserted. Phase 2 execution is paused at
Wave 8 (02-10 not yet started) until this phase ships, so the create/rename/delete plans — three
of which each add one more `*-action-storybook-stub.ts` instance — pick up whatever pattern this
phase decides on instead of propagating the one currently under review.

Plans:

- [x] 02.2-01-PLAN.md
- [x] 02.2-02-PLAN.md
- [x] 02.2-03-PLAN.md
- [x] 02.2-04-PLAN.md
- [x] 02.2-05-PLAN.md
- [x] 02.2-06-PLAN.md
- [x] 02.2-07-PLAN.md
- [x] 02.2-08-PLAN.md
- [x] 02.2-09-PLAN.md

- [ ] TBD (run /gsd-plan-phase 02.2 to break down)

### Phase 02.1: Testing strategy overhaul and code-quality retrofit: no-mocking policy, curl-based e2e seeding, Storybook-driven component tests, plus deferred code-review fixes from 02-08 (INSERTED)

**Goal:** Every server entry point in the codebase is a React Server Component or a Server Action
(no Route Handlers), every test proves behaviour against the real deployed backend or through its
own composed Storybook stories rather than through a mock, and both rules — plus the comment-length
rule CONVENTIONS.md has stated but never enforced — are written down as ADRs and enforced by
blocking CI gates, so no future session reintroduces the patterns this phase removes.
**Requirements**: D-01..D-22 (from 02.1-CONTEXT.md — decimal insertion, no REQUIREMENTS.md IDs)
**Depends on:** Phase 2
**Plans:** 15/15 plans complete

Plans:

**Wave 1**

- [x] 02.1-01-PLAN.md — TRACER: RSC board read path replaces the Route Handler (D-01, D-02, D-03, D-12, D-21)

**Wave 2** *(blocked on 02.1-01)*

- [x] 02.1-02-PLAN.md — policy gates: mock-ban lint rule and comment-length checker, advisory for now (D-04, D-19, D-22)

**Wave 3** *(blocked on 02.1-02)*

- [x] 02.1-03-PLAN.md — typed reusable cookie client; session and cookie tests de-mocked (D-10, D-20)
- [x] 02.1-04-PLAN.md — external-path constants, `buildBoardDetailPath` rename, `E2E_CONFIG` object (D-13, D-14, D-15)
- [x] 02.1-05-PLAN.md — ADRs tech/0019-0024, tech/0002 supersession, CONVENTIONS.md rewrite (D-18)
- [x] 02.1-06-PLAN.md — Server Action tests rewritten against the real backend (D-04, D-16)
- [x] 02.1-07-PLAN.md — composed-story tests: Button, IconButton, Checkbox, Switch, TextField (D-08)
- [x] 02.1-08-PLAN.md — composed-story tests: Dropdown, Menu, Modal, Toast, ErrorFallback (D-08)

**Wave 4** *(blocked on 02.1-06, 02.1-07)*

- [x] 02.1-09-PLAN.md — auth and theme component tests via Server Action stub aliases (D-04, D-08)

**Wave 5** *(blocked on 02.1-04, 02.1-09)*

- [x] 02.1-10-PLAN.md — curl-based e2e seeding CLI, happy-path scope, Arrange-Act-Assert (D-05, D-06, D-07)

**Wave 6** *(blocked on 02.1-07, 02.1-08, 02.1-09, 02.1-10)*

- [x] 02.1-11-PLAN.md — comment sweep: `src/components/` (D-22)
- [x] 02.1-12-PLAN.md — comment sweep: `src/features/` (D-22)
- [x] 02.1-13-PLAN.md — comment sweep: `src/lib/`, `src/test-utils/`, `app/`, `proxy.ts` (D-22)
- [x] 02.1-14-PLAN.md — comment sweep: root configs, `.storybook/`, `scripts/`, `e2e/`, `visual/` (D-22)

**Wave 7** *(blocked on 02.1-11 through 02.1-14)*

- [x] 02.1-15-PLAN.md — gates flipped to blocking, Enforcement columns finished, full-suite sign-off

Out of scope by explicit user decision (D-17): the theme-cookie-on-sign-out todo and the
`scripts/serve-static.mjs` path-traversal todo stay in `.planning/todos/pending/`.

### Phase 3: Column Management

**Goal**: A signed-in user can shape a board's workflow by adding, naming, reordering, and
removing columns.
**Depends on**: Phase 2
**Requirements**: COLUMN-01, COLUMN-02, COLUMN-03, COLUMN-04
**Success Criteria** (what must be TRUE):

  1. User can add a new column to a board and it appears as a new swimlane in the board view.
  2. User can rename a column and the new name persists.
  3. User can drag to reorder columns within a board, and the new order persists across a
     reload.

  4. User can delete a column and it disappears from the board view along with any tasks and
     subtasks it contained.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Task & Subtask Workflow

**Goal**: A signed-in user can create, inspect, edit, move, and remove tasks and their
subtask checklists, with changes reliably reconciled against the server even when a version
conflict occurs.
**Depends on**: Phase 3
**Requirements**: TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, SUBTASK-01, SUBTASK-02,
SUBTASK-03, SUBTASK-04, SYNC-01
**Success Criteria** (what must be TRUE):

  1. User can create a task with a title (and optional description) inside a column.
  2. User can open a task's detail view and see its title, description, subtask checklist,
     and current column.

  3. User can edit a task's title and description, and the change persists.
  4. User can drag a task to a different column; the move applies instantly and is confirmed
     by the server.

  5. User can add, rename, toggle-complete, and delete subtasks on a task, independent of the
     task's column.

  6. User can delete a task and its subtasks are removed with it.
  7. If a move or edit is rejected due to a stale version, the user sees an error and the
     affected change reverts.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation, Auth & Preferences | 38/38 | Complete    | 2026-08-20 |
| 2. Board Management | 16/16 | In Progress|  |
| 02.1. Testing strategy overhaul & code-quality retrofit | 15/15 | Complete    | 2026-08-22 |
| 3. Column Management | 0/TBD | Not started | - |
| 4. Task & Subtask Workflow | 0/TBD | Not started | - |
