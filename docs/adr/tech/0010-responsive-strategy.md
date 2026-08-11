# 0010 — Responsive strategy: mobile-first, dual desktop/mobile story coverage

## Context

Through wave 8 of Phase 1, the seven design-system primitives (Button,
IconButton, TextField, Checkbox, Switch, Dropdown, Modal) were built and
styled without a stated responsive methodology, and Storybook stories
covered only a single (implicitly desktop) viewport. Breakpoint tokens
(`breakpoint.mobile: 375px`, `breakpoint.tablet: 768px`,
`breakpoint.desktop: 1440px`) already exist in the DTCG token pipeline
(plan 01-04) but were not yet load-bearing for any layout decision.

This is a direct user decision made during the wave 9 (01-09, Modal)
sign-off checkpoint review, not a researched options comparison — recorded
here as a decision record because it changes how every subsequent plan
must build and verify UI, the same class of constraint the rest of this
project's ADRs already govern.

## Decision Outcome

**Mobile-first CSS, and two Storybook story variants (desktop + mobile)
per component going forward — retroactively applied to all seven existing
primitives before Phase 1 continues past wave 9.**

- Base (unprefixed) Tailwind utility classes target the mobile breakpoint;
  `md:`/`lg:` (or equivalent) prefixes progressively enhance for tablet
  and desktop, per the existing `breakpoint.*` tokens.
- Every component's Storybook stories are authored/reviewed for two
  viewport parameters: a mobile viewport (375px, matching
  `breakpoint.mobile`) and a desktop viewport (1440px, matching
  `breakpoint.desktop`). Tablet is not a separate mandatory story tier;
  revisit if a component's tablet rendering meaningfully diverges from a
  simple interpolation between the two.
- Enforcement: Storybook viewport addon/parameter configuration (added to
  `.storybook/preview.ts`) plus code review — a new or changed story
  missing its mobile/desktop pair is a review-blocking gap, the same
  weight as a missing axe-clean check.

## Consequences

- Wave 9 (01-09, Modal) and all six already-merged primitives (waves
  6-8) are retrofitted for mobile-first styling and dual story coverage
  before wave 10 begins — tracked as part of resolving 01-09's checkpoint,
  not a separate deferred phase.
- Every future primitive and feature-level component story (auth forms,
  board/task UI in later phases) is expected to follow the same dual-story
  pattern from first authorship — no further retrofit debt should
  accumulate the way it did for waves 6-8.
- Visual-regression baselines (docs/adr/tech/0008) double in count per
  affected story (desktop + mobile instead of one), still generated
  CI-only per that ADR's existing constraint.

Unwind trigger: if dual-story authorship proves to meaningfully slow
every future plan without catching real responsive bugs, revisit scoping
the mobile variant to components with actual layout-sensitive behavior
(Modal, Dropdown) rather than every primitive unconditionally.
