---
created: 2026-08-21T00:00:00.000Z
title: Trim boards schema unit tests that just re-test zod's own primitives
area: testing
severity: minor
files:
  - src/features/boards/schemas.unit.test.ts
---

## Problem

`src/features/boards/schemas.unit.test.ts`'s rejection cases (`"rejects a payload whose version is
a string"`, `"rejects a payload missing id"`, `"rejects a value that is not an array"`) don't
encode any project-specific knowledge — they confirm `z.number()`/`z.object()`/`z.array()` behave
the way zod's own docs already promise, not a real business/API-contract rule. The only real value
is catching a schema-definition typo (e.g. an accidental `.optional()`), which is a thin
justification for four dedicated cases.

Contrast with `src/features/auth/schemas.unit.test.ts`, which stays: its cases encode real,
backend-mirrored business rules (password length/complexity, display-name charset) per
`01-19-SUMMARY.md` — not framework behavior. That file is not in scope for this todo.

## Solution

Review `boards/schemas.unit.test.ts` and cut or consolidate the cases that only restate zod's own
type-checking, keeping only assertions that would catch a real schema-shape regression specific to
this project's contract.
