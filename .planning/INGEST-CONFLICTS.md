## Conflict Detection Report

Ingestion batch: 17 classified documents (12 ADR, 1 SPEC, 1 PRD, 3 DOC) in
C:/Dev/Repos/kanban-board-frontend/.planning/intel/classifications/
Mode: new. This is a re-run from scratch triggered by the addition of a 17th document
(`PRD.md`, classified PRD) to what was previously a clean 16-doc synthesis (0 requirements,
no PRD document existed until now).
Cross-ref graph checked for cycles, including PRD.md's cross_refs (HIGH-LEVEL-ARCHITECTURE.md,
CONTEXT.md, docs/adr/domain/0001-single-owner-boards.md, docs/adr/domain/0002-hard-cascade-delete.md,
docs/adr/tech/0002-client-data-fetching-strategy.md; kanban-board-openapi.json, docs/adr/domain/, and
TRIAGE.md are external references not present as classified documents in this batch, treated as
terminal leaves) — none found (max depth well under the 50 cap).
No UNKNOWN or low-confidence classifications present — all 17 are `high` confidence with a
resolved type.

### BLOCKERS (0)

None. No two LOCKED ADRs contradict on the same scope; no existing locked CONTEXT.md decisions
to check against in `new` mode; no cross-ref cycles detected.

### WARNINGS (0)

None. Only one PRD document (`PRD.md`) is present in this batch, so there are no competing
acceptance-criteria variants across PRDs to surface. Every v1/v2 requirement extracted from
PRD.md was checked against existing decisions.md/constraints.md/context.md entries covering the
same scope (auth, boards/columns/tasks/subtasks cascade-delete, drag-and-drop, sync/version
conflict, theme, single-owner boards, activity log) and found consistent — no contradictions
requiring user resolution.

### INFO (4)

[INFO] Auto-resolved: ADR tech/0001 (locked) resolves a SPEC open question on credential storage
  Note: HIGH-LEVEL-ARCHITECTURE.md's Open Questions section left signup/signin credential storage
  (bearer token vs. httpOnly cookie) unresolved at spec time. ADR tech/0001 (locked, precedence 1)
  subsequently decided httpOnly cookie via a Next.js Route Handler BFF proxy — no contradiction,
  the higher-precedence ADR answers the SPEC's open question. Recorded in constraints.md under
  "Open Questions" and decisions.md under ADR tech/0001.

[INFO] Auto-resolved: ADR tech/0007 (locked) resolves a SPEC open question on linter/formatter choice
  Note: HIGH-LEVEL-ARCHITECTURE.md's Known Constraints explicitly flagged linter/formatter tooling
  as "not decided by the user." ADR tech/0007 (locked, precedence 1) subsequently decided
  ESLint + eslint-plugin-tailwindcss + Prettier + prettier-plugin-tailwindcss — no contradiction,
  the SPEC's flagged gap is filled by the higher-precedence ADR.

[INFO] Auto-resolved: ADR tech/0008 supersedes SPEC's originally-listed visual-regression options
  Note: HIGH-LEVEL-ARCHITECTURE.md's Known Constraints (testing strategy) lists
  "Storybook + Chromatic (managed) or Lost Pixel/Argos (OSS)" for visual regression. ADR
  tech/0008 (precedence 1, though not marked locked — see next entry) instead chose
  Playwright-native (`toHaveScreenshot`), a fourth option not in the SPEC's original list, added
  and adopted after the user objected to third-party services. Not a contradiction requiring
  resolution — the ADR is a downstream technology-selection decision the SPEC explicitly deferred
  ("a technology-selection question for a downstream step, not a constraint").

[INFO] Four ADRs in this batch carry no explicit Accepted/locked status marker
  Note: docs/adr/tech/0008-visual-regression-tool.md, docs/adr/domain/0001-single-owner-boards.md,
  docs/adr/domain/0002-hard-cascade-delete.md, and
  docs/adr/domain/0003-client-orchestrated-multi-child-creation.md each contain a clear
  "Decision Outcome"/confirmed decision in prose, but no frontmatter or explicit "Status:
  Accepted" field. Per the classifier's rule (explicit status required for `locked: true`), all
  four are recorded in decisions.md as `status: proposed`, not locked. This means a future
  higher-or-equal-precedence source could revise them without tripping the LOCKED-vs-LOCKED
  blocker gate. No action required now — flagged for downstream awareness only.
