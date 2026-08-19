---
phase: 01-foundation-auth-preferences
verified: 2026-08-20T00:20:00Z
status: gaps_found
score: 4/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "SC5 — The app is live on Vercel (Preview + Production) with a working sign-in page, and a GitHub Actions CI workflow runs lint, Prettier format check, build, and tests, verified by an actual push to the GitHub remote showing the pipeline run green."
    status: partial
    reason: >
      The live-deployment half is true and independently corroborated (direct fetch against
      https://kanban-board-frontend-ecru.vercel.app/login returns 200 with the real, styled
      sign-in form). The "pipeline run green" half is false as of the current master HEAD: the
      most recent completed CI run for master (run 32306321931, commit 643f6a1) has overall
      conclusion "failure" — the "quality", "secrets" and "e2e" jobs pass, but the "visual"
      (Playwright visual-regression) job fails. `gh run list` shows no fully green CI run on
      master since 2026-08-12 (commit 32a4fea), and every completed run since 2026-08-17 (10+
      consecutive runs spot-checked) fails the same way. Root cause is shared with the SC6 gap
      below.
    artifacts:
      - path: ".github/workflows/ci.yml"
        issue: "Workflow itself is correct and its lint/format/build/test steps pass — the failure is missing test fixtures (baseline PNGs), not a workflow defect."
      - path: "visual/__screenshots__/primitives.visual.spec.ts/"
        issue: "Missing baseline PNGs for every story added after the last 'Visual baselines' dispatch (2026-08-12, commit b1deb8b)."
    missing:
      - "Dispatch the 'Visual baselines' GitHub Actions workflow against current master HEAD, download the resulting artifact, and commit the new baseline PNGs to visual/__screenshots__/."
      - "Push and confirm the full CI workflow (secrets, quality, visual, e2e) shows green together on one run."
  - truth: "SC6 — A token-driven primitives library (Button, IconButton, TextField, Checkbox, Switch, Dropdown, Modal) exists, each primitive with a Storybook story, a co-located Vitest Browser Mode test, passing axe-core checks, and a Playwright visual-regression baseline."
    status: partial
    reason: >
      The token pipeline (DTCG -> Style Dictionary -> Tailwind v4), all 7 primitives, their
      Storybook stories, their Vitest Browser Mode tests, and the axe-core wiring (pnpm
      test:a11y -> storybook project) are all real and present. The Playwright
      visual-regression baseline is incomplete: 22 stories across 6 of the 7 primitives
      (Button, IconButton, TextField, Checkbox, Dropdown — Loading states; Dropdown — Error
      state; Modal — Submitting state) have no committed screenshot under
      visual/__screenshots__/primitives.visual.spec.ts/ at all. CI's "visual" job logs "A
      snapshot doesn't exist ... writing actual" for each of the 22 and fails the run. These
      states were added across gap-closure plans 01-16, 01-23, 01-24, 01-25 (2026-08-17) —
      each of those plans' own SUMMARY.md documents this as a known, deliberate deferral
      ("Visual baselines for the four new Loading stories still need generating... the CI
      workflow must be dispatched post-merge and its PNGs committed") — but the deferred
      follow-up was never actually completed for this second batch (it was completed once,
      correctly, on 2026-08-12 for the first/original 7-primitive baseline set).
    artifacts:
      - path: "visual/__screenshots__/primitives.visual.spec.ts/"
        issue: "0 of 22 newer-state baselines (loading/error/submitting) are tracked in git; 284 baselines for earlier states are present and correct."
    missing:
      - "Same fix as the SC5 gap above — one root cause, one follow-up action closes both."
deferred: []
---

# Phase 1: Foundation, Auth & Preferences Verification Report

**Phase Goal:** A visitor can create an account, sign in, remain in a route-guarded session, and
personalize their theme — running on a deployed technical foundation (feature-folder
architecture, typed API client, Server-Actions-based auth, dialing the deployed non-production
backend directly).

**Verified:** 2026-08-20T00:20:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A new visitor can sign up with email, display name, and password, and lands in an authenticated session. | ✓ VERIFIED | `src/features/auth/actions.ts` `signUpAction` calls the real backend (`externalApi.POST("/signup")`), creates a session on success, redirects to `/boards`. Behaviorally proven by `e2e/auth.e2e.spec.ts` "AUTH-01: sign up" (real form → real backend → httpOnly session cookie asserted), part of CI's `e2e` job, which passes on the current HEAD. |
| 2 | A returning user can sign in with email and password and stays signed in across a browser refresh. | ✓ VERIFIED | `signInAction` in the same file; `app/(dashboard)/layout.tsx` calls `verifySession()` on every render. Behaviorally proven by `e2e/auth.e2e.spec.ts` "AUTH-02: sign in" (`page.reload()` assertion), passing in CI's `e2e` job. |
| 3 | An unauthenticated visitor requesting a board or board-list route is redirected to the sign-in page before any board data loads. | ✓ VERIFIED | Defense-in-depth: `proxy.ts` (optimistic pre-render guard, `isProtectedPath`) + `app/(dashboard)/layout.tsx`'s own `verifySession()` call (authoritative, CVE-2025-29927-resistant by design — explicit code comment cites it). Behaviorally proven by `e2e/route-guard.e2e.spec.ts` (unauthenticated visitor, board-detail prefix, tampered cookie, expired cookie — 5 scenarios), passing in CI's `e2e` job. |
| 4 | A signed-in user can toggle light/dark theme, and the choice persists across sign-out/sign-in and browser refresh. | ✓ VERIFIED | `src/features/theme/actions.ts` `updateThemeAction` writes to the real backend (`PUT /users/me/theme`) then the theme cookie; `app/layout.tsx` reads the cookie pre-hydration (no flash). Behaviorally proven end-to-end by `e2e/theme.e2e.spec.ts` — a single continuous scenario: toggle → reload persists → sign-out → sign-in as the same account → theme still correct → toggle back — passing in CI's `e2e` job. (See Anti-Patterns below for a related, non-blocking cross-*account* edge case flagged by code review — WR-02.) |
| 5 | The app is live on Vercel (Preview + Production) with a working sign-in page, running against the deployed non-production backend. A GitHub Actions CI workflow runs lint, Prettier format check, build, and tests as required status checks on every push/PR, verified by an actual push to the GitHub remote showing the pipeline run green. | ✗ FAILED | Live-deployment half confirmed independently: `fetch()` against `https://kanban-board-frontend-ecru.vercel.app/login` returns 200 with the real, styled sign-in form (not the Vercel SSO interstitial). CI-green half is false: `gh run view` on the latest completed run for master (32306321931, commit 643f6a1) reports overall `conclusion: "failure"` — `quality`, `secrets`, `e2e` pass, `visual` fails. No CI run on master has been fully green since 2026-08-12. See Gaps. |
| 6 | A token-driven primitives library (Button, IconButton, TextField, Checkbox, Switch, Dropdown, Modal) exists — DTCG → Style Dictionary → Tailwind v4, each primitive with a Storybook story, a co-located Vitest Browser Mode test, passing axe-core checks, and a Playwright visual-regression baseline — built before any auth/theme feature work consumes it. | ✗ FAILED | All 7 primitives exist with `.tsx`/`.stories.tsx`/`.test.tsx`; token pipeline (`tokens/*.json` → `style-dictionary.config.mjs` → `pnpm tokens:build`) and axe wiring (`pnpm test:a11y` → Storybook project) are real and present. The Playwright visual-regression baseline is incomplete: 22 stories (Loading states across 5 primitives, Dropdown's Error state, Modal's Submitting state) have no committed screenshot at all. See Gaps — same root cause as #5. |

**Score:** 4/6 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/server/session.ts` | JWT session service (create/verify/destroy) | ✓ VERIFIED | Real `jose` JWT signing/verification, `httpOnly`/`secure`/`sameSite` cookie flags, fresh `jti` per token, `SESSION_SECRET` required at module load (fails loud, not silent). |
| `src/lib/server/dal.ts` | Authoritative `verifySession()` (DAL pattern) | ✓ VERIFIED | Wraps `session.verify()` in React `cache`; explicit CVE-2025-29927 defense-in-depth comment. |
| `proxy.ts` | Optimistic route-guard (Next.js 16 middleware rename) | ✓ VERIFIED | Redirects unauthenticated visitors off protected prefixes and authenticated visitors off `/login`\|`/register`; explicitly documented as non-authoritative. |
| `src/lib/core/routing/routes.ts` | Single source of truth for app paths | ✓ VERIFIED | `ROUTE` const, `PROTECTED_PREFIXES`/`PUBLIC_PATHS`, prefix-match helpers; consumed by `proxy.ts`, layouts, e2e specs. |
| `src/features/auth/actions.ts` | Server Actions for sign-up/sign-in/sign-out | ✓ VERIFIED | Real `externalApi.POST("/signup"\|"/signin")` calls, session creation from the backend's own returned identity, redirect-on-success, account-enumeration-resistant error copy. |
| `src/features/theme/actions.ts` | Theme persistence Server Action | ✓ VERIFIED | Session-gated, Zod-validated, real `externalApi.PUT("/users/me/theme")` call, cookie write only on confirmed upstream success. |
| `src/lib/server/theme.ts` | Theme cookie read/write | ✓ VERIFIED | Server-only, non-httpOnly by design, 1-year `maxAge`; consumed by `app/layout.tsx` (pre-hydration flash-avoidance) and `app/(dashboard)/layout.tsx`. |
| `vercel.json` | Pinned install/build commands | ✓ VERIFIED | `pnpm install --frozen-lockfile` / `pnpm build`, `framework: nextjs`; matches CI's own build path. |
| `.github/workflows/ci.yml` | lint/format/build/test/e2e/visual/secrets jobs | ⚠️ ORPHANED (partial) | Workflow itself is correct; the `visual` job cannot pass because its required baseline fixtures are missing from the repo (see Gaps) — not a defect in the workflow file. |
| `visual/__screenshots__/primitives.visual.spec.ts/` | Baseline PNGs for every primitive story | ✗ STUB (partial) | 284 baselines committed and correct for original states; 22 baselines for newer Loading/Error/Submitting states never generated/committed. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `sign-in-form.tsx` / `sign-up-form.tsx` | `features/auth/actions.ts` | `useActionState(signInAction\|signUpAction, ...)` on `<form action={...}>` | ✓ WIRED | Confirmed by direct read — real import, real dispatch, no stub. |
| `features/auth/actions.ts` | real backend | `externalApi.POST("/signin"\|"/signup")` (openapi-typescript-generated client) | ✓ WIRED | No mock server anywhere in the codebase (confirmed: `msw` absent from `package.json`, only a stale ESLint ignore-comment remains — WR-03). |
| `app/(dashboard)/layout.tsx` | `lib/server/dal.ts` | `await verifySession()` → `redirect(ROUTE.SIGN_IN)` on null | ✓ WIRED | Authoritative check, independent of `proxy.ts`. |
| `features/theme/actions.ts` | real backend + `lib/server/theme.ts` | `externalApi.PUT("/users/me/theme")` then `writeThemeCookie()` on confirmed success only | ✓ WIRED | Cookie is never written ahead of upstream confirmation. |
| `app/layout.tsx` | `lib/server/theme.ts` | `await readThemeCookie()` → `class={cn(..., theme==="DARK" && "dark")}` | ✓ WIRED | Pre-hydration scope application, proven by `theme.e2e.spec.ts`'s HTML-body-class assertion on a fresh `reload()` response. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `signInAction`/`signUpAction` | `identity` (session payload) | `externalApi.POST(...)` response body from the real deployed nonprod backend | Yes | ✓ FLOWING |
| `updateThemeAction` | `theme` cookie value | `externalApi.PUT("/users/me/theme")` confirmed-success response, not a client-supplied literal | Yes | ✓ FLOWING |
| `DashboardLayout` header | `identity.displayName` | `verifySession()` → real session JWT payload, itself sourced from the backend's sign-in response | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Production sign-in page is live and unstyled-SSO-free | `fetch("https://kanban-board-frontend-ecru.vercel.app/login")` | HTTP 200, real form present, no "Log in to Vercel" text | ✓ PASS |
| Unit test suite | `vitest run --project unit` | 7 files / 69 tests passed | ✓ PASS |
| Lint | `eslint .` | 0 errors, 0 warnings | ✓ PASS |
| Full CI pipeline on current master HEAD | `gh run view <latest run>` | `conclusion: "failure"` — `visual` job fails, `quality`/`secrets`/`e2e` pass | ✗ FAIL (this is the reported gap, not a false negative — reproduced directly from the CI logs: 22 `"A snapshot doesn't exist ... writing actual"` errors) |
| e2e auth/route-guard/theme suites | Verified via CI job history rather than re-run locally (needs a live server + real backend account creation) | `e2e` job conclusion `success` on the current HEAD's run (32306321931) and on every recently-inspected run | ✓ PASS (via CI evidence) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| AUTH-01 | 01-12, 01-33 | User can sign up with email, display name, password | ✓ SATISFIED | `signUpAction`, `e2e/auth.e2e.spec.ts` "AUTH-01" |
| AUTH-02 | 01-12, 01-33 | User can sign in with email and password | ✓ SATISFIED | `signInAction`, `e2e/auth.e2e.spec.ts` "AUTH-02" |
| AUTH-03 | 01-13 | Unauthenticated visitor redirected to sign-in for board/board-list routes | ✓ SATISFIED | `proxy.ts` + `dal.ts`, `e2e/route-guard.e2e.spec.ts` |
| THEME-01 | 01-14 | User can toggle light/dark theme, persisted per account across sessions | ✓ SATISFIED | `updateThemeAction`, `e2e/theme.e2e.spec.ts` (full sign-out/sign-in round trip) |

No orphaned requirements — REQUIREMENTS.md maps exactly AUTH-01/02/03 and THEME-01 to Phase 1, and all four appear in plan frontmatter `requirements-completed`.

### Anti-Patterns Found

Carried forward from `.planning/phases/01-foundation-auth-preferences/01-REVIEW.md` (independently spot-checked, not taken on faith — WR-02 was independently re-derived by reading `app/(dashboard)/layout.tsx` and `features/auth/actions.ts` directly before this report cross-referenced the review). None are debt markers (no `TBD`/`FIXME`/`XXX` found anywhere under `src/` or `app/`).

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/serve-static.mjs` | 31 | Unbounded `path.join` allows `../` traversal | Warning | Dev/CI-only static file server (Playwright `visual` webServer), low real-world exposure. Not a phase-goal blocker. |
| `app/(dashboard)/layout.tsx` / `features/auth/actions.ts` | 33-34 / 182-191 | Theme cookie not cleared on sign-out; a second account signing in on the same browser can briefly see the first account's theme | Warning | Correctness/UX only (no cross-account data exposure). Does not affect SC4 for the primary same-account persistence scenario, which is proven by `theme.e2e.spec.ts`. Real, worth a follow-up plan. |
| `eslint.config.mjs` | 416-417 | Stale `mockServiceWorker.js` ignore entry/comment left over from the since-removed MSW mock server (ADR tech/0018) | Warning | Misleading to future contributors; no functional effect (the file it ignores doesn't exist in the working tree). |
| `sign-in-form.tsx` / `sign-up-form.tsx` | 28-31 / 30-33 | `readFormField` helper duplicated verbatim | Info | Cosmetic duplication only. |
| `session.ts` / `theme.ts` | 105-113 / 50-54 | `secure` cookie flag gated on `NODE_ENV` rather than an explicit HTTPS check | Info | Only manifests when running a locally-built production server over plain HTTP; deployed environments are unaffected (always HTTPS). |

None of the above are BLOCKERs on their own — they're pre-existing, documented, non-blocking Warning/Info findings from the phase's own code review, none of which touch the phase's Success Criteria directly. They do not change the `gaps_found` status set below (which rests entirely on the CI/visual-baseline gap).

### Human Verification Required

None outstanding. The one item that genuinely required a human (live sign-up/sign-in/session/theme/cookie-flag verification against the two deployed Vercel URLs) was already performed and approved per `01-15-SUMMARY.md`'s Task 2 checkpoint transcript, and the live-URL half of that claim was independently re-confirmed in this verification pass via a direct HTTP fetch.

### Gaps Summary

Phase 1's functional goal — sign-up, sign-in, route-guarding, and theme persistence, all running
against the real deployed backend — is genuinely and thoroughly achieved: every relevant e2e
scenario passes against the live nonprod backend, the security-sensitive session/route-guard code
is sound (independently read, not just summary-trusted), and the live Vercel Production URL serves
the real, styled sign-in page.

The gap is narrower but real: ROADMAP.md's Success Criterion 5 explicitly requires the phase to be
"verified by an actual push to the GitHub remote showing the pipeline run green (not just a
locally-valid workflow file)" — and as of the current master HEAD, it does not. The `visual`
Playwright job has failed on every completed CI run since 2026-08-17 (the last fully green run on
master was 2026-08-12, commit 32a4fea), because 22 Storybook stories added by the phase's own later
gap-closure plans (01-16, 01-23, 01-24, 01-25 — Loading states, Dropdown's Error state, Modal's
Submitting state) never had their Playwright visual-regression baselines generated and committed.
This is not a mystery regression: three separate SUMMARY.md files (`01-16`, and this pattern is
also documented in `deferred-items.md`'s item #1 from 01-06) explicitly flag this exact follow-up
as required and not yet done. The same root cause also leaves ROADMAP Success Criterion 6 ("...each
primitive with... a Playwright visual-regression baseline") false as literally stated for those 6
of 7 primitives' newer states.

The fix is a known, previously-executed, mechanical procedure (already used successfully once on
2026-08-12): dispatch the `Visual baselines` GitHub Actions workflow against the current master
HEAD, download its artifact, and commit the new PNGs — then confirm one full CI run goes green.
