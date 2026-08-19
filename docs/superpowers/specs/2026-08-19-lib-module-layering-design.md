# `lib/` module layering + per-feature `model.ts`

Status: approved (design), not yet planned/implemented.

## Problem

`src/lib/` is a flat, undifferentiated catch-all (CONVENTIONS.md placement rule
step 8: "everything else infrastructural → `lib/`"). Ten files mix pure,
framework-agnostic helpers (`cn.ts`, `display-name.ts`, `routes.ts`,
`viewport-breakpoints.ts`) with server-only infrastructure that holds secrets
and touches cookies (`session.ts`, `dal.ts`) and browser/React-runtime infra
(`query-client.tsx`). `src/lib/api/` repeats the problem: pure generated types
and a pure RFC7807 parser (`problem-detail.ts`) sit next to server-only modules
(`server-client.ts`, `session-cookie.ts`).

Nothing in the folder structure signals which of these a given file is. This
already produced a real bug: the 01-33 Storybook stub
(`src/test-utils/auth-actions-storybook-stub.ts`) exists because
`@storybook/nextjs-vite`'s Vitest-driven story renderer bundled
`session.ts`'s `node:crypto` import chain for the browser (Next.js's own build
would have split it out via the `"use server"` boundary; Storybook's renderer
doesn't). Nothing caught this at lint time — it was discovered by a runtime
bundler error.

Separately, `src/lib/display-name.ts`'s `resolveDisplayName` is domain logic
specific to the auth feature (only ever called from auth's own routes/actions)
that ended up in the shared catch-all because there was no recognized home for
"pure function that derives/transforms domain data, not an API call, not a
hook, not a component."

## Decision

### 1. Three-ring split of `lib/`

Split `lib/` into three rings by platform coupling, enforced as a dependency
direction (inner ring has zero dependency on outer rings):

- **`lib/core/`** — pure, framework-agnostic, importable from anywhere.
  Imports nothing from `lib/server/` or `lib/client/`.
- **`lib/server/`** — server-only. Every file already carries (or must carry)
  `import "server-only"`. May import `lib/core/`. Must never import
  `lib/client/`.
- **`lib/client/`** — browser/React-runtime-coupled infrastructure (query
  client setup, browser-facing fetch clients). May import `lib/core/`. Must
  never import `lib/server/`.

`lib/core/` is further subdivided by concern, not just "is it pure" (a flat
pure-code pile is still a junk drawer):

- `lib/core/styling/` — `cn.ts`
- `lib/core/routing/` — `routes.ts`
- `lib/core/viewport/` — `viewport-breakpoints.ts`
- `lib/core/api-contract/` — `problem-detail.ts`, `generated-types.ts`,
  `bff-generated-types.ts`

The concern subfolders inside `core/` are organizational only — they do not
introduce new dependency-direction rules beyond "stays inside `lib/core/`."

### 2. Domain-specific pure logic moves into the feature: `features/<domain>/model.ts`

`features/<domain>/` gains a fourth recognized file kind, alongside the
existing `api.ts`/`actions.ts`/`types.ts`/`hooks/`/`components/`:
**`model.ts`** — pure functions that derive/transform domain data, with no
side effects and no API calls. A file that would otherwise land in a shared
`lib/` catch-all but is only ever consumed by one domain belongs here instead,
per the existing placement rule's own step 2 ("belongs to exactly one domain →
that domain's `features/<domain>/`").

`resolveDisplayName` moves from `lib/display-name.ts` to
`features/auth/model.ts` — it is only ever called from auth's own
routes/actions.

### 3. Feature-file naming: drop redundant feature-name prefixes on singular per-feature files

`features/boards/types.ts` (not `boards-types.ts`) already establishes this
convention for the `types.ts` kind. Extend it to the other singular,
one-per-feature files:

- `features/auth/api/auth-api.ts` → `features/auth/api.ts`
- `features/auth/api/auth-actions.ts` → `features/auth/actions.ts`
  (currently on the unmerged `01-33` worktree branch, not yet on `master`)

This does **not** apply to `components/` or `hooks/` — those already have
per-instance names (`sign-in-form.tsx`, `use-sign-in.ts`) that must stay
distinct since multiple files coexist in the same folder.

## Concrete file mapping

```
lib/core/
├── styling/
│   └── cn.ts
├── routing/
│   ├── routes.ts
│   └── routes.unit.test.ts
├── viewport/
│   └── viewport-breakpoints.ts
└── api-contract/
    ├── problem-detail.ts
    ├── problem-detail.unit.test.ts
    ├── generated-types.ts
    └── bff-generated-types.ts

lib/server/
├── session.ts
├── session.test.ts
├── dal.ts
├── server-client.ts
├── server-client.integration.test.ts
├── session-cookie.ts
└── session-cookie.unit.test.ts

lib/client/
├── query-client.tsx
└── bff-client.ts

features/auth/
├── model.ts                 ← new; resolveDisplayName moves here
├── api.ts                   ← renamed from api/auth-api.ts
├── actions.ts                ← renamed from api/auth-actions.ts (worktree branch)
├── components/               ← unchanged
└── hooks/                    ← unchanged
```

`src/test-utils/auth-actions-storybook-stub.ts` is renamed to match the file
it stubs (`actions-storybook-stub.ts` or similar) and its internal comment
updated to reference the new `features/auth/actions.ts` path. Exact naming
finalized during planning.

## Enforcement

`eslint-plugin-boundaries` (already configured, already enforcing the
no-cross-feature-import rule) currently treats `src/lib/*` as a single flat
`lib` element type. Replace it with three element types:

- `lib-core` — pattern `src/lib/core/**`
- `lib-server` — pattern `src/lib/server/**`
- `lib-client` — pattern `src/lib/client/**`

Dependency policy additions:

- `lib-core` → no allowed dependency on `lib-server` or `lib-client`.
- `lib-server` → allowed to depend on `lib-core`; **disallowed** from
  depending on `lib-client`.
- `lib-client` → allowed to depend on `lib-core`; **disallowed** from
  depending on `lib-server`.
- `feature`, `ui`, `layout` → unchanged, still allowed to depend on any of the
  three new `lib-*` types (as they were allowed to depend on `lib` before).

This mechanically catches the class of bug that produced the 01-33 Storybook
stub (a server-only module's dependency chain reaching browser-bundled code)
at lint time.

## Documentation updates

- `CONVENTIONS.md`'s "Project organization" section: replace placement-rule
  step 8's single `lib/` catch-all line with the three-ring breakdown above,
  and add `model.ts` as a fourth recognized per-feature file kind in the
  directory-tree illustration and the "where code lives" quick-reference
  table.
- `docs/adr/tech/0009-project-organization.md`: the ADR's own text says the
  concrete structure is recorded in CONVENTIONS.md "not duplicated here" — so
  the ADR file itself does not need editing, only CONVENTIONS.md.

## Scope / non-goals

- No behavior changes. This is a pure reorganization: file moves, renames,
  import-path updates, and one eslint config change.
- Does not touch `features/boards/`, `features/tasks/`, etc. — those domains
  don't exist yet. The `model.ts` kind and the three-ring `lib/` structure
  apply to them from the start once they're built.
- Does not introduce a `lib/domain/` ring for cross-domain business rules —
  no code currently needs one; onion architecture doesn't require pure YAGNI
  layers "for completeness."
- Does not change `problem-detail.ts`'s runtime behavior or its consumers'
  call sites beyond the import path.

## Migration impact

Touches approximately 18 files' import paths (the 10 files currently in
`lib/` + `lib/api/`'s 8 files, plus `display-name.ts`'s callers and the
renamed `auth-api.ts`/`auth-actions.ts` and their callers/tests), the eslint
config, and `CONVENTIONS.md`. No new dependencies. No test behavior changes —
tests move with their source files and keep the same assertions.
