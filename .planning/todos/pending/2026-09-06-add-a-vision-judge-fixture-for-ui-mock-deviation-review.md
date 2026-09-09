---
created: 2026-09-06T14:30:02.507Z
title: Add a vision-judge fixture for UI-mock deviation review
area: testing
severity: minor
files:
  - e2e/quality-fixtures.ts
  - docs/kanban-task-management-web-app.pdf
---

## Problem

The phase-04 quality-verification harness (`e2e/quality-fixtures.ts`: `axe`, `cdp`,
`flickerTracker`, `optimisticRoute`, `layoutShiftTracker`) plus the existing Storybook
`toHaveScreenshot` pixel-diff (ADR tech/0008) are all deterministic/symbolic instruments — they
catch known failure classes (a11y ruleset violations, layout shift, mutation churn, timing) or
regressions against a *previous* snapshot of the same component. None of them catch a *novel*
visual inconsistency against design intent — a spacing/alignment/color/typography deviation from
the actual mock that nobody wrote a threshold for. That comparison currently only happens when a
human (or Claude, per `CLAUDE.md`'s "Compare against the mock" section) remembers to render the
PDF with `pdftoppm` and eyeball it — entirely discretionary, no rubric, no gate.

Raised 2026-09-06 discussing whether the project is well-equipped for AI-driven UI review before
human review, from a neuro-symbolic framing: the symbolic (rule-based/deterministic) half is
solid and growing; the neural (perceptual/judgment) half is still ad-hoc.

## Solution

Add a fixture that captures a screenshot of a changed UI surface and hands it, plus the
corresponding mock crop, to a vision-capable model, returning structured deviations (severity +
location: spacing, alignment, color, typography, etc.) rather than a pass/fail.

Should be **advisory** (flagged for human attention), not a hard CI gate initially — vision-model
judgments carry real false-positive risk, unlike the deterministic fixtures. TBD: exact model,
invocation point (per-PR? per-component-change?), and how findings surface (PR comment, a report
file, a Playwright attachment).
