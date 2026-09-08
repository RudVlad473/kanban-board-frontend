---
created: 2026-09-08T16:00:00.000Z
title: The column fan-out handoff could now collapse back into createBoard
area: boards
severity: minor
files:
    - src/features/boards/pending-column-fan-out.ts
    - src/features/boards/hooks/use-run-pending-column-fan-out.ts
    - src/features/boards/hooks/use-create-board.ts
    - src/features/boards/hooks/use-create-board-columns.ts
---

## Problem

`pendingColumnFanOuts` — a module-scope `Map` written by `createBoard` and read destructively at
`BoardView`'s mount — exists because of one measurement that no longer applies.

260907-exb Task 1 measured that dispatching the fan-out's Server Action concurrently with
`router.push()` stalled the WHOLE navigation, because both shared Next's single pending-transition
commit. Quick task `260908-g5z` deleted that `router.push`: the create now moves the URL with
`window.history.pushState`, which issues no request and opens no transition. The stall the handoff
was built to dodge is therefore unreachable on this path.

Two things the handoff still does, and they are why this was NOT collapsed as part of `260908-g5z`:

1. It defers the DISPATCH to a point where the board's own create may already have settled, which
   is what the `boardCreated` settle gate in `useCreateBoardColumns`' `mutationFn` reads. Collapsing
   the handoff means finding another home for that gate.
2. It keeps `use-create-board.ts` from importing the column mutation's dispatch path directly,
   which is a boundary the two hooks were split along.

Note that the STAGING half already moved: `useCreateBoard`'s `onMutate` writes the placeholder
columns into the `["board", id]` entry before the URL moves, because staging them at the mount
painted "This board is empty" for a frame first (measured 2026-09-08). So the Map now carries a
dispatch instruction, not an optimistic write.

## Solution

Re-derive whether the indirection still earns its place, and if not, call `createColumns` from
`createBoard` directly with the settle gate inlined — deleting `pending-column-fan-out.ts`,
`use-run-pending-column-fan-out.ts` and the `board-view.test.tsx` describe block that drives them.

Measure before deleting: dispatch the fan-out from `createBoard`, concurrently with the
`pushState`, and confirm against a production build that the URL, the header and the typed columns
still land in the same frame — the assertion `e2e/boards-create.e2e.spec.ts`'s
"moves the URL and paints the new board with its typed columns while the create is still held"
already makes. If that case stays green with the handoff removed, the handoff is dead weight.
