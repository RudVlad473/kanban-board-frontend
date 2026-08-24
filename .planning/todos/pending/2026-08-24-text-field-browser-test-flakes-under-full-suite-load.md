---
created: 2026-08-24T14:38:08.500Z
title: text-field.test.tsx flakes under full-suite parallel load
area: testing
severity: minor
files:
  - src/components/ui/text-field/text-field.test.tsx
  - vitest.config.ts
  - .github/workflows/ci.yml
---

## Problem

`src/components/ui/text-field/text-field.test.tsx` failed 1 run in 3 during `pnpm test` (all five
Vitest projects at once) on 2026-08-24, and passes 32/32 every time it is run alone or via
`pnpm test:browser`. Both observed failures were `Error: Matcher did not succeed in time` on an
`await expect.element(...)` assertion — the DESKTOP "updates its value and calls onValueChange when
typed into" case in the observed run, and (from a stale screenshot dated 2026-08-22) the MOBILE
truncation case on an earlier one. Different cases each time, same file.

The failure screenshot shows the input holding `axxxxxxx…` — the long value from the truncation
case — where the assertion expected just `"a"`. That is either genuine cross-test state leaking
past the D-04 centralized `afterEach` cleanup in `vitest.setup.ts`, or simply a screenshot taken
after the next test had already started. Which one it is has not been determined.

This was invisible until now: CI's `quality` job has been failing at the earlier "Comment length
check" step since 2026-08-22, so the `Test` step never ran at all. Now that the gate is green, CI
will start executing this suite again and can go red intermittently.

## Solution

TBD — investigate before changing anything:

1. Reproduce deterministically first (loop `pnpm test` and/or raise Vitest's browser concurrency)
   rather than reaching straight for a longer timeout, which would only hide a real leak.
2. If it is state leakage, the suspect is the shared browser page plus the `afterEach` cleanup
   ordering in `vitest.setup.ts` (D-04) — check whether `vitest-browser-react`'s async `cleanup()`
   is actually awaited to completion before the next test's first interaction.
3. If it is pure contention, prefer scoping the fix to this assertion (or the project's
   concurrency) over a repo-wide timeout bump.
