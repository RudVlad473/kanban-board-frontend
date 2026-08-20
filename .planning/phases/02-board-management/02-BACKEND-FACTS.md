# Phase 2 — Observed Backend Facts

> Produced by `scripts/probe-board-backend.mjs` run directly against the deployed nonprod
> backend (`EXTERNAL_API_BASE_URL`) on 2026-08-20. Every response below is quoted verbatim from
> that run — this file records observation, not inference. Resolves 02-RESEARCH.md's Assumptions
> Log entries A1, A2, A3 and Open Questions 1 and 2.

---

## P1

**Question (A1 / Open Question 1):** Does `GET /boards` return creation order, reverse-creation
order, alphabetical order, or none of those?

Three boards were created in sequence — "Probe Alpha", "Probe Bravo", "Probe Charlie" — then
`GET /boards` was called.

```
created board "Probe Alpha"   -> status 201, body: {"id":"8okxhwo6oq2o","name":"Probe Alpha","version":0}
created board "Probe Bravo"   -> status 201, body: {"id":"8okxhxzwqvwg","name":"Probe Bravo","version":0}
created board "Probe Charlie" -> status 201, body: {"id":"8okxhzbzajgg","name":"Probe Charlie","version":0}
GET /boards -> status 200, names in order: ["Probe Alpha","Probe Bravo","Probe Charlie"]
```

**Observed:** `GET /boards` returns boards in **creation order (oldest first)** — the exact
opposite of D-12's "newest first" requirement. It is neither reverse-creation order nor
alphabetical (this sample happens to also be alphabetical, but P2 below shows the id itself sorts
in creation order too, which is the stronger, non-coincidental signal).

**Implementation instruction:** Consuming the array as-is does NOT give newest-first. Reversing
the array client-side does.

---

## P2

**Question (A2):** What is the literal `id` format? Do the three ids sort as strings in creation
order? Do they look like UUIDv4, ULID/UUIDv7, or a numeric string?

```
Probe Alpha:   id = 8okxhwo6oq2o
Probe Bravo:   id = 8okxhxzwqvwg
Probe Charlie: id = 8okxhzbzajgg
sorting the three ids as strings reproduces creation order: true
VERDICT: unrecognized shape (not UUIDv4/UUIDv7/numeric)
```

**Observed:** Ids are 12-character lowercase alphanumeric strings — not a recognizable UUIDv4,
UUIDv7/ULID, or plain numeric format. However, **string-sorting the three ids ascending exactly
reproduces creation order**, which is the property that actually matters for D-12/D-13: the id is
a monotonically increasing, lexicographically-sortable token even though its concrete encoding
(base32/base36-style, opaque) is not one of the three named formats the probe checked for.

**Implementation instruction:** Sorting boards by `id` descending (string comparison) reproduces
**newest-first** order — confirmed equivalent to reversing `GET /boards`'s own array for this
dataset, since both signals (list order and id order) agree.

---

## P3

**Question (A3 / Open Question 2):** `PUT /boards/{id}` with a stale `version` (current − 1) —
what status code and raw body?

```
status: 409
body: {"type":"about:blank","title":"Conflict","status":409,"detail":"Board was modified by another request, please refetch.","instance":"/api/boards/8okxhwo6oq2o","code":"OPTIMISTIC_LOCK_CONFLICT"}
```

**Observed:** `409 Conflict`, with the same RFC 7807-flavoured shape
(`type`/`title`/`status`/`detail`/`instance`/`code`) `src/lib/core/api-contract/problem-detail.ts`
already parses — but `code` is `"OPTIMISTIC_LOCK_CONFLICT"`, a value **not present** in that
file's current `PROBLEM_CODE` const (which only lists `VALIDATION_FAILED`, `DUPLICATE_RESOURCE`,
`DATA_INTEGRITY_VIOLATION`, `BAD_CREDENTIALS`, `UNAUTHENTICATED`, `ACCESS_DENIED`,
`INTERNAL_ERROR`). `isProblemCode` rejects any `code` outside that set, so
`parseProblemDetail` would currently return `null` for a real 409 board-conflict response.

**Implementation instruction:** The shape is directly reusable — no board-specific parser is
needed. `PROBLEM_CODE` must be extended with an `OPTIMISTIC_LOCK_CONFLICT` entry before board
Route Handlers rely on `parseProblemDetail` to recognize a 409 version conflict.

---

## P4

**Question:** `POST /boards` with an empty `name`, then a 1000-character `name` — status + raw
body for each?

```
empty name     -> status: 400, body: {"type":"about:blank","title":"Bad Request","status":400,"detail":"Validation failed","instance":"/api/boards","code":"VALIDATION_FAILED","errors":{"name":"Board name must not be blank"}}
1000-char name -> status: 400, body: {"type":"about:blank","title":"Bad Request","status":400,"detail":"Validation failed","instance":"/api/boards","code":"VALIDATION_FAILED","errors":{"name":"Board name cannot be empty"}}
```

**Observed:** Both are rejected with `400 VALIDATION_FAILED`. An empty name gets the expected
"must not be blank" message. A 1000-character name is *also* rejected — with the same
"cannot be empty" wording, which is a backend message-text quirk (the field is not empty), but the
status code proves a `maxLength` ceiling exists somewhere between 1 and 1000 characters. This
probe run tested two data points (0 and 1000 chars), not a boundary search, so the exact cutoff
is not pinned by this observation.

**Implementation instruction:** The client Zod schema for board `name` must add a `maxLength`
(the contract currently declares only `minLength: 1`). Until the exact cutoff is narrowed by a
follow-up probe, pick a conservative bound comfortably under 1000 (e.g. 100, matching the
column-name-to-board-name ratio the UI mocks imply) rather than omitting the constraint — see
Escalate below.

---

## P5

**Question:** `POST /boards/{id}/columns` three times in sequence ("Todo", "Doing", "Done"), then
`GET /boards/{id}/full` — does the backend assign `position` by call order?

```
created column "Todo"  -> status 201, body: {"id":"8okxi5q9xj40","name":"Todo","version":0,"position":0}
created column "Doing" -> status 201, body: {"id":"8okxi74fe51c","name":"Doing","version":0,"position":1}
created column "Done"  -> status 201, body: {"id":"8okxi8h4evpc","name":"Done","version":0,"position":2}
GET /boards/{id}/full -> status 200, columns: [{"name":"Todo","position":0},{"name":"Doing","position":1},{"name":"Done","position":2}]
VERDICT: sequential creation produces ascending position: true
```

**Observed:** `position` is assigned strictly by call order (0, 1, 2 for Todo/Doing/Done, in that
order) — confirms the assumption ADR domain/0003's no-parallel-calls rule rests on.

**Implementation instruction:** Client-orchestrated sequential column creation (D-03) is safe to
rely on for ordering; no client-side reordering call is needed after initial creation.

---

## P6

**Question:** `POST /boards/{id}/columns` with a 2-character name and a 33-character name — status
+ raw body for each?

```
2-char name  -> status: 400, body: {"type":"about:blank","title":"Bad Request","status":400,"detail":"Validation failed","instance":"/api/boards/8okxhwo6oq2o/columns","code":"VALIDATION_FAILED","errors":{"name":"Column name cannot be less than 3 character and more than 32 characters"}}
33-char name -> status: 400, body: {"type":"about:blank","title":"Bad Request","status":400,"detail":"Validation failed","instance":"/api/boards/8okxhwo6oq2o/columns","code":"VALIDATION_FAILED","errors":{"name":"Column name cannot be less than 3 character and more than 32 characters"}}
```

**Observed:** Both rejected with `400 VALIDATION_FAILED`, and the error message states the exact
enforced bounds: **3–32 characters** — matching the OpenAPI contract's declared
`SaveColumnRequestDTO`/`UpdateColumnRequestDTO` `minLength`/`maxLength` exactly.

**Implementation instruction:** The client Zod schema for column `name` should mirror the
contract's declared bounds verbatim: `z.string().min(3).max(32)`. No adjustment needed.

---

## P7

**Question (ACCESS CONTROL, ASVS V4):** From account B's session, can `GET /boards/{A's boardId}/full`
succeed with `userId=B`? With `userId=A`? Can `DELETE /boards/{A's boardId}?userId=A` succeed?

```
B reads A's board with userId=B -> status: 403, body: {"type":"about:blank","title":"Forbidden","status":403,"detail":"You do not have access to that board","instance":"/api/boards/8okxhwo6oq2o/full","code":"ACCESS_DENIED"}
B reads A's board with userId=A -> status: 403, body: {"type":"about:blank","title":"Forbidden","status":403,"detail":"You do not have access to that board","instance":"/api/boards/8okxhwo6oq2o/full","code":"ACCESS_DENIED"}
B attempts DELETE on A's board with userId=A -> status: 403, body: {"type":"about:blank","title":"Forbidden","status":403,"detail":"You do not have access to that board","instance":"/api/boards/8okxhwo6oq2o","code":"ACCESS_DENIED"}
```

**Observed:** All three attempts were rejected with `403 ACCESS_DENIED` — **including the attempt
that passed `userId=A`**, account A's own id. This proves the backend derives the authenticated
identity from the session (`JSESSIONID`) itself and ignores/cross-checks the client-supplied
`userId` query parameter rather than trusting it; account B cannot access account A's board no
matter which `userId` value is sent.

**Implementation instruction:** The backend enforces board ownership server-side. The Route
Handler's server-derived `userId` (never a client-chosen one) is a sufficient control — no
additional per-request ownership check is needed in this frontend. Board data is safe to ship on
this axis.

---

## Decisions this resolves

| Finding | Implementation instruction |
|---|---|
| D-12/D-13 ordering | `GET /boards` returns creation order (oldest-first), not newest-first. Newest-first **is achievable**: reverse the array client-side (equivalently, sort by `id` descending as a string — P1 and P2 agree). **Resolved by Task 4's checkpoint (see "Developer Decision" below): reverse the fetched `GET /boards` array client-side for newest-first.** |
| A3 error shape | `parseProblemDetail`'s shape is reusable verbatim. `PROBLEM_CODE` (`src/lib/core/api-contract/problem-detail.ts`) must gain an `OPTIMISTIC_LOCK_CONFLICT` entry before board Route Handlers can recognize a 409 version conflict — no separate board-specific parser needed. |
| P4 board-name bound | `minLength: 1` matches the contract. A `maxLength` exists (1000 chars is rejected) but its exact value was not pinned by this probe's two data points — see Escalate. |
| P6 column-name bound | Exactly `3–32` characters, matching the contract's declared `SaveColumnRequestDTO`/`UpdateColumnRequestDTO` bounds. Zod schema: `z.string().min(3).max(32)`. |
| P5 column position | Sequential creation produces strictly ascending `position` (0, 1, 2, ...) — confirms ADR domain/0003's no-parallel-calls assumption holds. |
| P7 access control | Backend enforces board ownership server-side by session identity, independent of the client-supplied `userId` query parameter. The Route Handler's server-derived `userId` is sufficient; no additional frontend ownership check is required. **Resolved by Task 4's checkpoint (see "Developer Decision" below): the finding is trusted, proceed with board plans as written.** |

---

## Developer Decision (Task 4 checkpoint, 2026-08-20)

The gate="blocking-human" checkpoint in Task 4 was presented to the developer with both findings
quoted verbatim. Decisions given:

- **Ordering:** `ordering-developer-choice` — reverse the fetched `GET /boards` array client-side
  for newest-first display, rather than a server-side/id-based sort. Implementation for plan
  02-08 onward: after `GET /boards` resolves, reverse the returned array before rendering the
  sidebar list; this is equivalent in output to descending-id sort for this backend's data (P1,
  P2) but keeps the sort logic anchored to the array the backend actually returns instead of a
  second, independently-maintained id-comparison function.
- **Access control:** `access-control-proceed` — the P7 finding (403 `ACCESS_DENIED` on all three
  cross-account attempts, including the one using account A's own `userId`) is trusted. Board
  plans proceed as written; the Route Handler's server-derived `userId` is confirmed sufficient
  and no additional frontend ownership check is required.

Both findings are now closed — nothing from this plan's seven observations remains open for a
developer decision.

---

## Escalate

- **Board-name `maxLength` not precisely pinned.** P4 confirmed a ceiling exists somewhere
  between 1 and 1000 characters but did not binary-search for the exact value. Not blocking —
  a conservative client-side bound (e.g. 100) is safe to ship, and the backend will reject
  anything the client under-restricts, but a follow-up probe run narrowing the exact cutoff would
  let the Zod schema match the backend precisely instead of conservatively. No other item from
  this plan's seven observations requires developer escalation — ordering is achievable (not
  "neither"), and the backend does enforce board ownership server-side (not "does not").
