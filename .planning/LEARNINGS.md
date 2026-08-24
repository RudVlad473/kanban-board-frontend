---
scope: project
extracted: "2026-08-24T15:12:07.540Z"
source: hand-written
note: >-
  Project-level, cross-phase learnings. Distinct from GSD's per-phase
  `{PHASE_DIR}/{NN}-LEARNINGS.md` files, which `/gsd-extract-learnings` regenerates and
  overwrites wholesale — never hand-edit those; add durable, cross-cutting knowledge here.
counts:
  decisions: 0
  lessons: 2
  patterns: 0
  surprises: 1
---

# Project Learnings

Cross-phase knowledge that outlives the phase it was found in. Add an entry when something cost
real time to work out and would cost it again. Enforceable rules belong in `CONVENTIONS.md` or a
check script; this file is for the reasoning behind them.

## Lessons

### An early failing gate hides every gate behind it

CI's `quality` job runs `lint → routes/handlers/stories checks → format → comments → API drift →
build → test`, sequentially, in one job. When `pnpm comments:check` started failing on 2026-08-22,
the job went red on a comment-length rule — and `build`, `test`, and the entire dependent
`visual` and `e2e` jobs silently stopped running for four consecutive pushes. The dashboard said
"1 failing check", which read as trivial; what it actually meant was that five real gates had not
executed at all.

**Context:** Found 2026-08-24 while resuming Phase 02. Fixing two over-long comments immediately
surfaced a genuine test flake that had been invisible underneath. Treat a long-red trivial check as
a coverage outage, not a style nit — and when one is fixed, expect what it was masking.
**Source:** CI run 32627802505 (red), 32740030630 (first green)

### A local-only tooling break stops anyone from noticing the real break

`pnpm routes:check` crashed with `EISDIR` on a *gitignored* Vitest failure-screenshot directory
named like a `.tsx` file (`__screenshots__/text-field.test.tsx/`). CI never had that directory, so
CI never saw it — but locally it made the quality gate unrunnable, which is plausibly why the
comment violations above sat unnoticed. `check-comment-length.mjs` had already solved this exact
problem with an `isRealFile` guard; the other three checkers had each been written without it.

**Context:** The guard now lives once in `scripts/glob-real-files.mjs` and all four checkers glob
through it. When one script in a family solves an environmental footgun, check whether its siblings
copied the structure but not the fix.
**Source:** `scripts/glob-real-files.mjs`, commit 9181f85

## Surprises

### An aborted test keeps typing into the next one

`testTimeout` aborts the *test*, but nothing cancels the keystrokes already handed to the browser
driver. `text-field.test.tsx` typed 200 characters one round-trip at a time; under full-suite CPU
contention that overran the 15s budget, and the remaining `x` presses kept draining into the page
and landed on whichever input a *later* test had focused. The victim test failed with
`onValueChange` receiving `"x"` instead of `"a"` — an error pointing at a file that was not broken.

**Impact:** Cost a full root-cause investigation because the reported failure and the actual cause
were in different tests, and neither reproduced in isolation. The tell was the received value:
cross-test corruption shows up as *wrong data*, not as a slow assertion. When a browser-mode test
fails with data it never supplied, look for a timed-out interaction earlier in the run rather than
at the failing test itself. Enforced going forward by the `userEvent.type()` sizing rule in
`CONVENTIONS.md` ("Component tests from stories").
**Source:** `.planning/todos/completed/2026-08-24-text-field-browser-test-flakes-under-full-suite-load.md`
