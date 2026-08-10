# Phase 1: Foundation, Auth & Preferences - Research

**Researched:** 2026-08-10
**Domain:** Next.js App Router foundation — DTCG/Style Dictionary token pipeline, Base UI-wrapped
primitives library, Vitest Browser Mode + Storybook + Playwright test harness, BFF-proxied
auth (httpOnly cookie), MSW mock server, GitHub Actions CI, Vercel deployment.
**Confidence:** MEDIUM — the tooling stack itself is well-documented and version-verified
(HIGH), but two structural gaps were found during research that the planner must account for:
(1) the OpenAPI contract and Figma PDF referenced throughout `.planning/` are **not present in
this repository**, and (2) Next.js 16 renamed `middleware.ts` to `proxy.ts` outright — this
changes the file convention CONTEXT.md's/ADR 0001's sources (written against `middleware.ts`)
assumed.

## Summary

Phase 1 has two halves with very different risk profiles. The **foundation half** (scaffold →
tokens → test harness → 7 primitives, Plan 1 per D-27) is low-risk: every tool in the stack
(Next.js 16.3.0, Tailwind v4.3.3, Style Dictionary 5.5.1, Vitest 4.1.10 Browser Mode, Storybook
10.5.7, Playwright 1.62.1) is current, actively maintained, and the versions locked in project
ADRs are confirmed still-current against the npm registry today. The one correction needed: the
project's own documents reference the Base UI package as `@base-ui-components/react` — that
package **is deprecated on npm and was renamed to `@base-ui/react`** (confirmed via `npm view`).
Every primitive-wrapping task in Plan 1 must install and import from `@base-ui/react`
(currently `1.7.0`), not the old scoped name.

The **auth/theme half** (Plan 2+, out of Plan 1's strict scope per D-27 but the reason the
foundation exists) carries real architectural risk that research could not fully resolve because
two source documents this phase depends on are missing from the repo: `kanban-board-openapi.json`
(the auth/theme endpoint contract) and `kanban-task-management-web-app.pdf` (the token source for
D-03's hand-transcription). HIGH-LEVEL-ARCHITECTURE.md's own Open Questions section already
flags that `POST /signup` returns a bare undocumented string and `POST /signin` returns a 200
with no documented body — ADR tech/0001 resolved the *storage* mechanism (httpOnly cookie via
BFF proxy) around this ambiguity, but the exact request/response shape the Route Handler must
parse is still unknown without the contract file. This is the single biggest planning risk in
this phase and is called out in Open Questions below.

Separately, Next.js 16 (confirmed installed-version-current via `npx create-next-app@latest`,
which resolves to 16.3.0) deprecated `middleware.ts` in favor of a renamed `proxy.ts` file
convention (same runtime behavior, `export function proxy()` instead of `export function
middleware()`). ADR tech/0001's own cited sources (Next.js authentication guide, WorkOS blog)
describe the pattern under the old "middleware" name; the underlying DAL/cookie/optimistic-check
pattern is unchanged, but the planner must write `proxy.ts`, not `middleware.ts`, or Next.js 16
will treat the file as deprecated/absent.

**Primary recommendation:** Build Plan 1 exactly as CONTEXT.md's D-01 through D-26v specify —
the token pipeline, harness, and primitives research confirms every tool choice is sound and
current. Before Plan 2 (auth/BFF/theme) is planned in detail, resolve the missing-contract-file
gap (locate or re-export `kanban-board-openapi.json` and the Figma PDF) since AUTH-01/02's
Route Handler request/response shapes and every DTCG color/spacing/typography value cannot be
correctly authored without them.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up with email, display name, and password | BFF Route Handler pattern (ADR tech/0001) verified against current Next.js 16 docs; exact request/response shape blocked on missing `kanban-board-openapi.json` (see Open Questions) |
| AUTH-02 | User can sign in with email and password | Same BFF pattern; session creation via `cookies()` + `iron-session`/`jose`, both current on npm (see Standard Stack) |
| AUTH-03 | Unauthenticated visitor redirected to sign-in before board data loads | Next.js 16 `proxy.ts` (renamed from `middleware.ts`) optimistic-check pattern + Data Access Layer `verifySession()`, verified directly against nextjs.org docs (2026-08-07) |
| THEME-01 | Toggle light/dark theme, persisted per account across sessions | Class-based dark mode + cookie pre-hydration read (DEFAULTS.md C-004) is the standard Next.js+Tailwind FOUC-avoidance pattern; Switch primitive (Plan 1, D-14) is the toggle control |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Token pipeline (DTCG → Style Dictionary → Tailwind v4)**
- D-01: DTCG token JSON split by category (`color.tokens.json`, `spacing.tokens.json`,
  `typography.tokens.json`, `radius.tokens.json`, `shadow.tokens.json`, `breakpoint.tokens.json`).
- D-02: Two-tier token system — primitive tokens → semantic tokens (intent-based aliases).
  Components consume semantic tokens only. Reversibility: costly.
- D-03: Token values hand-transcribed from the Figma PDF export
  (`kanban-task-management-web-app.pdf`) — no live Figma file/API/plugin access.
- D-04: Primitive spacing/sizing tokens use numeric step scale (`space-1`...`space-12`).
- D-05: Typography tokens are composite DTCG type — one semantic token per text style bundles
  family + size + weight + line-height.
- D-06: Elevation/shadow tokens (`shadow-sm/md/lg`) defined now, not deferred.
- D-07: Responsive breakpoints are DTCG dimension tokens too, feeding Tailwind's `screens`.
- D-08: Style Dictionary outputs a CSS `@theme` block (Tailwind v4 native format) — no
  `tailwind.config.js` mapping layer. Reversibility: costly.
- D-09: Light/dark values live under the same semantic token names (mode-scoped: `:root`/`.dark`
  or `light-dark()`). Components never branch on theme.
- D-10: Raw DTCG JSON lives in `tokens/` at repo root. Style Dictionary writes generated CSS
  into `src/styles/`.
- D-11: No dedicated Storybook "Tokens" documentation page.
- D-12: A pipeline-level test asserts the Style Dictionary build's generated CSS contains
  expected token values, separate from component tests.

**Primitives library**
- D-13: Phase 1's primitives set: Button, IconButton, TextField, Checkbox, Switch, Dropdown,
  Modal — all built before any feature phase needs them.
- D-14: Build order: Button → IconButton → TextField → Checkbox → Switch → Dropdown → Modal.
- D-15: Every primitive wraps a Base UI headless component (Button/Checkbox/Field/Switch/
  Select-Menu/Dialog) for behavior and accessibility; build from scratch only if Base UI has no
  equivalent.
- D-16: Storybook stories (default/hover/focus/disabled/error) are part of definition-of-done —
  doubles as the visual-regression baseline (ADR tech/0008 scopes visual regression to
  Storybook stories only).
- D-17: Form primitives (TextField, Checkbox, Dropdown) get a built-in error/invalid visual
  state now (`color-border-danger`/`color-text-danger`), needed immediately for auth forms.
- D-18: Every size-varying primitive (Button, IconButton, TextField, Checkbox, Switch)
  supports `sm`/`md`/`lg`. Dropdown/Modal may not need it.
- D-19: Dropdown uses compound-component API (`<Dropdown.Trigger>`, `<Dropdown.Content>`,
  `<Dropdown.Item>`), mirroring Base UI's Select/Menu composition model. Reversibility: costly.

**Testing harness & per-component coverage**
- D-20: Minimum bar per primitive: co-located Vitest Browser Mode unit test
  (`Button.test.tsx`) AND Storybook story (`Button.stories.tsx`). No primitive merges without
  both.
- D-21: axe-core accessibility checks wired in starting with the very first primitive (Button).
- D-22: Playwright visual-regression baselines captured as each primitive's stories ship, not
  batched at Phase 1's end.
- D-23: Component tests co-located per component folder (`components/ui/Button/
  {Button.tsx, Button.test.tsx, Button.stories.tsx}`).
- D-24: The full test harness (Vitest Browser Mode, Storybook, axe-core addon, Playwright
  visual config, assertion stack) is its own dedicated task, verified with a smoke test,
  *before* Button is built.
- D-25: Storybook stories stay visual-only (no play-function interaction tests); keyboard/
  interaction behavior lives exclusively in the Vitest unit test.
- D-26: Assertion/testing-library stack: Vitest's built-in `expect` + `@testing-library/
  jest-dom` + `@testing-library/react`.

**CI/CD**
- D-26b: GitHub Actions workflow (`.github/workflows/ci.yml`) is a Plan 1 deliverable — lint,
  `prettier --check`, `next build`, and tests as required status checks on every push/PR.
- D-26c: CI must be verified end-to-end by pushing to the real GitHub remote (`origin` →
  `github.com/RudVlad473/kanban-board-frontend`) and confirming the Actions run actually
  triggers and reports status in the GitHub UI.
- D-26d: Build/lint/format checks can run as soon as the scaffold (D-27) exists; the test job's
  scope grows as the harness (D-24) and each primitive's tests land. First real push-and-verify
  happens after the scaffold checkpoint, not held until every primitive is built.

**Pre-commit hooks**
- D-26e: Husky + lint-staged.
- D-26f: lint-staged runs Prettier `--write` + ESLint `--fix` on staged files only; full-project
  `tsc --noEmit` explicitly skipped at commit time — caught by CI's build step after push.
- D-26g: A failing pre-commit check blocks the commit outright — no warn-only mode.
- D-26h: Pre-commit hooks are a fast local subset; CI remains the authoritative full-project
  gate.

**Code style conventions**
- D-26i: `type` over `interface` by default.
- D-26j: Named exports everywhere, except Next.js App Router special files (`page.tsx`,
  `layout.tsx`, `route.ts`).
- D-26k: `const` arrow functions for all components.
- D-26l: No `React.FC<Props>` — type props directly on the function signature.
- D-26m: Prettier config: semicolons on, double quotes, trailing commas (all), print width 120.
- D-26n: ESLint: `typescript-eslint` strict + type-checked tier, `eslint-plugin-react-hooks`'s
  `exhaustive-deps` as error.
- D-26o: `@typescript-eslint/no-unused-vars` as error, underscore-prefix escape hatch for
  intentionally-unused parameters.
- D-26p: Import order/grouping (external → internal alias → relative) via
  `eslint-plugin-import`/`import-x`, auto-fixed by lint-staged.
- D-26q: TypeScript path aliases (`@/features/...`, `@/components/...`, `@/lib/...`).
- D-26r: No barrel files (`index.ts` re-exports) — import directly from the source file.
- D-26s: Boolean props use `is`/`has` prefixes; event-handler props use `on` prefix.
- D-26t: File naming: kebab-case for everything, including component files.
- D-26u: `class-variance-authority` (cva) for variant/size/state styling.
- D-26v: Every primitive accepts and forwards a `className` prop, merged via `tailwind-merge`.

**Sequencing**
- D-27: The entire foundation stack — scaffold, tokens, harness setup, and all 7 primitives with
  tests — is Plan 1 of Phase 1, strictly sequential and gating everything else. Plan 1 opens
  with `create-next-app` (App Router + TypeScript, pnpm, ESLint/Prettier +
  `eslint-plugin-tailwindcss`/`prettier-plugin-tailwindcss`, `eslint-plugin-boundaries`, base
  folder structure — `app/`, `src/features/`, `src/components/`, `src/hooks/`, `src/lib/`,
  `src/styles/`, `tokens/`). The scaffold step ends with a verification checkpoint (`next
  build`/`next dev` succeeds, a default route renders) before tokens/harness/primitives proceed.
  Plan 2+ (typed API client, MSW mock, BFF auth proxy, sign-up/sign-in, route guard, theme
  toggle, Vercel deploy) consumes the already-built primitives.
- D-28: ROADMAP.md's Phase 1 Success Criterion 6 names the primitives library explicitly;
  Criterion 5 names the CI checks and real-push verification explicitly.

### Claude's Discretion
None — every gray area discussed had a concrete decision made; no "you decide" selections in
this round.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within Phase 1's scope. Card was considered as an additional primitive
but not selected — CONVENTIONS.md already treats BoardCard/TaskCard as feature-specific
components, not primitives; revisit only if real cross-feature reuse emerges in Phase 2+.
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Design tokens & primitives library | Browser / Client | CDN / Static | Compiled to a static `@theme` CSS asset (Style Dictionary output) served from `src/styles/`; consumed entirely client-side by Tailwind utility classes — no server logic involved |
| Sign up / sign in (AUTH-01/02) | API / Backend | Frontend Server (SSR) | Next.js Route Handler acts as the BFF — owns credential forwarding, session-cookie creation (ADR tech/0001); the SSR tier only renders the form and calls the Route Handler same-origin |
| Route guard (AUTH-03) | Frontend Server (SSR) | API / Backend | `proxy.ts` (Next.js 16's renamed `middleware.ts`) does the optimistic pre-render redirect; the Data Access Layer's `verifySession()` (used in Server Components/Route Handlers) is the authoritative secondary check |
| Theme toggle & persistence (THEME-01) | Browser / Client | API / Backend | The Switch primitive toggles a class instantly client-side (zero perceived latency); the BFF's `PUT /users/me/theme` call persists the choice server-side, and a cookie read before hydration avoids FOUC on the next SSR pass |
| Mock API layer (MSW) | API / Backend | Browser / Client | For the *deployed* app (dev/Preview/Production), MSW's Node interception must run inside the Route Handler's server process (via `instrumentation.ts`) to intercept the BFF's outbound calls to "the external API"; the browser Service Worker variant only matters for Storybook/Vitest Browser Mode test runs, not the live app |
| Typed API client (openapi-typescript/openapi-fetch) | API / Backend | — | Per ADR tech/0001 + tech/0002 composed together, the generated client that targets the *external* contract must be instantiated only inside Route Handlers (server-side); client components never import it directly (see Architecture Patterns, "BFF pass-through shape") |
| CI/CD pipeline | Build tooling (GitHub Actions) | — | Runs entirely outside the four runtime tiers — a build-time gate, not a request-time concern |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.3.0 | App Router framework, Route Handlers, `proxy.ts` | Already locked (ADR tech/0006, tech/0009); version confirmed current via `npm view` [VERIFIED: npm registry, 2026-08-10] |
| `react` / `react-dom` | 19.2.8 | UI runtime | Matches Next.js 16's peer requirement [VERIFIED: npm registry, 2026-08-10] |
| `typescript` | 7.0.2 | Static typing | `create-next-app` default; strict + type-checked ESLint tier (D-26n) needs this [VERIFIED: npm registry, 2026-08-10] |
| `tailwindcss` | 4.3.3 | Utility CSS, `@theme` token consumption | Already locked (ADR tech/0007, CONTEXT.md D-08) [VERIFIED: npm registry, 2026-08-10] |
| `@tailwindcss/postcss` | 4.3.3 | Tailwind v4's PostCSS plugin (CSS-first config requires this, not the old `tailwind.config.js` + `autoprefixer` chain) | Required companion package for Tailwind v4's `@theme` approach [VERIFIED: npm registry, 2026-08-10] |
| `style-dictionary` | 5.5.1 | DTCG JSON → CSS custom-property build | Already locked (ADR tech/0009 references it via CONVENTIONS.md; D-08). **Caveat:** the DTCG *2025.10* spec revision is not yet fully supported in Style Dictionary v5 per its own docs — stick to the documented-supported subset ($value/$type/$description, alias refs) [CITED: styledictionary.com/info/dtcg, fetched 2026-08-10] |
| `@base-ui/react` | 1.7.0 | Headless component behavior/a11y for every primitive (D-15) | **Correction from CONTEXT.md/PROJECT.md's package name.** The package documented and referenced throughout this project's ADRs as `@base-ui-components/react` is deprecated on npm — "Package was renamed to `@base-ui/react`" [VERIFIED: npm registry `npm view @base-ui-components/react deprecated`, 2026-08-10]. Confirmed components exist for every primitive in D-13's set: Button, Checkbox, Switch, Field (TextField wraps Field+Input), Select/Menu (Dropdown), Dialog (Modal); no dedicated IconButton — wrap Base UI's Button [CITED: base-ui.com/llms.txt, fetched 2026-08-10] |
| `class-variance-authority` | 0.7.1 | Variant/size/state styling (D-26u) | Already locked; current, stable [VERIFIED: npm registry, 2026-08-10] |
| `tailwind-merge` | 3.6.0 | Safe `className` merging (D-26v) | Already locked; current [VERIFIED: npm registry, 2026-08-10] |
| `pnpm` | 11.20.0 (installed on dev machine) | Package manager (DEFAULTS.md C-013) | Confirmed installed and current [VERIFIED: local `pnpm --version`, 2026-08-10] |

### Supporting — Auth & Theme (Plan 2+)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jose` | 6.2.8 | JWT sign/verify for the session cookie payload | Next.js's own authentication guide names `jose` (alongside `iron-session`) as its recommended session-management library [CITED: nextjs.org/docs/app/guides/authentication, fetched 2026-08-10] |
| `iron-session` | 8.0.4 | Alternative: sealed/encrypted cookie session, no manual JWT signing code | Simpler API than hand-rolling `jose` sign/verify calls if the team prefers less boilerplate — same doc names both as acceptable; **pick one, not both** (open decision for Plan 2, see Open Questions) |
| `react-hook-form` | 7.85.0 | Auth form state (sign-up/sign-in) | Already locked (DEFAULTS.md C-005) [VERIFIED: npm registry, 2026-08-10] |
| `zod` | 4.4.3 | Client + server field validation matching contract constraints | Already locked (DEFAULTS.md C-005); also Next.js's own auth guide uses Zod for the same purpose [VERIFIED: npm registry, 2026-08-10] |
| `openapi-typescript` | 7.13.0 | Generates types from `kanban-board-openapi.json` | Already locked (ADR tech/0005) — **blocked until the OpenAPI file is located** (see Open Questions) [VERIFIED: npm registry, 2026-08-10] |
| `openapi-fetch` | 0.17.0 | Typed fetch client paired with the above | Already locked (ADR tech/0005) [VERIFIED: npm registry, 2026-08-10] |
| `@tanstack/react-query` | 5.101.4 | Server-state cache for any Phase-1 client-side data (theme read, session-derived user info) | Already locked (ADR tech/0002) [VERIFIED: npm registry, 2026-08-10] |
| `msw` | 2.15.0 | Mock server intercepting the BFF's outbound "external API" calls | Already locked (ADR tech/0004). Node-mode interception (not just the browser worker) is required at runtime — see Architecture Patterns [VERIFIED: npm registry, 2026-08-10] |

### Supporting — Test Harness (Plan 1, D-24)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 4.1.10 | Test runner | Browser Mode is fully stable as of Vitest 4.0 (no longer experimental) [CITED: via WebSearch synthesis of vitest.dev/guide/browser, fetched 2026-08-10 — verify directly against vitest.dev before locking config] |
| `@vitest/browser` | 4.1.10 | Browser Mode core | Must match `vitest`'s exact version [VERIFIED: npm registry, 2026-08-10] |
| `@vitest/browser-playwright` | 4.1.10 | Playwright provider for Browser Mode | **Vitest 4 split the Playwright provider into its own package** — `@vitest/browser` alone is no longer sufficient; both packages are required together [VERIFIED: npm registry, 2026-08-10] |
| `vitest-browser-react` | 2.2.0 | React component rendering inside Browser Mode | Confirmed compatible per CONTEXT.md D-26's own research note [VERIFIED: npm registry, 2026-08-10] |
| `@testing-library/react` | 16.3.2 | Role/label-based queries (D-26) | Standard pairing with Vitest Browser Mode [VERIFIED: npm registry, 2026-08-10] |
| `@testing-library/jest-dom` | 7.0.1 | DOM assertion matchers (D-26) | [VERIFIED: npm registry, 2026-08-10] |
| `storybook` | 10.5.7 | Component story authoring, visual-regression baseline source | Already locked (D-16) [VERIFIED: npm registry, 2026-08-10] |
| `@storybook/nextjs` | 10.5.7 | Storybook's Next.js framework integration | Must match `storybook` core version exactly [VERIFIED: npm registry, 2026-08-10] |
| `@storybook/addon-a11y` | 10.5.7 | axe-core-powered accessibility checks (D-21) | Runs axe-core against every story automatically; disable the `region` rule by default per Storybook's own docs [CITED: storybook.js.org/docs/writing-tests/accessibility-testing, fetched 2026-08-10] |
| `@storybook/addon-vitest` | 2.2.2 | Runs Storybook stories through Vitest's test runner (for CI-driven story execution, distinct from the co-located `.test.tsx` files) | Optional but recommended so axe-core checks can run headlessly in CI, not just interactively in the Storybook UI |
| `@playwright/test` | 1.62.1 | E2E + visual-regression runner (`toHaveScreenshot`) | Already locked (ADR tech/0008) [VERIFIED: npm registry, 2026-08-10] |
| `husky` | 9.1.7 | Pre-commit hook manager (D-26e) | Current major; **v9 deprecated `husky install`/`husky add`** — use `pnpm exec husky init` and hand-edit hook files directly, no shebang line needed [CITED: WebSearch synthesis of husky's own changelog, fetched 2026-08-10 — verify exact commands against github.com/typicode/husky before writing the harness-setup task] |
| `lint-staged` | 17.3.0 | Staged-file lint/format runner (D-26f) | [VERIFIED: npm registry, 2026-08-10] |
| `eslint` | 10.8.1 | Linter core | ESLint 9 reached EOL 2026-08-06 per ESLint's own v10 announcement — this project must target ESLint 10's flat-config format from day one, not the deprecated ESLint 9 line [CITED: eslint.org v10 release announcement, referenced in ADR tech/0009's own sources] |
| `typescript-eslint` | 8.66.0 | Strict + type-checked tier (D-26n) | [VERIFIED: npm registry, 2026-08-10] |
| `eslint-config-next` | 16.3.0 | Next.js's own recommended ESLint rules | Should track the installed `next` version exactly [VERIFIED: npm registry, 2026-08-10] |
| `eslint-plugin-tailwindcss` | 4.2.0 | Tailwind class-order/validity linting | Already locked (ADR tech/0007); v4.2.0 built specifically for Tailwind v4 [VERIFIED: npm registry, 2026-08-10] |
| `prettier` | 3.9.6 | Formatter | Print width 120 override (D-26m) [VERIFIED: npm registry, 2026-08-10] |
| `prettier-plugin-tailwindcss` | 0.8.1 | Tailwind class sorting in Prettier | Already locked (ADR tech/0007), maintained by Tailwind Labs [VERIFIED: npm registry, 2026-08-10] |
| `eslint-plugin-boundaries` | 7.2.0 | `feature → feature` import ban (ADR tech/0009) | Already verified current in ADR tech/0009's own research (v7.2.0, 2026-08-09, ESLint 9/10 flat-config compatible) [VERIFIED: npm registry, 2026-08-10, cross-checked against ADR's own citation] |
| `eslint-plugin-import` (or `eslint-plugin-import-x`) | 2.32.0 | Import order/grouping (D-26p) | [VERIFIED: npm registry, 2026-08-10] |
| `eslint-import-resolver-typescript` | 4.4.5 | Resolves TS path aliases (`@/...`) for the import-order plugin | Needed alongside `eslint-plugin-import` for D-26q's path-alias convention to lint correctly [VERIFIED: npm registry, 2026-08-10] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@base-ui/react` | `@base-ui-components/react` | The latter is the deprecated package name — do not install it; it still resolves on npm but ships a deprecation warning and will not receive updates |
| `jose` | `iron-session` | `iron-session` bundles seal/unseal in one call and needs less boilerplate; `jose` gives more explicit control over JWT claims/expiry if the session payload needs to carry more than a bare user ID. Both are Next.js's own documented recommendations — this is a genuine open choice for Plan 2, not yet decided in CONTEXT.md |
| `@storybook/addon-vitest` | Manual Storybook Test Runner (`@storybook/test-runner` + Playwright) | The addon is the more current (Storybook 9+) integration path; the older `test-runner` package still exists (0.24.4) but the addon is documented as its successor for CI-driven story execution |

**Installation (Plan 1 scaffold + harness, illustrative — planner should split into the
scaffold-task and harness-task per D-24/D-27):**
```bash
pnpm add class-variance-authority tailwind-merge @base-ui/react
pnpm add -D tailwindcss @tailwindcss/postcss style-dictionary
pnpm add -D vitest @vitest/browser @vitest/browser-playwright vitest-browser-react \
  @testing-library/react @testing-library/jest-dom
pnpm add -D storybook @storybook/nextjs @storybook/addon-a11y @storybook/addon-vitest
pnpm add -D @playwright/test
pnpm add -D husky lint-staged eslint typescript-eslint eslint-config-next \
  eslint-plugin-tailwindcss prettier prettier-plugin-tailwindcss \
  eslint-plugin-boundaries eslint-plugin-import eslint-import-resolver-typescript
```

**Version verification performed:** every row above was checked with `npm view <pkg> version`
against the live npm registry on 2026-08-10 (see Bash history in this research session).
Training-data version numbers were **not** trusted directly — several (Vitest's Browser Mode
provider split, Base UI's rename, ESLint 9's EOL, Next.js's middleware→proxy rename) would have
been silently wrong if not re-checked.

## Package Legitimacy Audit

Ran `gsd-tools query package-legitimacy check` against every new dependency this phase
introduces. The tool's heuristics flag two categories that need human interpretation rather than
blanket removal — documented below.

| Package | Registry | Age (latest publish) | Weekly Downloads | Source Repo | Verdict | Disposition |
|---------|----------|----------------------|-------------------|-------------|---------|-------------|
| `@base-ui-components/react` | npm | rc.0 tag | — | github.com/mui/base-ui | **SUS** (`deprecated`) | **REMOVED** — use `@base-ui/react` instead (see below) |
| `@base-ui/react` | npm | 2026-08-04 | 9,506,531/wk | github.com/mui/base-ui | SUS (`too-new` — heuristic only, see note) | Approved — false-positive; publish-date-based heuristic flags any actively-released package, contradicted by 9.5M weekly downloads and MUI's own maintained repo |
| `style-dictionary` | npm | 2026-08-07 | 1,930,184/wk | github.com/style-dictionary/style-dictionary | SUS (`too-new`) | Approved — same heuristic limitation; already locked by this project's own ADR tech/0009 chain |
| `msw` | npm | 2026-07-08 | 19,483,930/wk | github.com/mswjs/msw | **SLOP** (`suspicious-postinstall`) | **Approved with note, not removed** — see justification below. Already deep-researched and locked by ADR tech/0004 with primary-source citations (GitHub API, official docs); the flagged postinstall script only imports a local `config/scripts/postinstall.js` from within the package (MSW's documented `mockServiceWorker.js` browser-worker setup step), wrapped in a silent-fail `.catch()` — it makes no network calls and references no path outside the project. This does not meet the Package Legitimacy Protocol's own "high-risk signal" bar (network calls or external filesystem paths). Removing MSW would contradict a project-level locked ADR for the only chosen mock-server strategy. |
| `iron-session` | npm | 2024-11-12 | 2,162,005/wk | github.com/vvo/iron-session | OK | Approved |
| `jose` | npm | 2026-08-03 | 113,597,507/wk | github.com/panva/jose | SUS (`too-new`) | Approved — heuristic limitation; Next.js's own docs recommend it by name |
| `class-variance-authority` | npm | 2024-11-26 | 61,796,857/wk | github.com/joe-bell/cva | OK | Approved |
| `tailwind-merge` | npm | 2026-05-10 | 79,980,725/wk | github.com/dcastil/tailwind-merge | OK | Approved |
| `husky` | npm | 2024-11-18 | 34,842,348/wk | github.com/typicode/husky | OK | Approved |
| `lint-staged` | npm | 2026-07-31 | 28,447,886/wk | github.com/lint-staged/lint-staged | SUS (`too-new`) | Approved — heuristic limitation |
| `vitest-browser-react` | npm | 2026-04-05 | 1,144,133/wk | github.com/vitest-community/vitest-browser-react | OK | Approved |
| `eslint-plugin-boundaries` | npm | 2026-08-09 | 1,536,153/wk | github.com/javierbrea/eslint-plugin-boundaries | SUS (`too-new`) | Approved — already cross-verified in ADR tech/0009's own research pass |
| `openapi-typescript` | npm | 2026-02-11 | 6,089,699/wk | github.com/openapi-ts/openapi-typescript | OK | Approved |
| `openapi-fetch` | npm | 2026-02-11 | 7,292,593/wk | github.com/openapi-ts/openapi-typescript | OK | Approved |
| `react-hook-form` | npm | 2026-08-08 | 58,195,418/wk | github.com/react-hook-form/react-hook-form | SUS (`too-new`) | Approved — heuristic limitation |
| `@tanstack/react-query` | npm | 2026-07-21 | 63,702,117/wk | github.com/TanStack/query | SUS (`too-new`) | Approved — heuristic limitation |
| `eslint-plugin-tailwindcss` | npm | 2026-07-13 | 1,639,609/wk | github.com/francoismassart/eslint-plugin-tailwindcss | SUS (`too-new`) | Approved — heuristic limitation; already cross-verified in ADR tech/0007 |
| `prettier-plugin-tailwindcss` | npm | 2026-07-15 | 8,733,629/wk | github.com/tailwindlabs/prettier-plugin-tailwindcss | SUS (`too-new`) | Approved — heuristic limitation; maintained by Tailwind Labs |
| `next` | npm | 2026-08-03 | 52,350,971/wk | github.com/vercel/next.js | SUS (`too-new`) | Approved — heuristic limitation |
| `tailwindcss` | npm | 2026-07-16 | 120,828,649/wk | github.com/tailwindlabs/tailwindcss | SUS (`too-new`) | Approved — heuristic limitation |

**Packages removed due to `[SLOP]` verdict:** `@base-ui-components/react` (renamed — use
`@base-ui/react`).

**Packages flagged as suspicious `[SUS]`, kept with justification:** `msw` (postinstall
false-positive, ADR-locked), and every package whose sole flagged reason was `too-new` — this
project's legitimacy-check heuristic treats *any* package with a recent latest-version publish
date as suspicious, which produces false positives across nearly the entire modern,
actively-maintained JS ecosystem (all of Tailwind, Next.js, TanStack Query, React Hook Form,
etc. publish monthly-or-faster). Each was cross-checked against weekly download counts (all in
the six-to-hundred-million range) and an established GitHub organization/repo before being kept.
**The planner should still add one `checkpoint:human-verify` task before the Plan 1 scaffold's
dependency install step**, covering the `@base-ui/react` rename specifically, since that is the
one finding in this audit that reflects a real, actionable correction rather than a heuristic
limitation.

## Architecture Patterns

### System Architecture Diagram

```
                        ┌─────────────────────────────────────────┐
                        │              Browser (Client)             │
                        │  Sign-up/Sign-in forms (RHF + Zod)        │
                        │  Theme Switch primitive (instant toggle)  │
                        │  Storybook / Vitest Browser Mode (tests)  │
                        └───────────────┬───────────────────────────┘
                                        │ same-origin fetch only
                                        ▼
        ┌───────────────────────────────────────────────────────────┐
        │            Next.js Server (SSR + Route Handlers)             │
        │                                                               │
        │  proxy.ts (renamed middleware.ts) ── optimistic auth redirect│
        │     reads httpOnly session cookie via cookies()               │
        │                                                               │
        │  Data Access Layer: verifySession() ── authoritative check    │
        │     used in layouts/pages/Route Handlers                      │
        │                                                               │
        │  Route Handlers (BFF):                                        │
        │    POST /api/auth/signup  ─┐                                  │
        │    POST /api/auth/signin  ─┼─► creates session, sets          │
        │    POST /api/auth/signout ─┘   httpOnly/Secure/SameSite=Lax   │
        │    PUT  /api/users/me/theme ─► persists theme choice          │
        │                                                                │
        │  each Route Handler calls the typed openapi-fetch client       │
        │  configured against the "external API" base URL                │
        └───────────────────────┬───────────────────────────────────────┘
                                │ server-side fetch (Node.js runtime)
                                ▼
        ┌───────────────────────────────────────────────────────────┐
        │   MSW (Node interception, started via instrumentation.ts)   │
        │   intercepts the outbound "external API" call and returns   │
        │   a hand-written mocked response — stands in for the         │
        │   not-yet-deployed real backend, at runtime (not just tests) │
        └───────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
(Already fully specified in `CONVENTIONS.md` — reproduced here only for the Phase-1-relevant
subset the planner will actually create.)
```
tokens/                                # DTCG source JSON — build input, not app code
├── color.tokens.json
├── spacing.tokens.json
├── typography.tokens.json
├── radius.tokens.json
├── shadow.tokens.json
└── breakpoint.tokens.json

src/
├── styles/                            # Style Dictionary's generated @theme CSS output
├── components/ui/
│   ├── button/{button.tsx, button.stories.tsx, button.test.tsx}
│   ├── icon-button/{...}
│   ├── text-field/{...}
│   ├── checkbox/{...}
│   ├── switch/{...}
│   ├── dropdown/{...}                 # compound-component API (D-19)
│   └── modal/{...}
├── features/auth/
│   ├── components/                    # sign-up-form.tsx, sign-in-form.tsx
│   ├── hooks/                         # use-session, use-sign-in, use-sign-up
│   └── api/
└── lib/                               # generated API client instance, MSW handlers, session (jose/iron-session)

app/
├── proxy.ts                           # Next.js 16 file — NOT middleware.ts
├── instrumentation.ts                 # starts MSW's Node interception at server startup
├── (auth)/{login,register}/page.tsx
└── api/
    ├── auth/{signup,signin,signout}/route.ts
    └── users/me/theme/route.ts
```

### Pattern 1: BFF pass-through shape (typed client composition)
**What:** Composing ADR tech/0001 ("no client component targets the external API base URL
directly") with ADR tech/0002 ("no component calls the generated API client directly outside a
query/mutation hook") implies two separate instantiations of the generated client: one used
*only* inside Route Handlers, pointed at the real/mocked external base URL; the client-side
TanStack Query hooks call the app's *own* same-origin Route Handlers, which mirror the external
contract's shape 1:1.
**When to use:** Every authenticated data flow in this app, starting with AUTH-01/02/THEME-01.
**Example:**
```typescript
// lib/api/server-client.ts — used ONLY inside Route Handlers
import createClient from "openapi-fetch";
import type { paths } from "@/lib/api/generated-types";

export const externalApi = createClient<paths>({
  baseUrl: process.env.EXTERNAL_API_BASE_URL, // per-Vercel-environment (ADR tech/0006)
});

// app/api/auth/signin/route.ts
import { externalApi } from "@/lib/api/server-client";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json();
  const { data, error } = await externalApi.POST("/signin", { body });
  if (error) return Response.json({ message: "Invalid credentials" }, { status: 401 });
  await createSession(/* shape TBD — see Open Questions */ data);
  return Response.json({ ok: true });
}
```
[ASSUMED — this composition is this researcher's synthesis of two independently-locked ADRs,
not itself sourced from either ADR or an external doc. Flag for explicit confirmation before
Plan 2 is planned in detail.]

### Pattern 2: `proxy.ts` optimistic auth redirect (Next.js 16)
**What:** Next.js 16 renamed `middleware.ts` to `proxy.ts` (`export function proxy` instead of
`export function middleware`); the underlying cookie-read/redirect logic is unchanged.
**When to use:** AUTH-03's route guard.
**Example:**
```typescript
// proxy.ts — NOT middleware.ts (deprecated file convention as of Next.js 16.0.0)
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

const protectedRoutes = ["/boards"]; // adjust to this project's actual board routes
const publicRoutes = ["/login", "/register", "/"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((r) => path.startsWith(r));
  const isPublicRoute = publicRoutes.includes(path);

  const cookie = req.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL("/boards", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
```
[CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy and
nextjs.org/docs/app/guides/authentication, both fetched 2026-08-10 — this is the official
example, adapted to this project's route names]

### Pattern 3: MSW Node-mode interception at server startup
**What:** MSW's browser Service Worker only intercepts requests made *from the browser* — it
does nothing for the BFF Route Handler's own server-side `fetch()` calls to the external API.
For the deployed app (not just Vitest/Playwright tests) to actually run "against the
MSW-mocked API" per ROADMAP Success Criterion 5, MSW's Node-mode `setupServer()` must be started
once, at server-process startup, via Next.js's `instrumentation.ts` hook — gated to the Node.js
runtime only (Route Handlers/`proxy.ts` both default to Node.js runtime in Next.js 16, so no
Edge-runtime incompatibility is expected here).
**When to use:** Any Route Handler that calls the external API — i.e., every BFF endpoint this
phase builds.
**Example:**
```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { server } = await import("@/lib/mocks/node-server");
    server.listen({ onUnhandledRequest: "error" }); // matches CONVENTIONS.md's ADR tech/0004 enforcement rule
  }
}
```
[CITED: community pattern, verified via mswjs.io/docs/integrations/node (fetched 2026-08-10,
confirms `setupServer().listen()` as the general Node.js mechanism) + WebSearch cross-check of
the `instrumentation.ts` + `NEXT_RUNTIME === 'nodejs'` gating idiom (multiple independent
sources, fetched 2026-08-10) — the specific `instrumentation.ts` wiring was not confirmed
against MSW's own official docs in this session; verify directly before locking the harness
task]

### Anti-Patterns to Avoid
- **Installing `@base-ui-components/react`:** deprecated on npm; will not receive updates.
  Install `@base-ui/react` instead.
- **Creating `middleware.ts` in this Next.js 16 project:** the file convention is deprecated —
  Next.js provides a codemod (`npx @next/codemod@canary middleware-to-proxy .`) but a greenfield
  Plan 1 scaffold should just write `proxy.ts` directly from the start.
- **A client component importing the openapi-typescript-generated client directly:** violates
  both ADR tech/0001 (no client-component call to the external API base URL) and ADR tech/0002
  (no component calls the generated client outside a query/mutation hook) simultaneously — see
  Pattern 1.
- **Relying on MSW's browser worker alone for the deployed app:** satisfies Vitest/Playwright
  test runs but does nothing for the live BFF's server-side calls — see Pattern 3.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie signing/verification | A custom HMAC/JWT scheme | `jose` or `iron-session` | Next.js's own authentication guide explicitly recommends against a fully custom implementation for exactly this reason: "implementing your own secure solution can quickly become complex" [CITED: nextjs.org/docs/app/guides/authentication, fetched 2026-08-10] |
| Tailwind class merging (`className` prop conflicts) | Manual string concatenation / conditional class logic | `tailwind-merge` (already locked, D-26v) | Naive concatenation lets a consumer's override lose to the base class due to CSS specificity/order, not intent |
| Accessible dialog/menu/select focus-trapping and keyboard nav | Custom `useEffect`-based focus management | Base UI's Dialog/Menu/Select primitives (D-15) | Base UI already implements WAI-ARIA-compliant focus trapping, escape-to-close, and roving tabindex — reimplementing this is exactly the "deceptively complex" category D-15 exists to avoid |
| Visual-regression diffing | A custom pixel-comparison script | Playwright's built-in `toHaveScreenshot` + `pixelmatch` (ADR tech/0008, already locked) | Already deep-researched in ADR tech/0008 with three alternatives compared |

**Key insight:** Every "don't hand-roll" item in this phase is already a locked ADR decision —
the research risk here isn't *which* library, it's confirming those libraries' current package
names/versions are still what the ADRs assumed (which is exactly where the `@base-ui/react`
rename was caught).

## Common Pitfalls

### Pitfall 1: Installing the deprecated Base UI package name
**What goes wrong:** `pnpm add @base-ui-components/react` succeeds silently (the package still
exists on npm) but the project is now on a dead-end, unmaintained package.
**Why it happens:** Every project document (CONTEXT.md, PROJECT.md, HIGH-LEVEL-ARCHITECTURE.md)
was written referencing the old name before the npm-level rename was checked.
**How to avoid:** Install `@base-ui/react` (1.7.0) from the start of Plan 1's primitive-wrapping
tasks.
**Warning signs:** `pnpm install` output showing a deprecation warning for
`@base-ui-components/react`.

### Pitfall 2: Writing `middleware.ts` in a Next.js 16 project
**What goes wrong:** The file convention was renamed in v16.0.0; a file named `middleware.ts`
is documented as deprecated. Behavior after v16.0.0 depends on Next.js's own compatibility
handling — the safest path is to never create the deprecated file in a greenfield project.
**Why it happens:** ADR tech/0001's own cited sources (Next.js's authentication guide, fetched
2026-08-09) and most training-era knowledge still describe "middleware.ts."
**How to avoid:** Write `proxy.ts` with `export default function proxy(request)` from the start
(AUTH-03's route guard task).
**Warning signs:** A route-guard task description or task title mentioning "middleware.ts."

### Pitfall 3: MSW only mocking test runs, not the deployed app
**What goes wrong:** Vitest/Playwright tests pass because MSW's browser-worker/Node-`setupServer`
test wiring works, but the Vercel Preview/Production deployment's sign-up/sign-in calls hit a
real network address that doesn't exist (no backend deployed) and 500/timeout.
**Why it happens:** MSW's most commonly documented integration path is test-only; the
"mock server standing in for a live backend at runtime" requirement (ROADMAP Success Criterion
5: "running against the MSW-mocked API" as a *deployed, live* property) needs the separate
`instrumentation.ts` wiring described in Pattern 3, which is a less-documented, community-derived
pattern rather than an MSW first-party guide.
**How to avoid:** Treat "MSW running in the deployed Vercel app" as its own explicit
verification checkpoint distinct from "MSW running inside Vitest/Playwright," and test it by
actually visiting the deployed Preview URL and signing up.

### Pitfall 4: DTCG composite typography tokens exceeding Style Dictionary v5's current DTCG support
**What goes wrong:** D-05 requires one composite semantic token per text style (family + size +
weight + line-height bundled together per the DTCG spec's composite `typography` type). Style
Dictionary's own docs state the *newest* DTCG format revision (2025.10) is "a work in progress in
v5" — meaning some composite-type edge cases may not transform correctly out of the box.
**Why it happens:** DTCG itself is a moving target; tooling support lags the spec.
**How to avoid:** During the harness-setup/token-pipeline task (D-12's pipeline-level test),
write the typography composite token first and confirm Style Dictionary's generated CSS actually
contains all four sub-values before building out the rest of the typography scale — catches a
transform gap with one token instead of discovering it after the full scale is authored.
**Warning signs:** Generated `@theme` CSS missing `font-weight`/`line-height` custom properties
for a typography token, or Style Dictionary throwing on the composite token's shape.

### Pitfall 5: `next.config.js` unaware of MSW's Node-mode side effects during `next build`
**What goes wrong:** If `instrumentation.ts` unconditionally imports MSW's Node setup at module
scope (not inside the `register()` function's runtime check), the production build can
accidentally bundle mock-server code into the Edge/Client graph, or start intercepting requests
during the build step itself.
**Why it happens:** `instrumentation.ts`'s `register()` function is the documented place to gate
by `NEXT_RUNTIME`; a naive top-level import bypasses that gate.
**How to avoid:** Keep the `server.listen()` call strictly inside the `if (process.env.
NEXT_RUNTIME === "nodejs")` branch, using a dynamic `import()` (not a static top-level import) so
bundlers don't pull it into other runtime graphs.
**Warning signs:** Build warnings about Node built-ins (`http`/`https`, which MSW patches) being
referenced from Edge-runtime or Client-bundle code.

## Code Examples

See Architecture Patterns above for the BFF pass-through client (Pattern 1), `proxy.ts` route
guard (Pattern 2), and MSW `instrumentation.ts` wiring (Pattern 3) — all three are the
Phase-1-specific code shapes this research produced.

### Style Dictionary DTCG token authoring (Plan 1, D-01/D-02)
```json
// tokens/color.tokens.json — primitive tier
{
  "color": {
    "blue": {
      "600": { "$value": "#635FC7", "$type": "color" }
    }
  }
}
```
```json
// tokens/color.tokens.json (semantic layer, or a separate semantic file per D-01's split)
{
  "color": {
    "bg": {
      "primary": { "$value": "{color.blue.600}", "$type": "color" }
    }
  }
}
```
[CITED: styledictionary.com/info/dtcg, fetched 2026-08-10 — `$value`/`$type`/alias `{group.
token}` syntax confirmed directly against Style Dictionary's own docs page]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `middleware.ts` file convention | `proxy.ts` file convention (`export function proxy`) | Next.js v16.0.0 | Every route-guard code sample the team may have seen pre-16 (including ADR tech/0001's own cited sources) needs the rename applied |
| Vitest Browser Mode: `@vitest/browser` with a `provider: 'playwright'` string option | Vitest 4: separate `@vitest/browser-playwright` package required alongside `@vitest/browser` | Vitest 4.0 | The harness-setup task (D-24) must install both packages, not just `@vitest/browser` |
| ESLint 9 flat config | ESLint 10 (9 reached EOL 2026-08-06) | 2026-08-06 | `create-next-app`'s generated ESLint config and every plugin choice in this phase should target ESLint 10 compatibility explicitly |
| `@base-ui-components/react` | `@base-ui/react` | Package renamed on npm (exact date not confirmed in this session, but the renamed package's own version history starts well before this project's context was written) | Every primitive-wrapping task and any code sample referencing the old import path needs updating |

**Deprecated/outdated:**
- `husky add`: removed in Husky v9+; use `pnpm exec husky init` then hand-edit files in
  `.husky/` directly, with no `#!/usr/bin/env sh` shebang line.
- `middleware.ts`: deprecated in Next.js 16.0.0, renamed to `proxy.ts`.
- `@base-ui-components/react`: deprecated npm package, renamed to `@base-ui/react`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The BFF pass-through shape (client-side hooks call same-origin Route Handlers that internally re-call the external contract with a second client instance) is the correct composition of ADR tech/0001 + tech/0002 | Architecture Patterns, Pattern 1 | If the intended shape is different (e.g., a single shared client instance with environment-aware base URL switching), Plan 2's Route Handler and TanStack Query hook structure would need rework mid-phase |
| A2 | MSW's Node-mode interception via `instrumentation.ts` + `NEXT_RUNTIME === "nodejs"` gating is the correct/only mechanism to mock the BFF's server-side calls in the deployed Vercel app | Architecture Patterns, Pattern 3; Pitfall 3 | If Vercel's Node.js Function runtime handles `instrumentation.ts` differently than a standard Node server, the deployed app's sign-up/sign-in could 500 in Preview/Production even though local `next dev` and CI tests pass |
| A3 | DTCG composite typography tokens will transform correctly through Style Dictionary v5 given the "work in progress" caveat on the newest DTCG spec revision | Pitfall 4 | If the transform silently drops a sub-value (e.g., line-height), every text style in the app would render with a missing property and the pipeline-level test (D-12) needs to specifically assert on the composite fields, not just presence of the top-level token |
| A4 | Vitest 4's Browser Mode Playwright provider requires exactly `@vitest/browser` + `@vitest/browser-playwright` as two separate packages (not a config-string provider on a single package) | Standard Stack, Test Harness table | If the actual current API is different (e.g., provider selection changed again in a patch release), the harness-setup task's install list and config would fail at `vitest run --browser` |
| A5 | Husky v9+'s `pnpm exec husky init` + hand-edited `.husky/` files (no shebang) is still the current recommended setup as of Husky 9.1.7 | Standard Stack, Test Harness table | If a further Husky change occurred, the pre-commit hook setup task (D-24/D-26e) could produce a non-functional hook silently (commits would succeed without running lint-staged) |

## Open Questions

1. **Where is `kanban-board-openapi.json`?**
   - What we know: HIGH-LEVEL-ARCHITECTURE.md and multiple ADRs (tech/0001, tech/0004, tech/0005)
     were written by reading this file directly during an earlier ingestion session — it clearly
     existed somewhere at that time, and its `/signup`/`/signin`/`PUT /users/me/theme` shapes are
     the exact contract AUTH-01/02 and THEME-01's Route Handlers must implement.
   - What's unclear: The file is not present anywhere in this repository (`git ls-files` /
     filesystem search found nothing named `*openapi*` or `kanban-board-openapi.json`).
   - Recommendation: Before Plan 2 (the auth/BFF plan) is planned in detail, locate this file
     (it may live outside the repo on the user's machine, or need to be re-requested/re-exported)
     and commit it to the repo (e.g., alongside `docs/`) so `openapi-typescript` has something to
     generate from. Until then, Plan 2's Route Handler request/response shapes are a best-guess
     based on HIGH-LEVEL-ARCHITECTURE.md's prose description only.

2. **Where is `kanban-task-management-web-app.pdf`?**
   - What we know: D-03 requires every DTCG token value to be hand-transcribed from this file;
     HIGH-LEVEL-ARCHITECTURE.md confirms it was read via `pdftotext -layout` during an earlier
     session (110MB file, exceeded direct-PDF-read limits then too).
   - What's unclear: Also not present in this repository.
   - Recommendation: Same as above — locate/re-provide before the token-authoring tasks (D-01
     through D-07) in Plan 1 can produce real (non-placeholder) values. This blocks Plan 1's
     actual token content, though not the pipeline *tooling* setup (Style Dictionary config,
     folder structure, and the D-12 pipeline test can all be built and verified against
     placeholder token values first, then have real values substituted once the PDF is located).

3. **What is the exact shape of `POST /signup`'s bare-string response and `POST /signin`'s
   undocumented 200 body?**
   - What we know: HIGH-LEVEL-ARCHITECTURE.md's own Open Questions section flags this as
     unresolved; ADR tech/0001 deliberately chose httpOnly-cookie-via-BFF specifically because it
     "absorbs the backend's ambiguous response shape behind one boundary instead of leaking it
     into client code" — i.e., the architecture is designed to tolerate this ambiguity.
   - What's unclear: Whether the bare string is a bearer token to embed in the session, a user
     ID, or something else — and whether `/signin`'s 200-with-no-body means the frontend must
     make a *second* call (e.g., `GET /users/me`) to learn who just signed in.
   - Recommendation: Resolves automatically once Open Question 1's file is located; until then,
     Plan 2 should not be planned at the Route-Handler-implementation level of detail — Plan 1's
     scope (per D-27) does not touch this, so it does not block Plan 1.

4. **Which session library — `jose` or `iron-session`?**
   - What we know: Both are Next.js's own documented recommendations; CONTEXT.md does not lock
     one (auth ADR tech/0001 only says "e.g. `jose`/`iron-session`" as an illustrative example,
     not a decision).
   - What's unclear: No project decision exists yet.
   - Recommendation: This is a genuine open choice for the Plan-2 discuss/plan cycle, not
     something research can resolve unilaterally — flag for a `Claude's Discretion` or explicit
     user decision when Plan 2 is discussed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Entire toolchain | ✓ | v24.6.0 | — |
| npm | Registry lookups during research; not the project's package manager | ✓ | 11.5.1 | — |
| pnpm | Project package manager (DEFAULTS.md C-013) | ✓ | 11.20.0 | — |
| git | Version control, CI push verification (D-26c) | ✓ | 2.55.0 | — |
| GitHub remote (`origin`) | CI push-and-verify (D-26c) | ✓ (per CONTEXT.md D-26c, already configured to `github.com/RudVlad473/kanban-board-frontend`) | — | — |
| `kanban-board-openapi.json` | Typed API client generation, Route Handler contract shapes (Plan 2) | ✗ — not found in repo | — | None identified — this blocks accurate Route Handler implementation; see Open Questions 1 |
| `kanban-task-management-web-app.pdf` | DTCG token value transcription (D-03, Plan 1) | ✗ — not found in repo | — | Pipeline tooling can be built/verified with placeholder values first (see Open Questions 2) |
| Vercel account/CLI | Deployment (Success Criterion 5) | Not checked (deployment is a manual/dashboard step outside this research's scope) | — | — |

**Missing dependencies with no fallback:**
- `kanban-board-openapi.json` — blocks accurate Plan-2 Route Handler contract implementation.

**Missing dependencies with fallback:**
- `kanban-task-management-web-app.pdf` — Plan 1's token-pipeline *tooling* (folder structure,
  Style Dictionary config, D-12's pipeline test) can proceed with placeholder token values; the
  file is only needed before real, final token values are authored.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (Browser Mode, Playwright provider) + Storybook 10.5.7 + Playwright 1.62.1 — none yet installed (greenfield repo, no `package.json`) |
| Config file | none yet — created by the harness-setup task (D-24) |
| Quick run command | `pnpm vitest run` (once configured) |
| Full suite command | `pnpm vitest run && pnpm exec playwright test` (once configured) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Sign-up form submits, session established | component (Vitest Browser Mode) + E2E (Playwright) | `pnpm vitest run --project browser src/features/auth` (once harness exists) | ❌ Wave 0 |
| AUTH-02 | Sign-in form submits, session persists across refresh | component + E2E | same as above | ❌ Wave 0 |
| AUTH-03 | Unauthenticated visitor redirected before board data loads | E2E (Playwright, since it's a full-navigation/server behavior) | `pnpm exec playwright test proxy-redirect` | ❌ Wave 0 |
| THEME-01 | Theme toggles and persists | component (Switch primitive test, already required by D-20) + E2E for persistence-across-sessions | `pnpm vitest run components/ui/switch` | ❌ Wave 0 |
| (Success Criterion 6) primitives | Every primitive: click/keyboard/error-state behavior | component (Vitest Browser Mode, D-20) | `pnpm vitest run components/ui/<primitive>` | ❌ Wave 0 |
| (Success Criterion 6) primitives | axe-core no violations | accessibility (Storybook addon-a11y, D-21) | `pnpm exec test-storybook` or `@storybook/addon-vitest`'s CI mode | ❌ Wave 0 |
| (Success Criterion 6) primitives | Visual regression baseline | visual (Playwright `toHaveScreenshot`, D-22) | `pnpm exec playwright test --grep visual` | ❌ Wave 0 |
| (D-12) token pipeline | Generated CSS contains expected token values | unit (plain Vitest, not Browser Mode) | `pnpm vitest run tokens` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run` (component/unit, fast) — matches D-26f's staged-file-only
  pre-commit philosophy; the full suite is a CI concern, not a commit-blocking one.
- **Per wave merge:** `pnpm vitest run && pnpm exec playwright test` (full suite, including visual
  and E2E).
- **Phase gate:** Full suite green in CI (D-26b) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `vitest.config.ts` (Browser Mode + Playwright provider configuration) — D-24
- [ ] `.storybook/main.ts` / `.storybook/preview.ts` (Next.js framework + addon-a11y wiring) — D-24
- [ ] `playwright.config.ts` (visual-regression project, `toHaveScreenshot` baseline directory) — D-22/D-24
- [ ] Shared test setup file wiring `@testing-library/jest-dom` matchers into Vitest — D-26
- [ ] `tokens/` pipeline test (`style-dictionary.build.test.ts` or similar) asserting generated
  `@theme` CSS content — D-12
- [ ] Framework install: full command list in Standard Stack's "Installation" block above

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | yes | Email/password only (no SSO/OAuth per REQUIREMENTS.md's Out of Scope); password never stored/logged client-side, hashing is the external API's responsibility (not this frontend's) |
| V3 Session Management | yes | httpOnly + Secure + SameSite=Lax session cookie (ADR tech/0001), created via `jose`/`iron-session` — never hand-rolled crypto |
| V4 Access Control | yes | `proxy.ts` optimistic check + Data Access Layer `verifySession()` authoritative check (Pattern 2); every Route Handler independently re-verifies session per Next.js's own guidance ("Proxy redirects... but every Server Action, Route Handler... must independently authenticate") [CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy, fetched 2026-08-10] |
| V5 Input Validation | yes | Zod schemas on sign-up/sign-in forms (DEFAULTS.md C-005), validated both client-side (RHF resolver) and server-side (Route Handler re-validates before forwarding) |
| V6 Cryptography | yes | Session cookie signing/encryption via `jose` or `iron-session` (Open Question 4) — never hand-rolled HMAC/JWT logic |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| XSS-based credential theft via `localStorage`/`sessionStorage` token | Information Disclosure | httpOnly cookie (unreadable from JS) — already the entire reason ADR tech/0001 rejected the bearer-token-in-storage alternative |
| CSRF on state-changing BFF endpoints (`POST /api/auth/signin`, `PUT /api/users/me/theme`) | Tampering | `SameSite=Lax` blocks the cookie from being sent on cross-site `POST`/`PUT` requests initiated via `fetch`/form-submit from another origin; `SameSite=Lax` still allows top-level cross-site *navigation* GETs, which is not a concern for these mutating endpoints since they are not GET |
| Session fixation (attacker pre-sets a session cookie before login) | Spoofing | `createSession()` must issue a *new* cookie value on every successful sign-in, never reuse an existing unauthenticated session identifier — verify this explicitly in the sign-in Route Handler implementation |
| Open redirect via the route-guard's redirect target | Tampering | `proxy.ts`'s redirect target must be a fixed, hardcoded path (`/login`, `/boards`) — never derived from an unvalidated query parameter or `Referer` header |
| CVE-2025-29927-class middleware/proxy bypass (a known historical Next.js middleware auth-bypass vulnerability) | Elevation of Privilege | Defense-in-depth: never rely on `proxy.ts` alone for authorization — always re-check `verifySession()` inside the actual Route Handler/Server Component, per the DAL pattern already mandated by Next.js's own docs and cited in ADR tech/0001's sources |

## Sources

### Primary (HIGH confidence)
- `npm view <package> version` / `deprecated` / `scripts.postinstall` — direct npm registry
  queries run in this session, 2026-08-10, for every package listed in Standard Stack and the
  Package Legitimacy Audit.
- `gsd-tools query package-legitimacy check` — automated legitimacy scan run in this session,
  2026-08-10.

### Secondary (MEDIUM confidence — official docs fetched directly this session)
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy — fetched 2026-08-10
  (v16.3.0, lastUpdated 2026-08-04): confirms `middleware.ts` → `proxy.ts` rename, cookie API,
  execution order, runtime defaults.
- https://nextjs.org/docs/app/guides/authentication — fetched 2026-08-10 (v16.3.0, lastUpdated
  2026-08-07): DAL pattern, session cookie recommended options, `jose`/`iron-session` naming,
  Proxy-as-optimistic-check-only guidance, CVE-class defense-in-depth warning.
- https://base-ui.com/llms.txt — fetched 2026-08-10: full current component list, confirms
  Button/Checkbox/Switch/Field/Select/Menu/Dialog/Toolbar exist, no dedicated IconButton.
  https://mswjs.io/docs/integrations/node — fetched 2026-08-10: `setupServer().listen()` as the
  general Node.js interception mechanism (did not itself cover `instrumentation.ts` — that part
  is Tertiary, see below).
- https://styledictionary.com/info/dtcg/ — fetched 2026-08-10: DTCG `$value`/`$type`/
  `$description`/alias syntax, and the "2025.10 spec not fully supported in v5 yet" caveat.

### Tertiary (LOW confidence — WebSearch synthesis, not independently re-verified against a
primary source this session)
- Vitest 4 Browser Mode package split (`@vitest/browser-playwright` as a separate required
  package) — WebSearch synthesis; version-confirmed present on npm registry, but the exact
  config API was not fetched from vitest.dev directly.
- Husky v9+ `init`/no-shebang command changes — WebSearch synthesis of community posts, not
  fetched directly from github.com/typicode/husky's own docs.
- `instrumentation.ts` + `NEXT_RUNTIME === "nodejs"` gating for MSW Node-mode startup —
  WebSearch synthesis of multiple independent blog posts and a community demo repo
  (github.com/laststance/next-msw-integration); not confirmed against MSW's own official docs or
  Next.js's own `instrumentation.ts` reference page in this session.
- ESLint 9 EOL date (2026-08-06) — WebSearch synthesis referencing ESLint's own v10 release
  announcement; not independently re-fetched from eslint.org in this session (already cited once
  in ADR tech/0009's own research, cross-referenced here).

## Metadata

**Confidence breakdown:**
- Standard stack (package names/versions): HIGH — every version cross-checked live against npm
  registry this session, including two corrections (Base UI rename, Vitest 4 provider split)
  that training knowledge alone would have missed.
- Architecture (BFF composition, proxy.ts, MSW runtime interception): MEDIUM — `proxy.ts` and
  the DAL pattern are directly verified against current Next.js docs (HIGH within this
  sub-area), but the BFF pass-through composition (Pattern 1) and MSW's `instrumentation.ts`
  wiring (Pattern 3) are this researcher's synthesis/community patterns, not confirmed against a
  single authoritative source — flagged in the Assumptions Log.
- Pitfalls: HIGH for the two npm-verified pitfalls (Base UI rename, `middleware.ts` deprecation);
  MEDIUM for the MSW-runtime and DTCG-composite-token pitfalls (reasoned from verified facts but
  not observed first-hand in a running project).
- Missing-file gap (OpenAPI contract, Figma PDF): this is not a confidence rating but a hard
  blocker for Plan 2's fine-grained design — surfaced prominently in Open Questions and
  Environment Availability rather than glossed over.

**Research date:** 2026-08-10
**Valid until:** 14 days (2026-08-24) — this phase's stack includes several fast-moving pieces
(Next.js 16.x point releases, Vitest 4.x, Storybook 10.x, Tailwind v4.x) that saw multiple
relevant changes in the weeks immediately preceding this research session; re-verify package
versions before Plan 1 execution if planning is delayed past this window.
