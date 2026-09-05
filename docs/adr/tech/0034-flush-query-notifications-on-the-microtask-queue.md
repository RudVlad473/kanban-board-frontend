# 0034 — Flush query notifications on the microtask queue

## Context

Reordering a task inside one column made every card in that column change title twice within
about three frames — a visible flicker, not a data-correctness bug. A `rAF` sampler driven against
the running dev server on 2026-09-05, dragging card "Alpha" from index 0 to index 2 in a four-card
column, recorded the mechanism directly:

- During the drag, `verticalListSortingStrategy` shifts siblings with inline
  `translate3d(0, ±112px, 0)` and a 200ms transition. DOM order is still the ORIGINAL order; only
  the visual order has changed via CSS transform.
- On drop, dnd-kit clears every sibling's transform and transition synchronously, inside its own
  `unstable_batchedUpdates`. **That render paints.** At t=800ms the sampler read Alpha@165,
  Bravo@277, Charlie@389 — no transforms, but every slot still showing its PRE-move title.
- At t=842ms — about two frames later — the optimistic reorder from `useMoveTask`'s `onMutate`
  finally landed: Bravo@165, Charlie@277, Alpha@389.

Every card in the column therefore changed title twice inside roughly three frames: once when
dnd-kit's own drop render cleared the transforms (still showing the old order), and again when the
cache write reached the `useQuery` observer. Cross-column moves never showed it, because the
destination column's cards carried no sort transforms to clear in the first place.

The gap is not the `await queryClient.cancelQueries(...)` chain inside `onMutate` — that resolves
on the microtask queue and is not the frame boundary. It is
`node_modules/.pnpm/@tanstack+query-core@5.101.4/.../notifyManager.js`'s default scheduler,
`systemSetTimeoutZero`: every `setQueryData` notifies its observers through `setTimeout(0)`, a
macrotask that the browser is free to paint a frame before running. `useMoveTask`'s cache write
(docs/adr/tech/0030) is otherwise correct and synchronous; it is the delivery of that write to the
component tree that lands a frame late.

## Decision Outcome

Set TanStack Query's own notify scheduler to `queueMicrotask` once, at module scope, in
`src/lib/client/query-client.tsx`:

```ts
import { notifyManager } from "@tanstack/react-query";

notifyManager.setScheduler(queueMicrotask);
```

`notifyManager` is re-exported from `@tanstack/react-query` (not only from the underlying
`@tanstack/query-core`) and its type is `readonly setScheduler: (fn: ScheduleFunction) => void` —
imported from the package this app already depends on, not a deeper internal path. Passing
`queueMicrotask` directly (not wrapped) is the form measured; TanStack Query calls it with its own
callback and no `this` binding it relies on.

This is the library's own documented knob for notification timing, not a new mechanism: no ref, no
override store, no staleness comparison, and no change to `use-move-task.ts`'s cache-write shape.
The scheduler change happens to fix a task-drag flicker, but the setting is a query-notification
concern with **global** scope — every `useQuery`/`useMutation` observer in the app now hears about
a cache write a microtask sooner, not board entries specifically.

No SSR guard is added: `query-client.tsx` is `"use client"` but is imported by `app/layout.tsx`, so
the module also executes on the server. `queueMicrotask` has been a Node global since Node 11, and
`package.json` pins `engines.node: 24.x`, so setting the same scheduler on the server's own
short-lived `notifyManager` singleton on every request is harmless and idempotent. `pnpm build`
and the e2e suite both exercise this and pass.

No `.tsx` declaration-scope exemption is needed: `scripts/check-tsx-declarations.mjs` skips
`ts.isExpressionStatement` nodes before judging anything, so a bare call expression at module scope
in a `.tsx` file is already outside what that gate checks.

## Consequences

- `src/components/layout/board-view/board-view.test.tsx`'s within-column keyboard-drop test now
  passes: no sampled frame carries every card's transform cleared to `"none"` while the DOM titles
  still read the pre-move order.
- The change is global to every query observer, so the full test suite (not only the one file
  above) is the evidence nothing else silently depended on the old macrotask-flush timing.
- `use-move-task.ts` and `task-card.tsx` are untouched. The optimistic cache-write mechanism this
  fix depends on is unchanged; see docs/adr/tech/0030's Consequences for the cross-reference the
  other direction.
- **What would make this false:** a `@tanstack/query-core` upgrade that changes `notifyManager`'s
  contract (renames `setScheduler`, or stops honoring a microtask-based scheduler) would reopen the
  gap this closes, as would React itself starting to schedule the notified re-render onto a
  macrotask of its own rather than flushing it within the same microtask checkpoint. Either would
  surface as the pinned sampler test in `board-view.test.tsx` going red again — that test is the
  reproducible signal, not a claim this record makes unfalsifiably.

## Sources

- `node_modules/.pnpm/@tanstack+query-core@5.101.4/.../notifyManager.js` — the default
  `systemSetTimeoutZero` scheduler and `setScheduler`'s contract. Read 2026-09-05.
- `@tanstack/react-query`'s `build/modern/index.d.ts` — `notifyManager`'s re-export and its
  `setScheduler` type. Read 2026-09-05.
- The `rAF` sampler measurement described in Context, taken against this repo's own dev server on
  2026-09-05.
