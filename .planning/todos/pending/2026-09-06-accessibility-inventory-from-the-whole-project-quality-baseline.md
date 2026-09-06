---
created: 2026-09-06T00:00:00.000Z
title: Accessibility inventory from the 04-24 whole-project quality baseline
area: ui
severity: major
files:
  - app/(auth)/layout.tsx
  - src/features/tasks/components/task-card/task-card.tsx
  - e2e/quality-baseline.json
---

## Problem

04-24 turned `qualityGates` on for every test in the `e2e` project (79 tests, 24 files) and
recorded what an `@axe-core/playwright` scan already finds true today. Fixing any of this is
explicitly out of this todo's scope (D-J) — it exists so the findings are visible and actionable,
not lost inside `e2e/quality-baseline.json`.

Four distinct rule ids fire across the whole suite, recorded per test as an occurrence COUNT
(D-L) so a violation spreading across a route — not just a new kind of violation — is what the
gate catches:

| Rule id | axe impact | Tests it fires on | Total occurrences | Likely surface |
|---|---|---|---|---|
| `region` | moderate | 18 | 123 | Content outside a landmark on the `(auth)` sign-in/sign-up pages |
| `landmark-one-main` | moderate | 18 | 18 | Same 4 specs as `region` — no `<main>` outside `(dashboard)/layout.tsx` |
| `page-has-heading-one` | moderate | 16 | 16 | The same 4 auth-adjacent specs, plus 3 board specs whose page has no `<h1>` |
| `color-contrast` | serious | 4 | 12 | `theme.e2e.spec.ts`'s dark-mode pass; matches the known `opacity-50` muted-caption finding already flagged in `task-card.stories.tsx:127` (2.01:1, needs 4.5:1) |

`region` and `landmark-one-main` fire on exactly the same 4 specs — `auth.e2e.spec.ts`,
`cookie-policy.e2e.spec.ts`, `route-guard.e2e.spec.ts`, `session-bridge.e2e.spec.ts` — all of
which spend part of their run on `app/(auth)/layout.tsx`'s sign-in/sign-up pages. Those pages
render outside `app/(dashboard)/layout.tsx`'s `<main className="flex min-h-0 flex-1 flex-col">`,
so `landmark-one-main` fails there and everything on the page counts as `region`-violating
content. `page-has-heading-one` fires on the same 4 plus `boards-delete`, `boards-detail` and
`theme` — likely a transient loading/empty state with no `<h1>` rendered yet at scan time.

Three rule ids were classified flaky across their spec's record-mode runs (present in some but
not all observations, so they are ungated in both presence and count per D-E/D-L) and are NOT in
the table above: `document-title` (1 test, `optimistic-guards.e2e.spec.ts`'s OPT-01 middle-click
case), `color-contrast` on `theme.e2e.spec.ts`'s THEME-03 case (the 4/12 counted above is from
the 3 stable occurrences elsewhere), and `color-contrast` on `optimistic-guards.e2e.spec.ts`'s
OPT-01 sidebar-row case (found live during 04-24's own `pnpm verify` run — a fourth, independent
observation the 3-repeat record run had not carried — and resolved by the documented remedy: a
scoped re-record, `pnpm e2e:baseline e2e/optimistic-guards.e2e.spec.ts`, never a hand-edit).

**One test's layout-shift reading spiked in the whole-suite recording run, then did not
reproduce on an isolated re-record.** `optimistic-guards.e2e.spec.ts`'s OPT-01 sidebar-row case
read 0 twice and 0.016419 once across the whole-project 79-test, 3-repeat record run — a spread
too wide to explain as this interaction's own behavior. The scoped re-record above (triggered by
the `color-contrast` flake, not by this reading) re-ran the same interaction three more times in
isolation and got three clean near-zero results (~1.8e-5, matching the suite's median). That
points at full-suite resource contention during the original 79-test parallel run as the likely
cause, not a defect in this interaction — so no test's `layoutShiftScore` was left permanently
ungated in the committed baseline. `e2e/quality-baseline.ts`'s `DEFAULT_QUALITY_TOLERANCES`
(`layoutShiftFloor: 0.01`, `layoutShiftTolerance: 1.5`) were confirmed, not raised, against the
whole suite's clean spread (median 1.8e-5, highest stable-scoped reading 0.00305 — both
comfortably inside the existing constants' margin). If a future whole-suite record run reproduces
a similar spike on a different test, that would be evidence against the contention hypothesis and
worth investigating as a real per-test flakiness source rather than assumed away a second time.

## Why it is filed rather than fixed

D-J forbids any edit under `src/` or `app/` in 04-24 — an unreviewed product/accessibility change
riding inside an infrastructure plan would not be reviewable on its own terms. Fixing any row
above costs nothing at the gate itself: the gate is one-directional (D-E), so a fix always PASSES
and prints an improvement line naming the scoped `pnpm e2e:baseline <spec>` re-record command —
it never turns the build red. A reader who assumes an equality gate will over-estimate the cost
of every row here.

## Verification

Reproduce the `region`/`landmark-one-main` pair on `auth.e2e.spec.ts`: run
`pnpm exec playwright test --project=e2e e2e/auth.e2e.spec.ts` against the unfixed
`app/(auth)/layout.tsx` and read the axe violation nodes in the trace, or drive
`http://localhost:<e2e-port>/login` through the running app and run an axe scan by hand — the
sign-in form renders with no ancestor `<main>` and no landmark wrapping the page's own content.
