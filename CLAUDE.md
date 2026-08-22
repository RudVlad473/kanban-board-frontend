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
