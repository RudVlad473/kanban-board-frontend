---
phase: quick-260903-ttt
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [QT-TTT-01, QT-TTT-02, QT-TTT-03, QT-TTT-04]

files_modified:
  - .github/workflows/ci.yml
  - scripts/install-verified-tools.sh
  - .sops.yaml
  - secrets.enc.env
  - package.json
  - .gitleaks.toml
  - scripts/check-secrets-encrypted.mjs
  - scripts/check-secrets-encrypted.unit.test.mjs
  - scripts/check-gitleaks-version.mjs
  - scripts/check-gitleaks-version.unit.test.mjs
  - .husky/pre-commit
  - docs/adr/tech/0032-committed-age-encrypted-secrets.md
  - SETUP.md
  - README.md
  - CLAUDE.md
  - .planning/STATE.md
  - .prettierignore
files_deleted:
  - .planning/todos/pending/2026-08-22-reopen-local-pre-commit-gitleaks-investigation.md

user_setup: []

estimate:
  tokens: 155000
  raw_tokens: 155000
  tasks: 4
  confidence: low

must_haves:
  truths:
    - "A fresh worktree with no `.env.local` gets working env vars from `pnpm secrets:decrypt` alone — only the committed `secrets.enc.env` plus the age key at `~/.config/sops/age/keys.txt`, with no copy from another checkout and no `~/.claude/bin/seed-worktree-env`."
    - "`pnpm secrets:decrypt` reproduces the original `.env.local` byte-for-byte (checksum-equal round trip), and `pnpm build` succeeds in that worktree off the decrypted file."
    - "CI's secret scan runs a gitleaks version recorded in the repo, not whatever is latest at run time — `GITLEAKS_VERSION` is pinned in `ci.yml`'s `secrets` job."
    - "The locally installed gitleaks is the same release CI runs, fetched from the same URL and checksum-verified, and `pnpm gitleaks:check` FAILS when the two differ — proven by pointing the pin at a wrong version and watching it fail."
    - "`pnpm gitleaks:check` also fails when gitleaks is absent locally, naming `pnpm tools:install` — a hook that silently passes without the scanner is worse than no hook."
    - "Staging plaintext at `secrets.enc.env` and running `git commit` is REFUSED by the pre-commit hook — proven by an actual attempted commit that exits non-zero and names the file."
    - "Staging a fabricated credential literal at a NON-allowlisted path is REFUSED by the pre-commit gitleaks scan, and the refusal output does not contain the literal (`--redact` proven, not assumed)."
    - "One experiment proves both halves of the allowlist pair: the same fabricated literal in `secrets.enc.env` is invisible to gitleaks (by-path allowlist works) and fails `pnpm secrets:check` (encryption assertion works)."
    - "gitleaks reports the same finding counts over the working tree and full git history after the allowlist entry as before it, and a positive control at a non-allowlisted path proves the scan was actually running."
    - "Deleting or renaming the gitleaks allowlist entry fails `pnpm secrets:check` — the two halves cannot silently drift apart."
    - "`scripts/install-verified-tools.sh` reproduces the whole toolchain in a fresh clone: sops and gitleaks, both checksum-verified against their own release checksums files, into a user-writable dir."
    - "No plaintext secret value is ever written to a tracked path, printed to a terminal, or echoed in any check-script or scanner output."
    - "SETUP.md, README.md and CLAUDE.md describe the decrypt path; CLAUDE.md's fresh-worktree section no longer instructs a `.env.local` copy; `ci.yml`'s `No local pre-commit half exists` comment is corrected rather than left contradicting the code."
    - "The gitleaks todo is in `.planning/todos/completed/`, recording which of its four options was taken and why the other three were not."
    - "CI is green on all four jobs (`secrets`, `quality`, `visual`, `e2e`) on the pushed branch."
  artifacts:
    - scripts/install-verified-tools.sh
    - .sops.yaml
    - secrets.enc.env
    - scripts/check-secrets-encrypted.mjs
    - scripts/check-gitleaks-version.mjs
    - docs/adr/tech/0032-committed-age-encrypted-secrets.md
  key_links:
    - "`ci.yml`'s `GITLEAKS_VERSION` literal -> `scripts/check-gitleaks-version.mjs` and `scripts/install-verified-tools.sh`, which both PARSE it. One home, two readers. Writing the version in three places is exactly the drift this task exists to kill."
    - "`.gitleaks.toml`'s allowlist path literal <-> the same literal in `scripts/check-secrets-encrypted.mjs` — a silent drift here is the hole an allowlisted path opens, so the script asserts the literal is still present in `.gitleaks.toml`."
    - "`.husky/pre-commit` -> `pnpm secrets:check --staged` -> `git show :secrets.enc.env` — reading the working tree instead of the index would pass while plaintext is staged."
    - "`pnpm secrets:scan`'s `--redact` flag -> the hook's own output — without it, the guard that catches a secret is the thing that prints it into the transcript and the terminal scrollback."
    - "`pnpm secrets:decrypt` as the ONLY documented decrypt command — a raw shell command naming `.env.local` is refused by the harness permission layer, so the npm-script indirection is the mechanism that delivers the payoff."
    - "`.sops.yaml`'s `path_regex` -> the path sops applies creation rules to when encrypting — if it matches only the output path, `pnpm secrets:encrypt` fails with `no matching creation rules`."
    - "The new `Encrypted secrets check` step in CI's `quality` job — without it the assertion runs only locally, and a machine without the hook could push plaintext straight past the allowlisted `secrets` job."
---

<objective>
Two joined goals.

**Secrets:** move local secret management onto SOPS + age. Commit the real nonprod values as
age-encrypted ciphertext at `secrets.enc.env`, allowlist that one path in gitleaks, and pair the
allowlist with an encryption assertion that runs in both the pre-commit hook and CI.

**Tooling parity:** stop the local and CI secret scanners from drifting. Pin CI's gitleaks version
in the repo, install that exact release locally through a committed checksum-verifying install
script, add a pre-commit gitleaks scan over staged changes, and add a guard that fails when the
local binary and the CI pin disagree.

Purpose: a fresh clone or `git worktree add` arrives with the secrets already in it — deleting the
`Read(.env.*)` permission deny, the `~/.claude/bin/seed-worktree-env` wrapper, and per-worktree env
seeding at once. A placeholder file would keep all three, which is why committed ciphertext is the
point rather than a side effect. And a scanner whose rule set changes silently between CI runs means
a green history proves nothing about today's rules — so the version becomes a committed fact that
local tooling is held to.

Output: `.sops.yaml`, `secrets.enc.env`, `scripts/install-verified-tools.sh`, five `secrets:*`/
`gitleaks:*`/`tools:*` package scripts, two `scripts/check-*.mjs` gates with unit tests, a pinned
`GITLEAKS_VERSION`, a gitleaks allowlist entry, ADR `tech/0032`, updated SETUP.md / README.md /
CLAUDE.md, and the 2026-08-22 gitleaks todo closed.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.gitleaks.toml
@SETUP.md
@lint-staged.config.mjs
@scripts/check-coverage-pointers.mjs
@scripts/glob-real-files.mjs
@.planning/todos/pending/2026-08-22-reopen-local-pre-commit-gitleaks-investigation.md
</context>

<hard_constraints>

These bind every task. A violation is not a bug to fix afterwards — it is a real leak into a stored
transcript or into git history.

1. **Never print secret material.** Do not `cat`, `grep`, `echo`, `head`, `sed` or otherwise emit
   the contents of `.env.local`, any decrypted output, or `~/.config/sops/age/keys.txt`. Values move
   between files through `sops --output` and shell redirection only. Comparisons are done by
   checksum through a script that prints `match`/`mismatch`, never by printing either side. Reading
   `secrets.enc.env` (ciphertext) and `.sops.yaml` (public recipient) is fine and expected.
2. **Every gitleaks invocation carries `--redact`** (or whatever 8.30.1 spells it — confirm with
   `gitleaks --help`). A scanner that prints the secret it found is a leak wearing a guard's costume.
3. **Never `cd`.** The `Read(.env.*)` deny leaves the permission layer unable to resolve a changed
   cwd, so every `cd` prompts the human. Use `git -C <dir>`, `pnpm --dir <dir>`, absolute paths.
4. **A command whose text names `.env.local` may be refused outright.** Confirmed at planning time:
   a `sed`/`cat` invocation naming `.env.example` was denied by the permission layer even from Bash.
   This is why every secret operation is wrapped in a `pnpm secrets:*` script whose own command text
   contains no `.env` path. If you find yourself typing `.env.local` into a Bash call, move that
   operation into the script instead.
5. **Falsification probes use a fabricated literal, never a real value.** Use something
   self-evidently fake, e.g. `SESSION_SECRET=falsification-probe-not-a-real-secret`, and for the
   gitleaks positive control a syntactically credential-shaped but obviously fabricated string. If a
   guard unexpectedly fails to fire, a fake literal is a harmless artifact; a real one is permanent.
6. **Do not push until Task 4.** Tasks 1-3 land intermediate states — ciphertext before its
   allowlist exists, a pin before its guard exists — that are not meant to face CI on their own.
   This is a deliberate deviation from CLAUDE.md's "push after each logical unit"; say so in the
   summary.
7. **Do not weaken the CI `secrets` job.** It stays, it keeps `fetch-depth: 0`, it keeps the pinned
   `gitleaks/gitleaks-action` SHA, and `[extend] useDefault = true` stays in `.gitleaks.toml`. The
   local pre-commit scan added here is ADDITIVE — a second gate, never a replacement.
8. **Comment style.** `pnpm comments:check` gates `scripts/**/*.mjs` at 3 prose lines per comment
   run, and two adjacent `/* */` blocks count as one run. Follow `~/.claude/CODE_COMMENTS.md`. Cite
   `docs/adr/tech/0032` (a path a reader can open), never `D1`/`D2`/`D3`/`QT-TTT-NN` or any other
   planning token, in code comments. The `ci.yml` and `.gitleaks.toml` comments are the "decision
   record" class the rules explicitly allow to be long — keep those falsifiable and dated.

</hard_constraints>

<locked_decisions>

Implemented, not revisited:

- **D1 — commit the REAL nonprod values, age-encrypted.** `secrets.enc.env` holds the actual
  `.env.local` values as ciphertext and is tracked. The user has accepted that this ciphertext lives
  in git history permanently and that rotation means re-encrypt + commit. Do not substitute a
  placeholder, and do not open a checkpoint asking about it again.
- **D2 — the gitleaks allowlist is BY PATH ONLY, paired with an encryption assertion.** Both halves
  land in one commit (Task 2) or neither does.
- **D3 — the age private key stays out of the repo**, at `~/.config/sops/age/keys.txt`, with
  `SOPS_AGE_KEY_FILE` documented as the override for a non-default location. The repo commits only
  the public recipient, in `.sops.yaml`.

</locked_decisions>

<preflight_facts>

Measured on this box on 2026-09-03. Re-verify anything you depend on; do not re-derive the rest.

- `sops`, `age`, `age-keygen`, `gitleaks` are all absent. `~/.local/bin` exists, is user-writable,
  and is on PATH in this harness's non-interactive shells (`gh` resolves from there).
- `age` is in apt at `1.2.1-1build1`; this box has passwordless sudo for apt only. **apt is correct
  for `age` and wrong for `gitleaks`** — apt's gitleaks is `8.16.0-1build2`, fourteen minor versions
  behind, so a local "clean" from it would prove almost nothing about CI's rule set.
- Latest upstream releases at planning time: sops `v3.13.3`, gitleaks `v8.30.1` (published
  2026-03-21; prior releases 8.30.0, 8.29.1, 8.29.0, 8.28.0).
- **CI's secret scan is NOT version-pinned today.** `ci.yml:44-46` uses
  `gitleaks/gitleaks-action@e0c47f4f...` (v3.0.0) with only `GITHUB_TOKEN` in `env:`. At that SHA,
  `src/gitleaks.js:19-27,74-89` installs `GITLEAKS_VERSION` when set and otherwise calls
  `octokit.rest.repos.getLatestRelease()` — so the enforced rule set changes under us between runs
  with nothing in the repo recording it. The action downloads from
  `https://github.com/gitleaks/gitleaks/releases/download/v{version}/gitleaks_{version}_{platform}_{arch}.tar.gz`
  and its README states `GITLEAKS_VERSION` takes a bare version with no `v` prefix.
- `.gitleaks.toml` today has `[extend] useDefault = true` and zero allowlist entries. Its header
  states the project rule — allowlist nothing on suspicion, every entry carries a one-line reason —
  and asserts "No `[[rules.allowlist]]` entries below". That goes stale in Task 2 and must be
  rewritten in the same commit.
- `ci.yml`'s `secrets` job comment (lines 24-30) asserts "No local pre-commit half exists for this
  control" and explains the supply-chain reasoning that made CI the sole gate. That becomes false in
  Task 3 and must be corrected there.
- `.husky/_/h` runs the hook with `sh -e "$s"`, so a non-zero exit from the first command in
  `.husky/pre-commit` already aborts it. No `set -e` or `&&` chaining is required — but prove that
  with the Task 2/3 falsifications rather than trusting this line.
- `.gitignore` ignores `.env` and `.env*.local`. `secrets.enc.env` matches neither, so it is
  trackable, and it is not caught by the harness's `Read(.env.*)` deny either — both are reasons to
  keep that exact name rather than an `.env.*` spelling.
- CI's `quality` job is where all eleven `pnpm *:check` gates run; the `secrets` job deliberately has
  no Node/pnpm setup (its own comment says so), so the new encryption gate belongs in `quality`.
- `vitest.config.ts`'s `node` project includes `scripts/**/*.unit.test.mjs`, so sibling unit tests
  for the new check scripts run under `pnpm test` with no config change.
- `scripts/check-coverage-pointers.mjs` scans `src/**` and `app/**` only, so it does not require the
  new scripts to carry a coverage pointer. Their unit tests exist because nine sibling check scripts
  have one, and because they are how each guard gets falsified — not to satisfy that gate.
- `e2e/seed.sh` is the precedent for a committed shell script in this repo. `scripts/` currently
  holds only `.mjs`; prettier has no `.sh` parser and `comments:check` globs only `scripts/**/*.mjs`,
  so a `.sh` there is gated by neither.
- **No new npm/pip/cargo package is installed by this change.** The Package Legitimacy Gate does not
  apply. The only third-party artifacts are release binaries, covered by T-QT-TTT-03 below.

</preflight_facts>

<tasks>

<task type="tracer">
  <name>Task 1: End-to-end "a fresh worktree installs the pinned toolchain and decrypts working env vars" — one path only</name>
  <files>.github/workflows/ci.yml, scripts/install-verified-tools.sh, .sops.yaml, secrets.enc.env, package.json</files>
  <precondition>`git -C /home/andre/dev/kanban-board-frontend status --porcelain` shows only the known `next-env.d.ts` modification; `.env.local` exists at the repo root (verify with `test -f`, never by reading it).</precondition>
  <reversibility rating="one-way">Committing ciphertext of real nonprod credentials puts it in git history permanently. Already decided and accepted (D1) — no new checkpoint. The guard against the irreversible *failure* is the round-trip proof below: never commit ciphertext that has not been shown to decrypt back to the original.</reversibility>
  <action>
Establish a version-pinned, reproducible toolchain, then prove one complete path from committed
ciphertext to a running build — before any guard exists.

**1a — pin CI's scanner version first, because it becomes the single source of truth.** Add
`GITLEAKS_VERSION: "8.30.1"` to the `Scan for secrets` step's `env:` in `ci.yml`'s `secrets` job,
alongside the existing `GITHUB_TOKEN`. Write the reason as a decision-record comment: without a pin
the action resolves the latest release at run time, so the rule set enforced changes between runs
with nothing in the repo recording which one passed — a green history proves nothing about today's
rules. Date it, name the action's own resolution behaviour as the observed fact, and state what
would make the comment false. **Do not** also write the version into the install script or the
guard: `ci.yml` is the one home, and both of them parse it. Leave the `secrets` job's stale "No
local pre-commit half exists" comment alone for now — Task 3 owns correcting it, because that is
the commit that makes it false.

**1b — write the checksum-pinned binary install convention.** `scripts/install-verified-tools.sh`,
a committed, idempotent script that installs both tools into `~/.local/bin`:

- **gitleaks** — parse the pinned version out of `.github/workflows/ci.yml`; abort loudly if it
  finds zero or more than one match rather than falling back to a default. Download
  `gitleaks_<version>_linux_x64.tar.gz` and `gitleaks_<version>_checksums.txt` from that release,
  verify sha256 against the checksums file, abort on mismatch, extract, install, `chmod +x`.
- **sops** — pinned to `v3.13.3` by a constant in this script. State the asymmetry in a comment:
  gitleaks' version lives in `ci.yml` because CI is the other consumer and drift between them is the
  failure being prevented; sops has no CI counterpart, so the script is its natural home.
- `age` via `sudo apt install -y age` (passwordless apt on this box; a distro-signed package is
  better provenance than a release binary) — but skip cleanly if it is already present.
- Print the resolved versions of all three at the end. Do not print anything else.
- **Best-effort staleness notice, non-fatal**: query the latest gitleaks release via `gh` (already
  installed) and print a notice when the pin is older than upstream. Skip silently if `gh` is absent
  or unauthenticated. This is the mitigation for the cost of pinning — see the Task 4 ADR — and it
  fires exactly when someone is already touching tooling, at zero CI cost.
- Additionally attempt `gh attestation verify` against `getsops/sops` and `gitleaks/gitleaks` as a
  best-effort provenance check and report the result either way. A same-origin checksum proves
  transfer integrity, not provenance; the summary should say which one you actually got.

Add `"tools:install": "bash scripts/install-verified-tools.sh"` to `package.json`. Run it. Confirm
`gitleaks version` reports exactly the pinned version.

**1c — record the gitleaks baseline BEFORE the encrypted file exists.** With `.sops.yaml` and
`secrets.enc.env` still absent, run gitleaks twice and record both finding counts verbatim: once
over the working tree, once over full git history. Use the subcommands 8.30.1 actually offers
(`gitleaks --help`; 8.19+ renamed `detect` to `gitleaks dir` / `gitleaks git`, and history needs
`--log-opts="--all"`), and `--redact` on both. Record the exact commands — Task 2 must re-run them
identically for the after-count to mean anything. The expected baseline is zero findings (recorded
in `01-18-SUMMARY.md`); report whatever you actually observe, and note that `ci.yml` and the install
script are already modified in the tree at baseline time.

**1d — generate the age key.** `age-keygen -o ~/.config/sops/age/keys.txt` (create the directory
first; `chmod 600` the file). This is SOPS's own default lookup path, so no env var is needed in the
common case. Capture the public recipient (the `age1...` line) — that half is public and safe to put
in the repo. Never print the private half.

**1e — write `.sops.yaml`.** One `creation_rules` entry carrying the public recipient. Set
`path_regex` to match BOTH `.env.local` and `secrets.enc.env`: sops matches creation rules against
the path of the file it is encrypting, which here is the input, and a regex matching only the output
produces `no matching creation rules`. Verify empirically which one sops actually matches and record
the observed behaviour in a one-line comment in `.sops.yaml` — that is tool behaviour nothing else
in the repo holds.

**1f — add the `secrets:*` package scripts.** Three here (`secrets:check` and `secrets:scan` arrive
in Tasks 2 and 3): `secrets:encrypt` runs sops with `--input-type dotenv --output-type dotenv` and
`--output secrets.enc.env`; `secrets:decrypt` runs the inverse with `--output` at the plaintext file;
`secrets:verify` decrypts to a temp file, compares its sha256 against the plaintext file, prints only
`match` or `mismatch`, exits non-zero on mismatch, and deletes the temp file on every path.

**Use `--output`, never a `>` redirect** — a redirect truncates the destination before sops runs, so
a failed decrypt (missing key) would leave an empty plaintext file and destroy the local copy.
Confirm `--output` exists on the installed version with `sops decrypt --help` before relying on it.

These wrappers are load-bearing, not cosmetic: the harness permission layer refuses Bash commands
whose text names a `.env` path, so `pnpm secrets:decrypt` is the only spelling an agent can actually
run. Keep every `.env` path inside a script body.

**1g — encrypt and prove the round trip.** Run `pnpm secrets:encrypt`, then `pnpm secrets:verify`
and require `match`. Read `secrets.enc.env` (safe — it is ciphertext) and note the exact shape of the
SOPS dotenv metadata keys; Task 2's assertion is written against what is actually there, not a guess.

**1h — prove the end-to-end path in a fresh worktree.** `git worktree add` a scratch worktree under
`.worktrees/`, run `pnpm install --frozen-lockfile` and `pnpm exec next typegen` in it via
`pnpm --dir`, then `pnpm --dir <worktree> secrets:decrypt` and `pnpm --dir <worktree> build`. The
worktree must reach a successful build having received `.env.local` from the encrypted file alone —
no copy from the main checkout, no `seed-worktree-env`. Confirm and report that
`pnpm secrets:decrypt` was NOT refused by the permission layer; if it was, that is a blocking
finding, not a detail. Restore `next-env.d.ts` in the main checkout if typegen touched it, and remove
the scratch worktree afterwards.

Commit all five files. Do not push.
  </action>
  <verify>
    <automated>`gitleaks version` equals the `GITLEAKS_VERSION` literal in `ci.yml`; `pnpm secrets:verify` prints `match` and exits 0; `pnpm --dir &lt;scratch-worktree&gt; build` exits 0 with `.env.local` produced only by `pnpm secrets:decrypt`; `git ls-files --error-unmatch secrets.enc.env` exits 0 and `git check-ignore secrets.enc.env` exits non-zero.</automated>
    <human-check>The two gitleaks baseline counts and the exact commands that produced them are written down for Task 2 to re-run; the `gh attestation verify` results are recorded as observed.</human-check>
  </verify>
  <done>`ci.yml` pins the scanner version; `scripts/install-verified-tools.sh` reproduces the toolchain from that pin with checksum verification; `secrets.enc.env` is tracked, decrypts byte-identically, and a scratch worktree builds off nothing but the committed ciphertext plus the age key. Baseline gitleaks counts recorded. Nothing pushed.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The paired guard — by-path allowlist plus an encryption assertion, falsified in both directions</name>
  <files>.gitleaks.toml, scripts/check-secrets-encrypted.mjs, scripts/check-secrets-encrypted.unit.test.mjs, package.json, .husky/pre-commit, .github/workflows/ci.yml, .prettierignore</files>
  <precondition>Task 1 is committed, `secrets.enc.env` is tracked, and the gitleaks baseline counts plus the exact scan commands from Task 1c are available to re-run verbatim.</precondition>
  <behavior>
Pure functions in `scripts/check-secrets-encrypted.mjs`, driven by fixture strings (no case touches
the real tree), mirroring `scripts/check-coverage-pointers.unit.test.mjs`'s exported-pure-entry-point
shape:

- A dotenv line assigning a value that is not SOPS ciphertext -> one violation naming the key and the
  line number.
- **The violation message must NOT contain the offending value.** Assert it directly: feed a fixture
  whose value is a distinctive literal and assert the rendered message does not include it. A gate
  that echoes the secret it caught leaks it into every CI log.
- A file of SOPS dotenv output (ciphertext values plus the metadata keys observed in Task 1g) ->
  zero violations.
- A SOPS metadata line whose value is legitimately not ciphertext -> zero violations, matched by the
  metadata-key shape actually present in `secrets.enc.env`, not a guessed prefix.
- An empty file, or one with ciphertext values but no SOPS metadata -> a violation. The gate fails
  closed: "not SOPS output" is a failure, not an absence of evidence.
- A line that is neither blank, a comment, nor a `KEY=VALUE` assignment -> a violation.
- A `.gitleaks.toml` body that no longer contains the allowlist path literal -> a violation naming
  the drift, independent of the encrypted file's own content.
  </behavior>
  <action>
Both halves land in ONE commit. An allowlisted path without a live encryption assertion is exactly
how plaintext ships silently later.

**2a — the check script.** `scripts/check-secrets-encrypted.mjs`, in the shape of the nine sibling
`scripts/check-*.mjs` gates: exported pure functions, a CLI entry guarded by the
`pathToFileURL`/`import.meta.url` idiom those scripts already use, non-zero exit plus a readable
report on violation. Hold the guarded path and the exact allowlist regex literal as two module
constants, and assert `.gitleaks.toml` still contains that literal — that assertion is what makes the
two halves mechanically inseparable rather than merely adjacent.

Support two content sources. Default reads the file from disk (CI, manual runs). `--staged` reads
`git show :secrets.enc.env`, i.e. the index content actually about to be committed; checking the
working tree in a hook would pass while plaintext sits staged. If the path is absent from the index,
exit 0 — nothing to guard, no leak.

Write the classifier against the metadata shape observed in `secrets.enc.env` in Task 1g.

**2b — the unit test**, `scripts/check-secrets-encrypted.unit.test.mjs`, covering every case in
`<behavior>`. **Falsify it:** weaken the predicate so it accepts anything, confirm the plaintext case
FAILS, restore, confirm it passes. Report which direction you checked — a test green against the
broken predicate is covering something adjacent to the bug, not the bug.

**2c — wire it.** Add `"secrets:check": "node scripts/check-secrets-encrypted.mjs"` to
`package.json`. Add `pnpm secrets:check --staged` to `.husky/pre-commit` before
`pnpm exec lint-staged`. `.husky/_/h` already runs the hook under `sh -e`, so no `set -e` or `&&` is
needed; the Task 2e falsification is what proves that rather than the claim. Add an
`Encrypted secrets check` step running `pnpm secrets:check` to CI's `quality` job after
`Coverage pointer check`. It goes in `quality`, not `secrets`, because the `secrets` job has no
Node/pnpm setup by deliberate design — put that reason in the step's comment.

**2d — the allowlist, and the single experiment that proves the pair.** Add one global gitleaks
allowlist entry for `secrets.enc.env`, anchored (`^secrets\.enc\.env$`), path-only, with the one-line
reason the file's own header rule demands. Use the classic singular `[allowlist]` table form: it
parses on every gitleaks 8.x, whereas `[[allowlists]]` does not exist before 8.19 — with the version
now pinned this matters less than it did, but the singular form removes config-syntax skew as a
variable if the pin is ever bumped down. Rewrite the header comment: its "No `[[rules.allowlist]]`
entries below" paragraph becomes false, and a stale header on a security config is worse than none.
The new reason is not "on suspicion" — this path exists to hold encrypted credential material by
construction, and the assertion above is what makes allowlisting it safe. Say both things.

Now run the experiment that proves both halves and their pairing at once. Put ONE fabricated,
obviously-fake credential-shaped literal into `secrets.enc.env` (hard constraint 5 — never a real
value), then, without committing:

- run gitleaks over the working tree with the repo config -> it must report the file clean, proving
  the allowlist entry works;
- run `pnpm secrets:check` -> it must FAIL, naming `secrets.enc.env`, proving the assertion catches
  exactly what the allowlist stopped catching;
- put that same literal in a scratch file at a NON-allowlisted path and run gitleaks again -> it must
  report at least one finding. This positive control is not optional: without it, "gitleaks reports
  the file clean" is indistinguishable from "gitleaks did not run".

Delete the scratch file and restore `secrets.enc.env` from the index; confirm restoration by
checksum, not by eye.

**2e — the pre-commit falsification (the one that matters).** With a fabricated plaintext literal
written to `secrets.enc.env` and `git add`ed, run a real `git commit`. It MUST exit non-zero and name
`secrets.enc.env`. Then unstage, restore from HEAD, verify by checksum that the ciphertext is
byte-identical to the committed version, and confirm `git status --porcelain` is clean for that path.
Record the control direction too: an ordinary commit with the real ciphertext staged succeeds. State
both directions explicitly in the summary — a guard that passes both ways is not a guard.

**2f — the no-regression measurement.** Re-run the two Task 1c gitleaks commands verbatim (working
tree and full history) with the allowlist entry in place, and report the counts against the baseline.
Any increase is a blocking finding.

**2g — local gates.** Run `pnpm lint`, `pnpm format:check`, `pnpm comments:check`, `pnpm secrets:check`
and `pnpm test`. If `pnpm format:check` objects to `secrets.enc.env` or `.sops.yaml`, fix `.sops.yaml`
with `pnpm format` and add `secrets.enc.env` to `.prettierignore` only if it actually fails — do not
add the ignore entry pre-emptively. Do NOT run e2e locally: a local run's `/admin/reset` fails any CI
e2e job in flight.

Commit the allowlist, the script, its test, the hook line, the CI step and `package.json` together in
one commit. Do not push.
  </action>
  <verify>
    <automated>`pnpm test` passes including the new `scripts/check-secrets-encrypted.unit.test.mjs` cases; `pnpm secrets:check` exits 0 on the real ciphertext and non-zero on a fabricated-plaintext fixture; a `git commit` with fabricated plaintext staged at `secrets.enc.env` exits non-zero; `pnpm lint`, `pnpm format:check`, `pnpm comments:check` all exit 0.</automated>
    <human-check>Post-change gitleaks counts equal the Task 1c baseline on both the working-tree and full-history scans, and the non-allowlisted positive control reported at least one finding.</human-check>
  </verify>
  <done>`.gitleaks.toml` carries one anchored, path-only, reasoned allowlist entry and a rewritten header; `pnpm secrets:check` runs in the pre-commit hook (index content) and in CI's `quality` job; a real commit attempt carrying plaintext at that path was refused; gitleaks counts unchanged with a passing positive control; the unit test falsified against a weakened predicate. All in one commit. Nothing pushed.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Local gitleaks — a staged scan in the hook, and a guard that fails when it drifts from CI's pin</name>
  <files>scripts/check-gitleaks-version.mjs, scripts/check-gitleaks-version.unit.test.mjs, package.json, .husky/pre-commit, .github/workflows/ci.yml</files>
  <precondition>Task 1's `GITLEAKS_VERSION` pin is committed and gitleaks is installed locally at that exact version; Task 2's hook line and allowlist are committed.</precondition>
  <behavior>
Pure functions in `scripts/check-gitleaks-version.mjs`, driven by fixture strings:

- A `ci.yml` body containing exactly one `GITLEAKS_VERSION` assignment -> that version is returned,
  quoted or unquoted, with or without a leading `v`.
- A `ci.yml` body with ZERO `GITLEAKS_VERSION` assignments -> a violation naming the missing pin.
  Fails closed: a parser that finds nothing must not report agreement.
- A `ci.yml` body with TWO assignments -> a violation. Ambiguity is drift waiting to happen.
- Installed version equal to the pin (after normalising a `v` prefix and surrounding whitespace) ->
  zero violations.
- Installed version different from the pin -> a violation naming BOTH versions and the remedy
  command (`pnpm tools:install`).
- Installed version unresolvable, i.e. the binary is absent -> a violation naming `pnpm tools:install`.
  A hook that silently passes when the scanner is missing is worse than no hook, so absence is a
  failure, never a skip.
  </behavior>
  <action>
This is the half the user asked for by name: the local environment must be the same scanner as the
remote one, and something must fail when it stops being.

**3a — the drift guard.** `scripts/check-gitleaks-version.mjs`, same shape as the sibling check
scripts. It parses `.github/workflows/ci.yml` for the single `GITLEAKS_VERSION` literal — `ci.yml` is
the one home for that version, and this script is one of its two readers (the install script is the
other) — reads the locally installed version from `gitleaks version` (confirm the exact output shape
of 8.30.1 first; it may or may not carry a `v`), and reports a violation when they differ, when the
pin is missing or ambiguous, or when the binary is absent. Add
`"gitleaks:check": "node scripts/check-gitleaks-version.mjs"` to `package.json`.

Write `scripts/check-gitleaks-version.unit.test.mjs` covering every `<behavior>` case with fixture
strings, so no case shells out.

**3b — the staged scan.** Add a `secrets:scan` package script running gitleaks over the STAGED
changes with the repo's own `.gitleaks.toml` (auto-detected at the root) and `--redact`. Determine
the correct 8.30.1 invocation from `gitleaks --help` rather than assuming: `protect --staged` is the
historical spelling and 8.19+ reorganised the subcommands, so confirm what this version actually
accepts and record the resolved command in the summary. It must exit non-zero on a finding.

**3c — wire both into the hook, NOT into lint-staged.** `.husky/pre-commit` becomes, in order:
`pnpm gitleaks:check`, then `pnpm secrets:scan`, then Task 2's `pnpm secrets:check --staged`, then
`pnpm exec lint-staged`. Version guard first so the scan's result has a defined meaning; the scan
before the encryption assertion because it is the broader net.

This deliberately departs from the `comments:check`-in-`lint-staged` pattern, and the reason belongs
in the summary: lint-staged fires per matching glob, and its globs are JS/TS/JSON/MD/CSS/YAML. A
secret can land in a `.txt`, a `.pem`, a dotfile, or any extension nobody has added to that config —
scoping the secret scan to those globs would be a hole shaped exactly like the next new file type.
`comments:check` is correctly in lint-staged because it only ever applies to source files.

Measure and report the wall-clock cost this adds to a commit. Three extra `pnpm run` invocations is
real; if it is bad enough to invite `--no-verify`, say so rather than shipping it silently.

**3d — falsify the drift guard, both directions.** Temporarily change `ci.yml`'s pin to a version
that is not installed, run `pnpm gitleaks:check`, confirm it FAILS and names both versions. Restore
the real pin, confirm it PASSES. State which direction you checked. Then, separately, confirm the
absent-binary branch through the unit test's fixture rather than by moving the real binary.

**3e — falsify the staged scan, and prove `--redact` works.** Stage a scratch file at a
NON-allowlisted path containing one fabricated credential-shaped literal, run `git commit`, and
confirm it is REFUSED. Then inspect the refusal output and confirm the fabricated literal does NOT
appear in it — that is `--redact` proving itself rather than being assumed. Unstage and delete the
scratch file, and confirm `git status --porcelain` is clean. Record the control direction: an
ordinary commit touching no secret still succeeds, and specifically a commit that re-stages the real
`secrets.enc.env` succeeds, proving the allowlist and the staged scan cooperate rather than fight.

**3f — correct the stale CI prose.** `ci.yml`'s `secrets` job comment asserts "No local pre-commit
half exists for this control" and explains the supply-chain reasoning behind that. Both halves of
that are now false: a local half exists, and the objection it rested on (npm wrappers being the only
option) is gone because the official binary is directly installable and checksum-verified. Rewrite
it: the local hook is a convenience and CI remains the authoritative gate (unchanged posture), the
pin is what makes the two the same scanner, and `pnpm tools:install` is how a machine gets there.
Point at `docs/adr/tech/0032` for the full record. Keep the existing `01-18-SUMMARY.md` reference as
supersession context — do not introduce new planning tokens.

**3g — local gates.** `pnpm lint`, `pnpm format:check`, `pnpm comments:check`, `pnpm secrets:check`,
`pnpm gitleaks:check`, `pnpm test`. Commit. Do not push.
  </action>
  <verify>
    <automated>`pnpm gitleaks:check` exits 0 with the real pin and non-zero when the pin is temporarily pointed at an uninstalled version; `pnpm test` passes including the new `scripts/check-gitleaks-version.unit.test.mjs` cases; a `git commit` staging a fabricated credential literal at a non-allowlisted path exits non-zero; `pnpm lint`, `pnpm format:check`, `pnpm comments:check` all exit 0.</automated>
    <human-check>The refusal output from the staged-scan falsification does not contain the fabricated literal, and the measured added commit latency is recorded.</human-check>
  </verify>
  <done>The local gitleaks is the same release CI pins, the hook scans staged changes with `--redact`, and a guard fails when local and CI versions diverge — falsified in both directions. `ci.yml`'s "no local pre-commit half" comment is corrected. Nothing pushed.</done>
</task>

<task type="auto">
  <name>Task 4: Record the decision, rewrite the setup path, close the todo, and drive CI green</name>
  <files>docs/adr/tech/0032-committed-age-encrypted-secrets.md, SETUP.md, README.md, CLAUDE.md, .planning/STATE.md, .planning/todos/completed/2026-08-22-reopen-local-pre-commit-gitleaks-investigation.md</files>
  <precondition>Tasks 1-3 are committed locally and unpushed.</precondition>
  <action>
Documentation is the deliverable here, not an epilogue: a fresh clone that cannot find out which key
it needs, or which scanner version it owes CI, is a fresh clone that cannot run or gate the app.

**4a — ADR `docs/adr/tech/0032-committed-age-encrypted-secrets.md`.** An ADR is warranted and this
plan commits to writing one: the decision is durable, effectively one-way (ciphertext of real
credentials is permanent in git history), and its rationale — why committing real values beats a
placeholder, why the allowlist is safe only because of its paired assertion, why the scanner version
is a committed fact — is exactly what a future reader would otherwise undo. Follow
`docs/adr/tech/0031`'s shape (Context / Decision Outcome / What remains disallowed / Consequences /
unwind trigger / **Enforcement** / Sources). Record:

- The committed-real-values choice, the permanence it buys and costs; rotation is re-encrypt + commit
  + rotate upstream, and old ciphertext stays reachable in history forever.
- The key's location, that `SOPS_AGE_KEY_FILE` is the override, and that **losing the key while no
  plaintext copy survives makes the ciphertext unrecoverable** — so the key needs a backup.
- The by-path allowlist and its paired assertion as one indivisible mechanism, plus the
  `.gitleaks.toml`-literal check that stops them drifting.
- **The pinning decision and its cost, stated as a decision rather than buried.** Pinning
  `GITLEAKS_VERSION` means a newly published rule that would catch a real secret is not picked up
  until someone bumps the pin. **Accept that cost**, and say why: reproducibility is worth more than
  automatic rule uptake on a repo whose scan surface is small and whose green history is the thing
  being trusted; an unpinned scanner means a passing run cannot be reproduced or attributed. Record
  the two mitigations actually shipped — the non-fatal upstream-newer notice in
  `scripts/install-verified-tools.sh`, which fires when someone is already touching tooling, and a
  stated bump cadence (re-check at each milestone close, and whenever the install script prints the
  notice). Record the option **rejected**: a scheduled workflow polling for new releases, rejected
  for maintenance surface and notification noise on a solo project. Give it an unwind trigger: adopt
  the scheduled job if a missed rule ever actually bites.
- The gitleaks and sops versions observed, dated, and why the singular `[allowlist]` form was chosen.
- **What is deliberately NOT checked**, since silence reads as coverage: the pre-commit gitleaks scan
  covers staged changes only, so it never re-examines history — CI's `fetch-depth: 0` job remains the
  only thing that does, and it remains the authoritative gate. And the chronic, unguarded failure
  mode: `.env.local` and `secrets.enc.env` can drift silently, with `pnpm secrets:verify` as the
  manual detector and nothing automatic.
- The supply-chain posture honestly: distro-signed `age` from apt; checksum-verified release binaries
  for `sops` and `gitleaks` via `scripts/install-verified-tools.sh`, with the `gh attestation verify`
  results recorded as observed. Note that a same-origin checksum proves transfer integrity, not
  provenance.

**4b — `SETUP.md`.** Rewrite the `.env.local` section: the encrypted file is now the source of truth,
and setup is `pnpm tools:install`, place the age key at `~/.config/sops/age/keys.txt`, run
`pnpm secrets:decrypt`. State that `pnpm secrets:decrypt` overwrites `.env.local` unconditionally, so
a local-only override belongs in the encrypted file rather than beside it. Keep the manual
`.env.example` path documented as the fallback for anyone without the key. Add a short section on the
tooling: what `pnpm tools:install` installs, that the gitleaks version is pinned in `ci.yml` and
`pnpm gitleaks:check` enforces the match, and that the pre-commit hook now needs gitleaks present.
Fold in `NONPROD_RESET_TOKEN` — it now arrives with the decrypt rather than needing separate
sourcing, if that is what the file actually contains; verify by running the e2e global-setup
precondition rather than by reading the file, and say only what you verified.

**4c — `README.md`.** The `cp .env.example .env.local` instruction around line 41-45 is now the
fallback, not the primary path. Point at SETUP.md rather than duplicating detail.

**4d — `CLAUDE.md`.** Two sections are made wrong by this change and both must be fixed in this
commit. "Set up every fresh worktree before running anything" (line ~122): the `cp .../.env.local`
line becomes `pnpm secrets:decrypt`, run from the worktree. The "### `.env.local` specifically"
subsection (line ~153): its entire premise — that a worktree starts with no env vars and that
`~/.claude/bin/seed-worktree-env` exists to work around the `Read(.env.*)` deny — no longer holds.
Replace it with the decrypt instruction plus the one durable fact that survives: **a Bash command
whose text names a `.env` path is still refused, so always go through `pnpm secrets:*`**. Dropping
that would have the next agent re-derive the deny the hard way. Keep the
`pnpm install --frozen-lockfile` / `next typegen` / `git checkout -- next-env.d.ts` steps unchanged —
this change does not touch them. Add `pnpm tools:install` to the fresh-worktree steps, since the
pre-commit hook now requires gitleaks.

**4e — close the todo.** Move
`.planning/todos/pending/2026-08-22-reopen-local-pre-commit-gitleaks-investigation.md` to
`.planning/todos/completed/` with `git mv`, and edit it to record the resolution against its own four
listed options: **option 3 was taken** — a checksum-pinned direct-binary install convention
(`scripts/install-verified-tools.sh`), which serves both gitleaks and sops. Options 1 and 2 (re-check
npm wrappers; find a pure-JS scanner) were **not needed rather than rejected on merit**: the original
objection was that only single-maintainer npm repackagings were available, and installing the
official release binary directly makes that question moot. Option 4 (re-confirm CI-only) is
superseded — a local half now exists, additive to CI, which remains the authoritative gate. Record
the version-parity finding: CI was resolving `latest` at run time and is now pinned to 8.30.1, with
`pnpm gitleaks:check` holding local to it. Then update `.planning/STATE.md`'s Pending Todos prose so
the bullet pointing at the now-moved path is not left dangling — a one-line edit, nothing else in
that file.

**4f — gates, push, and CI.** Re-run `pnpm lint`, `pnpm format:check`, `pnpm comments:check`,
`pnpm secrets:check`, `pnpm gitleaks:check` and `pnpm test` after the doc edits (`format:check`
covers `.md`; `.planning/` and `docs/` are in `.prettierignore`, so only `README.md`/`SETUP.md`/
`CLAUDE.md` are in scope). Confirm `next-env.d.ts` is restored. Commit, then `git push` — fast-forward
only; if it cannot fast-forward, stop and surface it rather than force-pushing.

Then block on CI rather than polling: `gh run list --limit 1 --json databaseId --jq '.[0].databaseId'`
then `gh run watch <id> --exit-status`. Report each of the four jobs' conclusions by name. A red job
is a hard blocker, not a caveat. Watch `secrets` in particular: it is the first run of the pinned
version AND the first exercise of the allowlist against CI's own gitleaks. If `secrets` goes red on a
config-parse error, the singular `[allowlist]` form or the pin is the first place to look.
  </action>
  <verify>
    <automated>`pnpm lint`, `pnpm format:check`, `pnpm comments:check`, `pnpm secrets:check`, `pnpm gitleaks:check` and `pnpm test` all exit 0; `gh run watch &lt;id&gt; --exit-status` exits 0.</automated>
    <human-check>SETUP.md, README.md and CLAUDE.md read correctly for someone who has never seen this repo — which key, where it goes, how to decrypt, which tools to install, how to launch — with no step that only works on the machine that wrote them.</human-check>
  </verify>
  <done>ADR `tech/0032` written; SETUP.md, README.md and CLAUDE.md describe the decrypt and tooling paths with no stale `.env.local`-copy instruction left; the gitleaks todo moved to `.planning/todos/completed/` with its resolution recorded and STATE.md's pointer updated; pushed; CI green on `secrets`, `quality`, `visual` and `e2e`, each conclusion reported by name.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| working tree -> git history | anything committed here is permanent and world-readable once pushed |
| gitleaks allowlist -> scanned surface | an allowlisted path is a hole in the only automated secret scan |
| GitHub release -> `~/.local/bin` | third-party binaries executed with the developer's own privileges |
| CI action -> gitleaks release resolved at run time | an unpinned scanner changes the enforced rule set with nothing in the repo recording it |
| age private key -> ciphertext | sole means of recovering the committed values |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-QT-TTT-01 | Information disclosure | `secrets.enc.env` (allowlisted path) | critical | mitigate | `pnpm secrets:check` asserts SOPS ciphertext on the INDEX content in pre-commit and on disk in CI's `quality` job; falsified in Task 2e by a real `git commit` that must be refused |
| T-QT-TTT-02 | Information disclosure | check-script and scanner output / CI logs | high | mitigate | Violation messages carry key name and line number only, never the value (unit-tested in Task 2b); every gitleaks invocation carries `--redact`, proven in Task 3e by asserting the fabricated literal is absent from the refusal output |
| T-QT-TTT-03 | Tampering | `sops` / `gitleaks` release binaries | high | mitigate | `scripts/install-verified-tools.sh` verifies sha256 against each release's own checksums file and aborts on mismatch; `gh attestation verify` attempted and recorded; `age` taken from Ubuntu's signed archive instead. Limitation recorded in the ADR: a same-origin checksum proves transfer integrity, not provenance |
| T-QT-TTT-04 | Information disclosure | git history | high | accept | D1: ciphertext of real nonprod credentials is permanent. Accepted by the user, with rotation (re-encrypt + commit + rotate upstream) as the remedy. Scope is nonprod only |
| T-QT-TTT-05 | Elevation of privilege | the allowlist regex | high | mitigate | Anchored `^secrets\.enc\.env$`, path-only, single entry — not a directory or prefix glob; `pnpm secrets:check` additionally fails if that exact literal disappears from `.gitleaks.toml`, so the halves cannot drift apart |
| T-QT-TTT-06 | Denial of service | `~/.config/sops/age/keys.txt` | medium | mitigate | Key at SOPS's default path with `chmod 600`; SETUP.md and the ADR require a backup and state that losing it with no surviving plaintext makes the ciphertext unrecoverable; `pnpm secrets:verify` detects drift before it becomes loss |
| T-QT-TTT-07 | Spoofing | pre-commit hook bypass (`--no-verify`, a machine without the hook) | medium | mitigate | The same encryption assertion runs in CI's `quality` job, so the hook is a convenience and CI remains the gate — the project's existing posture, unchanged |
| T-QT-TTT-08 | Tampering | unpinned CI scanner version | high | mitigate | `GITLEAKS_VERSION` pinned in `ci.yml` as the single source of truth; `pnpm gitleaks:check` parses it and fails when the local binary differs, falsified in Task 3d by pointing the pin at an uninstalled version |
| T-QT-TTT-09 | Spoofing | gitleaks absent locally -> hook silently passes | high | mitigate | `pnpm gitleaks:check` fails closed on an unresolvable binary and names `pnpm tools:install`; covered by a unit-test fixture rather than by moving the real binary |
| T-QT-TTT-10 | Repudiation | pinned scanner misses a newly published rule | medium | accept | Reproducibility is worth more than automatic rule uptake here. Mitigated by the install script's non-fatal upstream-newer notice and a stated bump cadence; a scheduled polling workflow was considered and rejected for maintenance surface, with an unwind trigger recorded in the ADR |
| T-QT-TTT-SC | Tampering | npm/pip/cargo installs | n/a | n/a | No package-manager install occurs in this change; the Package Legitimacy Gate does not apply. Binary supply chain is covered by T-QT-TTT-03 |
</threat_model>

<verification>
- The five `secrets:*`/`tools:*` scripts run from a clean checkout with only the age key present.
- Every falsification states BOTH directions: the encryption assertion refuses plaintext at the
  allowlisted path and permits ciphertext; the staged scan refuses a fabricated credential at a
  non-allowlisted path and permits an ordinary commit; the drift guard fails on a wrong pin and
  passes on the real one.
- The gitleaks positive control fired, so a zero finding count means "clean", not "did not run".
- The `--redact` proof: the fabricated literal does not appear in the scanner's own refusal output.
- Pre- and post-change gitleaks counts are reported for both the working-tree and full-history scans,
  with the exact commands.
- `gitleaks version` locally equals `ci.yml`'s `GITLEAKS_VERSION`, and only one such literal exists
  in the repo.
- No secret value appears anywhere in the transcript, the summary, the commits, or CI logs.
- CI green on all four jobs at the pushed head, reported job by job.
</verification>

<success_criteria>
A fresh `git worktree add` of this repo needs exactly three things to run and gate the app:
`pnpm tools:install`, the private age key at `~/.config/sops/age/keys.txt`, and
`pnpm secrets:decrypt`. Committing plaintext to the one allowlisted path is impossible without
deleting a gate that fails loudly when deleted; committing a secret to any other path is now caught
before the commit exists rather than after the push; and the scanner doing that catching is
provably the same build, at the same version, as the one CI runs.
</success_criteria>

<output>
Create `.planning/quick/260903-ttt-wire-sops-age-for-local-secret-managemen/260903-ttt-SUMMARY.md`
when done. Include: the resolved gitleaks staged-scan invocation for 8.30.1, the before/after finding
counts with their exact commands, all three falsifications with the direction checked, the `--redact`
proof, the `gh attestation verify` results, the measured added commit latency, the four CI job
conclusions, and — flagged for the user as out-of-repo follow-ups this change makes obsolete —
`~/.claude/bin/seed-worktree-env`, the `Bash(cp .../.env.local *)` rules in
`.claude/settings.local.json`, and the machine-memory entry describing the deny workaround.
</output>
