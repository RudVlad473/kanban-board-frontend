---
created: 2026-08-22T00:00:00.000Z
title: Regenerate stale 02-VALIDATION.md and mark 02-RESEARCH.md open questions resolved
area: planning
severity: minor
files:
  - .planning/phases/02-board-management/02-VALIDATION.md
  - .planning/phases/02-board-management/02-RESEARCH.md
---

## Problem

Flagged by `gsd-plan-checker` while verifying the 02-09..13 replan (2026-08-22, after Phase
02.1's RSC rebuild superseded Phase 2's original architecture assumptions).

- `02-VALIDATION.md`'s Per-Task Verification Map still references `useBoards()`,
  `use-update-board`, and `e2e/fixtures.ts` — all deleted by Phase 02.1 (ADR tech/0019,
  `02.1-01-SUMMARY.md`). Doesn't block 02-09..13 (they carry their own verification blocks),
  but will mislead a future `/gsd-validate-phase` run or auditor.
- `02-RESEARCH.md`'s `## Open Questions` section (ordering/id-format, error-response shape,
  server-vs-client redirect) lists three questions that are, in substance, already answered
  elsewhere (`02-BACKEND-FACTS.md`, `load-boards.ts`, ADR tech/0019) but never got a
  `(RESOLVED)` suffix after the answers landed.

## Solution

Regenerate `02-VALIDATION.md` against the current codebase (or run `/gsd-validate-phase 2`
once Phase 2 executes) and mark `02-RESEARCH.md`'s three open questions `(RESOLVED)` with a
one-line pointer to where each was actually answered.

## Resolution

Resolved by plan `02.2-09`, Task 4: `02-VALIDATION.md`'s stale rows replaced (`fetchBoards()` +
`e2e/boards-list.e2e.spec.ts` for the deleted read hook and fixtures file; TBD Server-Action rows
for the deleted rename hook, pending Phase 2's remaining waves). `02-RESEARCH.md`'s three Open
Questions all carry `(RESOLVED)` with pointers to `02-BACKEND-FACTS.md` P1/P2/P3 and ADR
tech/0019.
