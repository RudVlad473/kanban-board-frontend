---
created: 2026-09-06T00:00:00.000Z
title: Migrate the two shipped specs' isServerActionPost copies onto e2e/quality-fixtures.ts's export
area: testing
severity: minor
files:
  - e2e/optimistic-guards.e2e.spec.ts
  - e2e/boards-switch.e2e.spec.ts
  - e2e/quality-fixtures.ts
---

## Problem

`isServerActionPost` — a POST carrying a `next-action` header, the discriminator this app's
Server Action writes share — is now defined identically in three places:
`e2e/optimistic-guards.e2e.spec.ts`, `e2e/boards-switch.e2e.spec.ts`, and (as of 04-23)
`e2e/quality-fixtures.ts`, which also exports it as the default `match` predicate for the
opt-in `optimisticRoute` fixture task 3 adds.

04-23's plan explicitly scoped out touching the two shipped specs — they are CI-green and out
of that plan's blast radius — so the duplication is deliberate for now, not an oversight.

## Solution

Once `e2e/quality-fixtures.ts` is stable (past 04-24, which turns the gate on for the shipped
specs), delete the two inline copies and import `isServerActionPost` from
`./quality-fixtures` instead. Low risk, mechanical — the three definitions are byte-identical
today.
