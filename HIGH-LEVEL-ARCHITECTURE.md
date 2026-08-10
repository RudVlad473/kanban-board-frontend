---
archetypes: [spa, ssr-app, api-client]
primary_artifact: a task (card) moving through workflow columns on a board
budget_notes: "throughput/storage is negligible at this scale (botec.py:
  bandwidth_peak ~1B/s, servers_needed 0) — NOT the constrained resource;
  the real ceilings are a ~20KB full-board fetch payload (manual estimate)
  and drag-and-drop interaction frame budget across mobile/tablet/desktop
  breakpoints"
---
# Classification

**spa** — once a board is loaded, all interaction (dragging a task
between columns, opening the task-detail modal, editing subtasks,
toggling a checkbox) happens client-side against in-memory state with no
full-page reload; the experience is that of a single continuously-running
client app, not a series of independent page fetches.

**ssr-app** — the app is not one monolithic bundle: sign-in, the board
list, and an individual board are distinct authenticated routes, each
benefiting from being rendered per-request rather than shipped as one
client-only shell. Route-level auth gating (redirect an unauthenticated
visitor away from a board route) is a server-rendering concern, not a
client-only one.

**api-client** — the frontend owns no persistence and no business logic
of its own; every board, column, task, and subtask lives behind a REST
contract (`kanban-board-openapi.json`) and the app's entire job is to
render that contract's data and issue well-formed mutations against it,
including respecting the contract's optimistic-locking (`version`) rules.

# Flow Spine

Write path:
1. authenticate — email + password → session established (signup returns
   an opaque string, signin returns 200 with no documented body — see
   Open Questions item 2 for what the frontend is meant to hold onto)
2. create-board — board name + initial columns → new board persisted,
   appears in the sidebar board list
3. create-column — column name (+ board id) → new column added to the
   board, appears as a swimlane
4. create-task — task title/description + column id → new task
   persisted, rendered in its column
5. edit-task — task id + updated title/description/status + current
   version → updated task rendered
6. toggle-subtask — subtask id + completion flag + current version →
   subtask and the task's "x of y subtasks" progress updated
7. move-task — drag gesture (source column/position → target
   column/position) + current version → task's column/position updated;
   applied optimistically in the UI, then reconciled against the
   server's response
8. reorder-column / delete-column / delete-board / delete-task —
   version-checked mutations sharing move-task's shape: optimistic
   apply, server-confirmed
9. toggle-theme — light/dark preference → persisted per-user, applied
   across the UI
10. reconcile-conflict — a version-checked write (5-8) is rejected as
    stale → the optimistic local change is rolled back and the affected
    record is refetched (archetype-derived: api-client → the contract
    enforces optimistic locking everywhere, so the spine needs an
    explicit path for a rejected write, not just the happy path)
11. route-guard — an unauthenticated visitor requests a board or
    board-list route → redirected to sign-in before any board data is
    requested (archetype-derived: ssr-app → route-level auth gating)

Read path:
12. select-board — board id (from sidebar) → full board (columns, tasks,
    subtasks) fetched via `GET /boards/{boardId}/full` and rendered
13. view-task-detail — task id → task-detail modal rendered (title,
    description, subtasks checklist, status dropdown, edit/delete)
14. view-activity — board id (+ page) → paginated activity log fetched
    and rendered (archetype-derived: api-client → the one endpoint in
    the contract that is paginated; also the one screen with no
    corresponding mock — see Open Questions item 1)

Build-time path (independent of the above, only until a real backend
exists):
15. mock-backend-swap — the OpenAPI contract, with no deployed
    implementation behind it yet → a contract-derived mock/stub server
    the frontend is built and tested against, swapped for the real
    backend's base URL once it is deployed (archetype-derived: api-client
    → the boundary must be satisfiable before the real service exists)

# Cross-cutting

**Runtime**
- State: server owns boards/columns/tasks/subtasks/users behind the REST
  contract; the frontend owns only ephemeral client state — the current
  board's in-memory mirror of that data, the auth session, the theme
  preference (also mirrored server-side), sidebar collapsed/expanded UI
  state (client-only, never synced), and in-flight optimistic-update
  state for a drag in progress.
- Boundaries: the frontend talks to exactly one boundary — the REST API
  described by the OpenAPI contract. Until the real backend is deployed,
  that boundary is satisfied by a contract-derived mock (stage 15) so the
  shape the frontend is built against never silently drifts from the
  shape it will eventually call.
- Movement: nearly everything is synchronous request/response (create,
  edit, delete, fetch). `move-task` (stage 7) and the other
  version-checked mutations (stage 8) are the exception — applied
  optimistically client-side, then reconciled once the server responds.
- Identity: boards, columns, tasks, and subtasks are keyed by opaque
  backend-issued ids. A task's (column, position) is *not* its identity —
  it changes on every move — so the frontend must track a task by id
  through a drag, not by its current slot.
- Trust: every contract endpoint takes a `userId` scoped to the
  authenticated caller; authorization itself is enforced entirely
  server-side. The frontend's obligation is to hold a valid session and
  never construct a request against a board/user id it doesn't own.
- Secrets: whatever credential signup/signin issues (Open Questions item
  2 — token or cookie is not yet clear from the contract) must not be
  logged, and if it is a bearer token rather than an httpOnly cookie, it
  needs a deliberate storage decision rather than a default one.
- Concurrency: two distinct races — (a) the same user editing from two
  tabs or devices, and (b) a drag-reorder racing a background refetch.
  The contract's `version` field on every column/task/subtask mutation,
  move, and reorder is the mechanism; a stale version must be rejected
  by the backend and reconciled by the frontend (stage 10), not silently
  overwritten.
- Failure: a failed read degrades to a retry/empty state; a failed write
  must roll back its optimistic update (a reverted drag, a reverted
  checkbox) and surface an error. A version-conflict rejection (stage
  10) is a distinct failure mode from a network failure and needs its
  own UX — the contract defines no error schema for it (Open Questions
  item 4).
- Observability: as a solo-maintained frontend with no backend team
  dashboard to lean on, failed requests and version conflicts need
  client-side error reporting; no analytics requirement was stated.
- Budget: throughput and storage are not the constraint at this scale
  (Provenance) — the real ceilings are the full-board fetch payload
  (~20KB estimated) and the frame budget for drag-and-drop feeling
  responsive across mobile/tablet/desktop breakpoints.
- Delivery: a single deployable frontend, built and tested against the
  OpenAPI contract via a mock layer (stage 15) since no backend is
  deployed anywhere yet, requested to reach an actual production
  deployment regardless.

**Dev-process**
- Verification: a full layered test pyramid is already specified by the
  user (static analysis, unit, component/browser-mode, accessibility,
  visual regression, and E2E) — see Known Constraints. E2E against a real
  non-prod backend is explicitly sequenced *after* everything else is
  settled, since no backend is deployed yet to run E2E against today.
- Change over time: the frontend's main axis of change is the OpenAPI
  contract it's built against (a DTO added or changed is a breaking
  change to reconcile); design tokens (DTCG JSON → Style Dictionary
  output) version independently of component code, so a token change
  never forces a component-logic change and vice versa.

# Deferred

- Real-time multi-user collaboration — user-stated as "later, not now";
  reopens when a second concurrent editor on the same board becomes a
  real scenario. The contract's `version`-based optimistic locking
  already anticipates this even though the UI doesn't need to expose
  conflict-resolution UX for it yet beyond stage 10's basic reconcile.
- E2E testing against an actual non-prod service — user-stated as
  something to wire up "in future when we have everything else settled";
  today there is no deployed backend for it to target.
- Board/column/task virtualization or any large-scale rendering
  optimization — the user chose modest scale over large-scale boards;
  reopens if a column's task count grows well past the ~30-tasks/column
  assumption behind the payload estimate below.

# Known Constraints

- "Frontend part of a kanban board application" — backend is not
  deployed anywhere yet (user-imposed; drives the mock-backend-swap
  stage).
- Build off Figma mocks exported as PDF
  (`kanban-task-management-web-app.pdf`) — a fully-specified,
  Frontend-Mentor-style design system and screen set (colors, typography,
  buttons, form fields, dropdowns, checkboxes; sidebar, board view, task
  detail, add/edit task, add/edit board, delete-confirmation modals;
  light and dark theme; mobile/tablet/desktop breakpoints).
- API contract already exists at `kanban-board-openapi.json` and is to
  be built against now even without a deployed backend (user-imposed).
- "a fully functioning app deployed and verified in prod with full
  feature set from pdf ... + user sign up sign in (not in docs but we
  need it)" (user-imposed, verbatim) — auth is required even though it
  has no corresponding mock screens.
- "Multi-user later, not now" (user-imposed, verbatim) — single-user
  concurrency model for now.
- "Responsive, modest scale" (user-imposed, verbatim) — must work on
  mobile/tablet/desktop; not designed for large-scale boards.
- Solo developer — no multi-team release coordination needed.
- Framework: Next.js (user-imposed).
- Design tokens: DTCG JSON format, generated via Style Dictionary
  (user-imposed).
- CSS: Tailwind, theming via `@theme` (Tailwind v4 CSS-first theming)
  (user-imposed).
- UI primitives: Base UI, deliberately chosen over shadcn for this
  greenfield project (user-imposed).
- Testing strategy, exactly as specified by the user's own layered
  diagram: TypeScript + ESLint + `eslint-plugin-tailwindcss` (static, 0
  errors); Vitest (unit, ~90% target on utils/hooks); Vitest Browser Mode
  + `vitest-browser-react` + Chromium via the Playwright provider
  (component, ~70-80% target on client components); Storybook +
  `@storybook/addon-a11y`/axe-core (accessibility, no new violations vs.
  baseline); Storybook + Chromatic (managed) or Lost Pixel/Argos (OSS)
  for visual regression, design-system components only; Playwright +
  `nextcov` for E2E and async Server Component coverage on critical
  flows; Stryker mutation testing on critical logic. Coverage is
  explicitly a diagnostic, not a target (user-imposed).
- Linter/formatter tooling itself is explicitly *not* decided by the user
  ("not sure what's the industry standard thing in 2026") — this is a
  technology-selection question for a downstream step, not a constraint.

# Out of Scope

- Search — present in neither the Figma mocks nor the OpenAPI contract.
- User profile/settings beyond the theme preference, avatars,
  notifications, comments/mentions, file attachments, task labels/tags,
  due dates, and multi-workspace/organization support — none appear in
  either source document.
- Password reset / forgot-password and email verification — no such
  endpoints exist in the OpenAPI contract (see also Open Questions item
  3).
- SSO/OAuth sign-in — the contract only defines email/password
  signup/signin.
- Actual backend implementation — a real concern, but not this
  frontend's; the contract is a hard constraint, its implementation is
  someone else's (or a later) work.

# Open Questions

- The activity-log endpoint (`GET /boards/{boardId}/activity`, paginated)
  is fully specified in the API contract but has no corresponding screen
  anywhere in the Figma mocks — is its UI deferred to a later design
  pass, or should it be designed now alongside the rest?
- Signup returns a bare string and signin returns a 200 with no
  documented response body — is the frontend meant to manage a bearer
  token, an httpOnly session cookie, or something else? This decides
  where credentials live client-side and is a Secrets/Trust concern, not
  just a detail.
- No password-reset or email-verification endpoints exist in the
  contract — is that a deliberate v1 exclusion, or a gap to raise with
  whoever owns the backend contract?
- The contract enforces optimistic locking (`version` field) on every
  column/task/subtask mutation, move, and reorder, but defines no error
  schema for a rejected stale-version write — what should the user see
  when a move or edit is rejected as conflicting with a newer version?
- "Deployed and verified in prod" was requested even though no backend
  is deployed anywhere — does production deployment happen against the
  contract-derived mock first (with the real backend swapped in later),
  or does it wait until a real backend exists to point at?
- Board/task counts vary across the mock frames (sidebar shows "ALL
  BOARDS (3)" in some frames and "(8)" in others; per-column task counts
  run up to 7) — is that just illustrative content, or a real signal
  about expected scale? The ~20KB board-payload estimate below assumes
  5 columns × 6 tasks × 3 subtasks as a representative "modest" board;
  unconfirmed.
- Linter/formatter choice is explicitly open per the user — flagged here
  so the downstream technology-selection step picks it up rather than it
  being silently skipped.

# Provenance

- `budget_notes` "bandwidth_peak ~1B/s, servers_needed 0" —
  `botec.py --dau 1 --actions 50 --peak 2 --obj-bytes 500 --media-frac 0
  --retention-days 1 --server-qps 1000 --json` →
  `bandwidth_peak_bytes_per_sec: 1`, `servers_needed: 0` (modeling a
  single active solo user performing ~50 write actions/day at ~500B per
  request/response, which is generous for this scale) — confirms
  throughput/storage was never the constrained resource here.
- `budget_notes` "~20KB full-board fetch payload" — `assumption`, a
  manual chain (not `botec.py`, whose DAU/day model doesn't fit a
  single page-load fetch): 5 columns × ~150B + 30 tasks × ~300B + 90
  subtasks × ~120B ≈ 20.5KB, using the field shapes in
  `ColumnFullResponseDTO`/`TaskFullResponseDTO`/`SubtaskResponseDTO`
  from `kanban-board-openapi.json` and the column/task/subtask counts
  assumed above (Open Questions, last item).
- Cross-cutting → Budget "modest scale" — `user-stated` (the user chose
  "Responsive, modest scale" when asked directly), with the specific
  column/task/subtask counts behind the payload estimate marked
  `assumption` (same Open Questions item).
- Classification, Flow Spine, and Known Constraints' description of the
  mock screens — `user-stated`, derived from reading
  `kanban-task-management-web-app.pdf` (via `pdftotext -layout`, since
  the 110MB file exceeds direct PDF extraction limits).
- Flow Spine's API shapes (endpoints, `version` fields, activity-log
  pagination, DTO fields) and Known Constraints' API-contract entry —
  `user-stated`, derived from reading `kanban-board-openapi.json`
  directly.
- Known Constraints' tooling entries (Next.js, DTCG/Style Dictionary,
  Tailwind `@theme`, Base UI, the full testing-strategy list) —
  `user-stated`, taken verbatim or near-verbatim from the conversation
  and the two testing-strategy images provided.
- "Multi-user later, not now" and "Responsive, modest scale" — `
  user-stated`, taken verbatim from the requirements-scoping question
  answers.

# How to Verify

Reproduce the one script-derived figure directly. `<iluvatar>` is this
skill's own resolved directory (`C:\Users\andre\.claude\skills\iluvatar`
at the time this document was written) — substitute it for wherever it
actually lives:

```bash
python <iluvatar>/references/vendor/back-of-the-envelope/scripts/botec.py \
  --dau 1 --actions 50 --peak 2 --obj-bytes 500 --media-frac 0 \
  --retention-days 1 --server-qps 1000 --json
```

Confirm `bandwidth_peak_bytes_per_sec: 1` and `servers_needed: 0`.

The ~20KB board-payload figure is a manual chain, not script-verified —
re-check it by reading `ColumnFullResponseDTO`, `TaskFullResponseDTO`,
and `SubtaskResponseDTO` in `kanban-board-openapi.json` and recomputing
5×~150B + 30×~300B + 90×~120B.

The mock-screen inventory (Classification, Flow Spine, Known
Constraints) was produced by extracting the PDF's text layer, since the
110MB file exceeds this environment's direct-PDF-read size limit:

```bash
pdftotext -layout "kanban-task-management-web-app.pdf" full.txt
```

Every other figure in this document is `user-stated` or `assumption` —
Provenance says which, and each `assumption` cross-references the Open
Questions entry it is still waiting to be confirmed against.
