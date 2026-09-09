# Phase 4: Task & Subtask Workflow — Research

**Researched:** 2026-08-28
**Domain:** Vite build-time test-double generation · Next 16 Server Actions + optimistic reconciliation · `@dnd-kit` classic multi-container drag · task/subtask REST contract
**Confidence:** HIGH for repo facts and contract facts (read and probed this session), MEDIUM for the dnd-kit multi-container shape (library version verified, pattern not yet run in this repo), LOW for nothing that is presented as settled.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

*(copied verbatim from `04-CONTEXT.md` `## Implementation Decisions`)*

#### Server Action stub tooling (runs first in the phase)

- **D-01:** Adopt the spike's prototype as-is in shape: a Vite `transform` plugin that detects a
  leading `"use server"` directive and emits a recorder module with the same export names, plus
  one generic programmable recorder replacing the queue/hold/settle/reset skeleton currently
  copy-pasted across the stub files. The twelve stub modules and the whole `serverActionStubAlias`
  register are deleted. A Server Action added after this lands needs no stub file and no config
  entry. — **Reversibility:** one-way — reverting means recreating twelve deleted modules,
  restoring the register, and re-inverting the test rewrites D-02 forces.

- **D-02:** **No per-action success payload.** Every test queues its own outcome explicitly. The
  spike's option 1 (one success factory per action in a single map) is rejected: it would
  reintroduce exactly the per-action register the plugin exists to delete, differing from today's
  register only in size. The measured cost is accepted — the spike's full `browser` run with the
  register off found 104 failures across four files (`board-view.test.tsx`, `board-list.test.tsx`,
  `sortable-column.test.tsx`, `rename-override-provider.test.tsx`), all from the one missing
  default. Those assertions are rewritten to queue their outcomes. The "unqueued call succeeds"
  ergonomic is given up permanently. — **Reversibility:** costly — the rewrite spans 104
  assertions in four files, and every test authored after this assumes explicit queuing.

- **D-03:** An unqueued call **throws**, naming the module key and export name and saying to queue
  an outcome. It does not resolve `undefined` (the prototype's current behavior) and does not warn
  and continue. A forgotten queue then fails at the call site rather than downstream as a
  confusing component assertion. Consequence the planner must honour: a test that only asserts a
  call happened must still queue something.

- **D-04:** One global `afterEach` in the `browser` project's setup file resets every registered
  stub. No test file calls reset itself and no file can forget. This follows Phase 02.2's D-04,
  which centralized the copy-pasted `document.body.innerHTML` cleanup the same way. No opt-out
  escape hatch is provided.

- **D-05:** `docs/adr/tech/0020-no-mocking-policy.md`'s Server Action alias carve-out is **amended
  in place**, not superseded by a new ADR. The amendment replaces the alias-register description
  with the transform and corrects the drift the spike found along the way: the carve-out documents
  four stub modules and four aliased specifiers where reality had twelve of each (Phases 02 and 03
  added eight without amending the record). The rest of tech/0020's no-mocking rule is unchanged
  and stays current.

#### Task and subtask write granularity

- **D-06:** **Per-item saves, following Phase 3's U-01.** Task title and description save together
  as one call on one entity. Each subtask add, rename, delete, and completion toggle is its own
  immediate mutation with its own rollback. The mock's `Edit Task` panel (PDF p7) puts all of it
  behind a single `Save Changes`; because each subtask carries its own `version`, that one button
  is N independently-failing calls — precisely the shape `03-UI-SPEC.md`'s U-01 examined for
  columns in `Edit Board` and rejected, with the same stated rationale. This is the second
  deliberate divergence from the mock in the same direction; the UI-SPEC must record it as U-01
  recorded the first. — **Reversibility:** costly — the modal's submit model and every subtask
  hook are built around it, and reverting reopens the partial-failure state U-01 rejected.

- **D-07:** `Add New Task` (PDF p6) still collects initial subtasks. Creation posts the task, then
  posts each subtask sequentially, keeping whatever succeeded on a partial failure. This is the
  client-orchestrated multi-child pattern ADR `docs/adr/domain/0003` locks and
  `create-board-columns-action.ts` already implements for a board's initial columns — the
  precedent, the partial-failure result shape, and the toast copy all exist. D-06 governs editing;
  creation is the one place a fan-out is sanctioned, because the children cannot exist before the
  parent does.

- **D-08:** Subtask completion toggle is **optimistic with rollback**, matching how column rename
  behaves under U-05. While a toggle write for a given subtask is in flight, further toggles on
  that subtask are ignored, so a stale `version` can never be sent. Accepted cost: a fast
  double-click drops the second toggle.

- **D-09:** Deleting a single subtask is **immediate and optimistic with a rollback toast — no
  confirm modal**, matching the bare `X` the mock shows on each subtask row. Deleting a *task*
  keeps the confirm modal, reusing the `delete-column-confirm` pattern, because it hard-cascades
  to its subtasks with no recovery (ADR `docs/adr/domain/0002`). The distinction is that a subtask
  destroys nothing beneath it.

#### Move paths and ordering

- **D-10:** **Both move paths ship.** Dragging a task between columns (TASK-04) and choosing a
  different column from the task detail view's `Current Status` dropdown (PDF p5) both call the
  same move mutation. The dropdown is a real write, not a read-only display of the current
  column, and it gives keyboard and screen-reader users a move path independent of drag mechanics.
  Both entry points need their own pending and rollback treatment.

- **D-11:** Dragging also **reorders tasks within a column**, sending the contract's optional
  `targetPosition` on `MoveTaskRequestDTO`. **Scope note, recorded deliberately:** no v1
  requirement covers within-column ordering and this phase's success criterion 4 names only
  "drag a task to a different column". This is a user-chosen extension made with that gap stated,
  not drift — planning and verification should treat it as intended scope and must not silently
  drop it as unrequirement-backed. — **Reversibility:** reversible — omitting `targetPosition`
  returns to cross-column-only behavior.

- **D-12:** On a stale-version rejection (SYNC-01) the optimistic change reverts, a conflict toast
  fires, **and the board is re-read**. The refresh is new relative to Phase 3, whose column
  reorder reverts and toasts only: a `CONFLICT` means the server holds something the screen does
  not, so reverting alone leaves the user looking at data known to be wrong. This applies to every
  task and subtask conflict, not only moves. Accepted cost: an extra read on a failure path, and
  the refresh can visibly reshuffle the board.

- **D-13:** A task card **opens the detail view** on click and `Enter`; a **separate drag handle**
  inside the card carries the drag. This is the same split Phase 3's D-06 forced on column headers
  and for the same reason — with `Space` and `Enter` both accepted as dnd-kit lift keys, a card
  that is simultaneously an `Enter`-activated button and a drag target makes `Enter` ambiguous
  between "lift" and "open". Consequence for the UI-SPEC: the mock's task card shows no handle, so
  the handle's placement and affordance are a design decision that document must make.

#### Feature-folder placement

- **D-14:** Tasks and subtasks get their own `src/features/tasks/` feature folder — actions,
  hooks, schemas, model, and components — rather than joining the existing `boards` feature
  alongside columns. — **Reversibility:** costly — every task/subtask import path and the
  boundaries policy change with it.

- **D-15 (revised 2026-08-28):** **No feature-to-feature boundary edge is added.** The original
  decision widened the `eslint-plugin-boundaries` policy with a single `boards -> tasks` edge. A
  rushmore entity-taxonomy run found that `CONVENTIONS.md`'s project-organization section already
  forecloses that route: it states a nested aggregate level cannot get its own feature folder until
  the shared schemas are promoted, and calls a feature-folder split an ADR-level change rather than
  a refactor. The reasoning it gives for columns applies verbatim to tasks, since `TaskFull` is
  declared inside `columnFullSchema` exactly as `ColumnFull` is declared inside `boardFullSchema`.
  The no-cross-feature-imports rule stays exception-free. — **Reversibility:** reversible — this
  keeps the existing policy rather than changing it.

- **D-16 (revised 2026-08-28):** The task and subtask zod schemas are **promoted to
  `src/lib/core/api-contract/`**, not moved into the tasks feature. This is the promotion rule ADR
  tech/0024 already states for a shape a second domain needs, and it is what makes D-14's tasks
  feature legal without any new boundary edge: both features import the shapes from the core ring,
  which the policy already allows. Consequence the planner must honour: `boardFullSchema` and
  `columnFullSchema` compose those shapes, so the promotion and the tasks feature must land
  together or the board-full read breaks. — **Reversibility:** costly — every consumer of
  `TaskFull`/`Subtask` moves with them.

- **D-17 (revised 2026-08-28):** `docs/adr/tech/0009-project-organization.md` needs **no
  amendment** — no exception to it is being added. The phase exercises ADR tech/0024's existing
  promotion rule instead, and `CONVENTIONS.md`'s project-organization section is updated to record
  that a tasks feature now exists and how its schemas got a legal home. D-05's in-place amendment
  of tech/0020 is unaffected and still stands.

### Claude's Discretion

- Where the drag context spanning columns and tasks lives, and empty-column drop behavior —
  follow the column-drag treatment `use-column-drag-sensors.ts` and `column-drag-model.ts`
  already establish.
- Drop-indicator and drag-preview visuals — follow the existing column-drag treatment and the
  `motion-reduce:` discipline `03-UI-SPEC.md` establishes.
- Toast copy for conflict and rollback branches — compose from the existing copy conventions in
  `use-rename-column.ts` / `use-reorder-columns.ts` status tables.
- Whether the transform matches on the `"use server"` directive alone or also on the `/actions/`
  path segment the prototype checks, and whether the plugin gets its own unit coverage.
- Naming and internal foldering inside `src/features/tasks/` — follow `CONVENTIONS.md`.
- Whether subtask rename is inline on the row or its own control — a UI-SPEC decision, subject
  only to D-06's per-item save rule. *(Answered by `04-UI-SPEC.md` S-03: inline on the row.)*

### Deferred Ideas (OUT OF SCOPE)

**Reviewed Todos (not folded):**

- **"Fold e2e seeding logic into a single service/module"** — reviewed and not folded, the same
  call Phase 3 made. This phase will add task and subtask seeding to `e2e/seed.ts`/`seed.sh`
  following the existing one-function-per-entity shape; the todo's actual open item is a `theme`
  field the account seeder does not return, which is unrelated to tasks.
- **"boards-create e2e intermittently 401s on seed.sh board-full when its signup session is
  evicted"** — reviewed and not folded. Real and adjacent, since more task e2e flows means more
  seeded accounts against the backend's two-session cap, but it is a seeding-infrastructure defect
  rather than task workflow. Revisit if task e2e coverage makes it reproduce more often.
- Matched by keyword only and unrelated to this phase: **"Sort Boards by createdAt once the
  backend supplies it"**, **"Trim boards schema unit tests that just retest zod"**, **"Container
  corner radii use rounded-lg where the mock wants ~6px"**, **"Sidebar + Create New Board is
  pinned to the panel bottom"**, **"Reopen local pre-commit gitleaks investigation"**. Left in the
  pending backlog.

**Out of this phase:**

- No new capabilities were raised during discussion. The one scope extension that came up
  (within-column task reordering) was accepted into this phase rather than deferred — see D-11.

### Folded Todos (IN scope, must be closed by this phase)

- `.planning/todos/pending/2026-08-26-storybook-dev-server-crashes-on-any-story-reaching-session-ts.md`
- `.planning/todos/pending/2026-08-24-dropdown-disabled-story-hangs-in-full-suite-runs.md`
- `.planning/todos/pending/2026-08-24-toast-harness-races-the-5s-auto-dismiss-under-load.md`

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **TASK-01** | User can create a task within a column (title, optional description) | Contract op `addTaskByColumnId` — **`POST /boards/{boardId}/columns/{columnId}`**, `SaveTaskRequestDTO` (`title` required, 3–32; `description` optional). Pitfall 1 (wrong path by analogy) and Pitfall 2 (undeclared path params) both bite here. Pattern: `create-column-action.ts` + `use-create-column.ts` (inline error, no toast). Fan-out for initial subtasks: `create-board-columns-action.ts` (D-07) |
| **TASK-02** | User can view a task's detail — title, description, subtasks checklist, current column | Pure read off the already-parsed `BoardFull` — no new fetch. `fetch-board-full.ts` already parses `taskFullSchema` incl. `subtasks`. Detail-view rhythm is fixed by `04-UI-SPEC.md` § "The detail view (TASK-02)" |
| **TASK-03** | User can edit a task's title and description | Op `updateById_2` — `PUT /boards/{boardId}/columns/{columnId}/tasks/{taskId}`, `UpdateTaskRequestDTO` (`version` required; **no title bounds declared** — client must re-enforce 3–32, Pitfall 4). Pattern: `rename-column-action.ts` + `use-rename-column.ts` optimistic override |
| **TASK-04** | User can move a task between columns via drag-and-drop, applied optimistically and reconciled | Op `moveToColumn` — **`PATCH /tasks/{taskId}/move`** (root-level, no board/column scoping). Optimistic mechanism: `use-reorder-columns.ts`'s `ColumnOrderOverride` + `applyColumnOrderOverride` pure-derivation retirement is the exact analogue. dnd-kit multi-container is the new work (Pattern 4, Pitfalls 6–9) |
| **TASK-05** | User can delete a task (cascades to its subtasks) | Op `deleteById_2` — `DELETE .../tasks/{taskId}`. Pattern: `delete-column-action.ts` + `use-delete-column.ts` (deliberately **not** optimistic) + `delete-column-confirm.tsx` |
| **SUBTASK-01** | User can add a subtask to a task | Op `addSubtaskByTaskId` — `POST /boards/{boardId}/columns/{columnId}/tasks/{taskId}/subtasks`, `SaveSubtaskRequestDTO` (`title`, `minLength: 1`, no max) |
| **SUBTASK-02** | User can toggle a subtask's completion state, independent of the task's column | Op `updateById_3` — `PUT .../subtasks/{subtaskId}`, `UpdateSubtaskRequestDTO` (`version` required, carries `isCompleted`). **Same endpoint as SUBTASK-03** — see Open Question 3 |
| SUBTASK-03 | User can edit a subtask's title | Same op as SUBTASK-02 (`updateById_3`, `title` field) |
| SUBTASK-04 | User can delete a subtask | Op `deleteById_3` — `DELETE .../subtasks/{subtaskId}` |
| SYNC-01 | Error + revert on version conflict | `RESULT_STATUS.CONFLICT` and `map-problem-code.ts`'s `OPTIMISTIC_LOCK_CONFLICT → CONFLICT` already exist and were built for this. D-12 adds the board re-read — see Pattern 6 |
| *(tooling, no req id)* | Delete all `*-action-storybook-stub.ts` + `serverActionStubAlias` | Sections "The stub-transform tooling" and Pitfalls 10–13 |

</phase_requirements>

---

## Summary

This phase has two almost-independent halves that share only a sequencing constraint. The **tooling
half** (D-01…D-05) replaces twelve hand-written Server Action stub modules and a twelve-entry Vite
alias register with one `"use server"` transform plugin plus one generic recorder. The spike already
proved the mechanism works against a real action; what is left is a *test-rewrite* problem, and it is
larger than the spike's headline "104 failing assertions" implies — the stub modules also export
`queue*`/`hold*`/`settle*`/`reset*`/`*ActionCalls` symbols that the four affected test files import
**25 times across ~30 import lines**, none of which survive the deletion. The rewrite is
mechanical but total for those four files.

Two design details in the locked decisions do not survive contact with the existing code and need the
planner's attention before a plan is written. First, **D-03's "throws" does not currently produce a
loud failure**: every hook in this repo wraps `mutateAsync` in `.catch(() => ({ status: ERROR }))`
(`use-rename-column.ts:88`, `use-reorder-columns.ts:98`, `use-delete-column.ts:51`,
`use-create-column.ts:59`), so a recorder throw is swallowed into a generic `ERROR` branch and
surfaces as exactly the "confusing component assertion" D-03 exists to prevent. The fix is to record
the unqueued call and assert on it in D-04's global `afterEach`, not to throw from the recorder.
Second, **D-14 and D-15 are in direct mechanical conflict** for anything the board renders: I
reproduced the `boundaries/dependencies` error in both directions this session, and D-16's schema
promotion only legalises the *type* import — a `TaskCard` living in `src/features/tasks/components/`
still cannot be rendered by `sortable-column.tsx` in `src/features/boards/`. Three legal routes exist
and are enumerated in Open Question 1; all three cost more than the decision text assumes.

The **feature half** has an unusually complete set of precedents: every mechanism it needs
(optimistic override with pure-derivation retirement, per-status toast tables, wait-for-server
destructive delete, client-orchestrated sequential fan-out, drag sensors with a custom keyboard
narrowing, `CONFLICT` as a first-class result branch) already ships for boards and columns. The
genuinely new engineering is dnd-kit's **multi-container** shape — moving an item between two
`SortableContext`s, with empty columns as real drop targets — on the *classic* `@dnd-kit/core@6.3.1`
+ `@dnd-kit/sortable@10.0.0` line that ADR tech/0003 pins. dndkit.com and Context7 now document the
**incompatible** `@dnd-kit/react` rewrite (its own migration page says "`SortableContext` is no
longer needed"), so every example fetched from there is wrong for this repo.

Finally, the REST contract carries three traps that a plan written by analogy to columns will walk
straight into: task creation POSTs to the **column** path with no `/tasks` segment; every task and
subtask operation declares only its own leaf path parameter, omitting up to three ancestors that the
URL template still needs; and `TaskResponseDTO` carries no `subtasks` array, so a mutation response
cannot be parsed with `taskFullSchema`.

**Primary recommendation:** sequence the phase as **(W0) stub transform + test rewrite → (W1) schema
promotion + boundary resolution + backend probe → (W2) task CRUD → (W3) subtasks → (W4) drag/move +
SYNC-01**, and settle Open Question 1 (the D-14/D-15 boundary conflict) with the user *before* W1,
because it decides where every file in W2–W4 lives.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Task/subtask reads | Frontend Server (RSC) | — | `fetch-board-full.ts` already returns the whole hierarchy; ADR tech/0019 makes every read an RSC. This phase adds **no** read path |
| Task/subtask writes | Frontend Server (Server Action) | API / Backend | ADR tech/0019 + 02.1-CONTEXT D-02: every write is a `"use server"` action; Route Handlers are banned. `userId` comes only from `verifySession()`, never the argument |
| Optimistic apply + rollback | Browser / Client | — | Local `useState` override + pure derivation (`applyColumnOrderOverride` is the model). **No query cache** — reads are RSC props, so there is nothing to patch |
| Version conflict detection | API / Backend | Frontend Server | Backend raises `OPTIMISTIC_LOCK_CONFLICT`; `map-problem-code.ts` translates it to `RESULT_STATUS.CONFLICT` inside the action |
| Board re-read after conflict (D-12) | Frontend Server | — | `refresh()` from `next/cache`, called **inside the action** on the `CONFLICT` branch — see Pattern 6. Not `router.refresh()` in the hook |
| Drag mechanics + keyboard move | Browser / Client | — | `@dnd-kit` sensors, collision detection and announcements are client-only; `column-drag-model.ts` exists specifically to keep dnd-kit value imports out of the server graph |
| Task ordering | Frontend Server (RSC read) | — | `fetch-board-full.ts` is the single ordering site (`sortColumnsByPosition`). D-11 requires tasks sorted there too — **currently they are not** |
| Input validation | Frontend Server | Browser (form) | `.safeParse` at the action boundary (ADR tech/0024) is the real defence; RHF+zodResolver in the modal is UX only |
| Test doubling of actions | Build tooling (Vite) | — | The transform runs in the `browser` and `storybook` Vitest projects and Storybook's own dev server; production and `tsc` see the real module |

---

## Project Constraints (from CLAUDE.md)

Directives extracted from `./CLAUDE.md`. The planner must not produce a plan that contradicts these.

| Directive | Consequence for this phase |
|-----------|----------------------------|
| **Push to `origin` after each logical unit of work**; `git push` fast-forward only, never force | Per-plan pushes; surface a non-fast-forward instead of forcing |
| **Debug UI behaviour through the running dev server with Playwright MCP**, never throwaway Node/JS DOM scripts | Every drag/optimistic/rollback check is driven through the real app, not a scratch script |
| **Headless only.** Confirm the resolved MCP tool names start with `mcp__playwright__`; if only `mcp__plugin_playwright_playwright__*` resolves, this project's headless server isn't loaded — do **not** fall back to it | A `checkpoint:human-verify` task that drives the browser must state which server it used |
| **Verify before presenting.** A `checkpoint:human-verify`, a verifier's `human_needed`, or a review item marked fixed is unverified until *you* clicked through the app | Plans must budget an agent-driven verification pass before every human checkpoint |
| **Compare against the mock, not only the running app.** `docs/kanban-task-management-web-app.pdf` (gitignored, 115MB, over the Read tool's PDF limit) — render with `pdftoppm -f N -l N -r <dpi> -png` and read the PNG. Open the mock for **every** surface in a screenshot you present | Task card, detail view, Add/Edit Task, delete confirm — p4/p5/p6/p7/p11/p15 all get opened, not just the surface that changed |
| Measure at 600 DPI ÷ 6.25 for CSS px *(per CLAUDE.md)* — **but** `04-UI-SPEC.md` C-01 records that this divisor over-reads by 1.333× and pins the pt calibration instead | Use the UI-SPEC's pt calibration; do not "correct" its numbers with ÷6.25. (Project memory also records the ÷6.25 rule as wrong.) |
| **When mock and UI-SPEC disagree, surface the conflict** rather than silently following either | `04-UI-SPEC.md` already surfaces C-01…C-08; any *new* disagreement is escalated, not resolved unilaterally |
| **CI green is the sign-off.** `gh run list --limit 1 --json databaseId --jq '.[0].databaseId'` then `gh run watch <id> --exit-status`. A red job blocks; a queued job means "not yet" | No plan is "done" on local green |
| **Local visual green proves nothing** — `playwright.config.ts:86` sets `ignoreSnapshots: !process.env.CI`. Prefix `CI=1` to compare baselines locally | The new `Textarea` primitive's baseline must be verified with `CI=1 pnpm test:visual` |
| **Copy `.env.local` into every worktree** before anything needing local env; never `cat`/`grep`/`git add` it | `use_worktrees: true` is set in `.planning/config.json`, so **every** dispatched plan needs the copy step |

---

## Standard Stack

**This phase adds no new runtime or dev dependency.** Everything it needs is already installed and
pinned. The table below is the *verified installed* set this phase composes against.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.3.0 | Server Actions, `refresh()` from `next/cache`, RSC reads | ADR tech/0019 — RSC-or-Server-Action, Route Handlers banned |
| `react` / `react-dom` | 19.2.8 | — | — |
| `@dnd-kit/core` | 6.3.1 | `DndContext`, `DragOverlay`, `useDroppable`, sensors, `closestCorners`/`pointerWithin`/`rectIntersection` | ADR tech/0003 pins **this** line, not `@dnd-kit/react` |
| `@dnd-kit/sortable` | 10.0.0 | `SortableContext`, `useSortable`, `arrayMove`, `verticalListSortingStrategy` | same ADR |
| `@dnd-kit/utilities` | 3.2.2 | `CSS.Transform`, `subtract`, `isKeyboardEvent` | used by `use-column-drag-sensors.ts` |
| `@tanstack/react-query` | 5.101.4 | `useMutation` wrapper around each action | 02.1-CONTEXT D-02 — mutation wrapper where optimistic rollback is needed |
| `zod` | 4.4.3 | `.safeParse` at every boundary | ADR tech/0024 |
| `@base-ui/react` | 1.7.0 | `Field`/`Checkbox`/`Select`/`Dialog`/`Menu`/`Toast` under `src/components/ui/` | Phase 1 |
| `react-hook-form` + `@hookform/resolvers` | 7.85.0 / 5.7.1 | `useForm`, `useFieldArray` for the subtask draft rows | `add-board-modal.tsx:63` is the field-array precedent |
| `lucide-react` | 1.31.0 | `GripVertical` (new glyph), `EllipsisVertical`, `X`, `Check` | UI-SPEC § Design System |
| `openapi-fetch` | 0.17.0 | `externalApi.POST/PUT/PATCH/DELETE` | ADR tech/0005 |

### Supporting (tooling half)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `typescript` | 6.0.3 | The plugin's AST reader (`ts.createSourceFile`, `ts.isVariableStatement`, `ts.SyntaxKind.ExportKeyword`) | Already a direct devDependency — **verified working against `create-column-action.ts` this session**, returning exactly `['createColumnAction']` and dropping the exported `type` |
| `vitest` / `@vitest/browser` | 4.1.10 | `projects[]`, per-project `plugins` | The `browser` and `storybook` projects both need the plugin |
| `@storybook/nextjs-vite` | 10.5.7 | Storybook framework | Ships **no** `"use server"` transform — spike-verified, so tech/0020's unwind trigger has not fired |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| The Vite transform | Keep the twelve stub modules, add seven more | ~600 lines of duplicated skeleton and a 19-entry register; rejected by D-01 and the roadmap |
| The Vite transform | Per-action success-factory map (spike option 1) | Explicitly rejected by D-02 — it *is* a per-action register |
| `@dnd-kit/core`+`sortable` | `@dnd-kit/react` (the rewrite) | ADR tech/0003's unwind trigger is `@dnd-kit/react` reaching 1.0; it is at 0.1.x. **Do not migrate in this phase** |
| One `DndContext` for columns+tasks | Nested `DndContext`s | dnd-kit's classic line supports nesting but sensor/event routing between them is the documented sharp edge; the official multi-container example uses one context |
| `refresh()` in the action on CONFLICT | `useRouter().refresh()` in the hook | The hook route pulls `next/navigation` into four more test files, each needing the `vi.mock` shim from tech/0020's carve-out register. Server-side `refresh()` needs neither |

**Installation:** none. `pnpm install` unchanged.

---

## Package Legitimacy Audit

**No external package is added by this phase**, so the registry-verification gate has nothing to
check. Verified 2026-08-28 by reading `package.json` and by `04-UI-SPEC.md` § Registry Safety
("This phase adds **no new runtime dependency**"). Every module named in the Standard Stack is an
already-installed, already-locked dependency of this repository.

| Package | Registry | Disposition |
|---------|----------|-------------|
| *(none added)* | — | **N/A — no install step in this phase** |

**Packages removed due to `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** none.

If a plan introduces a package anyway (e.g. `@dnd-kit/modifiers`), it must run
`gsd-tools query package-legitimacy check --ecosystem npm <pkg>` first and gate the install behind a
`checkpoint:human-verify`. Note `03-SPIKE-DNDKIT.md` Open Question 4 already concluded
`@dnd-kit/modifiers` is **NOT NEEDED** and should not be added on the strength of that finding.

---

## Architecture Patterns

### System Architecture Diagram

```
                          ┌──────────────────────── BROWSER ────────────────────────┐
  user gesture            │                                                          │
  ──drag handle──────────▶│  DndContext (one, board-scoped)                          │
  ──Current Status───┐    │    ├─ SortableContext[columns]  horizontalListSorting    │
  ──card click──┐    │    │    └─ per column: SortableContext[tasks] verticalListSorting
                │    │    │         └─ useDroppable(column body)  ← empty-column target│
                │    │    │                                                            │
                │    │    │   onDragOver ──▶ local cross-column preview state           │
                │    │    │   onDragEnd  ──▶ ONE completed move                         │
                ▼    ▼    │                        │                                    │
        TaskDetailModal   │                        ▼                                    │
        Add/EditTaskModal │      useMoveTask / useCreateTask / useUpdateTask /           │
                │         │      useDeleteTask / useAddSubtask / useUpdateSubtask /      │
                │         │      useDeleteSubtask   (TanStack useMutation, retry:false)  │
                │         │            │                                                │
                │         │            ├── optimistic override → useState (pure-derived  │
                │         │            │    retirement, never a query cache)             │
                │         │            └── failure → setOverride(null) + toast.add(...)  │
                └─────────┼────────────┤                                                 │
                          └────────────┼─────────────────────────────────────────────────┘
                                       │  "use server" call  (transformed to a recorder
                                       │   in the browser/storybook Vitest projects only)
                        ┌──────────────▼──────────────── NEXT SERVER ─────────────────┐
                        │  <verb>-<noun>-action.ts                                     │
                        │    1. verifySession()   → UNAUTHENTICATED                    │
                        │    2. schema.safeParse  → INVALID + fieldErrors              │
                        │    3. externalApi.<M>(EXTERNAL_PATH.X, {path, query:{userId  │
                        │       from the session record ONLY}, body})                  │
                        │    4. error → mapProblemCodeToStatus(parseProblemDetail(e))  │
                        │         └─ CONFLICT ⇒ refresh() THEN return (D-12)           │
                        │    5. ok → <entity>Schema.safeParse(data) → ERROR on failure │
                        │    6. refresh()  ← retires the optimistic override           │
                        └──────────────┬──────────────────────────────────────────────┘
                                       │  openapi-fetch (typed, generated-types.ts)
                        ┌──────────────▼──────────────── BACKEND (fixed) ─────────────┐
                        │  POST   /boards/{b}/columns/{c}          addTaskByColumnId  │
                        │  PUT    /boards/{b}/columns/{c}/tasks/{t}        updateById_2│
                        │  DELETE /boards/{b}/columns/{c}/tasks/{t}        deleteById_2│
                        │  PATCH  /tasks/{t}/move                          moveToColumn│
                        │  POST   /boards/{b}/columns/{c}/tasks/{t}/subtasks           │
                        │  PUT    .../subtasks/{s}          updateById_3  (title+done) │
                        │  DELETE .../subtasks/{s}          deleteById_3               │
                        └──────────────┬──────────────────────────────────────────────┘
                                       │ refresh() re-runs the RSC read
                        ┌──────────────▼──────────────────────────────────────────────┐
                        │  fetch-board-full.ts  (cache()'d, server-only)               │
                        │   boardFullSchema.safeParse → sortColumnsByPosition(...)     │
                        │   ⚠ tasks are NOT sorted today — D-11 requires adding it here│
                        └─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| File (new or changed) | Responsibility |
|------------------------|----------------|
| `scripts/vite-plugin-server-action-stub.mjs` | **new** — `enforce: "pre"` `transform` hook; detects `"use server"`, reads exported arrow-fn names off the TS AST, emits a recorder module |
| `src/test-utils/action-stub-registry.ts` | **new** — the one generic programmable recorder (`calls`/`queue`/`hold`/`settle`/`reset`) |
| `vitest.config.ts` | **changed** — `serverActionStubAlias` deleted; `plugins: [serverActionStubPlugin({ rootDir })]` added to the **`browser` and `storybook`** projects; `resolve: { alias }` returns to the plain list |
| `vitest.setup.ts` | **changed** — D-04's global stub reset joins the existing centralized cleanup `afterEach` |
| `.storybook/main.ts` | **changed** — needs `viteFinal` adding the same plugin; this is what closes the folded `pnpm storybook` crash todo (see Pattern 3) |
| `src/test-utils/*-action-storybook-stub.ts` (×12) + `index.ts` | **deleted** — `index.ts` has **zero importers today** (verified: `grep -rn 'from "@/test-utils"' src app e2e .storybook` returns nothing) |
| `src/lib/core/api-contract/task-schemas.ts` *(name is the planner's call)* | **new** — `subtaskSchema`, `taskFullSchema`, plus a `taskSchema = taskFullSchema.omit({ subtasks: true })` for mutation responses (D-16) |
| `src/features/boards/schemas.ts` | **changed** — re-imports the promoted shapes to compose `columnFullSchema`/`boardFullSchema` |
| `src/features/boards/server/fetch-board-full.ts` | **changed** — sort each column's `tasks` by `position` at the one ordering site (D-11) |
| `src/features/tasks/actions/*.ts` | **new** — `create-task-action`, `update-task-action`, `delete-task-action`, `move-task-action`, `create-subtask-action`, `update-subtask-action`, `delete-subtask-action` (verb set verified in `scripts/check-action-verbs.mjs:22`) |
| `src/features/tasks/hooks/*.ts` | **new** — one per mutation, each owning its optimistic override + per-status toast table |
| `src/features/tasks/model.ts` | **new** — pure task/subtask derivations; `toSubtaskSummary` moves here or to core with the schemas |
| `src/features/tasks/task-drag-model.ts` | **new** — the dnd-kit-importing half, split out for the exact reason `column-drag-model.ts` was (Pitfall 14) |
| `src/components/ui/textarea/` | **new primitive** — `Textarea`, mirroring `text-field.tsx`'s anatomy, `min-h-28`; needs a story, a browser test, an axe pass, **and** a Playwright visual baseline (ADR tech/0011 scopes visual regression to `components/ui/`) |
| `src/features/boards/components/sortable-column/sortable-column.tsx` | **changed** — the inert `<li>` at lines 94–105 becomes the interactive card; `<ul className="flex flex-col gap-4">` at **line 91** becomes `gap-5` (S-07) |
| `tokens/typography.tokens.json` + `tokens/style-dictionary.build.test.ts` | **changed** — `heading-m` (15/700/19), asserted in both themes |
| `e2e/seed.sh` + `e2e/seed.ts` | **changed** — `cmd_task` / `cmd_subtask` following the existing one-function-per-entity shape |
| `scripts/probe-task-backend.mjs` + `04-BACKEND-FACTS.md` | **new** — the established per-phase pattern (`probe-board-backend.mjs`, `probe-column-backend.mjs`, `02-/03-BACKEND-FACTS.md`) |

### Pattern 1 — The stub transform, with a typed control surface

The spike's registry keys a stub by a `(moduleKey, exportName)` **string pair**, which every test file
must then spell correctly and which carries no type information. There is a strictly better shape
available for free, and it is *not* a per-action register (so D-02 is untouched):

`tsc` never sees the transform — it typechecks the **real** action module. So a test that imports the
action gets its true signature, and a generic helper can derive everything from it.

```ts
// src/test-utils/action-stub-registry.ts  (recommended shape)
type ServerAction = (...args: never[]) => Promise<unknown>;

export type Stub<A extends ServerAction> = {
    readonly calls: Parameters<A>[0][];
    queue: (outcome: Awaited<ReturnType<A>>) => void;
    hold: () => void;
    settle: () => void;
};

/*
 * The plugin emits `export const createColumnAction = registerActionStub(key, name)`, and
 * `registerActionStub` attaches the control surface onto the returned function itself. `actionStub`
 * is then a typed lookup off the imported binding — no module-key string in any test file.
 */
export const actionStub = <A extends ServerAction>(action: A): Stub<A> => { /* … */ };
```

Test usage, which is what the four rewritten files become:

```ts
import { createColumnAction } from "@/features/boards/actions/create-column-action";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { actionStub } from "@/test-utils/action-stub-registry";

const createColumn = actionStub(createColumnAction);

createColumn.queue({ status: RESULT_STATUS.SUCCESS, column: { id: "c1", name: "Backlog", version: 0, position: 0 } });
// -> `queue` is typed to CreateColumnResult; a wrong shape fails `tsc`, not at runtime
expect(createColumn.calls).toEqual([{ boardId: "b1", name: "Backlog" }]);
```

**Why this matters for D-02.** Giving up the "unqueued means success" default also gives up the
`queueCreateColumnFailure(status: CreateColumnFailureStatus)` compile-time narrowing the twelve stub
modules provided. Deriving the types from the real action's own signature restores it *without*
declaring anything per action — the type parameter is inferred at the call site. Verified feasible:
`src/features/boards/actions/create-column-action.ts:19` exports `CreateColumnResult` and
`:32` exports the action, and `tsc` resolves both through the real specifier.

### Pattern 2 — D-03 must fail in `afterEach`, not by throwing

`use-rename-column.ts:88`, `use-reorder-columns.ts:98`, `use-delete-column.ts:51` and
`use-create-column.ts:59` all read:

```ts
const result = await mutation.mutateAsync({ … }).catch(() => ({ status: RESULT_STATUS.ERROR }) as const);
```

A throw from the recorder — synchronous or async — is caught by TanStack Query, rejected out of
`mutateAsync`, and then swallowed by that `.catch`, producing a generic failure toast. The test then
fails on a toast assertion with no mention of the missing queue: **exactly the outcome D-03's
rationale rejects.** D-03's *intent* is right; its stated mechanism is not.

Recommended mechanism, which composes with D-04 rather than fighting it:

```ts
// action-stub-registry.ts
const unqueuedCalls: string[] = [];

// inside the recorder, when the queue is empty:
unqueuedCalls.push(`${moduleKey}#${exportName}`);
return Promise.resolve(undefined);

export const assertNoUnqueuedActionCalls = (): void => {
    if (unqueuedCalls.length === 0) return;
    const seen = [...unqueuedCalls];
    unqueuedCalls.length = 0;
    throw new Error(
        `Server Action stub called with no queued outcome: ${seen.join(", ")}. ` +
        `Queue an outcome with actionStub(<action>).queue({ … }) before the call.`,
    );
};
```

`vitest.setup.ts`'s existing `afterEach` calls `resetAllActionStubs()` and then
`assertNoUnqueuedActionCalls()`. The failure names the module and export, is deterministic (no
unhandled-rejection timing), and cannot be swallowed by a hook.

### Pattern 3 — Where the transform must be wired (three places, not one)

| Consumer | Today | After |
|----------|-------|-------|
| `browser` Vitest project | `resolve: { alias: [...serverActionStubAlias, ...alias] }` | `plugins: [serverActionStubPlugin({ rootDir })]`, `resolve: { alias }` |
| `storybook` Vitest project | same alias list, plus `storybookTest()` | same plugin, ordered `enforce: "pre"` so it runs before `@storybook/nextjs-vite`'s own transforms |
| **Storybook's own dev server** (`.storybook/main.ts`) | **nothing** — no `viteFinal`, no alias | `viteFinal` adding the same plugin |

The third row is the root cause of the folded todo *"`pnpm storybook`'s manual dev server crashes any
story whose import chain reaches `src/lib/server/session.ts`"*. `.storybook/main.ts` (read this
session — 19 lines, no `viteFinal`) never received `serverActionStubAlias`, which is why the
`storybook` **Vitest** project works while the manual dev server does not. Wiring the plugin there
closes the todo as a side effect rather than as separate work.

Vite's documented plugin order is: alias plugins → user `enforce: 'pre'` → Vite core → normal user
plugins → build plugins → `enforce: 'post'`. `enforce: "pre"` therefore sees raw TS source, which is
what the AST reader needs. [CITED: vitejs/vite `docs/guide/api-plugin.md` — "Plugin Ordering"]

### Pattern 4 — dnd-kit multi-container, classic line

**Shape (one `DndContext`, N+1 `SortableContext`s):**

```
DndContext (existing, id={`board-columns-${board.id}`})
├─ SortableContext items={columnIds} strategy={horizontalListSortingStrategy}   ← existing
└─ per column:
   ├─ useDroppable({ id: `column-${column.id}` })  ← the column BODY, so an empty column is a target
   └─ SortableContext items={taskIds} strategy={verticalListSortingStrategy}
```

**Verified available in the installed packages** (enumerated from `@dnd-kit/core@6.3.1` and
`@dnd-kit/sortable@10.0.0` at runtime this session): `SortableContext`, `useSortable`, `arrayMove`,
`verticalListSortingStrategy`, `horizontalListSortingStrategy`, `useDroppable`, `closestCorners`,
`pointerWithin`, `rectIntersection`, `getFirstCollision`, `useDndMonitor`, `MeasuringStrategy`.

**The four decisions the planner must make explicit:**

1. **Discriminating column drags from task drags.** `useSortable({ id, data: { type: "task", columnId } })`
   and `data: { type: "column" }`, read in `onDragStart`/`onDragOver`/`onDragEnd` via
   `active.data.current?.type`. `hasSortableData()` from `@dnd-kit/sortable` is the typed guard.
   Without this, `handleDragEnd`'s existing `renderedColumns.findIndex((c) => c.id === active.id)`
   returns `-1` for a task and silently no-ops (`board-view.tsx:168-173`).
2. **Collision detection.** `closestCenter` (currently `board-view.tsx:204`) is the documented wrong
   choice for multi-container: it compares centres, so a tall column's centre beats a nearby card's.
   The official classic pattern is a custom strategy — `pointerWithin` first, falling back to
   `rectIntersection`, then narrowing to the hovered container's own items — or `closestCorners` as
   the cheaper approximation.
3. **`onDragOver` cross-column preview.** In the classic line, moving an item between containers
   mid-drag requires mutating local state in `onDragOver`; without it the card visually stays in its
   source column until drop. Keep the *request* in `onDragEnd` (one request per completed move,
   T-03-12) — `onDragOver` state is preview only.
4. **Empty column.** A column with zero tasks has a zero-height `<ul>` and is unreachable by pointer.
   `04-UI-SPEC.md` prescribes an 88px minimum drop-target height and flags this as
   *"the likeliest regression in this phase"*.

### Pattern 5 — Optimistic override with pure-derivation retirement (copy this, do not invent)

`use-reorder-columns.ts` + `model.ts`'s `applyColumnOrderOverride` is the exact template for
`useMoveTask`. Its two load-bearing properties:

- The override records `previousOrder` = the **server's** order, not the rendered one. When the
  refreshed RSC props no longer match `previousOrder`, the helper returns the props array *itself*,
  so **reference equality is the retirement signal** and nothing ever has to clear state.
- Rollback is `setOverride(null)` — a single call restores the *whole* board's order, because the raw
  props still carry it.

The task analogue needs a `TaskMoveOverride` carrying `{ taskId, previousColumnId, previousIndex,
targetColumnId, targetIndex }` and a `previousOrder`-equivalent staleness guard per affected column.
`model.ts`'s purity rule (`CONVENTIONS.md`) means the whole derivation is unit-testable in the `unit`
project with no render.

### Pattern 6 — SYNC-01 / D-12's board re-read

`refresh()` is imported from `next/cache` in Next 16 (`reorder-column-action.ts:3` — not
`revalidatePath`). Today it is called **only** on the success path. D-12 requires a re-read on
`CONFLICT`, so each task/subtask action grows one branch:

```ts
const upstreamError: unknown = error;
if (upstreamError !== undefined) {
    const status = mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code);

    /*
     * D-12: a CONFLICT means the server holds something this screen does not, so the revert alone
     * would leave the user looking at data known to be wrong. The re-read belongs here, not in the
     * hook — docs/adr/tech/0019 keeps refresh() inside the action.
     */
    if (status === RESULT_STATUS.CONFLICT) {
        refresh();
    }

    return { status };
}
```

Doing it here rather than in the hook avoids pulling `next/navigation`'s `useRouter().refresh()` into
four more browser test files, each of which would then need the `vi.mock` shim tech/0020's carve-out
register tracks. It also keeps every `refresh()` call site inside an action, which is the invariant
`reorder-column-action.ts:92-95` documents.

Toast copy is already decided: `04-UI-SPEC.md` C-08 changes only the *description* to
**"Refreshing to show the latest."** for task/subtask conflicts; the title stays Phase 3's
**"This board changed somewhere else."**, and Phase 3's column strings are **not** retro-edited.

### Pattern 7 — Anti-patterns to avoid

- **A `vi.mock` of anything this project owns.** Blocked by `no-restricted-properties` at `"error"`.
  The transform is a build-time alias, a different mechanism (tech/0020's carve-out).
- **A barrel `index.ts` under `features/tasks/`** — CONVENTIONS bans it for `actions/` explicitly, and
  `fetch-board-full.ts:12-16` records why `server/` has none.
- **Sorting tasks in a component.** The ordering site is the read (`fetch-board-full.ts`).
- **A `<div onClick>` wrapping a subtask checkbox** — the row must be the label's click target
  through Base UI's `Field.Label`/`peer` wiring (`04-UI-SPEC.md`, `checkbox-variants.ts:9`).
- **A second nested scroll container in the detail modal** — `Modal.Content`'s `max-h` clamp is the
  one scroll region; a nested one strands `Current Status` below an inner scrollbar.
- **A request per keyboard arrow step.** One `PATCH` per *completed* move; intermediate steps are
  local (T-03-12, and `board-view.test.tsx` already asserts this for columns).
- **`toggle` as an action verb.** Not in the closed set (`scripts/check-action-verbs.mjs:22`).
- **Re-measuring the mock at 600 DPI ÷ 6.25** and "correcting" the UI-SPEC's numbers (C-01).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-action test doubles | A 13th…19th `*-action-storybook-stub.ts` | The D-01 transform + one generic recorder | ~600 lines of identical skeleton; this is the phase's own tooling scope |
| Typed queue helpers per action | A `queueMoveTaskFailure(status)` per action | `actionStub<typeof moveTaskAction>()` inferring from the real signature | A per-action typed helper is a per-action register by another name (D-02) |
| Stub reset | `beforeEach(resetXStub)` in each file | D-04's single global `afterEach` | Phase 02.2's D-04 precedent; no file can forget |
| Upstream error → user-facing branch | A per-action `switch` on HTTP status | `parseProblemDetail` + `mapProblemCodeToStatus` (`map-problem-code.ts:29`) | Single declaration; create and rename cannot drift on what a 409 means |
| Conflict discriminant | A new `STALE_VERSION` status | `RESULT_STATUS.CONFLICT` (`result-status.ts:30`) | Already exists, already distinguished from `DUPLICATE`, and its comment names SYNC-01 as its consumer |
| Optimistic rollback bookkeeping | An effect that clears the override when props change | `applyColumnOrderOverride`-style pure derivation | Retirement by reference equality; nothing to clear, nothing to leak |
| Reordering an array | A hand-rolled `splice` pair | `arrayMove` from `@dnd-kit/sortable` (`column-drag-model.ts:25`) | Already the project's one reorder site |
| Multi-line description input | `TextField` with a taller `h-*` | The new `Textarea` primitive | `text-field.tsx:54` renders `Field.Control` as an `<input>` with a fixed height |
| Keyboard drag announcements | Rendering an `aria-live` region | `DndContext`'s `accessibility={{ announcements }}` | dnd-kit renders the region itself; `createColumnReorderAnnouncements` (`model.ts:173`) supplies only strings, and it is deliberately separate from the toast viewport |
| Confirm dialogs | A bespoke modal | `delete-column-confirm.tsx`'s exact shape | Both dismissal guards, `initialFocus` on the non-destructive button, `break-words` description |
| Subtask draft rows | Local array state | `useFieldArray` (`add-board-modal.tsx:63`) | The `fields`/`append`/`remove` shape is already the project's multi-row precedent |
| E2E fixtures | A TypeScript Playwright fixture helper | `e2e/seed.sh`'s curl CLI + `seed.ts` wrappers | ADR tech/0022; reuses the sign-up session against the two-session cap |
| Waiting for an optimistic write in e2e | `waitForTimeout` | `createServerActionSettled(page)` from `e2e/server-action.ts`, **created before the click** | CONVENTIONS records this decaying across two phases undetected |

**Key insight:** almost nothing in the feature half is new engineering. Six of the seven mutations are
a structural copy of an existing board/column action + hook pair. The two places where genuinely new
code is unavoidable are the dnd-kit multi-container shape and the `Textarea` primitive; everywhere
else, "which existing file is this a copy of?" should have an answer, and a plan task that cannot name
one is probably re-deriving something.

---

## Common Pitfalls

### Pitfall 1 — `addTaskByColumnId` does **not** post to `/tasks`

**What goes wrong:** a plan written by analogy to `addColumnByBoardId`
(`POST /boards/{boardId}/columns`) produces `POST /boards/{boardId}/columns/{columnId}/tasks` and
gets a 405, because that path is **GET-only**.
**The fact:** `addTaskByColumnId` is **`POST /boards/{boardId}/columns/{columnId}`** — the column
resource path itself, with no `/tasks` segment.
[VERIFIED: `docs/api/kanban-board-openapi.json`, enumerated with a script this session; also
`src/lib/core/api-contract/generated-types.ts:48` → `post: operations["addTaskByColumnId"]` under the
`/boards/{boardId}/columns/{columnId}` path entry.]
**How to avoid:** add `EXTERNAL_PATH.COLUMN_DETAIL` (already exists at `external-paths.ts:11`) as the
create-task target — the same literal the column *update* and *delete* already use — and say so in a
comment, because it reads like a mistake.
**Warning signs:** a 405, or `openapi-fetch` failing to type the call at all.

### Pitfall 2 — Every task/subtask op omits its ancestor path parameters

**What goes wrong:** `openapi-fetch`'s serializer **skips a missing path parameter rather than
throwing** — `reorder-column-action.ts:60-64` already carries a comment about exactly this
(T-03-21) for one missing parameter. For tasks it is worse:

| Operation | URL template needs | Contract declares | Missing |
|-----------|--------------------|--------------------|---------|
| `addTaskByColumnId` | `boardId`, `columnId` | `columnId` | **1** |
| `updateById_2` (task PUT) | `boardId`, `columnId`, `taskId` | `taskId` | **2** |
| `deleteById_2` (task DELETE) | `boardId`, `columnId`, `taskId` | `taskId` | **2** |
| `addSubtaskByTaskId` | `boardId`, `columnId`, `taskId` | `taskId` | **2** |
| `updateById_3` (subtask PUT) | `boardId`, `columnId`, `taskId`, `subtaskId` | `subtaskId` | **3** |
| `deleteById_3` (subtask DELETE) | `boardId`, `columnId`, `taskId`, `subtaskId` | `subtaskId` | **3** |
| `moveToColumn` | `taskId` | `taskId` | 0 |

[VERIFIED: declared-vs-template parameter comparison run against `docs/api/kanban-board-openapi.json`
this session, and against `generated-types.ts:576-584` (`addTaskByColumnId.parameters.path` contains
only `columnId`).]
**How to avoid:** write **every** segment into `params.path` explicitly, even the ones the generated
type does not require, and carry `reorder-column-action.ts`'s comment forward. A `04-BACKEND-FACTS`
probe should confirm the resulting URL is accepted.
**Warning signs:** a 404 on a request that "looks right", or a logged URL containing `//` or a literal
`{boardId}`.

### Pitfall 3 — `TaskResponseDTO` has no `subtasks` (and no `columnId`)

**What goes wrong:** parsing a create/update/move response with `taskFullSchema` fails on **every
successful call**, because the schema requires `subtasks: subtaskSchema.array()`
(`src/features/boards/schemas.ts:44`) and the DTO declares only `id`, `title`, `description`,
`version`, `position`.
[VERIFIED: `docs/api/kanban-board-openapi.json` → `TaskResponseDTO` = `{"type":"object","properties":
{"id","title","description","version","position"}}`, no `required` array, no `subtasks`.]
**How to avoid:** derive a mutation-response schema exactly as columns already do —
`export const taskSchema = taskFullSchema.omit({ subtasks: true })`, mirroring
`schemas.ts:70-74`'s `columnSchema = columnFullSchema.omit({ tasks: true })` and its comment. Note the
absent `columnId` too: a move response cannot tell you where the task landed, so the optimistic
override must carry the destination itself.
**Warning signs:** `RESULT_STATUS.ERROR` on a request the network tab shows returning 200.

### Pitfall 4 — `UpdateTaskRequestDTO` declares no title bounds

`SaveTaskRequestDTO.title` is `minLength: 3, maxLength: 32`; `UpdateTaskRequestDTO.title` has **no
bounds at all** and the DTO's only required field is `version`. A rename schema built from the update
DTO alone lets a title through that could never have been created.
[VERIFIED: both DTOs read from `docs/api/kanban-board-openapi.json` this session.]
`04-UI-SPEC.md`'s Copywriting Contract already calls this out and pins the message
**"Task title must be between 3 and 32 characters."** — mirror `columnNameSchema`'s
`.pipe(columnNameRowSchema)` split (`schemas.ts:126-140`) so a blank field gets `"Can't be empty"` and
an out-of-bounds one gets the length copy.

### Pitfall 5 — `moveToColumn` is a root-level path outside the `/boards/...` family

`PATCH /tasks/{taskId}/move` carries no board or column scoping — the only identifiers on the wire are
`taskId` (path), `userId` (query) and `targetColumnId` (body). Two consequences:
(a) `EXTERNAL_PATH` gains an entry that does not fit the existing `/boards/...` naming shape
(`external-paths.ts:6-17`); (b) **cross-board authorization is entirely the backend's**, so the
`04-BACKEND-FACTS` probe should include "does moving a task to a column on a *different* board, or on
someone else's board, get refused?" — the same question `02-BACKEND-FACTS.md` P7 asked for boards.

### Pitfall 6 — Context7 and dndkit.com document the wrong dnd-kit

**What goes wrong:** every `@dnd-kit` example fetched from dndkit.com (and therefore from Context7's
`/websites/dndkit`) targets the **`@dnd-kit/react` rewrite** — `DragDropProvider`,
`move()` from `@dnd-kit/helpers`, `useSortable({ group, type, accept })`, `CollisionPriority`. That
line's own migration page states *"`SortableContext` is no longer needed."* This repo uses the
**classic** `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0`, which ADR tech/0003 pins deliberately
with `@dnd-kit/react` reaching 1.0 as the unwind trigger (it is at 0.1.x).
[VERIFIED: Context7 `/websites/dndkit` returned only the rewrite's API this session; installed
exports enumerated from `node_modules` confirm the classic surface.]
**How to avoid:** treat the installed `.d.ts` and this repo's own `board-view.tsx` /
`sortable-column.tsx` / `use-column-drag-sensors.ts` as the reference. If external docs are needed,
the classic reference is `docs.dndkit.com` and the classic `MultipleContainers` story in the dnd-kit
repository — **not** dndkit.com.

### Pitfall 7 — `closestCenter` is the wrong collision strategy once containers nest

`board-view.tsx:204` sets `collisionDetection={closestCenter}`, correct for a single row of columns.
With per-column task lists, centre-distance makes a tall column's centre win over a nearby card, so
drops land in the wrong column near container edges. Change the strategy, but **keep the column-drag
behaviour identical** — `board-view.test.tsx` has 60 `it()` blocks asserting column reorder, and a
blanket strategy swap risks regressing them. Consider branching the strategy on
`active.data.current?.type`.

### Pitfall 8 — `ColumnKeyboardSensor` will also intercept task drags

`use-column-drag-sensors.ts:90-105` subclasses `KeyboardSensor` and narrows Left/Right steps by
measuring against `props.context.current.scrollableAncestors.at(0)`. If one `DndContext` serves both
drags, that sensor runs for task drags too — and a task's *first* scrollable ancestor is the column
body's own `overflow-y-auto` div (`sortable-column.tsx:80`), not the horizontal column row. The
visible-box computation then measures the wrong box.
**How to avoid:** guard the narrowing on the active item's `data.type`, or give tasks their own
sensor set. Either way the UI-SPEC makes the keyboard path **mandatory**, with `↑`/`↓` within a
column and `←`/`→` across columns, so this cannot be deferred.

### Pitfall 9 — An empty column is a zero-height drop target

`sortable-column.tsx:91` renders `<ul className="flex flex-col gap-4">` with no minimum height. A
column with no tasks has nothing to hit. `04-UI-SPEC.md` names this *"the likeliest regression in this
phase"* and prescribes an 88px minimum hit area with the 4px accent bar drawn inside it.

### Pitfall 10 — The stub rewrite is bigger than "104 assertions"

The twelve stub modules export far more than the action. The four affected files import **25 stub
symbols across ~30 import lines**, and the raw call-site counts are:

| File | `it()` blocks | `queue*Failure` | `holdNext*` | `reset*Stub` | `*ActionCalls` |
|------|---------------|-----------------|-------------|--------------|----------------|
| `board-view.test.tsx` | 60 | 10 | 12 | 4 | 29 |
| `board-list.test.tsx` | 36 | 13 | 4 | 4 | 12 |
| `sortable-column.test.tsx` | 11 | 2 | 3 | 1 | 4 |
| `rename-override-provider.test.tsx` | 4 | 1 | 3 | 1 | 2 |
| **total** | **111** | **26** | **22** | **10** | **47** |

[VERIFIED: `grep -c` per pattern against each file this session.] All four wrap their bodies in
`describeForEachDevice`, so 111 blocks ⇒ 222 tests; the spike's 104 failures therefore correspond to
roughly **52 unique `it()` blocks** that relied on the unqueued-success default. Every one of the 105
non-`it` call sites above also has to change, plus the 10 `reset*Stub()` calls that D-04 deletes.
**Plan for a whole-file rewrite of four files, not a 104-line patch.**

### Pitfall 11 — The transform drops exported types (harmless today, fragile tomorrow)

The spike's `readExportedFunctionNames` collects only exported `const` arrow functions, so the emitted
module has no `CreateColumnResult`/`ReorderColumnResult`/etc. export.
[VERIFIED: I ran the spike's AST reader against `create-column-action.ts` with the installed
`typescript@6.0.3` — it returned exactly `['createColumnAction']` and dropped the exported type.]
This is safe **today** because no consumer imports those types (verified: the only imports of any
action module are the twelve `import { xAction } from "@/features/…/actions/…"` lines in the hooks and
auth forms), and `import type` is erased before the transform matters. It becomes a silent breakage
the moment someone value-imports something else from an action file. Worth a comment in the plugin and
a line in the amended ADR.

### Pitfall 12 — `src/test-utils/index.ts` has zero importers

D-11's "thin barrel" is dead code: `grep -rn 'from "@/test-utils"' src app e2e .storybook` returns
nothing. Deleting it under D-01 is free, but the ADR tech/0020 amendment (D-05) should record that it
was never load-bearing rather than implying a migration happened.

### Pitfall 13 — Two documents describe the stub seam and both go stale

D-05 amends ADR tech/0020's carve-out. **`CONVENTIONS.md` also describes it**, in the "Where code
lives" table: *"An action without one is reached through its consuming component's browser test via
the `src/test-utils/*-action-storybook-stub.ts` seam."* That sentence names files this phase deletes.
There is no checker that gates prose against reality — which is exactly the 4-vs-12 drift the spike
found. Amend both, and consider whether `pnpm actions:check` should also assert that no
`*-action-storybook-stub.ts` exists (success criterion 8 asks for precisely that property).

### Pitfall 14 — A dnd-kit **value** import must never reach the server graph

`column-drag-model.ts:7-11` records the failure: dnd-kit calls `React.createContext` at module scope,
and `server-only` `fetch-board-full.ts` imports `model.ts`, so merging the two kills
`pnpm build` on `/boards/[boardId]`. Task drag needs the same split — a `task-drag-model.ts` for
anything importing `arrayMove`/`Announcements` **values**, separate from `model.ts`. (`Announcements`
as a `type` import is fine; `model.ts:1` already does it.)

### Pitfall 15 — Tasks are not ordered at the read today

`sortColumnsByPosition` (`model.ts:103-104`) sorts **columns only**; `fetch-board-full.ts:71-74` spreads
the parsed board and replaces `columns`, leaving each column's `tasks` in response order. D-11's
within-column ordering and `04-UI-SPEC.md`'s "ordered once at the read … no component sorts a task
list" both require adding that sort. `model.ts:99-102` already documents *why* response order carries
no guarantee — "only looked like one because every fixture is authored in creation order."

### Pitfall 16 — The `Checkbox` primitive gives strikethrough but not the specified colour

`checkbox.tsx:30` already ships `hasStrikethroughWhenChecked` with a comment naming "the Phase 4
subtask row" — but it applies only `peer-data-[checked]:line-through` to the label
(`checkbox.tsx:72`). `04-UI-SPEC.md` § "Completed-subtask treatment" requires
`text-text-primary/50 line-through`, sampled against the mock in both themes, and explicitly bars
substituting `text-text-muted`. The primitive's `className` prop targets the checkbox **box**, not the
label, so hitting the spec needs either a small `Checkbox` change or a row that supplies its own
label. Decide this deliberately; it is a `components/ui/` change with a visual baseline attached.

### Pitfall 17 — `04-UI-SPEC.md`'s `sortable-column.tsx` line references are slightly off

The UI-SPEC cites `sortable-column.tsx:89` for the `gap-4` card list and `:88-108` / `:91-107` for the
card. In the file as it stands: `<ul className="flex flex-col gap-4">` is **line 91**, the `<li>` spans
**94–105**, the title `<p>` is **98–100**, and `toSubtaskSummary` is on **103** (that one matches).
Use the file, not the citation.

### Pitfall 18 — Two of the three folded flakes are not in the `browser` project

Success criterion 8 requires *"the full `browser` Vitest project passes"*. The
`dropdown.stories.tsx > Disabled` ~405s hang is in the **`storybook`** project, and the toast
auto-dismiss race is in `toast.test.tsx` (`browser`). So criterion 8 is blocked by the toast flake but
not by the dropdown one — while `pnpm test` and CI are blocked by both. State which gate each plan is
being measured against, and use `--repeat-each=3 --workers=2` (the contention run CONVENTIONS names)
rather than a single green run.

---

## Code Examples

### The action skeleton every one of the seven mutations follows

```ts
"use server";
// Source: src/features/boards/actions/reorder-column-action.ts (verbatim structure)

import { refresh } from "next/cache";

import { EXTERNAL_PATH } from "@/lib/core/api-contract/external-paths";
import { mapProblemCodeToStatus } from "@/lib/core/api-contract/map-problem-code";
import { parseProblemDetail } from "@/lib/core/api-contract/problem-detail";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { zodErrorToFieldErrors } from "@/lib/core/api-contract/zod-field-errors";
import { verifySession } from "@/lib/server/dal";
import { externalApi } from "@/lib/server/server-client";

export type MoveTaskResult =
    | { status: typeof RESULT_STATUS.SUCCESS; task: Task }
    | { status: typeof RESULT_STATUS.UNAUTHENTICATED }
    | { status: typeof RESULT_STATUS.INVALID; fieldErrors: Record<string, string> }
    | { status: typeof RESULT_STATUS.CONFLICT }
    | { status: typeof RESULT_STATUS.NOT_FOUND }
    | { status: typeof RESULT_STATUS.ERROR };

export const moveTaskAction = async (input: MoveTaskInput): Promise<MoveTaskResult> => {
    const record = await verifySession();                    // 1. session FIRST
    if (!record) return { status: RESULT_STATUS.UNAUTHENTICATED };

    const parsed = moveTaskInputSchema.safeParse(input);     // 2. then parse (ADR tech/0024)
    if (!parsed.success) {
        return { status: RESULT_STATUS.INVALID, fieldErrors: zodErrorToFieldErrors(parsed.error) };
    }

    const { data, error } = await externalApi.PATCH(EXTERNAL_PATH.TASK_MOVE, {
        // Write EVERY template segment, including ones the generated type omits — Pitfall 2.
        params: { path: { taskId: parsed.data.taskId }, query: { userId: record.id } },
        body: {
            targetColumnId: parsed.data.targetColumnId,
            version: parsed.data.version,
            targetPosition: parsed.data.targetPosition,      // optional on the wire, always sent (D-11)
        },
    });

    const upstreamError: unknown = error;                    // widen: no error schema is declared
    if (upstreamError !== undefined) {
        const status = mapProblemCodeToStatus(parseProblemDetail(upstreamError)?.code);
        if (status === RESULT_STATUS.CONFLICT) refresh();    // D-12's re-read
        return { status };
    }

    // taskSchema, NOT taskFullSchema — the response carries no subtasks (Pitfall 3).
    const task = taskSchema.safeParse(data);
    if (!task.success) return { status: RESULT_STATUS.ERROR };

    refresh();                                               // retires the optimistic override
    return { status: RESULT_STATUS.SUCCESS, task: task.data };
};
```

### The optimistic hook skeleton

```ts
"use client";
// Source: src/features/boards/hooks/use-reorder-columns.ts (verbatim structure)

const GENERIC_MOVE_FAILURE = { title: "Couldn't move task.", description: "Try again." };

const MOVE_FAILURE_COPY: Partial<Record<ResultStatus, { title: string; description: string }>> = {
    // 04-UI-SPEC C-08: title matches Phase 3's exactly; only the description changes, because D-12
    // performs the re-read itself.
    [RESULT_STATUS.CONFLICT]: {
        title: "This board changed somewhere else.",
        description: "Refreshing to show the latest.",
    },
    [RESULT_STATUS.UNAUTHENTICATED]: {
        title: "Your session has expired.",
        description: "Sign in again to move this task.",
    },
    [RESULT_STATUS.NOT_FOUND]: {
        title: "That task is no longer available.",
        description: "Refresh to see this board's current tasks.",
    },
};

const result = await mutation.mutateAsync(args).catch(() => ({ status: RESULT_STATUS.ERROR }) as const);

if (result.status !== RESULT_STATUS.SUCCESS) {
    setOverride(null);   // one call restores the whole rendered order — the raw props still carry it
    toast.add({ type: "danger", ...(MOVE_FAILURE_COPY[result.status] ?? GENERIC_MOVE_FAILURE) });
    return { didMove: false };
}
// Left in place on success: it retires itself once the refreshed props carry the new state.
return { didMove: true };
```

### The `"use server"` transform, as the spike proved it

```js
// Source: .planning/spikes/action-stub-automation/FINDINGS.md § Appendix (verbatim)
export const serverActionStubPlugin = ({ rootDir }) => ({
    name: "server-action-stub",
    enforce: "pre",
    transform(source, id) {
        if (!id.includes("/actions/") || !/\.tsx?$/.test(id) || !hasUseServerDirective(source)) {
            return null;
        }
        const names = readExportedFunctionNames(source, id);
        if (names.length === 0) return null;

        const moduleKey = path.relative(rootDir, id.split("?")[0]).replaceAll("\\", "/");
        return { code: buildStubModule({ names, moduleKey }), map: null };
    },
});
```

`hasUseServerDirective` is `/^\s*(["'])use server\1/` — **verified matching** `create-column-action.ts`
this session. The `/actions/` path guard is CONTEXT-discretionary; keeping it means an action placed
outside an `actions/` folder is silently not stubbed, which `pnpm actions:check` would not catch
either. Recommend keeping the guard **and** adding a plugin unit test
(`scripts/vite-plugin-server-action-stub.unit.test.mjs`, `node` project) asserting it transforms every
file matching `src/features/*/actions/*.ts` — that turns the coupling into a test rather than a hope.

### Multi-container sortable, classic API sketch

```tsx
// Classic @dnd-kit/core@6.3 + @dnd-kit/sortable@10 — NOT the dndkit.com examples (Pitfall 6).
<DndContext
    id={`board-columns-${board.id}`}
    sensors={sensors}
    collisionDetection={taskAwareCollisionDetection}   // pointerWithin → rectIntersection → closest
    accessibility={{ announcements }}
    onDragStart={handleDragStart}
    onDragOver={handleDragOver}                         // cross-column PREVIEW only, no request
    onDragEnd={handleDragEnd}                           // exactly one PATCH per completed move
    onDragCancel={handleDragCancel}
>
    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        {renderedColumns.map((column) => (
            <SortableColumn key={column.id} column={column} … />
        ))}
    </SortableContext>
    <DragOverlay dropAnimation={prefersReducedMotion ? null : undefined}>
        {liftedColumn ? <ColumnPreview … /> : liftedTask ? <TaskCardPreview … /> : null}
    </DragOverlay>
</DndContext>

// inside SortableColumn:
const { setNodeRef: setDropRef } = useDroppable({ id: `column-${column.id}`, data: { type: "column-body" } });
<ul ref={setDropRef} className="flex min-h-22 flex-col gap-5">   {/* 88px min target — UI-SPEC */}
    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        {column.tasks.map((task) => <SortableTaskCard key={task.id} task={task} columnId={column.id} />)}
    </SortableContext>
</ul>
```

---

## Runtime State Inventory

The tooling half is a refactor that deletes thirteen modules and a build-config register, so the
"what still references the old thing after every file is updated?" question applies.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | None — verified: the stubs hold only in-memory module state, and nothing persists a stub identifier | none |
| **Live service config** | None — verified: no CI config, Vercel setting, or external service references `serverActionStubAlias` or a stub file (`grep -rn "storybook-stub\|serverActionStubAlias"` returns only `vitest.config.ts`, the twelve stub files, `src/test-utils/index.ts`, four test files, and `.planning/`/`docs/` prose) | none |
| **OS-registered state** | None — no scheduled task, pm2 process, or systemd unit in this repo | none |
| **Secrets / env vars** | `SESSION_SECRET`, `EXTERNAL_API_BASE_URL`, `NONPROD_RESET_TOKEN` are read by the `node`/`unit`/e2e projects and are **unaffected** by the transform. But `use_worktrees: true` means every dispatched plan starts without `.env.local` — CLAUDE.md's copy step is mandatory | copy `.env.local` into every worktree |
| **Build artifacts** | `node_modules/.vite/` — Vite's dep-optimizer cache holds pre-bundled copies keyed on the old config. A plugin swap can leave a stale entry that resolves the old alias | clear `node_modules/.vite` after the config change before trusting a run |
| **Untracked local files** | `src/**/__screenshots__/` holds Vitest browser-mode **failure** screenshots and is gitignored (`.gitignore:33-37`). All four stub-importing files currently carry a full set — a signal they failed at some point, not a baseline to preserve | none; do not commit them |
| **Prose that will silently rot** | `docs/adr/tech/0020` (D-05 amends), **`CONVENTIONS.md`'s "Where code lives" table** (Pitfall 13), `CONVENTIONS.md`'s project-organization tree (still shows separate `features/tasks/` *and* `features/subtasks/`, which D-14 merges), `docs/adr/tech/0025`'s D-08 research paragraph (cited by tech/0020 as the infeasibility source) | amend all four |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | ✓ | v24.19.0 | — |
| pnpm | everything | ✓ | 11.20.0 | — |
| `typescript` (compiler API from `.mjs`) | the transform plugin | ✓ | 6.0.3 — **probe-verified this session** | — |
| Nonprod backend `…nonprod.duckdns.org/api` | `node` (integration), `e2e`, backend probe | ✓ | reachable, `401` in 0.47s to `/boards?userId=probe` (auth required, as expected) | none — ADR tech/0018 forbids a mock server |
| `curl` | `e2e/seed.sh` | ✓ | `/usr/bin/curl` | — |
| `jq` | `e2e/seed.sh` `json_field` | ✓ | `/usr/bin/jq` | Node fallback already coded in `seed.sh` |
| `pdftoppm` | mock comparison (CLAUDE.md) | ✓ | `/usr/bin/pdftoppm` | none — the PDF is over the Read tool's limit |
| `docs/kanban-task-management-web-app.pdf` | mock comparison | ✓ | present locally (gitignored) | none |
| `.env.local` | `pnpm dev`, `e2e/global-setup.ts`, local `pnpm build` | ✓ in the main checkout | — | **must be copied into every worktree** |
| Playwright MCP, headless | every UI verification | ⚠ unverified this session | — | Confirm resolved tool names start with `mcp__playwright__`; CLAUDE.md forbids falling back to `mcp__plugin_playwright_playwright__*` |
| `gh` CLI | CI sign-off (`gh run watch`) | ⚠ unverified this session | — | none — CLAUDE.md makes CI green the sign-off |

**Missing dependencies with no fallback:** none identified.
**Unverified, worth a first-task check:** the Playwright MCP server's resolved name, and `gh` auth.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 with five projects (`tokens`, `node`, `browser`, `unit`, `storybook`) + Playwright 1.62.1 with two projects (`visual`, `e2e`) |
| Config file | `vitest.config.ts`, `vitest.setup.ts`, `vitest.setup.unit.ts`, `playwright.config.ts` |
| Quick run command | `pnpm test:unit` (jsdom, fast) — for schemas/model changes |
| Component run | `pnpm test:browser` — the project success criterion 8 names |
| Full suite | `pnpm test` (all five Vitest projects) then `pnpm exec playwright test` |
| Contention run | `pnpm exec playwright test --repeat-each=3 --workers=2` (CONVENTIONS names this as the only reliable detector of the settle-wait defect class) |
| Visual, meaningful | `CI=1 pnpm test:visual` — without `CI=1`, `playwright.config.ts:86` makes every screenshot assertion a silent no-op |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|--------------|
| tooling | Plugin extracts exported action names from a `"use server"` module | unit (`node`) | `pnpm test --project node` | ❌ Wave 0 — `scripts/vite-plugin-server-action-stub.unit.test.mjs` |
| tooling | Recorder queues/holds/settles; unqueued call is reported | unit (`node` or `unit`) | `pnpm test --project unit` | ❌ Wave 0 — `src/test-utils/action-stub-registry.unit.test.ts` |
| tooling | Full `browser` project green with no stub file and no register (**criterion 8**) | component | `pnpm test:browser` | ✅ exists, ❌ needs the 4-file rewrite |
| tooling | No `*-action-storybook-stub.ts` and no `serverActionStubAlias` remain | static gate | consider extending `pnpm actions:check` | ❌ Wave 0 (optional but criterion 8 is literally this property) |
| TASK-01 | Create posts to the column path, once, with the board's own ids | component | `pnpm test:browser` | ❌ new `add-task-modal.test.tsx` + board-view coverage |
| TASK-01 | Create against the real backend | integration | `pnpm test --project node` | ❌ new `create-task-action.integration.test.ts` |
| TASK-01 | Initial-subtask fan-out keeps partial success | component | `pnpm test:browser` | ❌ new |
| TASK-02 | Detail view renders title/description/checklist/current column | component | `pnpm test:browser` | ❌ new `task-detail-modal.test.tsx` |
| TASK-03 | Edit applies optimistically and reverts on failure | component | `pnpm test:browser` | ❌ new `edit-task-modal.test.tsx` |
| TASK-03 | Client re-enforces 3–32 on edit (Pitfall 4) | unit | `pnpm test:unit` | ❌ new task schema unit test |
| TASK-04 | Drag across columns: one PATCH, optimistic, rollback | component | `pnpm test:browser` | ❌ new — model on `sortable-column.test.tsx`'s reorder cases |
| TASK-04 | Keyboard move: lift/arrow/drop/cancel with announcements | component | `pnpm test:browser` | ❌ new — model on `board-view.test.tsx`'s keyboard cases |
| TASK-04 | `Current Status` dropdown is the same mutation | component | `pnpm test:browser` | ❌ new |
| TASK-04 | Real drag persists across a reload | e2e | `pnpm test:e2e` | ❌ new `tasks-move.e2e.spec.ts` (needs `createServerActionSettled`) |
| TASK-05 | Confirm modal, wait-for-server delete, cascade | component + e2e | `pnpm test:browser`, `pnpm test:e2e` | ❌ new |
| SUBTASK-01/03/04 | Add / inline rename on blur+Enter / delete without confirm | component | `pnpm test:browser` | ❌ new `subtask-editor-row.test.tsx` |
| SUBTASK-02 | Optimistic toggle; in-flight second toggle ignored; caption rolls back too | component | `pnpm test:browser` | ❌ new — the UI-SPEC names the caption rollback as the likely defect |
| SYNC-01 | CONFLICT ⇒ revert + distinct toast + board re-read | component | `pnpm test:browser` | ❌ new |
| UI | `heading-m` present in both themes | tokens | `pnpm test --project tokens` | ✅ `tokens/style-dictionary.build.test.ts` — needs a new assertion |
| UI | `Textarea` primitive: story, a11y, visual baseline | storybook + visual | `pnpm test:a11y`, `CI=1 pnpm test:visual` | ❌ Wave 0 for the primitive |

### Sampling Rate

- **Per task commit:** `pnpm test:unit` + the one `--project browser -t <name>` the task touches.
- **Per wave merge:** `pnpm test` (all Vitest projects), plus `pnpm lint`, `tsc`, and all seven check
  scripts (`routes`, `handlers`, `stories`, `comments`, `tsx`, `renders`, `folders`, `actions`,
  `coverage`).
- **Phase gate:** full `pnpm test` + `pnpm exec playwright test` + `CI=1 pnpm test:visual`, then CI
  green via `gh run watch <id> --exit-status`. Contention run before claiming e2e stability.

### Wave 0 Gaps

- [ ] `scripts/vite-plugin-server-action-stub.unit.test.mjs` — the plugin's own gate
- [ ] `src/test-utils/action-stub-registry.unit.test.ts` (or `.test.tsx`) — recorder semantics
- [ ] Rewrite of the four stub-importing test files (Pitfall 10's table is the scope)
- [ ] `src/components/ui/textarea/{textarea.tsx,textarea.stories.tsx,textarea.test.tsx}` + a
      `visual/primitives.visual.spec.ts` entry
- [ ] `src/test-utils/factories/` — task/subtask factories already exist in `factories/board-full.ts`
      (`createSubtask`, `createTaskFull`, `createTasksFull`, `createSubtasks`); they only need their
      import path updated when D-16 moves the schemas
- [ ] Fix the toast auto-dismiss race (`browser` project — blocks criterion 8) and the dropdown
      `Disabled` hang (`storybook` project — blocks `pnpm test`/CI)
- [ ] `scripts/probe-task-backend.mjs` + `04-BACKEND-FACTS.md`

---

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json`, so this section applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `verifySession()` from `@/lib/server/dal` is called **inside every action**, first, before parsing — never trusting an outer guard (the CVE-2025-29927 class, T-02-50) |
| V3 Session Management | no (unchanged) | `src/lib/server/session.ts` + `upstream-cookie.ts`; this phase adds no session behaviour |
| V4 Access Control | yes | `userId` comes **only** from the verified session record, never the action's argument — even where the contract declares it client-suppliable (T-03-07). `PATCH /tasks/{taskId}/move` carries no board scoping at all (Pitfall 5), so the backend is the only authorization point; the probe must confirm it refuses a foreign board |
| V5 Input Validation | yes | `.safeParse` at the action boundary (ADR tech/0024). Explicit floors: `targetPosition` `.int().min(0)` mirroring the DTO's `minimum: 0` (`reorderColumnInputSchema` is the pattern, `schemas.ts:197-202`); `version` `.int()`; every id `.min(1)` |
| V6 Cryptography | no | none introduced |
| V7 Error handling | yes | Every result is a **bare discriminant** — no upstream text reaches the client (D-21, T-02.1-04, T-03-33). `NOT_FOUND` covers both 403 and 404 deliberately so a caller cannot probe which ids exist (`result-status.ts:19-24`) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Server Action invoked over the wire with a forged payload | Tampering / EoP | `.safeParse` after the session check — types are compile-time only. `reorder-column-action.ts:49-56` states this verbatim |
| `userId` supplied by the caller | Elevation of Privilege | Read from `verifySession()` only; never from the argument |
| Moving a task onto another account's column | EoP | Backend-enforced; **must be probed** — `moveToColumn` carries no board scoping. Add it to `04-BACKEND-FACTS.md` |
| Unbounded fan-out from a forged create payload | DoS | `createBoardColumnsInputSchema` caps `names` at 50 (`schemas.ts:164-167`); the initial-subtask array needs the same cap |
| Upstream error text leaking to the UI | Information Disclosure | Bare-discriminant unions + authored copy only; no failure string is composed from a response |
| Stale-version overwrite (lost update) | Tampering | Optimistic locking: `version` required on every PUT/PATCH; `OPTIMISTIC_LOCK_CONFLICT → CONFLICT` and D-12's revert-plus-re-read |
| Test double reaching production | Tampering | The transform is scoped to the `browser`/`storybook` Vitest projects and Storybook's dev server; `next build` never loads it. **Worth an explicit plan assertion** — this is the one place the tooling change could, in principle, change shipped behaviour |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `revalidatePath()` / `revalidateTag()` | `refresh()` from `next/cache` | Next 16 | Already adopted repo-wide (`reorder-column-action.ts:3`); copy it, do not reach for the older API |
| `@dnd-kit/core` + `@dnd-kit/sortable` (classic) | `@dnd-kit/react` + `@dnd-kit/helpers` (rewrite) | ongoing, still pre-1.0 | **Do not migrate.** ADR tech/0003 pins the classic line and names 1.0 as the unwind trigger. All current dndkit.com/Context7 docs describe the rewrite |
| Hand-written per-action stub modules + Vite alias register | `"use server"` transform + one generic recorder | this phase | Removes the 4-vs-12 register drift as a side effect |
| `.run()` on composed stories | Direct JSX render of composed stories | ADR tech/0025 | `.run()` is ESLint-banned repo-wide |
| `next/headers` `cookies()` shim in tests | Real Playwright e2e coverage | Phase 02.2 | Zero remaining consumers; do not reintroduce |
| zod 3 `.parse` at boundaries | zod 4 `.safeParse` + `z.infer` types | ADR tech/0024 | Schema is the source of truth; never a hand-written interface |

**Deprecated / outdated in this repo's own docs:**

- ADR tech/0020's Server Action carve-out register: says **4** stubs and 4 aliases; reality is **12**.
  D-05 fixes this while deleting both.
- `CONVENTIONS.md`'s project-organization tree still lists separate `features/tasks/` **and**
  `features/subtasks/` folders. D-14 merges subtasks into `features/tasks/`; D-17 says the tree is
  updated.
- `CONVENTIONS.md`'s "Where code lives" table still names the `*-action-storybook-stub.ts` seam.
- `04-CONTEXT.md`'s `<domain>` block says *"`04-UI-SPEC.md` has not been authored yet"*. It has been —
  it is signed off and 616 lines. Read the UI-SPEC, not that sentence.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The classic multi-container pattern (one `DndContext`, per-column `SortableContext` + `useDroppable`, `onDragOver` preview) works in this repo's nested-scroll layout without a modifier package | Pattern 4 | The drag half of the phase needs a spike before it can be planned in detail. `03-SPIKE-DNDKIT.md` covered auto-scroll in this shape but never a *second* sortable axis. **Recommend a short spike or a Wave-1 tracer plan** |
| A2 | 104 failures ≈ 52 unique `it()` blocks (111 blocks × 2 devices = 222 tests) | Pitfall 10 | Only an estimate of rewrite size; the four-file totals in the table are verified, the 52 is derived |
| A3 | The backend accepts a task `PUT`/`DELETE` when `boardId`/`columnId` are written into the path even though the contract does not declare them | Pitfall 2 | If it rejects them, the URL shape is different from what the templates say. `03-BACKEND-FACTS.md` R8 asked exactly this question for columns and **refuted** the research's premise — so probe, do not assume |
| A4 | `targetPosition` on `moveToColumn` means the task's final 0-based index within the destination column, as `targetPosition` does for columns (R1) | Pattern 4 / D-11 | An insert-before-index meaning would need client translation; `toReorderTargetPosition` exists precisely because that question was live for columns. **Must be probed** |
| A5 | A stale-version task/subtask write returns `409 OPTIMISTIC_LOCK_CONFLICT`, as a stale column reorder does (R3) | SYNC-01 | If the code differs, `map-problem-code.ts` needs an entry and every conflict branch changes |
| A6 | Only the moved task's `version` bumps; tasks that merely shift keep a valid version (columns behave this way per R2) | Pattern 5 | If every task in the column bumps, a move must block all of them, not one |
| A7 | Deleting a task cascades to its subtasks server-side with no partial state (domain/0002) | TASK-05 | ADR-backed but not probed for tasks specifically |
| A8 | `refresh()` called on a non-success return path behaves normally (no partial-render or thrown-error interaction) | Pattern 6 | If it misbehaves, D-12 falls back to `useRouter().refresh()` in the hook, which drags `next/navigation` shims into four more test files |
| A9 | Adding the plugin to `.storybook/main.ts`'s `viteFinal` fixes the `session.ts` dev-server crash | Pattern 3 | Structurally sound (main.ts has no alias today — verified) but not executed. If a different cause survives, the folded todo stays open |
| A10 | `enforce: "pre"` sequences the transform before `@storybook/nextjs-vite`'s own plugins in the `storybook` Vitest project | Pattern 3 | Vite's documented order supports this; the spike only proved it for the `browser` project |
| A11 | Reading `04-UI-SPEC.md`'s measurements is sufficient — I did not re-open the PDF this session | throughout | The UI-SPEC is signed off and internally falsifiable, but CLAUDE.md requires the *implementer* to open the mock for every surface presented |

---

## Open Questions

### 1. D-14 and D-15 are mechanically incompatible for anything the board renders — **blocking**

**What we know (verified this session).** `eslint.config.mjs` §7 defines
`{ type: "feature", pattern: "src/features/*" }` with `boundaries/dependencies` at
`default: "disallow"` and no `feature → feature` policy. I created scratch modules and ran ESLint:

```
src/features/boards/probe-back.ts
  1:28  error  There is no policy allowing dependencies from elements of type "feature" to elements of type "feature"
src/features/tasks-probe/probe.ts
  1:34  error  There is no policy allowing dependencies from elements of type "feature" to elements of type "feature"
```

Both directions blocked, at `"error"`, on plain `.ts` files. The `boundaries/dependencies: "off"`
exemption (§7b) is scoped to `src/components/ui/**/*.stories.tsx|test.tsx` only, so **stories and
tests under `src/features/**` are also blocked**. Also verified: `app/**` is not a declared element
and no `boundaries/no-unknown*` rule is enabled, so `app/` may import both features; `src/test-utils/`
is likewise unconstrained; and `feature → layout → feature` is fully legal (probed, zero errors).

**What's unclear.** D-16 promotes the *schemas* to `lib/core`, which legalises the `TaskFull`/`Subtask`
**type** import — and D-16's text claims that "is what makes D-14's tasks feature legal". It does not
cover the **component** import. `04-UI-SPEC.md` § "Task card anatomy" describes the interactive card
as replacing the `<li>` **inside `sortable-column.tsx`**, which lives in `features/boards/`. If the
card lives in `features/tasks/components/`, that import is the blocked edge above.

**The four routes, with costs:**

| # | Route | Cost |
|---|-------|------|
| **A** | Add the `boards → tasks` edge to `eslint.config.mjs` §7 after all | Reverses D-15 (itself a revision of the original D-15). Cheapest by far; one policy entry with a comment, exactly like the existing `layout → feature` entry which carries its own justifying comment. Needs the user's sign-off because D-15 is a locked decision |
| **B** | Keep every task/subtask **component and hook** in `features/boards/components/` and `features/boards/hooks/`, with only schemas in `lib/core` | Effectively abandons D-14. Matches what CONVENTIONS already decided for columns, verbatim, and needs no policy change |
| **C** | Move `BoardView` (and the task-list slot of `SortableColumn`) into `src/components/layout/`, passing task nodes down as `ReactNode`/render props between two client components | Legal today (probed). But relocates a Phase-3 component with an established test/story/screenshot footprint, and stretches "domain-aware chrome" to mean "two-domain composition root" |
| **D** | Compose in `app/(dashboard)/boards/[boardId]/page.tsx` | **Not viable.** `page.tsx` is a Server Component; a render prop is not serializable across the RSC boundary, and the task list is dynamic (optimistic inserts), so pre-rendered nodes cannot be passed |

**Recommendation.** Put **A vs B** to the user before Wave 1 — it decides the path of every file in
Waves 2–4, and discovering it mid-execution means moving a whole feature folder. My own lean is **A**,
because it is one policy line with a stated reason (the same shape the `layout → feature` entry
already uses), it preserves D-14 and D-16 intact, and the alternative that avoids it (B) is the option
D-14 was explicitly written to reject. **C** should be offered only if the user wants zero policy
change *and* a real tasks feature.

### 2. D-03's "throws" does not fail loudly — **needs a decision, not an escalation**

Covered fully in Pattern 2. The intent survives; the mechanism must change from "throw from the
recorder" to "record and assert in D-04's `afterEach`", because all four existing hooks swallow a
rejected `mutateAsync`. **Recommendation:** implement the `afterEach` assertion, and note in the plan
that this is honouring D-03's stated purpose rather than its stated mechanism.

### 3. One subtask endpoint, two user-facing actions

`PUT .../subtasks/{subtaskId}` carries both `title` and `isCompleted` and requires `version`. D-06/D-08
give rename and toggle different optimistic and rollback semantics, and `04-UI-SPEC.md` S-03 puts them
on *different surfaces* (rename in `Edit Task`, toggle in the detail view). The action verb set allows
both `rename` and `update` (`scripts/check-action-verbs.mjs:22`).
**Recommendation:** **one** `update-subtask-action.ts` (one file per HTTP operation, matching every
existing action), **two** hooks (`use-rename-subtask`, `use-toggle-subtask`) carrying the different
toast tables and rollback shapes. The alternative — `rename-subtask-action.ts` +
`update-subtask-action.ts` both hitting the same PUT — duplicates the session/parse/upstream skeleton
for one differing field.

### 4. `04-BACKEND-FACTS.md` questions to probe before Waves 2–4

The per-phase probe is an established pattern (`scripts/probe-board-backend.mjs`,
`scripts/probe-column-backend.mjs`, `02-`/`03-BACKEND-FACTS.md`) and Phase 3's probe **refuted three
of its own research assumptions** (A3, A5, and Pitfall 2's premise). At minimum:

- **T1** Does `POST /boards/{b}/columns/{c}` with `{title}` create a task? What does it return?
- **T2** Do task/subtask `PUT`/`DELETE` accept the ancestor path segments the contract omits (Pitfall 2 / A3)?
- **T3** Is `moveToColumn`'s `targetPosition` the final 0-based index (A4)? What does omitting it do?
- **T4** Does a stale-version task PUT / subtask PUT / move return `409 OPTIMISTIC_LOCK_CONFLICT` (A5)?
- **T5** After a move, do *shifted* tasks keep a valid `version` (A6)?
- **T6** Does deleting a task remove its subtasks, and does a second DELETE 404 (A7)?
- **T7** Does moving a task to a column on **another board**, or another account's board, get refused (Pitfall 5)?
- **T8** Does the backend enforce `title` 3–32 on **update** as well as create (Pitfall 4)?
- **T9** Does `SaveTaskRequestDTO.description` accept `""` and does the response echo `null` (the R9 shape `taskFullSchema` already normalises)?

### 5. Does the drag half need its own spike? (A1)

`03-SPIKE-DNDKIT.md` answered auto-scroll and keyboard reachability for a *single* horizontal sortable
axis. Nothing in this repo has run a second, vertical, per-container axis inside the same
`DndContext`, and Pitfalls 6–9 are all "unknown until run". **Recommendation:** either a short spike
before planning Wave 4, or make the first Wave-4 plan an explicit tracer whose only deliverable is a
working cross-column drag with the existing column reorder still green.

---

## Sources

### Primary (HIGH confidence — read or executed this session)

- `docs/api/kanban-board-openapi.json` — all 25 operations enumerated; task/subtask DTOs and
  declared-vs-template path parameters compared with a script
- `src/lib/core/api-contract/generated-types.ts` — `addTaskByColumnId`, `moveToColumn` operation types
- `vitest.config.ts`, `vitest.setup.ts`, `.storybook/main.ts`, `.storybook/vitest.setup.ts`
- `src/test-utils/{create,rename,reorder,delete}-column-action-storybook-stub.ts`, `index.ts`
- `src/features/boards/{schemas.ts, model.ts, column-drag-model.ts}`
- `src/features/boards/actions/{reorder-column,create-board-columns}-action.ts`
- `src/features/boards/hooks/{use-reorder-columns, use-rename-column, use-delete-column, use-create-column, use-column-drag-sensors}.ts`
- `src/features/boards/components/{board-view, sortable-column, delete-column-confirm, add-board-modal}/*.tsx`
- `src/features/boards/server/fetch-board-full.ts`
- `src/lib/core/api-contract/{result-status, map-problem-code, external-paths}.ts`
- `src/components/ui/{checkbox, text-field, dropdown}/*` and `src/test-utils/factories/board-full.ts`
- `app/(dashboard)/boards/[boardId]/page.tsx`
- `CONVENTIONS.md`, `CLAUDE.md`, `eslint.config.mjs` §7, `package.json`, `playwright.config.ts`
- `docs/adr/tech/0020-no-mocking-policy.md`
- `.planning/spikes/action-stub-automation/FINDINGS.md`, `.planning/phases/04-task-subtask-workflow/{04-CONTEXT.md, 04-UI-SPEC.md}`,
  `.planning/phases/03-column-management/03-BACKEND-FACTS.md`, `.planning/{REQUIREMENTS.md, STATE.md}`
- `e2e/{seed.sh, seed.ts}`, `scripts/check-action-verbs.mjs`
- **Executed probes:** ESLint boundary probes (feature→feature blocked both ways; app→feature,
  feature→test-utils, feature→layout→feature all legal); `typescript@6.0.3` compiler-API probe against
  `create-column-action.ts`; `@dnd-kit/core`/`@dnd-kit/sortable` runtime export enumeration; nonprod
  backend reachability (`401` in 0.47s); tool availability (`node`, `pnpm`, `curl`, `jq`, `pdftoppm`)

### Secondary (MEDIUM confidence)

- Context7 `/vitejs/vite` — plugin ordering and the `transform` hook contract (`enforce: 'pre'` runs
  before Vite core plugins)
- Context7 `/websites/dndkit` — **used as a negative source only**: it returned exclusively
  `@dnd-kit/react` (rewrite) APIs, which is what established Pitfall 6

### Tertiary (LOW confidence — flagged, not relied on)

- The classic dnd-kit multi-container pattern (Pattern 4) is reconstructed from the installed API
  surface plus this repo's own existing single-axis implementation, **not** from a fetched
  version-matched example. Tracked as A1 / Open Question 5.

---

## Metadata

**Confidence breakdown:**

- **Contract facts (paths, DTOs, path parameters):** HIGH — read directly from
  `kanban-board-openapi.json` and cross-checked against `generated-types.ts`
- **Repo facts (patterns, file/line references, lint behaviour, tool availability):** HIGH — every
  claim comes from a file opened or a command run this session; the boundary and TypeScript-API
  claims were reproduced with executable probes
- **Stub-transform mechanics and rewrite scope:** HIGH for the mechanism (spike-proven, and I
  re-ran its AST reader), HIGH for the call-site counts (`grep -c`), MEDIUM for the 52-block estimate
- **dnd-kit multi-container shape:** MEDIUM — installed API surface verified, version trap verified,
  but the pattern itself has not been run in this repo's nested-scroll layout
- **Backend runtime semantics (`targetPosition`, conflict codes, cascade, version bumps):** LOW by
  design — nine questions listed for `04-BACKEND-FACTS.md`; Phase 3's probe refuted three of its own
  research assumptions, so none of these should be planned against as fact

**Research date:** 2026-08-28
**Valid until:** 2026-09-27 for the repo/contract facts (they change only when this repo does);
**7 days** for the dnd-kit and Vite/Vitest ecosystem notes.
