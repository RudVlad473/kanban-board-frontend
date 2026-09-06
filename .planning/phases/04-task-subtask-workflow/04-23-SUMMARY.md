---
phase: 04-task-subtask-workflow
plan: 23
subsystem: testing
tags: [playwright, axe-core, cdp, layout-shift, mutation-observer, e2e, quality-gate]

requires:
  - phase: 04-task-subtask-workflow
    provides: the 23 shipped e2e specs and e2e/seed.ts's account/board/column/task seeding, which this plan's self-test reuses

provides:
  - "e2e/quality-fixtures.ts — a test/expect pair extending @playwright/test with a passive qualityGates auto fixture (route-level axe scan + document-level layout-shift score, both checked against a committed baseline with no call in the test body) and four opt-in instruments: axe, cdp, flickerTracker, optimisticRoute, layoutShiftTracker"
  - "e2e/quality-baseline.ts — the pure compareQualityObservation comparator (one-directional gate, per-rule occurrence counts, flaky residual, provisional layout-shift tolerance) plus baseline read/write helpers"
  - "scripts/record-quality-baseline.mjs + pnpm e2e:baseline — the record mode, with hard collision detection and a replace-not-union merge"
  - "e2e/quality-baseline.json — the self-test spec's own four recorded entries"
  - "@axe-core/playwright@4.13.0 installed (checkpoint-approved)"

affects: [04-24, 04-25]

actuals:
  tokens: 16781
  tasks: 3
  commits: 3

tech-stack:
  added: ["@axe-core/playwright@4.13.0"]
  patterns:
    - "A shared browser-side installer takes its filtering/behavioral policy as a REQUIRED parameter with no default when two call sites need opposite policies (D-K) — never let one call site's omission silently inherit the other's answer."
    - "Any function passed to page.evaluate()/page.addInitScript() must be fully self-contained: a reference to ANY outer Node-scope binding (a top-level const, a sibling function) becomes an unresolved ReferenceError once Playwright serializes and re-runs it in the browser — and that error is swallowed silently rather than surfaced to the calling Promise."

key-files:
  created:
    - e2e/quality-fixtures.ts
    - e2e/quality-baseline.ts
    - e2e/quality-baseline.unit.test.ts
    - e2e/quality-baseline.json
    - e2e/quality-fixtures.e2e.spec.ts
    - scripts/record-quality-baseline.mjs
  modified:
    - package.json
    - pnpm-lock.yaml
    - vitest.config.ts
    - .gitignore
    - .prettierignore

key-decisions:
  - "Path resolution in e2e/quality-baseline.ts and e2e/quality-fixtures.ts uses process.cwd(), not import.meta.url — Playwright's own TS transform targets CommonJS, where import.meta throws at load time. Neither file existed to discover this before; e2e/seed.ts's own process.cwd()-relative convention is why the fix is safe."
  - "playwright test's --project e2e <spec> (space-separated) fails to resolve in this environment/Playwright 1.62.1 combination (\"Project(s) '<spec>' not found\"); --project=e2e works. Used throughout instead of the plan's literal verify-block wording."
  - "A Playwright fixture's second (use/provide) parameter must not be named use — eslint-plugin-react-hooks's rules-of-hooks flags any function named use() as a React Hook call, producing a false positive with no relation to React. Renamed to provideFixture across every fixture in the file."

requirements-completed: []

coverage: []

duration: ~4h (single continuous session, resumed after the human-verify checkpoint)
completed: 2026-09-06
status: complete
---

# Phase 04 Plan 23: Quality-Verification Harness (Comparator, Fixtures, Record Mode) Summary

**A passive route-level accessibility + layout-shift gate (`qualityGates`, an `auto` Playwright fixture) checked against a committed, occurrence-count baseline via a pure comparator proved in both directions by 9 unit-test cases, plus three opt-in interaction instruments (`flickerTracker`, `optimisticRoute`, `layoutShiftTracker`) — all wired through a standing four-case self-test spec, with zero new `VERIFY_STEPS`/CI-gate entries.**

## Performance

- **Duration:** ~4h (resumed from a `checkpoint:human-verify` that had approved the `@axe-core/playwright` install but touched no files)
- **Tasks:** 3 code tasks (the plan's leading checkpoint task was already resolved before this run)
- **Files created:** 6, modified: 5
- **Commits:** 3 (`4bbb85a`, `920975e`, `3a19f5a`)

## Accomplishments

- **The comparator** (`e2e/quality-baseline.ts`): `compareQualityObservation` implements the whole gate — an absent baseline entry fails, a vacuous scan (evaluated-rule total below the recorded floor) fails, an unrecorded rule id fails, a recorded rule's count RISING fails naming both numbers, a recorded rule's count FALLING or disappearing only ever reports an improvement (never fails), a flaky rule is ungated in both presence and count, and (task 3) an input-excluding layout-shift score above `max(recorded, floor) * tolerance` fails. All 9 behaviors are pinned by `e2e/quality-baseline.unit.test.ts`, run under `pnpm test` (no seeded account, no browser).
- **The passive gate** (`qualityGates`, `auto: true` in `e2e/quality-fixtures.ts`): every test importing `test`/`expect` from this module gets a route-level `@axe-core/playwright` scan and a document-level, input-excluding (`hadRecentInput: false`) layout-shift score checked against the baseline at teardown, with no call in the test body. A missing baseline entry, a vacuous scan, a regression, or a never-installed layout-shift observer all fail loudly and by name; an improvement is reported (annotation + one console line naming the scoped `pnpm e2e:baseline <spec>` command) without failing the build.
- **Three opt-in instruments**, all option-tuple-declared fixtures: `flickerTracker` (`{ start(), assertNoFlicker({ selector?, maxMutations }) }`, backed by an in-page `MutationObserver`, its selector derivation reading `getAttribute("class")` only — never the DOM property that mirrors it, which is an `SVGAnimatedString` on an SVG element and throws); `optimisticRoute` (a bounded delay on a matched write, never a hold, per the 2026-09-05 CI hazard this repo already paid for once); `layoutShiftTracker` (`{ start(), getScore(), assertMaxLayoutShift(maxAllowed) }`, the input-INCLUDING interaction-window reading, sharing ONE installer with the passive gate via a required, undefaulted filtering-policy parameter — D-K).
- **The record mode** (`scripts/record-quality-baseline.mjs` / `pnpm e2e:baseline`): runs the given spec(s) three times, hard-fails on any key that received other than exactly three observations (in both directions), records each rule id present in all three at its MAXIMUM count (real rule ids in `flakyRuleIds` for anything present in some but not all), and REPLACES — never unions — the matching keys' baseline entries. Verified live: an invented rule id hand-added to the baseline was gone after one scoped re-record.
- **The self-test spec** (`e2e/quality-fixtures.e2e.spec.ts`): four standing cases, all green individually, together, and under `--repeat-each=3 --workers=2` (12/12, zero flaky).
- **Gate coverage provably unchanged**: `VERIFY_STEPS.length` is still 20, `pnpm gates:check` exits 0, and `git diff --exit-code scripts/verify.mjs .github/workflows/ci.yml` is clean.

## Task Commits

1. **Task 1: The passive gate end to end — comparator, auto fixture, record mode, baseline** - `4bbb85a` (feat)
2. **Task 2: flickerTracker and cdp, with the SVG hazard designed out** - `920975e` (feat)
3. **Task 3: optimisticRoute, layoutShiftTracker, and the passive layout-shift half** - `3a19f5a` (feat)

## Files Created/Modified

- `e2e/quality-fixtures.ts` — the `test`/`expect` pair; `qualityGates` (auto), `axe`, `cdp`, `flickerTracker`, `optimisticRoute`, `layoutShiftTracker`; shared `isServerActionPost`
- `e2e/quality-baseline.ts` — the pure comparator plus `readQualityBaseline`/`writeQualityBaseline`
- `e2e/quality-baseline.unit.test.ts` — 9 cases, both directions of D-E/D-L/D-K
- `e2e/quality-baseline.json` — 4 committed entries (this plan's own self-test spec only)
- `e2e/quality-fixtures.e2e.spec.ts` — the standing self-test, 4 cases
- `scripts/record-quality-baseline.mjs` — the record mode
- `package.json` / `pnpm-lock.yaml` — `@axe-core/playwright: "4.13.0"` (bare-pinned, no caret) devDependency, `e2e:baseline` script
- `vitest.config.ts` — `node` project's `include` gains `e2e/**/*.unit.test.ts`
- `.gitignore` / `.prettierignore` — `.quality-observations.jsonl`

## Decisions Made

See `key-decisions` in frontmatter. In addition, within scope:

- **D-L's count arm, both unit-tested and hand-verified**: a recorded rule's occurrence count rising (even with the same rule-id set) is a hard failure naming both numbers; falling is a partial improvement.
- **D-K's filtering-policy split implemented as one shared installer** (`installLayoutShiftObserver`) called twice with opposite, required, undefaulted policy arguments (`EXCLUDE_RECENT_INPUT` for the passive gate, `INCLUDE_RECENT_INPUT` for the interaction tracker) rather than two independent implementations, so the split is visible in the source and neither call site can silently drift onto the other's answer.
- **`optimisticRoute` defaults to `isServerActionPost`** as its match predicate and is documented (segregated decision-record comment) as bounded-delay-only, explicitly not a substitute for `optimistic-guards.e2e.spec.ts`'s release-gate shape on a long write hold.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `import.meta.url` is unusable in files Playwright's own test-file compiler loads**
- **Found during:** Task 1, first attempt to run `e2e/quality-fixtures.e2e.spec.ts`
- **Issue:** `SyntaxError: Cannot use 'import.meta' outside a module` — Playwright's TS-to-CommonJS transform for spec files (and any module they import) rejects `import.meta`, unlike the `node` Vitest project which loads the same `.ts` file as native ESM.
- **Fix:** Both `e2e/quality-baseline.ts` and `e2e/quality-fixtures.ts` resolve paths via `process.cwd()` instead, matching `e2e/seed.ts`'s own existing convention (every `pnpm` script is invoked from the repo root).
- **Files modified:** `e2e/quality-baseline.ts`, `e2e/quality-fixtures.ts`
- **Verification:** `pnpm exec playwright test --project=e2e e2e/quality-fixtures.e2e.spec.ts` runs (previously failed with 0 tests found).
- **Committed in:** `4bbb85a`

**2. [Rule 3 - Blocking] A fixture's `use` parameter collides with `react-hooks/rules-of-hooks`**
- **Found during:** Task 1, empirically verifying the option-tuple fixture shape (as the plan's action explicitly instructed) before writing the rest of the file
- **Issue:** `eslint-config-next`'s `react-hooks/rules-of-hooks` flags any call to a function literally named `use` from within a non-hook-named function as an illegal Hook call — a false positive with no relation to React, triggered purely by Playwright's own conventional parameter name.
- **Fix:** Renamed the second fixture parameter to `provideFixture` throughout `e2e/quality-fixtures.ts`. Confirmed empirically: the option-tuple form with `use` still triggered the lint; renaming cleared it with no other change.
- **Files modified:** `e2e/quality-fixtures.ts`
- **Verification:** `pnpm exec eslint e2e/quality-fixtures.ts` clean.
- **Committed in:** `4bbb85a`

**3. [Rule 1 - Bug] Package.json recorded `@axe-core/playwright` with a caret, violating the repo's bare-pin convention**
- **Found during:** Task 1, immediately after `pnpm add -D @axe-core/playwright`
- **Issue:** pnpm's default install wrote `"^4.13.0"`; the plan's action requires a bare pin matching every other `devDependencies` entry.
- **Fix:** Edited `package.json` to `"4.13.0"`, then `pnpm install` to re-sync `pnpm-lock.yaml`'s own `specifier` field (which pnpm does not update from a hand-edit alone until the next install).
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Verification:** `node -e "...devDependencies['@axe-core/playwright'] !== '4.13.0'..."` exits 0; `git diff` shows a clean 14-line lockfile diff.
- **Committed in:** `4bbb85a`

**4. [Rule 1 - Bug] The layout-shift installer's outer-scope references silently broke once serialized to the browser**
- **Found during:** Task 3, first run of the optimistic-timing self-test case (surfaced by an unrelated case failing the SAME way, which is what made it obviously systemic rather than test-specific)
- **Issue:** `installLayoutShiftObserverOn`/`addLayoutShiftInitScriptTo` wrapped `installLayoutShiftObserver` in an inline arrow that referenced it from OUTER Node.js scope; `installLayoutShiftObserver` itself called a separate top-level `isLayoutShiftEntry` const. `page.evaluate`/`page.addInitScript` serialize a function via its source text and re-run it in the browser with NO closure over anything outside the passed `arg` — every such reference is an unresolved `ReferenceError` in-browser, which the observer's own `try/catch` (there for the genuinely-unsupported-browser case) silently absorbed. Registration succeeded; the score never populated. `qualityGates` teardown then failed EVERY test with "the layout-shift observer never attached" — confirmed reproducible on two different cases, not a flake.
- **Fix:** Made `installLayoutShiftObserver` fully self-contained — `isLayoutShiftEntry` is now a NESTED const inside it, matching the pattern `FLICKER_INSTALL_SCRIPT` (task 2) already established for exactly this reason. Removed the wrapping helper functions; call sites now pass `installLayoutShiftObserver` directly to `page.evaluate`/`page.addInitScript`, using two typed module-level constants (`INCLUDE_RECENT_INPUT`/`EXCLUDE_RECENT_INPUT`, both typed `LayoutShiftFilterPolicy`) as the `arg` — which also resolved a separate TS generic-inference failure the wrapped form had produced.
- **Files modified:** `e2e/quality-fixtures.ts`
- **Verification:** All four self-test cases pass individually, together, and at `--repeat-each=3 --workers=2` (12/12, zero flaky) after the fix; reproduced the failure on the unfixed code first (two different cases, same message), confirming the mechanism rather than assuming it.
- **Committed in:** `3a19f5a`

**5. [Rule 1 - Bug] The optimistic-timing case's response listener caught the sign-in redirect's own trailing write, not the create's**
- **Found during:** Task 3, first run of the optimistic-timing self-test case (after fix #4)
- **Issue:** `page.on("response")` was attached immediately after `signIn()` returned, but `signIn()` only waits for the URL to match — a `next-action` POST from the sign-in flow's own redirect can still be in flight and resolve moments later. The listener's `isServerActionPost` check matched it, setting `delayedResponseObserved = true` at ~17ms — long before the create-task click — and the later real create response never mattered because the flag was already `true`.
- **Fix:** Added `await page.waitForLoadState("networkidle")` after `signIn()` and before attaching the listener / calling `optimisticRoute`, so only the create-task write's own response is observed.
- **Files modified:** `e2e/quality-fixtures.e2e.spec.ts`
- **Verification:** Instrumented with timestamped `console.log`s to confirm the mechanism (response observed at 17ms, before the route handler's own delayed-request log line), then removed the instrumentation once the fix was confirmed working across repeated runs.
- **Committed in:** `3a19f5a`

---

**Total deviations:** 5 auto-fixed (3 blocking, 2 bugs). **Impact on plan:** all five were necessary for the harness to work at all or to match repo convention; none changed scope. Two (the layout-shift closure bug and the response-listener false-positive) were real, reproducible defects in this plan's own new code, caught and fixed before commit rather than shipped.

## Issues Encountered

**Empirically-verified findings the plan asked for (not deviations, but recorded per the plan's own acceptance criteria):**

- **Fixture declaration shape:** `pnpm lint` accepts the option-tuple form (`fixtureName: [fn, options]`) and rejects the bare two-parameter-arrow form with `no-restricted-syntax` (ADR tech/0016). Verified with a scratch spec carrying both shapes before writing the rest of the file, per the plan's own instruction.
- **`testInfo.setTimeout` from a fixture teardown:** DOES extend the enforced budget in Playwright 1.62.1. Verified with a scratch test capped at `test.setTimeout(2000)` that survived a 5-second `setTimeout` sleep in its teardown after calling `testInfo.setTimeout(testInfo.timeout + 15_000)`. One subtlety: reading `testInfo.timeout` back immediately after the call does NOT reflect the increase — the getter reads `this._timeoutManager.defaultSlot().timeout`, a different internal slot object than the one `setTimeout()` mutates (`this._running.slot`) — so the extension is real but not observable via that getter.
- **`testInfo.status` / `testInfo.errors` during teardown:** both populated. Verified with a scratch failing test printing both from an `auto` fixture's teardown: `status` read `"failed"`, `errors.length` was `1`.
- **`void` vs `undefined` for the auto fixture's value type:** `void` trips `@typescript-eslint/no-invalid-void-type` (`void is only valid as a return type or generic type argument`); `undefined` compiles and lints clean. Verified with a scratch fixture using each shape.
- **Evaluated-rule total on a real signed-in board-detail route:** 90 (four-bucket sum, dominated by `inapplicable`). Floor set to 30 (wide headroom, catches a crashed-instrument reading which would be near zero).
- **`main` mutation count across a real two-board switch:** 12 (on `main.flex.min-h-0`). `MAIN_MUTATION_BUDGET` set to 25 (~2x headroom).
- **`maxMutations` required-ness:** a scratch call to `flickerTracker.assertNoFlicker({ selector: "main" })` (omitting `maxMutations`) was tried and `pnpm exec tsc --noEmit` rejected it (`Property 'maxMutations' is missing`); the scratch call was reverted.
- **Optimistic-timing measurements:** the optimistic card painted at 228–244ms across repeated runs, against a 1500ms write delay — roughly 6x margin.
- **Layout-shift measurements (D-K falsification):** over three record-mode repeat observations the input-inclusive score was IDENTICAL every time: `0.000018374125162760416`. Zero run-to-run spread observed, so `DEFAULT_QUALITY_TOLERANCES` (`layoutShiftFloor: 0.01`, `layoutShiftTolerance: 1.5`) is comfortably provisional headroom rather than a tight fit. **The two D-K readings (input-including vs input-excluding) came back EQUAL**, on both interactions tried: an empty-board switch (0 in both) and a task-create against a 5-task column (`0.000018374125162760416` in both). Per D-K's own stated alternatives, this reads as the FIRST explanation — this app's real interactions here shift almost nothing, and the tiny non-zero reading observed on the task-create case was not itself input-attributed (`hadRecentInput` was `false` on it in both accumulators, which is why it appears identically in each) — rather than the second (the filter not doing what the API documents). This is a measured, not argued, finding: no interaction tried in this session produced a shift the two filters actually disagreed about.
- **`--project e2e <spec>`** (space-separated, as literally written in the plan's own `<verify>` blocks) fails in this Playwright 1.62.1 / pnpm environment with `Project(s) "<spec>" not found`. `--project=e2e` works and was used for every verify command in this run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The mechanism is proved end-to-end on a scope small enough to iterate on (D-A's own stated purpose): the passive gate, all three opt-in instruments, and the record mode all work, are unit-tested where pure, and are wired into the standing self-test.
- **04-24** (turning the gate on for the 23 shipped specs) can proceed directly — no rework needed in this plan's artifacts. Its own SUMMARY should re-derive `DEFAULT_QUALITY_TOLERANCES` from a whole-suite measurement per this plan's D-K note (currently provisional, based on one spec's near-zero readings).
- **04-25** (the react-scan probe, D-D) has `flickerTracker`/`cdp`/`optimisticRoute`/`layoutShiftTracker` available to compose against, and the `zz-` probe convention this plan's own scratch specs already followed and cleaned up.
- One pending todo filed: `.planning/todos/pending/2026-09-06-migrate-isserveractionpost-to-the-shared-quality-fixtures-export.md` (de-duplicate the now-three-way-copied `isServerActionPost`, deferred until 04-24 lands per the plan's own scope boundary).
- CI has not yet been run for this plan (push is pending); local `pnpm verify`-equivalent gates (`tsc`, `lint`, `comments:check`, `format:check`, `gates:check`, `pnpm test`, the full self-test spec at `--repeat-each=3 --workers=2`) are all green as of the final Task 3 commit.

---
*Phase: 04-task-subtask-workflow*
*Completed: 2026-09-06*

## Self-Check: PASSED

All 6 created files and the 3 task commit hashes (`4bbb85a`, `920975e`, `3a19f5a`) confirmed present on disk / in `git log --oneline --all`.
