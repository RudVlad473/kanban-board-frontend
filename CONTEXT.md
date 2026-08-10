# Kanban Board

A tool for organizing units of work (Tasks) into user-defined workflow
stages (Columns) within named Boards, each owned by a single User.

## Language

**Board**:
A named collection of Columns, owned by exactly one User; the top-level
container a User creates and switches between via the sidebar.
_Avoid_: Project, Workspace.

**Column**:
An ordered workflow stage within a Board (e.g. Todo, Doing, Done, or any
user-defined name) that a Task belongs to at any given moment. A Task's
Column IS its status — there is no separate status concept. A Board must
have at least one Column before a Task can be created in it.
_Avoid_: Status, Stage, Swimlane, List.

**Task**:
A unit of work belonging to exactly one Column at a time, with a title,
optional description, and zero or more Subtasks. Moving a Task to a
different Column is its only "status change."
_Avoid_: Card, Ticket, Item, Status.

**Subtask**:
A single checklist item belonging to exactly one Task, with a title and
a completion flag. Independent of the Task's Column — completing every
Subtask does not move the Task.
_Avoid_: Checklist item, To-do.

**Version**:
A monotonically increasing counter on every Column, Task, and Subtask
that must be sent back on every update, move, or reorder request. A
stale Version is rejected rather than silently overwritten — this is how
a concurrent-edit conflict is caught.
_Avoid_: Revision, Etag, Timestamp.

**Activity Log**:
A per-board, paginated record of structural events only — board/column
created, column deleted, task created/moved/deleted. Content edits (a
task's title/description, a subtask's completion, a column rename) are
not recorded. The tracked event set is currently incomplete and expected
to grow.
_Avoid_: Audit log, History (both imply a completeness this doesn't have).

**User**:
An account identified by email and password, the owner of zero or more
Boards, with one persisted Theme preference. A Board has exactly one
User; there is currently no Collaborator or shared-board concept (see
[0001](docs/adr/domain/0001-single-owner-boards.md)).
_Avoid_: Account, Member.

**Theme**:
A User's persisted light/dark UI preference, stored and retrieved
independently of any Board.
_Avoid_: Mode, Appearance.
