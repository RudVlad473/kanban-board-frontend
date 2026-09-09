---
created: 2026-09-03T21:10:00.000Z
title: board-view "leaves the column row where it was when the create fails" is flaky on CI
area: testing
severity: minor
files:
    - src/components/layout/board-view/board-view.test.tsx
---

## Problem

`src/components/layout/board-view/board-view.test.tsx:943` (MOBILE variant, "leaves the column
row where it was when the create fails") failed once on CI run 33805069347 with
`expected 2 to be +0` on `scrollRow.scrollLeft`, then **passed on a rerun of the identical
commit** (`153c096`) with no code change. Both the preceding full local runs of the same commit
were green (2103/2103, twice).

Surfaced by quick task 260903-ttt, which is a secrets/tooling change and touches no file under
`src/`, `app/`, `e2e/`, `visual/` or `.storybook/` — so it did not cause this. Logged rather than
fixed, per that task's scope boundary.

## Suspected mechanism (not yet confirmed)

The sibling test immediately above asserts the reveal scrolls the row with
`scroll-behavior: smooth`. Its own source comment says the reveal is "armed at submit now rather
than on success", so on submit the smooth scroll begins and the rollback then withdraws the
column. The failing assertion reads `scrollRow.scrollLeft` **synchronously**, right after polling
only for the toast — so a smooth-scroll animation still settling back toward 0 reads as 2.

That is the same shape as two races this repo has already root-caused and fixed by polling: the
THEME-01 `getComputedStyle` colour read against a 200ms transition (`9ef39c0`), and the
`sortable-column` reorder-rollback read against a `useOptimistic` transition (`252c5b3`). Both
were test-side.

## Solution

Confirm the mechanism, then poll the final position rather than sampling it once — e.g. wrap the
last assertion in `vi.waitFor` and assert the row *settles* at 0, which is what the test actually
means. Falsify it: the polled version must still fail against a build where the rollback does not
restore the scroll position, or it is covering nothing.

Reproducing a CI-only flake locally will likely need contention — `--repeat-each` with more than
one worker — rather than a default-worker run, which is what made it invisible locally here.
