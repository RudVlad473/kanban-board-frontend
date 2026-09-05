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

## What you can run

| Command | Covers | Time |
| --- | --- | --- |
| `pnpm exec tsc --noEmit -p tsconfig.json` | types | ~20s |
| `pnpm lint` | ESLint incl. this repo's own rules (`local/prefer-is-nil`, boundaries, `no-restricted-syntax`) | ~60-100s |
| `pnpm test:unit` | **one of three vitest projects.** Pure logic only — no components | ~10s |
| `pnpm test:browser` | real-DOM component tests in Chromium | the bulk of `pnpm test` |
| `pnpm test:a11y` | the storybook project | — |
| **`pnpm test`** | **all three vitest projects — this is the total one** | ~5min |
| `pnpm exec playwright test --project=e2e` | the built app against the real nonprod backend | ~2min |
| `pnpm test:visual` | Storybook screenshots; needs `CI=1` **and** a fresh `pnpm build-storybook`, or it silently compares nothing | — |
| **`pnpm verify`** | **all 20 pre-push gates, everything above included** | ~7min |
| `pnpm folders:check` `tsx:check` `comments:check` `actions:check` `coverage:check` `routes:check` `renders:check` `gates:check` | the individual convention gates, seconds each | <5s |

`pnpm test:unit` reporting a confident pass while components are broken is a real trap here, not a
hypothetical: 70 browser tests were red behind a green `test:unit` on 2026-09-05. `pnpm test` is
the one that clears vitest; `pnpm verify` is the one that clears everything.

### Narrowing and flake control

```bash
pnpm exec vitest run --project browser <file>            # one component test file
pnpm exec playwright test --project=e2e <spec> -g "<title>"
pnpm exec playwright test --project=e2e <spec> --repeat-each=3 --workers=1
pnpm exec playwright show-trace test-results/<dir>/trace.zip
```

### Holding a request open

- **Component tests** — `actionStub(theAction)` from `src/test-utils/action-stub-registry.ts` gives
  `.queue(outcome)`, `.hold()`, `.settle()` and `.calls`. An unqueued call is reported, never
  defaulted to success.
- **e2e** — a `page.route` delay on `next-action` POSTs. Release the hold before asserting the
  window has closed, or the writes the test makes afterwards are delayed too and the create under
  test can be refused and rolled back (green locally, red on CI, 2026-09-05).

### Fixtures

`e2e/seed.ts`: `seedAccount`, `seedBoard`, `seedColumn`, `seedTask`, `seedSubtask`,
`updateTaskOutOfBand`, `readBoardFull`. Name throwaway specs `e2e/zz-<reviewer>-*.e2e.spec.ts` and
delete them once the run they belong to has finished.

`pnpm e2e:seed account` gives a login to drive the app by hand; `pnpm e2e:cleanup` deletes
everything seeded that way. The suite creates real accounts on a shared backend and reaps its own;
a sign-in that sticks at `/login` is a known eviction flake, so re-run before reporting it.

## The port is not optional

`e2e/test-env.ts` reads `E2E_PORT` (default 4173) and `playwright.config.ts` sets
`reuseExistingServer: !process.env.CI`, so a second suite without its own port attaches to the
first reviewer's server rather than failing. Confirm the override reached the worktree —
`grep 'E2E_PORT ??' e2e/test-env.ts` — since a worktree cut before that change was committed
lacks it.

## Standards the code is held to

`CLAUDE.md`, `CONVENTIONS.md`, and `docs/adr/tech/0030` (optimistic writes via the query cache).
