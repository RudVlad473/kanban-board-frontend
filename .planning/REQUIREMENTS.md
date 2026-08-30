# Requirements: Kanban Board

**Defined:** 2026-08-10
**Core Value:** A signed-in user can create boards, organize tasks across columns via
drag-and-drop, and trust that every change is reliably persisted and reconciled — even
against a backend that doesn't exist yet.

## v1 Requirements

Requirements for initial release. Each maps to a roadmap phase.

### Authentication

- [x] **AUTH-01**: User can sign up with email, display name, and password
- [x] **AUTH-02**: User can sign in with email and password
- [x] **AUTH-03**: Unauthenticated visitor is redirected to sign-in when requesting a board
  or board-list route

### Boards

- [x] **BOARD-01**: User can view a sidebar list of their own boards
- [x] **BOARD-02**: User can create a new board, optionally naming its initial columns
- [x] **BOARD-03**: User can select a board to view its full contents (columns, tasks, subtasks)
- [x] **BOARD-04**: User can rename an existing board
- [x] **BOARD-05**: User can delete a board (cascades to its columns, tasks, and subtasks)
- [x] **BOARD-06**: User can collapse/expand the sidebar

### Columns

- [x] **COLUMN-01**: User can add a new column to a board
- [x] **COLUMN-02**: User can rename a column
- [x] **COLUMN-03**: User can reorder columns within a board
- [x] **COLUMN-04**: User can delete a column (cascades to its tasks and subtasks)

### Tasks

- [ ] **TASK-01**: User can create a task within a column (title, optional description)
- [ ] **TASK-02**: User can view a task's detail — title, description, subtasks checklist,
  current column

- [ ] **TASK-03**: User can edit a task's title and description
- [x] **TASK-04**: User can move a task between columns via drag-and-drop, applied
  optimistically and reconciled against the server

- [ ] **TASK-05**: User can delete a task (cascades to its subtasks)

### Subtasks

- [ ] **SUBTASK-01**: User can add a subtask to a task
- [ ] **SUBTASK-02**: User can toggle a subtask's completion state, independent of the task's
  column

- [ ] **SUBTASK-03**: User can edit a subtask's title
- [ ] **SUBTASK-04**: User can delete a subtask

### Theme

- [x] **THEME-01**: User can toggle light/dark theme, persisted per account across sessions

### Sync

- [x] **SYNC-01**: User sees an error and the affected change reverts when a move or edit is
  rejected due to a version conflict

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Activity

- **ACTIVITY-01**: User can view a paginated activity log for a board (deferred — no UI
  design exists yet for this screen)

### Collaboration

- **COLLAB-01**: Multiple users can be attached to and edit the same board (deferred — today
  a board has exactly one owner)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Search | Not present in the Figma mocks or the OpenAPI contract |
| User profile/settings beyond theme (avatars, notifications, comments, attachments, labels, due dates, multi-workspace/org support) | None appear in either source document |
| Password reset / email verification | No such endpoints exist in the OpenAPI contract |
| SSO/OAuth sign-in | Contract only defines email/password signup/signin |
| Real backend implementation | A real concern, but not this frontend's — the contract is a hard constraint, its implementation is separate work |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| THEME-01 | Phase 1 | Complete |
| BOARD-01 | Phase 2 | Complete |
| BOARD-02 | Phase 2 | Complete |
| BOARD-03 | Phase 2 | Complete |
| BOARD-04 | Phase 2 | Complete |
| BOARD-05 | Phase 2 | Complete |
| BOARD-06 | Phase 2 | Complete |
| COLUMN-01 | Phase 3 | Complete |
| COLUMN-02 | Phase 3 | Complete |
| COLUMN-03 | Phase 3 | Complete |
| COLUMN-04 | Phase 3 | Complete |
| TASK-01 | Phase 4 | Pending |
| TASK-02 | Phase 4 | Pending |
| TASK-03 | Phase 4 | Pending |
| TASK-04 | Phase 4 | Complete |
| TASK-05 | Phase 4 | Pending |
| SUBTASK-01 | Phase 4 | Pending |
| SUBTASK-02 | Phase 4 | Pending |
| SUBTASK-03 | Phase 4 | Pending |
| SUBTASK-04 | Phase 4 | Pending |
| SYNC-01 | Phase 4 | Complete |

**Coverage:**

- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-10*
*Last updated: 2026-08-10 after initial roadmap creation*
