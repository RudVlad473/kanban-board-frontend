---
created: 2026-08-22T14:43:49.356Z
title: Investigate centralizing vi.mock declarations for next/headers etc.
area: testing
severity: minor
files:
  - docs/adr/tech/0020-no-mocking-policy.md
  - vitest.setup.ts
---

## Problem

ADR tech/0020's "Surviving mock register" lists 8 files that each redeclare their
own `vi.mock("next/headers", ...)` / `vi.mock("next/navigation", ...)` shim
(`session.test.ts`, `cookie-client.unit.test.ts`, `theme-cookie.unit.test.ts`, the
three auth action integration tests, `load-boards.integration.test.ts`,
`update-theme.integration.test.ts`, `server-client.integration.test.ts`,
`sidebar.test.tsx`). The user asked whether a dedicated shared module could
declare these once instead of per file.

This is a distinct question from the existing todo
`2026-08-22-investigate-a-shared-integration-testing-mocking-module-for-.md`,
which is about consolidating the per-action Storybook *stub* files
(`sign-in-action-storybook-stub.ts` etc.) — this one is about the `next/headers`/
`next/navigation` framework-shim `vi.mock` calls themselves.

## Solution

TBD — needs a spike, not just a decision. `vi.mock` is hoisted and file-scoped by
Vitest, so a shared setup file *can* register the mock globally (e.g. in
`vitest.setup.ts` or a dedicated `src/test-utils/next-headers-mock.ts`), but
per-test return-value overrides need a shared mutable handle — e.g. export a
`vi.fn()` from the shared module that each file's `vi.mock("next/headers", ...)`
factory delegates to, and tests reconfigure via `vi.mocked()`. Needs a small spike
to confirm this doesn't fight Vitest's mock-hoisting order across the 8 files
before committing to the approach. Feeds Phase 02.2 (Storybook test-unification
follow-up) — worth resolving as part of that phase's planning rather than in
isolation.
