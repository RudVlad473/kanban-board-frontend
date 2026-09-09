---
phase: 03-column-management
plan: 04
subsystem: api
tags: [zod, dnd-kit, typescript, vitest, validation, accessibility]

# Dependency graph
requires:
  - phase: 02-board-crud
    provides: "columnFullSchema, columnNameSchema/columnNameRowSchema, REQUIRED_FIELD_MESSAGE, EXTERNAL_PATH, the model.ts pure-function shape"
  - phase: 03-column-management
    provides: "plan 03-02's three --color-accent-column-* tokens; plan 03-03's audited @dnd-kit/core 6.3.1 + @dnd-kit/sortable 10.0.0 install"
provides:
  - "EXTERNAL_PATH.COLUMN_DETAIL and EXTERNAL_PATH.COLUMN_REORDER, both carrying the {boardId} segment"
  - "columnSchema (ColumnResponseDTO's tasks-less shape) derived from columnFullSchema"
  - "create/rename/reorder/delete column input schemas, each validating a Server Action's own arguments"
  - "addColumnFormSchema and renameColumnFormSchema for React Hook Form"
  - "COLUMN_DOT_TOKENS + toColumnDotToken (U-03's position-derived accent)"
  - "ColumnOrderOverride + applyColumnOrderOverride (the self-retiring optimistic reorder)"
  - "reorderColumns (arrayMove wrapper) and shouldNudgeOnColumnCount (D-05's exact-9 transition)"
  - "createColumnReorderAnnouncements — dnd-kit Announcements in the Copywriting Contract's wording"
affects: [03-05, 03-06, 03-07, 03-08, 03-09, 03-10, tasks, subtasks]

actuals:
  tokens: 12160
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Response schema derived by omission from the full schema, so the two cannot drift"
    - "Optimistic override retired by pure derivation rather than by clearing state"
    - "dnd-kit live-region strings supplied by a pure factory in model.ts, never declared in a .tsx"

key-files:
  created: []
  modified:
    - src/lib/core/api-contract/external-paths.ts
    - src/features/boards/schemas.ts
    - src/features/boards/schemas.unit.test.ts
    - src/features/boards/model.ts
    - src/features/boards/model.unit.test.ts

key-decisions:
  - "Column name fields reuse the shipped columnNameRowSchema, not bare columnNameSchema — the row schema pipes columnNameSchema's 3-32 bound while giving a blank name the required-field copy, which is what 03-UI-SPEC's Copywriting Contract and this plan's own behaviour tests require"
  - "The RED gate was observed but not committed separately: the repo's pre-commit type-aware lint refuses a test file importing not-yet-existing exports"
  - "No client-side column cap exists anywhere (D-02); the nudge predicate tests one exact transition (D-05) so 'fires once' holds by construction"
  - "reorderColumns deliberately does not encode whether the wire's targetPosition means arrayMove's final index — that is plan 03-01's probe R1"

patterns-established:
  - "Derived response schema: columnFullSchema.omit({ tasks: true }) rather than a restated four-field object"
  - "Staleness by derivation: an order override retires itself when the server order's length or any index differs from previousOrder"
  - "1-based-for-speech / 0-based-on-the-wire conversion encoded once, inside the announcement factory"

requirements-completed: [COLUMN-01, COLUMN-02, COLUMN-03, COLUMN-04]

coverage:
  - id: D1
    description: "The four column mutations each have a validated input contract whose empty and boundary refusals are proven, and a response contract matching ColumnResponseDTO"
    requirement: "COLUMN-01"
    verification:
      - kind: unit
        ref: "src/features/boards/schemas.unit.test.ts#createColumnInputSchema > reports the required-field copy for a blank name rather than the length copy"
        status: pass
      - kind: unit
        ref: "src/features/boards/schemas.unit.test.ts#createColumnInputSchema > reports the length copy on either side of the backend's own 3-to-32 bound"
        status: pass
      - kind: unit
        ref: "src/features/boards/schemas.unit.test.ts#columnSchema > accepts a response-shaped column with no tasks key, which columnFullSchema refuses"
        status: pass
    human_judgment: false
  - id: D2
    description: "renameColumnInputSchema requires version, so a rename built by analogy to create is refused at this app's boundary rather than upstream"
    requirement: "COLUMN-02"
    verification:
      - kind: unit
        ref: "src/features/boards/schemas.unit.test.ts#renameColumnInputSchema > rejects an input carrying both ids and a name but no version"
        status: pass
    human_judgment: false
  - id: D3
    description: "reorderColumnInputSchema.targetPosition floors at integer 0, refusing a forged negative or fractional wire payload (T-03-06)"
    requirement: "COLUMN-03"
    verification:
      - kind: unit
        ref: "src/features/boards/schemas.unit.test.ts#reorderColumnInputSchema > accepts a zero target position and rejects a negative or fractional one"
        status: pass
    human_judgment: false
  - id: D4
    description: "applyColumnOrderOverride and reorderColumns preserve every unmoved column's relative order, and a stale override can neither synthesise nor drop a column (T-03-20)"
    requirement: "COLUMN-04"
    verification:
      - kind: unit
        ref: "src/features/boards/model.unit.test.ts#applyColumnOrderOverride > returns the server's own columns once the server order no longer matches previousOrder"
        status: pass
      - kind: unit
        ref: "src/features/boards/model.unit.test.ts#applyColumnOrderOverride > returns the server's own columns when a column was added or deleted underneath"
        status: pass
      - kind: unit
        ref: "src/features/boards/model.unit.test.ts#reorderColumns > moves one column to its new index and leaves every other column's relative order intact"
        status: pass
    human_judgment: false
  - id: D5
    description: "toColumnDotToken maps position % 3 to one of exactly three accent utilities, with no backend involvement (U-03)"
    verification:
      - kind: unit
        ref: "src/features/boards/model.unit.test.ts#toColumnDotToken > cycles the three accents by position and repeats every third column"
        status: pass
    human_judgment: false
  - id: D6
    description: "The column-count nudge predicate fires on the create whose resulting count is exactly 9, never at 8, and no client-side cap exists (D-02, D-03, D-05)"
    verification:
      - kind: unit
        ref: "src/features/boards/model.unit.test.ts#shouldNudgeOnColumnCount > fires only on the create whose resulting count is exactly one past the threshold"
        status: pass
      - kind: other
        ref: "grep -v '^\\s*\\*' src/features/boards/model.ts | grep -cE '(max|cap|limit)Column' returns 0"
        status: pass
    human_judgment: false
  - id: D7
    description: "The four reorder live-region strings match 03-UI-SPEC's Copywriting Contract verbatim, with 1-based spoken positions"
    verification:
      - kind: unit
        ref: "src/features/boards/model.unit.test.ts#createColumnReorderAnnouncements > names the column, its 1-based position and the three keys when a column is picked up"
        status: pass
      - kind: unit
        ref: "src/features/boards/model.unit.test.ts#createColumnReorderAnnouncements > reports the dropped position on drop and the original position on cancel"
        status: pass
    human_judgment: true
    rationale: "The strings are pinned against the contract by exact-match assertions, but whether they actually read well through a screen reader in the assembled DndContext cannot be judged until plan 03-10 mounts them — a string can be verbatim-correct and still announce confusingly."

# Metrics
duration: 12min
completed: 2026-08-26
status: complete
---

# Phase 3 Plan 04: Column Contracts and Pure Model Functions Summary

**Every contract the four column mutations share — two path templates, nine zod schemas and five pure `model.ts` derivations — fixed once and proven by 11 render-free unit cases, so plans 03-05 through 03-10 build against a shape none of them has to invent.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-26T21:58:00Z
- **Completed:** 2026-08-26T22:10:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- `EXTERNAL_PATH.COLUMN_DETAIL` and `COLUMN_REORDER` both carry a literal `{boardId}` segment, so a call site that forgets to supply it produces a visibly wrong URL rather than a plausible one (03-RESEARCH Pitfall 2's failure mode).
- `columnSchema` is derived as `columnFullSchema.omit({ tasks: true })` — `ColumnResponseDTO` returns no tasks, so parsing a mutation response with the full schema would have failed on every successful call.
- All four column mutations now have an input schema validating the Server Action's own arguments, with T-03-01/04/06's refusals asserted rather than declared: empty ids, a missing `version`, and a negative or fractional `targetPosition`.
- `applyColumnOrderOverride` retires a stale override by derivation on both paths (order moved, length changed), so a column added or deleted underneath an in-flight reorder can neither be synthesised nor dropped.
- `createColumnReorderAnnouncements` supplies dnd-kit's own `Announcements` strings from `model.ts`, keeping them out of the `.tsx` that will consume them (`pnpm tsx:check`) and adding no hand-rolled `role="status"` region.

## Task Commits

Each task was committed atomically:

1. **Task 1: Column path templates and the column zod contracts** — `17faca1` (feat)
2. **Task 2: Pure model functions for dot colour, order override, reorder, and the count nudge** — `66bf99f` (feat)
3. **Task 3: The reorder live-region announcement factory** — `50b2cec` (feat)

_Note: each task ran its RED gate (7, 7 and 4 failing cases respectively) before implementation; see TDD Gate Compliance below for why RED was not committed separately._

## Files Created/Modified

- `src/lib/core/api-contract/external-paths.ts` — two new column path templates
- `src/features/boards/schemas.ts` — `columnSchema`, the four column input schemas, the two RHF form schemas, and their inferred types
- `src/features/boards/schemas.unit.test.ts` — seven boundary cases for the column contracts
- `src/features/boards/model.ts` — `COLUMN_DOT_TOKENS`, `toColumnDotToken`, `ColumnOrderOverride`, `applyColumnOrderOverride`, `reorderColumns`, `COLUMN_COUNT_NUDGE_THRESHOLD`, `shouldNudgeOnColumnCount`, `createColumnReorderAnnouncements`
- `src/features/boards/model.unit.test.ts` — eleven render-free cases for the new derivations

## Decisions Made

- **Column name fields use `columnNameRowSchema`, not bare `columnNameSchema`.** The plan's `<action>` named `columnNameSchema`, but its own `<behavior>` Test 2, its `must_haves` truth for COLUMN-01, and 03-UI-SPEC's Copywriting Contract (rows 222-223) all require a blank name to report `Can't be empty` and only an out-of-bounds one to report the length copy. `columnNameRowSchema` is exactly that split (`.min(1, REQUIRED_FIELD_MESSAGE).pipe(columnNameSchema)`) and reuses the shipped 3-32 bound rather than re-deriving it, which is what the truth actually constrains. See Deviations.
- **`reorderColumns` documents but does not encode `targetPosition` semantics.** `arrayMove`'s second index is the item's final index in the resulting array; whether the backend means the same thing is plan 03-01's probe R1, so the wrapper stays a pure list transform and the wire mapping is left to the action that will own it.
- **`shouldNudgeOnColumnCount` tests one exact transition** (`nextCount === COLUMN_COUNT_NUDGE_THRESHOLD + 1`) rather than a `>` comparison plus a "has fired" flag. D-05 resolves D-03's "first crosses 8" as *exceeds* 8, and an exact-equality predicate makes "fires once" true by construction instead of by remembering.
- **No column cap of any kind was added** — no schema bound, no model guard, no disabled state (D-02). The `.max(50)` that `createBoardColumnsInputSchema` needs has no analogue here because all four column mutations are single-item (T-03-19, disposition `accept`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Column name fields wired to `columnNameRowSchema` rather than `columnNameSchema`**

- **Found during:** Task 1 (Column path templates and the column zod contracts)
- **Issue:** The plan's `<action>` specified `name: columnNameSchema` for `createColumnInputSchema`, `renameColumnInputSchema`, `addColumnFormSchema` and `renameColumnFormSchema`. That contradicts the same task's `<behavior>` Test 2 ("rejects a blank name and reports the required-field copy, not the length copy"), the plan's own COLUMN-01/COLUMN-02 `must_haves` truths, and 03-UI-SPEC's Copywriting Contract rows 222-223. `columnNameSchema` is `.trim().min(3, LENGTH).max(32, LENGTH)`, so a blank name reports the length copy — the exact wrong string.
- **Fix:** Used the shipped `columnNameRowSchema` (`.trim().min(1, REQUIRED_FIELD_MESSAGE).pipe(columnNameSchema)`) for every user-typed column name. It satisfies the truth's actual constraint — reuse `columnNameSchema` rather than re-derive the 3-32 bound — transitively, via the pipe.
- **Files modified:** `src/features/boards/schemas.ts`
- **Verification:** `schemas.unit.test.ts` asserts `Can't be empty` for a whitespace-only name and `Column name must be between 3 and 32 characters.` at 1, 2 and 33 characters. `pnpm test:unit` exits 0.
- **Committed in:** `17faca1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — a plan-internal contradiction resolved toward the behaviour tests, the `must_haves` truths and the UI contract, which agree with each other against the prose action).
**Impact on plan:** Corrective only. No new surface, no scope creep — the alternative would have shipped the wrong error string on every blank column-name submission in plans 03-06 and 03-07.

## Issues Encountered

- **The worktree started with no `node_modules` and no Next.js route types.** `pnpm install --frozen-lockfile` and `pnpm exec next typegen` were both required before `pnpm exec tsc --noEmit` could run clean; without typegen, `app/(dashboard)/boards/[boardId]/page.tsx` and `app/layout.tsx` report `TS2304: Cannot find name 'PageProps'/'LayoutProps'`. That is a fresh-worktree artifact, not a defect in this plan's code — both errors predate any edit here. `.env.local` was copied in per `CLAUDE.md` (unused by this plan, since every check is render-free).

## TDD Gate Compliance

All three tasks are `tdd="true"` and each RED gate was **run and observed failing** before any implementation:

| Task | RED failures observed | GREEN result |
|------|----------------------|--------------|
| 1 | 7 failed / 136 passed | 143 passed |
| 2 | 7 failed / 143 passed | 150 passed |
| 3 | 4 failed / 150 passed | 154 passed |

**No separate `test(...)` commit exists.** The repo's `husky` pre-commit hook runs `eslint --fix` with type-aware rules over staged files; a test file importing exports that do not exist yet produces 47 `no-unsafe-call` / `no-unsafe-member-access` errors and the commit is refused. Committing RED would have required `--no-verify`, which this executor is explicitly forbidden from passing. Each task therefore landed as one `feat(...)` commit containing the already-failing test plus the implementation that turns it green, and the RED evidence is recorded in the table above and in `17faca1`'s commit body.

This is a structural property of the repo, not a one-off: **any** future TDD task in this project whose test references a not-yet-existing export will hit the same wall. Worth resolving deliberately (e.g. scoping the hook's type-aware rules, or a documented RED-commit escape hatch) rather than re-discovering per plan.

## User Setup Required

None — no external service configuration required. This plan installs nothing; `@dnd-kit/*` was installed and audited in plan 03-03 (T-03-SC).

## Next Phase Readiness

- Plans 03-05 through 03-10 can each be executed against a fixed contract: path templates, input schemas, the response schema, form schemas, and every pure derivation are in place and tested.
- **Two things are deliberately still open and must not be assumed:** whether the backend's `targetPosition` means `arrayMove`'s final index (plan 03-01's probe R1), and whether a reorder bumps sibling columns' `version` (03-RESEARCH Pitfall 6). `reorderColumns` encodes neither.
- **Backstop, unresolved:** name-length equality is counted in whatever unit the backend counts in. Zod's `.min`/`.max` count UTF-16 code units; nothing in the OpenAPI contract, `02-BACKEND-FACTS.md` or `03-RESEARCH.md` states whether the backend counts bytes, code points or grapheme clusters — so a name with astral characters or combining marks may be accepted here and refused upstream, or the reverse. Not exercised by this plan; worth a probe if a column-name bug ever surfaces with non-ASCII input.
- No stubs, no skipped tests, no unrun `<verify>` — every acceptance criterion in all three tasks was executed and passed.

## Self-Check: PASSED

All five modified source files and this SUMMARY exist on disk; all three task commits
(`17faca1`, `66bf99f`, `50b2cec`) resolve in `git log`.

---
*Phase: 03-column-management*
*Completed: 2026-08-26*
