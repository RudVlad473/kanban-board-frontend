---
phase: 04-task-subtask-workflow
plan: 08
subsystem: testing
tags: [vitest, storybook, server-actions, test-doubles, vite-plugin]

requires:
  - phase: 04-03
    provides: The `serverActionStubPlugin` transform and the `actionStub`/`queue`/`hold`/`settle`/`calls` recorder surface
  - phase: 04-07
    provides: The transform wired into both Chromium Vitest projects and Storybook's dev server, with the alias register still shadowing it
provides:
  - The first group cut over through D-01's one-way door — the four auth/theme actions now resolve through the transform, not a hand-written double
  - A register shrunk from twelve entries to eight, leaving only the board and column groups
  - Proof by control run that the transform serves REAL action module ids, not just fixtures
  - The deletion of `src/test-utils/index.ts`, which plan 04-10 had been scheduled to remove
affects: [04-09, 04-10, 04-11]

actuals:
  tokens: 4443
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Inverse control proof: with the alias entry already removed, delete the `queue()` call and confirm the recorder names the REAL module id — proving which module the import chain actually resolved to"
    - "Queue-at-the-call-site as the replacement for a per-action double's implicit success (D-02), including one queued outcome per call when a test clicks twice"

key-files:
  created: []
  modified:
    - vitest.config.ts
    - src/features/auth/components/sign-in-form/sign-in-form.test.tsx
    - src/features/auth/components/sign-up-form/sign-up-form.test.tsx
    - src/features/auth/components/sign-out-button/sign-out-button.test.tsx
    - src/features/auth/components/sign-out-button/sign-out-button.stories.tsx
    - src/features/theme/components/theme-toggle/theme-toggle.test.tsx
    - src/features/theme/components/theme-toggle/theme-toggle.stories.tsx

key-decisions:
  - "`src/test-utils/index.ts` was DELETED, not emptied — its entire content was the four re-exports of the deleted doubles, so trimming it would have left a comment-only file that TypeScript treats as a script rather than a module. This takes over a deliverable plan 04-10 had scheduled."
  - "sign-out's `signOutActionCallCount()`/`resetSignOutActionCallCount()` were replaced by `actionStub(signOutAction).calls.length` plus the central `resetAllActionStubs()`, rather than reproducing an exported counter on the recorder — the recorder already logs calls, and a per-action counter is the per-action register D-02 rejects"
  - "The `theme-toggle` double-click test queues TWO outcomes explicitly (DARK then LIGHT) rather than queuing once and relying on a residual value — the recorder shifts one outcome per call, so a single queue would have left the second call unqueued"

patterns-established:
  - "Prove which module an import chain resolved to by removing the queued outcome and reading the module id the recorder reports — a positive identification, not an inference from config"
  - "A cutover's assertion strength is reported as before/after counts computed with the SAME command on both sides (`git show <base>:<path>` vs the working file), so 'assertions preserved' is a measurement"

requirements-completed: [TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, SUBTASK-01, SUBTASK-02, SUBTASK-03, SUBTASK-04, SYNC-01]

coverage:
  - id: D1
    description: "The four auth/theme doubles and their four register entries are deleted; the register holds exactly the eight board/column entries"
    verification:
      - kind: other
        ref: "ls src/test-utils/ | grep -c -e sign-in-action -e sign-up-action -e sign-out-action -e update-theme-action -> 0"
        status: pass
      - kind: other
        ref: "sed -n '/^const serverActionStubAlias = \\[/,/^\\];/p' vitest.config.ts | grep -c 'find:' -> 8, all eight @/features/boards/actions/*"
        status: pass
    human_judgment: false
  - id: D2
    description: "The transform now serves the four REAL auth/theme action modules — the cutover changed which module the component's import actually resolves to"
    verification:
      - kind: other
        ref: "Control run (uncommitted, reverted): all queue() calls stripped -> recorder reported src/features/auth/actions/sign-in-action.ts#signInAction, sign-up-action.ts#signUpAction, sign-out-action.ts#signOutAction, src/features/theme/actions/update-theme-action.ts#updateThemeAction (14 failed / 68 passed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "No assertion was lost buying the cutover — every it() block and every expect survived at the same strength"
    verification:
      - kind: other
        ref: "Per-file before/after counts vs 707e906 — sign-in 10/17, sign-up 15/25, sign-out 3/2, theme-toggle 9/9; all four unchanged on it(, expect( and expect-all"
        status: pass
      - kind: other
        ref: "grep -rE 'it\\.skip|it\\.only|describe\\.skip|describe\\.only' src/features/auth src/features/theme -> 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "The whole suite and the production build are unaffected; the remaining eight register entries still shadow the transform"
    verification:
      - kind: other
        ref: "pnpm test -> 100 files / 1424 tests passed, byte-identical to 04-07's baseline; pnpm build -> exit 0"
        status: pass
      - kind: other
        ref: "CI run 33182583129 on adaf62a — secrets, quality, visual, e2e all success"
        status: pass
    human_judgment: false
  - id: D5
    description: "Threat T-04-07: the transform reaches the Vitest/Storybook configs only — production loads the real auth actions"
    verification:
      - kind: other
        ref: "serverActionStubPlugin referenced only by vitest.config.ts, .storybook/main.ts, and its own script/test — absent from next.config; grep -rl registerActionStub .next/ -> no matches after pnpm build"
        status: pass
    human_judgment: false

duration: 21 min
completed: 2026-08-28
status: complete
---

# Phase 04 Plan 08: Auth/Theme Stub Cutover Summary

**The four auth and theme Server Action doubles are deleted and their register entries removed, so those actions now resolve through `serverActionStubPlugin`'s generic recorder — proven by a control run naming the real module ids, with all 61 assertions across the four affected test files preserved exactly.**

## Performance

- **Duration:** 21 min (includes the blocking-human decision checkpoint)
- **Started:** 2026-08-28T14:43:00Z
- **Completed:** 2026-08-28T15:04:04Z
- **Tasks:** 3 of 3 (1 decision checkpoint, 2 auto)
- **Files modified:** 12 (7 modified, 5 deleted)

## Accomplishments

- **Register shrunk twelve entries to eight.** The four auth/theme entries are gone; the eight board/column entries and the prefix-matching comment are untouched, so the alias still shadows the transform for that group.
- **Five modules deleted:** the four `*-action-storybook-stub.ts` doubles plus `src/test-utils/index.ts`, the barrel whose only content was their re-exports.
- **The transform proven to serve real consumers.** With all `queue()` calls stripped, the recorder reported the four real action module ids — positive identification that the import chain now lands on the recorder rather than on a deleted double or the real `node:crypto` module.
- **Assertion strength measured, not asserted.** Per-file `it(`/`expect(` counts are identical to the pre-cutover versions; the full suite still reports 100 files / 1424 tests, byte-identical to 04-07's baseline.

## Task Commits

1. **Task 1: Delete the four auth and theme doubles and their register entries** - `00e609f` (refactor)
2. **Task 2: Prove the cutover preserved assertion strength, then push** - `adaf62a` (style; the proof itself is measurement, and produced only the comment-length fix below)

## Files Created/Modified

- `vitest.config.ts` - Four register entries removed (12 -> 8); the carve-out comment now records that the plugin serves the auth/theme four
- `src/test-utils/sign-in-action-storybook-stub.ts`, `sign-up-…`, `sign-out-…`, `update-theme-…` - **Deleted**; the transform replaces them
- `src/test-utils/index.ts` - **Deleted**; a four-line barrel over the four deleted modules, with no remaining content
- `src/features/auth/components/sign-in-form/sign-in-form.test.tsx` - Imports the real `signInAction`; the valid-submit test queues its outcome
- `src/features/auth/components/sign-up-form/sign-up-form.test.tsx` - Imports the real `signUpAction`; both submit tests queue their outcome
- `src/features/auth/components/sign-out-button/sign-out-button.test.tsx` - Exported counter replaced by `actionStub(signOutAction).calls.length`; file-local reset hook dropped in favour of the central `resetAllActionStubs()`
- `src/features/theme/components/theme-toggle/theme-toggle.test.tsx` - Imports the real `updateThemeAction`; three tests queue outcomes, the double-click test queuing two
- `sign-out-button.stories.tsx`, `theme-toggle.stories.tsx` - Comments corrected: these actions resolve through the plugin's recorder, no longer through the alias

## Assertion Strength: Before vs After

Counted with the same command on both sides — `git show 707e906:<path>` against the working file.

| File | `it(` before → after | `expect(` before → after | all `expect` before → after |
|------|----------------------|-------------------------|-----------------------------|
| `sign-in-form.test.tsx` | 10 → 10 | 17 → 17 | 22 → 22 |
| `sign-up-form.test.tsx` | 15 → 15 | 25 → 25 | 33 → 33 |
| `sign-out-button.test.tsx` | 3 → 3 | 2 → 2 | 3 → 3 |
| `theme-toggle.test.tsx` | 9 → 9 | 9 → 9 | 16 → 16 |

No count fell. `expect(` and the `expect.poll(`/`expect.element(` forms are counted separately because the bare-`expect(` grep the plan specifies misses the polling assertions, which is where `sign-out-button`'s invocation check actually lives. `it.skip`/`it.only`/`describe.skip`/`describe.only` across `src/features/auth` and `src/features/theme`: **0**.

## Control Run: Which Module Does the Import Actually Resolve To

Reasoning from the config would only show that the entry is gone. With the four entries removed and every `queue()` call temporarily stripped, the four test files were run and the recorder reported:

```
- src/features/auth/actions/sign-in-action.ts#signInAction
- src/features/auth/actions/sign-up-action.ts#signUpAction
- src/features/auth/actions/sign-out-action.ts#signOutAction
- src/features/theme/actions/update-theme-action.ts#updateThemeAction
```

14 failed / 68 passed. Those are the **real** action module paths, not the deleted doubles — so the components' imports now land on the recorder. The strip was reverted with `git checkout --` against `00e609f`; nothing from the control run was committed.

## Stated vs Actual: A Plan Defect

The plan's `must_haves` (line 30) asserts Group A "has zero test-file importers … the four modules are aliased only so that components importing the real action resolve to something loadable in a browser page." That is **factually wrong for sign-out**, and was surfaced at the decision checkpoint rather than quietly satisfied.

| Claim | Actual |
|-------|--------|
| Group A has zero test-file importers | **False for sign-out.** `sign-out-button.test.tsx:7` imported `resetSignOutActionCallCount` and `signOutActionCallCount` from `@/test-utils/index`, using them at lines 28 and 66 |
| sign-in, sign-up, update-theme have zero test-file importers | **True.** Those three were reached only through their components' own imports |
| Group A carries no test rewrite | **Partly false.** Three of four needed only a queued outcome, but sign-out needed its assertion mechanism replaced |

The plan's own Task 1 already listed `sign-out-button.test.tsx` and anticipated the rewrite, so the defect is in the `must_haves` framing, not in the task body. The cutover's "isolates transform-serves-consumers from rewrite-preserves-assertions" rationale still holds for three of the four modules.

## Decisions Made

- **Deleted the barrel rather than emptying it.** `src/test-utils/index.ts` contained nothing but the four re-exports. Removing them leaves a comment-only file, which TypeScript treats as a script rather than a module. See "Overlap with plan 04-10" below.
- **No exported counter on the recorder.** sign-out's invocation claim moved to `actionStub(signOutAction).calls.length`. Reproducing a per-action counter would have rebuilt, in miniature, the per-action register D-02 rejects.
- **One queued outcome per call.** The recorder `shift()`s a single outcome per invocation, so `theme-toggle`'s toggle-twice test queues DARK then LIGHT. Queuing once would have left the second call unqueued and failed the global report.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] `src/test-utils/index.ts` re-exported the deleted modules**

- **Found during:** Task 1
- **Issue:** The barrel is absent from the plan's `files_modified`, but its four `export … from "./<deleted-module>"` lines would have failed to resolve the moment the doubles were deleted. Its sole importer was `sign-out-button.test.tsx`, itself being rewritten.
- **Fix:** Deleted the file. Its entire content was the four re-exports.
- **Files modified:** `src/test-utils/index.ts` (deleted)
- **Verification:** `pnpm exec tsc --noEmit` exit 0; `pnpm test` 1424/1424; no remaining importer (`grep -rn '@/test-utils/index'` → 0 hits)
- **Committed in:** `00e609f`
- **Approval:** Explicitly approved by the coordinator at the decision checkpoint.

**2. [Rule 1 - Bug] The register comment exceeded the 3-line prose cap**

- **Found during:** Task 2
- **Issue:** Updating the carve-out comment to record the cutover pushed it to 4 prose lines; `pnpm comments:check` failed with `vitest.config.ts:41: 4 prose lines (max 3)`. Self-inflicted by the Task 1 edit.
- **Fix:** Compressed to a single line that still names which plans unwind which group.
- **Files modified:** `vitest.config.ts`
- **Verification:** `pnpm comments:check` → "no comment block exceeds 3 prose lines"
- **Committed in:** `adaf62a`

**3. [Rule 2 - Missing critical] Two story comments still described the deleted alias**

- **Found during:** Task 1
- **Issue:** `sign-out-button.stories.tsx` and `theme-toggle.stories.tsx` stated these actions "resolve through the shared Server Action stub alias" — true before the cutover, false after, and exactly the kind of stale claim the next reader would trust.
- **Fix:** Both now name `serverActionStubPlugin`'s generic recorder, keeping the ADR pointer.
- **Files modified:** the two stories files
- **Verification:** `pnpm stories:check`, `pnpm comments:check` exit 0
- **Committed in:** `00e609f`

---

**Total deviations:** 3 auto-fixed (1 × Rule 1, 1 × Rule 2, 1 × Rule 3)
**Impact on plan:** No scope creep. Two were forced by the deletion itself and one was a self-inflicted lint failure. No assertion was touched by any of them.

## Overlap with Plan 04-10

Plan 04-10 lists `src/test-utils/index.ts` in its `files_modified`, plans to delete it, and carries the acceptance criterion `test ! -f src/test-utils/index.ts` plus a `must_haves` claim that the barrel "has ZERO importers today." Both are now satisfied early:

- The file is already deleted, so 04-10's `test ! -f` criterion passes with no work.
- Its zero-importer claim became true **because of this plan** — the barrel had exactly one importer (`sign-out-button.test.tsx`) until this cutover rewrote it.

04-10 should confirm absence rather than re-attempt the deletion, and 04-11's ADR amendment should record that the barrel was removed here, not in 04-10. The deletion was unavoidable at this point: leaving the barrel pointing at four deleted modules would not compile.

## Issues Encountered

**The execution worktree was removed mid-plan.** After the decision checkpoint returned, the orchestrator reaped the agent worktree (`.claude/worktrees/agent-ae299e9d18cd3ca9a`), and the resumed session found itself in the main checkout on `gsd/phase-04-task-subtask-workflow` with `.git` a directory rather than a file. This was verified before any write: `git worktree list` showed only the main checkout, HEAD was still the expected base `707e906`, and **04-08 is the only plan in wave 3** (04-09 is wave 4, 04-10 is wave 5), so no sibling agent could be committing concurrently. Work therefore proceeded in sequential mode on the phase branch — which is the branch the agent branch would have merged into anyway. No worktree was rewritten and no ref was force-moved.

**No test-runner starvation was observed.** Every run in this plan was green on its first attempt (`pnpm test:browser` 864/864, `--project storybook` 203/203, `pnpm test` 1424/1424), so CONVENTIONS.md's starved-tester rule never needed to be applied and no failure was attributed to contention.

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm test:browser` | 35 files / 864 tests passed |
| `pnpm exec vitest run --project storybook` | 32 files / 203 tests passed |
| `pnpm test` (all five projects) | 100 files / 1424 tests passed |
| `pnpm lint` | exit 0 |
| `pnpm exec tsc --noEmit` | exit 0 |
| `pnpm renders:check` | passed — every non-exempt `*.test.tsx` renders composed stories only |
| `pnpm stories:check` | passed — no story declares a play function |
| `pnpm coverage:check` | passed — 108 source files scanned |
| `pnpm actions:check` | passed — 12 Server Actions match the naming rule |
| `pnpm comments:check` | passed (after deviation 2) |
| `pnpm build` | exit 0 |

**CI run 33182583129** on `adaf62a`, blocked on with `gh run watch --exit-status`:

| Job | Conclusion |
|-----|-----------|
| secrets | success |
| quality | success |
| visual | success |
| e2e | success |

## Known Stubs

None. This plan deletes test doubles rather than adding them, and no assertion was weakened, skipped, or reduced to a bare render.

## Next Phase Readiness

Wave 4 (plan 04-09, the board group) is unblocked. The mechanism is now proven end to end against real consumers, so a failure in 04-09 or 04-10 points at the test rewrite rather than at the transform — which is precisely the separation this plan existed to establish.

Two notes for the next executor:

- The eight remaining register entries are all `@/features/boards/actions/*`, and the prefix-matching comment above them is still true and still load-bearing.
- `src/test-utils/index.ts` is already gone; do not plan work around deleting it.

**Not done here (orchestrator-owned):** `STATE.md`, `ROADMAP.md` and `REQUIREMENTS.md` were deliberately left untouched per the dispatch instructions, so the `requirements-completed` IDs above still need marking centrally. Those IDs are shared across every plan in this phase, so the shared-ID gate would in any case block them until the last declaring plan finishes.

---
*Phase: 04-task-subtask-workflow*
*Completed: 2026-08-28*

## Self-Check: PASSED

- Deleted modules confirmed absent on disk: all five (`src/test-utils/index.ts` and the four `*-action-storybook-stub.ts`).
- Task commits confirmed in `git log`: `00e609f`, `adaf62a`. The SUMMARY commit is the one carrying this file.
- SUMMARY.md present at `.planning/phases/04-task-subtask-workflow/04-08-SUMMARY.md`.
