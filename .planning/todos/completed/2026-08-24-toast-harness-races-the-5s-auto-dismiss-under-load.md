---
created: 2026-08-24T15:13:46.936Z
title: Toast harness races Base UI's 5s auto-dismiss under full-suite load
area: testing
severity: minor
files:
  - src/components/ui/toast/toast.test.tsx
  - src/components/ui/toast/toast.stories.tsx
---

## Problem

`Toast (MOBILE) > reserves room for the close button so a wrapped title never runs under it`
failed 1 run in 8 during `pnpm test` on 2026-08-24 with:

```
VitestBrowserElementError: Cannot find element with locator:
page.getByText('Couldn\'t create 6 column(s): … every one of them failed to save.')
```

The element is missing, not late — the toast had already dismissed itself.

`renderToastHarness` (`toast.test.tsx:44`) renders a bare `<ToastProvider>` with no `timeout`
prop, so every toast it creates inherits Base UI's default auto-dismiss (5s). The `Default` story
deliberately sets `timeout: 0` for exactly this reason (`toast.stories.tsx`, noted at
`toast.test.tsx:56`) — the harness never got the same treatment. Any harness-based test that spends
more than 5s between seeding the toast and querying it loses the element, and under full-suite CPU
contention this one does.

Same failure family as the `text-field.test.tsx` flake fixed the same day: a fixed time budget
racing a browser slowed by contention. Different mechanism (auto-dismiss vs. `testTimeout`), same
shape.

## Solution

Pass `timeout={0}` in `renderToastHarness`'s `<ToastProvider>`, matching the precedent the
`Default` story already sets, so no harness test races the dismiss timer. Tests that specifically
want to assert auto-dismiss behavior should opt into a real timeout locally rather than relying on
the provider default.

Verify the same way the text-field flake was: repeat `pnpm test` 8+ times and confirm this file
stays clean (it failed 1/8 before the change).

## Resolution (plan 04-01, 2026-08-28)

Fixed as proposed: `renderToastHarness` renders `<ToastProvider timeout={0}>`. Written test-first
— the RED case seeds a harness toast, advances a fake clock past 5000ms and asserts the element
survives; it failed at both viewports before the change and passes after. A companion case pins
the opt-in route (a per-toast `timeout` at the call site still auto-dismisses), so the provider
default cannot be relied on by accident. Base UI schedules dismissal through a plain `setTimeout`,
which is what makes a fake clock able to reach it. No `waitFor`, real `setTimeout`, or raised
`testTimeout` was added. Verified over five consecutive green `pnpm test` runs (1319/1319 each).
