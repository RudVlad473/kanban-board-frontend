# Constraints (synthesized from SPECs)

1 SPEC-classified document present in this ingestion batch: `HIGH-LEVEL-ARCHITECTURE.md`
(added since the prior 15-doc synthesis; this is the source of the entries below).

## Architecture classification
- source: HIGH-LEVEL-ARCHITECTURE.md
- type: nfr
- content: Classified as `spa` + `ssr-app` + `api-client`. `spa` — once a board is loaded, all interaction (drag task between columns, task-detail modal, edit subtasks, toggle checkbox) happens client-side against in-memory state with no full-page reload. `ssr-app` — sign-in, board list, and individual board are distinct authenticated routes rendered per-request; route-level auth gating is a server-rendering concern. `api-client` — the frontend owns no persistence or business logic; every board/column/task/subtask lives behind the REST contract `kanban-board-openapi.json`, including respecting its optimistic-locking (`version`) rules.

## Flow Spine — write path
- source: HIGH-LEVEL-ARCHITECTURE.md
- type: protocol
- content: (1) authenticate — email+password → session established (signup returns opaque string, signin returns 200 with no documented body). (2) create-board — board name + initial columns → new board persisted, appears in sidebar. (3) create-column — column name + board id → new column added, appears as swimlane. (4) create-task — task title/description + column id → new task persisted. (5) edit-task — task id + updated title/description/status + current version → updated task rendered. (6) toggle-subtask — subtask id + completion flag + current version → subtask and task progress updated. (7) move-task — drag gesture (source→target column/position) + current version → optimistic apply, then reconciled against server response. (8) reorder-column / delete-column / delete-board / delete-task — version-checked mutations sharing move-task's shape: optimistic apply, server-confirmed. (9) toggle-theme — light/dark preference → persisted per-user, applied across UI. (10) reconcile-conflict — a version-checked write (5-8) rejected as stale → optimistic local change rolled back, affected record refetched. (11) route-guard — unauthenticated visitor requests a board/board-list route → redirected to sign-in before any board data is requested.

## Flow Spine — read path
- source: HIGH-LEVEL-ARCHITECTURE.md
- type: protocol
- content: (12) select-board — board id (from sidebar) → full board (columns, tasks, subtasks) fetched via `GET /boards/{boardId}/full` and rendered. (13) view-task-detail — task id → task-detail modal rendered (title, description, subtasks checklist, status dropdown, edit/delete). (14) view-activity — board id (+ page) → paginated activity log fetched and rendered; the one endpoint in the contract that is paginated, and the one screen with no corresponding mock (see Open Questions).

## Flow Spine — build-time path
- source: HIGH-LEVEL-ARCHITECTURE.md
- type: protocol
- content: (15) mock-backend-swap — the OpenAPI contract has no deployed implementation behind it yet → a contract-derived mock/stub server the frontend is built and tested against, swapped for the real backend's base URL once deployed. (Independent of the write/read paths above, applies only until a real backend exists.)

## Cross-cutting — runtime
- source: HIGH-LEVEL-ARCHITECTURE.md
- type: nfr
- content: State — server owns boards/columns/tasks/subtasks/users behind the REST contract; frontend owns only ephemeral client state (in-memory board mirror, auth session, theme preference mirror, sidebar UI state, in-flight optimistic-update state). Boundaries — frontend talks to exactly one boundary, the OpenAPI-described REST API (satisfied by a contract-derived mock until a real backend is deployed). Movement — nearly everything is synchronous request/response; move-task and other version-checked mutations are optimistic-then-reconciled. Identity — boards/columns/tasks/subtasks keyed by opaque backend-issued ids; a task's (column, position) is not its identity. Trust — every contract endpoint takes a `userId` scoped to the authenticated caller; authorization enforced entirely server-side. Secrets — whatever credential signup/signin issues must not be logged; storage mechanism was an open question at spec time (resolved by ADR tech/0001 — httpOnly cookie). Concurrency — two races: same user editing from two tabs/devices, and drag-reorder racing a background refetch; the `version` field is the mechanism, stale version rejected server-side and reconciled client-side. Failure — a failed read degrades to retry/empty state; a failed write rolls back its optimistic update and surfaces an error; version-conflict rejection is a distinct failure mode with no defined error schema (open question). Observability — solo-maintained frontend needs client-side error reporting for failed requests and version conflicts (see DEFAULTS.md C-010, Sentry free tier). Budget — throughput/storage not the constraint at this scale; real ceilings are the ~20KB full-board fetch payload and drag-and-drop frame budget across breakpoints. Delivery — a single deployable frontend, built and tested against the OpenAPI contract via a mock layer, requested to reach an actual production deployment regardless of backend deployment status.

## Cross-cutting — dev-process
- source: HIGH-LEVEL-ARCHITECTURE.md
- type: nfr
- content: Verification — full layered test pyramid specified (static analysis, unit, component/browser-mode, accessibility, visual regression, E2E); E2E against a real non-prod backend explicitly sequenced after everything else is settled, since no backend is deployed yet. Change over time — the frontend's main axis of change is the OpenAPI contract it's built against (a DTO added/changed is a breaking change to reconcile); design tokens (DTCG JSON → Style Dictionary output) version independently of component code.

## Deferred
- source: HIGH-LEVEL-ARCHITECTURE.md
- type: nfr
- content: Real-time multi-user collaboration — user-stated "later, not now"; reopens when a second concurrent editor on the same board becomes a real scenario (the contract's `version`-based optimistic locking already anticipates this; consistent with ADR domain/0001's single-owner-boards decision). E2E testing against an actual non-prod service — deferred until everything else is settled; no deployed backend to target today. Board/column/task virtualization or large-scale rendering optimization — deferred; reopens if a column's task count grows well past the ~30-tasks/column assumption behind the payload estimate.

## Known Constraints
- source: HIGH-LEVEL-ARCHITECTURE.md
- type: nfr
- content: Backend not deployed anywhere yet (user-imposed; drives mock-backend-swap). Build off Figma mocks exported as PDF (`kanban-task-management-web-app.pdf`) — fully-specified design system and screen set, light/dark theme, mobile/tablet/desktop breakpoints. API contract already exists at `kanban-board-openapi.json`, built against now even without a deployed backend. "Fully functioning app deployed and verified in prod with full feature set from pdf ... + user sign up sign in" (user-imposed, verbatim) — auth required even though it has no corresponding mock screens. "Multi-user later, not now" (user-imposed, verbatim). "Responsive, modest scale" (user-imposed, verbatim). Solo developer — no multi-team release coordination needed. Framework: Next.js (user-imposed). Design tokens: DTCG JSON via Style Dictionary (user-imposed). CSS: Tailwind, theming via `@theme` (user-imposed). UI primitives: Base UI, chosen over shadcn (user-imposed). Testing strategy exactly as user-specified: TypeScript + ESLint + eslint-plugin-tailwindcss (static, 0 errors); Vitest (unit, ~90% target); Vitest Browser Mode + vitest-browser-react + Chromium via Playwright provider (component, ~70-80% target); Storybook + @storybook/addon-a11y/axe-core (accessibility, no new violations); Storybook + Chromatic/Lost Pixel/Argos (visual regression, design-system components only — resolved to Playwright-native by ADR tech/0008, superseding the SPEC's originally-listed options); Playwright + nextcov (E2E, critical flows); Stryker mutation testing on critical logic. Coverage is explicitly diagnostic, not a target (user-imposed). Linter/formatter tooling explicitly not decided by the user at spec time (resolved by ADR tech/0007 — ESLint + Prettier).

## Out of Scope
- source: HIGH-LEVEL-ARCHITECTURE.md
- type: nfr
- content: Search. User profile/settings beyond theme preference, avatars, notifications, comments/mentions, file attachments, task labels/tags, due dates, multi-workspace/organization support. Password reset/forgot-password and email verification (no such endpoints in the OpenAPI contract). SSO/OAuth sign-in (contract only defines email/password signup/signin). Actual backend implementation — a hard constraint for this frontend, but its implementation is someone else's/later work.

## Open Questions
- source: HIGH-LEVEL-ARCHITECTURE.md
- type: nfr
- content: (Unresolved at SPEC time; two have since been resolved by higher-precedence ADRs — see below.) Activity-log endpoint has no corresponding Figma screen — deferred to a later design pass, or design now? [UNRESOLVED] Signup/signin credential storage mechanism (bearer token vs httpOnly cookie vs other) — [RESOLVED by ADR tech/0001: httpOnly cookie via BFF proxy]. No password-reset/email-verification endpoints — deliberate v1 exclusion or a gap to raise with the backend contract owner? [UNRESOLVED] No error schema defined for a rejected stale-version write — what should the user see? [UNRESOLVED] Does "deployed and verified in prod" happen against the contract-derived mock first, or wait for a real backend? [UNRESOLVED] Board/task counts vary across mock frames ("ALL BOARDS (3)" vs "(8)"; per-column task counts up to 7) — illustrative or a real scale signal? [UNRESOLVED] Linter/formatter choice explicitly open — [RESOLVED by ADR tech/0007: ESLint + Prettier].
