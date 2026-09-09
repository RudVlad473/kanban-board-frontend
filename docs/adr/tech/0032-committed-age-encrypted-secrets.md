# 0032 — Committed age-encrypted secrets, and one pinned secret scanner

## Context

Two problems, joined because the same file and the same tool sit at the centre of both.

**Secrets did not travel with the repo.** `.env.local` is gitignored and had to be created
per-clone, per-worktree. That produced a chain of workarounds rather than one solution: a
`Read(.env.*)` deny in the agent harness, a `~/.claude/bin/seed-worktree-env` wrapper written
solely to get around that deny, a `Bash(cp .../.env.local *)` permission rule that never worked
because a deny beats an allow, and a documented instruction to copy the file into every worktree
by hand. A `git worktree add` that starts with no `NONPROD_RESET_TOKEN` cannot run e2e at all,
and `e2e/global-setup.ts` refuses the whole suite without it.

**The secret scanner's rule set changed silently between CI runs.** `ci.yml`'s `secrets` job used
`gitleaks/gitleaks-action` with no `GITLEAKS_VERSION`. Observed 2026-09-03 at the pinned action
SHA (`src/gitleaks.js`): with that variable unset the action calls `getLatestRelease()` and
installs whatever is newest at run time. So a green history recorded that *some* rule set passed,
with nothing in the repo saying which — the run was neither reproducible nor attributable. There
was also no local half at all: `01-18-SUMMARY.md` records that decision, taken because the only
local options then found were single-maintainer npm repackagings of the gitleaks binary.

## Decision Outcome

**The real nonprod values are committed as age-encrypted ciphertext at `secrets.enc.env`,** and
the pinned gitleaks release is a committed fact that local tooling is held to.

### Committing real values rather than a placeholder

A placeholder file would have kept every workaround above — the deny, the wrapper, the copy step —
because a clone would still arrive without working values. Committing the ciphertext is what
deletes them. The cost is accepted and is real: **this ciphertext is permanent in git history.**
Rotation means re-encrypt, commit, and rotate the value upstream; the old ciphertext stays
reachable forever. Scope is nonprod only — no production credential goes in this file.

### The key

The age private key lives at `~/.config/sops/age/keys.txt`, SOPS's own default lookup path, with
`SOPS_AGE_KEY_FILE` as the override. Only the public recipient is committed, in `.sops.yaml`.

**Losing the key while no plaintext copy survives makes `secrets.enc.env` unrecoverable.** Back it
up. Nothing in this repository can recover it, and nothing warns you before it matters.

`path_regex` in `.sops.yaml` matches both the plaintext path and the ciphertext path. Measured
2026-09-03 with sops 3.13.3: sops matches creation rules against the file it is *reading*, so a
regex naming only the `--output` path fails with `no matching creation rules found`.

### The allowlist and its assertion are one mechanism

`.gitleaks.toml` carries a single anchored, path-only allowlist entry for `secrets.enc.env`.
Allowlisting a path removes it from the only automated secret scan, so it is paired with
`pnpm secrets:check`, which asserts every assignment in that file is SOPS ciphertext. The check
also asserts the allowlist literal is still present in `.gitleaks.toml`, so the two halves cannot
drift apart. Both landed in one commit; neither is meaningful alone.

**Recorded honestly: gitleaks 8.30.1 does not currently flag that ciphertext at all** — the entry
suppresses nothing today. It is kept anyway, against this project's own "allowlist nothing on
suspicion" rule, because `secrets.enc.env` is not a file that *resembles* credentials, it is
credential material by construction and will be for as long as it exists. Proven load-bearing
rather than assumed: a fabricated credential-shaped literal in that file was invisible to
gitleaks, while the same literal at a non-allowlisted path reported one finding.

The check runs on the **index** in `.husky/pre-commit` and on disk in CI's `quality` job. Reading
the working tree in a hook would pass while plaintext sat staged. It is in `quality` rather than
`secrets` because the `secrets` job deliberately has no Node/pnpm setup.

### Pinning the scanner, and what pinning costs

`GITLEAKS_VERSION: "8.30.1"` is pinned in `ci.yml` and that literal is the single source of truth.
Two readers parse it: `scripts/install-verified-tools.sh` installs that release locally, and
`pnpm gitleaks:check` fails when the local binary differs. Writing the version anywhere else is
the drift both exist to prevent; both refuse to guess when the pin is missing or duplicated.

**The cost is accepted: a newly published rule that would catch a real secret is not enforced
until someone bumps the pin.** Reproducibility is worth more here — the scan surface is small, and
a green history that cannot be attributed to a known rule set is not evidence of anything. Two
mitigations ship: `scripts/install-verified-tools.sh` prints a non-fatal notice when upstream is
newer than the pin, firing exactly when someone is already touching tooling and costing CI
nothing; and the pin is re-checked at each milestone close and whenever that notice appears.

**Rejected: a scheduled workflow polling for new gitleaks releases.** Maintenance surface and
notification noise on a solo project, for a signal the install script already delivers at the
moment it can be acted on. Unwind trigger: adopt it if a missed rule ever actually bites.

The singular `[allowlist]` table form is used rather than `[[allowlists]]`, which does not parse
before gitleaks 8.19 — with the version pinned that matters less than it did, but it removes
config-syntax skew as a variable if the pin is ever moved down.

### One setup command, not four steps

`pnpm setup:worktree` runs install, `next typegen` plus the `next-env.d.ts` restore, and the
decrypt — skipping the decrypt with a notice rather than overwriting an existing plaintext file.
Four documented steps was the shape that already failed twice here: CLAUDE.md documented
`next typegen` and two separate executors still skipped it, then reported the resulting phantom
`no-unsafe-assignment` errors as a real regression. Falsified both ways: with the script, lint
reports 0 errors in a fresh worktree; with generated types removed, exactly those 3 errors return.

**A `post-checkout` hook would have been better and does not work.** git 2.53.0 fires it on
`git worktree add`, but `core.hooksPath` is `.husky/_`, husky self-ignores that directory, and
only `.husky/pre-commit` is tracked — so a fresh worktree has no hook directory at checkout time.
The directory is recreated by husky during `pnpm install`, which is step 1 of what the hook would
have automated. False if `.husky/_` becomes tracked or husky stops setting `core.hooksPath`.

### What is deliberately NOT checked

Silence reads as coverage, so:

- **The pre-commit gitleaks scan covers staged changes only.** It never re-examines history. CI's
  `fetch-depth: 0` `secrets` job remains the only thing that does, and remains the authoritative
  gate. The local half is additive.
- **`.env.local` and `secrets.enc.env` can drift silently.** `pnpm secrets:verify` is the manual
  detector and nothing automatic runs it. A value changed locally and never re-encrypted is
  invisible until someone else decrypts.
- **`--no-verify` and a machine without the hook both bypass the local half entirely.** That is
  why the same assertion runs in CI.

### Supply chain, stated as observed

`age` comes from Ubuntu's signed archive (`1.2.1`). `sops` (`v3.13.3`) and `gitleaks` (`8.30.1`)
are release binaries fetched by `scripts/install-verified-tools.sh` and sha256-verified against
each release's own checksums file, aborting on mismatch. **A same-origin checksum proves transfer
integrity, not provenance.** `gh attestation verify` was attempted against both repositories on
2026-09-03 and returned HTTP 404 for each — no GitHub-native SLSA attestation is published, so
what was actually obtained is transfer integrity plus a distro signature for `age`, and nothing
stronger for the other two. sops does publish a Sigstore bundle over its checksums file; verifying
it needs `cosign`, which is not installed and was not adopted here.

## Consequences

- A fresh clone or worktree needs exactly three things: the age key, `pnpm tools:install`, and
  `pnpm setup:worktree`. Proven end to end — a scratch worktree reached a successful `pnpm build`
  from the committed ciphertext alone, with no copy from any other checkout.
- `~/.claude/bin/seed-worktree-env`, the `Bash(cp .../.env.local *)` rules in
  `.claude/settings.local.json`, and the machine-memory entry describing that workaround are all
  obsolete. They live outside this repository and are not deleted by this record.
- The harness still refuses a Bash command whose own text names a `.env` path. That is why every
  plaintext path lives inside `scripts/secrets.sh` and `pnpm secrets:*` is the only usable
  spelling. This survives the change and is the one durable fact from the old workaround.
- `pnpm secrets:decrypt` overwrites the local plaintext file unconditionally. A local-only
  override belongs in the encrypted file, not beside it.
- The expired, unread `VERCEL_OIDC_TOKEN` that `vercel` had written into `.env.local` was dropped
  rather than encrypted: 12-hour lifetime, nothing in this repository reads it, and committing it
  would have made `pnpm secrets:verify` report drift on every `vercel env pull`.
- Commit latency rose 1.3s, not the 8.5s the obvious wiring cost. Three `pnpm run` invocations
  were ~80% dispatch overhead, so the hook calls one script that runs all three checks in one
  process. A hook expensive enough to invite `--no-verify` is a hook that does not run.

Unwind trigger: if the ciphertext-in-history cost ever stops being acceptable — a production
credential in scope, or a compliance requirement — the answer is a hosted secret store, not a
placeholder file, because a placeholder reinstates every workaround the Context lists.

**Enforcement:** `pnpm secrets:check`, blocking, in `.husky/pre-commit` (index) and CI's `quality`
job (disk). `pnpm gitleaks:check` and the staged `gitleaks git --staged --redact -v` scan, both
blocking, in `.husky/pre-commit`. CI's `secrets` job is unchanged in posture and remains the
authoritative full-history gate.

Sources:

- `.sops.yaml`, `secrets.enc.env`, `scripts/secrets.sh` — the encryption path and every plaintext
  path in the project.
- `scripts/install-verified-tools.sh`, `scripts/setup-worktree.sh` — toolchain and one-command setup.
- `scripts/check-secrets-encrypted.mjs`, `scripts/check-gitleaks-version.mjs` — the two gates, each
  with a sibling `.unit.test.mjs`.
- `.github/workflows/ci.yml` — the `GITLEAKS_VERSION` pin and the `Encrypted secrets check` step.
- `01-18-SUMMARY.md` — the original CI-only decision this record supersedes rather than reverses.
