---
phase: 04-task-subtask-workflow
plan: 02
subsystem: api
tags: [nonprod-probe, backend-contract, optimistic-locking, openapi, authorization]

# Dependency graph
requires:
    - phase: 03-column-management
      provides: "scripts/probe-column-backend.mjs (probe shape, signIn/extractSessionCookie, two-session-cap guard) and 03-BACKEND-FACTS.md (the document shape and the R8/R9 findings this phase extends one level deeper)"
    - phase: 02-board-management
      provides: "02-BACKEND-FACTS.md P7's session-not-query authorization finding, and the no-delete-account fact that governs probe cleanup"
provides:
    - "Observed answers to T1-T9: the create-task path, ancestor-segment behaviour, targetPosition semantics, stale-version codes, shifted-task versions, delete cascade, cross-board/cross-account move refusals, update-side title bounds, and description handling"
    - "Explicit CONFIRMED/REFUTED verdicts on 04-RESEARCH.md assumptions A3-A7 (all five CONFIRMED)"
    - "Two blocking design inputs no assumption covered: a task description can never be cleared, and the update-side title error message is wrong"
    - "scripts/probe-task-backend.mjs — a re-runnable, never-CI'd instrument for re-checking any of these facts"
affects:
    [
        create-task,
        edit-task,
        move-task,
        delete-task,
        subtask-actions,
        board-read-ordering,
        map-problem-code,
        04-UI-SPEC-copywriting,
    ]

# Actuals (#2632) — same estimateTokens scale as the plan's estimate (chars/4 over the realized diff).
actuals:
    tokens: 17664
    tasks: 2
    commits: 3

# Tech tracking
tech-stack:
    added: []
    patterns:
        - "Per-phase nonprod probe: a standalone .mjs script that seeds throwaway accounts, answers one labelled question per section, and is deliberately absent from package.json and CI"
        - "Probe self-cleanup: delete every board created on the way out in a finally block, and state plainly what could not be deleted (accounts) and why"
        - "Control-first probing: a probe question whose negative result has two readings needs a positive control in the same run"

key-files:
    created:
        - scripts/probe-task-backend.mjs
        - .planning/phases/04-task-subtask-workflow/04-BACKEND-FACTS.md
    modified: []

key-decisions:
    - "Probe the same-column move to disambiguate targetPosition — for a cross-column move final-index and insert-before are indistinguishable, because removing the task from another column shifts no destination index"
    - "Answer T6's cascade question by probing the orphaned subtask ids directly rather than reading /boards/{id}/full, which nests subtasks under their task and so hides them either way"
    - "Run the probe three times rather than accept run 1: three of its questions were confounded by validation the probe itself tripped, and a wrong reading looked exactly like a real backend refusal"
    - "Extend T9 past the plan's create-only wording to the update side — the question exists to ground the Edit Task form, and the update half is where the surprise was"

patterns-established:
    - "Confound isolation: when a probe gets a 400 it did not expect, suspect the probe's own payload before recording a backend rule"
    - "Record the observed error message verbatim even when it is wrong — the T8 'cannot be empty' text for a 33-char title is itself the finding"

requirements-completed: [] # All ten declared IDs are shared with sibling plans still in flight; requirements.ready-ids returned 0/10, so none is marked complete here.

coverage:
    - id: D1
      description: "scripts/probe-task-backend.mjs — a manual nonprod probe answering T1-T9, absent from package.json and every CI workflow"
      verification:
          - kind: other
            ref: "node --check scripts/probe-task-backend.mjs && ! grep -rn 'probe-task-backend' package.json .github/workflows/"
            status: pass
          - kind: other
            ref: "pnpm lint (eslint .) — exits 0 with the probe included"
            status: pass
          - kind: other
            ref: "three full runs against the deployed nonprod backend, each exiting 0 and reporting SESSIONS: 2"
            status: pass
      human_judgment: false
    - id: D2
      description: "04-BACKEND-FACTS.md answers T1-T9, each section carrying an observed HTTP status and response body"
      verification:
          - kind: other
            ref: "plan verify: test -s 04-BACKEND-FACTS.md && grep -q for each of T1-T9, A3-A7"
            status: pass
          - kind: other
            ref: "per-section status-code scan: every T1-T9 section contains at least one observed status code; the phrase 'as expected' appears nowhere"
            status: pass
      human_judgment: false
    - id: D3
      description: "04-RESEARCH.md assumptions A3-A7 each carry an explicit CONFIRMED/REFUTED verdict against a recorded observation"
      verification:
          - kind: other
            ref: "verdict-table scan: A3, A4, A5, A6, A7 each resolve to a literal **CONFIRMED**"
            status: pass
      human_judgment: false
    - id: D4
      description: "Two findings that change downstream plans rather than confirming them: a task description can never be cleared, and the update-side title bound reports the wrong error message"
      verification: []
      human_judgment: true
      rationale: "The observations are pinned by the probe transcript, but the response they demand is a product decision — what an Edit Task form does when a user clears the description field (send a single space, or refuse to allow clearing) is a user-visible choice this plan deliberately did not make."

# Metrics
duration: 24 min
completed: 2026-08-28
status: complete
---

# Phase 4 Plan 02: Task & Subtask Backend Facts Summary

**Nine runtime unknowns turned into observations across three nonprod probe runs: all five research assumptions (A3-A7) CONFIRMED, plus two unassumed findings — a task description can never be cleared, and the update-side title validator reports the wrong error.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-08-28T12:08:00Z (approx — first task commit at 12:21Z)
- **Completed:** 2026-08-28T12:32:33Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- **All nine questions answered against the real backend**, each with a recorded status code and response body. T3-T7 were answered on the first run and reproduced byte-identically on runs 2 and 3.
- **A3-A7 all CONFIRMED.** Unlike Phase 3's probe (which refuted three of its own assumptions), this phase's research was accurate on every point it asserted. The value came from the questions research did not think to ask.
- **Two findings that change downstream plans rather than confirming them** — see Decisions Made.
- **`map-problem-code.ts` needs no new entry.** All three versioned writes (task PUT, subtask PUT, move) return `409` with `OPTIMISTIC_LOCK_CONFLICT` verbatim, so the existing conflict branch covers all seven of this phase's mutations.
- **T-04-03 (cross-board / cross-account move elevation) is mitigated server-side**, with a real refusal in both directions — `400 ILLEGAL_ARGUMENT` cross-board, `403 ACCESS_DENIED` cross-account, and substituting the victim's `userId` in the query buys nothing.

## Task Commits

1. **Task 1: Write the task/subtask backend probe** — `5d21c8c` (feat)
2. **Task 1 correction: remove three confounds** — `da8f0cc` (fix)
3. **Task 2: Run the probe and record 04-BACKEND-FACTS.md** — `31ade3a` (docs)

## Files Created/Modified

- `scripts/probe-task-backend.mjs` — manual nonprod probe, ~990 lines, one labelled section per question. Deletes every board it creates; wired into no script and no workflow.
- `.planning/phases/04-task-subtask-workflow/04-BACKEND-FACTS.md` — T1-T9 with observed requests, statuses and bodies; the A3-A7 verdict table; and a per-downstream-plan consequences section.

## Decisions Made

**The two findings worth carrying forward:**

1. **A task description can never be cleared.** `""` is refused `400 VALIDATION_FAILED` ("Description cannot be empty") on both create and update; `null` and omission both return `200` while silently leaving the old text in place; only a whitespace string is accepted. A control write (`"a changed one"` → `200`, applied) proves updates work at all, which is what makes the null result readable as "leave alone" rather than "ignored entirely". Two consequences: a create form that serialises a blank textarea to `""` will `400` on every description-less task, and the Edit Task plan needs an explicit product decision about a cleared field. This plan deliberately did not make that decision.

2. **The update-side title bound is 3-32, but its error message is wrong.** A 2-char and a 33-char title both come back `400` with `errors.title: "Task title cannot be empty"`. The bound is real — 3 and 32 both return `200` — but surfacing the backend text verbatim would tell a user their 33-character title "cannot be empty". `04-UI-SPEC.md`'s pinned copy must come from the client schema. Subtask titles behave identically (32 accepted, 33 refused with "Subtask title cannot be empty"), despite `SaveSubtaskRequestDTO` declaring only `minLength: 1`.

**Two supporting observations that sharpen existing pitfalls:**

3. **Ancestor path segments are entirely inert.** A task/subtask PUT or DELETE succeeds with the ancestors spelled out, with `%7BboardId%7D` left unresolved, *and* with `no-such-board/no-such-column` — all `200`. This is `03-BACKEND-FACTS.md` R8 one level deeper, and it means a dropped `openapi-fetch` path parameter fails **silently**, not loudly. Keep spelling the segments out as a convention, but the source-level assertions guard a convention, not an observable bug.

4. **Response order is not position order — observed, not theorised.** After a cross-column move, `/full` returned `["T3 S1","T3 D0","T3 D1","T3 D2"]` while positions were `D0@0, S1@1, D1@2, D2@3`. Pitfall 15's sort is a requirement: rendering the array as returned shows a wrong order immediately after any move.

**Method decisions:**

- Disambiguated `targetPosition` with a **same-column** move. For a cross-column move final-index and insert-before produce identical results, so only the same-column case can tell them apart. Result: `S0` at position 0 with `targetPosition: 2` produced `S1,S2,S0,S3,S4` — final 0-based index, matching columns (R1).
- Probed T6's cascade by writing to the orphaned **subtask ids directly** (`404 ENTITY_NOT_FOUND` on each) rather than reading `/full`, which nests subtasks under their task and would show them absent whether or not they were actually deleted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The probe confounded three of its own questions**

- **Found during:** Task 2 (reading run 1's transcript)
- **Issue:** Three answers were unreadable as written:
    - **T2** sent a 34-character title on the placeholder-ancestor subtask `PUT`, so its `400` was the update-side length bound, not the path. Recorded naively, this would have become "the backend refuses placeholder ancestors for subtasks" — the opposite of the truth.
    - **T8** read `"Task title cannot be empty"` for both a 2-char and a 33-char title, which cannot distinguish a 3-32 bound from any other rule.
    - **T9** probed create only, and "`null` left the description alone" is indistinguishable from "`description` is ignored on update entirely" without a positive control.
- **Fix:** Shortened T2's titles; added T8's in-bounds ends (3 and 32) plus the same sweep for subtask titles; added T9's changed-value control and the `null`/omitted/single-space update cases. Re-ran the probe twice more.
- **Files modified:** `scripts/probe-task-backend.mjs`
- **Verification:** `node --check` 0, `pnpm exec eslint` clean, two further full runs each exiting 0 — the corrected T2 subtask PUT now returns `200`, and T8/T9's boundaries resolve unambiguously.
- **Committed in:** `da8f0cc`

**2. [Rule 3 - Blocking] `pnpm lint` failed on an untouched file in a fresh worktree**

- **Found during:** Task 1 (acceptance criterion `pnpm lint` exits 0)
- **Issue:** `app/(dashboard)/boards/[boardId]/page.tsx` reported three `no-unsafe-assignment` errors on lines this plan never touched. Cause: `PageProps<"/boards/[boardId]">` is a Next.js **generated** global type from `.next/types`, absent because the worktree had never been built.
- **Fix:** Ran `pnpm install` and `pnpm exec next typegen` in the worktree. No repository file was changed — this was an environment gap, not a code defect.
- **Files modified:** none (generated `.next/` output is gitignored)
- **Verification:** `pnpm lint` then exited 0 with no output.
- **Committed in:** n/a — nothing to commit.

**3. [Rule 2 - Missing Critical] Probe hardening the plan did not specify**

- **Found during:** Task 1
- **Issue:** The plan's probe writes to a shared nonprod backend across nine sections; a throw in one would have cost the other eight a full run. The plan also asked for cleanup "or state what was left behind", with no mechanism.
- **Fix:** Added a `runProbe` wrapper that logs and continues past a failed section, and a `finally` block that deletes every board created (main, second board, account B's) and states plainly that accounts cannot be deleted.
- **Files modified:** `scripts/probe-task-backend.mjs`
- **Verification:** all three runs reported `200` on all three board deletes and `SESSIONS: 2`.
- **Committed in:** `5d21c8c`

**4. [Scope extension] T9 extended to the update side**

- **Found during:** Task 2
- **Issue:** The plan words T9 as a create-side question. Its stated purpose is to ground the Edit Task form's description handling — and the update side is where the surprise turned out to be (a description cannot be cleared).
- **Fix:** Added the update-side cases. The create-side question is answered exactly as the plan asked, with the update half additional.
- **Committed in:** `da8f0cc`, recorded in `31ade3a`

---

**Total deviations:** 3 auto-fixed (1 bug, 1 blocking, 1 missing critical) + 1 scope extension
**Impact on plan:** No scope creep. The bug fix was necessary for the plan's own acceptance criteria — three questions were unanswerable without it, and recording run 1 verbatim would have shipped a false backend fact into every downstream plan.

## Issues Encountered

- **Run 1's transcript was self-consistently wrong.** Each confounded `400` carried a plausible problem-detail code and message, so nothing in the output flagged it. It was caught by noticing that T8 reported "cannot be empty" for a 33-character title — an impossible reading that made the shared validator visible, and by extension the T2 title-length collision. Worth remembering: a probe's `400` is as likely to indict the probe as the backend.
- **Three throwaway accounts per concern.** Three runs created six permanent nonprod accounts (three A, three B). Boards were all deleted; accounts cannot be, since no delete-account endpoint exists. They hold no state any plan depends on.

## Known Stubs

None. This plan produced a probe script and an observation document; nothing is stubbed, and no application code was touched.

## User Setup Required

None — no external service configuration required. The probe reads `EXTERNAL_API_BASE_URL` from the existing `.env.local`.

## Next Phase Readiness

**Ready.** Every downstream plan in this phase can now cite an observation instead of an assumption. The per-plan consequences are enumerated in `04-BACKEND-FACTS.md` § Consequences by downstream plan.

**One item needs a decision before the Edit Task plan is written:** what a cleared description textarea sends. `""` is refused, `null`/omission are silent no-ops, and `" "` is the only accepted empty-looking value. This is a user-visible product choice, not an implementation detail, and it was deliberately left open here.

**Not covered by this plan:** `04-RESEARCH.md` Open Question #1 (the D-14/D-15 ESLint boundary conflict) remains blocking for Waves 2-4 and is unaffected by anything observed here. Open Question #5 (whether the drag half needs its own spike) likewise stands.

## Self-Check: PASSED

- `scripts/probe-task-backend.mjs` — FOUND
- `.planning/phases/04-task-subtask-workflow/04-BACKEND-FACTS.md` — FOUND
- Commits `5d21c8c`, `da8f0cc`, `31ade3a` — all 3 present in `git log --oneline --all`
- Plan `<verification>`: `node --check` exits 0; `pnpm lint` exits 0; `04-BACKEND-FACTS.md` contains all of T1-T9 and A3-A7; `grep -rn 'probe-task-backend' package.json .github/workflows/` returns nothing

---

_Phase: 04-task-subtask-workflow_
_Completed: 2026-08-28_
