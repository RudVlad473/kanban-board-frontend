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
  - "Evidence that installing the stable dnd-kit line regresses nothing in the existing suite (936 passing tests, all 6 static gates, tsc clean)"
  - "`.planning/phases/03-column-management/03-SPIKE-DNDKIT.md` — observed React 19 runtime findings confirming A6 and resolving Open Question 4"
affects: [03-10 column reorder, phase-04 task drag-to-move]

actuals:
  tokens: 887
  tasks: 2
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
    verification:
      - kind: other
        ref: "mcp__playwright__* driven against a scratch Storybook story, headless, main session (see 03-SPIKE-DNDKIT.md): mount clean (0 errors), keyboard lift/move/drop/cancel confirmed for both Space and Enter, sibling-control safety confirmed, keyboard auto-scroll-into-view confirmed in nested scroll containers"
        status: pass
      - kind: other
        ref: "Pointer path: Playwright's dragTo() could not reliably trigger a dnd-kit drag (single intermediate mousemove, matches 03-RESEARCH.md Pitfall 4/A7) — recorded as a tooling limitation, not a library defect; the keyboard path is the verified automated surface"
        status: partial
    human_judgment: true
    rationale: "DELIVERED for the keyboard path (dnd-kit's required interaction surface per D-06/U-02), NOT independently observed for the pointer path — no low-level multi-step mouse API was available in this session's tool surface. 03-SPIKE-DNDKIT.md records both outcomes plainly, resolves A6 (CONFIRMED) and Open Question 4 (restrictToFirstScrollableAncestor NOT needed), and flags a one-version Chromium discrepancy (152 vs the project's pinned 151) against the backstop truth rather than silently claiming exact parity."

# Metrics
duration: 26 min (Task 1) + resumed same day, main session (Task 2)
completed: 2026-08-26
status: complete
---

# Phase 03 Plan 03: dnd-kit Install + React 19 Runtime Spike Summary

**The three ADR-locked dnd-kit packages are installed and exactly pinned with zero regression, and the React 19 runtime spike is now complete: a scratch Storybook story, driven headless through this project's own `mcp__playwright__*` server in the main session, confirms dnd-kit's full keyboard interaction contract and nested-container auto-scroll behavior with no runtime error.**

## Performance

- **Duration:** 26 min (Task 1, original session) + resumed same day in the main session (Task 2, after the `.mcp.json` `mcpServers`-wrapper fix landed in commit `f7ae5f3`)
- **Started:** 2026-08-26T13:09:00Z (approx — worktree base commit time)
- **Completed:** 2026-08-26 (Task 2 resumed and completed same day)
- **Tasks:** 2 of 2 completed
- **Files modified:** 3 (package.json, pnpm-lock.yaml, 03-SPIKE-DNDKIT.md)

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
  `handlers:check`, `routes:check`) pass. `pnpm test` runs 936 passing tests (re-run to rule out a
  cold-start flake, see "Task 2 Resumption" below).
- **Task 2 (resumed):** a scratch, uncommitted Storybook story mounted a 5-item horizontal sortable
  list built from all three packages and was driven headless via `mcp__playwright__*` in the main
  session. Full findings in `.planning/phases/03-column-management/03-SPIKE-DNDKIT.md`.

## Task Commits

1. **Task 1: Install the three ADR-locked dnd-kit packages** — `2a38a75` (chore)
2. **Task 2: Prove the legacy dnd-kit line works under React 19** — resumed and completed in the
   main session; findings recorded in `03-SPIKE-DNDKIT.md`, committed with this summary (docs)

**Plan metadata:** committed with this summary (docs).

## Files Created/Modified

- `package.json` — three `@dnd-kit/*` entries added to `dependencies`, exact versions.
- `pnpm-lock.yaml` — resolves the three packages plus `@dnd-kit/accessibility@3.1.1` (a transitive
  dependency of `@dnd-kit/core`); 4 packages added in total.
- `.planning/phases/03-column-management/03-SPIKE-DNDKIT.md` — Task 2's observed findings (created
  in the resumed session; see below).

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

**Resolved — Task 2 Resumption (same day, main session).** Between this plan halting and this
resumption, an unrelated commit (`f7ae5f3`, "fix(mcp): wrap .mcp.json servers in the mcpServers key
so the headless playwright server actually loads") landed on this branch — exactly cause 2 above,
confirmed real. In the main session (not a dispatched subagent), `ToolSearch` resolved
`mcp__playwright__browser_navigate` and friends, and driving them against `http://localhost:6006`
worked cleanly — this project's own headless server, cause 1 (subagent MCP visibility) is real
but moot once execution happens in the main session as the plan's own recovery path 1 recommended.

Findings (full detail in `03-SPIKE-DNDKIT.md`):

- **Mount (§1):** clean, 0 console errors, 0 dnd-kit-related warnings, in both the Storybook
  manager view and the raw `iframe.html` preview.
- **Keyboard path (§2):** lift (`Space` **and** `Enter`, per D-06) → arrow-move → drop all reorder
  the list correctly; `Escape` mid-lift reverts to the pre-lift index. Live-region announcements
  confirmed at every step.
- **Pointer path (§3):** Playwright's `dragTo()` (the only drag primitive this session's MCP tool
  surface exposes — no low-level multi-step `page.mouse` API is available) could **not** reliably
  trigger a dnd-kit drag across targets, exactly as Pitfall 4/A7 predicted. Recorded as a tooling
  limitation of this automation surface, not a dnd-kit defect — the keyboard path is the verified
  automated surface, and e2e (plan 03-12) has direct `page.mouse` access this session's tools do not.
- **Sibling-control safety (§4):** confirmed — a plain click on a non-handle sibling button fires
  its own click and starts no drag.
- **Auto-scroll (§5):** confirmed working for the keyboard path with no extra configuration;
  `@dnd-kit/modifiers` is **not needed**.
- **Pitfall 3 / hydration (§6):** not reproducible in Storybook (it never server-renders, as the
  plan itself anticipated) — recorded as verified-by-source only, per the existing `dist` reading
  in `03-RESEARCH.md`.
- **Environment discrepancy, stated plainly:** the spike ran under `HeadlessChrome/152.0.0.0`
  (`@playwright/mcp@0.0.79` → `playwright-core@1.63.0-alpha`), one Chromium major version ahead of
  this repo's own pinned `@playwright/test@1.62.1` (Chromium `151.0.7922.34`, what Vitest
  browser-mode/Storybook-interaction tests and e2e actually run under). The plan's backstop truth
  asking for "the same Chromium build" is therefore not exactly met — recorded honestly as a
  one-version-adjacent gap rather than claimed as satisfied.

`03-SPIKE-DNDKIT.md`'s `## Supersedes` section resolves **A6 → CONFIRMED** and **Open Question 4 →
`@dnd-kit/modifiers` NOT needed**. The scratch story
(`src/features/boards/components/dnd-kit-spike.stories.tsx`) was deleted immediately after —
`git status --porcelain src/` is empty.

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
| `pnpm test` | PASS — 936/936 (re-run after Task 2's resumption, nonprod having since recovered; one `sidebar.stories.tsx` cold-start flake on the first run passed clean on re-run, same class as Task 1's original flake) |
| `git status --porcelain src/` empty | PASS (Task 2's scratch story was deleted after use) |
| `03-SPIKE-DNDKIT.md` answers A6 / Open Question 4 | **PASS — A6 CONFIRMED, Open Question 4 resolved (modifiers not needed)** |

## Known Stubs

None. Task 2's scratch story (`dnd-kit-spike.stories.tsx`) was deleted immediately after use;
`git status --porcelain src/` is empty and no untracked `*.stories.tsx` or scratch script exists
anywhere in the tree.

## User Setup Required

None — no external service configuration required. The nonprod backend outage noted during Task 1
has since resolved (confirmed via `scripts/probe-column-backend.mjs` in the same resumed session;
see `03-01-SUMMARY.md`/`03-BACKEND-FACTS.md`).

## Next Phase Readiness

**Plan 03-10 (column reorder) can now be written against observed dnd-kit runtime behaviour.**
`03-SPIKE-DNDKIT.md` confirms A6 and resolves Open Question 4 (`@dnd-kit/modifiers` not needed).
The one open item for 03-10 to carry forward: the pointer-path activation distance/step-count
remains unmeasured (this session's tooling could not drive it), so 03-10/03-12 should verify the
pointer path independently via a real low-level `page.mouse` sequence (e2e, per Pitfall 4's
own recommendation) rather than assume this spike covered it.

`requirements-completed` stays empty: **COLUMN-03 is still not complete.** This plan installs the
library and proves its runtime behaviour; COLUMN-03 itself (the reorder feature) ships in plan
03-10. Marking it complete here would flip a requirement green on the strength of a dependency
install and a spike.

## Self-Check: PASSED

- `package.json` / `pnpm-lock.yaml` modifications present on disk and committed.
- `.planning/phases/03-column-management/03-03-SUMMARY.md` exists on disk.
- `.planning/phases/03-column-management/03-SPIKE-DNDKIT.md` exists on disk, contains
  `## Supersedes` naming A6 with a CONFIRMED verdict.
- Commit `2a38a75` (Task 1) resolves in `git log`.
- `git status --porcelain src/` is empty — no scratch-story residue.
- `pnpm lint`, `format:check` (repo-code files), `stories:check`, `renders:check`, `tsx:check`,
  `comments:check`, `handlers:check`, `routes:check`, `tsc --noEmit` all exit 0; `pnpm test` is
  936/936 on a clean re-run.
- Claims checked against actual command output, not inference. The `.mcp.json` wrapper-key
  hypothesis this summary previously marked unverified is now confirmed: commit `f7ae5f3` fixed it,
  and the project's own `mcp__playwright__*` server resolved and worked in this session.

---
*Phase: 03-column-management*
*Completed: 2026-08-26 (Task 1 halted at Task 2; resumed and completed same day in the main session)*
