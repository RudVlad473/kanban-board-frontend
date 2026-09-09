# Phase 4: Task & Subtask Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-28
**Phase:** 4-task-subtask-workflow
**Areas discussed:** Stub success payloads, Edit Task write granularity, Move paths and
ordering, Feature-folder placement

---

## Gray area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Stub success payloads | The decision the roadmap flags as this phase's to make | ✓ |
| Edit Task write granularity | Mock's batched Save Changes vs Phase 3's U-01 precedent | ✓ |
| Move paths and ordering | Status dropdown as a second move path; optional targetPosition | ✓ |
| Feature-folder placement | Boards feature vs a new tasks feature under the boundaries rule | ✓ |

**User's choice:** all four.

---

## Stub success payloads

### Q1 — default success payload

| Option | Description | Selected |
|--------|-------------|----------|
| Per-action success factory map | ~1 line per action, keeps "unqueued call succeeds", 104 assertions untouched, but reintroduces a per-action register | |
| Explicit queuing in every test | No per-action code at all; costs rewriting the 104 assertions and loses the default | ✓ |
| Hybrid: factory only where relied on | Factories for existing dependents, explicit queuing for everything new | |

**User's choice:** Explicit queuing in every test.
**Notes:** The rejected option was the spike's own option 1. Recorded in CONTEXT.md as D-02 with
the reasoning that a factory map is a per-action register, which is the thing being deleted.

### Q2 — behavior on an unqueued call

| Option | Description | Selected |
|--------|-------------|----------|
| Throw naming the action | Fails at the call site; a fire-and-forget test must still queue | ✓ |
| Resolve undefined silently | Prototype's current behavior; forgotten queues fail downstream | |
| Resolve undefined, warn once | Keeps ergonomics, leaves a breadcrumb that is easy to miss | |

**User's choice:** Throw naming the action.

### Q3 — clearing recorder state between tests

| Option | Description | Selected |
|--------|-------------|----------|
| Global afterEach resets all | One reset in the browser setup file; no test can forget | ✓ |
| Per-test explicit reset | Full per-file control, copy-pasted call, forgettable | |
| Global reset plus opt-out | Safe default with an escape hatch, one more mechanism | |

**User's choice:** Global afterEach resets all.
**Notes:** Follows Phase 02.2's D-04, which centralized the copy-pasted body cleanup the same way.

### Q4 — ADR treatment for the deleted alias register

| Option | Description | Selected |
|--------|-------------|----------|
| New ADR, supersede the carve-out | Matches how tech/0025 superseded tech/0021 | |
| Amend tech/0020 in place | Matches Phase 02.2's D-16; cheaper, loses the alias-register history | ✓ |
| New ADR, amend tech/0020 to point at it | Fullest record, two documents to keep consistent | |

**User's choice:** Amend tech/0020 in place.
**Notes:** The amendment also corrects drift the spike found — the carve-out documents four stub
modules and four aliased specifiers where reality had twelve of each.

---

## Edit Task write granularity

### Q1 — Save Changes fan-out vs per-item saves

| Option | Description | Selected |
|--------|-------------|----------|
| Per-item, follow U-01 | Each subtask write is its own mutation with its own rollback | ✓ |
| Keep the mock's batched save | Matches the mock; partial failure leaves a mixed modal state | |
| Split the surfaces | Batched task fields, per-item subtasks; neither matches the mock's layout | |

**User's choice:** Per-item, follow U-01.
**Notes:** Second deliberate divergence from the mock in the same direction as U-01, for the same
stated reason — each subtask carries its own version.

### Q2 — initial subtasks at create

| Option | Description | Selected |
|--------|-------------|----------|
| Keep initial subtasks at create | Sequential calls, partial failure kept, mirrors create-board-columns | ✓ |
| Title, description and column only | One code path for subtask creation; departs from the mock | |

**User's choice:** Keep initial subtasks at create.

### Q3 — rapid subtask toggle while a write is in flight

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic, ignore while in flight | Stale version can never be sent; a fast double-click drops one toggle | ✓ |
| Optimistic, queue the latest | Every toggle lands; more moving parts, bursts of writes | |
| Wait for the server | Version-safe for free; the checklist feels slower than everything else | |

**User's choice:** Optimistic, ignore while in flight.

### Q4 — subtask delete confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Delete immediately, no confirm | Matches the mock's bare X; a subtask destroys nothing beneath it | ✓ |
| Confirm every delete | One consistent destructive rule; a modal for one line of text | |
| Undoable delete via toast | New pattern; undo would be a create with a new id, not a restore | |

**User's choice:** Delete immediately, no confirm.
**Notes:** Task deletion still keeps the confirm modal, because it hard-cascades to subtasks.

---

## Move paths and ordering

### Q1 — Current Status dropdown as a move path

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, both paths ship | Dropdown and drag call the same mutation; a move path independent of drag | ✓ |
| Drag only, dropdown reads | Smaller surface; departs from the mock, drag is the only move path | |
| Dropdown only, drag later | Would leave TASK-04 unmet in this phase | |

**User's choice:** Yes, both paths ship.

### Q2 — within-column reordering

| Option | Description | Selected |
|--------|-------------|----------|
| Cross-column only | Matches TASK-04 and success criterion 4 exactly | |
| Also reorder within a column | Sends targetPosition; scope no requirement covers | ✓ |
| Cross-column now, note for later | Honest against requirements, keeps the idea | |

**User's choice:** Also reorder within a column.
**Notes:** Chosen with the gap stated. Recorded in CONTEXT.md as D-11 with an explicit scope note
so planning and verification treat it as intended rather than as drift.

### Q3 — conflict behavior beyond revert and toast

| Option | Description | Selected |
|--------|-------------|----------|
| Revert, toast, and refresh | Extra read on a failure path; the board can visibly reshuffle | ✓ |
| Revert and toast only | Exactly what column reorder does today; board keeps stale data | |
| Revert, toast, refresh only on move | Targets the read at the likeliest case; two behaviors to verify | |

**User's choice:** Revert, toast, and refresh.
**Notes:** This is new relative to Phase 3, whose column reorder reverts and toasts only.

### Q4 — task card as both drag target and open target

| Option | Description | Selected |
|--------|-------------|----------|
| Card opens, separate drag handle | Same split D-06 forced on column headers; a handle the mock lacks | ✓ |
| Card drags, Space lifts only | Keeps the mock's clean card; reverses D-06's reasoning for one surface | |
| Card drags, detail opens elsewhere | No ambiguity, but opening a task takes two steps | |

**User's choice:** Card opens, separate drag handle.

---

## Feature-folder placement

### Q1 — where task and subtask code lives

| Option | Description | Selected |
|--------|-------------|----------|
| Inside the boards feature | No policy change; the boards feature would hold four entity types | |
| New tasks feature, widen policy | Cleaner separation; opens the first feature-to-feature edge | ✓ |
| New tasks feature, compose in layout | No policy change; restructures code that already works | |

**User's choice:** New tasks feature, widen policy.
**Notes:** Claude flagged that this option opens the first exception to the rule ADR tech/0009
exists to enforce. The user's choice stood, and Q2 was asked to bound how far it opens.

### Q2 — breadth of the boundaries change

| Option | Description | Selected |
|--------|-------------|----------|
| Only boards may import tasks | One directed edge; each future pairing needs its own entry | ✓ |
| Any feature may import any feature | Simplest config; removes the guarantee tech/0009 provides | |
| Tasks is importable, imports nothing | Acyclic by construction; an unusual rule shape to explain | |

**User's choice:** Only boards may import tasks.

### Q3 — where the task and subtask schemas live

| Option | Description | Selected |
|--------|-------------|----------|
| Move to tasks, boards imports them | Shape lives with the entity; makes the edge load-bearing for a read path | ✓ |
| Move shared shapes to lib core | Neither feature depends on the other for types; contract shapes leave their owner | |
| Leave schemas in boards | No file moves; would need the reverse edge too | |

**User's choice:** Move to tasks, boards imports them.

### Q4 — ADR treatment for the boundaries exception

| Option | Description | Selected |
|--------|-------------|----------|
| Amend tech/0009 in place | Consistent with the tech/0020 amendment chosen earlier this session | ✓ |
| New ADR narrowing tech/0009 | Matches how tech/0019 narrowed tech/0002; a reviewable first crack | |
| No ADR change, config comment only | Cheapest; would leave the ADR contradicting the code | |

**User's choice:** Amend tech/0009 in place.

---

## Todo triage

| Todo | Folded |
|------|--------|
| Storybook dev server crashes on any story reaching session.ts | ✓ |
| Full-suite browser flakes (dropdown Disabled hang, toast auto-dismiss race) | ✓ |
| Fold e2e seeding logic into a single service/module | |
| boards-create e2e 401s when its seed session is evicted | |

---

## Claude's Discretion

- Drag-context ownership across columns and tasks, and empty-column drop behavior.
- Drop-indicator and drag-preview visuals, following the existing column-drag treatment.
- Toast copy for conflict and rollback branches.
- Whether the transform matches on the `"use server"` directive alone or also on the `/actions/`
  path segment, and whether the plugin gets its own unit coverage.
- Naming and internal foldering inside `src/features/tasks/`.
- Whether subtask rename is inline on the row or its own control.

## Deferred Ideas

No new capabilities were raised. The one scope extension that surfaced, within-column task
reordering, was accepted into this phase rather than deferred — see CONTEXT.md D-11, which
records that no requirement covers it.
