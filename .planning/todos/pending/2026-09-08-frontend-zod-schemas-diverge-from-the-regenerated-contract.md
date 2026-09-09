---
created: 2026-09-08T12:00:00.000Z
title: Frontend Zod schemas diverge from the regenerated contract
area: feature
severity: minor
files:
  - src/features/boards/schemas.ts
  - src/features/tasks/schemas.ts
  - src/lib/core/api-contract/task-schemas.ts
  - docs/api/kanban-board-openapi.json
---

## Problem

Quick task `260908-g5y` regenerated `docs/api/kanban-board-openapi.json` from the deployed nonprod
backend (2026-09-08) to pick up `SaveBoardRequestDTO.id`. The regeneration brought 33 validation
constraints across 10 DTOs that accumulated in the backend since the 2026-08-29 regeneration. Four
of them put this app's own schemas out of step with what the backend enforces. Two run the unsafe
way — this app accepts input the backend refuses — and two run the safe way.

Only the comments that stated a now-false fact were corrected in that task. No schema behaviour was
changed, deliberately: closing either unsafe divergence means new copy and, for the board-name case,
a new error branch. That is a task of its own.

### Unsafe: this app accepts what the backend refuses

1. **Board name charset — the one a user can reach through the surface `260908-g5y` touched.**
   `SaveBoardRequestDTO.name` now declares `pattern: ^[a-zA-Z0-9 ]*$` — letters, digits and spaces
   only. `boardNameSchema` (`src/features/boards/schemas.ts:80-84`) enforces length (1..64) and no
   charset, so a board named `Andre's Board`, `Q4 — Launch` or `re-design` is accepted by this app
   and refused **400** by the backend. `UpdateBoardRequestDTO.name` gained the identical charset
   (as the equivalent compound non-blank + charset pattern), so **rename is exposed identically**.
   Both create and rename surface a generic failure toast rather than telling the user which
   character is the problem.

2. **Subtask title bounds.** `SaveSubtaskRequestDTO.title` now declares `minLength: 2` and
   `maxLength: 32`. `subtaskTitleRowSchema` (`src/features/tasks/schemas.ts:30`) is
   `.trim().min(1)` with no ceiling, so a one-character subtask title, or one over 32 characters,
   is submitted and refused 400.

### Safe: this app is stricter than the backend (a UX narrowing, not a break)

3. **Column name minimum.** `COLUMN_NAME_MIN_LENGTH` is 3 (`src/features/boards/schemas.ts:124`);
   `SaveColumnRequestDTO.name` and `UpdateColumnRequestDTO.name` both moved from `minLength: 3` to
   `minLength: 2`. A two-character column name is now legal upstream and still refused here.

4. **Task title minimum.** `taskTitleSchema` is `.min(3)`
   (`src/lib/core/api-contract/task-schemas.ts:62-66`); `SaveTaskRequestDTO.title` and
   `UpdateTaskRequestDTO.title` both moved from 3 to 2 and gained a non-blank pattern.
   `UpdateTaskRequestDTO` previously declared no bounds at all, so this direction improved.

## Solution

Take (1) first — it is the only divergence a user can hit through a shipped, everyday surface
(creating or renaming a board with an apostrophe or a hyphen is entirely ordinary).

- Add the charset to `boardNameSchema` with its own message, distinct from the length message, in
  the same `.pipe`-split shape `columnNameSchema` / `columnNameRowSchema` already use so a blank
  name can never report a charset error. Wording needs to go through the UI-SPEC Copywriting
  Contract — the mock has no precedent for a charset refusal, so this is a copy decision, not just
  a regex.
- Cover it at the layer it lives: an integration test asserting the backend's 400 for a punctuated
  name, plus a component test asserting the form refuses it before submitting.

Then (2): move `subtaskTitleRowSchema` to min 2 / max 32, reusing the length/required split the
task-title schemas already model.

Leave (3) and (4) as they are unless the stricter minimum is itself a UX complaint — mirroring a
backend relaxation buys nothing and costs a copy change.
