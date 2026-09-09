# Phase 3: Column Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-26
**Phase:** 3-column-management
**Areas discussed:** New column position, Column count limit, Post-add scroll behavior

---

## New column position

| Option | Description | Selected |
|--------|-------------|----------|
| Always append at end | Matches the UI-SPEC: the CTA is always last, created column slots in right before it. No position picker. | ✓ |
| Prepend at start | New column always becomes the leftmost column. | |
| User picks — reorder after creating | Append on create, use existing drag/keyboard reorder to move it. | |

**User's choice:** Always append at end
**Notes:** None — recommended option matched the existing UI-SPEC and board-create flow precedent.

---

## Column count limit

| Option | Description | Selected |
|--------|-------------|----------|
| No limit | Matches UI-SPEC's overflow handling (horizontal scroll, no cap). No backend max-count field. | |
| Soft warning past a threshold | Still allow creating more; show a hint/toast once a board crosses a threshold. | ✓ |
| Hard cap | Disable/hide add-column affordance at a fixed number. | |

**User's choice:** Soft warning past a threshold

### Follow-up: threshold value

| Option | Description | Selected |
|--------|-------------|----------|
| 8 columns | Past typical workflows, before scrolling gets heavy. | ✓ |
| 10 columns | More generous threshold. | |
| 5 columns | Tighter, closer to a typical board's natural column count. | |

**User's choice:** 8 columns

### Follow-up: warning style

| Option | Description | Selected |
|--------|-------------|----------|
| Non-blocking toast, creation still allowed | Reuses existing Toast; fires once on crossing threshold. | ✓ |
| Inline hint near the Add Column CTA | Persistent small text hint once over the threshold. | |

**User's choice:** Non-blocking toast, creation still allowed
**Notes:** Recorded as D-02 (no hard cap) + D-03 (toast at 8 columns) in CONTEXT.md.

---

## Post-add scroll behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-scroll to the new column | Reveals the new column if the CTA/board is wide enough to scroll it off-screen. | ✓ |
| Leave scroll position as-is | Simpler; no scroll-management code. | |

**User's choice:** Auto-scroll to the new column
**Notes:** Rationale ties directly to the "always append at end" decision above — without auto-scroll, a wide board gives no visual confirmation the create succeeded.

---

## Claude's Discretion

- Exact auto-scroll mechanics (smooth vs instant, `motion-reduce` handling) — follow the existing `motion-reduce:` discipline from `skeleton-row.tsx`/`button.tsx`.
- Toast copy for the column-count nudge (D-03) — compose from `03-UI-SPEC.md`'s existing Copywriting Contract conventions.

## Deferred Ideas

- None raised as new scope — the "Ready for context" close confirmed the UI-SPEC (U-01..U-05) plus the three decisions above cover this phase's gray areas.
- Reviewed (not folded): the "Fold e2e seeding logic into a single service/module" todo's column-seeding design question is already resolved in code (`seedColumn()` exists in `e2e/seed.ts`). Two other todo matches ("Sort Boards by createdAt", "Trim boards schema unit tests") were keyword-only matches on "boards" with no actual relevance to column management — not presented as fold candidates.
