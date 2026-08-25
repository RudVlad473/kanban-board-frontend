---
phase: 02-board-management
plan: 15
subsystem: testing
tags: [storybook, vitest, typescript-compiler-api, repository-gates, adr, eslint-alternatives]

# Dependency graph
requires:
  - phase: 02-board-management (plan 02-14)
    provides: the wave-9 refactor baseline this plan's declaration extraction builds on
  - phase: 02.2-unify-component-tests-fully-onto-storybook-stories-eliminate
    provides: ADR tech/0025's direct-composed-story-rendering rule, which this plan makes mechanical
provides:
  - "scripts/check-tsx-declarations.mjs — a blocking, dependency-free gate on what a .tsx file may declare (D-28)"
  - "scripts/check-story-only-renders.mjs — a blocking gate on a *.test.tsx rendering a sibling component instead of a composed story (D-29)"
  - "23 declarations extracted out of 12 .tsx files into sibling non-.tsx modules"
  - "add-board-modal.test.tsx rewritten onto named per-prop-combination stories, 20 -> 21 cases"
affects: [any future component or component test; ADR tech/0025 and tech/0027; CI quality job]

actuals:
  tokens: 25000
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Repository gate as a hand-written script parsing with the already-installed TypeScript compiler API, not an ESLint rule"
    - "Compound-component namespace objects permitted structurally, never by an exempt-path list"
    - "Story-arg fn() spies read off a composed story's own args, replacing props spread onto a story"

key-files:
  created:
    - scripts/check-tsx-declarations.mjs
    - scripts/check-tsx-declarations.unit.test.mjs
    - scripts/check-story-only-renders.mjs
    - scripts/check-story-only-renders.unit.test.mjs
    - src/components/ui/button/button-variants.ts
    - src/components/ui/checkbox/checkbox-variants.ts
    - src/components/ui/dropdown/dropdown-variants.ts
    - src/components/ui/dropdown/dropdown-context.ts
    - src/components/ui/icon-button/icon-button-variants.ts
    - src/components/ui/switch/switch-variants.ts
    - src/components/ui/text-field/text-field-variants.ts
    - src/components/ui/toast/toast-variants.ts
    - src/components/ui/toast/use-toast.ts
    - src/features/theme/model.ts
  modified:
    - src/features/boards/components/add-board-modal.tsx
    - src/features/boards/components/add-board-modal.test.tsx
    - src/features/boards/components/add-board-modal.stories.tsx
    - src/features/boards/schemas.ts
    - src/features/boards/model.ts
    - src/features/auth/schemas.ts
    - src/features/auth/model.ts
    - vitest.setup.ts

key-decisions:
  - "D-28a: both gates are hand-written dependency-free scripts (own-checkers), adding no npm package"
  - "D-28b: every live declaration site extracted, including all nine cva calls; only app/ framework-forced exports and src/test-utils/ are exempt"
  - "D-28c: compound-component namespace objects are a fifth permitted declaration kind, recognised structurally"
  - "D-29a: the story rule is enforced by the same own-checkers mechanism, because the rule is about the render and not the import graph"
  - "storybook/test's fn() was used for the story-arg spies; it did not break the browser project's bundling, so the plain call-recording fallback was not needed"

patterns-established:
  - "Gate scripts: pure exported finder + CLI behind an import.meta.url guard, globbing through scripts/glob-real-files.mjs, failing with an ADR-citing message"
  - "Spy hygiene for shared story args: one clearAllMocks() in vitest.setup.ts's single global afterEach, proven by a dedicated case rather than asserted by inspection"

requirements-completed: []

coverage:
  - id: D1
    description: "check-tsx-declarations.mjs gates what a .tsx file may declare, and the whole repository passes it"
    requirement: BOARD-02
    verification:
      - kind: unit
        ref: "scripts/check-tsx-declarations.unit.test.mjs"
        status: pass
      - kind: other
        ref: "node scripts/check-tsx-declarations.mjs (exit 0, repo-wide)"
        status: pass
    human_judgment: false
  - id: D2
    description: "23 declarations extracted out of 12 .tsx files with no behavior change"
    requirement: BOARD-02
    verification:
      - kind: unit
        ref: "pnpm test:unit (99 passing)"
        status: pass
      - kind: integration
        ref: "pnpm test:browser (424 passing), pnpm build, pnpm exec tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D3
    description: "add-board-modal.test.tsx renders composed stories only, on named per-prop-combination stories, with no assertion lost"
    requirement: BOARD-02
    verification:
      - kind: integration
        ref: "pnpm test:browser (424 passing); case names diffed old-vs-new, 20 -> 21 with every original preserved"
        status: pass
      - kind: automated_ui
        ref: "pnpm test:a11y (115 passing, zero axe violations)"
        status: pass
    human_judgment: false
  - id: D4
    description: "check-story-only-renders.mjs is green repo-wide and both gates block in CI, with three Enforcement lines rewritten"
    requirement: BOARD-02
    verification:
      - kind: other
        ref: "node scripts/check-story-only-renders.mjs (exit 1 — 121 violations across 10 pre-existing files)"
        status: fail
    human_judgment: true
    rationale: "Blocked on an unsettled scope decision, not on implementation — see Issues Encountered. Resolving it requires a human choice between rewriting the primitives test suite and narrowing a published ADR rule."

# Metrics
duration: 14min
completed: 2026-08-25
status: blocked
---

# Phase 02 Plan 15: Mechanical Enforcement for the `.tsx` Declaration and Story-Only-Render Rules Summary

**Both repository gates are built, unit-tested and dependency-free, the declaration gate is green across the whole repository and its live violation is fixed, and `add-board-modal.test.tsx` now renders composed stories only — but the render gate turned out to be red on 10 pre-existing files the plan never surveyed, so Task 4 is blocked on a scope decision rather than on implementation.**

## Performance

- **Duration:** ~14 min (this continuation session; the plan spans three sessions)
- **Started:** 2026-08-25T14:04:00Z (continuation)
- **Completed:** 2026-08-25T14:18:00Z (halted at Task 4)
- **Tasks:** 3 of 4 complete
- **Files modified:** 40

## Accomplishments

- Both gates exist as hand-written scripts parsing with the already-installed TypeScript compiler API, each with a co-located `*.unit.test.mjs` covering known-bad and known-good fixtures. **No npm package was added**, so the phase's Package Legitimacy Audit claim still holds and no legitimacy gate was triggered.
- `check-tsx-declarations.mjs` is **green across the entire repository**. 23 declarations moved out of 12 `.tsx` files: the modal's schema, derived types, row factory and column-row path to the boards feature's `schemas.ts`/`model.ts`; the duplicated auth pair to the auth feature's; `TOGGLE_LABEL` to a new theme `model.ts`; all nine `cva()` constants and `DropdownContext` to sibling `.ts` modules; `useToast` to its own module. `add-board-modal.tsx` now declares exactly two things.
- `buildColumnRowPath` replaces the in-component stringify-then-assert dance, taking the type assertion out of the `.tsx` entirely and making it unit-testable for the first time.
- `add-board-modal.test.tsx` renders composed stories only — the component is neither imported nor rendered, no props are spread onto a story, and the stateful failure host moved into the stories file as a story `render` function. Case count rose 20 → 21 and every original case name survives verbatim; all six negative submit-handler assertions survive by reading `fn()` spies off each story's own args.
- Spy hygiene is proven rather than assumed: `vitest.setup.ts`'s single global `afterEach` gained `clearAllMocks()`, and a dedicated case renders a story an earlier case already submitted through and asserts the count starts at zero.

## Task Commits

1. **Task 1: Settle both enforcement mechanisms and the exemption surface** — `a834f63` (docs)
2. **Task 2: Build both gates and fix every declaration violation** — `0726976` (feat)
3. **Task 3: Rewrite `add-board-modal.test.tsx` onto per-prop-combination stories** — `e38597d` (test)
4. **Deviation fix: route-wrapper carve-out in the render gate** — `7e5abef` (fix)

**Task 4: NOT EXECUTED** — blocked, see Issues Encountered.

## Verification Run

Everything below was run in this session, on this worktree, after `pnpm install` and `pnpm build`:

| Check | Result |
|---|---|
| `node scripts/check-tsx-declarations.mjs` | exit 0, repo-wide |
| `node scripts/check-story-only-renders.mjs` | **exit 1 — 121 violations, 10 files** (blocker) |
| `pnpm test:browser` | 21 files / 424 tests passing |
| `pnpm test:a11y` | 18 files / 115 tests passing, zero axe violations |
| `pnpm test:unit` | 10 files / 99 tests passing |
| `pnpm exec vitest run --project node scripts/check-story-only-renders` | 10 passing |
| `pnpm lint`, `pnpm format:check`, `pnpm comments:check`, `pnpm stories:check` | all exit 0 |
| `pnpm exec tsc --noEmit` | zero errors |
| `pnpm build` | exit 0 |

`pnpm exec tsc --noEmit` reports `app/layout.tsx(19,41): Cannot find name 'LayoutProps'` in a **fresh worktree that has never been built** — Next generates that global into `.next/types`. It is clean after `pnpm build`, and is a worktree-setup artifact rather than a code defect. Worth knowing before treating it as a regression in any future worktree run.

## Decisions Made

All four Task 1 decisions were made by the user at the `checkpoint:decision` and are recorded verbatim in `02-CONTEXT.md` as D-28a–c and D-29a. Summarised above under `key-decisions`.

One implementation decision fell to the executor: `storybook/test`'s `fn()` was used for the story-arg spies. The plan offered a fallback (a plain call-recording function in the stories file) in case `storybook/test` dragged Next.js internals into the "browser" Vitest project, which is the failure mode ADR tech/0025 documents for `@storybook/nextjs-vite`'s main entry. It did not — the browser project is green — so the fallback was not needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The render gate fired on route wrappers its own governing ADR exempts**

- **Found during:** Task 3 verification
- **Issue:** `check-story-only-renders.mjs` flagged `app/(dashboard)/error.test.tsx` and `app/global-error.test.tsx`. ADR tech/0025 carries forward tech/0021's route-file scope carve-out — `app/**/error.tsx` and `app/**/layout.tsx` are thin composition wrappers exempt from the stories requirement — and `CONVENTIONS.md` line 254 repeats it. Both files even carry an in-file comment citing the very carve-out being violated. A gate that fires on a shape its governing record permits is the gate being wrong, not the code.
- **Fix:** Exempt `error.test.tsx`, `global-error.test.tsx` and `layout.test.tsx` under `app/` by basename, with two unit cases — the carve-out reports none, and a non-wrapper `app/` route test is still flagged so the exemption cannot silently widen into "anything under `app/`".
- **Files modified:** `scripts/check-story-only-renders.mjs`, `scripts/check-story-only-renders.unit.test.mjs`
- **Verification:** `pnpm exec vitest run --project node scripts/check-story-only-renders` — 10 passing; the two files no longer appear in the gate's output.
- **Committed in:** `7e5abef`

**2. [Rule 1 — Bug] `add-board-modal.stories.tsx` failed `pnpm comments:check`**

- **Found during:** Task 3 verification
- **Issue:** The `meta` block's comment ran to 4 prose lines against a 3-line ceiling. Introduced by the interrupted Task 3 work, whose author never got as far as running `pnpm comments:check` — exactly the kind of gap the interruption left behind, and the reason the WIP commit was re-verified from scratch rather than trusted.
- **Fix:** Compressed to three lines, keeping the `docs/adr/tech/0025` pointer.
- **Files modified:** `src/features/boards/components/add-board-modal.stories.tsx`
- **Verification:** `pnpm comments:check` exits 0; `pnpm test:browser` re-run green afterwards.
- **Committed in:** `7e5abef`

### Plan Drift Corrected at Task 1

Three counts in the plan's own prose were wrong and were corrected before building:

- The `cva()` exemption surface is **9 calls across 7 files**, not 8 — `switch.tsx` declares three (`rootVariants`, `trackVariants`, `thumbVariants`), not one.
- `add-board-modal.test.tsx` carried **20** cases, not the "nineteen" the plan states twice. 20 was the floor the rewrite could not fall below; it landed at 21.
- The `.tsx` rule needed a **fifth** permitted declaration kind, not the four the plan specifies: the compound-component namespace object (`export const Toast = { Root, Content, ... }`) in `toast.tsx`, `dropdown.tsx`, `menu.tsx` and `modal.tsx` is neither a component nor a prop type, but is this project's own documented pattern. Implemented structurally — an object literal whose every property value references a component declared earlier in the same file — so a future compound component is covered without editing the checker or the ADR.

### Criterion Wording Correction

Task 3's criterion `grep -c 'composeStories' … returns exactly 1` cannot be satisfied by any conformant file: `grep -c` counts matching **lines**, and every conformant test has two (the import and the `composeStories(stories)` call). The plan's own named exemplar, `sign-in-form.test.tsx`, also returns 2. The criterion's intent — exactly one `composeStories(stories)` call site — is met.

## Issues Encountered

### The interruption and its recovery

The original executor was killed mid-Task-3 by an API usage-limit error — an infrastructure failure, not a plan failure and not a checkpoint. It had reported "691 passing… running the a11y suite and Task 3's remaining criteria" moments before, meaning it believed the implementation correct but had **not** confirmed it. The orchestrator preserved the uncommitted work as a WIP commit (`e09c051`) and pushed it, then dispatched this continuation.

This continuation fast-forwarded onto that commit and re-ran every Task 3 acceptance criterion from scratch rather than trusting the WIP. That was the right call: the work was substantially correct, but it did carry a real `pnpm comments:check` failure (deviation 2 above) that would otherwise have reached CI. The WIP commit was then reworded into `e38597d` with a proper `test(02-15):` message so no `wip:` commit survives in history.

Tasks 1 and 2 were also spot-checked against their own acceptance criteria rather than trusted from their commit messages. Both hold up — with the one exception below, which is what blocks the plan.

### BLOCKER — the render gate is red on 10 files the plan never surveyed

**This is why Task 4 was not executed, and it needs a human decision.**

Task 2's commit message claims "the render gate is red on exactly the violation Task 3 fixes." That is false. With `add-board-modal.test.tsx` now clean and the route-wrapper carve-out honoured, the gate still reports **121 violations across 10 files**:

| File | Violations | Cases |
|---|---:|---:|
| `src/components/ui/dropdown/dropdown.test.tsx` | 34 | 14 |
| `src/components/ui/modal/modal.test.tsx` | 17 | 10 |
| `src/components/ui/text-field/text-field.test.tsx` | 15 | 16 |
| `src/components/ui/button/button.test.tsx` | 15 | 14 |
| `src/components/ui/checkbox/checkbox.test.tsx` | 12 | 15 |
| `src/components/ui/menu/menu.test.tsx` | 11 | 9 |
| `src/components/ui/icon-button/icon-button.test.tsx` | 8 | 10 |
| `src/components/ui/switch/switch.test.tsx` | 6 | 8 |
| `src/components/layout/error-fallback/error-fallback.test.tsx` | 2 | 7 |
| `src/components/ui/toast/toast.test.tsx` | 1 | 13 |

**The gate is not over-firing.** It implements exactly the rule Task 2's action text specifies, and these are genuine violations of ADR tech/0025's Decision Outcome and `CONVENTIONS.md`'s "Component tests from stories" second bullet. All ten files are *mixed*: each composes stories for its shallow cases and then direct-renders the raw component for its deep-interaction cases, several under an explicit in-file comment reading "Deep: real pointer/keyboard interaction and computed style — stay direct renders."

That comment is the finding. The primitives suite was written, and code-reviewed, on the understanding that direct rendering is acceptable for deep-interaction cases — while the ADR says every prop combination must be a named story. This is the plan's own thesis (review-only enforcement fails) confirmed at roughly **13x the scale the plan assumed**: it believed there was one violating file with nine call sites, and budgeted Task 3 accordingly.

Neither way forward is the executor's call, which is why this halted under deviation Rule 4:

- **Rewrite all ten files** onto per-prop-combination stories. ~116 cases and ~121 call sites, plus `fn()` spies in ten `meta.args` blocks and a large number of new stories that the `storybook` and a11y projects would then also render. `add-board-modal.test.tsx` alone — 21 cases, 9 call sites — consumed Task 3's entire budget. None of these files appear in this plan's `files_modified`.
- **Exempt the primitives library** in ADR tech/0027/0025 with a tracked migration follow-up. Cheap, but it narrows a published rule across 9 of the repo's ~12 component-test suites, and Task 4 would then publish Enforcement lines claiming mechanical coverage while the majority of component tests sit outside it. That is precisely threat **T-02-54** in this plan's own register ("a false coverage claim is a real defect class here, not a documentation nicety") and precisely the plan's prohibition that an Enforcement line must never name a mechanism before it actually blocks. Doing this silently would be the worst available outcome.

The precedent points at escalation: Task 1 already escalated a `checkpoint:decision` over whether to exempt **9** `cva` constants. Exempting an entire 116-case test suite is far larger and belongs to the same decision-maker.

Whichever is chosen, Task 4 remains fully specified and unstarted — `package.json` scripts, two CI `quality` steps, ADR tech/0027, ADR tech/0025's Enforcement line and Consequences note, two `CONVENTIONS.md` Enforcement claims, and the deliberate-violation exercise of each gate.

## Requirements

`BOARD-02` is **not** marked complete. The plan's own success criteria include "Both rules block in CI" and "No Enforcement line for either rule still says code review", neither of which is true yet.

## Next Steps

1. Settle the blocker above (rewrite the primitives suite, or record a scoped exemption).
2. Execute Task 4 against that answer.
3. Run `pnpm test:e2e` — the plan's `<verification>` calls for it against the real nonprod backend and it was not run in this session.

## Self-Check: PASSED

All nine claimed artifacts verified present on disk. All four commit hashes
(`a834f63`, `0726976`, `e38597d`, `7e5abef`) verified in `git log`.
