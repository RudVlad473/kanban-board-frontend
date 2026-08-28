---
phase: 04-task-subtask-workflow
plan: 10
subsystem: testing
tags: [vitest, storybook, server-actions, test-doubles, vite-plugin]

requires:
  - phase: 04-03
    provides: The `serverActionStubPlugin` transform and the `actionStub`/`queue`/`hold`/`settle`/`calls` recorder surface
  - phase: 04-04
    provides: BoardView's move into the layout ring, which is where the 60-block suite now lives
  - phase: 04-07
    provides: The transform wired into both Chromium Vitest projects and Storybook's dev server
  - phase: 04-08
    provides: The auth/theme group cut over, the barrel already deleted, the control-run technique and the assertion-count method
  - phase: 04-09
    provides: The four board actions cut over, and the large-suite rewrite pattern settled before this plan applied it
provides:
  - Zero hand-written Server Action doubles anywhere in the repository
  - Zero register entries — both Chromium projects back on a plain `resolve: { alias }`
  - The transform proven, by control run, to be the sole resolver for all four real column action modules
  - The phase-wide assertion-preservation total for success criterion 8
affects: [04-11]

actuals:
  tokens: 21400
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A cutover's alias removal must ride in the SAME commit as the rewrites it unblocks — the register shadows exactly the modules the rewritten files import, so no ordering of the two produces two green commits"
    - "Where the deleted double derived a success payload from the call (`{ id: columnId, version: version + 1 }`), the queued replacement states plain values plus one named constant, because no column hook reads a written column back — every one branches on `status` alone"
    - "The control run scales down to a single test file: no-op'ing `queue` in the registry and grepping the unqueued-call report for `*-action.ts#*` names every real module the suite resolves, without running the whole project"

key-files:
  created: []
  modified:
    - vitest.config.ts
    - src/components/layout/board-view/board-view.test.tsx
    - src/features/boards/components/sortable-column/sortable-column.test.tsx

key-decisions:
  - "The plan's Task 1/Task 2 split cannot produce a green Task 1 — `serverActionStubAlias` shadows exactly the four modules `board-view.test.tsx` imports, so `actionStub(createColumnAction)` throws while the register stands, and removing the register breaks `sortable-column.test.tsx` in the same instant. Both rewrites and the register removal landed as one atomic commit; the four module deletions landed as a second. 04-08 and 04-09 both hit and recorded the same cycle."
  - "No `Column` entity factory was introduced for the queued success payloads. 04-09 could reach for the existing `createBoard()` because one existed; `src/test-utils/factories/` has only `createColumnFull` (a different type, carrying `tasks`), and adding a `createColumn` for payloads nothing reads would be the shared default-outcome object D-02 rejects. Each success states its four fields inline."
  - "One named constant, `STUB_WRITTEN_COLUMN_ID`, replaces the create double's `STUB_CREATED_COLUMN_ID` in both files — the id is now something the test states rather than something a double invented, which is the plan's own wording, and it is deliberately not a factory."
  - "`docs/adr/tech/0020` and `docs/adr/tech/0025` still describe `serverActionStubAlias` and `src/test-utils/index.ts` as present. Both files belong to plan 04-11's `files_modified`; amending them here would have collided with the plan that owns them. Left as a handoff, not a deviation."

patterns-established:
  - "Measure `expect(` and all-`expect` separately: the bare-`expect(` grep misses the `expect.poll(` forms, and in `board-view.test.tsx` those carry 8 of the 139 assertions — including the whole column drag-order regression net"
  - "A `grep -c 'it('` over a suite this size can over-count; `board-view.test.tsx` reports 61 because one `.find(` line contains the substring. Anchor the pattern (`grep -cE '^\\s*it\\('`) before calling a count a measurement"

requirements-completed: [TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, SUBTASK-01, SUBTASK-02, SUBTASK-03, SUBTASK-04, SYNC-01]

coverage:
  - id: D1
    description: "The last four doubles, the whole register and the barrel are gone; one mechanism remains"
    verification:
      - kind: other
        ref: "ls src/test-utils/ | grep -c 'storybook-stub' -> 0; test ! -f src/test-utils/index.ts -> true (deleted in 04-08, commit 00e609f)"
        status: pass
      - kind: other
        ref: "grep -v '^\\s*[*/#]' vitest.config.ts | grep -c 'serverActionStubAlias' -> 0; both Chromium projects read `resolve: { alias }`"
        status: pass
    human_judgment: false
  - id: D2
    description: "The transform is the sole resolver for all four REAL column action modules"
    verification:
      - kind: other
        ref: "Control run (registry `queue` no-op'd, reverted; tree confirmed clean after): recorder named create-column-action.ts#createColumnAction, delete-column-action.ts#deleteColumnAction, rename-column-action.ts#renameColumnAction, reorder-column-action.ts#reorderColumnAction"
        status: pass
    human_judgment: false
  - id: D3
    description: "No assertion was lost buying the cutover, in either file"
    verification:
      - kind: other
        ref: "Per-file before/after vs 29b51c8 — board-view 60/131/139 -> 60/131/139; sortable-column 11/14/17 -> 11/14/17"
        status: pass
      - kind: other
        ref: "grep -c 'it.skip|it.only|describe.only' in both files -> 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "The column-drag regression net survives intact — keyboard/pointer reorder blocks and the one-request-per-completed-move assertions"
    verification:
      - kind: other
        ref: "`expect(reorderColumnStub.calls).toHaveLength(1)` retained in all four completed-move blocks; `.calls[0].targetPosition` retained at 3, 1 and 4; the scroll-invariant block still measures all four steps"
        status: pass
      - kind: other
        ref: "pnpm exec vitest run --project browser board-view.test.tsx -> 120 passed (60 blocks x 2 devices)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The whole browser project, the storybook project, both builds and the full gate are green with no double and no register"
    verification:
      - kind: other
        ref: "pnpm test -> 100 files / 1424 tests passed, byte-identical to 04-08's and 04-09's baseline; pnpm test:browser -> 35 files / 864 tests; pnpm exec vitest run --project storybook -> 32 files / 203 tests"
        status: pass
      - kind: other
        ref: "pnpm build and pnpm build-storybook exit 0; grep -rl registerActionStub .next/ and storybook-static/ -> no matches"
        status: pass
      - kind: other
        ref: "CI run 33204400991 on 53cc19a — quality, secrets, visual, e2e all success"
        status: pass
    human_judgment: false
  - id: D6
    description: "No Vitest screenshot and no Playwright visual baseline was re-recorded"
    verification:
      - kind: other
        ref: "CI=1 pnpm test:visual -> 300 passed; git status --porcelain after the run -> empty"
        status: pass
    human_judgment: false

duration: 35 min
completed: 2026-08-28
status: complete
---

# Phase 04 Plan 10: Column Action Stub Cutover Summary

**The last four hand-written Server Action doubles and the whole `serverActionStubAlias` register are deleted, so every Server Action in the repository is doubled by one generic transform — proven by a control run naming all four real column modules, with all 156 assertions across the two largest suites in the phase preserved exactly and CI green on every job.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-08-28T19:09:00Z
- **Completed:** 2026-08-28T19:44:00Z
- **Tasks:** 3 of 3 (all auto)
- **Files modified:** 7 (3 modified, 4 deleted)

## Accomplishments

- **`board-view.test.tsx` rewritten across all 60 blocks** — the largest single rewrite in the phase. Every action is reached through `actionStub(<realAction>)`, no module-key string is spelled anywhere, and every per-file reset is gone in favour of D-04's global `afterEach`.
- **`sortable-column.test.tsx` rewritten across all 11 blocks**, its `beforeEach` removed entirely (its only statement was the reset), taking `beforeEach` out of the `vitest` import.
- **The register deleted outright.** `serverActionStubAlias`, its prefix-matching comment and both spreads are gone; the `browser` and `storybook` projects are back on the plain `alias` list `tokens` and `unit` already used.
- **Four modules deleted** — 341 lines of copy-pasted queue/hold/settle/reset skeleton, closing the count at twelve doubles removed across the three cutover plans.
- **21 outcomes queued that a double used to supply implicitly.** Every one of them was an unqueued call before; D-02 holds to the end, and no success factory was introduced in the group where the plan predicted the temptation would be largest.

## Assertion Strength: Before vs After

Counted with the same command on both sides — `git show 29b51c8:<path>` against the working file.

| File                       | `it(` before → after | `expect(` before → after | all `expect` before → after | lines before → after |
| -------------------------- | -------------------- | ------------------------ | --------------------------- | -------------------- |
| `board-view.test.tsx`      | 60 → 60              | 131 → 131                | 139 → 139                   | 1334 → 1401          |
| `sortable-column.test.tsx` | 11 → 11              | 14 → 14                  | 17 → 17                     | 253 → 268            |

No count fell. Neither file gained a skip or an only (`it.skip`/`it.only`/`describe.only` → **0** in both). The 82 added lines are entirely queued outcomes — the cost D-02 accepted.

## Phase-Wide Cutover Total (success criterion 8)

| Plan       | Files rewritten | Doubles deleted | Register entries removed | `it(` before → after | `expect(` before → after | all `expect` before → after |
| ---------- | --------------- | --------------- | ------------------------ | -------------------- | ------------------------ | --------------------------- |
| 04-08      | 4               | 4               | 4 (12 → 8)               | 37 → 37              | 53 → 53                  | 74 → 74                     |
| 04-09      | 2               | 4               | 4 (8 → 4)                | 40 → 40              | 99 → 99                  | 101 → 101                   |
| 04-10      | 2               | 4               | 4 (4 → 0)                | 71 → 71              | 145 → 145                | 156 → 156                   |
| **Total**  | **8**           | **12**          | **12 (12 → 0)**          | **148 → 148**        | **297 → 297**            | **331 → 331**               |

Zero doubles, zero register entries, zero assertions lost. The whole `browser` project is green with neither mechanism present, which is success criterion 8's mechanical half.

**The plan's Task 3 says "four test files rewritten"; the true figure is eight.** 04-08 rewrote four files (`sign-in-form`, `sign-up-form`, `sign-out-button`, `theme-toggle`), 04-09 two and 04-10 two. The plan appears to have carried 04-09's file count forward. Reported as measured rather than as written.

## Control Run: Which Module Does the Import Actually Resolve To

With the register gone, the claim that needs evidence is that the transform — not a leftover alias, not a stale `node_modules/.vite` entry — is what serves these four imports. `queue` was temporarily no-op'd in `action-stub-registry.ts` so every call became an unqueued one, and `board-view.test.tsx` was run alone:

```
src/features/boards/actions/create-column-action.ts#createColumnAction
src/features/boards/actions/delete-column-action.ts#deleteColumnAction
src/features/boards/actions/rename-column-action.ts#renameColumnAction
src/features/boards/actions/reorder-column-action.ts#reorderColumnAction
```

All four are REAL module paths under `src/features/boards/actions/`, not `src/test-utils/` paths. The patch was reverted with `git checkout --` and `git status --porcelain` confirmed empty afterwards. `node_modules/.vite` was cleared before every trusted run in both tasks (T-04-26).

## Task-by-Task

| Task | What landed                                                                     | Commit    |
| ---- | ------------------------------------------------------------------------------- | --------- |
| 1    | Both suites rewritten onto the recorder; `serverActionStubAlias` deleted          | `7f84e8b` |
| 2    | The four `*-column-action-storybook-stub.ts` modules deleted                      | `53cc19a` |
| 3    | Measurement, full gate, push, CI — no source change of its own                    | (docs)    |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's task split cannot produce a green Task 1**

- **Found during:** Task 1, before the first edit
- **Issue:** Task 1's acceptance criterion requires `vitest run --project browser board-view.test.tsx` to exit 0, but `serverActionStubAlias` shadows all four modules that file imports. While the register stands, `actionStub(createColumnAction)` receives the hand-written double and throws at module load. Removing the register — Task 2's work — breaks `sortable-column.test.tsx`, which still used the reorder double.
- **Fix:** The `sortable-column.test.tsx` rewrite and the register removal moved into Task 1's commit, leaving Task 2 as the four module deletions alone. End state is identical to the plan's; both commits are green.
- **Files modified:** `vitest.config.ts`, both test files
- **Commit:** `7f84e8b`

**2. [No-op] `src/test-utils/index.ts` was already deleted**

- **Found during:** Task 2
- **Issue:** The plan asks for the barrel's deletion and for its zero-importer claim to be confirmed independently. It no longer exists — 04-08 removed it in commit `00e609f`.
- **Verification performed anyway:** `git log --all -- src/test-utils/index.ts` shows creation in `a5b857e` (02.2-04) and deletion in `00e609f` (04-08); `grep -rn 'from "@/test-utils"' src app e2e visual scripts tokens .storybook` returns nothing today. The barrel was never load-bearing for the column group.

### Deferred (not this plan's files)

`docs/adr/tech/0020-no-mocking-policy.md` still documents `serverActionStubAlias` as the live mechanism, names four auth/theme specifiers as its register, and describes `src/test-utils/index.ts` as a present re-export barrel. `docs/adr/tech/0025-direct-composed-story-rendering.md` states "the whole-module `serverActionStubAlias` in `vitest.config.ts` therefore stays". All three claims are now false. **Both files are in plan 04-11's `files_modified`**, so amending them here would have collided with the plan that owns them.

## Verification

| Check                                    | Result                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm test`                              | 100 files / 1424 tests passed — identical to 04-08's and 04-09's baseline |
| `pnpm test:browser` (register absent)    | 35 files / 864 tests passed                                             |
| `pnpm exec vitest run --project storybook` | 32 files / 203 tests passed                                            |
| `pnpm exec tsc --noEmit`                 | exit 0 — nothing still imports a deleted module                          |
| `pnpm lint`                              | exit 0                                                                  |
| `pnpm format:check`                      | exit 0                                                                  |
| `pnpm renders:check`                     | passed                                                                  |
| `pnpm stories:check`                     | passed                                                                  |
| `pnpm coverage:check`                    | passed (108 source files scanned)                                       |
| `pnpm actions:check`                     | passed (12 Server Actions)                                              |
| `pnpm comments:check`                    | passed                                                                  |
| `pnpm folders:check`                     | passed                                                                  |
| `pnpm tsx:check`                         | passed                                                                  |
| `pnpm routes:check`                      | passed                                                                  |
| `pnpm handlers:check`                    | passed                                                                  |
| `pnpm build`                             | exit 0; `grep -rl registerActionStub .next/` → no matches               |
| `pnpm build-storybook`                   | exit 0; `grep -rl registerActionStub storybook-static/` → no matches    |
| `CI=1 pnpm test:visual`                  | 300 passed, no baseline churn (`git status --porcelain` empty)          |

### CI

Run **33204400991** on `53cc19a`, blocked on with `gh run watch --exit-status`:

| Job     | Conclusion |
| ------- | ---------- |
| quality | success    |
| secrets | success    |
| visual  | success    |
| e2e     | success    |

The `CI=1` prefix on the local visual run is what makes it meaningful — `playwright.config.ts` sets `ignoreSnapshots: !process.env.CI`, so an unprefixed run compares nothing (ADR tech/0008).

## Handoff Notes

- **The remote branch `worktree-agent-a892b8b74c6a7edfa` was pushed** so CI could run on the exact SHA the orchestrator merges. Delete it after the wave merge — the run's results persist independently of the ref.
- **04-11 owns the documentation debt.** Both ADRs and `CONVENTIONS.md` describe a register and a barrel that no longer exist. The register's "Unwind trigger" section in `tech/0020` has now fired in full, which is a stronger amendment than a wording fix.
- **A new Server Action needs no file and no config entry.** Adding one under `src/features/<domain>/actions/` with a `"use server"` directive is sufficient for both Chromium projects to double it.
