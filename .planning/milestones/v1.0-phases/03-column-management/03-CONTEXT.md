# Phase 3: Column Management - Context

**Gathered:** 2026-08-26
**Status:** Ready for planning

<domain>
## Phase Boundary

A signed-in user can shape a board's workflow by adding, naming, reordering, and removing
columns (COLUMN-01..04). This phase does not touch tasks/subtasks (Phase 4) or board-level
CRUD (Phase 2, complete).

**No CONTEXT.md existed before this session, so `03-UI-SPEC.md` (approved 2026-08-26) already
carries five product decisions (U-01..U-05) with the same authority a CONTEXT.md `<decisions>`
entry would — see Canonical References. This CONTEXT.md captures the remaining gray areas
that UI-SPEC left open (all UI/interaction mechanics were already locked there) and does not
re-litigate U-01..U-05.

</domain>

<decisions>
## Implementation Decisions

### New column position
- **D-01:** A newly created column always appends at the end of the column order (immediately
  before the `+ New Column` ghost column). No position picker in the Add Column modal. Moving
  a column anywhere afterward is what COLUMN-03's drag/keyboard reorder is for — creation and
  reordering stay two separate, single-purpose mutations rather than one combined "create at
  position N" op.

### Column count
- **D-02:** No hard cap on column count — matches the UI-SPEC's overflow treatment (columns
  scroll horizontally, no limit mentioned) and the backend contract (`SaveColumnRequestDTO` has
  no max-count field, so any cap would be client-only policy).
- **D-03:** A non-blocking toast nudge fires once when a board's column count first crosses
  **8 columns**. Creation is never blocked — the toast is purely informational, reuses the
  existing `Toast` component (Phase 2), and does not repeat on every subsequent add past the
  threshold. — **Reversibility:** reversible — client-only UI nudge, no backend involvement,
  trivially removed or re-thresholded later.

### Post-add scroll behavior
- **D-04:** After a column is successfully created, the board auto-scrolls the horizontal
  column row to bring the newly created column into view. Rationale: since D-01 always appends
  at the end and the `+ New Column`/`+ Add New Column` CTA can be off-screen on a wide board,
  without this the user gets no visual confirmation anything happened.

### Nudge threshold (resolved during planning, 2026-08-26)
- **D-05:** D-03's "first crosses 8 columns" means **exceeds** 8 — the toast fires on the add
  that makes the board's column count **9**, not 8. A board sitting at exactly 8 columns stays
  silent. Still fires once only, and still never blocks creation. — **Reversibility:**
  reversible — a single client-side threshold constant.

### Keyboard drag activation (resolved during planning, 2026-08-26)
- **D-06:** The keyboard lift accepts **both `Space` and `Enter`** — dnd-kit's `KeyboardSensor`
  default `keyboardCodes` is kept rather than narrowed to the `Space` the UI-SPEC names. The
  UI-SPEC's `Space` remains correct and documented; `Enter` is an additional accepted key, not a
  replacement. Consequence the planner must honour: the drag handle must not itself be an
  `Enter`-activated button, or `Enter` becomes ambiguous between "lift" and "activate" — the
  column kebab menu must be a separate control from the drag handle. — **Reversibility:**
  reversible — one `keyboardCodes` override away from the Space-only behaviour.

### Claude's Discretion
- Exact auto-scroll mechanics (smooth vs instant, `motion-reduce` handling) — follow the same
  `motion-reduce:` discipline the UI-SPEC already establishes for drag/rollback animations
  (`skeleton-row.tsx`/`button.tsx` precedent).
- Toast copy for the D-03 column-count nudge — not specified by the user; compose using the
  existing Toast copy conventions from `03-UI-SPEC.md`'s Copywriting Contract (title +
  description pair).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI / Design Contract
- `.planning/phases/03-column-management/03-UI-SPEC.md` — approved 2026-08-26. Locks the
  interaction model (U-01: per-column affordances, not batched), drag+keyboard reorder
  mechanics and a11y (U-02), column-dot color cycling (U-03), delete confirmation copy/flow
  (U-04), optimistic-vs-waiting mutation behavior (U-05), full copywriting contract, color/type/
  spacing tokens, and all UI-state coverage (empty/loading/error/overflow/zero-one-many/
  long-text). Read this in full before planning — it is the primary implementation contract for
  this phase, more detailed than this CONTEXT.md.

### Domain / Data Contract
- `docs/api/kanban-board-openapi.json` — `ColumnResponseDTO` (`id`, `name`, `version`,
  `position`), `SaveColumnRequestDTO` (create), `UpdateColumnRequestDTO` (rename, requires
  `version`), `ReorderColumnRequestDTO` (`targetPosition`, `version`). No color field, no
  max-count field — confirms D-02/U-03.
- `docs/adr/tech/0002` (superseded by tech/0018/0021 per PROJECT.md decisions) and
  `.planning/ROADMAP.md` Phase 3 section — COLUMN-01..04 requirements and success criteria.

### Prior Phase Patterns (Phase 2, complete)
- `src/features/boards/components/delete-board-confirm.tsx` — the confirm-modal pattern U-04
  mirrors exactly (title/body/destructive-primary/secondary-holds-focus).
- `src/features/boards/hooks/use-rename-board.ts`, `use-delete-board.ts` — optimistic-rollback
  (rename) vs wait-for-server (delete) hook patterns U-05 reuses for columns.
- `e2e/seed.ts` — already has `seedColumn()` following the same shape as `seedAccount()`/
  `seedBoard()` (one function per entity, sequential calls since the backend derives `position`
  from call order). See Deferred Ideas below — this resolves the seeding-design question a
  pending todo raised.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Menu` (`src/components/ui/menu.tsx`) — already has an `isDestructive` item variant
  (`menu.tsx:76`) for the column kebab's `Delete Column` entry.
- `Modal`, `TextField`, `Button`, `IconButton`, `Toast` — no new primitives needed this phase
  per UI-SPEC's Design System section.
- `toColumnCaption()` (`src/features/boards/model.ts`) — already produces the
  `"{NAME} ({N})"` header caption consumed by `board-view.tsx`.

### Established Patterns
- `RESULT_STATUS` shared enum (from 02-14) and `usehooks-ts`'s `useBoolean` — the toggle-state
  convention this phase's modals/menus should follow, per CONVENTIONS.md.
- `model.ts` holds pure functions (e.g. the U-03 `position % 3` color-cycling mapping) per
  CONVENTIONS.md's `model.ts` rule — assertable without rendering.

### Integration Points
- `src/features/boards/components/board-view.tsx` — the column `<section>`/`<h2>` this phase
  replaces with the three-element header anatomy UI-SPEC's Interaction Notes section specifies
  (drag-handle button + dot + caption, sibling kebab `IconButton`). Also where `tabIndex={0}`
  gets removed (UI-SPEC: `scrollable-region-focusable` is satisfied by the new header button
  instead).

</code_context>

<specifics>
## Specific Ideas

No specific visual/copy references beyond what `03-UI-SPEC.md` already captures — that
document was produced by resolving five open product questions directly with the user in the
same session it was authored, so this discussion focused on the gray areas it left open (column
count ceiling, new-column position, post-add scroll) rather than re-deriving UI/interaction
decisions.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **"Fold e2e seeding logic into a single service/module"**
  (`.planning/todos/pending/2026-08-22-fold-e2e-seeding-logic-into-a-single-service-module.md`)
  — raised a design question for future entities: should `e2e/seed.ts` grow one function per
  entity or move to a structured seeder service? Reviewed and **not folded**: `seedColumn()`
  already exists in `e2e/seed.ts`, following the same one-function-per-entity shape as
  `seedAccount()`/`seedBoard()` — the design question this todo posed for columns specifically
  is already resolved in code, not still open. The todo's other concern (a duplicate
  `signUpDirectCapturingTheme()` helper in `theme.e2e.spec.ts`) is unrelated to column
  management and stays with the original todo.
- **"Sort Boards by createdAt once the backend supplies it"** and **"Trim boards schema unit
  tests..."** — both matched only on the generic keyword "boards"; neither concerns column
  management. Left in the pending backlog, unrelated to this phase's scope.

None — discussion stayed within phase scope otherwise.

</deferred>

---

*Phase: 3-column-management*
*Context gathered: 2026-08-26*
