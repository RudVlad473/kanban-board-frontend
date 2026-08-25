---
phase: 02-board-management
plan: 14
subsystem: ui
tags: [typescript, react, discriminated-union, usehooks-ts, enum-like-constants, refactor]

# Dependency graph
requires:
  - phase: 02-board-management (plan 02-10)
    provides: the theme-toggle and dashboard-layout call sites that hold two of the eighteen status discriminants
  - phase: 01-foundation
    provides: the auth Server Actions, `AuthActionState`, and the six Storybook action stubs this plan migrates
provides:
  - "`RESULT_STATUS` — one enum-like constant declaring every result/status discriminant, plus the derived `ResultStatus` union"
  - "All 18 previously-independent discriminant sites reading from that single declaration"
  - "`ok`/`success` folded into one `SUCCESS` member — the two spellings of 'the call worked' no longer coexist"
  - "`usehooks-ts@3.1.1` as an exactly-pinned runtime dependency, cleared through a blocking-human legitimacy gate"
  - "Four boolean toggle call sites running on `useBoolean` instead of a hand-rolled `useState` pair"
  - "CONVENTIONS.md rules for both — the status-discriminant bullet rewritten to name the shared module, and a new Boolean UI state section"
affects: [02-11 board detail, 02-12 board rename, 02-13 board delete, 02-15 tsx-declaration-gate, any future Server Action or toggle-state component]

actuals:
  tokens: 26800
  tasks: 4
  commits: 3

tech-stack:
  added: ["usehooks-ts@3.1.1 (exact pin; transitively lodash.debounce@4.0.8)"]
  patterns:
    - "Result discriminants declared once in `lib/core/api-contract/result-status.ts`; type position is `typeof RESULT_STATUS.X`, value position `RESULT_STATUS.X`"
    - "Boolean toggle state via `useBoolean`, destructured object (never `useToggle`'s tuple), setters renamed for the action they perform"

key-files:
  created:
    - src/lib/core/api-contract/result-status.ts
  modified:
    - CONVENTIONS.md
    - package.json
    - pnpm-lock.yaml
    - src/components/layout/sidebar/sidebar.tsx
    - src/features/boards/components/board-list.tsx
    - src/features/auth/components/sign-in-form.tsx
    - src/features/auth/components/sign-up-form.tsx
    - src/features/boards/server/fetch-boards.ts
    - src/features/boards/actions/create-board.ts
    - src/features/boards/actions/create-board-columns.ts
    - src/features/theme/actions/update-theme.ts
    - src/features/auth/actions/sign-in.ts
    - src/features/auth/actions/sign-up.ts
    - src/features/auth/action-state.ts
    - src/features/theme/hooks/use-theme-preference.ts
    - src/features/boards/hooks/use-create-board.ts
    - app/(dashboard)/layout.tsx
    - src/test-utils/create-board-action-storybook-stub.ts
    - src/test-utils/create-board-columns-action-storybook-stub.ts
    - src/test-utils/sign-in-action-storybook-stub.ts
    - src/test-utils/sign-up-action-storybook-stub.ts
    - src/test-utils/sign-out-action-storybook-stub.ts
    - src/test-utils/update-theme-action-storybook-stub.ts

key-decisions:
  - "Task 1 checkpoint selected `asvs-aligned`: one constant, SCREAMING_SNAKE keys AND values per ADR tech/0012, `ok` folded into `SUCCESS`, at `src/lib/core/api-contract/result-status.ts`"
  - "`IDLE` lives in the same constant as the four server-result branches rather than in a separate `FORM_STATUS` — splitting would have put `ERROR` in two constants, reintroducing the duplication one level up"
  - "No runtime guard function on `ResultStatus` — nothing parses an untrusted value into it, so a guard would be untested surface"
  - "`usehooks-ts` approved at the blocking-human gate, with the user additionally requiring an exact pin (`3.1.1`, no range operator) to match every other entry in package.json"
  - "`use-overflow-indicator.ts`'s `isOverflowing` deliberately stays on `useState` — a boolean assigned from a layout measurement is not toggle state"

patterns-established:
  - "Single-declaration discriminants: a discriminated-union result type never retypes its discriminant as a bare literal at any call site"
  - "Storybook action stubs migrate in the same commit as the real action they alias, since stub drift compiles cleanly and only fails at render"
  - "Boolean UI state: `useBoolean` for toggled booleans, plain `useState` for derived/measured booleans, with both cases named in CONVENTIONS.md"

requirements-completed: [BOARD-01, BOARD-02]

coverage:
  - id: D1
    description: "`RESULT_STATUS` declares every result/status discriminant once; all 18 call sites import it and no bare discriminant literal survives outside the declaring module"
    verification:
      - kind: other
        ref: "pnpm exec tsc --noEmit (zero errors)"
        status: pass
      - kind: other
        ref: "grep -rnE '\\bstatus\\b[[:space:]]*(:|===|!==)[[:space:]]*\"' over src and app, excluding comments and result-status.ts — prints nothing"
        status: pass
      - kind: unit
        ref: "pnpm test — 55 files / 658 tests across all five Vitest projects, zero test files edited"
        status: pass
    human_judgment: false
  - id: D2
    description: "The `ok`/`success` duplication is gone — the sidebar read and the theme/board writes share one `SUCCESS` member, and board/auth/theme behavior is unchanged end to end"
    requirement: BOARD-01
    verification:
      - kind: e2e
        ref: "playwright --project=e2e — 30/30 passed (auth, boards-list, boards-create, theme, route-guard, session-bridge, cookie-policy)"
        status: pass
      - kind: unit
        ref: "pnpm test — 658/658, including fetch-boards, create-board and update-theme suites unedited"
        status: pass
    human_judgment: false
  - id: D3
    description: "The unauthenticated early-return guard in every Server Action and RSC read still precedes any upstream call — the rename did not turn an access-control branch unreachable (T-02-50)"
    verification:
      - kind: other
        ref: "verifySession precedes safeParse in create-board.ts (comment-filtered line-order check); tsc --noEmit narrows every branch"
        status: pass
      - kind: e2e
        ref: "e2e/route-guard.e2e.spec.ts — 5/5, including tampered and expired session cookies treated as unauthenticated"
        status: pass
    human_judgment: false
  - id: D4
    description: "`usehooks-ts` verified legitimate before install and pinned exactly at 3.1.1 in `dependencies` (T-02-SC)"
    requirement: BOARD-02
    verification:
      - kind: other
        ref: "node -e check on package.json dependencies — value is the literal \"3.1.1\", no range prefix"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 blocking-human gate — user reviewed npmjs.com/package/usehooks-ts and the linked repository and replied 'approved, let's make sure to pin it to exact version'"
        status: pass
    human_judgment: true
    rationale: "Package legitimacy is explicitly excluded from auto-approval (deviation Rule 3 exclusion + T-02-SC): only a human can judge whether a single-maintainer, eighteen-month-dormant package and its transitive `lodash.debounce` are acceptable supply-chain risk for this project."
  - id: D5
    description: "Four boolean toggle call sites run on `useBoolean`; sidebar collapse, create-board modal open/close and both password reveals behave exactly as before"
    verification:
      - kind: automated_ui
        ref: "pnpm test browser project — sidebar.test.tsx, board-list.test.tsx, sign-in-form.test.tsx, sign-up-form.test.tsx all pass unedited"
        status: pass
      - kind: other
        ref: "grep -c useBoolean in each of the four files returns 2; grep for useState(defaultIsExpanded|defaultIsAddBoardOpen|defaultPasswordRevealed) prints nothing"
        status: pass
    human_judgment: false
  - id: D6
    description: "CONVENTIONS.md's status-discriminant bullet and the new Boolean UI state section describe what the code actually does, not an intended endpoint"
    verification:
      - kind: other
        ref: "grep -c 'usehooks-ts' CONVENTIONS.md returns 1; the status bullet names src/lib/core/api-contract/result-status.ts as the single declaration"
        status: pass
    human_judgment: true
    rationale: "Whether prose accurately describes the code, and whether the rule is stated clearly enough that the next component does not hand-roll the pattern again, is a judgment no grep settles."

# Metrics
duration: 25min
completed: 2026-08-25
status: complete
---

# Phase 02 Plan 14: Shared Result Discriminant and `useBoolean` Adoption Summary

**One `RESULT_STATUS` constant replacing the discriminant retyped across 18 files (with `ok`/`success` folded into `SUCCESS`), plus `usehooks-ts@3.1.1` exactly pinned and `useBoolean` adopted at four toggle call sites**

## Performance

- **Duration:** ~25 min for this executor session (Tasks 3-4, verification, summary); Tasks 1-2 landed in a prior session ending 11:59 local
- **Started:** 2026-08-25T10:04:00Z (this session — fast-forward onto `f9a1880`)
- **Completed:** 2026-08-25T10:25:00Z
- **Tasks:** 4 (1 decision checkpoint, 1 human-verify checkpoint, 2 implementation)
- **Files modified:** 24 (23 tracked source/config files + 1 file created)

## Accomplishments

- **`src/lib/core/api-contract/result-status.ts`** declares `RESULT_STATUS` and the derived `ResultStatus` union, following `theme.ts`'s shape exactly — an `as const` object with SCREAMING_SNAKE keys and values per ADR tech/0012. Its docstring records that `PROBLEM_CODE.UNAUTHENTICATED` (the backend's error code) and `RESULT_STATUS.UNAUTHENTICATED` (this app's result branch) carry the same string on unrelated axes and are not interchangeable.
- **All 18 call sites migrated** — six producers, five consumers, the dashboard layout and the six Storybook action stubs — in type unions, returned objects and equality comparisons alike. The two spellings of success are now one member.
- **`usehooks-ts@3.1.1` installed** after the blocking-human legitimacy gate, pinned exactly with `--save-exact` at the user's explicit instruction. One transitive runtime dependency (`lodash.debounce@4.0.8`, MIT, zero deps); no install lifecycle script granted.
- **Four toggle call sites migrated to `useBoolean`**, each taking only the setters it uses: sidebar collapse takes `setTrue`/`setFalse`, board-list takes `setValue` for the caller-supplied open flag plus `setFalse` for the post-create close, and both auth forms take `toggle`.
- **Tree-shaking confirmed empirically, not assumed:** after `pnpm build`, no file under `.next/static/chunks` contains `lodash` or `debounce`. The grep is meaningful rather than vacuous — the same search for `Hide Sidebar` (a string from the migrated sidebar) does hit a chunk, so the client bundle was genuinely searched. `lodash.debounce` did not follow `useBoolean` into the client bundle.
- **Not one test file was edited** across either migration task, and the full suite is green: 55 files / 658 tests across all five Vitest projects.

## Task Commits

1. **Task 1: Settle the shared status constant's public shape** — checkpoint (decision), no commit. Selected `asvs-aligned`.
2. **Task 2: Declare the shared constant and migrate all 18 call sites** — `f9a1880` (refactor)
3. **Task 3: Package legitimacy gate for `usehooks-ts`** — `e8fecc3` (chore). The gate itself produced no code; the commit is the approved install, pinned exactly per the user's added instruction.
4. **Task 4: Adopt `useBoolean` for every genuinely-boolean toggle call site** — `ae515ac` (refactor)

## Files Created/Modified

- `src/lib/core/api-contract/result-status.ts` — **created.** The single declaration: `RESULT_STATUS` (`SUCCESS`/`ERROR`/`UNAUTHENTICATED`/`INVALID`/`IDLE`) and the derived `ResultStatus` union.
- `src/features/boards/server/fetch-boards.ts`, `src/features/boards/actions/create-board.ts`, `src/features/boards/actions/create-board-columns.ts`, `src/features/theme/actions/update-theme.ts`, `src/features/auth/actions/sign-in.ts`, `src/features/auth/actions/sign-up.ts` — producers; each returns through its declared result type, so no `as const` was needed.
- `src/features/boards/hooks/use-create-board.ts` — the two inline result objects inside `.catch()` handlers **kept** their existing `as const`; they are built with no contextual type, so deleting the assertion as "now redundant" would have silently widened the discriminant to `string` and stopped narrowing at every consumer.
- `src/features/auth/action-state.ts`, `src/features/auth/components/sign-in-form.tsx`, `src/features/auth/components/sign-up-form.tsx`, `src/features/theme/hooks/use-theme-preference.ts`, `app/(dashboard)/layout.tsx` — consumers.
- The six `src/test-utils/*-action-storybook-stub.ts` files — migrated in the same commit as the actions they alias.
- `src/components/layout/sidebar/sidebar.tsx` — `useBoolean` for collapse state, declared in the same position in the component body (outside the Suspense boundary wrapping the board-list slot, per plan 02-09) so toggling still never depends on the board fetch.
- `src/features/boards/components/board-list.tsx` — `useBoolean` for the create-modal open flag. `openCount` is a counter and was not touched.
- `package.json` / `pnpm-lock.yaml` — `usehooks-ts: "3.1.1"` under `dependencies`.
- `CONVENTIONS.md` — status-discriminant bullet rewritten to name the shared module; new **Boolean UI state** section added after **Component props**.

## Decisions Made

- **Task 1 checkpoint: `asvs-aligned`.** SCREAMING_SNAKE keys and values, matching `THEME` and `PROBLEM_CODE` two directories away and obeying ADR tech/0012 verbatim. Nothing serialises a status discriminant to storage or to the backend — the values cross the RSC wire but both ends ship together — so the casing change is safe, and it cost nothing extra because every one of the 18 sites was being edited anyway.
- **Task 3 gate: approved, with an exact pin.** The user reviewed the npm page and repository and replied "approved, let's make sure to pin it to exact version". Installed with `--save-exact`; `package.json` holds the literal string `"3.1.1"`, not a range.
- **Deliberate `useBoolean` exclusions,** each a decision rather than an oversight:
  - `src/hooks/use-overflow-indicator.ts`'s `isOverflowing` — assigned from `scrollWidth > clientWidth` and never toggled; `useBoolean` would only rename its setter and hand it four members no caller can use.
  - `board-list.tsx`'s `openCount` — numeric, not boolean.
  - `src/lib/client/query-client.tsx`'s lazy initializer — not boolean state.
  - `use-theme-preference.ts`'s theme and error strings — not boolean.
  - Stateful host components declared inside test files — test scaffolding, not application call sites.
- **No runtime guard on `ResultStatus`.** Nothing parses an untrusted value into this type, so a guard would be untested surface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Storybook auth stubs declared `code: string` where the real `AuthActionState` declares `code: ProblemCode`**

- **Found during:** Task 2 (migrating the six Storybook action stubs)
- **Issue:** Pre-existing stub drift, exactly the T-02-51 threat the plan names. The three auth stubs (`sign-in-action-storybook-stub.ts`, `sign-up-action-storybook-stub.ts`, `sign-out-action-storybook-stub.ts`) typed the error branch's `code` as a bare `string`, while `src/features/auth/action-state.ts` types it as `ProblemCode`. Because `vitest.config.ts`'s `serverActionStubAlias` substitutes the stub for the real action in the browser project, the widened type compiled cleanly and would only have surfaced as a failed render.
- **Fix:** Each stub now imports `type ProblemCode` from `@/lib/core/api-contract/problem-detail` and declares `code: ProblemCode`, matching the real action's result shape byte for byte.
- **Files modified:** `src/test-utils/sign-in-action-storybook-stub.ts`, `src/test-utils/sign-up-action-storybook-stub.ts`, `src/test-utils/sign-out-action-storybook-stub.ts`
- **Verification:** `pnpm exec tsc --noEmit` zero errors; the browser Vitest project renders every story that reaches a stub, all green
- **Committed in:** `f9a1880` (Task 2 commit)

**2. [Rule 3 - Blocking] `pnpm exec tsc --noEmit` failed on a missing Next.js generated global type before any build had run in this worktree**

- **Found during:** Task 4 verification
- **Issue:** `app/layout.tsx(19,41): error TS2304: Cannot find name 'LayoutProps'`. `LayoutProps` is generated by Next.js into `.next/types`, which does not exist in a freshly created worktree. Unrelated to this plan's changes.
- **Fix:** Ran `pnpm build` first (itself an acceptance criterion), then re-ran the typecheck. Zero errors. No source change was needed or made.
- **Files modified:** none
- **Verification:** `pnpm exec tsc --noEmit` exits 0 after the build
- **Committed in:** n/a — environment sequencing, not a code change

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both were necessary for correctness. The stub-drift fix is squarely inside the plan's own T-02-51 mitigation ("migrate each stub in the same pass as its action and diff the two result types against each other"), not scope creep.

## Issues Encountered

- **The first full e2e run reported 15 of 30 tests failing; a re-run with no code change in between passed 30/30.** The failures clustered on flows that needed the app server (sign-up not reaching `/boards`), and the first run's Playwright `webServer` was still executing `next build` as the suite started. Each affected spec also passes in isolation (`e2e/auth.e2e.spec.ts` alone: 7/7). Read as a cold-start artifact of a fresh worktree with no `.next` directory, not a regression — but recorded here rather than quietly dropping the first run, since the two runs genuinely disagreed.
- **`pnpm test:e2e` cannot read `NONPROD_RESET_TOKEN` from `.env.local` in this worktree.** `e2e/global-setup.ts` reads `process.env` directly and `playwright.config.ts` loads no dotenv, so the copied `.env.local` never reaches the Playwright node process. Worked around with `node --env-file=.env.local ./node_modules/@playwright/test/cli.js test --project=e2e`, which loads the file without printing it. Worth a config fix eventually; not touched here since it is outside this plan's scope.

## User Setup Required

None — no external service configuration required. `usehooks-ts@3.1.1` installs from the public registry with no lifecycle script and no credentials.

## Next Phase Readiness

- **02-11 (board detail), 02-12 (rename) and 02-13 (delete) can now be written against the replacement patterns** rather than adding three more instances of the ones just removed. That sequencing was the stated reason this refactor was inserted at wave 9.
- **BOARD-01 and BOARD-02 are not yet marked complete.** `requirements.ready-ids` reports both as blocked — plans 02-11/12/13 still carry them — so `REQUIREMENTS.md` was intentionally left unchanged.
- **Open follow-up, unclaimed by any plan:** both new CONVENTIONS.md rules state "Enforcement: code review". A lint rule banning bare status-discriminant literals is the intended endpoint for the first; the second has no mechanical gate either. Plan 02-15 already carries D-29's enforcement-mechanism work and would be the natural home for both.

---
*Phase: 02-board-management*
*Completed: 2026-08-25*
