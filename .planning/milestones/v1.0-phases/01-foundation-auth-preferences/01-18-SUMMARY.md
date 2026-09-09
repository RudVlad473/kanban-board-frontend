---
phase: 01-foundation-auth-preferences
plan: 18
subsystem: repository-tooling
tags: [ci, secrets-scanning, gitleaks, supply-chain, github-actions]

# Dependency graph
requires: []
provides:
  - ".gitleaks.toml" — rule config extending gitleaks' built-in defaults, documented empty
    allowlist (no path currently produces a false positive under this repo's content)
  - "CI `secrets` job (.github/workflows/ci.yml)" — the authoritative, no-`needs:` secret scan on
    every push/PR, via the official `gitleaks/gitleaks-action`
affects: []

# Actuals (#2632)
actuals:
  tokens: 1800
  tasks: 3
  commits: 2

tech-stack:
  added:
    - "gitleaks/gitleaks-action (GitHub Action, pinned to the v3.0.0 commit SHA) — CI-only, no npm
      dependency added to package.json/pnpm-lock.yaml"
  patterns:
    - "Supply-chain package-legitimacy gate applied to a GitHub Action, not just an npm package:
      the Task 1 checkpoint rejected both candidate npm gitleaks wrappers on evidence (GitHub
      stars, maintainer count, publish cadence, lifecycle-script vs. optionalDependencies
      delivery), then the executor independently vetted the officially-maintained
      gitleaks/gitleaks-action replacement the same way before wiring it in (star count, archived
      status, last-push date, pinned to an exact commit SHA rather than a floating major tag)."
    - "Empirical-not-assumed allowlisting: rather than pre-emptively allowlisting pnpm-lock.yaml
      and docs/api/'s OpenAPI contract (the plan's anticipated false positives), both were
      actually scanned with the real rule set first; since neither produced a finding, no
      allowlist entry was added — 'allowlist nothing on suspicion' applied literally."

key-files:
  created:
    - .gitleaks.toml
  modified:
    - .github/workflows/ci.yml

key-decisions:
  - "GC-06's originally-planned mechanism (an npm-wrapper `postinstall`/`optionalDependencies`
    package delivering the gitleaks binary) was rejected at this plan's Task 1 checkpoint on
    supply-chain-legitimacy grounds — see 'Deviations from Plan' below for the full record."
  - "gitleaks-action pinned by full commit SHA (`e0c47f4...`, comment-annotated with the `v3.0.0`
    tag it corresponds to) rather than a floating major-version tag like the project's other
    GitHub Actions steps use (`actions/checkout@v5`, etc.) — this action is third-party (Gitleaks
    LLC, not GitHub-authored), and this plan's own must_haves truth requires the scanner's version
    to be pinned exactly so CI never silently starts running different detection rules."
  - "CI job intentionally does not mirror `quality`'s pnpm/Node/install steps: gitleaks-action
    downloads and runs its own gitleaks binary internally and touches none of this project's own
    dependency tree, so those steps would be dead weight — same 'don't add what this job doesn't
    need' principle the plan's own Task 3 text already applied to the Playwright browser install."
  - "No GITLEAKS_LICENSE secret configured: gitleaks-action's own license check (traced in its
    source, `src/index.js`) only enforces a license for organization-owned repos; confirmed via
    the GitHub REST API that this project's owner (`RudVlad473`) is a personal account
    (`GET /users/RudVlad473` → `type: \"User\"`), which the action itself treats as
    licence-exempt."

patterns-established:
  - "Vet a replacement mechanism (a GitHub Action, in this case) with the same rigor the rejected
    original mechanism was vetted with, rather than treating 'switch to the officially-maintained
    alternative' as self-evidently safe — see tech-stack patterns."

requirements-completed: []

coverage:
  - id: D1
    description: "A staged/pushed secret is caught: gitleaks (via the pinned gitleaks-action, and
      independently via a temporary, checksum-verified upstream gitleaks binary run locally with
      this repo's exact .gitleaks.toml) correctly flags known-secret fixtures and redacts the
      matched value from its output."
    verification:
      - kind: other
        ref: "Local rehearsal against gitleaks' own published test fixtures (testdata/repos/nogit
          from the gitleaks source tarball at the same v8.30.1 the wrapper packages target):
          3 leaks found (2x aws-access-token, 1x generic-api-key), each with a REDACTED value in
          the finding output, exit code 1 — run both with pure defaults and with this repo's
          .gitleaks.toml (extend-only), same result both times."
        status: pass
    human_judgment: false
  - id: D2
    description: "Ordinary content is unaffected: the current working tree and the full commit
      history are clean under the shipped config."
    verification:
      - kind: other
        ref: "gitleaks dir (working tree, ~1.62MB scanned) and gitleaks git --log-opts=\"--all\"
          (149 commits, ~2.35MB scanned), both with .gitleaks.toml applied — 0 leaks, exit 0.
          Includes pnpm-lock.yaml and docs/api/'s OpenAPI contract JSON, the plan's two named
          false-positive candidates."
        status: pass
    human_judgment: false
  - id: D3
    description: "CI runs the same scan on every push, independent of any local hook (no local
      hook exists — see deviations)."
    verification:
      - kind: other
        ref: "node -e check confirming a 4-space-indented `secrets:` job key exists in
          .github/workflows/ci.yml, no `needs:` declared, YAML parses cleanly via js-yaml
          (jobs: secrets, quality, visual, e2e; secrets.needs === undefined; 2 steps)."
        status: pass
    human_judgment: false
  - id: D4
    description: "The `secrets` CI job actually runs green on the real GitHub remote."
    verification: []
    human_judgment: true
    rationale: "This plan executed inside a worktree-isolated executor agent that does not push to
      origin — the orchestrator merges and pushes centrally per this project's worktree workflow
      (same deferral category as 01-05-SUMMARY.md's D3/D4 and 01-13-SUMMARY.md's D5). The
      workflow YAML's shape was verified locally (see D3) and the underlying scan mechanism was
      verified against known-secret fixtures (see D1/D2), but an actual green Actions run for this
      exact `secrets` job has not been observed in this session. Confirm on the real remote once
      this worktree is merged."

# Metrics
duration: ~4min (task-commit span; excludes upfront context-reading, research, and rehearsal time,
  which was substantial for this plan — see Issues Encountered)
completed: 2026-08-17
status: complete
---

# Phase 01 Plan 18: Secret Scanning (GC-06) — CI-only via gitleaks-action Summary

**GC-06 closed via an unplanned mechanism: the npm-wrapper install was rejected at the Task 1 supply-chain checkpoint, so this plan lands only `.gitleaks.toml` and a no-`needs:` `secrets` CI job running the official, commit-SHA-pinned `gitleaks/gitleaks-action` — no local pre-commit half.**

## Performance

- **Duration:** ~4 min (span between the two task commits; upfront context-reading, gitleaks-action
  source research, and the fixture-based detection rehearsal were not separately timed but took
  materially longer than the commit span suggests)
- **Started:** 2026-08-17T10:38:27+02:00 (Task 1 commit)
- **Completed:** 2026-08-17T10:42:44+02:00 (Task 2/3 commit)
- **Tasks:** 3 in the plan (1 checkpoint + 2 auto), executed as 2 commits since the checkpoint was
  pre-resolved by the human before this dispatch
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- `.gitleaks.toml` extends gitleaks' built-in default rule set with a documented, deliberately
  empty allowlist — the two paths the plan anticipated as standing false positives
  (`pnpm-lock.yaml`, `docs/api/`'s OpenAPI contract) were actually tested against the real rule
  set and produced zero findings, so no allowlist entry was added on suspicion.
- A new `secrets` CI job in `.github/workflows/ci.yml` runs the official
  `gitleaks/gitleaks-action`, pinned to an exact commit SHA (`e0c47f4...`, tagged `v3.0.0`), with
  no `needs:` dependency — a leaked secret is reported even if `quality` is red.
- The detection mechanism was rehearsed against gitleaks' own published test fixtures (not
  synthetic values authored for this plan, several of which turned out not to trip the default
  regex rules on their exact shape — see Issues Encountered): 3 known secrets caught, each
  redacted in the output, non-zero exit.
- The current working tree and full 149-commit history were scanned locally with the shipped
  config and are clean.
- Confirmed via the GitHub REST API that this repo's owner is a personal account, so
  gitleaks-action's org-only license requirement does not apply — no `GITLEAKS_LICENSE` secret
  needed.

## Task Commits

1. **Task 1 (adapted): record the checkpoint decision, land the gitleaks rule config** —
   `55b9b89` (docs)
2. **Task 2/3 (merged, adapted): the CI-only secret scan** — `d27e22b` (feat)

**Plan metadata:** commit created at end of this execution (see final commit list returned to the
orchestrator).

## Files Created/Modified

- `.gitleaks.toml` — `[extend] useDefault = true`, no `[[rules.allowlist]]` entries, with the
  empirical rationale recorded in-file.
- `.github/workflows/ci.yml` — new `secrets` job: `actions/checkout@v5` with `fetch-depth: 0`
  (required so gitleaks-action's `baseRef^..headRef` diff can resolve), then the pinned
  `gitleaks/gitleaks-action` step with `GITHUB_TOKEN` passed through.

## Decisions Made

See frontmatter `key-decisions` for the full list. Most significant: pinning the third-party
Action by commit SHA rather than following this file's existing `@v5`/`@v4` floating-tag
convention, since this plan's own must_haves truth requires exact version pinning for the scanner
specifically (drift risk between contributors/CI), and `gitleaks-action` is not a GitHub-authored
action.

## Deviations from Plan

### Checkpoint Resolution (pre-resolved before this dispatch)

**Task 1's `checkpoint:decision` (gate="blocking-human") was answered "neither" before this
executor was spawned.** Both candidate npm wrappers (`@b12k/gitleaks`, `@nogoo9/gitleaks`) were
rejected on supply-chain grounds: neither appears in the phase's Package Legitimacy Audit, both
are single-maintainer repackagings of the upstream gitleaks binary with thin track records (0-2
GitHub stars, 3-27 versions), and the postinstall-script option additionally required a permanent
`pnpm.onlyBuiltDependencies` code-execution grant. GC-06's originally-planned mechanism (npm
wrapper) is reopened, not approved.

**Adaptation applied, per the dispatch's explicit instruction:**
- **CI half:** the official `gitleaks/gitleaks-action` in `.github/workflows/ci.yml`, in place of
  installing a wrapper and invoking it via a `secrets:scan` npm script.
- **Pre-commit half:** skipped entirely. This project has no devcontainer or existing
  direct-binary-download convention for any other tool to fall back on (confirmed by search — no
  `.devcontainer/` directory, no such pattern referenced anywhere in the codebase), so there was
  no vetted local-binary mechanism to adopt instead. A staged secret is no longer caught before
  the commit is made locally; it is caught in CI immediately after push, before merge — the same
  net protection GC-06's D-26h reasoning already treats as the authoritative layer ("hooks are a
  convenience, not a substitute for CI").
- **`package.json`/`pnpm-lock.yaml`/`.husky/pre-commit`:** left untouched. The plan's original
  `files_modified` list and must_haves artifacts (a `secrets:scan` npm script, a
  `.husky/pre-commit` hook line) are not delivered — this is the direct, intended consequence of
  rejecting the npm-wrapper mechanism they depended on, not an oversight.

### Auto-fixed / Adapted Issues (Rule 1/3, applied to the adapted CI-action mechanism itself)

**1. [Rule 3 - Blocking] gitleaks-action does not scan "the checked-out working tree" — Task 3's
   literal instruction assumed the rejected npm-wrapper's raw-CLI invocation**
- **Found during:** Task 3 adaptation, reading `gitleaks-action`'s source (`src/gitleaks.js`,
  `src/index.js`) directly rather than assuming its behavior from the README's usage example
  alone.
- **Issue:** The plan's Task 3 text says "scan the checked-out working tree rather than git
  history... a history scan would... re-report the same historical finding on every future commit
  until it was allowlisted" — reasoning written for a hand-invoked `gitleaks dir .` step. The
  actual `gitleaks-action` always calls `gitleaks detect` with `--log-opts` scoped to the
  **current push/PR event's own new-commit range** (`baseRef^..headRef`, or `-1` for a
  single-commit push) — neither a full tree walk nor a full history scan.
- **Resolution:** Used the action's built-in behavior as-is rather than reimplementing a raw `dir`
  scan by hand (which would mean not using the officially-maintained action's tested scan logic at
  all). This still satisfies the underlying requirement — a commit made with the hook bypassed is
  caught on push, before merge — and it specifically avoids the "re-reports the same historical
  finding forever" failure mode the plan's tree-scan preference was written to prevent, since only
  the new commits in each push are scanned, not the whole history each time. Required
  `fetch-depth: 0` on the job's checkout step (the official usage example does the same, for the
  same reason: the diff needs `baseRef`'s parent commit reachable).
- **Files modified:** `.github/workflows/ci.yml`
- **Committed in:** `d27e22b`

**2. [Rule 3 - Blocking] Task 3's "mirror the quality job's first four steps" instruction assumed
   a local `secrets:scan` npm script that no longer exists**
- **Found during:** Task 3 adaptation.
- **Issue:** With the npm wrapper rejected, there is no `secrets:scan` script and no local
  gitleaks binary in `node_modules` for a pnpm-installed job to invoke. gitleaks-action installs
  and runs its own binary internally and needs no access to this project's dependency tree.
- **Resolution:** Dropped the pnpm/Node/install steps from the `secrets` job entirely — mirroring
  them would add ~30s of pointless setup for a job that never uses it, the same "don't add a step
  this job doesn't need" reasoning the plan's own Task 3 text already applied to skipping the
  Playwright browser install.
- **Files modified:** `.github/workflows/ci.yml`
- **Committed in:** `d27e22b`

---

**Total deviations:** 1 checkpoint-driven scope adaptation (mechanism swap, pre-resolved before
dispatch) + 2 auto-fixed/adapted issues discovered while implementing that adaptation (both
Rule 3 - blocking, both necessary to make the swapped-in mechanism actually work as intended).
**Impact on plan:** GC-06's outcome (a secret reaching a commit is caught before merge, with no
detection-rule drift between runs) is preserved. What changed is the delivery mechanism (CI-action
instead of npm-wrapper-plus-hook) and the resulting absence of a local pre-commit half — both
directly downstream of the Task 1 checkpoint's supply-chain rejection, not scope creep.

## Issues Encountered

- **Two of three initial synthetic rehearsal secrets did not trip gitleaks' default rules on
  first attempt**, despite looking plausible by eye: an AWS-shaped key using the well-known AWS
  documentation example value (`AKIAIOSFODNN7EXAMPLE`) and a hand-authored PEM private-key block
  that was 2 characters short of the `private-key` rule's `{64,}` minimum-body-length requirement.
  Rather than keep guessing at exact regex shapes, switched to scanning gitleaks' own published
  test fixtures (`testdata/repos/nogit` from the matching v8.30.1 source tarball) — these are
  known-good positive/negative cases maintained by the tool's own authors, and are stronger
  rehearsal evidence than a self-authored synthetic value in any case. No project code was
  affected by this; it only affected how the local rehearsal was constructed.
- **`gitleaks git --log-opts="--all"` (149 commits) reported fewer commits than
  `git rev-list --all --count` (163) in this worktree.** Not investigated further — both counts
  agree on the result that matters (0 leaks), and the worktree shares its object store with the
  main repo, so the discrepancy is most plausibly other worktrees'/branches' refs visible to
  `rev-list --all` but outside whatever ref set gitleaks' internal `--all` resolves to. Recorded
  here rather than silently reconciled, per this project's "report what actually happened"
  convention.

## User Setup Required

None. No new environment variables, secrets, or manual steps — `GITHUB_TOKEN` is the
automatically-provided Actions token, already implicitly available with no repo configuration.

## Next Phase Readiness

- GC-06 is closed under the adapted (CI-only) mechanism: a secret reaching a pushed commit is
  caught before merge, and the rule set can never silently drift between contributors since there
  is only one place it runs (CI), pinned by an exact commit SHA.
- **Deferred, not a blocker:** D4's real-GitHub-Actions-remote confirmation for the new `secrets`
  job — this worktree-isolated executor does not push to origin; the orchestrator merges and
  pushes centrally. Confirm the `secrets` job is green on the real remote after merge (same
  deferral category as 01-05-SUMMARY.md's original CI setup and 01-13-SUMMARY.md's D5).
- If a local pre-commit secret-scan is wanted later, the two paths not pursued here (deferred by
  this plan's own Task 1 "neither" option, not silently dropped) are: a devcontainer-provisioned
  gitleaks binary, or a manually-documented one-off binary download step in `CONTRIBUTING.md`-style
  docs — neither exists in this project today.

## Known Stubs

None.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-17*

## Self-Check: PASSED

- FOUND (on disk): `.gitleaks.toml`.
- FOUND (via `grep`): `secrets:` job key present in `.github/workflows/ci.yml`.
- FOUND (via `git log --oneline --all`): commits `55b9b89`, `d27e22b`.
