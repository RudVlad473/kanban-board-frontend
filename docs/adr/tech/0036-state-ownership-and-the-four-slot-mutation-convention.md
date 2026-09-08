# 0036 — Where state lives, and the four responsibilities every optimistic command accounts for

> **Amends [`docs/adr/tech/0030-optimistic-writes-via-the-query-cache.md`](./0030-optimistic-writes-via-the-query-cache.md)** — it does NOT
> replace it. 0030's four numbered rules stay live and unchanged; they govern how a cache write is
> made correct. This record adds the two things 0030 never named: WHICH state belongs in the cache
> at all, and what SHAPE a hook that writes it has.
>
> 0030 remains this project's live mechanism record for optimistic writes. This is the
> ownership-and-shape record around it, and the two point at each other.

Every number below was re-derived on **2026-09-08** against `c22126f`, and each carries the command
that produced it. Where a command disagreed with the plan that commissioned this record, the command
won and the disagreement is stated.

## Decision Drivers

- 0030 answers "how is an optimistic cache write made correct" in four rules. It does not answer
  "what belongs in the cache", and it does not describe a hook. `CLAUDE.md` fills that hole with
  **"copy a shipped hook — `use-toggle-subtask.ts` or `use-move-task.ts` — rather than deriving a new
  shape"**, which is a workaround for a missing convention: it transmits the shape without
  transmitting the reasons, so a reader cannot tell which parts of the exemplar are load-bearing.
- The gap has been paid for three times, each time by a mechanism that duplicated something the
  platform already owned:
  1. **A hand-rolled optimistic-move override** with snapshot-and-compare staleness detection, where
     the library's own cache write would have done it — `docs/adr/tech/0029-optimistic-writes-via-the-ui.md`'s mechanism, whose
     helper `src/lib/client/optimistic-mutation.ts` was deleted in `3089a6a`
     (`refactor(04-15): finish the board-detail migration onto the query cache`).
  2. **A client context populated by an effect**, carrying data the server render already had —
     `RenameOverrideProvider`, recorded in 0029's own Decision Drivers as "a hand-rolled global store
     standing in for one the app already had".
  3. **`useOpenBoardId`** — a second source of truth for "which board is open", built because the URL
     lagged. Deleted 2026-09-08 in `e3cc505` once the lag itself was removed. The URL-lag record
     below is the measurement that hook's doc comment carried, rehoused here so it survives the
     deletion.
- Each of the three looked reasonable while being written. What they have in common is not
  carelessness: it is that no record said which tier the state belonged to, so "hold it somewhere I
  control" was never obviously wrong.

## Decision, part 1 — four kinds of state, one home each

| Kind | Home | Read via | Written by |
|---|---|---|---|
| **Server state** | the query cache — `QUERY_KEY.BOARDS` (`["boards"]`) and `buildBoardQueryKey(id)` (`["board", id]`) | a named selector hook or `useQuery` on the hydrated entry | mutation hooks only, under 0030's four rules |
| **Routing state** | the URL | one named reader per concept — today `toBoardIdFromPath(usePathname())` | `router.*`, or the native History API (`window.history.pushState` / `replaceState`) |
| **In-flight intent** | TanStack's *mutation* cache | `useMutationState`, tagged by `MUTATION_KEY` — `src/lib/client/use-unconfirmed-ids.ts` is the only reader | the mutation itself; retires on its own when the mutation leaves `pending` |
| **Ephemeral UI** | local `useState`, or a narrow context | props, or the hook's own return value | the component or hook that owns it |

**(a) The query cache is the source of truth for server state, and must not be mirrored.** A second
store holding the same rows is a parallel copy that has to be invalidated by hand — the problem the
library exists to solve. This is 0030's premise, restated here only because parts (c) and (e) below
are the boundaries of it.

**(b) It is not a general app store, because it is a cache.** The test a reader applies, in one
question: *if this entry vanished right now, could the server re-derive it?* If no, it does not
belong here. Entries are evictable — nothing in this repo sets `gcTime`
(`rg -n 'gcTime|staleTime' src/ --glob '!*.test.*'` on 2026-09-08 returns ten `staleTime` hits and
**zero** `gcTime` hits), so every entry runs on TanStack Query 5.101.4's default garbage-collection
timer, and an entry with no observer is dropped on it. `staleTime: Infinity` (`board-query.ts:52`,
`boards-query.ts:30`) stops a *refetch*; it does not stop *eviction*. This is the discriminator that
keeps routing state and ephemeral UI state out: a URL survives an eviction, a cache entry is the
thing being evicted.

**(c) Routing state is a user-owned input, not a server-owned resource.** The server never says which
board is open; the user does, by clicking. The same server state — one `["board", id]` entry — serves
every URL that names it. Conflating the two is exactly what produced `useOpenBoardId`: "which board
is open" was treated as derivable state to be corrected, when it is an input to be moved. The fix was
not a better corrector; it was moving the input through a call that lands in the same React commit —
measured, with its numbers and its falsifier, in the URL-lag record below.

**(d) A dedicated client store (TanStack Store, Zustand, Jotai) was considered and REJECTED**, on the
grounds that this app has almost no client state to put in one. Re-derived 2026-09-08:

- `rg -n 'createContext' src/ --glob '!*.test.*'` → four lines, but **exactly ONE real context**:
  `src/components/ui/dropdown/dropdown-context.ts`:9. The other three are its own import at `:2`, and
  two lines of *comment prose* — `src/features/boards/column-drag-model.ts`:9 and
  `src/features/tasks/task-drag-model.ts`:18 — each explaining why that file does **not** create a
  context at module scope. (The task prompt that commissioned this record said "three call sites".
  The command says one; the command wins.)
- `rg -n 'useContext\(' src/` → one line, `src/components/ui/dropdown/dropdown.tsx`:57.
- `rg -n 'zustand|jotai|@tanstack' package.json` → one line, `"@tanstack/react-query": "5.101.4"`.
  No global-store dependency of any kind ships.

One context, one consumer, and it holds a dropdown's `hasError`/`isLoading`. A store would be
infrastructure with nothing to store.

**The trigger that reopens this**: client state that must **outlive a route change** and is **not
server-derived**. Nothing in the table above holds such state today — ephemeral UI state is scoped to
a mounted component by definition, and everything that outlives a route change is either in the URL
or in the query cache. The day something is, this rejection is void and the choice must be made
deliberately rather than by growing a third context.

**(e) In-flight intent is a narrow tool, not a tier to reach for.** Its two legitimate uses are both
about a *pending write*, not about *data*: gating a control while a write is in flight, and skipping
work addressed to an id the server has not seen. `src/lib/client/use-unconfirmed-ids.ts` is the
single implementation, and `rg -n 'useUnconfirmedIds\(\{' src/ --glob '!*.test.*'` returns **eight**
call sites on 2026-09-08: `use-prefetch-all-boards.ts:33`, `board-list.tsx:55`,
`use-open-board-columns.ts:31`, `task-detail-modal.tsx:41`, `edit-task-modal.tsx:58`,
`board-screen.tsx:68`, and `board-view.tsx:95` and `:96`. Each asks "is this id acknowledged yet";
none asks "what is the value".

Using it to correct a lagging URL — `useOpenBoardId` — was reaching for this tier to answer a
question tier 2 owned. The fix was not a better filter. It was stopping the URL from lagging.

## Decision, part 2 — four responsibilities, each realized by one TanStack slot

An optimistic cache-writing command must **account for** four responsibilities. Each is realized by
one TanStack callback. **A responsibility with nothing to do is legitimately empty** — a hook does
not grow a no-op callback to fill a row in this table, and an empty slot with a stated reason is this
convention holding, not this convention being excepted.

| Responsibility | Slot | What it does |
|---|---|---|
| **execute** | `mutationFn` | call the Server Action and rethrow a non-`SUCCESS` status as an `ActionRefusedError`, so TanStack does not settle a refusal as a success |
| **apply** | `onMutate` | `cancelQueries` the entry, then `setQueryData` the optimistic value |
| **revert** | `onError` | reconcile THIS mutation's own effect out of the entry (never restore a snapshot — see below) |
| **settle** | `onSuccess` | merge only what the client could not have known |

The `mutationFn` rethrow is not this record's invention: it is 0030's own Consequences ("these
actions still *return* a refusal rather than throwing, so each `mutationFn` rethrows a non-`SUCCESS`
status as an `Error` subclass"), restated here because it is the responsibility a new hook is most
likely to omit — omitting it produces a silently-kept optimistic value with no error anywhere.

### Scope, and every omission by name

The convention governs **optimistic cache-writing commands**. The census that fixes its population,
re-derived 2026-09-08:

```
rg -ln 'useMutation\(' src/ --glob '!*.test.*'     → 17 files, all under src/features/*/hooks/
rg -ln 'useMutation'   src/ --glob '!*.test.*'     → 18 files
```

The bare grep over-counts by one: the extra file is `src/lib/client/use-unconfirmed-ids.ts`, which
calls `useMutationState` and is a **reader** of the mutation cache, not a command. Use the
`useMutation\(` form.

Per-slot, by `rg -q '^\s*<slot>[:(]' <file>` over those 17:

| Absence | File(s) | Why it is legitimate |
|---|---|---|
| no `onSuccess` | `use-delete-board.ts`, `use-delete-column.ts`, `use-delete-task.ts`, `use-delete-subtask.ts` | a deleted row has no server-assigned field to merge — see the settle rule, which this is an instance of rather than an exception to |
| no `onMutate` | `use-theme-preference.ts` | it is not a cache-writing command at all: it writes `useState` and a cookie. Its `onError`/`onSuccess` exist but are passed **per call** to `mutation.mutate(...)` (`:75`, `:82`), not to `useMutation` — the grep reports them as present, which is a different fact from a slot that does not exist, and neither fact puts this hook inside the convention |
| not a command | `use-unconfirmed-ids.ts` | a `useMutationState` reader; it never appears in the `useMutation\(` list |

So the convention's real population is **16** hooks, of which 12 fill all four slots and four (the
deletes) legitimately leave `settle` empty.

### The fifth slot, and the condition that calls for it

Four hooks ship an `onSettled` the four-responsibility table does not name:
`use-create-subtask.ts:157`, `use-delete-subtask.ts:128`, `use-rename-subtask.ts:163`,
`use-toggle-subtask.ts:184`.

**What it retires is hook-local `useState`, not the in-flight-intent tier.** Each of the four
declares its own `useState<ReadonlySet<string>>` (`use-toggle-subtask.ts:72`,
`use-rename-subtask.ts:61`, `use-create-subtask.ts:64`, `use-delete-subtask.ts:55`), adds an id to it
when the mutation starts, deletes it in `onSettled`, and exposes a per-entity predicate from its own
return value (`isSubtaskPending`, `isCreatingSubtask`). That set is tier 4 — ephemeral UI — and
`useState` does not retire itself.

Contrast tier 3: `useUnconfirmedIds` filters `{ mutationKey, status: "pending" }`, so an id leaves
the set the instant the mutation settles, with no callback anywhere. **That is why 12 of the 16 hooks
need no `onSettled` at all.** Three of the four — `use-delete-subtask.ts`, `use-rename-subtask.ts`,
`use-toggle-subtask.ts` — declare no `mutationKey` (`rg -n 'mutationKey' src/`, 2026-09-08), so they
are not readable through `useMutationState` by construction.

**The condition, stated so it does not become a universal:** a hook needs `onSettled` when it exposes
a pending predicate from state it owns itself. If the pending set can live in the mutation cache
instead — because some *other* part of the tree needs to read it — tag a `MUTATION_KEY` and read it
with `useUnconfirmedIds`, and the fifth slot is unnecessary.

### This is a convention, NOT a factory

Each hook satisfies these four responsibilities **in its own body**. There is deliberately no typed
mutation factory, no wrapper, and no shared helper, and this record exists partly so a future reader
does not build one to "finish the job".

The project owner rejected that abstraction. The reason is in the revert rule below: each hook's
reconcile knows its own entity, its own anchor and its own idempotence argument, and a generic
`undo` helper would either take all of that as parameters (a factory with as much surface as the
bodies it replaces) or hard-code the one shape it can express (a snapshot restore, which is the
thing the rule forbids). A previous attempt at exactly this — `src/lib/client/optimistic-mutation.ts`
— was deleted in `3089a6a` and is one of the banned shapes below.

**This is a one-way door.** A factory, once several hooks are inside it, is expensive to leave: every
call site has to be re-derived to find out which of its behaviours were the factory's defaults and
which were deliberate. Held by review and by this record.

### revert is a per-entity reconcile, NOT a snapshot restore

A rollback here restores prior state — the four deletes genuinely put the removed row back. **What no
shipped hook does is assign a captured whole-entry value.** The discriminator is what the `onError`
write is a function OF:

- **A snapshot restore** assigns a value captured in `onMutate`, ignoring whatever the entry holds at
  revert time.
- **The shipped shape** returns an `undo` closure from `onMutate` and applies it to `current` — the
  LIVE entry — so it re-inserts one entity into whatever else has landed since:
  `{ ...current, columns: context.undo(current) }` (`use-delete-task.ts`:117,
  `use-delete-subtask.ts`:110, `use-delete-column.ts`:109), and
  `setQueryData(QUERY_KEY.BOARDS, (current) => restore(current ?? []))` (`use-delete-board.ts`:122).

The shipped reasons, quoted rather than paraphrased:

- `use-delete-board.ts:100` — *"Re-inserts THIS row only — a snapshot restore would also resurrect a
  board deleted since."*
- `use-delete-column.ts:98` — *"Re-inserts THIS column only — a snapshot restore would also resurrect
  a sibling deleted since."*
- `use-create-board.ts:95` — *"No snapshot taken: `onError` below reconciles by `clientId`, so there
  is nothing to restore."*

The three are the same argument from two ends: **the entry at revert time is not the entry at apply
time**, because a sibling mutation may have landed in between. A blanket restore writes a whole-entry
value that predates the sibling, so a correct write is erased by an unrelated failure. The deletes
answer it by reconciling into `current`; `use-create-board.ts` answers it by taking no snapshot at
all and removing its own row by `clientId`, because a blanket restore there would erase a second
create that landed while this one flew — its own `onError` comment at `:135-136` says exactly that.

This is also precisely why a generic `undo` helper would have been wrong. `use-delete-board.ts`'s
closure re-inserts the removed board *after the neighbour it originally followed* (`afterBoardId`,
captured before the removal), falling back to the front when that neighbour is itself gone. That
anchor is knowledge about boards; a helper cannot hold it without being handed it.

`CONVENTIONS.md` asserted the opposite in two places — "restores the snapshot in `onError`" and "so
TanStack rolls back the snapshot" — until this record's own task corrected them. TanStack's published
optimistic-updates guide teaches the snapshot-restore shape, so the false claim is the *plausible*
one; this ADR is the record that keeps it corrected.

### settle earns its place only for fields the client could not have known

Derived from the shipped `onSuccess` bodies and the response DTOs, 2026-09-08:

| Field | Merged by | Why the client could not know it |
|---|---|---|
| `version` | every non-delete hook | the optimistic-lock counter the server assigns |
| `id` | column, task and subtask creates only | `onMutate` stages under a `crypto.randomUUID()` `clientId`; `onSuccess` swaps in the server's id (`withColumnReplace`, `withTaskReplace`, `withSubtaskRemove` + `withSubtaskInsert`) |
| `position` | column and task writes | server-ordered; `ColumnResponseDTO.position`, `TaskResponseDTO.position` |

**Not `createdAt`.** `BoardResponseDTO` declares it (`src/lib/core/api-contract/generated-types.ts`:290)
and the create response carries it (measured 2026-09-08, `260908-g5y`), but `boardSchema`
(`src/features/boards/schemas.ts`:12-16) is `{ id, name, version }`, so the field is dropped at the
boundary and no `onSuccess` merges it. The commissioning plan predicted `version` and `createdAt`;
the shipped bodies say `version`, `id` and `position`.

Duplicating `onMutate`'s own write into `onSuccess` is the antipattern this rule names. 0030 rule 2
(`{ ...entry, ...response }`, MERGE never assign) governs whatever remains.

**The four deletes' empty `settle` is this rule holding, not being excepted.** A deleted row has no
server-assigned field, so there is nothing the client could not have known. Same discriminator, seen
from the other side.

**Board create no longer swaps an id.** Since `260908-g5y` (2026-09-08) the client mints the board's
final id (`src/features/boards/board-id.ts`) and the server echoes it. `use-create-board.ts`'s
`onSuccess` therefore writes **no `["boards"]` row at all** — its own comment records why: the staged
row already carries the id, name and version the server answered with, *the only three fields that
entry holds*, measured in
`src/features/boards/actions/create-board-action.integration.test.ts`. What remains in that
`onSuccess` is one write: a MERGE over `["board", id]`, because by the time it runs the column
fan-out has staged placeholder columns into that entry and an assign would erase them.

## What stays banned

`docs/adr/tech/0029-optimistic-writes-via-the-ui.md` is superseded and stays superseded. Its shapes, re-affirmed by name:

- **an override store** — a client-side holder of pending values parallel to the cache;
- **a staleness guard comparing against the server's previous value** — 0029's rule 2, the submitted
  `version` retiring an override;
- **an override "retired by reference equality"**;
- **`src/lib/client/optimistic-mutation.ts`** (`useOptimisticVariables`) — deleted in `3089a6a`. Its
  absence is deliberate and permanent; `ls src/lib/client/` on 2026-09-08 returns exactly
  `query-client.tsx` and `use-unconfirmed-ids.ts`.
- **`useOptimistic` for board state.** It remains the right default for optimistic state that is not
  server-owned; this record and 0030 govern the two board entries only.

Phase 04's plan files still describe that machinery in places. **The ADR wins over the plan**, and a
plan asking for it is stale — say so rather than building it.

## The URL-lag record — rehoused here, and now historical

This measurement's only written copy was the doc comment of
`src/features/boards/hooks/use-open-board-id.ts`, deleted in `e3cc505` on 2026-09-08. A record with a
date and a falsification condition must not die with the code that occasioned it.

**(i) The mechanism.** `use-delete-board.ts`'s `router.replace(destination)` moved the ADDRESS BAR
immediately, but the pathname React components read — `usePathname()` — moved only once the
destination's RSC payload committed. For that window `dashboard-header.tsx` and `board-screen.tsx`
each independently resolved the just-deleted board's id, whose row `onMutate` had already removed
from the boards list: a blank header title AND the deleted board's own column heading still painted,
simultaneously, from one cause.

**Window measured: 151ms–819ms after the confirm click** — quick task `260907-q83`, 2026-09-07,
against the real backend (`260907-q83-SUMMARY.md:139`). The deleted hook's own comment claimed
"~700-800ms"; that figure was never the measurement and is superseded by these numbers.

**(ii) Why a `status: "pending"` filter was insufficient.** The delete's own network round trip
settles well before the separately-held RSC navigation does, so a pending-only filter closed the
window for a moment and reopened it the instant the mutation succeeded (measured live against a
production build, same task). The shipped predicate was `status !== "error"`, retired naturally as
the URL caught up.

**The generalisable part, which outlives this hook: a mutation's own settle is not the end of the
effect it triggered.** A window keyed on `pending` is keyed on the wrong event. Key it on the thing
that actually closes the window, or — better — remove the window.

**(iii) What would have made it false, and did.** A navigation whose pathname commits without an RSC
round trip closes the window at its source. That is what the native History API does, and it is now
measured rather than hoped for:

Quick task `260908-g61`, 2026-09-08, **PREMISE CONFIRMED against a production build** (four probe
runs, dev and production, with an in-page 4ms sampler; `260908-g61-SUMMARY.md`):

| Half | Address bar names the deleted board | RSC requests after the click |
|---|---|---|
| `router.replace` — production | **0–247ms** | 1 (`GET /boards/<survivor>?_rsc` on dev; served from the Router Cache on production) |
| `router.replace` — dev | **0–594ms** | — |
| `history.replaceState` — production | **0–40ms** | **0** |
| `history.replaceState` — dev | **0–37ms** | **0** |

**The window is CLOSED, not shortened.** The residual ~40ms is present identically in both halves and
is not a disagreement between sources — it is the interval before React's first commit, during which
nothing has rendered at all. From the first commit onward the `replaceState` half has zero samples
where the header, the painted board and the address bar disagree.

The mechanism behind the lag, named by that task: `router.replace` writes this same `replaceState`,
but from a `useInsertionEffect` on the NEXT router state. Removing that indirection removed the need
for a second source of truth, so `useOpenBoardId` was deleted rather than replaced;
`board-screen.tsx` and `dashboard-header.tsx` now read `toBoardIdFromPath(usePathname())` inline.

**The same primitive now carries the create path.** Quick task `260908-g5z`, 2026-09-08: board create
calls `window.history.pushState` at `onMutate`'s tail, after the two cache writes and with no `await`
between them. Measured by the orchestrator against the running app on 2026-09-08 (dev server, real
backend, in-page instrumentation): on a successful create the `pushState` fires **31ms** after
submit while the create POST returns at **1096ms**; on a forced-500 create the compensating
`replaceState` returns the URL to the origin board **76ms** after the push, with the Retry toast
raised and the surviving board intact.

**What would make THIS false:** a Next release that stops syncing `usePathname()` with a native
History API call, which would reopen the window at both call sites at once.
`e2e/boards-delete.e2e.spec.ts`'s stranding case and `e2e/boards-create.e2e.spec.ts`'s
optimistic-navigation case are what catch that.

## Consequences

- **A reader with a new piece of state picks its home from part 1's table**, and the question that
  decides it is (b)'s: could the server re-derive this entry if it vanished right now?
- **A reader writing hook seventeen fills the four responsibilities from part 2**, and knows from the
  scope section which of them their hook legitimately leaves empty.
- **`CLAUDE.md`'s "copy a shipped hook" instruction is now redundant for the shape** and is re-pointed
  at this record. What it still transmits that a table cannot — the authored toast-copy tables, the
  `no-restricted-syntax` exemptions TanStack's positional callbacks require (`docs/adr/tech/0016-named-object-parameters.md`),
  the `ActionRefusedError` throw shape — is worth reading an exemplar for, and that is what the
  re-pointed instruction says.
- **`CONVENTIONS.md`'s two snapshot-restore claims are corrected** to the per-entity reconcile the
  hooks actually perform.
- **An accepted trade-off: client-supplied board ids expose a cross-tenant existence oracle.**
  Verified read-only against the sibling checkout on 2026-09-08. Since `260908-g5y` this repo sends
  the board id on create. The backend's uniqueness guard is a **global primary-key lookup, run before
  the board is attached to a user**:

  - `kanban-board-backend/src/main/java/com/vrudenko/kanban_board/service/BoardService.java:216` —
    `if (dto.getId() != null && boardRepository.existsById(dto.getId()))` → `AppDuplicateResourceException`.
    `board.setUser(user)` is at `:221`, five lines LATER.
  - `kanban-board-backend/src/main/java/com/vrudenko/kanban_board/repository/BoardRepository.java:12`
    — `extends JpaRepository<BoardEntity, String>`, so `existsById` is the inherited global lookup.
    Nothing scopes it to the requesting user. The repository's own user-scoped guard,
    `existsByUserIdAndName` at `:15`, is a different check, for board NAMES.
  - `kanban-board-backend/src/main/java/com/vrudenko/kanban_board/handler/GlobalExceptionHandler.java:163-170`
    maps that exception to `HttpStatus.CONFLICT` with `DUPLICATE_RESOURCE`. Measured response body,
    2026-09-08 (`260908-g5y`): `{"status":409,"detail":"Board with id 'g9x1uzc1oqd8g' already exists","code":"DUPLICATE_RESOURCE"}`.

  So an authenticated caller can distinguish "this board id exists somewhere in the system" from "it
  does not". **The boundary of what that buys:** confirming a KNOWN id is free — one request. Guessing
  one is not. The client mints 13 uniform base36 symbols
  (`src/features/boards/board-id.ts`, rejection-sampled at 252 so a bare `% 36` cannot bias the first
  four symbols), giving 36^13 ≈ 1.7e20. The accepted pattern is
  `^[0-9a-z]{1,13}$` (`kanban-board-backend/src/main/java/com/vrudenko/kanban_board/constant/ValidationConstants.java`:51-52) — a **minimum of one** character, so the short
  end of the accepted space is trivially enumerable, but the generators never emit there.

  **What would make it matter more**, in rising order of concern:
  1. **The backend's own ids are not uniform.** `kanban-board-backend/src/main/java/com/vrudenko/kanban_board/config/RandFlakeGenerator.java`:122 renders a Snowflake
     (`SEQUENCE_BITS = 22` at its `:16`, `CUSTOM_EPOCH = 1514764800000L` — 2018-01-01Z — at its `:28`) through
     `Long.toString(payload, 36)`, currently 12 characters (`kanban-board-backend/src/main/java/com/vrudenko/kanban_board/dto/annotation/BoardId.java`:36,
     `@Schema(example = "8qfkj52yzi0w")`). A time-derived id is far cheaper to enumerate than 36^12
     suggests: an attacker who knows roughly when a board was created is searching the sequence bits,
     not the whole space. Every server-generated board id in the system is in this class.
  2. **An id leaking into a URL, a log or a shared link** turns a known id into a probe target, at
     which point the oracle answers "does this specific board still exist" for free.
  3. **The check being extended to a resource whose ids are guessable**, or a board id ever carrying
     meaning about its owner.

  Not closable in this repo: the fix is scoping `existsById` to the requesting user on the backend.
  Filed as `.planning/todos/pending/2026-09-08-client-supplied-board-id-opens-a-cross-tenant-existence-oracle.md`.

- **What would make this false**, per entry, each with the observation that would flip it:
  - **A global client store landing in `package.json`** falsifies the rejection in part 1 (d). Check:
    `rg -n 'zustand|jotai|@tanstack' package.json` returning more than the one `react-query` line.
  - **The context census rising above one real `createContext` call site** is (d)'s own trigger
    firing — client state that outlives a route change has appeared, and the store question is open
    again. Check: `rg -n 'createContext' src/ --glob '!*.test.*'`, discounting comment prose.
  - **An optimistic cache-writing command shipping with a responsibility UNACCOUNTED for** falsifies
    part 2 — a rollback path that cannot revert its own effect, or a server-assigned field never
    merged. An *empty* slot with a stated reason confirms the convention; a *missing* one breaks it.
  - **A hook restoring a whole-entry snapshot in `onError`** falsifies the revert rule. Check:
    an `onError` that writes a value captured in `onMutate` without narrowing it to this mutation's
    own entity.
  - **A hook growing an `onSettled` while its pending set lives in the mutation cache** falsifies the
    fifth-slot condition — that retirement is automatic, so the callback would be redundant.
  - **`CLAUDE.md` or `CONVENTIONS.md` drifting back to a snapshot-restore description** falsifies the
    revert rule's claim to be recorded. Check: `rg -i 'restores the snapshot|rolls back the snapshot'`
    over both files.

- **Known documentation drift, recorded not fixed** (a source edit is out of this record's scope):
  four hook doc comments still describe a snapshot restore over code that reconciles —
  `use-delete-task.ts:50` and `:60`, `use-delete-column.ts:50` and `:59`, `use-delete-subtask.ts:48`,
  `use-create-subtask.ts:45`. The 16 comments of the form *"a snapshot restore would ALSO resurrect a
  sibling"* are correct and are not this drift; they are the rule being stated at its call site.

## Sources

- TanStack Query — Optimistic Updates, "Updating the cache directly" (`onMutate` `cancelQueries` →
  snapshot → `setQueryData`; `onError` restore; `onSettled` invalidate), and the
  `examples/react/nextjs-app-optimistic-updates` worked example. Fetched via Context7
  (`/tanstack/query`) 2026-09-08. **This repo deliberately diverges from the guide's snapshot-restore
  rollback** — see the revert rule above for the measurement-free but sibling-safety-based reason.
- `docs/adr/tech/0030-optimistic-writes-via-the-query-cache.md` — the mechanism this amends.
- `docs/adr/tech/0029-optimistic-writes-via-the-ui.md` — superseded; the source of the banned shapes.
- `docs/adr/tech/0019-server-entry-points.md` — the read-placement constraint both records work within.
- `docs/adr/tech/0034-flush-query-notifications-on-the-microtask-queue.md` — how promptly a cache
  write above reaches its `useQuery` observer.
- `docs/adr/tech/0016-named-object-parameters.md` — the signature rule whose exemption every
  positional TanStack callback cites.
- Quick task summaries carrying the measurements quoted above:
  `.planning/quick/260907-q83-investigate-and-fix-the-board-delete-str/260907-q83-SUMMARY.md`,
  `.planning/quick/260908-g5y-accept-a-client-supplied-board-id-on-cre/260908-g5y-SUMMARY.md`,
  `.planning/quick/260908-g61-eradicate-useopenboardid-by-making-the-d/260908-g61-SUMMARY.md`,
  `.planning/quick/260908-g5z-optimistic-board-create-navigation-via-t/260908-g5z-SUMMARY.md`.
- Source files cited as evidence: `src/lib/client/use-unconfirmed-ids.ts`,
  `src/features/boards/hooks/use-create-board.ts`, `src/features/boards/hooks/use-delete-board.ts`,
  `src/features/boards/board-id.ts`, `src/features/boards/schemas.ts`,
  `src/lib/core/query-keys/query-keys.ts`, `src/lib/core/query-keys/mutation-keys.ts`.
