---
phase: 03-column-management
plan: 13
subsystem: testing
tags: [conventions, documentation-drift, coverage, check-scripts, vitest, playwright, eslint-boundaries]

# Dependency graph
requires:
  - phase: 03-column-management
    provides: "plan 03-11's four column-action integration suites and plan 03-12's four column e2e specs — both are what makes the corrected Server Action convention row describe shipped reality rather than an aspiration"
  - phase: 03-column-management
    provides: "plan 03-09's shipped drag surface, without which the drag-and-drop keyboard-operability enforcement line had nothing real to point at"
provides:
  - "CONVENTIONS.md corrected in six places against the live repository, with every path it cites proven to resolve on disk"
  - "The coverage-pointer rule: a source file with no co-located direct test names the file that does cover it"
  - "scripts/check-coverage-pointers.mjs — a ninth blocking check enforcing that rule, wired into CI's quality job"
  - "51 source files now name their real coverage, five of them admitting the escape hatch"
  - "03-VALIDATION.md closed: every Wave 0 item resolved against the plan that satisfied it, and the phase gate recorded as executed"
affects: [04-task-management, any phase adding a source file, any phase reading CONVENTIONS.md for placement or test-location rules]

actuals:
  tokens: 19866
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Coverage pointer: `// Covered by: `<repo-relative test path>`` in a file's header comment, enforced by a check that resolves it"
    - "Derive a sweep's file list from the tool that will police it, never by hand"

key-files:
  created:
    - scripts/check-coverage-pointers.mjs
    - scripts/check-coverage-pointers.unit.test.mjs
  modified:
    - CONVENTIONS.md
    - package.json
    - .github/workflows/ci.yml
    - playwright.config.ts
    - .planning/phases/03-column-management/03-VALIDATION.md
    - "51 source files under src/ and app/ — a header comment each, nothing else"

key-decisions:
  - "Corrected the document, never the code — no working action was changed to make a stale sentence true"
  - "The coverage pointer uses one shape for both forms (`Covered by: <backticked path>` and `Covered by: nothing to test — <clause>`), rather than the plan's two"
  - "A story is a fixture, not a test: `*.stories.tsx` is not accepted as a pointer target"
  - "`generated-types.ts` is exempt from the check — a pointer there would be a banned hand-edit erased by the next `pnpm api:generate`"
  - "Fixed the `.env.local` loading gap in playwright.config.ts rather than working around it: without it the e2e half of this plan's own gate could not run at all"
  - "Did not resolve 03-BACKEND-FACTS § R8's re-characterisation of threat T-03-21 — 03-11 deliberately left that to a human and this plan honours that"

patterns-established:
  - "Coverage pointer: a file with no co-located direct test opens with `Covered by:` naming an existing test file; `pnpm coverage:check` resolves every one"
  - "Escape hatch with a stated reason: `Covered by: nothing to test — <one clause why>`, and every use of it listed in the SUMMARY as an admitted gap"

requirements-completed: [COLUMN-01, COLUMN-02, COLUMN-03, COLUMN-04]

coverage:
  - id: D1
    description: "CONVENTIONS.md no longer advertises a columns feature folder, and names the enforced boundaries policy as the reason one cannot exist"
    verification:
      - kind: other
        ref: "grep -c 'features/columns' CONVENTIONS.md → 0; test ! -d src/features/columns"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both occurrences of the refresh rule describe the shipped pattern — refresh() from next/cache inside the action, not router.refresh() in the caller"
    verification:
      - kind: other
        ref: "grep -c 'next/cache' CONVENTIONS.md → 2; the only remaining router.refresh() mention explicitly describes the non-mutating retry button"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every file path CONVENTIONS.md cites as an example resolves on disk — five dangling citations corrected, not one"
    verification:
      - kind: other
        ref: "extracted every backticked path containing a slash and ls -d'd each; all resolve"
        status: pass
    human_judgment: false
  - id: D4
    description: "The coverage-pointer rule is enforced mechanically, and was observed to fail when a pointer is deleted and when one is edited to name a path that does not exist"
    verification:
      - kind: unit
        ref: "scripts/check-coverage-pointers.unit.test.mjs — 11 cases in the node project"
        status: pass
      - kind: other
        ref: "pnpm coverage:check — passes on the tree; observed exiting 1 for both a deleted and a stale pointer, then reverted"
        status: pass
    human_judgment: false
  - id: D5
    description: "51 source files without a co-located direct test name the file that covers them, added as comments only"
    verification:
      - kind: other
        ref: "git diff -- src app | grep '^-' | grep -v '^---' → empty; git diff --stat → 51 files, 71 insertions, 0 deletions"
        status: pass
      - kind: unit
        ref: "pnpm test — 93 files, 1297 tests pass; pnpm lint and pnpm comments:check pass"
        status: pass
    human_judgment: false
  - id: D6
    description: "The phase gate ran: five Vitest projects, the visual project with baselines actually compared, both browser suites, nine blocking checks, and a no-diff API regeneration"
    verification:
      - kind: e2e
        ref: "CI=1 pnpm test:visual → 260/260 pass; pnpm exec playwright test --project=e2e → 42 passed, 1 failed"
        status: fail
    human_judgment: true
    rationale: "The gate is NOT green as one run. One local e2e failure (SESSION-01) and a red CI run at this plan's base commit are both recorded in 03-VALIDATION.md; both are proven pre-existing but neither is diagnosed, and a human must decide whether they block the phase."
  - id: D7
    description: "COLUMN-01 through COLUMN-04 demonstrated by a human against the running application"
    verification: []
    human_judgment: true
    rationale: "Task 4 is a blocking checkpoint and was not reached. No Playwright MCP tools resolve in a worktree-isolated executor, so this plan drove nothing through the running app — it could not, rather than chose not to."

# Metrics
duration: 42 min
completed: 2026-08-27
status: halted
---

# Phase 3 Plan 13: Convention Correction and Coverage Pointers Summary

**Six drifted CONVENTIONS.md rules corrected against the live repository, a coverage-pointer rule enforced by a ninth blocking check that resolves every pointer against the filesystem, and 51 source files now naming the test that actually covers them — with the phase gate run in full and its two pre-existing failures recorded rather than absorbed.**

## Performance

- **Duration:** 42 min
- **Started:** 2026-08-27T16:46:30Z
- **Completed:** 2026-08-27T17:28:18Z
- **Tasks:** 3 of 4 (Task 4 is the blocking human checkpoint — not reached)
- **Files modified:** 58

## Accomplishments

- **Corrected six drifted places in `CONVENTIONS.md`, not the four the plan expected.** The plan named the tree entry, the refresh rule (twice), the drag enforcement line, the test-location table's Hook/logic row and the code-location table's Server Action row. Two more had to join them: the Server Action unit-test claim appears in *prose* as well as in the table, and the `renderHook` prescription appears again under "Component tests from stories". Correcting one occurrence of a two-place rule is exactly how the refresh drift survived the last correction pass, so both pairs were fixed together.
- **Found five dangling path citations, not one.** The plan knew about `src/features/auth/actions.unit.test.ts`. Extracting every backticked path from the document and `ls`-ing each also caught `.storybook/preview.ts` (it is `.tsx`), `src/features/auth/components/sign-in-form.tsx` and `src/features/boards/components/board-list.tsx` (both a folder deeper since the 2026-08-27 component-folder migration), `src/features/boards/server/load-boards.ts` (renamed to `fetch-boards.ts`) and `sign-out.ts` (now `sign-out-action.ts`). Every path the document cites now resolves.
- **Built the check first and derived the sweep from it.** The real count is **51**, not the plan's 53 — plan 03-11's four column-action integration suites landed between the plan being written and executed, taking those four actions off the list. `pnpm coverage:check` scans 105 source files.
- **Demonstrated the enforcement failing, twice.** A pointer deleted from `cn.ts` produced `no 'Covered by:' line`; one edited to name a nonexistent test produced `does not exist`. Both were reverted. An enforcement claim never observed to fail is not an enforcement claim.
- **Ran the whole gate and recorded what it actually said** — including the two things that did not pass, both proven to predate this plan.

## Task Commits

1. **Task 1: Correct the drifted convention rules and add the coverage-pointer rule** — `a4c9b6f` (docs)
2. **Task 2: Apply the coverage pointers and the check that keeps them true** — `042bd00` (feat)
3. **Task 3: Run the full phase gate and close the validation contract** — `41af648` (fix)

**Plan metadata:** see the `docs(03-13)` commit that carries this file.

## Files Created/Modified

- `scripts/check-coverage-pointers.mjs` — walks `src/` and `app/`, skips tests, stories, `.d.ts`, `src/test-utils/` and the generated contract types; probes each test suffix **independently** (the `ls a b c` bug the plan warned about reports every file untested the moment one candidate is absent); reports every violation in one run.
- `scripts/check-coverage-pointers.unit.test.mjs` — 11 cases in the `node` project covering all seven behaviours the action named, plus the header-comment parser and the suffix probe.
- `package.json` / `.github/workflows/ci.yml` — `coverage:check`, wired into CI's `quality` job beside the other eight blocking checks.
- `CONVENTIONS.md` — the six corrections, the five path fixes, and the new rule with its reason and its enforcement.
- `playwright.config.ts` — loads `.env.local` (see Deviations).
- `.planning/phases/03-column-management/03-VALIDATION.md` — closed.
- 51 files under `src/` and `app/` — one header comment each. `git diff -- src app` contains **no removed lines**.

## Decisions Made

- **One pointer shape, not two.** The plan's draft wrote the path form without a colon (``Covered by `<path>` ``) and the escape hatch with one (`Covered by: nothing to test — …`). Both are authored as `Covered by:` so the check has one thing to parse and a reader has one thing to copy.
- **A story is not a test.** `*.stories.tsx` is rejected as a pointer target. A story is a fixture; the assertion lives in the `.test.tsx` that composes it. This forced honest pointers for the `*-variants.ts` files rather than the easier story citation.
- **`generated-types.ts` is exempt.** Adding a pointer would be a hand-edit ADR tech/0005 bans, and `pnpm api:generate` would erase it and fail CI's API-types drift step on the next run.
- **The pointer sits above `import "server-only"` but below `"use client"`/`"use server"`.** A directive must stay the first *statement*; the parser accepts either position, and both were exercised by the sweep and the full suite.
- **R8/T-03-21 left alone.** `03-BACKEND-FACTS.md` § R8 records that the board path segment is inert on rename/reorder/delete, and 03-11 deliberately left the re-characterisation of threat T-03-21 to a human. This plan did not silently resolve it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `playwright.config.ts` never loaded `.env.local`, so the e2e half of this plan's own gate could not run**

- **Found during:** Task 3
- **Issue:** `e2e/global-setup.ts` refuses to run without `NONPROD_RESET_TOKEN` and its own error message says the value may live "in your environment or `.env.local`"; `SETUP.md` says the same. Nothing in `playwright.config.ts`, `e2e/test-env.ts` or `global-setup.ts` loaded that file — verified by grep and by `printenv`. Copying `.env.local` into the worktree, which this plan's own precondition treats as sufficient, therefore does nothing for the Playwright process. The e2e project could not start at all.
- **Fix:** `playwright.config.ts` now loads `.env.local` with Node's built-in `util.parseEnv`, guarded on the file existing and assigning with `??=` so an already-exported value always wins — CI, which has no `.env.local` and supplies `SESSION_SECRET` as a repo secret, is unaffected. No dependency added.
- **Files modified:** `playwright.config.ts`
- **Verification:** the e2e project, previously unable to start, ran 43 tests.
- **Committed in:** `41af648`

**2. [Rule 1 - Bug] Four more stale citations in `CONVENTIONS.md` beyond the one the plan named**

- **Found during:** Task 1
- **Issue:** Task 1's acceptance criteria require every cited path to resolve. Extracting them mechanically found four more dead ones (listed under Accomplishments) — all casualties of renames in plans this phase and the last.
- **Fix:** each corrected to the shipped path.
- **Files modified:** `CONVENTIONS.md`
- **Verification:** every backticked path containing a slash `ls -d`'s successfully.
- **Committed in:** `a4c9b6f`

**3. [Rule 1 - Bug] The Server Action unit-test claim and the `renderHook` prescription each appear twice**

- **Found during:** Task 1
- **Issue:** The plan located each in one place. The Server Action "its own co-located `*.unit.test.ts`" claim is also in the prose paragraph above the table, and the `renderHook` prescription is repeated under "Component tests from stories". Fixing one of a pair is precisely how the refresh-rule drift survived its previous correction.
- **Fix:** both pairs corrected together. The auth `actions/` block in the tree diagram, which listed three non-existent `*.unit.test.ts` files, was corrected in the same pass for the same reason.
- **Files modified:** `CONVENTIONS.md`
- **Verification:** `grep -c 'actions.unit.test.ts' → 0`; `renderHook` survives only where it explicitly states no hook currently uses it.
- **Committed in:** `a4c9b6f`

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** All three were required by the plan's own acceptance criteria. The `playwright.config.ts` fix is the only source change outside comments in the whole plan, and it is flagged below as needing a human's agreement.

## Conflict between the plan's action text and its own acceptance criterion

Task 1's action asks the new rule to cite the dangling `actions.unit.test.ts` as "the worked example of the failure mode". Its acceptance criterion requires `grep -c 'actions.unit.test.ts' CONVENTIONS.md` to return **0**. Both cannot hold. Resolved in favour of the criterion — the worked example survives paraphrase ("kept citing a canonical auth-action example for two phases after that file was deleted") while a literal dangling string in a document about dangling strings does not.

## Coverage gaps admitted by the escape hatch

The rule's escape hatch is only honest if every use of it is reported. Five files use it, and each is a real gap:

| File | Stated reason | Assessment |
|------|---------------|------------|
| `app/page.tsx` | the public landing route, which no test navigates to | **A genuine gap.** No e2e visits `/`. Its two anchors and its copy are unasserted. |
| `app/(dashboard)/boards/loading.tsx` | a Suspense fallback returning `BoardViewSkeleton` with no logic of its own | Thin wrapper; the skeleton it renders is itself uncovered (below). |
| `app/(dashboard)/boards/[boardId]/loading.tsx` | same | same |
| `src/features/boards/components/board-view-skeleton/board-view-skeleton.tsx` | a static `SkeletonRow` arrangement no test renders | **A genuine gap.** Its sibling `BoardListSkeleton` *is* rendered by `sidebar.test.tsx`; this one is rendered by nothing. |
| `src/lib/core/api-contract/result-status.ts` | an enum-like constant table; a test could only restate its members | Defensible — a test here would assert the source against itself. |
| `src/types/props.ts` | type declarations only, no runtime | Defensible — nothing to execute. |

The two marked **genuine gap** are the honest output of this rule: they were invisible before, and closing them is a small, well-defined piece of future work.

## Issues Encountered

**The phase gate is not green as one run.** Two failures, disjoint and each passing where the other fails:

1. **`e2e/session-bridge.e2e.spec.ts` SESSION-01 fails locally** — forced sign-out redirects correctly and leaks no upstream error text, but the session cookie survives. **Proven pre-existing**: `git checkout c063aa7 -- src app` reproduces it identically, so nothing in this plan caused it. It passes on CI at that same commit.
2. **CI run `33095258448` at `c063aa7` — this plan's base — is red** on two `columns-reorder.e2e.spec.ts` COLUMN-03 keyboard cases, both timing out waiting on dnd-kit's live-region announcement. Both pass locally.

Per CLAUDE.md, a red CI job is a hard blocker on advancing, not a caveat. Neither failure is diagnosed and neither should be read as closed. Both are recorded in `03-VALIDATION.md` § "Open failures".

**Nothing in this plan was driven through the running application.** No `mcp__playwright__*` tools resolve in a worktree-isolated executor (project-scoped `.mcp.json` is not inherited by spawned subagents), so the Task 4 walkthrough could not be attempted, only handed over. This is impossibility, not omission — CLAUDE.md's "verify before presenting" requires saying so explicitly rather than passing off an unverified claim.

**`pnpm exec next typegen` was needed before `pnpm lint`** in the fresh worktree, as the dispatch prompt warned. No source change.

## Documentation drift found but NOT fixed

`SETUP.md` tells a developer that `NONPROD_RESET_TOKEN` can live in `.env.local`. That is now true for the Playwright process because this plan made it true. **`SETUP.md` itself was not re-read or corrected**, and it may make the same claim about other variables or other runners (`pnpm dev`, the Vitest `node` project) where it is still false. Worth one pass in a later plan; out of scope here.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Not ready.** Three things stand between this phase and done, all surfaced rather than absorbed:

1. **Task 4 — the human walkthrough of COLUMN-01 through COLUMN-04** is a blocking checkpoint and has not been reached. It also carries plan 03-10's drag-feel checkpoint, which that plan recorded as **never approved**.
2. **The red CI run at `c063aa7`** must be resolved or explicitly accepted.
3. **The local SESSION-01 e2e failure** is undiagnosed. It predates this plan, but "pre-existing" is not "fine".

Ready for the next phase once those close: the convention document now describes the codebase as it is, the coverage the codebase already had is legible from the files that have it, and a ninth blocking check keeps it that way.

## Self-Check: PASSED

- `scripts/check-coverage-pointers.mjs` — FOUND
- `scripts/check-coverage-pointers.unit.test.mjs` — FOUND
- `CONVENTIONS.md`, `03-VALIDATION.md`, `03-13-SUMMARY.md` — FOUND
- Commits `a4c9b6f`, `042bd00`, `41af648`, `9f9c2be` — FOUND in `git log`
- Working tree clean; no untracked build artifacts left behind

---
*Phase: 03-column-management*
*Completed: 2026-08-27*
