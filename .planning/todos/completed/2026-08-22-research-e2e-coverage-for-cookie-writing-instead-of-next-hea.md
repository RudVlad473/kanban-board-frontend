---
created: 2026-08-22T14:43:49.356Z
title: Research e2e coverage for cookie-writing instead of next/headers mocks
area: testing
severity: minor
files:
  - src/lib/server/cookies/cookie-client.unit.test.ts
  - src/lib/server/cookies/theme-cookie.unit.test.ts
  - src/lib/server/session.test.ts
  - docs/adr/tech/0020-no-mocking-policy.md
---

## Problem

ADR tech/0020's D-19 carve-out permits mocking `next/headers`'s `cookies()` in unit/
integration tests because "no Next.js request scope exists inside a plain Vitest
run" — 8 files in the ADR's "Surviving mock register" currently rely on this shim
(`cookie-client.unit.test.ts`, `theme-cookie.unit.test.ts`, `session.test.ts`, the
three auth action integration tests, `load-boards.integration.test.ts`,
`update-theme.integration.test.ts`, `server-client.integration.test.ts`).

The user asked whether cookie-writing behavior (session cookie, theme cookie)
could instead be proven via real e2e tests against a real running Next.js server,
which has a genuine request scope and needs no shim at all — trading the mock away
entirely rather than carving out an exception for it.

## Solution

TBD — needs research. Open questions to resolve:
- An e2e test would eliminate the `next/headers` shim for whatever it covers, but
  loses the ability to cheaply exercise specific edge-case branches (expired,
  malformed, tampered cookie, JWT verification failure) without booting the full
  app + real backend for each case — worth weighing that cost against the shim's
  policy cost.
- Could be a hybrid: keep unit-level coverage for pure decode/encode/verify logic
  (no `cookies()` involved), but move anything that specifically asserts
  `cookies().set()`/`.get()` behavior into e2e.
- Feeds Phase 02.2 (Storybook test-unification follow-up) — worth resolving as
  part of that phase's planning rather than in isolation.

## Resolution

Resolved by plans `02.2-05`, `02.2-07` and `02.2-08` (full scope, not the hybrid considered here —
D-13 extended scope to cookie-reading too): every `next/headers`-mocked cookie read/write assertion
migrated to real Playwright e2e (`e2e/session-bridge.e2e.spec.ts`, `e2e/cookie-policy.e2e.spec.ts`,
`e2e/theme.e2e.spec.ts`, `e2e/auth.e2e.spec.ts`); edge cases use `context.addCookies()` per D-15;
pure decode/encode logic that needed no `cookies()` shim was kept and rewritten mock-free
(`session.test.ts` via `verifyToken` directly). Zero `next/headers` mocks remain.
