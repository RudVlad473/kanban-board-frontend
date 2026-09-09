---
phase: quick-260905-s0l
plan: 01
subsystem: ui
tags: [react, tanstack-query, dnd-kit, board-view, vitest-browser]

requires: []
provides:
  - "notifyManager.setScheduler(queueMicrotask) at query-client.tsx module scope — TanStack Query's observers hear about a cache write a microtask sooner than the library's default macrotask flush"
  - "board-view.test.tsx: a per-animation-frame sampler pinning that a within-column keyboard drop never paints a frame with every transform cleared while the DOM still reads the pre-move title order, falsified against the unfixed code first"
  - "docs/adr/tech/0034 — the decision record for the notify-scheduler change, with its own falsification clause"
affects: [query-client, board-view, use-move-task-consumers]

actuals:
  tokens: 3413
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "TanStack Query's own notifyManager.setScheduler knob for notification timing — no bookkeeping about the mutation, no ref, no override store, per CLAUDE.md's 'reach for the platform's own primitive' rule"

key-files:
  created:
    - docs/adr/tech/0034-flush-query-notifications-on-the-microtask-queue.md
  modified:
    - src/lib/client/query-client.tsx
    - src/components/layout/board-view/board-view.test.tsx
    - docs/adr/tech/0030-optimistic-writes-via-the-query-cache.md

key-decisions:
  - "Rung A (keyboard) of the plan's driver ladder produced a genuine RED on the first attempt — no need for the pointer (Rung B) or e2e (Rung C) fallback. The mechanism (notifyManager's macrotask flush) doesn't depend on which input device triggers the drop."
  - "The frame sampler captures synchronously at install time, not only on the next requestAnimationFrame — without that, the very fast keyboard lift/arrow/drop sequence could complete before the first rAF callback ran, silently discarding the live-sort frame the non-vacuity assertion needs. Calibrated empirically (see Issues Encountered)."
  - "sameOrder({ a, b }) takes one destructured object rather than two positional params (ADR tech/0016), and the sampler's per-li query drops an ESLint-flagged unnecessary optional chain/`??` — TypeScript already narrows querySelectorAll(...)[0] as non-nullable here."

patterns-established: []

requirements-completed: [QT-S0L-01, QT-S0L-02, QT-S0L-03]

coverage:
  - id: D1
    description: "After a within-column drop, no painted frame shows the pre-move card order with every card's transform already cleared to none — the first frame with no transforms already carries the reordered order"
    requirement: QT-S0L-01
    verification:
      - kind: unit
        ref: "src/components/layout/board-view/board-view.test.tsx 'paints no frame of the pre-move order once a within-column drop clears the transforms' — RED against 2d6f407's parent (unfixed query-client.tsx), GREEN against 56d6f68 (the fix), both quoted below"
        status: pass
    human_judgment: false
  - id: D2
    description: "The regression test fails against the unfixed code and passes with the fix, falsified in that order, in that run, with both outputs quoted"
    requirement: QT-S0L-02
    verification:
      - kind: unit
        ref: "Falsified in both directions this session (not merely asserted) — see RED output and GREEN output sections"
        status: pass
    human_judgment: false
  - id: D3
    description: "use-move-task.ts and task-card.tsx are byte-identical afterwards; the fix is TanStack's own scheduler knob, not new bookkeeping"
    requirement: QT-S0L-03
    verification:
      - kind: static
        ref: "git diff --name-only a8da96e..HEAD lists only board-view.test.tsx, query-client.tsx, and the two ADR files — use-move-task.ts and task-card.tsx are absent"
        status: pass
    human_judgment: false
  - id: D4
    description: "The flicker is visually gone in the real running app, not only in the sampled test"
    verification: []
    human_judgment: true
    rationale: "This session had no browser MCP tools (shell-only environment, per its own instructions). The sampler proves the DOM/CSS mechanism the measured_facts described is closed; a human/orchestrator driving the real app is what confirms the fix reads as 'no flicker' to an eye."

duration: ~50min
completed: 2026-09-05
status: complete
---

# Quick Task 260905-s0l: Fix the task-title flicker across a column reorder

**`notifyManager.setScheduler(queueMicrotask)` in `query-client.tsx` closes the one-macrotask gap between dnd-kit's own drop render (transforms cleared) and the optimistic reorder reaching `useQuery` — pinned by a per-frame sampler falsified against the unfixed code first.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3 of 3 completed; Task 3's push/CI/state-doc-commit steps deferred to the orchestrator (see below)
- **Files modified:** 4 (2 code/test, 2 docs — one ADR created, one ADR gained a cross-reference line)

## Root cause and fix

Reordering a task inside a column made every card in that column change title twice within about
three frames. `verticalListSortingStrategy` shifts siblings visually with a CSS `transform` while
the DOM order stays original; on drop, dnd-kit clears every transform **synchronously**, in the
same render — so the browser can paint a frame with cleared transforms but still-original titles.
The optimistic reorder from `useMoveTask`'s `onMutate` only reaches the `useQuery` observer once
TanStack Query's `notifyManager` flushes, whose default scheduler is `setTimeout(0)` — a macrotask
the browser is free to paint ahead of. That gap between the two renders is the flicker frame.

Fix: `notifyManager.setScheduler(queueMicrotask)`, once, at `query-client.tsx` module scope. This
is the library's own documented notification-timing knob, not a new mechanism — no ref, no
override store, no staleness comparison, and no change to `use-move-task.ts`'s cache-write shape
(docs/adr/tech/0030). The change is global to every query observer in the app, which is exactly why
Task 3 ran the full `pnpm verify` rather than only the one test file.

## Task Commits

1. **Task 1: RED — pin the pre-move frame with a sampler that fails against today's code** — `2d6f407` (test)
2. **Task 2: GREEN — flush notifications on the microtask queue, and record the decision** — `56d6f68` (fix)
3. **Task 3: Full gate, state, and handoff** — gates run (below), not committed as a separate commit; state-doc update, push, and CI watch deferred (see below)

## RED output (quoted, against the unfixed code)

Ladder rung reached: **Rung A (keyboard)** — the first attempt produced a genuine RED; Rungs B
(pointer) and C (e2e) were never needed.

```
 FAIL  |browser (chromium)| src/components/layout/board-view/board-view.test.tsx > BoardView (MOBILE) > paints no frame of the pre-move order once a within-column drop clears the transforms
 FAIL  |browser (chromium)| src/components/layout/board-view/board-view.test.tsx > BoardView (DESKTOP) > paints no frame of the pre-move order once a within-column drop clears the transforms
AssertionError: expected true to be false // Object.is equality

 ❯ src/components/layout/board-view/board-view.test.tsx:2934:36
    2932|                     sameOrder(frame.titles, preMoveOrder),
    2933|             );
    2934|             expect(hasFlickerFrame).toBe(false);
       |                                    ^

 Test Files  1 failed (1)
      Tests  2 failed | 218 skipped (220)
```

Both non-vacuity assertions passed first (a live-sort frame and a reordered frame were both
genuinely sampled), and the forbidden-conjunction assertion (`hasFlickerFrame`) failed on **both**
DESKTOP and MOBILE — a sampled frame carried every card's `transform` already `"none"` while the
titles still read the pre-move order (`["Task One", "Task Two", "Task Three", "Task Four"]`
instead of `["Task Two", "Task One", "Task Three", "Task Four"]`), reproducing the reported bug
exactly.

## GREEN output (quoted, against the fix)

```
 Test Files  1 passed (1)
      Tests  2 passed | 218 skipped (220)
```

Full file: `pnpm exec vitest run --project browser src/components/layout/board-view/board-view.test.tsx`
— **220/220 passed**, no new skips (the scheduler change is global, so this is the evidence no
sibling test in the same file silently depended on the old macrotask-flush timing).

## Files Created/Modified

- `src/lib/client/query-client.tsx` — `notifyManager.setScheduler(queueMicrotask)` at module scope, a 3-line pointer comment naming ADR 0034, and the `Covered by:` line extended with the new test path
- `src/components/layout/board-view/board-view.test.tsx` — `sampleFirstColumnFrames()` helper (records per-`li` title + `transform` on every animation frame, with a synchronous first sample) and the new pinned test
- `docs/adr/tech/0034-flush-query-notifications-on-the-microtask-queue.md` — new ADR: Context (the measured mechanism), Decision Outcome, Consequences with a falsification clause, Sources
- `docs/adr/tech/0030-optimistic-writes-via-the-query-cache.md` — one Consequences bullet cross-referencing 0034

## Decisions Made

- Rung A (keyboard) reached RED on the first attempt; documented above so a future reader doesn't
  assume the pointer/e2e rungs were needed.
- The sampler captures synchronously at install time (not only via the next `requestAnimationFrame`)
  — see Issues Encountered for why this was necessary, discovered empirically rather than assumed
  from the plan text.
- `sameOrder` takes one destructured `{ a, b }` parameter (ADR tech/0016's 2+-parameter rule), and
  the sampler's DOM read drops an ESLint-flagged unnecessary `?.`/`??` — TypeScript already narrows
  `querySelectorAll("section")[0]` as non-nullable in this codebase's config.

## Deviations from Plan

None against the plan's substance — Tasks 1 and 2 executed exactly as specified, landing at Rung A
as the plan's own ladder anticipated as the most likely outcome. Two calibration adjustments to the
test's own mechanics (not scope changes) are documented under Issues Encountered.

## Known Stubs

None.

## Issues Encountered

**The sampler needed a synchronous first capture, found by running the RED test and reading its
own output rather than assuming it would just work.** The first version of the test scheduled the
sampler's first read only via `requestAnimationFrame`, installed right before the drop keypress.
Running it against the unfixed code produced two *different* wrong failures per device (DESKTOP
never saw a non-`"none"` transform at all; MOBILE never saw the reordered title order) — not the
intended flicker-conjunction failure. Debug logging the raw sampled frames showed why: `userEvent.keyboard(" ")`
can complete its dispatch before the scheduled `rAF` callback ever fires, so the loop's first
recorded frame was already past the drop. Fixed by calling the capture function once synchronously
at sampler-install time (in addition to the `rAF` loop), and by awaiting one more animation frame
before `stop()` so the sampler's own last tick — a frame behind the `expect.poll` that reads the
DOM directly — is captured too. After that change, both non-vacuity assertions passed on the first
run and the flicker assertion failed exactly as the bug predicts.

**One unrelated flake surfaced in the first full `pnpm verify` run, and was confirmed unrelated
before treating it as gate-passing.** The combined `time pnpm verify | tail -200` run stopped at
`[test]` on `theme-toggle.stories.tsx > Save Failed`, timing out after 15000ms. That story renders
no `useQuery`/`useMutation` and touches no code this task changed. Re-ran `pnpm test` alone (the
gate's own "Re-run alone" line) — **135/135 test files, 2173/2173 tests passed**, including that
same story in isolation (5/5). A second full `pnpm verify` run then also passed clean end-to-end
(20/20 steps, 762564ms) with no flake. Treated as pre-existing contention flakiness under the full
gate's combined CPU load, not a regression from the `notifyManager` change — the isolated and the
second full run are the evidence, not an assumption.

## User Setup Required

None — no external service configuration required.

## Deferred to the orchestrator (per this session's environment instructions)

This session ran on the main checkout with a Next dev server already owned by the orchestrator on
port 3000, had no browser MCP tools, and was explicitly told not to push or run `gh run watch` —
the orchestrator handles the push and CI step after the docs commit. So, unlike the plan's Task 3
as written:

- **Not run:** `git push`, `gh run list` / `gh run watch --exit-status`.
- **Not committed:** `.planning/STATE.md` — this session's environment instructions forbid
  committing docs artifacts; the orchestrator handles that commit alongside this SUMMARY.
- **Run and green:** the full `pnpm verify` (20/20 steps, 762564ms on the second, non-flaky run —
  see Issues Encountered for the first run's unrelated flake and its isolation).
- **`.e2e-seeded-users/` check:** contains only the pre-existing `manual.txt`, per this session's
  environment note that it belongs to the orchestrator's own login — left untouched. This task
  seeded no accounts of its own.
- **Not proven by the shell:** the flicker's visual absence to a human eye, driving the real running
  app (D4 above) — the orchestrator's own headless browser check is what closes that.

**Commits ready to push:** `2d6f407` (test, RED) and `56d6f68` (fix, GREEN), both on
`gsd/phase-04-task-subtask-workflow`, both covered by the green `pnpm verify` run above.

## Next Phase Readiness

The fix is in and gated green locally (twice, with the intervening flake isolated and explained).
Remaining for whoever owns push/CI next:
1. Push `2d6f407` and `56d6f68` (fast-forward) and confirm `gh run watch` returns 0 with all four
   jobs (`quality`, `secrets`, `e2e`, `visual`) read back by name.
2. Drive the real running app (drag a task within a column) to confirm the flicker is gone to a
   human eye — this task closed the mechanism `measured_facts` described and pinned it with a test,
   but had no browser tool to confirm the visual result directly.

---
*Phase: quick-260905-s0l*
*Completed: 2026-09-05*

## Self-Check: PASSED

All claimed files found on disk; both commits (`2d6f407`, `56d6f68`) found in `git log --oneline --all`.
