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

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. Full requirement list with acceptance criteria: .planning/REQUIREMENTS.md -->

- [ ] Authentication — sign up, sign in, and route-guarded access
- [ ] Boards — create, view, rename, delete boards; sidebar list with collapse/expand
- [ ] Columns — add, rename, reorder, delete columns within a board
- [ ] Tasks — create, view detail, edit, drag-and-drop move, delete tasks
- [ ] Subtasks — add, edit, toggle-complete, delete subtask checklist items
- [ ] Theme — light/dark toggle persisted per account
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

*Legend: ✓ Locked = explicit Accepted status in the source ADR. ◐ Proposed = a clear chosen
decision in prose ("Decision Outcome"), but no explicit Accepted/status marker in the
document — treated as confirmed for planning purposes; a future higher-or-equal-precedence
source could revise it without tripping a locked-vs-locked conflict gate. ⊘ Superseded = the
decision was genuinely made and later genuinely reversed by a later ADR — kept in this table
rather than deleted, since both halves of the history are worth keeping.*

---
*Last updated: 2026-08-10 after initial project setup (ingest synthesis)*
