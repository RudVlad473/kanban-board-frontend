# 0033 — Pin the CI runtime layer, and keep the pins fresh with Dependabot

## Context

The package tier of this repo's supply chain was already well covered — `packageManager:
pnpm@11.20.0` is exact, every job runs `pnpm install --frozen-lockfile`, and `@playwright/test` is
exact-versioned. The gap sat one layer up, in the CI *runtime* that executes those pinned
packages, found in a 2026-09-03 audit of both workflow files:

- **`runs-on: ubuntu-latest`** on all five jobs. GitHub migrates that label between images on its
  own schedule, and font rasterization differs between images — the `visual` project's
  `toHaveScreenshot` baselines can red on a day nothing in the repo changed, with the "fix" looking
  like re-recording baselines against an unknown renderer.
- **Fourteen-plus call sites on mutable action tags** — `actions/checkout@v5`,
  `actions/setup-node@v5`, `actions/upload-artifact@v4`, `pnpm/action-setup@v4`. A tag is a
  movable ref, the exact mechanism behind the `tj-actions/changed-files` compromise
  (CVE-2025-30066, March 2025): the attacker re-pointed existing tags and thousands of repos
  leaked secrets into their logs. `gitleaks/gitleaks-action` was already SHA-pinned in `ci.yml`
  (docs/adr/tech/0032) and is the model this record generalizes.
- **No `permissions:` block in `ci.yml`**, so the default `GITHUB_TOKEN` scope applied — the
  multiplier on the previous point, since an unpinned third-party action holding a write-capable
  token is the tj-actions scenario. `visual-baselines.yml` already declared one.
- **`node-version: 24` and `.nvmrc: 24`**, both floating across 24.x minors and patches, so CI's
  Node and the locally-installed Node could drift apart silently.
- **No Dependabot or Renovate config existed.** Pinning without an update mechanism converts a
  drift problem into a staleness problem — the repo would stop receiving security patches for the
  exact things it just froze.

## Decision Outcome

**Everything that executes in CI is pinned to an exact, reproducible reference, and Dependabot is
the mechanism that keeps those pins from going stale.**

### Runner image: `ubuntu-24.04`, not `ubuntu-latest`

All five jobs across `ci.yml` and `visual-baselines.yml` name the runner image explicitly. A pixel
diff caused by an image migration is now something Dependabot proposes as a reviewable bump, not
something that lands unannounced between two otherwise-identical runs.

### Actions: full commit SHA, with a version comment

`actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, and `pnpm/action-setup` are
each pinned to the 40-character commit SHA that their `@v5`/`@v4` tag currently resolves to, with
a trailing `# vX.Y.Z` comment — the same format `gitleaks/gitleaks-action` already used. One
correction made while resolving these: `pnpm/action-setup`'s tags are annotated, so the SHA behind
its `git/refs/tags/v4` ref is the *tag object*, not the commit — dereferencing it one level
(`git/tags/<sha>` → `.object.sha`) was required to get the actual commit pin. `actions/checkout`,
`actions/setup-node`, and `actions/upload-artifact` all use lightweight tags, where the ref's own
SHA already is the commit.

### `permissions: contents: read` at the top of `ci.yml`

Matches the pattern `visual-baselines.yml` already used. No job in `ci.yml` writes to the repo —
unlike `visual-baselines.yml`, which pushes a branch and opens a PR and keeps its own
`contents: write` / `pull-requests: write` escalation — so no job needed an additional grant.

### Node pinned to `24.19.0`, in both `ci.yml` and `.nvmrc`

Matches the version already installed on the machine this was pinned from, so the change costs no
local upgrade. Both files carry the same literal by hand; nothing currently asserts they match the
way `check-gitleaks-version.mjs` asserts the gitleaks pin (see Consequences).

### `pnpm exec playwright install --with-deps` is accepted unpinned

This installs distro system libraries (not the browser binary, which is already pinned through
`@playwright/test`'s exact lockfile version) at run time via `apt`. Left unpinned deliberately:
the package set is derived by Playwright's own installer from the pinned Playwright version
against whatever `ubuntu-24.04` currently ships, and pinning individual `apt` package versions
would fight the runner image's own package index rather than this repo's dependency tree. The
runner image pin above already bounds how much that surface can drift between runs.

### Dependabot: `github-actions` and `npm` ecosystems, weekly

`.github/dependabot.yml` covers both action SHAs (so `# v5.1.0` doesn't silently become a lie) and
`package.json` dependencies via the `npm` ecosystem name, which Dependabot uses generically for
any `package-lock.json`/`pnpm-lock.yaml`/`yarn.lock` project — there is no separate `pnpm`
ecosystem identifier. Landed before the SHA pins in the same body of work, not after: pinning
without the update mechanism already in place is the staleness trap this record exists to avoid.

## Consequences

- Every action reference in both workflow files now resolves to one immutable commit; a
  compromised tag cannot silently change what CI executes.
- The `visual` job's baselines are now tied to `ubuntu-24.04` specifically. Re-recording baselines
  after this change was expected to be necessary (font rasterization) and follows the existing
  `visual-baselines.yml` process — `pnpm build-storybook` fresh, then a reviewable PR with an
  image diff, never a direct baseline commit.
- Dependabot's weekly `github-actions` bump PRs will each need a human to update the trailing
  `# vX.Y.Z` comment to match, since Dependabot only manages the SHA in the `uses:` line — the
  comment is documentation, not something it parses.
- **Not currently enforced**: nothing asserts `.nvmrc` and `ci.yml`'s `node-version:` fields stay
  equal, unlike the gitleaks version pin (docs/adr/tech/0032), which has
  `scripts/check-gitleaks-version.mjs` holding both sides to one source of truth. A future
  divergence here would fail silently rather than being caught by a script.
- `pnpm exec playwright install --with-deps`'s system-library surface remains outside this pin;
  see the decision above for why.

Unwind trigger: if the two Node literals actually drift in practice, add a check script on the
`check-gitleaks-version.mjs` pattern rather than trusting manual discipline a second time.

**Enforcement:** none automated beyond Dependabot itself proposing the update PRs; the SHA pins
and runner image are enforced only by being literals in the workflow files, reviewed like any
other change.

Sources:

- `.github/workflows/ci.yml`, `.github/workflows/visual-baselines.yml` — the pins themselves.
- `.github/dependabot.yml` — the update mechanism.
- `docs/adr/tech/0032` — the `gitleaks/gitleaks-action` pin this record generalizes, and the
  `check-gitleaks-version.mjs` pattern noted above as unapplied to the Node pin.
- `.planning/todos/completed/2026-09-03-pin-ci-runtime-layer-runner-image-actions-node.md`,
  `.planning/todos/completed/2026-09-03-set-next-telemetry-disabled-flag-for-ci-and-fresh-clones.md`
  — the originating todos.
