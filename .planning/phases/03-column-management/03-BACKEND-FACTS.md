# Phase 3 — Observed Backend Facts

> Produced by `scripts/probe-column-backend.mjs` against the deployed nonprod backend
> (`EXTERNAL_API_BASE_URL`). The 2026-08-26 morning run never reached a column request — its
> reachability preflight halted on all 14 attempts against a database outage (full record kept
> below). Nonprod recovered later the same day; a follow-up run completed cleanly end to end and
> produced real answers to R1-R7. This file now supersedes `03-RESEARCH.md`'s Assumptions Log
> A1-A5 with observed facts.

---

## Status: OBSERVED

The probe completed a full run against the live nonprod backend: seeded a throwaway account, one
board, and four columns (`Alpha, Bravo, Charlie, Delta`), then exercised R1-R7 in sequence. All
seven sections below carry real, dated observations.

**Traceability:** account `probe-column-7a6d020e-7c04-4fd3-876e-8c2ba4f4cb5a@example.com`, board
`8p6wapihj9j4`. Permanent nonprod records (no delete-account endpoint exists), but hold no state
any other plan depends on.

**Prior outage (historical, resolved):** the database was unreachable for the entire 2026-08-26
13:21Z-13:50Z window — 10/14 attempts `500 INTERNAL_ERROR` from an exhausted JDBC pool
(`total=0, active=0, idle=0`), 4/14 `UND_ERR_CONNECT_TIMEOUT` at the transport layer. Byte-for-byte
the same failure `03-RESEARCH.md` recorded earlier that day. Resolved; no action needed.

---

## R1 targetPosition semantics — CONFIRMED (final index)

**Question (supersedes A1):** With columns `Alpha, Bravo, Charlie, Delta` at positions 0-3, does
`PATCH /boards/{boardId}/columns/{alphaId}/reorder` with `{ version, targetPosition: 2 }` produce
`B,C,A,D` (final 0-based index — `arrayMove`'s `to` sent verbatim) or `B,A,C,D`
(insert-before-original-index, needing client translation)?

**Observed:** `targetPosition` is the moved column's **final 0-based index**. Moving Alpha (at
position 0) with `targetPosition: 2` left it at `position: 2`; Bravo and Charlie shifted down to
fill 0 and 1; Delta (already past the target) stayed at 3 — i.e. `B, C, A, D`.

```
PATCH /boards/{boardId}/columns/{alphaId}/reorder  body: {"version":0,"targetPosition":2}
-> 200 {"id":"8p6wapqy6vpc","name":"Alpha","version":1,"position":2}
```

**Consequence for 03-10:** send dnd-kit's post-`arrayMove` final index directly as
`targetPosition` — no translation needed.

---

## R2 version bump on shifted columns — CONFIRMED (not bumped)

**Question (supersedes A2):** After the R1 reorder, does `GET /boards/{boardId}/full` show a
changed `version` on columns that merely **shifted** position? Does a rename against a shifted
column, carrying its pre-reorder `version`, still succeed?

**Observed:** Only the **moved** column's version changed (Alpha: 0 → 1). Both columns that
merely shifted kept their version unchanged (Bravo: pos 1→0, version stayed 0; Charlie: pos 2→1,
version stayed 0); the untouched column (Delta) was also unchanged. A `PUT` rename against the
shifted "Charlie", carrying its **pre-reorder** version (0), succeeded (`200`, new version 1) — a
shifted column's pre-reorder version is still valid for its next mutation.

**Consequence for 03-10:** `03-RESEARCH.md` Pitfall 6's whole-row in-flight mutation lock is not
required by version-safety alone — a mutation against a shifted-but-not-moved column succeeds
with its pre-reorder version. Whether to narrow the lock to just the moved column is 03-10's own
call to make against this observation, not a default prescribed here.

---

## R3 stale-version reorder — CONFIRMED (409 OPTIMISTIC_LOCK_CONFLICT)

**Question:** Replaying the R1 PATCH body verbatim, now carrying a stale `version` — what status
and problem-detail `code`? `02-BACKEND-FACTS.md` P3 proved this for a board rename, never a column
reorder.

**Observed:** Replaying `{"version":0,"targetPosition":2}` against Alpha (now at `version: 1`)
returned:

```
409 {"type":"about:blank","title":"Conflict","status":409,
 "detail":"Column was modified by another request, please refetch.","code":"OPTIMISTIC_LOCK_CONFLICT"}
```

**Consequence:** same problem-detail code as the board-rename conflict — the existing
version-conflict toast branch covers the reorder path with no new code path needed.

---

## R4 out-of-range and no-op targetPosition — REFUTES A5 (clamped, not refused)

**Question (supersedes A5):** `targetPosition: 99` (out of range), then `targetPosition` equal to
the column's own current position (a no-op) — refused, clamped, or version-burning?

**Observed:** `targetPosition: 99` against a 4-column board (valid indices 0-3) was **not
refused** — it was silently clamped to the last valid index (3), and did bump the version because
a real position change occurred (Alpha: position 2→3, version 1→2). Immediately re-sending
`targetPosition: 3` (now Alpha's own current position — a true no-op) returned `200` with the
**same** version (2, unchanged) — a no-op reorder does not burn a version.

```
targetPosition: 99 -> 200 {"version":2,"position":3}   (clamped from 99 to 3)
targetPosition: 3  -> 200 {"version":2,"position":3}   (no-op: no version change)
```

**Consequence:** the client does not need to validate/clamp `targetPosition` before sending — the
server clamps silently. A no-op drag (dropped back where it started) is safe to send as-is and
costs no version.

---

## R5 duplicate column name — REFUTES A3 (accepted, not refused)

**Question (supersedes A3):** `POST /boards/{boardId}/columns` with a `name` already used by
another column on the same board — refused with `DUPLICATE_RESOURCE`, or accepted?

**Observed:** Accepted. `POST` with `{"name":"Alpha"}` on a board that already had a column named
"Alpha" returned `201`, not a refusal:

```
201 {"id":"8p6warv43f9c","name":"Alpha","version":0,"position":4}
```

The board now holds two columns both named "Alpha". No `DUPLICATE_RESOURCE` (or any)
problem-detail code was returned.

**Consequence — flags 03-07:** this is `.planning/LEARNINGS.md`'s board-name lesson one
containment level down. UI-SPEC's "duplicate column name" inline-on-the-field validation branch
has **no backend enforcement behind it** — the backend accepts duplicates unconditionally. 03-07
must not build a rejection branch expecting a `DUPLICATE_RESOURCE` response (it will never arrive);
if the inline validation stays, document it explicitly as client-side-only UX with no server
backstop — a duplicate can still reach the board via any path that skips it, or a race between two
clients.

---

## R6 cascade delete and position renumbering — CONFIRMED

**Question (supersedes A4):** After putting a task into `Bravo` and deleting `Bravo`, are the
column and its task both gone from `GET /boards/{boardId}/full`? Are remaining columns'
`position` values renumbered contiguously — including after deleting a **middle** column?

**Observed:** Deleting "Bravo" (holding one task) removed both the column and its task
(`Bravo absent: true; its task absent: true`). Remaining columns' positions renumbered
contiguously (`[3,0,1,4]` → `[2,0,1,3]`), and this held again after deleting a second, **middle**
column ("Delta" at position 1): remaining positions renumbered to `[1,0,2]`. In both cases the
renumbered columns' **versions did not change** — only `position` shifted, consistent with R2's
finding that shifting alone never bumps version.

**Consequence:** the `position % 3` decorative-dot colour cycle (U-03) does reshuffle after any
delete, for every column past the deleted one — cosmetic, but real; dot rendering must key off the
live `position` after a delete, not a cached index.

---

## R7 double delete — CONFIRMED (404 ENTITY_NOT_FOUND)

**Question:** A second `DELETE` against an already-deleted column id — what status and
problem-detail `code`?

**Observed:**

```
DELETE {alreadyDeletedColumnId} -> 404
{"type":"about:blank","title":"Not Found","status":404,"detail":"Column was not found","code":"ENTITY_NOT_FOUND"}
```

**Consequence:** a double-submit delete falls through to the same not-found handling as any other
missing-id lookup — no dedicated conflict code for "already deleted."

---

## Supersedes 03-RESEARCH.md A1-A5

| Assumption | Claim | Answered by | Risk if wrong | State |
| ---------- | ----- | ----------- | ------------- | ----- |
| **A1** | `targetPosition` is the moved column's final 0-based index | R1 | High | **CONFIRMED** |
| **A2** | A reorder does not bump merely-shifted columns' `version` | R2 | High | **CONFIRMED** |
| **A3** | A duplicate column name is refused with `DUPLICATE_RESOURCE` | R5 | Medium | **REFUTED** — duplicates are accepted (201), no server enforcement |
| **A4** | A delete renumbers remaining `position` values contiguously | R6 | Medium | **CONFIRMED** (holds for both a task-holding delete and a middle-position delete) |
| **A5** | An out-of-range `targetPosition` is refused, not clamped | R4 | Low | **REFUTED** — clamped to the last valid index; the clamped move bumps version, a true no-op does not |

---

## Consequences for plan 03-10 (reorder)

- **`targetPosition` value to send:** dnd-kit's post-`arrayMove` final index, verbatim — R1
  confirms this is exactly what the API expects.
- **In-flight mutation lock width:** R2 confirms a shifted (not moved) column's pre-reorder
  version stays valid for its next mutation. `03-RESEARCH.md` Pitfall 6's whole-row lock is no
  longer the only version-safe option — 03-10 can choose to narrow the lock to just the moved
  column now that the observation backing that choice exists, or keep the wider lock for other
  reasons (e.g. UX). The choice and its rationale belong in 03-10's own plan/execution.
- **Client-side clamping:** not needed — the server clamps out-of-range values itself, and a
  same-position no-op costs no version.

## Consequences for plan 03-07 (add column)

- R5 refutes A3: the backend enforces no column-name uniqueness. 03-07's duplicate-name branch, if
  kept, is client-side-only UX with no server backstop — do not wire it to expect a
  `DUPLICATE_RESOURCE` response, and document the branch as advisory rather than authoritative.

---

_Phase: 03-column-management_
_Probe history: outage 2026-08-26 13:21Z-13:50Z (14 attempts, exit 2 both times); resolved later
the same day; full R1-R7 run completed cleanly against account
`probe-column-7a6d020e-7c04-4fd3-876e-8c2ba4f4cb5a@example.com`, board `8p6wapihj9j4`._
