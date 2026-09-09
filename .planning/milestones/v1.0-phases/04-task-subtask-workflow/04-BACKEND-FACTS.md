# Phase 4 — Observed Backend Facts

> Produced by `scripts/probe-task-backend.mjs` against the deployed nonprod backend
> (`EXTERNAL_API_BASE_URL`), 2026-08-28. Three full runs completed end to end; every answer below
> reproduced identically across all three. This file supersedes `04-RESEARCH.md`'s Assumptions Log
> A3-A7 with observed facts, and answers the nine questions `04-RESEARCH.md` § Open Questions #4
> listed as unknown.

---

## Status: OBSERVED

The probe seeded a throwaway account, one board and ten columns per run, then exercised T1-T9 in
sequence. Every section carries a real status code and response body.

**Traceability.** Final run: account `probe-task-a-f7a58990-5499-40c3-ba30-68061c12d9b8@example.com`,
board `8pczaw5rr4sg`. Earlier runs used
`probe-task-a-f17a0450-0828-4ccd-942a-08b564864515@example.com` (board `8pcyx6ig5b7k`) and
`probe-task-a-bb07d418-f5f6-4014-87b4-0a40d55b7446@example.com` (board `8pcz61oy2cxs`). Each run also
signed up one `probe-task-b-<uuid>@example.com` account for T7.

**Cleanup.** Every board each run created was deleted on the way out — three per run (main board,
the account-A second board, the account-B board), each returning `200` with an empty body. Tasks,
subtasks and columns went with them. The six throwaway **accounts persist**: the backend exposes no
delete-account endpoint (`02-BACKEND-FACTS.md`), so they are permanent nonprod records holding no
state any plan depends on.

**Sessions.** Each run reported `SESSIONS: 2` — one sign-in for account A, one for account B. The
two-concurrent-session cap was never approached.

**Why three runs.** The first run could not answer three of its own questions, because the probe
confounded them (see § Probe corrections). T3-T7 were answered on run 1 and reproduced unchanged on
runs 2 and 3; T2, T8 and T9 are answered from runs 2 and 3.

---

## T1 create-task path and response shape — CONFIRMS Pitfalls 1 and 3

**Question:** Does `POST /boards/{boardId}/columns/{columnId}` with a `title` body create a task —
the path has no `/tasks` segment and reads like a mistake — and what does the response carry?

**Observed:** it creates a task and returns `201`.

```
POST /boards/{boardId}/columns/{columnId}?userId={userId}   body: {"title":"T1 Created Task"}
-> 201 {"id":"8pczaxzy2akg","title":"T1 Created Task","description":null,"version":0,"position":0}
```

Response keys are exactly `["id","title","description","version","position"]` — it **echoes
`position`**, and carries **no `subtasks`** and **no `columnId`**. The read-back from
`GET /boards/{boardId}/full` adds the nested array:

```
{"id":"8pczaxzy2akg","title":"T1 Created Task","description":null,"position":0,"version":0,"subtasks":[]}
```

**Consequences:**

- Pitfall 1 holds: `EXTERNAL_PATH.COLUMN_DETAIL` is the create-task target, with no `/tasks`
  segment. It is the same literal the column update and delete already use.
- Pitfall 3 holds: a mutation-response schema must be `taskFullSchema.omit({ subtasks: true })`.
  Parsing a create/update/move response with `taskFullSchema` fails on every successful call.
- `description` arrives as an explicit `null` on a task created without one, exactly the R9 shape
  `03-BACKEND-FACTS.md` recorded — `nullish()` is required, `optional()` is not enough.
- A move response cannot tell you where the task landed (no `columnId`), so the optimistic override
  must carry the destination itself.

---

## T2 ancestor path segments — A3 CONFIRMED (accepted), and they are entirely inert

**Question (supersedes A3):** Do task and subtask `PUT`/`DELETE` accept the ancestor segments the
contract omits (`boardId`, `columnId`, `taskId`)? And what does the server do with the literal
placeholder `openapi-fetch` actually emits for an unsupplied path parameter?

**Observed: accepted — and the ancestor segments are never read at all.** Every variant returned
success:

```
PUT    /boards/{boardId}/columns/{columnId}/tasks/{taskId}                    -> 200, rename applied
PUT    /boards/%7BboardId%7D/columns/%7BcolumnId%7D/tasks/{taskId}            -> 200, rename applied
PUT    /boards/no-such-board/columns/no-such-column/tasks/{taskId}            -> 200, rename applied
DELETE /boards/{boardId}/columns/{columnId}/tasks/{taskId}                    -> 200, empty body
DELETE /boards/%7BboardId%7D/columns/%7BcolumnId%7D/tasks/{taskId}            -> 200, empty body
PUT    .../tasks/{taskId}/subtasks/{subtaskId}  (all ancestors spelled out)   -> 200, rename applied
PUT    /boards/%7BboardId%7D/.../tasks/%7BtaskId%7D/subtasks/{subtaskId}      -> 200, rename applied
DELETE /boards/%7BboardId%7D/.../tasks/%7BtaskId%7D/subtasks/{subtaskId}      -> 200, empty body
```

A representative success body, from the wrong-ancestor PUT:

```
{"id":"8pczayc5kfeo","title":"T2 Renamed Via Wrong Path","description":null,"version":3,"position":0}
```

This is `03-BACKEND-FACTS.md` R8 one containment level deeper: the backend resolves the task from
`taskId` alone (and the subtask from `subtaskId` alone) and derives every ancestor from the entity
itself. A board id or column id a caller puts in the URL — real, wrong, or an unresolved
`%7BboardId%7D` — changes nothing.

**Consequences:**

- **The failure mode is silence, not a 404.** A dropped path parameter produces a request that
  succeeds and looks correct. Nothing at runtime will tell you the URL was malformed, so the
  source-level assertions the actions carry guard a **convention**, not an observable bug — do not
  describe them as catching a real failure.
- **Keep spelling every segment out anyway**, carrying `reorder-column-action.ts`'s comment forward.
  It is the documented URL and the backend may tighten later.
- Ownership is unaffected: it is enforced from the session, never from the path (T7 below).

---

## T3 `targetPosition` semantics — A4 CONFIRMED (final 0-based index)

**Question (supersedes A4):** Is `MoveTaskRequestDTO.targetPosition` the moved task's final 0-based
index in the destination column, or an insert-before semantic? What do append, out-of-range and
omission do?

**Observed: the moved task's final 0-based index.** The disambiguating case is a **same-column**
move, the only one where the two readings differ — for a cross-column move they are identical,
because removing the task from a different column shifts no destination index.

With `T3 Source` holding `S0,S1,S2,S3,S4` at positions 0-4, moving `S0` with `targetPosition: 2`:

```
PATCH /tasks/{s0Id}/move   body: {"targetColumnId":"<its own column>","version":0,"targetPosition":2}
-> 200 {"id":"8pczb0...","title":"T3 S0","description":null,"version":1,"position":2}

byPosition after: ["T3 S1@0","T3 S2@1","T3 S0@2","T3 S3@3","T3 S4@4"]
```

`S1,S2,S0,S3,S4` is the final-index result; insert-before would have produced `S1,S0,S2,S3,S4`. This
matches `03-BACKEND-FACTS.md` R1 for columns.

The remaining three cases, each against `T3 Dest`:

| Case | Sent | Status | Resulting position |
|------|------|--------|--------------------|
| cross-column, mid-list | `targetPosition: 1` into a 3-task column | `200` | `1` — `["T3 D0@0","T3 S1@1","T3 D1@2","T3 D2@3"]` |
| append | `targetPosition: 4` into a 4-task column | `200` | `4` (last) |
| out of range | `targetPosition: 99` into a 5-task column | `200` | `5` — **clamped to the end, not refused** |
| omitted | no `targetPosition` field at all | `200` | `6` (last) — **appended** |

```
targetPosition: 99  -> 200 {"id":"8pczb1...","title":"T3 S3","version":1,"position":5}
omitted             -> 200 {"id":"8pczb1...","title":"T3 S4","version":1,"position":6}
```

**Consequences:**

- Send dnd-kit's post-`arrayMove` final index directly as `targetPosition` — no translation, and no
  need for a task-side equivalent of `toReorderTargetPosition`.
- No client-side clamping is needed; the server clamps silently, exactly as it does for columns
  (`03-BACKEND-FACTS.md` R4).
- Omitting `targetPosition` means "append", not "keep position". A move that means to preserve
  ordering must always send the field.

---

## T3-adjacent: response order is NOT position order — CONFIRMS Pitfall 15 with an observation

`GET /boards/{boardId}/full` returns each column's `tasks` in an order that does **not** track
`position`. After the cross-column move above:

```
raw response order: ["T3 S1","T3 D0","T3 D1","T3 D2"]
by position:        ["T3 D0@0","T3 S1@1","T3 D1@2","T3 D2@3"]
```

The moved task is **first** in the array and **second** by position. After the same-column move, the
raw order did not change at all (`["T3 S0","T3 S1","T3 S2","T3 S3","T3 S4"]`) while the positions
did. Pitfall 15's requirement is therefore not theoretical: rendering the array as returned shows a
wrong order immediately after any move. The read must sort tasks by `position`, as
`sortColumnsByPosition` already does for columns.

---

## T4 stale-version writes — A5 CONFIRMED (409 `OPTIMISTIC_LOCK_CONFLICT` on all three)

**Question (supersedes A5):** Do a stale-version task `PUT`, subtask `PUT` and move each return
`409` with problem-detail code `OPTIMISTIC_LOCK_CONFLICT`?

**Observed: all three, same status and same code.** Each write was issued once successfully, then
replayed carrying the now-stale version.

```
task PUT, stale version 0
-> 409 {"type":"about:blank","title":"Conflict","status":409,
        "detail":"Task was modified by another request, please refetch.",
        "instance":"/api/boards/…/columns/…/tasks/8pczb2xvbx8g","code":"OPTIMISTIC_LOCK_CONFLICT"}

subtask PUT, stale version 0
-> 409 {"type":"about:blank","title":"Conflict","status":409,
        "detail":"Subtask was modified by another request, please refetch.",
        "instance":"/api/boards/…/tasks/…/subtasks/8pczb3c3943k","code":"OPTIMISTIC_LOCK_CONFLICT"}

PATCH /tasks/{taskId}/move, stale version 1
-> 409 {"type":"about:blank","title":"Conflict","status":409,
        "detail":"Task was modified by another request, please refetch.",
        "instance":"/api/tasks/8pczb2xvbx8g/move","code":"OPTIMISTIC_LOCK_CONFLICT"}
```

The problem-detail `code` string is `OPTIMISTIC_LOCK_CONFLICT` verbatim in all three responses. Only
the `detail` prose differs ("Task…" vs "Subtask…").

**Consequence:** `map-problem-code.ts` needs **no new entry**. The existing version-conflict branch —
already proven for a board rename (`02-BACKEND-FACTS.md` P3) and a column reorder
(`03-BACKEND-FACTS.md` R3) — covers all seven of this phase's versioned writes unchanged.

---

## T5 version on merely-shifted tasks — A6 CONFIRMED (not bumped, and still usable)

**Question (supersedes A6):** After a move, do tasks that only shift position keep a usable
`version`, or must an in-flight move lock the whole column?

**Observed: only the moved task's version changed.** `T5 Column` held `A,B,C,D` at positions 0-3;
`A` was moved to `targetPosition: 2` (`200`, `{"version":1,"position":2}`):

| Task | position | version | moved? |
|------|----------|---------|--------|
| T5 A | 0 → 2 | 0 → 1 | yes (the moved task) |
| T5 B | 1 → 0 | 0 → 0 | no, shifted only |
| T5 C | 2 → 1 | 0 → 0 | no, shifted only |
| T5 D | 3 → 3 | 0 → 0 | no, untouched |

The backstop write confirms the shifted version is not merely unchanged but still **accepted**:

```
PUT rename of shifted "T5 B" carrying its PRE-move version 0
-> 200 {"id":"8pczb4bebg1s","title":"T5 B Renamed","description":null,"version":1,"position":0}
```

**Consequence:** an in-flight move needs to lock only the **moved** task, not every task in the
column — a write against a shifted sibling succeeds with the version read before the move. This is
the task-level twin of `03-BACKEND-FACTS.md` R2. Whether to widen the lock for UX reasons is the
move plan's own call, but version-safety does not require it.

---

## T6 delete cascade and double delete — A7 CONFIRMED (cascades; second delete 404)

**Question (supersedes A7):** Does deleting a task remove its subtasks server-side, and what does a
second `DELETE` of the same task id return?

**Observed:** the delete cascades, and the subtasks are genuinely gone rather than orphaned.

```
DELETE /boards/{b}/columns/{c}/tasks/{taskId}   (task held 2 subtasks)
-> 200, empty body

GET /boards/{boardId}/full  -> the column is empty; task absent from /full: true
```

Because `/full` nests subtasks under their task, a missing task hides them either way — so each
subtask id was probed directly:

```
PUT    .../tasks/{deletedTaskId}/subtasks/{subtaskOneId}
-> 404 {"type":"about:blank","title":"Not Found","status":404,
        "detail":"Subtask was not found","code":"ENTITY_NOT_FOUND"}

DELETE .../tasks/{deletedTaskId}/subtasks/{subtaskTwoId}
-> 404 {"…","detail":"Subtask was not found","code":"ENTITY_NOT_FOUND"}
```

The second delete of the task itself:

```
DELETE .../tasks/{deletedTaskId}   (already deleted)
-> 404 {"type":"about:blank","title":"Not Found","status":404,
        "detail":"Task was not found","code":"ENTITY_NOT_FOUND"}
```

**Consequences:** ADR domain/0002's server-side cascade holds for tasks, so a delete needs no
client-side subtask cleanup and no partial-state handling. A double-submit delete falls through to
the same `ENTITY_NOT_FOUND` handling as any other missing-id lookup — there is no dedicated
"already deleted" code, matching `03-BACKEND-FACTS.md` R7 for columns.

---

## T7 cross-board and cross-account moves — REFUSED, by two different codes

**Question (Pitfall 5, threat T-04-03):** `PATCH /tasks/{taskId}/move` carries no board scoping — the
only identifiers on the wire are `taskId`, `userId` and `targetColumnId` — so the backend is the only
authorization point. Is a move to a column on a different board, or on another account's board,
refused?

**Observed: both refused, with different status codes and different problem-detail codes.**

**(a) Same account, different board — `400 ILLEGAL_ARGUMENT`:**

```
PATCH /tasks/{taskId}/move   body: {"targetColumnId":"<column on the account's OTHER board>",…}
-> 400 {"type":"about:blank","title":"Bad Request","status":400,
        "detail":"Cannot move a task to a column on a different board.",
        "instance":"/api/tasks/8pczb6u24ruo/move","code":"ILLEGAL_ARGUMENT"}
```

The destination column read back empty, and the task was still on its original board.

**(b) Another account's board — `403 ACCESS_DENIED`, both ways of asking:**

```
A's cookie, userId=A, targetColumnId = a column on B's board
-> 403 {"type":"about:blank","title":"Forbidden","status":403,
        "detail":"You do not have access to that board",
        "instance":"/api/tasks/8pczb70pv11c/move","code":"ACCESS_DENIED"}

A's cookie, userId=B (claiming the victim's id in the query), same targetColumnId
-> 403 {"…","detail":"You do not have access to that board","code":"ACCESS_DENIED"}
```

Reading account B's board **as B** showed its column still empty; account A's own column still held
all three tasks. Substituting the victim's `userId` in the query buys nothing — authorization comes
from the session, matching `02-BACKEND-FACTS.md` P7 and `03-BACKEND-FACTS.md` R8.

**Consequences:**

- **T-04-03 is mitigated server-side.** No permissive result; nothing for the move plan to work
  around.
- **The move action needs two refusal branches, not one.** A cross-board move is `400
  ILLEGAL_ARGUMENT` while a cross-account one is `403 ACCESS_DENIED`. Only the first is reachable
  from this UI (a board page renders one board), so `ILLEGAL_ARGUMENT` is the one worth a real toast;
  treat `ACCESS_DENIED` as the generic authorization path. Check `map-problem-code.ts` covers
  `ILLEGAL_ARGUMENT` before relying on it.

---

## T8 title bounds on UPDATE — enforced (3-32), but the message is wrong

**Question (Pitfall 4):** `SaveTaskRequestDTO.title` declares `minLength: 3, maxLength: 32`;
`UpdateTaskRequestDTO.title` declares no bounds at all. Does the backend enforce the bound on update
as well as create?

**Observed: yes, the same 3-32 bound — but the update-side error message says the wrong thing.**

Create side, both ends refused with an accurate message:

```
POST title "ab"        -> 400 code VALIDATION_FAILED,
                          errors.title "Task title cannot be less than 3 character and more than 32 characters"
POST title "x"×33      -> 400 code VALIDATION_FAILED, same errors.title
```

Update side, both ends refused with a **misleading** message, and both in-bounds ends accepted:

```
PUT title "ab"         -> 400 code VALIDATION_FAILED, errors.title "Task title cannot be empty"
PUT title "x"×33       -> 400 code VALIDATION_FAILED, errors.title "Task title cannot be empty"
PUT title "abc"        -> 200 {"id":"8pczba3hux34","title":"abc","version":1,"position":0}
PUT title "y"×32       -> 200 {"id":"8pczba3hux34","title":"yyyy…yyyy","version":2,"position":0}
```

The 3-char accept and the 32-char accept are what pin this as a 3-32 bound rather than something
else — "cannot be empty" alone could not distinguish the two.

Subtask update behaves the same way, with the same misleading wording:

```
subtask PUT title "z"×32  -> 200 {"id":"8pczbasvtrls","title":"zzz…zzz","isCompleted":false,"version":1}
subtask PUT title "z"×33  -> 400 code VALIDATION_FAILED, errors.title "Subtask title cannot be empty"
subtask PUT title ""      -> 400 code VALIDATION_FAILED, errors.title "Subtask title cannot be empty"
```

**Consequences:**

- Pitfall 4's remedy stands: build the rename schema with an explicit 3-32 bound rather than from
  `UpdateTaskRequestDTO`, mirroring `columnNameSchema`'s `.pipe(columnNameRowSchema)` split.
- **Never surface the backend's `errors.title` verbatim.** It would tell a user that a 33-character
  title "cannot be empty". `04-UI-SPEC.md`'s pinned copy — "Task title must be between 3 and 32
  characters." — must come from the client schema, and client-side validation is what keeps this
  message off the screen at all.
- A subtask title is bounded at 32 on update even though `SaveSubtaskRequestDTO` only declares
  `minLength: 1` on create. The subtask rename field needs its own max, not just a non-empty check.

---

## T9 `description` on create and update — `""` is REFUSED, and a description can never be cleared

**Question:** Is an empty-string description accepted on create, and what does the response echo
back?

**Observed on create: `""` is refused; omitted yields an explicit `null`.**

```
POST description: ""            -> 400 {"…","detail":"Validation failed","code":"VALIDATION_FAILED",
                                        "errors":{"description":"Description cannot be empty"}}
POST description omitted        -> 201 {"id":"8pczbbk7prsw","title":"T9 Omitted Description",
                                        "description":null,"version":0,"position":1}
POST description "a real one"   -> 201 {"id":"8pczbbov0yyo","title":"T9 Filled Description",
                                        "description":"a real one","version":0,"position":2}
```

`GET /boards/{boardId}/full` carries the key **present and `null`** for the omitted case — the R9
shape `taskFullSchema`'s `nullish()` already handles.

**Observed on update — the more consequential half.** A control write proves updates apply at all,
which is what makes the rest of the sequence readable:

```
PUT description "a changed one"  -> 200 {…,"description":"a changed one","version":1}   (applied)
PUT description ""               -> 400 code VALIDATION_FAILED,
                                    errors.description "Description cannot be empty"
PUT description null             -> 200 {…,"description":"a changed one","version":2}   (UNCHANGED)
PUT description omitted          -> 200 {…,"description":"a changed one","version":3}   (UNCHANGED)
PUT description " "  (one space) -> 200 {…,"description":" ","version":4}               (applied)
```

**There is no way to clear a task description through this API.** `""` is refused, `null` and
omission both mean "leave it alone", and the only accepted empty-looking value is a whitespace
string. Note that `null` and omission still return `200` and still bump the version when another
field changed — they fail silently, which is exactly how a "clear the description" bug would ship
unnoticed.

**Consequences — flags the Edit Task plan (TASK-02):**

- A cleared description textarea **cannot** be sent as `""` (400) and **must not** be sent as `null`
  or omitted (silently keeps the old text while the UI shows it as cleared). Decide explicitly
  between sending `" "` and refusing to let the field be cleared, and document the choice — this is
  a user-visible product decision, not an implementation detail.
- The create form must omit `description` rather than send `""` when the field is blank. A form that
  serialises an untouched textarea to `""` will 400 on every task created without a description —
  the most likely default behaviour, and the most likely bug.
- `null` and omission are "leave unchanged", so a partial update is safe: a rename need not resend
  the description.

---

## Supersedes 04-RESEARCH.md A3-A7

| Assumption | Claim | Answered by | Risk if wrong | State |
| ---------- | ----- | ----------- | ------------- | ----- |
| **A3** | The backend accepts a task `PUT`/`DELETE` when `boardId`/`columnId` are written into the path though the contract omits them | T2 | High | **CONFIRMED** — accepted, and the segments are entirely inert; a *wrong* board/column is accepted too, so a dropped parameter fails silently rather than loudly |
| **A4** | `targetPosition` is the moved task's final 0-based index in the destination column | T3 | High | **CONFIRMED** — final index; out-of-range clamps to the end, and omitting the field appends |
| **A5** | A stale-version task/subtask write returns `409 OPTIMISTIC_LOCK_CONFLICT` | T4 | High | **CONFIRMED** — all three writes (task PUT, subtask PUT, move) return `409` with that exact code; `map-problem-code.ts` needs no entry |
| **A6** | Only the moved task's `version` bumps; merely-shifted tasks keep a usable version | T5 | High | **CONFIRMED** — shifted tasks keep version `0`, and a PUT carrying the pre-move version returned `200` |
| **A7** | Deleting a task cascades to its subtasks server-side with no partial state | T6 | Medium | **CONFIRMED** — the task and both subtasks are gone (`404 ENTITY_NOT_FOUND` on each subtask id); a second task DELETE also returns `404 ENTITY_NOT_FOUND` |

---

## Consequences by downstream plan

**Create task (TASK-01)**

- `POST /boards/{boardId}/columns/{columnId}` — no `/tasks` segment (T1).
- Omit `description` when blank; never send `""` (T9, `400`).
- Parse the response with `taskFullSchema.omit({ subtasks: true })` (T1).

**Edit task (TASK-02)**

- Title bound 3-32 is enforced on update, but the backend's message is wrong — pin the copy
  client-side and never surface `errors.title` (T8).
- A description cannot be cleared: `""` is refused, `null`/omitted are no-ops (T9). This needs an
  explicit product decision before the form is built.

**Move task (TASK-04 / D-11)**

- Send the post-`arrayMove` final index verbatim; never omit `targetPosition` (T3).
- Lock only the moved task in flight — shifted siblings keep a usable version (T5).
- Two refusal branches: `400 ILLEGAL_ARGUMENT` cross-board, `403 ACCESS_DENIED` cross-account (T7).
- The move response carries no `columnId`, so the optimistic override must carry the destination
  itself (T1).

**Delete task (TASK-05)**

- Server-side cascade; no client-side subtask cleanup (T6).
- A double-submit delete returns `404 ENTITY_NOT_FOUND`, the same as any missing id (T6).

**Subtasks (SUBTASK-01…04)**

- A subtask title is bounded at 32 on update despite the contract declaring only `minLength: 1` on
  create (T8).
- Stale subtask writes return the same `409 OPTIMISTIC_LOCK_CONFLICT` as tasks (T4).

**Board read (Pitfall 15)**

- Sort each column's `tasks` by `position` at the read. Response order is creation order and visibly
  diverges from position order after any move (T3-adjacent).

**All seven mutations (SYNC-01)**

- One conflict branch covers everything: `409` / `OPTIMISTIC_LOCK_CONFLICT` (T4).
- Spell out every ancestor path segment as a convention, but do not describe the assertions as
  catching a runtime failure — there is none to catch (T2).

---

## Probe corrections

The probe was corrected once mid-plan, because run 1 could not answer three of its own questions:

- **T2** sent a 34-character title on the placeholder-ancestor subtask `PUT`, so its `400` was the
  update-side length bound (T8), not the path. With a short title the same request returns `200`.
- **T8** read `"Task title cannot be empty"` for both a 2-character and a 33-character title, which
  does not distinguish a 3-32 bound from any other rule. The in-bounds ends (3 and 32) were added,
  plus the same sweep for subtask titles.
- **T9** probed create only. "`null` left the description alone" cannot be told apart from
  "`description` is ignored on update entirely" without a changed-value control, so that control was
  added along with the `null` / omitted / single-space update cases.

Recorded here because the first reading of each was wrong in a way the transcript alone made look
like a real backend refusal.

---

_Phase: 04-task-subtask-workflow_
_Three full probe runs, 2026-08-28, all sections reproducing identically. Boards deleted; six
throwaway accounts persist (no delete-account endpoint)._
