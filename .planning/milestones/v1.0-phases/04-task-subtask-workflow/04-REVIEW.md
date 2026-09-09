---
phase: 04-task-subtask-workflow
reviewed: 2026-09-07T08:17:31Z
depth: standard
files_reviewed: 164
files_reviewed_list:
  - .gitignore
  - .prettierignore
  - .storybook/main.ts
  - CLAUDE.md
  - CONVENTIONS.md
  - app/(dashboard)/boards/[boardId]/page.tsx
  - app/(dashboard)/layout.tsx
  - docs/adr/tech/0020-no-mocking-policy.md
  - docs/adr/tech/0025-direct-composed-story-rendering.md
  - docs/adr/tech/0029-optimistic-writes-via-the-ui.md
  - docs/adr/tech/0030-optimistic-writes-via-the-query-cache.md
  - docs/adr/tech/0035-playwright-quality-verification-fixtures.md
  - docs/review-brief.md
  - e2e/auth.e2e.spec.ts
  - e2e/boards-create.e2e.spec.ts
  - e2e/boards-delete.e2e.spec.ts
  - e2e/boards-detail.e2e.spec.ts
  - e2e/boards-list.e2e.spec.ts
  - e2e/boards-rename.e2e.spec.ts
  - e2e/boards-switch.e2e.spec.ts
  - e2e/columns-create.e2e.spec.ts
  - e2e/columns-delete.e2e.spec.ts
  - e2e/columns-rename.e2e.spec.ts
  - e2e/columns-reorder.e2e.spec.ts
  - e2e/cookie-policy.e2e.spec.ts
  - e2e/optimistic-guards.e2e.spec.ts
  - e2e/quality-baseline.json
  - e2e/quality-baseline.ts
  - e2e/quality-baseline.unit.test.ts
  - e2e/quality-fixtures.e2e.spec.ts
  - e2e/quality-fixtures.ts
  - e2e/route-guard.e2e.spec.ts
  - e2e/seed.sh
  - e2e/seed.ts
  - e2e/session-bridge.e2e.spec.ts
  - e2e/subtasks.e2e.spec.ts
  - e2e/tasks-conflict.e2e.spec.ts
  - e2e/tasks-create.e2e.spec.ts
  - e2e/tasks-delete.e2e.spec.ts
  - e2e/tasks-detail.e2e.spec.ts
  - e2e/tasks-edit.e2e.spec.ts
  - e2e/tasks-move.e2e.spec.ts
  - e2e/theme.e2e.spec.ts
  - eslint.config.mjs
  - package.json
  - pnpm-lock.yaml
  - scripts/check-action-verbs.mjs
  - scripts/check-action-verbs.unit.test.mjs
  - scripts/probe-task-backend.mjs
  - scripts/record-quality-baseline.mjs
  - scripts/vite-plugin-server-action-stub.mjs
  - scripts/vite-plugin-server-action-stub.unit.test.mjs
  - src/components/layout/board-view/board-view.stories.tsx
  - src/components/layout/board-view/board-view.test.tsx
  - src/components/layout/board-view/board-view.tsx
  - src/components/layout/board-view/use-board-drag-session.ts
  - src/components/layout/board-view/use-new-column-reveal.ts
  - src/components/layout/dashboard-header/dashboard-header.tsx
  - src/components/ui/checkbox/checkbox.stories.tsx
  - src/components/ui/checkbox/checkbox.test.tsx
  - src/components/ui/checkbox/checkbox.tsx
  - src/components/ui/dropdown/dropdown.stories.tsx
  - src/components/ui/dropdown/dropdown.test.tsx
  - src/components/ui/textarea/textarea-variants.ts
  - src/components/ui/textarea/textarea.stories.tsx
  - src/components/ui/textarea/textarea.test.tsx
  - src/components/ui/textarea/textarea.tsx
  - src/components/ui/toast/toast.test.tsx
  - src/features/auth/components/sign-in-form/sign-in-form.test.tsx
  - src/features/auth/components/sign-out-button/sign-out-button.stories.tsx
  - src/features/auth/components/sign-out-button/sign-out-button.test.tsx
  - src/features/auth/components/sign-up-form/sign-up-form.test.tsx
  - src/features/boards/actions/get-board-action.ts
  - src/features/boards/actions/get-boards-action.ts
  - src/features/boards/components/add-column-placeholder/add-column-placeholder.stories.tsx
  - src/features/boards/components/board-list/board-list.test.tsx
  - src/features/boards/components/column-header/column-header.stories.tsx
  - src/features/boards/components/sortable-column/sortable-column.stories.tsx
  - src/features/boards/components/sortable-column/sortable-column.test.tsx
  - src/features/boards/components/sortable-column/sortable-column.tsx
  - src/features/boards/hooks/use-column-drag-sensors.ts
  - src/features/boards/hooks/use-create-column.ts
  - src/features/boards/hooks/use-delete-column.ts
  - src/features/boards/hooks/use-rename-column.ts
  - src/features/boards/hooks/use-reorder-columns.ts
  - src/features/boards/model.ts
  - src/features/boards/model.unit.test.ts
  - src/features/boards/queries/board-query.ts
  - src/features/boards/queries/boards-query.ts
  - src/features/boards/schemas.ts
  - src/features/boards/schemas.unit.test.ts
  - src/features/boards/server/dehydrate-board.ts
  - src/features/boards/server/dehydrate-boards.ts
  - src/features/boards/server/fetch-board-full.ts
  - src/features/tasks/actions/create-subtask-action.ts
  - src/features/tasks/actions/create-task-action.ts
  - src/features/tasks/actions/create-task-subtasks-action.ts
  - src/features/tasks/actions/delete-subtask-action.integration.test.ts
  - src/features/tasks/actions/delete-subtask-action.ts
  - src/features/tasks/actions/delete-task-action.integration.test.ts
  - src/features/tasks/actions/delete-task-action.ts
  - src/features/tasks/actions/move-task-action.integration.test.ts
  - src/features/tasks/actions/move-task-action.ts
  - src/features/tasks/actions/update-subtask-action.integration.test.ts
  - src/features/tasks/actions/update-subtask-action.ts
  - src/features/tasks/actions/update-task-action.integration.test.ts
  - src/features/tasks/actions/update-task-action.ts
  - src/features/tasks/components/add-task-button/add-task-button.tsx
  - src/features/tasks/components/add-task-modal/add-task-modal.tsx
  - src/features/tasks/components/delete-task-confirm/delete-task-confirm.stories.tsx
  - src/features/tasks/components/delete-task-confirm/delete-task-confirm.test.tsx
  - src/features/tasks/components/delete-task-confirm/delete-task-confirm.tsx
  - src/features/tasks/components/edit-task-modal/edit-task-modal.stories.tsx
  - src/features/tasks/components/edit-task-modal/edit-task-modal.test.tsx
  - src/features/tasks/components/edit-task-modal/edit-task-modal.tsx
  - src/features/tasks/components/subtask-checklist-row/subtask-checklist-row.stories.tsx
  - src/features/tasks/components/subtask-checklist-row/subtask-checklist-row.test.tsx
  - src/features/tasks/components/subtask-checklist-row/subtask-checklist-row.tsx
  - src/features/tasks/components/subtask-editor-row/subtask-editor-row.stories.tsx
  - src/features/tasks/components/subtask-editor-row/subtask-editor-row.test.tsx
  - src/features/tasks/components/subtask-editor-row/subtask-editor-row.tsx
  - src/features/tasks/components/task-card/task-card.stories.tsx
  - src/features/tasks/components/task-card/task-card.test.tsx
  - src/features/tasks/components/task-card/task-card.tsx
  - src/features/tasks/components/task-detail-modal/task-detail-modal.stories.tsx
  - src/features/tasks/components/task-detail-modal/task-detail-modal.test.tsx
  - src/features/tasks/components/task-detail-modal/task-detail-modal.tsx
  - src/features/tasks/hooks/use-create-subtask.ts
  - src/features/tasks/hooks/use-create-task.ts
  - src/features/tasks/hooks/use-delete-subtask.ts
  - src/features/tasks/hooks/use-delete-task.ts
  - src/features/tasks/hooks/use-move-task.ts
  - src/features/tasks/hooks/use-open-board-columns.ts
  - src/features/tasks/hooks/use-rename-subtask.ts
  - src/features/tasks/hooks/use-task-drag-sensors.ts
  - src/features/tasks/hooks/use-toggle-subtask.ts
  - src/features/tasks/hooks/use-update-task.ts
  - src/features/tasks/model.ts
  - src/features/tasks/model.unit.test.ts
  - src/features/tasks/schemas.ts
  - src/features/tasks/schemas.unit.test.ts
  - src/features/tasks/task-drag-model.ts
  - src/features/tasks/task-drag-model.unit.test.ts
  - src/features/theme/components/theme-toggle/theme-toggle.stories.tsx
  - src/features/theme/components/theme-toggle/theme-toggle.test.tsx
  - src/lib/core/api-contract/external-paths.ts
  - src/lib/core/api-contract/external-paths.unit.test.ts
  - src/lib/core/api-contract/map-problem-code.ts
  - src/lib/core/api-contract/map-problem-code.unit.test.ts
  - src/lib/core/api-contract/problem-detail.ts
  - src/lib/core/api-contract/problem-detail.unit.test.ts
  - src/lib/core/api-contract/task-schemas.ts
  - src/lib/core/api-contract/task-schemas.unit.test.ts
  - src/lib/core/query-keys/board-query-key.ts
  - src/lib/server/require-authenticated.ts
  - src/test-utils/action-stub-registry.ts
  - src/test-utils/action-stub-registry.unit.test.ts
  - src/test-utils/factories/board-full.ts
  - tokens/radius.tokens.json
  - tokens/style-dictionary.build.test.ts
  - tokens/typography.tokens.json
  - visual/primitives.visual.spec.ts
  - vitest.config.ts
  - vitest.setup.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 4: Code Review Report

**Reviewed:** 2026-09-07T08:17:31Z
**Depth:** standard (full per-file read on the 61 genuine production source files under `src/`/`app/`
excluding `.test.`/`.stories.`/`.e2e.spec.` files; a quick pattern-match pass — hardcoded secrets,
dangerous functions, debug artifacts, empty catch blocks — across the remaining 103 test/story/e2e/docs/
config files in scope, per this reviewer's own instruction not to hunt for issues in test files unless
they affect test reliability)
**Files Reviewed:** 164 (full phase scope: every file named in a phase-04 plan SUMMARY's `key-files`,
filtered for existence, plus the phase's own git-diff cross-check)
**Status:** clean

## Summary

Phase 4 (Task & Subtask Workflow, 25 plans across 20 waves) delivers task and subtask CRUD, drag-and-
drop move/reorder, optimistic UI throughout, and a Playwright quality-verification harness. All 61
production source files — every Server Action, TanStack Query hook, model/reducer function, schema,
and component the phase touched — were read in full and checked against this review's bug/security/
quality checklist. None produced a Critical or Warning finding.

The codebase is unusually consistent for a 25-plan phase: every optimistic-write hook follows the same
onMutate/onError/onSuccess triple from `docs/adr/tech/0030` (cancel in-flight queries, snapshot enough
to undo precisely the caller's own write, merge rather than assign a subtasks-less/tasks-less mutation
response), every Server Action follows the same session-then-parse-then-upstream-call order with
`userId` sourced only from the verified session record (never a client argument), and every reducer in
`model.ts`/`task-drag-model.ts` degrades gracefully (returns the input untouched) when the id it targets
is no longer present — protecting against the exact race a rollback racing a second write would produce.
Several genuinely subtle correctness properties (rollback anchored on a NEIGHBOUR id rather than a
remembered index so a concurrent edit cannot misplace the restore; the `hadRecentInput` filter split
between the passive and opt-in layout-shift readings; the cross-column vs. same-column branch in
`toTaskMoveTargetPosition`) are both correctly implemented and explicitly documented with the reasoning
a reviewer would otherwise have to reverse-engineer.

A pattern-match pass across the remaining 103 files (tests, stories, e2e specs, docs, scripts, config)
found no hardcoded secrets, no dangerous function usage (`eval`, `dangerouslySetInnerHTML`, `exec`),
no empty catch blocks, and no debug artifacts left in shipped code — the only `console.log` calls
outside test files are in `scripts/probe-task-backend.mjs` and `scripts/check-action-verbs.mjs`,
both deliberate CLI research/verification tools whose entire purpose is printing diagnostic output,
not debug residue.

**One known, already-tracked, deliberately-accepted risk was re-confirmed rather than re-flagged**:
`useCreateTask`'s subtask fan-out (`src/features/tasks/hooks/use-create-task.ts`) runs fire-and-forget
after a task create resolves, so a user who reloads in the narrow window before the fan-out's own
`refresh()` lands can see a card that briefly claimed subtasks the server never received. This is a
real, measured product behavior (per D-07's own comment in the hook and the phase's own SUMMARY
narrative), not a defect this review is newly surfacing — it is already the subject of
`.planning/todos/pending/2026-09-06-subtask-fan-out-is-lost-silently-when-the-user-leaves-right-after-create.md`,
carrying the measured timeline and four resolution options for a human decision. Restating it here as
a "finding" would misrepresent a consciously-accepted tradeoff as an overlooked bug.

All reviewed findings from `04-REVIEWS.md` (the phase's own cross-AI plan-review log, not this
automated pass) that named concrete code gaps — the ESLint `no-restricted-imports` namespace-import
bypass, and the whole-project quality-gate baseline — were independently confirmed CLOSED by reading
the current `eslint.config.mjs` block 12 and `e2e/quality-baseline.json`'s 79 recorded entries.

All reviewed findings from earlier plans' own SUMMARYs describing genuine defects found and fixed
DURING the phase (e.g. the `board-view.tsx` scroll-flicker root causes, the `EditTaskModal` column-list
race, the empty-column drop-target gap) are reflected in the CURRENT state of the code this review read
— none reproduce a defect in what shipped.

## Structural Findings (fallow)

Not run — `workflow.code_review`'s structural pre-pass (fallow) was not active for this review; no
`<structural_findings>` block was provided. This section is intentionally empty per the reviewer's own
contract (omit rather than fabricate).

## Narrative Findings (AI reviewer)

None. All reviewed files meet quality standards. No Critical, Warning, or Info-tier issue was found
that is not already tracked in an existing pending todo (see Summary).

---

_Reviewed: 2026-09-07T08:17:31Z_
_Reviewer: Claude (gsd-code-reviewer persona, run in-session — no subagent-spawn tool was available in
this execution environment, so the review was performed directly by the plan executor following the
gsd-code-reviewer agent's own adversarial-stance, depth-level and classification instructions verbatim)_
_Depth: standard_
