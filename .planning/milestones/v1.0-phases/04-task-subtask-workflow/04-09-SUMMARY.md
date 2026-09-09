---
phase: 04-task-subtask-workflow
plan: 09
subsystem: testing
tags: [vitest, storybook, server-actions, test-doubles, vite-plugin]

requires:
  - phase: 04-03
    provides: The `serverActionStubPlugin` transform and the `actionStub`/`queue`/`hold`/`settle`/`calls` recorder surface
  - phase: 04-07
    provides: The transform wired into both Chromium Vitest projects and Storybook's dev server
  - phase: 04-08
    provides: The auth/theme group already cut over, the control-run technique, and the assertion-count method
provides:
  - The four board actions resolving through the transform, with their hand-written doubles deleted
  - A register shrunk from eight entries to four, all of them column actions
  - Proof by two control runs that the transform serves all four REAL board action module ids
  - The rewrite pattern for a large suite settled before 04-10 applies it to the 1,334-line column files
affects: [04-10, 04-11]

actuals:
  tokens: 9423
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Module-scope stub bindings (`const renameBoardStub = actionStub(renameBoardAction)`) rather than a per-call-site `actionStub(...)` lookup, once a file drives four actions across 36 blocks"
    - "The domain fixture factory (`createBoard`) builds the entity inside an inline success outcome, so each queue stays explicit about status while the payload stays honest about which board the server returned"
    - "Two narrow control runs instead of one: an action whose failure short-circuits a later action in the same hook can never surface that later module's id in a single all-unqueued run"

key-files:
  created: []
  modified:
    - vitest.config.ts
    - src/features/boards/components/board-list/board-list.test.tsx
    - src/features/boards/components/rename-override-provider/rename-override-provider.test.tsx

key-decisions:
  - "The plan's Task 1/Task 2 split cannot produce two green commits — while the four alias entries stand, `actionStub(createBoardAction)` resolves to the hand-written double and throws at module load. The board group's four doubles, four register entries and two consuming test files form one dependency cycle, so the cutover landed as a single atomic commit (04-08's Task 1 did the same)."
  - "`createBoard()` from the existing `@/test-utils/factories/board` builds the `Board` inside each inline success outcome. It is the D-11 fixture-entity factory for the domain type, not a per-action success factory, so D-02's rejection of a success-factory map is untouched — every outcome's `status` and distinguishing fields are still spelled at the call site."
  - "The retry-narrowing test queues its third column outcome at the third Retry click rather than up front with the other two, keeping each queued outcome adjacent to the call it answers."

patterns-established:
  - "When one action's outcome gates whether a second action is called at all, a single all-unqueued control run proves only the first — run a second control that strips only the second action's queues"
  - "A CI job that fails on a shared external backend is re-run alone on the identical SHA before it is called a regression; a green re-run with no code change is the evidence"

requirements-completed: [TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, SUBTASK-01, SUBTASK-02, SUBTASK-03, SUBTASK-04, SYNC-01]

coverage:
  - id: D1
    description: "The four board-action doubles and their four register entries are deleted; the register holds exactly four entries, all column actions"
    verification:
      - kind: other
        ref: "ls src/test-utils/ | grep -c -e create-board -e rename-board -e delete-board -> 0"
        status: pass
      - kind: other
        ref: "sed -n '/^const serverActionStubAlias = \\[/,/^\\];/p' vitest.config.ts | grep -c 'find:' -> 4, all four @/features/boards/actions/*-column-action"
        status: pass
    human_judgment: false
  - id: D2
    description: "The transform now serves all four REAL board action modules — the cutover changed which module each component's import actually resolves to"
    verification:
      - kind: other
        ref: "Control run A (registry `queue` no-op'd, reverted): recorder named create-board-action.ts#createBoardAction, rename-board-action.ts#renameBoardAction, delete-board-action.ts#deleteBoardAction (50 failed / 30 passed of 80)"
        status: pass
      - kind: other
        ref: "Control run B (only the five createBoardColumnsStub.queue lines stripped, restored): recorder named create-board-columns-action.ts#createBoardColumnsAction"
        status: pass
    human_judgment: false
  - id: D3
    description: "No assertion was lost buying the cutover — every it() block and every expect survived at the same strength in both rewritten files"
    verification:
      - kind: other
        ref: "Per-file before/after vs e9a659c9 — board-list 36/88/89 -> 36/88/89; rename-override-provider 4/11/12 -> 4/11/12"
        status: pass
      - kind: other
        ref: "grep -c 'it.skip|it.only|describe.only|describe.skip' in both files -> 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both files still render composed stories directly as JSX, and the column group is untouched"
    verification:
      - kind: other
        ref: "pnpm renders:check passed; git diff HEAD -- board-view / sortable-column paths -> 0 lines"
        status: pass
    human_judgment: false
  - id: D5
    description: "The whole suite, every check script and the production build are unaffected, and no recorder reaches the build output"
    verification:
      - kind: other
        ref: "pnpm test -> 100 files / 1424 tests passed, byte-identical to 04-08's baseline; pnpm build exit 0; grep -rl registerActionStub .next/ -> no matches"
        status: pass
      - kind: other
        ref: "CI run 33186693274 on c7bb1c5 — secrets, quality, visual, e2e all success"
        status: pass
    human_judgment: false

duration: 28 min
completed: 2026-08-28
status: complete
---

# Phase 04 Plan 09: Board Action Stub Cutover Summary

**The four board Server Action doubles are deleted and their register entries removed, so board create, initial-column fan-out, rename and delete now resolve through `serverActionStubPlugin`'s generic recorder — proven by two control runs naming all four real module ids, with all 99 assertions across the two rewritten suites preserved exactly.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-08-28T15:30:00Z
- **Completed:** 2026-08-28T15:58:00Z
- **Tasks:** 3 of 3 (all auto)
- **Files modified:** 7 (3 modified, 4 deleted)

## Accomplishments

- **Register shrunk eight entries to four.** Only the four `*-column-action` entries and the prefix-matching comment remain; 04-10 unwinds those.
- **Four modules deleted** — `create-board-`, `create-board-columns-`, `rename-board-` and `delete-board-action-storybook-stub.ts`, 238 lines of copy-pasted queue/hold/settle/reset skeleton.
- **`board-list.test.tsx` rewritten across all 36 blocks**, and `rename-override-provider.test.tsx` across all 4. Every action is reached through `actionStub(<realAction>)`; no module-key string is spelled in either file; every per-file reset call is gone in favour of D-04's global `afterEach`.
- **Every outcome queued explicitly (D-02).** 22 queue sites replaced what the deleted modules invented implicitly, including three separate column outcomes in the retry-narrowing test, each queued beside the click it answers.
- **The transform proven to serve real consumers, twice.** A single all-unqueued control could only reach three of the four actions; a second, narrower control was needed for the fourth (see below).

## Task Commits

1. **Tasks 1 + 2 (merged — see Deviations): cut the four board actions over** — `c7bb1c5` (refactor)
2. **Task 3: measure assertion strength, run the full gate, push** — no commit; the gate produced no fix to make (`pnpm lint`, `comments:check` and every other check passed unchanged).

## Files Created/Modified

- `vitest.config.ts` — four board entries removed (8 → 4); the carve-out comment now names which plan unwinds which group
- `src/test-utils/create-board-action-storybook-stub.ts`, `create-board-columns-…`, `rename-board-…`, `delete-board-…` — **Deleted**; the transform replaces them
- `src/features/boards/components/board-list/board-list.test.tsx` — four real action imports plus four module-scope `actionStub` bindings; 22 queue sites; `hold`/`settle` through the recorder; the four exported call-log arrays replaced by `<stub>.calls`; the four reset calls deleted
- `src/features/boards/components/rename-override-provider/rename-override-provider.test.tsx` — same shape for rename alone; its `beforeEach` existed only to reset and was removed entirely, taking `beforeEach` out of the `vitest` import

## Assertion Strength: Before vs After

Counted with the same command on both sides — `git show e9a659c9:<path>` against the working file.

| File                                | `it(` before → after | `expect(` before → after | all `expect` before → after | lines before → after |
| ----------------------------------- | -------------------- | ------------------------ | --------------------------- | -------------------- |
| `board-list.test.tsx`               | 36 → 36              | 88 → 88                  | 89 → 89                     | 763 → 781            |
| `rename-override-provider.test.tsx` | 4 → 4                | 11 → 11                  | 12 → 12                     | 131 → 137            |

No count fell. `expect(` and all-`expect` are counted separately for the same reason 04-08 gave: the bare-`expect(` grep misses `expect.poll(`/`expect.element(` forms. Neither file gained a skip or an only (`it.skip`/`it.only`/`describe.skip`/`describe.only` → **0** in both).

The line growth is entirely queued outcomes: what the deleted modules produced implicitly now appears at the call site, which is exactly the cost D-02 accepted.

## Control Runs: Which Module Does the Import Actually Resolve To

Reasoning from the config would only show that the entries are gone. Two control runs were needed, and the second is the interesting one.

**Control A** — the registry's `queue` temporarily made a no-op, so every call is unqueued. Both files run; the recorder reported:

```
- src/features/boards/actions/create-board-action.ts#createBoardAction
- src/features/boards/actions/rename-board-action.ts#renameBoardAction
- src/features/boards/actions/delete-board-action.ts#deleteBoardAction
```

50 failed / 30 passed of 80. Three of four — `createBoardColumnsAction` never appeared, because with `createBoardAction` resolving `undefined`, `use-create-board.ts` returns at its `result.status !== SUCCESS` guard and the column phase is never reached. A single all-unqueued control run **cannot** identify an action that only runs after another action succeeds.

**Control B** — registry restored, and only the five `createBoardColumnsStub.queue(...)` lines stripped from `board-list.test.tsx`. The recorder then reported:

```
- src/features/boards/actions/create-board-columns-action.ts#createBoardColumnsAction
```

Both controls were reverted (`git checkout --` for the registry; the five stripped lines re-inserted verbatim and re-verified green) and nothing from either was committed.

## Decisions Made

- **One atomic cutover commit, not the plan's two.** The four doubles, four register entries and two test files are one dependency cycle; no smaller step is green. Recorded as a deviation below.
- **`createBoard()` builds the entity inside each inline outcome.** It is the existing D-11 fixture factory for `Board`, not a per-action success factory: the `status` and every distinguishing field is still written at the call site, so D-02's rejection of a success-factory map holds.
- **Module-scope stub bindings, not per-call-site lookups.** 04-08's files each drove one action across ≤15 blocks and used `actionStub(x).queue(...)` inline. `board-list.test.tsx` drives four across 36, and the plan asked for bindings; four `const …Stub = actionStub(…)` lines read better than 27 repeated lookups.
- **`rename-override-provider.test.tsx` lost its `beforeEach` entirely.** Its only statement was the reset D-04 forbids; an empty hook would have been dead weight.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] The plan's Task 1/Task 2 split has no green intermediate state**

- **Found during:** Task 1
- **Issue:** Task 1 rewrites `board-list.test.tsx` onto the recorder and verifies it with a scoped `vitest run`, while Task 2 removes the four register entries. In that order the verification cannot pass: with the alias entries still standing, `@/features/boards/actions/create-board-action` resolves to the hand-written double, which carries no registry controls, so the module-scope `actionStub(createBoardAction)` throws at import. The reverse order fails too — removing the entries first breaks the two files that still import the doubles' helpers.
- **Fix:** Landed Tasks 1 and 2 as one atomic commit (`c7bb1c5`): both test rewrites, the four register entries, and the four deletions. This is the same shape 04-08's Task 1 took for the auth/theme group.
- **Files modified:** the plan's full `files_modified` list, in one commit
- **Verification:** Both tasks' acceptance criteria were run against that commit and all pass — scoped `vitest run` on each file, `actionStub` count ≥ 4 (5 in `board-list`), zero module-key strings, zero per-file resets, `it(` = 36 and 4, zero skip/only, register at exactly 4 column entries, zero remaining board doubles, and an empty diff across the column group's paths.
- **Committed in:** `c7bb1c5`

**2. [Rule 1 - Bug] A single all-unqueued control run under-reports which modules resolved**

- **Found during:** Task 2's proof step
- **Issue:** Following 04-08's control-run technique literally named only three of the four board actions. `createBoardColumnsAction` runs only after `createBoardAction` returns `SUCCESS`, and an unqueued `createBoardAction` resolves `undefined`, so the column phase never executes and the module is never identified. Reporting three of four as "proof" would have left the fourth unproven while looking complete.
- **Fix:** Added Control B, stripping only the column queues with the registry intact.
- **Files modified:** none (both controls reverted, nothing committed)
- **Verification:** Control B named `create-board-columns-action.ts#createBoardColumnsAction`; the restored file re-ran green (72/72 for `board-list` alone, 864/864 for the whole `browser` project)
- **Committed in:** n/a — proof only

---

**Total deviations:** 2 auto-fixed (1 × Rule 1, 1 × Rule 3)
**Impact on plan:** No scope creep and no change to what shipped. One is a task-boundary correction forced by the alias's own semantics; the other strengthened the proof the plan asked for. No assertion was touched by either.

## Issues Encountered

**CI's `e2e` job failed once, then passed on re-run of the identical commit.** Run `33186693274` on `c7bb1c5` first reported `e2e` red — one case, `columns-reorder.e2e.spec.ts:164 › writes nothing when a lifted column is moved and then cancelled`, timing out on the live-region text `Alpha moved to position 2 of 4.` (42 passed, 1 failed). This was checked rather than assumed:

- This plan's whole diff is two Vitest test files, four deleted Vitest doubles and `vitest.config.ts`. None is in the Next.js build graph; `grep` finds no reference to `storybook-stub` or `serverActionStubAlias` in `e2e/`, `next.config.ts` or `playwright.config.ts`.
- The failing case is keyboard drag-and-drop reordering — the column group, which this plan does not touch (its diff across those paths is empty).
- `gh run rerun --failed` on the same SHA with no code change turned the job green.

The job's own history supports the flake reading: run `33177930760` on this phase branch failed two different `toHaveURL` cases and later runs on the same code were green. This is the e2e suite's known contention against the shared deployed nonprod backend, not a regression from this plan.

**No Vitest test-runner starvation was observed.** Every Vitest run in this plan was green on its first attempt (`board-list` alone 72/72, `rename-override-provider` alone 8/8, `pnpm test:browser` 864/864, `--project storybook` 203/203, `pnpm test` 1424/1424), so CONVENTIONS.md's starved-tester rule never needed applying and no failure was attributed to contention.

## Verification Results

| Check                                     | Result                                                          |
| ----------------------------------------- | --------------------------------------------------------------- |
| `vitest run --project browser board-list` | 1 file / 72 tests passed                                          |
| `vitest run --project browser rename-…`   | 1 file / 8 tests passed                                           |
| `pnpm test:browser`                       | 35 files / 864 tests passed                                       |
| `pnpm exec vitest run --project storybook`| 32 files / 203 tests passed                                       |
| `pnpm test` (all five projects)           | 100 files / 1424 tests passed                                     |
| `pnpm lint`                               | exit 0                                                            |
| `pnpm exec tsc --noEmit`                  | exit 0                                                            |
| `pnpm renders:check`                      | passed — every non-exempt `*.test.tsx` renders composed stories only |
| `pnpm stories:check`                      | passed — no story declares a play function                        |
| `pnpm coverage:check`                     | passed — 108 source files scanned                                 |
| `pnpm actions:check`                      | passed — 12 Server Actions match the naming rule                  |
| `pnpm comments:check`                     | passed — no comment block exceeds 3 prose lines                   |
| `pnpm folders:check`                      | passed                                                            |
| `pnpm build`                              | exit 0; `grep -rl registerActionStub .next/` → no matches         |

**CI run 33186693274** on `c7bb1c5`, blocked on with `gh run watch --exit-status`:

| Job     | Conclusion                                     |
| ------- | ---------------------------------------------- |
| secrets | success                                        |
| quality | success                                        |
| visual  | success                                        |
| e2e     | success (after re-run of the same SHA — above) |

## Known Stubs

None. This plan deletes test doubles rather than adding them, and no assertion was weakened, skipped, or reduced to a bare render.

## Next Phase Readiness

Wave 5 (plan 04-10, the column group) is unblocked, and the rewrite pattern is now settled on the cheaper file set exactly as this plan intended. Four notes for that executor:

- The four remaining register entries are all `@/features/boards/actions/*-column-action`, and the prefix-matching comment above them is still true and still load-bearing.
- `src/test-utils/index.ts` was already deleted in 04-08; 04-10 should confirm absence, not re-attempt it.
- The task split will hit the same blocker recorded above — the column doubles, their entries and the consuming test files are one cycle, so plan for a single atomic cutover commit.
- `board-view.test.tsx` drives several column actions through one hook chain. Expect the same control-run shortfall found here, and plan a second narrow control for any action gated behind another action's success.

**Not done here (orchestrator-owned):** `STATE.md`, `ROADMAP.md` and `REQUIREMENTS.md` were deliberately left untouched per the dispatch instructions, so the `requirements-completed` IDs above still need marking centrally. Those IDs are shared across every plan in this phase, so the shared-ID gate would in any case block them until the last declaring plan finishes.

---

_Phase: 04-task-subtask-workflow_
_Completed: 2026-08-28_

## Self-Check: PASSED

- Deleted modules confirmed absent on disk: all four `*-board*-action-storybook-stub.ts`.
- Modified files confirmed present on disk: `vitest.config.ts`, `board-list.test.tsx`, `rename-override-provider.test.tsx`.
- Task commit confirmed in `git log`: `c7bb1c5`. The SUMMARY commit is the one carrying this file.
- Every acceptance criterion from Tasks 1, 2 and 3 re-run against `c7bb1c5`; all pass.
