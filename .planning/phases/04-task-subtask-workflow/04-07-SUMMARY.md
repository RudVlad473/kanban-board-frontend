---
phase: 04-task-subtask-workflow
plan: 07
subsystem: testing
tags: [vite-plugin, vitest, storybook, server-actions, test-doubles, vite-final]

requires:
  - phase: 04-task-subtask-workflow
    provides: "Plan 04-03's `serverActionStubPlugin` transform and the generic `action-stub-registry` recorder, authored and proven in isolation but wired nowhere"
  - phase: 03-column-management
    provides: "The twelve-entry `serverActionStubAlias` register this plan deliberately leaves standing"
provides:
  - "`serverActionStubPlugin` live in all three consumers: the `browser` and `storybook` Vitest projects and Storybook's own dev server"
  - "D-04's single global `afterEach` stub reset plus the unqueued-call report, with no opt-out"
  - "The `pnpm storybook` dev-server crash closed — proven by observation in both directions"
  - "Threat T-04-07 in force: `pnpm build` carries no recorder code into `.next`"
affects: [04-08-auth-theme-cutover, 04-09-board-cutover, 04-10-column-cutover-and-register-deletion, 04-12-onward-task-actions]

actuals:
  tokens: 1800
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Storybook's `viteFinal` as the third wiring point for a Vite plugin the Vitest projects already carry — the seam that let the manual dev server and the test runner disagree"
    - "Causal proof by control run: revert the one changed key, reproduce the recorded error verbatim, restore, re-observe the fix"

key-files:
  created: []
  modified:
    - vitest.config.ts
    - vitest.setup.ts
    - .storybook/main.ts

key-decisions:
  - "The transitional register note was folded INTO the existing carve-out comment rather than added beside it — `check-comment-length.mjs` merges adjacent comment blocks into one run, so two 3-line blocks read as one 6-line violation"
  - "The `storybook` project lists the transform first as documentation of intent only; `enforce: \"pre\"` is what actually orders it, and the comment says so rather than implying array position matters"
  - "The reset/assert pair sits at the END of the existing `afterEach`, after the render cleanups — so a throwing assertion cannot skip the DOM cleanup that every following test depends on"
  - "`.storybook/main.ts` got the plugin, NOT a copy of `serverActionStubAlias`: the todo's own suspected fix would not have worked, because `sign-out-action-storybook-stub.ts` imports `@/lib/server/session` itself"

patterns-established:
  - "Verify a build-time transform against real module ids by curling the dev server for the real path and reading what it serves, not by trusting a fixture test"
  - "Prove a config fix is causal with a control run: revert the single key, reproduce the recorded failure verbatim, restore"

requirements-completed: [TASK-01, TASK-02, TASK-03, TASK-04, TASK-05, SUBTASK-01, SUBTASK-02, SUBTASK-03, SUBTASK-04, SYNC-01]

coverage:
  - id: D1
    description: "`serverActionStubPlugin` runs in the `browser` and `storybook` Vitest projects with the alias register still shadowing it, and no existing assertion moved"
    verification:
      - kind: other
        ref: "pnpm test — 100 files / 1424 tests passed, exit 0, identical to the pre-plan baseline"
        status: pass
      - kind: other
        ref: "pnpm exec vitest run --project storybook — 32 files / 203 tests passed, exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "The transform genuinely fires against a REAL action module id in the wired `browser` project — not only in the plugin's own fixtures — and the alias register takes precedence where both apply"
    verification:
      - kind: other
        ref: "Control experiment (uncommitted): one alias entry removed → board-view.test.tsx failed 22/120 with `A Server Action stub was called with no queued outcome: src/features/boards/actions/create-column-action.ts#createColumnAction`"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-04: one global `afterEach` resets every registered stub and then reports any unqueued call, with no opt-out and no per-file call"
    verification:
      - kind: other
        ref: "pnpm test:browser — 35 files / 864 tests passed, exit 0"
        status: pass
      - kind: other
        ref: "The same control experiment above — the report surfaced through this hook, naming moduleKey#exportName"
        status: pass
    human_judgment: false
  - id: D4
    description: "Storybook's own dev server resolves Server Actions the same way the Vitest projects do, closing the folded `pnpm storybook` crash todo"
    verification:
      - kind: automated_ui
        ref: "playwright screenshot (headless chromium) of http://localhost:6006/iframe.html?id=components-layout-board-view--populated — story renders; HAR: 131x200 / 2x101, zero requests for node:crypto or session.ts"
        status: pass
      - kind: automated_ui
        ref: "Control run with viteFinal reverted — reproduces the todo's recorded error verbatim at __vite-browser-external:node:crypto:3:11 / session.ts:1:50"
        status: pass
      - kind: other
        ref: "pnpm build-storybook — exit 0"
        status: pass
    human_judgment: true
    rationale: "The render was observed through the Playwright CLI in headless Chromium, not through this project's own `mcp__playwright__` MCP server, which does not resolve inside a spawned subagent (project-scoped `.mcp.json` servers are invisible to subagents). CLAUDE.md names that server specifically, so the observation should be re-confirmed by a human or by a main-context agent that can resolve it."
  - id: D5
    description: "Threat T-04-07: the transform reaches the two Chromium Vitest projects and Storybook's dev server ONLY — production and the non-browser projects load the real action modules"
    verification:
      - kind: other
        ref: "pnpm build — exit 0; `grep -rl registerActionStub .next` returns nothing"
        status: pass
      - kind: other
        ref: "git diff — next.config.ts and playwright.config.ts untouched; the node/unit/tokens projects have no plugins array"
        status: pass
    human_judgment: false

duration: 28 min
completed: 2026-08-28
status: complete
---

# Phase 4 Plan 7: Wire the Server Action Transform Summary

**`serverActionStubPlugin` made live in all three consumers plus D-04's global reset — a 35-line config change that moves no assertion, and closes the two-day-old `pnpm storybook` crash as a side effect, proven by a control run that reproduces the recorded error verbatim.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-08-28T13:56:00Z
- **Completed:** 2026-08-28T14:24:31Z
- **Tasks:** 3
- **Files modified:** 3 (plus one todo file moved to `completed/`)

## Accomplishments

- The transform is wired into all three consumers, not one. The `browser` Vitest project gained a `plugins` array it never had; the `storybook` project's existing array gained it; and `.storybook/main.ts` gained the `viteFinal` it never had. That third one is the seam that let the manual dev server and the Vitest project that shares its `configDir` behave differently.
- **The transform demonstrably fires against real module ids, in two of the three consumers, by direct observation.** The dev server serves `src/features/boards/actions/create-column-action.ts` and `src/features/auth/actions/sign-out-action.ts` as recorder modules carrying the correct `moduleKey`/`exportName`. In the `browser` project, a control experiment (removing one alias entry) produced `A Server Action stub was called with no queued outcome: src/features/boards/actions/create-column-action.ts#createColumnAction` — the real module id, from the wired pipeline. This was the specific failure mode plan 04-03's widened extension guard warned about, and it is now checked rather than assumed.
- D-04 landed in the existing centralized `afterEach`: `resetAllActionStubs()` then `assertNoUnqueuedActionCalls()`, in that order, with no opt-out. The pair sits after the render cleanups so a throwing assertion cannot skip them.
- **The folded todo is closed by observation in both directions.** With `viteFinal`, the `BoardView` `Populated` story renders in headless Chromium and the HAR shows 131×200 / 2×101 with zero requests for `node:crypto` or `session.ts`. With `viteFinal` reverted, the same URL reproduces the todo's recorded error verbatim. The todo file has moved to `.planning/todos/completed/` carrying that evidence.
- Threat T-04-07 is in force rather than merely stated: `pnpm build` is green and `grep -rl registerActionStub .next` returns nothing, so production loads the real modules.
- Nothing moved. `pnpm test` is 100 files / 1424 tests, exit 0 — byte-identical to the pre-plan baseline count.

## Task Commits

1. **Task 1: Wire the transform into both Chromium Vitest projects** — `82e94a1` (feat)
2. **Task 2: D-04's single global reset and the unqueued-call report** — `86d75e6` (feat)
3. **Task 3: Wire Storybook's own dev server and prove the crash is closed** — `0f1219e` (feat)

## Files Created/Modified

- `vitest.config.ts` — imports `serverActionStubPlugin`; new `plugins` array on the `browser` project; the plugin prepended to the `storybook` project's existing array. The twelve-entry register is untouched and now carries a note that it is transitional, naming 04-08/09/10.
- `vitest.setup.ts` — imports the two registry functions and appends `resetAllActionStubs()` then `assertNoUnqueuedActionCalls()` to the existing global `afterEach`, under a short decision comment.
- `.storybook/main.ts` — new `viteFinal` appending the same plugin to the dev server's Vite config. Framework entry, addons and conditional `staticDirs` unchanged.
- `.planning/todos/pending/…storybook-dev-server-crashes….md` → `.planning/todos/completed/`, with a resolution section recording both directions of the observation and correcting the todo's own suspected fix.

## Decisions Made

- **The transitional note was folded into the existing carve-out comment, not added beside it.** `scripts/check-comment-length.mjs` closes a block only on a non-comment line, so two adjacent `/* */` blocks are scored as one run — a 3-line note next to the existing 3-line comment reported as a single 6-line violation. Folding keeps both facts inside one 3-line block.
- **The `storybook` project's array order is documentation, not mechanism.** The comment says explicitly that `enforce: "pre"` is what orders the transform ahead of `@storybook/nextjs-vite`, so a future reader does not conclude that array position is load-bearing and "tidy" it into a bug.
- **The reset/assert pair goes last in the `afterEach`.** If the assertion throws, the render cleanups have already run; putting the pair first would let one forgotten queue leave DOM behind for every following test in the file.
- **`.storybook/main.ts` got the plugin, not a copy of the alias register.** The todo's own suspected fix ("check whether `.storybook/main.ts` needs the same `serverActionStubAlias` map") would not have worked: `src/test-utils/sign-out-action-storybook-stub.ts` imports `@/lib/server/session` itself, so aliasing moves the `node:crypto` crash one module along rather than removing it. Recorded in the completed todo so the wrong fix is not retried.

## Deviations from Plan

None — no code deviated from the plan. Three acceptance criteria are recorded below as **stated-versus-satisfied** notes rather than deviations, because in each case the plan's literal `grep -c` count did not account for the import statement the wiring necessarily adds.

| Criterion as written | Literal result | Intent, and how it was checked |
|---|---|---|
| `grep -c 'serverActionStubPlugin' vitest.config.ts` is 2 | 4 (import, register comment, 2 call sites) | "one per Chromium project" — `grep -c 'serverActionStubPlugin({ rootDir })'` is exactly **2** |
| `grep -c 'resetAllActionStubs' vitest.setup.ts` is 1, same for `assertNoUnqueuedActionCalls` | 2 each (import + call) | one call site each — lines 61 and 62, reset first |
| `grep -c 'serverActionStubPlugin' .storybook/main.ts` is 1 | 2 (import + call site) | one call site, inside `viteFinal` |

Every other criterion passed literally, including `grep -c 'viteFinal' .storybook/main.ts` = 1 and the opt-out check (`grep -v '^\s*[*/]' vitest.setup.ts \| grep -c 'optOut'` = 0; the one `grep -c 'skip\|opt-out\|optOut'` hit is the prose "with no opt-out", which the criterion explicitly excludes).

## Issues Encountered

- **The pre-plan baseline run had one failure, and it was not mine.** `pnpm test` before any change was 1423/1424 with `delete-column-action.integration.test.ts > refuses a stranger's delete` failing at `expect(response.ok).toBe(true)` in its own `createBoardUpstream` setup. Re-run in isolation it passed 4/4, and both post-change full runs were 1424/1424. This is a real-backend integration test starved under full-suite contention — the signature CONVENTIONS.md's "Test runner concurrency" section describes. Recorded because the baseline count in the acceptance criteria is 1424 *tests*, and a reader comparing raw run output would otherwise see 1423 vs 1424 and think something moved.
- **The verification browser was the Playwright CLI, not this project's `mcp__playwright__` MCP server.** CLAUDE.md and Task 3 both name that server. It does not resolve inside a spawned subagent — project-scoped `.mcp.json` servers are invisible to subagents, which inherit only user-scoped MCP config — and CLAUDE.md bars falling back to the globally-installed `mcp__plugin_playwright_playwright__*` variant, so I used neither. `pnpm exec playwright screenshot` is a first-class CLI command (headless by default), drives real Chromium against the real running dev server, and needed no throwaway script; output went to the session scratchpad, so nothing was left in the tree. This is flagged in `coverage` D4 as `human_judgment: true`.
- **This plan changes no UI, so no mock comparison was made.** The `BoardView` screenshots are crash evidence, not design evidence; the surface itself is unchanged Phase 2/3 work verified in those phases.

## Known Limits (not stubs — recorded so the next plans read them correctly)

- **The transform is currently shadowed for all twelve existing actions in the two Vitest projects.** Every real action module has a register entry, and the alias resolves before the transform can see the module, so under normal `pnpm test` the transform fires for zero existing modules there. That is exactly what the plan intends ("no assertion moves"), and it is why D2's proof required temporarily removing an entry. It stops being true entry by entry across 04-08, 04-09 and 04-10.
- **Storybook's dev server is the one consumer with no register at all**, which is why the transform is unambiguously live there today and why the crash fix is real rather than incidental.
- Plan 04-03's two recorded limits still stand and are unchanged here: an action outside an `actions/` folder is silently not transformed, and an exported non-function is dropped from the emitted module.

## User Setup Required

None — this plan installs nothing and configures no external service.

## Next Phase Readiness

The mechanism is live and a new Server Action needs no double file and no register entry — the property that unblocks the seven task/subtask actions. What plan 04-08 inherits:

- The register is intact at twelve entries and annotated as transitional. 04-08 removes the four auth/theme entries plus their double files; no test file imports those four, which is why it is the cheapest first cut.
- The global `afterEach` is already in place, so a cutover plan adds no setup wiring — only `actionStub(…).queue(…)` calls at the assertion sites.
- The reset-then-assert ordering in `vitest.setup.ts` is load-bearing and asserted by 04-03's own test. Do not reverse it.
- `.storybook/main.ts`'s `viteFinal` may mean the plugin is registered twice in the `storybook` Vitest project (once directly, once through `storybookTest`'s `configDir` read). Harmless — the second pass sees already-transformed source with no `"use server"` directive and returns `null` — but worth knowing before debugging a double-transform.

## Self-Check: PASSED

- `vitest.config.ts` — FOUND, modified
- `vitest.setup.ts` — FOUND, modified
- `.storybook/main.ts` — FOUND, modified
- `.planning/todos/completed/2026-08-26-storybook-dev-server-crashes-on-any-story-reaching-session-ts.md` — FOUND; the `pending/` copy no longer exists
- Commits `82e94a1`, `86d75e6`, `0f1219e` — all present in `git log`
- `pnpm test` — 100 files / 1424 tests passed, exit 0 (baseline: 100 / 1424)
- `pnpm test:browser` — 35 files / 864 tests passed, exit 0
- `pnpm exec vitest run --project storybook` — 32 files / 203 tests passed, exit 0
- `pnpm build` — exit 0; `grep -rl registerActionStub .next` — no matches
- `pnpm build-storybook` — exit 0
- `pnpm exec tsc --noEmit` — exit 0
- `pnpm lint` — exit 0
- `pnpm comments:check` — exit 0
- `pnpm format:check` — exit 0
- `grep -c 'viteFinal' .storybook/main.ts` — 1
- `grep -c 'serverActionStubPlugin({ rootDir })' vitest.config.ts` — 2
- `git diff` on the register — no entry removed
- `git status --short` — clean; `next-env.d.ts` unmodified

---

_Phase: 04-task-subtask-workflow_
_Completed: 2026-08-28_
