# Phase 1: Foundation, Auth & Preferences - Pattern Map

**Mapped:** 2026-08-10
**Files analyzed:** 0 existing files modified; ~30+ new files/dirs to be created (Plan 1 scope: scaffold, tokens, harness, 7 primitives; Plan 2+ scope: BFF auth, route guard, theme)
**Analogs found:** 0 / N — **this is a greenfield repository**

## Greenfield Notice

This repository currently contains **only planning documents at the repo root**
(`PROJECT.md`/`CONTEXT.md`/`CONVENTIONS.md`/`DEFAULTS.md`/`PRD.md`/`HIGH-LEVEL-ARCHITECTURE.md`/
`docs/adr/**`/`.planning/**`). Verified directly:

```
$ ls -la  → no package.json, no src/, no app/, no tokens/, no node_modules
$ ls src  → "No such file or directory"
```

There is **no existing application code of any kind** — no controllers, components, services,
models, middleware, config files, or tests. Phase 1 Plan 1 (per CONTEXT.md D-27) *is* the act of
creating the first reusable assets (scaffold, tokens, harness, primitives) that every later phase
and every later analog-search will build on.

**Consequence for this document:** There is no "closest existing analog" to point to for any file
in Phase 1 — searching the codebase for role/data-flow matches (this agent's normal Step 3) turns
up nothing, and fabricating a plausible-looking analog would mislead the planner. Instead, this
document maps each planned file to the **authoritative external pattern source** the planner
should copy from: CONVENTIONS.md (project-mandated folder/naming rules), CONTEXT.md's decisions
(D-01 through D-28), and RESEARCH.md's Architecture Patterns / Code Examples sections (concrete
code the researcher already verified against current library docs).

Once Plan 1's first primitive (Button) and first token file exist, they become the real analogs
for every subsequent primitive/token file within Phase 1 itself — but that is Plan 1's own
internal sequencing (D-14's build order), not something this pre-planning pattern map can source
from, since none of it exists yet at mapping time.

## File Classification

| New File (Plan 1) | Role | Data Flow | Pattern Source | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `tokens/*.tokens.json` (6 files, D-01) | config | transform (build input) | RESEARCH.md "Style Dictionary DTCG token authoring" example; CONVENTIONS.md token pipeline section | no analog — spec-driven |
| Style Dictionary config (`style-dictionary.config.*`) | config | transform (batch build) | style-dictionary docs cited in RESEARCH.md; CONVENTIONS.md `styles/` output target | no analog |
| `src/styles/*.css` (generated `@theme` output, D-08) | config | transform (generated artifact) | Tailwind v4 `@theme` docs (RESEARCH.md Standard Stack) | no analog — generated, not hand-authored |
| `src/components/ui/button/{button.tsx,button.stories.tsx,button.test.tsx}` | component | request-response (UI event → render) | CONVENTIONS.md primitive folder pattern; Base UI Button docs; D-15/D-16/D-18/D-20 | no analog — first primitive built |
| `src/components/ui/icon-button/{...}` | component | request-response | Base UI Button wrap (D-15); pattern established by `button/` once it exists (internal Plan-1 sequencing, D-14) | no analog at map time |
| `src/components/ui/text-field/{...}` | component | request-response | Base UI Field+Input (D-15); D-17 error/invalid state | no analog |
| `src/components/ui/checkbox/{...}` | component | request-response | Base UI Checkbox (D-15); D-17 error state | no analog |
| `src/components/ui/switch/{...}` | component | request-response | Base UI Switch (D-15) | no analog |
| `src/components/ui/dropdown/{...}` | component | request-response | Base UI Select/Menu compound API (D-19) | no analog |
| `src/components/ui/modal/{...}` | component | request-response | Base UI Dialog (D-15) | no analog |
| Vitest config (`vitest.config.ts` / workspace) | config | — | Vitest 4 Browser Mode docs (RESEARCH.md Standard Stack, A4) | no analog |
| Storybook config (`.storybook/main.ts`, `preview.ts`) | config | — | Storybook 10 + `@storybook/nextjs` + `addon-a11y` docs | no analog |
| Playwright visual config (`playwright.config.ts`) | config | — | ADR tech/0008; `toHaveScreenshot` docs | no analog |
| `.github/workflows/ci.yml` | config | batch (CI pipeline) | D-26b/c/d; DEFAULTS.md C-012 | no analog |
| `.husky/pre-commit`, `lint-staged.config.*` | config | event-driven (git hook) | D-26e/f/g/h; Husky v9 `pnpm exec husky init` (RESEARCH.md, A5) | no analog |
| `eslint.config.*` (flat config), `.prettierrc*` | config | — | D-26i through D-26v; ESLint 10 flat-config requirement (RESEARCH.md State of the Art) | no analog |

| New/Modified File (Plan 2+, out of Plan 1 scope but same greenfield map) | Role | Data Flow | Pattern Source | Match Quality |
|-----------------------------------------------------------------------------|------|-----------|-----------------|---------------|
| `app/proxy.ts` | middleware | request-response (edge/node redirect) | RESEARCH.md Architecture Patterns, Pattern 2 (full code example, CITED against nextjs.org) | no analog — but concrete example already provided |
| `app/instrumentation.ts` | config | event-driven (server startup hook) | RESEARCH.md Architecture Patterns, Pattern 3 | no analog — concrete example provided, flagged as community-derived (verify before use) |
| `app/api/auth/{signup,signin,signout}/route.ts` | route/controller | request-response | RESEARCH.md Architecture Patterns, Pattern 1 (BFF pass-through, `signin/route.ts` example) | no analog — concrete example provided, response shape flagged [ASSUMED] |
| `app/api/users/me/theme/route.ts` | route/controller | request-response (CRUD-ish, single PUT) | Same Pattern 1 shape, mirrored for theme | no analog |
| `src/lib/api/server-client.ts` | service | request-response | RESEARCH.md Pattern 1 (`externalApi` `openapi-fetch` client example) | no analog |
| `src/lib/session.ts` (`createSession`/`decrypt`) | utility | transform (encode/decode) | RESEARCH.md Pattern 1 + Pattern 2 examples; `jose`/`iron-session` docs (open choice, see Open Questions) | no analog |
| `src/lib/mocks/node-server.ts` (MSW `setupServer`) | service | event-driven (request interception) | RESEARCH.md Architecture Patterns, Pattern 3 | no analog |
| `src/features/auth/components/{sign-up-form,sign-in-form}.tsx` | component | request-response (form submit) | React Hook Form + Zod pattern (DEFAULTS.md C-005); will use TextField/Button/Checkbox primitives from Plan 1 once built | no analog yet — depends on Plan 1 primitives existing first |
| `src/features/auth/hooks/{use-session,use-sign-in,use-sign-up}.ts` | hook | request-response (TanStack Query mutation/query) | ADR tech/0002 (client calls own Route Handlers via query/mutation hook, never the generated client directly) | no analog |

## Pattern Assignments

### Token pipeline files (`tokens/*.tokens.json`, Style Dictionary config)

**No codebase analog — first token authoring in the project.**

**Copy from RESEARCH.md "Style Dictionary DTCG token authoring" (primitive + semantic tiers):**
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
// semantic layer (D-01 split by category; D-02 two-tier primitive→semantic)
{
  "color": {
    "bg": {
      "primary": { "$value": "{color.blue.600}", "$type": "color" }
    }
  }
}
```
Apply D-01's category split (`color`, `spacing`, `typography`, `radius`, `shadow`, `breakpoint`
as six separate files), D-04's numeric spacing scale, D-05's composite typography token shape,
D-09's mode-scoped (`:root`/`.dark`) semantic values.

**Caveat (RESEARCH.md Pitfall 4):** author the first composite typography token and verify Style
Dictionary's generated CSS contains all four sub-values (family/size/weight/line-height) before
building the rest of the typography scale — DTCG 2025.10 composite-type support is still "work in
progress" in Style Dictionary v5.

---

### First primitive: `src/components/ui/button/button.tsx`

**No codebase analog — this is literally the first component in the project.**

**Structure to follow (CONVENTIONS.md primitive folder pattern + this phase's decisions):**
- Folder: `src/components/ui/button/{button.tsx, button.stories.tsx, button.test.tsx}` — co-located, kebab-case (D-23, D-26t).
- Wrap Base UI's `Button` (`@base-ui/react`, **not** the deprecated `@base-ui-components/react** — RESEARCH.md Pitfall 1). No dedicated Base UI IconButton exists — `icon-button` also wraps Base UI's `Button` (RESEARCH.md Standard Stack table).
- `const Button = (props: ButtonProps) => {...}` — named export, `const` arrow function, no `React.FC` (D-26k/D-26l/D-26j).
- Props typed with `type ButtonProps = {...}` (D-26i).
- Variant/size styling via `class-variance-authority` (D-26u); `sm`/`md`/`lg` size prop (D-18).
- Accept and forward `className`, merged via `tailwind-merge` (D-26v).
- Boolean props `is`/`has` prefixed, event handlers `on`-prefixed (D-26s) — matches Base UI's own naming.
- Consume only semantic tokens (`color-bg-primary`, etc.) via Tailwind classes — never primitive tokens directly (D-02).

**Test file (`button.test.tsx`):** Vitest Browser Mode + `@testing-library/react` (role/label
queries) + `@testing-library/jest-dom` matchers (D-20, D-26). Exercise clicks, keyboard nav,
disabled/error-state rendering.

**Story file (`button.stories.tsx`):** visual-only, default/hover/focus/disabled/error states
(D-16); no play-function interaction tests (D-25) — those live only in `button.test.tsx`.

Every subsequent primitive (icon-button → text-field → checkbox → switch → dropdown → modal,
D-14's build order) should copy `button/`'s established shape once it exists — that becomes the
real in-project analog for primitives 2 through 7, but is outside this document's scope since
`button/` doesn't exist at mapping time.

---

### `app/proxy.ts` (middleware, request-response) — Plan 2+

**No codebase analog. RESEARCH.md provides a complete, source-cited example** (Architecture
Patterns, Pattern 2 — [CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy and
nextjs.org/docs/app/guides/authentication, fetched 2026-08-10]):

```typescript
// proxy.ts — NOT middleware.ts (deprecated file convention as of Next.js 16.0.0)
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

const protectedRoutes = ["/boards"];
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
**Critical:** file must be named `proxy.ts`, not `middleware.ts` (Next.js 16 renamed the
convention — RESEARCH.md Pitfall 2).

---

### `app/api/auth/signin/route.ts` (route/controller, request-response) — Plan 2+

**No codebase analog. RESEARCH.md provides a complete example** (Architecture Patterns, Pattern
1, marked **[ASSUMED]** — the researcher's own synthesis of ADR tech/0001 + tech/0002, not itself
independently sourced; flag for explicit confirmation before Plan 2 detail planning):

```typescript
// lib/api/server-client.ts — used ONLY inside Route Handlers
import createClient from "openapi-fetch";
import type { paths } from "@/lib/api/generated-types";

export const externalApi = createClient<paths>({
  baseUrl: process.env.EXTERNAL_API_BASE_URL,
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
`signup`/`signout`/`users/me/theme` route handlers should mirror this same shape (own
`route.ts`, calls `externalApi`, then either creates/destroys a session or returns a plain
success payload).

**Blocker the planner must account for:** `kanban-board-openapi.json` (the contract this pattern
depends on for typed request/response shapes) is not present in the repo — see RESEARCH.md Open
Questions #1. The signup/signin exact response body shape is currently a best-guess from
`HIGH-LEVEL-ARCHITECTURE.md`'s prose only.

---

### `app/instrumentation.ts` (config, event-driven) — Plan 2+

**No codebase analog. RESEARCH.md provides an example**, flagged as community-derived / not
independently confirmed against MSW's own docs (Architecture Patterns, Pattern 3):

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { server } = await import("@/lib/mocks/node-server");
    server.listen({ onUnhandledRequest: "error" });
  }
}
```
Keep the `server.listen()` call strictly inside the `NEXT_RUNTIME === "nodejs"` branch with a
dynamic `import()`, not a static top-level import (RESEARCH.md Pitfall 5).

## Shared Patterns

### Code style (applies to every new file in this phase)
**Source:** CONTEXT.md D-26i through D-26v (no codebase source — first files in project)
- `type` over `interface` (D-26i)
- Named exports except Next.js special files (`page.tsx`/`layout.tsx`/`route.ts`) (D-26j)
- `const` arrow function components (D-26k), no `React.FC` (D-26l)
- kebab-case file names everywhere (D-26t)
- No barrel files — import directly from source file (D-26r)
- Path aliases (`@/features/...`, `@/components/...`, `@/lib/...`), no relative imports (D-26q)
- Boolean props `is`/`has` prefix, event-handler props `on` prefix (D-26s)

### Base UI wrapping (applies to all 7 primitives)
**Source:** CONTEXT.md D-15; RESEARCH.md Standard Stack (package rename correction)
- Import from `@base-ui/react` (1.7.0) — **not** `@base-ui-components/react` (deprecated,
  RESEARCH.md Pitfall 1).
- Base UI component per primitive: Button→Button, Checkbox→Checkbox, Switch→Switch,
  TextField→Field+Input, Dropdown→Select/Menu, Modal→Dialog, IconButton→Button (no dedicated
  component).

### Variant styling (applies to all 7 primitives)
**Source:** CONTEXT.md D-26u/D-26v — `class-variance-authority` for variant/size/state axes,
`tailwind-merge` for safe `className` prop merging.

### Semantic-token-only consumption (applies to all primitives and any future styled component)
**Source:** CONTEXT.md D-02 — components read semantic tokens (`color-bg-primary`,
`color-text-danger`) only, never primitive tokens (`color.blue.600`) directly.

### BFF pass-through (applies to every Plan 2+ Route Handler)
**Source:** RESEARCH.md Architecture Patterns, Pattern 1 [ASSUMED — flag for confirmation]
- Client components/hooks call same-origin Route Handlers only, never the generated
  `openapi-fetch` client directly (ADR tech/0001 + tech/0002 composed).
- The generated `externalApi` client instance lives in `src/lib/api/server-client.ts` and is
  imported only inside `route.ts` files.

## No Analog Found

Every file in this phase has no codebase analog — this is a greenfield repository. Restated here
per the standard PATTERNS.md format:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| All `tokens/*.tokens.json` | config | transform | No prior token authoring exists; hand-transcribed from a design source (Figma PDF) not currently in the repo — see RESEARCH.md Open Question #2 |
| All `src/components/ui/**` (7 primitives) | component | request-response | No prior component exists; `button/` is the literal first one (D-14 build order) |
| `app/proxy.ts`, `app/instrumentation.ts`, `app/api/**/route.ts` | middleware/route | request-response, event-driven | No prior server-side code exists; RESEARCH.md supplies cited/assumed code examples in lieu of an in-repo analog |
| All config files (Vitest, Storybook, Playwright, ESLint, Prettier, Husky, CI workflow) | config | — | No prior tooling config exists; RESEARCH.md's Standard Stack + Installation section names exact versions/packages to configure against |

**Planner guidance:** Since no in-repo analog exists for any Phase 1 file, plan actions should
cite **RESEARCH.md's Architecture Patterns / Code Examples sections** and **CONTEXT.md's specific
decision IDs (D-01 through D-28)** as the pattern source, exactly as excerpted above — not a
fabricated "closest file" reference. Once Plan 1's scaffold and first primitive/token files exist
and are committed, they become real in-project analogs for every file that follows within this
same phase (e.g., `icon-button/` should copy `button/`'s finished shape) — that internal
sequencing is the planner's/implementer's responsibility during Plan 1 execution, not something
this pre-execution pattern map can source from.

## Metadata

**Analog search scope:** Repository root (`ls -la`), `src/` (confirmed absent). No `Glob`/`Grep`
codebase search was needed beyond this — an empty `src/` tree makes further role/data-flow
searching moot.
**Files scanned:** Repo root directory listing only (10 files, all planning docs; no application
code found).
**Pattern extraction date:** 2026-08-10

---

# Round 3 Gap Closure Pattern Map (2026-08-18 addendum)

**Mapped:** 2026-08-18
**Scope:** GC-18 through GC-24 (`01-CONTEXT.md`) — session-cookie bridging, auth Server Actions
migration, OpenAPI contract regen, MSW/mock-store removal, CI-only real-backend tests, ADR
0002 carve-out.
**Files analyzed:** 12 existing files (being rewritten or deleted) + ~6 new files
**Analogs found:** 12 / 12 — unlike the 2026-08-10 map above, 27 of Phase 1's 29 plans have now
shipped real code; this addendum points at that real code as ground truth, not at RESEARCH.md
prose alone.

**Companion reference (not a codebase analog):** `C:\Dev\Repos\kanban-board-backend`'s
`docs/AUTH_FLOWS.md` + `docs/diagrams/auth-{signin,signup}-scenario.mmd` document the real
backend's session-cookie contract (JSESSIONID, `ProblemDetail` error codes, 2-session ceiling).
It is a different repo/language (Spring Boot) — read it for the *contract*, never as a pattern to
copy Next.js/TypeScript code shape from.

## File Classification (round 3)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|-----------------|---------------|
| `src/lib/session.ts` (extend `SessionPayload`) | server-only utility (session codec) | transform (JWT encode/decode) | itself — current file, extend in place | exact (existing file, additive edit) |
| `src/lib/api/server-client.ts` (add `.use()` middleware) | server-only service (typed HTTP client) | request-response, cross-cutting (every call) | itself — current file, extend in place; middleware shape read from installed `openapi-fetch@0.17.0`'s own `.d.ts` | exact |
| `app/api/auth/signin/route.ts` → Server Action | route handler → Server Action (request-response) | request-response | itself (before), `use-sign-in.ts`+Next.js `useActionState` docs pattern (after) | exact (rewrite of existing file) |
| `app/api/auth/signup/route.ts` → Server Action | route handler → Server Action | request-response | itself (before) | exact (rewrite) |
| `app/api/auth/signout/route.ts` → Server Action | route handler → Server Action | request-response | itself (before) — simplest of the three, no upstream call | exact (rewrite) |
| `src/features/auth/api/auth-api.ts` (deleted, folded into Server Actions) | client API wrapper (TanStack Query mutationFn source) | request-response | itself — read as "before" ground truth for what the Server Action inlines | exact (deletion target) |
| `src/features/auth/hooks/use-sign-in.ts`, `use-sign-up.ts` (deleted) | hook (TanStack Query mutation) | request-response | itself — read as "before"; `sign-out-button.tsx`'s inline `useMutation` is the sibling pattern being replaced the same way | exact (deletion target) |
| `src/features/auth/components/sign-out-button.tsx` (rewritten to Server Action + `useFormStatus`) | client component (mutation trigger) | request-response | itself (before) | exact (rewrite) |
| `src/lib/mocks/store.ts` + handlers + `instrumentation.ts` MSW startup (deleted) | mock service / server startup hook | event-driven (request interception) | itself — read as deletion-target ground truth | exact (deletion target) |
| `docs/adr/tech/0002-client-data-fetching-strategy.md` (amended via new entry) | doc (ADR) | — | itself, for "what reason (2) claimed" cross-reference; `docs/adr/tech/0016-named-object-parameters.md` (most recent ADR) for file-naming/structure convention of the *new* superseding ADR | role-match (structure), exact (content being superseded) |
| `.planning/phases/01-foundation-auth-preferences/01-14-PLAN.md` (theme persistence, not yet executed) | plan doc | request-response | itself — read for its existing `externalApi` dependency, not rewritten by this round | exact (dependency note only, no code change this round) |
| `.github/workflows/ci.yml` (add `POST /admin/reset` step, repoint `EXTERNAL_API_BASE_URL`) | CI config | batch | itself — existing `e2e` job's workflow-scoped-secret step (session secret) is the direct sibling pattern for the new `NONPROD_RESET_TOKEN` step | exact |

## Pattern Assignments

### `src/lib/session.ts` — extend `SessionPayload` (server-only utility, transform)

**Analog:** itself, current file in full (`src/lib/session.ts:1-151`, read in full this session).

**Current shape to preserve exactly** (imports, `server-only` guard, module-scope secret
fail-fast, factory function returning `{create, verify, verifyToken, destroy}`):
```typescript
import "server-only";
import { randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export type SessionPayload = {
    id: string;
    email: string;
    displayName: string;
    theme: "LIGHT" | "DARK";
};
```
**GC-18 change:** add a `jsessionId` field (or similarly named) to `SessionPayload`, and extend
`isSessionPayload`'s runtime guard (`session.ts:36-49`) to check it — keep every other field/shape
untouched. `create`/`verify`/`verifyToken`/`destroy`'s signatures and cookie-write options
(`httpOnly`, `secure: process.env.NODE_ENV !== "development"`, `sameSite: "lax"`, absolute
`expires`) stay exactly as today — GC-18 is additive to the payload only, not a session-mechanism
redesign. Preserve the existing `createSessionService(secret)` factory pattern (testable via
constructing a throwaway instance, not a hardcoded singleton) for any new logic this round adds.

**Error-handling convention to preserve:** every JWT verify failure mode returns `null`, never
throws (`session.ts:114-120`, "every failure mode... returns null rather than throwing, so no
caller can mistake a rejection for a transient error").

---

### `src/lib/api/server-client.ts` — add cookie-bridging middleware (server-only service)

**Analog:** itself, current file in full (`src/lib/api/server-client.ts:1-31`).

**Current shape to preserve:**
```typescript
import "server-only";
import createClient from "openapi-fetch";
import type { paths } from "@/lib/api/generated-types";

const readExternalApiBaseUrl = () => {
    const baseUrl = process.env.EXTERNAL_API_BASE_URL;
    if (!baseUrl) {
        throw new Error("EXTERNAL_API_BASE_URL is not set. ... (ADR tech/0006).");
    }
    return baseUrl;
};

export const externalApi = createClient<paths>({ baseUrl: readExternalApiBaseUrl() });
```
**GC-18 change — add a `.use()` call immediately after the `createClient` call**, using the exact
middleware shape read from this repo's installed `openapi-fetch@0.17.0` type source
(`node_modules/.pnpm/openapi-fetch@0.17.0/node_modules/openapi-fetch/src/index.d.ts:145-190`,
reproduced in `01-RESEARCH.md` Finding 1):
```typescript
externalApi.use({
  onRequest: async ({ request }) => {
    const identity = await session.verify();
    if (identity?.jsessionId) {
      request.headers.set("Cookie", `JSESSIONID=${identity.jsessionId}`);
    }
    return request;
  },
  onResponse: async ({ response }) => {
    if (response.status === 401) {
      // GC-18/finding 3 — forced full sign-out path; see session.ts's destroy()
    }
    return response;
  },
});
```
Keep this as a **single module-scope `.use()` call** — GC-18 requires the mechanism to be general
(every `externalApi` caller, not auth-only), matching this file's existing single-export-instance
shape. Preserve the `readExternalApiBaseUrl()` fail-fast pattern (ADR tech/0006, no hardcoded
default) as the model for any new required-env-var reads this round adds (e.g. if a reset-token
env var is read here — it is not; that lives in CI only, per Finding 6).

**Verification-first note (carry into the plan, not just the pattern):** RESEARCH.md's Assumption
A1 flags that whether `response.headers.getSetCookie()` actually surfaces the real backend's
`Set-Cookie: JSESSIONID=...` through Next.js's patched server `fetch` is unverified — the first
task touching this file should smoke-test that directly against live nonprod before building the
rest of the middleware on top of it.

---

### `app/api/auth/signin/route.ts` → Server Action (rewrite)

**Analog:** itself — current Route Handler, read in full (`app/api/auth/signin/route.ts:1-52`).
**Note:** line 1 of the current file on disk reads `simport "server-only";` (a stray leading `s` —
matches the "flag stray file corruption" note in this repo's recent commit history). Treat this as
a pre-existing typo to fix as part of the rewrite, not a pattern to copy.

**Shape to preserve when converting to a Server Action** (validation-then-upstream-call structure,
byte-identical-response anti-enumeration comment, `resolveDisplayName` fallback call):
```typescript
import "server-only";
import { externalApi } from "@/lib/api/server-client";
import { resolveDisplayName } from "@/lib/display-name";
import { isSessionPayload, session } from "@/lib/session";
import { signInSchema, zodErrorToFieldErrors } from "@/lib/validation/auth-schemas";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

export const POST = async (request: Request): Promise<Response> => {
    const body: unknown = await request.json();
    const parsed = signInSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ errors: zodErrorToFieldErrors(parsed.error) }, { status: 400 });
    }
    const { data, error } = await externalApi.POST("/signin", { body: parsed.data });
    const upstreamError: unknown = error;
    const identity: unknown = data;
    if (upstreamError !== undefined || !isSessionPayload(identity)) {
        return Response.json({ message: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
    }
    await session.create({ ...identity, displayName: resolveDisplayName(identity) });
    return Response.json({ ok: true }, { status: 200 });
};
```
**What changes going to a Server Action:** the `POST` Route Handler signature becomes a
`"use server"` async function taking `(prevState, formData)` (per `01-RESEARCH.md` Finding 2's
`useActionState` shape); the anti-enumeration collapse (`INVALID_CREDENTIALS_MESSAGE`, unchanged
copy per GC-20) and the `resolveDisplayName` fallback call stay exactly as today; `Response.json`
returns become the discriminated `SignInActionState` return value (`{status:"error", code, message}`
per GC-20's threading of the backend's `ProblemDetail` `code`); success stops returning `{ok:true}`
and instead calls `redirect(ROUTE.BOARDS)` directly (RESEARCH.md Finding 2, replacing
`use-sign-in.ts`'s `router.push`+`router.refresh()` combo, since `redirect()` from a Server Action
already guarantees the new cookie is present on the redirected request).

---

### `app/api/auth/signup/route.ts` → Server Action (rewrite)

**Analog:** itself — current Route Handler, read in full (`app/api/auth/signup/route.ts:1-64`).

**Known bug this rewrite fixes (GC-19):** current code assumes a bare-string 200 response via
`parseAs: "text"` (`signup/route.ts:32-35`, `data` checked with `typeof data !== "string"` at
line 45) — the real backend returns 201 + `UserResponseDTO`-shaped body + `Location` header
(confirmed against `kanban-board-backend/docs/diagrams/auth-signup-scenario.mmd:47`). The
regenerated `docs/api/kanban-board-openapi.json` (GC-19, via `pnpm api:generate`) will change the
generated type for this operation — the rewrite must parse the real object shape, not a string,
and should follow `signin/route.ts`'s `isSessionPayload`-style runtime guard pattern rather than
`typeof data !== "string"`.

**Structure to otherwise preserve:** the `SIGN_UP_FAILURE_MESSAGE` single-collapsed-error-message
constant and comment explaining why (no documented duplicate-email schema); the
`resolveDisplayName(parsed.data)` fallback call (GC-02); the `DEFAULT_NEW_ACCOUNT_THEME = "LIGHT"`
constant. Same Server-Action-conversion shape as `signin` above (`"use server"`,
`useActionState`-compatible return type carrying GC-20's `code`, success via `redirect()`).

---

### `app/api/auth/signout/route.ts` → Server Action (rewrite, simplest of the three)

**Analog:** itself — current Route Handler, read in full (`app/api/auth/signout/route.ts:1-13`,
the shortest and simplest of the three: no upstream call at all, `session.destroy()` then
`{ok:true}`). This is the template for how little code GC-18's forced-full-sign-out path
(`externalApi`'s `onResponse` 401 detection, Finding 3) needs to trigger — same
`session.destroy()` call, invoked from wherever the 401 is detected.

---

### `src/features/auth/api/auth-api.ts` + `use-sign-in.ts`/`use-sign-up.ts` — deletion targets

**Analog:** themselves — read in full as the "before" ground truth the executor is replacing.

`auth-api.ts` (`1-61`) is a thin `bffApi`-typed wrapper posting to the app's own `/api/auth/...`
Route Handlers, throwing `Error(message)` on any non-2xx response (`extractMessage` helper reused
across all three functions). `use-sign-in.ts` (`1-33`) wraps `postSignIn` in a `useMutation` with
`retry: false` and an `onSuccess` doing `router.push(ROUTE.BOARDS); router.refresh()`. Both are
deleted outright once the corresponding Server Action exists — **the executor should copy their
error-message-surfacing intent (server's own message, unmodified) and their `retry: false`
philosophy for a credential submission into the new Server Action's error-state shape**, not
carry the TanStack Query mechanism itself forward.

**Test-file precedent to follow for the Server Actions' own tests:** `use-sign-in.unit.test.tsx`
(GC-07's `renderHook`-based RTL test, jsdom `unit` Vitest project) is the citable precedent for
hook/logic-level testing in this repo (per round-2 GC-12's CONVENTIONS.md addition) — a Server
Action's unit test should follow the same jsdom/`unit`-project placement and mock
`server-client.ts`'s HTTP boundary directly (GC-22), not any TanStack Query machinery.

---

### `src/features/auth/components/sign-out-button.tsx` — rewrite to Server Action + `useFormStatus`

**Analog:** itself, current file in full (`sign-out-button.tsx:1-39`) — the closest existing
"mutation-triggering button" shape in the repo (inline `useMutation`, `isDisabled`/`aria-busy`
wired to `mutation.isPending`, `Button` primitive from `@/components/ui/button/button`).

**Current shape:**
```tsx
"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button/button";
import { postSignOut } from "@/features/auth/api/auth-api";
import { ROUTE } from "@/lib/routes";

export const SignOutButton = () => {
    const router = useRouter();
    const mutation = useMutation({
        mutationFn: postSignOut,
        onSuccess: () => { router.push(ROUTE.SIGN_IN); router.refresh(); },
    });
    return (
        <Button type="button" variant="secondary" isDisabled={mutation.isPending}
            aria-busy={mutation.isPending} onClick={() => mutation.mutate()}>
            Sign Out
        </Button>
    );
};
```
**Rewrite shape:** replace `useMutation`+`onClick` with a `<form action={signOutAction}>` wrapping
the `Button` (per RESEARCH.md Finding 2's `useActionState`/`useFormStatus` split-component
pattern — `useFormStatus` must be read in a component that is a *child* of the `<form>`, not the
one rendering it, so `SignOutButton` likely splits into a form wrapper + an inner submit-status
button, mirroring the `sign-in-form.tsx`/`SubmitButton` split this round also introduces there).
Preserve the `isDisabled`/`aria-busy` wiring semantics (now sourced from `useFormStatus()`'s
`pending` instead of `mutation.isPending`) and the exact non-destructive/no-confirmation-modal
behavior documented in the existing doc comment.

---

### MSW + `src/lib/mocks/store.ts` — deletion targets (GC-22)

**Analog:** `instrumentation.ts` itself, read in full (`1-18`) — the entire file's purpose today
is starting MSW's Node interception; GC-22 deletes the whole `register()` body's dynamic import +
`server.listen()` call, leaving a Round-3 decision point (an empty/no-op `register()`, or deleting
the file entirely if nothing else uses the `instrumentation` hook — verify no other consumer
exists before deleting the file itself, not just its MSW content).

`src/lib/mocks/store.ts` (97 lines) and its sibling handlers/node-server/browser files are deleted
outright per `01-RESEARCH.md` Finding 5's full inventory table (reproduced there with exact file
list, edited-vs-deleted classification, and every config default that silently assumed MSW —
`vitest.config.ts:64`, `e2e/test-env.ts:14`, `.github/workflows/ci.yml:14-18` — that must be
repointed at nonprod). Use that finding's table directly as the deletion/edit checklist; it is
more precise than restating it here.

---

### `docs/adr/tech/0002-client-data-fetching-strategy.md` — new superseding ADR entry (GC-24)

**Analog:** `docs/adr/tech/0016-named-object-parameters.md` (most recently numbered ADR in the
repo, confirms the file-naming convention: `NNNN-kebab-case-title.md`, sequential, no gaps,
zero existing precedent for sub-numbering like `0002-1`) for structure; `0002` itself for the
specific "reason (2)" content being addressed.

**Per `01-RESEARCH.md` Finding 7's recommendation** (reasoned, not a locked decision — flag for
confirmation if the user prefers GC-24's literal `0002-1` phrasing instead): create
`docs/adr/tech/0017-auth-server-actions-carve-out.md` as the next sequential number, containing an
explicit "Supersedes/amends `tech/0002`" statement in its own body (this repo's ADRs don't use a
formal supersession field — add it as prose, following `0002`'s own `## Decision Drivers` /
`## Considered Options` / `## Decision Outcome` / `## Consequences` / `Sources:` section structure
for consistency with every other ADR in `docs/adr/tech/`).

## Shared Patterns (round 3)

### `server-only` + fail-fast env-var reads (applies to `session.ts`, `server-client.ts`, any new server module)
**Source:** `src/lib/session.ts:1,136-144`, `src/lib/api/server-client.ts:1,12-23` — both files
open with `import "server-only";`, then a required-env-var read that throws a descriptive error
naming the ADR/setup doc rather than silently defaulting. Apply this same shape to any new
server-only module this round adds (e.g. a `NONPROD_RESET_TOKEN` reader, if one lands outside CI).

### Widen-through-`unknown` for contract gaps (applies to every route/Server Action reading an upstream response)
**Source:** `app/api/auth/signin/route.ts:37-38`, `signup/route.ts:43`, `auth-api.ts`'s
`postSignOut` comment (`52-53`) — when the OpenAPI-generated type claims a field (`error`) is
always `undefined` but the runtime response can actually populate it, widen through `unknown`
first (`const upstreamError: unknown = error;`) so the type-aware ESLint tier (D-26n, strict +
type-checked) still checks the real runtime shape rather than trusting the contract's incomplete
claim. GC-19's contract regeneration should shrink how often this is needed, but the pattern stays
valid for any remaining gaps.

### Anti-enumeration collapsed error copy (applies to sign-in specifically)
**Source:** `signin/route.ts:8-16`'s `INVALID_CREDENTIALS_MESSAGE` comment and constant — one
fixed message/status for every distinct upstream failure cause (wrong password, unknown email,
and now also the 2-concurrent-session ceiling per GC-20/AUTH_FLOWS.md D-08), never a
cause-specific message. Preserve this constant and its comment verbatim in the Server Actions
rewrite; only the delivery mechanism (`Response.json` → Server Action return value) changes.

### DAL as the single source of identity (applies to any new code needing "who is signed in")
**Source:** `src/lib/dal.ts:1-19` — `verifySession`, wrapped in React's `cache()`, is the *only*
place `session.verify()` should be called from application code (Route Handlers/Server
Components/Server Actions alike). Any new Server Action needing the current user's id reads it via
`verifySession()`, not by calling `session.verify()` directly a second time.

## No Analog Found (round 3)

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.github/workflows/ci.yml`'s new `POST /admin/reset` step | CI config step | batch | No prior reset-endpoint call exists in this repo's CI; closest sibling is the existing `e2e` job's workflow-scoped session-secret generation step (`.github/workflows/ci.yml:140-141`, structurally similar `$GITHUB_ENV`/secret pattern) — role-match only, not an exact analog since no prior POST-with-header-auth CI step exists |
| `app/api/auth/*/route.ts` → Server Action file-convention shift itself (i.e., the file becoming a `"use server"` export used from a form `action`, wherever it physically lives — `app/actions/auth.ts` or similar) | Server Action | request-response | No prior Server Action exists anywhere in this repo (`grep "use server"` across `src/`/`app/` returned zero hits) — RESEARCH.md Finding 2's Next.js-docs-sourced code shape is the pattern source, not an in-repo analog, for the Server-Action-specific mechanics (`useActionState`/`useFormStatus` split) even though the validation/upstream-call/session-create body itself has a strong in-repo analog (the current Route Handlers, cited above) |

## Metadata (round 3)

**Analog search scope:** `src/lib/`, `src/features/auth/`, `app/api/auth/`, `app/instrumentation.ts`,
`docs/adr/tech/`, `.github/workflows/ci.yml`, `.planning/phases/01-foundation-auth-preferences/`
— targeted reads of every file `01-CONTEXT.md`'s round-3 "Existing Code Insights" subsection and
`01-RESEARCH.md`'s round-3 addendum named explicitly, plus one `grep` confirming no `"use server"`
precedent exists yet in this repo.
**Files scanned:** 12 full-file reads (`session.ts`, `server-client.ts`, `dal.ts`,
`signin/route.ts`, `signup/route.ts`, `signout/route.ts`, `auth-api.ts`, `use-sign-in.ts`,
`sign-out-button.tsx`, `instrumentation.ts`, `docs/adr/tech/0002-*.md`) + 1 directory listing
(`docs/adr/tech/`) + 1 repo-wide grep.
**Pattern extraction date:** 2026-08-18
</content>
