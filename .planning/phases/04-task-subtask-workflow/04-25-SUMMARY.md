---
phase: 04-task-subtask-workflow
plan: 25
subsystem: testing
tags: [playwright, react-scan, adr, quality-gate, e2e, cdn-injection]

requires:
  - phase: 04-task-subtask-workflow
    provides: "04-23's quality-verification harness (comparator, fixtures, record mode) and 04-24's whole-project rollout (79-test baseline, measured wall-clock cost) — this plan adds the sixth fixture and records the scope decisions both made"

provides:
  - "e2e/quality-fixtures.ts — a sixth fixture, reactScan: () => Promise<void>, opt-in, CDN-injected (react-scan@0.5.7 pinned), proving attachment at teardown by reading back window.reactScan"
  - "docs/adr/tech/0035-playwright-quality-verification-fixtures.md — the harness's permanent decision record, grouped by the four questions a future reader arrives with"
  - "docs/review-brief.md — extended with all six harness fixtures (the two automatic ones marked), the optimisticRoute sentence, and measured runtimes"
  - "A proposed CLAUDE.md pointer (not applied — decided at the checkpoint below)"

affects: []

actuals:
  tokens: 8500
  tasks: 2
  commits: 4
  plan_head_before: 39de834167d4ae42116e386befb76aba5e1cd358

tech-stack:
  added: []
  patterns:
    - "TypeScript's no-unnecessary-condition narrows a `let` reassigned only inside a callback argument as if the reassignment always ran (making a later guard read as dead code) — track such state on an object property instead, which is not narrowed the same way."
    - "A CDN bundle's actual public API (the window global it installs, its documented options) is determined by fetching and reading the bundle, or by driving it against a real page — never assumed from a remembered library name."

key-files:
  created:
    - docs/adr/tech/0035-playwright-quality-verification-fixtures.md
  modified:
    - e2e/quality-fixtures.ts
    - e2e/quality-baseline.json
    - docs/review-brief.md

key-decisions:
  - "reactScan's fixture value is a bare async function (not an object of methods like flickerTracker/layoutShiftTracker), matching the plan's own 'resolving to an async function the test calls to opt in.' Attachment proof (T-04-52's mitigation) lives in the fixture's OWN teardown — after the test's navigations, it reads back window.reactScan and throws by name if absent — rather than only in the throwaway probe, so any FUTURE caller inherits the same guarantee, not just this plan's probe."
  - "window.reactScan (not globalThis.__REACT_SCAN__, which is also set by the bundle but only lazily once a render commit is observed) was chosen as the attachment signal: it is the library's own documented public entrypoint (assigned unconditionally at script top-level: `Ku(); window.reactScan = Ku`), determined by fetching the pinned bundle and reading its tail, not recalled from memory."
  - "The probe was left to fail on the missing-baseline-entry message rather than excluded from 04-24's no-restricted-imports glob or given a recorded baseline entry — excluding it would need a permanent eslint.config.mjs exception for a file that no longer exists after this task; recording one would put a throwaway spec's entry into the committed baseline. The probe's own assertions (attachment, render count) run and are captured in stdout before the expected teardown failure, which is what this task needed."
  - "A live pnpm verify run (pre-push, this plan's own commit) reproduced 04-24's exact documented flaky-finding pattern a THIRD time — this time a color-contrast finding on optimistic-guards.e2e.spec.ts, resolved the same documented way (scoped re-record), not a hand-edit. Not this plan's scope to fix the underlying accessibility defect (D-J), but the likely mechanism (the unconfirmed-entity muted styling overlapping the known opacity-50 caption-contrast finding) is recorded in the fix commit for whoever picks up the accessibility inventory todo."

requirements-completed: []

coverage: []

duration: ~1h40m (single continuous session, resumed after 04-24's checkpoint closed)
completed: 2026-09-07
status: halted
---

# Phase 04 Plan 25: Playwright Quality-Verification Fixtures — reactScan and the Decision Record Summary

**Adds the sixth quality-verification fixture (`reactScan`, CDN-injected react-scan@0.5.7, proven to attach against the real app via a deleted throwaway probe: 263 render events captured through the library's own `onRender` option), writes the harness's permanent decision record (`docs/adr/tech/0035`), and extends the reviewer-facing fixture inventory — plan NOT closed, its trailing `checkpoint:human-verify` is presented below, unanswered.**

## Performance

- **Duration:** ~1h40m
- **Tasks:** 2 of 2 code tasks committed; the plan's trailing checkpoint is presented below, unanswered
- **Files created:** 1, modified: 3
- **Commits:** 4 (`7a7eade`, `df81dde`, `fd93384`, `5b8b4fc`)

## Accomplishments

- **The `reactScan` fixture** (`e2e/quality-fixtures.ts`): fetches `https://unpkg.com/react-scan@0.5.7/dist/auto.global.js` (version-pinned, memoized per worker with retry-on-failure rather than poisoning the whole worker on a transient blip), hands the text to `page.addInitScript({ content })` so it executes ahead of the app's own React chunks, and proves attachment at teardown by reading back `window.reactScan` — determined empirically by fetching and inspecting the bundle (`Ku(); window.reactScan = Ku` at the IIFE's tail), not recalled from documentation. `react-scan` is absent from `package.json` and `pnpm-lock.yaml` (D-D); no standing spec destructures it.
- **Proved against the running app**, not asserted: a throwaway probe (`e2e/zz-react-scan-probe.e2e.spec.ts`, deleted after its run, no baseline entry) signed in through a real seeded account, called `reactScan()` before any navigation, then drove a real create-task interaction. Console output: `window.reactScan attached: true`, and `render events observed during the create-task interaction: 263` — captured via the library's own documented `onRender` option, registered by calling `window.reactScan({ onRender: ... })` a second time.
- **`docs/adr/tech/0035-playwright-quality-verification-fixtures.md`**: the harness's permanent decision record, grouped by four questions — why two of six instruments are automatic and four are not (the `hadRecentInput` filter split, D-K, with 04-23's board-switch and task-create readings cited); what the one-directional baseline gate catches and deliberately does not (an occurrence count per rule id, not a set — D-L — with equality gating's three rejection reasons recorded); which of three layout records (`tech/0008`/`0011`, this harness's passive gate, the opt-in tracker) owns which question; and what it cost (04-24's measured +13.2s/+8.1% local, +33s/+15% CI deltas). Carries 4 "what would make this false" statements at the section level plus 6 more in a dated, falsifiable observed-behaviours block (the SVG class-attribute hazard, the read/write delay asymmetry, the fixture-shape ESLint accepts, `testInfo.setTimeout()` from teardown, `no-restricted-imports`' namespace-import reach, flat config's per-file replace-not-merge).
- **Resolved the CLAUDE.md-5m14s-vs-review-brief-~7min disagreement** with a clean, isolated `pnpm verify` run taken during this plan's own work (2026-09-07, no other e2e-heavy operation preceding it in the session): **381789ms (6m22s) total, 140724ms (2m21s) for the `e2e` project alone.** Both prior figures are now stale — CLAUDE.md's predates the gate entirely, and `docs/review-brief.md`'s own prior "~7min" was measured by 04-24 amid a dense run of consecutive e2e-heavy operations that 04-24's own SUMMARY flagged as a likely confound. `docs/review-brief.md`'s runtimes table now carries 6m22s/2m21s with today's date. `CLAUDE.md` itself is untouched (see below).
- **`docs/review-brief.md` extended in three places**: § Fixtures gains a full six-row table (the two automatic fixtures marked), § "Holding a request open" gains the `optimisticRoute`/`next-action` sentence, and the runtimes table carries the measurement above.
- **The proposed `CLAUDE.md` pointer** (NOT applied — `git diff --exit-code CLAUDE.md` passes; decided at the checkpoint below): one line under § "Debug against the real app, not custom scripts":

  > Before hand-rolling a `MutationObserver`, a route delay, or a render counter to debug a specific interaction, check `e2e/quality-fixtures.ts`'s opt-in instruments (`flickerTracker`, `optimisticRoute`, `layoutShiftTracker`, `reactScan`) and the automatic accessibility/layout-shift gate (`docs/adr/tech/0035`) — the harness may already cover it.

## Task Commits

1. **Task 1: reactScan — CDN-injected, opt-in, and proved to attach** - `7a7eade` (feat)
2. **Task 2: Record the decisions and make the harness discoverable** - `df81dde` (docs), followed by two same-scope fix-ups: `fd93384` (fix — a citation correction the ADR's own acceptance criteria required) and `5b8b4fc` (fix — a pre-existing flaky-rule finding surfaced by this plan's own pre-push `pnpm verify`, unrelated to task 2's own content)

## Files Created/Modified

- `e2e/quality-fixtures.ts` — the sixth fixture (`reactScan`), its bundle-fetch memoization, and the `window.reactScan` global augmentation
- `docs/adr/tech/0035-playwright-quality-verification-fixtures.md` — the decision record (new)
- `docs/review-brief.md` — Fixtures table, `optimisticRoute` sentence, measured runtimes
- `e2e/quality-baseline.json` — one scoped re-record (`optimistic-guards.e2e.spec.ts`), see Deviations

## Decisions Made

See `key-decisions` in frontmatter for the four with the most future-reader consequence.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript's `no-unnecessary-condition` false-positived on the attachment-tracking `let`**
- **Found during:** Task 1, first `pnpm lint` after writing the fixture
- **Issue:** `let optedIn = false` reassigned only inside the closure passed to `provideFixture` was narrowed by TS as if the reassignment always ran, making `if (!optedIn) return;` read as dead code (`error Unnecessary conditional, value is always truthy`) — reproduced in isolation with a scratch probe before touching the real fixture, to confirm the mechanism rather than guess at a fix.
- **Fix:** Track the flag on an object property (`const state = { wasCalled: false }`) instead of a bare `let` — TS does not apply the same closure-narrowing to a property mutation. Confirmed the same scratch reproduction passes clean with this shape.
- **Files modified:** `e2e/quality-fixtures.ts`
- **Verification:** `pnpm exec tsc --noEmit && pnpm lint` both clean.
- **Committed in:** `7a7eade`

**2. [Rule 1 - Bug] A comment exceeded the 3-prose-line cap**
- **Found during:** Task 1, `pnpm comments:check`
- **Issue:** The narrowing-workaround comment explaining the object-property choice ran to 4 prose lines.
- **Fix:** Compressed to 2 lines, cutting the restated mechanism detail already covered by this SUMMARY's Deviation #1.
- **Files modified:** `e2e/quality-fixtures.ts`
- **Verification:** `pnpm comments:check` passes.
- **Committed in:** `7a7eade`

**3. [Rule 1 - Bug] The ADR's D-K citation named the wrong interaction**
- **Found during:** Task 2, self-review against the plan's own acceptance criteria before committing
- **Issue:** The acceptance criteria required citing "04-23's two measured readings over one board switch" as the D-K falsification evidence; the first draft cited only the task-create reading (0.0000184 in both accumulators), omitting the board-switch pair (0 in both).
- **Fix:** Added the board-switch reading alongside the task-create one, correctly attributed to each interaction.
- **Files modified:** `docs/adr/tech/0035-playwright-quality-verification-fixtures.md`
- **Verification:** Re-read against the plan's acceptance-criteria text line by line.
- **Committed in:** `fd93384`

**4. [Rule 1 - Bug] A pre-existing flaky accessibility rule finding, surfaced a third time**
- **Found during:** Task 2's own pre-push `pnpm verify` run
- **Issue:** `optimistic-guards.e2e.spec.ts`'s OPT-01 cases failed with `"color-contrast" fired ... time(s) and is not in the baseline` — the exact class of finding 04-24 documented twice already (its deviations #3 and #5), this time on this plan's own push. First hit the "middle click" case; the immediate next isolated run hit the "sidebar row" case (which had ALREADY carried this same flaky classification once in 04-24, before an earlier clean 3/3 re-record dropped it).
- **Fix:** `pnpm e2e:baseline e2e/optimistic-guards.e2e.spec.ts` (scoped re-record, the documented remedy — never a hand-edit). Re-verified 15/15 passing individually and at `--repeat-each=3 --workers=2` with zero flakes after the re-record.
- **Files modified:** `e2e/quality-baseline.json`
- **Verification:** `pnpm exec playwright test --project=e2e e2e/optimistic-guards.e2e.spec.ts --repeat-each=3 --workers=2` — 15/15 passed. CI's `quality` job also failed once on push (see Issues Encountered) and passed clean on rerun, consistent with a genuine flake rather than a code regression.
- **Committed in:** `5b8b4fc`
- **Not fixed here (D-J, out of this plan's scope):** the likely mechanism — the unconfirmed-entity muted styling this spec exercises overlaps the `opacity-50` caption-contrast finding already flagged against `task-card.stories.tsx:127` in the accessibility inventory todo; the axe scan at teardown may be catching the DOM mid-transition between the muted and settled states on some runs but not others.

---

**Total deviations:** 4 auto-fixed (2 bugs found during the plan's own required checks, 1 citation correction against the plan's own acceptance criteria, 1 pre-existing flaky-rule finding resolved per its documented remedy). **Impact on plan:** all four were within the plan's own or the harness's own anticipated failure modes; none changed scope, and none touched `src/`/`app/`.

## Issues Encountered

- **CI's `quality` job failed once on push, on a DIFFERENT and unrelated pre-existing flake.** Run `34094974444`'s first pass failed `board-view.test.tsx`'s "leaves the column row where it was when the create fails" (DESKTOP variant) with `expected 1320 to be +0` on `scrollRow.scrollLeft` — a smooth-scroll-vs-synchronous-read race already tracked in `.planning/todos/pending/2026-09-03-board-view-column-row-scroll-rollback-test-is-flaky-on-ci.md` (previously observed on the MOBILE variant, same file, same mechanism suspected). Not caused by this plan (no file under `src/` was touched); `secrets` was already green. Reran via `gh run rerun 34094974444 --failed`; the rerun passed `quality` clean and completed `visual`/`e2e` (both had been skipped by the short-circuit). Final run: all 4 jobs green, individually confirmed (`quality`, `secrets`, `visual`, `e2e`, all `conclusion: success`).
- **This is the third time in two consecutive plans (04-24, then 04-25) that a live `pnpm verify`/CI run has surfaced a finding the harness's own 3-repeat record mode did not classify as flaky for that exact key.** Two were layout-shift ceiling misses (04-24), one was this plan's `color-contrast` finding. All three resolved cleanly via the documented scoped-re-record remedy with no code change beyond the baseline. The layout-shift pattern already has its own investigation todo (filed at 04-24's checkpoint close-out: `.planning/todos/pending/2026-09-07-investigate-recurring-layout-shift-ceiling-misses-under-full.md`); this plan's `color-contrast` finding is a different rule with a plausible, already-documented root cause (the accessibility inventory's `opacity-50` finding) rather than an unexplained magnitude spike, so no new todo was filed for it — recorded here and in the fix commit instead.

## User Setup Required

None - no external service configuration required. The probe's seeded account (`8qbti1ueoglc`) was created via `pnpm e2e:seed account` and deleted with `pnpm e2e:cleanup --users 8qbti1ueoglc`, scoped per CLAUDE.md's requirement; `.e2e-seeded-users/` confirmed empty afterward.

## Next Phase Readiness

**This plan is NOT closed.** Tasks 1 and 2 are complete, committed, and CI-green (run `34094974444`, all 4 jobs `success`). The plan's trailing `checkpoint:human-verify` task (`gate="blocking"`) is presented in full below and has not been answered. Phase 4's close-out gates (`aggregate_results` → `code_review_gate` → `regression_gate` → `verify_phase_goal` → `update_roadmap`) do not run until this checkpoint is resolved, since 04-25 is the last plan in the phase.

---

## CHECKPOINT: Verification Required

**Type:** human-verify
**Gate:** blocking
**Plan:** 04-25
**Progress:** 2/2 code tasks complete (task 3 is this checkpoint)

### What was built

A quality-verification layer at `e2e/quality-fixtures.ts`, in two halves.

**Automatic, on every one of the 79 tests in the `e2e` project, with no call in any test body:** a route-level accessibility scan and a cumulative layout-shift score for the document each test ends on. Both are checked against `e2e/quality-baseline.json`, which records what was already true so only NEW findings turn a build red — where "new" is either an unrecorded rule id OR a recorded rule now firing on more nodes than the baseline holds, since a violation spreading is a regression and a rule-id set cannot see it (D-L). A finding that DISAPPEARS, or shrinks, passes and is reported as an improvement, so fixing an accessibility issue never breaks the build of the person who fixed it — at the accepted cost that its entry stays in the baseline until someone re-records (D-E). A spec that imports Playwright's `test` object directly fails `pnpm lint`, in both the named and the namespace form.

**Opt-in, because each needs a human to name an interaction:** `flickerTracker` (an in-page `MutationObserver` counting committed mutations per element against a budget), `optimisticRoute` (a bounded, deterministic delay on `next-action` writes only), `layoutShiftTracker` (shift attributable to one chosen interaction, INCLUDING the input-initiated entries the passive gate excludes — D-K), plus `cdp` and the CDN-injected `reactScan` (added this plan — injects a pinned `react-scan` build to instrument React renders, proven by a deleted throwaway probe).

Its own standing spec proves each instrument both fires AND fails when uninstalled, and the comparator that decides pass/fail for the whole suite is unit-tested in both directions. ADR tech/0035 records the scope decisions and the measured behaviours; `docs/review-brief.md` lists the fixtures for reviewers and flags which two are automatic.

### How to verify

Everything measurable is already in the three plan SUMMARYs (04-23, 04-24, this one) with its number — read those first. What is left is judgement no gate makes.

1. **The `CLAUDE.md` pointer.** Task 2 proposed a one-line addition to § "Debug against the real app, not custom scripts" naming the harness (quoted above, under Accomplishments), and deliberately did not apply it. Accept it as written, reword it, or decline. This is the only file in the repo where a future agent would reliably look, so declining means the harness is discoverable from the ADR and the review brief only.
2. **The board-delete stranding bug this harness was built ahead of** — stale board content and a blank title on screen for roughly 520ms before the redirect lands — is deliberately NOT investigated here. Say whether you want it opened as a quick task next, driven with these instruments.
3. **Anything missing for that investigation.** It is cheaper to add a fixture now, while the harness is the thing in context, than after. Say if you know you will want something these six do not give you.
4. **The opt-in three.** `flickerTracker` and `optimisticRoute` stayed manual for a stated reason (they need a chosen interaction, and there is no honest whole-test reading of either). If you disagree — if you would rather have a crude always-on mutation counter than none — say so; that is a design call, and the ADR records the current one as falsifiable rather than settled.

### Awaiting

**Resume-signal:** Type "approved", or list what you want changed before this closes.

Once answered, a continuation agent should close out this plan's SUMMARY (mirroring how 04-24's checkpoint was resolved), update `STATE.md`/`ROADMAP.md`, and then run phase 4's close-out gate sequence (`aggregate_results` → `code_review_gate` → `regression_gate` → `verify_phase_goal` → `update_roadmap`), since this is the last plan in the phase.

---
*Phase: 04-task-subtask-workflow*
*Completed: 2026-09-07 (tasks 1-2; checkpoint pending)*

## Self-Check: PASSED

All 4 commits (`7a7eade`, `df81dde`, `fd93384`, `5b8b4fc`) confirmed present in `git log --oneline --all`. `docs/adr/tech/0035-playwright-quality-verification-fixtures.md` confirmed on disk. `e2e/zz-react-scan-probe.e2e.spec.ts` confirmed absent (`ls e2e/zz-*` — no matches). CI run `34094974444` confirmed green on all four jobs via `gh run view --json status,conclusion,jobs` (`quality`, `secrets`, `visual`, `e2e`, all `conclusion: success`).
