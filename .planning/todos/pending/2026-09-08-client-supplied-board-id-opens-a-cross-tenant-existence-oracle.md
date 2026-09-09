---
created: 2026-09-08T12:00:00.000Z
title: Client-supplied board id opens a cross-tenant existence oracle
area: security
severity: minor
blocked_by: backend
files:
  - src/features/boards/actions/create-board-action.ts
  - src/features/boards/board-id.ts
  - docs/api/kanban-board-openapi.json
---

## Problem

Accepting a client-supplied `id` on board create (`SaveBoardRequestDTO.id`, landed by quick task
`260908-g5y`) turns board create into a **cross-tenant existence oracle**.

Verified in backend source at planning time: `BoardService.java:216` guards the create with
`boardRepository.existsById(dto.getId())` — a **global primary-key lookup**, not scoped to the
requesting user — and it runs BEFORE `board.setUser(user)` on the following line. A hit throws
`AppDuplicateResourceException`, answered 409 `DUPLICATE_RESOURCE`.

So any authenticated user can distinguish "this board id exists somewhere in the system" from "it
does not", by attempting a create naming that id and reading the status back. Nothing about the
board is disclosed — not its name, not its owner — only that the id is taken.

Severity is minor rather than serious because ids are 13-character base36 (`36^13`), so
enumeration is impractical. Confirming a **specific already-known** id is free, which is the real
exposure: an id leaked through a shared URL, a screenshot or a log line can be confirmed as live by
anyone with an account.

This is a **BACKEND fix and therefore outside this repo.** The frontend cannot close it: the
existence check has to happen server-side, and any client-side avoidance would be advisory only.

### Falsification that would confirm it end to end

Two seeded accounts, A and B:

1. As A, create a board with a minted id X. Observe 200.
2. As B — a different account with no membership of X — attempt a create naming the same id X.
3. If B observes **409 `DUPLICATE_RESOURCE`** rather than 200 (or a uniform refusal), the oracle is
   confirmed: B learned that X exists without any relationship to it.

`src/features/boards/actions/create-board-action.integration.test.ts` already proves step 1 and the
same-account half of step 2; it does not seed a second account, so the cross-tenant half is
unproved here on purpose.

## Solution

Backend, in the sibling `kanban-board-backend` repo. Two shapes, both acceptable:

- **Scope the check by user.** Replace `existsById(dto.getId())` with an owner-scoped existence
  query, and let a collision against another tenant's board fall through to the database's own
  unique-constraint violation, answered as a generic 500/409 that carries no ownership signal.
- **Answer uniformly.** Keep the global check but return the same 409 shape whether or not the
  caller owns the row — which is what happens today — and accept the oracle explicitly, documenting
  that an id is a low-entropy public identifier.

The second is what currently ships by accident; making it a decision rather than an accident is the
minimum bar.

**Where this goes on the record: ADR 0036, quick task `260908-g63`.** That ADR is the one amending
`docs/adr/tech/0030` with what a client-minted id costs, and this trade-off is exactly that cost.
`260908-g63` must cite this todo; this todo names `260908-g63` so it is reachable from either end.
