# Phase 2: Board Management - Context

**Gathered:** 2026-08-20
**Status:** Ready for planning

<domain>
## Phase Boundary

A signed-in user creates, browses, organizes, and removes boards from a collapsible personal
sidebar. This covers: viewing the board list, creating a board (optionally naming initial
columns), selecting a board to view its full contents, renaming a board, deleting a board
(hard-cascade to its columns/tasks/subtasks), and collapsing/expanding the sidebar
(BOARD-01 through BOARD-06). Column/task/subtask CRUD *within* a board is out of this phase's
scope (Phases 3 and 4) — this phase only needs enough of column-creation to support "optionally
naming initial columns" at board-creation time.

</domain>

<decisions>
## Implementation Decisions

### Create-board flow

- **D-01:** ~~The create-board form shows 3 empty column-name input rows by default.~~
  **SUPERSEDED 2026-08-24 by D-01a** during 02-10 checkpoint review.
- **D-01a:** The create-board form shows **exactly 1** empty column-name input row by default, so
  the user is not made to clear rows they did not ask for. Rows can still be added freely.
- **D-02:** ~~Rows can be freely added beyond 3 and removed down to 0 — 0 named columns is a valid
  submission, and a blank row is omitted rather than blocked.~~
  **SUPERSEDED 2026-08-24 by D-02a** during 02-10 checkpoint review.
- **D-02a:** A blank or whitespace-only column row **blocks submission** with a validation error
  rather than being silently dropped. Removing a row down to 0 rows remains valid — 0 named
  columns still creates a board with no columns. The distinction is that an *empty row left on
  screen* is now a user error to correct, not input to silently discard.

  *Why the reversal:* silently dropping a row the user had typed into and then cleared makes the
  created board differ from what is on screen at submit time, with no feedback. Rejected on
  review of the built flow. The original D-02 rationale (do not block on rows the user never
  filled) is preserved by D-01a instead: defaulting to 1 row means there is nothing to clear.
- **D-03:** Board creation is client-orchestrated (no bulk-create endpoint —
  `SaveBoardRequestDTO` only accepts `name`; ADR domain/0003): `POST /boards` first, then a
  sequential `POST /boards/{boardId}/columns` per named column. Per ADR domain/0003, a partial
  failure keeps whatever succeeded rather than rolling back.
- **D-04:** If the board is created but a later column POST fails: close the modal, navigate to
  the new board (it exists, columns partially applied), and show an inline error/toast reporting
  which column(s) failed, with a retry action scoped to just the failed column(s).
- **D-05:** If the board-name `POST /boards` itself fails (nothing created yet): keep the modal
  open with the entered name/columns intact, show an inline error, let the user retry
  immediately — nothing to reconcile since nothing was created.

### Delete confirmation

- **D-06:** Board delete uses a plain confirm modal ("Delete '[Board Name]'? This will
  permanently delete all its columns and tasks." + Delete/Cancel), not a type-the-name-to-confirm
  pattern — matches ADR domain/0002's hard-cascade-no-undo behavior without adding disproportionate
  friction for a solo-dev-scale app.
- **D-07:** The delete action lives in a per-board kebab/overflow menu (Dropdown primitive) on
  each sidebar board row, alongside Rename — not inside the board view itself.
- **D-08:** Deleting the currently-open board redirects to another remaining board if one exists
  (auto-select, per D-11's ordering), or to the zero-boards empty state (D-13) if that was the
  last board.
- **D-09:** If the delete request itself fails (generic error, not a version conflict — SYNC-01
  is Phase 4 scope): close the confirm modal, leave the board in the sidebar (no optimistic
  removal before success), show an error toast so the user can retry the delete action again.

### Empty & landing states

- **D-10:** A first-time user with zero boards visiting `/boards` sees an empty-state screen
  (centered message + "Create your first board" CTA using the same create-board modal the
  sidebar's own create button opens) — the modal does not auto-open.
- **D-11:** When boards exist but there's no valid selection (bare `/boards`, or a stale/invalid
  `boardId`), the app auto-selects and redirects into the first board in the sidebar list
  (consistent with D-08's delete-redirect behavior) rather than showing a neutral "pick a board"
  prompt.
- **D-12:** The sidebar lists boards in creation order, newest first. This is also what "first
  board" means for D-11's auto-select and D-08's delete-redirect.
- **D-13 [research flag]:** `BoardResponseDTO` (`GET /boards`) returns only `{id, name,
  version}` — no `createdAt`/timestamp field. "Newest first" (D-12) therefore depends on either
  the array order the backend already returns from `GET /boards`, or the `id` being
  chronologically sortable — **neither is confirmed yet**. Research/planning must verify this
  against the real backend (inspect actual `GET /boards` response order and `id` format) before
  implementation, and fall back sensibly (e.g. sort by `id` string, or accept server order
  as-is) if strict newest-first isn't achievable as specified. The user's explicit direction:
  keep newest-first as the intended UX, don't silently downgrade to alphabetical without
  checking first.

### Rename interaction

- **D-14:** Rename uses a modal (`EditBoardModal`, already named in CONVENTIONS.md's directory
  tree) — same TextField pattern as create-board, triggered from the same sidebar kebab menu as
  Delete (D-07).
- **D-15:** Rename applies optimistically: the sidebar name updates immediately on submit via
  TanStack Query's `onMutate`, and rolls back to the old name with an error toast if
  `PUT /boards/{boardId}` fails (per ADR tech/0002's `onMutate`/`onError` requirement for every
  versioned mutation). This establishes the general optimistic-update pattern board/column/task
  mutations follow project-wide, not just for rename.

### Prerequisite: Theme/Cookie/Actions Cleanup (2026-08-20)

Session context: before starting board-management work, the user raised a batch of architecture
concerns in Phase 1's auth/theme code — worked through via `superpowers:brainstorming`
(architectural path) to a fully approved design, written up at
`docs/superpowers/specs/2026-08-20-theme-cookies-actions-cleanup-design.md`. **This is prerequisite
scope, not board-management work** — it must be planned and executed as the first plan(s) in
Phase 2's wave sequence, before any BOARD-01..06 work begins (same pattern Phase 1's gap-closure
rounds used). All items below are additive to the Implementation Decisions above; none of D-01
through D-15 are affected.

- **PC-01 (THEME enum-like const):** A `THEME` const (`{ LIGHT: "LIGHT", DARK: "DARK" } as const`)
  and derived `Theme` type move to a new pure concern folder, `lib/core/theme/` — recreating a
  pattern that used to exist in the now-deleted `lib/mocks/store.ts` (GC-22) and was never rebuilt.
  Fixes the current 3-way duplication of the `Theme` type (`lib/server/theme.ts`,
  `lib/server/session.ts`, `features/theme/hooks/use-theme-preference.ts`) and replaces every
  `"LIGHT"`/`"DARK"` string literal project-wide with `THEME.LIGHT`/`THEME.DARK`.
- **PC-02 (centralized cookie registry):** A new pure concern folder, `lib/core/cookies/`, holds a
  `COOKIE` const naming every cookie this app sets or reads (`SESSION`, `THEME`,
  `UPSTREAM_SESSION`) plus a shared `baseCookieOptions()` helper for the option fields duplicated
  across `session.ts`/`theme.ts` today (`secure`, `sameSite`, `path`). `session.ts` keeps its
  existing `createSessionService` factory structure unchanged — it only switches to importing
  `COOKIE.SESSION` instead of declaring its own constant.
- **PC-03 (theme + upstream cookie I/O relocated and factory-namespaced):** A new
  `lib/server/cookies/` subfolder (mirroring `lib/core/`'s own concern-subfolder convention) holds
  `theme-cookie.ts` (replaces `lib/server/theme.ts`'s `readThemeCookie`/`writeThemeCookie`, now
  `themeCookie.read()`/`themeCookie.write(theme)`) and `upstream-cookie.ts` (renamed from
  `lib/server/session-cookie.ts`, now `upstreamCookie.extract(response)`/
  `upstreamCookie.toHeader(jsessionId)`) — both factory-namespaced, matching the
  `createSessionService` shape `session.ts` already uses. The rename resolves the naming collision
  with `session.ts` that obscured why this module reads `response.headers.getSetCookie()` instead
  of `next/headers`'s `cookies()` (it parses an external backend `Response`, not this app's own
  request/response).
- **PC-04 (`features/<domain>/actions/` — one file per Server Action):** Replaces GC-27's flat
  `actions.ts` convention. `features/auth/actions.ts` splits into `features/auth/actions/{sign-in,
  sign-up, sign-out}.ts` (each with its own co-located `*.unit.test.ts`); `features/theme/actions.ts`
  becomes `features/theme/actions/update-theme.ts`. `action-state.ts` stays at the feature root
  (shared type, not an action). New project-wide CONVENTIONS.md rule — applies automatically to any
  future domain that gains a Server Action; board/column/task mutations stay on TanStack Query
  (ADR tech/0002/GC-24) and are unaffected.
- **PC-05 (comment length discipline):** New CONVENTIONS.md rule: a WHY-comment is at most 1-3
  lines; longer rationale (threat-model citations, multi-step history) belongs in the relevant
  ADR/CONTEXT.md/SUMMARY.md, referenced by a short pointer instead of restated inline. Enforcement
  is code review (no automated prose-length linter). Applied retroactively only in files PC-01
  through PC-04 already touch — not swept project-wide.

### Wave 9 refactor insertion (2026-08-25, D-27 through D-30)

Recorded from `.continue-here.md`'s "Open decisions → 2. Wave 9 content". The user chose to insert
this refactor work immediately after Wave 8 (plan 02-10) and *before* the remaining feature plans, so
board detail (02-11), rename (02-12) and delete (02-13) are written against the replacement patterns
rather than adding three more instances of the ones being replaced. The CONVENTIONS.md text for D-27
and D-28 already landed in commit `dc63dc5`; the enforcement and the refactor had not been planned.

Existing plans 02-11/02-12/02-13 keep their IDs and shift to waves 11/12/13. The new work is plans
02-14 (wave 9) and 02-15 (wave 10).

- **D-27 (shared status enum):** The result/status discriminant retyped as a bare inline literal
  across 18 files becomes one shared enum-like constant following ADR tech/0012, and all 18 call
  sites migrate onto it. Scope covers every Server Action, every RSC read function, every Storybook
  action stub, both auth forms, both client mutation hooks and `app/(dashboard)/layout.tsx`. Plan
  02-14, Tasks 1-2.
- **D-28 (`.tsx` holds only components and prop types):** Non-component declarations move out of
  `.tsx` files, and the rule gains a real mechanical gate rather than a convention note.
  `add-board-modal.tsx` is the named live example; the gate has to be green repository-wide, so every
  other declaration site is either extracted or carried in a written exemption list. Plan 02-15,
  Tasks 1-2 and 4.
- **D-29 (story-only test rendering, enforced):** `add-board-modal.test.tsx` renders the component
  directly instead of going through named exported stories, violating the *existing* ADR tech/0025 —
  whose Enforcement line says "code review", which is exactly why it was missed. Both halves are in
  scope: the test is rewritten as a named exported story per prop combination (**not** one composed
  story fed varying props, which the same ADR bans), and a real enforcement mechanism is researched,
  selected and wired, with ADR tech/0025's Enforcement line updated to match reality. Plan 02-15,
  Tasks 1, 3 and 4.
- **D-30 (`usehooks-ts` for boolean state):** `usehooks-ts` is adopted as a dependency and its
  boolean-state hook replaces the hand-rolled `useState` pair, starting from `sidebar.tsx`'s
  `isExpanded`. Scoped to genuinely boolean toggle state matching that call site's shape — not every
  `useState` in the codebase. Plan 02-14, Tasks 3-4.

### Wave 10 enforcement mechanisms (2026-08-25, D-28a through D-28c and D-29a)

Settled by the user at plan 02-15's Task 1 `checkpoint:decision`, which asked three linked
questions: what mechanism enforces D-28, which of D-28's live declaration sites are extracted
versus exempted, and what mechanism enforces D-29. The answers below are what plan 02-15 Tasks 2-4
build, and they are the reason ADR tech/0027 exists.

- **D-28a (mechanism — option `own-checkers`):** Both rules are enforced by hand-written,
  dependency-free checker scripts under `scripts/`, parsing with the already-installed TypeScript
  compiler API, each with a co-located `*.unit.test.mjs` and each wired into CI's `quality` job.
  This follows the four checkers already there (`check-comment-length.mjs`,
  `check-no-play-functions.mjs`, `check-no-route-handlers.mjs`, `check-routes.mjs`) and reuses
  `scripts/glob-real-files.mjs`. It adds **no npm package**, so the phase's Package Legitimacy Audit
  claim that this phase installs nothing new still holds and no legitimacy gate is triggered.
  `no-restricted-syntax` was rejected outright: a `files`-scoped block replaces rather than merges
  with `eslint.config.mjs` section 8d's array. `dependency-cruiser`, `ts-arch` and
  `eslint-plugin-boundaries` were rejected as module-graph-only (they see the import, never the
  render or the declaration) and, for the first two, as new supply-chain surface.
- **D-28b (exemption surface):** Every live declaration site is **extracted**, including all
  `cva(...)` variant constants — which the Task 1 inventory undercounted as eight across seven
  files. The real count is **nine across seven files**: `switch.tsx` declares three (`rootVariants`,
  `trackVariants`, `thumbVariants`), not one. Each moves to a sibling non-`.tsx` module beside its
  component. Only two exemptions remain, both recorded in ADR tech/0027 and nowhere else: Next.js's
  framework-forced route-segment exports in `app/` route files, and `src/test-utils/`, which is test
  infrastructure never imported by application code.
- **D-28c (compound-component namespace objects):** The `export const Toast = { Root, Content, ... }`
  object that `toast.tsx`, `dropdown.tsx`, `menu.tsx` and `modal.tsx` each close with is neither a
  component nor a prop type, but it is not a defect either — it is this project's compound-component
  pattern. It becomes a **fifth permitted declaration kind** in the checker, recognised
  structurally: a top-level `export const` whose initializer is an object literal every one of whose
  property values is an identifier referencing a component declared earlier in the same file.
  Deliberately *not* a hardcoded list of exempt file paths, so a future compound component is
  covered automatically without editing either the checker or the ADR.
- **D-29a (story-rule mechanism):** Same `own-checkers` answer —
  `scripts/check-story-only-renders.mjs`. The rule is about the render, not the import graph, which
  is precisely what no module-graph tool can express.

One further correction to plan 02-15's own prose: it describes `add-board-modal.test.tsx` as
carrying **nineteen** cases. The file carries **twenty**. Twenty is the floor the rewrite may not
fall below.

### Claude's Discretion

None — every gray area discussed had a concrete decision made; no "you decide" selections in
this round.

### Folded Todos

- **Clear the theme cookie on sign-out**
  (`.planning/todos/pending/2026-08-20-clear-theme-cookie-on-sign-out.md`) — narrow shared-browser
  cross-account edge case from Phase 1, explicitly folded into Phase 2's scope by the user
  during this discussion rather than left pending.
- **Fix path traversal in `scripts/serve-static.mjs`**
  (`.planning/todos/pending/2026-08-20-fix-path-traversal-in-serve-static-visual-test-server.md`)
  — dev/CI-only Playwright visual webServer issue, low exposure, explicitly folded into Phase 2's
  scope by the user during this discussion rather than left pending. Unrelated to board-domain
  work — the planner should treat this as an independent, standalone task within the phase, not
  something to weave into board-feature plans.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` — BOARD-01 through BOARD-06 (this phase's requirements).
- `.planning/ROADMAP.md` §Phase 2 — Goal and Success Criteria.
- `.planning/PROJECT.md` — Constraints (cascade delete, no bulk-create, feature-folder
  structure), Key Decisions table.

### Domain ADRs governing this phase's mechanics
- `docs/adr/domain/0002-hard-cascade-delete.md` — governs D-06/D-08/D-09 (delete has no undo,
  no soft-delete).
- `docs/adr/domain/0003-client-orchestrated-multi-child-creation.md` — governs D-03/D-04/D-05
  (no bulk-create endpoint; partial failures kept, not rolled back).
- `docs/adr/domain/0001-single-owner-boards.md` — every board is scoped to exactly one user
  (relevant to how the BFF derives `userId` for board calls — see Existing Code Insights below).

### Tech ADRs this phase's mutations depend on
- `docs/adr/tech/0002-client-data-fetching-strategy.md` (+ its GC-24 auth-carve-out amendment,
  cited in `01-CONTEXT.md`) — board/column/task mutations stay on TanStack Query with
  `onMutate`/`onError`, governs D-15's optimistic-rename precedent and every future board
  mutation.
- `docs/adr/tech/0001-auth-session-storage.md` — BFF-proxied auth; all authenticated board calls
  must go through the server boundary, never a direct client-side call to the external API.

### API contract
- `docs/api/kanban-board-openapi.json` — `/boards`, `/boards/{boardId}`, `/boards/{boardId}/full`,
  `/boards/{boardId}/columns` paths; `SaveBoardRequestDTO`, `UpdateBoardRequestDTO`,
  `BoardResponseDTO`, `BoardFullResponseDTO` schemas. Note `GET`/`POST /boards` and
  `PUT`/`DELETE /boards/{boardId}` all require `userId` as a **required query parameter** — see
  Existing Code Insights below for why this needs research attention, not a user decision.

### Design source
- `.planning/local-assets/kanban-task-management-web-app.pdf` (Figma export) — sole design
  source for the sidebar, board list, and modal visuals; feed to `/gsd-ui-phase 2` for the
  detailed design contract (ROADMAP.md marks this phase `UI hint: yes`).

### Prerequisite cleanup (2026-08-20, PC-01 through PC-05)
- `docs/superpowers/specs/2026-08-20-theme-cookies-actions-cleanup-design.md` — the full approved
  design: `THEME`/`COOKIE` const placement, `lib/server/cookies/` relocation, the
  `features/<domain>/actions/` convention, and the comment-length rule. Read this before
  planning/implementing PC-01 through PC-05 — plan and execute this scope first, before any
  board-management (BOARD-01..06) plan.

### Prior-phase context this phase inherits
- `.planning/phases/01-foundation-auth-preferences/01-CONTEXT.md` — GC-21 (deferred from Phase 1)
  is the same `userId`-query-param issue re-surfaced above; D-26v (className/tailwind-merge on
  every primitive), D-19 (Dropdown compound-component API, needed for the sidebar kebab menu),
  and D-06 (Modal is the existing primitive `EditBoardModal`/create-board/delete-confirm build
  on) are all directly reused by this phase's UI.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/modal/`, `components/ui/text-field/`, `components/ui/dropdown/`,
  `components/ui/button/` — all built in Phase 1, directly reusable for the create-board modal,
  `EditBoardModal`, delete-confirm modal, and the sidebar's per-board kebab menu.
- `app/(dashboard)/layout.tsx` — already verifies the session and renders a header with
  `ThemeToggle`/`SignOutButton`; this phase adds the sidebar into this same shell (currently
  `<main>` has no sidebar sibling).
- `app/(dashboard)/boards/page.tsx` and `app/(dashboard)/boards/[boardId]/page.tsx` — both exist
  as placeholder routes ("Board content arrives in phase 2") ready to be filled in.

### Established Patterns
- CONVENTIONS.md's directory tree already names the exact components this phase needs:
  `features/boards/components/` → `BoardCard`, `AddBoardModal`, `EditBoardModal`,
  `DeleteBoardConfirm`; `features/boards/hooks/` → `useBoards`, `useCreateBoard`,
  `useUpdateBoard`; `components/layout/` → `Sidebar`.
- DEFAULTS.md C-009: sidebar collapsed/expanded state is plain React `useState` (no
  state-management library, no persistence) — already locked, not a gray area for this
  discussion.

### Integration Points — flagged for research, not decided here
- **`userId` as a required query parameter:** `GET /boards`, `POST /boards`,
  `PUT /boards/{boardId}`, `DELETE /boards/{boardId}`, and `GET /boards/{boardId}/full` all
  declare `userId` as a **required query string parameter** in the OpenAPI contract — unusual
  for a backend that's otherwise session-authenticated via the bridged `JSESSIONID` cookie
  (Phase 1's GC-18). This was flagged but explicitly deferred in `01-CONTEXT.md` (GC-21) for
  Phase 2 planning attention. It is a technical/architecture question (where does the BFF derive
  `userId` from — the verified session identity, never client-supplied — and what's the request
  transport: a Route Handler, or a Server Action used directly as a TanStack Query `mutationFn`),
  not a user-facing gray area, so it was not asked about in this discussion. `gsd-phase-researcher`
  should resolve the concrete mechanism.
- **`SaveBoardRequestDTO`/`UpdateBoardRequestDTO` have no `maxLength` on `name`** in the
  contract (only `minLength: 1` on create) — research should confirm the real backend's actual
  validation rule (same alignment exercise as Phase 1's GC-02 for auth) before locking a Zod
  schema.

</code_context>

<specifics>
## Specific Ideas

None beyond what's captured in the Implementation Decisions above — this discussion stayed
concrete and behavior-focused throughout (create-board partial-failure handling, delete
confirmation strength, empty/landing states, rename mechanics).

</specifics>

<deferred>
## Deferred Ideas

None raised beyond the phase boundary during this discussion — every topic stayed within
Board Management's scope.

### Reviewed Todos (not folded)
None — both matched pending todos were folded into scope (see Folded Todos above).

</deferred>

---

*Phase: 2-Board Management*
*Context gathered: 2026-08-20*
