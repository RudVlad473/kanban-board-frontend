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
  lessons: 5
  patterns: 0
  surprises: 2
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

### A written-down backend rule is an assumption until it's probed

02-10's plan asserted "duplicate Board names are allowed" as a stated design fact. The real
deployed backend rejects them: `409 DUPLICATE_RESOURCE`, "Board with that name already exists" —
confirmed by probing twice against the real nonprod backend. The OpenAPI contract this project
generates its client from documents only `200` for every operation, so there was no spec to catch
the mismatch against; the wrong assumption would have shipped silently as a plan `must_haves` truth
if 02-10's own executor hadn't probed instead of trusting the plan text.

**Context:** Found 2026-08-24 during 02-10 execution. Any plan or task whose behavior depends on
backend semantics not exercised by an existing test must probe the real backend before treating
the behavior as fact — never assume from a plan/doc description, and never trust the OpenAPI spec's
absence of a documented error as proof the error can't happen. Flagged as a blocking anti-pattern
in `02-board-management/.continue-here.md` for 02-12 (board rename, another uniqueness-adjacent
operation) — record it here too since the underlying lesson outlives that one plan.
**Source:** `02-10-SUMMARY.md` key-decisions; `.planning/phases/02-board-management/.continue-here.md`

### A test that has never passed is not a regression

All three e2e specs that took CI red on 2026-08-25 — `route-guard`, `boards-rename`,
`boards-detail` — failed on the first run after they were written and had never passed once.
`route-guard` asserted zero `region` roles on the sign-in page, on its own stated premise that "its
columns are the only `region`s this app renders"; the root layout's toast viewport is also a
`region`, on every page, so the count was 0-vs-1 from the moment the assertion landed. Read as
regressions, all three send you hunting for a change that never happened.

**Context:** Found 2026-08-27. Before treating a red test as a regression, establish whether it ever
ran green — `gh run list --branch <branch>` back to the commit that introduced it. That is one
command, and it separates "something broke" from "this never worked", which are different
investigations with different fixes. Two of the three encoded assumptions already false when
written; the third asserted a transport guarantee the framework cannot deliver, because
`BoardsPage` awaits `fetchBoards()` before `redirect()` and the response has begun streaming by
then.
**Source:** commit 34ecf7b; CI runs 32745086262 (last green), 33058290975

### Red CI that no sign-off depends on stays red

CI failed on every branch, `main` included, from 2026-08-25 to 2026-08-27. Four waves of phase-03
work were planned, executed, merged and signed off during that window. Nothing forced the question,
because each wave was verified locally, each local run was green, and the red pipeline was reported
as a known-carried concern rather than a gate.

**Context:** The habit that fixes this is a gate, not vigilance: a wave or phase is done when CI
says so, and a red job blocks advancing instead of being carried forward. Recorded as a rule in
`CLAUDE.md` ("CI green is the sign-off"); this entry is why it exists. Note the specific trap that
made local green feel sufficient — see the visual-suite surprise below.
**Source:** `CLAUDE.md`; commit 79d2133

## Surprises

### A visual-regression suite can be green while photographing the wrong element

`components-ui-menu--open`'s committed baseline was a **1×1 PNG, 87 bytes**. `modal--open`'s was
its 108×40 trigger button rather than the 448×75 modal; `toast--default`'s was a 1408×384 wrapper
rather than the 384×78 toast. The suite passed for months because the capture and the baseline were
wrong in the *same* way — `gotoStory` fell back to `#storybook-root > *` for portalled stories, and
the baselines had been generated through that same fallback. Twenty stories asserted nothing.

**Impact:** Nothing in the pipeline could surface it, and one config line guaranteed local runs
never would: `playwright.config.ts` sets `ignoreSnapshots: !process.env.CI` (ADR tech/0008), so
off-CI every `toHaveScreenshot` is a silent no-op and a fully green local visual run proves only
that the specs executed. Prefix with `CI=1` to compare against baselines locally. When a baseline is
in question, read its pixel dimensions before its pixels — a component that is 1×1, or exactly the
size of its own trigger, is a capture bug wearing a passing check.
**Source:** PR #3; `visual/primitives.visual.spec.ts`

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
