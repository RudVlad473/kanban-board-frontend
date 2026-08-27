---
created: 2026-08-27T09:15:00.000Z
title: Sidebar "+ Create New Board" is pinned to the panel bottom; the mock flows it directly under the board list
area: ui
severity: minor
files:
  - src/features/boards/components/board-list.tsx
  - .planning/phases/02-board-management/02-UI-SPEC.md
---

## Problem

In `docs/kanban-task-management-web-app.pdf` (p2, and the user's own reference capture), the
`+ Create New Board` link is the item immediately after the last board row — it reads as a fourth
entry in the same list flow, with all the empty sidebar space *below* it.

Shipped behaviour pins it to the bottom of the panel instead. Measured in the running app on a
2-board account: the `<ul>` bottom is at y=402 and the link's top at y=488 — an **86px gap** that
grows with panel height, because `board-list.tsx:121` wraps the list in
`<div class="flex-1 overflow-y-auto">` and the link is that div's *sibling*, so the scroll region
expands and pushes the link down.

## This is a spec defect, not only an implementation one

`02-UI-SPEC.md:188` (overflow row) explicitly specifies the shipped behaviour:

> the "+ Create New Board" link and the bottom theme-toggle/"Hide Sidebar" controls stay pinned
> outside the scroll region (PDF's layout: list scrolls, footer controls don't move)

while `02-UI-SPEC.md:150` says "sidebar link below the board list". The spec author read "below the
list" as "pinned below the scroll region". The mock disagrees. **Fixing the code without amending
line 188 leaves the next planner to re-derive the same bug**, so both must change together.

Open question the mock does not answer (only 3 boards are shown): where the link goes once the list
genuinely overflows. The reading consistent with the mock is that the link flows with the list
content and scrolls with it, while the theme toggle and `Hide Sidebar` stay pinned.

## Found by

Human review of plan 03-07's checkpoint walkthrough, 2026-08-27. Out of 03-07's scope
(`board-list.tsx` is a Phase 02 component) — deferred by the user rather than folded into that plan.

Related: [[2026-08-27-container-corner-radii-use-the-primary-button-pill-radius]] — same review pass.
