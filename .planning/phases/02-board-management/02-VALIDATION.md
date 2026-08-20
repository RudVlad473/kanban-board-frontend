---
phase: 2
slug: board-management
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (`unit`/`browser`/`storybook` projects) + Playwright 1.62.1 (`e2e`/`visual` projects) — both already fully configured (`vitest.config.ts`, `playwright.config.ts` from Phase 1) |
| **Config file** | `vitest.config.ts`, `vitest.setup.ts`/`vitest.setup.unit.ts` (existing, no changes needed) |
| **Quick run command** | `pnpm test:unit -- features/boards` (hooks/model logic) / `pnpm test:browser -- features/boards` (component behavior) |
| **Full suite command** | `pnpm test:all` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run the relevant `pnpm test:unit -- <name>` / `pnpm test:browser -- <name>` quick run for the file(s) touched
- **After every plan wave:** Run `pnpm test:all` (unit + browser + storybook/a11y + e2e + visual)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-XX | TBD | TBD | BOARD-01 | V4 | Sidebar lists only the signed-in user's boards | component | `pnpm test:browser -- sidebar` | ❌ W0 | ⬜ pending |
| 02-01-XX | TBD | TBD | BOARD-01 | V4 | `useBoards()` calls `/api/boards` and shapes response | unit | `pnpm test:unit -- use-boards` | ❌ W0 | ⬜ pending |
| 02-01-XX | TBD | TBD | BOARD-02 | V5 | Create-board form: 3 default rows, add/remove to 0, submit | component | `pnpm test:browser -- add-board-modal` | ❌ W0 | ⬜ pending |
| 02-01-XX | TBD | TBD | BOARD-02 | — | Client-orchestrated create sequencing + partial-failure retry | unit | `pnpm test:unit -- use-create-board` | ❌ W0 | ⬜ pending |
| 02-01-XX | TBD | TBD | BOARD-02 | — | Full create → sidebar-appears flow | e2e | `pnpm test:e2e -- boards-create` | ❌ W0 | ⬜ pending |
| 02-01-XX | TBD | TBD | BOARD-03 | V4 | Selecting a board loads its full contents | e2e | `pnpm test:e2e -- boards-detail` | ❌ W0 | ⬜ pending |
| 02-01-XX | TBD | TBD | BOARD-04 | Tampering | Rename applies optimistically and persists; rollback on failure/stale version | unit | `pnpm test:unit -- use-update-board` | ❌ W0 | ⬜ pending |
| 02-01-XX | TBD | TBD | BOARD-05 | — | Delete confirm modal; cascade; redirect logic | e2e | `pnpm test:e2e -- boards-delete` | ❌ W0 | ⬜ pending |
| 02-01-XX | TBD | TBD | BOARD-06 | — | Sidebar collapse/expand toggles and persists for session | component | `pnpm test:browser -- sidebar` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/boards/hooks/*.unit.test.ts` — no existing hook tests for this domain
- [ ] `src/features/boards/components/*.test.tsx` — no existing component tests for this domain
- [ ] `e2e/boards-*.e2e.spec.ts` — no existing e2e coverage; reuse `e2e/fixtures.ts`'s `createFixtureAccount` pattern to get a signed-in session before exercising board CRUD against the real nonprod backend
- [ ] `src/components/ui/toast/toast.test.tsx` + `.stories.tsx` — new primitive, needs the same coverage shape as every other `components/ui/` primitive (behavioral test + Storybook stories; no visual-regression entry required per CONVENTIONS.md's current narrowed scope)
- [ ] Framework install: none — Vitest/Playwright are already fully configured project-wide

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
