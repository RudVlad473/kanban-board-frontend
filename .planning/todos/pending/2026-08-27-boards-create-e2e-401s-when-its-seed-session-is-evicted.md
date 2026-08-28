---
created: 2026-08-27T11:40:00.000Z
title: boards-create e2e intermittently 401s on seed.sh board-full when its signup session is evicted
area: testing
severity: minor
files:
  - e2e/boards-create.e2e.spec.ts
  - e2e/seed.ts
  - e2e/seed.sh
---

## Problem

`boards-create.e2e.spec.ts:14` failed once in CI on a **401**, not an assertion:

```
seed.sh board-full: read returned 401: {"status":401,"code":"UNAUTHENTICATED",
"detail":"Authentication is required","instance":"/api/boards/8p98rww4v8cg/full"}
  at readBoardFull (e2e/seed.ts:76) <- boards-create.e2e.spec.ts:71
```

The test budgets exactly two backend sessions, and says so itself at line 17:

> `// Arrange — one curl-seeded account; a second would exceed the backend's 2-session cap.`

1. `seedAccount()` signs up — **session 1**, whose `JSESSIONID` is stored on `account`
2. The test signs in through the real UI form — **session 2**
3. Line 71 calls `readBoardFull({ account, ... })`, which reuses **session 1** over curl

When session 1 is evicted, step 3 gets a 401. The same symptom was hit by hand the same day: a
seeded account's credentials started returning 401 after its sessions had been spent, while a
freshly created account signed in fine (`signup 201 -> signin 200`).

## Why it is filed rather than fixed

- Passes **3/3** locally against the real backend.
- Appears in **none** of four prior CI runs checked (33060367807, 33058290975, 33013682454,
  33011790429) — this was its first observed failure.

One observation is not enough to justify changing session budgeting, and a blind fix risks trading
a rare flake for a permanent one. Wait for a second occurrence, or reproduce deliberately by
forcing a third session, before touching it.

## Likely direction when it does get fixed

Read the board through the **browser's** session rather than the seed's — the page already holds an
authenticated session at that point, so the curl round-trip through `readBoardFull` is what creates
the dependency on a session the test has already spent. Alternatively, have `seed.sh` expose a
refresh so step 3 re-authenticates instead of assuming session 1 survived.

Related: the 2-session cap is also why `seed.sh`'s `cmd_board`/`cmd_column` deliberately reuse the
sign-up session instead of signing in again — see the comment in `e2e/seed.sh` `cmd_board`.

## Found by

CI run 33066389570 on `visual-baselines-update-17`, 2026-08-27.

## Reproduced under concurrent CI runs (2026-08-28)

Two CI runs on byte-identical trees overlapped for seven minutes against the one shared nonprod
backend. Both failed e2e; each failed a *different* pair of tests. A third run on the same content,
with the backend to itself, passed. The failing pairs were `columns-create` + `columns-delete`
(a 401 from `seed.sh column`, the symptom this todo already describes) and `columns-reorder` +
`route-guard` (a `toHaveURL` assertion after a redirect that should not have happened).

| Run | Commit | Window (UTC) | e2e |
|-------------|---------|-------------|------|
| 33157704494 | 9973433 | 09:02-09:09 | pass |
| 33158280373 | 451e094 | 09:10-09:18 | fail |
| 33158332950 | 451e094 | 09:11-09:19 | fail |

`451e094` changed only `CLAUDE.md`, so the code cannot account for the difference. Re-running
33158332950's failed job alone went green with no other change.

This widens the todo: the two-session cap is not only a within-suite budgeting problem, it is a
**cross-run** one. Nothing scopes seeded accounts per run, so two suites racing the same backend
evict each other's sessions, and the eviction surfaces as whatever assertion happened to be next
rather than as an auth error. Any fix has to survive two CI runs overlapping, which is normal
whenever a branch is pushed and then merged.
