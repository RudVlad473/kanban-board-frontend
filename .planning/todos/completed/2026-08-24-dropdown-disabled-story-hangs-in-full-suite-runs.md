---
created: 2026-08-24T23:20:00.000Z
title: dropdown "Disabled" story hangs (~405s) in full-suite runs but passes alone
area: tooling
severity: major
files:
  - src/components/ui/dropdown/dropdown.stories.tsx
  - vitest.config.ts
---

## Problem

`src/components/ui/dropdown/dropdown.stories.tsx > Disabled` reports a ~405,616ms duration in a
`pnpm test` full-suite run and fails. The same test passes in 22.5s as part of `pnpm test:a11y`
(storybook project alone, 18 files / 109 tests, all green).

A 405-second duration is a hang, not slowness — no assertion is being evaluated for that long.

This was previously invisible. Before 2026-08-24 the full suite failed 15, 5, 12 and 5 tests on
four runs of identical code, with a different set each time, purely from two Chromium projects
competing for an 8-CPU/3GB-free box. Capping `maxWorkers: 2` and giving each Chromium project its
own `sequence.groupOrder` cut that to 0-2 failures per run — and what remains is this one real
defect that the noise was hiding.

## Suspected cause

Not contention: `groupOrder` already prevents the `browser` and `storybook` projects from running
at the same time. More likely Chromium memory from the preceding group is not reclaimed before the
storybook group starts, on a box with ~3GB free. A story-level interaction that waits on a
disabled control (which never becomes interactive) would then wait indefinitely rather than fail
fast.

## Do not

Do not raise `testTimeout` to make this pass. It would hide the hang, delay every genuine hang by
the same margin, and return CI to the state where real failures are indistinguishable from noise.

## Next steps

- Reproduce with the `browser` group forced to run immediately before `storybook`.
- Check whether `Disabled` awaits something that a disabled control never satisfies.
- Consider whether the two Chromium projects should share one browser instance pool.

## Resolution (plan 04-01, 2026-08-28)

Closed with a diagnosis: **the `Disabled` story was never hanging.** Three independent findings.

1. **The suspected cause is refuted at the source.** `dropdown.stories.tsx` declares no `play`
   function, and `scripts/check-no-play-functions.mjs` (D-05, ADR tech/0025) enforces repo-wide
   that no story does — `pnpm stories:check` passes. There is nothing in the story to await. Per
   story the `storybook` project runs only a render plus the a11y addon's axe `afterEach`.
2. **405s cannot be execution time.** Browser-mode `testTimeout` defaults to 15000ms and this repo
   sets no override, so a test genuinely running would have been aborted at 15s. The recorded
   405,616ms is 27x that, and is roughly one whole full-suite run.
3. **Measured directly in the failing configuration.** In a full-suite run with the `storybook`
   group immediately after `browser`, under ~1.5 GB available memory and six concurrent agents,
   `Disabled` completed in **140ms** — the same order as its siblings (`Loading` 127ms,
   `Long Item List` 152ms, `Closed` 587ms).

The mechanism is Chromium starvation. When the tester is starved, the in-browser runner that
enforces `testTimeout` is starved with it, nothing bounds the test, and whichever test is in
flight absorbs the run's remaining wall clock and is reported as the failure. **The victim is
arbitrary**, which is the diagnosis's falsifiable prediction and the reason it is not a story
defect: on 2026-08-28 the same starvation produced
`add-board-modal.test.tsx > hands the typed board name to the submit handler` instead (15450ms
elapsed, leaving `locator.click: Timeout 206ms exceeded`), and a later run collapsed outright with
`[birpc] rpc is closed, cannot call "createTesters"` after 50/95 files. Had the cause been this
story, the victim would always have been this story.

Changes made: the missing `Dropdown.Root isDisabled` behavioural coverage was added to
`dropdown.test.tsx` (only `isLoading` and item-level `isDisabled` were covered before), the
measurement is recorded on the story itself so the question is not reopened, and CONVENTIONS.md's
"the residue is not contention" claim — which is what propagated the misdiagnosis — is corrected.
`vitest.config.ts` is untouched: no `testTimeout` raise, no retry, no worker-count tuning.
