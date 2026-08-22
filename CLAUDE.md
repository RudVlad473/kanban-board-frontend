# Project instructions

## Push commits regularly

Push to `origin/master` after each logical unit of work (a finished plan, task, or a small
batch of related commits) — not necessarily after every single commit, but don't let local
commits pile up unpushed. The goal is that work is never sitting only on the local machine.

Use `git push` (fast-forward); if it can't fast-forward, stop and surface it rather than
force-pushing.

## Debug against the real app, not custom scripts

When verifying UI/browser behavior (layout, scroll, responsive treatment, DOM state), drive it
through the running dev server using Playwright MCP tools — do not write throwaway Node/JS
scripts to poke at the DOM or simulate behavior out-of-browser. Scratch scripts drift from what
the app actually does and get left behind as untracked cruft.

Run the browser headless — no visible window should pop up during automated verification.

## Copy `.env.local` into every worktree

`.env.local` is gitignored, so `git worktree add` never copies it — a plan executed in an
isolated worktree (GSD's `isolation="worktree"` dispatch, or any other worktree-based
execution) starts with none of the local env vars (`NONPROD_RESET_TOKEN`, `SESSION_SECRET`,
etc.) that `pnpm dev`/tests/e2e runs depend on. This silently breaks any task that needs them —
e.g. `e2e/global-setup.ts` refuses to run without `NONPROD_RESET_TOKEN`.

Before running anything that needs local env in a freshly created worktree, copy it in first:

```bash
cp /home/andre/dev/kanban-board-frontend/.env.local "$(git rev-parse --show-toplevel)/.env.local"
```

Never `cat`, `grep`, or otherwise print `.env.local`'s contents — only copy it so the process
environment picks the values up naturally. Never `git add` it (it's ignored on purpose). The
copy is worktree-local and disappears with the worktree on cleanup — that's expected, not a
leak to clean up by hand.
