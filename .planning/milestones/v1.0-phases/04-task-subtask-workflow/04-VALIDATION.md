---
phase: 4
slug: task-subtask-workflow
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-08-28
reconciled: 2026-09-02
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded by `/gsd-plan-phase` from `04-RESEARCH.md` § Validation Architecture.
> The Per-Task Verification Map is filled by `/gsd-validate-phase` once PLAN.md task ids exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 — five projects (`tokens`, `node`, `browser`, `unit`, `storybook`); Playwright 1.62.1 — two projects (`visual`, `e2e`) |
| **Config file** | `vitest.config.ts`, `vitest.setup.ts`, `vitest.setup.unit.ts`, `playwright.config.ts` |
| **Quick run command** | `pnpm test:unit` (jsdom, fast — schemas and model changes) |
| **Component run command** | `pnpm test:browser` (the project that success criterion 8 names) |
| **Full suite command** | `pnpm test` (all five Vitest projects), then `pnpm exec playwright test` |
| **Contention run** | `pnpm exec playwright test --repeat-each=3 --workers=2` (CONVENTIONS names this the only reliable detector of the settle-wait defect class) |
| **Visual, meaningful** | `CI=1 pnpm test:visual` — without `CI=1`, `playwright.config.ts:86` makes every screenshot assertion a silent no-op |
| **Estimated runtime** | `pnpm test:unit` seconds; full `pnpm test` + Playwright, minutes |

---

## Sampling Rate

- **After every task commit:** `pnpm test:unit` plus the one `--project browser -t <name>` the task touches.
- **After every plan wave:** `pnpm test` (all Vitest projects), plus `pnpm lint`, `tsc`, and all check scripts (`routes`, `handlers`, `stories`, `comments`, `tsx`, `renders`, `folders`, `actions`, `coverage`).
- **Before `/gsd-verify-work`:** full `pnpm test` + `pnpm exec playwright test` + `CI=1 pnpm test:visual`, then CI green via `gh run watch <id> --exit-status`. Contention run before claiming e2e stability.
- **Max feedback latency:** quick run under ~30 seconds.

---

## Per-Task Verification Map

Reconciled 2026-09-02 by plan 04-22 Task 2 against the shipped plans rather than by
`/gsd-validate-phase`, which was never run for this phase. The table is therefore recorded at
plan granularity — the level at which every plan's own `<verify><automated>` block is the gate —
with the per-task audit stated as a counted property rather than enumerated over 72 rows.

**Counted property (machine-checked over all 22 `04-*-PLAN.md`):** 72 of 72 tasks carry either a
`<verify><automated>` block or a `checkpoint:*` type. Zero tasks rely on prose verification, so
the "no 3 consecutive tasks without automated verify" continuity requirement holds trivially.

| Plan | Wave | Tasks | Requirement | Automated gate that proves it | Status |
|------|------|-------|-------------|-------------------------------|--------|
| 04-01 | 1 | 3 | (all — flake removal) | `pnpm test` | ✅ green |
| 04-02 | 1 | 2 | (all — backend probe) | `node scripts/probe-task-backend.mjs`; `04-BACKEND-FACTS.md` | ✅ green |
| 04-03 | 1 | 3 | (tooling) | `pnpm test --project node` (`vite-plugin-server-action-stub.unit.test.mjs`) | ✅ green |
| 04-04 | 1 | 3 | TASK-01/02/04/05, SUBTASK-02 | `pnpm test:browser`, `pnpm folders:check` | ✅ green |
| 04-05 | 1 | 3 | TASK-01/02/03, SUBTASK-02 | `pnpm test --project tokens`, `pnpm test:a11y`, `CI=1 pnpm test:visual` | ✅ green |
| 04-06 | 1 | 3 | (all) | `pnpm test` | ✅ green |
| 04-07 | 2 | 3 | (all — tracer) | `pnpm test:browser` | ✅ green |
| 04-08 | 3 | 2 | (all) | `pnpm test` | ✅ green |
| 04-09 | 4 | 3 | (all) | `pnpm test` | ✅ green |
| 04-10 | 5 | 3 | (all — register removal) | `pnpm actions:check`, `pnpm test:browser` | ✅ green |
| 04-11 | 6 | 3 | (all) | `pnpm test` | ✅ green |
| 04-12 | 7 | 3 | TASK-04 | `pnpm test:browser` (`board-view.test.tsx`) | ✅ green |
| 04-13 | 8 | 3 | TASK-04 | `pnpm test:browser`, `e2e/tasks-move.e2e.spec.ts` | ✅ green |
| 04-14 | 9 | 3 | TASK-04, SYNC-01 | `pnpm test:browser`, `pnpm test:a11y` | ✅ green |
| 04-15 | 10 | 3 | TASK-01, SUBTASK-01 | `pnpm test:browser`, `e2e/tasks-create.e2e.spec.ts` | ✅ green |
| 04-16 | 11 | 3 | TASK-02, TASK-04 | `pnpm test:browser`, `e2e/tasks-detail.e2e.spec.ts` | ✅ green |
| 04-17 | 12 | 3 | SUBTASK-02, SYNC-01 | `pnpm test:browser`, `e2e/subtasks.e2e.spec.ts` | ✅ green |
| 04-18 | 13 | 3 | TASK-03, SYNC-01 | `pnpm test:browser`, `e2e/tasks-edit.e2e.spec.ts` | ✅ green |
| 04-19 | 14 | 3 | SUBTASK-01/03/04, SYNC-01 | `pnpm test:browser`, `e2e/subtasks.e2e.spec.ts` | ✅ green |
| 04-20 | 15 | 3 | TASK-05 | `pnpm test:browser`, `e2e/tasks-delete.e2e.spec.ts` | ✅ green |
| 04-21 | 16 | 3 | (all — coverage close) | `e2e/tasks-conflict.e2e.spec.ts`, full `pnpm test` | ✅ green |
| 04-22 | 17 | 3 + checkpoint | (all) | this document; the full gate recorded in `04-22-SUMMARY.md` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Requirement → test map (from `04-RESEARCH.md`)

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|--------------|
| tooling | Plugin extracts exported action names from a `"use server"` module | unit (`node`) | `pnpm test --project node` | ✅ `scripts/vite-plugin-server-action-stub.unit.test.mjs` |
| tooling | Recorder queues/holds/settles; unqueued call is reported | unit | `pnpm test --project unit` | ✅ `src/test-utils/action-stub-registry.unit.test.ts` |
| tooling | Full `browser` project green with no stub file and no register (**criterion 8**) | component | `pnpm test:browser` | ✅ rewrite shipped; suite green |
| tooling | No `*-action-storybook-stub.ts` and no `serverActionStubAlias` remain | static gate | `pnpm actions:check` | ✅ `findStubSeamViolations`, `check-action-verbs.mjs:89` |
| TASK-01 | Create posts to the column path, once, with the board's own ids | component | `pnpm test:browser` | ✅ `add-task-modal.test.tsx` + board-view coverage |
| TASK-01 | Create against the real backend | integration | `pnpm test --project node` | ✅ `create-task-action.integration.test.ts` |
| TASK-01 | Initial-subtask fan-out keeps partial success | component | `pnpm test:browser` | ✅ `create-task-subtasks-action.integration.test.ts` + modal coverage |
| TASK-02 | Detail view renders title/description/checklist/current column | component | `pnpm test:browser` | ✅ `task-detail-modal.test.tsx` |
| TASK-03 | Edit applies optimistically and reverts on failure | component | `pnpm test:browser` | ✅ `edit-task-modal.test.tsx` |
| TASK-03 | Client re-enforces 3–32 on edit | unit | `pnpm test:unit` | ✅ `src/features/tasks/schemas.unit.test.ts` |
| TASK-04 | Drag across columns: one PATCH, optimistic, rollback | component | `pnpm test:browser` | ✅ `board-view.test.tsx` + `task-drag-model.unit.test.ts` |
| TASK-04 | Keyboard move: lift/arrow/drop/cancel with announcements | component | `pnpm test:browser` | ✅ `board-view.test.tsx` keyboard cases |
| TASK-04 | `Current Status` dropdown is the same mutation | component | `pnpm test:browser` | ✅ `task-detail-modal.test.tsx` Current-Status case |
| TASK-04 | Real drag persists across a reload | e2e | `pnpm test:e2e` | ✅ `e2e/tasks-move.e2e.spec.ts` (3 cases: pointer, keyboard, cancel) |
| TASK-05 | Confirm modal, wait-for-server delete, cascade | component + e2e | `pnpm test:browser`, `pnpm test:e2e` | ✅ `delete-task-confirm.test.tsx`, `e2e/tasks-delete.e2e.spec.ts` |
| SUBTASK-01/03/04 | Add / inline rename on blur+Enter / delete without confirm | component | `pnpm test:browser` | ✅ `subtask-editor-row.test.tsx`, `e2e/subtasks.e2e.spec.ts` |
| SUBTASK-02 | Optimistic toggle; in-flight second toggle ignored; caption rolls back too | component | `pnpm test:browser` | ✅ `task-detail-modal.test.tsx` (busy/drop-second-press/revert cases) |
| SYNC-01 | CONFLICT ⇒ revert + distinct toast + board re-read | component | `pnpm test:browser` | ✅ `task-detail-modal.test.tsx` + `e2e/tasks-conflict.e2e.spec.ts` (edit + move) |
| UI | `heading-m` present in both themes | tokens | `pnpm test --project tokens` | ✅ `tokens/style-dictionary.build.test.ts` assertion shipped |
| UI | `Textarea` primitive: story, a11y, visual baseline | storybook + visual | `pnpm test:a11y`, `CI=1 pnpm test:visual` | ✅ 9 stories in `visual/primitives.visual.spec.ts:41` |

---

## Wave 0 Requirements

Resolved item by item, 2026-09-02, against the tree rather than against a SUMMARY claim.

- [x] `scripts/vite-plugin-server-action-stub.unit.test.mjs` — the plugin's own gate. **Present**; runs in the `node` project.
- [x] `src/test-utils/action-stub-registry.unit.test.ts` — recorder semantics. **Present**; runs in the `unit` project.
- [x] Rewrite of the four stub-importing test files. **Done** — `src/test-utils/*-action-storybook-stub.ts` no longer matches anything and `vitest.config.ts` holds no `serverActionStubAlias`; `pnpm actions:check` now fails the build if either returns (`check-action-verbs.mjs:57,78,89`).
- [x] `src/components/ui/textarea/{textarea.tsx,textarea.stories.tsx,textarea.test.tsx}` + a `visual/primitives.visual.spec.ts` entry. **All four present**; nine Textarea stories registered at `visual/primitives.visual.spec.ts:41`.
- [x] `src/test-utils/factories/` — task/subtask factories. **Present** (`board-full.ts`, `board.ts`, `session-record.ts`); import paths follow D-16's move of the schemas to `src/lib/core/api-contract/`.
- [x] Fix the toast auto-dismiss race and the dropdown `Disabled` hang. **Both fixed** — `toast.test.tsx:52` renders `<ToastProvider timeout={0}>`, matching the `Default` story; both todos are in `.planning/todos/completed/`. Note: `.planning/STATE.md`'s Blockers section still lists the toast race as "Diagnosed but not yet fixed" — that entry is stale and is corrected by this close-out.
- [x] `scripts/probe-task-backend.mjs` + `04-BACKEND-FACTS.md`. **Both present.**

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mock-fidelity comparison of every surface this phase renders | UI | CLAUDE.md requires the implementer to open the mock PDF for each surface presented; no automated check compares against `docs/kanban-task-management-web-app.pdf` | Render the relevant page with `pdftoppm` at 600 DPI and compare placement, spacing, and corner radii |

---

## Validation Sign-Off

Answered rather than uniformly ticked. Each box states what was checked and how.

- [x] **All tasks have `<automated>` verify or Wave 0 dependencies** — machine-checked over all 22 `04-*-PLAN.md`: 72 of 72 tasks carry a `<verify><automated>` block or are a `checkpoint:*` type. Zero prose-only verifications.
- [x] **Sampling continuity: no 3 consecutive tasks without automated verify** — holds trivially, since the count above leaves no task without one.
- [x] **Wave 0 covers all MISSING references** — every `❌ W0` row in the requirement→test map above now names a file that exists; the checklist above resolves each one individually.
- [x] **No watch-mode flags** — `grep -oE '--watch[a-z]*'` over all 22 plan files returns nothing.
- [x] **Feedback latency < 30s for the quick run** — `pnpm test:unit` measured at **11.39s wall** (18 files, 309 tests, 6.79s reported duration) on 2026-09-02.
- [ ] **`nyquist_compliant: true` set in frontmatter** — **NOT set, deliberately.** `/gsd-validate-phase` was never run for this phase, so no Nyquist audit exists to justify the flag. Ticking it on the strength of the five boxes above would assert an audit that did not happen. `status` is raised to `validated` because this document's own contract is now reconciled against the shipped tree; `nyquist_compliant` stays `false` until `/gsd-validate-phase 4` actually runs. Per the audit-milestone convention (#2117) this phase therefore reads as **PARTIAL**, not fully validated — which is the honest state.

**Approval:** the automated half is complete and green (full gate recorded in `04-22-SUMMARY.md`);
the human phase sign-off is the blocking checkpoint at the end of plan 04-22 and is **pending**.
