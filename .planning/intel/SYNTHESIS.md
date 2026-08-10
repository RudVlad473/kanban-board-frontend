# Synthesis Summary

Entry point for downstream consumers (gsd-roadmapper). Read this first, then the per-type intel
files below. Full conflict detail lives in ../INGEST-CONFLICTS.md.

This is a re-run from scratch across all 17 classification files in
`.planning/intel/classifications/`, triggered by the addition of a 17th document
(`PRD.md`, classified PRD) to what was previously a clean 16-doc synthesis (which had 0
requirements — no PRD document existed until now). `decisions.md`, `constraints.md`, and
`context.md` are unchanged in content from the prior 16-doc run (no new ADR/SPEC/DOC sources
were added this run); `requirements.md` is populated for the first time this run.

## Doc counts by type

- ADR: 12 (9 `docs/adr/tech/`, 3 `docs/adr/domain/`)
- SPEC: 1 (`HIGH-LEVEL-ARCHITECTURE.md`)
- PRD: 1 (`PRD.md` — new this run)
- DOC: 3 (`CONTEXT.md`, `CONVENTIONS.md`, `DEFAULTS.md`)
- UNKNOWN/low-confidence: 0
- Total: 17

## Decisions (decisions.md)

- 12 ADR entries extracted (unchanged this run).
- Locked (Accepted): 8 — ADR tech/0001 (auth session storage), 0002 (client data-fetching
  strategy), 0003 (drag-and-drop library), 0004 (OpenAPI mock server), 0005 (typed API client
  codegen), 0006 (production hosting), 0007 (linter/formatter toolchain), 0009 (project
  organization).
- Proposed (no explicit Accepted status found): 4 — ADR tech/0008 (visual regression tool), ADR
  domain/0001 (single-owner boards), domain/0002 (hard cascade delete), domain/0003
  (client-orchestrated multi-child creation).

## Requirements (requirements.md)

- 26 requirements extracted from 1 PRD document (`PRD.md`) — populated for the first time this run.
- v1: 24 requirements across 7 categories — Authentication (3), Boards (6), Columns (4), Tasks (5),
  Subtasks (4), Theme (1), Sync (1).
- v2 (deferred): 2 requirements — Activity (ACTIVITY-01, paginated activity log), Collaboration
  (COLLAB-01, multi-user board editing).
- Out-of-scope items captured verbatim under a dedicated section at the bottom of
  requirements.md (5 items) — substantively overlaps constraints.md's existing "Out of Scope"
  entry from HIGH-LEVEL-ARCHITECTURE.md; corroborating, not conflicting.
- No competing-variants: only one PRD document is present in this batch.
- Every requirement cross-checked against existing decisions.md/constraints.md/context.md entries
  covering the same scope; no contradictions found (see INGEST-CONFLICTS.md WARNINGS section).

## Constraints (constraints.md)

- 10 constraint entries extracted from the single SPEC document (`HIGH-LEVEL-ARCHITECTURE.md`)
  (unchanged this run): 1 architecture-classification entry (nfr), 3 Flow Spine entries
  (protocol — write/read/build-time paths, 15 stages total), 2 Cross-cutting entries (nfr —
  runtime, dev-process), and 4 scope/gap entries (nfr — Deferred, Known Constraints, Out of Scope,
  Open Questions).
- Type breakdown: protocol: 3, nfr: 7.

## Context (context.md)

- 13 topic-keyed entries extracted from 3 DOC documents (unchanged this run): 1 domain-language
  entry (CONTEXT.md, covering Board/Column/Task/Subtask/Version/Activity Log/User/Theme), 11
  convention entries (CONVENTIONS.md — project organization plus one per ADR tech/0001-0008, plus
  prerequisites/sequencing), 1 default-technical-choices entry (DEFAULTS.md, covering
  C-004/C-005/C-009/C-010/C-012/C-013).

## Conflicts

- Blockers: 0
- Competing variants: 0
- Auto-resolved (INFO): 4 — two SPEC open questions resolved by higher-precedence locked ADRs
  (auth credential storage → ADR tech/0001; linter/formatter choice → ADR tech/0007), one SPEC
  option-list superseded by a later ADR (visual regression → ADR tech/0008), and one transparency
  note on four ADRs lacking an explicit locked/Accepted status marker. No new conflicts introduced
  by PRD.md's ingestion — its 26 requirements were checked against existing intel and found
  consistent.
- Full detail: ../INGEST-CONFLICTS.md

## Per-type intel files

- decisions.md — 12 ADR entries
- requirements.md — 26 requirements (24 v1, 2 v2) from 1 PRD document, plus an Out-of-Scope note
- constraints.md — 10 entries from 1 SPEC document
- context.md — 13 entries from 3 DOC documents
