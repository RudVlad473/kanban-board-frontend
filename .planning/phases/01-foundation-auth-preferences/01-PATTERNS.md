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
