---
created: 2026-08-29T10:45:00.000Z
title: Scope e2e cleanup to the user ids the run seeded, instead of wiping the whole nonprod backend
area: testing
severity: major
files:
  - e2e/global-setup.ts
  - e2e/seed.ts
  - e2e/seed.sh
  - src/lib/core/api-contract/external-paths.ts
  - SETUP.md
---

## Problem

`e2e/global-setup.ts` POSTs `/admin/reset` with `NONPROD_RESET_TOKEN` once per suite, which wipes
the **entire** shared nonprod backend. There is one backend and no per-run scoping, so any two e2e
runs that overlap destroy each other's data. The victim fails on whatever it happened to be doing
when the wipe landed — typically a `401 UNAUTHENTICATED` from a seed helper reading back something
it created seconds earlier, which reads as an auth regression and is not one.

This is not rare. It fires whenever a push starts a CI run and anything else touches the backend
in the same window: a second CI run on another branch, a merge run overlapping a branch run, a
developer running `pnpm test:e2e` locally, or an agent driving a seeded browser session for a
`checkpoint:human-verify`.

Observed 2026-08-29 on plan 04-12. CI run `33246634253` reported `43 passed, 1 failed`, the failure
being `boards-create.e2e.spec.ts` → `readBoardFull` → 401. A local `pnpm test:e2e` ran
10:00:38-10:01:36Z against CI's 10:00:43-10:01:46Z; the local run's `globalSetup` reset the
database underneath CI's in-flight specs. Re-running the CI job with the backend to itself went
green on all four jobs at the same commit, no code change.

## Solution (decided 2026-08-29; backend half owned by the user)

Stop wiping. Make cleanup **additive and run-scoped**:

1. Every seeded account's user id is recorded as the run creates it.
2. At teardown the run sends that list to the cleanup endpoint as a body of user ids.
3. The backend deletes only those users and their cascaded data.

Two runs then never touch each other's rows, so concurrent pipelines are independent by
construction rather than by scheduling luck.

**Backend:** the user is implementing the endpoint change — accept a list of user ids in the body
and delete only those, rather than truncating everything.

**Frontend work this implies:**

- `e2e/seed.sh` — return the created user id from every account-creating command (`cmd_account`
  already emits `id` in its JSON; confirm nothing else creates users), and add a cleanup command
  that POSTs a `{ userIds: [...] }` body.
- `e2e/seed.ts` — accumulate seeded ids in a module-level registry as `seedAccount()` hands them
  out. It must survive Playwright's worker model: specs run in separate worker processes, so a
  plain in-process array collects only that worker's ids. Either write ids to a run-scoped file
  that teardown reads, or have each worker clean up its own.
- `e2e/global-setup.ts` — the `/admin/reset` precondition check goes away, but the guard it exists
  for must not. It currently refuses to run without a working reset endpoint precisely because
  every spec creates permanent accounts on a shared backend (docs/adr/tech/0022). Replace it with
  an equivalent precondition against the new endpoint, and add a `globalTeardown` to do the
  deleting — there is no teardown today.
- Decide what happens when a run is killed mid-flight (Ctrl+C, a cancelled CI job). Today's wipe
  is self-healing: the next run cleans up whatever the last one leaked. Scoped cleanup is not —
  abandoned accounts accumulate forever unless teardown runs. Worth a periodic sweep by age, or
  keeping a token-gated full reset available as a manual escape hatch.

## What this does and does not fix

**Fixes:** the cross-run wipe described above — the dominant cause of unexplained e2e failures.

**Does not fix:** the backend's 2-session-per-account cap, tracked separately in
`2026-08-27-boards-create-e2e-401s-when-its-seed-session-is-evicted.md`. That todo records the same
401 symptom from a different mechanism (sessions evicted rather than data deleted), including a
second occurrence on 2026-08-28 where two overlapping CI runs on byte-identical trees each failed a
different pair of specs. Scoped cleanup removes one of the two cross-run hazards; per-account
session budgeting is still its own problem. Check whether the eviction is also cross-run
(one account's sessions spent by another run) or purely within-suite before closing that one.

Related: `2026-08-27-boards-create-e2e-401s-when-its-seed-session-is-evicted.md` (the session-cap
half of cross-run contention), `2026-08-22-fold-e2e-seeding-logic-into-a-single-service-module.md`
(a single seed entry point is where an id registry would naturally live, so doing that first makes
this cheaper), and the project memory
`local-e2e-run-wipes-backend-and-fails-concurrent-ci` for the debugging inversion this causes.
