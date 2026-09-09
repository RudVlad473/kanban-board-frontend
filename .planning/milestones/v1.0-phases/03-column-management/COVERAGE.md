# API Coverage — Kanban Board backend (column capability surface)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

**Detector result:** `{"detected": false, "signals": []}` over the ROADMAP Phase 3 section. The
matrix is produced anyway: this phase consumes four column endpoints of the project's own deployed
backend REST contract (`docs/api/kanban-board-openapi.json`), and the seal-time re-scan runs over
the PLAN bodies, which do describe endpoint integration. Enumerating the surface now is cheaper
than discovering an undecided hole at seal time.

**Surface source:** every operation in `docs/api/kanban-board-openapi.json` whose path is rooted at
`/boards/{boardId}/columns`, enumerated programmatically 2026-08-26.

| capability | operationId | decision | reason |
|---|---|---|---|
| `POST /boards/{boardId}/columns` (create column) | `addColumnByBoardId` | INTEGRATE | COLUMN-01 |
| `PUT /boards/{boardId}/columns/{columnId}` (rename column) | `updateById_1` | INTEGRATE | COLUMN-02 |
| `PATCH /boards/{boardId}/columns/{columnId}/reorder` | `reorder` | INTEGRATE | COLUMN-03 |
| `DELETE /boards/{boardId}/columns/{columnId}` | `deleteById_1` | INTEGRATE | COLUMN-04 |
| `GET /boards/{boardId}/columns` (list columns) | `findAllByBoardId` | OPT-OUT | Column reads come from `GET /boards/{boardId}/full` through the RSC path (`fetchBoardFull`). ADR tech/0019 bans a second client-side read for list/detail data; wiring this endpoint would create a second source of truth for the same rows. |
| `POST /boards/{boardId}/columns/{columnId}` (create task in column) | `addTaskByColumnId` | OPT-OUT | Phase 4 scope (TASK-01). Column-rooted path, task-level capability — explicitly out of this phase's boundary per `03-CONTEXT.md` `<domain>`. |
| `GET /boards/{boardId}/columns/{columnId}/tasks` | `findAllByColumnId` | OPT-OUT | Phase 4 scope (TASK-02); tasks arrive today inside `boardFullSchema`. |
| `PUT /boards/{boardId}/columns/{columnId}/tasks/{taskId}` | `updateById_2` | OPT-OUT | Phase 4 scope (TASK-03). |
| `DELETE /boards/{boardId}/columns/{columnId}/tasks/{taskId}` | `deleteById_2` | OPT-OUT | Phase 4 scope (TASK-05). |
| `GET /boards/{boardId}/columns/{columnId}/tasks/{taskId}/subtasks` | `findAllByTaskId` | OPT-OUT | Phase 4 scope (SUBTASK-02); subtasks arrive today inside `boardFullSchema`. |
| `POST /boards/{boardId}/columns/{columnId}/tasks/{taskId}/subtasks` | `addSubtaskByTaskId` | OPT-OUT | Phase 4 scope (SUBTASK-01). |
| `PUT /boards/{boardId}/columns/{columnId}/tasks/{taskId}/subtasks/{subtaskId}` | `updateById_3` | OPT-OUT | Phase 4 scope (SUBTASK-02, SUBTASK-03). |
| `DELETE /boards/{boardId}/columns/{columnId}/tasks/{taskId}/subtasks/{subtaskId}` | `deleteById_3` | OPT-OUT | Phase 4 scope (SUBTASK-04). |

**Every column-level capability (create / rename / reorder / delete) is INTEGRATE.** The only
column-scoped read is opted out because the same data already arrives through the phase's existing
RSC read path; every remaining row is a task/subtask capability that happens to live under a
column-rooted URL and belongs to Phase 4.

No second integration against the same need exists in this phase, so no first-class/fallback
asymmetry can accumulate.
