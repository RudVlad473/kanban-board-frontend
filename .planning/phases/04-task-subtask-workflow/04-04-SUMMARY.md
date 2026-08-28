---
phase: 04-task-subtask-workflow
plan: 04
subsystem: ui
tags: [react, next, eslint-plugin-boundaries, architecture, refactor, dnd-kit]

# Dependency graph
requires:
  - phase: 03-column-management
    provides: "BoardView, SortableColumn, the five column hooks and the 60-block behavioural suite this plan relocates untouched"
provides:
  - "`BoardView` at `src/components/layout/board-view/` — the layout-ring composition root that may import two features at once"
  - "A proven-legal path for D-14's `src/features/tasks/` folder that adds no `feature -> feature` boundary edge (D-15 stays exception-free)"
  - "CONVENTIONS.md's recorded placement rule for two-feature composition, so the next reader does not move it back"
affects: [task-card, task-detail-view, task-drag-and-drop, features/tasks, subtasks]

# Actuals (#2632) — same estimateTokens scale as the plan's `estimate`.
actuals:
  tokens: 20464
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "`components/layout/` as the two-feature composition point, not merely domain-aware chrome"

key-files:
  created:
    - src/components/layout/board-view/board-view.tsx
    - src/components/layout/board-view/board-view.stories.tsx
    - src/components/layout/board-view/board-view.test.tsx
  modified:
    - app/(dashboard)/boards/[boardId]/page.tsx
    - src/features/boards/hooks/use-create-column.ts
    - src/features/boards/hooks/use-rename-column.ts
    - src/features/boards/hooks/use-delete-column.ts
    - src/features/boards/hooks/use-reorder-columns.ts
    - src/features/boards/hooks/use-column-drag-sensors.ts
    - src/features/boards/components/column-header/column-header.stories.tsx
    - src/features/boards/components/sortable-column/sortable-column.stories.tsx
    - src/features/boards/components/add-column-placeholder/add-column-placeholder.stories.tsx
    - CONVENTIONS.md

key-decisions:
  - "The plan's 52-screenshot premise was false: `src/**/__screenshots__/` is gitignored (.gitignore:36) and holds Vitest failure screenshots, not baselines. Nothing was moved, and a green run writes none."
  - "The three prose cross-references named the file only by basename, which the move did not invalidate — they were widened to the full new path because they are no longer siblings."
  - "`CI=1 pnpm test:visual` was run through a temporary copy of playwright.config.ts on port 6017; `playwright.config.ts` itself was never modified."

patterns-established:
  - "Two-feature composition lives in the layout ring: a component rendering one feature's nodes inside another feature's container belongs in `components/layout/`, never in either feature."

requirements-completed: [TASK-01, TASK-02, TASK-04, TASK-05, SUBTASK-02]

coverage:
  - id: D1
    description: "BoardView, its 20 composed stories and its 1,334-line/60-block test suite relocated to the layout ring with zero content change"
    verification:
      - kind: other
        ref: "git diff --cached -M --name-status → R100 on all three files; commit ff324c3 records `rename ... (100%)`"
        status: pass
      - kind: integration
        ref: "src/components/layout/board-view/board-view.test.tsx (120 tests = 60 it() x 2 devices)"
        status: pass
    human_judgment: false
  - id: D2
    description: "D-15 holds: the boundaries policy is byte-identical and no feature -> feature edge was added"
    verification:
      - kind: other
        ref: "pnpm lint (clean) with `git diff HEAD -- eslint.config.mjs` empty"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every referrer repointed — route import, five `// Covered by:` pointers, three prose cross-references; nothing names the old path"
    verification:
      - kind: other
        ref: "grep -rn 'features/boards/components/board-view/' src app e2e visual .storybook → no matches; pnpm coverage:check; pnpm exec tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D4
    description: "The move is behaviour-neutral across the full suite, the visual baselines and the production build"
    verification:
      - kind: unit
        ref: "pnpm test → 1313/1313 across 95 files, exit 0"
        status: pass
      - kind: automated_ui
        ref: "CI=1 playwright test --project visual → 260/260 against real baselines"
        status: pass
      - kind: e2e
        ref: "pnpm test:e2e → all three columns-reorder specs + boards-detail pass against the real built app"
        status: pass
      - kind: other
        ref: "pnpm build → exit 0, 8/8 static pages, /boards/[boardId] still prerenders"
        status: pass
    human_judgment: false
  - id: D5
    description: "CONVENTIONS.md records components/layout/ as the two-feature composition point, naming BoardView and the reason"
    verification: []
    human_judgment: true
    rationale: "Whether the paragraph 'reads as a rule rather than a narrative' and lands where the next reader will find it is an editorial judgement no check can make; comments:check and format:check only prove it is well-formed."
  - id: D6
    description: "The board renders as before in the running app, drag/rename/delete/board-switching still work, and the surfaces still match the design mock"
    verification: []
    human_judgment: true
    rationale: "BLOCKED, NOT VERIFIED. No `mcp__playwright__*` tool resolves in this executor — custom subagents do not inherit the project-scoped `.mcp.json` server — and CLAUDE.md forbids both falling back to the `plugin_` variant and substituting a throwaway DOM script. The e2e suite was run instead as the closest sanctioned real-app evidence, but the mock comparison (PDF p4) genuinely needs a browser."

# Metrics
duration: 57min
completed: 2026-08-28
status: halted
---

# Phase 4 Plan 04: BoardView Relocation Summary

**`BoardView` moved from the boards feature into `src/components/layout/board-view/` as three
byte-identical (R100) renames, making D-14's `src/features/tasks/` folder legal without the
`feature -> feature` boundary edge D-15 refuses — proven by a clean `pnpm lint` against an
unmodified `eslint.config.mjs`.**

> **Status: halted, not complete.** Tasks 1–3 are done, verified and committed. Task 4 is a
> `checkpoint:human-verify` (`gate="blocking"`) that has **not** been approved, and auto-advance is
> off (`workflow.auto_advance: false`). Flip this to `status: complete` only once a human approves
> that checkpoint. See "Issues Encountered" for why the executor could not drive the browser itself.

## Performance

- **Duration:** ~57 min
- **Started:** 2026-08-28T12:03:00Z
- **Completed:** 2026-08-28T13:00:00Z (implementation tasks)
- **Tasks:** 3 of 4 (Task 4 is the pending human checkpoint)
- **Files modified:** 13

## Accomplishments

- Relocated the whole `BoardView` footprint — 310-line component, 231-line/20-story file and
  1,334-line/60-block test — into the layout ring with **zero content change**, confirmed by git's
  own `R100` similarity score rather than by inspection.
- Proved the central architectural claim: `pnpm lint` is clean while `git diff HEAD --
  eslint.config.mjs` is empty, so the composition became legal by *placement* rather than by
  widening the policy. D-14, D-15 and D-16 now hold simultaneously.
- Repointed all nine referrers and left nothing naming the old path.
- Established the behaviour-neutrality claim against four independent gates: `pnpm test`
  1313/1313, `CI=1` visual 260/260, `pnpm build` with an unchanged route set, and the e2e suite's
  three `columns-reorder` specs passing against the real built app.
- Recorded the placement rule in CONVENTIONS.md so the next reader does not "correct" it back.

## Task Commits

1. **Task 1: Move the four board-view artefacts into the layout ring** — `ff324c3` (refactor)
2. **Task 2: Repoint every referrer and prove the boundary policy is unchanged** — `a2a29c4` (refactor)
3. **Task 3: Prove behaviour is unchanged, then record the placement rule** — `1188a2c` (docs)

## Files Created/Modified

- `src/components/layout/board-view/board-view.tsx` — the board composition root, now in the ring
  that may import both features (moved, not authored)
- `src/components/layout/board-view/board-view.stories.tsx` — 20 composed stories, moved verbatim
- `src/components/layout/board-view/board-view.test.tsx` — the 60-block suite, moved verbatim
- `app/(dashboard)/boards/[boardId]/page.tsx` — the route's only `BoardView` import, repointed and
  re-sorted to the head of its import group
- `src/features/boards/hooks/use-{create,rename,delete}-column.ts`, `use-reorder-columns.ts`,
  `use-column-drag-sensors.ts` — the five `// Covered by:` pointers, re-aimed at the new test path
- `src/features/boards/components/{column-header,sortable-column,add-column-placeholder}/*.stories.tsx`
  — the three prose cross-references, widened to the full new path
- `CONVENTIONS.md` — the two-feature composition rule, plus the tree comment for `components/layout/`

## Decisions Made

- **Named the new path in the three prose cross-references rather than leaving them.** They cite
  `board-view.stories.tsx` by basename, which the move did not invalidate — but they sit in
  `features/boards/`, so the file they name is no longer a sibling and a bare filename no longer
  locates it. Each stayed within the 3-prose-line limit `pnpm comments:check` enforces.
- **Ran the visual suite through a temporary config copy on port 6017.** `playwright.config.ts:7`
  hardcodes `PORT = 6007` and `CI=1` forces `reuseExistingServer: false`, and sibling wave
  executors held that port continuously. The tracked config was never modified and the copy was
  deleted immediately; `git status` is clean.
- **`requirements-completed` copies the plan's `requirements` field verbatim, as the template
  requires — but this plan implements none of them.** It is a pure relocation that *unblocks*
  TASK-01/02/04/05 and SUBTASK-02. `REQUIREMENTS.md` was deliberately left untouched, and GSD's
  shared-ID gate will not mark these complete until every declaring plan in the phase finishes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's 52-screenshot premise is factually wrong; nothing could or should be moved**

- **Found during:** Task 1
- **Issue:** The plan's `must_haves`, `<action>`, `<verify>` and `<acceptance_criteria>` all assert
  that `__screenshots__/board-view.test.tsx/` holds 52 files that must move with the test via
  `git mv`, and 04-PATTERNS.md lists them as part of the footprint. In reality
  `.gitignore:36` ignores `src/**/__screenshots__/`, the directory is **untracked**, and it does not
  exist in this worktree at all — `git ls-files` on the folder returns only the three `.tsx` files.
  The 52 files exist solely in the user's main checkout as machine-local **Vitest Browser Mode
  failure screenshots** from historical failing runs. Task 1's `<verify>` command
  (`test "$(ls .../__screenshots__/... | wc -l)" = "52"`) is therefore unsatisfiable, and satisfying
  it would have meant fabricating 52 gitignored artifacts.
- **Fix:** Moved the three tracked files with `git mv` and moved no screenshots. Did not create the
  directory.
- **Verification:** Proved from the runner's own behaviour rather than by argument — the only
  `__screenshots__` directory written during any run in this plan appeared next to the one *failing*
  test (`add-board-modal`), and **none** was written under `src/components/layout/board-view/`,
  whose 120 tests all passed. `.gitignore:36`, an empty `git ls-files`, and
  `snapshotPathTemplate: "visual/__screenshots__/..."` (the genuinely committed baselines, a
  separate tree) all corroborate it. The plan's own must-have — "no screenshot is re-recorded" —
  holds, for a different reason than it states.
- **Files modified:** none beyond the three renames
- **Committed in:** `ff324c3` (Task 1 commit)

**2. [Rule 3 - Blocking] `tsc --noEmit` failed on absent Next.js generated route types**

- **Found during:** Task 2
- **Issue:** `error TS2304: Cannot find name 'PageProps'` / `'LayoutProps'`. A fresh worktree has no
  `.next/types`, which is where Next generates these globals. Not caused by the move —
  `app/layout.tsx` errored identically and this plan never touches it.
- **Fix:** Ran `pnpm exec next typegen`.
- **Verification:** `pnpm exec tsc --noEmit` then exits 0 with no output.
- **Files modified:** none (generated output is gitignored)
- **Committed in:** n/a — no source change was required

**3. [Rule 3 - Blocking] `CI=1 pnpm test:visual` could not obtain the hardcoded port 6007**

- **Found during:** Task 3
- **Issue:** Three sibling wave executors (`agent-aebe86f0099bb5f2f`, `agent-af6521cc5c6bd8d5b`)
  were running their own visual suites concurrently. `playwright.config.ts:7` hardcodes
  `PORT = 6007` with no env override, and `ignoreSnapshots: !process.env.CI` forces
  `reuseExistingServer: false` under `CI=1`. A 15-attempt / 5-minute wait-and-retry never won the
  race.
- **Fix:** Ran the visual project through a temporary copy of the config on port 6017, then deleted
  the copy. Sibling runs were left strictly alone — no process was killed.
- **Verification:** 260/260 passed against real baselines; `git status --porcelain visual/` reports
  nothing; the temp file is gone and `git status` is clean.
- **Files modified:** none tracked
- **Committed in:** n/a

---

**Total deviations:** 3 auto-fixed (1 bug in the plan's premise, 2 blocking/environmental).
**Impact on plan:** No scope change. Deviation 1 corrects a factual error in the plan and
04-PATTERNS.md that would otherwise be copied forward; deviations 2 and 3 are worktree/parallelism
environment gaps, not code.

## Issues Encountered

**The Task 4 checkpoint could not be self-verified in a browser — this is the one thing left undone.**
CLAUDE.md requires driving the change through the running app before presenting it, using tools
named `mcp__playwright__*`, and explicitly forbids falling back to the globally-installed
`mcp__plugin_playwright_playwright__*` variant or writing a throwaway DOM script. **Neither
resolves in this executor**: a custom subagent inherits only user-scoped MCP servers, so the
project's own `.mcp.json` headless server is invisible here. This is the same gap recorded in
STATE.md for phase 03 wave 4, where the orchestrator had to do the visual check in the main session.
The strongest sanctioned substitute was run instead — see the checkpoint hand-off below.

**Three full-suite test failures were confirmed as contention flakes, not regressions.** The first
`pnpm test` reported 3 failed / 1310 passed; every failure was a 15s timeout, never an assertion,
and two were in files this plan never touches. Run alone, the storybook project passed 193/193 and
the browser project 828/828 — exactly the signature CONVENTIONS.md's "Test runner concurrency"
section documents. A second full run was green at **1313/1313**.

**One e2e test failed and is out of scope.** `cookie-policy.e2e.spec.ts` fails a *different* test on
each run (COOKIE-03 in the full run, COOKIE-04 in isolation) and never references `BoardView`.
Logged to `deferred-items.md` rather than fixed, per the executor scope boundary.

**On the "same test count as before" criterion:** the suite was not run on the pre-move tree (doing
so would mean rewinding a worktree with sibling agents active). The count is instead shown to be
structurally preserved: the rename is `R100` (zero content change), the `browser` project's include
glob is the location-independent `src/**/*.test.tsx`, and the moved file contributes exactly
120 tests (60 `it()` x 2 devices) at its new path. STATE.md's "1304" predates commits `fb2b883` and
`7d5dd21`, so 1313 is the current pre-plan figure, not an increase.

**On `actuals.tokens`:** reported as chars/4 over the *files changed* (81,856 chars of relocated
footprint). The realized **diff** is only 9,372 chars (~2,343 tokens), because a `git mv` carries no
content. Both numbers are stated so neither inflates nor deflates future calibration against the
plan's 65,000-token estimate.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Ready:** the layout ring is now a legal composition point, so a real `src/features/tasks/`
  folder can land without touching `eslint.config.mjs`. The `layout -> feature` policy that makes
  this work already existed and was not widened.
- **Blocker:** Task 4's human checkpoint is unapproved, and the browser + mock comparison it asks
  for has not been performed by anyone yet. Until it is, treat this plan as `halted`.
- **Note for the orchestrator:** `04-PATTERNS.md` line 930 still lists the 52 Vitest screenshots as
  part of the movable footprint. That line is wrong (see Deviation 1) and will mislead any later
  plan that reads it.

## Self-Check: PASSED

- All three relocated files exist at `src/components/layout/board-view/`.
- All four commits resolve on `worktree-agent-a36546e967c4370d5`: `ff324c3`, `a2a29c4`, `1188a2c`,
  `80c7593`.
- `git status --short` is empty — no stray artifact, no leftover temp config, no untracked file.
- Every acceptance criterion for Tasks 1–3 was re-run and passes; Task 4 remains an unapproved
  human checkpoint, which is why `status` is `halted`.

---
*Phase: 04-task-subtask-workflow*
*Completed: 2026-08-28*
