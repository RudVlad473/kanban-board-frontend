---
created: 2026-09-07T00:00:00.000Z
title: Investigate recurring layout-shift ceiling misses under full-suite e2e contention
area: testing
severity: minor
files:
  - e2e/quality-baseline.json
  - e2e/quality-baseline.ts
  - .planning/phases/04-task-subtask-workflow/04-24-SUMMARY.md
---

## Problem

04-24's whole-project quality gate rollout surfaced a recurring pattern across roughly five
full-79-test, multi-worker `e2e` project runs taken after the baseline was recorded: TWO different
tests (`optimistic-guards.e2e.spec.ts`'s OPT-01 sidebar case, then `auth.e2e.spec.ts`'s AUTH-04
wrong-password case) each scored a `layoutShiftScore` 1.3x-1000x their own near-zero recorded
baseline exactly once, each time above the `0.01`-floor/`1.5`-tolerance ceiling (effectively
`0.015`) that covers every test's recorded value with generous headroom in isolation.

Both times, a scoped re-record of the SAME spec (`pnpm e2e:baseline <spec>`, 3 more runs, no other
tests running concurrently) landed back at the identical near-zero value every other test in the
suite carries — the ceiling miss did not reproduce in isolation either time. Two incidents in
roughly five full-suite-scale runs (a ~40% observed rate) is a pattern, not noise, but it has NOT
been root-caused: GC pause, CPU throttling, or a genuinely borderline UI transition are all still
plausible mechanisms for a spurious Layout Instability API reading under contention. See
`04-24-SUMMARY.md`'s "Issues Encountered" section (third bullet) and Deviations #3-#5 for the full
measured writeup — the two incidents, the near-zero re-record results, the observed rate, and the
open question this todo exists to close.

The human's answer at 04-24's checkpoint (item 6, resolved in the 04-24 checkpoint close-out) was:
**investigate the mechanism further before deciding** whether to widen the global tolerance
(`layoutShiftFloor: 0.01`, `layoutShiftTolerance: 1.5`, defined in `e2e/quality-baseline.ts`) or
keep re-recording per-incident indefinitely. Continuing to re-record on each new occurrence,
without ever resolving whether the CHOSEN global tolerance is adequate for full-suite-contention
conditions specifically (as opposed to the isolated single-spec conditions every re-record
measures), is not obviously the right long-term answer — silently widening the tolerance is
exactly what 04-24's own D-I forbids doing without a human decision, and neither has happened yet.

## Solution

Two paths, not mutually exclusive:

1. **Root-cause the mechanism.** Instrument a full-suite run to distinguish GC-pause /
   CPU-throttling contention from a genuine borderline UI transition — e.g. correlate a ceiling
   miss's timestamp against system-level CPU/GC metrics captured during the same run, or add
   temporary diagnostic logging to the layout-shift instrument (`e2e/quality-fixtures.ts`) to
   capture the shift's source element/timing on a miss, retained only long enough to catch a third
   incident.
2. **Make a data-driven tolerance call once more evidence exists.** If a third incident lands
   without a clear contention-side mechanism, that is a signal the tolerance itself (not the two
   flagged tests) needs revisiting — bring the accumulated evidence (now 2-3 data points instead
   of 2) back to a human decision rather than raising the constant unilaterally.

Either way, do not touch `DEFAULT_QUALITY_TOLERANCES` without a fresh human sign-off, per D-I.

## Third incident (2026-09-07)

A THIRD, independent ceiling miss — `e2e/quality-fixtures.e2e.spec.ts`'s own standing self-test
("qualityGates runs passively at teardown, and the axe factory scans the settled board"), scored
`0.020908344692654082` against the same `0.015` ceiling (recorded `0.000018374125162760416`).
Surfaced by the pre-push `pnpm verify` gate on quick task 260907-exb's docs commit — a full local
`e2e` run (80 tests, default workers), not the 04-24-style repeat-record. Re-recorded per the same
documented remedy (`pnpm e2e:baseline e2e/quality-fixtures.e2e.spec.ts`); the isolated 3-run
re-record was 12/12 clean, landing back at the identical near-zero value. Three incidents now
(two different specs from 04-24, plus this one, across three separate measurement occasions) with
no clear contention-side mechanism identified in any of them — per the Solution section above,
this crosses the line the human's original answer named: bring this back for the data-driven
tolerance call before treating a fourth occurrence as routine.
