---
phase: 01-foundation-auth-preferences
reviewed: 2026-08-19T00:00:00Z
depth: standard
files_reviewed: 143
files_reviewed_list:
  - .env.example
  - .gitattributes
  - .github/workflows/ci.yml
  - .github/workflows/visual-baselines.yml
  - .gitignore
  - .gitleaks.toml
  - .prettierignore
  - .prettierrc.json
  - .storybook/main.ts
  - .storybook/preview-annotations.tsx
  - .storybook/preview.tsx
  - .storybook/vitest.setup.ts
  - CONVENTIONS.md
  - README.md
  - SETUP.md
  - app/(auth)/layout.tsx
  - app/(auth)/login/page.tsx
  - app/(auth)/register/page.tsx
  - app/(dashboard)/boards/[boardId]/page.tsx
  - app/(dashboard)/boards/page.tsx
  - app/(dashboard)/error.test.tsx
  - app/(dashboard)/error.tsx
  - app/(dashboard)/layout.tsx
  - app/global-error.test.tsx
  - app/global-error.tsx
  - app/layout.tsx
  - app/page.tsx
  - docs/adr/tech/0002-client-data-fetching-strategy.md
  - docs/adr/tech/0004-openapi-mock-server.md
  - docs/adr/tech/0017-auth-server-actions-carve-out.md
  - docs/adr/tech/0018-no-mock-server.md
  - docs/api/kanban-board-openapi.json
  - e2e/auth.e2e.spec.ts
  - e2e/fixtures.ts
  - e2e/global-setup.ts
  - e2e/route-guard.e2e.spec.ts
  - e2e/test-env.ts
  - e2e/theme.e2e.spec.ts
  - eslint.config.mjs
  - lint-staged.config.mjs
  - next.config.ts
  - package.json
  - playwright.config.ts
  - pnpm-lock.yaml
  - pnpm-workspace.yaml
  - postcss.config.mjs
  - proxy.ts
  - scripts/build-tokens.mjs
  - scripts/check-routes.mjs
  - scripts/serve-static.mjs
  - src/components/layout/.gitkeep
  - src/components/layout/error-fallback/error-fallback.stories.tsx
  - src/components/layout/error-fallback/error-fallback.test.tsx
  - src/components/layout/error-fallback/error-fallback.tsx
  - src/components/ui/.gitkeep
  - src/components/ui/button/button.stories.tsx
  - src/components/ui/button/button.test.tsx
  - src/components/ui/button/button.tsx
  - src/components/ui/checkbox/checkbox.stories.tsx
  - src/components/ui/checkbox/checkbox.test.tsx
  - src/components/ui/checkbox/checkbox.tsx
  - src/components/ui/dropdown/dropdown.stories.tsx
  - src/components/ui/dropdown/dropdown.test.tsx
  - src/components/ui/dropdown/dropdown.tsx
  - src/components/ui/icon-button/icon-button.stories.tsx
  - src/components/ui/icon-button/icon-button.test.tsx
  - src/components/ui/icon-button/icon-button.tsx
  - src/components/ui/modal/modal.stories.tsx
  - src/components/ui/modal/modal.test.tsx
  - src/components/ui/modal/modal.tsx
  - src/components/ui/switch/switch.stories.tsx
  - src/components/ui/switch/switch.test.tsx
  - src/components/ui/switch/switch.tsx
  - src/components/ui/text-field/text-field.stories.tsx
  - src/components/ui/text-field/text-field.test.tsx
  - src/components/ui/text-field/text-field.tsx
  - src/features/.gitkeep
  - src/features/auth/action-state.ts
  - src/features/auth/actions.ts
  - src/features/auth/actions.unit.test.ts
  - src/features/auth/components/auth-card.tsx
  - src/features/auth/components/sign-in-form.stories.tsx
  - src/features/auth/components/sign-in-form.test.tsx
  - src/features/auth/components/sign-in-form.tsx
  - src/features/auth/components/sign-out-button.test.tsx
  - src/features/auth/components/sign-out-button.tsx
  - src/features/auth/components/sign-up-form.stories.tsx
  - src/features/auth/components/sign-up-form.test.tsx
  - src/features/auth/components/sign-up-form.tsx
  - src/features/auth/model.ts
  - src/features/auth/model.unit.test.ts
  - src/features/auth/schemas.ts
  - src/features/auth/schemas.unit.test.ts
  - src/features/theme/actions.ts
  - src/features/theme/actions.unit.test.ts
  - src/features/theme/components/theme-toggle.stories.tsx
  - src/features/theme/components/theme-toggle.test.tsx
  - src/features/theme/components/theme-toggle.tsx
  - src/features/theme/hooks/use-theme-preference.ts
  - src/hooks/.gitkeep
  - src/hooks/use-overflow-indicator.test.tsx
  - src/hooks/use-overflow-indicator.ts
  - src/lib/client/query-client.tsx
  - src/lib/core/api-contract/generated-types.ts
  - src/lib/core/api-contract/problem-detail.ts
  - src/lib/core/api-contract/problem-detail.unit.test.ts
  - src/lib/core/routing/routes.ts
  - src/lib/core/routing/routes.unit.test.ts
  - src/lib/core/styling/cn.ts
  - src/lib/core/viewport/viewport-breakpoints.ts
  - src/lib/server/dal.ts
  - src/lib/server/server-client.integration.test.ts
  - src/lib/server/server-client.ts
  - src/lib/server/session-cookie.ts
  - src/lib/server/session-cookie.unit.test.ts
  - src/lib/server/session.test.ts
  - src/lib/server/session.ts
  - src/lib/server/theme.ts
  - src/styles/globals.css
  - src/styles/tokens.css
  - src/test-utils/actions-storybook-stub.ts
  - src/test-utils/api-base-url.ts
  - src/test-utils/describe-for-each-device.ts
  - src/test-utils/render-with-providers.tsx
  - src/test-utils/server-only-stub.ts
  - src/test-utils/theme-actions-storybook-stub.ts
  - src/types/props.ts
  - style-dictionary.config.mjs
  - tokens/.gitkeep
  - tokens/breakpoint.tokens.json
  - tokens/color.dark.tokens.json
  - tokens/color.light.tokens.json
  - tokens/color.tokens.json
  - tokens/radius.tokens.json
  - tokens/shadow.tokens.json
  - tokens/spacing.tokens.json
  - tokens/style-dictionary.build.test.ts
  - tokens/typography.tokens.json
  - tsconfig.json
  - vercel.json
  - visual/primitives.visual.spec.ts
  - vitest.config.ts
  - vitest.setup.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-08-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 143
**Status:** issues_found

## Summary

This is the first code-review pass over the entire Phase 01 foundation (auth, session bridging,
theme persistence, design-system primitives, routing scaffolding). Review prioritized the
security-critical surface per the review brief — `src/lib/server/session.ts`,
`session-cookie.ts`, `server-client.ts`, `dal.ts`, `proxy.ts`, the auth feature's
`actions.ts`/`action-state.ts`, and `proxy.ts` — plus the theme-persistence/optimistic-update path,
with a lighter-touch scan across UI primitives, config, and generated/token files.

Overall assessment: this is an unusually disciplined codebase. The session/JWT handling, the
upstream-credential bridging in `server-client.ts`, the DAL's authoritative
`verifySession()` check (defense against the CVE-2025-29927 proxy-bypass class), and the
account-enumeration-resistant auth error messages are all implemented correctly and are backed by
thorough unit/e2e tests (tampered-cookie, expired-cookie, no-credential-on-success, JWT-freshness
tests all present and correct). No SQL/command injection, XSS, hardcoded secrets, or auth-bypass
issues were found. No `eval`, no `dangerouslySetInnerHTML`, no empty catch blocks, no `console.log`
debug artifacts, and no `as any` casts were found anywhere in `src/` or `app/`.

The issues found are lower-severity: a real (if low-exposure) path-traversal gap in a dev/CI-only
static file server, a cross-account theme-preference leak on shared browsers, and one piece of
stale tooling configuration left over from the mock-server removal (ADR tech/0018).

## Warnings

### WR-01: Static file server used by the visual-regression test harness has no path-traversal containment

**File:** `scripts/serve-static.mjs:31`
**Issue:** `serve-static.mjs` builds the served file path as `path.join(root, decodeURIComponent(requestUrl.pathname))` with no check that the resolved path stays inside `root`. A request path containing `../` segments (e.g. `GET /../../../../some/file`) is not rejected — `path.join` normalizes `..` segments but does not clamp the result to `root`, so a request can resolve to an absolute path outside the served directory and have its contents streamed back over HTTP.
This server is only ever spawned locally/in CI as the Playwright `visual` project's `webServer` (bound to `localhost`, serving pre-built `storybook-static` output — see `playwright.config.ts:37-41`), so the practical exposure is low: an attacker would need to already have network access to the CI runner or local dev machine while the server is running. It is still a genuine directory-traversal bug in code that is a real (if minimal) HTTP server, not a hypothetical.
**Fix:**
```js
const resolved = path.join(root, decodeURIComponent(requestUrl.pathname));
const relative = path.relative(root, resolved);
if (relative.startsWith("..") || path.isAbsolute(relative)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
}
let filePath = resolved;
```

### WR-02: Theme preference leaks across accounts sharing a browser

**File:** `app/(dashboard)/layout.tsx:33-34`, `src/features/theme/actions.ts:68`
**Issue:** `DashboardLayout` prefers the `theme` cookie over the freshly-verified session's own `identity.theme` (`const initialTheme = cookieTheme ?? identity.theme;`). The `theme` cookie is intentionally non-httpOnly, browser-scoped, and not tied to any particular account (`src/lib/server/theme.ts`), and `signOutAction` (`src/features/auth/actions.ts:182-191`) never clears it. On a shared or reused browser, if User A toggles the theme (writing the cookie) and then signs out, and User B signs in afterward on the same browser without ever toggling the switch themselves, `DashboardLayout` will render **User A's** stale theme preference instead of User B's actual stored preference (`identity.theme`, freshly read from the backend at sign-in) — even though the account's own persisted theme is available and correct. The one-year cookie expiry (`THEME_COOKIE_MAX_AGE_SECONDS`) makes this a durable, not transient, cross-account desync.
This is a correctness/UX bug, not a security vulnerability (no data crosses accounts beyond a display preference), but it directly contradicts the comment's own stated intent ("falling back to `identity.theme` covers the one case with no cookie yet") — that fallback only covers a browser that has *never* seen the cookie, not a browser that has seen it for a *different* account.
**Fix:** Either clear the theme cookie in `signOutAction`, or only trust the cookie when it was written under the current session (e.g. re-derive the cookie value only after confirming it matches `identity.theme` at sign-in time, or drop the cookie's `maxAge` scope to session-length parity). Clearing it on sign-out is the simplest fix:
```ts
// src/features/auth/actions.ts
import { clearThemeCookie } from "@/lib/server/theme"; // new helper alongside writeThemeCookie

export const signOutAction = async (...) => {
    await session.destroy();
    await clearThemeCookie();
    redirect(ROUTE.SIGN_IN);
};
```

### WR-03: Stale MSW/mock-server tooling reference left in ESLint config after ADR tech/0018 removed the mock server

**File:** `eslint.config.mjs:416-417`
**Issue:** `globalIgnores` still contains `"public/mockServiceWorker.js"` with the comment "MSW's own generated browser worker script (`msw init public/ --save`, plan 01-10) — vendored, never hand-edited." ADR tech/0018 ("No mock server; every layer dials the real backend") superseded ADR tech/0004 and removed MSW from the project entirely — confirmed: `msw` is absent from `package.json` dependencies/devDependencies, and `public/mockServiceWorker.js` does not exist anywhere in the working tree (only stale copies remain under `node_modules/.pnpm/msw@2.15.0.../` and the Storybook build output `storybook-static/mockServiceWorker.js`, neither of which this ignore entry needs to cover). CONVENTIONS.md itself states the enforcement expectation for ADR tech/0018 as "a repository-wide grep for a request-interception/fake-server dependency ... is expected to find nothing" — this leftover ignore entry and its comment are exactly the kind of residue that check is meant to catch, and they will actively mislead a future contributor into thinking MSW is still part of this project's toolchain.
**Fix:** Remove the stale ignore entry and comment:
```js
// eslint.config.mjs — delete these two lines from globalIgnores([...])
// MSW's own generated browser worker script (`msw init public/ --save`, plan 01-10) — vendored, never hand-edited.
"public/mockServiceWorker.js",
```

## Info

### IN-01: `readFormField` helper duplicated verbatim between sign-in and sign-up forms

**File:** `src/features/auth/components/sign-in-form.tsx:28-31`, `src/features/auth/components/sign-up-form.tsx:30-33`
**Issue:** The `readFormField` helper (reads a `FormData` field, coercing anything non-string to `""`) is copy-pasted identically in both form components, each with its own near-identical doc comment. Both files already sit under `src/features/auth/components/`, so a shared home is directly available without crossing a feature boundary.
**Fix:** Extract to a small shared module, e.g. `src/features/auth/components/read-form-field.ts`, and import it from both forms.

### IN-02: `session.ts`'s `secure` cookie flag is gated on `NODE_ENV`, which also governs a locally-built production run

**File:** `src/lib/server/session.ts:105-113`, `src/lib/server/theme.ts:50-54`
**Issue:** `secure: process.env.NODE_ENV !== "development"` is documented as intentionally targeting "only a local `next dev` over http://localhost needs this relaxed." However `NODE_ENV` is also `"production"` for a locally-run `pnpm build && pnpm start` (e.g. reproducing a CI/prod build on a laptop over plain `http://localhost`), which is a realistic local-verification workflow this project's own `playwright.config.ts` `e2e` webServer performs (`pnpm build && pnpm exec next start`, against `http://localhost:4173`). In that mode the session cookie is marked `Secure` while being served over plain HTTP, so the browser will silently refuse to store it — not a vulnerability (fails closed, not open), but worth flagging since it's the kind of gap that produces a confusing "sign-in redirects back to sign-in" symptom during local e2e debugging outside of `next dev` specifically. (The e2e suite itself works today because `E2E_BASE_URL` is `http://localhost`, not `https`, and yet the tests pass — this is likely tolerated because `secure` cookies over `http://localhost` specifically are exempted by some browsers/Playwright's Chromium as a "potentially trustworthy origin"; this is not universally true across all HTTP clients/browsers, so it's fragile rather than definitively broken.)
**Fix:** No action required if this is an accepted, documented trade-off; if not already covered by an ADR, consider gating on an explicit `IS_LOCAL_HTTP`-style flag instead of reusing `NODE_ENV`, to decouple "development source files" from "served over plaintext HTTP."

---

_Reviewed: 2026-08-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
