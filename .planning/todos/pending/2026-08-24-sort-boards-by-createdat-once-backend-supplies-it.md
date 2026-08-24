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

## Resolution

Owner intends to add `createdAt` to the Board payload backend-side (stated 2026-08-24). Once it
ships:

- Add `createdAt` to `BoardSchema` and the OpenAPI contract.
- Sort explicitly on `createdAt` in `fetch-boards.ts` and delete the `.reverse()` hack.
- Restore a real ordering assertion in the e2e spec.
- Reconcile or retire D-12 so the decision record matches what the contract guarantees.

Prefer a backend `sort` parameter over client-side sorting if pagination is ever added, since
client-side sort of one page produces a wrong global order.
