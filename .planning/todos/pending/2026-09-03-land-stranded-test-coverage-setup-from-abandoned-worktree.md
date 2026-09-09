---
created: 2026-09-03T00:00:00.000Z
title: Land the stranded test-coverage measurement setup from the abandoned agent worktree
area: testing
severity: minor
files:
  - vitest.config.ts
  - package.json
  - .gitignore
  - pnpm-lock.yaml
---

## Problem

The test-coverage measurement setup exists but has never been committed. It sits as UNCOMMITTED
changes in an abandoned agent worktree:

```
/home/andre/dev/kanban-board-frontend/.claude/worktrees/agent-ad99257c01d94ec72
branch: worktree-agent-ad99257c01d94ec72 (at 4b048b2, already in the phase-04 branch)
```

Found 2026-09-03 while auditing stale worktrees. `git worktree list` still shows it, so the files
are intact — the worktree was abandoned, not cleaned up, which is the only reason the work survives.
Deleting that worktree destroys it.

## What is in it

`git -C <worktree> diff` — 4 files, 124 insertions:

- `package.json` — `@vitest/coverage-v8@4.1.10` devDependency, `"test:coverage": "vitest run --coverage"`
- `vitest.config.ts` — a `coverage` block: v8 provider, `reportsDirectory: "coverage"`, reporters
  `text`/`html`/`lcov`/`json-summary`, and an `exclude` list covering configs, `scripts/`, `e2e/`,
  `visual/`, `*.stories.tsx`, `src/test-utils/`, `*.d.ts` and the generated API types
- `.gitignore` — `coverage/`
- `pnpm-lock.yaml` — the resolved dependency graph for the above

It deliberately sets **no thresholds**, with the in-file rationale that they should come from the
first real measurement rather than a blind guess. Keep that decision when landing it.

## Why it is worth landing

Nothing in this repo measures coverage today, and the whole of Phase 04 turned on the gap between
"the suite is green" and "the suite exercises this" — the sign-up `displayName: null` defect shipped
because every e2e fixture filled the optional Name field, and the product owner found seven
user-visible defects against a ~2000-test green suite. A coverage report is the cheapest instrument
that would have pointed at those blind spots.

## Next step

Cherry-pick the four files onto a normal branch (not the worktree's own), run `pnpm install`, then
`pnpm test:coverage` once to record the first real measurement in the commit message. Only then
consider thresholds. Remove the worktree afterwards — it is the last thing holding this work.
