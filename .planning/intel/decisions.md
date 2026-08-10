# Decisions (synthesized from ADRs)

Source classifications: C:/Dev/Repos/kanban-board-frontend/.planning/intel/classifications/
Precedence applied: ADR > SPEC > PRD > DOC (default; no per-doc overrides altered outcomes below)

12 ADR-classified documents present in this ingestion batch (9 `docs/adr/tech/`, 3 `docs/adr/domain/`).

Status is marked `locked` only where the classification carries an explicit
Accepted/Chosen-and-confirmed status marker per the classifier's determination;
`proposed` where the classifier found no explicit status field, even if a
"Decision Outcome" section names a chosen option.

## ADR tech/0001: Auth session storage & handling
- source: docs/adr/tech/0001-auth-session-storage.md
- status: locked (Accepted)
- decision: httpOnly cookie via a Next.js Route Handler acting as a BFF proxy for auth session storage; rejects in-memory-only bearer tokens (fails route-guard on fresh SSR requests) and localStorage/sessionStorage tokens (XSS exposure).
- scope: auth session storage, httpOnly cookie, Next.js Route Handler, BFF proxy, route-guard

## ADR tech/0002: Client data-fetching & mutation strategy
- source: docs/adr/tech/0002-client-data-fetching-strategy.md
- status: locked (Accepted)
- decision: TanStack Query for client-side data fetching and optimistic mutation/rollback (`onMutate`/`onError`/`onSettled`) against a separate REST service; rejects SWR (looser rollback), RTK Query (unneeded Redux store), and RSC fetch + Server Actions (`useOptimistic` has no auto-rollback, weaker MSW testability). Local-only UI state (sidebar, modal-open, drag-in-progress) handled separately by React's built-in state/Context, not TanStack Query — no Redux store needed for either.
- scope: TanStack Query, optimistic updates, mutation rollback, SWR, RTK Query, Server Actions, REST service

## ADR domain/0001: Boards are single-owner; no collaboration model exists yet
- source: docs/adr/domain/0001-single-owner-boards.md
- status: proposed (no explicit Status/Accepted field in document)
- decision: A Board belongs to exactly one User, full stop — the API contract scopes every board/column/task/subtask endpoint by a single `userId` with no collaborator or sharing endpoint. Multi-user editing of a shared board is a distinct, unbuilt concept (a new Collaborator/membership model with its own permissions) to introduce later, not a hidden second mode of today's ownership relationship.
- scope: Board, User, ownership, Collaborator, membership, permissions

## ADR domain/0002: Deletion is a hard cascade with no soft-delete or undo
- source: docs/adr/domain/0002-hard-cascade-delete.md
- status: proposed (no explicit Status/Accepted field in document)
- decision: Deleting a Board removes all its Columns and Tasks; deleting a Column removes its Tasks; deleting a Task removes its Subtasks. Full, immediate, hard-cascade delete at every level of the containment hierarchy, including deleting a non-empty Column, which the contract gives the frontend no way to detect or block on before calling delete. No trash, recovery window, or soft-delete flag exists in the contract.
- scope: deletion, cascade delete, Board, Column, Task, Subtask, soft-delete, undo

## ADR domain/0003: Multi-child creation is client-orchestrated; partial failures are kept, not rolled back
- source: docs/adr/domain/0003-client-orchestrated-multi-child-creation.md
- status: proposed (no explicit Status/Accepted field in document)
- decision: Multi-child creation (Boards/Tasks with named Columns/Subtasks) is client-orchestrated as sequential calls — one parent-create call followed by one child-create call per named item, not a single atomic request (the API has no bulk-create endpoint). If the sequence fails partway through, the frontend keeps the partially-created parent and whatever children succeeded, surfacing an error rather than rolling back by deleting the parent. A rollback-delete was explicitly considered and rejected (no transactional guarantee against the same API).
- scope: Boards, Columns, Tasks, Subtasks, multi-child creation, rollback

## ADR tech/0003: Drag-and-drop library
- source: docs/adr/tech/0003-drag-and-drop-library.md
- status: locked (Accepted)
- decision: dnd-kit, specifically the stable `@dnd-kit/core`/`@dnd-kit/sortable` line (not the pre-1.0 `@dnd-kit/react` rewrite), for drag-and-drop of Task cards and Columns; rejects @hello-pangea/dnd (maintenance risk), Atlassian Pragmatic drag-and-drop (keyboard a11y is a separate optional package), and native HTML5 DnD (no touch/keyboard support).
- scope: drag-and-drop, dnd-kit, accessibility, touch support, optimistic mutation rollback, Task cards, Columns

## ADR tech/0004: OpenAPI-contract mock/stub server
- source: docs/adr/tech/0004-openapi-mock-server.md
- status: locked (Accepted)
- decision: MSW (Mock Service Worker) with hand-written resolvers for a stateful OpenAPI-contract mock server, giving full control over version-check/409 rejection behavior across Vitest Browser Mode and (via `mswjs/playwright`) Playwright E2E; rejects a hand-rolled Route Handler stub (no spec-drift detection), Prism (stateful "Data Persistence" feature unshipped), and json-server (no native versioned-entity conflict concept).
- scope: mock server, OpenAPI contract, MSW, Vitest Browser Mode, Playwright E2E, optimistic locking

## ADR tech/0005: Typed API client / codegen from the OpenAPI spec
- source: docs/adr/tech/0005-typed-api-client-codegen.md
- status: locked (Accepted)
- decision: openapi-typescript + openapi-fetch to generate a typed API client from the OpenAPI 3.1 contract; rejects Orval (open 3.1-fidelity bugs), Kubb (confusing dual-channel beta/stable versioning), and a hand-written client (no regeneration story). CI drift-check convention flagged for follow-up (recorded in CONVENTIONS.md).
- scope: OpenAPI spec, typed API client, codegen, openapi-typescript, openapi-fetch, TanStack Query, CI drift-check

## ADR tech/0006: Production hosting / deployment target
- source: docs/adr/tech/0006-production-hosting.md
- status: locked (Accepted)
- decision: Vercel as the production hosting/deployment platform — zero-caveat SSR/middleware support, per-branch preview deployments, free Hobby tier pauses rather than bills on hitting a limit; rejects Netlify (middleware/redirect ordering risk to the auth-redirect flow), Cloudflare Workers (unverified `cookies()` API gap risk against ADR 0001's cookie-based guard), and self-hosted Docker (no free tier, full ops burden for a solo developer).
- scope: production hosting, deployment, Vercel, Next.js middleware, auth route-guarding

## ADR tech/0007: Linter + formatter toolchain
- source: docs/adr/tech/0007-linter-formatter-toolchain.md
- status: locked (Accepted)
- decision: ESLint + `eslint-plugin-tailwindcss` (kept, fixed static-analysis requirement) plus Prettier + `prettier-plugin-tailwindcss`; rejects Biome-as-formatter-only (undocumented hybrid combination) and full Biome (violates the fixed ESLint static-analysis requirement; `useSortedClasses` still experimental/less capable).
- scope: ESLint, eslint-plugin-tailwindcss, Prettier, prettier-plugin-tailwindcss, Biome, linting, formatting, toolchain

## ADR tech/0008: Visual regression tool
- source: docs/adr/tech/0008-visual-regression-tool.md
- status: proposed (no explicit Status/Accepted field in document; "Decision Outcome" names a chosen option but frontmatter status marker is absent)
- decision: Playwright-native (`expect(page).toHaveScreenshot()`) for Storybook visual regression — zero third-party service, zero added dependency (Playwright already mandatory), zero recurring cost; rejects Lost Pixel OSS (worse review UX, one more dependency), Argos, and Chromatic (both third-party SaaS, violating the user's explicit no-third-party-service preference). Revised mid-walkthrough from an initial Argos recommendation after user pushback on third-party dependencies.
- scope: visual regression testing, Storybook, Playwright, Lost Pixel, Argos, Chromatic

## ADR tech/0009: Project / component organization methodology
- source: docs/adr/tech/0009-project-organization.md
- status: locked (Accepted)
- decision: Feature-folder hybrid (`features/<domain>/` + `components/ui/`) enforced by `eslint-plugin-boundaries` (v7.2.0, forbidding `feature → feature` imports); rejects Next.js colocation-only (unopinionated about shared-but-not-route-local code, produces a flat `/components` dump), Feature-Sliced Design (too much ceremony/friction with App Router for ~6 domains), and Atomic Design (no guidance for domain logic/feature boundaries). Discovered late, during doc ingestion, because the architecture spec's Cross-cutting section has no invariant for source-code organization.
- scope: project structure, feature-folder hybrid, eslint-plugin-boundaries, Next.js App Router, component organization
