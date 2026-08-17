# Setup

Manual/human setup steps required before this project builds or runs locally. Intended to
later become a `.sh` script — that migration is a future decision, not done here.

## `.env.local` — required before `pnpm build` / `pnpm dev`

This project reads two environment variables that are not committed to the repo and must be
supplied per-clone, per-worktree, in a `.env.local` file at the repo root:

- `EXTERNAL_API_BASE_URL` — the external API's base URL, read by `src/lib/api/server-client.ts`.
- `SESSION_SECRET` — signs the session cookie (`src/lib/session.ts`). Generate locally with
  `openssl rand -base64 32`; never commit a real value.

Omitting either currently produces a `SESSION_SECRET is not set` failure during `pnpm build`/
`pnpm dev`.

`.env.local` is gitignored and must be created per-clone, per-worktree — this project's own
established pattern. See `.env.example` for the exact variable names and further inline
documentation.
