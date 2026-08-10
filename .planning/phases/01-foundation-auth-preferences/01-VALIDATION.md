---
phase: 01
slug: foundation-auth-preferences
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-10
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (Browser Mode, Playwright provider) + Storybook 10.5.7 + Playwright 1.62.1 — none yet installed (greenfield repo, no `package.json`) |
| **Config file** | none yet — created by the harness-setup task (D-24) |
| **Quick run command** | `pnpm vitest run` (once configured) |
| **Full suite command** | `pnpm vitest run && pnpm exec playwright test` (once configured) |
| **Estimated runtime** | TBD — no harness exists yet; measure and record after Wave 0 installs it |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run`
- **After every plan wave:** Run `pnpm vitest run && pnpm exec playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** TBD — no harness yet; set once Wave 0 installs the runners

---

## Per-Task Verification Map

> Task ID / Plan / Wave are TBD — the planner has not yet assigned tasks. This table maps
> phase requirements to test type and command; the planner should attach the assigned Task
> ID/Plan/Wave to each row when PLAN.md is written.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | AUTH-01 | — | Sign-up form submits, session established | component (Vitest Browser Mode) + E2E (Playwright) | `pnpm vitest run --project browser src/features/auth` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | AUTH-02 | — | Sign-in form submits, session persists across refresh | component + E2E | `pnpm vitest run --project browser src/features/auth` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | AUTH-03 | T-01 (open-redirect / proxy-bypass) | Unauthenticated visitor redirected before board data loads | E2E (Playwright) | `pnpm exec playwright test proxy-redirect` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | THEME-01 | — | Theme toggles and persists across sign-out/sign-in and refresh | component (Switch primitive) + E2E (persistence) | `pnpm vitest run components/ui/switch` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | Success Criterion 6 (primitives) | — | Every primitive: click/keyboard/error-state behavior | component (Vitest Browser Mode) | `pnpm vitest run components/ui/<primitive>` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | Success Criterion 6 (primitives) | — | axe-core: no violations | accessibility (Storybook addon-a11y) | `pnpm exec test-storybook` (or `@storybook/addon-vitest` CI mode) | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | Success Criterion 6 (primitives) | — | Visual regression baseline | visual (Playwright `toHaveScreenshot`) | `pnpm exec playwright test --grep visual` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | D-12 (token pipeline) | — | Generated CSS contains expected token values | unit (plain Vitest) | `pnpm vitest run tokens` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` (Browser Mode + Playwright provider configuration) — D-24
- [ ] `.storybook/main.ts` / `.storybook/preview.ts` (Next.js framework + addon-a11y wiring) — D-24
- [ ] `playwright.config.ts` (visual-regression project, `toHaveScreenshot` baseline directory) — D-22/D-24
- [ ] Shared test setup file wiring `@testing-library/jest-dom` matchers into Vitest — D-26
- [ ] `tokens/` pipeline test (`style-dictionary.build.test.ts` or similar) asserting generated `@theme` CSS content — D-12
- [ ] Framework install: full command list from RESEARCH.md's Standard Stack "Installation" block

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI pipeline runs green on an actual push to the GitHub remote | Success Criterion 5 | A locally-valid workflow file is not proof the pipeline runs; GitHub Actions execution can only be observed after a real push | Push to the GitHub remote, open the Actions tab, confirm lint/Prettier/build/test jobs all pass as required status checks |
| App is live on Vercel (Preview + Production) | Success Criterion 5 | Deployment status is external to the test suite | Visit the Vercel-assigned Preview and Production URLs, confirm the sign-in page renders and the app runs against the MSW-mocked API |
| MSW Node-mode interception on deployed Vercel app | Success Criterion 5 (assumption flagged in RESEARCH.md as MEDIUM confidence, not first-hand verified) | `instrumentation.ts`-based MSW startup for the deployed app is a community pattern, not confirmed against MSW's own docs this session | On the deployed Preview URL, exercise a sign-up/sign-in flow and confirm mocked responses are returned (no real backend) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < TBD (set after Wave 0 harness install)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
