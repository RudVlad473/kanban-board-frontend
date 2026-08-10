# Requirements (synthesized from PRDs)

1 PRD-classified document present in this ingestion batch: `PRD.md`
(added since the prior 16-doc synthesis; this is the first PRD ingested — this is the
first run in which this file is populated).

Requirement IDs below use the PRD's own `{CATEGORY}-{NN}` identifiers verbatim, prefixed
`REQ-` per this synthesizer's fixed `REQ-{slug}` format. No competing PRD variants exist
(only one PRD document is present), so every requirement below has exactly one source and
no `competing-variants` entry was produced by this ingestion.

## v1 Requirements

### Authentication

## REQ-AUTH-01
- source: PRD.md
- description: User can sign up with email, display name, and password
- acceptance: Signup succeeds with email, display name, and password provided
- scope: Authentication, v1

## REQ-AUTH-02
- source: PRD.md
- description: User can sign in with email and password
- acceptance: Sign-in succeeds with valid email and password
- scope: Authentication, v1

## REQ-AUTH-03
- source: PRD.md
- description: Unauthenticated visitor is redirected to sign-in when requesting a board or board-list route
- acceptance: Requesting a board or board-list route while unauthenticated redirects to sign-in
- scope: Authentication, v1
- notes: consistent with ADR tech/0001 (route-guard via BFF proxy) and HIGH-LEVEL-ARCHITECTURE.md flow-spine stage 11 (route-guard)

### Boards

## REQ-BOARD-01
- source: PRD.md
- description: User can view a sidebar list of their own boards
- acceptance: Sidebar renders the signed-in user's boards
- scope: Boards, v1

## REQ-BOARD-02
- source: PRD.md
- description: User can create a new board, optionally naming its initial columns
- acceptance: New board is created and persisted, optionally with named initial columns
- scope: Boards, v1
- notes: consistent with ADR domain/0003 (client-orchestrated multi-child creation)

## REQ-BOARD-03
- source: PRD.md
- description: User can select a board to view its full contents (columns, tasks, subtasks)
- acceptance: Selecting a board fetches and renders its full contents
- scope: Boards, v1
- notes: consistent with HIGH-LEVEL-ARCHITECTURE.md flow-spine stage 12 (select-board, GET /boards/{boardId}/full)

## REQ-BOARD-04
- source: PRD.md
- description: User can rename an existing board
- acceptance: Board name update persists
- scope: Boards, v1

## REQ-BOARD-05
- source: PRD.md
- description: User can delete a board (cascades to its columns, tasks, and subtasks)
- acceptance: Deleting a board removes it along with all its columns, tasks, and subtasks
- scope: Boards, v1
- notes: source cites docs/adr/domain/0002-hard-cascade-delete.md — consistent with that ADR's hard-cascade decision

## REQ-BOARD-06
- source: PRD.md
- description: User can collapse/expand the sidebar
- acceptance: Sidebar toggles between collapsed and expanded states
- scope: Boards, v1
- notes: consistent with DEFAULTS.md C-009 (ephemeral client UI state, sidebar collapsed)

### Columns

## REQ-COLUMN-01
- source: PRD.md
- description: User can add a new column to a board
- acceptance: New column is created and persisted on the board
- scope: Columns, v1

## REQ-COLUMN-02
- source: PRD.md
- description: User can rename a column
- acceptance: Column name update persists
- scope: Columns, v1

## REQ-COLUMN-03
- source: PRD.md
- description: User can reorder columns within a board
- acceptance: Column order change persists
- scope: Columns, v1
- notes: consistent with HIGH-LEVEL-ARCHITECTURE.md flow-spine stage 8 (reorder-column, version-checked, optimistic apply/server-confirmed)

## REQ-COLUMN-04
- source: PRD.md
- description: User can delete a column (cascades to its tasks and subtasks)
- acceptance: Deleting a column removes it along with its tasks and subtasks
- scope: Columns, v1
- notes: consistent with ADR domain/0002-hard-cascade-delete.md

### Tasks

## REQ-TASK-01
- source: PRD.md
- description: User can create a task within a column (title, optional description)
- acceptance: New task is created and persisted in the target column
- scope: Tasks, v1

## REQ-TASK-02
- source: PRD.md
- description: User can view a task's detail — title, description, subtasks checklist, current column
- acceptance: Task-detail view renders title, description, subtasks checklist, and current column
- scope: Tasks, v1
- notes: consistent with HIGH-LEVEL-ARCHITECTURE.md flow-spine stage 13 (view-task-detail)

## REQ-TASK-03
- source: PRD.md
- description: User can edit a task's title and description
- acceptance: Task title/description update persists
- scope: Tasks, v1

## REQ-TASK-04
- source: PRD.md
- description: User can move a task between columns via drag-and-drop, applied optimistically and reconciled against the server
- acceptance: Drag-and-drop move applies optimistically and reconciles against the server response
- scope: Tasks, v1
- notes: consistent with ADR tech/0003 (drag-and-drop library, dnd-kit) and ADR tech/0002 (optimistic mutation/rollback)

## REQ-TASK-05
- source: PRD.md
- description: User can delete a task (cascades to its subtasks)
- acceptance: Deleting a task removes it along with its subtasks
- scope: Tasks, v1
- notes: consistent with ADR domain/0002-hard-cascade-delete.md

### Subtasks

## REQ-SUBTASK-01
- source: PRD.md
- description: User can add a subtask to a task
- acceptance: New subtask is created and persisted on the task
- scope: Subtasks, v1

## REQ-SUBTASK-02
- source: PRD.md
- description: User can toggle a subtask's completion state, independent of the task's column
- acceptance: Subtask completion toggle persists without affecting the task's column
- scope: Subtasks, v1
- notes: source cites CONTEXT.md — consistent with domain-language definition of Subtask as independent of Task's Column

## REQ-SUBTASK-03
- source: PRD.md
- description: User can edit a subtask's title
- acceptance: Subtask title update persists
- scope: Subtasks, v1

## REQ-SUBTASK-04
- source: PRD.md
- description: User can delete a subtask
- acceptance: Deleting a subtask removes it
- scope: Subtasks, v1

### Theme

## REQ-THEME-01
- source: PRD.md
- description: User can toggle light/dark theme, persisted per account across sessions
- acceptance: Theme toggle persists per account and is applied across sessions
- scope: Theme, v1
- notes: consistent with DEFAULTS.md C-004 (theme sync mechanism, PUT /users/me/theme) and HIGH-LEVEL-ARCHITECTURE.md flow-spine stage 9 (toggle-theme)

### Sync

## REQ-SYNC-01
- source: PRD.md
- description: User sees an error and the affected change reverts when a move or edit is rejected due to a version conflict
- acceptance: A version-conflict rejection surfaces an error to the user and rolls back the affected optimistic change
- scope: Sync, v1
- notes: source cites docs/adr/tech/0002-client-data-fetching-strategy.md — consistent with that ADR's optimistic rollback decision and HIGH-LEVEL-ARCHITECTURE.md flow-spine stage 10 (reconcile-conflict)

## v2 Requirements

### Activity

## REQ-ACTIVITY-01
- source: PRD.md
- description: User can view a paginated activity log for a board (deferred — no UI design exists yet for this screen)
- acceptance: absent (deferred, not yet actionable per PRD)
- scope: Activity, v2
- notes: source cites TRIAGE.md C-006 (not a classified/ingested document in this batch — external reference, treated as terminal leaf) and HIGH-LEVEL-ARCHITECTURE.md Open Questions item 1 (unresolved: activity-log endpoint has no corresponding Figma screen)

### Collaboration

## REQ-COLLAB-01
- source: PRD.md
- description: Multiple users can be attached to and edit the same board (deferred — today a board has exactly one owner)
- acceptance: absent (deferred, not yet actionable per PRD)
- scope: Collaboration, v2
- notes: source cites docs/adr/domain/0001-single-owner-boards.md — consistent with that ADR's single-owner decision (multi-user collaboration explicitly named as a distinct, unbuilt future concept); no contradiction, this v2 requirement corroborates the ADR's own "later, not now" framing

## Out of Scope (verbatim from PRD.md)

Captured for downstream traceability; not requirement entries.

- source: PRD.md
- Search — Not present in the Figma mocks or the OpenAPI contract
- User profile/settings beyond theme, avatars, notifications, comments, attachments, labels, due dates, multi-workspace/org support — None appear in either source document
- Password reset / email verification — No such endpoints exist in the OpenAPI contract
- SSO/OAuth sign-in — Contract only defines email/password signup/signin
- Real backend implementation — A real concern, but not this frontend's; the contract is a hard constraint, its implementation is separate work
- notes: this list is verbatim-identical in substance to the "Out of Scope" entry already recorded in constraints.md (sourced from HIGH-LEVEL-ARCHITECTURE.md) — corroborating overlap between SPEC and PRD, not a conflict
