# Review brief — this repo's half

The template, the dispatch commands and the rules every reviewer follows are `~/.claude/REVIEW_BRIEF.md`.
This file supplies only what is true of THIS repo, to paste into the placeholders there.

## Setup and run commands

```bash
pnpm --dir "$(git rev-parse --show-toplevel)" setup:worktree
export E2E_PORT=<port>          # required; see below
pnpm exec playwright test --project=e2e <specs> --reporter=list
```

That builds the app, starts it on the reviewer's own port, and drives real headless Chromium
against the real deployed nonprod backend.

## The port is not optional

`e2e/test-env.ts` reads `E2E_PORT` (default 4173) and `playwright.config.ts` sets
`reuseExistingServer: !process.env.CI`, so a second suite without its own port attaches to the
first reviewer's server rather than failing. Confirm the override reached the worktree —
`grep 'E2E_PORT ??' e2e/test-env.ts` — since a worktree cut before that change was committed
lacks it.

## Writing throwaway specs

Name them `e2e/zz-<reviewer>-*.e2e.spec.ts` and delete them once the run they belong to has
finished. Seed with the helpers in `e2e/seed.ts`: `seedAccount`, `seedBoard`, `seedColumn`,
`seedTask`, `seedSubtask`, `updateTaskOutOfBand`, `readBoardFull`.

The suite creates real accounts on a shared backend and deletes what it seeded. A sign-in that
sticks at `/login` is a known eviction flake: re-run before reporting it.

Hold a write open with a `page.route` delay on `next-action` POSTs to act inside an
in-flight window — and release the hold before asserting the window has closed, or the writes the
test makes afterwards are delayed too and the create under test can be refused and rolled back
(green locally, red on CI, 2026-09-05).

## Standards the code is held to

`CLAUDE.md`, `CONVENTIONS.md`, and `docs/adr/tech/0030` (optimistic writes via the query cache).
