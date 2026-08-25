---
phase: 02-board-management
plan: 15
subsystem: testing
tags: [storybook, vitest, typescript-compiler-api, repository-gates, adr, ci, eslint-alternatives]

# Dependency graph
requires:
  - phase: 02-board-management (plan 02-14)
    provides: the wave-9 refactor baseline this plan's declaration extraction builds on
  - phase: 02.2-unify-component-tests-fully-onto-storybook-stories-eliminate
    provides: ADR tech/0025's direct-composed-story-rendering rule, which this plan makes mechanical
provides:
  - "scripts/check-tsx-declarations.mjs — a blocking, dependency-free gate on what a .tsx file may declare, green repo-wide (D-28)"
  - "scripts/check-story-only-renders.mjs — a blocking gate on a *.test.tsx rendering a sibling component instead of a composed story, with a ratcheted 10-file exemption ledger (D-29)"
  - "pnpm tsx:check and pnpm renders:check, both wired into CI's quality job ahead of Build"
  - "docs/adr/tech/0027-tsx-declaration-scope.md — the .tsx declaration rule, its five permitted kinds and its two exemptions"
  - "23 declarations extracted out of 12 .tsx files into sibling non-.tsx modules"
  - "add-board-modal.test.tsx rewritten onto named per-prop-combination stories, 20 -> 21 cases"
affects: [any future component or component test; ADR tech/0025 and tech/0027; CONVENTIONS.md; CI quality job]

actuals:
  tokens: 37500
  tasks: 4
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Repository gate as a hand-written script parsing with the already-installed TypeScript compiler API, not an ESLint rule"
    - "Compound-component namespace objects permitted structurally, never by an exempt-path list"
    - "Story-arg fn() spies read off a composed story's own args, replacing props spread onto a story"
    - "Ratcheted migration ledger: pre-existing violations exempted by an in-script ceiling that may only fall, printed on every run, never a silent skip"

key-files:
  created:
    - scripts/check-tsx-declarations.mjs
    - scripts/check-tsx-declarations.unit.test.mjs
    - scripts/check-story-only-renders.mjs
    - scripts/check-story-only-renders.unit.test.mjs
    - docs/adr/tech/0027-tsx-declaration-scope.md
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
    - package.json
    - .github/workflows/ci.yml
    - CONVENTIONS.md
    - docs/adr/tech/0025-direct-composed-story-rendering.md
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
  - "Option B (user, 2026-08-25): the 10 pre-existing primitive suites are exempted from the render gate with a tracked migration, not rewritten in this plan — and the exemption is published in the ADR and CONVENTIONS rather than hidden"
  - "The exemption is a ratchet, not a licence: an exempt suite that grows fails CI, and one that reaches zero fails too, so a finished migration cannot leave a dead entry overstating coverage"
  - "storybook/test's fn() was used for the story-arg spies; it did not break the browser project's bundling, so the plain call-recording fallback was not needed"

patterns-established:
  - "Gate scripts: pure exported finder + CLI behind an import.meta.url guard, globbing through scripts/glob-real-files.mjs, failing with an ADR-citing message"
  - "Spy hygiene for shared story args: one clearAllMocks() in vitest.setup.ts's single global afterEach, proven by a dedicated case rather than asserted by inspection"
  - "A partial gate states its own scope: the checker prints its exemption ledger on every run and the published Enforcement line names what it does NOT cover"

requirements-completed: [BOARD-02]

coverage:
  - id: D1
    description: "check-tsx-declarations.mjs gates what a .tsx file may declare, and the whole repository passes it"
    requirement: BOARD-02
    verification:
      - kind: unit
        ref: "scripts/check-tsx-declarations.unit.test.mjs"
        status: pass
      - kind: other
        ref: "pnpm tsx:check (exit 0, repo-wide); failure path exercised against a deliberate violation (exit 1, named the file)"
        status: pass
    human_judgment: false
  - id: D2
    description: "23 declarations extracted out of 12 .tsx files with no behavior change"
    requirement: BOARD-02
    verification:
      - kind: unit
        ref: "pnpm test:unit"
        status: pass
      - kind: integration
        ref: "pnpm test (57 files / 699 tests), pnpm build, pnpm exec tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D3
    description: "add-board-modal.test.tsx renders composed stories only, on named per-prop-combination stories, with no assertion lost"
    requirement: BOARD-02
    verification:
      - kind: integration
        ref: "pnpm test (browser project green); case names diffed old-vs-new, 20 -> 21 with every original preserved"
        status: pass
      - kind: automated_ui
        ref: "pnpm test (storybook/a11y project green, zero axe violations)"
        status: pass
      - kind: e2e
        ref: "playwright --project=e2e, 30/30 passing including boards-create.e2e.spec.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both gates block in CI and three Enforcement lines describe reality, including what the render gate does not yet cover"
    requirement: BOARD-02
    verification:
      - kind: other
        ref: "pnpm renders:check (exit 0, 10 tracked exemptions printed); failure path exercised twice — an unlisted file (exit 1) and a ratchet breach on an exempt file (exit 1)"
        status: pass
      - kind: other
        ref: "ci.yml quality job runs both checks ahead of Build; no 'code review' Enforcement claim remains for either rule"
        status: pass
    human_judgment: true
    rationale: "The render gate's coverage is deliberately partial. The user chose Option B at the Task 4 blocker; the judgment recorded is that a published, ratcheted, printed carve-out is honest, and a silent one would not be."

# Metrics
duration: 34min
completed: 2026-08-25
status: complete
---

# Phase 02 Plan 15: Mechanical Enforcement for the `.tsx` Declaration and Story-Only-Render Rules Summary

**Both conventions now have real gates instead of Enforcement lines that said "code review": the
`.tsx` declaration rule blocks repository-wide with no baseline, and the story-only-render rule
blocks too — for new and touched files and for `add-board-modal`, with ten pre-existing primitive
suites carrying a published, ratcheted exemption because turning the gate on found the rule broken
at thirteen times the scale the plan assumed.**

## Performance

- **Duration:** ~34 min of executor time across three sessions (≈14 min recovering the interrupted
  Tasks 1-3, ≈20 min for Task 4 and close-out)
- **Completed:** 2026-08-25
- **Tasks:** 4 of 4 complete
- **Files modified:** 47 across the plan

## Accomplishments

- **Two gates, no new dependency.** Both are hand-written scripts parsing with the already-installed
  `typescript` devDependency, each with a co-located `*.unit.test.mjs`. The phase's Package
  Legitimacy Audit claim that this phase installs nothing new still holds, and no legitimacy gate was
  triggered.
- **`pnpm tsx:check` is green across the entire repository**, with no per-file baseline. 23
  declarations moved out of 12 `.tsx` files: the modal's schema, derived types, row factory and
  column-row path to the boards feature's `schemas.ts`/`model.ts`; the duplicated auth pair to auth's;
  `TOGGLE_LABEL` to a new theme `model.ts`; all nine `cva()` constants and `DropdownContext` to
  sibling `.ts` modules; `useToast` to its own module. `add-board-modal.tsx` declares exactly two
  things.
- **`buildColumnRowPath`** replaces the in-component stringify-then-assert dance, taking the type
  assertion out of the `.tsx` entirely and making it unit-testable for the first time.
- **`add-board-modal.test.tsx` renders composed stories only** — the component is neither imported nor
  rendered, no props are spread onto a story, and the stateful failure host moved into the stories
  file as a story `render` function. Case count rose 20 → 21, every original case name survives
  verbatim, and all six negative submit-handler assertions survive by reading `fn()` spies off each
  story's own args.
- **Spy hygiene is proven, not assumed:** `vitest.setup.ts`'s single global `afterEach` gained
  `clearAllMocks()`, and a dedicated case renders a story an earlier case already submitted through
  and asserts the count starts at zero.
- **Both gates block in CI** as the `TSX declaration scope check` and `Story-only render check` steps
  of the `quality` job, ahead of Build and Test.
- **`docs/adr/tech/0027-tsx-declaration-scope.md`** records the rule, its five permitted declaration
  kinds, why it is a checker rather than an ESLint rule, and its two exemptions — with an explicit
  statement that an exemption is added there and nowhere else, never as an inline suppression comment.
- **Three Enforcement lines rewritten to describe reality**, including what the render gate does *not*
  cover. See "The scope discovery and Option B" below — this is the part of the plan most easily
  faked, and it is the part the plan's own threat register singled out.

## Task Commits

1. **Task 1: Settle both enforcement mechanisms and the exemption surface** — `a834f63` (docs)
2. **Task 2: Build both gates and fix every declaration violation** — `0726976` (feat)
3. **Task 3: Rewrite `add-board-modal.test.tsx` onto per-prop-combination stories** — `e38597d` (test)
4. **Deviation fix: route-wrapper carve-out in the render gate** — `7e5abef` (fix)
5. **Interim halted summary at the Task 4 blocker** — `790b528` (docs)
6. **Task 4: Flip both gates to blocking, wire CI, rewrite three Enforcement lines** — `4694fa6` (feat)

## Verification Run

| Check | Result |
|---|---|
| `pnpm tsx:check` | exit 0, repo-wide, no baseline |
| `pnpm renders:check` | exit 0, with 10 tracked exemptions printed |
| `pnpm test` | 57 files / **699 tests passing**, all five Vitest projects |
| `playwright --project=e2e` | **30/30 passing**, including `boards-create.e2e.spec.ts` |
| `pnpm build` | exit 0 |
| `pnpm exec tsc --noEmit` | zero errors |
| `pnpm lint`, `pnpm format:check` | exit 0 |
| `pnpm comments:check`, `pnpm stories:check`, `pnpm routes:check`, `pnpm handlers:check` | all exit 0 |

### Both gates exercised against real violations

A gate whose failure path was never run is a gate nobody has tested. Three deliberate violations were
introduced and removed; `git status --porcelain` is clean of every scratch fixture.

**1. Declaration gate — `scripts/check-tsx-declarations.mjs`.** Scratch
`src/features/boards/components/gate-probe.tsx` declaring `export const PROBE_LIMIT = 3` beside a
component. **Exit code 1**, message:

> `tsx:check failed — a `.tsx` file declares something other than a component, a prop type, a
> compound-component namespace object or a framework-forced route export, banned by
> docs/adr/tech/0027-tsx-declaration-scope.md. …`
> `  src/features/boards/components/gate-probe.tsx:1 — PROBE_LIMIT`

**2. Render gate, unlisted file — `scripts/check-story-only-renders.mjs`.** Scratch
`gate-probe.test.tsx` importing that component from its sibling module and rendering it. **Exit code
1**, message:

> `renders:check failed — a *.test.tsx renders a component imported from a sibling module instead of
> a composed story, banned by docs/adr/tech/0025-direct-composed-story-rendering.md. …`
> `  src/features/boards/components/gate-probe.test.tsx:7 — <GateProbe>`

**3. Render gate, ratchet breach on an *exempt* file.** The exemption is the new risk surface, so its
failure path was exercised too: one extra direct render was temporarily added to
`src/components/ui/toast/toast.test.tsx` (ceiling 1) and reverted with `git checkout --`. **Exit code
1**, message:

> `renders:check failed — src/components/ui/toast/toast.test.tsx added direct renders on top of its
> tracked exemption (2 now, ceiling 1). The exemption is a ratchet: an exempt suite may only shrink. …`

## Decisions Made

### Task 1 — settled by the user at the `checkpoint:decision`

All four are recorded verbatim in `02-CONTEXT.md` as D-28a–c and D-29a:

- **D-28a (mechanism, option `own-checkers`)** — hand-written dependency-free checkers under
  `scripts/`, parsing with the already-installed TypeScript compiler API. `no-restricted-syntax` was
  rejected outright (a `files`-scoped block *replaces* rather than merges with `eslint.config.mjs`
  section 8d's array); `dependency-cruiser`, `ts-arch` and `eslint-plugin-boundaries` were rejected as
  module-graph-only and, for the first two, as new supply-chain surface.
- **D-28b (exemption surface)** — extract *everything*, including all nine `cva()` constants. Only
  Next's framework-forced route exports and `src/test-utils/` are exempt. This is the stricter of the
  two options the checkpoint offered; the plan had recommended exempting the `cva` constants.
- **D-28c (compound-component namespace objects)** — a fifth permitted declaration kind, recognised
  **structurally** (an object literal whose every property value names a component declared earlier in
  the same file) rather than by a hardcoded list of exempt paths, so a future compound component needs
  no edit to the checker or the ADR.
- **D-29a (story-rule mechanism)** — the same `own-checkers` answer, because the rule is about the
  render, not the import graph, which is exactly what no module-graph tool can express.

### Task 4 — Option B, settled by the user at the scope blocker

Given the choice between rewriting ten pre-existing suites and narrowing the published rule, the user
chose **Option B: exempt the primitives library with a tracked follow-up migration** — on the explicit
condition that the carve-out be *visible* rather than silent, and that the Enforcement lines say so
plainly. Both conditions were treated as part of the decision, not decoration; see below.

### Executor implementation decisions

- **`storybook/test`'s `fn()`** was used for the story-arg spies. The plan offered a fallback (a plain
  call-recording function in the stories file) in case `storybook/test` dragged Next.js internals into
  the "browser" Vitest project — the failure mode ADR tech/0025 documents for `@storybook/nextjs-vite`'s
  main entry. It did not, so the fallback was not needed.
- **The exemption mechanism is a ratchet, not an allowlist.** The user left the mechanism to the
  executor. A plain allowlist would satisfy "explicit and visible" while still rotting quietly, so
  each exempt file carries a numeric ceiling instead: exceeding it fails the build, and reaching zero
  *also* fails (with a message saying to delete the entry), so a finished migration cannot leave a
  dead entry behind claiming a carve-out that is no longer needed. `classifyViolations` is a pure
  exported function with its own five unit cases; the finder itself was left untouched, so the gate
  still *sees* and *prints* all 121 violations rather than being taught not to look.
- **The exemption lives at the classification layer, not in the finder.** That is what keeps the
  printed count honest: `findStoryOnlyRenderViolations` reports the truth and the CLI decides what
  blocks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The render gate fired on route wrappers its own governing ADR exempts**

- **Found during:** Task 3 verification
- **Issue:** `check-story-only-renders.mjs` flagged `app/(dashboard)/error.test.tsx` and
  `app/global-error.test.tsx`. ADR tech/0025 carries forward tech/0021's route-file scope carve-out —
  `app/**/error.tsx` and `app/**/layout.tsx` are thin composition wrappers exempt from the stories
  requirement — and `CONVENTIONS.md` repeats it. Both files even carry an in-file comment citing the
  very carve-out being violated. A gate that fires on a shape its governing record permits is the gate
  being wrong, not the code.
- **Fix:** Exempt `error.test.tsx`, `global-error.test.tsx` and `layout.test.tsx` under `app/` by
  basename, with two unit cases — the carve-out reports none, and a non-wrapper `app/` route test is
  still flagged so the exemption cannot silently widen into "anything under `app/`".
- **Committed in:** `7e5abef`

**2. [Rule 1 — Bug] `add-board-modal.stories.tsx` failed `pnpm comments:check`**

- **Found during:** Task 3 verification
- **Issue:** The `meta` block's comment ran to 4 prose lines against a 3-line ceiling. Introduced by
  the interrupted Task 3 work, whose author never got as far as running `pnpm comments:check`.
- **Fix:** Compressed to three lines, keeping the `docs/adr/tech/0025` pointer.
- **Committed in:** `7e5abef`

**3. [Rule 1 — Bug] A two-positional-parameter test helper violated ADR tech/0016**

- **Found during:** Task 4 verification (`pnpm lint`)
- **Issue:** The new `classifyViolations` unit cases introduced `violationAt(path, line)`, which
  `no-restricted-syntax` blocks — functions with 2+ parameters take one destructured object parameter.
- **Fix:** Rewritten as `violationAt({ file, line })` and every call site updated.
- **Committed in:** `4694fa6`

### Plan Drift Corrected at Task 1

Three counts in the plan's own prose were wrong and were corrected before building:

- The `cva()` surface is **9 calls across 7 files**, not 8 — `switch.tsx` declares three
  (`rootVariants`, `trackVariants`, `thumbVariants`), not one.
- `add-board-modal.test.tsx` carried **20** cases, not the "nineteen" the plan states twice. 20 was
  the floor the rewrite could not fall below; it landed at 21.
- The `.tsx` rule needed a **fifth** permitted declaration kind, not the four the plan specifies — the
  compound-component namespace object (D-28c above).

### Criterion Wording Correction

Task 3's criterion `grep -c 'composeStories' … returns exactly 1` cannot be satisfied by any
conformant file: `grep -c` counts matching **lines**, and every conformant test has two (the import
and the `composeStories(stories)` call). The plan's own named exemplar, `sign-in-form.test.tsx`, also
returns 2. The criterion's intent — exactly one `composeStories(stories)` call site — is met.

## Issues Encountered

### The interruption and its recovery

The original executor was killed mid-Task-3 by an API usage-limit error — an infrastructure failure,
not a plan failure and not a checkpoint. It had reported "691 passing… running the a11y suite and
Task 3's remaining criteria" moments before, meaning it believed the implementation correct but had
**not** confirmed it. The orchestrator preserved the uncommitted work as a WIP commit (`e09c051`) and
pushed it, then dispatched a continuation.

That continuation fast-forwarded onto the WIP commit and re-ran every Task 3 acceptance criterion from
scratch rather than trusting it. That was the right call: the work was substantially correct, but it
carried a real `pnpm comments:check` failure (deviation 2) that would otherwise have reached CI. The
WIP commit was reworded into `e38597d` with a proper `test(02-15):` message, so no `wip:` commit
survives in history. Tasks 1 and 2 were spot-checked against their own acceptance criteria rather than
trusted from their commit messages.

### The scope discovery, and why Task 4 stopped for a human

Task 2's commit message claimed "the render gate is red on exactly the violation Task 3 fixes." That
was false. With `add-board-modal.test.tsx` clean and the route-wrapper carve-out honoured, the gate
still reported **121 violations across 10 files (~116 test cases)**:

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

**The gate is not over-firing.** These are genuine violations of ADR tech/0025's Decision Outcome and
of `CONVENTIONS.md`'s "Component tests from stories" second bullet. All ten are *mixed* suites: each
composes stories for its shallow cases and direct-renders the raw component for its deep-interaction
cases, several under an explicit in-file comment reading "Deep: real pointer/keyboard interaction and
computed style — stay direct renders."

That comment is the finding. The primitives suite was written, and code-reviewed, on the understanding
that direct rendering is acceptable for deep-interaction cases — while the ADR says every prop
combination must be a named story. **This plan's own thesis (review-only enforcement fails), confirmed
at roughly 13x the scale the plan assumed.** The prior executor halted here under deviation Rule 4 and
wrote a `status: halted` summary rather than picking a side; the precedent supported that — Task 1 had
already escalated a decision over whether to exempt *nine* `cva` constants, and exempting a 116-case
suite is far larger.

### Option B, and the threat it had to be weighed against

The user chose Option B: exempt the ten, track the migration, do not rewrite them here.

The reason this needed care rather than a config edit is **T-02-54 in this plan's own threat register**
— "a false coverage claim is a real defect class here, not a documentation nicety" — plus the plan's
explicit prohibition that *an Enforcement line must never name a mechanism before that mechanism is
actually blocking*. Publishing "both gates mechanically enforce both conventions repo-wide" while
quietly carving out most of the primitives library would have been the same defect one level up: the
plan would have replaced a false review-only claim with a false mechanical one.

What was actually done instead:

- The checker **prints the whole carve-out on every run, pass or fail** — ten lines naming each file
  and its count, above the pass message. A carve-out nobody can see is indistinguishable from coverage.
- Each count is a **ratchet ceiling** in `MIGRATION_EXEMPTIONS`, unit-tested five ways: growth fails,
  a finished migration that leaves a dead entry fails, and improvement below the ceiling passes with a
  printed nudge to lower the number.
- **ADR tech/0025's Enforcement section** states in bold that the gate "is not yet repository-wide",
  tables all ten suites with their counts and dates, explains *why* they exist (they were written and
  reviewed on a different understanding), and carries its own unwind trigger.
- **`CONVENTIONS.md`'s bullet** says the same in the same words — "**with a scoped, tracked exemption,
  not repository-wide coverage**" — naming all ten components inline so a reader of the convention
  alone cannot mistake the coverage.
- The migration is tracked in **`deferred-items.md` under `## 02-15`** with the per-file table, what
  the work actually costs (ten `.stories.tsx` files, `fn()` spies in ten `meta.args` blocks, and every
  new story additionally rendered by the a11y and visual projects — nine of the ten are
  `components/ui/` primitives with visual-regression baselines), and an explicit warning not to
  under-scope it the way this plan did. Also logged as **`.planning/WINDOWS.md` entry #20**.

The `.tsx` declaration gate is unaffected by any of this: green repository-wide, no baseline, no
carve-out beyond ADR tech/0027's two exemptions.

## Tracked Debt

No stubs, no skipped tests, no unrun verifications. One tracked gap, by decision rather than by
oversight:

| Item | Where tracked | Status |
|---|---|---|
| Migrate 10 component-test suites (121 direct renders, ~116 cases) onto named per-prop-combination stories, then delete their `MIGRATION_EXEMPTIONS` entries | `deferred-items.md` § 02-15, `WINDOWS.md` #20, ADR tech/0025 Enforcement table | open |

## Requirements

`BOARD-02` is marked complete. Both of the plan's success criteria that were outstanding at the halt
now hold in the form the user chose: both rules block in CI, and no Enforcement line for either rule
still says code review. The render gate's coverage is partial *and says so*, which was the condition
of the decision.

## Next Steps

Per the user's explicit instruction, phase work pauses here. The one carried item is the tracked
migration above, which is deliberately not scheduled by this plan.

## Self-Check: PASSED

All artifacts claimed above verified present on disk: both checker scripts and both unit tests,
`docs/adr/tech/0027-tsx-declaration-scope.md`, the ten extracted sibling modules, and the modified
`package.json` / `ci.yml` / `CONVENTIONS.md` / ADR tech/0025. All six commit hashes (`a834f63`,
`0726976`, `e38597d`, `7e5abef`, `790b528`, `4694fa6`) verified in `git log`. `git status --porcelain`
clean of every scratch fixture used for the deliberate-violation exercise.
