---
created: 2026-08-22T18:08:56.388Z
title: Fold e2e seeding logic into a single service/module
area: testing
severity: minor
files:
  - e2e/seed.ts
  - e2e/seed.sh
  - e2e/theme.e2e.spec.ts
---

## Problem

The user asked to consolidate e2e seeding into one module — there's already a designated one
(`e2e/seed.ts` wrapping the curl-based `e2e/seed.sh`, per ADR tech/0022/D-07), but it isn't the
*only* seeding path in practice.

Concrete example found while investigating: `e2e/theme.e2e.spec.ts` declares its own
`signUpDirectCapturingTheme()` helper (a duplicate direct `fetch()` POST to the sign-up endpoint,
separate from `seedAccount()`), with a doc comment explaining why: `seed.sh`'s `account` command
doesn't return the `theme` field the backend assigns on signup, and `THEME-03` needs that
pre-mutation baseline. So this isn't gratuitous duplication — it's a real gap in `seed.ts`/`seed.sh`'s
account-seeding output that made a bespoke workaround necessary.

The `theme.e2e.spec.ts` file-level comment also notes THEME-01 drives the real sign-up *form*
(not `seedAccount()`) deliberately, to keep the account within the backend's two-concurrent-session
cap across sign-up plus a later sign-in — so not every direct-signup path is a bug to fix; some are
intentional per docs/adr/tech/0022's session-budget constraint. Any consolidation needs to
distinguish "seed.ts is missing a field/capability" (fix the module) from "this spec deliberately
needs the real form/flow, not a seeded shortcut" (leave alone).

Separately, as Phase 2 (board management) and later phases add more entities (columns, tasks,
subtasks), each will likely need its own `seed<Entity>()` — worth designing the module's shape now
so those land inside it by default rather than each spec growing its own ad-hoc seeding helper the
way `theme.e2e.spec.ts` did.

## Solution

TBD — needs discussion with the user on the actual design before implementing. Starting points:

- Immediate, concrete fix: extend `e2e/seed.sh`'s `cmd_account` to also emit the `theme` field from
  the signup response (small `build_json` addition) and `SeededAccount`'s type in `e2e/seed.ts` to
  include it, then delete `signUpDirectCapturingTheme()` in `theme.e2e.spec.ts` and use
  `seedAccount()` instead. Closes the one confirmed duplication.
- Audit for other spec-local duplicate seeding/signup helpers beyond this one instance — only one
  found so far, but the audit itself wasn't exhaustive against future specs.
- Design question for future entities (columns, tasks, subtasks as Phase 2/3 land): should
  `e2e/seed.ts` grow one function per entity (`seedColumn`, `seedTask`, ...) following the existing
  `seedBoard`-style shape, or move to a more structured "seeder service" (e.g. a small class/object
  wrapping the session/jar state so cascading creates — account → board → column → task — don't
  need every caller to thread `jsessionId`/`userId` through by hand)? Needs a decision before more
  entities accumulate more one-off helpers.
