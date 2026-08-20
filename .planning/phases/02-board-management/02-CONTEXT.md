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

- **D-01:** The create-board form shows 3 empty column-name input rows by default (matches the
  classic Todo/Doing/Done Kanban starter shape).
- **D-02:** Rows can be freely added beyond 3 and removed down to 0 — 0 named columns is a valid
  submission (the board is simply created with no columns yet, added later in Phase 3).
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
