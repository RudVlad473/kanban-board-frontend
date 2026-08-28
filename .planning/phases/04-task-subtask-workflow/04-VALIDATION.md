---
phase: 4
slug: task-subtask-workflow
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-28
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

*Populated by `/gsd-validate-phase` once PLAN.md task ids exist. The requirement-to-test map below is the source it draws from.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | REQ-{XX} | T-{N}-01 / — | {expected secure behavior or "N/A"} | unit | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Requirement → test map (from `04-RESEARCH.md`)

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|--------------|
| tooling | Plugin extracts exported action names from a `"use server"` module | unit (`node`) | `pnpm test --project node` | ❌ W0 — `scripts/vite-plugin-server-action-stub.unit.test.mjs` |
| tooling | Recorder queues/holds/settles; unqueued call is reported | unit | `pnpm test --project unit` | ❌ W0 — `src/test-utils/action-stub-registry.unit.test.ts` |
| tooling | Full `browser` project green with no stub file and no register (**criterion 8**) | component | `pnpm test:browser` | ✅ exists, ❌ needs the 4-file rewrite |
| tooling | No `*-action-storybook-stub.ts` and no `serverActionStubAlias` remain | static gate | extend `pnpm actions:check` | ❌ W0 |
| TASK-01 | Create posts to the column path, once, with the board's own ids | component | `pnpm test:browser` | ❌ new `add-task-modal.test.tsx` + board-view coverage |
| TASK-01 | Create against the real backend | integration | `pnpm test --project node` | ❌ new `create-task-action.integration.test.ts` |
| TASK-01 | Initial-subtask fan-out keeps partial success | component | `pnpm test:browser` | ❌ new |
| TASK-02 | Detail view renders title/description/checklist/current column | component | `pnpm test:browser` | ❌ new `task-detail-modal.test.tsx` |
| TASK-03 | Edit applies optimistically and reverts on failure | component | `pnpm test:browser` | ❌ new `edit-task-modal.test.tsx` |
| TASK-03 | Client re-enforces 3–32 on edit | unit | `pnpm test:unit` | ❌ new task schema unit test |
| TASK-04 | Drag across columns: one PATCH, optimistic, rollback | component | `pnpm test:browser` | ❌ new — model on `sortable-column.test.tsx` reorder cases |
| TASK-04 | Keyboard move: lift/arrow/drop/cancel with announcements | component | `pnpm test:browser` | ❌ new — model on `board-view.test.tsx` keyboard cases |
| TASK-04 | `Current Status` dropdown is the same mutation | component | `pnpm test:browser` | ❌ new |
| TASK-04 | Real drag persists across a reload | e2e | `pnpm test:e2e` | ❌ new `tasks-move.e2e.spec.ts` (needs `createServerActionSettled`) |
| TASK-05 | Confirm modal, wait-for-server delete, cascade | component + e2e | `pnpm test:browser`, `pnpm test:e2e` | ❌ new |
| SUBTASK-01/03/04 | Add / inline rename on blur+Enter / delete without confirm | component | `pnpm test:browser` | ❌ new `subtask-editor-row.test.tsx` |
| SUBTASK-02 | Optimistic toggle; in-flight second toggle ignored; caption rolls back too | component | `pnpm test:browser` | ❌ new |
| SYNC-01 | CONFLICT ⇒ revert + distinct toast + board re-read | component | `pnpm test:browser` | ❌ new |
| UI | `heading-m` present in both themes | tokens | `pnpm test --project tokens` | ✅ `tokens/style-dictionary.build.test.ts` — needs a new assertion |
| UI | `Textarea` primitive: story, a11y, visual baseline | storybook + visual | `pnpm test:a11y`, `CI=1 pnpm test:visual` | ❌ W0 for the primitive |

---

## Wave 0 Requirements

- [ ] `scripts/vite-plugin-server-action-stub.unit.test.mjs` — the plugin's own gate
- [ ] `src/test-utils/action-stub-registry.unit.test.ts` — recorder semantics
- [ ] Rewrite of the four stub-importing test files
- [ ] `src/components/ui/textarea/{textarea.tsx,textarea.stories.tsx,textarea.test.tsx}` + a `visual/primitives.visual.spec.ts` entry
- [ ] `src/test-utils/factories/` — task/subtask factories exist in `factories/board-full.ts`; they need import paths updated if D-16 moves the schemas
- [ ] Fix the toast auto-dismiss race (`browser` project — blocks criterion 8) and the dropdown `Disabled` hang (`storybook` project — blocks `pnpm test`/CI)
- [ ] `scripts/probe-task-backend.mjs` + `04-BACKEND-FACTS.md`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mock-fidelity comparison of every surface this phase renders | UI | CLAUDE.md requires the implementer to open the mock PDF for each surface presented; no automated check compares against `docs/kanban-task-management-web-app.pdf` | Render the relevant page with `pdftoppm` at 600 DPI and compare placement, spacing, and corner radii |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for the quick run
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
