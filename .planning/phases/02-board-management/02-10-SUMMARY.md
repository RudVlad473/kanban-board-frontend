---
phase: 02-board-management
plan: 10
subsystem: boards
tags: [server-actions, zod, react-hook-form, toast, tanstack-query, e2e, real-backend]

requires:
  - phase: 02-board-management
    provides: "02-08/02-09's boards spine (fetchBoards RSC read, BoardList, sidebar chrome) and 02-07's Toast/Modal/Button primitives."
provides:
  - "createBoardAction and createBoardColumnsAction — the phase's first two write paths, both session-derived, both zod-gated, both calling refresh() from next/cache."
  - "boardNameSchema / columnNameSchema / columnNameRowSchema / createBoardInputSchema / createBoardColumnsInputSchema."
  - "toCreatableColumnNames — the single place blank column rows are trimmed and dropped."
  - "useCreateBoard — the two-phase create orchestration, D-05's inline-error branch, and D-04's board-scoped failure toast with a narrowing retry."
  - "AddBoardModal — controlled modal with a useFieldArray column list seeded with three empty rows."
  - "The sidebar's '+ Create New Board' entry point on BoardList."
  - "zodErrorToFieldErrors promoted to lib/core/api-contract/ (second domain needed it)."
  - "A programmable create-board-columns Storybook stub, and seed.sh's board-full read for real-backend assertions."
affects: [02-11, 02-12, 02-13]

actuals:
  tokens: 30000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Server Action write ordering (docs/adr/tech/0019) applied for the first time to boards: verifySession() -> .safeParse() -> externalApi call -> refresh() from next/cache."
    - "Keep-what-succeeded child creation: a serial for...of over names, a refusal recorded rather than thrown, and the failed set returned on the success branch (ADR domain/0003)."
    - "One board-scoped toast id passed explicitly to useToast().add(), so a retry upserts the same toast instead of stacking a second beside a stale first."
    - "A presentational modal takes onSubmit as a prop rather than calling its own mutation hook, so behavioural tests drive it with a real local function and need no module mock (docs/adr/tech/0020)."
    - "A programmable Storybook stub module (queued outcomes + recorded calls) as the sanctioned alternative to vi.mock, extending sign-out-action-storybook-stub.ts's exported-counter precedent."

key-files:
  created:
    - src/features/boards/actions/create-board.ts
    - src/features/boards/actions/create-board-columns.ts
    - src/features/boards/model.ts
    - src/features/boards/model.unit.test.ts
    - src/features/boards/hooks/use-create-board.ts
    - src/features/boards/components/add-board-modal.tsx
    - src/features/boards/components/add-board-modal.stories.tsx
    - src/features/boards/components/add-board-modal.test.tsx
    - src/lib/core/api-contract/zod-field-errors.ts
    - src/test-utils/create-board-action-storybook-stub.ts
    - src/test-utils/create-board-columns-action-storybook-stub.ts
    - e2e/boards-create.e2e.spec.ts
  modified:
    - src/features/boards/schemas.ts
    - src/features/boards/schemas.unit.test.ts
    - src/features/boards/components/board-list.tsx
    - src/features/boards/components/board-list.stories.tsx
    - src/features/boards/components/board-list.test.tsx
    - src/features/auth/schemas.ts
    - src/features/auth/schemas.unit.test.ts
    - src/features/auth/actions/sign-in.ts
    - src/features/auth/actions/sign-up.ts
    - src/components/layout/sidebar/sidebar.test.tsx
    - src/components/ui/toast/toast.stories.tsx
    - src/test-utils/next-router-shims.tsx
    - .storybook/preview-annotations.tsx
    - vitest.config.ts
    - e2e/seed.sh
    - e2e/seed.ts

key-decisions:
  - "No *.integration.test.ts files were written for either Server Action. Phase 02.2 retired the next/headers shim and deleted every integration test (docs/adr/tech/0020, 0025); both actions call verifySession() and refresh(), neither of which can run outside a real Next.js request scope, so the plan's instruction to reuse a load-boards.integration.test.ts pattern referenced a file and a mechanism that no longer exist. Real-backend coverage moved to Playwright e2e, which is ADR tech/0025's own prescribed destination for exactly this."
  - "Duplicate board names are REJECTED by the backend (409 DUPLICATE_RESOURCE, 'Board with that name already exists'), directly contradicting this plan's must_haves truth and success criterion. Probed twice against the real nonprod backend. The e2e spec now creates a differently-named second board and asserts newest-first ordering instead."
  - "zodErrorToFieldErrors moved from features/auth/schemas.ts to lib/core/api-contract/zod-field-errors.ts — a feature may not import another feature (eslint-plugin-boundaries), and ADR tech/0024 prescribes promotion once a second domain needs the identical shape."
  - "The add-board form is keyed on an open counter, so each fresh open starts empty while a failed create still keeps its values (the modal never closed) — D-05 preserved without leaking one create's values into the next."
  - "The generic 'Couldn't create board. Try again.' message is used for every non-empty-name create failure, including the duplicate-name 409, per 02-UI-SPEC's D-05 row. No duplicate-specific copy was authored, since that would exceed the Copywriting Contract."

patterns-established:
  - "Sequenced toast assertions: a create-then-retry-then-retry case asserting one toast, strictly narrowing failed sets, and a close on full success — because asserting only that a toast was raised passes whether the second replaced the first or stacked on it."
  - "seed.sh grows read subcommands (board-full) so an e2e spec can assert what actually persisted while the corresponding UI is still a later phase's scope."

requirements-completed: []

coverage:
  - id: D1
    description: "A signed-in user creates a board from the sidebar and it appears in the sidebar immediately, without a reload."
    requirement: "BOARD-02"
    verification:
      - kind: e2e
        ref: "e2e/boards-create.e2e.spec.ts#BOARD-02: create a board"
        status: pass
    human_judgment: false
  - id: D2
    description: "The create form opens with exactly three empty column rows; rows can be added beyond three and removed down to zero, and zero named columns is a valid submission."
    requirement: "BOARD-02"
    verification:
      - kind: integration
        ref: "src/features/boards/components/add-board-modal.test.tsx#opens with exactly three empty column rows"
        status: pass
      - kind: integration
        ref: "src/features/boards/components/add-board-modal.test.tsx#removes rows one at a time, down to none at all"
        status: pass
      - kind: integration
        ref: "src/features/boards/components/add-board-modal.test.tsx#submits with an empty column set when there are no rows"
        status: pass
    human_judgment: false
  - id: D3
    description: "Creation issues one board create then one column create per non-empty name, strictly in order, producing ascending backend positions."
    requirement: "BOARD-02"
    verification:
      - kind: e2e
        ref: "e2e/boards-create.e2e.spec.ts — reads the board back and asserts columns [Todo, Doing] at positions [0, 1]"
        status: pass
      - kind: other
        ref: "grep -cE 'Promise\\.(all|allSettled|race)' src/features/boards/actions/create-board-columns.ts -> 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "A partial column failure keeps what succeeded: the modal closes, the app navigates to the new board, and one danger toast names the failed count with a scoped retry."
    verification:
      - kind: integration
        ref: "src/features/boards/components/board-list.test.tsx#still closes the modal and navigates when some columns failed"
        status: pass
      - kind: integration
        ref: "src/features/boards/components/board-list.test.tsx#narrows one failure toast across successive retries and closes it when the last column lands"
        status: pass
    human_judgment: true
    rationale: "The component-level sequence proves the toast count, the narrowing and the close, but it drives a programmable stub, not a real backend refusal. Whether a deliberately-blocked column request behaves this way in a real browser is checkpoint steps 9 and 10, which have not been run."
  - id: D5
    description: "A failed board create keeps the modal open with the entered name and column rows intact and shows an inline error."
    verification:
      - kind: integration
        ref: "src/features/boards/components/add-board-modal.test.tsx#keeps the typed name and shows an inline error when the submit handler reports failure"
        status: pass
    human_judgment: true
    rationale: "Proven against a local failing submit handler. The real path (a blocked board-create request) is checkpoint step 8 and has not been run."
  - id: D6
    description: "userId reaching the external API comes only from the verified session record, never from the action's own arguments."
    verification:
      - kind: other
        ref: "grep -nE 'userId' on both action files — only params.query.userId = record.id"
        status: pass
      - kind: unit
        ref: "src/features/boards/schemas.unit.test.ts#drops an unrelated userId supplied alongside the name"
        status: pass
      - kind: e2e
        ref: "e2e/boards-list.e2e.spec.ts#BOARD-02: cross-account board isolation"
        status: pass
    human_judgment: false
  - id: D7
    description: "Visual and interaction sign-off across both themes and viewports, including long names and the collapse-state-survives-create case."
    verification: []
    human_judgment: true
    rationale: "Task 4's checkpoint:human-verify (gate=blocking-human) has not been run — it is where this plan stopped."

duration: 49 min
completed: 2026-08-24
status: halted
---

# Phase 02 Plan 10: Create a Board Summary

**BOARD-02's two Server Actions, dynamic column rows, and a board-scoped failure toast that narrows on each retry — proved against the real deployed nonprod backend by `e2e/boards-create.e2e.spec.ts`; halted at Task 4's `gate="blocking-human"` checkpoint, which has not been run.**

## Performance

- **Duration:** 49 min
- **Started:** 2026-08-24T16:16:55Z
- **Stopped at checkpoint:** 2026-08-24T17:06:11Z
- **Tasks:** 3 of 4 complete (Task 4 is the blocking human checkpoint)
- **Files created/modified:** 28

## Accomplishments

- `createBoardAction` and `createBoardColumnsAction`, both ordered exactly as `docs/adr/tech/0019` prescribes — `verifySession()`, then `.safeParse()`, then the upstream call, then `refresh()` from `next/cache`. Neither reads `userId` from its own arguments.
- The column loop is a serial `for...of` with an awaited call per name; a name the schema rejects never leaves this app's server, and a name the backend refuses is recorded as failed without aborting the rest (ADR domain/0003).
- `AddBoardModal`: a controlled modal with three seeded empty column rows, add/remove down to zero, per-row validation that lets a blank row through, and both dismissal guards (`isDismissableOnBackdropClick={!isPending}` plus a guarded `onOpenChange`).
- One danger toast per board, raised under a stable board-scoped id. A retry that partially fails upserts the same toast with the smaller set; a retry that fully succeeds closes it.
- `e2e/boards-create.e2e.spec.ts` proves the whole flow against the real deployed nonprod backend, including reading the created board back and asserting its columns are `[Todo, Doing]` at positions `[0, 1]`.

## Task Commits

1. **Task 1 (tracer): create a board end to end** — `532ec63` (feat)
2. **Task 2: optional initial columns, created sequentially** — `a1f88b4` (feat)
3. **Task 3: surface and retry a partial column failure, prove BOARD-02 e2e** — `9b055d4` (feat)

## Verification Run

| Gate | Result |
|------|--------|
| `pnpm test` (all 5 Vitest projects) | 55 files, 652 tests passed |
| `pnpm test:a11y` | 18 files, 109 tests passed, zero axe violations |
| `pnpm test:e2e` (real nonprod backend) | 30 specs passed, `boards-create` included |
| `pnpm build` | clean |
| `pnpm exec tsc --noEmit` | zero errors |
| `pnpm lint`, `format:check`, `routes:check`, `handlers:check`, `comments:check`, `stories:check` | all exit 0 |

## Deviations from Plan

### 1. [Rule 3 - Blocking] No `*.integration.test.ts` files; that coverage moved to Playwright e2e

- **Found during:** Task 1
- **Issue:** The plan instructs both actions to be covered by a `*.integration.test.ts` in the `node` project, "following `load-boards.integration.test.ts`'s exact structure — the same `next/headers` cookie-jar shim with its justifying disable reason". Three things make that impossible as written: `load-boards.ts` was renamed `fetch-boards.ts`; **no `*.integration.test.ts` file exists anywhere in the repo** (phase 02.2 deleted all four); and the `next/headers` shim was formally retired by `docs/adr/tech/0025`, with `no-restricted-properties` set to `"error"` so re-introducing it is lint-blocking. Beyond policy, it is mechanically impossible: `verifySession()` reads `cookies()`, `externalApi`'s session-bridging middleware calls `verifySession()` on every request, and `refresh()` throws outright unless `workUnitStore.phase === "action"` — so neither action, nor any factored-out core of one, can execute outside a real Next.js request scope.
- **Fix:** Took ADR tech/0025's own prescribed destination — "interaction coverage that depends on a real action's effect ... moves to Playwright e2e instead, which runs against a real Next.js server". The action behaviours are covered by: `e2e/boards-create.e2e.spec.ts` (real create, real columns, real ordering), the existing `e2e/boards-list.e2e.spec.ts` cross-account isolation spec, unit tests over every schema and the model function, and structural greps in the acceptance criteria.
- **Not covered as a result:** the unauthenticated branch and the schema-invalid branch of each action are proven only by reading the code and by the schemas' own unit tests, not by an executed call. The wire-payload attack shape (`userId` supplied in the argument object) is proven at the schema level, not at the action level.
- **Files:** `e2e/boards-create.e2e.spec.ts`, `e2e/seed.sh`, `e2e/seed.ts`
- **Commit:** `9b055d4`

### 2. [Rule 4 - Contradicted plan fact] Duplicate board names are rejected, not allowed

- **Found during:** Task 3
- **Issue:** The plan states as a `must_haves` truth and a success criterion that "Duplicate board names are allowed — creating a board whose name another board already has succeeds", and checkpoint step 5 asks a human to confirm it. The first e2e run failed on that assertion. Probed directly against the real nonprod backend: the second create returns **`409 Conflict`, `code: "DUPLICATE_RESOURCE"`, `detail: "Board with that name already exists"`**. The claim was never verified — `02-BACKEND-FACTS.md` has no probe for it.
- **Fix:** No code change. The app already handles it correctly: the 409 lands on `createBoardAction`'s error branch, so the modal stays open with the entered values and a generic inline error — exactly D-05's treatment. The e2e spec now creates a differently-named second board and asserts D-12's newest-first ordering instead, which is a real, verified business fact.
- **Decision needed:** whether a user hitting this deserves better copy than "Couldn't create board. Try again." (02-UI-SPEC's D-05 row sanctions the generic message, so authoring duplicate-specific copy would exceed the Copywriting Contract), and whether the product actually wants duplicate names permitted — which would be a backend change, not a frontend one. **Checkpoint step 5 should be treated as withdrawn, not failed.**
- **Files:** `e2e/boards-create.e2e.spec.ts`
- **Commit:** `9b055d4`

### 3. [Rule 3 - Blocking] `zodErrorToFieldErrors` promoted to `lib/core/api-contract/`

- **Found during:** Task 1
- **Issue:** Both new actions need auth's `zodErrorToFieldErrors`, but `eslint-plugin-boundaries` forbids a `feature -> feature` import, so `features/boards/` cannot import it from `features/auth/schemas.ts`.
- **Fix:** Moved it to `src/lib/core/api-contract/zod-field-errors.ts` — precisely what ADR tech/0024 prescribes ("promoted to `lib/core/api-contract/`" once a second domain needs the identical shape) — and repointed auth's three importers. No behaviour change; auth's existing unit coverage of it is unchanged and still passing.
- **Files:** `src/lib/core/api-contract/zod-field-errors.ts`, `src/features/auth/schemas.ts`, `src/features/auth/actions/sign-in.ts`, `src/features/auth/actions/sign-up.ts`, `src/features/auth/schemas.unit.test.ts`
- **Commit:** `532ec63`

### 4. [Rule 1 - Bug] The new `ToastProvider` decorator rendered a second live region in the Toast stories

- **Found during:** Task 1
- **Issue:** Adding `ToastProvider` as a global Storybook decorator broke `toast.test.tsx` — `toast.stories.tsx` mounts its own provider to inject a pre-seeded manager, so two `Toast.Viewport` live regions rendered and `getByRole("region", { name: "Notifications" })` found two elements.
- **Fix:** The decorator reads a `parameters.toast.hasOwnProvider` opt-out; `toast.stories.tsx` sets it.
- **Files:** `.storybook/preview-annotations.tsx`, `src/components/ui/toast/toast.stories.tsx`
- **Commit:** `532ec63`

### 5. [Rule 1 - Bug] `sidebar.test.tsx`'s raw `document.body.innerHTML = ""` wipe

- **Found during:** Task 1
- **Issue:** One sidebar test wiped `document.body.innerHTML` directly. That was harmless while nothing portalled into `body`; once the ToastProvider decorator mounted a portal, the wipe orphaned it and the next unmount threw `NotFoundError: Failed to execute 'removeChild' on 'Node'` — the exact failure `docs/adr/tech/0025` documents for that anti-pattern.
- **Fix:** Replaced with `vitest-browser-react`'s own `cleanup()`.
- **Files:** `src/components/layout/sidebar/sidebar.test.tsx`
- **Commit:** `532ec63`

### 6. [Rule 1 - Bug] The add-board form kept its values after a successful create

- **Found during:** Task 3
- **Issue:** `AddBoardModal` stays mounted while closed, so reopening it after a successful create showed the previous board's name and column rows.
- **Fix:** `BoardList` keys the modal on an open counter, so each fresh open remounts an empty form. A failed create still keeps its values because the modal never closes (D-05).
- **Files:** `src/features/boards/components/board-list.tsx`
- **Commit:** `9b055d4`

### 7. [Rule 3 - Blocking] Test-infrastructure additions the plan did not name

- `src/test-utils/next-router-shims.tsx` gained an optional `push` — the shim only exposed `refresh`, and `useCreateBoard` navigates.
- `src/test-utils/create-board-columns-action-storybook-stub.ts` is programmable (queued failed-name sets plus recorded calls) rather than a fixed no-op, because Task 3's narrowing sequence needs controllable failures and `vi.mock` is banned. It follows `sign-out-action-storybook-stub.ts`'s exported-counter precedent — a real aliased module a test configures, not a mock.
- `e2e/seed.sh` gained a `board-full` read subcommand so the e2e spec can assert the columns a create actually persisted; the board-detail view is Phase 3 scope, so there is nothing on screen to read them from.
- **Commits:** `532ec63`, `a1f88b4`, `9b055d4`

## TDD Gate Compliance

Both `tdd="true"` tasks were written test-first and the RED phase was **executed and observed** (Task 1: 7 new schema assertions failing; Task 2: 10 new schema/model assertions failing, plus an unresolved-import failure for `model.ts`). Neither RED phase could be **committed as its own `test(...)` commit**: the repository's blocking pre-commit ESLint gate rejects any commit referencing a not-yet-existing export with 39 `@typescript-eslint/no-unsafe-*` errors, and `--no-verify` is not permitted. Tests were therefore committed together with the implementation they drove, as `feat(...)` commits. The gate sequence `test(...) -> feat(...)` is consequently **absent from the git log for this plan** — a real, disclosed deviation from the TDD gate, not an oversight.

## Issues Encountered

- The first `pnpm test:e2e` invocation failed at `global-setup.ts` because Playwright does not load `.env.local` — only `next build`/`next dev` do. Resolved by invoking Playwright through `node --env-file=.env.local node_modules/@playwright/test/cli.js`. The env keys themselves were verified present without printing their values. This is a local-invocation detail, not a code defect, but it will bite the next person who runs e2e outside CI.
- An initial `toHaveAccessibleName` assertion on `sidebar.getByRole("link").first()` was racy against `refresh()`'s re-render. Replaced with `toHaveText([...])` over the whole locator list, which retries the array as a unit and is a stronger assertion besides.

## Observations Not Acted On

- **`CONVENTIONS.md` contradicts `docs/adr/tech/0019` on where `refresh()` lives.** Its "Data fetching & mutations" and "Server entry points" sections both say the *client caller* invokes `router.refresh()` after a mutating Server Action. ADR tech/0019 — which those same bullets cite — says the *Server Action itself* calls `refresh()` from `next/cache`, and lists calling it anywhere else as Anti-pattern 1. This plan followed the ADR. The CONVENTIONS wording appears to be a leftover from the pre-02.1 Route-Handler era and will mislead the next plan; correcting it is a documentation change outside this plan's files.
- The board-detail route is still the Phase 1 placeholder, so a newly created board's columns are not visible in the app — only through the backend. That is Phase 3 scope, not a gap in this plan.

## Known Stubs

None introduced by this plan. Every component rendered is wired to a real data source or an explicit prop.

## User Setup Required

None — no external service configuration is required. The verification environment for Task 4 has been prepared (see below).

## Next Phase Readiness

**This plan is halted at Task 4, a `checkpoint:human-verify` carrying `gate="blocking-human"`.** It is not complete and `BOARD-02` is deliberately not marked complete in `requirements-completed`.

Prepared for that checkpoint:

- Dev server running at **http://localhost:3000** (started from this worktree; it dies with the worktree).
- Throwaway account seeded against the real nonprod backend with one board ("Platform Launch"):
  - email: `e2e-35a2f555-aedb-44b9-8444-c2d73e50e84f@example.com`
  - password: `E2eFixturePwd1!`
- **Checkpoint step 5 (duplicate names succeed) should be treated as withdrawn** — see deviation 2. The backend refuses duplicates with a 409.

Once signed off, plans 02-11 through 02-13 can build on the two Server Actions, the modal, and the toast-under-a-stable-id pattern this plan establishes.

## Self-Check: PASSED

- FOUND: all 12 files listed under `key-files.created`
- FOUND commits `532ec63`, `a1f88b4`, `9b055d4`
- Full `pnpm test` (652), `pnpm test:a11y` (109) and `pnpm test:e2e` (30) suites re-run green at HEAD

---
*Phase: 02-board-management*
*Halted at Task 4 checkpoint: 2026-08-24*
