---
phase: 04-task-subtask-workflow
plan: 01
subsystem: testing
tags: [vitest, vitest-browser, playwright, storybook, base-ui, flake-diagnosis]

requires:
  - phase: 03-board-column-management
    provides: The 95-file / 1317-test Vitest suite whose two known defects this plan closes
provides:
  - A toast test harness that cannot lose its element to Base UI's 5s auto-dismiss
  - A measured diagnosis closing the "dropdown Disabled hangs ~405s" todo without a workaround
  - The missing Dropdown.Root isDisabled behavioural coverage
  - A corrected CONVENTIONS.md rule for reading a starved-tester failure
affects: [04-task-subtask-workflow, stub-transform-migration, ci-signal]

actuals:
  tokens: 4133
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Fake timers (`vi.useFakeTimers({ shouldAdvanceTime: true })`) as the way to assert timer behaviour in browser-mode tests without adding a real delay"
    - "A duration that exceeds `testTimeout` is read as a starved tester, never as a hanging test"

key-files:
  created: []
  modified:
    - src/components/ui/toast/toast.test.tsx
    - src/components/ui/dropdown/dropdown.test.tsx
    - src/components/ui/dropdown/dropdown.stories.tsx
    - CONVENTIONS.md

key-decisions:
  - "The dropdown `Disabled` hang was closed with a diagnosis, not a code fix, because the story has no defect — the todo's own hypothesis is refuted by the source and by direct measurement"
  - "`vitest.config.ts` was left untouched: no `testTimeout` raise, no retry, no worker-count tuning, since none could be verified without a reproduction"
  - "`requirements-completed` is deliberately empty — this plan implements none of the phase's feature requirements"

patterns-established:
  - "Starvation signature: a reported test duration larger than `testTimeout` is wall clock absorbed by an arbitrary in-flight test, not execution time"
  - "A test harness inherits provider defaults; any default that can expire mid-test is pinned at the harness, with opt-in at the call site"

requirements-completed: []

coverage:
  - id: D1
    description: "A toast seeded through `renderToastHarness` survives past Base UI's 5000ms default auto-dismiss"
    verification:
      - kind: unit
        ref: "src/components/ui/toast/toast.test.tsx#keeps a harness-seeded toast on screen past Base UI's default auto-dismiss window"
        status: pass
    human_judgment: false
  - id: D2
    description: "Auto-dismiss is still reachable by opting in to a `timeout` on the toast's own config"
    verification:
      - kind: unit
        ref: "src/components/ui/toast/toast.test.tsx#auto-dismisses a toast that opts into its own timeout at the call site"
        status: pass
    human_judgment: false
  - id: D3
    description: "`Dropdown.Root isDisabled` asserts the disabled treatment — disabled, not aria-busy, no listbox"
    verification:
      - kind: unit
        ref: "src/components/ui/dropdown/dropdown.test.tsx#shows a disabled, non-busy trigger with the list absent when the root isDisabled"
        status: pass
    human_judgment: false
  - id: D4
    description: "The `Disabled` story terminates in the storybook project under full-suite load"
    verification:
      - kind: integration
        ref: "pnpm exec vitest run --reporter=verbose (storybook project; Disabled = 140ms)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The dropdown hang is closed with a confirmed cause rather than a workaround"
    verification:
      - kind: manual_procedural
        ref: ".planning/todos/completed/2026-08-24-dropdown-disabled-story-hangs-in-full-suite-runs.md#Resolution"
        status: pass
    human_judgment: true
    rationale: "Accepting a diagnosis that reclassifies a tracked defect as non-existent is a judgment call; the evidence is recorded but a human should agree the todo is genuinely closed."
  - id: D6
    description: "Both fixes hold under repetition and move no visual baseline"
    verification:
      - kind: integration
        ref: "pnpm test x5 consecutive (1319/1319 each)"
        status: pass
      - kind: automated_ui
        ref: "CI=1 pnpm test:visual (260/260, git status --porcelain visual/ empty)"
        status: pass
    human_judgment: false

duration: 63min
completed: 2026-08-28
status: complete
---

# Phase 4 Plan 01: Close the folded browser/storybook defects Summary

**The toast harness no longer races Base UI's 5s auto-dismiss, and the "dropdown Disabled hangs ~405s" defect is closed as a misread starved-tester failure rather than a story bug — proven by five consecutive green 1319-test runs and a clean 260/260 visual run.**

## Performance

- **Duration:** 63 min
- **Started:** 2026-08-28T12:06:00Z
- **Completed:** 2026-08-28T13:09:00Z
- **Tasks:** 3
- **Files modified:** 6 (4 source/doc, 2 todo files moved)

## Accomplishments

- `renderToastHarness` now renders `<ToastProvider timeout={0}>`, so no harness test can lose its element to the dismiss timer. Written test-first; the RED case failed at both viewports before the change.
- The dropdown `Disabled` "hang" is diagnosed and closed: the story was never hanging. Three independent findings refute the tracked hypothesis, and the arbitrary-victim prediction was confirmed live during this plan.
- The missing `Dropdown.Root isDisabled` behavioural coverage was added — previously only `isLoading` and item-level `isDisabled` were tested.
- CONVENTIONS.md's "the residue is not contention" claim, which is what propagated the misdiagnosis into the phase plan, is corrected with the measurements that disprove it.

## Task Commits

1. **Task 1: Stop the toast harness racing Base UI's auto-dismiss** — `5baebb7` (test, RED) → `7ecedf6` (feat, GREEN). No REFACTOR commit; the change is one prop and needed no cleanup.
2. **Task 2: Root-cause and fix the Disabled story hang** — `c71765b` (fix)
3. **Task 3: Prove both fixes hold under contention** — `d98b348` (docs, todo closures). Task 3 is a measurement task and produced no source diff of its own.

## Files Created/Modified

- `src/components/ui/toast/toast.test.tsx` — harness provider pinned at `timeout={0}`; two new cases (survives past 5000ms; opts in to dismissal at the call site); the story-timeout note relocated from the render case to the harness it now describes.
- `src/components/ui/dropdown/dropdown.test.tsx` — new `isDisabled` root case asserting `toBeDisabled()`, `data-disabled`, `aria-busy="false"`, and the absence of a listbox.
- `src/components/ui/dropdown/dropdown.stories.tsx` — dated decision-record comment on the `Disabled` story recording the 140ms measurement, so the question is not reopened.
- `CONVENTIONS.md` — "Test runner concurrency" rewritten to describe the starvation signature and name both observed victims.
- `.planning/todos/completed/2026-08-24-toast-harness-races-the-5s-auto-dismiss-under-load.md` — moved from `pending/`, resolution appended.
- `.planning/todos/completed/2026-08-24-dropdown-disabled-story-hangs-in-full-suite-runs.md` — moved from `pending/`, full diagnosis appended.

## The confirmed cause of the dropdown "hang"

The plan required a confirmed cause, not a hypothesis. **The `Disabled` story was never hanging.**

1. **The suspected cause is refuted at the source.** The todo's leading hypothesis was that the story "awaits something a permanently-disabled control never satisfies". `dropdown.stories.tsx` declares no `play` function, and `scripts/check-no-play-functions.mjs` (D-05, ADR tech/0025) enforces repo-wide that no story does — `pnpm stories:check` passes. There is nothing in the story to await. Per story the `storybook` project runs a render plus the a11y addon's axe `afterEach`, and nothing else.

2. **405s cannot be execution time.** Browser-mode `testTimeout` defaults to 15000ms and this repo sets no override (`grep testTimeout` across `vitest.config.ts` and every setup file returns nothing). A test genuinely running would have been aborted at 15s. The recorded 405,616ms is 27x that — and is roughly one whole full-suite run (mine measured 231s / 262s / 357s under load).

3. **Measured directly in the failing configuration.** In a full-suite run with the `storybook` group immediately after `browser`, at ~1.5 GB available memory with six concurrent agents on the box, `Disabled` completed in **140ms** — the same order as its siblings (`Loading` 127ms, `Long Item List` 152ms, `Closed` 587ms).

The mechanism is Chromium starvation. When the tester is starved, the in-browser runner that enforces `testTimeout` is starved with it, nothing bounds the test, and whichever test is in flight absorbs the run's remaining wall clock and is reported as the failure.

**The victim is arbitrary** — that is the diagnosis's falsifiable prediction, and it was confirmed twice during this plan:

| Run | Victim | Signature |
|-----|--------|-----------|
| 2026-08-24 (tracked) | `dropdown.stories.tsx > Disabled` | ~405,616 ms reported duration |
| 2026-08-28 run 3 | `add-board-modal.test.tsx > hands the typed board name to the submit handler` | 15,450 ms elapsed, leaving `locator.click: Timeout 206ms exceeded` |
| 2026-08-28 tally run 3 | whole run collapsed at 50/95 files | `[birpc] rpc is closed, cannot call "createTesters"` |

Had the cause been this story, the victim would always have been this story. It was not, in any of the eight full-suite runs executed here.

Because there is no story defect, there is nothing to fix in `dropdown.stories.tsx`, and `vitest.config.ts` was left untouched — `git diff vitest.config.ts` is empty, so there is no `testTimeout` raise and no retry setting, as the plan required.

## Measurements

**Five consecutive `pnpm test` runs — 5/5 green, 1319/1319 tests each:**

| # | Start | Result | Duration |
|---|-------|--------|----------|
| 1 | 14:58:46 | 1319 passed | 98.29s |
| 2 | 15:00:38 | 1319 passed | 96.82s |
| 3 | 15:02:23 | 1319 passed | 97.18s |
| 4 | 15:04:09 | 1319 passed | 94.56s |
| 5 | 15:05:51 | 1319 passed | 93.27s |

Reported honestly: this is the fifth-through-ninth run of the day. Full record on the final code, in order — green, green, **aborted**, green, green, green, green, green. The abort was the `[birpc] rpc is closed` collapse above, not a test failure, and it happened while six sibling agents were running their own suites on the same 8-CPU box. The five consecutive runs above were counted after that break, per the plan's "five consecutive" wording.

**Visual regression:** `CI=1 pnpm test:visual` — **260/260 passed** (4.6m). `git status --porcelain visual/` is empty: no baseline was written or modified, so neither fix moved a pixel. A first attempt failed one test (`components-ui-icon-button--default — mobile — light`) on a 30s `#storybook-root > *` visibility timeout with no pixel diff; re-running that spec alone passed 4/4, and the clean full run above followed.

**Static gates:** `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm format:check`, `pnpm comments:check`, `pnpm stories:check`, `pnpm renders:check` — all clean.

**Contention evidence** (sampled every 10s during a full-suite run): available memory fell to **626 MB** with 34 Chromium processes resident, and the suite still passed 1319/1319 with `Disabled` not hanging — conditions worse than the ~3 GB the original defect was recorded under.

## Decisions Made

- **Closed the dropdown todo with a diagnosis rather than a code change.** The plan said "fix at the cause"; the cause turned out not to be in the story. Changing the story or tuning `vitest.config.ts` would have been an unverifiable workaround — exactly what the plan and the todo both barred.
- **Used fake timers rather than a real delay for the toast RED test.** The plan's acceptance criteria barred `waitFor`, `setTimeout` and a raised `testTimeout`, and a real 5s wait would have added ~11s to the suite across both viewports. `vi.useFakeTimers({ shouldAdvanceTime: true })` reaches Base UI's dismissal (a plain `setTimeout`, verified in `@base-ui/utils/useTimeout.js`) while keeping browser-driver round-trips resolving. Both new cases run in the file's normal 5.7s total.
- **Left `requirements-completed` empty.** See Deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `pnpm comments:check` rejected the new RED test comment**

- **Found during:** Task 1 (RED phase)
- **Issue:** The new arrange comment ran to 4 prose lines; `scripts/check-comment-length.mjs` caps prose blocks at 3 (CONVENTIONS.md PC-05, D-22).
- **Fix:** Compressed to 3 lines without losing the falsifiable detail (Base UI uses a plain `setTimeout`).
- **Files modified:** `src/components/ui/toast/toast.test.tsx`
- **Verification:** `pnpm comments:check` passes.
- **Committed in:** `5baebb7` (amended into the RED commit so every commit on the branch passes the gate).

**2. [Rule 2 - Missing Critical] `Dropdown.Root isDisabled` had no behavioural coverage**

- **Found during:** Task 2
- **Issue:** The plan's acceptance criteria required that "the `Disabled` story still asserts the disabled treatment". It did not, and neither did anything else: `dropdown.test.tsx` covered only `isLoading` (which incidentally disables) and item-level `isDisabled`. Stories cannot assert (D-25 forbids `play` functions), so the treatment was untested in both places.
- **Fix:** Added a case asserting `toBeDisabled()`, `data-disabled`, `aria-busy="false"` and the absence of a listbox, driven through the `Disabled` story itself so the story is what is exercised.
- **Files modified:** `src/components/ui/dropdown/dropdown.test.tsx`
- **Verification:** `pnpm exec vitest run --project browser src/components/ui/dropdown/dropdown.test.tsx` → 32 passed (was 30).
- **Committed in:** `c71765b`

**3. [Rule 2 - Missing Critical] CONVENTIONS.md asserted the opposite of the measured truth**

- **Found during:** Task 2
- **Issue:** "Test runner concurrency" stated "The residue is not contention — `dropdown.stories.tsx > Disabled` hangs ... so it is a real defect that the old noise was hiding." That sentence is what carried the misdiagnosis into `04-CONTEXT.md` and this plan. Leaving it would guarantee the next reader re-derives the same wrong conclusion.
- **Fix:** Rewrote the bullet to describe the starvation signature, name both observed victims, and keep the standing prohibition on raising `testTimeout` or adding retries.
- **Files modified:** `CONVENTIONS.md`
- **Verification:** `pnpm format:check` passes; the claim now matches the measurements in this SUMMARY.
- **Committed in:** `c71765b`

### Deliberate departures

**4. `requirements-completed` left empty despite the plan's `requirements` frontmatter**

The plan declares `requirements: [TASK-01..05, SUBTASK-01..04, SYNC-01]` — the phase's full feature list, inherited by every plan in the phase. This plan implements none of them; it changes two test files, one story comment and one conventions rule. Copying those IDs into `requirements-completed` would mark ten unbuilt features as delivered and corrupt the traceability matrix. **Left empty deliberately — a later plan in this phase must claim them.** Flagging rather than silently doing either thing.

**5. Task 2 produced a diagnosis instead of a code fix**

The plan's action text and acceptance criteria assumed a defect inside the story ("if the story awaits an interaction a disabled trigger can never produce..."). That premise is false. The task's real requirements — reproduce first, fix at the cause, never raise `testTimeout`, record the confirmed cause — are all satisfied, but the "fix" is the diagnosis plus the coverage and documentation corrections, not a change to the story's behaviour.

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 missing-critical) + 2 deliberate departures.
**Impact on plan:** No scope creep. Deviations 2 and 3 are the plan's own acceptance criteria being met honestly once the premise behind them turned out to be wrong.

## Issues Encountered

- **The dropdown hang would not reproduce.** Eight full-suite runs, including ones at 626 MB available memory with six concurrent agents — materially worse than the ~3 GB the defect was recorded under — never reproduced it. Rather than tune a knob blind, the investigation shifted to why the number was impossible in the first place, which produced the diagnosis above.
- **A fresh worktree fails `tsc`/`lint` until something generates `.next/types`.** `PageProps` and `LayoutProps` are Next-generated globals; `tsconfig.json` includes `.next/types/**/*.ts`, which does not exist in a newly created worktree. Both gates were clean immediately after `pnpm build`. Environmental, not introduced here, but worth knowing before reading a fresh worktree's first `tsc` output as a regression.
- **`CI=1 pnpm test:visual` leaves its static server on port 6007 when the run fails**, so the next invocation dies with "port already used". Killed by hand; not investigated further.

## Notes for calibration

`actuals.tokens: 4133` is chars/4 over the realized diff (16,533 chars). Measured the other common way — chars/4 over the full contents of every file changed — it is 24,933. Recording both so the figure is not compared against a differently-scaled estimate.

## Next Phase Readiness

- The suite is a trustworthy signal for the stub-transform migration that follows: 1319/1319, five consecutive runs, and the two folded defects closed.
- **Carry-forward concern:** the residual contention failure is real and unfixed. Under enough concurrent load a full run can still lose its browser tester and collapse with `[birpc] rpc is closed` or produce a single arbitrary timeout victim. That will read as a stub-transform regression to anyone who does not know the signature. The rule for telling them apart is now in CONVENTIONS.md: a duration above `testTimeout`, or a victim that changes between runs, means starvation, not a code defect. Re-run before investigating.
- Nothing blocks the next plan.

## Self-Check: PASSED

All six modified files exist on disk. All five commits (`5baebb7`, `7ecedf6`, `c71765b`, `d98b348`, `109f41f`) resolve in `git log`. No stubs, no skipped tests, no unrun `<verify>` — every `<verify>` block in the plan was executed and its output recorded above.

---

*Phase: 04-task-subtask-workflow*
*Completed: 2026-08-28*
