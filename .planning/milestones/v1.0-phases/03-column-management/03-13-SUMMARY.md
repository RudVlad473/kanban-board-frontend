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
  - "e2e/server-action.ts — createServerActionSettled, the settle-wait that closes the optimistic-reload race in three specs (one shipped in Phase 2)"
  - "The CONVENTIONS.md rule for it, with the reasoning for why it is prose rather than a check script recorded inline"
affects: [04-task-management, any phase adding a source file, any phase reading CONVENTIONS.md for placement or test-location rules]

actuals:
  tokens: 28150
  tasks: 4
  commits: 8

tech-stack:
  added: []
  patterns:
    - "Coverage pointer: `// Covered by: `<repo-relative test path>`` in a file's header comment, enforced by a check that resolves it"
    - "Derive a sweep's file list from the tool that will police it, never by hand"

key-files:
  created:
    - scripts/check-coverage-pointers.mjs
    - scripts/check-coverage-pointers.unit.test.mjs
    - e2e/server-action.ts
  modified:
    - CONVENTIONS.md
    - package.json
    - .github/workflows/ci.yml
    - playwright.config.ts
    - e2e/boards-rename.e2e.spec.ts
    - e2e/columns-rename.e2e.spec.ts
    - e2e/columns-reorder.e2e.spec.ts
    - .planning/phases/03-column-management/03-VALIDATION.md
    - "51 source files under src/ and app/ — a header comment each, nothing else"

key-decisions:
  - "Corrected the document, never the code — no working action was changed to make a stale sentence true"
  - "The coverage pointer uses one shape for both forms (`Covered by: <backticked path>` and `Covered by: nothing to test — <clause>`), rather than the plan's two"
  - "A story is a fixture, not a test: `*.stories.tsx` is not accepted as a pointer target"
  - "`generated-types.ts` is exempt from the check — a pointer there would be a banned hand-edit erased by the next `pnpm api:generate`"
  - "Fixed the `.env.local` loading gap in playwright.config.ts rather than working around it: without it the e2e half of this plan's own gate could not run at all"
  - "Did not resolve 03-BACKEND-FACTS § R8's re-characterisation of threat T-03-21 — 03-11 deliberately left that to a human and this plan honours that"
  - "The settle-wait rule gets prose, not a check script: its real predicate (the assertion was optimistic) is invisible to a text scanner, and a 'settle-wait or a comment' escape hatch is unfalsifiable — unlike coverage:check's, which names a file the checker resolves"
  - "The settle-wait resolves on the response head, not response.finished(): the streamed refresh() payload never closes, which was measured to hang past the 30s test timeout"

patterns-established:
  - "Coverage pointer: a file with no co-located direct test opens with `Covered by:` naming an existing test file; `pnpm coverage:check` resolves every one"
  - "Escape hatch with a stated reason: `Covered by: nothing to test — <one clause why>`, and every use of it listed in the SUMMARY as an admitted gap"
  - "Optimistic-reload settle-wait: an e2e spec asserting an optimistic value then reloading first awaits createServerActionSettled, created before the click that triggers the action"
  - "Contention run as a flake detector: --repeat-each=3 --workers=2 surfaces staleness races that are invisible at the default worker count"

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
      - kind: unit
        ref: "pnpm test → 93 files, 1297 tests"
        status: pass
      - kind: automated_ui
        ref: "CI=1 pnpm test:visual → 260/260 with baselines compared"
        status: pass
      - kind: e2e
        ref: "CI=1 pnpm exec playwright test --project=e2e → 43/43 after 8b77c76 fixed the SESSION-01 regression"
        status: pass
    human_judgment: true
    rationale: "SESSION-01 was a regression this plan introduced — the .env.local loader ran after e2e/test-env.ts had already frozen E2E_CONFIG, so the spec sealed cookies with a fallback secret the app never used. Diagnosed and fixed in 8b77c76; the full suite is 43/43 with no shell-exported env. The deterministic-and-serial measurement recorded here was the signal that led to it."
  - id: D7
    description: "COLUMN-01 through COLUMN-04 demonstrated against the running application, in both themes"
    verification:
      - kind: manual_procedural
        ref: "orchestrator-driven headless Playwright walkthrough at 1280x800 against a seeded nonprod account, 2026-08-27"
        status: pass
    human_judgment: true
    rationale: "Performed by the orchestrator, not this executor — no Playwright MCP tools resolve in a worktree-isolated subagent. All four requirements PASS, including the pointer-drag auto-scroll past the fold that 03-12 had left open, and an id-keyed dot check that a position-keyed implementation would have failed."
  - id: D8
    description: "An e2e spec that asserts an optimistic value and then reloads first waits for the write to reach the server"
    verification:
      - kind: e2e
        ref: "CI=1 pnpm exec playwright test --project=e2e <3 affected specs> --repeat-each=3 --workers=2 → 15/15 (2 of 15 failed before the fix)"
        status: pass
    human_judgment: false

# Metrics
duration: 77 min
completed: 2026-08-27
status: complete
---

# Phase 3 Plan 13: Convention Correction and Coverage Pointers Summary

**Six drifted CONVENTIONS.md rules corrected against the live repository, a coverage-pointer rule enforced by a ninth blocking check that resolves every pointer against the filesystem, 51 source files now naming the test that actually covers them — and the optimistic-reload race that had been silently shipping since Phase 2 root-caused, fixed in three e2e specs, and written down.**

## Performance

- **Duration:** 77 min
- **Started:** 2026-08-27T16:46:30Z
- **Completed:** 2026-08-27T18:03:31Z
- **Tasks:** 4 of 4 (Task 4 performed by the orchestrator — see below)
- **Files modified:** 62

## Accomplishments

- **Corrected six drifted places in `CONVENTIONS.md`, not the four the plan expected.** The plan named the tree entry, the refresh rule (twice), the drag enforcement line, the test-location table's Hook/logic row and the code-location table's Server Action row. Two more had to join them: the Server Action unit-test claim appears in *prose* as well as in the table, and the `renderHook` prescription appears again under "Component tests from stories". Correcting one occurrence of a two-place rule is exactly how the refresh drift survived the last correction pass, so both pairs were fixed together.
- **Found five dangling path citations, not one.** The plan knew about `src/features/auth/actions.unit.test.ts`. Extracting every backticked path from the document and `ls`-ing each also caught `.storybook/preview.ts` (it is `.tsx`), `src/features/auth/components/sign-in-form.tsx` and `src/features/boards/components/board-list.tsx` (both a folder deeper since the 2026-08-27 component-folder migration), `src/features/boards/server/load-boards.ts` (renamed to `fetch-boards.ts`) and `sign-out.ts` (now `sign-out-action.ts`). Every path the document cites now resolves.
- **Built the check first and derived the sweep from it.** The real count is **51**, not the plan's 53 — plan 03-11's four column-action integration suites landed between the plan being written and executed, taking those four actions off the list. `pnpm coverage:check` scans 105 source files.
- **Demonstrated the enforcement failing, twice.** A pointer deleted from `cn.ts` produced `no 'Covered by:' line`; one edited to name a nonexistent test produced `does not exist`. Both were reverted. An enforcement claim never observed to fail is not an enforcement claim.
- **Ran the whole gate and recorded what it actually said** — including the two things that did not pass, both proven to predate this plan.

## Task 4 — walkthrough results (performed by the orchestrator)

This executor could not drive a browser: no `mcp__playwright__*` tools resolve in a
worktree-isolated subagent. The orchestrator performed the walkthrough itself, headless at
1280x800 against a real seeded nonprod account, and reported:

| Requirement | Result | Notes |
|-------------|--------|-------|
| COLUMN-01 add | **PASS** | Empty board shows the centred `+ Add New Column` CTA; the created column survives reload. Once populated the CTA becomes the ghost column `+ New Column`; the row auto-scrolls to reveal each new column. |
| COLUMN-02 rename | **PASS** | Kebab offers exactly Rename/Delete; the modal prefills the current name; the rename survives reload. |
| COLUMN-03 reorder | **PASS** | A pointer drag held at the right edge auto-scrolled 0→692px monotonically (~60px/200ms, no stall) and dropped four positions onto a target that was beyond the fold at lift; the order survived reload. |
| COLUMN-04 delete | **PASS** | The confirmation names the column and warns about the cascade, and focuses the **safe** option (`Keep Column`); declining is safe; deleting removed the column and its task, still gone after reload; delete-to-zero lands on the shared empty state. |
| Visual system | **PASS** | Both themes, compared against mock p3: header shape (dot · uppercase letter-spaced name · count), ghost-column gradient and centred label all match. The kebab is an addition the mock lacks, authorized by 03-UI-SPEC U-01. |
| U-03 dot keying | **PASS** | Not trusted from colour order alone: deleting a middle column left Alpha green, Gamma cyan, Delta green. Position-keying would have repainted them, so the dots are genuinely id-keyed. |

**This closes D7, which this plan had left open**, and closes the pointer-drag auto-scroll past the
fold that 03-12 recorded as `human_judgment: true` — verified, not deferred. A board holding a real
task rendered correctly, independently confirming wave 10's `description: null` fix.

## Task Commits

1. **Task 1: Correct the drifted convention rules and add the coverage-pointer rule** — `a4c9b6f` (docs)
2. **Task 2: Apply the coverage pointers and the check that keeps them true** — `042bd00` (feat)
3. **Task 3: Run the full phase gate and close the validation contract** — `41af648` (fix)
4. **Task 4: walkthrough** — performed by the orchestrator, no commit of its own
5. **Post-checkpoint: fix the optimistic-reload race in three e2e specs** — `089a82a` (fix)
6. **Post-checkpoint: record the settle-wait rule** — `178b869` (docs)

**Plan metadata:** `9f9c2be`, `aec2941`, and the `docs(03-13)` commit carrying this revision.

## Files Created/Modified

- `scripts/check-coverage-pointers.mjs` — walks `src/` and `app/`, skips tests, stories, `.d.ts`, `src/test-utils/` and the generated contract types; probes each test suffix **independently** (the `ls a b c` bug the plan warned about reports every file untested the moment one candidate is absent); reports every violation in one run.
- `scripts/check-coverage-pointers.unit.test.mjs` — 11 cases in the `node` project covering all seven behaviours the action named, plus the header-comment parser and the suffix probe.
- `package.json` / `.github/workflows/ci.yml` — `coverage:check`, wired into CI's `quality` job beside the other eight blocking checks.
- `CONVENTIONS.md` — the six corrections, the five path fixes, and the new rule with its reason and its enforcement.
- `playwright.config.ts` — loads `.env.local` (see Deviations).
- `.planning/phases/03-column-management/03-VALIDATION.md` — closed.
- 51 files under `src/` and `app/` — one header comment each. `git diff -- src app` contains **no removed lines**.
- `e2e/server-action.ts` — `createServerActionSettled`, the settle-wait for an optimistic mutation.
- `e2e/{boards,columns}-rename.e2e.spec.ts`, `e2e/columns-reorder.e2e.spec.ts` — settle-waits added before four reloads; the cancelled-lift reload keeps none and says why.

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

## Post-checkpoint work: the red CI run was a real test defect, now fixed

**Root cause: a spec that asserts an OPTIMISTIC value and then calls `page.reload()` without
waiting for the write to reach the server.** Under contention the reload outruns the in-flight
Server Action and reads stale server state. Diagnosed by the orchestrator; reproduced and fixed
here.

**Reproduced before touching anything** with
`CI=1 pnpm exec playwright test --project=e2e <the 3 specs> --repeat-each=3 --workers=2`:
**2 of 15 runs failed**, both `boards-rename`, both at the post-reload assertion, reverted to the
pre-rename name. That is a third distinct symptom of the same defect — CI showed it as an
announcement timeout, the orchestrator saw it on the pointer test's post-reload assertion, and it
surfaced here on the Phase 2 board-rename spec. **It is invisible at the default worker count**,
which is why review missed it in two consecutive phases.

**Fixed in three specs** — one of them shipped in **Phase 2**:

| Spec | Reloads gated | Origin |
|------|---------------|--------|
| `e2e/boards-rename.e2e.spec.ts` | 1 | **Phase 2** — shipped with the defect, copied forward |
| `e2e/columns-rename.e2e.spec.ts` | 1 | Phase 3 (03-12) |
| `e2e/columns-reorder.e2e.spec.ts` | 2 gated, 1 deliberately not | Phase 3 (03-12) |

The mechanism is `createServerActionSettled` in the new `e2e/server-action.ts`, keyed on the single
POST carrying a `next-action` request header that a Server Action is, created **before** the click
that triggers it. No timer anywhere: the reorder spec's own header comment already said "wait on
the announcement, never on a timer" — the principle was right and had been applied to only the drag
half of the operation. The cancelled-lift reload keeps **no** settle-wait and says why at the
reload: a cancelled lift issues no action, so there is no response to wait for.

**Not affected and deliberately untouched:** `columns-create`, `columns-delete`, `boards-create`,
`boards-delete`. Those mutations are not optimistic (U-05), so the appearance/disappearance
assertion already *is* the settle-wait.

**One thing I tried that was wrong, and caught before claiming it.** I first strengthened the
helper with `response.finished()`, reasoning it would also silence the server's "destination stream
closed early" log. The full suite then **timed out** at that line on `columns-rename`: the
`refresh()` RSC payload keeps streaming, so `finished()` never resolves. Reverted to the
header-level wait, which is sufficient on its own — the action awaits its upstream write before
responding at all, so a status line already means the write is durable. The stream-abort log is
cosmetic. Recorded because the reasoning was plausible and still wrong.

**Verification (commands run, output read):**

| Command | Before | After |
|---------|--------|-------|
| `CI=1 … <3 specs> --repeat-each=3 --workers=2` | **2 failed, 13 passed** | **15 passed, exit 0** |
| `CI=1 pnpm exec playwright test --project=e2e` (full) | 42 passed, 1 failed | **43/43** after `8b77c76` |
| `pnpm test` | 1297 passed | **1297 passed** |
| `pnpm lint` | pass | **pass** (caught a real type error in the first draft of the matcher: `headers()` is `Record<string, string>`, so `!== undefined` had no overlap — changed to an `in` check and re-ran the reproduction, since a matcher that matches nothing would hang rather than pass) |
| The other eight blocking checks | pass | **pass** |

## Correction: SESSION-01 was a regression this plan introduced

Two earlier readings of this were wrong and are superseded. The first called it a pre-existing
shipped defect. The second (above, now corrected) accepted "not a defect" but left the
worktree-vs-checkout difference unexplained. **The measurement that did not fit was the real
signal, and it pointed at this plan's own `playwright.config.ts` change.**

Diagnosed and fixed by the orchestrator in `8b77c76`, after this executor's worktree was merged.
The loader was added to `playwright.config.ts` *below* its `import { E2E_CONFIG } from
"./e2e/test-env"`. An ES module is evaluated before the body of the module importing it, so
`test-env.ts` read `process.env.SESSION_SECRET` while it was still unset, froze the
`"test-only-session-secret-not-for-production"` fallback into `E2E_CONFIG`, and only then did
`loadLocalEnvFile()` populate `process.env`. From that point the two disagreed permanently:
`session-bridge.e2e.spec.ts:37` seals its forged cookie with `E2E_CONFIG.SESSION_SECRET`, while
the running app reads `process.env.SESSION_SECRET` (`src/lib/server/session.ts:149`) — so the app
could not verify the cookie, forced sign-out destroyed nothing, and the survival assertion failed.

This explains every observation, including the ones that looked contradictory: it fails whenever
`.env.local` is the only supplier (deterministic, serial, isolated — hence "not contention"), and
passes whenever the values are shell-exported instead (which is how the orchestrator's 5/5 was
obtained, without either of us realising the prefix was the variable).

**CI could not have caught it.** CI exports the real values as environment variables and ships no
`.env.local`, so the fallback never triggers there. This defect was local-only — the exact inverse
of the reorder flake fixed earlier in this same plan, which was CI-only. A green CI run was not
evidence about it, and neither was this plan's own gate.

Fixed by moving the load into `test-env.ts`'s own body, ahead of the object it builds: statement
order inside one module body cannot be reordered by an import sorter, which a fix in the caller —
or a side-effect module imported there — both could be. Verified with no shell-exported env:
session-bridge 5/5 on three consecutive runs (was 0/3), full `--project=e2e` **43/43**.

The honest lesson is about the fallback, not the ordering: a test-only secret that silently
substitutes for a missing real one turned a misconfiguration into a wrong answer instead of a
loud failure. `session.ts` fails fast when `SESSION_SECRET` is unset; `test-env.ts` does not.
Making it announce itself is carried forward, not done here — other suites depend on that fallback.

## Issues Encountered

**`pnpm exec next typegen` was needed before `pnpm lint`** in the fresh worktree, as the dispatch
prompt warned. No source change.

**`.env.local` is loaded only because this plan made it so.** Confirmed by `printenv`: the token is
absent from the shell, so the `set -a; . ./.env.local` prefix is *not* what makes e2e runnable here
— `playwright.config.ts`'s new loader is. Every e2e command in this summary was run without that
prefix.

## Documentation drift found but NOT fixed

`SETUP.md` tells a developer that `NONPROD_RESET_TOKEN` can live in `.env.local`. That is now true for the Playwright process because this plan made it true. **`SETUP.md` itself was not re-read or corrected**, and it may make the same claim about other variables or other runners (`pnpm dev`, the Vitest `node` project) where it is still false. Worth one pass in a later plan; out of scope here.

## User Setup Required

None — no external service configuration required.

## Should the settle-wait rule get a check script? My call: no — prose, and here is why

The repo's own precedent (`stories:check`, and the `coverage:check` this plan just built) favours
enforcement for mechanical rules, and this one has already decayed once across two phases. I still
land on prose, for one reason that is about *this* rule rather than about effort:

**A checker could only key on `page.reload()`, and that is the wrong predicate.** The property that
matters is "the assertion above this was optimistic", which is invisible to a text scanner. Of the
suite's **17** reloads, only **5** are optimistic-then-reload. The other 12 are correct as written —
create/delete wait for the server, and the theme/auth reloads are not mutations at all. A
`page.reload()` check would flag all 12 and demand a justifying comment on correct code.

**And the escape hatch would prove nothing.** This is the decisive difference from `coverage:check`:
there, the escape hatch still names a file the checker *resolves* — a checkable fact. Here,
"settle-wait or a comment" is satisfied by typing a comment. A rule whose escape hatch is
unfalsifiable prose is worse than the prose alone, because it looks enforced.

What I did instead, and what would actually catch a recurrence:

- **The mechanism is a shared function**, not a copied idiom — `createServerActionSettled` is the
  one place the "create before the click" contract is stated, so a spec author copies a call rather
  than re-deriving a pattern.
- **If it decays a second time, reach for a contention run, not a grep.**
  `--repeat-each=3 --workers=2` detected the real property — staleness under load — 2 failures in
  15, on code that was green at the default worker count. That is a genuine detector. Whether it is
  worth its CI minutes is a separate call I am flagging, not making.

## Next Phase Readiness

**Ready.** All three blockers from the previous revision are closed:

1. **Task 4** — performed by the orchestrator; COLUMN-01 through COLUMN-04 all PASS in a real
   browser, in both themes, including the pointer-drag auto-scroll 03-12 had left open and an
   id-keyed dot check. This also discharges plan 03-10's never-approved drag-feel checkpoint.
2. **The red CI run at `c063aa7`** — root-caused to a real test defect, fixed in three specs (one
   of them Phase 2's), and verified green 15/15 on the command that reproduced it.
3. **SESSION-01** — verified green by the orchestrator on the merged checkout and on CI; corrected
   above. My worktree-local failure is recorded but is not a defect in shipped code.

The convention document now describes the codebase as it is, the coverage the codebase already had
is legible from the files that have it, a ninth blocking check keeps it that way, and the
optimistic-reload race that had been quietly shipping since Phase 2 is closed and written down.

**Carried forward, small and well-defined:** two real coverage gaps (`app/page.tsx`,
`board-view-skeleton.tsx`), and a `SETUP.md` pass to check whether its `.env.local` claim is still
false for runners other than Playwright.

## Self-Check: PASSED

- `scripts/check-coverage-pointers.mjs` — FOUND
- `scripts/check-coverage-pointers.unit.test.mjs` — FOUND
- `CONVENTIONS.md`, `03-VALIDATION.md`, `03-13-SUMMARY.md` — FOUND
- `e2e/server-action.ts` — FOUND
- Commits `a4c9b6f`, `042bd00`, `41af648`, `9f9c2be`, `aec2941`, `089a82a`, `178b869` — FOUND in `git log`
- Working tree clean; no untracked build artifacts left behind

---
*Phase: 03-column-management*
*Completed: 2026-08-27*
