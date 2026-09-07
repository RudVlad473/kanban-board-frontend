# 0035 — Playwright quality-verification fixtures

## Context

`e2e/quality-fixtures.ts` (04-23) built a passive route-level accessibility scan and a document
layout-shift score, plus four opt-in interaction instruments, all wired through a
`test`/`expect` pair extending `@playwright/test`. 04-24 turned the passive half on for every
test in the `e2e` project (79 as of 2026-09-06). 04-25 added the sixth, CDN-injected fixture
(`reactScan`) and closes the harness out. This record exists because three plans' worth of
scope decisions have no other permanent home, and a future reader arrives with one of four
questions, not a desire to re-read three plan files.

## 1. Why is any of this automatic, and why is only some of it?

The harness has six instruments. Exactly two run without being called: `qualityGates` (an
`auto: true` fixture — an axe scan of whatever is on screen at test end, plus a document-level,
input-EXCLUDING layout-shift score) fires on every test that imports `test`/`expect` from this
module, with no call in any test body. The other four — `flickerTracker`, `optimisticRoute`,
`layoutShiftTracker`, `reactScan` — are `{ option: true }` fixtures a test must destructure to
use.

The discriminator is whether an instrument needs a human to name an interaction. "Scan whatever
is on screen at the end" and "how much did this document shift, excluding what the test's own
clicks caused" are both well-defined with no argument — so they are automatic, and
`@typescript-eslint/no-restricted-imports` (`eslint.config.mjs` block 12) makes a spec that skips
them fail `pnpm lint`, verified against both the named-import and the namespace-import
(`import * as`) bypass form (04-24 task 1). A mutation budget, a held write, and an
interaction-scoped shift reading are all defined only against ONE chosen interaction: a
whole-test mutation count over `main` would be dominated by the sign-in and navigations every
spec performs (measured: 12 mutations on a real two-board switch, `MAIN_MUTATION_BUDGET = 25`,
04-23), and a passive write delay would re-open the 2026-09-05 CI hazard on all 79 tests at
once. `reactScan` is opt-in for a THIRD, unrelated reason — see §4.

**The corollary a reader will otherwise find contradictory**: layout shift appears on both sides
of this split. `qualityGates` reads it passively; `layoutShiftTracker` reads it as an opt-in.
What separates them is not two different instruments — it is the `hadRecentInput` filter, a
REQUIRED parameter of one shared installer (`installLayoutShiftObserver`) with no default, so
neither side can inherit the other's answer by omission. The passive gate excludes
input-initiated shifts, which is what makes it standard CLS and comparable across 79 tests that
click wildly different numbers of things; the opt-in tracker includes them, because a shift
caused by the interaction under test is by definition within the input's own window, so
filtering it out there would score the instrument's whole subject at zero. 04-23 falsified this
directly (D-K): over three repeat observations of a task-create interaction, the two readings
came back IDENTICAL (`0.000018374125162760416` in both), because the shift measured was not
itself input-attributed — evidence the filter did what it claims, not evidence it does nothing.

**What would make this false:** a real regression visible only in the entries the passive
reading excludes would call for a second, input-inclusive PASSIVE score, not a flipped filter on
the existing one. An instrument someone finds a defensible argument-free reading for should move
to the automatic side.

## 2. What does the baseline gate, and what does it deliberately not?

`e2e/quality-baseline.json` gates ONE direction. An observed rule id that is neither recorded nor
recorded as flaky is a hard failure; a recorded rule firing on MORE nodes than the baseline
recorded is a hard failure (a violation spreading is a regression); a missing entry is a hard
failure; a vacuous scan (an evaluated-rule total below its measured floor — 90 on a real
board-detail route, 30 as the floor, 04-23) is a hard failure. A recorded id that no longer
fires, or now fires on fewer nodes, is a PASS, reported as an improvement naming the scoped
`pnpm e2e:baseline <spec>` re-record command — fixing an accessibility issue never breaks the
build of the person who fixed it.

**The unit is an occurrence COUNT per rule id, not a set of rule ids.** A set is the obvious
shape, and the harness's first version used it: a set is blind to an existing violation
spreading — one `button-name` violation becoming eleven produces an identical set and passes
green. The rejected alternative, a per-violation node fingerprint, is strictly more precise but
keys on a generated CSS path, so any unrelated DOM restructure turns the build red with no
regression behind it — training exactly the reflexive re-recording that makes a baseline
mechanism worthless.

Equality gating was considered and rejected for three reasons, recorded here because it is the
obvious design and will be proposed again: it puts friction on improvement, which is the wrong
direction; it contradicts the same gate's layout-shift half, which has always passed a score
BELOW its baseline and always will, and two halves of one gate cannot honestly hold opposite
views of what an improvement is; and the `toHaveScreenshot` analogy does not carry, because a
screenshot has no notion of better or worse while a violation count does — strictly fewer
violations is unambiguously not a regression.

**The hole this accepts, in the same breath rather than as a footnote:** nothing FORCES the
baseline to stay tight. A fixed finding sits there as a permitted-but-never-occurring entry
indefinitely, and while it sits there the same regression can return silently. Two properties
bound it, neither a gate: record mode REPLACES a key's entry rather than unioning it, so every
re-record — for any reason — tightens; and every disappeared id is reported at the run that
observes it. As of 04-24's whole-project rollout: 79 tests, 4 distinct rule ids recorded present
(`region` 18 tests/123 occurrences, `landmark-one-main` 18/18, `page-has-heading-one` 16/16,
`color-contrast` 4/12), 3 additional rule ids classified flaky (ungated in both presence and
count).

**What would make this false:** standing improvement reports accumulating into background
noise — as a starting threshold, more than five stale entries left across the suite for longer
than one milestone. The escalation is a SCHEDULED whole-suite re-record that opens a PR with the
diff, so tightening happens on a machine's clock rather than a human's attention — not a return
to equality, which was tried on paper and rejected for the three reasons above.

## 3. Which layout question belongs to which record?

Three records, three non-overlapping questions. `docs/adr/tech/0008` and `docs/adr/tech/0011` own
the STATIC appearance of Storybook design-system components at rest — two PNGs compared, primitives
only, no notion of shift. This harness's passive gate owns cumulative shift over the lifetime of
the real app document a test ends on — the standard-CLS half of §1's split. The opt-in
`layoutShiftTracker` owns shift attributable to one chosen interaction — the input-inclusive half.
None replaces another; none is redundant with another.

The passive reading's known limitation, stated with its consequence rather than left implicit: a
test ending in a reload measures the reload, and shift in a document replaced mid-test (a full
`page.goto`, which drops and re-creates the observer) is not measured at all — only the shift
after the LAST full navigation is captured.

**What would make this false:** a shipped layout regression that neither `toHaveScreenshot` nor
either layout-shift reading caught would mean a fourth question exists that none of the three
records answers, and this section would need a fourth row.

## 4. What did this cost, and what was deliberately not added?

No `VERIFY_STEPS` entry and no `.github/workflows/ci.yml` step: `e2e/**/*.e2e.spec.ts` already
matches the `e2e` project's existing glob, and both the pre-push hook and CI already run that
project — adding a step would land as an `uncovered-step` violation (`scripts/check-ci-gate-coverage.mjs`,
D-B). `react-scan` is CDN-injected and opt-in rather than installed (D-D) — absent from
`package.json` and `pnpm-lock.yaml`, so no push depends on `unpkg.com` being reachable.
`full-app.e2e.spec.ts` stays outside the rollout (D-H) because nothing runs it on a schedule that
would keep its own baseline honest.

**Measured cost** (04-24, whole `e2e` project, 79 tests, 2026-09-06): local wall clock rose from
162.2s to 175.4s — **+13.2s, +8.1%**. CI's `e2e` job (a smaller runner, `retries: 2`) rose from
220s to 253s — **+33s, +15%**. Both comfortably inside the plan's own 90s local budget; neither
narrowing lever (scoping the axe scan to the `<main>` landmark, or dropping the best-practice
rule family via tags) was applied, because both narrow coverage and that was left to the
checkpoint at the end of 04-24.

A clean, isolated `pnpm verify` run taken during this plan's own work (2026-09-07, with 04-24's
gate live and no other e2e-heavy operation preceding it in the same session) measured **381789ms
(6m22s) total**, of which the `e2e` project itself was **140724ms (2m21s)**. This supersedes both
`CLAUDE.md`'s previously recorded 5m14s (measured before the gate existed, quick task `260904-e3z`)
and this file's own previous "~7min" figure (04-24's own measurements, taken amid a dense run of
consecutive e2e-heavy operations in one session, which 04-24's SUMMARY itself flagged as a likely
confound). 6m22s is the number to trust going forward; it sits between the two superseded figures
because it is a single, isolated measurement rather than a session-contended one.

**What would make this false:** a materially different measurement taken on a genuinely idle
machine, with no other process contending for CPU/IO, would supersede 6m22s in turn — this figure
carries its own date and conditions for exactly that reason, not as a permanent constant.

### Observed behaviours

The following were determined empirically, by running them — not documented upstream, and not
findable from the code alone.

- **The DOM property that mirrors an element's `class` attribute throws on an SVG element.**
  `Element.className` is an `SVGAnimatedString` on an SVG element, not a string, and calling
  `.split()` on it throws — silently killing the `MutationObserver` callback that
  `flickerTracker`'s selector derivation runs inside, with no visible error (04-23, T-04-47). The
  fix reads `getAttribute("class")` instead, which returns a plain string for every element kind.
  **What would falsify this:** a future browser or DOM spec revision making `className` a plain
  string on SVG elements would make the `getAttribute` form merely redundant, not wrong.
- **A fixed delay is safe on reads, hazardous on writes.** `boards-switch.e2e.spec.ts` holds every
  read for 3000ms and has been CI-green throughout. A long fixed delay on a WRITE is not:
  `optimistic-guards.e2e.spec.ts` had to become a release GATE (not a bounded delay) after a fixed
  hold outlived its assertions and turned a locally-green suite red on CI on 2026-09-05 — the
  shared nonprod backend refused the create once the window widened. `optimisticRoute`'s delay form
  is for a BOUNDED window only; the release-gate shape remains the right tool for a hold long
  enough to reproduce that hazard. **What would falsify this:** a call site needing a delay long
  enough to reproduce the same failure should switch to the release-gate shape, not raise
  `delayMs`.
- **The option-tuple fixture declaration shape is what `pnpm lint` accepts; a bare two-parameter
  arrow is not.** `docs/adr/tech/0016`'s `no-restricted-syntax` selectors target
  `Property > ArrowFunctionExpression` with `params.length >= 2` among other shapes; the
  `fixtureName: [fn, options]` array-tuple form used throughout this file places the two-parameter
  fixture function as an `ArrayExpression` element, which none of those selectors match — verified
  live with a scratch spec carrying both shapes before this file's first line was written (04-23).
  **What would falsify this:** a future ESLint config revision adding an `ArrayExpression`-scoped
  selector to that rule would need this file's fixtures rewritten to match.
- **`testInfo.setTimeout()` called from a fixture's OWN teardown does extend the enforced budget,
  in Playwright 1.62.1** — verified with a scratch test capped at `test.setTimeout(2000)` that
  survived a 5-second sleep in its teardown after calling
  `testInfo.setTimeout(testInfo.timeout + 15_000)` (04-23). One subtlety: reading `testInfo.timeout`
  back immediately after the call does NOT reflect the increase — the getter reads a different
  internal slot object than the one `setTimeout()` mutates — so the extension is real but not
  observable through that getter. **What would falsify this:** a Playwright upgrade unifying those
  two internal slots would make the getter accurate; until then, trust the survived-sleep
  behavior, not the getter's return value.
- **`@typescript-eslint/no-restricted-imports` with `importNames` DOES report a namespace import**
  (`import * as x from "mod"; x.test(...)`), contrary to a widely-repeated belief that it only
  matches named specifiers — verified on this repo's ESLint 10.8.1 (04-24 task 1, against the real
  config, not a scratch reproduction). `import type { X }` and `import type * as X` both stay
  allowed under `allowTypeImports`. What it does NOT catch: a dynamic `await import("mod")`, and an
  indirection through a local module that re-exports `test`/`expect` under different names.
  **What would falsify this:** a future ESLint major version changing `no-restricted-imports`'s
  namespace-import handling would need this repo's own bypass-coverage claim re-verified, not
  assumed to still hold.
- **Flat config REPLACES a rule's options per matched file; it never merges them.** A second
  `no-restricted-syntax` (or any other multi-option rule) block scoped to a subdirectory silently
  drops every selector the repo-wide block carried for those files — `eslint.config.mjs`'s own
  comments 4c and 8d-2 already record this, and it is why block 12 (04-24's `no-restricted-imports`
  scope) was added as its OWN block rather than folded into an existing one. **What would falsify
  this:** an ESLint flat-config version that starts deep-merging per-file rule options across
  matching blocks would remove the trap this documents — until then, any rule extended for a
  narrower glob needs its own block, repeating the wider block's options if both are wanted.

## Sources

- `docs/adr/tech/0008-visual-regression-tool.md`, `docs/adr/tech/0011-visual-regression-scope.md` —
  the STATIC-appearance record this harness's layout-shift half is not a duplicate of.
- `docs/adr/tech/0030-optimistic-writes-via-the-query-cache.md` — the `next-action` mechanism
  `optimisticRoute` observes and never duplicates.
- `docs/adr/tech/0016-named-object-parameters.md` — the signature rule whose `no-restricted-syntax`
  selector shape decided this file's option-tuple fixture declaration.
- `.planning/phases/04-task-subtask-workflow/04-23-SUMMARY.md`,
  `.planning/phases/04-task-subtask-workflow/04-24-SUMMARY.md` — every measured number cited above.
- `eslint.config.mjs` comments 4c, 8d-2, and block 12 — the flat-config replace-not-merge
  observation and the `no-restricted-imports` enforcement this record cites.
- A clean, isolated `pnpm verify` run taken 2026-09-07 during this plan's own execution (see §4).
