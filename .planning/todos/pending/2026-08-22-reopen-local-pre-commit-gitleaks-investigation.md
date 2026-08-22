---
created: 2026-08-22T18:08:56.388Z
title: Reopen local pre-commit gitleaks investigation
area: tooling
severity: minor
files:
  - .husky/pre-commit
  - .gitleaks.toml
  - .github/workflows/ci.yml
---

## Problem

Secret scanning currently runs only in CI: `.github/workflows/ci.yml`'s `secrets` job uses
`gitleaks/gitleaks-action` on every push (full-history checkout, diffs `baseRef^..headRef`).
`.husky/pre-commit` only runs `lint-staged` — there is no local pre-commit half, so a secret can be
committed locally and only gets caught once pushed to GitHub.

This was a deliberate prior decision, not an oversight: per `ci.yml`'s own comment (citing D-26h and
`01-18-SUMMARY.md`), a Task 1 checkpoint during Phase 1 rejected the available npm gitleaks wrappers
on supply-chain grounds — they were single-maintainer repackagings of the real gitleaks binary, and
the project has no devcontainer or vetted-binary-install convention to fall back on for running the
real binary locally. CI became the sole enforcement point by design.

Worth revisiting now: has the tooling landscape changed since then (an official/maintained gitleaks
npm wrapper, a vetted alternative secret scanner, or a way to fetch the real binary locally that
passes the same supply-chain bar CI's `gitleaks/gitleaks-action` does)? A local pre-commit check
would catch a leaked secret before it ever reaches even a local commit, not just before it's pushed.

## Solution

TBD — needs investigation before deciding. Options to evaluate:
- Re-check npm gitleaks wrappers for a maintained, higher-trust option (star count, maintainer count,
  provenance/attestation, npm package signing) that didn't exist or wasn't found during the original
  Phase 1 checkpoint.
- Look at alternatives to gitleaks itself that are easier to adopt locally without a binary install
  concern (e.g. a pure-JS/TS secret pattern scanner, or a hosted pre-commit-friendly tool).
- Consider whether a vetted-binary-install convention (checksum-pinned curl install, similar to how
  other CLIs are handled) is worth establishing generally, which would also unblock a local gitleaks
  binary directly.
- If nothing clears the supply-chain bar, explicitly re-confirm CI-only remains the right call and
  close this todo with that rationale recorded.
