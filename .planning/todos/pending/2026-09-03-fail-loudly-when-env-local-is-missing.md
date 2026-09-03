---
created: 2026-09-03T20:15:00.000Z
title: Fail loudly and actionably when .env.local is missing, instead of relying on remembered setup steps
area: tooling
severity: minor
files:
  - package.json
  - next.config.ts
  - playwright.config.ts
  - vitest.config.ts
---

## Problem

A fresh worktree needs setup steps run before anything works, and a documented ritual is not a
mechanism. This repo has direct evidence: CLAUDE.md documents `pnpm exec next typegen`, and two
separate Phase 4 executors still skipped it and reported the resulting three phantom
`no-unsafe-assignment` errors in `app/(dashboard)/boards/[boardId]/page.tsx` as a real regression in
a file they had never touched. Prose lost to a plausible-looking failure, twice, independently.

Quick task `260903-ttt` reduces the exposure by collapsing setup into one `pnpm setup:worktree`
command — one thing to remember instead of four. That is an improvement, not a fix: it still depends
on someone remembering to run it.

The remaining gap is the failure *shape*. When `.env.local` is absent, the tools do not say so. They
fail somewhere downstream, in a way that reads as a code defect rather than a missing precondition —
which is precisely how the `next typegen` miss cost two sessions. Note this repo previously went the
other way on purpose: `pnpm build` was changed to stop failing on a missing `SESSION_SECRET`
(recorded in STATE.md, resolved 2026-08-29), so today a missing env file is closer to silent than to
loud.

The general principle: a precondition that must hold deterministically belongs in a mechanism, not
in a document. ~/.claude/CLAUDE.md states this directly — "a rule that must hold deterministically
belongs in a `PreToolUse` hook, not in prose."

Investigated and rejected during `260903-ttt`: a git `post-checkout` hook, which would have
automated setup at the exact moment a worktree is created. Git 2.53.0's `githooks(5)` confirms the
hook DOES fire on `git worktree add` unless `--no-checkout` is passed. It cannot work here because
`core.hooksPath` is `.husky/_`, and `.husky/_` is not tracked (only `.husky/pre-commit` is — husky
self-ignores `_` with a `*` gitignore inside it). A brand-new worktree therefore has no hook
directory at checkout time and no hook runs. It would fire on later branch switches, by which point
`.env.local` already exists and the hook is useless. Reopening this would require moving husky's
hook directory to a tracked path — a bigger change that fights husky's own layout.

## Solution

Two independent layers. They protect different audiences and neither subsumes the other.

**1. Fail loudly at the point of use (protects everyone, including the human).**
Make the dev server, the test runner and the e2e runner refuse to start when `.env.local` is absent,
with an error that names the fix (`pnpm setup:worktree`) rather than surfacing a downstream symptom.
Decide deliberately whether `pnpm build` rejoins this set — it was made *not* to fail on a missing
`SESSION_SECRET` on 2026-08-29, so changing it back is reversing a recorded decision and needs its
own reason. Keep the check cheap and at startup; do not scatter per-variable guards through app code.

**2. A machine-tier `PreToolUse` hook (protects agents specifically, deterministically).**
In `~/.claude/settings.json` — machine tier, NOT this repo — intercept Bash calls invoking
`pnpm dev`/`build`/`test`/`e2e` whose target directory has no `.env.local`, and block with the
remediation command. This is the tier that does not depend on an agent having read anything.

Worth checking after both land: whether CLAUDE.md's fresh-worktree section can then shrink to a
pointer, since the mechanisms carry what the prose is currently asked to carry.
