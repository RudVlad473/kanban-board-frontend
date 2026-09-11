# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## vacuous-a11y-scan-parallel — axe-core evaluated-rule count double-counted split-verdict rules
- **Date:** 2026-09-11
- **Error patterns:** Vacuous accessibility scan, evaluated-rule total is below the recorded floor, axe instrument may not have installed, heading-order, color-contrast, quality-fixtures.ts
- **Root cause(s):** `e2e/quality-fixtures.ts`'s `evaluatedRuleTotal` summed the 4 axe-core result bucket lengths (`passes+violations+incomplete+inapplicable`), assuming each rule id contributes exactly one entry. axe-core actually groups results by (rule id, verdict) pair, not rule id alone — a rule whose matched nodes land in different verdicts (observed on `heading-order` and `color-contrast` on the same, byte-identical, fully-settled page) is split into multiple bucket entries, non-deterministically inflating the raw sum by the number of extra splits. The recorded floor (91) baked in the same inflation from its own record-time observation, so a "clean" run without the split read as 1 below floor.
- **Fix:** Extracted `countEvaluatedRules(results)` into `e2e/quality-baseline.ts`, deduplicating by rule id across all 4 buckets (`new Set([...].map(r=>r.id)).size`) instead of summing lengths. `e2e/quality-fixtures.ts`'s teardown now calls this. Re-recorded the full baseline (`e2e/quality-baseline.json`) under the corrected formula — every floor moved uniformly to 89 (previously 90 or 91), no keys added/removed, zero `axeRuleCounts` changed.
- **Files changed:** e2e/quality-fixtures.ts, e2e/quality-baseline.ts, e2e/quality-baseline.unit.test.ts, e2e/quality-baseline.json
- **Why not caught:** No gate existed for this class. The baseline-recording script (`scripts/record-quality-baseline.mjs`) and the runtime vacuity check shared the identical flawed counting formula, so neither could catch the other's mistake — a self-consistent blind spot. `e2e/quality-baseline.ts` had no unit test file at all prior to this fix, so the counting invariant (one entry per distinct rule id, regardless of verdict split) was never independently exercised against axe-core's actual grouping behavior.
- **Recurrence guard:** `e2e/quality-baseline.unit.test.ts`'s `countEvaluatedRules` suite — specifically `"counts a rule once even when its matched nodes split across two different verdicts"` and `"counts a rule once even when it appears in all four buckets at once"` — pins the dedup-by-id invariant directly against the exact axe-core behavior that caused this bug; both fail if `countEvaluatedRules` regresses to a bucket-length sum. This knowledge-base entry additionally lets a future Phase-0 recall recognize the "N is below the recorded floor N+1, axe instrument may not have installed" error shape immediately, without re-running the multi-hour worker-contention/DOM-race investigation this session initially chased.
---
