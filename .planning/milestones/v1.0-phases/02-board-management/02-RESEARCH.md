# Phase 2: Board Management - Research

**Researched:** 2026-08-20
**Domain:** Next.js App Router BFF data layer (TanStack Query + Route Handlers) for a versioned,
single-owner, hard-cascade REST domain; client-orchestrated multi-child creation; sidebar/modal UI
built entirely from existing Phase 1 primitives.
**Confidence:** HIGH (architecture/stack — every load-bearing claim below is read directly from this
repo's own ADRs, CONVENTIONS.md, source files, or the committed OpenAPI contract) / MEDIUM (a few
backend-runtime behaviors — sort order, error-body shape for board endpoints — that were never
observed live and could not be verified in this session; flagged explicitly below).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Create-board flow**
- D-01: The create-board form shows 3 empty column-name input rows by default (matches the classic
  Todo/Doing/Done Kanban starter shape).
- D-02: Rows can be freely added beyond 3 and removed down to 0 — 0 named columns is a valid
  submission (the board is simply created with no columns yet, added later in Phase 3).
- D-03: Board creation is client-orchestrated (no bulk-create endpoint — `SaveBoardRequestDTO` only
  accepts `name`; ADR domain/0003): `POST /boards` first, then a sequential `POST
  /boards/{boardId}/columns` per named column. Per ADR domain/0003, a partial failure keeps whatever
  succeeded rather than rolling back.
- D-04: If the board is created but a later column POST fails: close the modal, navigate to the new
  board (it exists, columns partially applied), and show an inline error/toast reporting which
  column(s) failed, with a retry action scoped to just the failed column(s).
- D-05: If the board-name `POST /boards` itself fails (nothing created yet): keep the modal open
  with the entered name/columns intact, show an inline error, let the user retry immediately —
  nothing to reconcile since nothing was created.

**Delete confirmation**
- D-06: Board delete uses a plain confirm modal ("Delete '[Board Name]'? This will permanently
  delete all its columns and tasks." + Delete/Cancel), not a type-the-name-to-confirm pattern —
  matches ADR domain/0002's hard-cascade-no-undo behavior without adding disproportionate friction
  for a solo-dev-scale app.
- D-07: The delete action lives in a per-board kebab/overflow menu (Dropdown primitive) on each
  sidebar board row, alongside Rename — not inside the board view itself.
- D-08: Deleting the currently-open board redirects to another remaining board if one exists
  (auto-select, per D-11's ordering), or to the zero-boards empty state (D-13) if that was the last
  board.
- D-09: If the delete request itself fails (generic error, not a version conflict — SYNC-01 is
  Phase 4 scope): close the confirm modal, leave the board in the sidebar (no optimistic removal
  before success), show an error toast so the user can retry the delete action again.

**Empty & landing states**
- D-10: A first-time user with zero boards visiting `/boards` sees an empty-state screen (centered
  message + "Create your first board" CTA using the same create-board modal the sidebar's own
  create button opens) — the modal does not auto-open.
- D-11: When boards exist but there's no valid selection (bare `/boards`, or a stale/invalid
  `boardId`), the app auto-selects and redirects into the first board in the sidebar list
  (consistent with D-08's delete-redirect behavior) rather than showing a neutral "pick a board"
  prompt.
- D-12: The sidebar lists boards in creation order, newest first. This is also what "first board"
  means for D-11's auto-select and D-08's delete-redirect.
- D-13 [research flag]: `BoardResponseDTO` (`GET /boards`) returns only `{id, name, version}` — no
  `createdAt`/timestamp field. "Newest first" (D-12) therefore depends on either the array order the
  backend already returns from `GET /boards`, or the `id` being chronologically sortable — neither
  is confirmed yet. Research/planning must verify this against the real backend (inspect actual `GET
  /boards` response order and `id` format) before implementation, and fall back sensibly (e.g. sort
  by `id` string, or accept server order as-is) if strict newest-first isn't achievable as specified.
  The user's explicit direction: keep newest-first as the intended UX, don't silently downgrade to
  alphabetical without checking first. **See "Open Questions" and "Common Pitfalls" below — this
  session could not reach the live backend to resolve it; carried forward as a planning-time task.**

**Rename interaction**
- D-14: Rename uses a modal (`EditBoardModal`, already named in CONVENTIONS.md's directory tree) —
  same TextField pattern as create-board, triggered from the same sidebar kebab menu as Delete
  (D-07).
- D-15: Rename applies optimistically: the sidebar name updates immediately on submit via TanStack
  Query's `onMutate`, and rolls back to the old name with an error toast if `PUT /boards/{boardId}`
  fails (per ADR tech/0002's `onMutate`/`onError` requirement for every versioned mutation). This
  establishes the general optimistic-update pattern board/column/task mutations follow project-wide,
  not just for rename.

**Prerequisite: Theme/Cookie/Actions Cleanup (2026-08-20)** — must be planned/executed as the first
plan(s) in Phase 2's wave sequence, before any BOARD-01..06 work begins. Full design at
`docs/superpowers/specs/2026-08-20-theme-cookies-actions-cleanup-design.md` (read in full this
session — treated as fully specified, no open design questions remain in it):
- PC-01: `THEME` const + `Theme` type move to new `lib/core/theme/theme.ts`.
- PC-02: `COOKIE` const + `baseCookieOptions()` move to new `lib/core/cookies/cookie-registry.ts`.
- PC-03: theme + upstream cookie I/O relocated and factory-namespaced under new
  `lib/server/cookies/{theme-cookie,upstream-cookie}.ts` (replacing `lib/server/theme.ts` and
  `lib/server/session-cookie.ts`).
- PC-04: `features/<domain>/actions/` — one file per Server Action, replacing flat `actions.ts`.
  Board/column/task mutations stay on TanStack Query and are explicitly unaffected by this rule
  (they never gain an `actions/` folder).
- PC-05: WHY-comments capped at 1-3 lines, enforced by code review only, applied retroactively only
  in files PC-01-04 already touch.

### Claude's Discretion

None — every gray area discussed had a concrete decision made; no "you decide" selections in this
round.

### Deferred Ideas (OUT OF SCOPE)

None raised beyond the phase boundary during this discussion — every topic stayed within Board
Management's scope. Two pending todos were explicitly folded IN (not deferred): clearing the theme
cookie on sign-out, and the `scripts/serve-static.mjs` path-traversal fix (unrelated to board-domain
work — the planner should treat it as an independent, standalone task within the phase).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| BOARD-01 | User can view a sidebar list of their own boards | `useBoards()` query hook against a new `GET /api/boards` Route Handler; see Architecture Patterns → BFF Route Handler Layer |
| BOARD-02 | User can create a new board, optionally naming its initial columns | `useCreateBoard()` mutation orchestrating `POST /api/boards` then sequential `POST /api/boards/{id}/columns`; see Code Examples → Client-Orchestrated Create |
| BOARD-03 | User can select a board to view its full contents (columns, tasks, subtasks) | `GET /boards/{boardId}/full` → `BoardFullResponseDTO` via a `GET /api/boards/[boardId]/full` Route Handler; see Standard Stack schema notes |
| BOARD-04 | User can rename an existing board | `useUpdateBoard()` optimistic mutation via `PUT /api/boards/[boardId]`, `onMutate`/`onError` per ADR tech/0002; see Code Examples → Optimistic Rename |
| BOARD-05 | User can delete a board (cascades to its columns, tasks, and subtasks) | `useDeleteBoard()` non-optimistic mutation via `DELETE /api/boards/[boardId]`, redirect logic per D-08/D-11; see Architecture Patterns |
| BOARD-06 | User can collapse/expand the sidebar | Plain `useState` in `components/layout/Sidebar` per DEFAULTS.md C-009 — no research needed, confirmed pre-decided |
</phase_requirements>

## Summary

Every UI primitive Board Management needs (Modal, TextField, Dropdown, Button, IconButton) was
already built in Phase 1 and needs no new work beyond composition — this phase adds **zero new UI
primitives** except a `Toast` (available, unbuilt: Base UI ships one, see Don't Hand-Roll). The real
architectural work is the **data layer**: this is the first phase in the project to actually move
data through TanStack Query, and ADR tech/0001 requires every authenticated call to go through a
Next.js Route Handler BFF proxy — but no Route Handler exists anywhere in this codebase yet (the
only precedent, `app/api/auth/signin/route.ts`, was deleted in Phase 1's plan 01-33 migration to
Server Actions). Board/column/task mutations were explicitly **carved out** of that Server-Actions
migration (ADR tech/0002's GC-24 amendment, read this session) specifically because they need
TanStack Query's `onMutate`/`onError` rollback machinery for `version`-conflict handling — so boards
cannot reuse the Server-Action pattern `features/theme/actions/update-theme.ts` demonstrates. That
leaves Route Handlers as the only mechanism consistent with both ADRs: this phase must add a small
`app/api/boards/**` Route Handler layer that internally calls the existing server-only `externalApi`
client (`src/lib/server/server-client.ts`) and derives `userId` from `verifySession()` — exactly the
pattern `updateThemeAction` already demonstrates for deriving `userId` from the session rather than
trusting a client-supplied value, just relocated from a Server Action into a Route Handler.

A second load-bearing finding: `UpdateBoardRequestDTO` requires a `version` field (confirmed by
reading the OpenAPI schema directly), so board rename is a *versioned* optimistic-locking mutation
exactly like column/task/subtask updates — even though SYNC-01's full version-conflict UX is
declared Phase 4 scope. Phase 2's rename mutation must still track and send the board's current
`version`; a 409 in Phase 2 needs only a generic-error rollback (D-15's own onError path), not the
full reconciliation flow SYNC-01 will add later. A third finding, also read directly from the
schema: `SaveColumnRequestDTO` (create-board's optional initial columns) has `minLength: 3,
maxLength: 32` on `name` — tighter than the empty-string-is-valid UX D-01/D-02 describe, and
different from `SaveBoardRequestDTO`'s own `minLength: 1`/no-max. Only non-empty column-name rows
should be validated against 3-32; empty rows are simply omitted from what gets POSTed, not
validation-blocked.

**Primary recommendation:** Add a thin `app/api/boards/**` Route Handler layer (GET/POST `/boards`,
GET `/boards/[boardId]/full`, PUT/DELETE `/boards/[boardId]`, POST `/boards/[boardId]/columns`) that
wraps the existing `externalApi` client and injects `userId` from `verifySession()`; build
`features/boards/{api,hooks,components,model.ts,types.ts}` on top of it exactly per
CONVENTIONS.md's existing directory tree; add one new primitive (`components/ui/toast/`, from Base
UI's `Toast`) for the error/rollback notifications D-04/D-09/D-15 all require; treat D-13's
newest-first ordering as unresolved until verified against the live backend, and build the create
flow so it doesn't depend on that answer (prepend newly-created boards into the TanStack Query cache
directly rather than trusting refetch order).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Sidebar board list rendering, collapse/expand | Browser / Client | — | Pure UI state (DEFAULTS.md C-009); TanStack Query cache read |
| Board list/detail data fetching | API / Backend (via BFF) | Frontend Server (SSR) for initial paint | `userId` must be derived server-side from the verified session; TanStack Query's client cache is fed through a same-origin Route Handler, never a direct external-API call from the browser |
| Board create/rename/delete orchestration | Browser / Client (TanStack Query mutations) | API / Backend (BFF Route Handler forwards to external API) | ADR tech/0002 requires client-side `onMutate`/`onError`; the actual HTTP call to the external API must still be proxied server-side per ADR tech/0001 |
| `userId` resolution | API / Backend (BFF Route Handler) | — | Never client-supplied despite the OpenAPI contract naming it a query param — derived from `verifySession()` exactly as `updateThemeAction` already does for the theme endpoint |
| Route-guard (auth gate on `/boards`) | Frontend Server (SSR) | — | Already built in Phase 1 (`app/(dashboard)/layout.tsx` calls `verifySession()`); this phase adds no new guard logic |
| Sidebar collapsed/expanded persistence | Browser / Client | — | DEFAULTS.md C-009 explicitly locks this to non-persisted `useState` — no cookie/localStorage tier involved |
| Auto-select-first-board / empty-state redirect (D-08, D-10, D-11) | Frontend Server (SSR) or Client route logic | — | Depends on plan-time choice between a Server Component redirect and a client-side `useEffect`; either is viable, see Open Questions |

## Standard Stack

### Core

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------------------|---------|---------------|
| `@tanstack/react-query` | 5.101.4 `[VERIFIED: package.json]` | Board/column/task queries + optimistic mutations | ADR tech/0002, locked project-wide |
| `openapi-fetch` | 0.17.0 `[VERIFIED: package.json]` | Typed fetch client wrapping the generated OpenAPI types, used inside Route Handlers to call the external API | ADR tech/0005, already the only HTTP client in the codebase (`server-client.ts`) |
| `openapi-typescript` | 7.13.0 `[VERIFIED: package.json]` | Regenerates `src/lib/core/api-contract/generated-types.ts` from the committed OpenAPI spec | ADR tech/0005 |
| `react-hook-form` | 7.85.0 `[VERIFIED: package.json]` | Create-board / rename-board form state (including the dynamic column-name row list) | DEFAULTS.md C-005, already the pattern `sign-up-form.tsx`/`sign-in-form.tsx` use |
| `zod` | 4.4.3 `[VERIFIED: package.json]` | Client-side schema validation mirroring the backend's own field constraints (board name `minLength: 1`; column name `minLength: 3, maxLength: 32`) | DEFAULTS.md C-005; `@hookform/resolvers` 5.7.1 already wires Zod into RHF elsewhere in the codebase |
| `@base-ui/react` | 1.7.0 `[VERIFIED: package.json]` | New `Toast` primitive for error/rollback notifications (D-04, D-09, D-15) | Already the design-system's exclusive headless-component vendor (Dialog→Modal, Select→Dropdown, Field→TextField) |

**No new package installs are required for this phase.** Every library BOARD-01..06 needs is already
a direct dependency (`[VERIFIED: package.json]`, read this session).

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `class-variance-authority` | 0.7.1 `[VERIFIED: package.json]` | Variant styling for any new component (e.g. `BoardCard`, sidebar row states) | Matches every existing primitive's styling pattern |
| `lucide-react` | 1.31.0 `[VERIFIED: package.json]` | Icons for the kebab-menu trigger, collapse/expand chevrons, toast status glyphs | Already the icon library for every existing primitive |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Route Handler BFF layer for boards | Server Actions as `mutationFn`/prefetch source (the pattern `theme`/`auth` use) | Rejected: ADR tech/0002's GC-24 amendment explicitly carves board/column/task OUT of the Server-Actions migration specifically because they need TanStack Query's structured `onMutate`/`onError` rollback for `version` conflicts, which Server Actions + `useOptimistic` don't give for free (ADR tech/0002's own "Considered Options" section) |
| Base UI `Toast` | Hand-rolled toast (state + portal + timer) or a third-party toast library (`sonner`, `react-hot-toast`) | Rejected: would duplicate what Base UI already ships, break the "one headless-component vendor" pattern every other primitive in this codebase follows, and add a new dependency with no gap it fills |
| Sequential `POST columns` calls (ADR domain/0003) | `Promise.all()` parallel column creation | Rejected: `SaveColumnRequestDTO` has no `position` field — the backend must be assigning column position by call order, so parallel calls would race and produce non-deterministic column ordering, in addition to contradicting ADR domain/0003's explicit "one parent-create call followed by one child-create call per named item" sequencing |

**Installation:** none — every package is already installed (`[VERIFIED: package.json]`).

**Version verification:** all versions above were read directly from the project's own `package.json`
this session (`node -e "require('./package.json')"`), not looked up externally — this is the actual
installed version, already more current/authoritative than a registry lookup for this purpose.

## Package Legitimacy Audit

Not applicable — this phase installs no new external packages (every dependency needed is already
present in `package.json`, confirmed by direct read this session). If a plan later decides a new
package IS needed (e.g. a date-formatting helper, which nothing above requires), it must run the
Package Legitimacy Gate protocol before that plan is finalized.

## Architecture Patterns

### System Architecture Diagram

```
Browser (Client Component)
  │
  │  useBoards() / useCreateBoard() / useUpdateBoard() / useDeleteBoard()
  │  (TanStack Query — features/boards/hooks/)
  ▼
fetch("/api/boards", { credentials: "same-origin" })   ← same-origin, httpOnly session
  │                                                        cookie travels automatically
  ▼
Next.js Route Handler  (app/api/boards/**/route.ts)
  │
  │  1. verifySession()  ──▶  reject 401 if no session (never trust a client userId)
  │  2. externalApi.GET/POST/PUT/DELETE(...)
  │       params: { query: { userId: record.id } }   ← userId ALWAYS server-derived
  │       (same externalApi instance app/api call sites already share; carries the
  │        bridged JSESSIONID cookie automatically via server-client.ts's onRequest hook)
  ▼
External Kanban Backend (deployed nonprod — docs/api/kanban-board-openapi.json)
  │
  ▼
Route Handler maps the typed openapi-fetch response/`ProblemDetail` error back to JSON
  │
  ▼
TanStack Query cache updates (onMutate optimistic patch → onSuccess/onError settle)
  │
  ▼
Sidebar / Board view re-render
```

Board-creation's multi-step flow (BOARD-02) branches off this same spine:

```
useCreateBoard.mutate({name, columnNames})
  │
  ├─▶ POST /api/boards {name}                     — Route Handler → POST /boards?userId=…
  │     │
  │     ├─ fails ─▶ D-05: inline modal error, retry, nothing to reconcile
  │     │
  │     └─ succeeds (board id known) ─▶ close modal is DEFERRED until columns settle
  │           │
  │           ▼
  │     for each non-empty columnName (SEQUENTIAL, not Promise.all — see Alternatives Considered):
  │           POST /api/boards/{id}/columns {name} — Route Handler → POST /boards/{id}/columns?userId=…
  │           │
  │           ├─ one fails ─▶ D-04: close modal anyway, navigate to the new board,
  │           │                toast naming which column(s) failed, retry action
  │           │                scoped to just those
  │           │
  │           └─ all succeed ─▶ close modal, navigate to the new board
```

### Recommended Project Structure

```
app/api/boards/
├── route.ts                          # GET (list), POST (create)
└── [boardId]/
    ├── route.ts                      # PUT (rename), DELETE
    ├── full/route.ts                 # GET (BoardFullResponseDTO — BOARD-03)
    └── columns/route.ts              # POST (add initial/later column)

src/features/boards/
├── api/
│   └── boards-client.ts              # fetch() wrappers over app/api/boards/** for hooks to call
├── hooks/
│   ├── use-boards.ts                 # useQuery — GET /api/boards
│   ├── use-board-full.ts             # useQuery — GET /api/boards/{id}/full (BOARD-03)
│   ├── use-create-board.ts           # useMutation — orchestrates board+columns (BOARD-02)
│   ├── use-update-board.ts           # useMutation — optimistic rename (BOARD-04)
│   └── use-delete-board.ts           # useMutation — non-optimistic delete + redirect (BOARD-05)
├── components/
│   ├── board-card.tsx                # sidebar row: name, kebab menu (Dropdown), selected state
│   ├── add-board-modal.tsx           # create-board modal, dynamic column-name row list (D-01/D-02)
│   ├── edit-board-modal.tsx          # rename modal (D-14)
│   └── delete-board-confirm.tsx      # plain confirm modal (D-06)
├── model.ts                          # pure: e.g. sortBoardsNewestFirst(), isValidColumnName()
└── types.ts

src/components/layout/
└── sidebar.tsx                       # collapse/expand useState (C-009), renders BoardCard list

src/components/ui/toast/
└── toast.tsx                         # new primitive — Base UI Toast.Provider/Viewport/Root wrapper
```

### Pattern 1: BFF Route Handler wrapping `externalApi`, deriving `userId` from the session

**What:** A Route Handler that verifies the session, calls the server-only `externalApi` client with
`userId` taken from the verified record (never from the request), and returns the typed
response/error as JSON.
**When to use:** Every board/column/task/subtask endpoint this phase (and Phases 3-4) needs to
reach.
**Example (pattern only — exact error-mapping shape is a plan-time decision, see Open Questions):**
```typescript
// app/api/boards/route.ts
// Source: pattern combines the Route Handler shape documented at
// https://github.com/vercel/next.js/blob/v16.2.9/docs/01-app/03-api-reference/03-file-conventions/route.mdx
// (fetched this session — [CITED: nextjs.org, v16.2.9]) with this repo's own
// features/theme/actions/update-theme.ts pattern for deriving userId from verifySession()
// ([VERIFIED: src/features/theme/actions.ts:30-51], read this session — quoted below).
import { NextResponse } from "next/server";

import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

export const GET = async () => {
    const record = await verifySession();
    if (!record) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    const { data, error } = await externalApi.GET("/boards", {
        params: { query: { userId: record.id } },
    });

    if (error !== undefined) {
        return NextResponse.json({ message: "Failed to load boards" }, { status: 502 });
    }

    return NextResponse.json(data);
};

export const POST = async (request: Request) => {
    const record = await verifySession();
    if (!record) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    const body: unknown = await request.json();
    // Zod-validate `body` against a boardNameSchema mirroring SaveBoardRequestDTO's
    // minLength: 1 before forwarding — see Standard Stack.

    const { data, error } = await externalApi.POST("/boards", {
        params: { query: { userId: record.id } },
        body: body as { name: string },
    });

    if (error !== undefined) {
        return NextResponse.json({ message: "Failed to create board" }, { status: 502 });
    }

    return NextResponse.json(data, { status: 201 });
};
```
Quoted source this pattern is derived from — `src/features/theme/actions.ts:48-51`
(`[VERIFIED: src/features/theme/actions.ts:48-51]`, read this session):
```typescript
    const { error } = await externalApi.PUT("/users/me/theme", {
        params: { query: { userId: record.id } },
        body: { theme: parsed.data },
    });
```
The `userId: record.id` shape is identical — only the transport (Route Handler vs. Server Action)
differs, because board/column/task mutations must stay on TanStack Query (ADR tech/0002/GC-24)
rather than becoming Server Actions.

Per CONVENTIONS.md's arrow-function rule (ADR tech/0015), Route Handlers should export `const GET =
async (...) => {}`, not a `function` declaration — the "framework-forced default-export" exemption
in CONVENTIONS.md names `route.ts` alongside `page.tsx`/`layout.tsx`, but Route Handlers export named
functions (`GET`, `POST`, …), not a default export, so the exemption doesn't actually change anything
here: `export const GET = async (...) => {}` already satisfies both the arrow-function rule and
Next.js's naming requirement.

### Pattern 2: Client-side TanStack Query hook calling the Route Handler via `fetch`

**What:** A hook whose `queryFn`/`mutationFn` is a plain same-origin `fetch()` against the Route
Handler above — never a direct call to `externalApi` (which is `server-only` and cannot be imported
into client code) and never a Server Action (per Pattern 1's rationale).
**Example:**
```typescript
// src/features/boards/hooks/use-boards.ts
import { useQuery } from "@tanstack/react-query";

import type { Board } from "@/features/boards/types";

const fetchBoards = async (): Promise<Board[]> => {
    const response = await fetch("/api/boards");
    if (!response.ok) {
        throw new Error("Failed to load boards");
    }
    return response.json() as Promise<Board[]>;
};

export const useBoards = () =>
    useQuery({
        queryKey: ["boards"],
        queryFn: fetchBoards,
    });
```

### Pattern 3: Optimistic rename (`onMutate`/`onError`) — the project-wide precedent (D-15)

**What:** TanStack Query's structured optimistic-update lifecycle: snapshot the previous cache value
in `onMutate`, apply the new value immediately, restore the snapshot in `onError`.
**Source:** https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
(already cited by ADR tech/0002, fetched 2026-08-09 per that ADR's own Sources list —
`[CITED: tanstack.com, per docs/adr/tech/0002]`).
```typescript
// src/features/boards/hooks/use-update-board.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Board } from "@/features/boards/types";

type UpdateBoardInput = { boardId: string; name: string; version: number };

const updateBoard = async ({ boardId, name, version }: UpdateBoardInput): Promise<Board> => {
    const response = await fetch(`/api/boards/${boardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, version }),
    });
    if (!response.ok) {
        throw new Error("Failed to rename board");
    }
    return response.json() as Promise<Board>;
};

export const useUpdateBoard = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateBoard,
        onMutate: async (input) => {
            await queryClient.cancelQueries({ queryKey: ["boards"] });
            const previousBoards = queryClient.getQueryData<Board[]>(["boards"]);

            queryClient.setQueryData<Board[]>(["boards"], (boards) =>
                boards?.map((board) => (board.id === input.boardId ? { ...board, name: input.name } : board)),
            );

            return { previousBoards };
        },
        onError: (_error, _input, context) => {
            if (context?.previousBoards) {
                queryClient.setQueryData(["boards"], context.previousBoards);
            }
            // toast the failure (D-15)
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: ["boards"] });
        },
    });
};
```
Note the required `version` field in `UpdateBoardInput` — read directly from the OpenAPI schema this
session (`[VERIFIED: docs/api/kanban-board-openapi.json → components.schemas.UpdateBoardRequestDTO]`,
quoted verbatim):
```json
"UpdateBoardRequestDTO": {
  "type": "object",
  "properties": { "name": { "type": "string" }, "version": { "type": "integer", "format": "int64" } },
  "required": ["version"]
}
```

### Anti-Patterns to Avoid

- **Calling `externalApi` from a Client Component or a client-side hook:** `server-client.ts` carries
  `import "server-only"`, so this fails the build immediately if attempted directly — but a subtler
  version of the same mistake is re-exporting a value derived from it (e.g. a wrapped fetch function)
  through a barrel file that a client component then imports. Keep `externalApi` usage confined to
  `app/api/boards/**/route.ts` files.
- **Trusting a client-supplied `userId`:** the OpenAPI contract's `userId` query parameter must never
  be read from the incoming request body/query on the Route Handler side — always derive it from
  `verifySession()`, mirroring `updateThemeAction`'s exact pattern.
- **`Promise.all()`-ing the initial column-creation calls:** see Alternatives Considered above —
  breaks both ADR domain/0003's sequencing requirement and column ordering (no `position` field in
  `SaveColumnRequestDTO`).
- **Validating empty column-name rows as invalid:** D-02 says 0 named columns is valid; only
  non-empty rows should be checked against the 3-32 character schema, and empty rows should simply
  never reach the create-columns loop.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast/notification UI for D-04/D-09/D-15's error and rollback messages | A custom `useState`+`createPortal`+`setTimeout` toast stack | Base UI's `Toast` (`Toast.Provider`/`Toast.Viewport`/`Toast.Root`, plus `useToastManager()` for imperative `add()`/`update()`/`close()`/`promise()` calls) `[VERIFIED via Context7: /mui/base-ui, "Toast" component docs, queried this session]` | Already the project's exclusive headless-component vendor (Dialog, Select, Field, Checkbox, Switch all wrap Base UI); a hand-rolled stack would duplicate focus-management/ARIA-live-region work Base UI already solved (confirmed: its `Toast.Viewport` renders an `aria-live="polite"` region unconditionally) |
| Focus trapping / outside-click / typeahead for the sidebar kebab menu | Custom `useEffect` + `document.activeElement` bookkeeping | The existing `Dropdown` primitive (wraps Base UI `Select`) per D-07's explicit instruction | Already built in Phase 1; every other Dropdown consumer in the codebase gets this for free |
| Form state / dynamic column-name row list for create-board | Hand-rolled array-of-refs state management | `react-hook-form`'s `useFieldArray` over the existing `TextField` primitive | DEFAULTS.md C-005 already locks RHF+Zod project-wide; `useFieldArray` is RHF's documented mechanism for exactly this "add/remove row" shape |
| Optimistic-update snapshot/rollback bookkeeping | Manual `useState` "previous value" tracking per mutation | TanStack Query's `onMutate`/`context`/`onError` lifecycle | ADR tech/0002's entire rationale for choosing TanStack Query over SWR/RTK Query in the first place |

**Key insight:** this phase adds no new categories of hand-rollable complexity beyond what Phase 1
already resolved by adopting Base UI + TanStack Query — the only genuinely new piece of
infrastructure is the Route Handler BFF layer itself, and even that follows an existing in-repo
precedent (the now-deleted `app/api/auth/signin/route.ts`, referenced by a comment still present in
`src/features/auth/actions.ts:20`) rather than inventing a new pattern.

## Runtime State Inventory

This phase's prerequisite scope (PC-01 through PC-05) renames/relocates several existing modules
(`lib/server/theme.ts` → `lib/server/cookies/theme-cookie.ts`, `lib/server/session-cookie.ts` →
`lib/server/cookies/upstream-cookie.ts`, `features/{auth,theme}/actions.ts` → `features/<domain>/
actions/<name>.ts`), which triggers this inventory per the rename/refactor protocol.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — the design spec's own Scope/non-goals section states explicitly: "No behavior changes to session JWT logic, cookie security flags... only de-duplicated" `[VERIFIED: docs/superpowers/specs/2026-08-20-theme-cookies-actions-cleanup-design.md:266-268]`. The cookie *names* (`"session"`, `"theme"`, `"JSESSIONID"`) are unchanged, confirmed by reading the design's `COOKIE` const literally: `SESSION: "session", THEME: "theme", UPSTREAM_SESSION: "JSESSIONID"` `[VERIFIED: docs/superpowers/specs/2026-08-20-theme-cookies-actions-cleanup-design.md:76-80]` — identical to the current literals in `lib/server/session.ts:26` (`"session"`) and `lib/server/theme.ts:21` (`"theme"`) and `lib/server/session-cookie.ts:8` (`"JSESSIONID"`), all read this session. No data migration needed. |
| Live service config | None — no external service (n8n, Datadog, etc.) is involved; this is a pure code reorganization. |
| OS-registered state | None — no OS-level task/service registration exists in this project. |
| Secrets/env vars | None — `SESSION_SECRET`/`EXTERNAL_API_BASE_URL` are untouched by this refactor; the design spec confirms "No new dependencies. No behavior changes." `[VERIFIED: docs/superpowers/specs/2026-08-20-theme-cookies-actions-cleanup-design.md:286]`. |
| Build artifacts | None new — no package/build-output changes; this is a source-file relocation with import-path updates only. |

**Nothing found in any category** — every browser already carrying a `session`/`theme` cookie from
before this refactor continues to work unchanged after it, since the cookie name strings themselves
are byte-identical, only their declaring module moved.

## Common Pitfalls

### Pitfall 1: Board rename silently drops the required `version` field
**What goes wrong:** A rename mutation built by analogy to `SaveBoardRequestDTO` (create, which has
no `version`) instead of `UpdateBoardRequestDTO` (which requires it) sends `{name}` only, and the
backend rejects every rename with a 400/422.
**Why it happens:** D-14/D-15 describe rename purely in UX terms (modal, optimistic update, rollback
toast) without naming the `version` field explicitly, because SYNC-01 (the *display* of a version
conflict) is out of this phase's scope — but the *presence* of the field in every PUT request is not
optional; it's a wire-format requirement, not a UX feature.
**How to avoid:** `useUpdateBoard`'s mutation input must carry the board's currently-known `version`
(from the `useBoards()` cache entry being renamed), and the Route Handler's Zod validation for the
PUT body must require it too.
**Warning signs:** A 400 (or a generic 5xx if the Route Handler's error-mapping is too coarse) on
every rename attempt during manual testing.

### Pitfall 2: Newest-first sidebar ordering (D-12/D-13) assumed rather than verified
**What goes wrong:** `BoardResponseDTO` has no timestamp field; if `GET /boards`'s array order turns
out to be, say, alphabetical-by-name or an arbitrary database scan order rather than
insertion/creation order, a naive `boards.reverse()` or "trust server order" implementation silently
produces the wrong sidebar order with no compile-time or type-level signal that anything is wrong.
**Why it happens:** This session could not reach the live nonprod backend to observe real `GET
/boards` behavior with 2+ boards (no network/credential access in this research pass) — D-13 already
flags this as unresolved.
**How to avoid:** Two complementary strategies, neither dependent on resolving the open question
before writing code: (1) treat `GET /boards`'s returned order as unknown and sort client-side only if
`id` turns out to be a chronologically-sortable string (verify by creating two boards in sequence
against the real backend and comparing their `id`s and array positions — a concrete first-task
verification step, not a research-time one); (2) regardless of (1)'s answer, make board creation
locally deterministic by prepending the newly-created board into the TanStack Query cache directly in
`useCreateBoard`'s `onSuccess` (`queryClient.setQueryData(["boards"], (boards) => [newBoard,
...(boards ?? [])])`) rather than relying on a refetch to put it first — this guarantees "newest
first" for every board created within the running session even if the *initial* load's ordering is
never fully pinned down.
**Warning signs:** A newly-created board appearing anywhere but the top of the sidebar in manual/E2E
testing.

### Pitfall 3: Reusing `Dropdown` (Select semantics) for an action menu without adapting its trigger
**What goes wrong:** `Dropdown` wraps Base UI's `Select` — a component whose entire contract is
"pick one value and display it as selected" (`Select.Value` renders the chosen item's label in the
trigger, `Select.ItemIndicator` shows a checkmark on the active selection). D-07 names `Dropdown` as
the sidebar kebab menu's primitive, but "Rename"/"Delete" are *actions*, not persisted selections —
using `Dropdown` unmodified would make the trigger's label flicker to "Delete" after the menu closes,
and would show a checkmark next to whichever action was last clicked.
**Why it happens:** The primitive's name ("Dropdown") reads as generic, but its underlying Base UI
part (`Select`) is not a menu component (Base UI does not currently ship a public `Menu` primitive
alongside `Select`/`Dialog`/`Field`, per the same Context7 query this session).
**How to avoid:** Compose the kebab trigger from `Dropdown.Trigger`+`IconButton` (an icon-only
trigger showing a fixed "⋮" glyph via `render`, never `Select.Value`), and treat each `Dropdown.Item`
as a fire-and-forget action in its `onClick`/`value`-selection handler rather than a persisted
choice — reset/discard the underlying `Select` value immediately after acting on it so nothing
appears "selected" between openings. Confirm this composition against real screen-reader output
during the phase's accessibility pass (Storybook + axe, per CONVENTIONS.md's existing gate) — a
`combobox`-rooted component announcing "Delete, selected" is a plausible axe/manual-testing surprise
worth checking for explicitly.
**Warning signs:** The kebab trigger's visible glyph changes after clicking Rename/Delete; a
checkmark appears next to the last-used action on next open.

### Pitfall 4: `externalApi` import reaching a client bundle indirectly
**What goes wrong:** `server-client.ts` fails the build immediately if imported directly from a
Client Component (the `"server-only"` package throws at import time) — but a re-export through a
shared, non-`"use client"`-marked module (e.g. a `features/boards/api/index.ts` barrel that also
exports client-safe helpers) can obscure which import chain is the offending one, producing a
build error whose stack trace doesn't obviously point at the actual client component.
**Why it happens:** `server-only`'s guard is import-graph-wide, not per-statement — any transitive
import path reaching a client bundle triggers it, however indirect.
**How to avoid:** Keep `externalApi` usage physically confined to `app/api/boards/**/route.ts` files
only; `features/boards/api/boards-client.ts` (the client-side fetch wrapper) must never import
anything from `src/lib/server/`.
**Warning signs:** A Next.js build failure citing `"server-only"` inside a file that doesn't look
server-related at first glance — trace the full import chain, don't assume the named file is the
actual violator.

## Code Examples

### Client-orchestrated create-board with `useFieldArray` (BOARD-02, D-01/D-02/D-03)

```typescript
// src/features/boards/components/add-board-modal.tsx (excerpt)
// Source: react-hook-form's documented useFieldArray shape — Standard Stack, DEFAULTS.md C-005.
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

// SaveColumnRequestDTO: minLength 3, maxLength 32
// [VERIFIED: docs/api/kanban-board-openapi.json → components.schemas.SaveColumnRequestDTO]
const columnNameSchema = z.string().max(32, "Column name must be 32 characters or fewer.");
// Only non-empty entries are checked against the 3-char floor (D-02: empty rows are valid/omitted).
const nonEmptyColumnNameSchema = columnNameSchema.min(3, "Column name must be at least 3 characters.");

const createBoardSchema = z.object({
    // SaveBoardRequestDTO: minLength 1, no maxLength
    // [VERIFIED: docs/api/kanban-board-openapi.json → components.schemas.SaveBoardRequestDTO]
    name: z.string().min(1, "Can't be empty"),
    columns: z.array(
        z.object({
            name: z.string().refine((value) => value.trim() === "" || nonEmptyColumnNameSchema.safeParse(value).success, {
                message: "Column name must be 3-32 characters, or left blank.",
            }),
        }),
    ),
});

type CreateBoardInput = z.infer<typeof createBoardSchema>;

// Called with 3 default empty rows (D-01):
const { control, handleSubmit } = useForm<CreateBoardInput>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: { name: "", columns: [{ name: "" }, { name: "" }, { name: "" }] },
});
const { fields, append, remove } = useFieldArray({ control, name: "columns" });
```

### `useToastManager` for D-04/D-09/D-15's error/rollback notifications

```typescript
// Source: Context7 /mui/base-ui "Toast" docs, queried this session — [CITED: base-ui.com]
import { Toast } from "@base-ui/react/toast";

const toastManager = Toast.createToastManager();

// Anywhere inside <Toast.Provider toastManager={toastManager}>:
toastManager.add({ title: "Couldn't rename board", description: "Try again." });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| Route Handler-based BFF for auth (`app/api/auth/signin/route.ts`) | Server Actions for auth/theme; Route Handlers for board/column/task (this phase reintroduces them) | Plan 01-33 (auth), then GC-24 (2026-08-19, this repo's own gap-closure round) explicitly re-affirmed Route Handlers/TanStack Query for boards | The BFF mechanism this phase needs is not a new invention — it's the same mechanism auth used before 01-33, now scoped specifically to the domain that still needs `onMutate`/`onError` rollback |

**Deprecated/outdated:** none identified specific to this phase's technology choices — TanStack
Query v5's mutation lifecycle, Base UI's component set, and Next.js 16's Route Handler conventions
are all current as of this session's Context7/package.json checks.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | `GET /boards`'s actual response array order (insertion order? alphabetical? undefined?) — could not be verified against the live backend this session (no network/credential access in this research pass) | Common Pitfalls #2, D-13 | Sidebar shows boards in the wrong order on first load (post-creation ordering is mitigated independently, see Pitfall 2's second strategy) |
| A2 | Board/Column/Task `id` format and whether it is chronologically sortable as a string — the OpenAPI schema only declares `"type": "string"` with no `format` | Common Pitfalls #2 | A client-side `id`-sort fallback could produce a wrong or non-deterministic order if attempted without first confirming the id shape |
| A3 | The exact JSON error-body shape a board/column endpoint returns on a 4xx/5xx (whether it matches the `ProblemDetail`/`PROBLEM_CODE` shape `problem-detail.ts` already hand-authors for auth, or something board-endpoint-specific) — the OpenAPI contract declares no error schema for any board/column/task operation, same documented gap `problem-detail.ts`'s own comment already names for auth | Architecture Patterns → Route Handler error mapping | A Route Handler that assumes the auth `ProblemDetail` shape applies verbatim to board errors could silently swallow or misreport backend validation messages (e.g. a column-name-too-short 4xx) |
| A4 | Whether the intended BFF mechanism is a Route Handler layer (this document's primary recommendation) rather than some other transport not yet used anywhere in this codebase | Summary, Architecture Patterns | Low — this is derived directly from three independently-read, in-repo sources this session (ADR tech/0001's own wording, ADR tech/0002's GC-24 amendment, and the deleted-but-referenced `app/api/auth/signin/route.ts` precedent), not from training-data guesswork, so confidence here is HIGH despite being listed for completeness |

**A4 is listed for completeness only** — its confidence is HIGH (derived from `[VERIFIED]` in-repo
sources), unlike A1-A3, which are genuinely unresolved backend-runtime facts this session had no way
to observe.

## Open Questions

1. **D-13's newest-first ordering — server order and `id` format (RESOLVED)**

   **Resolved:** `02-BACKEND-FACTS.md` P1/P2 — `GET /boards` returns creation order (oldest
   first); reversing the array client-side (equivalent to descending-`id`-string sort) gives
   newest-first. Developer decision (P1/Decisions this resolves): reverse the array client-side.

   - What we know: `BoardResponseDTO` has no timestamp; `id` is declared only as `"type": "string"`.
   - What's unclear: whether `GET /boards`'s array order is creation-order, and whether `id` is a
     chronologically-sortable format (ULID/UUIDv7-style) or an opaque/random UUID/auto-increment
     string.
   - Recommendation: make this the first executable task in the phase's plan — create two boards in
     sequence against the real nonprod backend (the same fixture-account pattern `e2e/fixtures.ts`
     already establishes) and inspect both the array order and the two `id` values directly, before
     writing `model.ts`'s sort logic. Regardless of the answer, also implement Pitfall 2's
     cache-prepend strategy so newly-created boards are always visibly newest-first within a session.

2. **Board/column/task error-response shape (RESOLVED)**

   **Resolved:** `02-BACKEND-FACTS.md` P3 — a real 409 version conflict returns the same
   RFC 7807-flavoured `ProblemDetail` shape auth endpoints use, with a new `code` value
   (`OPTIMISTIC_LOCK_CONFLICT`) that `PROBLEM_CODE` must be extended to recognize.

   - What we know: the OpenAPI contract declares no error schema for any board/column/task
     operation — the same documented gap `problem-detail.ts` already names for auth endpoints
     (`[VERIFIED: src/lib/core/api-contract/problem-detail.ts:1-8]`).
   - What's unclear: whether a board 4xx/5xx actually returns the same `ProblemDetail` shape
     (`{type, title, status, detail, instance, code, errors?}`) auth endpoints do, or something
     different.
   - Recommendation: the same live-backend probe used for Open Question 1 (e.g. attempt a rename with
     a stale `version` or an invalid board name) should also capture a real error body, so the Route
     Handler's error-mapping can reuse `parseProblemDetail`/`PROBLEM_CODE` if the shape matches, or
     define a board-specific fallback if it doesn't.

3. **Server Component vs. client-side redirect for D-08/D-10/D-11's auto-select/empty-state logic (RESOLVED)**

   **Resolved:** ADR tech/0019 (the 02.1 RSC rebuild) settles the mechanism question — Route
   Handlers are banned as a data-access mechanism project-wide and the client-side hook this
   question's second option depended on was deleted, leaving Server Component `redirect()` as
   the only viable path. `app/(dashboard)/layout.tsx`'s current `fetchBoards()`-then-`redirect()`
   pattern is the precedent the auto-select/empty-state logic will follow. The concrete
   auto-select-first-board and invalid-`boardId` redirects themselves are not yet implemented —
   `app/(dashboard)/boards/page.tsx` and `.../boards/[boardId]/page.tsx` remain placeholders,
   still pending Phase 2's remaining waves — only the implementation *mechanism* is settled.

   - What we know: `app/(dashboard)/boards/page.tsx` and `.../boards/[boardId]/page.tsx` are today
     placeholder Client-agnostic components with no board data fetch at all.
   - What's unclear: whether the auto-select-first-board redirect (bare `/boards` → first board) and
     the invalid-`boardId` redirect are best implemented as a Server Component `redirect()` (would
     need its own server-side board-list fetch, duplicating the Route Handler's own `externalApi`
     call one layer up) or as a client-side `useEffect` reacting to `useBoards()`'s resolved data
     (simpler, but introduces a brief loading-state flash before the redirect fires).
   - Recommendation: left to plan-time judgment — no CONTEXT.md decision constrains this choice, and
     both satisfy D-08/D-10/D-11's observable behavior. A Server Component fetch is more consistent
     with `app/(dashboard)/layout.tsx`'s existing pattern (it already does a server-side identity
     fetch before rendering); a client-side effect is simpler to implement against the TanStack Query
     hooks this phase is already building. Flagging for the planner rather than deciding here since
     it's a pure implementation-mechanism choice with no user-facing difference.

## Environment Availability

Skipped — this phase introduces no new external tool/service dependency. The deployed nonprod
backend (`EXTERNAL_API_BASE_URL`) is already the established, working dependency from Phase 1; no
new CLI, database, or runtime is needed.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (`unit`/`browser`/`storybook` projects) + Playwright 1.62.1 (`e2e`/`visual` projects) — both `[VERIFIED: package.json]`, already fully configured (`vitest.config.ts`, `playwright.config.ts` from Phase 1) |
| Config file | `vitest.config.ts`, `vitest.setup.ts`/`vitest.setup.unit.ts` (existing, no changes needed) |
| Quick run command | `pnpm test:unit -- features/boards` (hooks/model logic) / `pnpm test:browser -- features/boards` (component behavior) |
| Full suite command | `pnpm test:all` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|---------------|
| BOARD-01 | Sidebar lists the signed-in user's boards | component (`*.test.tsx`) | `pnpm test:browser -- sidebar` | ❌ Wave 0 |
| BOARD-01 | `useBoards()` calls `/api/boards` and shapes the response | hook/unit (`*.unit.test.ts`) | `pnpm test:unit -- use-boards` | ❌ Wave 0 |
| BOARD-02 | Create-board form: 3 default rows, add/remove to 0, submit | component | `pnpm test:browser -- add-board-modal` | ❌ Wave 0 |
| BOARD-02 | Client-orchestrated create sequencing + partial-failure retry (D-03/D-04/D-05) | hook/unit | `pnpm test:unit -- use-create-board` | ❌ Wave 0 |
| BOARD-02 | Full create → sidebar-appears flow | e2e (`*.e2e.spec.ts`) | `pnpm test:e2e -- boards-create` | ❌ Wave 0 |
| BOARD-03 | Selecting a board loads its full contents | e2e | `pnpm test:e2e -- boards-detail` | ❌ Wave 0 |
| BOARD-04 | Rename applies optimistically and persists; rollback on failure | hook/unit | `pnpm test:unit -- use-update-board` | ❌ Wave 0 |
| BOARD-05 | Delete confirm modal; cascade; redirect logic (D-08) | e2e | `pnpm test:e2e -- boards-delete` | ❌ Wave 0 |
| BOARD-06 | Sidebar collapse/expand toggles and persists only for the session | component | `pnpm test:browser -- sidebar` (same file as BOARD-01) | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** the relevant `pnpm test:unit -- <name>` / `pnpm test:browser -- <name>` quick
  run for the file(s) touched.
- **Per wave merge:** `pnpm test:all` (unit + browser + storybook/a11y + e2e + visual).
- **Phase gate:** full suite green before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `src/features/boards/hooks/*.unit.test.ts` — no existing hook tests for this domain
- [ ] `src/features/boards/components/*.test.tsx` — no existing component tests for this domain
- [ ] `e2e/boards-*.e2e.spec.ts` — no existing e2e coverage; will reuse `e2e/fixtures.ts`'s
      `createFixtureAccount` pattern (`[VERIFIED: e2e/fixtures.ts:42-59]`, read this session) to get
      a signed-in session before exercising board CRUD against the real nonprod backend
- [ ] `src/components/ui/toast/toast.test.tsx` + `.stories.tsx` — new primitive, needs the same
      coverage shape as every other `components/ui/` primitive (behavioral test, Storybook stories,
      no visual-regression entry per CONVENTIONS.md's current narrowed scope — feature-level and
      newly-added primitives outside the existing `visual/primitives.visual.spec.ts` are explicitly
      not required to add one yet, per the "For now, that scope is further narrowed..." rule
      `[VERIFIED: CONVENTIONS.md:162]`)
- [ ] Framework install: none — Vitest/Playwright are already fully configured project-wide

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|--------------------|
| V2 Authentication | No new surface | Already covered by Phase 1's session/DAL; this phase only consumes `verifySession()` |
| V3 Session Management | No new surface | Same session cookie mechanism, unchanged by this phase |
| V4 Access Control | Yes | `userId` for every board/column/task/subtask call MUST be derived from `verifySession()` server-side inside the Route Handler, never accepted from the client request — this is the single most important control this phase adds, given the OpenAPI contract's unusual client-suppliable `userId` query parameter |
| V5 Input Validation | Yes | Zod schemas mirroring the backend's own constraints (board name `minLength:1`; column name `minLength:3,maxLength:32`) applied both client-side (RHF resolver) and server-side (inside the Route Handler, before forwarding to `externalApi`) |
| V6 Cryptography | No new surface | No new cryptographic material this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| IDOR via a guessed/enumerated `boardId` belonging to another user | Elevation of Privilege | The external backend itself scopes every board query by the server-derived `userId` (ADR domain/0001: single-owner boards) — a Route Handler that always sends the *session's own* `userId`, never a client-supplied one, means a request for another user's `boardId` is rejected by the backend's own ownership check, not by anything this frontend has to independently verify. Confirm this backend behavior during the same live-backend probe recommended in Open Question 1/2 (attempt a `GET /boards/{someone-elses-boardId}/full` and confirm it 403/404s rather than leaking data) — not directly observable from the OpenAPI contract's schema alone. |
| Mass-assignment / stale-`version` overwrite on rename | Tampering | Backend-enforced optimistic locking via the required `version` field on `UpdateBoardRequestDTO` (`[VERIFIED: docs/api/kanban-board-openapi.json]`) — a stale `version` is rejected (409), not silently applied. Phase 2 needs only a generic-error rollback for this case (SYNC-01's fuller reconciliation UX is Phase 4). |
| XSS via an unsanitized board/column name rendered in the sidebar | Tampering / Information Disclosure | React's default JSX text-node escaping already covers this (no `dangerouslySetInnerHTML` anywhere in the codebase, confirmed by this session's file reads) — no new control needed, but plans should not introduce raw HTML rendering for board/column names. |

## Sources

### Primary (HIGH confidence)

- `docs/adr/tech/0001-auth-session-storage.md`, `docs/adr/tech/0002-client-data-fetching-strategy.md`,
  `docs/adr/domain/0001-single-owner-boards.md`, `docs/adr/domain/0002-hard-cascade-delete.md`,
  `docs/adr/domain/0003-client-orchestrated-multi-child-creation.md` — read in full this session.
- `.planning/phases/01-foundation-auth-preferences/01-CONTEXT.md` (GC-18, GC-21, GC-24, GC-25) —
  read in full this session.
- `docs/api/kanban-board-openapi.json` — every board/column endpoint and schema queried directly via
  Node this session (`SaveBoardRequestDTO`, `UpdateBoardRequestDTO`, `BoardResponseDTO`,
  `BoardFullResponseDTO`, `SaveColumnRequestDTO`, `UpdateColumnRequestDTO`, `ColumnResponseDTO`,
  `ColumnFullResponseDTO`, `TaskFullResponseDTO`, `ReorderColumnRequestDTO`).
- `src/lib/server/{session,server-client,dal,session-cookie,theme}.ts`,
  `src/features/{auth/actions.ts,theme/actions.ts,theme/hooks/use-theme-preference.ts}`,
  `src/lib/core/{routing/routes.ts,api-contract/problem-detail.ts}`,
  `app/(dashboard)/{layout.tsx,boards/page.tsx,boards/[boardId]/page.tsx}`,
  `src/lib/client/query-client.tsx`, `src/components/ui/{modal,dropdown,text-field,icon-button}/*.tsx`
  — all read directly this session.
- `docs/superpowers/specs/2026-08-20-theme-cookies-actions-cleanup-design.md` — read in full this
  session; fully specified, no design gaps remain in it.
- `CONVENTIONS.md`, `docs/planning-history/DEFAULTS.md`, `.planning/PROJECT.md` — read in full this
  session.
- Context7 `/mui/base-ui` — Toast component API (`useToastManager`, `Toast.Provider`/`Viewport`
  anatomy, ARIA-live region defaults), queried this session.
- Context7 `/vercel/next.js/v16.2.9` — Route Handler dynamic-segment/`params`/`cookies()` async
  signatures, queried this session, matches this project's installed `next@16.3.0`.

### Secondary (MEDIUM confidence)

- None — every claim in this document is either read directly from this repository this session
  (`[VERIFIED]`) or from an official-docs Context7 query this session (`[CITED]`); no
  WebSearch-only claims were used.

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package/version read directly from `package.json`; no new
  installs needed.
- Architecture (Route Handler BFF layer): HIGH — derived from three independent in-repo sources
  (ADR tech/0001's own wording, GC-24's explicit board/column/task carve-out rationale, and the
  `updateThemeAction` precedent for `userId` derivation), not from external-pattern guesswork.
- Pitfalls: HIGH for the three schema-verified pitfalls (rename `version`, column-name length,
  server-only import boundary); MEDIUM for the ordering pitfall, which depends on unverified live
  backend behavior (A1/A2 in the Assumptions Log).

**Research date:** 2026-08-20
**Valid until:** 30 days (stable, in-repo-sourced architecture) — except the D-13 ordering and
error-shape open questions, which should be resolved at the start of implementation (Wave 0/Task 1),
not left until 30 days out.
