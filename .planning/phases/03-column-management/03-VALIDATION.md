---
phase: 3
slug: column-management
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-26
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded by `/gsd-plan-phase` from `03-RESEARCH.md` § Validation Architecture.
> The Per-Task Verification Map is filled once plans exist (`/gsd-validate-phase`).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `4.1.10` (projects: `tokens`, `node`, `browser`, `unit`, `storybook`) + Playwright `1.62.1` (`visual`, `e2e`) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `.storybook/main.ts` |
| **Quick run command** | `pnpm test:unit` (jsdom) — or `pnpm test:browser -- <touched file>` for a component |
| **Full suite command** | `pnpm test` (all five Vitest projects), then `pnpm exec playwright test` (= `pnpm test:all`) |
| **Estimated runtime** | ~30s quick (single file) · full suite minutes |

---

## Sampling Rate

- **After every task commit:** Run `pnpm lint && pnpm test:unit` plus `pnpm test:browser -- <touched file>`
- **After every plan wave:** Run `pnpm test` (all five Vitest projects)
- **Before `/gsd-verify-work`:** `pnpm test:all` green, plus `pnpm lint format:check routes:check handlers:check stories:check comments:check tsx:check renders:check` and `pnpm api:generate` producing no diff
- **Max feedback latency:** 30 seconds (per-task quick run)

**Runner constraints (CONVENTIONS.md → "Test runner concurrency"):** the `browser` and `storybook`
projects are capped at `maxWorkers: 2` in separate `sequence.groupOrder` groups. Do not raise either
number or `testTimeout` to make a run pass.

**Known pre-existing flake — not caused by this phase:** `toast.test.tsx` races Base UI's 5s
auto-dismiss (~1 failure in 8 full runs). Diagnosed, unfixed, tracked as a todo. Do not attribute it
to column work.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _TBD — filled from PLAN.md task IDs by `/gsd-validate-phase`_ | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

The requirement→test mapping this table expands is already derived in
`03-RESEARCH.md` § Validation Architecture → "Phase Requirements → Test Map"
(COLUMN-01..04 plus U-03, a11y, and token coverage). Use it as the source when binding task IDs.

---

## Wave 0 Requirements

- [ ] `src/features/boards/components/{add-column-modal,rename-column-modal,delete-column-confirm,column-header,add-column-placeholder}.{stories,test}.tsx` — every component needs a stories/test pair (ADR tech/0025); `pnpm renders:check` is enforced for new files, so tests render composed stories only, never spread manual props
- [ ] New named story exports for every state a test needs (failed create, queued rollback, lone column, lifted column, 32-char name) — **no play functions** (`pnpm stories:check` is blocking)
- [ ] `src/test-utils/{create,rename,reorder,delete}-column-action-storybook-stub.ts` + four `serverActionStubAlias` entries in `vitest.config.ts` (mind the Vite prefix-ordering gotcha)
- [ ] `src/features/boards/schemas.unit.test.ts` — cases for `createColumnInputSchema` bounds (blank / <3 / >32)
- [ ] `src/features/boards/model.unit.test.ts` — cases for order-override derivation, `arrayMove` reorder, `toColumnDotToken(position)`
- [ ] `src/features/boards/actions/*-column.integration.test.ts` — **blocked on nonprod DB recovery**
- [ ] `e2e/columns-{create,rename,reorder,delete}.e2e.spec.ts` — **blocked on nonprod DB recovery**
- [ ] `tokens/style-dictionary.build.test.ts` — assertions for the five new tokens in both themes
- [ ] Framework install: none needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pointer drag-to-reorder feel | COLUMN-03 | `dragTo`/`userEvent.dragAndDrop` emit one intermediate move, which dnd-kit's sensors do not register as a drag; automated coverage routes through the keyboard path plus a low-level `page.mouse` e2e with `{steps:10}` | Drag a column header handle across two neighbours in a real browser; confirm the placeholder tracks the pointer and the order survives a reload |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
