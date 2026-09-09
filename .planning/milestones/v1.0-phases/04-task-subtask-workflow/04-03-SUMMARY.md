---
phase: 04-task-subtask-workflow
plan: 03
subsystem: testing
tags: [vite-plugin, vitest, typescript-compiler-api, server-actions, test-doubles, storybook]

requires:
  - phase: 03-column-management
    provides: "The twelve hand-written `*-action-storybook-stub.ts` modules and the twelve-entry `serverActionStubAlias` register this mechanism replaces"
  - phase: spike/action-stub-automation
    provides: "The proven prototype (transform + generic recorder) and the measured 104-failure design gap D-02 closes"
provides:
  - "`serverActionStubPlugin` — a Vite `transform` that turns any `\"use server\"` module into a recorder with the same export names"
  - "`registerActionStub` / `actionStub` / `resetAllActionStubs` / `assertNoUnqueuedActionCalls` — one generic programmable recorder"
  - "A typed `actionStub(action)` lookup whose `queue` and `calls` infer from the real action's signature"
  - "The unqueued-call report that delivers D-03's purpose without throwing into a hook's catch"
affects: [04-04-wiring, 04-05-onward-task-actions, docs/adr/tech/0020-amendment]

actuals:
  tokens: 7300
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Build-time module substitution via a Vite `transform` plugin, replacing a per-module resolve-alias register"
    - "Control surface attached to the stub function under a module-private symbol, so lookup is by binding rather than by string key"
    - "`@ts-expect-error` used as a compile-time assertion — `tsc --noEmit` fails if the error it marks disappears"

key-files:
  created:
    - scripts/vite-plugin-server-action-stub.mjs
    - scripts/vite-plugin-server-action-stub.unit.test.mjs
    - src/test-utils/action-stub-registry.ts
    - src/test-utils/action-stub-registry.unit.test.ts
  modified: []

key-decisions:
  - "`registerActionStub` takes one destructured object (`{ moduleKey, exportName }`), not two positional args — ADR tech/0016 is mechanically enforced and the plugin emits the object form"
  - "`registerActionStub` returns the loose `AnyServerAction` rather than a caller-supplied generic; at a real call site `tsc` reads the REAL action module's types and never sees this function"
  - "An unqueued call is recorded and reported from a global `afterEach`, not thrown at the call site — a throw is swallowed by every hook's `.catch(() => ({ status: ERROR }))`"
  - "`resetAllActionStubs()` deliberately does NOT clear the unqueued-call report, so the wiring plan's global hook can reset first and assert second and always run both"
  - "The extension guard is `/\\.tsx?($|\\?)/`, not the spike's `/\\.tsx?$/` — a Vite query suffix made the anchored form reject every real request"

patterns-established:
  - "Coupling-as-a-test: the plugin's own suite globs every real `src/features/<domain>/actions/` module through the transform, so the `/actions/` path guard is checked rather than assumed"
  - "Recorded-limit assertions: the AST reader's dropped non-function exports are asserted by a test, not only noted in a comment"
  - "RED gate landable in this repo by committing a throwing/null-returning skeleton beside the failing test, so the type-aware pre-commit hook can resolve the imports"

requirements-completed: [TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, SUBTASK-01, SUBTASK-02, SUBTASK-03, SUBTASK-04, SYNC-01]

coverage:
  - id: D1
    description: "A `\"use server\"` Vite transform emits a recorder module carrying the same export names, so a new Server Action needs no double file and no config entry"
    verification:
      - kind: unit
        ref: "scripts/vite-plugin-server-action-stub.unit.test.mjs#match conditions"
        status: pass
    human_judgment: false
  - id: D2
    description: "One generic programmable recorder subsumes the queue/hold/settle/reset/calls skeleton copy-pasted across twelve stub modules"
    verification:
      - kind: unit
        ref: "src/test-utils/action-stub-registry.unit.test.ts#registerActionStub, hold and settle, resetAllActionStubs"
        status: pass
    human_judgment: false
  - id: D3
    description: "The `/actions/` path guard is coupled to reality: every real action module in this repo is transformed and yields at least one export name"
    verification:
      - kind: unit
        ref: "scripts/vite-plugin-server-action-stub.unit.test.mjs#transforms %s into a recorder exporting at least one name"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-02 holds — no per-action success payload and no per-action registration; an unqueued call resolves and is reported, never silently succeeding"
    verification:
      - kind: unit
        ref: "src/test-utils/action-stub-registry.unit.test.ts#assertNoUnqueuedActionCalls"
        status: pass
    human_judgment: false
  - id: D5
    description: "`queue` and `calls` infer from the real action's signature, restoring the compile-time narrowing the hand-written helpers gave up"
    verification:
      - kind: unit
        ref: "src/test-utils/action-stub-registry.unit.test.ts#rejects a queued payload that is not the action's own awaited return type"
        status: pass
      - kind: other
        ref: "pnpm exec tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D6
    description: "The emitted module drops exported non-function declarations and still parses — the recorded limit asserted rather than assumed"
    verification:
      - kind: unit
        ref: "scripts/vite-plugin-server-action-stub.unit.test.mjs#emits a parseable module for an action carrying extra exported non-function declarations"
        status: pass
    human_judgment: false
  - id: D7
    description: "Nothing is wired: the existing suite is unchanged, so no existing test moved"
    verification:
      - kind: other
        ref: "pnpm test — 97 files / 1353 tests passed, exit 0"
        status: pass
    human_judgment: false

duration: 40 min
completed: 2026-08-28
status: complete
---

# Phase 4 Plan 3: Server Action Stub Tooling Summary

**A `"use server"` Vite transform plus one generic programmable recorder, proven in isolation against this repo's twelve real action modules — the mechanism that lets Phase 4's seven new task/subtask actions ship with no double file and no register entry.**

## Performance

- **Duration:** 40 min
- **Started:** 2026-08-28T12:03:00Z
- **Completed:** 2026-08-28T12:43:00Z
- **Tasks:** 3
- **Files created:** 4 (no existing file modified)

## Accomplishments

- `scripts/vite-plugin-server-action-stub.mjs` detects a leading `"use server"` directive, reads exported const arrow-function names off the TypeScript AST, and emits a recorder module carrying the same export names. Proven against every real `src/features/<domain>/actions/` module in the repo, not only a fixture.
- `src/test-utils/action-stub-registry.ts` replaces the queue/hold/settle/reset/calls skeleton currently copy-pasted across twelve modules with a single recorder. The control surface rides on the stub function under a module-private symbol, so `actionStub(someAction)` is a typed lookup off the imported binding and no test file ever spells a module-key string.
- The typed lookup restores compile-time narrowing without any per-action declaration: `queue` accepts only the action's own awaited return type and `calls` is typed as its first parameter, both inferred from the real signature that `tsc` reads directly.
- D-02 holds with no escape hatch: no per-action success payload, no per-action registration, no success-factory map. An unqueued call resolves and is recorded; `assertNoUnqueuedActionCalls()` reports it naming `moduleKey#exportName` and how to queue an outcome.
- 40 new tests (27 plugin, 13 recorder). The full suite is 97 files / 1353 tests, exit 0 — nothing wired, nothing moved.

## Task Commits

1. **Task 1: The generic recorder and its typed lookup** — `cb95cab` (test, RED) → `b2434cc` (feat, GREEN)
2. **Task 2: The `"use server"` transform plugin** — `24cf75b` (test, RED) → `32bd033` (feat, GREEN)
3. **Task 3: Prove the emitted module round-trips against a real action's types** — `c54ffd4` (test)

## Files Created/Modified

- `scripts/vite-plugin-server-action-stub.mjs` — the transform. Exports `serverActionStubPlugin`, plus `hasUseServerDirective`, `readExportedFunctionNames`, `deriveModuleKey`, `buildStubModule` and `ACTION_STUB_REGISTRY_SPECIFIER` for its own test.
- `scripts/vite-plugin-server-action-stub.unit.test.mjs` — 27 cases in the `node` project: the positive transform, all three negatives individually, module-key derivation including a stripped query suffix, the every-real-action coupling gate, and the round-trip against the real `create-column-action.ts`.
- `src/test-utils/action-stub-registry.ts` — exports exactly `registerActionStub`, `actionStub`, `resetAllActionStubs`, `assertNoUnqueuedActionCalls` and the `Stub` type.
- `src/test-utils/action-stub-registry.unit.test.ts` — 13 cases in the `unit` project covering queue FIFO, call recording, hold/settle, reset, the unqueued report's message content and self-clearing, and the type gate.

## Decisions Made

- **The recorder's registration signature is an object, not two positional args.** ESLint mechanically enforces ADR tech/0016 at every declaration site, so `registerActionStub({ moduleKey, exportName })` is the only shape that lints. The plugin emits that form. This differs cosmetically from the plan's prose and the spike's prototype; the semantics are identical.
- **`registerActionStub` returns `AnyServerAction`, not a caller-supplied generic.** A type parameter used only in the return position is a type assertion in disguise, which `@typescript-eslint/no-unnecessary-type-parameters` rejects. It also costs nothing: the only production caller is the emitted JavaScript module, and at a real call site `tsc` reads the REAL action module's types because the transform is invisible to the typechecker. The recorder's own unit test casts explicitly, which is a faithful simulation of that.
- **`resetAllActionStubs()` does not clear the unqueued-call report.** That ordering choice is what lets the wiring plan's global `afterEach` reset first and assert second, so both always run even when the assert throws. Asserted by its own test so a later "tidy-up" cannot silently break it.
- **D-03's purpose is honoured through a different mechanism than its stated one**, recorded as a segregated decision block in `action-stub-registry.ts` with the condition that would make it wrong (a hook that awaits an action without a catch).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The spike's extension guard rejects every real Vite request**

- **Found during:** Task 2 (the transform plugin)
- **Issue:** The prototype's `/\.tsx?$/` is anchored at end-of-string, but Vite appends `?t=…`/`?import` suffixes to a module id. Carried over verbatim, the plugin would have matched only in the plan's own fixtures and silently never fired in a real run — the exact class of failure the plan's coupling gate exists to catch.
- **Fix:** Widened to `/\.tsx?($|\?)/`, and added a module-key test that feeds an id carrying a `?t=` suffix.
- **Files modified:** `scripts/vite-plugin-server-action-stub.mjs`
- **Verification:** `scripts/vite-plugin-server-action-stub.unit.test.mjs` — "strips a Vite query suffix" (pass)
- **Committed in:** `32bd033`

**2. [Rule 3 - Blocking] Two positional parameters do not lint in this repo**

- **Found during:** Task 1
- **Issue:** The plan and the spike both specify `registerActionStub(moduleKey, exportName)`. ESLint's `no-restricted-syntax` block 8d rejects any declaration site with 2+ positional parameters (ADR tech/0016).
- **Fix:** One destructured object parameter; the plugin's `buildStubModule` emits the matching object form.
- **Files modified:** `src/test-utils/action-stub-registry.ts`, `scripts/vite-plugin-server-action-stub.mjs`
- **Verification:** `pnpm lint` exits 0; the plugin test asserts the emitted `moduleKey: "…"` text.
- **Committed in:** `b2434cc`, `32bd033`

**3. [Rule 3 - Blocking] A return-position-only type parameter does not lint**

- **Found during:** Task 1
- **Issue:** The plan specifies `registerActionStub` return the caller's `A`. `@typescript-eslint/no-unnecessary-type-parameters` errors on a type parameter used once.
- **Fix:** Return `AnyServerAction`; the unit test casts to the local `CreateColumnAction` shape, which is what `tsc` genuinely sees at a real call site.
- **Files modified:** `src/test-utils/action-stub-registry.ts`, `src/test-utils/action-stub-registry.unit.test.ts`
- **Verification:** `pnpm lint` and `pnpm exec tsc --noEmit` both exit 0; `actionStub`'s inference is unaffected (its `A` appears in both parameter and return position).
- **Committed in:** `b2434cc`

**4. [Rule 3 - Blocking] Vite's `transform` hook arity needs the ADR's own carve-out**

- **Found during:** Task 2
- **Issue:** Vite calls `transform(code, id)` positionally, which the same rule 8d rejects.
- **Fix:** A single `// eslint-disable-next-line no-restricted-syntax` carrying the API-dictated reason — the escape hatch rule 8d's own comment names for exactly this case.
- **Files modified:** `scripts/vite-plugin-server-action-stub.mjs`
- **Verification:** `pnpm lint` exits 0.
- **Committed in:** `32bd033`

**5. [Rule 2 - Missing Critical] Guard against a module exporting no arrow function**

- **Found during:** Task 2
- **Issue:** A `"use server"` module whose exports are all types would otherwise be replaced by an empty recorder — the real module silently swapped for nothing.
- **Fix:** `transform` returns `null` when the reader finds no names (carried from the spike, and given its own asserting test rather than left implicit).
- **Files modified:** `scripts/vite-plugin-server-action-stub.mjs`
- **Verification:** "leaves a `use server` module exporting no arrow function untouched" (pass)
- **Committed in:** `32bd033`

---

**Total deviations:** 5 auto-fixed (1 bug, 3 blocking, 1 missing critical)
**Impact on plan:** No scope change. Four of the five are this repo's own mechanically-enforced conventions forcing a different spelling of the same semantics; the fifth is a real defect in the prototype the plan told me to adopt, which would have made the transform a no-op in production.

## TDD Gate Compliance

Tasks 1 and 2 were `tdd="true"` and **both landed separate RED and GREEN commits** — `cb95cab`/`b2434cc` and `24cf75b`/`32bd033`. Each RED gate was observed genuinely failing before implementation (12/12 and 21/27 respectively; the 6 passing in Task 2's RED were the negative cases, which a null-returning skeleton satisfies trivially).

This updates a recorded project finding. Prior phases concluded a separate RED commit is unachievable here, because the husky pre-commit hook runs type-aware `eslint --fix` and an import resolving to nothing produces 40+ `no-unsafe-*` errors. The workaround: **commit a skeleton of the target module alongside the failing test** — signatures matching the final ones, bodies that throw (Task 1) or return `null` (Task 2). Imports then resolve, the hook passes, and the tests still fail on behaviour rather than on module resolution, which is the stronger RED signal `tdd.md` asks for. No `--no-verify` was used anywhere.

Task 3 was `type="auto"` and additive to two existing suites, so it carries a single `test(...)` commit with no gate sequence of its own.

## Issues Encountered

- **The worktree had no `node_modules` and no Next.js generated route types.** `pnpm install --frozen-lockfile` plus `pnpm exec next typegen` were needed before `tsc --noEmit` could reach a clean baseline; without typegen it reports two spurious `Cannot find name 'PageProps'/'LayoutProps'` errors in files this plan never touches. Environment setup only — nothing committed, and the baseline was confirmed clean before any change was made.
- **A zero-width space briefly landed in a comment.** Writing `src/features/*/actions/` inside a `/* */` block terminates the comment at `*/`; I initially dodged that with U+200B, which committed in `cb95cab`. Caught by an explicit scan and replaced with `src/features/<domain>/actions/` in `32bd033`. No invisible characters remain in either file.

## Note on `requirements-completed`

The IDs above are copied verbatim from this plan's `requirements` frontmatter as the template requires. **This plan delivers none of them directly** — it is the tooling that the rest of the phase's plans build the seven task/subtask actions on. Every ID is also declared by sibling plans in this phase, so the shared-ID gate keeps them from reading `Complete` until the last declaring plan finishes. Nothing here should be read as TASK-01..05 / SUBTASK-01..04 / SYNC-01 being built.

## User Setup Required

None — no external service configuration required. This plan installs nothing; `typescript` and `vitest` were already direct devDependencies.

## Next Phase Readiness

The mechanism exists and is proven in isolation. Ready for the wiring plan, which is now a config change against a proven runtime rather than a config change plus an unproven one. That plan still owns:

- Scoping `serverActionStubPlugin` to the `browser` and `storybook` Vitest projects and Storybook's dev server, and asserting `next build` never loads it (threat T-04-07 — the plugin is authored here but wired nowhere, so the mitigation is not yet in force).
- Deleting the twelve `*-action-storybook-stub.ts` modules and the whole `serverActionStubAlias` register, including the four re-exports in `src/test-utils/index.ts`.
- The global `afterEach` (D-04). Call `resetAllActionStubs()` **then** `assertNoUnqueuedActionCalls()` — that order is deliberate and asserted; reversing it would skip the reset whenever the assert throws.
- Rewriting the 104 assertions across `board-view.test.tsx`, `board-list.test.tsx`, `sortable-column.test.tsx` and `rename-override-provider.test.tsx` to queue their outcomes explicitly (D-02's accepted cost).
- Amending `docs/adr/tech/0020-no-mocking-policy.md` in place (D-05), including the four-vs-twelve drift the spike found.

Two limits are recorded in the plugin source and asserted by tests, and both become real breakages the moment they are crossed: an action placed outside an `actions/` folder is silently not transformed, and an exported non-function (a type, a const object) is dropped from the emitted module.

## Self-Check: PASSED

- `scripts/vite-plugin-server-action-stub.mjs` — FOUND
- `scripts/vite-plugin-server-action-stub.unit.test.mjs` — FOUND
- `src/test-utils/action-stub-registry.ts` — FOUND
- `src/test-utils/action-stub-registry.unit.test.ts` — FOUND
- Commits `cb95cab`, `b2434cc`, `24cf75b`, `32bd033`, `c54ffd4` — all present in `git log`
- `pnpm exec vitest run --project unit src/test-utils/action-stub-registry.unit.test.ts` — 13 passed, exit 0
- `pnpm exec vitest run --project node scripts/vite-plugin-server-action-stub.unit.test.mjs` — 27 passed, exit 0
- `pnpm exec tsc --noEmit` — exit 0
- `pnpm lint` — exit 0
- `pnpm format:check` — exit 0
- `pnpm comments:check` — exit 0
- `pnpm test` — 97 files / 1353 tests passed, exit 0
- `grep -c 'Parameters<' src/test-utils/action-stub-registry.ts` — 1
- `grep -c 'enforce' scripts/vite-plugin-server-action-stub.mjs` — 1, value `"pre"`
- `node --check scripts/vite-plugin-server-action-stub.mjs` — exit 0

---

_Phase: 04-task-subtask-workflow_
_Completed: 2026-08-28_
