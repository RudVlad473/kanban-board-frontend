# Roadmap: Kanban Board

## Overview

Kanban Board is a solo-developer Next.js frontend built against a fixed OpenAPI contract
with no deployed backend yet. The journey starts by standing up the technical foundation —
feature-folder architecture, typed API client, MSW mock server, and BFF-proxied auth — while
delivering account creation, sign-in, route-guarding, and theme preference (Phase 1). From
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

- [ ] **Phase 1: Foundation, Auth & Preferences** - Project scaffold, mock backend, and
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
architecture, typed API client, MSW mock server, BFF auth proxy).
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
     against the MSW-mocked API. A GitHub Actions CI workflow runs lint, Prettier format
     check, build, and tests as required status checks on every push/PR, verified by an
     actual push to the GitHub remote showing the pipeline run green (not just a
     locally-valid workflow file).

  6. A token-driven primitives library (Button, IconButton, TextField, Checkbox, Switch,
     Dropdown, Modal) exists — built from DTCG JSON via Style Dictionary into Tailwind v4
     tokens, each primitive with a Storybook story, a co-located Vitest Browser Mode test,
     passing axe-core checks, and a Playwright visual-regression baseline — and is built
     before any auth/theme feature work consumes it.
**Plans**: 12/15 plans executed

Plans:

- [x] 01-01-PLAN.md — Next.js 16 scaffold, folder skeleton and path aliases, browser-verified
- [x] 01-02-PLAN.md — ESLint 10 strict type-checked config, Prettier, Husky + lint-staged
- [x] 01-03-PLAN.md — GitHub Actions CI, verified green by a real push
- [x] 01-04-PLAN.md — DTCG token pipeline through Style Dictionary into Tailwind v4 @theme
- [x] 01-05-PLAN.md — Vitest Browser Mode, Storybook with axe-core, Playwright visual regression
- [x] 01-06-PLAN.md — Button and IconButton primitives
- [x] 01-07-PLAN.md — TextField and Checkbox primitives with built-in error state
- [x] 01-08-PLAN.md — Switch and Dropdown primitives
- [x] 01-09-PLAN.md — Modal primitive and design-system library sign-off
- [x] 01-10-PLAN.md — committed OpenAPI contract, typed client, MSW mock backend
- [x] 01-11-PLAN.md — session cookie, Data Access Layer, BFF auth endpoints
- [x] 01-12-PLAN.md — sign-up and sign-in forms and routes (AUTH-01, AUTH-02)
- [ ] 01-13-PLAN.md — route guard with defence in depth and auth end-to-end specs (AUTH-03)
- [ ] 01-14-PLAN.md — theme persistence and toggle (THEME-01)
- [ ] 01-15-PLAN.md — Vercel Preview and Production deployment, verified on the live URLs

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

**Plans**: TBD
**UI hint**: yes

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
| 1. Foundation, Auth & Preferences | 12/15 | In Progress|  |
| 2. Board Management | 0/TBD | Not started | - |
| 3. Column Management | 0/TBD | Not started | - |
| 4. Task & Subtask Workflow | 0/TBD | Not started | - |
