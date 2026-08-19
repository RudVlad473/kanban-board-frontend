---
phase: 01-foundation-auth-preferences
plan: 38
subsystem: docs
tags: [conventions, documentation, eslint-plugin-boundaries, lib-restructure, module-layering]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences
    provides: "01-36's three-ring eslint-plugin-boundaries policy (lib-core/lib-server/lib-client) and 01-37's landed file moves (src/lib/core|server|client/, features/auth/model.ts, features/auth/actions.ts)"
provides:
  - "CONVENTIONS.md's 'Project organization' section documents the three-ring lib/ split, its dependency directionality, and model.ts as a fourth per-feature file kind — matching the structure and lint policy 01-36/01-37 put in force"
affects: []

# Actuals (#2632)
actuals:
  tokens: 2309
  tasks: 1
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Used the boards feature entry (the one directory-tree entry already showing the full api/hooks/components/types.ts set) as the illustrative example for model.ts, rather than the auth entry — auth's own tree entry only lists components/hooks/api and wasn't the one the plan's action text described"

key-files:
  created: []
  modified:
    - CONVENTIONS.md

key-decisions:
  - "Fixed the 'Where tests live' table's stale src/features/auth/api/auth-actions.unit.test.ts example (-> actions.unit.test.ts) even though the plan's action text said not to change that table. The plan's own verify gate (`! grep -n \"api/auth-actions\" CONVENTIONS.md`) would otherwise fail against this pre-existing stale reference, which 01-37's own doc-comment cleanup didn't reach (it was scoped to quoted-import strings in code, not CONVENTIONS.md prose). Treated as a Rule 1/3 deviation (bug + blocking issue) — only the literal path substring was changed, not the table's structure or its other prose."
  - "Left the server-functions paragraph's 'lives in that domain's api/ folder' framing unchanged, per the plan's explicit reconciliation scope, even though 01-37 flattened features/auth/actions.ts out of an api/ folder entirely. The plan's decisions section explicitly scoped this edit to a path substitution ('if it references src/features/auth/api/auth-actions.ts, update that path'), not a re-derivation of the rule's own folder claim — deferred rather than expanded beyond the stated scope."

patterns-established: []

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, THEME-01]

coverage:
  - id: D1
    description: "CONVENTIONS.md's directory-tree illustration, placement-rule step 8, and quick-reference table describe the three-ring lib/ split (lib/core/, lib/server/, lib/client/) and its dependency direction, matching the eslint-plugin-boundaries policy 01-36 put in force"
    requirement: "AUTH-01"
    verification:
      - kind: other
        ref: "grep -qi 'lib/core' CONVENTIONS.md && grep -qi 'lib/server' CONVENTIONS.md && grep -qi 'lib/client' CONVENTIONS.md — all match"
        status: pass
      - kind: other
        ref: "pnpm exec prettier --check CONVENTIONS.md — exits 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "model.ts is recognised as a fourth per-feature file kind in both the directory tree (boards entry) and the quick-reference table, and step 2 of the placement rule names features/<domain>/model.ts as the home for a domain's pure model function"
    requirement: "AUTH-02"
    verification:
      - kind: other
        ref: "grep -qi 'model.ts' CONVENTIONS.md — match (directory tree, placement rule step 2, and quick-reference table)"
        status: pass
    human_judgment: false
  - id: D3
    description: "No placement-rule text still instructs a reader to use a flat lib/ catch-all, and no api/auth-actions.ts reference remains anywhere in the file"
    requirement: "AUTH-03"
    verification:
      - kind: other
        ref: "! grep -n 'api/auth-actions' CONVENTIONS.md — no match (0 results)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The enforcement paragraph names the lib-core/lib-server/lib-client element types (replacing the retired flat lib type) and states that a wrong-direction cross-ring import is a lint error"
    requirement: "THEME-01"
    verification:
      - kind: other
        ref: "manual read of the enforcement paragraph — names all three lib-* types and the wrong-direction-import ban, citing the 01-33 Storybook stub as the defect class it prevents"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-08-19
status: complete
---

# Phase 01 Plan 38: CONVENTIONS.md Three-Ring lib/ + model.ts Documentation Summary

**Rewrote CONVENTIONS.md's "Project organization" section to describe the three-ring `lib/core`/`lib/server`/`lib/client` split, its dependency directionality, and `model.ts` as a per-feature file kind — closing GC-30, the documentation half of this round's `lib/` restructure.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-19T17:20:00+02:00 (approx)
- **Completed:** 2026-08-19T17:39:16+02:00
- **Tasks:** 1 (`type="auto"`)
- **Files modified:** 1

## Accomplishments
- The directory-tree illustration now shows `lib/core/` (pure/framework-agnostic, subdivided by concern), `lib/server/` (server-only, `import "server-only"`), and `lib/client/` (browser/React-runtime infra) instead of the single flat `lib/` line, and shows `model.ts` as a per-feature file kind on the `boards` entry (the tree entry that already illustrated the full `api/`/`hooks/`/`components/`/`types.ts` set the plan's action text named).
- Placement-rule step 8 now states the three-ring split by platform coupling and the dependency direction (`lib/core` imports neither other ring; `lib/server`/`lib/client` may import `lib/core` but never each other). Step 2 gained a sentence naming `features/<domain>/model.ts` as home for a domain's pure derive/transform function, citing `resolveDisplayName` in `features/auth/model.ts` as the precedent.
- The "Where code lives" quick-reference table's single "Every other infrastructural concern → `lib/`" row is now four rows: a `model.ts` row plus separate `lib/core/`, `lib/server/`, `lib/client/` rows, each with a one-line dependency note.
- The no-cross-feature-import enforcement paragraph now names all three `lib-core`/`lib-server`/`lib-client` boundaries element types (replacing the single retired `lib` type) and states the wrong-direction cross-ring import ban, citing the 01-33 Storybook stub as the defect class it mechanically prevents.
- Plan 01-35's server-functions rule example and the "Where tests live" table's canonical-example path were both reconciled from `src/features/auth/api/auth-actions*.ts` to `src/features/auth/actions*.ts` (01-37's rename).
- `pnpm exec prettier --check CONVENTIONS.md` exits 0; all four automated verify greps (`lib/core`, `lib/server`, `lib/client`, `model.ts` present; no `api/auth-actions` reference) pass.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite the project-organization section for the three-ring lib/ and model.ts** - `0f6e64b` (docs)

_No plan-metadata commit in this worktree — the orchestrator writes STATE.md/ROADMAP.md/REQUIREMENTS.md after the wave merges._

## Files Created/Modified
- `CONVENTIONS.md` - "Project organization" section: directory tree, placement rule (steps 2 and 8), quick-reference table, and enforcement paragraph updated for the three-ring `lib/` split and `model.ts`; the server-functions example and the tests-table example reconciled to the `actions.ts` path

## Decisions Made
- Used the `boards` feature's directory-tree entry (not `auth`'s) as the illustrative spot for `model.ts`, since the plan's action text described adding it "alongside the existing `api`/`hooks`/`components`/`types.ts` entries" — that exact four-item set only appears on the `boards` entry in the tree; `auth`'s own entry lists only `components`/`hooks`/`api`.
- Fixed the "Where tests live" table's stale `src/features/auth/api/auth-actions.unit.test.ts` canonical-example path to `src/features/auth/actions.unit.test.ts`, despite the plan's action text saying not to change that table. The plan's own automated verify (`! grep -n "api/auth-actions" CONVENTIONS.md`) matches this substring regardless of which table it's in, and leaving it stale would fail the task's own gate. Treated as a scoped deviation (see below) — only the path substring changed, the table's structure and surrounding prose untouched.
- Left the server-functions paragraph's "lives in that domain's `api/` folder" framing as-is (only its literal example path updated), per the plan's explicit "reconcile, don't revert or restructure" scope for 01-35's addition — even though 01-37 flattened `actions.ts` directly under `features/auth/` with no `api/` folder anymore. Re-deriving that rule's folder claim was out of this plan's stated scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/3 - Bug/Blocking] "Where tests live" table's stale `api/auth-actions.unit.test.ts` example blocked the plan's own verify gate**
- **Found during:** Task 1, reading the current file before editing (per `read_first`)
- **Issue:** The plan's action text explicitly says "Do not change the 'Where tests live' table (plan 01-33 already repointed its cited example)." But the table's Hook/logic row still cited `src/features/auth/api/auth-actions.unit.test.ts` — a path 01-37 renamed to `src/features/auth/actions.unit.test.ts`, and one the plan's own `<verify>` command (`! grep -n "api/auth-actions" CONVENTIONS.md`) would match and fail against if left in place.
- **Fix:** Updated only the literal path substring in that cell (`api/auth-actions.unit.test.ts` → `actions.unit.test.ts`), leaving the rest of the table (columns, other rows, the hook-rendering digression) untouched.
- **Files modified:** CONVENTIONS.md
- **Verification:** `! grep -n "api/auth-actions" CONVENTIONS.md` passes (0 matches); `pnpm exec prettier --check CONVENTIONS.md` exits 0.
- **Committed in:** `0f6e64b` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (bug + blocking-verify-gate)
**Impact on plan:** Necessary for the plan's own stated verify command to pass at all — no scope creep, no other table content touched.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GC-30 is complete: CONVENTIONS.md now documents the three-ring `lib/` structure, its directionality, and `model.ts` as a per-feature file kind, matching the structure and lint policy 01-36/01-37 put in force.
- Round-4 gap closure (GC-25 through GC-30) is fully landed across code (01-36, 01-37) and documentation (01-38).
- No blockers for the next plan (01-14/01-15 per STATE.md's noted resume path).

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-19*

## Self-Check: PASSED

CONVENTIONS.md confirmed present and modified on disk. Commit `0f6e64b` verified
present in `git log`. All four verify greps (lib/core, lib/server, lib/client,
model.ts present; no api/auth-actions reference) re-run and confirmed passing.
`pnpm exec prettier --check CONVENTIONS.md` re-run and confirmed exit 0.
