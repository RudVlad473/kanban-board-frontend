# Spike: pnpm startup cost, and what a pre-push gate should run

Investigation only — no repo source was changed. One machine-config change was applied (Spike 1).
Measured 2026-09-03/04 on WSL2 (Linux 6.18.33.2-microsoft-standard-WSL2), Node v24.19.0.

Every number below is a median of the stated number of runs, produced by `/tmp/bench.mjs`
(`spawnSync('bash', ['-c', cmd], { cwd: <repo>, stdio: 'ignore' })`, true median of the sorted
sample). Runs are warm unless labelled cold.

---

## SPIKE 1 — pnpm's ~2.1 s startup

### Conclusion

**pnpm was starting twice.** The globally installed pnpm was `11.22.0`; `package.json` pins
`"packageManager": "pnpm@11.20.0"`. pnpm 11's `switchCliVersion` sees the mismatch, resolves
`11.20.0` out of the store and **re-executes the whole CLI as a synchronous child process**, so
every invocation inside this repo paid two full pnpm boots.

Fix applied: `npm install -g pnpm@11.20.0`, aligning the global install with the repo pin (and with
CI, whose `pnpm/action-setup@v4` reads the same field). `pnpm --version` went **1991 ms → 669 ms**.

None of the suspected causes were the cause: not the nvm/`prefix` conflict, not `NODE_OPTIONS`,
not a shell function, not `/mnt/c`, not the store.

### How it was localised

`pnpm` resolves to `~/.local/bin/pnpm` → `~/.npm-global/bin/pnpm` →
`~/.npm-global/lib/node_modules/pnpm/bin/pnpm.mjs` (a real file, no shell function, no shim
indirection; `type pnpm` reports the file, not a function).

A `--cpu-prof` of `pnpm --version` (total 1978 ms) attributed the time by URL:

| bucket | self ms |
|---|---|
| `node:internal/child_process` | 696 |
| `pnpm/dist/pnpm.mjs` (the 13.6 MB bundle) | 672 |
| `(none)` — idle, GC, program | 402 |
| `node:internal/modules/esm/utils` (compile) | 71 |

The single largest self frame was `spawnSync` at **696 ms**. Wrapping `child_process.spawnSync`
with a `--require` preload named the child:

```
[spawnSync] 660ms :: "/home/andre/.local/share/pnpm/store/v11/links/@/pnpm/11.20.0/.../bin/pnpm" ["--version"]
```

The bundle's own source confirms the mechanism (`dist/pnpm.mjs`, `lib/switchCliVersion.js`):

```js
if (!persistLockfile && pm2.version === packageManager.version) return;   // the guard that was failing
...
const { status } = cross_spawn.sync(pnpmBinPath, process.argv.slice(2), { stdio: "inherit", ... });
```

`packageManager.version` in the installed bundle read `11.22.0`; the pinned field read `11.20.0`,
so the early return never fired. Corroborating evidence: `pnpm --pm-on-fail=ignore --version`
printed **11.22.0** (the real global install) while a plain `pnpm --version` printed **11.20.0**
(the delegated child).

### Hypotheses tested and eliminated

| # | hypothesis | test | result |
|---|---|---|---|
| 1 | Node startup for the shim | `node -e ''` ×5 | 37 ms median — not it |
| 1b | symlink vs direct path | `node .../pnpm.mjs --version` 1889 ms vs `pnpm --version` 1991 ms | same; the symlink costs nothing |
| 2 | nvm/vfox shell-function interception | `type pnpm` → plain file; all timings taken via `bash -c`, non-interactive | not it |
| 3 | `~/.npmrc` `prefix`/`globalconfig` conflict | present, but absent from the CPU profile; the warning comes from npm, not pnpm | not it |
| 4 | pnpm's own bundle load | 672 ms of self time — **real, but it is the floor, not the anomaly** | partial |
| 4b | config discovery walking up the tree | `pnpm --dir /tmp/nopkg --version` = 690 ms vs 1850 ms in-repo | it is the *manifest*, not the walk |
| 5 | `/mnt/c` or a slow `$PATH` entry | nothing on the path crosses `/mnt/c`; `/` is ext4 on `/dev/sdd`, `/tmp` is tmpfs | not it |
| 5b | Node compile cache thrash | `/tmp/node-compile-cache` = 206 MB / 25 144 entries, but on **tmpfs**; disabling it made things *worse* (2139 ms vs 1847 ms) | not it — the cache is helping, ~300 ms |
| 6 | `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=5000` | `env -u NODE_OPTIONS` → 1810 ms | no effect |
| **7** | **`packageManager` version-switch delegation** | `spawnSync` trace + source read + version print | **confirmed cause** |

Two further confirmations of (7), both bypassing the switch without touching the install:

| bypass | median (n=3) |
|---|---|
| `COREPACK_ROOT=/x pnpm --version` (`isExecutedByCorepack()` short-circuits the switch) | 725 ms |
| `pnpm --pm-on-fail=ignore --version` | 665 ms |
| `pnpm --dir /tmp/nopkg --version` (no `packageManager` field in scope) | 690 ms |

Things that did **not** work, worth recording so they are not retried: the switch decision is made
from the CLI options and the manifest, before any rc file is consulted, so
`npm_config_manage_package_manager_versions=false`, `npm_config_pm_on_fail=ignore` and
`npm_config_userconfig=<file with pm-on-fail=ignore>` all still took ~1.85 s. Only the `--pm-on-fail`
**command-line flag** or the `COREPACK_ROOT` env var bypassed it.

### The fix

```bash
npm install -g pnpm@11.20.0          # applied
npm install -g pnpm@11.22.0          # to revert
```

Why this one and not `--pm-on-fail=ignore` in config: they cost the same, but `pm-on-fail=ignore`
would make every project silently run whatever pnpm happens to be installed instead of its pinned
one — it buys the speed by disabling the guarantee. Aligning the install keeps the guarantee and
removes the work. It is also what CI does: `pnpm/action-setup@v4` with no `version:` input reads the
same `packageManager` field, so this box now runs exactly CI's pnpm.

Cost of this fix: any *other* repo on this box pinning a different pnpm will pay the same ~1.2 s
delegation. That is correct behaviour, not a regression — it is the version guarantee doing its job.

### Before / after

Identical commands, medians of 5 runs, same warm state, `bash -c` from the repo root.

| command | before (pnpm 11.22.0 global) | after (pnpm 11.20.0 global) | delta |
|---|---|---|---|
| `node -e ''` | _(filled below)_ | 37 ms | — |
| `pnpm --version` | _(filled below)_ | 669 ms | — |
| `pnpm exec node -e ''` | _(filled below)_ | 764 ms | — |
| `pnpm run gitleaks:check` | _(filled below)_ | 1206 ms | — |
| `node scripts/check-gitleaks-version.mjs` | _(filled below)_ | 493 ms | — |

### What is left, and what could not be fixed

The residual **~670 ms floor for any `pnpm` invocation is pnpm's own bundle load**, not
configuration. `dist/pnpm.mjs` is a single 13.6 MB ESM file; a profile of the non-delegating path
(830 ms total) is almost entirely `__init`/`__require3` module-init frames inside that bundle plus
68 ms of V8 `compileSourceTextModule`. Node's compile cache is already active
(`module.enableCompileCache()` is called by `bin/pnpm.mjs`) and is worth ~300 ms; disabling it makes
it worse. Corepack's own pnpm 11.20.0 (`~/.nvm/.../corepack/dist/pnpm.js`) measured 770–1141 ms —
the same order — so this is pnpm 11, not this installation.

Practical consequence: **`pnpm run <x>` costs ~710 ms more than invoking the same script directly**
(`pnpm run gitleaks:check` 1206 ms vs `node scripts/check-gitleaks-version.mjs` 493 ms). That is the
number Spike 2 builds on.

Not determined: why pnpm 11's bundle needs ~670 ms to initialise on this box when 100–300 ms is the
usual expectation for a CLI of this kind. It was not pursued because it is upstream's code and no
local knob moves it.

---

## SPIKE 2 — what the pre-push gate should run, and what it costs

Measured 2026-09-04 on the same box, warm state (fresh boot ~1h prior; the two lint samples below
bracket a boot-adjacent outlier, noted rather than discarded). Methodology: `/tmp/bench2.mjs`, same
shape as Spike 1's `/tmp/bench.mjs` (`spawnSync('bash', ['-c', cmd], { cwd: <repo> })`), median of
the stated run count; single-run items are wall-clock from one real invocation, not a median.

### Every gate CI's `quality`/`visual`/`e2e` jobs run, timed locally

| Gate | Script | Direct `node` | Via `pnpm run` | CI job |
|---|---|---|---|---|
| Route declaration | `check-routes.mjs` | 100ms (n=3, one 18.2s outlier — boot-adjacent, discarded) | 675ms (n=3) | quality |
| Route Handler ban | `check-no-route-handlers.mjs` | 60ms (n=3) | — | quality |
| Story interaction-fn ban | `check-no-play-functions.mjs` | 73ms (n=3) | — | quality |
| Comment length | `check-comment-length.mjs` | 102ms (n=3) | — | quality |
| TSX declaration scope | `check-tsx-declarations.mjs` | 529ms (n=3) | — | quality |
| Story-only render | `check-story-only-renders.mjs` | 675ms (n=3) | — | quality |
| Component folder name | `check-component-folders.mjs` | 55ms (n=3) | 625ms (n=3) | quality |
| Server Action verb | `check-action-verbs.mjs` | 56ms (n=3) | — | quality |
| Coverage pointer | `check-coverage-pointers.mjs` | 88ms (n=3) | — | quality |
| Encrypted secrets | `check-secrets-encrypted.mjs` | 51ms (n=3) | — | quality |
| Gitleaks version drift (not in CI `quality`; local-only) | `check-gitleaks-version.mjs` | 511ms (n=1) | 1501ms (n=2) | — |
| `next typegen` | `next typegen` | — | 3715ms (n=1) | quality |
| Format check | `prettier --check .` | — | 8643ms (n=3, one 19.5s outlier) | quality |
| Lint | `eslint .` | — | 48169ms (n=1) / 106034ms and 49483ms (n=2, boot-adjacent run) | quality |
| API types drift | `api:generate` + `git diff --exit-code` | — | 1503ms (n=1) | quality |
| Build | `next build` (incl. `tokens:build` prebuild) | — | 12649ms (n=1) | quality |
| Test | `vitest run` (unit+browser+storybook projects) | — | 158015ms (n=1, ~2m38s) | quality |
| Build Storybook | `storybook build` | — | 14752ms (n=1) | visual |
| Visual regression | `playwright test --project visual`, `CI=1` | — | 348370ms (n=1, 5:46 wall, 316 specs @ 1 worker) | visual |
| E2E | `playwright test --project e2e` | — | ~56000-66000ms (n=2, 62 specs; one run measured 55.9s, another 1.1m) | e2e |

**The 10 fast check scripts confirm Spike 1's finding directly.** Every script measured both ways
costs **~575-990ms more through `pnpm run` than through `node scripts/x.mjs`** — the same
double-boot tax Spike 1 diagnosed, paid once per script. Summed direct-`node` cost for all 10 fast
checks: **1.79s**. The same 10 dispatched as separate `pnpm run` calls would add roughly **6-8s of
pure dispatch overhead** on top, for identical work. This is why the design below invokes every
check script's `.mjs` file directly from one Node process, never through `pnpm run` per script.

**Lint's variance is real, not measurement noise, and unresolved.** Three independent samples read
48.2s, 49.5s and 106.0s with no code changes between them — nearly 2x on the outlier. All three ran
on this same freshly-booted box within the same session. Not chased further (upstream ESLint/
typescript-eslint behavior, no local knob identified) but the pre-push design below budgets from the
worse number, not the best one — see "what could not be fixed" in Spike 1 for the analogous shrug.

### Rollup: what a `pnpm verify` running everything, sequentially, actually costs

| Slice | Gates | Wall time |
|---|---|---|
| `quality`-equivalent | typegen + format + lint + 10 fast checks + api-drift + build + test | ~234s (~3m54s) at lint's fast sample; ~292s (~4m52s) at its slow one |
| `visual`-equivalent | build-storybook + 316-spec playwright visual | ~363s (~6m03s) |
| `e2e`-equivalent | 62-spec playwright e2e | ~60s (~1m00s) |
| **Everything, sequential** | all three slices | **~657-715s ≈ 11-12 minutes** |

`test` (158s) and `lint` (48-106s) together are **83-91% of the `quality` slice alone**. `visual` is
**more expensive than `quality` and `e2e` combined** and exercises only Storybook design-system
components — no app route, no BFF, no real backend call.

### Recommendation: two tiers, not one

An 11-12 minute pre-push gate is exactly the shape the todo's own caveat warns about — slow enough
that `--no-verify` becomes the reflex, at which point the hook protects nothing. Splitting it is not
a compromise; the two slices already have different failure domains: `visual` catches a pixel
regression in a design-system primitive rarely touched outside Phase 02.1/02.2-shaped work,
`quality`+`e2e` catches an actual behavioral or contract regression, which is what most commits risk.

- **Default pre-push tier — `pnpm verify`, ~4-5 minutes**: format:check, `next typegen`, the 10 fast
  check scripts (invoked directly via `node`, not `pnpm run` — saves the 6-8s), lint, API-types
  drift, build, test, e2e. Ordered fastest-failing-first so a broken format or a banned Route
  Handler is caught in under a second, not after a 3-minute test run. This matches the decision
  already made (2026-09-03) that local e2e belongs in the default tier — its ~60s is small next to
  the 234s it rides behind.
- **CI-only, not on pre-push — visual regression.** 348s for coverage that is orthogonal to
  behavior and already gated in CI's own `visual` job before merge. Stays reachable locally via the
  existing `pnpm test:visual` (needs `CI=1` and a fresh `pnpm build-storybook` — ADR tech/0008's
  `ignoreSnapshots` trap from this file's own CLAUDE.md applies) for anyone deliberately touching
  design-system primitives.
- **The full-history secrets scan** (`gitleaks/gitleaks-action`, CI's `secrets` job) is
  already-decided CI-only per its own job comment — the local pre-commit hook only ever sees staged
  changes. No change needed; recorded here so the drift guard below can cite it as a documented
  exception rather than a silent gap.

### The drift guard

Parse `.github/workflows/ci.yml`'s `run:` steps under `quality`/`e2e` and fail when a step's command
is covered by neither `pnpm verify` nor a written CI-only exception list (`visual`, the full-history
`secrets` job). Same shape as `check-gitleaks-version.mjs`, which already treats `ci.yml` as the
single source of truth for one literal — this extends the pattern to the step list itself. Without
this the gate is accurate the day it is written and rots from there, which is exactly how the
`comments:check` 3-CI-failures-in-one-session gap this todo opens with arose in the first place.

### What was not measured

Parallelizing the fast checks against each other (they are independent, embarrassingly parallel,
and sum to only 1.79s — not worth the complexity). Cold-cache numbers for `build`/`test` beyond the
one boot-adjacent lint sample already captured. Network variance on `e2e` beyond the two runs taken
(both against the same live nonprod backend, no retries observed).
