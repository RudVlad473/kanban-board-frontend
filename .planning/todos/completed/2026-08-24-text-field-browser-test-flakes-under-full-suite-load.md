completed: 2026-08-24
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

## Resolution (2026-08-24) — root-caused and fixed

Not a timeout-margin problem, and not state leakage past cleanup. Reproduced at **2 failures in 6**
full `pnpm test` runs, which showed the two failures are one causal chain:

1. `TextField (MOBILE) > truncates overflowing values…` fails first with `Test timed out in
   15000ms`. It types 200 characters via `userEvent.type`, and in Browser Mode each character is a
   separate driver round-trip — ~731ms unloaded, but 20x that under full-suite CPU contention.

2. Vitest aborts the test at 15s but **cannot cancel the in-flight keystroke stream**. The
   remaining `x` presses keep draining into the page and land on whichever input a later test has
   focused.

3. `TextField (DESKTOP) > updates its value…` is the victim: its assertion failed with
   `onValueChange` receiving **`"x"`, not `"a"`**, and the field holding `axxxxx…`. That is the
   proof — this was never a slow assertion, it was another test's keystrokes.

That also explains why it looked random (whichever test is focused when the drain lands) and why it
never reproduced in isolation or in `pnpm test:browser` (no contention, so no timeout, so no drain).

**Fix:** the 200 was arbitrary. Measured the actual overflow threshold for this 320px box at
**41 characters** (both viewports, clientWidth 318), so the count was reduced to 60 — still 46%
past the threshold the assertion needs, at 3x fewer round-trips (731ms → 242ms). Nothing else
changed; the test proves exactly what it did before.

Verified with the same loop that reproduced it: **`text-field.test.tsx` failed 0 times in 8 full
`pnpm test` runs** post-fix, against 2 failures in 6 runs pre-fix. One of those 8 runs did go red,
but on an unrelated test (`toast.test.tsx`, see the separate todo) — this file was clean in every
run. Generalized into a CONVENTIONS.md bullet under "Component tests from stories" so an oversized
`userEvent.type()` doesn't get reintroduced.

Note: `text-field.test.tsx:212` was the only long-typing call site in the repo — every other
`"x".repeat(n)` is a `defaultValue`/prop, which costs nothing.
