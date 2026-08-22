---
created: 2026-08-20T00:00:00.000Z
title: Clear the theme cookie on sign-out
area: auth
severity: minor
files:
  - app/(dashboard)/layout.tsx
  - src/features/auth/actions.ts
  - src/lib/server/theme.ts
---

## Problem

Flagged by Phase 01's code review (WR-02, `.planning/phases/01-foundation-auth-preferences/01-REVIEW.md`)
and confirmed by the phase-goal verifier. The non-httpOnly `theme` cookie
(`src/lib/server/theme.ts`) isn't cleared during sign-out
(`app/(dashboard)/layout.tsx:33-34`, `src/features/auth/actions.ts:182-191`). On a shared
browser, a second account signing in right after a first account signs out can briefly render
the first account's theme preference before its own stored `identity.theme` loads.

Does not affect the primary same-account theme-persistence scenario (proven by
`e2e/theme.e2e.spec.ts`'s full toggle → reload → sign-out → sign-in round trip). No cross-account
data exposure — cosmetic/UX only.

## Solution

Clear the theme cookie as part of the sign-out Server Action, same as the session cookie is
cleared today.
