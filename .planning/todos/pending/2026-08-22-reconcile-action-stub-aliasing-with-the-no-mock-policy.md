---
created: 2026-08-22T14:43:49.356Z
title: Reconcile action-stub aliasing with the no-mock policy
area: testing
severity: major
files:
  - src/test-utils/sign-in-action-storybook-stub.ts
  - src/test-utils/sign-up-action-storybook-stub.ts
  - src/test-utils/sign-out-action-storybook-stub.ts
  - src/test-utils/update-theme-action-storybook-stub.ts
  - docs/adr/tech/0020-no-mocking-policy.md
---

## Problem

The `*-action-storybook-stub.ts` files (e.g. `sign-in-action-storybook-stub.ts`) are
no-op stand-ins for the real `"use server"` actions, swapped in via a whole-module
alias in `vitest.config.ts` scoped to the "storybook" Vitest project — used because
"no story ever submits a form" (D-25).

The user flagged this as effectively breaking the no-mock agreement (ADR
tech/0020): it's a fake implementation of project-owned business logic standing in
for the real one, which is exactly what tech/0020 says is never permitted under its
D-19 carve-out ("A mock of this project's own modules... is never permitted under
this carve-out"). But because it's a module *alias*, not a literal `vi.mock`/
`vi.spyOn` call, ESLint's `no-restricted-properties` enforcement never catches it,
and it doesn't appear in ADR tech/0020's "Surviving mock register" table either —
so it's currently an unenforced/undocumented exception to the policy, not a
sanctioned one.

## Solution

TBD — needs research. Open questions to resolve:
- Is a whole-module alias substitution meaningfully different from a `vi.mock`, or
  is this just a policy-enforcement blind spot that should be closed (either by
  extending the ESLint rule/register to cover aliases, or by explicitly carving
  this out in the ADR with the same rigor as the `next/headers`/`next/navigation`/
  `next/link` shims)?
- If action stubs stay, is there a way to exercise the *real* action logic in
  stories/component tests instead (e.g. asserting against real validation/error
  paths hitting the nonprod backend) rather than a no-op stand-in?
- Feeds Phase 02.2 (Storybook test-unification follow-up) — worth resolving as
  part of that phase's planning rather than in isolation.
