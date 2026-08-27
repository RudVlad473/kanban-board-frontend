---
phase: 03-column-management
plan: 12
subsystem: testing
tags: [playwright, e2e, dnd-kit, zod, real-backend, accessibility]

# Dependency graph
requires:
    - phase: 03-10
      provides: "the shipped reorder path — the header drag handle, its accessible names, and the live-region announcements this spec waits on"
    - phase: 03-14
      provides: "position-ordered reads at the RSC boundary, without which a reload could not show a persisted order"
    - phase: 03-07
      provides: "the create flow and the zero-columns empty state both entry-point tests drive"
    - phase: 03-08
      provides: "the rename flow, whose optimistic override is the reason COLUMN-02 needs a reload to mean anything"
    - phase: 03-09
      provides: "the delete confirmation and its two named outcomes"
    - phase: 02-board-crud
      provides: "`e2e/seed.ts` + `e2e/seed.sh` — the curl seeding CLI and the sign-in-through-the-real-form shape every spec here mirrors"
provides:
    - "COLUMN-01 proved end to end from both entry points, with append-at-the-end observable as the last swimlane"
    - "COLUMN-02 proved end to end across a real reload, so the optimistic override cannot be what the assertion reads"
    - "COLUMN-03 proved end to end by pointer AND keyboard, plus a cancelled move proved to have written nothing"
    - "COLUMN-04 proved end to end including the cascade to tasks, observed from the board view rather than the API"
    - "The announcement-gated drop: the pattern that makes a synthetic drag deterministic instead of lucky"
    - "A fix for the board-detail read path, which could not load any board holding a description-less task"
affects: [04-task-management, task drag-and-drop e2e, any future spec driving a dnd-kit interaction]

actuals:
    tokens: 13869
    tasks: 3
    commits: 4

# Tech tracking
tech-stack:
    added: []
    patterns:
        - "Announcement-gated drop: every drag waits on the library's own live region before releasing, never on a timer"
        - "Order asserted from `textContent`, not the accessible name, because CSS upper-cases the column caption"
        - "A one-off backend write issued straight from a spec when a seeding helper would outlive its only caller"

key-files:
    created:
        - e2e/columns-create.e2e.spec.ts
        - e2e/columns-rename.e2e.spec.ts
        - e2e/columns-reorder.e2e.spec.ts
        - e2e/columns-delete.e2e.spec.ts
    modified:
        - src/features/boards/schemas.ts
        - src/features/boards/schemas.unit.test.ts

key-decisions:
    - "Every drop — pointer and keyboard alike — waits on the library's live-region announcement before releasing. A drop keyed straight onto the preceding input outruns the state update behind it, so `over` is still the column's own slot, `onDragEnd`'s guard returns, and the spec passes on an order that never changed. That is not a hypothetical: it is how the keyboard test first failed, and it is precisely the silently-green drag T-03-37 names as the worst outcome available here."
    - "`{ steps: 10 }` comes from 03-RESEARCH Pitfall 4 and 03-VALIDATION, not from the spike: 03-SPIKE-DNDKIT § 3 recorded the minimum as UNMEASURED because no tool in that session exposed the low-level mouse API. The plan asked for 'the count the spike observed to be sufficient'; no such number exists, so the documented recommendation was used instead."
    - "Column order is read from each `h2`'s text, never its accessible name: the caption is upper-cased by CSS, which the accessible-name computation picks up and `textContent` does not. Handles are matched case-insensitively for the same reason."
    - "One seeded account per test. Seeding spends the sign-up session and the form spends the second, which is the backend's entire per-account budget — so tests cannot share one."
    - "The single task the cascade test needs is POSTed straight at the backend from the spec, built off `EXTERNAL_PATH.COLUMN_DETAIL` rather than a fresh literal. Task seeding belongs to Phase 4; a helper this phase calls once is a helper that outlives its only reason to exist."
    - "A 20s wait on the post-sign-in URL. The default 5s is genuinely too short for the real backend's sign-in round trip and produced a reproducible flake with the form still mid-submit."

patterns-established:
    - "Announcement-gated drag: assert the library announced the candidate destination, then release — a drag that releases on faith proves nothing and cannot be told apart from one that worked"
    - "Persistence is asserted after a reload, never by re-reading the same rendered DOM, wherever an optimistic override exists"
    - "A cancelled mutation is proved by a reload too: it is the only way to tell a local revert from a write that was issued anyway"

requirements-completed: [COLUMN-01, COLUMN-02, COLUMN-03, COLUMN-04]

coverage:
    - id: D1
      description: "COLUMN-01 end to end: a column added from the ghost column appears as a new last swimlane and is still last after a reload; one added from the zero-columns empty state takes the board out of that state."
      requirement: COLUMN-01
      verification:
          - kind: e2e
            ref: "e2e/columns-create.e2e.spec.ts#appends a column from the ghost column and keeps it last across a reload"
            status: pass
          - kind: e2e
            ref: "e2e/columns-create.e2e.spec.ts#creates the first column from the empty state and leaves that state showing it"
            status: pass
      human_judgment: false
    - id: D2
      description: "COLUMN-02 end to end: a renamed column keeps its new name across a full page reload, proving the write reached the server rather than only the optimistic override."
      requirement: COLUMN-02
      verification:
          - kind: e2e
            ref: "e2e/columns-rename.e2e.spec.ts#renames a column from its header kebab and keeps the new name across a reload"
            status: pass
      human_judgment: false
    - id: D3
      description: "COLUMN-03 end to end by pointer: a column dragged across two neighbours with a multi-step low-level mouse move keeps its new position across a reload."
      requirement: COLUMN-03
      verification:
          - kind: e2e
            ref: "e2e/columns-reorder.e2e.spec.ts#moves a column two positions with a multi-step pointer drag and keeps that order across a reload"
            status: pass
      human_judgment: false
    - id: D4
      description: "COLUMN-03 end to end by keyboard: lift, step, drop persists across a reload; lift, step, cancel is proved to have issued no write at all."
      requirement: COLUMN-03
      verification:
          - kind: e2e
            ref: "e2e/columns-reorder.e2e.spec.ts#moves a column one position by keyboard and keeps that order across a reload"
            status: pass
          - kind: e2e
            ref: "e2e/columns-reorder.e2e.spec.ts#writes nothing when a lifted column is moved and then cancelled"
            status: pass
      human_judgment: false
    - id: D5
      description: "COLUMN-04 end to end: a deleted column disappears along with the task it held, stays gone after a reload, is left untouched when the confirmation is declined, and takes the board to the shared empty state when it was the last one."
      requirement: COLUMN-04
      verification:
          - kind: e2e
            ref: "e2e/columns-delete.e2e.spec.ts#deletes a column from its header kebab and keeps it gone across a reload"
            status: pass
          - kind: e2e
            ref: "e2e/columns-delete.e2e.spec.ts#removes the tasks the deleted column held from the board view too"
            status: pass
          - kind: e2e
            ref: "e2e/columns-delete.e2e.spec.ts#leaves the column in place when the confirmation is declined"
            status: pass
          - kind: e2e
            ref: "e2e/columns-delete.e2e.spec.ts#falls through to the shared empty state once the last column is deleted"
            status: pass
      human_judgment: false
    - id: D6
      description: "The board detail view loads a board holding a task with no description — the backend answers `description: null`, which the schema previously rejected outright."
      verification:
          - kind: unit
            ref: "src/features/boards/schemas.unit.test.ts#accepts a task whose description came back as an explicit null, and normalises it away"
            status: pass
          - kind: e2e
            ref: "e2e/columns-delete.e2e.spec.ts#removes the tasks the deleted column held from the board view too"
            status: pass
      human_judgment: false
    - id: D7
      description: "The column row auto-scrolls far enough during a POINTER drag to reach a drop target beyond the fold."
      verification: []
      human_judgment: true
      rationale: "Deliberately not asserted, per the plan's own backstop truth: a scroll-position assertion during a synthetic drag is the kind of check that passes for the wrong reason. 03-SPIKE-DNDKIT § 5 observed the keyboard path's auto-scroll live and left the pointer path's unobserved. Needs a human dragging a column past the fold in a real browser."

# Metrics
duration: 43min
completed: 2026-08-27
status: complete
---

# Phase 3 Plan 12: Column Management End-to-End Coverage Summary

**All four of the phase's ROADMAP success criteria proved in a real browser against the real backend — with the two phrased as persistence proved by a reload — and one shipped defect surfaced: no board holding a description-less task could load at all.**

## Performance

- **Duration:** 43 min
- **Started:** 2026-08-27T15:52:00Z
- **Completed:** 2026-08-27T16:35:00Z
- **Tasks:** 3
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments

- Four end-to-end specs, 10 cases, covering COLUMN-01 through COLUMN-04 against the deployed nonprod backend with no fake HTTP layer anywhere.
- The pointer drag is driven through the low-level mouse API with a multi-step move and **verified to actually move the column**, closing T-03-37 — the silently-green drag that would be the worst possible outcome for a safety net.
- Found and fixed a real defect the layer below could not see: `taskFullSchema` rejected the backend's `description: null`, so the entire board detail view fell through to "Couldn't load this board." for any board with a description-less task.
- Established the announcement-gated drop, which is what makes a synthetic drag deterministic rather than lucky — three consecutive green runs of the reorder spec, as the plan required.

## Task Commits

1. **Task 1: End-to-end create and rename** — `c85b23f` (test)
2. **Task 2: End-to-end reorder, by pointer and by keyboard** — `11e95b3` (test)
3. **Deviation (Rule 1), committed separately** — `aa663d4` (fix)
4. **Task 3: End-to-end delete, including the cascade** — `6f94c11` (test)

_STATE.md and ROADMAP.md are deliberately untouched — the orchestrator owns those after the wave merges._

## Files Created/Modified

- `e2e/columns-create.e2e.spec.ts` — COLUMN-01 from both entry points; the ghost column appends last, the empty-state CTA takes the board out of the empty state.
- `e2e/columns-rename.e2e.spec.ts` — COLUMN-02, asserted only after a reload.
- `e2e/columns-reorder.e2e.spec.ts` — COLUMN-03 by pointer and by keyboard, plus the cancelled move.
- `e2e/columns-delete.e2e.spec.ts` — COLUMN-04, the cascade to tasks, the declined confirmation, and delete-to-zero.
- `src/features/boards/schemas.ts` — `taskFullSchema.description` now accepts the backend's `null` and normalises it to absent.
- `src/features/boards/schemas.unit.test.ts` — pins that observation with its own case.

## Decisions Made

See `key-decisions` in the frontmatter. The two worth reading before touching these specs:

1. **Never release a drag without first waiting on the announcement.** Removing that wait is not a simplification; it re-creates a spec that reports green while exercising nothing.
2. **`{ steps: 10 }` is the documented recommendation, not a measured minimum.** The spike could not measure one. If a drag ever starts flaking, that number is the first thing to question — and the honest answer is that nobody has measured it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Board detail could not load any board holding a description-less task**

- **Found during:** Task 3 (the COLUMN-04 cascade case, the first coverage anywhere to put a real task on a board)
- **Issue:** The backend answers `POST …/columns/{columnId}` with `"description": null` for a task created without one (observed directly against nonprod, 2026-08-27). `taskFullSchema` declared `description: z.string().optional()`, which admits `undefined` and **not** `null`, so `fetchBoardFull`'s parse failed and the whole board detail view rendered "Couldn't load this board. Try again." — every column gone, not just the task. The schema's own comment already stated the intent ("a task without one is well-formed, not malformed"); the implementation simply missed which spelling of "absent" the backend uses.
- **Fix:** `z.string().nullish().transform((value) => value ?? undefined)` — normalised rather than merely widened, so the output type stays `string | undefined` and no consumer has to handle two spellings. No downstream ripple: nothing reads a task's description yet.
- **Files modified:** `src/features/boards/schemas.ts`, `src/features/boards/schemas.unit.test.ts`
- **Verification:** New unit case; the cascade e2e case that exposed it now passes; full `pnpm test` (1270 passing), whole `--project e2e` (43 passing), `pnpm build` clean.
- **Committed in:** `aa663d4` (kept out of the spec commits — it is a production fix, not test code)

**2. [Rule 1 - Bug] The keyboard drop raced the move it was supposed to commit**

- **Found during:** Task 2
- **Issue:** `ArrowRight` followed immediately by `Space` dropped the column over its own slot. dnd-kit's `over` is React state; the drop arrived before the update behind the arrow step landed, so `onDragEnd`'s `active.id === over.id` guard returned and no request was ever issued. The spec failed honestly here — but the same race in a spec written slightly differently would have passed on an unchanged order.
- **Fix:** every drop now waits on the library's own live-region announcement of the candidate destination first, following the pattern 03-10 established. Applied to the pointer path too, where the identical race existed and had merely been getting away with it.
- **Files modified:** `e2e/columns-reorder.e2e.spec.ts`
- **Verification:** three consecutive green runs of the whole spec, as the plan's acceptance criteria require.
- **Committed in:** `11e95b3` (part of the Task 2 commit)

**3. [Rule 3 - Blocking] Sign-in outran the default 5s expect timeout**

- **Found during:** Task 1
- **Issue:** A reproducible failure with the sign-in form still mid-submit (every control `[disabled]`) at the 5s mark — the real backend's round trip, not a defect.
- **Fix:** a named 20s timeout on the post-sign-in URL assertion in each spec. Scoped to that one assertion; every other assertion keeps the default.
- **Files modified:** all four specs
- **Verification:** the whole e2e project green.
- **Committed in:** the respective task commits

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking). One is a production defect in shipped code; the others are correctness of the specs themselves.
**Impact on plan:** No scope creep. The schema fix was strictly required to execute Task 3's stated behaviour at all — the cascade cannot be observed from the board view if the board view cannot render.

## Departures from the plan's letter

- The plan's Task 2 said to use "the step count plan 03-03's spike actually observed to be sufficient". No such number exists: `03-SPIKE-DNDKIT.md` § 3 records it as explicitly **unmeasured**, because that session had no access to the low-level mouse API. `{ steps: 10 }` — 03-RESEARCH Pitfall 4's and 03-VALIDATION's documented recommendation — was used instead, and the three-consecutive-green-runs criterion was met with it. Flagged rather than papered over: a future reader should know the number is a recommendation, not a measurement.
- The plan's acceptance criteria spell the run command `pnpm test:e2e -- <files>`. Playwright's `--project` flag is variadic, so trailing file arguments are swallowed as extra project names and the run fails with `Project(s) "e2e/..." not found`. `--project=e2e <files>` is the working spelling. Nothing in the repo needs changing — `pnpm test:e2e` with no file filter, which is what CI runs, is unaffected.

## Issues Encountered

- A first probe of the keyboard failure looked like the sortable preview never happened (no transforms, no drop indicator). It had simply been sampled before the transition began; polling the row for a second showed the preview settling cleanly (Alpha 324 → 628, Bravo 628 → 324) and holding. The real fault was one layer along, at the drop. Worth recording because the first reading pointed at the shipped `ColumnKeyboardSensor` narrowing, which turned out to be entirely innocent.
- Three throwaway rows (one account, one board, one column, one task) were created on nonprod while diagnosing the `description: null` defect by hand. They are indistinguishable from what the suite itself creates and are cleared by the same reset step.

## Verification Run

| Check | Result |
|-------|--------|
| `playwright test --project=e2e` (whole project) | 43 passed |
| Reorder spec, three consecutive runs | 3 × 3 passed |
| `pnpm test` (unit + browser + storybook) | 88 files, 1270 passed |
| `pnpm lint` | clean |
| `pnpm format:check` | clean |
| `pnpm comments:check` | clean |
| `pnpm routes:check` | clean |
| `pnpm build` | clean |

Local visual snapshots are irrelevant here — none of these specs compare screenshots, so `ignoreSnapshots` off-CI does not weaken anything above. CI remains the sign-off.

## User Setup Required

None — no new dependency, script entry, or seeding helper was added.

## Next Phase Readiness

- Phase 4 inherits a working task-creation call shape (`POST /boards/{boardId}/columns/{columnId}`, body `{ title }`, `201`) already exercised from `e2e/columns-delete.e2e.spec.ts`. When it adds a real `seedTask` helper to `e2e/seed.sh`, that spec's local write should be folded into it.
- **The `description: null` finding generalises.** Every response schema in `src/features/boards/schemas.ts` was written against the OpenAPI document, which declares no field nullable anywhere, while the backend evidently does send `null` for absent optionals. Phase 4 touches far more optional task/subtask fields than this phase did; each is the same latent whole-view-fails-to-load defect. Worth a deliberate pass rather than discovering them one production surface at a time.
- One backstop remains open (D7): pointer-drag auto-scroll past the fold is deliberately unasserted and needs a human in a real browser.

## Self-Check: PASSED

All 7 claimed files exist on disk; all 5 claimed commits resolve in `git log`.

---
*Phase: 03-column-management*
*Completed: 2026-08-27*
