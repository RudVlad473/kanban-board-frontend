# Kanban Board

## What This Is

A Next.js kanban board web app where a signed-in user creates boards, organizes work into
columns, and manages tasks (with subtask checklists) via drag-and-drop — built against a
versioned OpenAPI REST contract, dialing the deployed non-production backend directly, with
light/dark theme support and optimistic-locking conflict handling. Solo-developer portfolio
project.

## Core Value

A signed-in user can create boards, organize tasks across columns via drag-and-drop, and
trust that every change is reliably persisted and reconciled against the real backend.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Authentication — sign up, sign in, and route-guarded access — Phase 1
- ✓ Theme — light/dark toggle persisted per account — Phase 1

### Active

<!-- Current scope. Building toward these. Full requirement list with acceptance criteria: .planning/REQUIREMENTS.md -->

- [ ] Boards — create, view, rename, delete boards; sidebar list with collapse/expand
- [ ] Columns — add, rename, reorder, delete columns within a board
- [ ] Tasks — create, view detail, edit, drag-and-drop move, delete tasks
- [ ] Subtasks — add, edit, toggle-complete, delete subtask checklist items
- [ ] Sync — version-conflict detection with error + rollback on rejected writes

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Search — not present in the Figma mocks or the OpenAPI contract
- User profile/settings beyond theme (avatars, notifications, comments, attachments, labels,
  due dates, multi-workspace/org support) — none appear in either source document
- Password reset / email verification — no such endpoints exist in the OpenAPI contract
- SSO/OAuth sign-in — contract only defines email/password signup/signin
- Real backend implementation — a hard constraint for this frontend, but its implementation
  is separate work
- Paginated activity log (deferred to v2, ACTIVITY-01) — no corresponding Figma screen exists yet
- Multi-user board collaboration (deferred to v2, COLLAB-01) — today a board has exactly one
  owner (ADR domain/0001)

## Context

- **Design source**: Figma mocks exported as PDF (`kanban-task-management-web-app.pdf`) —
  fully specified design system, light/dark theme, mobile/tablet/desktop breakpoints.
- **API contract**: `kanban-board-openapi.json` already exists and is the hard contract this
  frontend is built against. The deployed non-production backend serves it for real; every layer
  (development, tests, CI) dials that backend directly, with no mock server standing in
  (ADR tech/0018).
- **Domain language**: Board (single-owner, top-level container) → Column (a Task's Column
  IS its status — there is no separate status field) → Task (title, optional description,
  zero or more Subtasks) → Subtask (checklist item, independent of the Task's Column). Every
  Column/Task/Subtask carries a monotonically increasing `version` used for optimistic
  locking; a stale version is rejected (409), not silently overwritten. Full glossary:
  `.planning/intel/context.md`.
- **Solo developer**: no team coordination, no release trains — this project is scoped and
  sequenced for one person working with Claude.
- **Scale**: "responsive, modest scale" — budget assumes ~30 tasks/column, ~20KB full-board
  payload; virtualization/large-scale rendering is explicitly deferred until that assumption
  breaks.

## Constraints

- **Framework/stack**: Next.js (App Router) + TanStack Query + dnd-kit + Tailwind + Base UI +
  DTCG design tokens via Style Dictionary — all user-imposed defaults, not open choices.
- **Backend availability**: The real backend is deployed and live (non-production). The
  frontend is built and tested directly against it, with no mock server anywhere
  (ADR tech/0018); swapping the base URL per environment (local / Vercel Preview / Vercel
  Production) is a config change, not a code change.
- **Auth boundary**: Every authenticated call must go through a Next.js Route Handler BFF
  proxy; the session credential is an httpOnly cookie, never readable from client-side JS
  (ADR tech/0001).
- **Cascade delete, no undo**: Deleting a Board/Column/Task hard-cascades to everything it
  contains, immediately, with no trash or recovery window (ADR domain/0002).
- **No bulk-create endpoint**: Multi-child creation (e.g., a board with named initial columns)
  is client-orchestrated as sequential calls; a partial failure keeps whatever succeeded
  rather than rolling back (ADR domain/0003).
- **Test pyramid**: Static analysis (0 errors), unit (~90% target), component/browser-mode
  (~70-80% target), accessibility (no new axe violations), visual regression (Storybook
  design-system components only), E2E (critical flows, real-backend E2E deferred) — coverage
  is diagnostic, not a gate.
- **Deployment**: Vercel (Preview + Production); API base URL set per environment via env
  vars, never hardcoded.
- **Project structure**: Feature-folder hybrid (`features/<domain>/` +
  `components/ui|layout/`) enforced by `eslint-plugin-boundaries`; no cross-feature imports
  (ADR tech/0009) — this decision must land before any other ADR's files get a home.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| httpOnly cookie via Next.js BFF proxy for auth (ADR tech/0001) | Avoids XSS exposure of localStorage/sessionStorage tokens; solves the SSR route-guard gap of in-memory bearer tokens | ✓ Locked |
| TanStack Query for data fetching + optimistic mutations (ADR tech/0002) | Built-in `onMutate`/`onError`/`onSettled` rollback beats SWR/RTK Query/Server Actions for this contract | ✓ Locked |
| dnd-kit (`@dnd-kit/core`/`sortable`, stable line) for drag-and-drop (ADR tech/0003) | Touch + keyboard a11y support that native HTML5 DnD and rivals lack | ✓ Locked |
| MSW with hand-written resolvers as OpenAPI mock server (ADR tech/0004) | Only option giving full control over stateful 409 version-conflict behavior across Vitest Browser Mode + Playwright | ⊘ Superseded — see ADR tech/0018 (no mock server; every layer dials the real backend) |
| openapi-typescript + openapi-fetch for typed API client codegen (ADR tech/0005) | Best OpenAPI 3.1 fidelity vs. Orval/Kubb; hand-written client has no regeneration story | ✓ Locked |
| Vercel for production hosting (ADR tech/0006) | Zero-caveat SSR/middleware support; free Hobby tier pauses instead of billing a solo dev | ✓ Locked |
| ESLint + eslint-plugin-tailwindcss + Prettier + prettier-plugin-tailwindcss (ADR tech/0007) | Fixed ESLint static-analysis requirement rules out Biome-only combos | ✓ Locked |
| Playwright-native `toHaveScreenshot` for visual regression (ADR tech/0008) | Zero third-party service/cost; rejects Chromatic/Argos after explicit no-third-party-SaaS pushback | ◐ Proposed |
| Feature-folder hybrid + `eslint-plugin-boundaries` (ADR tech/0009) | Avoids a flat component dump and cross-feature coupling across ~6 domains | ✓ Locked |
| Boards are single-owner; no collaboration model yet (ADR domain/0001) | Every endpoint is scoped by a single `userId`; multi-user is a distinct, unbuilt future concept | ◐ Proposed |
| Hard cascade delete, no soft-delete/undo (ADR domain/0002) | Contract gives no trash/recovery mechanism at any containment level | ◐ Proposed |
| Client-orchestrated multi-child creation; partial failures kept, not rolled back (ADR domain/0003) | No bulk-create/transactional endpoint exists; a rollback-delete was considered and rejected as unsafe | ◐ Proposed |
| Auth mutations carved out to Server Actions; boards/columns/tasks stay on TanStack Query (ADR tech/0017) | `useActionState` gives auth forms progressive enhancement and simpler pending/error state than the client-mutation hooks tech/0002 chose for the rest of the app; core-domain mutations still need `useOptimistic` rollback, which Server Actions don't give for free | ✓ Locked |
| No mock server anywhere — dev, every test layer, and CI all dial the real deployed nonprod backend (ADR tech/0018) | User's explicit Testing Trophy philosophy ("store.ts should die"); supersedes tech/0004's MSW choice | ✓ Locked |
| Every server entry point is an RSC (reads) or a Server Action (writes) — Route Handlers banned entirely (ADR tech/0019, narrows tech/0002) | Closes the SSR route-guard gap Route Handlers reintroduced; blocking-CI-enforced via `check-no-route-handlers.mjs` | ✓ Locked |
| No `vi.mock`/`vi.spyOn` outside `*.stories.tsx`, with a closed, ADR-documented exception set for `next/headers`/`next/navigation`/`next/link` shims (ADR tech/0020) | Formalizes the store.ts-should-die philosophy as a blocking ESLint rule, not just a norm | ✓ Locked |
| Every component test renders its own composed Storybook stories via `composeStories`, not a hand-rendered `renderWithProviders` tree (ADR tech/0021) | One behavior-proving surface (the story) instead of two independently-maintained ones | ⊘ Superseded — see ADR tech/0025 (component tests render composed stories directly as JSX instead of calling `.run()`) |
| E2E data seeding is a curl-based CLI (`e2e/seed.sh`), not TypeScript fixtures (ADR tech/0022) | Reuses the sign-up response's own session cookie via a jar rather than a second sign-in (backend caps 2 concurrent sessions/account) | ✓ Locked |
| Comment-length rule (max 3 prose lines) is mechanically enforced, blocking CI (ADR tech/0023) | Previously stated in CONVENTIONS.md but never checked; `check-comment-length.mjs` closes the gap | ✓ Locked |
| Runtime boundary validation always via zod `.safeParse()`, schema as source of truth, type via `z.infer` (ADR tech/0024) | Prevents an unchecked cast from an `openapi-fetch` response into a domain type | ✓ Locked |
| Component tests render composed Storybook stories directly as JSX via `vitest-browser-react`'s `render()`, not `composeStories`' `.run()` (ADR tech/0025, supersedes tech/0021) | `.run()` hides the rendered React tree from deep interaction assertions (e.g. the real-`FormData`-on-submit test); direct rendering is a still-current, documented Storybook API, not a rejected pattern | ✓ Locked |
| Forced sign-out (dead upstream credential) clears the session cookie via a new Route Handler, not inline from `server-client.ts`'s `onResponse` (ADR tech/0026) | Cookie mutation is illegal during any Server Component render (confirmed against real Next.js behavior + official docs); the prior inline `session.destroy()` silently failed, leaving a `/boards`⇄`/login` redirect loop until JWT expiry | ✓ Locked |

*Legend: ✓ Locked = explicit Accepted status in the source ADR. ◐ Proposed = a clear chosen
decision in prose ("Decision Outcome"), but no explicit Accepted/status marker in the
document — treated as confirmed for planning purposes; a future higher-or-equal-precedence
source could revise it without tripping a locked-vs-locked conflict gate. ⊘ Superseded = the
decision was genuinely made and later genuinely reversed by a later ADR — kept in this table
rather than deleted, since both halves of the history are worth keeping.*

---
*Last updated: 2026-08-22 after Phase 02.1 (testing-strategy-overhaul-and-code-quality-retrofit)*
