# Phase 04 — Deferred Items

Out-of-scope discoveries logged during execution. Per the executor scope boundary, these were
**not** fixed: they are pre-existing and unrelated to the task that surfaced them.

## `e2e/cookie-policy.e2e.spec.ts` is flaky around the theme toggle

**Found during:** plan 04-04, Task 3 verification (e2e run against the real built app).

**Symptom:** a *different* test in the same file fails on each run, which is the flake signature
rather than a regression.

| Run | Result | Failing test |
|-----|--------|--------------|
| Full `pnpm test:e2e` | 42/43 | `COOKIE-03: session-vs-theme lifetime isolation` — `expect(document.cookie).toContain("theme=LIGHT")` received `theme=DARK`, 5000ms poll timeout |
| Isolated `--project=e2e e2e/cookie-policy.e2e.spec.ts` | 6/7 | `COOKIE-04: cross-client value isolation across a toggle` — COOKIE-03 **passed** this run |

**Why it is out of scope for 04-04:** the spec references neither `BoardView` nor any column
surface (`grep` for `board-view`/`BoardView` in the file returns nothing). Plan 04-04 is a pure
`git mv` of `BoardView` proven byte-identical (`R100` on all three files), so it cannot reach a
theme-cookie assertion. Every board/column e2e spec passed, including all three
`columns-reorder` specs.

**Note:** sibling wave executors were running concurrently against the same shared nonprod
backend during these runs, which is a plausible contributor. Related pending todo:
`.planning/todos/pending/2026-08-27-boards-create-e2e-401s-when-its-seed-session-is-evicted.md`.

## Parallel wave executors contend for `playwright.config.ts`'s hardcoded `PORT = 6007`

**Found during:** plan 04-04, Task 3 (`CI=1 pnpm test:visual`).

`playwright.config.ts:7` hardcodes `const PORT = 6007` for the visual project's static server, and
`ignoreSnapshots: !process.env.CI` forces `reuseExistingServer: false` under `CI=1`. With several
wave executors running visual suites at once, the port was continuously held (observed across
worktrees `agent-aebe86f0099bb5f2f` and `agent-af6521cc5c6bd8d5b`); a 15-attempt / 5-minute
wait-and-retry never won the race.

Worked around **locally and non-invasively** for this plan by running the visual project through a
temporary copy of the config on port 6017, then deleting the copy — `playwright.config.ts` itself
was never modified. A durable fix (env-overridable port, or a wave-level lock) is worth
considering if parallel waves keep colliding, but it is infrastructure work outside this plan.
