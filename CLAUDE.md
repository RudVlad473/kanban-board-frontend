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
`@playwright/mcp` is headed by default (its own `--help` says so), so this is enforced via a
project-level `.mcp.json` that adds `--headless` to its launch args — a prose reminder alone does
not change the server's actual default. If Playwright's MCP tools ever pop up a visible window
again, check `.mcp.json` is still present and picked up (Claude Code needs a session restart to
pick up a new/changed `.mcp.json`) before assuming this instruction was ignored.

This project's own server is named exactly `playwright` (tools resolve as `mcp__playwright__*`).
A separate, globally-installed Playwright integration may also resolve (tools named
`mcp__plugin_playwright_playwright__*`) and has no headless override — before driving any browser
tool, confirm the resolved names start with `mcp__playwright__`. If only the `plugin_` variant
resolves, this project's own headless server isn't loaded this session (needs the restart above);
do not fall back to the other one.

**Verify before presenting to the user, always.** Before reporting a fix, a finding, or a check as
done — a `checkpoint:human-verify`, a verifier's `human_needed` routing, a code-review item marked
fixed, anything — drive it through the running app yourself first (Playwright/Chrome DevTools MCP,
headless) and report what you actually observed. A subagent's "could not confirm," a verifier's
"static evidence is strong," or your own read of the code are all still unverified claims until
something has actually clicked through the app. This applies even when the thing being checked was
only ever _flagged_ as needing a human look (not reported broken) — verify it yourself first
regardless, then hand the user only what still genuinely needs their own eyes. Only skip this when
doing so is truly impossible (the check needs the user's own machine/network) — say so explicitly
rather than silently handing over an unverified claim.

**Compare against the mock, not only the running app.** The design source of truth is
`docs/kanban-task-management-web-app.pdf` (gitignored, 115MB — over the Read tool's PDF limit, so
render pages with `pdftoppm -f N -l N -r <dpi> -png [-x -y -W -H] <pdf> <out>` and read the PNG).
Open the mock for every surface visible in the screenshots you are about to present, not only the
ones your change touched; a surface you never opened in the mock is unverified. Compare placement,
spacing, and corner radii specifically — those are what "it works and looks plausible" misses. To
measure rather than eyeball, render at 600 DPI and divide by 6.25 for CSS px, the method
`tokens/radius.tokens.json` records for every radius token. When the mock and a UI-SPEC disagree,
surface the conflict instead of following either silently — on 2026-08-27 the mock overruled
`02-UI-SPEC.md`'s pinned-footer reading of `+ Create New Board`.

## CI green is the sign-off

A wave, plan, or phase is done when CI says so. Block on the run rather than polling it:
`gh run list --limit 1 --json databaseId --jq '.[0].databaseId'` for the id, then
`gh run watch <id> --exit-status`, which returns only once the run finishes and exits non-zero if it
failed. Then report each job's conclusion. A red job is a hard blocker on advancing, not a caveat to
carry forward, and a queued or running job means the answer is "not yet" rather than "probably
fine".

Local green is weaker than CI green by design, not by accident: `playwright.config.ts` sets
`ignoreSnapshots: !process.env.CI` (ADR tech/0008), so off-CI every `toHaveScreenshot` is a silent
no-op and a fully green local visual run proves only that the specs executed. Prefix with `CI=1` to
compare against baselines locally — found 2026-08-27, after a 260/260 local run reported success on
screenshots it never compared.

## Set up every fresh worktree before running anything

Three things a `git worktree add` does not bring across. Run all three first in any worktree-based
execution (GSD's `isolation="worktree"` dispatch or otherwise), before `pnpm dev`, tests, lint or
e2e:

```bash
cp /home/andre/dev/kanban-board-frontend/.env.local "$(git rev-parse --show-toplevel)/.env.local"
pnpm install --frozen-lockfile
pnpm exec next typegen
```

Skipping `next typegen` is the one that misleads. `tsconfig.json` includes `.next/types/**/*.ts`,
so without it `pnpm lint` reports three `no-unsafe-assignment` errors in
`app/(dashboard)/boards/[boardId]/page.tsx` against the generated `PageProps<>` global. It reads
as a real regression in a file you never touched. Found 2026-08-28, reported independently by two
Phase 4 executors.

`next typegen` also rewrites tracked `next-env.d.ts`, pointing its imports at `./.next/dev/types/`
instead of the committed `./.next/types/`. Next regenerates that file and marks it "should not be
edited", so the rewrite is generated churn, not a change worth keeping. Restore it before you
commit anything, or it rides into the wave merge:

```bash
git checkout -- next-env.d.ts
```

`pnpm build` also populates `.next/types` and leaves `next-env.d.ts` matching the committed form.
Prefer it when you were going to build anyway; prefer `typegen` plus the restore when you only
need lint and types to resolve.

### `.env.local` specifically

`.env.local` is gitignored, so `git worktree add` never copies it — a plan executed in an
isolated worktree (GSD's `isolation="worktree"` dispatch, or any other worktree-based
execution) starts with none of the local env vars (`NONPROD_RESET_TOKEN`, `SESSION_SECRET`,
etc.) that `pnpm dev`/tests/e2e runs depend on. This silently breaks any task that needs them —
e.g. `e2e/global-setup.ts` refuses to run without `NONPROD_RESET_TOKEN`.

Never `cat`, `grep`, or otherwise print `.env.local`'s contents — only copy it so the process
environment picks the values up naturally. Never `git add` it (it's ignored on purpose). The
copy is worktree-local and disappears with the worktree on cleanup — that's expected, not a
leak to clean up by hand.
