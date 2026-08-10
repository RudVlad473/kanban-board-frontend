# Deletion is a hard cascade with no soft-delete or undo

Deleting a Board removes all of its Columns and Tasks; deleting a Column
removes its Tasks; deleting a Task removes its Subtasks. Nothing in the
contract exposes a trash, recovery window, or soft-delete flag, and the
mocks' own confirmation copy states plainly that the action "cannot be
reversed." We're treating full, immediate, hard-cascade delete (Board →
Column → Task → Subtask) as the confirmed domain rule at every level of
the containment hierarchy — including deleting a non-empty Column, which
the contract gives the frontend no way to detect or block on before
calling delete.

## Consequences

Any future "undo delete" or trash feature is new backend capability, not
a frontend-only addition — there is nowhere today to recover a deleted
record from.
