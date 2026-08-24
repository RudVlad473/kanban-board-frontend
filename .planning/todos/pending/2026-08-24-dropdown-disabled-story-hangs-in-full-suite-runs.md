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
