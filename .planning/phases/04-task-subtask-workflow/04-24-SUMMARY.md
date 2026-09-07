---
phase: 04-task-subtask-workflow
plan: 24
subsystem: testing
tags: [playwright, axe-core, eslint, quality-gate, e2e, no-restricted-imports]

requires:
  - phase: 04-task-subtask-workflow
    provides: "04-23's quality-verification harness (qualityGates auto fixture, compareQualityObservation comparator, record mode) — this plan turns it on for the whole e2e project instead of the four-case self-test"

provides:
  - "eslint.config.mjs — a @typescript-eslint/no-restricted-imports block scoped to e2e/**/*.e2e.spec.ts (ignoring full-app.e2e.spec.ts by name) that fails pnpm lint on any spec importing test/expect from @playwright/test directly, verified against both the named-import and namespace-import (import * as) forms"
  - "e2e/quality-baseline.json — one baseline entry per test in the e2e project (79 as of this run), replacing the self-test's 4-entry baseline"
  - "e2e/quality-baseline.ts — DEFAULT_QUALITY_TOLERANCES confirmed (not raised) against a whole-suite measurement, note updated from provisional to measured"
  - "23 e2e specs rewired onto e2e/quality-fixtures.ts's test/expect, wiring every one into the passive qualityGates gate"
  - "a measured wall-clock price for the gate: ~+13s/+8% locally (e2e project), ~+33s/+15% on CI's smaller runner, both inside the 90s budget"

affects: [04-25]

actuals:
  tokens: 13292
  tasks: 3
  commits: 6
  plan_head_before: c552bce23975138727ff3c7ff32c4c1db09bb367

tech-stack:
  added: []
  patterns:
    - "A lint rule that ENFORCES a fixture opt-in (no-restricted-imports scoped to a glob, naming the required import source in its own message) turns a passive-fixture convention into something a spec cannot silently skip — verified in both directions (named import AND namespace import) before trusting the claim."
    - "A before/after wall-clock measurement across an atomic-commit executor must restore the 'before' state from the PARENT COMMIT (git checkout <parent>^ -- <paths>), never git stash — stash has nothing to stash once the change is already committed, and silently measures a near-zero delta. Assert the restore actually changed something (non-empty diff) before timing anything."
    - "A flaky-rule finding discovered live (outside the record run) is resolved with a SCOPED re-record of just that spec, never a hand-edit of the baseline JSON — the re-record also serves as a second, independent sample that can retract an earlier finding (here: a suspected per-test layout-shift outlier that a second, isolated 3-run sample did not reproduce)."

key-files:
  created:
    - .planning/todos/pending/2026-09-06-accessibility-inventory-from-the-whole-project-quality-baseline.md
  modified:
    - eslint.config.mjs
    - e2e/auth.e2e.spec.ts
    - e2e/boards-create.e2e.spec.ts
    - e2e/boards-delete.e2e.spec.ts
    - e2e/boards-detail.e2e.spec.ts
    - e2e/boards-list.e2e.spec.ts
    - e2e/boards-rename.e2e.spec.ts
    - e2e/boards-switch.e2e.spec.ts
    - e2e/columns-create.e2e.spec.ts
    - e2e/columns-delete.e2e.spec.ts
    - e2e/columns-rename.e2e.spec.ts
    - e2e/columns-reorder.e2e.spec.ts
    - e2e/cookie-policy.e2e.spec.ts
    - e2e/optimistic-guards.e2e.spec.ts
    - e2e/route-guard.e2e.spec.ts
    - e2e/session-bridge.e2e.spec.ts
    - e2e/subtasks.e2e.spec.ts
    - e2e/tasks-conflict.e2e.spec.ts
    - e2e/tasks-create.e2e.spec.ts
    - e2e/tasks-delete.e2e.spec.ts
    - e2e/tasks-detail.e2e.spec.ts
    - e2e/tasks-edit.e2e.spec.ts
    - e2e/tasks-move.e2e.spec.ts
    - e2e/theme.e2e.spec.ts
    - e2e/quality-baseline.json
    - e2e/quality-baseline.ts

key-decisions:
  - "The 16 specs carrying a type-only Playwright import (`type Page`/`type Locator`/`type Request`) kept that import INLINE (`import { type Page } from \"@playwright/test\"`) rather than converting to a separate `import type { ... }` statement — minimizes the diff to exactly what the rule requires (removing `test`/`expect`), matching the plan's own 'only import lines changed' verification."
  - "One test's layout-shift score spiked to 0.016419 (vs. a suite median of 1.8e-5) in the whole-project 79-test, 3-repeat record run. Rather than permanently ungating it (the plan's fallback for a genuinely irreducible per-test outlier), a scoped isolated re-record of that one spec was run first — it produced three clean near-zero results, pointing at full-suite resource contention as the cause rather than the interaction itself. No test's layout-shift score is ungated in the committed baseline; DEFAULT_QUALITY_TOLERANCES (0.01 floor, 1.5 tolerance) were CONFIRMED with wide margin against the clean measurement, not raised."
  - "A flaky color-contrast finding on optimistic-guards.e2e.spec.ts's OPT-01 sidebar-row case, first observed during this plan's own `pnpm verify` run (a 4th independent observation the 3-repeat record hadn't carried), was resolved per the documented remedy: `pnpm e2e:baseline e2e/optimistic-guards.e2e.spec.ts` (scoped re-record), never a hand-edit of axeRuleCounts or flakyRuleIds."
  - "A SECOND, independent layout-shift ceiling miss (auth.e2e.spec.ts's AUTH-04 case, 0.0199 vs a 0.015 ceiling) surfaced during the final push's own pre-push `pnpm verify` — resolved the same way (scoped re-record, landed back at the suite's near-zero baseline). Two such incidents across roughly five full-suite-scale runs post-baseline is a recurring pattern, not a one-off: it is flagged explicitly at the checkpoint below rather than silently absorbed by repeated re-recording, since the per-test re-record remedy treats each symptom but does not by itself say whether the CHOSEN global tolerance is adequate for full-suite-contention conditions specifically (as opposed to an isolated single-spec run, which has never reproduced either spike)."

requirements-completed: []

coverage: []

duration: ~3.5h (single continuous session; three full pnpm verify runs, one 10-repeat contention run, and one full baseline record consumed most of the wall clock)
completed: 2026-09-06
status: complete
---

# Phase 04 Plan 24: Whole-Project Quality Gate Rollout Summary

**All 23 shipped e2e specs (79 tests) now build their `test`/`expect` from `e2e/quality-fixtures.ts`, enforced by a new `@typescript-eslint/no-restricted-imports` ESLint block that fails `pnpm lint` on any spec that imports Playwright's own `test`/`expect` directly — verified against both the named-import and the namespace-import (`import * as`) bypass forms `04-REVIEWS.md` had flagged as unclosed.**

## Performance

- **Duration:** ~3.5h (single continuous session)
- **Tasks:** 3 code tasks, all committed; the plan's trailing checkpoint is presented below, unanswered
- **Files created:** 1 (pending todo), modified: 25
- **Commits:** 3 (`99c0505`, `80cf6fc`, `30b85c6`)

## Accomplishments

- **The lint rule** (`eslint.config.mjs`, new numbered block 12): `@typescript-eslint/no-restricted-imports` scoped to `e2e/**/*.e2e.spec.ts` (ignoring `e2e/full-app.e2e.spec.ts` by name, D-H), banning `test`/`expect` named imports from `@playwright/test` with `allowTypeImports: true` so the 16 specs' `type Page`/`type Locator`/`type Request` imports keep working. Verified live, not merely asserted: reverting one spec's import to a direct named import fails `pnpm lint`; rewriting it as `import * as playwright from "@playwright/test"` (the form `04-REVIEWS.md` claimed was a bypass) ALSO fails, with the exact message `'test' and 'expect' from '@playwright/test' are restricted`. Both reverts were undone; the file's final state is byte-identical to before the probe (`git diff --stat` on the file after restore: 1 file changed, 1 insertion, 2 deletions — matching every other value-only spec in the batch).
- **23 specs rewired**: 7 value-only imports replaced outright with `import { expect, test } from "./quality-fixtures"`; 16 type+value imports kept their inline `type` import from `@playwright/test` and gained a new sibling-group line for `expect`/`test`. `git diff --stat` over the batch: 39 insertions / 30 deletions, every line an import line (confirmed by inspection and by the plan's own `git diff --name-only -- src app` check staying empty throughout).
- **Intermediate gate-live proof**: with the import rewiring committed but no baseline recorded yet, `pnpm exec playwright test --project=e2e e2e/boards-list.e2e.spec.ts` failed both of its tests with `No baseline entry for "..."` — exactly the designed intermediate state. Live test count via `--list`: 79 across 24 files (75 newly gated + 4 already-baselined self-test cases).
- **The whole-project baseline** (`e2e/quality-baseline.json`): recorded via `pnpm e2e:baseline` (3 repeats, 237 observations) — first attempt hit 2 transient failures on the shared nonprod backend (documented `[WebServer] Error: The destination stream closed early` class of intermittent drop), unrelated to this plan's changes; a clean retry recorded all 79 keys.
- **Layout-shift tolerances confirmed, not raised**: whole-suite spread (excluding one initially-suspect outlier, see Decisions) — median 1.8e-5, highest stable-scoped reading 0.00305 — both comfortably inside the existing `layoutShiftFloor: 0.01` / `layoutShiftTolerance: 1.5`. The note at the definition site is updated from "provisional" to "measured 2026-09-06."
- **The accessibility inventory, filed not fixed** (D-J): 4 distinct rule ids across the whole suite (`region` 18 tests/123 occurrences, `landmark-one-main` 18/18, `page-has-heading-one` 16/16, `color-contrast` 4/12), plus 3 rule ids classified flaky. Root-caused enough to be actionable without touching `src/`/`app/`: `region`/`landmark-one-main` trace to `app/(auth)/layout.tsx`'s sign-in/sign-up pages rendering outside `(dashboard)/layout.tsx`'s `<main>`. `git diff --name-only -- src app` stayed empty for the whole plan.
- **The price, measured on both machines**:
  - Local `e2e` project, before (gate off, 3 clean runs restored from task 1's parent commit): 166.0s / 151.1s / 169.6s (avg 162.2s).
  - Local `e2e` project, after (gate on, 3 clean runs): 176.9s / 176.1s / 173.3s (avg 175.4s). **Delta: +13.2s, +8.1%** — well inside the 90s budget.
  - CI `e2e` job, previous commit (run `34050778760`, pre-rollout): 3m40s (220s).
  - CI `e2e` job, this commit (run `34057197796`, post-rollout): 4m13s (253s). **Delta: +33s, +15%.**
  - `pnpm verify` (2 samples, both green): task 2's own run 532937ms (8m53s); task 3's own run 545839ms (9m6s) — both well above CLAUDE.md's recorded 5m14s (313584ms) baseline and `docs/review-brief.md`'s ~7min figure. Neither disagreement is resolved by this plan's data alone: this session ran three consecutive full `pnpm verify`s plus a 10-minute contention run plus a full baseline recording in the same window, so machine contention from the session itself is a plausible confound alongside the gate's own added cost, and `lint`'s already-documented 48-106s variance on this box adds further noise. The two narrowing levers (scope the axe scan to the main landmark; drop the best-practice rule family via tags) were **not applied** — both narrow coverage, which the checkpoint below decides.
- **Contention proof**: `pnpm exec playwright test --project=e2e --repeat-each=3 --workers=2` — 237 passed, **0 flaky**, 10m18s total.
- **Full pipeline, twice green**: `pnpm verify` (20 gates) passed both times it was run standalone, and a third time inside the pre-push hook (514627ms) before the push that triggered CI.
- **CI green on all four jobs** (run `34057197796`): `secrets` 9s, `quality` 4m2s, `visual` 4m3s, `e2e` 4m13s.

## Task Commits

1. **Task 1: The lint rule, and the 23 imports it makes mandatory** - `99c0505` (feat)
2. **Task 2: Record the whole-project baseline, derive the tolerances, and price the gate** - `80cf6fc` (feat), followed by a same-task correction `30b85c6` (fix) after `pnpm verify` surfaced a flaky rule the 3-repeat record hadn't seen
3. **Task 3: Contention, the full pipeline, and CI sign-off** - `1c21b60` (fix) — contention run itself was 0 flaky and needed no fix; the fix commit resolves a SECOND, independent layout-shift ceiling miss the docs-commit push's own pre-push `pnpm verify` surfaced (see Deviations #5)

## Files Created/Modified

- `eslint.config.mjs` — new numbered block 12: `@typescript-eslint/no-restricted-imports` scoped to `e2e/**/*.e2e.spec.ts`, `full-app.e2e.spec.ts` excluded by name
- 23 `e2e/*.e2e.spec.ts` files — one import-line change each (7 value-only replacements, 16 add-a-sibling-import edits)
- `e2e/quality-baseline.json` — 79 recorded entries (was 4)
- `e2e/quality-baseline.ts` — `DEFAULT_QUALITY_TOLERANCES` comment updated from provisional to measured
- `.planning/todos/pending/2026-09-06-accessibility-inventory-from-the-whole-project-quality-baseline.md` — the accessibility inventory (new)

## Decisions Made

See `key-decisions` in frontmatter for the two decisions with the most future-reader consequence (the layout-shift outlier retraction, and the flaky-rule remedy). In addition:

- Kept the 16 type-import specs' `import { type Page } from "@playwright/test"` in its existing inline form rather than converting to a standalone `import type { Page } from "@playwright/test"` statement (the shape `e2e/quality-fixtures.e2e.spec.ts` itself uses) — minimizes the diff, and both forms are equally caught/allowed by `allowTypeImports`.
- Placed the new ESLint block as numbered "12", after block 11 and before the file's trailing "9. Generated/vendored trees" `globalIgnores` call, matching this file's established (non-strictly-sequential) numbering convention.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The new ESLint block's comment exceeded the 3-prose-line cap**
- **Found during:** Task 1, first pre-commit attempt
- **Issue:** `pnpm comments:check` failed: `eslint.config.mjs:672: 14 prose lines (max 3)` — the decision-record comment justifying D-G/D-H/T-04-57 was written at normal decision-record length without the `comment-length-exempt:` marker this repo's own convention requires for that length.
- **Fix:** Added a `// comment-length-exempt: ...` marker line (matching the pattern used elsewhere in this same file) and compressed the prose slightly.
- **Files modified:** `eslint.config.mjs`
- **Verification:** `node scripts/check-comment-length.mjs eslint.config.mjs` passes; `pnpm comments:check` green on the actual commit.
- **Committed in:** `99c0505`

**2. [Rule 1 - Bug] `e2e/quality-baseline.json` failed `pnpm format:check` after being written by the record script**
- **Found during:** Task 2, immediately after `pnpm e2e:baseline`
- **Issue:** The 79-entry file's JSON serialization (`JSON.stringify(baseline, null, 4)`) did not match Prettier's own formatting rules for this size of file — exactly the failure mode the plan's own action text warned was "the most likely way this task fails at the very end."
- **Fix:** `pnpm exec prettier --write e2e/quality-baseline.json`.
- **Files modified:** `e2e/quality-baseline.json`
- **Verification:** `pnpm format:check` green.
- **Committed in:** `80cf6fc`

**3. [Rule 1 - Bug] A flaky `color-contrast` finding surfaced live during `pnpm verify`, requiring a scoped re-record**
- **Found during:** Task 2's own `pnpm verify` pricing run
- **Issue:** `optimistic-guards.e2e.spec.ts`'s OPT-01 sidebar-row case failed with `"color-contrast" fired 1 time(s) and is not in the baseline` — a rule id the 3-repeat record run had never observed for this test key (present in 0 of 3, or an environment-timing-dependent 4th-observation flake).
- **Fix:** `pnpm e2e:baseline e2e/optimistic-guards.e2e.spec.ts` (scoped re-record, per the plan's own documented remedy — never a hand-edit). The rule now sits in that test's `flakyRuleIds`.
- **Files modified:** `e2e/quality-baseline.json`
- **Verification:** Re-ran `pnpm exec playwright test --project=e2e e2e/optimistic-guards.e2e.spec.ts` — 5/5 passed clean.
- **Committed in:** `30b85c6`

**4. [Rule 1 - Bug, self-corrected] A manually-ungated layout-shift score was retracted after new evidence**
- **Found during:** Task 2's own derivation step (initial finding), corrected during the fix-up for deviation #3
- **Issue:** The whole-project record run showed `optimistic-guards.e2e.spec.ts`'s OPT-01 sidebar case spiking to 0.016419 (vs. a suite median of 1.8e-5) across its three repeats. Following the plan's guidance for a genuinely irreducible outlier, this was initially hand-set to a sentinel value (`1`) to permanently ungate it. The SAME scoped re-record that fixed deviation #3 also re-ran this interaction three more times in isolation and got three clean near-zero results — retracting the "irreducible outlier" hypothesis in favor of full-suite resource contention as the cause.
- **Fix:** Reverted the sentinel; the entry now carries its freshly re-recorded, near-zero value like every other test. Updated `e2e/quality-baseline.ts`'s derivation comment and the pending todo to describe the corrected finding rather than the retracted one.
- **Files modified:** `e2e/quality-baseline.json`, `e2e/quality-baseline.ts`, the pending todo
- **Verification:** `e2e/quality-baseline.json`'s entry for this test now reads `layoutShiftScore: 0.000018374125162760416` (not `1`); `pnpm exec vitest run --project node e2e/quality-baseline.unit.test.ts` still 9/9.
- **Committed in:** `30b85c6`

**5. [Rule 1 - Bug] A SECOND, independent layout-shift ceiling miss, on a different test**
- **Found during:** Task 3, the docs-commit push's own pre-push `pnpm verify` run (the 5th full-suite-scale run since the baseline was corrected)
- **Issue:** `auth.e2e.spec.ts`'s AUTH-04 "sign-in rejects a wrong password" case scored `0.01990856255425347` against its `0.015` ceiling (recorded `0.000018374125162760416`, floor `0.01`, tolerance `1.5`) — the SAME class of finding as deviation #3/#4, on a DIFFERENT test. Two such incidents across roughly five full-suite-scale runs is a recurring pattern worth naming explicitly rather than treating each occurrence as isolated.
- **Fix:** `pnpm e2e:baseline e2e/auth.e2e.spec.ts` (scoped re-record, the comparator's own prescribed remedy). The re-record's three isolated runs landed back at the suite's near-zero value (`0.000018374125162760416`) — again NOT reproducing the spike, matching the earlier finding's pattern exactly: an isolated re-record of a small number of tests has never once reproduced a spike a full 79-test, multi-worker parallel run has now produced twice.
- **Files modified:** `e2e/quality-baseline.json`
- **Verification:** `pnpm exec playwright test --project=e2e e2e/auth.e2e.spec.ts` — 12/12 passed.
- **Committed in:** `1c21b60`
- **Not resolved by this fix:** whether the CHOSEN global tolerance (`0.01` floor, `1.5x`) is adequate for full-suite-CONTENTION conditions specifically — as opposed to the isolated single-spec conditions every re-record measures. Both incidents point at the same open question, which is put to the human at the checkpoint below rather than answered unilaterally here (raising a global constant is exactly the kind of silent-widening this plan's own D-I forbids doing without a human decision).

---

**Total deviations:** 5 auto-fixed (2 bugs found during the plan's own required checks, 2 bugs caught by `pnpm verify` itself and fixed by the plan's own documented remedy, 1 self-correction of an earlier finding once better evidence arrived). **Impact on plan:** all five were within the plan's own anticipated failure modes (the format-check warning, the flaky-rule/ceiling-miss remedy, the outlier-exclusion escape hatch) or trivial format fixes; none changed scope, and none touched `src/` or `app/`. The two layout-shift ceiling misses (deviations #3/#4 and #5) are, taken together, evidence a human should weigh at the checkpoint — see the last bullet of Issues Encountered.

## Issues Encountered

- **The first baseline-record attempt hit 2 transient failures** (`boards-switch.e2e.spec.ts`'s stacked-board-area case timed out on `networkidle`; `optimistic-guards.e2e.spec.ts`'s drag-handle case timed out waiting for the control to enable) on the shared nonprod backend, matching the documented intermittent-TCP-drop class already recorded in `playwright.config.ts`'s own retry-rationale comment. A clean retry recorded all 79 keys with zero failures — treated as backend flakiness, not investigated further, per the plan's own instruction to only investigate a failure that recurs.
- **CLAUDE.md's 5m14s `pnpm verify` baseline and `docs/review-brief.md`'s ~7min figure both disagree with this session's measurements (532937ms/545839ms/514627ms across three separate green runs).** Not resolved: this session ran an unusually dense sequence of e2e-heavy operations back to back (multiple full-project runs at default workers, one 10-minute `--repeat-each=3 --workers=2` contention run, two full/scoped baseline recordings), which plausibly left machine-level contention (browser process cleanup, OS cache pressure) that a single isolated `pnpm verify` run would not carry. The gate's own measured local delta (+13.2s/+8.1%) and CI delta (+33s/+15%) are both well-isolated single-variable measurements and are the numbers the 90s budget verdict rests on; the `pnpm verify` totals are reported as an additional data point, not as clean evidence of the gate's own cost in isolation.
- **Recurring layout-shift ceiling misses under full-suite contention, not yet fully explained.** Across roughly five full-79-test-project-scale runs taken after the baseline was recorded (two `pnpm verify` runs, one `--repeat-each=3 --workers=2` contention run, two more `pnpm verify` runs via the pre-push hook), TWO different tests (`optimistic-guards.e2e.spec.ts`'s OPT-01 sidebar case, then `auth.e2e.spec.ts`'s AUTH-04 wrong-password case) each scored a layout-shift value 1.3x-1000x their own near-zero recorded baseline exactly once, each time above the `0.01`-floor/`1.5`-tolerance ceiling (`0.015`) that covers every test's recorded value with generous headroom in isolation. Both times, a scoped re-record of the SAME spec — 3 more runs, no other tests running concurrently — landed back at the identical near-zero value every other test in the suite carries. This is consistent (not yet proven) with resource contention during a full-79-test parallel run producing occasional genuine measurement noise on the Layout Instability API, rather than either test having a real per-interaction defect. It has NOT been root-caused to a specific mechanism (GC pause, CPU throttling, or a genuinely borderline UI transition are all still plausible). Two incidents in five runs (a 40% observed rate) is enough of a pattern that continuing to re-record on each new occurrence, indefinitely, is not obviously the right long-term answer — surfaced explicitly at the checkpoint below (item 3) rather than decided unilaterally, since a hand-authored global tolerance uses cannot be `pnpm e2e:baseline`-derived and needs the same acceptance the initial constants got.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **04-25** (the `reactScan` fixture and the D-D/D-F ADR) can proceed: `e2e/quality-fixtures.ts` and `e2e/quality-baseline.ts` are unchanged in shape by this plan (only the baseline data and tolerance comment moved), and the `zz-` probe convention remains available.
- The trailing `checkpoint:human-verify` task is **answered — plan CLOSED.** See "Checkpoint Resolution" below.
- One pending todo carried forward from 04-23, still open: `.planning/todos/pending/2026-09-06-migrate-isserveractionpost-to-the-shared-quality-fixtures-export.md` (de-duplicating `isServerActionPost`) — out of this plan's scope, unaffected by this rollout.

## Checkpoint Resolution

**Resume-signal:** approved, with amendments on items 2 and 6 (of the `<how-to-verify>` list;
item 6 was an addition raised outside the plan's own five numbered items, covering the
un-anticipated layout-shift finding from Deviations #3-#5).

1. **The price** — accepted as measured: +13.2s/+8.1% local, +33s/+15% CI, both inside the 90s
   budget. Neither narrowing lever (scoping the axe scan to the main landmark; dropping the
   best-practice rule family via tags) applied.
2. **The accessibility baseline/debt** (4 rule ids: `region`, `landmark-one-main`,
   `page-has-heading-one`, `color-contrast`) — **NOT resolved now.** The human wants a todo filed,
   once phase 4 is fully closed, to insert a new ROADMAP phase after Phase 5 addressing this
   accessibility debt AND introducing Web Vitals monitoring for the app. That todo is the
   orchestrator's responsibility post-phase-close, not this checkpoint close-out's — it is not
   filed by this commit.
3. **The one-directional drift bound (D-E)** — accepted as proposed: reporting-only is enough for
   now at this scale (4 distinct rule ids across 79 tests); no scheduled whole-suite re-record
   escalation.
4. **The `full-app.e2e.spec.ts` exclusion (D-H)** — confirmed, stays excluded.
5. **Whether to redirect 04-25's ADR** — no redirect; 04-25 proceeds as planned.
6. **The new, un-anticipated item** (recurring layout-shift ceiling misses under full-suite
   contention, 2 incidents in ~5 full-suite runs, not yet root-caused — Deviations #3-#5 and
   Issues Encountered above) — human chose **investigate the mechanism further before deciding**
   whether to widen the global tolerance (`0.01` floor, `1.5x`) or keep re-recording per-incident.
   Filed as `.planning/todos/pending/2026-09-07-investigate-recurring-layout-shift-ceiling-misses-under-full.md`
   rather than investigated in this close-out session.

Plan 04-24 is now fully closed. CI run `34058774827` (the same run `.continue-here.md` left
in progress) is confirmed green on all 4 jobs (`secrets`, `quality`, `visual`, `e2e`) — the `e2e`
job's initial run had 1 real failure plus 4 flaky retries; a rerun came back 0 failures, 78 passed,
1 unrelated flaky (`boards-detail.e2e.spec.ts`), confirming the original failure was transient
nonprod-backend contention (the documented intermittent-TCP-drop class), not a regression from
this plan's changes.

---
*Phase: 04-task-subtask-workflow*
*Completed: 2026-09-06*

## Self-Check: PASSED

All 3 task commits (`99c0505`, `80cf6fc`, `30b85c6`) confirmed present in `git log --oneline --all`. `.planning/todos/pending/2026-09-06-accessibility-inventory-from-the-whole-project-quality-baseline.md` confirmed on disk. `e2e/quality-baseline.json` confirmed to hold 79 entries via a live `node -e` count against the file on disk. CI run `34057197796` confirmed green on all four jobs via `gh run view --json conclusion,status,jobs`.
