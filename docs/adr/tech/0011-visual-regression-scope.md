# 0011 — Visual regression scope: primitives only, for now

## Context

`docs/adr/tech/0008` chose the visual-regression *tool* (Playwright-native `toHaveScreenshot`)
and stated scope loosely as "Storybook design-system components," without drawing a hard line
between the `components/ui/` primitive library and feature-level components that also happen to
have Storybook stories. In practice, that ambiguity was already resolved permissively: plan
01-12 (sign-up/sign-in forms) and plan 01-14 (theme toggle) both include creating their own
`visual/auth.visual.spec.ts` / `visual/theme.visual.spec.ts` and dispatching CI baselines for
them, exactly like the seven `components/ui/` primitives.

This is a direct user decision, made during the wave 9 (01-09) checkpoint review while
discussing the visual-regression pipeline's mechanics: extending screenshot generation to every
future component (not just primitives) is a bigger performance/maintenance question — more
Storybook stories to build, more baseline PNGs to generate and store, more surface area for the
baseline-poisoning risk already logged as a todo — that deserves its own deliberate policy
decision rather than defaulting to "yes" by accretion, one plan at a time.

## Decision Outcome

**For now, Playwright visual-regression coverage is scoped to `components/ui/` primitives only.**
Feature-level components (auth forms, theme toggle, and everything in later phases —
boards/columns/tasks UI) get Storybook stories and Vitest Browser Mode + axe coverage as normal,
but do **not** get a `visual/*.visual.spec.ts` entry or CI-generated screenshot baselines until a
separate policy decision extends this scope deliberately.

Plans 01-12 and 01-14 (already authored, not yet executed) are amended to drop their
`visual/auth.visual.spec.ts` and `visual/theme.visual.spec.ts` deliverables accordingly — the
`.stories.tsx` files themselves stay (still useful for manual Storybook review and the a11y
project), only the visual-regression spec entry and baseline generation are removed.

## Consequences

- `visual/primitives.visual.spec.ts` remains the only visual-regression spec file for the
  remainder of Phase 1.
- Feature-level UI (auth screens, theme toggle) has no automated defense against visual
  regressions beyond manual review and the a11y/behavioral test suites — accepted as the
  tradeoff for this decision, for now.
- The broader policy — whether/how to extend visual regression to feature components in later
  phases (boards, columns, tasks) — is an open decision, not resolved here. It should weigh the
  performance/storage cost this ADR's context flagged (more stories × more baselines × two
  viewports since ADR tech/0010's mobile-first retrofit) against the coverage gap this ADR just
  accepted.

Unwind trigger: a real visual regression ships in a feature component that primitive-only
coverage couldn't have caught, and manual review missed → revisit scope with the actual
performance cost measured against that concrete cost of not having it.
