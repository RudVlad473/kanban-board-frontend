# Phase 3: Column Management - Research

**Researched:** 2026-08-26
**Domain:** Horizontal drag-and-reorder + per-entity CRUD against an optimistic-locking REST backend, inside a Next.js 16 / React 19 RSC-props architecture
**Confidence:** MEDIUM-HIGH (library/API surface HIGH — verified by reading installed source; backend reorder semantics LOW — the nonprod database was unreachable all session, see Environment Availability)

---

<user_constraints>

## User Constraints

### Locked Decisions (from `03-CONTEXT.md`)

- **D-01:** A newly created column always appends at the end of the column order (immediately
  before the `+ New Column` ghost column). No position picker in the Add Column modal. Moving
  a column anywhere afterward is what COLUMN-03's drag/keyboard reorder is for — creation and
  reordering stay two separate, single-purpose mutations rather than one combined "create at
  position N" op.
- **D-02:** No hard cap on column count — matches the UI-SPEC's overflow treatment (columns
  scroll horizontally, no limit mentioned) and the backend contract (`SaveColumnRequestDTO` has
  no max-count field, so any cap would be client-only policy).
- **D-03:** A non-blocking toast nudge fires once when a board's column count first crosses
  **8 columns**. Creation is never blocked — the toast is purely informational, reuses the
  existing `Toast` component (Phase 2), and does not repeat on every subsequent add past the
  threshold. — **Reversibility:** reversible — client-only UI nudge, no backend involvement,
  trivially removed or re-thresholded later.
- **D-04:** After a column is successfully created, the board auto-scrolls the horizontal
  column row to bring the newly created column into view. Rationale: since D-01 always appends
  at the end and the `+ New Column`/`+ Add New Column` CTA can be off-screen on a wide board,
  without this the user gets no visual confirmation anything happened.

### Locked Decisions (from `03-UI-SPEC.md`, same authority as CONTEXT.md `## Decisions`)

- **U-01** Column add/rename/delete uses **per-column affordances**, not the PDF's batched `Board Columns` section inside Edit Board. The `+ New Column` ghost column opens an Add-Column modal; each column header carries a kebab menu with `Rename Column` / `Delete Column`.
- **U-02** Reorder drag handle is the **whole column header**, no separate grip glyph — plus a **mandatory** keyboard path (focus header → `Space` lift → `←`/`→` move → `Space` drop → `Esc` cancel) with an `aria-live` announcement.
- **U-03** Column headers render the PDF's **colored dot**, cycled deterministically by `position % 3` from three new tokens.
- **U-04** Column delete is confirmed through a modal **mirroring `DeleteBoardConfirm` exactly** — `"Delete this column?"` / `"Delete Column"` (destructive) / `"Keep Column"` (secondary, holds initial focus).
- **U-05** Rename and reorder apply **optimistically with rollback + error toast** (D-15's pattern); delete **waits for the server** (D-09's pattern, since the cascade is irreversible per ADR domain/0002).

Plus the whole of `03-UI-SPEC.md`'s **Copywriting Contract**, **Color** (five new tokens, named exactly), **Typography**, **Spacing Scale**, **UI Considerations** (16 covered / 3 backstop) and **Interaction Notes**. Those are the implementation contract; this document does not restate them and does not override them.

### Claude's Discretion

- Exact auto-scroll mechanics (smooth vs instant, `motion-reduce` handling) — follow the same
  `motion-reduce:` discipline the UI-SPEC already establishes for drag/rollback animations
  (`skeleton-row.tsx`/`button.tsx` precedent).
- Toast copy for the D-03 column-count nudge — not specified by the user; compose using the
  existing Toast copy conventions from `03-UI-SPEC.md`'s Copywriting Contract (title +
  description pair).
- The drag-and-drop library choice, deferred to this document by `03-UI-SPEC.md`'s Design System table and Registry Safety section. **Resolved below: it is already decided by ADR tech/0003, which has not unwound.**

### Deferred Ideas (OUT OF SCOPE)

- **"Fold e2e seeding logic into a single service/module"** — reviewed and **not folded**: `seedColumn()` already exists in `e2e/seed.ts`. The todo's other concern (`signUpDirectCapturingTheme()` in `theme.e2e.spec.ts`) is unrelated to column management and stays with the original todo.
- **"Sort Boards by createdAt once the backend supplies it"** and **"Trim boards schema unit tests…"** — matched only on the keyword "boards"; neither concerns column management.
- Nothing else. Discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **COLUMN-01** | User can add a new column to a board | `POST /boards/{boardId}/columns` (`SaveColumnRequestDTO`, `{name}` only) — already exercised by `create-board-columns.ts`. Backend assigns `position` from call order (`02-BACKEND-FACTS.md` P5), which is what makes D-01's append-at-end free. Modal pattern: `add-board-modal.tsx`; create-failure-stays-inline pattern: `use-create-board.ts`. |
| **COLUMN-02** | User can rename a column | `PUT /boards/{boardId}/columns/{columnId}` (`UpdateColumnRequestDTO`, requires `version`). Optimistic-override + rollback pattern: `use-rename-board.ts`'s `RenameOverride`/`applyRenameOverride` derivation. Name bounds 3–32 already live in `columnNameSchema` (`schemas.ts:114`). |
| **COLUMN-03** | User can reorder columns within a board | `PATCH /boards/{boardId}/columns/{columnId}/reorder` (`ReorderColumnRequestDTO` = `{targetPosition, version}`, `targetPosition` 0-based, `minimum: 0`). Library: `@dnd-kit/core` + `@dnd-kit/sortable` per ADR tech/0003 — `horizontalListSortingStrategy`, `arrayMove`, `sortableKeyboardCoordinates`. Keyboard path and `aria-pressed`/`aria-roledescription` are built in (verified below). |
| **COLUMN-04** | User can delete a column (cascades to its tasks and subtasks) | `DELETE /boards/{boardId}/columns/{columnId}` — no request body, no response body. Cascade is **server-side** and irreversible (ADR domain/0002). Wait-for-server (never optimistic) pattern: `use-delete-board.ts`. No client cache to invalidate — reads are RSC-side (ADR tech/0019). |

</phase_requirements>

---

## Summary

This phase is much less about discovering a new technique than about **composing three already-shipped Phase 2 patterns onto a new entity, plus exactly one genuinely new piece of technology (drag-and-drop)**. The board CRUD triad — `useCreateBoard` (inline error, modal stays open), `useRenameBoard` (optimistic override + derivation-based retirement + rollback toast), `useDeleteBoard` (never optimistic, generic failure toast, no cache work because `refresh()` inside the action is what re-renders) — maps one-for-one onto columns. `BoardList` is the container-component template: a `"use client"` component that owns modal state and the hooks, and renders presentational children that take `onSubmit` props so their tests can drive them with a real local function instead of a banned `vi.mock`.

The drag-and-drop choice is **already locked and does not need re-deriving**: ADR tech/0003 chose the stable `@dnd-kit/core` + `@dnd-kit/sortable` line, and CONVENTIONS.md turns that into two enforced rules. Its stated unwind trigger — "`@dnd-kit/react` reaches a stable 1.0" — has **not** fired: `@dnd-kit/react` is still `0.5.0` `[VERIFIED: npm registry]`. Reading the installed dist confirmed the library gives this phase most of U-02's a11y obligations for free (`aria-pressed` while lifted, configurable `aria-roledescription`, a mounted-only live region, arrow-key sorting via `sortableKeyboardCoordinates`) — but also that it carries a **module-scope id counter** that will produce a Next.js hydration mismatch unless `DndContext` is given an explicit `id`.

The single largest unknown is **not** the library — it is the backend's reorder semantics. `ReorderColumnRequestDTO` sends one column's `version` and a `targetPosition`, but every column between the old and the new index necessarily moves too, and nothing in the contract says whether their `version` values are bumped server-side. If they are, the client's RSC-supplied props are stale for those columns the instant a reorder lands, and the next rename/delete on any of them 409s for a reason the user could not have caused. A probe script was written this session to answer that (plus five other column questions) but **could not run: the deployed nonprod backend's database was unreachable for the entire session** (four attempts, ~30 minutes, `HikariPool-1 - Connection is not available … total=0, active=0, idle=0`). `.planning/LEARNINGS.md`'s own third lesson — "A written-down backend rule is an assumption until it's probed" — applies directly. This must be a Wave 0 probe task, not a plan assumption.

**Primary recommendation:** Install `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` + `@dnd-kit/utilities@3.2.2`; put every new file in `src/features/boards/` (never `src/features/columns/` — the `boundaries` lint policy makes a `feature → feature` import a hard error, verified this session); mirror `BoardList`/`use-rename-board`/`use-delete-board` verbatim for the CRUD triad; and gate the reorder plan behind a Wave 0 backend probe that resolves `targetPosition` semantics and version-bump behaviour before any reorder code is written.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Read board + columns + tasks | Frontend Server (RSC) | — | `fetchBoardFull()` is a `server-only` RSC read passed as plain props; ADR tech/0019 bans a client-side query for list/detail data. Unchanged this phase. |
| Create / rename / delete / reorder column | Frontend Server (Server Action) | API | Every write is a `"use server"` action that calls `verifySession()`, zod-parses its own argument, calls `externalApi`, then `refresh()`s. Client never holds the session cookie. |
| Ownership / authorization | API (backend) | — | `02-BACKEND-FACTS.md` P7: the backend derives identity from `JSESSIONID` and refuses cross-account access with `403 ACCESS_DENIED` even when handed the owner's own `userId`. No frontend ownership check needed. |
| Cascade delete (column → tasks → subtasks) | API (backend) | — | ADR domain/0002. The frontend issues one `DELETE` and has no way to detect or block a non-empty column beforehand. |
| Optimistic order/name state + rollback | Browser / Client | — | There is **no query cache to patch** — reads never go through `useQuery` (ADR tech/0019). Optimism is local React state overlaid on the RSC props, exactly as `use-rename-board.ts` does, retired by pure derivation when refreshed props arrive. |
| Drag/keyboard sensing, collision, live-region announcements | Browser / Client | — | `DndContext` is a client-only concern; the whole column row becomes `"use client"` this phase. |
| Column-dot colour assignment (`position % 3`) | Browser / Client | — | The backend has no colour field (U-03). It is a pure function in `model.ts`, assertable without rendering. |
| Post-create auto-scroll (D-04) | Browser / Client | — | Layout/scroll is a DOM concern; nothing to persist. |
| Column-name length validation (3–32) | Browser / Client **and** Frontend Server | API | Client zod for immediate copy (`columnNameSchema`), Server-Action zod because an action is callable over the wire with an arbitrary payload (ADR tech/0024), backend as the real authority (`02-BACKEND-FACTS.md` P6). |

---

## Project Constraints (from CLAUDE.md)

These are directives, not suggestions — the planner must verify every plan against them.

| Directive | Source | Consequence for this phase |
|-----------|--------|----------------------------|
| Push to `origin` after each logical unit of work; `git push` fast-forward only, never force-push | `./CLAUDE.md` | Plans should not accumulate unpushed local commits. |
| **Debug UI/browser behaviour through the running dev server with Playwright MCP — never throwaway Node/JS DOM-poking scripts** | `./CLAUDE.md` | Any drag/reorder investigation task must drive the real app, not a scratch script. |
| Playwright MCP must run **headless**; confirm the resolved tool names start with `mcp__playwright__` (this project's own `.mcp.json`), never `mcp__plugin_playwright_playwright__` | `./CLAUDE.md` | Relevant to every `checkpoint:human-verify` and UAT task in this phase. |
| **Verify before presenting to the user, always** — drive the fix through the running app yourself first and report what you observed | `./CLAUDE.md` | A reorder/drag checkpoint may not be handed to the user on static evidence alone. |
| Copy `.env.local` into every worktree before running anything needing local env | `./CLAUDE.md` | GSD `isolation="worktree"` execution of any plan touching `pnpm dev`/e2e/integration must `cp /home/andre/dev/kanban-board-frontend/.env.local "$(git rev-parse --show-toplevel)/.env.local"` first. Never `cat`/`grep`/`git add` it. |
| Isolate each piece of work on its own branch/worktree; clean up merged branches and worktrees | `~/.claude/CLAUDE.md` | — |
| `pnpm`, never `npm`/`npx`; `pnpm dlx`, never `npx` | `~/.claude/TOOLING_PREFERENCES.md` | The dnd-kit install command must be `pnpm add …`. |
| Comment rules: never restate the code; comment at a different abstraction level; ≤3 prose lines mechanically enforced | `~/.claude/CODE_COMMENTS.md` + ADR tech/0023 | `pnpm comments:check` is blocking in CI. |
| Prefer LSP semantic navigation over Grep when a language server is available | `~/.claude/TOOLING_PREFERENCES.md` | — |

---

## Standard Stack

### Core (new this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/core` | `6.3.1` | `DndContext`, sensors (`PointerSensor`/`MouseSensor`/`TouchSensor`/`KeyboardSensor`), `DragOverlay`, live-region accessibility | **Already decided by ADR tech/0003** and made an enforced rule by CONVENTIONS.md → "Drag-and-drop". 24.3M weekly downloads. `[VERIFIED: npm registry]` `[CITED: docs/adr/tech/0003-drag-and-drop-library.md]` |
| `@dnd-kit/sortable` | `10.0.0` | `SortableContext`, `useSortable`, `horizontalListSortingStrategy`, `arrayMove`, `sortableKeyboardCoordinates` | The sortable preset of the same ADR-chosen line. 23.8M weekly downloads. `[VERIFIED: npm registry]` |
| `@dnd-kit/utilities` | `3.2.2` | `CSS.Transform.toString(transform)` for the sortable item's inline style | Already a transitive dependency of both packages above, but importing it directly requires declaring it explicitly. `[VERIFIED: read from the installed tarballs' own `package.json` dependency lists this session]` |

### Supporting (optional, decide during planning)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@dnd-kit/modifiers` | `9.0.0` | `restrictToHorizontalAxis`, `restrictToFirstScrollableAncestor`, `restrictToWindowEdges` | Only if the drag preview needs to be pinned to the horizontal axis. Exports verified this session: `createSnapModifier, restrictToFirstScrollableAncestor, restrictToHorizontalAxis, restrictToParentElement, restrictToVerticalAxis, restrictToWindowEdges, snapCenterToCursor`. `[VERIFIED: npm registry]` — **not required**; skip unless a UAT finding asks for it. |

### Already present — reuse, do not add

`@base-ui/react` (Modal/Menu/Toast), `@tanstack/react-query` (`useMutation` wrapping a Server Action), `react-hook-form` + `@hookform/resolvers` + `zod` (Add/Rename forms), `usehooks-ts` (`useBoolean`), `lucide-react` (`EllipsisVertical` — **no new glyph this phase**, per UI-SPEC). `03-UI-SPEC.md`'s Design System row is explicit: this phase adds **no new UI primitive**.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@dnd-kit/core` + `@dnd-kit/sortable` (v6/v10) | `@dnd-kit/react` `0.5.0` (the framework-agnostic rewrite) | **Barred.** ADR tech/0003's unwind trigger is "`@dnd-kit/react` reaches a stable 1.0"; it is at `0.5.0`, published 2026-07-13, with a `0.5.1-beta` dist-tag `[VERIFIED: npm registry]`. CONVENTIONS.md states the rule as "not the pre-1.0 `@dnd-kit/react` rewrite. Enforcement: `package.json` dependency pinned accordingly; code review." Switching is an ADR change, not a Phase 3 decision. |
| dnd-kit | `@hello-pangea/dnd` | Rejected in ADR tech/0003 on maintenance risk. |
| dnd-kit | Atlassian Pragmatic drag-and-drop | Rejected in ADR tech/0003: keyboard a11y ships in a separate optional package, which is more manual work against the enforced axe gate. |
| dnd-kit | Native HTML5 DnD | Rejected in ADR tech/0003: no touch, no keyboard. |

**Installation:**

```bash
pnpm add @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2
```

**Version verification performed this session** (`pnpm view <pkg> version dist-tags time.modified peerDependencies`):

| Package | latest | published | peerDependencies |
|---------|--------|-----------|------------------|
| `@dnd-kit/core` | `6.3.1` | 2024-12-05 | `react >=16.8.0`, `react-dom >=16.8.0` |
| `@dnd-kit/sortable` | `10.0.0` | 2024-12-04 | `react >=16.8.0`, `@dnd-kit/core ^6.3.0` |
| `@dnd-kit/utilities` | `3.2.2` | 2023-11-06 | `react >=16.8.0` |
| `@dnd-kit/modifiers` | `9.0.0` | 2024-12-04 | `@dnd-kit/core ^6.3.0`, `react >=16.8.0` |
| `@dnd-kit/react` | `0.5.0` | 2026-07-13 | `react ^18 || ^19` |

**React 19 / Next 16 compatibility — checked, not assumed** `[VERIFIED: read `@dnd-kit/core@6.3.1`'s own `dist/core.esm.js`, unpacked this session]`:

- Zero occurrences of `findDOMNode`, `defaultProps`, `propTypes`, `ReactDOM.render` — none of React 19's removed APIs is used.
- It imports `{ createPortal, unstable_batchedUpdates } from "react-dom"`. Verified against this repo's installed `react-dom@19.2.8`: `typeof unstable_batchedUpdates === "function"`, `typeof findDOMNode === "undefined"`. So the one legacy import it does use still resolves.
- The repo is active (last push `2026-07-13`, 17,571 stars, MIT, not archived, `[VERIFIED: gh api repos/clauderic/dnd-kit]`) but **all recent work is on the new `@dnd-kit/react`/`@dnd-kit/dom` line** — the legacy line has had no npm release since 2024-12-05. Treat it as feature-frozen but functional: acceptable for this phase, and a live input to the next ADR tech/0003 review.

---

## Package Legitimacy Audit

Run via `gsd-tools query package-legitimacy check --ecosystem npm` this session.

| Package | Registry | Age (published) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----------------|-----------|-------------|---------|-------------|
| `@dnd-kit/core` | npm | 2024-12-05 | 24,285,268/wk | github.com/clauderic/dnd-kit | **OK** | Approved |
| `@dnd-kit/sortable` | npm | 2024-12-04 | 23,758,289/wk | github.com/clauderic/dnd-kit | **OK** | Approved |
| `@dnd-kit/utilities` | npm | 2023-11-06 | 24,215,811/wk | github.com/clauderic/dnd-kit | **OK** | Approved |
| `@dnd-kit/modifiers` | npm | 2024-12-04 | 8,895,241/wk | github.com/clauderic/dnd-kit | **OK** | Approved (optional) |
| `@dnd-kit/react` | npm | 2026-06-11 | 1,212,424/wk | github.com/clauderic/dnd-kit | **OK** | **Not used** — barred by ADR tech/0003 until 1.0 |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.
**`postinstall` scripts:** `null` for every package above (checked by the seam; no network or out-of-tree filesystem access).

Provenance note: these package names come from **ADR tech/0003 and CONVENTIONS.md — this repository's own committed decision records** — not from a web search or training recall, and were then confirmed against the registry and against the unpacked tarball contents. `[VERIFIED: npm registry]`.

No shadcn or third-party registry block enters this phase (`components.json` does not exist; re-confirmed 2026-08-26 by `03-UI-SPEC.md`'s Registry Safety section and by this session's file listing).

---

## Architecture Patterns

### System Architecture Diagram

```
                     ┌───────────────────────────────────────────────┐
   HTTP request ───► │ app/(dashboard)/boards/[boardId]/page.tsx  RSC │
                     │  fetchBoards()  → membership / redirect guard  │
                     │  <Suspense key={boardId}>                      │
                     │    BoardContents  → fetchBoardFull(boardId)    │
                     │       └─ zod boardFullSchema.safeParse         │
                     └───────────────┬───────────────────────────────┘
                                     │ plain-JSON props: BoardFull
                                     ▼
                     ┌───────────────────────────────────────────────┐
                     │ BoardView   ("use client" — NEW this phase)   │
                     │  owns: modal-target state, pending ids,       │
                     │        optimistic order + name overrides      │
                     │                                               │
                     │  DndContext(id=…, sensors, announcements)     │
                     │    └ SortableContext(horizontalListSorting…)  │
                     │        └ ColumnHeader ×N  (useSortable)       │
                     │        └ AddColumnPlaceholder  (ghost column) │
                     │  AddColumnModal / RenameColumnModal /         │
                     │  DeleteColumnConfirm  (presentational,        │
                     │      driven by onSubmit props)                │
                     └───┬───────────┬───────────┬───────────┬───────┘
                         │           │           │           │
              useCreateColumn  useRenameColumn  useReorder   useDeleteColumn
              (inline error,   (optimistic +    Columns      (wait-for-server,
               modal open)      rollback+toast) (optimistic   toast on failure)
                         │           │          +rollback)    │
                         ▼           ▼           ▼            ▼
                     ┌───────────────────────────────────────────────┐
                     │ Server Actions  "use server"                  │
                     │  verifySession() → zod safeParse → externalApi│
                     │  → map upstream problem code → own discriminant│
                     │  → refresh()  (next/cache)                    │
                     └───────────────┬───────────────────────────────┘
                                     │ openapi-fetch + JSESSIONID bridge
                                     ▼
                     ┌───────────────────────────────────────────────┐
                     │ Deployed nonprod backend                      │
                     │  POST   /boards/{b}/columns                   │
                     │  PUT    /boards/{b}/columns/{c}               │
                     │  PATCH  /boards/{b}/columns/{c}/reorder       │
                     │  DELETE /boards/{b}/columns/{c}  ── CASCADE ──►
                     │    (column → tasks → subtasks, irreversible)  │
                     └───────────────────────────────────────────────┘

  refresh() re-runs the RSC branch above ──► new props ──► overrides retire by derivation
```

### Recommended Project Structure

**All Phase 3 code lives under `src/features/boards/`.** See Pitfall 1 — `src/features/columns/` is a lint error.

```
src/features/boards/
├── actions/
│   ├── create-column.ts             # POST  /boards/{b}/columns
│   ├── rename-column.ts             # PUT   /boards/{b}/columns/{c}
│   ├── reorder-column.ts            # PATCH /boards/{b}/columns/{c}/reorder
│   └── delete-column.ts             # DELETE/boards/{b}/columns/{c}
├── hooks/
│   ├── use-create-column.ts         # mirrors use-create-board.ts (inline error, modal stays open)
│   ├── use-rename-column.ts         # mirrors use-rename-board.ts (override + derivation retirement)
│   ├── use-reorder-columns.ts       # NEW shape: order override, not name override
│   └── use-delete-column.ts         # mirrors use-delete-board.ts (never optimistic)
├── components/
│   ├── board-view.tsx               # becomes "use client"; the container (BoardList's role)
│   ├── column-header.tsx            # h2 > button(handle: dot + caption) + sibling kebab IconButton
│   ├── add-column-placeholder.tsx   # the 280px "+ New Column" ghost column
│   ├── add-column-modal.tsx         # mirrors add-board-modal.tsx
│   ├── rename-column-modal.tsx      # mirrors edit-board-modal.tsx
│   └── delete-column-confirm.tsx    # mirrors delete-board-confirm.tsx exactly (U-04)
├── model.ts                         # + toColumnDotToken, applyColumnOrderOverride,
│                                    #   createColumnReorderAnnouncements, reorderColumns…
└── schemas.ts                       # + create/rename/delete/reorder column input schemas
src/lib/core/api-contract/external-paths.ts   # + COLUMN_DETAIL, COLUMN_REORDER
src/test-utils/                      # + one *-action-storybook-stub.ts per new action
vitest.config.ts                     # + one serverActionStubAlias entry per new stub
tokens/color.{tokens,light.tokens,dark.tokens}.json   # + the five UI-SPEC tokens
e2e/columns-*.e2e.spec.ts            # happy paths only (ADR tech/0022)
```

### Pattern 1: Presentational component + container, `onSubmit` as a prop

**What:** Every modal/confirm is a pure component that receives `isOpen`/`onOpenChange`/`onSubmit`/`isPending` and calls no hook of its own. The container (`BoardView`) owns the hooks and the target state.
**Why (not tidiness):** ADR tech/0020 bans `vi.mock` outside stories. A component that called `useDeleteColumn()` itself could not be behaviourally tested without mocking a module. This is stated verbatim in `delete-board-confirm.tsx`'s own docstring.
**Example (shipped, `src/features/boards/components/delete-board-confirm.tsx`):**

```tsx
type Props = {
    board: Board;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (values: { boardId: string }) => void;
    isPending: boolean;
};
```

Also carried across verbatim: the `handleOpenChange` guard (`if (isPending) return;`) is required **together with** `isDismissableOnBackdropClick={!isPending}`, because Base UI's Dialog fires `onOpenChange(false)` on Escape regardless of the backdrop prop; `initialFocus={keepColumnRef}` puts first focus on the non-destructive button; and `<Modal.Description className="break-words">` is what stops a 32-char column name widening the panel.

### Pattern 2: Optimistic override retired by pure derivation, not by clearing state

**What:** Do not patch a cache and do not clear state during render. Hold `{ previous…, next… }` in local (or context) state, derive the rendered value from `props + override`, and let the override retire itself when refreshed props no longer match `previous…`.
**Why:** There is **no query cache** — `fetchBoardFull` is an RSC read and ADR tech/0019 bans a client-side query for detail data. `use-rename-board.ts` documents this decision explicitly.
**Example (shipped, `src/features/boards/hooks/use-rename-board.ts`):**

```ts
export const applyRenameOverride = ({ boards, override }: { boards: Board[]; override: RenameOverride | null }): Board[] => {
    if (override === null) return boards;
    return boards.map((board) =>
        board.id === override.boardId && board.name === override.previousName
            ? { ...board, name: override.name }
            : board,
    );
};
```

**Extension to reorder (new):** the override is an *order*, not a field. Recommended shape, kept pure in `model.ts` so it is assertable without rendering:

```ts
export type ColumnOrderOverride = { previousOrder: string[]; order: string[] };

/** Retires itself the moment the server's own order stops matching `previousOrder`. */
export const applyColumnOrderOverride = ({
    columns,
    override,
}: {
    columns: ColumnFull[];
    override: ColumnOrderOverride | null;
}): ColumnFull[] => {
    if (override === null) return columns;
    const serverOrder = columns.map((column) => column.id);
    const isStale =
        serverOrder.length !== override.previousOrder.length ||
        serverOrder.some((id, index) => id !== override.previousOrder[index]);
    if (isStale) return columns;
    return override.order.flatMap((id) => columns.find((column) => column.id === id) ?? []);
};
```

### Pattern 3: Server Action shape (fixed order, never deviate)

Every one of `create-board.ts` / `rename-board.ts` / `delete-board.ts` / `create-board-columns.ts` follows exactly this order, and the column actions must too:

```ts
"use server";
import { refresh } from "next/cache";
// 1. session
const record = await verifySession();
if (!record) return { status: RESULT_STATUS.UNAUTHENTICATED };
// 2. zod safeParse of THIS function's own arguments (an action is callable over the wire
//    with an arbitrary payload regardless of compile-time types — ADR tech/0024)
const parsed = renameColumnInputSchema.safeParse({ boardId, columnId, name, version });
if (!parsed.success) return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
// 3. upstream call; userId ALWAYS from record.id, never from the argument
const { data, error } = await externalApi.PUT(EXTERNAL_PATH.COLUMN_DETAIL, {
    params: { path: { boardId: parsed.data.boardId, columnId: parsed.data.columnId }, query: { userId: record.id } },
    body: { name: parsed.data.name, version: parsed.data.version },
});
// 4. widen through `unknown` before testing — the contract declares no error schema
const upstreamError: unknown = error;
if (upstreamError !== undefined) return { status: mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code) };
// 5. safeParse the response — no DTO declares a `required` array
const column = columnSchema.safeParse(data);
if (!column.success) return { status: RESULT_STATUS.ERROR };
// 6. refresh() — the persistent (dashboard) layout does not re-render on ordinary navigation
refresh();
return { status: RESULT_STATUS.SUCCESS, column: column.data };
```

`RESULT_STATUS.CONFLICT` already exists and `mapProblemCodeToStatus` already maps `OPTIMISTIC_LOCK_CONFLICT → CONFLICT`, `DUPLICATE_RESOURCE → DUPLICATE`, `ACCESS_DENIED → NOT_FOUND` `[VERIFIED: src/lib/core/api-contract/map-problem-code.ts:16-22]`. UI-SPEC's distinct version-conflict toast copy therefore has a ready-made branch — unlike Phase 2, which deliberately folded `CONFLICT` into the generic path.

### Pattern 4: dnd-kit horizontal sortable, keyboard-first

Verified API surface of `@dnd-kit/sortable@10.0.0` (read from its own `dist/sortable.esm.js` export list this session):
`SortableContext, arrayMove, arraySwap, defaultAnimateLayoutChanges, defaultNewIndexGetter, hasSortableData, horizontalListSortingStrategy, rectSortingStrategy, rectSwappingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy`.

`useSortable` returns exactly (read from source): `active, activatorEvent, activeNodeRect, attributes, data, rect, index, newIndex, items, isOver, isSorting, isDragging, listeners, node, overIndex, over, setNodeRef, setActivatorNodeRef, setDroppableNodeRef, setDraggableNodeRef, transform, transition`.

`setActivatorNodeRef` is the mechanism for U-02's "whole column header is the handle, kebab is not": attach `setNodeRef` to the column `<section>`, and `listeners` + `attributes` + `setActivatorNodeRef` to the header `<button>` only. The kebab `IconButton` is a sibling of the `<h2>`, so it never receives the drag listeners at all.

`arrayMove(array, from, to)` is `splice`-based and `to` is the **final** index in the resulting array (read from source: `newArray.splice(to, 0, newArray.splice(from, 1)[0])`). Whether the backend's `targetPosition` means the same thing is **unverified** — see Open Question 1.

### Anti-Patterns to Avoid

- **A `columns` feature folder.** `src/features/columns/**` importing `@/features/boards/schemas` is a blocking lint error (Pitfall 1). Anything column-shaped goes in `features/boards/`.
- **Patching a TanStack Query cache for optimism.** There is no cache; `onMutate`/`setQueryData` tutorials do not apply here. ADR tech/0019.
- **Optimistically removing a deleted column.** U-05 + D-09 + ADR domain/0002: the cascade is irreversible, so the column stays until the server confirms.
- **One PATCH per arrow keypress.** UI-SPEC's Reorder section: intermediate keyboard steps are local only; the PATCH fires once, on drop. A request per keystroke burns versions and 409s against itself.
- **Extending `EditBoardModal` with a `Board Columns` section.** U-01 explicitly does not build the PDF's batched editor; `AddBoardModal` is untouched by this phase and must not be merged with `AddColumnModal`.
- **`font-bold` / `font-medium` utilities.** Project-wide the weight is `[font-weight:var(--font-weight-{token})]` (Tailwind v4 namespace-collision workaround documented in `button-variants.ts`).
- **New 12px (`--space-3`) usage.** Barred for new work by both 02- and 03-UI-SPEC.
- **A bare `"Cancel"` button.** UI-SPEC bars it; the secondary action is `"Keep Column"`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Horizontal drag reorder | Pointer-event math, collision detection, transforms | `@dnd-kit/core` + `@dnd-kit/sortable` | ADR tech/0003 + CONVENTIONS.md make it a rule, not a preference. Touch, auto-scroll, and collision detection are each larger than they look. |
| Keyboard reorder | Custom `keydown` state machine | `KeyboardSensor` + `sortableKeyboardCoordinates` | Verified: `defaultKeyboardCodes` is `{start:[Space,Enter], cancel:[Escape], end:[Space,Enter,Tab]}` and `sortableKeyboardCoordinates` resolves `ArrowLeft/Right/Up/Down` against measured droppable rects. |
| `aria-pressed` while lifted | A `useState` mirroring drag state | dnd-kit's `attributes` | **Already provided**: `'aria-pressed': isDragging && role === defaultRole ? true : undefined` where `defaultRole === "button"` `[VERIFIED: @dnd-kit/core@6.3.1 dist/core.esm.js, useDraggable memoizedAttributes]`. U-02's `aria-pressed="true"` requirement is satisfied by spreading `attributes`. |
| `aria-roledescription="draggable column"` | A manual attribute | `useSortable({ attributes: { roleDescription: "draggable column" } })` | Same source; default is `"draggable"`. |
| A polite live region for reorder announcements | A hand-rolled `role="status"` div | `DndContext`'s `accessibility.announcements` | dnd-kit renders `HiddenText` + `LiveRegion` and gates them behind `if (!mounted) return null;`, so they are client-only and cannot cause a hydration mismatch. UI-SPEC already requires this be a **separate** region from the Toast viewport — dnd-kit's is separate by construction. |
| Moving an item in an array | `splice` at each call site | `arrayMove` from `@dnd-kit/sortable` | — |
| Reordering the visible list | Re-sorting by `position` after each move | `arrayMove` on the rendered array + `applyColumnOrderOverride` | The server's `position` values are what you are *asserting*, not what you are reading, during the optimistic window. |
| A confirm dialog | A new modal | `Modal.Root/Content/Title/Description/Footer` + the `DeleteBoardConfirm` shape | U-04 says "mirroring `DeleteBoardConfirm` exactly". |
| A kebab menu | A new popup | `Menu.Root/Trigger/Content/Item` — `isDestructive` (`menu.tsx:76`) and `isDisabled` (`menu.tsx:74`) already exist | `board-card.tsx` is the worked example, including `Menu.Trigger render={<IconButton …/>}`. |
| Boolean toggle state | `useState` pair | `usehooks-ts`'s `useBoolean` | CONVENTIONS.md → "Boolean UI state". Note its sibling `useToggle` returns a **tuple**, not an object. |
| Error-code → user-message mapping | A bespoke branch per action | `parseProblemDetail` + `mapProblemCodeToStatus` + a per-hook copy table | Already shared; UI-SPEC's "Duplicate column name" row says explicitly to route through this. |
| Toast plumbing | Portal/timer/ARIA wiring | `useToast()` (`= BaseToast.useToastManager`) | `ToastProvider` is mounted in `app/layout.tsx:26`. |

**Key insight:** In this codebase the expensive mistake is not reaching for a library — it is reaching for a *pattern* (query-cache optimism, a `columns/` feature folder, a batched Save-Changes editor) that a shipped ADR already ruled out. Read `CONVENTIONS.md` and the three relevant ADRs (tech/0003, tech/0019, domain/0002) before writing any plan task.

---

## Common Pitfalls

### Pitfall 1: A `src/features/columns/` folder cannot import the column type

**What goes wrong:** `ColumnFull` is defined in `src/features/boards/schemas.ts` (it is a level of `boardFullSchema`). Any file under `src/features/columns/` importing it fails lint.
**Why it happens:** `CONVENTIONS.md`'s project-tree diagram still shows an aspirational `features/columns/` folder, but `eslint-plugin-boundaries` is configured with `default: "disallow"` and no `feature → feature` policy.
**Verified this session** — a scratch `src/features/columns/components/__probe.tsx` importing `@/features/boards/schemas` produced:

```
1:33  error  There is no policy allowing dependencies from elements of type "feature"
             to elements of type "feature"   boundaries/dependencies
```

**How to avoid:** Put every Phase 3 file in `src/features/boards/`. If a future phase genuinely needs a `columns` feature, that is an ADR-level change (promote the shared schemas to `lib/core/api-contract/`, per ADR tech/0024's stated promotion rule) — not a Phase 3 task.
**Warning signs:** A plan task naming a path under `src/features/columns/`.

### Pitfall 2: `boardId` is missing from the OpenAPI path parameters for three of the four column endpoints — and TypeScript will not catch the omission

**What goes wrong:** For `PUT /boards/{boardId}/columns/{columnId}`, `DELETE /boards/{boardId}/columns/{columnId}` and `PATCH /boards/{boardId}/columns/{columnId}/reorder`, the committed spec lists **only** `columnId` (path) and `userId` (query). `openapi-typescript` therefore generates `path: { columnId: string }`. Omitting `boardId` compiles cleanly **and** silently produces a URL with the literal placeholder left in.

**Verified this session, two ways:**

1. `openapi-fetch@0.17.0`'s `defaultPathSerializer` iterates `pathname.match(/\{[^{}]+\}/g)` and does `if (!pathParams || pathParams[name] === undefined || pathParams[name] === null) { continue; }` — it skips, it does not throw.
2. A live serializer run against a stub fetch:

```
omitted boardId  -> https://api.example.test/boards/%7BboardId%7D/columns/c1?userId=u1
supplied boardId -> https://api.example.test/boards/b1/columns/c1?userId=u1
```

3. Both variants (with and without `boardId`) pass `pnpm exec tsc --noEmit` with zero errors — the generated `path` type provides **no** protection in either direction.

**How to avoid:** Always pass `path: { boardId, columnId }` for these three operations. Add an `*.integration.test.ts` per column action that asserts a real 2xx/expected-4xx against the deployed backend — that, not the type checker, is the only thing that catches a dropped `boardId`. Do **not** hand-edit `generated-types.ts` (ADR tech/0005 bans it and CI re-generates and diffs it).
**Warning signs:** A 404/400 from a column mutation whose `instance` field contains `%7BboardId%7D`.

### Pitfall 3: dnd-kit's ids come from a module-scope counter → Next.js hydration mismatch

**What goes wrong:** `Prop 'aria-describedby' did not match. Server: "DndDescribedBy-0" Client: "DndDescribedBy-1"`.
**Why it happens** `[VERIFIED: @dnd-kit/utilities@3.2.2 dist/utilities.esm.js]`:

```js
let ids = {};
function useUniqueId(prefix, value) {
  return useMemo(() => {
    if (value) return value;
    const id = ids[prefix] == null ? 0 : ids[prefix] + 1;
    ids[prefix] = id;
    return prefix + "-" + id;
  }, [prefix, value]);
}
```

`DndContext` calls `useUniqueId("DndDescribedBy", id)` and `useDraggable` puts the result on **every** draggable as `aria-describedby`, unconditionally, including during SSR — while the element it points at is rendered only after `mounted` flips. The server module's counter is process-lifetime and drifts from the freshly-loaded client one.
**How to avoid:** pass an explicit stable `id` to `DndContext` — `<DndContext id={`board-columns-${board.id}`}>`. `DndContext`'s props type declares `id?: string` `[VERIFIED: dist/components/DndContext/DndContext.d.ts:11]`, and `useUniqueId(prefix, value)` returns `value` verbatim when supplied.
`[CITED: https://github.com/clauderic/dnd-kit/issues/926, https://github.com/clauderic/dnd-kit/issues/1103]` — the same failure and the same `id`-prop fix, reported repeatedly against Next.js.
**Warning signs:** A hydration warning in the dev-server console on `/boards/[boardId]`; a Vitest browser test that passes but a real page that warns.

### Pitfall 4: Playwright / Vitest-browser drag does not reliably start a dnd-kit `PointerSensor` drag

**What goes wrong:** `locator.dragTo()` (and `userEvent.dragAndDrop`, which Vitest browser mode exposes and which is Playwright-backed) raises **one** intermediate `mousemove`. A distance-based activation constraint, and dnd-kit's own movement tracking, need several.
**How to avoid, in order of preference:**
1. **Test the keyboard path in component tests.** It is ordinary `keyboard()` interaction, is deterministic, and is what U-02 makes mandatory anyway.
2. In e2e, drive the low-level API: `page.mouse.move(startX, startY)` → `page.mouse.down()` → `page.mouse.move(endX, endY, { steps: 10 })` → `page.mouse.up()`.
3. Configure sensors as `MouseSensor` + `TouchSensor` + `KeyboardSensor` rather than `PointerSensor` + `KeyboardSensor`. `MouseSensor.activators` is `onMouseDown` and `TouchSensor.activators` is `onTouchStart` `[VERIFIED: dist/core.esm.js:1673,1727]`, which keeps both real-world touch support (ADR tech/0003's explicit requirement) and automation reachability, without depending on the harness synthesising pointer events.
`[CITED: https://github.com/microsoft/playwright/issues/32609]` (dragTo raises one intermediate move; `steps` is the documented workaround).
**Warning signs:** A drag test that "clicks" and asserts nothing moved, with no error.

### Pitfall 5: `PointerSensor` has **no** built-in interactive-element guard

**What goes wrong:** UI-SPEC calls the kebab-opens-a-drag regression "the single most likely regression here."
**Verified:** `PointerSensor.activators[0].handler` checks only `if (!event.isPrimary || event.button !== 0) return false;` — there is no `isInteractiveElement`/`closest("button")` check anywhere in `@dnd-kit/core@6.3.1`'s dist (grep for `isInteractiveElement` returns nothing).
**How to avoid:** two independent mitigations, both cheap, use both —
1. Attach `listeners`/`setActivatorNodeRef` to the header `<button>` only, keeping the kebab a **sibling of the `<h2>`** exactly as UI-SPEC's anatomy specifies. A sibling never receives the listeners.
2. Give the sensor an activation constraint (`{ distance: 8 }` for mouse, `{ delay: 200, tolerance: 8 }` for touch) so a stationary press is a click, not a lift.
Make "a plain click on the kebab opens the menu, not a drag" an explicit acceptance criterion, as UI-SPEC asks.

### Pitfall 6: A reorder makes every shifted column's client-side `version` potentially stale

**What goes wrong:** `PATCH …/reorder` returns only the moved column (`ColumnResponseDTO`). Every column between the old and new index also changes `position` server-side. If the backend bumps their `version` too, the props the client is still holding are stale for all of them, and the *next* rename/delete/reorder on any of them fails `409 OPTIMISTIC_LOCK_CONFLICT` with no user-visible cause.
**Status: UNVERIFIED** — the probe designed to answer this could not run (see Environment Availability). Do not plan reorder code against either answer.
**How to avoid (safe under either answer):** while a reorder PATCH is in flight *and* until the `refresh()`ed props land, disable `Rename Column` / `Delete Column` on **every** column, not just the dragged one, and block a second reorder. UI-SPEC already disables the moved column's menu items and sets `aria-busy` on it; widening that to the whole row is the version-safe superset and costs nothing. Revisit narrowing it only after the probe says versions are not bumped.
**Warning signs:** the version-conflict toast appearing after a reorder the user believes succeeded.

### Pitfall 7: `CONVENTIONS.md`'s `router.refresh()` rule and the shipped code disagree

**Observed:** CONVENTIONS.md (Data fetching, and again under Server entry points) states "Every mutating Server Action's client caller invokes `router.refresh()`". In the shipped code, **all four** board mutations instead call `refresh()` from `next/cache` **inside the action** (`create-board.ts:85`, `create-board-columns.ts:77`, `rename-board.ts:88`, `delete-board.ts:62`), and `use-delete-board.ts:40` documents that choice: *"No cache work on success: `refresh()` inside the action is what removes the row from the persistent sidebar layout."* The only `router.refresh()` call site in the repo is `board-list.tsx:132` — a retry button, not a mutation.
**How to avoid:** follow the **shipped** pattern (`refresh()` in the action). Flag the CONVENTIONS.md wording to the user as a doc-hygiene item; do not silently add a second refresh in the hook, which would double-render every mutation.

### Pitfall 8: `.tsx` files may not declare the dnd-kit configuration objects

**What goes wrong:** `pnpm tsx:check` (blocking in CI) permits only five top-level declaration kinds in a `.tsx` file: a component, a `Props`/`*Props` type, imports/exports, a compound-component namespace object, and Next's framework-forced route exports.
**How to avoid:** the `announcements` object, `screenReaderInstructions`, sorting-strategy constants, the failure-copy tables and the `position % 3` mapping all live outside `.tsx`. Because the announcement strings need the live column list (UI-SPEC's `"…position {i} of {N}."`), the natural shape is a factory in `model.ts`:
`createColumnReorderAnnouncements({ columns }): Announcements`.
Copy tables follow `use-rename-board.ts`'s precedent and live in the hook file (`.ts`, so unaffected).

### Pitfall 9: The Storybook/Vitest Server-Action alias list must grow with each new action, in the right order

**What goes wrong:** a story/test rendering a component whose import chain reaches a real `"use server"` module pulls `node:crypto` into a browser test page and fails.
**How to avoid:** for each of the four new actions, add a `src/test-utils/<name>-action-storybook-stub.ts` (real programmable module, never `vi.mock` — see `rename-board-action-storybook-stub.ts` for the queue/hold/reset shape) **and** an entry in `vitest.config.ts`'s `serverActionStubAlias`. Vite matches a string `find` by **prefix**, so a longer path must precede any shorter path it starts with — the existing `create-board-columns` / `create-board` pair carries this exact comment. Check new names against that rule before adding them.

### Pitfall 10: Removing `tabIndex={0}` from the column `<section>` is required, not optional

`board-view.tsx:39` carries `tabIndex={0}` solely to satisfy axe's `scrollable-region-focusable` on a scroll region with no focusable content. UI-SPEC ends that condition by putting a real button in the header. Leaving it adds a redundant tab stop before every column and will read as an a11y regression at review.

---

## Code Examples

### Sensors + context (the container, `board-view.tsx`)

```tsx
// Source: dnd-kit legacy docs (https://dndkit.com/legacy/guides/accessibility/) +
// verified API surface of @dnd-kit/core@6.3.1 / @dnd-kit/sortable@10.0.0 dist read this session.
const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);

<DndContext
    id={`board-columns-${board.id}`}              // Pitfall 3 — required, not cosmetic
    sensors={sensors}
    accessibility={{ announcements, screenReaderInstructions }}
    onDragEnd={handleDragEnd}
>
    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        {renderedColumns.map((column) => <ColumnHeader key={column.id} column={column} … />)}
    </SortableContext>
    <AddColumnPlaceholder onOpen={openAddColumn} />
</DndContext>
```

`SortableContext`'s `items` "must be sorted in the same order in which the items are rendered, otherwise you may see unexpected results" `[CITED: https://dndkit.com/legacy/presets/sortable/sortable-context/]` — so derive `columnIds` from the same `renderedColumns` array the map uses, never from the raw props.

### The sortable column header

```tsx
const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: column.id, disabled: isLoneColumn, attributes: { roleDescription: "draggable column" } });
```

- `attributes` supplies `role="button"`, `tabIndex={0}`, `aria-roledescription`, `aria-describedby`, and `aria-pressed` **while dragging** — spread it onto the header `<button>` and delete any hand-written equivalent.
- `disabled: isLoneColumn` implements UI-SPEC's zero-one-many row: a board with exactly one column offers no drag and no keyboard lift.
- Style with `{ transform: CSS.Transform.toString(transform), transition }` from `@dnd-kit/utilities`.

### `onDragEnd` → one PATCH, optimistic

```ts
const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    if (over === null || active.id === over.id) return;
    const from = renderedColumns.findIndex((c) => c.id === active.id);
    const to = renderedColumns.findIndex((c) => c.id === over.id);
    const nextOrder = arrayMove(renderedColumns, from, to).map((c) => c.id);
    // Optimistic first (U-05), then exactly one request (UI-SPEC Reorder → Wire mapping).
    void reorderColumns({
        boardId: board.id,
        columnId: String(active.id),
        version: renderedColumns[from].version,
        targetPosition: to,                 // ← semantics UNVERIFIED, see Open Question 1
        previousOrder: renderedColumns.map((c) => c.id),
        nextOrder,
    });
};
```

### dnd-kit's own defaults, for reference when authoring the overrides

```js
// @dnd-kit/core@6.3.1, verbatim from dist/core.esm.js
const defaultScreenReaderInstructions = {
  draggable: `
    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.
  `
};
const defaultKeyboardCodes = {
  start:  [KeyboardCode.Space, KeyboardCode.Enter],
  cancel: [KeyboardCode.Esc],
  end:    [KeyboardCode.Space, KeyboardCode.Enter, KeyboardCode.Tab]
};
```

**Note on `Enter`:** because the drag handle is a real `<button>`, `Enter` both activates the button and (by default) starts a drag. UI-SPEC's keyboard contract names only `Space`. Recommended: pass `keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Tab"] }` to the `KeyboardSensor`, and let `Enter` do nothing at all on the handle (the handle has no click action of its own — the kebab is a separate control). Flagged as Open Question 3.

### Post-create auto-scroll (D-04) without fighting `motion-reduce`

A JavaScript `scrollIntoView({ behavior: "smooth" })` cannot be varied by a Tailwind `motion-reduce:` variant. Call `element.scrollIntoView({ inline: "end", block: "nearest" })` with **no** `behavior` — the default `"auto"` resolves to the scrolling box's CSS `scroll-behavior` — and put `scroll-smooth motion-reduce:scroll-auto` on the horizontal scroll row. One CSS declaration then governs both the motion and its reduced-motion opt-out, consistent with the `skeleton-row.tsx`/`button.tsx` precedent CONTEXT.md points at.

---

## Backend Contract (from `docs/api/kanban-board-openapi.json`, read this session)

| Operation | Method + Path | Path params **declared in spec** | Body | 200 response |
|-----------|---------------|----------------------------------|------|--------------|
| Create | `POST /boards/{boardId}/columns` | `boardId` ✅ | `SaveColumnRequestDTO` = `{ name: string(3..32) }` **required: `["name"]`** | `ColumnResponseDTO` |
| Rename | `PUT /boards/{boardId}/columns/{columnId}` | `columnId` only ⚠️ | `UpdateColumnRequestDTO` = `{ name: string(3..32), version: int64 }` **required: `["name","version"]`** | `ColumnResponseDTO` |
| Reorder | `PATCH /boards/{boardId}/columns/{columnId}/reorder` | `columnId` only ⚠️ | `ReorderColumnRequestDTO` = `{ version: int64, targetPosition: int32 (minimum: 0) }` **required: `["targetPosition","version"]`** | `ColumnResponseDTO` |
| Delete | `DELETE /boards/{boardId}/columns/{columnId}` | `columnId` only ⚠️ | none | **no content** |

`ColumnResponseDTO` = `{ id?: string; name?: string; version?: integer(int64); position?: integer(int32) }` — **no `required` array**, so every field is optional at the type level and `.safeParse` (never `.parse`) is mandatory per ADR tech/0024. `ColumnFullResponseDTO` adds `tasks`. There is **no colour field and no max-column-count field**, confirming U-03 and D-02.

Every operation also takes a **required `userId` query parameter**, which must come only from `verifySession()`'s record — never from the action's own argument (T-02-57/T-02-64 precedent).

⚠️ = the `boardId` omission described in Pitfall 2.

### Already-observed backend facts that carry over (`02-BACKEND-FACTS.md`)

| Finding | Consequence for Phase 3 |
|---------|-------------------------|
| **P5** — sequential `POST /columns` yields strictly ascending `position` (0,1,2) | D-01's append-at-end is free: no `position` is sent on create and none needs to be. Never parallelise column creates. |
| **P6** — column name bounds are exactly **3–32**, message *"Column name cannot be less than 3 character and more than 32 characters"* | `columnNameSchema` (`schemas.ts:114-118`) already mirrors this. Reuse it; do not re-derive. |
| **P3** — a stale `version` returns `409` with `code: "OPTIMISTIC_LOCK_CONFLICT"` and the standard problem-detail shape | Already in `PROBLEM_CODE` and already mapped to `RESULT_STATUS.CONFLICT`. UI-SPEC's distinct version-conflict toast has a ready branch. |
| **P7** — the backend enforces board ownership from the session, ignoring a client-supplied `userId` | No frontend ownership check needed for column mutations either. |

---

## Runtime State Inventory

Not applicable — this is a greenfield feature phase, not a rename/refactor/migration. No stored data, live service config, OS-registered state, secret, or build artifact carries a string this phase renames. **None — verified by inspecting the phase scope: every change is additive new code plus five new design tokens.**

The one *existing* file materially changed is `src/features/boards/components/board-view.tsx` (gains `"use client"`, loses `tabIndex={0}`, gains the header anatomy) — a code edit, not a data migration.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | ✓ | `24.x` engine pin honoured | — |
| pnpm | installs, scripts | ✓ | `11.20.0` (`packageManager`) | — |
| Chromium (Playwright) | `browser`/`storybook` Vitest projects, e2e, visual | ✓ | `@playwright/test 1.62.1`; Chrome symlinked at `/opt/google/chrome/chrome` (STATE.md) | — |
| `.env.local` (`EXTERNAL_API_BASE_URL`, `SESSION_SECRET`, `NONPROD_RESET_TOKEN`) | dev server, e2e, `node` Vitest project | ✓ present locally | — | Must be copied into any worktree (CLAUDE.md) |
| **Deployed nonprod backend — HTTP layer** | e2e, integration tests, dev | ✓ responding | — | — |
| **Deployed nonprod backend — database** | e2e, integration tests, dev, backend probe | **✗ DOWN** | — | **None** |

### The blocking item

Every DB-touching request to the deployed nonprod backend failed for the whole of this session:

```
POST /signup  -> 500 {"code":"INTERNAL_ERROR",
  "detail":"Unable to acquire JDBC Connection [HikariPool-1 - Connection is not available,
   request timed out after 30000ms (total=0, active=0, idle=0, waiting=3)] [n/a]"}
POST /signin  -> 500  (same)
GET  /boards  -> 401  (correct — the app layer is up; it never reaches the DB)
```

Four attempts across roughly 30 minutes, 2026-08-26. `total=0, active=0, idle=0` means the pool cannot open a connection at all — the application is up, its database is not.

**Consequences the planner must absorb:**

- `pnpm test:e2e` and every `*.integration.test.ts` (the `node` Vitest project) **cannot pass** until this recovers. `e2e/global-setup.ts` and `e2e/seed.sh` both begin with a sign-up.
- The column backend probe (below) could not run, so **every reorder-semantics claim in this document is `[ASSUMED]`**.
- The `browser`, `storybook`, `unit` and `tokens` Vitest projects and Storybook itself are unaffected — they touch no backend.

**Recommended plan sequencing:** put the probe and the backend-dependent tests in a wave that can be re-run, and make the first task of the phase a reachability check (`POST /signup` returning 201) so an executor halts loudly instead of interpreting a 500 as a code defect.

### Wave 0 backend probe — the exact questions to answer

Model it on `scripts/probe-board-backend.mjs` (same account/cookie helpers, same "never wire into CI" warning; the backend caps an account at two concurrent sessions, so sign in once per account). Seed one board with four columns `Alpha, Bravo, Charlie, Delta` at positions 0–3, then:

| # | Probe | Why it matters |
|---|-------|----------------|
| **R1** | Move index **0 → `targetPosition: 2`**. Result `[B,C,A,D]` ⇒ `targetPosition` is the **final index** (matches `arrayMove`'s `to`). Result `[B,A,C,D]` ⇒ it is an *insert-before-the-original-index* semantic and the client must translate. | Decides whether `to` from `arrayMove` can be sent verbatim. **The single highest-value unknown in this phase.** |
| **R2** | After R1, `GET /boards/{id}/full` — did the **`version` of the untouched, merely-shifted columns change**? | Decides Pitfall 6's mitigation width, and whether a second mutation right after a reorder can be allowed at all. |
| **R3** | Replay the same PATCH with the now-stale `version`. | Confirms `409 OPTIMISTIC_LOCK_CONFLICT` on reorder specifically (P3 only proved it for board rename). |
| **R4** | `targetPosition: 99` (out of range) and `targetPosition` equal to the column's current position (no-op). | Decides whether the client must clamp/short-circuit, and whether a no-op burns a version. |
| **R5** | `POST` a column whose name **duplicates an existing column on the same board**. | UI-SPEC's "Duplicate column name" copy and its inline-on-the-field routing assume a `DUPLICATE_RESOURCE` refusal. If the backend allows duplicates, that whole branch is dead code — exactly the `LEARNINGS.md` lesson about board names, one containment level down. |
| **R6** | `POST` a task into a column, `DELETE` the column, then `GET /full`. Then delete a **middle** column and re-read. | Confirms the cascade actually happens server-side (COLUMN-04's success criterion) and whether remaining `position` values are renumbered contiguously — which decides whether `position % 3` dot colours reshuffle after a delete. |
| **R7** | `DELETE` an already-deleted column. | Decides whether a double-submit needs a distinct branch or falls through to `NOT_FOUND`. |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.10` (five projects: `tokens`, `node`, `browser`, `unit`, `storybook`) + Playwright `1.62.1` (`visual`, `e2e`) |
| Config file | `vitest.config.ts`, `playwright.config.ts`, `.storybook/main.ts` |
| Quick run command | `pnpm test:unit` (jsdom, fast) — or `pnpm test:browser` for a touched component |
| Full suite command | `pnpm test` (all five Vitest projects) then `pnpm exec playwright test` (= `pnpm test:all`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| COLUMN-01 | `createColumnInputSchema` rejects blank / <3 / >32 names | unit | `pnpm test:unit -- src/features/boards/schemas.unit.test.ts` | ✅ file exists, cases ❌ Wave 0 |
| COLUMN-01 | Add-Column modal submits the typed name; failure keeps the modal open with an inline message | component | `pnpm test:browser -- src/features/boards/components/add-column-modal.test.tsx` | ❌ Wave 0 |
| COLUMN-01 | `createColumnAction` returns SUCCESS against the real backend, and INVALID for a 2-char name | integration | `pnpm test -- --project node src/features/boards/actions/create-column.integration.test.ts` | ❌ Wave 0 — **blocked by the DB outage** |
| COLUMN-01 | New column appears as a swimlane; the D-04 auto-scroll brings it into view | e2e | `pnpm test:e2e -- e2e/columns-create.e2e.spec.ts` | ❌ Wave 0 — **blocked** |
| COLUMN-02 | Optimistic name shows immediately; a queued failure rolls it back and raises the toast | component | `pnpm test:browser -- src/features/boards/components/board-view.test.tsx` | ✅ file exists, cases ❌ Wave 0 |
| COLUMN-02 | `applyRenameOverride`-equivalent derivation retires a stale override | unit | `pnpm test:unit -- src/features/boards/model.unit.test.ts` | ✅ file exists, cases ❌ Wave 0 |
| COLUMN-02 | Renamed name persists across a reload | e2e | `pnpm test:e2e -- e2e/columns-rename.e2e.spec.ts` | ❌ Wave 0 — **blocked** |
| COLUMN-03 | `applyColumnOrderOverride` + `arrayMove`-based reorder are pure and assertable | unit | `pnpm test:unit -- src/features/boards/model.unit.test.ts` | ✅ file exists, cases ❌ Wave 0 |
| COLUMN-03 | **Keyboard path**: focus handle → `Space` → `ArrowRight` → `Space` reorders; `Escape` cancels; announcements fire | component | `pnpm test:browser -- src/features/boards/components/board-view.test.tsx` | ❌ Wave 0 |
| COLUMN-03 | A lone column offers no drag and no keyboard lift | component | same file | ❌ Wave 0 |
| COLUMN-03 | A plain click on the kebab opens the menu and starts no drag | component | same file | ❌ Wave 0 |
| COLUMN-03 | Pointer drag reorders and the order survives a reload | e2e | `pnpm test:e2e -- e2e/columns-reorder.e2e.spec.ts` (low-level `page.mouse` + `steps`) | ❌ Wave 0 — **blocked** |
| COLUMN-04 | Confirm modal names the column; `Keep Column` holds initial focus; delete is not optimistic | component | `pnpm test:browser -- src/features/boards/components/delete-column-confirm.test.tsx` | ❌ Wave 0 |
| COLUMN-04 | Column and its tasks/subtasks are gone after delete (cascade) | e2e | `pnpm test:e2e -- e2e/columns-delete.e2e.spec.ts` | ❌ Wave 0 — **blocked** |
| U-03 | `toColumnDotToken(position)` cycles by `position % 3` | unit | `pnpm test:unit -- src/features/boards/model.unit.test.ts` | ✅ file exists, cases ❌ Wave 0 |
| all | No new axe violations on any new story | a11y | `pnpm test:a11y` | ✅ infra exists; stories ❌ Wave 0 |
| tokens | The five new tokens emit into `src/styles/tokens.css` in both themes | unit | `pnpm test -- --project tokens` | ✅ `tokens/style-dictionary.build.test.ts` exists, cases ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm lint && pnpm test:unit` plus `pnpm test:browser -- <touched file>` — under 30s for a single file.
- **Per wave merge:** `pnpm test` (all five Vitest projects). The `browser` and `storybook` projects are capped at `maxWorkers: 2` and run in separate `sequence.groupOrder` groups; do **not** raise either number or `testTimeout` to make a run pass (CONVENTIONS.md → "Test runner concurrency").
- **Phase gate:** `pnpm test:all` green, plus `pnpm lint format:check routes:check handlers:check stories:check comments:check tsx:check renders:check` and `pnpm api:generate` producing no diff, before `/gsd-verify-work`.
- **Known pre-existing flake, not caused by this phase:** `toast.test.tsx` races Base UI's 5s auto-dismiss (~1 failure in 8 full runs) — diagnosed, unfixed, tracked as a todo. Do not attribute it to column work.

### Wave 0 Gaps

- [ ] `src/features/boards/components/{add-column-modal,rename-column-modal,delete-column-confirm,column-header,add-column-placeholder}.{stories,test}.tsx` — every component needs a stories/test pair (ADR tech/0025); `pnpm renders:check` is enforced **for new files**, so tests must render composed stories only, never spread manual props.
- [ ] New named story exports for every state a test needs (a failed create, a queued rollback, a lone column, a lifted column, a 32-char name) — **no play functions** (`pnpm stories:check` is blocking).
- [ ] `src/test-utils/{create,rename,reorder,delete}-column-action-storybook-stub.ts` + four `serverActionStubAlias` entries in `vitest.config.ts`.
- [ ] `src/test-utils/factories/board-full.ts` — extend `createColumnsFull` if a story needs uneven column heights or a lone column.
- [ ] `e2e/seed.sh` — `seedColumn` exists; the reorder/delete e2e specs may want a `column-reorder` seed subcommand (or can drive the UI instead, which is the more honest e2e).
- [ ] `tokens/style-dictionary.build.test.ts` — assertions for the five new tokens in both themes.
- [ ] Framework install: none needed.

---

## Security Domain

`security_enforcement` is not set in `.planning/config.json` → treated as **enabled**.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (inherited) | `verifySession()` first line of every Server Action; the `externalApi` middleware bridges `JSESSIONID` and forces a sign-out on a non-`BAD_CREDENTIALS` 401. Unchanged this phase — but **every new action must call it**, and must not rely on the page's guard having run (CVE-2025-29927 class, T-02-50). |
| V3 Session Management | yes (inherited) | httpOnly/Secure/SameSite cookie; no client component reads it. `import "server-only"` on `server-client.ts` makes a client import a build failure. |
| V4 Access Control | **yes** | `userId` **only** from `record.id`, never from the action's argument, even though the OpenAPI contract declares it client-suppliable. The backend independently enforces ownership (`02-BACKEND-FACTS.md` P7). This is the single most important control to repeat in all four new actions. |
| V5 Input Validation | **yes** | zod `.safeParse` on every action argument **after** the session check (ADR tech/0024) — a Server Action is callable over the wire with an arbitrary payload regardless of compile-time types. `targetPosition` in particular must be `z.number().int().min(0)`; `version` `z.number().int()`; ids `z.string().min(1)`. |
| V6 Cryptography | no (nothing new) | Session signing is `jose` in `lib/server/session.ts`; untouched. |
| V7 Error Handling & Logging | **yes** | Every failure branch returns a **bare discriminant** from `RESULT_STATUS`, never upstream response text (T-02-61/D-21). All user-facing copy is authored in the hook. A column action must not leak the backend's `detail` string into a toast. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged Server-Action payload (arbitrary `boardId`/`columnId`/`version`/`targetPosition` over the wire) | Tampering / Elevation | zod `.safeParse` of the action's own arguments; server-derived `userId`; backend ownership check |
| IDOR — reordering or deleting a column on someone else's board | Elevation of Privilege | Backend returns `403 ACCESS_DENIED` regardless of the `userId` sent (P7); frontend maps 403 **and** 404 to the same `NOT_FOUND` branch so a caller cannot probe which ids exist (`result-status.ts:17-22`) |
| Unbounded upstream loop driven by a forged array | DoS | The precedent is `createBoardColumnsInputSchema`'s `z.array(...).max(50)` (T-02-46). This phase's actions are single-item, so no array cap is needed — but do not introduce a batch endpoint without one |
| Reflected upstream error text in a toast | Information Disclosure | Bare discriminants only; the failure-copy table is authored client-side |
| Optimistic-lock bypass (omitting `version`) | Tampering | `version` is `required` in both `UpdateColumnRequestDTO` and `ReorderColumnRequestDTO`, and required in the client input schema too — `renameBoardInputSchema` documents exactly why (a rename built by analogy to create is rejected on every attempt) |
| Irreversible cascade triggered by a mis-click | Destruction of data | U-04's confirm modal; `Keep Column` holds initial focus so a reflexive Enter cannot delete (T-02-65); delete is never optimistic |
| Session-cookie exposure to the client bundle | Information Disclosure | `import "server-only"`, `pnpm handlers:check`, and the `boundaries` `lib-client ↛ lib-server` policy |

**No new secret, credential, network egress, or user-supplied HTML enters the system this phase.** The only new third-party runtime dependency is dnd-kit, whose legitimacy audit is above and whose `postinstall` is `null`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-beautiful-dnd` | Its maintained fork `@hello-pangea/dnd`, or dnd-kit | rbd deprecated 2022 | Already resolved by ADR tech/0003 — do not reintroduce either. |
| dnd-kit legacy `@dnd-kit/core` + `@dnd-kit/sortable` | `@dnd-kit/react` + `@dnd-kit/dom` (`DragDropProvider`, `useSortable({id, index})`, no `SortableContext`) | Rewrite in progress; `0.5.0` as of 2026-07-13, still pre-1.0 | **Not adopted.** ADR tech/0003's unwind trigger is an explicit 1.0. Note that `dndkit.com`'s primary docs and Context7's `/websites/dndkit` index now serve the **new** API — a doc snippet showing `DragDropProvider` is for the wrong line. The legacy docs are at `https://dndkit.com/legacy/…`. |
| MSW mock server (ADR tech/0004) | No fake HTTP layer anywhere; every layer dials the real nonprod backend (ADR tech/0018) | Phase 1 | The DB outage above is therefore a hard blocker for e2e/integration, with no mock fallback by design. |
| `renderWithProviders` + `.run()` composed stories | `composeStories` from `@storybook/react` + direct JSX `render()` from `vitest-browser-react`; providers in Storybook decorators | Phase 02.2 (ADR tech/0025, supersedes 0021) | **Any dnd-kit testing recipe written before this repo's Phase 02.2 is wrong for this codebase.** `.run()` is ESLint-banned repo-wide. |
| `vi.mock` for Server Actions | Real programmable stub modules aliased in `vitest.config.ts` (ADR tech/0020's carve-out) | Phase 02.1/02.2 | Four new stubs needed; `vi.mock` is a blocking ESLint error. |
| Route Handler BFF proxy | RSC reads + Server Action writes (ADR tech/0019) | Phase 02.1 | `pnpm handlers:check` blocks a new `route.ts`. |

**Deprecated/outdated in this repo — do not copy from older artifacts:**
- `02-RESEARCH.md`'s and `CONVENTIONS.md`'s references to a Route Handler BFF — superseded by ADR tech/0019.
- `CONVENTIONS.md`'s aspirational `features/columns/` tree entry — contradicted by the enforced `boundaries` policy (Pitfall 1).
- `CONVENTIONS.md`'s `router.refresh()`-in-the-client rule — contradicted by all four shipped mutating actions (Pitfall 7).
- `docs/adr/tech/0002` (TanStack-Query-for-everything) — narrowed by tech/0019; `useMutation` survives only as a `mutationFn` wrapper around a Server Action.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| **A1** | `ReorderColumnRequestDTO.targetPosition` is the **final** 0-based index of the moved column in the resulting array (i.e. `arrayMove`'s `to` can be sent verbatim) | Code Examples, Pattern 4 | **High.** Every reorder lands one position off in one direction. Silent, and only visible after a reload. Probe R1. |
| **A2** | The backend does **not** bump the `version` of columns that merely shift position during a reorder | Pitfall 6 | **High.** If it does, the next rename/delete on any shifted column 409s. The recommended mitigation (disable the whole row while in flight) is safe either way, so the risk is a narrower-than-necessary lock, not a defect — but it must be confirmed before the mitigation is narrowed. Probe R2. |
| **A3** | The backend rejects a **duplicate column name** on the same board with `DUPLICATE_RESOURCE` | Copywriting (UI-SPEC "Duplicate column name") | **Medium.** If duplicates are allowed, that inline-error branch is dead code shipping untested. Directly analogous to `LEARNINGS.md`'s board-name lesson. Probe R5. |
| **A4** | Deleting a column renumbers the remaining columns' `position` contiguously | U-03 dot colours | **Medium.** If positions become sparse, `position % 3` produces a different (still valid, but non-adjacent) colour sequence. Cosmetic; may surprise at UAT. Probe R6. |
| **A5** | An out-of-range `targetPosition` is refused rather than silently clamped | Pitfall 6 / probe R4 | **Low.** The client always computes an in-range index from its own array. Probe R4. |
| **A6** | `@dnd-kit/core@6.3.1` behaves correctly under React 19.2 + Next 16.3 at **runtime** (static analysis found no removed API, but nothing was executed) | Standard Stack | **Medium.** A first plan task should mount a trivial sortable list in Storybook and confirm both the pointer and keyboard paths before the real components are built. |
| **A7** | Playwright's Chromium driver does not reliably synthesise the `pointer*` events `PointerSensor` needs | Pitfall 4 | **Low.** The recommended `MouseSensor` + `TouchSensor` + `KeyboardSensor` configuration sidesteps the question entirely and satisfies ADR tech/0003's touch requirement. `[CITED: microsoft/playwright#32609]` |
| **A8** | D-03's "first crosses 8 columns" means the successful create that takes the board from 8 to 9 | Open Question 2 | **Low.** Off-by-one in a purely informational nudge. Needs a one-line user confirmation. |
| **A9** | Adding `@dnd-kit/*` imports inside `src/features/boards/` does not trip `boundaries/dependencies` | Architecture | **Low.** Not probed directly, but `features/` files already import `@tanstack/react-query`, `lucide-react`, `next/navigation` and `usehooks-ts` with a clean lint, so external packages are evidently outside the policy's element set. |

---

## Open Questions

1. **What exactly does `targetPosition` mean, and what does a reorder do to other columns' `version`?**
   - *What we know:* it is a required 0-based integer with `minimum: 0`; the response is only the moved column; positions are otherwise assigned by creation order (P5).
   - *What's unclear:* final-index vs insert-before semantics; whether shifted columns' versions bump; the no-op and out-of-range behaviours.
   - *Recommendation:* **Wave 0 probe task (R1–R4 above), gate every reorder plan behind it.** Write the probe as `scripts/probe-column-backend.mjs` modelled on `scripts/probe-board-backend.mjs` and record the answers as `.planning/phases/03-column-management/03-BACKEND-FACTS.md`, exactly as Phase 2 did. Until it runs, the backend DB outage means it cannot even be attempted.

2. **Does D-03's "first crosses 8 columns" fire at 9, or at 8?**
   - *What we know:* the nudge is informational, never blocks, and must not repeat.
   - *What's unclear:* the exact trigger count.
   - *Recommendation:* implement as "the successful create whose resulting count is exactly 9" — that is the literal reading of *crosses* 8, needs no persistence, and cannot repeat by construction. Surface it as a one-line confirmation at the phase's first human checkpoint rather than a separate discussion round.

3. **Should `Enter` on the drag handle start a drag?**
   - *What we know:* dnd-kit's default `start` codes are `[Space, Enter]`; UI-SPEC's contract names only `Space`.
   - *What's unclear:* whether the divergence matters to the user.
   - *Recommendation:* narrow `keyboardCodes` to `{ start: ["Space"], cancel: ["Escape"], end: ["Space", "Tab"] }`. The handle has no click action of its own, so `Enter` doing nothing is not a lost affordance, and it keeps the implementation matching the announced instructions verbatim.

4. **Does the horizontal scroll row auto-scroll during a keyboard reorder past the fold?**
   - *What we know:* dnd-kit's `autoScroll` is on by default and `KeyboardSensor` takes a `scrollBehavior` option (default `"smooth"`); `sortableKeyboardCoordinates` resolves against measured droppable rects, and columns beyond the fold have rects.
   - *What's unclear:* how it behaves with the **nested** scroll containers this layout has (a horizontal row whose children are each vertically scrollable).
   - *Recommendation:* verify empirically in the same Storybook spike that resolves A6, using the shipped `ManyColumns` story shape. If it misbehaves, `restrictToFirstScrollableAncestor` from `@dnd-kit/modifiers` is the escape hatch — that is the only reason to add that package.

5. **`CONVENTIONS.md` drift (Pitfall 7 and Pitfall 1).**
   - *Recommendation:* raise both as a documentation-hygiene item at the end of the phase, not as a Phase 3 code change. Follow the shipped code; do not "fix" the code to match the doc.

---

## Sources

### Primary (HIGH confidence — read directly this session)

- `docs/api/kanban-board-openapi.json` — every column path, its declared parameters, and all five column DTOs, extracted programmatically.
- `src/lib/core/api-contract/generated-types.ts` — `updateById_1`, `deleteById_1`, `reorder`, `addColumnByBoardId` operation types (confirming the `boardId` omission).
- `openapi-fetch@0.17.0` `dist/index.mjs` — `defaultPathSerializer`, plus a live serializer run against a stub `fetch`.
- `@dnd-kit/core@6.3.1` `dist/core.esm.js` + `dist/components/DndContext/DndContext.d.ts` — `defaultKeyboardCodes`, `defaultScreenReaderInstructions`, `defaultAnnouncements`, `useDraggable`'s `memoizedAttributes`, the `Accessibility` mount gate, `PointerSensor`/`MouseSensor`/`TouchSensor`/`KeyboardSensor` activators, `Props.id`.
- `@dnd-kit/sortable@10.0.0` `dist/sortable.esm.js` — full export list, `useSortable`'s return shape, `arrayMove`, `sortableKeyboardCoordinates`.
- `@dnd-kit/utilities@3.2.2` `dist/utilities.esm.js` — `useUniqueId`'s module-scope counter.
- `@dnd-kit/modifiers@9.0.0` `dist/modifiers.esm.js` — export list.
- `react-dom@19.2.8` (installed) — `unstable_batchedUpdates` present, `findDOMNode` absent.
- This repository: `CONVENTIONS.md`, `CLAUDE.md`, `docs/adr/tech/0003`, `docs/adr/domain/0002`, `.planning/phases/02-board-management/02-BACKEND-FACTS.md`, `.planning/LEARNINGS.md`, `src/features/boards/**`, `src/lib/core/api-contract/**`, `vitest.config.ts`, `eslint.config.mjs`, `.storybook/**`, `tokens/**`, `e2e/**`.
- `pnpm view` (npm registry) and `gsd-tools query package-legitimacy check` for all five dnd-kit packages.
- `gh api repos/clauderic/dnd-kit` + `/commits` + issue search — repo activity and React-19 issue inventory.
- Live probes of the deployed nonprod backend (`POST /signup`, `POST /signin`, `GET /boards`) establishing the DB outage.
- `pnpm exec tsc --noEmit` and `pnpm exec eslint` runs against purpose-built scratch files (both removed afterwards) for Pitfalls 1 and 2.

### Secondary (MEDIUM confidence)

- `https://dndkit.com/legacy/guides/accessibility/` — the `accessibility` prop, `announcements`, `screenReaderInstructions`, default keyboard behaviour. Cross-checked against the dist source above and agreeing.
- `https://dndkit.com/legacy/presets/sortable/sortable-context/` — `SortableContext`'s `items`/`strategy` contract and the four built-in strategies, including the "items must be sorted in render order" warning.
- `https://dndkit.com/legacy/api-documentation/sensors/pointer/` — `distance`/`delay`/`tolerance` activation constraints. It explicitly does **not** document any interactive-child exclusion, which is consistent with the dist source showing none.

### Tertiary (LOW confidence — flagged, not relied on)

- `https://github.com/clauderic/dnd-kit/issues/926`, `.../issues/1103` — community reports of the `aria-describedby` hydration mismatch and the `DndContext id` fix. The **mechanism** was independently verified in source, so the conclusion is HIGH even though the citation is community.
- `https://github.com/microsoft/playwright/issues/32609` — `dragTo` raises one intermediate move; `steps` is the workaround. Not reproduced this session.
- `https://github.com/clauderic/dnd-kit/discussions/1842` — a roadmap question about `@dnd-kit/react` vs `@dnd-kit/core`, opened 2025-11-26, **zero maintainer replies** as of this session. Cited only to establish that no official deprecation statement exists.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Standard stack (which library, which version) | **HIGH** | Locked by a committed ADR, re-confirmed against the registry, unwind trigger checked and not fired, tarballs unpacked and read. |
| dnd-kit API surface and a11y behaviour | **HIGH** | Read from the installed dist, not from memory or a tutorial. |
| React 19 / Next 16 runtime compatibility | **MEDIUM** | Static analysis clean and the one legacy import verified present in `react-dom@19.2.8`, but nothing was executed. A11y and drag behaviour under React 19 must be smoke-tested first (A6). |
| Repo architecture, patterns, conventions, enforcement | **HIGH** | Every claim traced to a specific file and line, and the two riskiest (feature-boundary lint, `boardId` path param) were reproduced with real tool runs. |
| Backend column contract (shapes, bounds, error codes) | **HIGH** | OpenAPI read directly; bounds and the 409 code corroborated by `02-BACKEND-FACTS.md`'s own observed run. |
| **Backend reorder semantics, duplicate-name policy, delete renumbering** | **LOW** | **Not probed — the nonprod database was down all session.** Six assumptions (A1–A5) hang on this. Wave 0 probe required. |
| Testing strategy fit | **HIGH** | Read `vitest.config.ts`, `.storybook/*`, ADR tech/0025, and worked examples; the current (post-02.2) approach is reflected, not a pre-2.1 one. |
| Drag testability under Playwright/Vitest | **MEDIUM** | Community-documented limitation plus a verified sensor-activator reading; the recommended mitigation removes the dependency on the uncertain part. |

**Research date:** 2026-08-26
**Valid until:** 2026-09-25 for the library and architecture findings (dnd-kit's legacy line has not shipped in 20 months, so it is stable by neglect). **The backend findings expire the moment the probe runs** — replace this document's Assumptions Log A1–A5 with `03-BACKEND-FACTS.md` at that point.
