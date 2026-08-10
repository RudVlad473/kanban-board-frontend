# Context (synthesized from DOC-classified documents)

3 DOC-classified documents present in this ingestion batch: `CONTEXT.md`, `CONVENTIONS.md`, `DEFAULTS.md`.

## Domain language (Board / Column / Task / Subtask / Version / Activity Log / User / Theme)
- source: CONTEXT.md
- content: **Board** — a named collection of Columns, owned by exactly one User; top-level container a User creates and switches between via the sidebar. Avoid: Project, Workspace. **Column** — an ordered workflow stage within a Board that a Task belongs to at any given moment; a Task's Column IS its status, there is no separate status concept; a Board must have at least one Column before a Task can be created in it. Avoid: Status, Stage, Swimlane, List. **Task** — a unit of work belonging to exactly one Column at a time, with a title, optional description, and zero or more Subtasks; moving a Task to a different Column is its only "status change." Avoid: Card, Ticket, Item, Status. **Subtask** — a single checklist item belonging to exactly one Task, with a title and a completion flag; independent of the Task's Column. Avoid: Checklist item, To-do. **Version** — a monotonically increasing counter on every Column, Task, and Subtask that must be sent back on every update/move/reorder request; a stale Version is rejected rather than silently overwritten. Avoid: Revision, Etag, Timestamp. **Activity Log** — a per-board, paginated record of structural events only (board/column created, column deleted, task created/moved/deleted); content edits are not recorded; the tracked event set is currently incomplete and expected to grow. Avoid: Audit log, History. **User** — an account identified by email and password, owner of zero or more Boards, with one persisted Theme preference; a Board has exactly one User, no Collaborator/shared-board concept currently (cross-references docs/adr/domain/0001-single-owner-boards.md). Avoid: Account, Member. **Theme** — a User's persisted light/dark UI preference, stored/retrieved independently of any Board. Avoid: Mode, Appearance.

## Project organization convention (docs/adr/tech/0009)
- source: CONVENTIONS.md
- content: Feature-folder hybrid — one domain's code lives in `features/<domain>/`; anything reusable across domains and domain-agnostic lives in `components/`; `app/` is routing only, composes `features/`, never contains business logic. Full directory tree specified for `app/`, `src/features/{boards,columns,tasks,subtasks,auth,activity-log}`, `src/components/{ui,layout}`, `src/hooks`, `src/lib`, `src/styles`. Placement rule (apply in order): (1) renders a route → `app/`; (2) belongs to exactly one domain → that domain's `features/<domain>/{components,hooks,api}`; (3) reusable across ≥2 domains, domain-agnostic primitive → `components/ui/`; (4) reusable across ≥2 domains but domain-aware chrome → `components/layout/`; (5) generic non-domain utility hook → `hooks/`; (6) everything else infrastructural → `lib/`. Default to step 2 when in doubt between 2 and 3/4; promote only once a second domain needs it. No generic `src/shared/` catch-all. No cross-feature imports (`features/boards/` must not import `features/tasks/` etc.) — enforced by `eslint-plugin-boundaries` with an `element-types`/`dependencies` policy forbidding `feature → feature` imports while allowing `feature → ui/layout/lib`.

## Auth convention (docs/adr/tech/0001)
- source: CONVENTIONS.md
- content: All authenticated calls to the external API go through the Next.js Route Handler BFF proxy; no client component holds or reads the raw session cookie/token directly (enforcement: code review — no client-component `fetch()` targets the external API base URL directly). Session cookie set httpOnly, Secure, SameSite=Lax or stricter, never readable from client-side JS (enforcement: a test asserting the `Set-Cookie` header carries all three flags).

## Data fetching & mutations convention (docs/adr/tech/0002)
- source: CONVENTIONS.md
- content: All server-state reads/writes go through TanStack Query (`useQuery`/`useMutation`); no component calls the generated API client directly outside a query/mutation hook (enforcement: lint rule forbidding direct `openapi-fetch` imports outside a designated queries directory). Every mutation against a versioned endpoint implements both `onMutate` (optimistic snapshot) and `onError` (rollback) (enforcement: a shared mutation-hook factory requiring both callbacks; code review otherwise).

## Drag-and-drop convention (docs/adr/tech/0003)
- source: CONVENTIONS.md
- content: All card/column dragging goes through the stable `@dnd-kit/core`/`@dnd-kit/sortable` line, not the pre-1.0 `@dnd-kit/react` rewrite (enforcement: pinned `package.json` dependency; code review). Every drag interaction remains keyboard-operable (`KeyboardSensor` enabled) (enforcement: existing Storybook + axe-core "no new violations" gate).

## Mock server convention (docs/adr/tech/0004)
- source: CONVENTIONS.md
- content: All API calls inside Vitest Browser Mode and Playwright tests are intercepted by MSW; no live network call to any real/third-party host (enforcement: MSW `onUnhandledRequest: 'error'`). MSW handlers enforce the same `version`-conflict rejection (409) behavior as the real contract for every versioned mutation (enforcement: a shared handler test asserting a stale-version request is rejected).

## Typed API client convention (docs/adr/tech/0005)
- source: CONVENTIONS.md
- content: The generated API client/types file (from `openapi-typescript`) is never hand-edited (enforcement: CI step re-runs `openapi-typescript` against the committed OpenAPI spec and fails the build if regenerated output differs from what's committed).

## Hosting convention (docs/adr/tech/0006)
- source: CONVENTIONS.md
- content: The API base URL (mock server vs. real backend) is set per Vercel environment (Preview/Production) via environment variables, never hardcoded in source (enforcement: code review; lint rule flagging a literal API URL outside the environment-variable read).

## Linting & formatting convention (docs/adr/tech/0007)
- source: CONVENTIONS.md
- content: ESLint (with `eslint-plugin-tailwindcss`) and Prettier (with `prettier-plugin-tailwindcss`) must both report zero errors before merge (enforcement: required CI status check running both on every PR).

## Visual regression convention (docs/adr/tech/0008)
- source: CONVENTIONS.md
- content: Visual regression baselines are only regenerated inside the same environment CI uses, never on an arbitrary local machine and committed as-is (enforcement: none — stated-but-unenforced, revisit if a flaky/host-mismatched baseline actually happens). Visual regression tests are scoped to Storybook design-system component stories only, never full application screens (enforcement: naming/directory convention `*.visual.spec.ts` under a `visual/` directory reading only from `storybook-static`; code review).

## Prerequisites / sequencing
- source: CONVENTIONS.md
- content: 0009 (project organization) before implementation of every other decision begins — 0001-0008 each produce files that need a defined home. 0005 (typed API client codegen) before 0002 (data-fetching strategy) — TanStack Query's `queryFn`/`mutationFn` calls the generated client. 0001 (auth session storage) before 0002 is fully exercised — every API call proxies through the BFF/auth boundary. 0004 (OpenAPI mock server) before 0002 and 0003 can be meaningfully tested — MSW handlers are the only way to exercise data-fetching or drag-move flows before a real backend exists. 0002 (data-fetching strategy) before 0003 (drag-and-drop library) — dnd-kit's `onDragEnd` calls the move-task mutation.

## Default technical choices (C-004, C-005, C-009, C-010, C-012, C-013)
- source: DEFAULTS.md
- content: C-004 Theme sync mechanism — class-based dark mode toggled via a small inline script/cookie read before hydration (standard Next.js + Tailwind FOUC-avoidance pattern), synced to `PUT /users/me/theme` on change. C-005 Form handling & validation — React Hook Form + Zod schema validation, matching the OpenAPI contract's own field constraints (e.g. task title minLength/maxLength) at the client boundary. C-009 Ephemeral client UI state — React's built-in `useState`/Context; no dedicated state-management library for this narrow, local-only slice (sidebar collapsed, drag-in-progress) — cross-referenced by ADR tech/0002's Decision Outcome. C-010 Client-side error/observability reporting — Sentry's free tier, the de facto solo-developer default for a Next.js frontend with no backend team dashboard to lean on. C-012 CI pipeline tooling — GitHub Actions, running the full test pyramid (static, unit, component, a11y, visual, E2E) on every push. C-013 Package manager — pnpm, for disk-efficient installs and fast CI runs; no project-specific reason to deviate from the modern default.
