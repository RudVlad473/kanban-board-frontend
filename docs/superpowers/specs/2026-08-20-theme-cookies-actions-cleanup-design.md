# Theme constant, cookie registry, and actions-folder cleanup

Status: approved (design), not yet planned/implemented.

## Problem

Four related scattering problems surfaced during a pre-Phase-2 architecture review of the
auth/theme code Phase 1 shipped:

1. **`Theme` has no enum-like const and is duplicated three ways.** ADR tech/0012 established the
   `{ KEY: "KEY" } as const` + derived-type pattern specifically so a value like this only has one
   runtime source. A `THEME` const following that pattern used to exist in `src/lib/mocks/store.ts`
   (cited in `01-CONTEXT.md`'s GC-04 as a working example, alongside `DEVICE_TYPE`), but that file
   was deleted in GC-22 (MSW removal) and the const was never recreated. Today `type Theme = "LIGHT"
   | "DARK"` is hand-declared separately in `lib/server/theme.ts`, `lib/server/session.ts`, and
   `features/theme/hooks/use-theme-preference.ts` (the last one specifically because `theme.ts`
   carries `import "server-only"` and can't be imported from a client hook), plus bare string
   literals at five more call sites.
2. **Cookie-related constants are scattered one-per-owning-file**, not centralized: `SESSION_COOKIE_NAME`
   lives in `session.ts`, `THEME_COOKIE` lives in `theme.ts`, `UPSTREAM_SESSION_COOKIE_NAME` lives in
   `session-cookie.ts` — three different files, no single place answers "what cookies does this app
   set?" Each also hand-rolls its own near-identical option object (`secure: process.env.NODE_ENV !==
   "development"`, `sameSite: "lax"`, `path: "/"` all appear twice, verbatim).
3. **`readThemeCookie`/`writeThemeCookie` are loose exported functions**, not the factory-namespace
   shape this project already adopted for the exact same category of problem
   (`createSessionService` in `session.ts`, returning `{ create, verify, destroy }` — see the
   `feedback-abstraction-over-scattered-utils` project memory). `extractUpstreamSessionId`/
   `toUpstreamCookieHeader` in `session-cookie.ts` have the identical shape problem.
4. **`session-cookie.ts`'s name collides conceptually with `session.ts`**, hiding a real
   distinction: `session.ts` manages this app's own session cookie via `next/headers`'s `cookies()`
   (the current request/response). `session-cookie.ts` parses the **backend's** raw fetch `Response`
   via `response.headers.getSetCookie()` — an arbitrary external HTTP response `cookies()` has no
   API for reading. The code is correct; the name doesn't signal the difference.

Separately, two related but independent cleanups were raised:

5. **`features/auth/actions.ts` and `features/theme/actions.ts` are flat multi-export files** —
   `auth/actions.ts` holds three unrelated Server Actions (`signInAction`, `signUpAction`,
   `signOutAction`) in one file with one combined test file. No per-feature-file-kind convention
   exists yet for "one Server Action per file."
6. **Comments have grown long** — most exports carry multi-sentence rationale blocks. The problem
   isn't the presence of WHY-comments (CONVENTIONS.md's `multiline-comment-style` rule already
   governs their *syntactic* form) — it's that they've grown past what a reader needs inline, with
   no stated length discipline anywhere.

## Decision

### 1. `THEME` const + `Theme` type move to `lib/core/theme/`

A new pure concern folder, sibling to `lib/core/{styling,routing,viewport,api-contract}/` — no
`server-only`, importable from both server and client code, closing the 3-way duplication:

```ts
// lib/core/theme/theme.ts
export const THEME = { LIGHT: "LIGHT", DARK: "DARK" } as const;
export type Theme = (typeof THEME)[keyof typeof THEME];
export const isTheme = (value: string | undefined): value is Theme =>
    value === THEME.LIGHT || value === THEME.DARK;
```

Every current literal switches to `THEME.LIGHT`/`THEME.DARK`:
`lib/server/session.ts` (`SessionPayload.theme`, `isSessionPayload`), `app/layout.tsx` (`theme ===
"DARK"`), `app/(auth)/layout.tsx` (`DEFAULT_THEME`), `features/theme/actions/update-theme.ts`
(`z.enum([...])` — built from `Object.values(THEME)` or listed explicitly, whichever `zod`'s API
makes cleaner at implementation time), `features/theme/components/theme-toggle.tsx`,
`features/theme/hooks/use-theme-preference.ts` (drops its duplicated `Theme` type entirely and
imports from `lib/core/theme/` instead — this is the fix for the client/server duplication).

### 2. Cookie name registry: `lib/core/cookies/`

A new pure concern folder holding every cookie name this app sets, plus the option fields shared
across all of them:

```ts
// lib/core/cookies/cookie-registry.ts
export const COOKIE = {
    SESSION: "session",
    THEME: "theme",
    UPSTREAM_SESSION: "JSESSIONID",
} as const;

export type CookieName = (typeof COOKIE)[keyof typeof COOKIE];

export const baseCookieOptions = () => ({
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax" as const,
    path: "/",
});
```

`session.ts` and the new `theme-cookie.ts` (below) import `COOKIE.SESSION`/`COOKIE.THEME` instead
of declaring `SESSION_COOKIE_NAME`/`THEME_COOKIE` locally, and spread `baseCookieOptions()` into
their `cookieStore.set(...)` calls, supplying only what actually differs per cookie (`httpOnly`,
`maxAge`/`expires`). `UPSTREAM_SESSION` is registered here too even though it's never `set()` by
this app (only read off an external response) — it's still a cookie name this app's own code
depends on, and belongs in the one place that answers "what cookies does this app know about."

`session.ts`'s own JWT sign/verify/destroy logic is **not** restructured — it stays exactly where
it is, in the same factory (`createSessionService`), just referencing `COOKIE.SESSION` instead of
declaring its own constant. Splitting cookie I/O out of `session.ts` was considered and rejected —
that logic wasn't flagged as a problem, and moving it would be unrelated refactoring.

### 3. `lib/server/cookies/` — theme + upstream cookie I/O, factory-namespaced

A new subfolder on the server ring, mirroring `lib/core/`'s own concern-subfolder convention:

```ts
// lib/server/cookies/theme-cookie.ts
import "server-only";
import { cookies } from "next/headers";
import { baseCookieOptions, COOKIE } from "@/lib/core/cookies/cookie-registry";
import { isTheme, type Theme } from "@/lib/core/theme/theme";

const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const themeCookie = {
    read: async (): Promise<Theme | null> => {
        const store = await cookies();
        const value = store.get(COOKIE.THEME)?.value;
        return isTheme(value) ? value : null;
    },
    write: async (theme: Theme): Promise<void> => {
        const store = await cookies();
        store.set(COOKIE.THEME, theme, {
            ...baseCookieOptions(),
            httpOnly: false,
            maxAge: THEME_COOKIE_MAX_AGE_SECONDS,
        });
    },
};
```

```ts
// lib/server/cookies/upstream-cookie.ts — renamed from lib/server/session-cookie.ts
import "server-only";
import { COOKIE } from "@/lib/core/cookies/cookie-registry";

/**
 * Parses the backend's own raw fetch Response — not this app's request/response, which is why
 * this can't use next/headers's cookies(). That API only reads/writes the current Next.js
 * request/response; it has no access to an arbitrary external Response object.
 */
export const upstreamCookie = {
    extract: (response: Response): string | null => {
        /* ...unchanged body, using COOKIE.UPSTREAM_SESSION instead of the old local constant... */
    },
    toHeader: (jsessionId: string): string => `${COOKIE.UPSTREAM_SESSION}=${jsessionId}`,
};
```

Callers update: `features/theme/actions/update-theme.ts` calls `themeCookie.write(...)`;
`app/layout.tsx`/`app/(auth)/layout.tsx` call `themeCookie.read()`; `features/auth/actions/*.ts`
call `upstreamCookie.extract(response)`; `lib/server/server-client.ts` calls
`upstreamCookie.toHeader(record.jsessionId)`.

`lib/server/theme.ts` and `lib/server/session-cookie.ts` are deleted (superseded by the two files
above).

### 4. `features/<domain>/actions/` — one file per Server Action

Replaces the flat `actions.ts` convention GC-27 established:

```
features/auth/
├── action-state.ts          ← unchanged location; shared AuthActionState type, not an action
├── actions/
│   ├── sign-in.ts            ← signInAction
│   ├── sign-in.unit.test.ts
│   ├── sign-up.ts            ← signUpAction
│   ├── sign-up.unit.test.ts
│   ├── sign-out.ts           ← signOutAction
│   └── sign-out.unit.test.ts

features/theme/
├── actions/
│   ├── update-theme.ts       ← updateThemeAction
│   └── update-theme.unit.test.ts
```

`action-state.ts` stays at the feature root — it's a shared type consumed by all three auth
actions, not an action itself, so it doesn't belong inside `actions/`. The current combined
`actions.unit.test.ts` files split along the same lines as their source.

**New CONVENTIONS.md rule, project-wide** (applies now to auth/theme, automatically to any future
domain that gains a Server Action — board/column/task mutations stay on TanStack Query per ADR
tech/0002/GC-24 and are unaffected): *a domain's Server Actions live one-per-file under
`features/<domain>/actions/<action-name>.ts`, never a flat multi-export `actions.ts`.*

### 5. Comment length discipline

New CONVENTIONS.md rule, added to the existing "Linting & formatting" section:

> A comment explaining WHY is at most 1–3 lines (roughly one sentence). If the rationale needs
> more — a threat-model citation, a multi-step historical decision — that belongs in the relevant
> ADR/CONTEXT.md/SUMMARY.md, referenced by a short pointer (e.g. "see ADR tech/0018") rather than
> restated in full inline.

Enforcement: code review (no automated tool measures comment-prose length). Applied **retroactively
in every file this cleanup touches** (all files listed in sections 1–4 above) — comments in files
this round doesn't touch are left as-is, trimmed opportunistically later rather than swept now.

## Concrete file mapping

```
lib/core/
├── theme/
│   └── theme.ts                          ← new; THEME const, Theme type, isTheme guard
└── cookies/
    └── cookie-registry.ts                ← new; COOKIE const, CookieName type, baseCookieOptions

lib/server/
├── session.ts                            ← unchanged location; imports COOKIE.SESSION
├── session.test.ts                       ← unchanged
├── dal.ts                                ← unchanged
├── server-client.ts                      ← unchanged location; calls upstreamCookie.toHeader
├── server-client.integration.test.ts     ← unchanged
└── cookies/
    ├── theme-cookie.ts                   ← new; replaces lib/server/theme.ts
    ├── theme-cookie.unit.test.ts         ← new; replaces any theme.ts test coverage
    ├── upstream-cookie.ts                ← renamed from lib/server/session-cookie.ts
    └── upstream-cookie.unit.test.ts      ← renamed from session-cookie.unit.test.ts

features/auth/
├── action-state.ts                       ← unchanged
├── model.ts, model.unit.test.ts          ← unchanged
├── schemas.ts, schemas.unit.test.ts      ← unchanged
├── components/                           ← unchanged
└── actions/
    ├── sign-in.ts, sign-in.unit.test.ts
    ├── sign-up.ts, sign-up.unit.test.ts
    └── sign-out.ts, sign-out.unit.test.ts

features/theme/
├── components/, hooks/                   ← unchanged (hooks/use-theme-preference.ts imports
│                                             Theme from lib/core/theme/ instead of duplicating it)
└── actions/
    └── update-theme.ts, update-theme.unit.test.ts

app/layout.tsx                            ← imports themeCookie.read from lib/server/cookies/,
app/(auth)/layout.tsx                       THEME from lib/core/theme/
```

Deleted: `lib/server/theme.ts`, `lib/server/session-cookie.ts`, `lib/server/session-cookie.unit.test.ts`,
`features/auth/actions.ts`, `features/auth/actions.unit.test.ts`, `features/theme/actions.ts`,
`features/theme/actions.unit.test.ts`.

## Enforcement

`eslint-plugin-boundaries`'s existing `lib-core`/`lib-server` element types already cover the new
`lib/core/theme/`, `lib/core/cookies/`, and `lib/server/cookies/` subfolders by their existing glob
patterns (`src/lib/core/**`, `src/lib/server/**`) — no config change needed, unlike the round-4
`lib/` layering work which introduced the element types themselves.

## Documentation updates

- `CONVENTIONS.md`: directory-tree illustration gains `lib/core/theme/`, `lib/core/cookies/`,
  `lib/server/cookies/`, and the `features/<domain>/actions/` folder shape. "Where code lives"
  quick-reference table gains a row for "Domain Server Action" → `features/<domain>/actions/<name>.ts`.
  New comment-length rule added to "Linting & formatting".
- `02-CONTEXT.md` (Phase 2: Board Management): this design is folded in as prerequisite scope,
  executed as the first plan(s) in Phase 2's wave sequence, before board-management work — same
  pattern Phase 1's gap-closure rounds used.

## Scope / non-goals

- No behavior changes to session JWT logic, cookie security flags (httpOnly/secure/sameSite
  values themselves are unchanged, only de-duplicated), or the upstream-session-bridging mechanism
  (GC-18) — this is a pure reorganization plus the `THEME`/`COOKIE` const additions.
- Does not touch `session.ts`'s internal structure (JWT sign/verify/destroy stays one factory) —
  considered and explicitly rejected as unrelated to what was flagged.
- Does not introduce a comment-length linter — enforcement is code review, consistent with several
  other CONVENTIONS.md rules that have no automated check.
- Does not apply the comment-length rule retroactively project-wide — only in files this round
  touches.
- Does not create a `features/boards|columns|tasks` `actions/` folder now — those domains don't
  exist yet and use TanStack Query, not Server Actions (ADR tech/0002/GC-24); the convention
  applies to them automatically if that ever changes.

## Migration impact

Touches: 2 new `lib/core/` files, 2 new `lib/server/cookies/` files (2 deleted), 6 new
`features/auth/actions/*` files (2 deleted), 2 new `features/theme/actions/*` files (2 deleted),
plus import-path updates in every consumer (`session.ts`, `server-client.ts`, `app/layout.tsx`,
`app/(auth)/layout.tsx`, `theme-toggle.tsx`, `use-theme-preference.ts`) and `CONVENTIONS.md`. No
new dependencies. No behavior changes — existing tests move/split with their source and keep the
same assertions, trimmed per the new comment-length rule where the file was already being touched.
