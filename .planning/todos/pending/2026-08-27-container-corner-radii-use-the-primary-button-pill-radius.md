---
created: 2026-08-27T09:15:00.000Z
title: Container corner radii use rounded-lg (28px, the primary-button pill) where the mock wants ~6px
area: ui
severity: minor
files:
  - src/features/theme/components/theme-toggle.tsx
  - src/features/boards/components/add-column-placeholder.tsx
  - tokens/radius.tokens.json
---

## Problem

Two containers are visibly too round against the mock. Both use `rounded-lg`, and this project's
`--radius-lg` is **28px**:

| Element                                        | Mock arc @600 DPI | Mock CSS px | Shipped |
|------------------------------------------------|-------------------|-------------|---------|
| Theme-toggle container (`theme-toggle.tsx:28`)  | ~40px             | ~6px        | 28px    |
| Ghost column (`add-column-placeholder.tsx`)     | ~44px             | ~7px        | 28px    |

Measured off `docs/kanban-task-management-web-app.pdf` p4 with the 600 DPI ÷ 6.25 method that
`tokens/radius.tokens.json` already documents for every radius token.

## Root cause

Every entry in `tokens/radius.tokens.json` was measured from a **control on PDF page 1**, never from
a container:

- `sm: 4px` — Text Field / Dropdown
- `md: 24px` — Button Secondary
- `lg: 28px` — Button Primary (L)

`lg` is a *pill* radius for a ~56px-tall button. There is no container/surface radius in the scale,
so any component needing one reaches for `rounded-lg` and inherits a pill. That makes this a
scale-shaped trap rather than two isolated typos — **audit every other `rounded-lg` on a container
before closing this**, not just these two.

## The ghost column's 28px is already an approved deviation — read this before "fixing" it

`03-UI-SPEC.md:326-332` records the ghost column's `rounded-lg` as a **known, deliberate
deviation**, not an oversight:

> The PDF's own corner measures ~6px, but every shipped card/modal/toast surface in this codebase
> already uses `rounded-lg` […] matching the PDF's 6px would make the placeholder the only surface
> on the board with its own radius. […] re-deriving the radius scale is a Phase 1 token change plus
> a visual-regression re-baseline, not a Phase 3 concern.

So dropping *only* the ghost column to `rounded-sm` would make it the odd surface out among the real
columns beside it — the exact outcome the spec was avoiding. The theme-toggle container carries no
such recorded rationale, so it is the weaker of the two claims to "deliberate".

That makes this a decision, not a one-line fix. Two coherent routes:

1. **Accept the deviation as spec'd** — close the ghost-column half, and treat only the theme toggle
   as a genuine misuse.
2. **Re-derive the radius scale project-wide** — a Phase 1 token change plus a visual-regression
   re-baseline, per the spec's own note. Fixes every container at once and keeps them consistent.

Either way it needs a human call, and route 2 is much larger than this todo's `severity: minor`.

## Constraint on any fix (user decision, 2026-08-27)

**Do not mint a new radius token.** Reuse the closest existing one — `--radius-sm` (4px,
`rounded-sm`) is nearest to the ~6-7px measured. A `radius-container` token was proposed and
explicitly ruled out. If 4px is judged too tight, reopen it with the user rather than adding a
token.

## Found by

Human review of plan 03-07's checkpoint walkthrough, 2026-08-27. Out of 03-07's scope
(`theme-toggle.tsx` is Phase 01/02; `add-column-placeholder.tsx` is plan 03-05) — deferred by the
user rather than folded into that plan.

Related: [[2026-08-27-sidebar-create-new-board-pinned-to-bottom-instead-of-flowing-under-the-list]] —
same review pass.
