---
created: 2026-09-03T20:35:00.000Z
title: Run the full CI gate list locally on pre-push, with a guard that fails when it drifts from CI
area: tooling
severity: major
files:
  - .husky/pre-push
  - package.json
  - .github/workflows/ci.yml
  - playwright.config.ts
---

## Problem

Work reaches CI carrying failures that were catchable locally, and the cost is a full red run plus
every job skipped behind it. This is not hypothetical here: `comments:check` failed **three separate
CI runs in one session** (2026-09-03), each time on a comment the pre-commit hook had already let
through, and each failure also cost the `visual` and `e2e` jobs that sit behind `quality`.

The structural cause is a coverage gap nobody maintains. CI's `quality` job runs `lint`,
`routes:check`, `handlers:check`, `stories:check`, `tsx:check`, `renders:check`, `folders:check`,
`actions:check`, `format:check`, `comments:check`, `coverage:check`, `secrets:check`, an API-types
drift check, `build` and `test` — plus `visual` and `e2e` as separate jobs. The pre-commit hook runs
prettier, eslint and `comments:check`. That gap was noticed and written down after the third failure
but never mechanized, so it will reopen the next time a gate is added to CI.

Two secondary traps make a naive local runner worse than useless:

- `playwright.config.ts` sets `ignoreSnapshots: !process.env.CI` (ADR tech/0008), so off-CI every
  `toHaveScreenshot` is a **silent no-op**. A green local visual run proves only that the specs
  executed. `CI=1` is required.
- The `visual` project serves the prebuilt `storybook-static/`, which nothing rebuilds on its own
  and git does not track. A stale build compares today's baselines against superseded markup — on
  2026-09-01 a `--update-snapshots=all` re-record wrote pre-fix images and passed 300/300 against
  the images it had just written, while CI stayed red.

## Solution

**Decided by the user 2026-09-03: local e2e runs on the pre-push hook, in the default tier**, with
an explicit callout so agents are always aware the mechanism exists and what it touches. This was
settled after correcting a stale claim — local e2e does NOT wipe the shared nonprod backend; since
`5f325f8` resets are targeted per user id from a per-run registry. CI's own e2e job takes ~1m41s
(57 specs), so the time cost on pre-push is acceptable.

Shape:

- **`pre-push`, not `pre-commit`.** Pre-commit must stay fast and staged-scoped or it gets bypassed.
  Pre-push is the real boundary: the last moment before work leaves the machine, run once per push
  rather than once per commit.
- **One `pnpm verify` entry point** the hook calls, ordered fastest-failing first (format, lint,
  tsc, the check scripts, then build, test, e2e) so feedback arrives early.
- **A drift guard, which is the part that makes this durable.** Parse `.github/workflows/ci.yml` for
  its `run:` steps and FAIL when a gate is neither covered by `pnpm verify` nor listed as CI-only
  with a written reason. Without this the list is accurate the day it is written and rots from
  there — which is exactly how the 3-of-15 gap arose. Same pattern as the gitleaks version guard
  landed in quick task `260903-ttt`.
- **Explicit agent-facing callout** in CLAUDE.md: that `pnpm verify` runs on pre-push, that it
  includes e2e against the shared nonprod backend, that e2e deletes only its own seeded user ids,
  and what to do when it fails for environmental rather than code reasons.
- **Handle the genuinely-CI-only gates honestly.** The secrets scan covers full history via the push
  event's ref range. If `visual` is included, it must set `CI=1` and run `pnpm build-storybook`
  first, or it is worse than not running it.
- **Graceful behaviour with no network** (e2e and the nonprod backend need one) and when
  `NONPROD_RESET_TOKEN` is absent: a clear skip or a clear refusal, never a confusing failure.

**Measure first, then choose the tier.** Time `pnpm verify` end to end on this box before committing
to the shape. If the total is slow enough that `--no-verify` becomes habitual, the hook protects
nothing and a narrower always-on set plus a manual full run is the better trade. That number decides
it; do not guess it.

Note the remaining shared-backend caveat: accounts can be evicted mid-session, so an e2e `401` from
a seed helper may be environmental. The hook should say so in its failure output rather than leaving
the reader to hunt a phantom auth bug.
