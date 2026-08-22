# Moving this repo to WSL — handoff notes

Why: NTFS's per-file syscall overhead (not disk speed) is what makes `pnpm install`,
Next.js dev, Vitest, Storybook, and Playwright slow on Windows. WSL2's ext4 filesystem
fixes this — but only if the repo lives _inside_ the Linux filesystem. Accessing the
existing Windows checkout via `/mnt/c/...` from WSL is not a fix; that path crosses the
Windows/Linux boundary on every file access and is often slower than native Windows.

## What this migration does NOT need to solve

There is no local backend/database to stand up. Every layer — dev server, `pnpm test`,
`pnpm test:e2e`, and the `e2e/seed.sh` seeding script — talks to a deployed nonprod
backend over HTTP via the `EXTERNAL_API_BASE_URL` env var (see `.github/workflows/ci.yml`
and `docs/adr/tech/0018-no-mock-server.md`). No Docker Compose, no local Postgres.

## Prerequisites (versions this repo pins)

- Node **24.x** (`package.json` → `engines.node`)
- pnpm **11.20.0** (`package.json` → `packageManager`, install via corepack, not a global npm install)
- `.env.local` is gitignored and not part of this handoff — copy it manually from the
  current Windows checkout (or wherever secrets are kept) into the new clone. Use
  `.env.example` as the shape reference.

## Steps

1. **Install WSL2 + Ubuntu** (one-time, from Windows, admin PowerShell):

    ```
    wsl --install
    ```

    Reboot if prompted.

2. **Clone fresh inside the Linux filesystem** — not under `/mnt/c/`:

    ```bash
    git clone <repo-url> ~/repos/kanban-board-frontend
    cd ~/repos/kanban-board-frontend
    ```

3. **Install Node 24 and enable pnpm via corepack:**

    ```bash
    nvm install 24 && nvm use 24
    corepack enable
    corepack prepare pnpm@11.20.0 --activate
    ```

4. **Install deps:**

    ```bash
    pnpm install
    ```

5. **Copy `.env.local`** into the new clone (scp, a shared secrets manager, or manual
   copy-paste — never commit it).

6. **Install Playwright's Linux browser deps** (different from the Windows browser binaries):

    ```bash
    pnpm exec playwright install --with-deps
    ```

7. **Verify:**
    ```bash
    pnpm dev
    pnpm test
    pnpm test:e2e   # needs EXTERNAL_API_BASE_URL set, same value CI uses
    ```

## Editor

Install the VS Code **"WSL"** extension, then run `code .` from inside the Ubuntu shell
in the repo directory — this reopens the window running inside WSL (not remoting into a
Windows-side folder).

## Things checked so they're not gotchas

- **Line endings**: `.gitattributes` forces `eol=lf` for all text files regardless of
  `core.autocrlf`, so the Linux clone will check out clean LF endings even though the
  current Windows machine has `core.autocrlf=true` set globally. No action needed.
- **husky pre-commit** (`pnpm exec lint-staged`): works as-is once the hook is installed
  via `pnpm install` (husky's `prepare` script re-installs the hook, executable bit and
  all, on the fresh Linux clone).
- **`.playwright-mcp/`** (this session's browser-automation scratch output) is gitignored
  — nothing to port.

## Not covered here

The current Windows checkout is left untouched — this doc only stands up a second,
faster environment. Retiring the Windows copy, migrating any Windows-only IDE
settings/extensions, and re-pointing tools like the Chrome DevTools MCP extension at the
WSL-side browser (if that matters for your workflow) are separate follow-ups, not
addressed here.
