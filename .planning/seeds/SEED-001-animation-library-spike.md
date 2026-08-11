---
id: SEED-001
status: dormant
planted: 2026-08-11
planted_during: v1.0 / Phase 01 (foundation-auth-preferences)
trigger_when: "once core board/task CRUD functionality (Phase 2+) is stable and the team wants a visual-polish pass"
scope: medium
---

# SEED-001: Spike an animation library for later-stage visual polish

## Why This Matters

The current design-system primitives (Button, IconButton, TextField, Checkbox, Switch,
Dropdown, Modal) are built with static, token-driven styling and no motion layer — by
design, per this phase's scope. Once board/task CRUD (drag-and-drop columns, card
reordering, task detail transitions) exists, the app will have several natural spots
where motion improves perceived quality: page/route transitions, drag-and-drop feedback,
and micro-interactions on cards and columns. The user wants this evaluated as a deliberate
later spike, not folded into Phase 1 primitive work.

## When to Surface

**Trigger:** once core board/task CRUD functionality (Phase 2+) is stable and the team
wants a polish pass.

This seed will surface during `/gsd-new-milestone` when the milestone scope matches, or
can be pulled forward manually once Phase 2/3 board and task features are built.

## Scope Estimate

**Medium** — a spike to evaluate library choice (e.g. Framer Motion / Motion for React)
against this project's stack (Next.js 16 App Router, Tailwind v4, existing primitive
library), likely followed by a phase or two of applying it to drag-and-drop feedback and
transitions if adopted.

## Breadcrumbs

- `src/components/ui/` — the primitive library motion would layer onto (Modal, Dropdown
  overlays are the most likely first candidates for enter/exit transitions).
- `.planning/ROADMAP.md` — Phase 2 "Board Management" (drag-and-drop, board switching) is
  the most likely trigger point.
- `.planning/phases/01-foundation-auth-preferences/01-UI-SPEC.md` — current design system
  has no documented motion/animation conventions; a future UI-SPEC would need to define
  them alongside library selection.

## Notes

Raised by the user while reviewing the Phase 1 primitives sign-off checkpoint (Modal
component), alongside unrelated bug reports on Button/Checkbox/Modal — explicitly called
out as a separate, non-blocking idea for "some later stage of development."
