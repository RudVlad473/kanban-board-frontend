# API Coverage — Kanban Board backend, task & subtask surface

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

The deterministic detector returned `detected: false` over the ROADMAP phase section plus
`04-CONTEXT.md` at plan time, because the phase scope is written in domain terms rather than
integration terms. The phase does integrate an external API — the fixed Kanban backend defined by
`docs/api/kanban-board-openapi.json` — and the PLAN bodies name endpoints, so the seal-time detector
will fire. The matrix is produced here rather than left for seal time.

**Scope of this matrix:** the task and subtask capability surface of the backend contract. Board and
column capabilities were decided in Phases 2 and 3 and are not re-decided here; the auth and theme
surfaces were decided in Phase 1.

| capability | contract operation | decision | reason |
|---|---|---|---|
| create task | `addTaskByColumnId` — `POST /boards/{boardId}/columns/{columnId}` | INTEGRATE | |
| read task | via `getBoardFull` — already parsed by the board read | INTEGRATE | |
| update task (title, description) | `updateById_2` — `PUT .../tasks/{taskId}` | INTEGRATE | |
| delete task | `deleteById_2` — `DELETE .../tasks/{taskId}` | INTEGRATE | |
| move task between columns | `moveToColumn` — `PATCH /tasks/{taskId}/move` (`targetColumnId`) | INTEGRATE | |
| reorder task within a column | `moveToColumn` — the optional `targetPosition` field | INTEGRATE | D-11 turns the optional field on deliberately, with the scope gap recorded: no v1 requirement covers within-column ordering |
| create subtask | `addSubtaskByTaskId` — `POST .../tasks/{taskId}/subtasks` | INTEGRATE | |
| read subtask | via `getBoardFull` — already parsed by the board read | INTEGRATE | |
| update subtask title | `updateById_3` — `PUT .../subtasks/{subtaskId}` (`title`) | INTEGRATE | |
| update subtask completion | `updateById_3` — `PUT .../subtasks/{subtaskId}` (`isCompleted`) | INTEGRATE | |
| delete subtask | `deleteById_3` — `DELETE .../subtasks/{subtaskId}` | INTEGRATE | |
| optimistic-lock conflict handling | `409` / `OPTIMISTIC_LOCK_CONFLICT` on every versioned write | INTEGRATE | SYNC-01; already mapped by `map-problem-code.ts` |

**Opt-outs: none.** Every task and subtask capability the contract exposes is integrated by this
phase. The two capabilities the contract exposes that this phase does not build against are recorded
below with reasons, so their absence is a decision rather than a hole:

| capability | contract operation | decision | reason |
|---|---|---|---|
| board activity log | not present in the contract | OPT-OUT | no such operation exists; the requirement is deferred to v2 with no UI design |
| multi-user board membership | not present in the contract | OPT-OUT | deferred to v2; a board has exactly one owner today |

Verified 2026-08-28 against `docs/api/kanban-board-openapi.json` and
`src/lib/core/api-contract/generated-types.ts`.
