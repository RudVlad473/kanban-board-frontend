# 0003 — Drag-and-drop library

## Decision Drivers

- Dragging Task cards between Columns (and reordering Columns) is the
  defining interaction of the app.
- Accessibility is enforced, not aspirational: the fixed testing stack
  includes Storybook + `@storybook/addon-a11y` (axe-core), gated on "no
  new violations vs. baseline" — drag interactions are notoriously hard
  to make keyboard-operable and screen-reader-friendly.
- Explicit responsive requirement — must work by touch on mobile/tablet,
  not just desktop pointer/mouse.
- Every move round-trips to a server that can reject it on a stale
  `version` — the library needs to make "revert the optimistic move"
  cheap.
- Rewrite-level to swap later; this is deeply embedded in the core
  interaction.

## Considered Options

**dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`)** (recommended)
- Pros: keyboard sensor, live-region announcements, and sensible default
  ARIA are built in rather than opt-in; strong touch support alongside
  pointer/mouse; an `onDragEnd` state model that pairs cleanly with an
  optimistic mutation + rollback.
- Cons: its ecosystem is currently split between the mature, stable
  `@dnd-kit/core`/`@dnd-kit/sortable` line (v6.x) and a newer
  framework-agnostic rewrite (`@dnd-kit/react`, still pre-1.0) — the
  stable line is what's adopted here.

**@hello-pangea/dnd**
- Pros: inherited react-beautiful-dnd's well-regarded accessibility
  story — "ships with great screen reader support... out of the box."
- Cons: maintenance risk — last commit to `main` ~6 months stale, last
  actual release ~18 months stale, roughly one active contributor per
  quarter at research time.
- Why not the recommendation: excellent accessibility isn't enough to
  offset real doubt about whether this dependency is actively maintained
  for the life of a rewrite-level decision.

**Pragmatic drag-and-drop (Atlassian)**
- Pros: best maintenance velocity of the four (daily-synced from
  Atlassian's internal monorepo); production-hardened at Jira/Trello
  scale.
- Cons: keyboard accessibility ships in a separate optional
  `react-accessibility` package, and Atlassian's own guidance leans
  toward pairing drag with an action-menu UI rather than full keyboard
  DnD.
- Why not the recommendation: meaningfully more manual work to clear the
  enforced axe-core gate than dnd-kit's out-of-the-box behavior.

**Native HTML5 Drag and Drop API (hand-rolled)**
- Pros: zero dependency.
- Cons: touch is effectively unsupported on mainstream mobile browsers
  without third-party polyfills; no built-in keyboard support at all.
- Why not the recommendation: fails both the touch and accessibility
  requirements outright.

## Decision Outcome

Chosen: **dnd-kit**, specifically the stable `@dnd-kit/core`/
`@dnd-kit/sortable` line. Confirmed by the user at Phase 4's walkthrough:
"recommended."

## Consequences

Unwind trigger: `@dnd-kit/react` (the framework-agnostic rewrite) reaches
a stable 1.0 and offers a materially better fit than the `core`/
`sortable` line → re-evaluate migrating to it.

Sources:
- https://dev.to/puckeditor/top-5-drag-and-drop-libraries-for-react-24lb
  — fetched 2026-08-09 (independent).
- https://www.pkgpulse.com/blog/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026
  — fetched 2026-08-09 (independent).
- https://github.com/hello-pangea/dnd (repo + `gh api`) — fetched
  2026-08-09 (primary/repo + GitHub API): last commit `main` 2026-02-13.
- https://insights.linuxfoundation.org/project/hello-pangea-dnd —
  fetched 2026-08-09 (independent): "1 active contributor in the last
  quarter."
- https://github.com/clauderic/dnd-kit (repo + `gh api`) — fetched
  2026-08-09 (primary/repo + GitHub API): 17,508 stars, pushed
  2026-07-13.
- https://github.com/atlassian/pragmatic-drag-and-drop (repo + `gh api`)
  — fetched 2026-08-09 (primary/repo + GitHub API): last commit
  2026-08-08.
- Search aggregation on native HTML5 DnD mobile support — fetched
  2026-08-09 (independent, unverified exact 2026 currency).
- https://dndkit.com/ and /legacy/guides/accessibility/ — fetched
  2026-08-09 (vendor/primary-docs).
- https://atlassian.design/components/pragmatic-drag-and-drop/about —
  fetched 2026-08-09 (vendor/primary-docs).
