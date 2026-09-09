---
phase: 04-task-subtask-workflow
plan: 21
subsystem: tasks
tags: [playwright, e2e, optimistic-locking]

requires:
  - phase: 04-task-subtask-workflow
    provides: "The shipped task, subtask, move, edit, and delete UI flows"
provides:
  - "Real-backend browser coverage for task create, detail, edit, subtasks, deletion, and stale-version reconciliation"
  - "Task and subtask seed helpers plus an out-of-band task update helper"
  - "A contention-proven e2e suite at three repetitions and two workers"
affects: [04-22]

actuals:
  tasks: 3
  commits: 4
completed: 2026-09-02
status: complete
---

# Phase 4 Plan 21: Task and Subtask Real-Backend Coverage Summary

## Accomplishments

- Added `seedTask`, `seedSubtask`, and `updateTaskOutOfBand`; `e2e/seed.sh --help` now exposes task and subtask commands without adding a sign-in path (`1806bda`).
- Added seven browser cases in four specs for task creation, task detail, task editing, subtask toggling, and inline subtask add/rename/delete (`14ff908`). Each drives the rendered UI and uses reloads where persistence is the claim.
- Added two real stale-version cases that perform an out-of-band server update before the UI mutation; they prove conflict toast, rollback, and the subsequent board reread for task edit and move (`341b45c`).
- Corrected the preceding task-delete spec's accessible card and nested-dialog assertions (`6ff1b2c`). Both delete flows now execute successfully.
- Fixed a repeat-each contention race in the existing cookie-policy specs: three sites waited for the pre-click light cookie even though the click may write dark before the first poll. Each now waits only for the post-click dark state (`bd34c2a`). The unfixed full contention run failed COOKIE-02 in repeat 3; the narrowed post-fix run passed 21/21.

## Verification

| Evidence | Result |
|---|---|
| `pnpm exec playwright test e2e/tasks-delete.e2e.spec.ts --project=e2e` | 2/2 passed |
| Task 2's four scoped specs | 7/7 passed |
| `pnpm exec playwright test e2e/tasks-conflict.e2e.spec.ts --project=e2e` | 2/2 passed |
| `bash e2e/seed.sh --help && pnpm exec tsc --noEmit && pnpm lint` | passed |
| `pnpm comments:check && pnpm format:check` | passed |
| `pnpm exec playwright test e2e/cookie-policy.e2e.spec.ts --project=e2e --repeat-each=3 --workers=2` | 21/21 passed |
| `pnpm exec playwright test --project=e2e --repeat-each=3 --workers=2` | 171/171 passed |

## Decisions

- The e2e contention requirement is a meaningful gate: it exposed a real stale-state wait in an existing cookie spec that all single-run checks had missed.
- A task card with subtasks has an accessible name beginning with its title and followed by its caption; browser specs use a title-anchored regular expression rather than an incorrect exact-name assertion.

## Next Step

Plan 04-22 is the non-autonomous phase-close checkpoint. It must update conventions and validation evidence, complete the mock comparison, push, and wait for all CI jobs before Phase 4 can close.
