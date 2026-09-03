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

## Resolution (2026-09-03, quick task 260903-ttt)

**Option 3 was taken: a checksum-pinned direct-binary install convention.**
`scripts/install-verified-tools.sh` fetches the official gitleaks and sops release binaries and
verifies each against its own release checksums file, aborting on mismatch, into `~/.local/bin`.
`age` comes from Ubuntu's signed archive. The convention serves both tools, which is what makes it
a convention rather than a one-off. Full record: `docs/adr/tech/0032`.

**Options 1 and 2 were not needed rather than rejected on merit.** The original objection was that
the only local options were single-maintainer npm repackagings of the gitleaks binary. Installing
the official release binary directly makes that question moot, so neither the npm-wrapper re-check
nor the search for a pure-JS scanner was pursued.

**Option 4 (re-confirm CI-only) is superseded.** A local half now exists — `.husky/pre-commit`
runs a gitleaks scan over staged changes with `--redact -v` — and it is **additive**. CI's
`secrets` job keeps `fetch-depth: 0` and remains the authoritative gate; the local hook never sees
history.

**A version-parity finding came out of this, and was the larger problem.** CI was not pinning
gitleaks at all: at the pinned `gitleaks-action` SHA, an unset `GITLEAKS_VERSION` makes the action
resolve `getLatestRelease()` at run time, so the enforced rule set changed between runs with
nothing in the repo recording which one passed. `ci.yml` now pins `8.30.1` as the single source of
truth, and `pnpm gitleaks:check` fails when the locally installed binary differs from it —
falsified by pointing the pin at an uninstalled version and watching it fail.

## Options evaluated

Original list, kept for the record:
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
