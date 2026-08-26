# Phase 3 — Observed Backend Facts

> Produced by `scripts/probe-column-backend.mjs`, written and run against the deployed nonprod
> backend (`EXTERNAL_API_BASE_URL`) on 2026-08-26. **The probe never reached the point of issuing a
> column request** — its reachability preflight halted on every one of 14 attempts. This file
> therefore records the outage as observed, and every R section below stays `NOT YET OBSERVED`.
> Nothing here supersedes `03-RESEARCH.md`'s Assumptions Log A1–A5 yet.

---

## Status: BLOCKED

The nonprod backend's database was unavailable for the whole 2026-08-26 execution window. The probe
halts with exit code `2` in both observed failure modes, so neither is ever read as a defect in this
phase's code.

**Failure mode 1 — application layer up, database down** (10 of 14 attempts, 13:21Z–13:50Z):

```
POST /signup -> status 500, body: {"type":"about:blank","title":"Internal Server Error","status":500,
  "detail":"Unable to acquire JDBC Connection [HikariPool-1 - Connection is not available,
   request timed out after 30000ms (total=0, active=0, idle=0, waiting=2)] [n/a]",
  "instance":"/api/signup","code":"INTERNAL_ERROR"}
```

`total=0, active=0, idle=0` means the pool cannot open a single connection — the application is
serving requests, its database is not. This is byte-for-byte the same failure `03-RESEARCH.md`
§ "Environment Availability" recorded earlier the same day, so the outage has now persisted across
two independent sessions.

**Failure mode 2 — host not reachable at all** (4 of 14 attempts, 13:33Z–13:37Z):

```
POST /signup -> UND_ERR_CONNECT_TIMEOUT
DNS resolves: yes
TCP 443: timeout
```

Between 13:33Z and 13:37Z the host stopped accepting TCP connections entirely, then began answering
with failure mode 1 again. DNS resolution succeeded throughout, so this is the deployment going
away and coming back, not a name-resolution problem on the developer machine.

**Attempts:** 14, spread over roughly 28 minutes (13:21Z–13:50Z) — 2 by hand, then 12 on a 45-second
retry loop. The database never recovered inside that window.

**What unblocks this document:** re-run the probe once the nonprod database is back.

```bash
node --env-file=.env.local scripts/probe-column-backend.mjs
```

A healthy run prints seven labelled blocks (`## R1` … `## R7`) of raw status codes and bodies; the
answers then replace the `NOT YET OBSERVED` lines below. Exit code `2` means the backend, not the
probe, is the problem.

**What downstream plans should do meanwhile:** `03-07` already prescribes its own behaviour for this
state (build the duplicate-name branch anyway and report its reachability as unconfirmed). `03-10`'s
`<precondition>` holds the reorder work until R1 and R2 carry real observations — do not soften that
gate by reading `03-RESEARCH.md`'s assumptions as facts.

---

## R1 targetPosition semantics

**Question (supersedes A1):** With columns `Alpha, Bravo, Charlie, Delta` at positions 0–3, does
`PATCH /boards/{boardId}/columns/{alphaId}/reorder` with `{ version, targetPosition: 2 }` produce
`B,C,A,D` (so `targetPosition` is the moved column's **final** 0-based index, and `arrayMove`'s `to`
can be sent verbatim) or `B,A,C,D` (an insert-before-the-original-index semantic the client must
translate)?

**Observed:** NOT YET OBSERVED — the probe halted at its reachability preflight.

**Why it matters:** the single highest-value unknown in this phase. Every reorder lands one position
off in one direction if this is guessed wrong, silently, visible only after a reload.

---

## R2 version bump on shifted columns

**Question (supersedes A2):** After the R1 reorder, does `GET /boards/{boardId}/full` show a changed
`version` on the columns that merely **shifted** position rather than being moved? And does a rename
issued against a shifted column, carrying that column's pre-reorder `version`, still succeed?

**Observed:** NOT YET OBSERVED — the probe halted at its reachability preflight.

**Why it matters:** decides how wide plan 03-10's in-flight mutation lock must be (`03-RESEARCH.md`
Pitfall 6), and whether a mutation issued immediately after a reorder can be allowed at all.

---

## R3 stale-version reorder

**Question:** Replaying the R1 `PATCH` body verbatim — now carrying a stale `version` — what status
and problem-detail `code` comes back? `02-BACKEND-FACTS.md` P3 proved `409 OPTIMISTIC_LOCK_CONFLICT`
for a board rename, never for a column reorder.

**Observed:** NOT YET OBSERVED — the probe halted at its reachability preflight.

**Why it matters:** decides whether UI-SPEC's distinct version-conflict toast has a live branch on
the reorder path.

---

## R4 out-of-range and no-op targetPosition

**Question (supersedes A5):** `targetPosition: 99` (out of range), then `targetPosition` equal to the
column's own current position (a no-op) — what status, problem-detail `code`, and resulting `version`
does each produce?

**Observed:** NOT YET OBSERVED — the probe halted at its reachability preflight.

**Why it matters:** decides whether the client must clamp or short-circuit, and whether a no-op
reorder burns a `version` (which would make every client-held version stale for no user-visible
change).

---

## R5 duplicate column name

**Question (supersedes A3):** `POST /boards/{boardId}/columns` with a `name` already used by another
column on the same board — refused with `DUPLICATE_RESOURCE`, or accepted?

**Observed:** NOT YET OBSERVED — the probe halted at its reachability preflight.

**Why it matters:** UI-SPEC's "Duplicate column name" inline-on-the-field branch is dead code if the
backend accepts duplicates. This is `.planning/LEARNINGS.md`'s board-name lesson one containment
level down. `03-07` builds the branch regardless while this reads `NOT YET OBSERVED`, and reports
its reachability as unconfirmed.

---

## R6 cascade delete and position renumbering

**Question (supersedes A4):** After putting a task into `Bravo` and deleting `Bravo`, are the column
and its task both gone from `GET /boards/{boardId}/full`? Are the remaining columns' `position`
values renumbered contiguously — and does that still hold after deleting a **middle** column?

**Observed:** NOT YET OBSERVED — the probe halted at its reachability preflight.

**Why it matters:** the cascade is COLUMN-04's success criterion. Contiguous renumbering also
decides whether the `position % 3` dot-colour sequence reshuffles after a delete (cosmetic, but a
UAT surprise if unexpected).

---

## R7 double delete

**Question:** A second `DELETE` against an already-deleted column id — what status and
problem-detail `code`?

**Observed:** NOT YET OBSERVED — the probe halted at its reachability preflight.

**Why it matters:** decides whether a double-submit needs its own branch or falls through to the
shared not-found handling.

---

## Supersedes 03-RESEARCH.md A1-A5

Nothing yet. Each assumption stays exactly as `03-RESEARCH.md` rates it until its probe runs; no
verdict is recorded on the strength of an unrun probe.

| Assumption | Claim                                                        | Answered by | Risk if wrong | State            |
| ---------- | ------------------------------------------------------------ | ----------- | ------------- | ---------------- |
| **A1**     | `targetPosition` is the moved column's final 0-based index     | R1          | High          | NOT YET OBSERVED |
| **A2**     | A reorder does not bump merely-shifted columns' `version`       | R2          | High          | NOT YET OBSERVED |
| **A3**     | A duplicate column name is refused with `DUPLICATE_RESOURCE`    | R5          | Medium        | NOT YET OBSERVED |
| **A4**     | A delete renumbers remaining `position` values contiguously     | R6          | Medium        | NOT YET OBSERVED |
| **A5**     | An out-of-range `targetPosition` is refused, not clamped        | R4          | Low           | NOT YET OBSERVED |

---

## Consequences for plan 03-10 (reorder)

Not derivable yet — both inputs are `NOT YET OBSERVED`.

- **`targetPosition` value to send:** cannot be named until R1 runs. `arrayMove`'s `to` is only
  correct under one of the two candidate semantics, and `03-RESEARCH.md` A1 is an assumption, not an
  observation — do not send it verbatim on that basis.
- **In-flight mutation lock width:** `03-RESEARCH.md` Pitfall 6 prescribes disabling rename/delete on
  **every** column in the row while a reorder is in flight, as the version-safe superset under either
  R2 answer. That prescription still stands and costs nothing. Narrowing it to the moved column alone
  is available only once R2 shows that shifted columns keep their `version`.

---

_Phase: 03-column-management_
_Last probe attempt: 2026-08-26 13:50Z (exit 2, database down)_
