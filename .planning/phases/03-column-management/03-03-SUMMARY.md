---
phase: 03-column-management
plan: 03
subsystem: infra
tags: [dnd-kit, drag-and-drop, react-19, next-16, pnpm, spike]

# Dependency graph
requires:
  - phase: 02-board-management
    provides: the board-view/Storybook/Vitest surfaces the spike's scratch story was to be modelled on
provides:
  - "`@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2` as exactly-pinned runtime dependencies"
  - "Evidence that installing the stable dnd-kit line regresses nothing in the existing suite (919 passing tests, all 6 static gates, tsc clean)"
affects: [03-10 column reorder, phase-04 task drag-to-move]

actuals:
  tokens: 887
  tasks: 1
  commits: 2

tech-stack:
  added: ["@dnd-kit/core@6.3.1", "@dnd-kit/sortable@10.0.0", "@dnd-kit/utilities@3.2.2"]
  patterns: ["Exact-version pinning for the ADR tech/0003 drag-and-drop line (no range prefix), matching every other dependency in package.json"]

key-files:
  created: []
  modified: [package.json, pnpm-lock.yaml]

key-decisions:
  - "Installed with `pnpm add --save-exact` so the three packages carry no range prefix, matching package.json's existing convention and making CONVENTIONS.md's 'dependency pinned accordingly' enforcement literal rather than aspirational."
  - "`@dnd-kit/utilities` declared explicitly even though it is already transitive via core and sortable — this phase imports `CSS.Transform.toString` from it directly."
  - "`@dnd-kit/modifiers` deliberately NOT installed: it is needed only if the (unexecuted) auto-scroll finding calls for it, and that decision now belongs to whoever completes Task 2."

patterns-established:
  - "Fresh-worktree bootstrap for this repo: `pnpm install --frozen-lockfile` then `pnpm exec next typegen` before `tsc --noEmit`, because `PageProps`/`LayoutProps` are Next-generated globals that do not exist until typegen has run."

requirements-completed: []

coverage:
  - id: D1
    description: "The three ADR tech/0003 dnd-kit packages are declared, exactly pinned, in `dependencies`, with the pre-1.0 rewrite line and the optional modifiers package absent"
    requirement: "COLUMN-03"
    verification:
      - kind: other
        ref: "node -p over package.json — core=6.3.1, sortable=10.0.0, utilities=3.2.2, @dnd-kit set exactly {core,sortable,utilities}"
        status: pass
      - kind: other
        ref: "pnpm install --frozen-lockfile"
        status: pass
      - kind: other
        ref: "pnpm exec tsc --noEmit"
        status: pass
      - kind: other
        ref: "pnpm lint && pnpm format:check"
        status: pass
    human_judgment: false
  - id: D2
    description: "Observed proof that the legacy dnd-kit line mounts and drags (pointer + keyboard) under this repo's React 19.2 / Next 16.3, with auto-scroll behaviour in nested scroll containers recorded for plan 03-10"
    requirement: "COLUMN-03"
    verification: []
    human_judgment: true
    rationale: "NOT DELIVERED. Task 2's precondition (Playwright MCP resolving as `mcp__playwright__*`) is unmet in this execution context, so nothing was driven in a browser. `03-SPIKE-DNDKIT.md` does not exist. 03-RESEARCH.md assumption A6 and Open Question 4 remain open, exactly as before this plan ran."

# Metrics
duration: 26 min
completed: 2026-08-26
status: halted
---

# Phase 03 Plan 03: dnd-kit Install + React 19 Runtime Spike Summary

**The three ADR-locked dnd-kit packages are installed and exactly pinned with zero regression across the existing suite — but the React 19 runtime spike that was the other half of this plan did not run, because its Playwright-MCP precondition is unmet in a worktree subagent.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-08-26T13:09:00Z (approx — worktree base commit time)
- **Completed:** 2026-08-26T13:35:37Z
- **Tasks:** 1 of 2 completed
- **Files modified:** 2

## Accomplishments

- `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0` and `@dnd-kit/utilities@3.2.2` are declared
  runtime dependencies, pinned to exact versions with no range prefix. The pre-1.0
  `@dnd-kit/react`/`@dnd-kit/dom` rewrite line is absent, as is the optional `@dnd-kit/modifiers`.
- `pnpm peers check` reports no dnd-kit peer complaint: `@dnd-kit/sortable@10.0.0`'s
  `@dnd-kit/core ^6.3.0` peer and all three packages' `react >=16.8.0` peer are satisfied by the
  installed `@dnd-kit/core@6.3.1` and `react@19.2.8`. The two peer warnings that do appear
  (`typescript 6.0.3` vs `^5`, `eslint 10.8.1` vs `^9`) predate this plan and involve no dnd-kit
  package.
- The install regressed nothing: `tsc --noEmit` clean, `lint` clean, `format:check` clean, and all
  six repo static gates (`stories:check`, `renders:check`, `tsx:check`, `comments:check`,
  `handlers:check`, `routes:check`) pass. `pnpm test` runs 919 passing tests; every failure is
  environmental and is analysed under "Issues Encountered" below.

## Task Commits

1. **Task 1: Install the three ADR-locked dnd-kit packages** — `2a38a75` (chore)
2. **Task 2: Prove the legacy dnd-kit line works under React 19** — NOT EXECUTED (precondition unmet)

**Plan metadata:** committed with this summary (docs).

## Files Created/Modified

- `package.json` — three `@dnd-kit/*` entries added to `dependencies`, exact versions.
- `pnpm-lock.yaml` — resolves the three packages plus `@dnd-kit/accessibility@3.1.1` (a transitive
  dependency of `@dnd-kit/core`); 4 packages added in total.

**Not created:** `.planning/phases/03-column-management/03-SPIKE-DNDKIT.md` — see below.

## Decisions Made

- **Exact pins via `--save-exact`.** Every existing entry in `package.json` is an exact version, and
  CONVENTIONS.md states the drag-and-drop rule's enforcement as "`package.json` dependency pinned
  accordingly". A caret range would have made that enforcement nominal.
- **`@dnd-kit/utilities` declared explicitly**, not left to hoisting, because this phase imports
  `CSS.Transform.toString` from it directly.
- **`@dnd-kit/modifiers` left out.** The plan makes its inclusion conditional on Task 2's
  auto-scroll finding. Since that finding does not exist, installing it speculatively would have
  pre-empted a decision this plan is not entitled to make.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `tsc --noEmit` failed in the fresh worktree on missing Next-generated globals**

- **Found during:** Task 1 (verification step)
- **Issue:** `pnpm exec tsc --noEmit` reported `TS2304: Cannot find name 'PageProps'`
  (`app/(dashboard)/boards/[boardId]/page.tsx:40`) and `TS2304: Cannot find name 'LayoutProps'`
  (`app/layout.tsx:19`). These are Next 16 route-type globals emitted into `.next/types/`, which a
  freshly created worktree has never generated — the repo's own `predev`/`prebuild` hooks are what
  normally produce them. Not a regression from the dnd-kit install.
- **Fix:** Ran `pnpm exec next typegen` (the framework's own supported command) to generate the
  route types. No source file was touched.
- **Files modified:** none tracked — `.next/` is gitignored.
- **Verification:** `pnpm exec tsc --noEmit` then exited 0.
- **Committed in:** n/a (generated output, correctly untracked)

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** None on scope. Worth carrying forward as a worktree-bootstrap note: any future
plan running `tsc` in a fresh worktree of this repo needs `next typegen` first.

## Issues Encountered

**1. Task 2 precondition unmet — the plan is halted, not complete.**

Task 2 carries an explicit precondition: Playwright MCP tools must resolve under the
`mcp__playwright__*` prefix (this project's own headless server declared in `.mcp.json`), and the
task must halt rather than drive a headed browser if they do not.

In this execution context **neither** `mcp__playwright__*` **nor** the global
`mcp__plugin_playwright_playwright__*` variant resolves — no Playwright tool of any kind is
available. The precondition is therefore unmet, and per the executor contract an unmet precondition
is never auto-approved. Task 2 was not started and nothing was partially committed for it.

Consequences, stated plainly so plan 03-10 is not written against a false belief:

- `03-SPIKE-DNDKIT.md` **does not exist**.
- 03-RESEARCH.md **assumption A6 remains an assumption** — React 19.2 runtime compatibility is still
  rated MEDIUM on static analysis alone, exactly as it was before this plan ran.
- 03-RESEARCH.md **Open Question 4 remains open** — whether `@dnd-kit/modifiers`'
  `restrictToFirstScrollableAncestor` is needed for auto-scroll inside nested scroll containers is
  unknown.
- Pitfall 3 (the `DndContext` `id` prop) is still **verified-by-source only**. It should be treated
  as required-by-construction in plan 03-10 regardless; the module-scope `useUniqueId` counter in
  `@dnd-kit/utilities` is a read fact, and passing an explicit `id` costs nothing.
- The pointer-path step count and the sibling-control safety check (Pitfall 5) are unobserved.

**Likely root cause, and the check that would confirm it.** Two candidates, not mutually exclusive:

1. *Subagent MCP visibility.* Project-scoped `.mcp.json` servers are not inherited by spawned
   subagents; only user-scoped `$HOME/.claude/mcp.json` servers are. A worktree-isolated executor
   therefore cannot see this project's `playwright` server by construction, no matter how the file
   is written. Under this cause, Task 2 is simply not executable from a dispatched agent and must
   run in the main session.
2. *`.mcp.json` shape.* The committed file is `{"playwright": {...}}` — a bare top-level server map
   with no `mcpServers` wrapper key. If Claude Code expects `{"mcpServers": {"playwright": {...}}}`,
   this server has never loaded in **any** session, which would also explain CLAUDE.md's standing
   worry that a visible window might reappear. **Unverified** — I could not confirm the parser's
   expectations from here.

   Confirming check, in the main session: run `/mcp` and see whether `playwright` is listed. If it
   is not, cause 2 is real and the wrapper key is the fix. If it is listed, only cause 1 applies.

**2. The deployed nonprod backend is unreachable — pre-existing, out of scope.**

`pnpm test` reports 4 failed test files. Three are the real-backend integration suites
(`delete-board.integration.test.ts`, `rename-board.integration.test.ts`,
`fetch-board-full.integration.test.ts`), all failing with
`ConnectTimeoutError: Connect Timeout Error (attempted address:
kanban-board-rud-vlad-473-nonprod.duckdns.org:443, timeout: 10000ms)`.

Confirmed independently of the test runner: a direct `curl --max-time 15` to that host times out
with `connect=0.000000s` — the host accepts no TCP connection at all. This is the same outage
03-RESEARCH.md recorded under "Environment Availability", still ongoing. It has nothing to do with
adding three client-side packages, and per the scope boundary it was not touched.

**3. One Storybook test failure was a cold-start flake, not a regression.**

The first `pnpm test` run also failed `error-fallback.stories.tsx > Default` with
`Test timed out in 15000ms`, immediately after Vite logged `[optimizer] bundling dependencies...`
twice. Re-running the project alone (`pnpm test:a11y`) passes **25 files / 143 tests**. The
component has no relationship to dnd-kit; the first-run dependency optimisation simply pushed a
cold render past the 15s timeout. Recorded rather than "fixed" — it is a pre-existing timing
sensitivity in a fresh worktree, not something this plan introduced.

## Verification Results

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS (exit 0, "Already up to date") |
| `@dnd-kit` set is exactly `core,sortable,utilities` | PASS |
| Versions `6.3.1` / `10.0.0` / `3.2.2`, exact pins | PASS |
| `pnpm exec tsc --noEmit` | PASS (after `next typegen`, see deviation 1) |
| `pnpm lint` | PASS |
| `pnpm format:check` | PASS |
| `pnpm stories:check` | PASS |
| `pnpm renders:check` | PASS |
| `pnpm tsx:check` | PASS |
| `pnpm comments:check` | PASS |
| `pnpm handlers:check` | PASS |
| `pnpm routes:check` | PASS |
| `pnpm test` | PARTIAL — 919 passed, 14 skipped; 3 integration suites fail on backend outage, 1 storybook flake passes on warm re-run |
| `git status --porcelain src/` empty | PASS (no spike scaffolding — none was created) |
| `03-SPIKE-DNDKIT.md` answers A6 / Open Question 4 | **FAIL — file not created, Task 2 halted** |

## Known Stubs

None. No spike scaffolding was created, so none leaked: `git status --porcelain src/` is empty and
no untracked `*.stories.tsx` or scratch script exists anywhere in the tree.

## User Setup Required

None — no external service configuration required by the work that landed. The unreachable nonprod
backend is an availability problem, not a setup task.

## Next Phase Readiness

**Plan 03-10 (column reorder) is NOT ready to be written against observed behaviour.** Its stated
input — this plan's success criterion — was "plan 03-10 can be written against observed dnd-kit
runtime behaviour instead of a static reading of the library's dist", and that input does not
exist. Anything downstream that consumes `03-SPIKE-DNDKIT.md` is blocked.

What *is* ready: the dependency is in place and proven not to break the existing build or suite, so
Task 2 can be resumed on top of this commit with no rework.

Two viable recovery paths, in preference order:

1. **Re-run Task 2 in the main session**, where the project's `.mcp.json` playwright server is in
   scope (subject to the `/mcp` check above). Nothing from Task 1 needs redoing.
2. **Re-plan Task 2** via `/gsd-plan-phase` to target a driver a dispatched agent can actually
   reach. Worth noting for that decision: this worktree *does* run headless Chromium successfully —
   the `storybook (chromium)` Vitest project executed 143 tests here — so the browser itself is
   available; only the MCP-driven dev-server path is not. That path would still need to satisfy the
   plan's `must_haves` requirement that findings hold under the same Chromium the `browser`/
   `storybook` Vitest projects use, which it would do by construction.

Note also that `requirements-completed` is deliberately empty: **COLUMN-03 is not complete.** This
plan installed its library and nothing more. Marking it complete here would flip a requirement green
on the strength of a `pnpm add`.

## Self-Check: PASSED

- `package.json` / `pnpm-lock.yaml` modifications present on disk and committed.
- `.planning/phases/03-column-management/03-03-SUMMARY.md` exists on disk.
- Commit `2a38a75` (Task 1) resolves in `git log`.
- Commit `16721c1` (this summary) resolves in `git log`.
- `git status --porcelain` is empty — no uncommitted or untracked residue.
- Claims checked against actual command output, not inference. The one claim this summary
  explicitly marks unverified is the `.mcp.json` wrapper-key hypothesis, which is labelled as such.

---
*Phase: 03-column-management*
*Completed: 2026-08-26 (halted at Task 2)*
