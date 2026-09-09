---
phase: quick-260906-hze
plan: 01
subsystem: ui
tags: [nextjs, app-router, loading-tsx, route-group, e2e, playwright, mutation-observer]

requires:
  - phase: quick-260905-r15
    provides: "BoardScreen keyed on board.id, so a board switch mounts a fresh scroll row (the carried-scroll-offset defect, separate root cause)"
provides:
  - "The one-frame stacked-board-area defect FINDINGS.md measured (skeleton committed beside the live board, height halved) is closed by scoping boards/loading.tsx to a (index) route group"
  - "A MutationObserver-based e2e instrument for pinning a transient committed-DOM defect that expect(...).toHaveCount(0) cannot pin"
affects: [board-switch-flicker-followups, phase-04-close-out]

actuals:
  tokens: 2700
  tasks: 3
  commits: 2
  # ~10,666 chars of realized diff across e2e/boards-switch.e2e.spec.ts and the two moved app/ files
  # (chars/4), against a 95000-token estimate — the estimate assumed a heavier investigation; the
  # root cause was already locked in FINDINGS.md, so this ran as a pinning-test-plus-file-move.

tech-stack:
  added: []
  patterns:
    - "Next route groups to re-scope a loading.js fallback to one route without touching the URL"
    - "MutationObserver on a committed DOM ancestor, sampled inside the browser via page.evaluate, for pinning a transient stacked-render defect that a polling toHaveCount(0) assertion cannot catch"

key-files:
  created:
    - "app/(dashboard)/boards/(index)/page.tsx (moved, unchanged content)"
    - "app/(dashboard)/boards/(index)/loading.tsx (moved, coverage pointer + decision record updated)"
  modified:
    - "e2e/boards-switch.e2e.spec.ts"
    - ".planning/STATE.md"

key-decisions:
  - "Route group ((index)) over emptying boards/loading.tsx to <></> — preserves the /boards loading state (the post-sign-in redirect target, where a real backend round trip is user-visible), per Next's own documented mechanism for scoping a loading.js to one route (rejected alternatives recorded in the file's own decision record)."
  - "Ladder started at rung 2 (read-hold applied before the first RED run) per the plan's user-signed-off amendment — both independent reviewers needed the delayed read to reproduce deterministically."
  - "MutationObserver sample recorder over a requestAnimationFrame sampler or expect(...).toHaveCount(0) — the latter polls and is satisfied the instant the frame ends, and is already used (and already passing with the defect present) by the neighboring BOARD-04 case."

patterns-established:
  - "A transient one-frame committed-DOM defect gets pinned with a MutationObserver install/read pair inside page.evaluate, storing samples on a declared global Window property, not with expect(...).toHaveCount(0) or a requestAnimationFrame sampler."

requirements-completed: [QT-HZE-01, QT-HZE-02, QT-HZE-03]

coverage:
  - id: D1
    description: "A third e2e describe block pins that a board switch never commits a board-view-skeleton beside board-columns-scroll, and the board area never drops below 90% of its pre-switch height — falsified against the unfixed code first."
    requirement: "QT-HZE-01"
    verification:
      - kind: e2e
        ref: "e2e/boards-switch.e2e.spec.ts#a board switch never stacks two board areas > never commits a skeleton beside the live board, and never halves its height"
        status: pass
    human_judgment: false
  - id: D2
    description: "boards/loading.tsx and boards/page.tsx moved into a (index) route group so the loading fallback scopes to /boards only; /boards keeps its redirect, its loading state, and its empty state at the same URL."
    requirement: "QT-HZE-02"
    verification:
      - kind: e2e
        ref: "e2e/boards-list.e2e.spec.ts and e2e/boards-detail.e2e.spec.ts (5/5 pass)"
        status: pass
      - kind: e2e
        ref: "e2e/boards-switch.e2e.spec.ts (BOARD-04 instant-paint case and scroll-offset case, both still pass in the fix run)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The four orchestrator_checks (live flicker re-confirmation, /boards throttled-load skeleton preservation, hard-load double-skeleton hypothesis, and the separately-reported vertical+horizontal scrollbar) require driving the real running app."
    requirement: "QT-HZE-03"
    verification: []
    human_judgment: true
    rationale: "This executor has no mcp__playwright__* tools (project convention); every live-app confirmation is explicitly the orchestrator's responsibility per the plan's <orchestrator_checks> and this project's CLAUDE.md."

duration: 45min
completed: 2026-09-06
status: complete
---

# Phase quick-260906-hze Plan 01: Fix the one-frame stacked-board-area flicker Summary

**Moved `boards/loading.tsx` into a `(index)` route group so its Suspense fallback stops covering `[boardId]`, closing the FINDINGS.md-measured defect where a board switch briefly rendered a skeleton beside the live board and halved its height.**

## Performance

- **Duration:** ~45 min (including a ~8min `pnpm verify` run)
- **Tasks:** 3/3 complete
- **Files modified:** 4 (`e2e/boards-switch.e2e.spec.ts`, the two moved `app/` files, `.planning/STATE.md`)

## Accomplishments

- Pinned the exact defect FINDINGS.md measured with a `MutationObserver`-based e2e case, falsified against the unfixed code first (RED `072c120`) and confirmed against the fix (GREEN `29b4d6e`).
- Fixed it with a two-file `git mv` into a `(index)` route group — Next's own documented mechanism for scoping a `loading.js` fallback to one route without touching the URL — plus a dated, falsifiable decision record on the moved `loading.tsx`.
- Verified the fix doesn't regress BOARD-04's instant-paint guarantee, the scroll-offset case, or `/boards`'s redirect/empty-state behavior, under both a normal run and `--repeat-each=3 --workers=2` contention (9/9, zero flaky).
- `pnpm verify`'s full 20-gate run green (2177/2177 unit/browser tests, 75/75 e2e).

## Task Commits

1. **Task 1: RED — pin the stacked board areas with an e2e case that fails today** — `072c120` (test)
2. **Task 2: GREEN — scope the /boards loading fallback to /boards with a route group** — `29b4d6e` (fix)
3. **Task 3: Prove it holds, gate, and hand the live checks to the orchestrator** — see below (docs/state update, no separate commit yet at summary-write time)

## Files Created/Modified

- `e2e/boards-switch.e2e.spec.ts` — added a third `test.describe` with a `MutationObserver`-based recorder on `<main>`, plus a `StackedAreaSample` type and a `declare global { interface Window { ... } }` augmentation
- `app/(dashboard)/boards/(index)/page.tsx` — moved via `git mv`, content unchanged
- `app/(dashboard)/boards/(index)/loading.tsx` — moved via `git mv`; coverage pointer changed to `e2e/boards-switch.e2e.spec.ts`; decision record extended with the dated (2026-09-06) measurement and the mechanism (Next's `loading.js` wraps nested segments)
- `.planning/STATE.md` — Quick Tasks Completed row + Session Continuity entry

## Decisions Made

See `key-decisions` in frontmatter: route group over emptying the fallback (preserves `/boards`'s own loading state); ladder rung 2 first per the amendment; `MutationObserver` recorder over `toHaveCount(0)` or a `requestAnimationFrame` sampler.

## RED Output (against the unfixed code, first run)

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 7

- Array []
+ Array [
+   Object {
+     "board": true,
+     "height": 324,
+     "skeleton": true,
+   },
+ ]

      333 |
      334 |         // Assert — the mechanism: no committed sample ever holds both testids at once.
    > 335 |         expect(samples.filter((sample) => sample.skeleton && sample.board)).toEqual([]);
          |                                                                             ^
      336 |
      337 |         // Assert — the user-visible symptom: the board area never collapses below 90% of its baseline.
      338 |         expect(samples.filter((sample) => sample.board && sample.height < baseline * 0.9)).toEqual([]);

  1 failed
    [e2e] › e2e/boards-switch.e2e.spec.ts:230:9 › a board switch never stacks two board areas › never commits a skeleton beside the live board, and never halves its height
  2 passed (44.2s)
```

This matches the plan's corroborating evidence exactly (`{ "board": true, "height": 324, "skeleton": true }` against a 647px baseline). No ladder fallback was needed — the amendment's rung 2 (read-hold applied before the first attempt) reproduced it on the first run.

## GREEN Output (against the fix)

```
Running 3 tests using 1 worker

  ✓  1 [e2e] › e2e/boards-switch.e2e.spec.ts:62:9 › BOARD-04: switching boards shows the loaded board immediately › paints the already-loaded board on switch, then replaces it with the fresh read (10.5s)
  ✓  2 [e2e] › e2e/boards-switch.e2e.spec.ts:145:9 › a board switch lands at the start of the column row › resets the carried-over scroll offset when the destination board also overflows (8.5s)
  ✓  3 [e2e] › e2e/boards-switch.e2e.spec.ts:230:9 › a board switch never stacks two board areas › never commits a skeleton beside the live board, and never halves its height (14.0s)

  3 passed (59.8s)
```

`boards-list`/`boards-detail`: 5/5 passed (31.7s) — `/boards` still redirects to the first board, cross-account isolation holds, and the empty state still renders.

## Ladder Rung Used

**Rung 2** (per the plan's amendment) — the read-hold (`holdEveryRead(page)`) was applied immediately before the click, before the first RED attempt. It reproduced deterministically on the first run; rung 1 (no hold) was never attempted, and rung 3 (stop and report) was not needed.

## Contention Run (`--repeat-each=3 --workers=2`)

```
Running 9 tests using 2 workers
...
  9 passed (1.3m)
```

9/9 passed, zero `flaky` entries.

## `pnpm verify` Result

**Passed — 20 steps, total 494073ms (~8m14s).** Full breakdown: `e2e-preflight`, `secrets`, `folders`, `actions`, `handlers`, `gates`, `stories`, `coverage`, `routes`, `comments`, `tsx`, `renders`, `api-generate`, `api-drift`, `typegen`, `format`, `build`, `lint`, `test` (135 files / 2177 tests passed), `e2e` (75/75 passed, 2.2m) — all `ok`.

`.e2e-seeded-users/` holds only `manual.txt` (`8q8vgt6to0zk`), the orchestrator's own manual login per this task's execution notes — explicitly not cleaned up, since this task never seeded or ran `pnpm e2e:cleanup` by hand; every seed used inside the new e2e run went through the suite's own `globalTeardown`.

## Push and CI

Pending as of this write — see the completion message for the push result and per-job CI conclusions.

## Deviations from Plan

None beyond the user-signed-off amendment (ladder starting at rung 2), which the plan itself directs this summary to record rather than treat as a deviation. Two ESLint findings surfaced only through the pre-commit hook (not caught by writing the code, since `page.evaluate`'s callback runs in a browser context where the project's normal `es-toolkit`-based `isNil` lint rule doesn't apply) were fixed inline: a `declare global { interface Window }` block needed a `local/consistent-type-definitions` disable (declaration merging requires `interface`, not `type`), and the three `boardEl`/`skeletonEl` null checks inside the browser-context closure needed `local/prefer-is-nil` disables with a comment explaining `es-toolkit`'s `isNil` isn't reachable from code serialized into the browser. Both are `[Rule 3 - Blocking]` fixes (lint failures blocking the commit), not scope changes to the test's behavior or assertions.

One tooling gotcha found and worked around (not a plan deviation): Playwright's `--project <project-name...>` flag is variadic and consumes ALL subsequent bare CLI tokens as project names — so `playwright test --project e2e <path>` treats `<path>` as a second project name and fails with "Project(s) ... not found". Every ad-hoc invocation in this task therefore put the test path BEFORE `--project e2e` (`playwright test <path> --project e2e`), which is unaffected by the variadic consumption.

## Known Stubs

None.

## Threat Flags

None — this change crosses no trust boundary (`.planning/config.json` has `security_enforcement: false`, matching fact 15 of the plan).

## Orchestrator Handoff — `<orchestrator_checks>` (verbatim from the plan, UNRUN)

Subagents in this project have no `mcp__playwright__*` tools, so these belong to the orchestrator, after this executor reports. Each names what would confirm or refute it.

1. **The flicker itself.** Drive the running app headless, switch boards several times, and re-run FINDINGS' own per-frame rAF sampler over `<main>`'s children. Confirms: no frame with two board areas, and the scroll container's height constant across the switch. Refutes: any frame still reading ~half height — in which case there is a second source and FINDINGS' fact 4 was incomplete.

2. **The `/boards` loading state, which the fix is shaped to preserve.** Hard-load `/boards` (the post-sign-in redirect target) with the network throttled, and confirm the board skeleton still paints while the redirect resolves. This is the one thing the chosen fix buys over the cheaper one-line alternative, and no automated test asserts it — the skeleton's visibility is timing-dependent, which is exactly why the fix preserves it structurally instead of relying on a test to catch its loss.

3. **A predicted side effect, NOT measured — treat as a hypothesis.** A hard load of `/boards/<id>` may also have been stacking two skeletons (the layout's own Suspense fallback plus the `boards`-level one) during streaming. Throttle the network, hard-load a board URL, and count `[data-testid="board-view-skeleton"]` elements: one after the fix, and if two were visible before it, that is a second symptom closed. If only one was ever visible, nothing is wrong — the prediction was simply not borne out.

4. **The combined vertical + horizontal scrollbar the user reports.** NOT reproduced in FINDINGS, NOT claimed fixed by this plan. To confirm or refute: after the fix, switch boards repeatedly at several viewport heights (1080, 800, 700) and at browser zoom levels above 100%, sampling `document.scrollingElement.scrollHeight - clientHeight` and `<main>`'s own overflow per frame. A vertical scrollbar appearing at any of them is a separate defect needing its own findings run — the plausible mechanism FINDINGS names (two stacked `flex-1` board areas overflowing `<main>`) is removed by this fix, so a recurrence means a different cause, not an incomplete fix.

## Next Phase Readiness

The moved files carry a falsifiable, dated decision record; the e2e instrument (MutationObserver sample recorder) is a reusable pattern for any future transient-committed-DOM defect. No blockers for Phase 04 close-out from this task; the four orchestrator checks above and the pre-existing 04-22 human sign-off checkpoint remain open.

---
*Phase: quick-260906-hze*
*Completed: 2026-09-06*
