---
phase: 01-foundation-auth-preferences
gate: workflow.api_coverage_gate
detector: detected=true (signal: "Mock API layer (MSW) | API / Backend" — noun "api")
surface_source: .planning/local-assets/kanban-board-openapi.json (first-party backend contract)
created: 2026-08-10
---

# Phase 01 — API Coverage Matrix

The `api-coverage` detector fired on this phase (`detected: true`). This frontend does not
integrate a third-party SDK; it integrates **its own project's backend HTTP contract**
(`kanban-board-openapi.json`) through a Next.js Route Handler BFF, with MSW standing in for the
not-yet-deployed backend. Per the gate's own instruction ("if the detector's definition of
external API is meant to catch this case, treat the contract's Phase-1-relevant endpoints as the
capability surface and produce a full-coverage matrix rather than opting out silently"), the
**full 24-operation contract surface** is enumerated below with an explicit disposition per row.

Default is `INTEGRATE`. Every `OPT-OUT` carries a reason. No row is left undecided.

| # | Operation | Capability | Disposition | Reason (required for OPT-OUT) |
|---|-----------|------------|-------------|-------------------------------|
| 1 | `POST /signup` | Create an account (`SignupRequestDTO {displayName, email, password}` → `200` bare string) | **INTEGRATE** | AUTH-01 — Plan 01-10 (MSW handler), 01-11 (BFF Route Handler), 01-12 (form) |
| 2 | `POST /signin` | Authenticate (`SigninRequestDTO {email, password}` → `200`, no documented body) | **INTEGRATE** | AUTH-02 — Plan 01-10, 01-11, 01-12 |
| 3 | `GET /users/me/theme?userId=` | Read persisted theme (`UserResponseDTO {id,email,displayName,theme}`) | **INTEGRATE** | THEME-01 — Plan 01-10 (MSW handler), 01-14 (BFF read on session bootstrap) |
| 4 | `PUT /users/me/theme?userId=` | Persist theme (`UpdateThemeRequestDTO {theme: LIGHT\|DARK}` → `UserResponseDTO`) | **INTEGRATE** | THEME-01 — Plan 01-10, 01-14 |
| 5 | `GET /boards` (`findAllByUserId`) | List the caller's boards | OPT-OUT | BOARD-01, scoped to Phase 2 by ROADMAP.md. Phase 1's `/boards` route exists **only** as the route-guard's protected target and renders a static placeholder — it makes no board API call. |
| 6 | `POST /boards` (`save`) | Create a board | OPT-OUT | BOARD-02, Phase 2 |
| 7 | `GET /boards/{boardId}/full` (`findFullById`) | Board with columns/tasks/subtasks | OPT-OUT | BOARD-03, Phase 2 |
| 8 | `PUT /boards/{boardId}` (`updateById`) | Rename a board | OPT-OUT | BOARD-04, Phase 2 |
| 9 | `DELETE /boards/{boardId}` (`deleteById`) | Delete a board (cascade) | OPT-OUT | BOARD-05, Phase 2 |
| 10 | `GET /boards/{boardId}/columns` (`findAllByBoardId`) | List columns | OPT-OUT | COLUMN-01..04, Phase 3 |
| 11 | `POST /boards/{boardId}/columns` (`addColumnByBoardId`) | Add a column | OPT-OUT | COLUMN-01, Phase 3 |
| 12 | `PUT /boards/{boardId}/columns/{columnId}` (`updateById_1`) | Rename a column | OPT-OUT | COLUMN-02, Phase 3 |
| 13 | `DELETE /boards/{boardId}/columns/{columnId}` (`deleteById_1`) | Delete a column (cascade) | OPT-OUT | COLUMN-04, Phase 3 |
| 14 | `PATCH /boards/{boardId}/columns/{columnId}/reorder` (`reorder`) | Reorder columns | OPT-OUT | COLUMN-03, Phase 3 |
| 15 | `POST /boards/{boardId}/columns/{columnId}` (`addTaskByColumnId`) | Add a task to a column | OPT-OUT | TASK-01, Phase 4 |
| 16 | `GET /boards/{boardId}/columns/{columnId}/tasks` (`findAllByColumnId`) | List tasks in a column | OPT-OUT | TASK-02, Phase 4 |
| 17 | `PUT /boards/{boardId}/columns/{columnId}/tasks/{taskId}` (`updateById_2`) | Edit a task | OPT-OUT | TASK-03, Phase 4 |
| 18 | `DELETE /boards/{boardId}/columns/{columnId}/tasks/{taskId}` (`deleteById_2`) | Delete a task (cascade) | OPT-OUT | TASK-05, Phase 4 |
| 19 | `PATCH /tasks/{taskId}/move` (`moveToColumn`) | Move a task between columns | OPT-OUT | TASK-04 / SYNC-01, Phase 4 |
| 20 | `GET /boards/{b}/columns/{c}/tasks/{t}/subtasks` (`findAllByTaskId`) | List subtasks | OPT-OUT | SUBTASK-01..04, Phase 4 |
| 21 | `POST /boards/{b}/columns/{c}/tasks/{t}/subtasks` (`addSubtaskByTaskId`) | Add a subtask | OPT-OUT | SUBTASK-01, Phase 4 |
| 22 | `PUT /boards/{b}/columns/{c}/tasks/{t}/subtasks/{s}` (`updateById_3`) | Edit / toggle a subtask | OPT-OUT | SUBTASK-02/03, Phase 4 |
| 23 | `DELETE /boards/{b}/columns/{c}/tasks/{t}/subtasks/{s}` (`deleteById_3`) | Delete a subtask | OPT-OUT | SUBTASK-04, Phase 4 |
| 24 | `GET /boards/{boardId}/activity` (`findAllByBoardId_1`) | Board activity log | OPT-OUT | ACTIVITY-01 is a **v2 requirement** (REQUIREMENTS.md §v2) — deferred, no UI design exists |
| 25 | `POST /admin/reset` (`reset`) | Truncate every table on the nonprod backend | OPT-OUT | GC-23 — called by the CI pipeline as a shell step (plan 01-31, post-test-suite cleanup), never from application code. Not integrated behind any Route Handler/Server Action, so it carries no application-level requirement ID. |

**Coverage summary:** 25 operations · 4 INTEGRATE (100 % of the operations this phase's
requirements touch) · 21 OPT-OUT, every one assigned to a named later phase, the v2 backlog, or —
for the new reset route — to a CI shell step outside application code. Zero undecided rows.

## Contract gaps carried into planning (not silent)

These are properties of the contract itself, not coverage omissions:

1. **`POST /signin` documents a bare `200` with no response body**, and `PUT|GET /users/me/theme`
   *requires* a `userId` query parameter. Nothing in the contract tells the BFF which user just
   signed in. Resolved by an explicit `checkpoint:decision` in Plan `01-10` before the MSW
   handlers are written.
2. **`POST /signup` returns `{ type: string }`** — an untyped bare string. Same checkpoint.
3. **`components.securitySchemes` is `null`** — the contract declares no auth mechanism at all.
   The session boundary is therefore entirely this frontend's BFF concern (ADR tech/0001), which
   is exactly what the httpOnly-cookie-via-BFF decision already assumes.
4. **No `minLength`/`format` constraints** on `SignupRequestDTO.email` or `.password`. Client-side
   Zod constraints are researcher defaults (UI-SPEC Copywriting Contract), flagged in Plan `01-12`.
