---
phase: 01-foundation-auth-preferences
plan: 34
subsystem: auth
tags: [server-actions, useActionState, react-19, next-js, generated-client-removal]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences
    provides: "the AuthActionState/AUTH_ACTION_IDLE split and the useActionState + form-action idiom both sign-in and sign-up already use (plan 01-33)"
provides:
  - "src/features/auth/api/auth-actions.ts — signOutAction, the third and final auth Server Action, completing GC-24's carve-out"
  - "src/features/auth/components/sign-out-button.test.tsx — the sign-out control's first behavioural coverage"
  - "This application's own endpoint surface (app/api/**) and the client layer built to call it (auth-api.ts, bff-client.ts, bff-generated-types.ts, docs/api/bff-openapi.json, scripts/generate-bff-openapi.mjs) — all removed, since no such endpoint remains"
  - "A recorded, backend-owned finding (deferred-items.md #6): the real backend's own sign-out route is broken (500), and the upstream session survives every URL form tried"
affects: [01-35, 01-36, 01-37, 01-38, 01-14, 01-15]

# Actuals (#2632)
actuals:
  tokens: 6100
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "signOutAction follows signInAction/signUpAction's exact shape (prevState, formData) -> Promise<AuthActionState>, both parameters underscore-prefixed since sign-out needs neither — consistency with the two established actions mattered more than a leaner signature"
    - "SignOutButton wraps its Button in a bare <form action={dispatch}> the same way sign-in-form.tsx/sign-up-form.tsx do, taking pending state from useActionState directly rather than a TanStack Query mutation + onClick handler"

key-files:
  created:
    - src/features/auth/components/sign-out-button.test.tsx
  modified:
    - src/features/auth/api/auth-actions.ts
    - src/features/auth/api/auth-actions.unit.test.ts
    - src/features/auth/components/sign-out-button.tsx
    - e2e/auth.e2e.spec.ts
    - scripts/check-routes.mjs
    - eslint.config.mjs
    - package.json
    - .planning/phases/01-foundation-auth-preferences/deferred-items.md
  deleted:
    - app/api/auth/signout/route.ts
    - src/features/auth/api/auth-api.ts
    - src/lib/api/bff-client.ts
    - src/lib/api/bff-generated-types.ts
    - docs/api/bff-openapi.json
    - scripts/generate-bff-openapi.mjs

key-decisions:
  - "signOutAction never dials the backend's own sign-out route, in any URL form — it is verified broken (500, upstream session survives), and the URL form that currently happens to answer (200) is an artefact of that defect that would move the moment it's fixed, with no test able to catch the drift. Recorded in deferred-items.md with kanban-board-backend named as owner."
  - "SignOutButton keeps its plain aria-busy={isActionPending}/isDisabled={isActionPending} wiring (no spinner) rather than switching to Button's isLoading prop — matches the original TanStack Query implementation's busy presentation exactly, per the plan's explicit instruction to keep the busy attribute as-is."

requirements-completed: [AUTH-02, AUTH-03]

coverage:
  - id: D1
    description: "A signed-in user can sign out, and the board list then refuses them exactly as it refuses a visitor who never signed in"
    requirement: "AUTH-03"
    verification:
      - kind: e2e
        ref: "e2e/auth.e2e.spec.ts#sign-out > signs out and the board list redirects back to sign-in afterward"
        status: pass
      - kind: unit
        ref: "src/features/auth/api/auth-actions.unit.test.ts#signOutAction > destroys the local session and redirects to sign-in, without calling the backend at all"
        status: pass
    human_judgment: false
  - id: D2
    description: "Sign-out works before JavaScript has hydrated, like the other two auth screens"
    requirement: "AUTH-02"
    verification:
      - kind: integration
        ref: "src/features/auth/components/sign-out-button.test.tsx#submits through the form element's own action, not a click handler, so it works before hydration"
        status: pass
    human_judgment: false
  - id: D3
    description: "No client-side layer for calling this application's own endpoints remains, because no such endpoint remains"
    verification:
      - kind: other
        ref: "test ! -e src/features/auth/api/auth-api.ts && test ! -e src/lib/api/bff-client.ts && test ! -e src/lib/api/bff-generated-types.ts && test ! -e docs/api/bff-openapi.json && test ! -e scripts/generate-bff-openapi.mjs && test ! -e app/api (all pass)"
        status: pass
      - kind: other
        ref: "pnpm routes:check (passed after check-routes.mjs's exclusion list was edited)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The backend's own sign-out route is confirmed broken and recorded as such, rather than being called anyway or quietly ignored"
    verification:
      - kind: other
        ref: "grep -qi \"sign-out route\" .planning/phases/01-foundation-auth-preferences/deferred-items.md"
        status: pass
    human_judgment: false

duration: ~50min
completed: 2026-08-19
status: complete
---

# Phase 01 Plan 34: Sign-Out as a Server Function, Client Layer Removed Summary

**`signOutAction` becomes the third and final auth Server Action, `app/api/**` and its generated BFF client layer are deleted entirely, and the real backend's broken sign-out route is recorded (not worked around) with the backend repository named as owner.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-08-19
- **Tasks:** 2
- **Files modified:** 15 (1 created, 8 modified, 6 deleted)

## Accomplishments

- `signOutAction` (`src/features/auth/api/auth-actions.ts`) destroys the local session and redirects to sign-in — a plain server function, no upstream call at all, matching `signInAction`/`signUpAction`'s established shape.
- `SignOutButton` now submits through `<form action={dispatch}>` + `useActionState`, replacing the TanStack Query mutation + `onClick` handler — it works before hydration like the sign-in/sign-up forms, and has its first behavioural test coverage (`sign-out-button.test.tsx`).
- `app/api/auth/signout/route.ts` is deleted, and the now-empty `app/api/auth/` and `app/api/` directories are removed with it — this application has no endpoints of its own left.
- The client layer built to call that now-nonexistent endpoint surface is gone: `auth-api.ts`, `bff-client.ts`, `bff-generated-types.ts`, `docs/api/bff-openapi.json`, and the `generate-bff-openapi.mjs` generator, plus the `bff-api:generate` script entry and both files' lint-ignore/routes-check-exclusion entries. Every importer of each deleted path was searched and confirmed to be only files deleted alongside it before removal.
- The real backend's sign-out route (`POST /api/logout`) is verified broken — 500 with `No static resource logout.`, the upstream session survives the failed call, and the cause is a context-path mismatch in the backend's own `SecurityConfiguration`. Recorded in `deferred-items.md` with the user-facing consequence (the two-live-session ceiling can't be released early) and `kanban-board-backend` named as owner, rather than dialing the URL form that currently happens to answer.
- The e2e sign-out scenario is strengthened to assert, after sign-out, that a direct request for the board list is refused and the protected "Boards" heading never appears — the identical property `route-guard.e2e.spec.ts` proves for a visitor who never signed in.

## Task Commits

1. **Task 1: Sign-out as a server function** - `17213fa` (feat)
2. **Task 2: Delete the client layer for calling this application's own endpoints** - `fcefad1` (feat)

## Files Created/Modified

- `src/features/auth/api/auth-actions.ts` - adds `signOutAction`
- `src/features/auth/api/auth-actions.unit.test.ts` - adds `signOutAction`'s unit coverage
- `src/features/auth/components/sign-out-button.tsx` - rewritten to a form + `useActionState`
- `src/features/auth/components/sign-out-button.test.tsx` (new) - the control's first test file
- `e2e/auth.e2e.spec.ts` - strengthens the sign-out scenario's post-sign-out assertion
- `.planning/phases/01-foundation-auth-preferences/deferred-items.md` - records the broken backend sign-out route (entry #6)
- `scripts/check-routes.mjs` - drops the deleted generated-types path from its exclusion list
- `eslint.config.mjs` - drops the ignore entry naming the deleted generated types
- `package.json` - drops the `bff-api:generate` script
- `app/api/auth/signout/route.ts` (deleted) - superseded by `signOutAction`
- `src/features/auth/api/auth-api.ts`, `src/lib/api/bff-client.ts`, `src/lib/api/bff-generated-types.ts`, `docs/api/bff-openapi.json`, `scripts/generate-bff-openapi.mjs` (deleted) - this app's own endpoint client layer, with no endpoint left to call

## Decisions Made

- `signOutAction` deliberately never calls the backend's sign-out route, in any URL form — see key-decisions above and `deferred-items.md` entry #6 for the full reasoning.
- `SignOutButton` keeps its original `aria-busy`/`isDisabled` wiring rather than adopting `Button`'s `isLoading` spinner — matches the prior implementation's presentation exactly, per the plan's instruction to keep the busy attribute as-is.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' importer searches (Task 2) confirmed the expected result (each deleted file's only importer was another file being deleted in the same task), so no additional cleanup was required beyond what the plan specified.

## Issues Encountered

- Local `pnpm build`/`pnpm exec tsc --noEmit` require `SESSION_SECRET`/`EXTERNAL_API_BASE_URL` to be set (a pre-existing local-environment gap tracked in STATE.md's Blockers/Concerns, not introduced by this plan) — supplied ephemeral values for the build step only, never persisted to `.env.local` or committed. `EXTERNAL_API_BASE_URL` was left unset for `pnpm test`/`pnpm exec playwright test --project e2e`, which fall back to `src/test-utils/api-base-url.ts`'s real nonprod default and ran genuinely against the live backend.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GC-24's carve-out is complete: all three auth mutations (sign-up, sign-in, sign-out) are Server Actions, every Route Handler and client fetch wrapper they replaced is deleted, and `app/api/` no longer exists.
- `src/lib/api/server-client.ts`, `src/lib/api/generated-types.ts` and `docs/api/kanban-board-openapi.json` (the external backend's own client, types and contract) are untouched and verified present.
- Plan 01-35 onward (the `lib/` three-ring split, per `01-CONTEXT.md`) can now assume no `app/api/**` surface and no generated BFF client exist anywhere in this codebase — `01-36-PLAN.md`/`01-37-PLAN.md` already encode this precondition and can proceed without re-checking it by hand.
- The real backend's broken sign-out route (`deferred-items.md` #6) is `kanban-board-backend`'s to fix; once fixed, `signOutAction` should be updated to dial `POST /api/logout` for real, per the comment left on that function.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-19*

## Self-Check: PASSED

- FOUND: `src/features/auth/api/auth-actions.ts`
- FOUND: `src/features/auth/components/sign-out-button.test.tsx`
- FOUND: `app/api` absent (expected)
- FOUND: `src/features/auth/api/auth-api.ts` absent (expected)
- FOUND: commit `17213fa`
- FOUND: commit `fcefad1`
