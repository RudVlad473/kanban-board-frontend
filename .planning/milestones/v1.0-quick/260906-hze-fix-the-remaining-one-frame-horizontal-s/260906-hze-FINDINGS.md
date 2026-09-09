# Findings — one-frame scrollbar flicker on a board switch

Measured 2026-09-06 by driving the running dev server through this project's own headless
Playwright MCP, with a `requestAnimationFrame` sampler recording DOM geometry per frame. Every
number below is observed, not inferred.

## Root cause

For exactly one frame during a client board switch, `<main>` holds **two** board areas:

```
mainChildren: [
  "div[board-columns-scroll] h324",     <- the real board area, HALVED
  "div h0",
  "div h1",
  "div[board-view-skeleton] h324",      <- a second board area, from the page slot
]
```

`app/(dashboard)/layout.tsx`'s `<main className="flex min-h-0 flex-1 flex-col">` gives both children
`flex-1`, so they split the available height 50/50. The board's scroll container goes
**647px -> 324px -> 647px** across three consecutive frames.

The horizontal scrollbar is pinned to the bottom edge of that scroll container, so it jumps up ~323px
and back within one frame. That is the flicker.

Per-frame transitions across one switch (rAF sampler, `scrollWidth/clientWidth@top h height`):

| t (ms) | scroll container | skeleton | url |
|--------|------------------|----------|-----|
| 78467  | `2760/980@73h647` | absent  | board A |
| 82483  | `1848/980@73h324` | present at top=397 | board B |
| 82509  | `1848/980@73h647` | absent  | board B |

The skeleton's ancestry places it as a direct child of `<main>`, i.e. it arrives through `{children}`
(the page slot), not through the layout's own Suspense fallback:

```
div.flex.min-h-full > div.flex.h-dvh > main.flex.min-h-0.flex-1 > div[board-view-skeleton].flex.min-h-0.flex-1
```

`app/(dashboard)/boards/[boardId]/loading.tsx` is deliberately empty (returns `<></>`) and cannot
produce this. `app/(dashboard)/boards/loading.tsx` returns `<BoardViewSkeleton />` and is the only
other candidate.

## What this corrects

The task was opened believing `board-screen.tsx:108`'s `key={board.id}` caused the flicker by
destroying and recreating the scroll container. **That is wrong.** The sampler shows the element's
identity does change on a switch (a keyed remount, as designed), but it changes *within a single
frame* with no gap — `n` is never 0, and the container is never missing. The `key` is not implicated
and quick task `260905-r15`'s fix should not be reverted or changed.

## Independent confirmation from the user's recording

`B:\videos\obs\2026-09-06_12-46-22.mov`, 1920x1080 at 60fps. Measuring the scrollbar thumb's
x-extent on every one of the 2508 frames shows the bar vanishing from its usual row for 1-3 frames at
each board switch, then returning at a different thumb length:

| t (s) | frames absent | thumb before -> after |
|-------|---------------|-----------------------|
| 10.57 | 2             | 976px -> 791px        |
| 14.12 | 3             | 791px -> 976px        |
| 27.53 | 1             | 976px -> 791px        |

Consistent with the bar moving up out of the sampled row rather than being deleted.

## Not reproduced

The user also reports "sometimes there's even vertical + horizontal scroll bar". No vertical
scrollbar appears anywhere in the recording — the only full-height dark column is the delete modal's
dim overlay. A plausible mechanism follows from the same root cause (two stacked board areas can
overflow `<main>` at some viewport sizes), but it is unconfirmed. Do not claim it fixed without
reproducing it first.
