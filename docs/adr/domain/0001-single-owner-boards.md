# Boards are single-owner; no collaboration model exists yet

The API contract scopes every board/column/task/subtask endpoint by a
single `userId`, with no collaborator or sharing endpoint anywhere. We're
treating this as the real, confirmed domain rule rather than a
placeholder: a Board belongs to exactly one User, full stop. Multi-user
editing of a shared board — discussed earlier as a "later, not now" goal
— is a distinct, unbuilt concept (a new Collaborator/membership model,
with its own permissions) to introduce later, not a hidden second mode of
today's ownership relationship.

## Consequences

Future collaboration support is new domain surface, not an incremental
unlock: it needs a Collaborator/membership concept, permission rules, and
conflict semantics beyond today's single-owner `Version` check, none of
which exist in the current contract.
