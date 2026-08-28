# Phase 4: Task & Subtask Workflow - Context

**Gathered:** 2026-08-28
**Status:** Ready for planning

<domain>
## Phase Boundary

A signed-in user can create, inspect, edit, move, and remove tasks and their subtask
checklists, with every write reconciled against the server and a stale version surfaced rather
than silently overwritten (TASK-01..05, SUBTASK-01..04, SYNC-01). The phase opens with the
tooling scope the roadmap folded in on 2026-08-28: the twelve hand-written
`src/test-utils/*-action-storybook-stub.ts` modules and `vitest.config.ts`'s twelve-entry
`serverActionStubAlias` register are replaced by a build-time `"use server"` transform plus one
generic recorder, *before* any of the seven new task/subtask actions land.

This phase does not touch board-level CRUD (Phase 2, complete) or column CRUD (Phase 3,
complete). The board-full read path already parses tasks and subtasks — this phase adds writes
and the UI that drives them, not the read.

**UI mechanics are not settled here.** `04-UI-SPEC.md` has not been authored yet and the
plan-phase UI gate is blocking on it. This CONTEXT.md captures product and architecture
decisions; layout, copy, tokens, and interaction detail belong to that document. Where a
decision below constrains the UI-SPEC (D-06, D-09, D-13), it says so explicitly.

</domain>

<decisions>
## Implementation Decisions

### Server Action stub tooling (runs first in the phase)

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

### Task and subtask write granularity

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

### Move paths and ordering

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

### Feature-folder placement

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

- **D-18 (added 2026-08-28, resolves the D-14 / D-15 conflict):** `BoardView` moves from
  `src/features/boards/components/` to **`src/components/layout/`**, and composes the two features
  by passing task nodes down to `SortableColumn` as `ReactNode` / render props between two client
  components. This keeps **D-14** (a real `src/features/tasks/` folder), **D-15** (no
  feature-to-feature edge is added; the policy stays exception-free), and **D-16** (schemas promoted
  to `src/lib/core/api-contract/`) all intact simultaneously.

  **Why this was needed.** `04-RESEARCH.md` § Open Questions #1 proved with executed ESLint probes
  that `boundaries/dependencies` blocks `feature -> feature` at `"error"` in both directions, and
  that the §7b `"off"` exemption covers only `src/components/ui/**` stories and tests. D-16 legalises
  the `TaskFull` / `Subtask` **type** import from the core ring, but not the **component** import
  that `04-UI-SPEC.md` § "Task card anatomy" prescribes — an interactive task card replacing the
  `<li>` inside `sortable-column.tsx`, which lives in `features/boards/`. `feature -> layout ->
  feature` was probed and passes clean, so the layout ring is the legal composition point.

  **Rejected alternatives.** Adding a `boards -> tasks` policy edge (reverses D-15, which a rushmore
  entity-taxonomy run had already argued against). Keeping every task component and hook inside
  `features/boards/` (abandons D-14 outright). Composing in
  `app/(dashboard)/boards/[boardId]/page.tsx` (not viable — it is a Server Component, a render prop
  is not serializable across the RSC boundary, and the task list takes optimistic inserts).

  **Cost the planner must absorb, chosen with the cost stated.** `BoardView` is a Phase 3 component
  with an established test, story, and visual-baseline footprint; all of it moves with the file.
  Plan the relocation, its import-path fan-out, and its Storybook/Playwright baseline updates as
  explicit work, not as incidental churn. — **Reversibility:** costly — a second move would
  re-disturb the same footprint.

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
  only to D-06's per-item save rule.

### Folded Todos

- **"pnpm storybook"'s manual dev server crashes any story whose import chain reaches
  `src/lib/server/session.ts`**
  (`.planning/todos/pending/2026-08-26-storybook-dev-server-crashes-on-any-story-reaching-session-ts.md`)
  — a `node:crypto` externalization error breaks any story reaching the session module in the
  manual Storybook dev server. Folded because D-01's transform changes exactly how those
  `"use server"` import chains resolve in the browser project; the fix and the regression are the
  same surface.
- **dropdown "Disabled" story hangs (~405s) in full-suite runs but passes alone**
  (`.planning/todos/pending/2026-08-24-dropdown-disabled-story-hangs-in-full-suite-runs.md`) and
  **Toast harness races Base UI's 5s auto-dismiss under full-suite load**
  (`.planning/todos/pending/2026-08-24-toast-harness-races-the-5s-auto-dismiss-under-load.md`) —
  both are known `browser`-project defects. Folded because this phase's success criterion 8
  requires the full `browser` Vitest project to pass without the stub register, and neither flake
  can be distinguished from a transform regression while it is still present.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The tooling decision this phase opens with
- `.planning/spikes/action-stub-automation/FINDINGS.md` — the whole basis for D-01..D-05. Records
  that a real `"use server"` module cannot even be *imported* in the browser project
  (`ReferenceError: process is not defined` from `next/cache`'s `refresh()`, reached before
  `node:crypto`), that `@storybook/nextjs-vite@10.5.7` ships no `"use server"` transform, the
  working prototype source for both the plugin and the recorder, the 724-pass/104-fail measurement
  with the register off, and the four affected test files. Read the appendix — the prototype is
  inline there because ESLint's project service rejects a `.ts`/`.mjs` file parked under
  `.planning/`.
- `docs/adr/tech/0020-no-mocking-policy.md` — the Server Action alias carve-out D-05 amends, and
  the no-mocking rule that survives the amendment unchanged.
- `vitest.config.ts` — the `serverActionStubAlias` register (twelve entries) and the `browser`
  project definition the plugin replaces. Note the existing comment about Vite matching a string
  `find` by prefix.
- `src/test-utils/` — the twelve `*-action-storybook-stub.ts` modules D-01 deletes, plus
  `index.ts`, the thin barrel Phase 02.2's D-11 added over them.

### Prior decisions this phase extends or diverges from
- `.planning/phases/03-column-management/03-UI-SPEC.md` — **U-01** (per-column affordances, not a
  batched `Save Changes` across N versioned children) is the precedent D-06 applies to subtasks;
  **U-05** (optimistic-vs-waiting split) is what D-08 and D-09 follow.
- `.planning/phases/03-column-management/03-CONTEXT.md` — **D-06** (both `Space` and `Enter` lift,
  therefore the drag handle must not itself be an `Enter`-activated button) is what D-13 applies to
  task cards. **D-01**'s append-at-end rule for new children is the analog for new tasks.
- `.planning/phases/02.2-unify-component-tests-fully-onto-storybook-stories-eliminate/02.2-CONTEXT.md`
  — **D-04** (centralized `afterEach`) is D-04's precedent here; **D-07/D-08/D-09** recorded the
  intent to replace stubs with real Server Action calls and named the feasibility research gate.
  The spike has now answered that gate: real actions cannot be imported at all, so D-09's fallback
  (stub stays, scoped) is the live branch and D-01 is what it becomes.
- `.planning/phases/02.1-testing-strategy-overhaul-and-code-quality-retrofit-no-mocki/02.1-CONTEXT.md`
  — **D-02** (every write is a Server Action, wrapped as a mutation function when optimistic
  rollback is needed; every read is an RSC) is the blanket rule all seven new mutations follow
  without re-deciding.

### Domain / data contract
- `docs/api/kanban-board-openapi.json` — the seven mutating operations this phase builds:
  `addTaskByColumnId` (POST, `SaveTaskRequestDTO`, requires only `title`), `updateById_2` (PUT,
  `UpdateTaskRequestDTO`, requires `version`), `deleteById_2` (DELETE), `moveToColumn`
  (PATCH `/tasks/{taskId}/move`, `MoveTaskRequestDTO`, requires `targetColumnId` + `version`,
  **optional `targetPosition`** — the field D-11 turns on), `addSubtaskByTaskId` (POST,
  `SaveSubtaskRequestDTO`), `updateById_3` (PUT, `UpdateSubtaskRequestDTO`, requires `version`,
  carries `isCompleted`), `deleteById_3` (DELETE). Note `TaskResponseDTO` and `SubtaskResponseDTO`
  declare no `required` array — hence `.safeParse` per ADR tech/0024.
- `docs/adr/domain/0002` — hard cascade delete, no undo. Behind D-09's task-vs-subtask split.
- `docs/adr/domain/0003` — no bulk-create endpoint; client-orchestrated sequential calls, partial
  failure kept. Behind D-07.

### Architecture rules this phase changes
- `docs/adr/tech/0009-project-organization.md` — the feature-folder hybrid and the
  no-cross-feature-imports rule D-15 deliberately leaves exception-free.
- `eslint.config.mjs` §7 — the `boundaries/elements` element map and `boundaries/dependencies`
  policy list. `feature → feature` is absent today (`default: "disallow"`); `layout → feature`
  exists and carries a comment explaining why it was added. D-15 adds no policy of its own.
- `docs/adr/tech/0019-server-entry-points.md` — RSC-or-Server-Action, Route Handlers banned.
- `docs/adr/tech/0024-boundary-schema-validation.md` — `.safeParse` at every boundary, schema as
  source of truth, type via `z.infer`.
- `docs/adr/tech/0025-direct-composed-story-rendering.md` — component tests render composed
  stories directly as JSX. Every rewritten assertion under D-02 stays in this shape.
- `CONVENTIONS.md` — `model.ts` purity rule, `RESULT_STATUS` usage, comment-length limit, test
  runner concurrency.

### Design source
- `docs/kanban-task-management-web-app.pdf` — gitignored, 115MB, 73 pages, over the Read tool's
  PDF limit. Render with `pdftoppm -f N -l N -scale-to-x 900 -png`. Pages read this session:
  **p4** (board with task cards, `+ Add New Task` in the header, `N of M substasks` caption),
  **p5** (task detail: title, description, subtask checkboxes, `Current Status` dropdown — the
  source of D-10), **p6** (`Add New Task`: title, description, subtask rows, status, `Create Task`
  — the source of D-07), **p7** (`Edit Task`: same fields behind one `Save Changes` — the shape
  D-06 declines). `04-UI-SPEC.md` must open these itself and measure rather than inherit these
  readings.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/boards/actions/reorder-column-action.ts` — the closest analog to the task move
  action: session-then-parse-then-upstream ordering, `userId` from the verified session record
  only, bare-discriminant result union, `refresh()` inside the action rather than the hook, and a
  documented reason for folding an unreachable `DUPLICATE` branch into `ERROR`.
- `src/features/boards/actions/create-board-columns-action.ts` — the sequential multi-child
  creation D-07 reuses for a task's initial subtasks.
- `src/features/boards/components/delete-column-confirm/delete-column-confirm.tsx` — the confirm
  modal D-09 reuses for task deletion.
- `src/features/boards/hooks/use-rename-column.ts`, `use-delete-column.ts`,
  `use-reorder-columns.ts` — the per-status result tables, including the `CONFLICT` entries D-12
  extends with a refresh.
- `src/lib/core/api-contract/result-status.ts` — `CONFLICT` already exists as a distinct branch
  from `DUPLICATE` and `ERROR`, with a comment naming SYNC-01 as its intended consumer. Nothing
  new is needed for the conflict axis.
- `src/lib/core/api-contract/map-problem-code.ts` — maps the backend's
  `OPTIMISTIC_LOCK_CONFLICT` to `RESULT_STATUS.CONFLICT`.
- `src/components/ui/checkbox/`, `dropdown/`, `modal/`, `text-field/`, `button/`, `menu/`,
  `toast/` — the primitives the task surfaces need. A `Checkbox` and a `Dropdown` already exist,
  which the subtask checklist and the `Current Status` control both want.
- `src/features/boards/model.ts` — already exports `toSubtaskSummary()` (the `N of M subtasks`
  caption) and `toColumnCaption()`. `toSubtaskSummary` follows the schemas to the core ring under D-16.

### Established Patterns
- `sortable-column.tsx` already renders task cards read-only, with a comment at
  `board-view.tsx:26` stating "Task cards stay display only — task interaction is Phase 4." That
  is the integration seam.
- The board-full read is the single ordering site: `fetch-board-full.ts` sorts columns by
  position once so no component sorts. Task ordering under D-11 must follow the same rule — order
  at the read, not in the card list.
- `src/features/boards/schemas.ts` already defines `subtaskSchema`, `taskFullSchema`,
  `columnFullSchema`, and a `columnSchema` derived by omitting `tasks` — with a comment recording
  that the tasks-less shape exists because `ColumnResponseDTO` returns no tasks. D-16 promotes the
  first two to `lib/core/api-contract/`.

### Integration Points
- `src/features/boards/components/board-view/board-view.tsx` and
  `src/features/boards/components/sortable-column/sortable-column.tsx` — where task cards become
  interactive and where the task drag context meets the existing column drag context.
- `vitest.config.ts`'s `browser` project — `resolve: { alias: [...serverActionStubAlias, ...alias] }`
  becomes `plugins: [...]` with the plain `alias`, per the spike's appendix.
- `vitest.setup.ts`'s `browser` project setup — where D-04's global stub reset lands, next to the
  existing centralized cleanup.

</code_context>

<specifics>
## Specific Ideas

- The rejection of the spike's per-action success-factory map (D-02) was explicit and reasoned:
  a factory map is a per-action register, and a per-action register is the thing being deleted.
  Downstream agents should not reintroduce it as a convenience, even scoped to the four affected
  files.
- The original `boards -> tasks` boundary edge was reversed on 2026-08-28, after a rushmore
  entity-taxonomy run surfaced its conflict with `CONVENTIONS.md`. What carries forward is that
  the no-cross-feature-imports rule still has zero exceptions, and a phase that wants one should
  reach for ADR tech/0024's schema promotion first.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **"Fold e2e seeding logic into a single service/module"**
  (`.planning/todos/pending/2026-08-22-fold-e2e-seeding-logic-into-a-single-service-module.md`)
  — reviewed and not folded, the same call Phase 3 made. This phase will add task and subtask
  seeding to `e2e/seed.ts`/`seed.sh` following the existing one-function-per-entity shape; the
  todo's actual open item is a `theme` field the account seeder does not return, which is
  unrelated to tasks.
- **"boards-create e2e intermittently 401s on seed.sh board-full when its signup session is
  evicted"**
  (`.planning/todos/pending/2026-08-27-boards-create-e2e-401s-when-its-seed-session-is-evicted.md`)
  — reviewed and not folded. Real and adjacent, since more task e2e flows means more seeded
  accounts against the backend's two-session cap, but it is a seeding-infrastructure defect
  rather than task workflow. Revisit if task e2e coverage makes it reproduce more often.
- Matched by keyword only and unrelated to this phase: **"Sort Boards by createdAt once the
  backend supplies it"**, **"Trim boards schema unit tests that just retest zod"**, **"Container
  corner radii use rounded-lg where the mock wants ~6px"**, **"Sidebar + Create New Board is
  pinned to the panel bottom"**, **"Reopen local pre-commit gitleaks investigation"**. Left in the
  pending backlog.

### Out of this phase
- No new capabilities were raised during discussion. The one scope extension that came up
  (within-column task reordering) was accepted into this phase rather than deferred — see D-11,
  which records that it has no requirement behind it.

</deferred>

---

*Phase: 4-task-subtask-workflow*
*Context gathered: 2026-08-28*
