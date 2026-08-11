---
created: 2026-08-11T18:43:10.725Z
title: Guard visual-baselines dispatch against corrupting screenshot baselines
area: tooling
severity: minor
files:
  - .github/workflows/visual-baselines.yml
  - .github/workflows/ci.yml
  - docs/adr/tech/0008-visual-regression-tool.md
  - docs/adr/tech/0011-visual-regression-scope.md
---

## Problem

`.github/workflows/visual-baselines.yml` has `on: workflow_dispatch: {}` with no `inputs.ref`
and no branch restriction — `actions/checkout@v5` (no `ref:` override) checks out whatever
branch/ref is picked at dispatch time. The job then runs `playwright test --update-snapshots`,
which unconditionally overwrites every committed baseline PNG in `visual/__screenshots__/` with
a screenshot of whatever is currently rendered — there is no diff-against-the-previous-baseline
step, no confirmation, and no review gate anywhere in the workflow itself.

Concretely: if this is ever dispatched against a branch that has a visual bug in it, the bug
becomes the new committed "ground truth." From that point on the `ci.yml` `visual` job stops
flagging the bug (it now matches baseline) and would instead start failing if someone later
fixed it back to correct, since that fix would now diverge from the poisoned baseline.

Confirmed separately: `master` has no branch protection at all (`gh api
repos/:owner/:repo/branches/master/protection` → 404 "Branch not protected"), so even the
manual "download artifact, commit the PNGs" step that follows a dispatch isn't required to go
through any review.

## Solution

TBD — at minimum, restrict dispatch to master/main (e.g. via a workflow input validated against
`github.ref`, or moving the trigger to only fire post-merge). That alone isn't sufficient, since
master itself could have an unreviewed/uncaught visual bug at the moment of dispatch (this is a
live scenario right now: the 01-09 checkpoint worktree currently has unmerged, unreviewed visual
fixes — if baselines were dispatched against that branch before sign-off, whatever's there,
fixed or not, becomes the new baseline).

Needs an actual process for baseline changes, not just a branch restriction — e.g.:
- Route the baseline-artifact commit through a PR (so the new PNGs get eyes before merging)
  instead of the current direct-push-to-master flow described in WINDOWS.md's recurring entries.
- Or: have the workflow diff the newly generated screenshots against the previous committed
  baselines and attach/surface that diff for human review before anything is committed, rather
  than relying entirely on the person running the dispatch to remember to eyeball every PNG.

Related: `docs/adr/tech/0008` (visual regression tool choice — Playwright-native, CI-only
generation) and `docs/adr/tech/0011` (visual regression scope — primitives only, for now).
