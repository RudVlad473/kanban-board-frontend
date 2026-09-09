# Review brief

You are one of two independent reviewers. Nothing another reviewer found is available to you.

## What to review

**A PLAN, not a diff. Nothing has been implemented yet.** Review these three files in this
worktree:

- `.planning/quick/260906-hze-fix-the-remaining-one-frame-horizontal-s/260906-hze-PLAN.md` — the plan
- `.planning/quick/260906-hze-fix-the-remaining-one-frame-horizontal-s/260906-hze-FINDINGS.md` — the
  measured root cause the plan is built on
- `REVIEW-BRIEF.md` (this file)

Base commit: the tip of `gsd/phase-04-task-subtask-workflow`. The working tree is otherwise clean.

## What it is meant to do

A user reports a horizontal scrollbar flicker when switching boards in the running app.

The claimed root cause: for exactly one frame during a client-side board switch,
`app/(dashboard)/layout.tsx`'s `<main className="flex min-h-0 flex-1 flex-col">` holds TWO board
areas — the real `div[data-testid="board-columns-scroll"]` AND a
`div[data-testid="board-view-skeleton"]` arriving through the `{children}` page slot. Both are
`flex-1`, so they split the height 50/50; the scroll container measures 647px -> 324px -> 647px
across three consecutive frames, and the horizontal scrollbar pinned to its bottom edge jumps up and
back inside one frame.

The claimed source of the second board area is `app/(dashboard)/boards/loading.tsx`, which returns
`<BoardViewSkeleton />`. `app/(dashboard)/boards/[boardId]/loading.tsx` is deliberately empty
(`<></>`) and is claimed to be incapable of producing it.

The claimed fix: `git mv` both `app/(dashboard)/boards/page.tsx` and
`app/(dashboard)/boards/loading.tsx` into a new `app/(dashboard)/boards/(index)/` route group, so
the loading fallback covers only `/boards` instead of the whole `[boardId]` subtree beneath it. Plus
one RED e2e test first, and a gate/CI task.

## What I want from you

Judge the PLAN. Concretely:

1. **Is the root cause in FINDINGS.md correct and complete?** Verify it yourself. Is
   `boards/loading.tsx` really the source, or could the layout's own
   `<Suspense fallback={<BoardViewSkeleton />}>` around `OpenBoard`, or something else, also produce
   it? Is there a second source the plan would leave behind?
2. **Would the proposed fix actually work?** Does a Next route group scope a `loading.js` the way
   the plan claims, in the Next version this repo actually pins? Check the installed Next, not your
   memory of the docs.
3. **What does the fix break?** `/boards` is the post-sign-in redirect target. Does it still
   redirect, still render its empty state, still have a loading fallback? Does moving `page.tsx`
   into a route group change anything about `PageProps<>` typegen, the repo's own convention gates,
   or route resolution?
4. **Is the RED test in Task 1 actually capable of failing against the unfixed code?** It uses a
   `MutationObserver` on `<main>` with `{ childList: true }`. Would that observer see both elements?
   Is the `toEqual([])` filter shape sound? Are the vacuity guards sufficient? Would it pass
   vacuously in any realistic scenario? Note the plan explicitly forbids
   `expect(skeleton).toHaveCount(0)` because that exact assertion already exists in BOARD-04 and
   passes today with the defect present — verify that claim.
5. **Is anything in the plan simply wrong, stale, or contradicted by the repo?** The plan asserts 16
   numbered "measured facts". Check the ones that are checkable.
6. **Is there a simpler or more correct fix** the plan rejected for a bad reason? The plan records
   its rejected alternatives; say if you disagree with a rejection.

Do **not** implement the fix. Do not modify any file outside this worktree.

## Drive the running system

A review that only reads code is not this review. Prove you can drive the real thing before
reporting anything.

```bash
pnpm --dir "$(git rev-parse --show-toplevel)" setup:worktree
export E2E_PORT=<YOUR_PORT>
pnpm exec playwright test --project=e2e e2e/boards-switch.e2e.spec.ts --reporter=list
```

Report the actual output.

You are strongly encouraged to **reproduce the defect yourself** — write a throwaway spec
(`e2e/zz-<yourname>-*.e2e.spec.ts`) that instruments `<main>` during a board switch and prints what
it sees, and/or apply the proposed fix in your own worktree and re-measure. That is the single most
valuable thing you can return. Delete throwaway specs once the run they belong to has finished.

A **failing test is a finding** — investigate and report it. Reserve
`CAPABILITY FAILURE: <what happened>` for genuinely being unable to run at all.

Watch the logs and the browser console throughout; report every error and warning.

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
hypothetical: 70 browser tests were red behind a green `test:unit` on 2026-09-05. `pnpm test` clears
vitest; `pnpm verify` clears everything.

### Narrowing and flake control

```bash
pnpm exec vitest run --project browser <file>
pnpm exec playwright test --project=e2e <spec> -g "<title>"
pnpm exec playwright test --project=e2e <spec> --repeat-each=3 --workers=1
pnpm exec playwright show-trace test-results/<dir>/trace.zip
```

### Holding a request open

- **Component tests** — `actionStub(theAction)` from `src/test-utils/action-stub-registry.ts` gives
  `.queue(outcome)`, `.hold()`, `.settle()` and `.calls`. An unqueued call is reported, never
  defaulted to success.
- **e2e** — a `page.route` delay on `next-action` POSTs. `e2e/boards-switch.e2e.spec.ts` already
  carries `holdEveryRead(page)` / `SERVER_HOLD_MS`, which is the window-widening instrument for this
  defect. Release the hold before asserting the window has closed.

### Fixtures

`e2e/seed.ts`: `seedAccount`, `seedBoard`, `seedColumn`, `seedTask`, `seedSubtask`,
`updateTaskOutOfBand`, `readBoardFull`. Name throwaway specs `e2e/zz-<reviewer>-*.e2e.spec.ts`.

`pnpm e2e:seed account` gives a login to drive by hand. **Clean up ONLY your own ids with
`pnpm e2e:cleanup --users <id>` — never a bare `pnpm e2e:cleanup`, which deletes accounts other
sessions are holding.** The suite reaps its own. A sign-in that sticks at `/login` is a known
eviction flake; re-run before reporting it.

## The port is not optional

`e2e/test-env.ts` reads `E2E_PORT` (default 4173) and `playwright.config.ts` sets
`reuseExistingServer: !process.env.CI`, so a suite without its own port attaches to another
server rather than failing. Confirm the override reached this worktree:
`grep 'E2E_PORT ??' e2e/test-env.ts`.

## Settle it in place — you have the whole toolchain

`REASONED-ONLY` is a fallback, not a shortcut. Nearly every theory about this codebase can be
settled by running something, and a finding you could have run and did not is the one most likely to
be wrong.

- **Bisect against the base commit** when you find a defect — it may predate this work entirely.
- **Run the flake down before reporting it.** `--repeat-each`. One failing execution is a hypothesis.
- **Reach for the narrowest runnable check.** A type error or one filtered spec answers in seconds.
- **A partial command that looks total is the trap here.** Confirm what you actually ran covered.

## Search with a tool, not by eye

`rg`, `ast-grep` and `semgrep` are installed.

```bash
rg -n '<literal or regex>' <dir>                # text. Fastest. ALWAYS give an explicit path.
ast-grep --lang <lang> -p '<pattern>' <dir>     # structure
semgrep --config p/<ruleset> <dir>              # registry rules; needs network
```

**Always give `rg` an explicit path** — a bare `rg` at the repo root reads `.env` and any private
key present as a side effect.

## Your worktree

This checkout is yours and disposable. Run, edit, install and experiment freely. Leave every other
checkout on this machine alone. Do not modify any file under review outside this worktree.

## Standards the code is held to

`CLAUDE.md`, `CONVENTIONS.md`, `docs/adr/tech/0030` (optimistic writes via the query cache).
Note `docs/adr/tech/0029` is SUPERSEDED — do not recommend its shapes.

## Reporting

One ranked list, most severe first. Each finding carries:

- **A label**: `CONFIRMED-BY-RUNNING` (you executed it and observed it) or `REASONED-ONLY`.
  Unlabelled findings are discarded unread.
- The exact reproduction command, and the output you observed against what you expected.
- `file:line`.

Finish with one paragraph: **is this plan safe to execute as written?** Say plainly if you found
nothing — a short honest review beats a padded one, and a confidently wrong finding costs more than
it saves.
