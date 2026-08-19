# Setup

Manual/human setup steps required before this project builds or runs locally. Intended to
later become a `.sh` script — that migration is a future decision, not done here.

## `.env.local` — required before `pnpm build` / `pnpm dev`

This project reads two environment variables that are not committed to the repo and must be
supplied per-clone, per-worktree, in a `.env.local` file at the repo root:

- `EXTERNAL_API_BASE_URL` — the deployed non-production backend's base URL (including its `/api`
  context path), e.g. `https://kanban-board-rud-vlad-473-nonprod.duckdns.org/api`. Read by
  `src/lib/api/server-client.ts`.
- `SESSION_SECRET` — signs the session cookie (`src/lib/session.ts`). Generate locally with
  `openssl rand -base64 32`; never commit a real value.

Omitting either currently produces a `SESSION_SECRET is not set` failure during `pnpm build`/
`pnpm dev`.

`.env.local` is gitignored and must be created per-clone, per-worktree — this project's own
established pattern. See `.env.example` for the exact variable names and further inline
documentation.

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
