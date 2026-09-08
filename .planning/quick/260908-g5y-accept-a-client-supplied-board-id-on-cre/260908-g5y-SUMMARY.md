---
phase: quick-260908-g5y
plan: 01
subsystem: boards
tags: [optimistic-writes, api-contract, board-create, tanstack-query]
status: complete

requires:
    - "quick-260908-g4p (QUERY_KEY consolidation) — landed at 69844af before this ran"
provides:
    - "mintBoardId() — a base36 board id the backend accepts, minted before the create is issued"
    - "createBoardInputSchema.id — required, so a hostile or malformed id is refused at the boundary"
    - "The DELETE arm decision that quick task 260908-g5z branches on"
affects:
    - "quick-260908-g5z — the navigation half, now unblocked: the destination id is known pre-flight"
    - "quick-260908-g63 — ADR 0036 must record the cross-tenant existence oracle filed here"

tech-stack:
    added: []
    patterns:
        - "Client-minted entity id sent on create (boards only), replacing a placeholder-then-swap"
        - "Rejection sampling over crypto.getRandomValues for an unbiased base36 draw"

key-files:
    created:
        - src/features/boards/board-id.ts
        - src/features/boards/board-id.unit.test.ts
        - src/features/boards/actions/create-board-action.integration.test.ts
        - .planning/todos/pending/2026-09-08-frontend-zod-schemas-diverge-from-the-regenerated-contract.md
        - .planning/todos/pending/2026-09-08-client-supplied-board-id-opens-a-cross-tenant-existence-oracle.md
    modified:
        - docs/api/kanban-board-openapi.json
        - src/lib/core/api-contract/generated-types.ts
        - src/features/boards/schemas.ts
        - src/features/boards/schemas.unit.test.ts
        - src/features/boards/actions/create-board-action.ts
        - src/features/boards/hooks/use-create-board.ts
        - src/features/boards/hooks/use-prefetch-all-boards.ts
        - src/features/boards/model.ts
        - src/features/boards/model.unit.test.ts
        - src/features/boards/components/board-list/board-list.test.tsx
        - src/features/tasks/schemas.ts
        - src/lib/core/api-contract/task-schemas.ts
        - src/lib/client/use-unconfirmed-ids.ts
        - .planning/todos/pending/2026-08-24-sort-boards-by-createdat-once-backend-supplies-it.md

decisions:
    - "DELETE arm taken: onSuccess writes no boards-list row, and withBoardReplace is deleted outright"
    - "POST /boards answers 201, not the 200 the plan assumed — measured, not inferred"
    - "A fresh board's version is 0, confirming the plan's prior; the staged version: 0 is now measured"
    - "CREATE_FAILURE_COPY left unchanged — a DUPLICATE from an id collision is not worth its own copy"

metrics:
    duration: ~40 minutes
    completed: 2026-09-08

actuals:
    tokens: 41000
    tasks: 3
    commits: 3

plan_head_before: 69844af0fa85bdeed04410e1f8a8bb5fb3ce8639
---

# Quick task 260908-g5y: Accept a client-supplied board id on create — Summary

The board's id is now minted on the client before the create request is issued, so the sidebar's
optimistic row is staged under the board's **final** id rather than a placeholder something has to
swap afterwards.

## The `withBoardReplace` arm: **DELETE**

**The DELETE arm was taken.** `onSuccess` no longer writes the boards-list entry at all, and
`withBoardReplace` is deleted outright — its definition in `model.ts`, its one production call site
in `use-create-board.ts`, its import in `model.unit.test.ts` and its two-case describe block.

The measurement that chose it: the boards-list entry holds exactly three fields, and the server
answered with all three identical to the staged row.

| Field     | Staged in `onMutate`     | Server answered            | Differs? |
| --------- | ------------------------ | -------------------------- | -------- |
| `id`      | `mintBoardId()`          | the same id, echoed        | no       |
| `name`    | the trimmed form value   | the same string, verbatim  | no       |
| `version` | `0`                      | `0`                        | no       |

`name` is the one that could have drifted, so it is pinned rather than argued: a dedicated case
sends `Verbatim  Spacing <suffix>` with a **doubled internal space** — the only thing
`boardNameSchema.trim()` lets through unmodified — and asserts the response echoes it byte for
byte. If a future backend starts normalising names, that assertion goes red rather than the sidebar
silently desyncing.

Two further supports for DELETE: `withBoardReplace` on an id the list no longer holds was already a
no-op, so the MERGE arm bought nothing an interleaved refetch could use; and ADR tech/0030 rule 1
makes the action's `refresh()` + `HydrationBoundary` the authoritative retire path regardless.

**`260908-g5z` can branch on this sentence: the boards-list write in `onSuccess` is gone, and
`withBoardReplace` no longer exists.**

## Measured values, and the requests that produced them

All against the deployed nonprod backend on 2026-09-08, via `POST /boards?userId=<id>` with
`Content-Type: application/json` and a `JSESSIONID` cookie, body `{ name, id }` — exactly the
request `createBoardAction` issues.

**Fresh create (verbatim response body):**

```json
{"id":"2ggpg6zyfmud3","name":"Create With Id 0q1w7chh","version":0,"createdAt":"2026-09-08T12:39:03.734078Z"}
```

- **Status: `201`**, not `200`. See "What the plan got wrong" below.
- **`version` is `0`** — the plan's prior held, so `onMutate`'s staged `version: 0` is now a
  measured value rather than filler, and its comment says so.
- The id is echoed **exactly** as sent.

**Duplicate id (verbatim response body):**

```json
{"type":"about:blank","title":"Conflict","status":409,"detail":"Board with id 'g9x1uzc1oqd8g' already exists","instance":"/api/boards","code":"DUPLICATE_RESOURCE"}
```

Carried through `mapProblemCodeToStatus` in the test itself → `RESULT_STATUS.DUPLICATE`.

**Malformed id — all four refused `400` with the same body shape:**

```json
{"type":"about:blank","title":"Bad Request","status":400,"detail":"Validation failed","instance":"/api/boards","code":"VALIDATION_FAILED","errors":{"id":"Board id must be a lowercase alphanumeric string matching the generator's format"}}
```

Cases: a `crypto.randomUUID()`, an uppercase 13-char id, a 14-char id, and `""`. The first is the
important one — it is what this hook minted until today, so the format is load-bearing, not
stylistic.

**`createdAt` observation:** the create response **does** carry it, but the regenerated contract
still declares `BoardResponseDTO` as `{ id, name, version }`, so it arrives undeclared and
`boardSchema` drops it. Recorded on
`.planning/todos/pending/2026-08-24-sort-boards-by-createdat-once-backend-supplies-it.md` with the
caveat that only the CREATE response was observed — `GET /boards` is unmeasured and is the read that
todo actually depends on.

## Both-directions falsification

### `board-list.test.tsx` — the load-bearing browser assertion

Production edits reverted to HEAD (`schemas.ts`, `create-board-action.ts`, `use-create-board.ts`,
`model.ts`), test edits kept. **RED, both viewports:**

```
 × shows the new board in the sidebar before the create resolves 312ms
 × shows the new board in the sidebar before the create resolves 294ms

Error: expect(element).toHaveAttribute("href", "/boards/undefined")
Expected the element to have attribute:
  href="/boards/undefined"
Received:
  href="/boards/235a0b4d-fd2d-49f9-886e-d4afbd523b68"

 Test Files  1 failed (1)
      Tests  2 failed | 76 passed (78)
```

`createBoardStub.calls[0].id` is `undefined` pre-fix (the action took only `{ name }`), while the
row carried a client-side `randomUUID` — exactly the divergence this task removes. **GREEN after:**

```
 Test Files  2 passed (2)
      Tests  88 passed (88)
```

### `schemas.unit.test.ts` — the new `createBoardInputSchema` cases

**RED against the unfixed schema, 4 failures:**

```
 FAIL  createBoardInputSchema > yields the trimmed name for a well-formed input
 - Expected: "zud53urgkb0nh"   + Received: undefined

 FAIL  createBoardInputSchema > rejects an input carrying no id at all
 AssertionError: expected true to be false

 FAIL  createBoardInputSchema > refuses an id outside the backend's own base36 format
 AssertionError: expected true to be false

 FAIL  createBoardInputSchema > drops an unrelated userId supplied alongside the name
 - "id": "xwj3nrkn7piks",   "name": "Platform Launch",

 Test Files  1 failed (1)
      Tests  4 failed | 51 passed (55)
```

**GREEN after** (with `board-id.unit.test.ts` and `model.unit.test.ts`):

```
 Test Files  3 passed (3)
      Tests  117 passed (117)
```

### The integration test

Falsified in the other direction, by measurement: written asserting `200`, run, observed `201`
(`AssertionError: expected 201 to be 200`, 3 failures), corrected to `201`, re-run green. The
`version: 0` and duplicate/malformed assertions were correct on the first draw.

`board-id.unit.test.ts` has no meaningful pre-fix direction — the module it tests did not exist, so
its RED is an import failure. Saying so rather than dressing it up: what actually falsifies the
minter's format is the backend's own `400` on a `randomUUID`, measured above.

## Gates — real output

| Gate                                              | Exit | Output                                                                                    |
| ------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| contract assertions (Task 1 verify 1)             | 0    | silent (throws on failure)                                                                  |
| `pnpm api:generate` + `id?: string` assertion     | 0    | silent                                                                                      |
| regeneration idempotence                          | 0    | `regeneration is idempotent`                                                                |
| colour-format comment corrected                   | 0    | `the colour-format claim is corrected`                                                      |
| subtask-bounds comment corrected                  | 0    | `the subtask-bounds claim is corrected`                                                     |
| update-task-bounds comment corrected              | 0    | `the update-task-bounds claim is corrected`                                                 |
| schemas themselves untouched                      | 0    | `the schemas themselves are untouched — comment-only corrections`                           |
| oracle todo names `260908-g63`                    | 0    | `the oracle todo names the ADR plan that must record it`                                    |
| `pnpm keys:check`                                 | 0    | `keys:check passed — no board query-key literal found outside its declaration file.`        |
| `pnpm comments:check`                             | 0    | `comments:check passed — no comment block exceeds 3 prose lines.`                           |
| `pnpm coverage:check`                             | 0    | `coverage:check passed — every source file without a co-located direct test names one that exists (167 source files scanned).` |
| `pnpm lint`                                       | 0    | `$ eslint .` (no findings)                                                                  |
| `pnpm exec tsc --noEmit`                          | 0    | no output                                                                                   |
| `vitest --project node` (integration)             | 0    | `Test Files 1 passed (1) / Tests 5 passed (5)`                                               |
| `vitest --project unit` (3 files)                 | 0    | `Test Files 3 passed (3) / Tests 117 passed (117)`                                           |
| `vitest --project browser` (2 files)              | 0    | `Test Files 2 passed (2) / Tests 88 passed (88)`                                             |
| `playwright --project=e2e boards-create`          | 0    | `2 passed (34.5s)` — both tests, including the flake-prone second one, first try             |
| **`pnpm verify`**                                 | **0**| **`pnpm verify passed — 21 steps, total 514524ms`**, e2e `81 passed (2.6m)`                  |

Every one of the 12 comment-audit greps passes; full block re-run after the fix, all `exit=0`.

`ls -A .e2e-seeded-users/` returns nothing — no account left behind, and `pnpm e2e:cleanup` was
never needed because every seeding path here registers through the harness's own teardown.

## What the plan got wrong

1. **`POST /boards` answers `201`, not `200`.** Task 2's `<behavior>` states "returns 200". The
   first run failed three assertions on it. `openapi-fetch` treats any 2xx as success so the action
   is unaffected, but the plan's stated number was wrong and the test now pins the real one.
2. **`board-id.unit.test.ts` cannot be falsified against the unfixed tree** in the way the plan's
   TDD framing implies. A brand-new module's only pre-fix state is "does not exist". Recorded rather
   than papered over.
3. Everything else the plan asserted held, including the two it flagged as most likely to bite: the
   JSON diff was exactly **57 added / 16 removed** and the TypeScript diff exactly **10 added / 0
   removed**, both as measured at planning time. `grep "swaps its" model.ts` matched only
   `withBoardReplace` (the `withColumnReplace` sibling wraps between "swaps" and "its", so the
   over-broad-looking gate is in fact precise).

## Deviations from plan

**1. [Rule 2 — required by the decision] Added a fifth integration case, `echoes the name back byte
for byte`.** The DELETE arm rests on the server not transforming the name; the plan argued that from
`boardNameSchema.trim()` rather than measuring it. Since DELETE removes the merge that would have
absorbed a difference, the claim needed a running guard. Committed with Task 3 rather than Task 2,
so the file appears in Task 3's diff though not in its declared `files` list.

**2. [Rule 3] Removed a now-unused `eslint-disable` on `onSuccess`.** Dropping the second parameter
made the ADR tech/0016 positional-call exemption dead, and `pnpm lint` reported it as an unused
directive. Replaced with a one-line note contrasting it with `onError`, which still needs its own.

**3. [Rule 1] Reworded the `use-unconfirmed-ids.ts` main doc twice.** The first rewrite kept the
opening clause "Every optimistic create stages its row under…", which the plan's own verify grep
refuses. Rewritten to lead with the column/task/subtask case and name the board as the exception —
which is what the plan's prose asked for, and now what its gate accepts.

**4. Not pushed.** The plan's Task 3 ends with "push and block on `gh run watch`". The dispatch
instruction for this run was an explicit **do NOT push**, so local `pnpm verify` green is where this
stops. **CI has not signed off.** Per CLAUDE.md, this task is not "done" until it does.

## Scope held

- `SaveColumnRequestDTO`, `SaveTaskRequestDTO` and `SaveSubtaskRequestDTO` gained no `id` — asserted
  mechanically in Task 1's first verify.
- `src/lib/client/use-unconfirmed-ids.ts` survives; only its two doc comments changed. Its 5
  non-board call sites (`use-open-board-columns.ts`, `board-view.tsx` ×2, `edit-task-modal.tsx`,
  `task-detail-modal.tsx`) are untouched, and the `clientId` variables field keeps its name.
- Exactly one `crypto.randomUUID()` remains in `use-create-board.ts` — the column fan-out's.
- `router.push` still fires after the action settles, reading the id off the response. Its comment
  was rewritten rather than deleted, precisely so a reader does not "simplify" the push forward —
  that is `260908-g5z`'s change.
- **Both LEAVE entries confirmed by reading them, not by assuming:** `board-view.tsx:81-85` still
  says "client-generated placeholders" about columns and tasks (correct — they keep server-issued
  ids), and `boardNameSchema`'s 2026-08-25 measured-ceiling record at `schemas.ts:75-79` is
  untouched, because the regeneration **confirms** it (`SaveBoardRequestDTO.name.maxLength: 64`).
- No ADR 0029 machinery: no override store, no staleness guard, no `useOptimistic` fold. The change
  stays inside tech/0030's `onMutate`/`setQueryData`/`onError`/`onSuccess` shape.

## `CREATE_FAILURE_COPY` — decided, not defaulted

Left unchanged. An id collision surfaces as `RESULT_STATUS.DUPLICATE`, whose copy reads "A board
with that name already exists. / Choose a different name." — literally wrong for an id collision.
Kept anyway, because reaching it requires two independent 13-symbol base36 draws to coincide
(36^13 ≈ 1.7e20), and each attempt including a Retry mints afresh. Adding a branch for it would
mean new copy through the UI-SPEC Copywriting Contract to serve an outcome nobody will observe.

## Known Stubs

None.

## Threat Flags

| Flag                   | File                                          | Description                                                                                                        |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| threat_flag: info-leak | (backend) `BoardService.java:216`             | Accepting a client id makes create a cross-tenant existence oracle — global `existsById` before `setUser`. Filed as a todo naming `260908-g63`/ADR 0036; a BACKEND fix, not closable here. |

## Self-Check: PASSED

- `src/features/boards/board-id.ts` — FOUND
- `src/features/boards/board-id.unit.test.ts` — FOUND
- `src/features/boards/actions/create-board-action.integration.test.ts` — FOUND
- `.planning/todos/pending/2026-09-08-frontend-zod-schemas-diverge-from-the-regenerated-contract.md` — FOUND
- `.planning/todos/pending/2026-09-08-client-supplied-board-id-opens-a-cross-tenant-existence-oracle.md` — FOUND
- `6eae4a4`, `650548f`, `287aac5` — all FOUND in `git log`
