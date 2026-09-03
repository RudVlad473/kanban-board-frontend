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
measure rather than eyeball, render at 600 DPI and divide by 8.3333 for CSS px — equivalently, 300 DPI
and divide by 4.16667, since the design is 1440 wide. (This file long carried ÷6.25, which over-reads
by 1.333×; `tokens/radius.tokens.json`'s radii were re-derived against the correct divisor on
2026-08-29.) When the mock and a UI-SPEC disagree,
surface the conflict instead of following either silently — on 2026-08-27 the mock overruled
`02-UI-SPEC.md`'s pinned-footer reading of `+ Create New Board`.

## Reach for the platform's own primitive before building a mechanism

Name the built-in you rejected, and why, before hand-rolling state machinery. This codebase has
repeatedly grown a bespoke mechanism where React or Next already shipped one — a hand-rolled
optimistic-move override with snapshot-and-compare staleness detection where `useOptimistic`
does it natively; a client context populated by an effect to carry data the server already had.
Each looked reasonable while being written and cost far more to read than the primitive would have.

The trigger to stop and look it up: you are about to write code whose job is _bookkeeping about a
mutation_ — tracking what was optimistic, when it goes stale, when to retire it — rather than code
that does the mutation. That bookkeeping is the framework's job in almost every case.

When an official pattern genuinely does not fit, say so and record the reason in an ADR rather than
quietly diverging. But check the whole document before declaring it inapplicable: an over-broad
"doesn't apply here" note once kept TanStack Query's optimistic-updates guide out of consideration
for a whole phase, which is more expensive than the divergence it was guarding against.

**The current optimistic mechanism is `docs/adr/tech/0030` — optimistic writes via the query cache.**
Every mutation hook reads and writes the one `["board", boardId]` entry: `onMutate` cancels queries,
snapshots the entry into context and calls `setQueryData`; `onError` restores the snapshot; `onSuccess`
merges the server response. Copy a shipped hook — `use-toggle-subtask.ts` or `use-move-task.ts` — rather
than deriving a new shape.

ADR 0029 is **superseded**, and `3089a6a` deleted the `src/lib/client/optimistic-mutation.ts` helper it
described along with `useOptimistic` and the render-time override folds. Do not reintroduce any of them:
an override store, a staleness guard comparing against the server's previous value, or an override
"retired by reference equality" are all 0029 shapes. Phase 04's plan files still describe that machinery
in places; the ADR wins over the plan, and a plan that asks for it is stale — say so rather than building it.

## Verify a code review's claims before acting on them

Findings from an external reviewer — another model, a CLI reviewer, a subagent — are claims, not
facts, and one that is confidently wrong will cost more than the review saved. Check each against
the compiler, the test suite, or the running app before changing anything.

Found 2026-08-31: a Gemini 3.1 Pro review of plan 04-15 returned four findings. Two were false. Its
"critical" one asserted `next/cache` does not export `refresh` — it does in Next 16.3, and acting on
it would have replaced a working API in three Server Actions. Its second claimed an unreachable
union branch, which `tsc` already rules out. Both were artifacts of a reviewer that could not see
the repo. The two survivors were real and worth having, which is the point: verification is what
separates them.

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

`CI=1` is necessary but not sufficient. The `visual` project serves the prebuilt `storybook-static/`
directory, which nothing rebuilds on its own and git does not track — a stale build renders old
markup, so the run compares today's baselines against superseded code. Run `pnpm build-storybook`
before recording baselines or trusting any visual result. Found 2026-09-01: `storybook-static` was
two days older than `b4abc4c`, so a `--update-snapshots=all` re-record wrote pre-fix 86px images and
then passed 300/300 against the very images it had just written, while CI — which always builds
fresh — stayed red on those same snapshots.

## Set up every fresh worktree before running anything

One command, run inside the worktree before `pnpm dev`, tests, lint or e2e — in GSD's
`isolation="worktree"` dispatch or any other worktree-based execution:

```bash
pnpm --dir "$(git rev-parse --show-toplevel)" setup:worktree
```

It installs dependencies, runs `next typegen` and restores `next-env.d.ts`, and decrypts the env
file from the committed `secrets.enc.env` — no copy from another checkout, no
`seed-worktree-env`. It is idempotent, and it skips the decrypt (with a notice) rather than
overwriting an env file that already exists. It fails with a named remedy if `sops` is missing
(`pnpm tools:install`) or the age key is missing.

Prefer this over running the steps individually. `next typegen` is the one that misleads when
skipped: `tsconfig.json` includes `.next/types/**/*.ts`, so without it `pnpm lint` reports three
`no-unsafe-assignment` errors in `app/(dashboard)/boards/[boardId]/page.tsx` against the generated
`PageProps<>` global, reading as a real regression in a file you never touched. Found 2026-08-28,
reported independently by two Phase 4 executors — which is why it is a script now and not a list.
`next typegen` also rewrites the tracked `next-env.d.ts` as generated churn; the script restores it
so it cannot ride into a wave merge.

`pnpm build` also populates `.next/types` and leaves `next-env.d.ts` matching the committed form,
so it is an acceptable substitute for the typegen half when you were going to build anyway.

Run `pnpm tools:install` too if `gitleaks` is absent — the pre-commit hook needs it, and
`setup:worktree` prints a reminder when it is missing.

### Env values specifically

Env values now travel with the repo as age-encrypted ciphertext at `secrets.enc.env`
(docs/adr/tech/0032). A worktree gets them from `pnpm secrets:decrypt` — which
`pnpm setup:worktree` already runs — and never from a copy. The age private key at
`~/.config/sops/age/keys.txt` is the only way to decrypt it and is not in the repo; it must be
backed up.

**The one durable trap: a Bash command whose own text names a `.env` path is refused by the
permission layer**, because `~/.claude/settings.json` denies `Read(.env.*)` and a deny beats any
allow. Re-confirmed 2026-09-03 — a bare `cp` naming it and a `grep` naming `.env.example` were
both refused. So always go through the `pnpm secrets:*` scripts, which keep every plaintext path
inside `scripts/secrets.sh`; `pnpm secrets:decrypt` is not refused. Never `cat`, `grep` or
otherwise print those values, and never `git add` the plaintext file (it is gitignored on purpose).

| Need                                     | Command                                               |
| ---------------------------------------- | ----------------------------------------------------- |
| Get env values in a fresh worktree       | `pnpm setup:worktree`                                 |
| Re-read them, overwriting the local file | `pnpm secrets:decrypt`                                |
| Save a changed value back                | `pnpm secrets:encrypt`, then commit `secrets.enc.env` |
| Check local and committed agree          | `pnpm secrets:verify` (prints `match`/`mismatch`)     |
