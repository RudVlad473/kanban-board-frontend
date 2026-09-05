# Review brief

The template for a three-way review of this repo (Claude subagent + Gemini via `agy` + Codex).
Copy the second half into each reviewer's worktree, filling the `<>` placeholders. The first half
is for whoever dispatches them.

Written down because every part of it was learned the expensive way — see the notes marked
**Measured**, each of which cost a discarded review or a shipped-looking guard that did nothing.

## Dispatching

One worktree and one port per reviewer, always:

```bash
git worktree add --detach .worktrees/review-<name> HEAD
cp docs/review-brief.md .worktrees/review-<name>/.review-brief.md   # then fill the placeholders
```

**Measured 2026-09-05:** `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so a
second suite without its own `E2E_PORT` silently attaches to the first reviewer's server rather
than failing. Three reviewers landed on 4173; one reported CAPABILITY FAILURE on specs that pass in
isolation and its whole review was discarded. Confirm the override reached the worktree
(`grep 'E2E_PORT ??' e2e/test-env.ts`) — a worktree cut before that change was committed lacks it.

Exact CLI invocations, and why each flag is load-bearing, live in
`~/.claude/TOOLING_PREFERENCES.md` § *Review*. Start all three together and report nothing until
all three have finished: showing the first list anchors the merge on whoever was fastest.

**Every claim a reviewer returns is a claim, not a fact.** Check each against the compiler, the
suite, or the running app before acting. In the 2026-09-05 round, two of five findings across the
three reviewers were false, one of them stated with a fabricated file and line.

---

## The brief

You are one of three independent reviewers. Nothing another reviewer found is available to you.

### What to review

`<commits, e.g. git diff <base>..HEAD, with a one-line summary of each>`

### What it is meant to do

`<the behaviour under review, in the terms the change claims for itself>`

### Drive the running app

A review that only reads code is not this review. Prove you can drive the real app headlessly
before reporting anything.

```bash
cd <worktree>
pnpm --dir "$(git rev-parse --show-toplevel)" setup:worktree
export E2E_PORT=<port>          # required; without it you share another reviewer's server
pnpm exec playwright test --project=e2e <specs> --reporter=list
```

That builds the app, starts it on your port, and drives real headless Chromium against the real
deployed nonprod backend. Report the actual output.

A **failing spec is a finding** — investigate it and report it. Reserve `CAPABILITY FAILURE:
<what happened>` for genuinely being unable to run a browser at all.

Then go past the given specs. Write your own at `e2e/zz-<yourname>-*.e2e.spec.ts`, run them the
same way, and delete them once you have your answer — **after** the run they belong to has
finished, since deleting a spec mid-run crashes the runner and costs you the result. Seed with the
helpers in `e2e/seed.ts` (`seedAccount`, `seedBoard`, `seedColumn`, `seedTask`, `seedSubtask`,
`updateTaskOutOfBand`, `readBoardFull`).

**Assert against a deletion.** A cache that outlives its invalidation reads identically to a
correct one on every read, and shows itself only on a remove: delete a task or column, navigate
away, come back, reload — and check it against the backend's own read, not against the card being
absent from the screen. The same holds for anything else that removes rather than changes.

Watch the browser console throughout and report every error and warning.

### Search structurally, not by eye

`ast-grep` and `semgrep` are installed. On a mechanical rewrite they answer in one command what
reading cannot answer reliably at all:

```bash
ast-grep --lang ts -p 'isNil($X)' src/          # enumerate a codemod's real blast radius
semgrep --config p/typescript src/              # registry rules; needs network access
```

**Measured 2026-09-05:** a 222-site rewrite went unswept because no brief named these tools; the
reviewer that checked it by eye called the sweep comprehensive and returned a finding whose file
had not been touched by the change at all.

### Your worktree

This checkout is yours and disposable. Run, edit, install and experiment in it freely — that is
what it is for. Leave every other checkout on this machine alone.

### Reporting

One ranked list, most severe first. Each finding carries:

- **A label**: `CONFIRMED-BY-RUNNING` (you executed it and observed the failure) or
  `REASONED-ONLY`. Unlabelled findings are discarded unread.
- The exact reproduction command, and the output you observed against what you expected.
- `file:line`.

Finish with one paragraph: is this safe to ship? Say plainly when you found nothing — a short
honest review beats a padded one, and a confidently wrong finding costs more than it saves.

This suite creates real accounts on a shared backend. A sign-in that sticks at `/login` is a known
eviction flake: re-run before reporting it.
