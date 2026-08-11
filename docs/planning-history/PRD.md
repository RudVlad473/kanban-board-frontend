# PRD: Kanban Board Frontend

Functional requirements derived from `HIGH-LEVEL-ARCHITECTURE.md`'s Flow
Spine, the OpenAPI contract (`kanban-board-openapi.json`), and the
domain model in `CONTEXT.md` / `docs/adr/domain/`. This document exists
specifically to give `/gsd-ingest-docs` a PRD-classified source, since
neither the architecture doc (SPEC) nor the tech ADRs populate
`REQUIREMENTS.md` under this tool's routing rules.

**Core Value:** A solo user can organize work into boards, columns, and
tasks, and move tasks through a workflow by dragging them between
columns — the core kanban interaction — with everything else (auth,
subtasks, theme) supporting that.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email, display name, and password
- [ ] **AUTH-02**: User can sign in with email and password
- [ ] **AUTH-03**: Unauthenticated visitor is redirected to sign-in when requesting a board or board-list route

### Boards

- [ ] **BOARD-01**: User can view a sidebar list of their own boards
- [ ] **BOARD-02**: User can create a new board, optionally naming its initial columns
- [ ] **BOARD-03**: User can select a board to view its full contents (columns, tasks, subtasks)
- [ ] **BOARD-04**: User can rename an existing board
- [ ] **BOARD-05**: User can delete a board (cascades to its columns, tasks, and subtasks — see `docs/adr/domain/0002-hard-cascade-delete.md`)
- [ ] **BOARD-06**: User can collapse/expand the sidebar

### Columns

- [ ] **COLUMN-01**: User can add a new column to a board
- [ ] **COLUMN-02**: User can rename a column
- [ ] **COLUMN-03**: User can reorder columns within a board
- [ ] **COLUMN-04**: User can delete a column (cascades to its tasks and subtasks)

### Tasks

- [ ] **TASK-01**: User can create a task within a column (title, optional description)
- [ ] **TASK-02**: User can view a task's detail — title, description, subtasks checklist, current column
- [ ] **TASK-03**: User can edit a task's title and description
- [ ] **TASK-04**: User can move a task between columns via drag-and-drop, applied optimistically and reconciled against the server
- [ ] **TASK-05**: User can delete a task (cascades to its subtasks)

### Subtasks

- [ ] **SUBTASK-01**: User can add a subtask to a task
- [ ] **SUBTASK-02**: User can toggle a subtask's completion state, independent of the task's column (see `CONTEXT.md`)
- [ ] **SUBTASK-03**: User can edit a subtask's title
- [ ] **SUBTASK-04**: User can delete a subtask

### Theme

- [ ] **THEME-01**: User can toggle light/dark theme, persisted per account across sessions

### Sync

- [ ] **SYNC-01**: User sees an error and the affected change reverts when a move or edit is rejected due to a version conflict (see `docs/adr/tech/0002-client-data-fetching-strategy.md`)

## v2 Requirements

### Activity

- **ACTIVITY-01**: User can view a paginated activity log for a board (deferred — no UI design exists yet for this screen; see `TRIAGE.md` C-006 and `HIGH-LEVEL-ARCHITECTURE.md` Open Questions item 1)

### Collaboration

- **COLLAB-01**: Multiple users can be attached to and edit the same board (deferred — see `docs/adr/domain/0001-single-owner-boards.md`; today a board has exactly one owner)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Search | Not present in the Figma mocks or the OpenAPI contract |
| User profile/settings beyond theme, avatars, notifications, comments, attachments, labels, due dates, multi-workspace/org support | None appear in either source document |
| Password reset / email verification | No such endpoints exist in the OpenAPI contract |
| SSO/OAuth sign-in | Contract only defines email/password signup/signin |
| Real backend implementation | A real concern, but not this frontend's — the contract is a hard constraint, its implementation is separate work |

## Traceability

Populated during roadmap creation.

---
*Requirements defined: 2026-08-10, derived from `HIGH-LEVEL-ARCHITECTURE.md`'s Flow Spine and the OpenAPI contract.*
