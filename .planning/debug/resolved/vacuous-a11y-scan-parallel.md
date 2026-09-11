---
status: awaiting_human_verify
trigger: "pnpm exec playwright test --project e2e (via husky pre-push hook locally, and via .github/workflows/ci.yml's e2e job on GitHub Actions) reliably fails one or more tests with: Error: Vacuous accessibility scan for \"<test file> :: <full test title>\": evaluated-rule total N is below the recorded floor N+1 — the axe instrument may not have installed. at ../e2e/quality-fixtures.ts:496"
created: 2026-09-11
updated: 2026-09-11
---

# Debug Session: vacuous-a11y-scan-parallel

## Symptoms

expected: `pnpm exec playwright test --project e2e` should pass reliably under the project's normal 3-worker parallel execution (as run by both the local husky pre-push hook and `.github/workflows/ci.yml`'s `e2e` job).

actual: Reliably fails one or more tests with an error shaped like:

```
Error: Vacuous accessibility scan for "<test file> :: <full test title>": evaluated-rule total N is below the recorded floor N+1 — the axe instrument may not have installed.
    at ../e2e/quality-fixtures.ts:496
```

The throwing code is a `qualityGates` Playwright fixture (`test.extend(...).auto`) in `e2e/quality-fixtures.ts` around line 496, which runs an axe-core accessibility scan and compares the number of evaluated rules against a "recorded floor" baseline, throwing when the live count is even 1 rule below that floor.

errors: Exact error text above. Reproduced 4 times across 2 environments, always the same shape (live count exactly 1 below the recorded floor):
  1. Local pre-push hook, full suite (3 Playwright workers), attempt 1: `e2e/boards-create.e2e.spec.ts:528` "BOARD-02: create the first board > retires the zero-boards screen in the same commit the board opens" — "evaluated-rule total 90 is below the recorded floor 91".
  2. Same local run, attempt 2 (retry): identical test, identical numbers (90 vs 91).
  3. Same local run, attempt 3 (retry): identical test, identical numbers (90 vs 91).
  4. GitHub Actions CI, run 34632186167 (triggered by commit 118c70e): identical test, identical numbers (90 vs 91).

Prior occurrence on `ff1a29f` (GitHub Actions run 34521361155, before today's session): 3 e2e failures — same pattern on `boards-create.e2e.spec.ts:528` (90 vs floor 91) AND `e2e/boards-detail.e2e.spec.ts:87` "BOARD-03 ... board switch: a task deleted before leaving a board is still gone on returning to it" (89 vs floor 90), plus one apparently unrelated `expect(locator).toBeEnabled()` failure in `optimistic-guards.e2e.spec.ts:101`.

timeline: Pre-existing — already reproduced on the commit immediately prior to today's session (`ff1a29f`). Today's session's own changes were docs-only (README correction, untracking `.superpowers/`) and did not introduce this. Not a one-off flake: reproduces deterministically under parallel-worker execution (3 workers) and never under single-worker execution.

reproduction:
  - Fails: `pnpm exec playwright test --project e2e` (default 3 workers) — deterministically, across both local and CI.
  - Passes: `pnpm exec playwright test --project e2e -g "retires the zero-boards screen in the same commit the board opens"` (1 worker, isolated) — passed cleanly in a single run during this session's prior investigation.

Working hypothesis (NOT verified — investigate rather than trust): something about running multiple Playwright workers in parallel causes axe-core's instrument injection into the page to sometimes complete with fewer rules registered than expected for specific tests, tripping the recorded-floor check. Candidates: a race in how/when axe is injected relative to page navigation under CPU/resource contention from concurrent workers; the "recorded floor" baseline itself miscalibrated (e.g., recorded under conditions that don't match real parallel runs); or something else entirely.

## Evidence

- timestamp: 2026-09-11T00:00:00Z
  checked: "e2e/quality-fixtures.ts qualityGates fixture teardown, e2e/quality-baseline.ts's compareQualityObservation, scripts/record-quality-baseline.mjs's evaluatedRuleFloor derivation, this repo's CLAUDE.md/CONVENTIONS.md testing philosophy."
  found: "evaluatedRuleTotal = passes+violations+incomplete+inapplicable rule counts — structurally every active axe rule must land in exactly one of these 4 buckets. evaluatedRuleFloor is Math.min() of 3 repeated record-mode observations (scripts/record-quality-baseline.mjs buildBaselineEntry). CONVENTIONS.md documents an established precedent for this exact class of bug: a real race (server-action settle wait) that 'decayed across two phases undetected... invisible at the default worker count and only surfaces under contention' — the standing tool for it there is a deliberate contention run, not a grep."
  implication: "A 1-rule deficit under load is not 'axe failed to install' (which would zero out most rules) — it means exactly one specific rule is vanishing from all 4 buckets. Need to identify which rule and why."

- timestamp: 2026-09-11T00:05:00Z
  checked: "Added temporary QUALITY_DEBUG_RULES=1 instrumentation logging full sorted rule-id sets per bucket. Ran (1) the single failing test isolated (--workers=1): PASSED, evaluatedRuleTotal=91. (2) The full e2e suite (default 3 workers, no throttle): reproduced the exact original failure (1 failed / 84 passed), evaluatedRuleTotal=90 for the same test."
  found: "Diffing the two captured rule-id sets: identical in passes/violations/inapplicable. The 'incomplete' bucket differs by exactly one id: 'heading-order' is present (as incomplete) in the isolated run and ABSENT from all 4 buckets in the full-suite run — not moved to another bucket, structurally missing."
  implication: "The specific mechanism is axe-core's heading-order rule vanishing entirely under real multi-worker contention. heading-order's axe-core rule definition (node_modules axe-core@4.13.0/axe.js) selects 'h1,h2,...,[role=heading]' and evaluates order across the whole matched node set — exactly the kind of check that would break if a matched heading node is removed from the DOM mid-scan."
  timestamp_note: "grep-confirmed no other rule ever differed across the failing occurrence."

- timestamp: 2026-09-11T00:10:00Z
  checked: "Read the target test's own code comment (e2e/boards-create.e2e.spec.ts:516-526, BOARD-02 'retires the zero-boards screen'): documents a REAL production incident (2026-09-10) where the new board and the zero-boards screen coexisted on screen for over a second, because router.refresh() has not yet swapped the old server segment out when the URL already names the new board. The test's final assertion is a deliberate ONE-SHOT, non-retrying read ('at the instant the URL says a board is open') specifically to NOT wait out this race."
  found: "This is a genuine, already-documented, intentional in-flight DOM mutation at the exact moment the test body ends and qualityGates' teardown (auto fixture) immediately runs its axe scan with no additional wait."
  implication: "The qualityGates fixture's axe scan can start while this exact transition is still resolving. heading-order's rule -- ordering headings across the whole page -- is very plausibly sensitive to a heading element being removed mid-evaluation (the zero-boards screen's own heading/CTA structure being torn down by the delayed refresh)."

- timestamp: 2026-09-11T00:20:00Z
  checked: "Controlled single-variable experiment: added a temporary QUALITY_DEBUG_THROTTLE=1 gate that calls CDP Emulation.setCPUThrottlingRate({rate:6}) right before the axe scan, with ZERO extra Playwright workers (--workers=1, only the one failing test running, nothing else on the machine). Ran the exact same BOARD-02 test 5 times with throttle enabled."
  found: "5/5 runs failed with evaluatedRuleTotal=90, and 5/5 the missing id was 'heading-order' — byte-identical mechanism to the real multi-worker failure, reproduced with a single worker via CPU throttling alone."
  implication: "Confirms CPU contention during the scan (not 'being one of N parallel workers' per se) is the causal mechanism — parallel workers are just how that contention arises in the real suite/CI run."

- timestamp: 2026-09-11T00:25:00Z
  checked: "Discriminating control: applied the SAME 6x CPU throttle to a DIFFERENT test with no live DOM race at test-end ('auto-selects the first board, renders its columns...' from boards-detail.e2e.spec.ts, which ends on polling/settled assertions). Ran 5 times."
  found: "5/5 runs: evaluatedRuleTotal identical to the un-throttled baseline (89 = 89), zero rule-id drift in any bucket across all 5."
  implication: "Rules out 'axe-core is generically flaky under any CPU pressure' as an alternative hypothesis. The rule drop requires BOTH heavy CPU contention during the scan AND an in-flight DOM mutation at scan time — exactly the qualityGates-races-page-state mechanism, not a generic instrument-reliability problem."

- timestamp: 2026-09-11T00:30:00Z
  checked: "Attached page.on('pageerror') and page.on('console', type==='error') listeners during a throttled repro run to look for an uncaught JS exception at the moment of the drop."
  found: "Zero page-level errors/console errors captured across 3 repro runs."
  implication: "The failure is contained entirely inside axe-core's own internal per-rule error isolation (it does not surface to the page's error/console channels) — consistent with axe-core's documented rule-runner catching a per-rule failure internally rather than crashing the whole audit. This is a blind spot: the exact internal axe-core exception was not captured line-by-line, only its externally observable, 100%-reproducible effect."

## Eliminated

- hypothesis: "The axe instrument fails to install at all under parallel load (per the error message's own wording)."
  evidence: "Only ever 1 rule short of 91 total possible rules, always the exact same rule id (heading-order), never a wholesale collapse. A failed-to-install instrument would produce a near-zero total, not N-1."
  timestamp: 2026-09-11T00:15:00Z

- hypothesis: "The recorded floor is stale/miscalibrated and should simply be lowered."
  evidence: "The floor (91) is the historically-accurate MINIMUM of 3 real repeated recordings (scripts/record-quality-baseline.mjs), and heading-order is present in 100% of isolated observations. The deficit is a genuine, reproducible, mechanistically-explained race — not baseline drift or an outdated number."
  timestamp: 2026-09-11T00:15:00Z

- hypothesis: "axe-core is generically less reliable under any CPU contention (a general instrument-fragility issue, unrelated to any specific page-state race)."
  evidence: "The discriminating control experiment: identical 6x CPU throttle on a fully-settled test produced ZERO rule-count drift across 5 runs, while the racy test dropped heading-order 5/5 under the same throttle. Contention alone is not sufficient; an in-flight DOM mutation at scan time is required too."
  timestamp: 2026-09-11T00:25:00Z

- timestamp: 2026-09-11T00:45:00Z
  checked: "CRITICAL RE-TEST: applied the waitForDomQuiescence fix, then ran the SAME isolated test (--workers=1, NO throttle at all) 9-12 times in a row. Also added debug instrumentation logging results.passes/violations/incomplete/inapplicable.map(r=>r.id) PLUS whether window.__qualityDomLastMutationAt advanced during the axe scan itself (mutatedDuringScan)."
  found: "Failure rate WITHOUT throttle, WITH the fix applied, was much higher than initially observed (6-7 failures out of 9-12 runs — worse than the pre-fix baseline's apparent rate). Critically: mutatedDuringScan was FALSE on every single run, including every failing one. The error-context.md page snapshot at failure time also showed a fully settled, single-h1 page with no dual-render artifact."
  implication: "MUST ELIMINATE the 'axe races an in-flight DOM mutation' hypothesis — there is no mutation during or immediately before the scan in ANY observed failure. The waitForDomQuiescence fix does not address the actual mechanism (it happened to reduce failures under artificial CPU throttle for an unrelated reason, likely by slowing everything down enough to change axe's internal scheduling). The real mechanism must be internal to axe-core itself (or @axe-core/playwright's invocation of it) — a non-deterministic rule execution/omission unrelated to page-DOM timing."

## Eliminated

- hypothesis: "axe-core's heading-order rule is dropped because a DOM mutation (the pending router.refresh() segment swap) removes a heading node axe already captured a reference to, mid-scan."
  evidence: "Direct instrumentation of window.__qualityDomLastMutationAt showed ZERO mutations during or immediately before the axe scan across 9-12 consecutive runs, including 6-7 failing ones. The failure-time DOM snapshot (error-context.md) shows a fully settled single-heading page. The CPU-throttle 'confirmation' earlier was a false positive: throttling correlates with the failure but is not causally required, and does not act via DOM mutation."
  timestamp: 2026-09-11T00:50:00Z

- timestamp: 2026-09-11T01:00:00Z
  checked: "Discarded the waitForDomQuiescence fix entirely (git checkout -- e2e/quality-fixtures.ts) and measured the TRUE baseline: ran the ORIGINAL, UNMODIFIED code's exact isolated repro (--workers=1, no throttle, no instrumentation) 16 times in a row."
  found: "11/16 (~69%) FAILED, run completely isolated, no other workers, no throttle. This directly contradicts the original symptom description's claim that isolation reliably passes — that was a single lucky sample (~31% chance per this data). The bug has nothing to do with parallel-worker contention; it is a per-run flake intrinsic to this one test, present even in total isolation."
  implication: "The whole 'parallel workers cause CPU contention which races DOM mutation' framing (including the earlier CPU-throttle 'confirmation') was following a false lead reinforced by insufficient sampling. Must restart hypothesis formation from this corrected baseline fact."

- timestamp: 2026-09-11T01:10:00Z
  checked: "Re-added mutation-observer instrumentation, but FIXED a real bug in it: page.addInitScript(() => { ... observer.observe(document.body...) }) threw 'Failed to execute observe: parameter 1 is not of type Node' on EVERY run, silently, because addInitScript executes before the HTML parser has created ANY element — not just document.body but document.documentElement was ALSO null. Fixed by observing `document` itself (always present), confirmed via observerError field now reading null and totalMutationsObservedByObserver reading ~400 per test."
  found: "With the WORKING observer: reran the isolated test 10x with the (also re-added) quiescence wait now actually gating the scan. 10/10 STILL FAILED. Increased the quiet window from 250ms to 3000ms (12s hard cap) and reran 5x: 5/5 STILL FAILED."
  implication: "DOM-mutation timing, at ANY wait duration, has ZERO effect on the failure rate. This conclusively rules out 'axe races an in-flight DOM mutation' as the mechanism, for good this time (the earlier elimination of this hypothesis, based on the BROKEN observer, was actually right, just for the wrong instrumentation reason)."

- timestamp: 2026-09-11T01:20:00Z
  checked: "Captured a full DOM snapshot of every heading-matching element (tag, text, isConnected, bounding rect) immediately before the axe scan, across 8 repeated isolated runs (mixed pass/fail, no wait applied)."
  found: "Byte-identical in every single run, pass or fail: exactly 2 headings, both connected — H1 (board name) and H2 ('Todo (0)', the new column's heading). No dual-render artifact, no extra/missing element, ever."
  implication: "The page DOM state at scan time is 100% deterministic and identical regardless of outcome. The differentiator cannot be page content at all — it must be something in axe-core's own result construction."

- timestamp: 2026-09-11T01:30:00Z
  checked: "Called runAxeAnalysis(page) TWICE back-to-back with zero page changes in between (same settled page), across 6 runs, logging both totals and whether 'heading-order' appeared in either call's combined results."
  found: "'heading-order' was present (findable via .some(r => r.id === 'heading-order')) in ALL 12 scans (6 runs x 2 calls) — even the ones whose total was 90. This falsifies the earlier '\"heading-order\" is dropped from all 4 buckets' framing from the CPU-throttle experiment: in the NATURAL (non-throttled) failure mode, heading-order is never actually absent."
  implication: "The earlier 'heading-order vanishes entirely' finding was specific to the artificial 6x CPU-throttle condition (a different, throttle-induced artifact) and does not describe the REAL, natural failure mode at all. Needed to re-derive the actual mechanism from scratch for the natural case."

- timestamp: 2026-09-11T01:40:00Z
  checked: "Dumped full rule-result objects (id, bucket, node count, node CSS-selector targets) for every 'color-contrast'/'heading-order' entry, comparing a passing (total 91, later found to really be 89 unique) run against failing (total 90) runs."
  found: "THE MECHANISM: axe-core groups results by (rule id, verdict) pair, not by rule id alone. 'heading-order' matches 2 nodes on this page: the H1 and the freshly-created column's H2 (id=board-column-<serverGeneratedId>, only just mounted with a real server id). When BOTH nodes get the SAME verdict ('passes'), axe-core reports them as ONE result entry with nodeCount:2 (contributes 1 to the raw sum). When the column heading's verdict comes out DIFFERENT from the h1's (an 'incomplete' entry with nodeCount:1, SEPARATE from a 'passes' entry with nodeCount:1 for the h1), axe-core reports them as TWO SEPARATE entries (contributes 2 to the raw sum) — and 'color-contrast' does the exact same split EVERY run (always 2 entries: 10-11 nodes in passes, 1 node in incomplete on the add-column gradient button), which is why the recorded floor's raw sum (91) already had this exact +1 inflation baked in even in the 'passing' reference run."
  implication: "The bug is NOT in the app, NOT a DOM race, NOT axe-core failing/crashing on anything — it is `e2e/quality-fixtures.ts`'s own evaluatedRuleTotal FORMULA (`passes.length + violations.length + incomplete.length + inapplicable.length`), which silently assumes each rule id contributes exactly 1 entry total. That assumption is false for axe-core's real, documented grouping behavior (grouped by rule+verdict, not rule alone). Recomputing as the count of DISTINCT rule ids (deduplicated across all 4 buckets) gave a STABLE 89 in every single run captured across every experiment in this session, pass or fail, throttled or not."

- timestamp: 2026-09-11T01:50:00Z
  checked: "Implemented the fix (countEvaluatedRules in e2e/quality-baseline.ts, deduping by rule id across all 4 buckets) and reran the isolated repro 5x."
  found: "evaluated-rule total 89 every single time (previously flickered 90/91) — now genuinely deterministic, not just 'usually passing'."
  implication: "The fix addresses the actual formula defect. The recorded floor itself must be re-derived under the new formula (the old 91 baked in the same +1 inflation the fix removes), not just patched for these two specs — every spec's floor could carry the same latent inflation, so a full pnpm e2e:baseline re-record is required, not a scoped one."

## Eliminated

- hypothesis: "axe-core's heading-order rule is dropped because a DOM mutation (the pending router.refresh() segment swap) removes a heading node axe already captured a reference to, mid-scan."
  evidence: "Direct instrumentation of window.__qualityDomLastMutationAt showed ZERO mutations during or immediately before the axe scan across 9-12 consecutive runs, including 6-7 failing ones. The failure-time DOM snapshot (error-context.md) shows a fully settled single-heading page. The CPU-throttle 'confirmation' earlier was a false positive: throttling correlates with the failure but is not causally required, and does not act via DOM mutation."
  timestamp: 2026-09-11T00:50:00Z

- hypothesis: "This only reproduces under real multi-worker parallel contention (matches the original symptom description)."
  evidence: "The ORIGINAL, unmodified code fails 11/16 (~69%) times when run in complete isolation (--workers=1, no throttle, nothing else running). The original 'isolated passes cleanly' claim was one lucky sample. Worker count / parallelism is irrelevant to this bug."
  timestamp: 2026-09-11T01:00:00Z

- hypothesis: "A DOM-mutation-quiescence wait before the axe scan (of any duration) fixes or even mitigates the failure."
  evidence: "With a CONFIRMED-WORKING mutation observer (fixed from a real addInitScript/null-document.body bug), waiting up to 3000ms of confirmed silence (12s hard cap) before scanning still failed 5/5 and 10/10 across two separate batches. Waiting has zero effect because there is no DOM race to wait out."
  timestamp: 2026-09-11T01:20:00Z

- hypothesis: "In the natural (non-throttled) failure mode, axe-core's heading-order rule is entirely absent from all 4 result buckets, the same way it appeared to be under artificial CPU throttling."
  evidence: "Double-scan experiment: heading-order was present (as a rule id, in some bucket) in 100% of 12 scans across 6 runs, including every run whose total was 90. The 'entirely absent' finding was specific to the artificial 6x-CPU-throttle condition and does not describe the real, natural failure."
  timestamp: 2026-09-11T01:30:00Z

## Resolution

root_cause: "e2e/quality-fixtures.ts computed evaluatedRuleTotal as the raw sum of the 4 axe-core result bucket lengths (passes.length + violations.length + incomplete.length + inapplicable.length), silently assuming every rule id contributes exactly one entry to that sum. This is false: axe-core groups its results by (rule id, verdict) pair, not by rule id alone — a rule whose several matched nodes receive DIFFERENT verdicts (e.g. heading-order's two heading nodes on this page, one an h1 and one a freshly-mounted column heading with a real server-assigned id) is reported as multiple separate result entries, one per distinct verdict, inflating the raw sum by the number of extra splits. Whether a given run's node-level verdicts happen to align (merging into one entry) or diverge (splitting into two) is apparently a genuine, page-content-independent non-determinism inside axe-core's own per-node evaluation (confirmed: the DOM was byte-identical across every passing and failing run observed, and waiting arbitrarily long before scanning changed nothing) — both heading-order and color-contrast exhibited exactly this splitting behavior on this page. The recorded floor (91) was itself computed with the same flawed formula and happened to be recorded from an observation where the split occurred (91 = 89 distinct rules + 2 duplicate split-entries), so even a 'clean' run without the split (90 = 89 + 1 duplicate, since color-contrast always splits on this page) reads as 1 below that inflated floor. root_cause is a single defect (code category): the counting formula in e2e/quality-fixtures.ts / e2e/quality-baseline.ts, not a page-state race, not parallel-worker contention, and not axe-core failing to install."
fix: "Extracted a pure, unit-tested countEvaluatedRules(results) function into e2e/quality-baseline.ts that deduplicates by rule id across all 4 result buckets (new Set([...passes,...violations,...incomplete,...inapplicable].map(r=>r.id)).size) instead of summing bucket lengths. e2e/quality-fixtures.ts's qualityGates teardown now calls this instead of the inline sum. Verified this produces a stable, deterministic count (89) across every run captured in this session, pass or fail, throttled or not — where the old formula flickered between 89-91 depending on axe-core's internal split/merge behavior for the same, unchanging page. The full quality baseline (e2e/quality-baseline.json) must be re-recorded under the new formula via `pnpm e2e:baseline` (unscoped — every spec's floor could carry the same latent +N inflation from a lucky split at its own original record time, not just the two specs that happened to manifest it as a visible failure)."
verification: |
  Full-suite pnpm e2e:baseline re-record succeeded (255 passed, 85 keys recorded) after 2 earlier
  attempts aborted on pre-existing, unrelated flakes (drag-and-drop landing assertion, task-create
  reload assertion — both confirmed to fail identically on the UNMODIFIED code via git-stash checks,
  so not caused by this fix). Diff inspected: all 85 keys preserved (none added/removed), every
  evaluatedRuleFloor moved uniformly to 89 (previously 90 or 91, confirming the universal +1/+2
  historical inflation), zero axeRuleCounts changed, only 3 flakyRuleIds entries tightened (an
  improvement, not a regression). A single full-suite pass (no repeat-each) against the fix showed
  EVERY test reporting evaluatedRuleTotal=89 with zero variance. Ran the full e2e suite under real
  default 3-worker parallel conditions 3 separate times: 85/85 passed every time. Ran the originally
  failing test 10x via --repeat-each=10 under default parallel workers: 10/10 passed. Ran
  `pnpm test` (2256 tests across 140 files): all passed. `pnpm lint`, `pnpm format:check`,
  `pnpm exec tsc --noEmit`, and `node scripts/check-comment-length.mjs` all passed. Both-directions
  regression-test proof done manually: reverted countEvaluatedRules to the naive sum, confirmed the
  2 new split/all-4-buckets unit tests fail (received 3 and 4 instead of 2 and 1) while the
  merge/empty-set tests still pass; restored the fix, confirmed all 13 tests pass.
files_changed:
  - e2e/quality-fixtures.ts
  - e2e/quality-baseline.ts
  - e2e/quality-baseline.unit.test.ts
  - e2e/quality-baseline.json

## Current Focus

reasoning_checkpoint:
  hypothesis: "evaluatedRuleTotal's raw-bucket-length-sum formula double-counts a rule whenever axe-core splits that rule's matched nodes across two different verdicts (a real, page-content-independent axe-core behavior, confirmed on heading-order and color-contrast on this exact page) — deduplicating by rule id produces a stable, deterministic count immune to this."
  confirming_evidence:
    - "Direct dump of full rule-result objects showed heading-order and color-contrast each appearing as TWO separate bucket entries (different node subsets, different verdicts) in some runs and ONE merged entry (same nodes, same verdict) in others, on a byte-identical, fully-settled DOM."
    - "countEvaluatedRules (dedup by id) returned exactly 89 across every single captured run in this entire session (throttled, non-throttled, isolated, quiesced, double-scanned) — the raw sum varied 89-91 depending on which rules happened to split that run."
  falsification_test: "If, after the fix, the SAME isolated repro (run 10+ times) ever reports a total other than the true distinct-rule count for a given page/test, the dedup fix is incomplete or a different rule-grouping edge case exists that also needs deduplicating."
  fix_rationale: "Addresses the actual defect (a counting formula that assumes an invariant axe-core does not actually provide) rather than a symptom (the floor number) or a chased-and-eliminated non-cause (DOM timing, worker contention). No test-body assertions are touched; behavior of the accessibility gate itself is unchanged except that it now measures what it always intended to measure."
  blind_spots: "Have not traced axe-core's own source to find exactly WHY a given run's per-node verdict split is non-deterministic for byte-identical DOM (likely an internal scheduling/promise-ordering artifact inside axe-core 4.13.0, not something this repo can fix or needs to) — treated as an accepted, harmless implementation detail of the library now that the counting formula no longer cares about it. Have not yet completed the full-suite baseline re-record or re-verified under real 3-worker parallel conditions (in progress)."
  candidate_causes:
    - "code: e2e/quality-fixtures.ts's evaluatedRuleTotal formula (fixed) — the sole cause, single category, no AND-gate."
  and_gate: "no — this is a single, self-contained counting-formula defect; no environment/data/config factor contributes independently. Parallel workers and CPU throttle were both chased as candidate contributing factors and both eliminated by direct evidence (natural ~69% isolated failure rate, and zero effect from arbitrarily long DOM-quiescence waits)."

next_action: "All self-verification complete and passing. Awaiting human confirmation (real husky pre-push hook run, or a manual pnpm exec playwright test --project e2e) before committing and archiving this session."

tdd_checkpoint: null
