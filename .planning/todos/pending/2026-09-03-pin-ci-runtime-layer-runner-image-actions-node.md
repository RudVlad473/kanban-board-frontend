---
created: 2026-09-03T19:49:32.906Z
title: Pin the CI runtime layer — runner image, action SHAs, Node — and add a pin-update mechanism
area: tooling
severity: major
files:
  - .github/workflows/ci.yml
  - .github/workflows/visual-baselines.yml
  - .nvmrc
---

## Problem

This repo's **package-tier** supply chain is well covered — `packageManager: pnpm@11.20.0` is exact,
every job runs `pnpm install --frozen-lockfile`, and `@playwright/test` is exact-versioned at
`1.62.1`. The gap is entirely one layer up, in the CI *runtime* that executes those pinned packages.
Six findings, from an audit of both workflow files on 2026-09-03:

1. **`ubuntu-latest` on all five jobs** (`ci.yml:32,49,144,177`, `visual-baselines.yml:19`). GitHub
   migrates that label between images on their own schedule. This is the highest-impact one *for
   this repo specifically*: font rasterization differs between images, and the `visual` project
   compares pixel `toHaveScreenshot` baselines — so an image migration reds the visual job on a day
   nothing in the repo changed, and the "fix" looks like re-recording baselines against an unknown
   renderer.

2. **Mutable action tags at 14 call sites** — `actions/checkout@v5`, `actions/setup-node@v5`,
   `actions/upload-artifact@v4`, `pnpm/action-setup@v4`. A tag is a movable ref, which is exactly
   the `tj-actions/changed-files` compromise (CVE-2025-30066, March 2025): the attacker re-pointed
   existing tags and thousands of repos leaked secrets into their logs. `pnpm/action-setup` is
   third-party, the category GitHub's own hardening guide says must be pinned to a full-length
   commit SHA. `gitleaks/gitleaks-action` (`ci.yml:44`) is already pinned this way and is the model
   to copy.

3. **No `permissions:` block in `ci.yml`**, so the default `GITHUB_TOKEN` scope applies. Not a
   version pin, but it is the multiplier on finding 2 — an unpinned third-party action holding a
   write-capable token *is* the tj-actions scenario. `visual-baselines.yml:9` already declares one;
   `ci.yml` does not.

4. **`node-version: 24`** (`ci.yml:58,154,187`) and `.nvmrc` = `24` both float across 24.x minors
   and patches, so CI's Node and the vfox-managed local Node drift apart silently.

5. **`pnpm exec playwright install --with-deps`** (`ci.yml:64,160,193`) apt-installs unpinned distro
   system libraries at run time. Lowest severity and partly unavoidable — the browser build itself
   is pinned through the lockfile — but it is a run-time network dependency worth naming.

6. **No Dependabot or Renovate config exists.** This is the counterweight to everything above:
   pinning without an update mechanism converts a drift problem into a staleness problem, and you
   stop receiving security patches for the things you just froze. Pinning and updating are one
   decision, not two, and landing finding 1-4 without this makes the repo *less* safe over time.

Related, already handled elsewhere: CI's gitleaks scan was itself unpinned (the action resolves
`GITLEAKS_VERSION`, else installs the latest release at run time). That is being fixed as part of
quick task `260903-ttt`, along with a guard keeping the local and CI gitleaks versions equal. This
todo is the same class of defect across the rest of the CI runtime, deliberately split out so the
workflow changes stay separately reviewable and revertable.

## Solution

Sequence matters — do 6 first or the rest rots.

- Add Dependabot (`.github/dependabot.yml`) with the `github-actions` ecosystem enabled, so SHA pins
  get automated bump PRs. Consider the `npm` ecosystem in the same config.
- Pin the runner image to an explicit `ubuntu-24.04` on all five jobs. Expect this to be the one
  that moves pixels: re-record visual baselines deliberately through `visual-baselines.yml` (which
  opens a reviewable PR with an image diff) rather than letting it land as incidental churn. Per
  CLAUDE.md, `pnpm build-storybook` must run before any baseline is recorded or trusted.
- SHA-pin all 14 action references, each with a trailing `# vX.Y.Z` comment, matching the existing
  `gitleaks-action` line's format.
- Add `permissions: contents: read` at the top level of `ci.yml`, then grant per-job escalations
  only where a job actually needs them.
- Pin Node to a full `24.x.y` in both `ci.yml` and `.nvmrc` so local and CI agree.
- Decide explicitly on finding 5 rather than defaulting: either accept unpinned system libs with a
  recorded reason, or pin them.

Worth an ADR under `docs/adr/tech/` — this is a durable policy decision ("everything in CI is
pinned, and Dependabot is what keeps the pins fresh") that a future contributor would otherwise
undo by writing `@v5` out of habit.
