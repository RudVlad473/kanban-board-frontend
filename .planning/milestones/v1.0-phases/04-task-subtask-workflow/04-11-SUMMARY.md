---
phase: 04-task-subtask-workflow
plan: 11
subsystem: tooling
tags: [check-scripts, ci-gate, adr-amendment, conventions, server-actions]

requires:
  - phase: 04-01
    provides: The `pnpm actions:check` script this plan extends, already a step in CI's blocking `quality` job
  - phase: 04-03
    provides: The `serverActionStubPlugin` transform and the `actionStub` recorder the amended ADR now describes
  - phase: 04-08
    provides: The deletion of `src/test-utils/index.ts`, which the amendment records as dead-code removal rather than a migration
  - phase: 04-10
    provides: The register's deletion — the change that made both ADRs and CONVENTIONS.md false, and the handoff this plan closes
provides:
  - A blocking gate that fails if a Server Action double module or an alias register reappears, proven fail-first
  - ADR tech/0020's carve-out amended in place onto the transform, with the four-versus-twelve drift and its cause recorded
  - ADR tech/0025's cited research paragraph corrected to the stronger import-time finding
  - CONVENTIONS.md's where-code-lives row and project-organization tree matching the shipped code
  - The phase-wide cutover total and an explicit verdict on success criterion 8
affects: []

actuals:
  tokens: 7200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "An absence property earns a SECOND rule that catches a rename: a name-only check on `serverActionStubAlias` would wave through the same register under a different identifier, so the checker also bans any Server Action module specifier appearing in `vitest.config.ts` at all"
    - "Comment text is stripped before an absence scan, so a record OF the deleted mechanism (this amendment's own wording) is legal while a reinstatement is not — the ADR and the gate would otherwise be mutually exclusive"
    - "Extending an already-wired check script beats adding a sibling: `pnpm actions:check` was already a step in CI's blocking `quality` job, so the new assertion inherited a blocking gate with no workflow edit and no chance of being added to package.json but forgotten in CI"

key-files:
  created: []
  modified:
    - scripts/check-action-verbs.mjs
    - scripts/check-action-verbs.unit.test.mjs
    - docs/adr/tech/0020-no-mocking-policy.md
    - docs/adr/tech/0025-direct-composed-story-rendering.md
    - CONVENTIONS.md

key-decisions:
  - "The gate carries TWO register rules, not one. The first matches the historical `serverActionStubAlias` identifier; the second fires on any Server Action module specifier appearing in `vitest.config.ts` regardless of the variable's name. A name-only check would be defeated by `const shims = [...]`, which is the same shape of failure — a record that only looks like it is watching — that this gate exists to end. A unit case pins the rename path specifically."
  - "Comment text is scanned out before the register rules run. Without that, ADR tech/0020's own amendment could not name the mechanism it retired inside `vitest.config.ts`'s comments, and the honest record and the gate would be in direct conflict. This mirrors the `grep -v` filter the property is spot-checked with by hand."
  - "The carve-out heading changed from `Server Action alias carve-out` to `Server Action doubling carve-out`. The mechanism is no longer an alias, and the only two in-repo references to the old heading were the section itself and one Sources line, both updated. `tech/0025`'s cross-reference points at the D-19 shim section, which is untouched."
  - "`CONVENTIONS.md`'s placement-rule domain list dropped `subtasks` as a domain. Leaving it would have contradicted the tree edit in the same file two screens above — the exact prose-versus-prose drift this plan exists to close, reproduced inside the correction itself."

patterns-established:
  - "Prove a new gate fail-first in BOTH directions before trusting it: a reintroduced double AND a reintroduced register, each observed red and named, each reverted and observed green. A gate proven on one of its two rules is half a gate"
  - "A block comment containing `[*/#]` terminates early and makes the module a syntax error — writing the by-hand grep pattern into a comment describing the checker broke the checker itself, caught immediately by its own unit run"

requirements-completed: [TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, SUBTASK-01, SUBTASK-02, SUBTASK-03, SUBTASK-04, SYNC-01]

coverage:
  - id: D1
    description: "Criterion 8's absence property is enforced by a gate CI already runs"
    verification:
      - kind: other
        ref: "`pnpm actions:check` exits 0 on the current tree: `12 Server Action(s) match the naming rule, and no double module or alias register exists`"
        status: pass
      - kind: other
        ref: ".github/workflows/ci.yml line 99-100 — `Server Action verb check` runs `pnpm actions:check` in the blocking `quality` job; no workflow edit was needed"
        status: pass
    human_judgment: false
  - id: D2
    description: "The gate has been SEEN to fail, on both of its rules"
    verification:
      - kind: other
        ref: "Double half: created `src/test-utils/create-task-action-storybook-stub.ts` -> exit 1, naming that exact path; removed -> exit 0"
        status: pass
      - kind: other
        ref: "Register half: appended a `serverActionStubAlias` entry to vitest.config.ts -> exit 1 with both reasons; `git checkout --` -> exit 0, `git status --porcelain` empty"
        status: pass
      - kind: other
        ref: "RED commit 634e3ce ran 3 failed / 8 passed before the implementation existed; GREEN commit c03e72f took it to 11/11"
        status: pass
    human_judgment: false
  - id: D3
    description: "The existing verb rule still fires and is unchanged"
    verification:
      - kind: other
        ref: "`findActionNameViolations` untouched; its five unit cases still pass, including `flags a verb outside the allowed set` (archive-task-action.ts)"
        status: pass
      - kind: other
        ref: "The two violation kinds report under separate headings, so a failure says which rule broke"
        status: pass
    human_judgment: false
  - id: D4
    description: "ADR tech/0020 is amended in place with all five required points, and no new ADR was created"
    verification:
      - kind: other
        ref: "`git status --porcelain docs/adr/` showed only ` M` on 0020 and 0025 — no addition"
        status: pass
      - kind: other
        ref: "All five points present under findable bold leads: the drift + its cause + the gate that closes the class; the import-time finding; the barrel's deletion as dead code; the AST reader's known limit; D-03's mechanism swap"
        status: pass
    human_judgment: false
  - id: D5
    description: "tech/0025's cited research paragraph corrected, and CONVENTIONS.md matches the shipped code"
    verification:
      - kind: other
        ref: "`grep -rn 'storybook-stub' CONVENTIONS.md` -> nothing; `grep -c 'features/subtasks' CONVENTIONS.md` -> 0"
        status: pass
      - kind: other
        ref: "`pnpm comments:check` and `pnpm format:check` exit 0; `grep -c 'use server' docs/adr/tech/0020-no-mocking-policy.md` -> 5"
        status: pass
    human_judgment: false
  - id: D6
    description: "The full suite is green under repetition, not on a single run"
    verification:
      - kind: other
        ref: "Five consecutive `pnpm test` runs: 5/5 green, each 100 files / 1430 tests, no count variance"
        status: pass
      - kind: other
        ref: "`pnpm build`, `pnpm build-storybook`, `pnpm lint`, `pnpm exec tsc --noEmit` all exit 0; `grep -rl registerActionStub .next/ storybook-static/` -> no matches"
        status: pass
      - kind: other
        ref: "`CI=1 pnpm test:visual` -> 300 passed; `git status --porcelain` empty afterwards, so no baseline churn"
        status: pass
    human_judgment: false
  - id: D7
    description: "CI is green on every job"
    verification:
      - kind: other
        ref: "Run 33208356486 on 25d9ad1, blocked on with `gh run watch --exit-status` — quality, secrets, visual, e2e all success"
        status: pass
    human_judgment: false
  - id: D8
    description: "A brand-new Server Action needs no double module and no config entry"
    verification:
      - kind: other
        ref: "Throwaway `create-throwaway-action.ts` + a browser-project test queueing through `actionStub` -> 1 passed, with `git status --short` showing ONLY those two untracked files; both deleted, tree clean"
        status: pass
    human_judgment: false

duration: 45 min
completed: 2026-08-28
status: complete
---

# Phase 04 Plan 11: Tooling Sign-Off Summary

**Success criterion 8 stopped being a promise and became a gate: `pnpm actions:check` — already a step in CI's blocking `quality` job — now fails if a hand-written Server Action double or an alias register reappears, proven red-then-green by hand on both of its rules, while ADR tech/0020's carve-out is amended in place onto the transform with the four-versus-twelve drift and its cause recorded, and the whole migration signs off 5/5 green locally and green on every CI job.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-08-28T21:57:00Z
- **Completed:** 2026-08-28T22:42:00Z
- **Tasks:** 3 of 3 auto complete; the plan's fourth task is a human-verify checkpoint, reached
- **Files modified:** 5 (all modifications; nothing created, nothing deleted)

## Accomplishments

- **The absence property is now a machine's job.** `findStubSeamViolations` bans a
  `-storybook-stub.ts` module under `src/test-utils/` and any Server Action alias register in
  `vitest.config.ts`. It rides `pnpm actions:check`, which CI's blocking `quality` job already runs
  — no workflow edit, and no window where the script exists but CI never calls it.
- **The gate was seen to fail on both rules before being trusted**, then seen to go green again with
  the tree provably clean. Full transcript below.
- **ADR tech/0020 amended in place, not superseded**, per D-05. The alias-register description is
  replaced by the transform; the no-mocking rule itself is untouched and still current.
- **The drift is recorded with its cause, not just its correction.** The carve-out documented four
  doubles and four specifiers where twelve of each stood, because phases 02 and 03 added eight
  without amending the record and nothing gated the two against each other. The amendment says so,
  names the eight, and points at the new gate as what closes the class rather than claiming the
  register's deletion did.
- **tech/0025's cited paragraph corrected.** It said the failure reached `node:crypto` and the
  external API client. Measured, evaluation never gets that far — `next/cache`'s `refresh()` throws
  `ReferenceError: process is not defined` first. Both records now state the stronger constraint.
- **CONVENTIONS.md matches the code.** The where-code-lives row names `actionStub(<theRealAction>)`
  instead of the deleted seam, the tree merges subtasks into `features/tasks/` per D-14, the
  `test-utils/` line no longer advertises the deleted barrel, and the placement rule's domain list
  no longer contradicts the tree two screens above it.

## The Fail-First Demonstration

A checker that has never been seen to fail is an unproven claim, so both rules were driven red by
hand before the gate was trusted. Both halves, in order, with the observed output:

| # | Action | `pnpm actions:check` |
|---|--------|----------------------|
| 1 | Baseline, current tree | **exit 0** — `12 Server Action(s) match the naming rule, and no double module or alias register exists.` |
| 2 | Created `src/test-utils/create-task-action-storybook-stub.ts` | **exit 1** — `src/test-utils/create-task-action-storybook-stub.ts — is a hand-written Server Action double; the transform emits one from the real module instead` |
| 3 | Deleted it | **exit 0** |
| 4 | Appended a `serverActionStubAlias` entry to `vitest.config.ts` | **exit 1** — both reasons fired: `declares an action-stub alias register` and `names a Server Action module` |
| 5 | `git checkout -- vitest.config.ts` | **exit 0**, `git status --short` showing only the checker itself |

Step 4 matters as much as step 2: the plan asked only for the double half by hand, but a gate proven
on one of its two rules is half a gate, and the register rule is the one the drift actually came
from.

The RED/GREEN cycle is visible in the history too — commit `634e3ce` ran **3 failed / 8 passed**
with only a skeleton export present; `c03e72f` took it to **11/11**.

## Assertion Strength: Before vs After

| File | `it(` before → after | `expect(` before → after |
|------|----------------------|--------------------------|
| `scripts/check-action-verbs.unit.test.mjs` | 5 → 11 | 7 → 17 |

Six cases added, none removed, no skip or only introduced. The three the plan named (clean tree,
reappeared double, declared register) plus three the implementation argued for: an unrelated
`server-only-stub.ts` left alone, a renamed register still caught, and a register named only inside
a comment deliberately not caught.

## Phase-Wide Cutover Total (success criterion 8)

Carried from the three cutover plans' own measurements, with 04-10's file-count correction applied.

| Plan | Files rewritten | Doubles deleted | Register entries removed | `it(` before → after | `expect(` before → after | all `expect` before → after |
|------|-----------------|-----------------|--------------------------|----------------------|--------------------------|-----------------------------|
| 04-08 | 4 | 4 | 4 (12 → 8) | 37 → 37 | 53 → 53 | 74 → 74 |
| 04-09 | 2 | 4 | 4 (8 → 4) | 40 → 40 | 99 → 99 | 101 → 101 |
| 04-10 | 2 | 4 | 4 (4 → 0) | 71 → 71 | 145 → 145 | 156 → 156 |
| **Total** | **8** | **12** | **12 (12 → 0)** | **148 → 148** | **297 → 297** | **331 → 331** |

**Success criterion 8 holds.** No double file and no register entry exists for any Server Action:
`ls src/test-utils/ | grep -c storybook-stub` → 0, and `vitest.config.ts` names no Server Action
module. The full `browser` project passes without either mechanism — five consecutive `pnpm test`
runs, 100 files / 1430 tests each. Twelve doubles and twelve register entries were removed across
eight files with **zero assertions lost**. As of this plan the criterion is additionally
machine-enforced, which is the part that was missing: the previous three plans established the
property, and nothing prevented it from decaying the way the four-versus-twelve gap already had.

## Task-by-Task

| Task | What landed | Commit |
|------|-------------|--------|
| 1 (RED) | Six failing cases for `findStubSeamViolations` plus a skeleton export | `634e3ce` |
| 1 (GREEN) | The two-rule assertion, comment stripping, and split violation reporting | `c03e72f` |
| 2 | tech/0020 amended in place, tech/0025's paragraph corrected, CONVENTIONS.md rewritten | `25d9ad1` |
| 3 | Measurement, full gate, push, CI — no source change of its own | (this SUMMARY) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A comment containing `[*/#]` closed its own block comment and broke the module**

- **Found during:** Task 1, GREEN
- **Issue:** The comment explaining why comment text is stripped quoted the by-hand grep pattern
  verbatim. Its `*/` terminated the block comment early, making `check-action-verbs.mjs` a syntax
  error — `pnpm actions:check` died at import with `SyntaxError: Invalid or unexpected token`, and
  the unit run failed to collect any test at all.
- **Fix:** Reworded the comment to describe the allowance without quoting the pattern. No behavior
  change.
- **Files modified:** `scripts/check-action-verbs.mjs`
- **Commit:** `c03e72f` (caught and fixed before the commit)

### Additions beyond the plan's letter

**2. [Rule 2 - Missing critical] A second register rule, so a rename cannot evade the gate**

The plan asks the checker to fail when `vitest.config.ts` "declares an alias register for Server
Action specifiers". The obvious implementation matches the identifier `serverActionStubAlias`, which
`const shims = [...]` walks straight past. Since the whole point of the gate is that a record which
merely looks like it is watching is worse than none, the checker carries a second rule firing on any
Server Action module specifier in the config regardless of variable name, with its own unit case.

**3. [Rule 2 - Missing critical] Two further CONVENTIONS.md corrections in the same file**

The plan names the where-code-lives row and the project-organization tree. Two adjacent statements
in the same file were false for the same reason and would have been left standing: the `test-utils/`
tree line still advertised `index.ts (D-11 barrel re-export)`, deleted in 04-08, and the placement
rule's step 2 still listed `subtasks` as a domain — which, left alone, would have contradicted the
tree edit two screens above it inside the very correction meant to end that class of drift.

### Not deviations

`docs/adr/tech/0025`'s cross-reference to "`docs/adr/tech/0020`'s D-19 carve-out section" still
resolves: D-19 is the framework/environment shim carve-out, a different section from the Server
Action one, and it is untouched by this plan.

## Verification

| Check | Result |
|-------|--------|
| `pnpm test` ×5 | **5/5 green** — 100 files / 1430 tests every run, no variance |
| `pnpm exec vitest run --project node scripts/check-action-verbs.unit.test.mjs` | 11 passed |
| `pnpm exec tsc --noEmit` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm routes:check` | passed |
| `pnpm handlers:check` | passed |
| `pnpm stories:check` | passed |
| `pnpm comments:check` | passed |
| `pnpm tsx:check` | passed |
| `pnpm renders:check` | passed (10 tracked exemptions unchanged, 121 direct renders — ceiling untouched) |
| `pnpm folders:check` | passed |
| `pnpm actions:check` | passed — 12 Server Actions, no double, no register |
| `pnpm coverage:check` | passed (108 source files scanned) |
| `pnpm build` | exit 0; `grep -rl registerActionStub .next/` → no matches |
| `pnpm build-storybook` | exit 0; `grep -rl registerActionStub storybook-static/` → no matches |
| `CI=1 pnpm test:visual` | 300 passed, `git status --porcelain` empty — no baseline churn |

The `CI=1` prefix is what makes the visual run mean anything: `playwright.config.ts` sets
`ignoreSnapshots: !process.env.CI` (ADR tech/0008), so an unprefixed run compares nothing.

### CI

Run **33208356486** on `25d9ad1`, blocked on with `gh run watch --exit-status`:

| Job | Conclusion |
|-----|------------|
| quality | success |
| secrets | success |
| visual | success |
| e2e | success |

## Checkpoint Verification Performed

The plan's fourth task is a human-verify checkpoint. Per this project's CLAUDE.md its three steps
were driven first rather than handed over unverified. What was observed:

**1. A new Server Action needs no file and no config entry — CONFIRMED.** A throwaway
`src/features/boards/actions/create-throwaway-action.ts` (`"use server"`, reaching `next/cache` and
`verifySession` exactly as a real one does) plus a throwaway browser-project test calling
`actionStub(createThrowawayAction).queue(...)`: **1 passed in 3.11s**. `git status --short` during
the run listed exactly two untracked files and nothing else — no new module under `src/test-utils/`,
no edit to `vitest.config.ts`. Both deleted afterwards; `git status --porcelain` empty. This is the
whole argument for sequencing the tooling ahead of the seven task/subtask actions, and it holds.

**2. Storybook — PARTIALLY verified; the browser-console half could not be driven.** `pnpm storybook`
booted clean (`Storybook ready`, 181 ms manager / 600 ms preview) with **zero** error, failure or
warning lines in the dev-server log. `sign-out-button.stories.tsx` is the story whose import chain
reaches the session module (`sign-out-button.tsx` → `signOutAction` → `@/lib/server/session`);
requesting the transformed module from the running dev server returns the generated recorder:

```
import { registerActionStub } from "/src/test-utils/action-stub-registry.ts";
export const signOutAction = registerActionStub({
	moduleKey: "src/features/auth/actions/sign-out-action.ts",
	exportName: "signOutAction"
});
```

The `@/lib/server/session` import is absent from the emitted module entirely, which is precisely why
the story can render. **What was NOT done:** loading that story in a real browser and reading its
console. No Playwright MCP tool resolved in this executor's environment — neither
`mcp__playwright__*` nor the `plugin_` variant — and CLAUDE.md forbids substituting a throwaway
browser script. The nearest evidence that does exist: the `storybook` Vitest project renders every
story including this one in real headless Chromium and passed 203 tests on each of the five runs.
That covers "it renders"; it does not cover "with a clean browser console". **This is the one part
of the checkpoint still genuinely needing a human's eyes.**

**3. The amended carve-out describes what the repository actually does — CONFIRMED, claim by claim.**
Every statement was written against the source and re-read against it, not from the plan's wording:
the transform's file and function names (`readExportedFunctionNames`, `buildStubModule`), the
recorder's surface (`registerActionStub`, `actionStub`/`queue`/`hold`/`settle`/`calls`), the global
`afterEach` calling `assertNoUnqueuedActionCalls` in `vitest.setup.ts`, and the AST reader's limit —
which `scripts/vite-plugin-server-action-stub.unit.test.mjs` already asserts in a case named *drops
the module's exported result type, the recorded limit of the AST reader*, so the ADR points at a
live test rather than restating an unpinned claim. The unwind trigger was re-measured rather than
inherited from the spike: grepping `node_modules/@storybook/nextjs-vite/dist/` (10.5.7, installed)
for `use server`, `serverAction` and `server-action` returns **nothing**. It has not fired.

## Known Stubs

None. This plan wrote no placeholder, skipped no test, and left no `<verify>` unrun.

## Handoff Notes

- **The remote branch `worktree-agent-ada171a38c082afed` was pushed** so CI could run on the exact
  SHA the orchestrator merges. Delete it after the wave merge — run 33208356486's results persist
  independently of the ref.
- **The tooling half of Phase 4 is closed.** The feature half can add Server Actions under
  `src/features/tasks/actions/` with nothing but a `"use server"` directive; a double module or a
  `vitest.config.ts` entry is now a CI failure, not a style note.
- **The AST reader's limit is the thing most likely to bite the feature half.** The transform
  collects exported const arrow functions only. The moment a task/subtask action module exports a
  const object or a value something imports, that import silently resolves to `undefined`. It is
  recorded in tech/0020 and pinned by a test, but no gate catches a new occurrence.

## Self-Check: PASSED

- `.planning/phases/04-task-subtask-workflow/04-11-SUMMARY.md` — FOUND
- `scripts/check-action-verbs.mjs` — FOUND (modified)
- `scripts/check-action-verbs.unit.test.mjs` — FOUND (modified)
- `docs/adr/tech/0020-no-mocking-policy.md` — FOUND (modified, not superseded)
- `docs/adr/tech/0025-direct-composed-story-rendering.md` — FOUND (modified)
- `CONVENTIONS.md` — FOUND (modified)
- Commits `634e3ce`, `c03e72f`, `25d9ad1` — all present in `git log`
- `next-env.d.ts` unchanged versus `d6847d9`; working tree clean
- No modification to `.planning/STATE.md` or `.planning/ROADMAP.md`
