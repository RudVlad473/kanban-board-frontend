# Multi-child creation is client-orchestrated; partial failures are kept, not rolled back

The mocks' "Add New Board" and "Add New Task" modals let a user name
several child items (Columns, Subtasks) before a single Save/Create
action, but the API has no bulk-create endpoint for either —
`POST /boards` takes only a `name`, `POST .../tasks` takes only
`title`+`description`. Both are therefore client-orchestrated sequences:
one parent-create call followed by one child-create call per named item,
not a single atomic request. If the sequence fails partway through, the
frontend keeps the partially-created parent (and whatever children
succeeded) and surfaces an error, rather than attempting to roll back by
deleting the parent.

## Consequences

A rollback-delete was considered and rejected: it has no transactional
guarantee against the same API (the delete call could itself fail, or
race another update), and a Board with zero Columns or a Task with fewer
Subtasks than typed is already a valid, displayed state per the mocks —
so a partial result is incomplete and retriable, not corrupt. Every
multi-step creation flow therefore needs its own retry/resume affordance
for the child items that didn't make it, not just a single global error
toast.
