---
phase: 04-task-subtask-workflow
plan: 12
subsystem: tasks
tags: [tracer-slice, dnd-kit, multi-container-drag, server-action, optimistic-update, task-card, design-tokens]

requires:
  - phase: 04-05
    provides: The task API contract schemas (`taskSchema`, the tasks-less mutation-response shape) and `TASK_MOVE` in `external-paths.ts`
  - phase: 04-06
    provides: The conflict discriminant in `map-problem-code.ts`/`result-status.ts` that the move action's stale-version path returns
  - phase: 04-11
    provides: The `pnpm actions:check` verb gate (`move` is in its closed set) and the rewritten CONVENTIONS.md this plan's file placement follows
provides:
  - The move Server Action, validating and authorizing from the verified session record only
  - The task card with a sibling 44x44 ghost drag handle, and the tasks-feature model/drag-model split
  - The optimistic move hook with rollback and a per-status toast table
  - Multi-container drag wiring in the layout-ring composition root, task nodes passed DOWN as a render prop
  - A type-branching collision strategy that leaves column-drag behaviour unchanged
  - The corrected project-wide radius scale (md 24px -> 8px, lg retired, buttons on rounded-full)
affects: ["04-13", "04-14", "04-15", "04-16", "04-17", "04-18", "04-19", "04-20"]

actuals:
  tokens: 310000
  tasks: 4
  commits: 13

tech-stack:
  added: []
  patterns:
    - "A feature that needs dnd-kit VALUES gets a two-file split: `model.ts` stays type-only and server-safe, `task-drag-model.ts` holds every value import. dnd-kit calls a React context factory at module scope, and the server-only board read imports `model.ts` — merging them kills the production build on the board route (RESEARCH Pitfall 14). This mirrors `column-drag-model.ts` from phase 03 rather than inventing a second shape"
    - "Cross-feature composition happens in the layout ring, never between features: `BoardView` passes task nodes DOWN into `SortableColumn` as a render prop between two client components, so `sortable-column.tsx` imports nothing from the tasks feature and `eslint.config.mjs` needs no new exception (D-18)"
    - "Drags in a shared `DndContext` are discriminated by DATA, not by guesswork: `useSortable` declares a `type` on both columns and tasks and every handler reads it. Without it the existing `handleDragEnd` index lookup returns -1 for a task id and silently no-ops"
    - "A collision strategy branches on the active item's declared type rather than being swapped wholesale, so replacing `closestCenter` for task drags leaves column-drag behaviour bit-identical"
    - "Droppables are disabled outside their own drag kind. Scoping the collision function alone is not enough — dnd-kit's `sortableKeyboardCoordinates` walks the droppable registry directly, not the collision result, so keyboard reorder still crosses kinds unless the registry itself is narrowed"

key-files:
  created:
    - src/features/tasks/schemas.ts
    - src/features/tasks/schemas.unit.test.ts
    - src/features/tasks/actions/move-task-action.ts
    - src/features/tasks/actions/move-task-action.integration.test.ts
    - src/features/tasks/model.ts
    - src/features/tasks/model.unit.test.ts
    - src/features/tasks/task-drag-model.ts
    - src/features/tasks/task-drag-model.unit.test.ts
    - src/features/tasks/hooks/use-move-task.ts
    - src/features/tasks/components/task-card/task-card.tsx
    - src/features/tasks/components/task-card/task-card.stories.tsx
    - src/features/tasks/components/task-card/task-card.test.tsx
  modified:
    - src/features/boards/model.ts
    - src/features/boards/components/sortable-column/sortable-column.tsx
    - src/features/boards/components/sortable-column/sortable-column.stories.tsx
    - src/features/boards/components/sortable-column/sortable-column.test.tsx
    - src/components/layout/board-view/board-view.tsx
    - src/components/layout/board-view/board-view.stories.tsx
    - src/components/layout/board-view/board-view.test.tsx
    - tokens/radius.tokens.json
    - visual/__screenshots__/primitives.visual.spec.ts/ (20 modal baselines)

key-decisions:
  - "The checkpoint's ONE failure was the card's corner radius — 28px against the mock's 7.4px — and the cause was not this plan's code. Every radius token had been derived with 600 DPI / 6.25, but the mock is a 1440 CSS px wide design, so a 600 DPI render needs 12000/1440 = 8.3333; the whole scale read 1.333x too large. Fixing the card alone would have papered over a project-wide error, so the scale was re-derived instead: md 24px -> 8px, lg (28px) retired, buttons/icon-buttons moved to `rounded-full`. Calibrated independently on two mock pages. No new token minted."
  - "Nothing looked broken before this because CSS clamps `border-radius` to half the box: a 48px-tall button with a 28px radius renders as a perfect pill by accident. Only containers are large enough for the error to become visible, which is why a task card is what finally exposed it."
  - "Task 3 was adopted from the stranded executor worktree `worktree-agent-ae6e78084fa8fe8f8` rather than from the phase branch's own narrower fix. Both scoped the column collision path to COLUMN droppables; only the worktree's also disabled the column-body and task-card droppables outside their own drag kind, which is what `sortableKeyboardCoordinates` actually walks. That difference is exactly what closed the 5 MOBILE keyboard-reorder cases the phase branch could only mark skip. (User choice.)"
  - "Visual baselines were re-recorded locally rather than deferred to the main-gated `visual-baselines.yml` workflow. The deciding evidence was a compare-only run: 295 passed, 5 failed, and all 5 were `components-ui-modal` — no component the radius change never touched differed, so this box's renderer agrees with the ubuntu-latest runner's. ADR tech/0008 discourages off-CI writes, but its stated concern is a Windows-rendered PNG and this box is Linux. (User choice.)"
  - "Recorded with `--update-snapshots=all`, not `changed`. 20 files changed rather than the 5 that failed: the 15 dark and desktop variants carried real corner diffs sitting under the per-pixel threshold, and only `all` rewrites those."

patterns-established:
  - "Scoping a dnd-kit collision function is half a fix. The keyboard path reads the droppable REGISTRY, so a kind-scoped collision strategy plus enabled cross-kind droppables produces a pointer path that works and a keyboard path that does not — a split that reads as a mobile-only scroll bug"
  - "A single wrong DPI divisor in a measurement convention propagates silently into every token derived from it, and CSS's own radius clamping hides it everywhere except the one container large enough to show it. Re-derive the scale, do not patch the symptom"
  - "Playwright's `dragTo` cannot start a dnd-kit drag: one press-move-release never clears MouseSensor's activation distance, so the card drops back at its origin and the run reads as a product bug. Drive `mouse.down()` -> ~25 interpolated `mouse.move()` steps -> `mouse.up()`"

requirements-completed: [TASK-04]

coverage:
  - id: D1
    description: "TASK-04 end to end: a task drags between columns and persists across a reload"
    verification:
      - kind: browser
        ref: "Headless via `mcp__playwright__*` against `pnpm dev`, signed in on a populated board: dragged a card by its handle into another column, it landed there, and it was still there after a full reload"
        status: pass
      - kind: browser
        ref: "Optimism proven, not assumed: the destination column showed the card ~100ms after mouse-up, before the network settled"
        status: pass
    human_judgment: false
  - id: D2
    description: "One completed move, one request; a no-op drop costs nothing"
    verification:
      - kind: browser
        ref: "Network call log asserted at exactly 1 request for a completed cross-column move, and exactly 0 for a drop released back at its origin (T-04-32)"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-13/S-04: the card body and the handle do not collide"
    verification:
      - kind: browser
        ref: "A plain click on the card body started no drag"
        status: pass
      - kind: other
        ref: "The other half — that a body click OPENS the detail view — could not be proven and is NOT claimed. The detail view is deliberately a later plan; `board-view.tsx` wires the seam to a documented no-op"
        status: deferred
    human_judgment: false
  - id: D4
    description: "Column reorder, the tracer's other half, still works by pointer and by keyboard"
    verification:
      - kind: browser
        ref: "Reordered a column by pointer and by keyboard; the announcement advances past the lift (the phase-03 regression is genuinely gone) and the order survived a reload"
        status: pass
      - kind: test
        ref: "`board-view.test.tsx` 126/126 with zero skips — the 5 MOBILE keyboard-reorder cases that were marked skip are un-skipped and passing"
        status: pass
    human_judgment: false
  - id: D5
    description: "D-18 holds: no feature -> feature edge, and no eslint exception bought one"
    verification:
      - kind: other
        ref: "`grep -c 'features/tasks' src/features/boards/components/sortable-column/sortable-column.tsx` -> 0"
        status: pass
      - kind: other
        ref: "`eslint.config.mjs` unmodified by this plan. The two changes present in the branch range are both from the interleaved quick task 260829-kyv (a Playwright `globalTeardown` default-export exemption, and widening ADR tech/0012's enum-key licence to `src/test-utils/`); neither touches the boundaries policy"
        status: pass
    human_judgment: false
  - id: D6
    description: "RESEARCH Pitfall 14: no dnd-kit value import reaches the server-only read path"
    verification:
      - kind: other
        ref: "`src/features/tasks/model.ts` line 1 is `import type { Announcements, UniqueIdentifier } from \"@dnd-kit/core\"` — type-only. Every value import sits in `task-drag-model.ts`"
        status: pass
      - kind: build
        ref: "`pnpm build` exit 0, including the board route"
        status: pass
    human_judgment: false
  - id: D7
    description: "UI-SPEC populated/task-card matches the measured mock"
    verification:
      - kind: browser
        ref: "Measured against PDF p4: title 15px, inter-card gap 20px, padding 16/24 — all match"
        status: pass
      - kind: browser
        ref: "Corner radius INITIALLY FAILED at 28px against the mock's 7.4px. Root-caused to a wrong DPI divisor in the token derivation, not to this plan's card; the scale was re-derived and the card now renders the corrected md (8px)"
        status: pass
      - kind: other
        ref: "The title-to-caption gap could not be checked like-for-like and is NOT claimed: no seeded task has subtasks, and there is no subtask seed primitive yet"
        status: deferred
    human_judgment: false
  - id: D8
    description: "Zero-one-many: a card with no subtasks renders its title alone"
    verification:
      - kind: browser
        ref: "A zero-subtask card rendered the title with no caption, agreeing with the detail view's identical suppression"
        status: pass
    human_judgment: false
  - id: D9
    description: "All gates green after the radius change, not before it"
    verification:
      - kind: test
        ref: "`pnpm test` 1503/1503 across 106 files, 0 skipped"
        status: pass
      - kind: build
        ref: "`pnpm build` exit 0; `pnpm lint` clean; `pnpm exec tsc --noEmit` exit 0"
        status: pass
      - kind: test
        ref: "`CI=1 pnpm exec playwright test --project visual` 300/300 after the baseline re-record. `CI=1` is mandatory — `ignoreSnapshots: !CI` makes an off-CI run a silent no-op"
        status: pass
    human_judgment: false
---

# Phase 04 Plan 12: Tracer Slice Summary

The tracer slice for the whole task workflow: one task moves between columns end to end, through
every layer this phase touches — layout composition root, tasks-feature card, optimistic hook, move
Server Action, upstream call, `refresh()`, RSC read. Plans 04-13 through 04-20 copy this shape
rather than inventing their own.

## Accomplishments

- **The move Server Action** (`move-task-action.ts`) — session check before parse, `userId` read only
  from the verified session record, `.safeParse` on a payload that is callable over the wire with
  anything, every URL segment written into `params.path` explicitly including the ancestors the
  generated type omits, and the tasks-less mutation-response shape on the parse (the full shape would
  fail on every successful call, since the move response carries no subtasks array).
- **The task card** — title in the 15px heading token, subtask caption in the muted 12px label token,
  and a 44x44 ghost icon-button handle pinned to the right edge and vertically centred. The handle is
  a SIBLING of the content button, never nested: it carries the activator ref and the listeners and no
  click handler of its own, while the content button stops pointer-event propagation.
- **The model/drag-model split** — `model.ts` type-only and server-safe, `task-drag-model.ts` holding
  every dnd-kit value import, following `column-drag-model.ts` from phase 03.
- **Multi-container drag wiring** — `BoardView` composes the two features by passing task nodes down
  into `SortableColumn` as a render prop, and the collision strategy branches on the active item's
  declared type so column drag is untouched rather than swapped.
- **The radius scale, re-derived** — an out-of-plan correction the checkpoint forced. See below.

## The One Checkpoint Failure, and Why It Was Not This Plan's Bug

Task 4's checkpoint passed on every point except the card's corner radius: 28px, against the mock's
7.4px. Fixing the card would have been the wrong fix.

Every radius token in `tokens/radius.tokens.json` had been converted with `600/96 = 6.25`. But the
mock is a **1440 CSS px wide** design, so a 600 DPI render needs `12000/1440 = 8.3333` — the entire
scale read 1.333x too large. Two of its three slots had also been spent on pills (the mock's buttons
are height/2), which is why no container radius existed at all.

Nothing looked broken because CSS clamps `border-radius` to half the box: a 48px-tall button with a
28px radius renders as a perfect pill *by accident*. Only a container is large enough for the error
to show, and a task card is the first container the project drew at that size.

Re-derived, calibrated independently on two mock pages (p1's Button Primary (L) is 400px tall against
a 48px design height; p4's task card is 2332px wide against a 280px design width — both give
8.3333):

| Token | Was | Now | Users |
|-------|-----|-----|-------|
| `sm`  | 4px | 4px (unchanged) | text field, dropdown trigger, checkbox |
| `md`  | 24px | 8px | cards, columns, modals, toasts, popups |
| `lg`  | 28px | retired | its only honest user was the pill |
| —     | —   | `rounded-full` | Button, IconButton, Hide Sidebar |

No new token was minted. The full write-up and measurement table live in
`.planning/todos/completed/2026-08-27-container-corner-radii-use-the-primary-button-pill-radius.md`.

**CLAUDE.md still documents the wrong 6.25 divisor.** That is a known open loose end, recorded here
so it is not lost.

## The Stranded Worktree

Task 3 was finished twice. The version that shipped came from executor worktree
`worktree-agent-ae6e78084fa8fe8f8`, which was local-only and one cleanup away from being
unrecoverable; the phase branch meanwhile held a narrower fix plus 5 MOBILE keyboard-reorder tests
marked `skip`.

Both scoped the column collision path to COLUMN droppables. Only the worktree's also **disabled** the
column-body and task-card droppables outside their own drag kind — and that is the half that matters,
because `sortableKeyboardCoordinates` walks the droppable registry directly rather than the collision
result. Scoping the collision function alone fixes the pointer path and leaves the keyboard path
broken, which presents as a mobile-only scroll bug. Adopting the worktree's version let the 5 skipped
cases be un-skipped; `board-view.test.tsx` is 126/126 with zero skips.

Merged as `b0b141f`, resolving 3 conflicts: took the worktree's `task-drag-model.ts` and its unit
test (the phase branch's was a strict subset), and hand-integrated `e2e/seed.sh` to keep the
worktree's `task` subcommand alongside the phase branch's `cleanup`/`reset-all` from quick task
260829-kyv.

## The Visual Baselines

The radius change invalidated baselines in `visual/__screenshots__/`, and
`.github/workflows/visual-baselines.yml` — the sanctioned regeneration path — is hard-gated to
`main` so it cannot be dispatched from a phase branch.

A compare-only diagnostic settled it. `CI=1 pnpm exec playwright test --project visual
--reporter=list`: **295 passed, 5 failed**, and all 5 were `components-ui-modal` light. Nothing the
radius change never touched differed — every button, switch, checkbox, input, badge and menu baseline
passed. That is direct evidence this box's renderer matches the `ubuntu-latest` runner's, which is
what made local recording safe rather than merely convenient.

Recorded with `-g "components-ui-modal" --update-snapshots=all`. **20** files changed, not 5: the
dark and desktop variants carried real corner diffs sitting under the per-pixel threshold, which
`--update-snapshots=changed` would have skipped, leaving stale PNGs committed. Full suite after:
300/300.

## Task-by-Task

| Task | Type | Outcome |
|------|------|---------|
| 1. Move Server Action + input schema | tracer, tdd | Done — `54dbb03` |
| 2. Task card, tasks-feature models, optimistic move hook | tracer, tdd | Done — `1e43a9c` |
| 3. Multi-container drag wiring, end-to-end proof | tracer, tdd | Done — recovered and merged as `b0b141f` after `6470c0c`/`eb1b80a` |
| 4. Checkpoint: verified in the running app and against the mock | checkpoint:human-verify, blocking | Passed with one failure, root-caused and fixed — `5f4e3b2`, `80f792b` |

## Deviations from Plan

### Beyond the plan's letter

- **The project-wide radius re-derivation** (`5f4e3b2`). Out of this plan's declared `files_modified`
  and out of its scope. It is here because the checkpoint is a blocking gate and the only way past it
  was a token correction; scoping the fix to the card would have shipped a knowingly wrong scale.
  Also annotates `03-UI-SPEC.md`'s now-superseded ghost-column deviation note in place.
- **20 visual baselines re-recorded** (`80f792b`). A direct consequence of the above.

### Not deviations

- `eslint.config.mjs` shows a diff in the branch range, but both changes belong to the interleaved
  quick task 260829-kyv, not to this plan.
- `.planning/config.json` is modified in the working tree (adds `review.default_reviewers`). It
  predates this plan and was deliberately left alone.

## Verification

| Gate | Result |
|------|--------|
| `pnpm test` | 1503/1503, 106 files, 0 skipped |
| `pnpm build` | exit 0 |
| `pnpm lint` | clean |
| `pnpm exec tsc --noEmit` | exit 0 |
| `CI=1 pnpm exec playwright test --project visual` | 300/300 |

All run **after** the radius change and the baseline re-record, not before.

## Checkpoint Verification Performed

Driven headless end to end through this project's own `mcp__playwright__*` server, per the plan's
instruction to prove it before handing anything to a human.

**Passed:** cross-column drag lands and persists across a reload; the move is optimistic (destination
showed the card ~100ms after mouse-up, before the network settled); exactly one request per completed
move and zero for a drop back at origin; a card-body click starts no drag; column reorder works by
pointer and by keyboard and survives a reload; zero-subtask cards render the title alone. Against the
mock: title 15px, inter-card gap 20px, padding 16/24.

**Failed, then fixed:** corner radius 28px vs the mock's 7.4px — see above.

**Not proven, and NOT claimed as verified:**

1. **The "body click opens the detail view" half of D-13.** The detail view is deliberately a later
   plan; `board-view.tsx` wires the seam to a documented no-op. Only the negative half (a body click
   starts no drag) is proven.
2. **The title-to-caption gap, like-for-like against the mock.** No seeded task has subtasks and
   there is no subtask seed primitive yet, so the caption could not be rendered at the mock's
   content.

Both are carried forward rather than closed.

## Handoff Notes

- **Plans 04-13 through 04-20 should copy this slice's shape**, not invent their own: schema ->
  action -> model / drag-model split -> hook -> card -> column -> board view.
- **`CLAUDE.md`'s mock DPI divisor is still wrong** (documents 600 DPI / 6.25; the real divisor is
  8.3333). Correcting it is an open loose end.
- **`e2e/seed.sh` now has a `task` subcommand** from the merge, alongside `cleanup`/`reset-all`. There
  is still no subtask seed primitive — that is what blocked checkpoint item 2 above.
- **Playwright's `dragTo` cannot start a dnd-kit drag.** Use `mouse.down()` -> ~25 interpolated
  `mouse.move()` steps -> `mouse.up()`. Every drag proof in this plan was driven that way.
- **Always prefix visual runs with `CI=1`.** `playwright.config.ts` sets
  `ignoreSnapshots: !process.env.CI`, so an off-CI run executes every spec, asserts nothing, and
  reports green.

## Self-Check: PASSED

Every gate re-run on the final tree. Two checkpoint items are explicitly deferred rather than
claimed.
