---
created: 2026-08-24T20:45:00.000Z
title: Sort Boards by createdAt once the backend supplies it
area: feature
severity: minor
blocked_by: backend
files:
  - src/features/boards/server/fetch-boards.ts
  - src/features/boards/schemas.ts
  - e2e/boards-create.e2e.spec.ts
  - docs/api/kanban-board-openapi.json
---

## Problem

The sidebar cannot order Boards by creation time, and the app currently fakes an order that no
contract guarantees.

`BoardResponseDTO` exposes exactly `["id", "name", "version"]` — no `createdAt`, no `updatedAt`,
no `position`. `GET /boards` accepts exactly one parameter, `userId`: no `sort`, `order`, or
`pageable`. Verified against `docs/api/kanban-board-openapi.json`, not inferred from client types.

Two live symptoms:

1. `fetch-boards.ts:52` returns `[...parsed.data].reverse()`. That manufactures newest-first by
   reversing whatever arrives, on the unstated assumption that the backend returns insertion
   order. Nothing in the contract promises that.
2. `e2e/boards-create.e2e.spec.ts` originally asserted `toHaveText([newest, older])`. It passed
   in isolation and failed in the full suite with both Boards present but reversed — it was
   testing luck. Plan 02-10 weakened it to `toHaveCount(2)`; ordering is now untested.

This also contradicts D-12, which treats newest-first as a verified business fact. It is not a
fact; it is a guess that usually holds.

## Observation, 2026-09-08 — the backend now sends it

Measured by quick task `260908-g5y` while pinning the create contract
(`src/features/boards/actions/create-board-action.integration.test.ts`, run against the deployed
nonprod backend). `POST /boards` answers **201** with a body carrying the field:

```json
{ "id": "2ggpg6zyfmud3", "name": "Create With Id 0q1w7chh", "version": 0, "createdAt": "2026-09-08T12:39:03.734078Z" }
```

Two caveats before this reads as "unblocked":

- The regenerated `docs/api/kanban-board-openapi.json` still declares `BoardResponseDTO` as
  `{ id, name, version }` with no `createdAt`, so the field arrives **undeclared** — the contract
  has not caught up with the payload, and codegen will not surface it.
- `boardSchema` (`src/features/boards/schemas.ts`) declares only `{ id, name, version }`, so the
  field is dropped at this app's own boundary today and never reaches `Board`.
- Only the CREATE response was observed. Whether `GET /boards` carries it too is **not** measured;
  that is the read this todo actually depends on, and it must be checked before acting.

## Resolution

Owner intends to add `createdAt` to the Board payload backend-side (stated 2026-08-24). Once it
ships:

- Add `createdAt` to `BoardSchema` and the OpenAPI contract.
- Sort explicitly on `createdAt` in `fetch-boards.ts` and delete the `.reverse()` hack.
- Restore a real ordering assertion in the e2e spec.
- Reconcile or retire D-12 so the decision record matches what the contract guarantees.

Prefer a backend `sort` parameter over client-side sorting if pagination is ever added, since
client-side sort of one page produces a wrong global order.
