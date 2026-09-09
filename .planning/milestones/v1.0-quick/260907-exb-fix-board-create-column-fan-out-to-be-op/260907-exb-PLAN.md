---
phase: quick-260907-exb
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [QT-EXB-01, QT-EXB-02, QT-EXB-03]

files_modified:
  - e2e/boards-create.e2e.spec.ts
  - src/features/boards/hooks/use-create-board.ts
  - src/features/boards/model.ts
  - src/lib/core/query-keys/mutation-keys.ts
  - src/features/boards/components/board-list/board-list.test.tsx

user_setup: []

estimate:
  tokens: 180000
  raw_tokens: 90000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A board created with N typed column names paints those N columns the moment the board opens — while the columns fan-out POST is still in flight, not after it resolves."
    - "Those columns are painted CONTINUOUSLY from that first frame until the real ones land. The count sampled across the window never drops back to zero, so the fix cannot ship as a paint-then-blink-then-repaint that is worse than the bug it replaces."
    - "A fan-out that lands 2 of 3 names leaves the board holding 2 columns, never 5: the placeholders are retired, never appended beside what the server returned."
    - "A wholesale fan-out failure retires every placeholder column it staged, so the board never claims columns no server has heard of, and `raiseColumnFailureToast` still offers its Retry with the same failed-name set as before."
    - "A placeholder column is disabled for rename/delete/drag/add-task while it is unconfirmed, because its id names nothing upstream."
    - "The new e2e case was run RED against the unfixed code and GREEN after the fix, in that order, in that session, with both outputs quoted in the summary."
    - "No new optimistic mechanism is introduced. The whole change lives inside the `onMutate`/`setQueryData`/`onError`/`onSuccess` shape docs/adr/tech/0030 already mandates — none of the three superseded ADR 0029 shapes CLAUDE.md names (an override store, a staleness guard against the server's previous value, an override retired by reference equality) is reintroduced."
  artifacts:
    - "e2e/boards-create.e2e.spec.ts — a new case that holds the fan-out POST, asserts the typed columns are on screen while it is held, samples the column count across the whole window, and reloads to prove persistence"
    - "src/features/boards/hooks/use-create-board.ts — `createColumns` stages placeholder columns before its request is issued and retires them on every outcome"
    - "src/features/boards/components/board-list/board-list.test.tsx — a browser-level pin on the staging half, against the existing `createBoardColumnsStub` harness"
  key_links:
    - "The board entry's key is `buildBoardQueryKey(serverBoardId)`, and the server board id does not exist until `createBoardAction` resolves — so the placeholder columns CANNOT be staged in `createBoardMutation.onMutate` (the task brief's step 1 is wrong on this point, and the code is the authority). The fan-out mutation's own `onMutate`, or `createBoard` immediately after the board resolves, are the two placements where the id exists."
    - "Three writers reach `[\"board\", newBoardId]` during the fan-out window and each can erase a placeholder: `app/(dashboard)/boards/[boardId]/page.tsx`'s `HydrationBoundary` (overwrites on a newer `dataUpdatedAt`, and the RSC render happens AFTER the client-side stage), `board-screen.tsx`'s switch-triggered `invalidateQueries`, and the fan-out's own success write. Task 1 measures which of them actually fire and in what order; Task 2's shape follows that measurement, not a guess."
    - "The fan-out mutation must carry a `MUTATION_KEY` and its client-generated ids must ride on the mutation VARIABLES as `clientIds`, or `useUnconfirmedIds` — already plural-aware since quick task 260905-tz5 — reads nothing back and `board-view.tsx`'s `isUnconfirmed` guard leaves every placeholder column fully interactive."
    - "`toInFlightColumns` in `src/features/boards/model.ts` reads `{ boardId, clientId, color }` off every pending `MUTATION_KEY.CREATE_COLUMN` mutation and feeds it to `pickNextColumnColor`. Tagging the fan-out with that same key without widening this helper makes it map the fan-out to `{ id: \"\", color: undefined }`, and `resolveRenderedColumnColor` then consumes a real palette entry for a phantom column."
---

<objective>
Make BOARD-02's board→columns fan-out optimistic: a board created with typed column names shows
those columns from the first frame of the new board, instead of an empty board until the fan-out's
server round trip completes.

Purpose: closes the last of the two fan-out cases in this codebase. The task→subtask one was fixed
by quick task 260905-tz5 (`4f48c2f`/`4f67a44`); this is the same bug class, same shape, same ADR.

Output: an e2e case falsified in both directions, the staging/reconcile/rollback in
`use-create-board.ts`, and a browser-level pin on the staging half.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@docs/adr/tech/0030-optimistic-writes-via-the-query-cache.md
@src/features/boards/hooks/use-create-board.ts
@src/features/tasks/hooks/use-create-task.ts
@src/features/boards/hooks/use-create-column.ts
@src/lib/client/use-unconfirmed-ids.ts
@src/features/boards/model.ts
@src/components/layout/board-view/board-screen.tsx
@app/(dashboard)/boards/[boardId]/page.tsx
@e2e/boards-create.e2e.spec.ts
@e2e/boards-switch.e2e.spec.ts
@e2e/tasks-create.e2e.spec.ts
</context>

<interface_context>
Already shipped, to be reused rather than re-derived:

- `withColumnInsert({ columns, column }) -> ColumnFull[]` — appends (D-01 puts a new column at the end).
- `withColumnRemove({ columns, columnId }) -> ColumnFull[]` — the retirement primitive.
- `withColumnReplace({ columns, columnId, column }) -> ColumnFull[]` — MERGES `{ ...entry, ...column }`;
  `ColumnResponseDTO` carries no `tasks` (docs/adr/tech/0030 rule 2).
- `pickNextColumnColor({ columns }) -> hex` — the same picker `create-board-columns-action.ts` runs
  server-side against `createdSoFar`, so a client-side stage that seeds it the same way produces the
  same hexes and the dots do not change colour on reconcile.
- `useUnconfirmedIds({ mutationKey })` — already reads a plural `clientIds` array off a pending
  mutation's variables alongside a singular `clientId`. No change needed there.
- `createBoardColumnsAction -> { status, failedNames: string[], created: Column[] }` on SUCCESS.
  `created` holds ONLY what survived, so pairing it with the submitted names by index misattributes
  a partial failure — retire by owned id, then insert what came back.
- e2e: `isServerActionPost(request)` (`e2e/server-action.ts`), `seedAccount()` / `readBoardFull()`
  (`e2e/seed.ts`), and `holdEveryRead` + the `MutationObserver` sampler with its vacuity guards
  (`e2e/boards-switch.e2e.spec.ts`, roughly lines 52-60 and 280-340).
</interface_context>

<tasks>

<task type="tracer">
  <name>Task 1: Falsify the bug in the real browser and measure what erases a staged column</name>
  <files>e2e/boards-create.e2e.spec.ts</files>
  <precondition>`.env.local` carries `NONPROD_RESET_TOKEN`; run `pnpm secrets:decrypt` if `pnpm test:e2e` refuses in its first second naming that variable.</precondition>
  <action>
Add ONE new `test` to `e2e/boards-create.e2e.spec.ts` (a new `test.describe` block beside the
existing BOARD-02 one is fine) that creates a board with three typed column names and proves the
columns are on screen while the fan-out is still in flight.

Make the RED deterministic by HOLDING only the fan-out. Register a `page.route("**/*", ...)` that
delays a request by several seconds when `isServerActionPost(request)` is true AND its
`postData()` contains the first typed column name — mirroring how `tasks-create.e2e.spec.ts`
discriminates the subtask fan-out from every other Server Action POST to the same URL. Choose a
board name that shares no substring with any column name, so the board-create POST is never caught
by that predicate. Do NOT reach for `holdEveryRead`: holding the RSC navigation as well would delay
the very hydration this task exists to observe.

Assert, in order:
1. The URL moved to the new board.
2. The three column headings are visible — `page.getByRole("region").getByRole("heading", { level: 2 })`
   reading `NAME (0)`, the locator `columns-create.e2e.spec.ts` already uses — WHILE the hold is
   still in effect, under a tight timeout that the held round trip cannot satisfy.
3. The count never drops. Install a `MutationObserver` sampler before the submit that records the
   heading count on every mutation, and after the fan-out has been released and settled, assert no
   committed sample after the first non-zero one reads zero. Carry the vacuity guards the
   `boards-switch.e2e.spec.ts` sampler has (`samples.length > 0`, at least one positive sample), so
   an observer that silently failed to install fails the test instead of passing everything. The
   installer function passed to `page.evaluate`/`addInitScript` must be fully self-contained — a
   wrapper referencing an outer Node-scope binding does not survive serialisation and the error is
   swallowed.
4. After releasing the hold and awaiting the fan-out response: reload, and the three columns are
   still there — read back through `readBoardFull` as the existing case does, and on screen.

Then RUN it against the unfixed code and record, in the task notes, all three of: whether it fails
(it must), the exact assertion it fails on, and — from the sampler output — whether a column count
that is non-zero ever returns to zero on the FIXED-order question this plan turns on: does
`page.tsx`'s `HydrationBoundary` and/or `board-screen.tsx`'s switch `invalidateQueries` fire inside
the fan-out window at all. That measurement is Task 2's input; if you cannot obtain it from the
sampler alone, add a temporary `console`/`page.on("response")` trace for the run and remove it
before committing.

Commit RED with the spec only, no production change.
  </action>
  <verify>
    <automated>pnpm exec playwright test --project e2e e2e/boards-create.e2e.spec.ts 2>&1 | tail -40</automated>
    <human-check>The run FAILS, and the failure is the missing-columns assertion, not a seeding, sign-in or timeout error unrelated to the mechanism.</human-check>
  </verify>
  <done>
The new case fails against unfixed `use-create-board.ts`, on the assertion that the typed columns
are visible while the fan-out is held. The existing BOARD-02 case in the same file still passes in
the same run. The task notes record whether the hydration and/or the switch invalidate fire inside
the fan-out window.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Stage, reconcile and roll back the fan-out's columns per ADR 0030</name>
  <files>src/features/boards/hooks/use-create-board.ts, src/lib/core/query-keys/mutation-keys.ts, src/features/boards/model.ts</files>
  <behavior>
    - Three typed names, fan-out held: the board entry holds three columns with client-generated ids, `version: 0`, `tasks: []`, in the order typed, before the request resolves.
    - Fan-out succeeds with all three: the entry holds exactly three columns, all carrying server ids.
    - Fan-out succeeds with `failedNames: ["Doing"]` and two in `created`: the entry holds exactly two columns, both server-owned. Never five, never a stale placeholder beside a real column.
    - Fan-out fails wholesale: the entry holds zero columns and `raiseColumnFailureToast` is raised with all three names.
    - A RETRY through `retryColumns` owns no placeholders: it appends what lands and retires nothing it did not stage.
  </behavior>
  <action>
Make `createColumns` in `src/features/boards/hooks/use-create-board.ts` optimistic, following
`use-create-task.ts`'s already-shipped fan-out (its `createSubtasksMutation` plus `createSubtasks`)
as the structural precedent and docs/adr/tech/0030 as the contract.

Required pieces:

1. **Placement.** The placeholder ids and rows must be produced where the SERVER board id is known.
   `createBoardMutation.onMutate` is not that place — it runs before `createBoardAction` resolves and
   `buildBoardQueryKey` has no id to key on there. Generate the ids ONCE in `createBoard` (after the
   board resolves) or in the fan-out mutation's own `onMutate`, and hand them to both the staging
   write and the fan-out's variables, exactly as `use-create-task.ts` hands one array to two
   consumers.

2. **Mutation key.** The fan-out must be tagged so `useUnconfirmedIds` can read its ids back.
   Decide between reusing `MUTATION_KEY.CREATE_COLUMN` and adding a new entry, and write the reason
   into the code where the choice is visible. The consequences to weigh, both real:
   - Reusing `CREATE_COLUMN` reaches both existing consumers (`board-view.tsx`'s `isUnconfirmed`
     guard and `use-open-board-columns.ts`'s add-task gate) with no call-site change, but
     `toInFlightColumns` in `model.ts` then maps the fan-out's variables to a single `{ id: "" }`
     entry and `pickNextColumnColor` burns a palette slot on a phantom column — so widening
     `toInFlightColumns` to expand a `clientIds` array (with the colours actually staged) is part of
     that option, not optional.
   - A new key keeps the colour picker untouched but requires every `useUnconfirmedIds` consumer
     that guards a column to read both keys.

3. **Stage (`onMutate`).** `cancelQueries` on the board key first, then write the placeholder rows.
   `pickNextColumnColor` seeded the same way `create-board-columns-action.ts` seeds it — against the
   columns staged so far, starting empty — so the dot colours match what the server will return and
   do not change on reconcile. Note that the entry may be ABSENT at this instant (nothing has read
   the new board yet), so the existing `isNil(current) ? current` no-op guard has to be reconsidered
   rather than copied.

4. **Reconcile (success).** Retire every owned placeholder id FIRST, then insert `result.created` —
   the remove-then-insert reduce `use-create-task.ts` uses, and for the reason its comment gives:
   `created` holds only what survived, so pairing by index misattributes a partial failure. Preserve
   the existing `failedNames` return value and its `comment-length-exempt` note about why the fan-out
   writes the entry itself.

5. **Roll back (failure).** A wholesale failure retires the owned placeholders. `raiseColumnFailureToast`,
   `buildColumnFailureToastId` and `retryColumns` keep their current behaviour exactly; a retry owns
   no placeholders, so give the owned-ids parameter an empty default the way
   `use-create-task.ts`'s `ownedClientIds` does.

6. **Survival.** If Task 1 measured a writer that erases the staged rows inside the fan-out window
   (`page.tsx`'s hydration or `board-screen.tsx`'s switch invalidate), close it with the narrowest
   guard that keeps the authoritative read authoritative — e.g. skipping the switch-triggered
   invalidate for a board with a pending fan-out, read off the mutation cache the same way
   `use-create-column.ts` reads pending creates. Do NOT reintroduce the mechanism ADR 0029 described
   and `3089a6a` deleted; CLAUDE.md § "Reach for the platform's own primitive before building a
   mechanism" names the three forbidden shapes. **If the only way you can find to keep the
   placeholders on screen is one of those three, STOP, leave Task 1's RED committed, and report the
   conflict — a paint-blink-repaint is worse than today's behaviour and must not ship as the fix.**

Every new comment obeys `pnpm comments:check` and `~/.claude/CODE_COMMENTS.md`: no planning-system
tokens at a call site, no restating the code, and a length exemption only where a decision record
genuinely earns it.
  </action>
  <verify>
    <automated>pnpm exec playwright test --project e2e e2e/boards-create.e2e.spec.ts 2>&1 | tail -40</automated>
    <automated>pnpm exec tsc --noEmit &amp;&amp; pnpm lint &amp;&amp; pnpm comments:check</automated>
    <automated>rg -n -e 'useOptimistic' -e 'optimistic-mutation' src/features/boards src/components/layout src/lib/client | wc -l</automated>
  </verify>
  <done>
Task 1's e2e case passes, and the existing BOARD-02 case passes in the same run. `tsc`, `lint` and
`comments:check` are clean. The third gate prints `0` — none of the superseded machinery is back.
The four `<behavior>` outcomes above each hold.
  </done>
</task>

<task type="auto">
  <name>Task 3: Pin the staging at the browser layer, run the full gate, push to green CI</name>
  <files>src/features/boards/components/board-list/board-list.test.tsx</files>
  <action>
Add a browser-level regression case to `src/features/boards/components/board-list/board-list.test.tsx`,
using the `createBoardColumnsStub` harness and `submitNewBoard` helper already in that file. It pins
the half a unit test CAN reach: with the columns stub left unresolved, the board entry holds the
typed column names under client-generated ids. Falsify it against the unfixed hook first (stash the
Task 2 change, run it, confirm it fails, restore) and quote both directions in the summary — a case
that passes both ways is covering something adjacent to the bug, not the bug.

The e2e case stays the primary pin: the mechanism this task fixes involves a client navigation, an
RSC hydration and a cache refetch, none of which a component test can reproduce.

Then run the gates and close out:
- `pnpm verify` — the full 20-gate run (~5-8min). Report each failing gate, not just the exit code.
- The new e2e case under contention: `pnpm exec playwright test --project e2e e2e/boards-create.e2e.spec.ts --workers=2 --repeat-each=3`.
- If you seeded any account by hand outside a Playwright run, delete it with
  `pnpm e2e:cleanup --users <id>` — never a bare `pnpm e2e:cleanup`, which would also delete accounts
  the orchestrator is holding.
- `git push` on the current branch `gsd/phase-04-task-subtask-workflow` (the pre-push hook runs
  `pnpm verify` again; do not use `--no-verify`). Then block on CI rather than polling:
  `gh run list --limit 1 --json databaseId --jq '.[0].databaseId'`, then `gh run watch <id> --exit-status`,
  and report every job's conclusion. A red job is a blocker, not a caveat.

Write `.planning/quick/260907-exb-fix-board-create-column-fan-out-to-be-op/260907-exb-SUMMARY.md`,
carrying: the mutation-key decision and why; the Task 1 measurement of which writers touch the board
entry inside the fan-out window; both RED and GREEN outputs for each of the two new tests; and
anything left unproven.
  </action>
  <verify>
    <automated>pnpm exec vitest run --project browser src/features/boards/components/board-list/board-list.test.tsx 2>&amp;1 | tail -20</automated>
    <automated>pnpm verify 2>&amp;1 | tail -30</automated>
    <human-check>`gh run watch` exited zero and every job (quality, secrets, e2e, visual) reports success.</human-check>
  </verify>
  <done>
`board-list.test.tsx` carries a case proven to fail without the fix. `pnpm verify` exits 0. The new
e2e case is 3/3 at `--workers=2 --repeat-each=3` with zero flaky. The branch is pushed and CI is
green on all four jobs, with each conclusion read back. The SUMMARY exists and carries both
falsification directions.
  </done>
</task>

</tasks>

<verification>
- `pnpm verify` exits 0 (all 20 gates, including the full e2e suite).
- The new e2e case is falsified in BOTH directions in the same session, in that order.
- The new browser case is falsified in both directions.
- CI green on quality, secrets, e2e and visual, read back per job.
</verification>

<success_criteria>
Creating a board with typed columns paints those columns in the first frame of the new board and
keeps them painted continuously until the server's own land — with no new optimistic mechanism, and
with the existing per-column retry/toast behaviour unchanged.
</success_criteria>

<out_of_scope>
Every other optimistic mutation's dependent writes. There are exactly two fan-outs in this codebase
— task→subtask (fixed by 260905-tz5) and this one — and a broader audit is tracked separately by the
orchestrator. Do not widen into it.

The already-filed product hazard that a fan-out is lost silently when the user leaves right after a
create (`.planning/todos/pending/2026-09-06-subtask-fan-out-is-lost-silently-...md`) is a decision
against D-07, not a fix, and stays out of this plan.
</out_of_scope>

<output>
Create `.planning/quick/260907-exb-fix-board-create-column-fan-out-to-be-op/260907-exb-SUMMARY.md` when done.
</output>
