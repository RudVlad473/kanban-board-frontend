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

> Task IDs, plans and waves assigned by `/gsd-plan-phase` on 2026-08-10. Wave 0 (the harness that
> makes every command below runnable) is plans 01-04 and 01-05; every row's "File Exists" flips
> once its owning plan lands.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| T1–T3 | 01-04 | 4 | D-12 (token pipeline) | T-01-18, T-01-19 | Generated CSS contains expected token values, both mode scopes | unit (plain Vitest) | `pnpm vitest run --project tokens` | ❌ W0 | ⬜ pending |
| T1–T3 | 01-05 | 5 | Wave 0 harness | T-01-20, T-01-21 | Harness smoke-proven before the first primitive | component + a11y + visual | `pnpm test && pnpm exec playwright test` | ❌ W0 | ⬜ pending |
| T2–T3 | 01-06 | 6 | Success Criterion 6 (Button, IconButton) | T-01-SC, T-01-25 | Click/keyboard/disabled behaviour; accessible name on icon-only | component (Vitest Browser Mode) | `pnpm vitest run --project browser src/components/ui/button src/components/ui/icon-button` | ❌ W0 | ⬜ pending |
| T1–T2 | 01-07 | 7 | Success Criterion 6 (TextField, Checkbox) | T-01-07, T-01-25 | Label association, error announcement, keyboard toggle | component | `pnpm vitest run --project browser src/components/ui/text-field src/components/ui/checkbox` | ❌ W0 | ⬜ pending |
| T1–T2 | 01-08 | 8 | Success Criterion 6 (Switch, Dropdown) | T-01-25, T-01-27 | Keyboard operation and focus return | component | `pnpm vitest run --project browser src/components/ui/switch src/components/ui/dropdown` | ❌ W0 | ⬜ pending |
| T1 | 01-09 | 9 | Success Criterion 6 (Modal) | T-01-27 | Focus trap and restoration | component | `pnpm vitest run --project browser src/components/ui/modal` | ❌ W0 | ⬜ pending |
| all | 01-06…01-09 | 6–9 | Success Criterion 6 (primitives) | — | axe-core: no violations, at error severity | accessibility (Storybook addon-vitest) | `pnpm vitest run --project storybook` | ❌ W0 | ⬜ pending |
| all | 01-06…01-09 | 6–9 | Success Criterion 6 (primitives) | T-01-21 | Visual regression baseline, both mode scopes, CI-generated | visual (Playwright `toHaveScreenshot`) | `pnpm exec playwright test --project visual` | ❌ W0 | ⬜ pending |
| T3 | 01-10 | 10 | AUTH-01, AUTH-02, THEME-01 (mock contract) | T-01-07, T-01-08, T-01-09 | Mocked contract behaviour incl. indistinguishable sign-in failures | unit (node project) | `pnpm vitest run --project tokens` (mocks included) | ❌ W0 | ⬜ pending |
| T2–T3 | 01-11 | 11 | AUTH-01, AUTH-02 | T-01-01, T-01-02, T-01-03, T-01-07, T-01-08, T-01-10 | Fresh session per sign-in; httpOnly/Secure/SameSite asserted on Set-Cookie | unit + route test | `pnpm test` | ❌ W0 | ⬜ pending |
| T2–T3 | 01-12 | 12 | AUTH-01, AUTH-02 | T-01-08, T-01-31, T-01-32 | Per-field validation, loading state, non-enumerating failure copy | component (Vitest Browser Mode) | `pnpm vitest run --project browser src/features/auth` | ❌ W0 | ⬜ pending |
| T3 | 01-13 | 13 | AUTH-01, AUTH-02, AUTH-03 | T-01-04, T-01-05, T-01-33, T-01-34 | Redirect before any protected content renders; layout refuses on its own authority | E2E (Playwright) | `pnpm exec playwright test --project e2e` | ❌ W0 | ⬜ pending |
| T1–T3 | 01-14 | 14 | THEME-01 | T-01-05, T-01-06, T-01-36 | Session-derived user id only; idempotent repeat update; honest failure | route test + component + E2E | `pnpm test && pnpm exec playwright test --project e2e` | ❌ W0 | ⬜ pending |

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
