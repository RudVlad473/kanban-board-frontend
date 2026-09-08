---
phase: quick-260908-g5z
plan: 01
subsystem: boards
tags: [routing, optimistic-updates, history-api, board-create, tanstack-query]
status: complete

requires:
    - quick-260908-g4p
    - quick-260908-g5y
    - quick-260908-g61
provides:
    - "Board create moves the URL at SUBMIT via `window.history.pushState`, with the board and its typed columns painted from the query cache in the same frame"
    - "A settle gate on the column fan-out's network dispatch, plus a `boardLanded` discriminant so a refused create raises exactly one toast"
    - "A guarded `replaceState` URL rollback that does not yank a user who navigated away"
    - "Measured proof that the backend answers 404 ENTITY_NOT_FOUND for a column on a board it has never seen"
affects:
    - quick-260908-g63

tech-stack:
    added: []
    patterns:
        - "Native History API (`window.history.pushState`) at `onMutate`'s tail — the URL move is part of the optimistic write, not a separate navigation"
        - "A settle promise carried on the fan-out claim, awaited inside `mutationFn` so staging stays instant while only the dispatch waits"

key-files:
    created:
        - .planning/todos/pending/2026-09-08-the-column-fan-out-handoff-could-now-collapse-back-into-createboard.md
    modified:
        - src/features/boards/hooks/use-create-board.ts
        - src/features/boards/hooks/use-create-board-columns.ts
        - src/features/boards/hooks/use-run-pending-column-fan-out.ts
        - src/features/boards/pending-column-fan-out.ts
        - src/components/layout/board-view/board-screen.tsx
        - src/components/layout/board-view/board-view.tsx
        - src/components/layout/board-view/board-view.test.tsx
        - src/features/boards/components/board-list/board-list.test.tsx
        - e2e/boards-create.e2e.spec.ts
        - e2e/optimistic-guards.e2e.spec.ts
        - e2e/quality-baseline.json
    deleted: []

decisions:
    - "C2 arm: the server catches up on its own — no follow-up `router.replace` was added"
    - "C3 arm: the backend REFUSES (404 ENTITY_NOT_FOUND), so the settle gate AND the outcome discriminant both shipped"
    - "`withBoardReplace` arm found: DELETE, exactly as 260908-g5y left it — no list write in `onSuccess`, nothing reintroduced"
    - "The typed columns are staged in the CREATE's `onMutate`, not the fan-out's: staging at the mount painted `This board is empty` for a frame"
    - "`removeQueries` moved out of `onError` and `BoardView` hardened — removing an observed entry crashed the page and took the toast with it"
    - "Rollback mechanism: `replaceState` to a submit-time-captured path, guarded on the user still standing on the dead board"
    - "Flicker seam reuses `useUnconfirmedIds({ mutationKey: MUTATION_KEY.CREATE_BOARD })`, the same primitive `usePrefetchAllBoards` already skips on"
    - "`app/(dashboard)/boards/[boardId]/loading.tsx` audited and left unchanged: its reasoning is about a sidebar `Link`, which is still a real RSC navigation"

metrics:
    duration: ~4h
    completed: 2026-09-08

actuals:
    tokens: 168000
    tasks: 3
    commits: 1

commits: 1
plan_head_before: ba5ac1984c5d703251d1eaef75eac30b43e236a0
---

# Quick task 260908-g5z: Optimistic board-create navigation — Summary

**Creating a board now enters the new board's route in the frame the modal closes: the URL, the
header title and the typed columns all land before `createBoardAction` has answered, and neither
the board skeleton nor the empty-board copy is painted at any instant of that window.** The ~3s
gap (root cause (a)) and the ~100-300ms empty-state flicker (root cause (b)) recorded in
`.planning/debug/board-create-optimistic.md` are both closed, each pinned by an assertion that was
observed failing first.

## Preconditions — all three upstream plans asserted, none assumed

| Plan | Assertion | Result |
| --- | --- | --- |
| 260908-g4p | `src/lib/core/query-keys/query-keys.ts` exports `QUERY_KEY` | present |
| 260908-g4p | `rg -n 'BOARDS_QUERY_KEY\|BOARD_QUERY_KEY_PREFIX' src/ app/ e2e/` | exit 1, no match |
| 260908-g5y | `createBoardInputSchema` accepts an id | `z.object({ name: boardNameSchema, id: boardIdSchema })` (`schemas.ts:98`) |
| 260908-g5y | `createBoardAction` forwards it | `body: { name: parsed.data.name, id: parsed.data.id }` (`create-board-action.ts:51`) |
| 260908-g5y | which `onSuccess` list arm shipped | **DELETE** — `rg -n 'withBoardReplace' src/ e2e/` exit 1; nothing reintroduced |
| 260908-g61 | `use-open-board-id.ts` gone | `test -e` → ABSENT |
| 260908-g61 | spike verdict | **PREMISE CONFIRMED** (`260908-g61-SUMMARY.md`) |

## Task 1 — the spike

### Inherited from 260908-g61, not re-measured

Copied from `260908-g61-SUMMARY.md`, which measured these on BOTH a dev server and a production
build. Attribution matters: none of the five was re-run here.

- **Q1 — synchrony.** After a native History API call the header, the painted board and the address
  bar all agree at the sync point. With `router.replace` the address bar alone lagged.
- **Q2 — requests.** **Zero RSC requests** for the changed segment, dev and production alike (the
  `router.replace` half issued `GET /boards/<id>?_rsc`).
- **Q3 — which pathname `refresh()` carries.** The destination, in every run: the URL moves BEFORE
  the Server Action POST is issued, so `proxy.ts` stamps `x-kanban-pathname` with the new path.
- **Q4 — hard reload.** The new URL genuinely server-renders (`serverHtmlNamesSurvivor: true`).
- **Q5 — Back.** Lands on the destination, never the stale address.
- **Q6 — the window.** Production: 0–247ms with `router.replace`, **0–40ms** with `replaceState`,
  and the residual 40ms is the interval before React's first commit, present in both halves.

### C1 — the not-yet-created window

Probe: `e2e/zz-pushstate-refresh.e2e.spec.ts` (created, run, deleted as Task 1's last step).

```
QUALITY_RECORD_MODE=record E2E_PORT=3000 pnpm exec playwright test --project=e2e e2e/zz-pushstate-refresh.e2e.spec.ts -g "C1"
```

Held `createBoardAction`'s own POST with `page.route` (discriminated by the board name in
`request.postData()` plus `isServerActionPost`), read the client-minted id off the optimistic
sidebar row's `href`, then `page.evaluate`d a `pushState` to it. Measured, verbatim:

```json
{ "mintedId": "45puqhfbskq8e",
  "url": "http://localhost:3000/boards/45puqhfbskq8e",
  "heading": "G5Z C1 0e747bf6",
  "skeletonVisible": true, "emptyCopyVisible": false, "errorCopyVisible": false,
  "requestsAfterPush": [
    { "method": "POST", "url": ".../boards/45puqhfbskq8e", "rsc": false, "stateTree": true, "nextAction": true },
    { "method": "POST", "url": ".../boards/45puqhfbskq8e", "rsc": false, "stateTree": true, "nextAction": true } ] }
```

- **What paints from cache:** the header title, immediately — it reads the optimistic `["boards"]`
  row. The board area painted `BoardViewSkeleton`, because the pre-change `onSuccess` seeded
  `["board", id]` only at settle. That is precisely the hole Task 2's `onMutate` seed closes.
- **Requests issued for the changed segment: none.** Discriminator used: the **`rsc` request
  header** (the shape `boards-switch.e2e.spec.ts` already discriminates on), cross-checked against
  the `_rsc` query parameter, which this Next version does emit — both appeared together on the C2
  RSC GETs and neither appeared here. The two POSTs above carry `next-action` and are the app's own
  board reads issued after the URL moved, not navigation requests.
- **Reload inside the window:** `page.reload()` at ~1.5s landed on the **origin board**, cleanly:
  `landsOnMintedId: false`, `landsOnExisting: true`. The T-02-54 membership guard redirects rather
  than stranding, so nothing had to be carried into Task 3's rollback design.

### C2 — settle-time reconciliation

```
QUALITY_RECORD_MODE=record E2E_PORT=3000 pnpm exec playwright test --project=e2e e2e/zz-pushstate-refresh.e2e.spec.ts
```

```json
{ "mintedId": "n6x24eops47yg",
  "beforeSettle": { "url": ".../boards/n6x24eops47yg", "heading": "G5Z C2 b8444a07", "skeletonVisible": true },
  "afterSettle":  { "url": ".../boards/n6x24eops47yg", "heading": "G5Z C2 b8444a07", "emptyCopyVisible": true },
  "stillOnPushedPath": true,
  "requestsAfterSettle": [
    { "at": 31,   "url": ".../boards/n6x24eops47yg?_rsc=Ib-MkkrCN4zjIc_F", "rsc": true },
    { "at": 75,   "url": ".../boards/n6x24eops47yg?_rsc=njSPxFqcTLck4tFK", "rsc": true },
    { "at": 205,  "url": ".../boards/n6x24eops47yg?_rsc=Y521cqwc2FDgB824", "rsc": true },
    { "at": 1234, "url": ".../boards/n6x24eops47yg", "nextAction": true } ] }
```

**Arm selected: the server CATCHES UP. No remedy needed, and none was added** — no
`router.replace`, no extra `router.refresh()`. The URL stayed on the pushed path, the header stayed
on the new board, and every request issued at settle named the pushed path.

Honest caveat: this ran against the UNFIXED code, where `createBoard` still called `router.push` to
the same (client-minted, therefore identical) id after the settle. That push is the source of the
first RSC GET. It could not confound the answer in the direction that matters — a revert would have
shown as a URL or header change and none occurred — and the shipped behaviour is re-measured by
`e2e/boards-create.e2e.spec.ts`'s own settle assertions, which run with no `router.push` at all.

### C3 — the fan-out ordering hazard

An authenticated column create against a freshly minted, never-created board id in the backend's own
charset (`mintBoardId()`, not a UUID), through the seeded account's `JSESSIONID`:

```
QUALITY_RECORD_MODE=record E2E_PORT=3000 pnpm exec playwright test --project=e2e e2e/zz-pushstate-refresh.e2e.spec.ts -g "C3"
```

```json
{ "neverCreatedBoardId": "mguja0dr9k6wz", "status": 404,
  "body": "{\"type\":\"about:blank\",\"title\":\"Not Found\",\"status\":404,\"detail\":\"Board was not found\",\"instance\":\"/api/boards/mguja0dr9k6wz/columns\",\"code\":\"ENTITY_NOT_FOUND\"}" }
```

**Arm selected: the backend REFUSES.** Task 2's settle gate AND the outcome discriminant were both
required, and both shipped.

Probe deleted as the task's last step; `test ! -e`, `git status --porcelain -- e2e/zz-pushstate-refresh.e2e.spec.ts`
and `git status --porcelain -- src/ app/` all exit 0.

## What shipped

**`use-create-board.ts`.** `createBoard` mints the id, captures `window.location.pathname` before
anything moves, builds the column clientIds and colours, and claims the fan-out with a settle
promise BEFORE `mutateAsync`. `onMutate` writes the `["boards"]` row, seeds `["board", id]` with the
board **and its placeholder columns**, and then — with no `await` in between — calls
`window.history.pushState`. `onSuccess` MERGES the server's board over the entry (ADR tech/0030
rule 2) instead of writing `columns: []` over it. The failure branch rolls the URL back with
`replaceState`, drops the entry, and raises the existing Retry toast. `useRouter` is gone from the
file.

**`use-create-board-columns.ts`.** `mutationFn` awaits the claim's `boardCreated` and throws
`ActionRefusedError` when it resolves false, so the existing `onError` retires the placeholders.
`createColumns` returns `{ boardLanded: true; failedNames } | { boardLanded: false }` — a retry
passes no promise and so cannot reach the second arm by construction. `onMutate` retires owned ids
before inserting them, which makes it idempotent against the create's own staging.

**`use-run-pending-column-fan-out.ts`.** Branches on `boardLanded`: a board that never landed skips
both the `router.refresh()` and the column-failure toast.

**`board-screen.tsx`.** The per-switch `invalidateQueries` is skipped for a board named by a
create still in this client's own mutation cache.

**`board-view.tsx`.** Tolerates its cache entry being removed under it (see deviation 2).

## Both-directions falsification — every assertion, with the failure it produced

### Case 1 — instant navigate and paint (three separate red directions)

**(a) The URL.** Against unfixed code:

```
Error: expect(received).toMatch(expected)
Expected pattern: /^\/boards\/(?!8qgjy9tcyups$)[^/]+$/
Received string:  "/boards/8qgjy9tcyups"
- Timeout 1500ms exceeded while waiting on the predicate
```

The `qualityGates` fixture stood down in that run: the only two errors reported were this assertion
and the abandoned `waitForResponse`, with **no `No baseline entry` message anywhere**.

**(b) The empty-board copy.** With the URL fixed but `["board", id]` seeded as `columns: []` — the
shape the plan specified — the rAF sampler caught the empty state:

```
Object {
-   "emptyCopy": false,
+   "emptyCopy": true,
    "skeleton": false,
}
```

That is what forced staging the placeholder columns in the create's own `onMutate`.

**(c) The revalidation skip.** With the flicker seam absent:

```
Error: expect(received).toEqual(expected)
+ Array [ "[{\"boardId\":\"ay18re1rn7gmk\"}]" ]
```

exactly one `getBoardAction` read issued for the just-created board — the read whose
accurate-but-stale zero-column answer is root cause (b).

### Case 2 — a refused create raises one toast, and the URL rolls back

**Column-toast absence.** Falsified twice: once before the discriminant existed, and once again
against the FINAL recorder shape by neutering the run hook's branch, to prove the assertion can
still fail:

```
Error: expect(received).toEqual(expected)
+ Array [ "Couldn't create 1 column(s).Retry" ]
```

**URL rollback.** With the discriminant landed and no rollback yet:

```
Error: expect(received).toBe(expected)
Expected: "/boards/8qgl8wvyuk8w"   (the origin board)
Received: "/boards/8qgl8xoeoxz4"   (the board that never landed)
```

### Case 3 — a user who navigated away is not yanked

Falsified against the rollback WITHOUT its guard (the guard deleted, everything else shipped):

```
Error: expect(received).toBe(expected)
Expected: "/boards/8qgng9mxubr4"   (the board the user chose)
Received: "/boards/8qgng9d0qubk"   (the path they submitted from)
```

## `e2e/quality-baseline.json` — the whole diff, accounted for

Recorded with `pnpm e2e:baseline e2e/boards-create.e2e.spec.ts` (15 runs, `--repeat-each=3`,
against a production build) **after** all three bodies passed. The final diff is exactly two things:

1. `recordedAt` — the script rewrites it on every record.
2. Three added entries, one per new case, all `axeRuleCounts: {}` and `flakyRuleIds: []`.

**The two PRE-EXISTING `boards-create` entries do not appear in the diff at all.** The scoped
re-record replaced them, and it replaced them with byte-identical values — which is the account the
plan asked for: nothing moved, so nothing needs a mechanism to explain it.

One intermediate artifact worth naming: the script writes the file with `JSON.stringify(…, 4)`,
which re-expands three single-line `flakyRuleIds` arrays that Prettier had collapsed. `pnpm exec
prettier --write e2e/quality-baseline.json` restores the committed style; the values were never
touched, and `pnpm verify`'s `format` gate is green.

## The rollback mechanism, and its cost

`window.history.replaceState(null, "", previousPath)`, never `window.history.back()`. `replaceState`
is deterministic: it does not depend on where the history cursor sits, cannot overshoot when the
user moved twice, and is synchronous, so the URL lands in the same frame as the entry removal and
the toast rather than a `popstate` round trip later. `back()` is a request to the browser whose
outcome depends on the stack's shape, and under the one condition where a rollback is wanted at all
the two agree — so its only distinguishing behaviour is its failure mode.

Its cost is named in the file's own comment rather than hidden: the rolled-back entry duplicates the
one beneath it, so the user's next Back press reads as a no-op. That is strictly better than leaving
them on a board that does not exist.

The guard: roll back ONLY while `window.location.pathname` still equals the dead board's path.
Someone who opened another board mid-flight chose it.

## The ~100-300ms empty-state flicker: CLOSED

Two independent mechanisms had to be removed, and the debug file only knew about the second:

1. **The mount-frame empty state.** `BoardView` mounts in the frame the URL moves. Its fan-out
   dispatch runs from a `useEffect`, i.e. after the first paint, so a board seeded with `columns: []`
   paints `This board is empty` first. Closed by staging the placeholder columns in the create's own
   `onMutate`, before the push.
2. **The per-switch revalidation stomp** (the debug file's root cause (b)). Closed by skipping the
   invalidate for a board named by a create still in this client's mutation cache.

Evidence, both from `e2e/boards-create.e2e.spec.ts`'s optimistic-navigation case against a
production build: a per-animation-frame sampler reports `{ skeleton: false, emptyCopy: false }`
across the whole window, and **zero** `getBoardAction` reads are issued for the new board id.

Honest bound on that evidence: the sampler's window is the create window (the POST is held 5000ms),
so it does not itself cover the settle. The read-count assertion is what covers the settle, and it
is sufficient because that invalidate was the only issuer of the stomping read.

**Which primitive was reused, and it is not the one the plan named.** The plan pointed at
`use-unconfirmed-ids.ts` and warned against citing `use-open-board-id.ts`. The better precedent was
already in the repo and neither was cited by the plan:
`src/features/boards/hooks/use-prefetch-all-boards.ts` ALREADY calls
`useUnconfirmedIds({ mutationKey: MUTATION_KEY.CREATE_BOARD })` and skips a board still being
created, for the identical reason ("prefetching it would spend a request on a guaranteed 404").
`BoardScreen` now uses the same call, so the codebase has one answer to this question, not two.

`e2e/boards-switch.e2e.spec.ts` is green — all three cases, on a production build, plus
`--workers=2 --repeat-each=3` — which is the proof the general switch was not degraded.

## Comment audit

| File | Outcome |
| --- | --- |
| `use-create-board.ts` | Hook doc rewritten (the `router.push` transition-stall reason is gone); new decision records for the push site, the deferred settle signal, the rollback mechanism and the entry-removal position |
| `pending-column-fan-out.ts` | Reason corrected: the handoff survives the removal of the `router.push` it was built around, and what still holds is the mount-time subscription |
| `use-run-pending-column-fan-out.ts` | Same correction, plus what the mount-time dispatch buys now that staging has moved to the create |
| `use-create-board-columns.ts` | Hook doc's stall paragraph removed; new records for the settle gate and the idempotent re-stage |
| `board-screen.tsx` | Re-read post-g61 first (its imports and doc were rewritten there); the new skip carries its own record |
| `app/(dashboard)/boards/[boardId]/loading.tsx` | **Audited, unchanged.** Its argument is about a sidebar `Link`, which is still a real RSC navigation and still consults this fallback; a create no longer issues one at all. Confirmed by measurement, not by reading: `boards-switch.e2e.spec.ts` green on a production build and under contention |

## Deviations from plan

**1. [Rule 1 — bug] `removeQueries` in `onError`, as the plan specified, crashes the page.**
`BoardView` reads `board.columns` from a `useQuery` whose `initialData` types the data as always
defined. Removing that entry while the component is mounted leaves the observer holding `undefined`
for one render:

```
PAGEERROR TypeError: Cannot read properties of undefined (reading 'columns')
    at BoardView (…/src_0if3vor._.js:279:35)
```

The React tree — toast viewport included — went down with it, so the refused-create case failed with
no toast at all. A/B confirmed: with the one `removeQueries` line disabled the case passed 1/1; with
it restored it failed 2/2. Fixed in two places: the removal moved out of `onError` into
`createBoard`'s failure branch after the URL rollback, and `BoardView` now falls back to its seed
prop for that one render, with an `eslint-disable` naming the measurement.

**2. [Rule 2 — required by a `must_haves` truth] The placeholder columns are staged in the CREATE's
`onMutate`, not the fan-out's.** The plan said "seed it as the board plus an empty `columns` array".
Measured: that paints `This board is empty` for at least one frame, because the fan-out dispatches
from a mount `useEffect`. The claim now carries `colors` (two independent picks would have repainted
every header dot), and the fan-out's `onMutate` retires owned ids before inserting so it stays
idempotent — chosen over deleting its staging outright specifically to leave
`board-view.test.tsx`'s five fan-out cases driving the same code path they always did.

**3. [Rule 3] Comment corrections for the two fan-out files were made in this change, not deferred
to Task 3's audit.** Task 2 deletes the `router.push` those comments cite; deferring would have
shipped a commit carrying comments known to be false.

**4. [Rule 3] Five files outside the plan's `files` lists were modified**, each because this change
falsified something in it: `board-list.test.tsx` (four `mockPush` assertions became
`window.location.pathname` assertions), `board-view.test.tsx` (eight `claimPendingColumnFanOut` call
sites gained `colors`/`boardCreated`), `board-view.tsx` (deviation 1),
`e2e/optimistic-guards.e2e.spec.ts` and the pre-existing first case in `e2e/boards-create.e2e.spec.ts`
(both below).

**5. [Rule 1] `e2e/optimistic-guards.e2e.spec.ts`'s OPT-01 board case broke on its own premise.**
It captured `openUrl` before submitting and asserted the URL was still there after clicking the
unconfirmed row — but the create now moves the URL itself. Repaired by stepping back to the seeded
board with `page.goBack()` before the click, which also keeps the assertion falsifiable: clicking the
row from the board it names would assert that navigating to the CURRENT url changed nothing, which is
true with or without the guard.

**6. [Rule 1] The pre-existing `boards-create` case raced the create.** It reads the second board
back through the backend using the id in the URL — and the URL now names the board before the server
has it:

```
Error: e2e/seed.sh board-full … failed: read returned 404:
{"detail":"Board was not found","code":"ENTITY_NOT_FOUND"}
```

2/2 on a dev server, 0/N on production (which is fast enough to hide it). Fixed with the settle
signal the app already exposes: the row's `aria-disabled` marker dropping.

**7. The two refusal cases provoke a REAL 409, not a synthetic network failure.** `route.abort` on
the create's POST makes Next's action client recover with its own hard navigation, which reset the
URL and wiped the toasts — i.e. it faked the outcome under test. Seeding a board with the same name
first and letting the backend answer `409 DUPLICATE_RESOURCE` exercises the real refusal path. The
toast asserted is therefore the DUPLICATE copy rather than the generic one.

**8. One implementation commit, not one per task.** Tasks 2 and 3 rewrite one function in one file;
an intermediate commit would not have built. The staged falsification the plan asked for was still
performed — the settle gate, the discriminant, the unguarded rollback and the guard were each landed
and measured separately in the working tree, and each red direction is quoted above.

**9. Baselines recorded once, at the end.** Task 2's `<verify>` asserts ≥3 `boards-create` baseline
entries, which is only true after Task 3's cases exist; Task 3's own `<behavior>` asks for one
scoped record covering all three. The single record satisfies both, and Task 2's baseline check
passes now (`5` entries, expected 5).

## Where the plan was wrong or incomplete

1. **`onError` + `removeQueries` is not safe** (deviation 1). The plan states it as a bare
   requirement; it is a page crash.
2. **`columns: []` in the `onMutate` seed contradicts the plan's own `must_haves` truth** that no
   `This board is empty` state appears (deviation 2).
3. **The named precedent for the flicker seam was the wrong one.** The plan offers
   `use-unconfirmed-ids.ts` and forbids `use-open-board-id.ts`; the actual shipped precedent —
   `usePrefetchAllBoards`, already skipping unconfirmed board ids for the same reason — is named
   nowhere in the plan.
4. **Two existing specs derive from "the URL has not moved yet"** and both break the moment it does
   (deviations 5 and 6). Neither is listed anywhere in the plan.
5. **A retrying `toHaveCount(0)` cannot express "the toast never appeared".** The column-failure
   toast auto-dismisses, so the poll waits for it to leave and then passes — measured with the toast
   on screen throughout the assertion that reported its absence. A long-running in-page poll cannot
   express it either: `page.evaluate` blocks the very click it is meant to observe, and the log fills
   with the still-open modal. Only an install-then-read-back `MutationObserver` works, which is the
   shape `flickerTracker` already uses.
6. **The plan's C2 spike question could not be answered free of a confound** on unfixed code, because
   `router.push` to the same client-minted id still fires at settle. Recorded above rather than
   papered over.

## Verification — every gate, real output

| Gate | Command | Result |
| --- | --- | --- |
| tsc | `pnpm exec tsc --noEmit -p tsconfig.json` | exit 0, no output |
| board-list (browser) | `pnpm exec vitest run --project browser …/board-list.test.tsx` | `Tests 78 passed (78)` |
| board-view + empty-state (browser) | `pnpm exec vitest run --project browser …/board-view.test.tsx …/boards-empty-state.test.tsx` | `Tests 246 passed (246)` |
| boards-create + boards-switch (production) | `E2E_PORT=4173 pnpm exec playwright test --project=e2e e2e/boards-create.e2e.spec.ts e2e/boards-switch.e2e.spec.ts` | `8 passed (38.3s)` |
| optimistic-guards (production) | `E2E_PORT=4173 pnpm exec playwright test --project=e2e e2e/optimistic-guards.e2e.spec.ts` | `5 passed (16.3s)` |
| baseline record | `pnpm e2e:baseline e2e/boards-create.e2e.spec.ts` | `15 passed (43.7s)`, `recorded 5 key(s)` |
| baseline count | `node -e '…filter(k=>k.startsWith("e2e/boards-create.e2e.spec.ts")).length'` | `5` (2 pre-existing + 3 new) |
| no non-comment `router.push` | `rg -n --pcre2 "^(?!\s*(\*\|//\|/\*)).*router\.push" src/features/boards/hooks/use-create-board.ts` | no match |
| negative grep | `rg -n "use-open-board-id\|useOpenBoardId" src/ e2e/` | no match |
| contention (production) | `… boards-create + boards-switch + optimistic-guards --workers=2 --repeat-each=3` | `39 passed (2.2m)`, **zero flaky** |
| **`pnpm verify`** | `pnpm verify` | **`pnpm verify passed — 21 steps, total 407209ms`, exit 0** |

`pnpm verify`'s own step list, all green:

```
[e2e-preflight] ok  [secrets] ok  [folders] ok  [actions] ok  [handlers] ok
[gates] ok  [stories] ok  [coverage] ok  [routes] ok  [keys] ok
[comments] ok  [tsx] ok  [renders] ok  [api-generate] ok  [api-drift] ok
[typegen] ok  [format] ok  [build] ok  [lint] ok
[test] ok — Test Files 139 passed (139), Tests 2215 passed (2215)
[e2e] ok — 84 passed (2.7m)
```

### The known `boards-create.e2e.spec.ts:109` flake was not reproduced

The dispatch brief named it as failing 2 of 4 full-suite runs. It passed in every run here,
including three full `pnpm verify` e2e passes and the 39-run contention sweep.

### `document-title`: re-checked, and it does not fire

260908-g61 measured this axe rule firing on 2/4 dev runs post-change and 0/9 on production. Measured
here in record mode, counting the rule across every recorded observation:

| Environment | Runs | Observations | `document-title` | Any axe violation |
| --- | --- | --- | --- | --- |
| production build | `--workers=2 --repeat-each=3`, boards-create + boards-switch | 24 | **0** | none at all |
| dev server | `--repeat-each=2`, boards-create + boards-switch | 10 | **0** | none at all |

So this change neither reproduces nor worsens it, and no baseline was re-recorded to hide anything.

### Dev-server failures, characterised rather than waved away

Two specs fail against `pnpm dev` and pass against a production build. Both were chased to a cause:

- `boards-create.e2e.spec.ts` — the 404 race and the crash above. **Both were real defects**, fixed;
  the spec now runs `10 passed` on dev under `--workers=1 --repeat-each=2`.
- `boards-switch.e2e.spec.ts:63` — misses its 1500ms `INSTANT_PAINT_BUDGET_MS`, 2/2 on dev even
  serially. **A/B'd against baseline**: with `board-screen.tsx` reverted to `HEAD` the failure is
  identical, 2/2. Pre-existing dev-compile latency, exactly as 260908-g61 recorded, and green on
  production in every run above.

### One self-inflicted false alarm, recorded so it is not chased again

A `pnpm verify` run reported `66 failed / 18 passed` with every failure an `expect(page).toHaveURL`
plus axe rules like `landmark-one-main` and `region` firing on the sign-up page. Cause: a manually
started `next start -p 4173` was still running while verify's own `build` step rewrote `.next`
underneath it, so `reuseExistingServer` attached to a server serving a half-replaced build. Killing
it and re-running produced the green run above. **A long-lived local `next start` must be stopped
before `pnpm verify`.**

## `.planning/STATE.md` deliberately not updated

`260908-g4p` recorded that this five-task batch defers push, `gh run watch` and the STATE roll-up to
a batch-level step once all five settle, and the two tasks between it and this one — `260908-g5y`
(`f197662`) and `260908-g61` (`ba5ac19`) — each committed their SUMMARY alone. This task follows
that precedent rather than half-rolling the batch forward.

## CI sign-off NOT obtained

The dispatch brief says **do NOT push**, which overrides the plan's own final step. `gh run watch`
was therefore not run and **CI has not signed off on `c3f0ae2`.** Per CLAUDE.md's "CI green is the
sign-off", this work is not done until it has.

## Not done, and deliberately

- **The three interactive `orchestrator_checks`** (create by eye, force a failure by eye, re-run the
  mutation-observer flicker probe) are not covered by anything above except through instrumented
  assertions. No `mcp__playwright__*` tool resolves in this agent, so the perceptual half — "does it
  *feel* instant", "does the rollback read as graceful rather than as a jump" — is genuinely
  unverified and needs a human or the orchestrator's own browser session.
- **The now-collapsible fan-out handoff** is filed as a todo, not acted on:
  `.planning/todos/pending/2026-09-08-the-column-fan-out-handoff-could-now-collapse-back-into-createboard.md`.
  It carries the measurement that makes it collapsible and the assertion that would prove it safe.

## Scope held

- `app/(dashboard)/boards/[boardId]/page.tsx` is **byte-identical** — the T-02-54 membership guard
  was neither weakened nor consulted differently; a `pushState` simply does not reach it.
- `app/(dashboard)/boards/[boardId]/loading.tsx` unchanged (audited above).
- `use-unconfirmed-ids.ts` unchanged; it gained a fourth reader, not an edit.
- No ADR 0029 machinery: no override store, no staleness guard comparing against a previous server
  value, no `useOptimistic` render-time fold, nothing "retired by reference equality".
- `withBoardReplace` stayed deleted.
- No account left on the shared nonprod backend: `ls -A .e2e-seeded-users/` is empty. The one
  hand-seeded account (the duplicate-name probe) was removed with
  `pnpm e2e:cleanup --users 8qgna8jviq68` — scoped, never bare.

## Known Stubs

None.

## Self-Check: PASSED

- `.planning/todos/pending/2026-09-08-the-column-fan-out-handoff-could-now-collapse-back-into-createboard.md` — FOUND
- `e2e/zz-pushstate-refresh.e2e.spec.ts` — confirmed ABSENT (`test ! -e` exit 0)
- All 11 modified files present in `c3f0ae2` (`git show --stat`: 11 files changed, 674 insertions,
  136 deletions)
- `c3f0ae2` FOUND in `git log`
- `git rev-list --count ba5ac19..HEAD` = `1`, matching the `commits:` frontmatter
