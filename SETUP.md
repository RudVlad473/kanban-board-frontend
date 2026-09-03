# Setup

What a fresh clone or worktree needs before this project builds or runs locally. Most of it is
now automated — `pnpm setup:worktree` — so what remains here is the one thing a script cannot do
for you (obtain the age key) plus the reasoning behind each step.

## One command: `pnpm setup:worktree`

Every fresh clone and every `git worktree add` needs exactly this, in this order:

```bash
pnpm tools:install     # sops, gitleaks, age — checksum-verified, once per machine
pnpm setup:worktree    # dependencies, Next.js route types, and your local env file
```

`pnpm setup:worktree` runs `pnpm install --frozen-lockfile`, then `next typegen` (restoring the
tracked `next-env.d.ts` afterwards, since typegen rewrites it as generated churn), then
`pnpm secrets:decrypt`. It is idempotent and safe to re-run. It **skips** the decrypt with a
printed notice if a local env file already exists, so it will never overwrite one you have
hand-edited.

This is one command rather than four documented steps on purpose: the four-step version was
documented and still got skipped twice, each time producing three phantom `no-unsafe-assignment`
lint errors in `app/(dashboard)/boards/[boardId]/page.tsx` that read as a real regression.

## Environment values — decrypted, not hand-copied

The environment values live in the repository as age-encrypted ciphertext at `secrets.enc.env`
and are decrypted into a gitignored local file. Nothing is copied between checkouts by hand.

**You need the project's age private key first**, at SOPS's default path
`~/.config/sops/age/keys.txt` (`chmod 600`). Set `SOPS_AGE_KEY_FILE` if you keep it elsewhere.
Ask the project owner for it — it is not in the repository, only its public half is, in
`.sops.yaml`.

> **Back the key up.** It is the only way to decrypt `secrets.enc.env`. If it is lost and no
> plaintext copy survives anywhere, those values are unrecoverable — see
> [ADR tech/0032](./docs/adr/tech/0032-committed-age-encrypted-secrets.md).

The values decrypted are `EXTERNAL_API_BASE_URL` (the deployed non-production backend's base URL
including its `/api` context path, read by `src/lib/api/server-client.ts`), `SESSION_SECRET`
(signs the session cookie, `src/lib/session.ts`), and `NONPROD_RESET_TOKEN` (see the next
section). Omitting the first two produces a `SESSION_SECRET is not set` failure during
`pnpm build`/`pnpm dev`.

Useful commands:

| Command                | What it does                                                                   |
| ---------------------- | ------------------------------------------------------------------------------ |
| `pnpm secrets:decrypt` | Overwrites the local env file from `secrets.enc.env`, unconditionally          |
| `pnpm secrets:encrypt` | Re-encrypts the local env file into `secrets.enc.env` after you change a value |
| `pnpm secrets:verify`  | Prints `match` or `mismatch` — nothing has drifted, or something has           |

Because `pnpm secrets:decrypt` overwrites unconditionally, **a local-only override belongs in the
encrypted file rather than beside it.** Add it, run `pnpm secrets:encrypt`, and commit the
ciphertext. Nothing detects drift automatically; `pnpm secrets:verify` is the manual detector.

**Fallback without the key:** copy `.env.example` to a local env file and fill in the values by
hand, as before. Everything except the e2e suite works that way; e2e additionally needs a real
`NONPROD_RESET_TOKEN`.

## Tooling: `pnpm tools:install`

Installs three binaries into `~/.local/bin`:

- **gitleaks**, at exactly the version `.github/workflows/ci.yml` pins in `GITLEAKS_VERSION`. That
  literal is the single source of truth; the install script and `pnpm gitleaks:check` both read it.
- **sops**, pinned in the install script itself.
- **age**, from Ubuntu's signed archive.

gitleaks and sops are downloaded from their GitHub releases and sha256-verified against each
release's own checksums file; the script aborts on a mismatch.

**The pre-commit hook now requires gitleaks to be present.** It runs, in order,
`pnpm gitleaks:check` (fails if your local gitleaks is not the version CI pins, or is missing),
a gitleaks scan of your staged changes, and `pnpm secrets:check` (fails if anything in
`secrets.enc.env` is not encrypted). Adds about 1.3s to a commit.

If the pin falls behind upstream, `pnpm tools:install` prints a non-fatal notice. Bumping it means
editing `GITLEAKS_VERSION` in `ci.yml` and re-running `pnpm tools:install`.

## `NONPROD_RESET_TOKEN` — required before `pnpm exec playwright test --project e2e`

The `e2e` Playwright project (and the Vitest `node` project's `*.integration.test.ts` files) create
real, permanent accounts on the shared nonprod backend (see the next section). `e2e`'s `globalSetup`
(`e2e/global-setup.ts`) probes the backend's own `POST /admin/reset` before any spec runs, and
**refuses to run the suite at all** if that probe fails — availability of the reset endpoint and a
working token to call it is still a hard precondition (docs/adr/tech/0022), unchanged from before.

**`pnpm setup:worktree` now supplies this token** — it is one of the values in `secrets.enc.env`,
so a worktree set up that way can run `--project e2e` with no extra step. Verified 2026-09-03 by
running the suite against a freshly decrypted env rather than by reading the file. Without the age
key, set `NONPROD_RESET_TOKEN` by hand to the same value CI's `NONPROD_RESET_TOKEN` repository
secret holds (the `APP_RESET_TOKEN` value in the backend host's `.env.nonprod` — see
`kanban-board-backend/.env.nonprod.example`). Omitting it fails fast with a clear error rather
than letting the suite run uncleanably.

**What changed (260829-kyv): cleanup is now scoped, not a wipe.** The precondition probe no longer
deletes anything to prove itself — it posts a single id no account will ever have, which the
backend's own existence check rejects without touching a row. Each run's `globalTeardown` then
deletes only the accounts _that run_ created (tracked in `.e2e-seeded-users/`, gitignored), never
every account on the shared backend. This is not self-healing the way the old full wipe was: a run
that is killed (Ctrl+C, a cancelled CI job) leaves its accounts behind, because nothing automated
sweeps them up later. Two recovery paths exist for that case, and nothing else calls either of them:

- `pnpm e2e:cleanup` — reads `.e2e-seeded-users/` (or `--users <id,id,...>` for a specific list) and
  deletes precisely those accounts. Safe to run any time; a no-op when there is nothing to clean.
- `pnpm e2e:seed reset-all` — the old full wipe, kept only as a manual last resort. Nothing
  automated calls this; it deletes every account on the shared backend, not just leaked ones.

## This project runs no fake HTTP layer (docs/adr/tech/0018)

Development (`pnpm dev`), every automated test layer (unit, component, e2e), and CI all dial the
same deployed non-production backend directly — there is no fake HTTP layer anywhere in this
codebase to fall back on, and therefore **no offline development**. If that backend is
unreachable, nothing that talks to it will work, including a plain `pnpm dev`.

An account you create while developing is a real row in a shared, non-production database — not
a throwaway local fixture. Two traps follow directly from this:

- **The two-live-session ceiling.** The backend caps an account at two concurrent sessions. A
  third sign-in attempt is refused with the exact same message a wrong password produces — there
  is no way to tell the two apart from the response alone. If sign-in starts failing for an
  account you know is correct, this is the likely cause.
- **Sign-out cannot release a session early.** This application's own sign-out only clears its
  own session cookie; it does not call the backend's sign-out route at all, because that route is
  confirmed broken. See
  `.planning/phases/01-foundation-auth-preferences/deferred-items.md` entry 6 for the recorded
  finding. Until the backend fixes it, a session you want to free up has to expire on its own.
