---
phase: 03-column-management
plan: 11
subsystem: testing
tags: [vitest, integration, real-backend, zod, openapi, dnd-kit]

# Dependency graph
requires:
    - phase: 03-column-management
      provides: "the four column Server Actions (03-04, 03-07, 03-08, 03-09) and the reorder translation + mutation lock (03-10, 03-14)"
    - phase: 02-board-management
      provides: "the real-backend integration-suite pattern (rename/delete board) this plan copies verbatim"
provides:
    - "Real-backend proof of all four column endpoints: create, rename, reorder, delete"
    - "R8: the board path segment is INERT on rename/reorder/delete and required only on create — refutes 03-RESEARCH Pitfall 2's premise and re-characterises T-03-21"
    - "R9: the backend sends `description: null` for a task without one, which taskFullSchema rejected — fixed"
    - "End-to-end confirmation that toReorderTargetPosition's output produces the order reorderColumns predicts"
affects: [04-task-management, phase verification, threat register T-03-21]

actuals:
    tokens: 13000
    tasks: 2
    commits: 2

tech-stack:
    added: []
    patterns:
        - "Real-backend suite dials the path templates directly and never imports the Server Action (ADR tech/0018, tech/0025)"
        - "A wire-semantics assertion sends the shipped translation function's own output and predicts the result with the shipped reorder function, so a misread diverges instead of being re-derived identically"

key-files:
    created:
        - src/features/boards/actions/create-column-action.integration.test.ts
        - src/features/boards/actions/rename-column-action.integration.test.ts
        - src/features/boards/actions/reorder-column-action.integration.test.ts
        - src/features/boards/actions/delete-column-action.integration.test.ts
    modified:
        - src/features/boards/schemas.ts
        - src/features/boards/schemas.unit.test.ts
        - .planning/phases/03-column-management/03-BACKEND-FACTS.md

key-decisions:
    - "Asserted the board segment's REAL behaviour (inert on three endpoints) rather than the plan's assumed behaviour (required on all four) — the suite exists to observe, not to confirm"
    - "Paired each inert-segment case with the control that does bite: a 403 ACCESS_DENIED cross-account refusal, so the file records why the inert segment is not an authorization hole"
    - "Widened taskFullSchema's description to .nullish() rather than weakening the integration assertion that exposed it"
    - "Recorded both refutations in 03-BACKEND-FACTS.md (§ R8, § R9) rather than only in this summary — that file is what the tasks phase will read"

patterns-established:
    - "Board-segment cases: build the URL with the placeholder left in, exactly as openapi-fetch's serializer does, rather than blanking the segment"
    - "Seed a fresh board per test when order is asserted; create columns strictly sequentially (02-BACKEND-FACTS P5)"

requirements-completed: [COLUMN-01, COLUMN-02, COLUMN-03, COLUMN-04]

coverage:
    - id: D1
      description: "Creating a column against the real backend returns a body that parses with the action's own columnSchema and carries no tasks array"
      requirement: COLUMN-01
      verification:
          - kind: integration
            ref: "src/features/boards/actions/create-column-action.integration.test.ts#creates the column and answers with a body the action's own columnSchema parses"
            status: pass
          - kind: integration
            ref: "src/features/boards/actions/create-column-action.integration.test.ts#answers with a tasks-less body, so the full-column shape would reject every success"
            status: pass
      human_judgment: false
    - id: D2
      description: "Duplicate column names are accepted with no server enforcement (03-BACKEND-FACTS R5), so 03-07's inline duplicate copy is client-side-only UX"
      requirement: COLUMN-01
      verification:
          - kind: integration
            ref: "src/features/boards/actions/create-column-action.integration.test.ts#accepts a second column whose name duplicates an existing one on the same board"
            status: pass
      human_judgment: false
    - id: D3
      description: "Renaming succeeds with a current version and is refused with a stale one, carrying the optimistic-lock code the rename hook's conflict copy hangs off"
      requirement: COLUMN-02
      verification:
          - kind: integration
            ref: "src/features/boards/actions/rename-column-action.integration.test.ts#renames the column, so a later full-board read shows the new name and a higher version"
            status: pass
          - kind: integration
            ref: "src/features/boards/actions/rename-column-action.integration.test.ts#refuses a rename carrying a now-stale version with the optimistic-lock problem code"
            status: pass
      human_judgment: false
    - id: D4
      description: "Reordering with toReorderTargetPosition's own output produces exactly the order reorderColumns predicts, confirmed by re-reading the full board"
      requirement: COLUMN-03
      verification:
          - kind: integration
            ref: "src/features/boards/actions/reorder-column-action.integration.test.ts#produces exactly the order the client predicted, from toReorderTargetPosition's own output"
            status: pass
      human_judgment: false
    - id: D5
      description: "A reorder bumps only the moved column's version, leaving merely-shifted ones untouched (R2) — the observation the in-flight mutation lock's width was chosen from; and a stale replay is refused with OPTIMISTIC_LOCK_CONFLICT"
      requirement: COLUMN-03
      verification:
          - kind: integration
            ref: "src/features/boards/actions/reorder-column-action.integration.test.ts#bumps only the moved column's version, leaving the merely-shifted ones untouched"
            status: pass
          - kind: integration
            ref: "src/features/boards/actions/reorder-column-action.integration.test.ts#refuses a replay carrying the now-stale version with the optimistic-lock problem code"
            status: pass
      human_judgment: false
    - id: D6
      description: "Deleting a column that holds a task removes both, and the surviving columns keep their relative order with contiguous positions — the cascade observed, not cited from ADR domain/0002"
      requirement: COLUMN-04
      verification:
          - kind: integration
            ref: "src/features/boards/actions/delete-column-action.integration.test.ts#cascades, so a column holding a task leaves neither the column nor the task behind"
            status: pass
          - kind: integration
            ref: "src/features/boards/actions/delete-column-action.integration.test.ts#keeps the surviving columns in their relative order after a middle column is removed"
            status: pass
      human_judgment: false
    - id: D7
      description: "The board path segment is inert on rename/reorder/delete and required only on create (R8) — REFUTES this plan's central premise and re-characterises threat T-03-21"
      verification:
          - kind: integration
            ref: "src/features/boards/actions/rename-column-action.integration.test.ts#resolves the column from its own id, so an unresolved board segment still renames it"
            status: pass
          - kind: integration
            ref: "src/features/boards/actions/create-column-action.integration.test.ts#does not create a column when the board segment was left unresolved"
            status: pass
      human_judgment: true
      rationale: "The behaviour is proven, but its consequences are a human call: T-03-21 is written as a high-severity tampering threat mitigated by spelling boardId out, and that mitigation now guards a convention rather than an observable failure. Whether to rewrite the threat, relax the four source assertions, or leave both as defence-in-depth is a decision this executor should not make unilaterally."
    - id: D8
      description: "Ownership is enforced from the session, not the path: a stranger is refused 403 ACCESS_DENIED whichever board id the URL carries — so the inert segment is not an authorization hole"
      verification:
          - kind: integration
            ref: "src/features/boards/actions/rename-column-action.integration.test.ts#refuses a stranger's rename whichever board id the path carries"
            status: pass
          - kind: integration
            ref: "src/features/boards/actions/delete-column-action.integration.test.ts#refuses a stranger's delete whichever board id the path carries"
            status: pass
      human_judgment: false
    - id: D9
      description: "taskFullSchema now accepts the explicit `description: null` the backend sends (R9) — before this fix, boardFullSchema rejected any board containing a task"
      verification:
          - kind: unit
            ref: "src/features/boards/schemas.unit.test.ts#accepts the explicit null the backend sends for a task with no description"
            status: pass
          - kind: integration
            ref: "src/features/boards/actions/delete-column-action.integration.test.ts#cascades, so a column holding a task leaves neither the column nor the task behind"
            status: pass
      human_judgment: false

# Metrics
duration: 26 min
completed: 2026-08-27
status: complete
---

# Phase 3 Plan 11: Real-backend column integration suites Summary

**Four Vitest `node` suites dialing the deployed nonprod backend for create/rename/reorder/delete — which refuted the plan's own premise (the board path segment is inert on three of the four endpoints) and uncovered a live schema defect that made every board holding a task unreadable.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-08-27T15:53:00Z
- **Completed:** 2026-08-27T16:19:09Z
- **Tasks:** 2
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments

- All four column endpoints proven against the running backend, with 16 real-network cases across four suites; the whole `node` project passes together (14 files, 88 tests) without exhausting the two-concurrent-session cap.
- **COLUMN-03's load-bearing assertion:** the reorder test sends `toReorderTargetPosition`'s own output and predicts the outcome with `reorderColumns`, then re-reads the full board — the only signal a misread of the wire semantics ever produces.
- **Refuted the plan's central premise (§ R8).** A request with the board segment left unresolved does *not* fail on rename, reorder or delete; the backend resolves the column by `columnId` alone. Only `POST /boards/{boardId}/columns` requires it. The generated types are accurate, not defective.
- **Fixed a live defect (§ R9)** this suite was the first code in the repo to reach: the backend sends `description: null`, which `taskFullSchema.optional()` rejected, so `boardFullSchema` failed on **any** board containing a task.
- Both refutations recorded in `03-BACKEND-FACTS.md` (§ R8, § R9), where the tasks phase will read them.

## Task Commits

1. **Task 1: Real-backend suites for create and rename** — `c858179` (test)
2. **Task 2: Real-backend suites for reorder and delete** — `4c485bf` (test)

## Files Created/Modified

- `src/features/boards/actions/create-column-action.integration.test.ts` — create endpoint: `columnSchema` round-trip, tasks-less response shape, duplicate-name acceptance, and the one board segment that *is* required.
- `src/features/boards/actions/rename-column-action.integration.test.ts` — rename endpoint: success + version bump, stale-version `OPTIMISTIC_LOCK_CONFLICT`, inert board segment, cross-account 403.
- `src/features/boards/actions/reorder-column-action.integration.test.ts` — reorder endpoint: predicted-order assertion, stale replay, R2 version semantics, inert board segment.
- `src/features/boards/actions/delete-column-action.integration.test.ts` — delete endpoint: cascade with a seeded task, surviving order + contiguous positions, inert board segment, cross-account 403.
- `src/features/boards/schemas.ts` — `taskFullSchema.description` widened from `.optional()` to `.nullish()`.
- `src/features/boards/schemas.unit.test.ts` — regression case pinning the explicit `null` form.
- `.planning/phases/03-column-management/03-BACKEND-FACTS.md` — new § R8 and § R9.

## Decisions Made

- **Assert what the backend does, not what the plan assumed.** The plan's must-have truth said every column endpoint whose generated type omits `boardId` "is proven to actually need one". It does not. Weakening the test to preserve the premise would have been the one outcome worse than a red suite, so the tests record reality and the premise is documented as refuted.
- **Pair each inert-segment case with the control that does bite.** A reader who learns the board segment is ignored will immediately ask whether that widens a caller's reach. Both files answer it in the adjacent test: `403 ACCESS_DENIED` whichever board id the path carries, including the attacker's own.
- **Fix the schema rather than the assertion.** The cascade test could have been made to pass by parsing the board leniently. That would have hidden a defect that breaks the board page.
- **Record backend facts in `03-BACKEND-FACTS.md`, not only here.** That file already supersedes `03-RESEARCH.md`'s assumptions log and is what the next phase opens.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `taskFullSchema` rejected the backend's real `description: null`**

- **Found during:** Task 2 (delete cascade test, which is the first code in the repo to put a real task on a real board and read it back)
- **Issue:** `description: z.string().optional()` accepts a *missing* key but rejects an explicit `null`. The backend always sends the key, `null` when unset. `boardFullSchema.safeParse` therefore failed for any board containing a description-less task, and `fetchBoardFull` treats a parse failure as an error — the board page would have shown its failure state instead of the board. Invisible until now because nothing in phases 1–3 creates a task and every fixture omits the key rather than nulling it, so the unit and browser suites agreed with each other and with nothing real.
- **Fix:** `description: z.string().nullish()`, plus a regression case asserting the `null` form parses.
- **Files modified:** `src/features/boards/schemas.ts`, `src/features/boards/schemas.unit.test.ts`
- **Verification:** `pnpm test` — 92 files, 1286 tests, all passing; the cascade integration test now reads the seeded task back and then confirms it is gone.
- **Committed in:** `4c485bf`

**2. [Rule 2 - Missing Critical] Recorded two refuted assumptions in `03-BACKEND-FACTS.md`**

- **Found during:** Tasks 1 and 2
- **Issue:** `03-BACKEND-FACTS.md` is the artifact later phases read for observed backend behaviour, and two of this plan's observations contradict what `03-RESEARCH.md` and the threat register currently state. Leaving them only in this summary would let the next reader re-derive the wrong premise.
- **Fix:** Added § R8 (board segment inert) and § R9 (`description: null`), each with the verbatim observed responses and their consequences.
- **Files modified:** `.planning/phases/03-column-management/03-BACKEND-FACTS.md`
- **Verification:** Both sections cite responses captured in this session and are cross-referenced from the test files' own comments.
- **Committed in:** `c858179`, `4c485bf`

**3. [Deviation - Test intent changed] Board-segment cases assert inertness, not refusal**

- **Found during:** Task 1 (Test 6), carried into Task 2
- **Issue:** The plan specified that a URL built with the board segment unresolved "does NOT succeed" on rename and delete. Observed: it succeeds, on rename, reorder and delete alike; a bogus board id succeeds too. Only `POST /boards/{boardId}/columns` refuses (`404 ENTITY_NOT_FOUND`).
- **Fix:** The create suite keeps the plan's assertion (it holds there). The rename, reorder and delete suites assert the observed inertness and add a cross-account `403` case so the file states what actually protects a column.
- **Files modified:** all four new suites
- **Verification:** Probed directly against the backend before changing any assertion — placeholder and bogus-board variants on all four endpoints, plus three cross-account variants.
- **Committed in:** `c858179`, `4c485bf`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical) + 1 documented change of test intent forced by observation.
**Impact on plan:** No scope creep. One production line changed, and it was a real defect. The plan's four artifacts, their `contains` markers, and every acceptance criterion are satisfied as written; only the *direction* of the board-segment assertions changed, because the plan's premise was false.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: re-characterise | `src/features/boards/actions/{rename,reorder,delete}-column-action.ts` | **T-03-21 (Tampering, high, "dropped board segment in a column URL")** is not the threat it was written as. The path board is never consulted on these three endpoints, so a dropped `boardId` cannot write to the wrong board — but neither does it fail, so the omission is *invisible* rather than loud. The source assertions in these actions guard a convention, not an observable failure. Recommend re-scoping T-03-21 to `POST /boards/{boardId}/columns` (where it is real) and restating the mitigation for the other three. |
| threat_flag: confirmed-mitigated | column endpoints | Authorization is enforced from the session and is unaffected by the path board id — proven with three cross-account variants (placeholder, attacker's own board, victim's `userId` in the query), all `403 ACCESS_DENIED`. |

## Issues Encountered

- **`pnpm lint` failed on first run in the fresh worktree** with three `no-unsafe-assignment` errors in `app/(dashboard)/boards/[boardId]/page.tsx` — a file this plan never touched. Cause: `PageProps<"/boards/[boardId]">` is a Next.js *generated* type, and a fresh `git worktree` has no `.next/types`. `pnpm exec next typegen` produced them and lint went clean with no source change. Worth knowing for every future worktree-isolated plan in this repo: run `next typegen` before trusting a lint result there.
- No environment outage: the precondition was checked with a bad-credentials `POST /signin` (`401`, not the `500` an exhausted JDBC pool returns) rather than by creating an account.

## Known Stubs

None. No test is skipped, no `<verify>` went unrun, and no deliverable is stubbed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All four COLUMN requirements now have a real-backend assertion behind them; phase verification can treat COLUMN-01…04 as observed rather than argued.
- **Carry into the tasks phase:** treat `TaskFull["description"]` as `string | null | undefined` at every read site, and prefer round-tripped payloads over hand-authored fixtures when pinning a wire shape — § R9 is exactly the class of defect a fixture cannot catch.
- **Open for a human:** the T-03-21 re-characterisation above (coverage D7). Nothing is broken; the threat register and four source comments overstate what spelling `boardId` out protects against.
- **Not covered here (unchanged by this plan):** the session-scoped half of each action — `verifySession()` and `refresh()` — which remains the e2e project's job.

## Self-Check: PASSED

- All four created suites present on disk, plus this summary.
- Both task commits resolve: `c858179`, `4c485bf` (this summary is the third commit).
- `pnpm test` (all five projects): 92 files, 1286 tests passing.
- `pnpm exec vitest run --project node` (real-backend project alone): 14 files, 88 tests passing.
- `pnpm lint`, `pnpm format:check`, `pnpm comments:check`, `pnpm exec tsc --noEmit`: all clean.
- Every acceptance criterion in both tasks re-run and passing, including each `grep -c` marker.

---
*Phase: 03-column-management*
*Completed: 2026-08-27*
