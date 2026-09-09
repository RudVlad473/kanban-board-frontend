---
phase: 01-foundation-auth-preferences
plan: 10
subsystem: api
tags: [openapi-typescript, openapi-fetch, msw, server-only, next-instrumentation, nextjs-16]

# Dependency graph
requires:
  - phase: 01-foundation-auth-preferences (plans 01-01 through 01-09)
    provides: Next.js scaffold, design token pipeline, primitives library, test harness, CI
provides:
  - Committed OpenAPI contract (docs/api/kanban-board-openapi.json) with a CI drift guard
  - Server-only typed client (externalApi) targeting the external API base URL
  - MSW mock backend (store + handlers + node-server + browser) covering signup/signin/theme
  - instrumentation.ts starting Node-side MSW interception at server-process startup
affects: [01-11 (BFF Route Handlers), 01-12 (auth forms), 01-14 (theme persistence), 01-15 (deployment)]

# Actuals (#2632)
actuals:
  tokens: 52790
  tasks: 3
  commits: 3

tech-stack:
  added: [openapi-typescript@7.13.0, openapi-fetch@0.17.0, server-only, msw@2.15.0]
  patterns:
    - "BFF pass-through client (Pattern 1, 01-RESEARCH.md) — one server-only externalApi instance, never imported by a client component"
    - "MSW Node-mode interception started from instrumentation.ts, gated to NEXT_RUNTIME==='nodejs', reached via dynamic import"
    - "Enum-like const object (ADR tech/0012) for THEME, mirroring the contract's UserResponseDTO.theme enum"

key-files:
  created:
    - docs/api/kanban-board-openapi.json
    - src/lib/api/generated-types.ts
    - src/lib/api/server-client.ts
    - src/lib/mocks/store.ts
    - src/lib/mocks/handlers.ts
    - src/lib/mocks/node-server.ts
    - src/lib/mocks/browser.ts
    - src/lib/mocks/handlers.test.ts
    - instrumentation.ts
    - .env.example
  modified:
    - package.json
    - .github/workflows/ci.yml
    - vitest.config.ts
    - eslint.config.mjs
    - .prettierignore
    - pnpm-workspace.yaml

key-decisions:
  - "Task 1 checkpoint resolved (pre-approved by user before this execution): POST /signup returns the bare user id string; POST /signin returns the full UserResponseDTO ({id, email, displayName, theme}) — option 'user-dto-from-signin'."
  - "Read EXTERNAL_API_BASE_URL independently in handlers.ts (not by importing server-client.ts) so the browser worker (browser.ts) never transitively imports the server-only package."
  - "Added a lib->lib eslint-plugin-boundaries policy: src/lib/* creates one 'lib' element instance per subfolder, and no policy previously allowed a cross-instance lib->lib import (needed for the mocks test's @/lib/api/generated-types import)."

patterns-established:
  - "MSW handlers read EXTERNAL_API_BASE_URL directly (duplicated fail-fast helper) rather than importing server-client.ts, to keep browser.ts safely importable outside a server-only context."
  - "openapi-fetch's createClient() snapshots globalThis.fetch at call time — any test client must be constructed AFTER server.listen() patches the global, never before."

requirements-completed: [AUTH-01, AUTH-02, THEME-01]

coverage:
  - id: D1
    description: "OpenAPI contract committed to docs/api/, with a CI step that regenerates and diffs against the committed generated types (no error suppression)"
    requirement: "AUTH-01"
    verification:
      - kind: integration
        ref: "pnpm api:generate && git diff --exit-code src/lib/api/generated-types.ts"
        status: pass
      - kind: other
        ref: ".github/workflows/ci.yml 'API types drift' step"
        status: pass
    human_judgment: false
  - id: D2
    description: "externalApi server-only client — fails the build if imported from a client component; no hardcoded URL literal"
    requirement: "AUTH-01"
    verification:
      - kind: integration
        ref: "pnpm build (temporarily importing externalApi from a 'use client' page, confirmed failure, reverted)"
        status: pass
    human_judgment: false
  - id: D3
    description: "MSW mock backend covers signup, signin, GET/PUT theme with the eight specified behaviours, including indistinguishable auth failures and idempotent theme updates"
    requirement: "AUTH-01"
    verification:
      - kind: integration
        ref: "src/lib/mocks/handlers.test.ts (8 tests, vitest --project node)"
        status: pass
    human_judgment: false
  - id: D4
    description: "instrumentation.ts starts MSW's Node interception at server startup, gated to the Node.js runtime, reached via dynamic import; unhandled requests error"
    requirement: "THEME-01"
    verification:
      - kind: integration
        ref: "src/lib/mocks/handlers.test.ts > unhandled requests (rejects.toThrow)"
        status: pass
      - kind: e2e
        ref: "manual: next dev + temporary scratch Route Handler calling externalApi.POST('/signup'), curl confirmed a mocked response with no outbound network connection, reverted"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-08-12
status: complete
---

# Phase 01 Plan 10: OpenAPI Contract, Typed Client & MSW Mock Backend Summary

**Committed OpenAPI contract with CI drift guard, a server-only openapi-fetch client, and an MSW
mock backend whose Node-side interception starts from `instrumentation.ts` so the deployed app
(not just tests) has a real backend to talk to.**

## Performance

- **Duration:** ~45 min
- **Started:** ~2026-08-12T09:55Z (context-loading + research reading, before first commit)
- **Completed:** 2026-08-12T10:48:59Z (last commit)
- **Tasks:** 3 (Task 1 checkpoint decision pre-resolved; Task 2 and Task 3 executed)
- **Files modified:** 18

## Accomplishments

- Committed the real OpenAPI contract to `docs/api/kanban-board-openapi.json` and wired a CI step
  ("API types drift") that regenerates and fails the build on any diff — no suppression.
- `src/lib/api/server-client.ts` exports the single `externalApi` client, guarded by
  `import "server-only"` (verified: importing it from a client component fails `pnpm build`) and
  a fail-fast env-var read with zero hardcoded URL fallback (ADR tech/0006).
- Full MSW mock backend (`store.ts`, `handlers.ts`, `node-server.ts`, `browser.ts`) covering the
  four Phase 1 contract operations, built test-first (RED commit confirmed failure without the
  implementation, GREEN commit made it pass).
- `instrumentation.ts` starts the mock at server-process startup inside the Node.js runtime only,
  verified against a real `next dev` server (not just Vitest) via a temporary scratch Route
  Handler — confirmed a mocked response with zero outbound network connection.

## Task Commits

1. **Task 1: Resolve the contract's identity gap** — pre-resolved by the user before this
   execution (see Decisions Made). No commit of its own; recorded here per the objective's
   instruction.
2. **Task 2: Commit the contract, generate typed client code, guard drift** — `6f7bf41` (feat)
3. **Task 3: MSW mock backend** — `7d5707b` (test, RED) → `3e04500` (feat, GREEN)

**Plan metadata:** commit created at end of this execution (see final commit list returned to
orchestrator).

_TDD Gate Compliance: `test(01-10)` commit `7d5707b` precedes `feat(01-10)` commit `3e04500`.
RED was verified concretely — the implementation files were moved aside and `vitest run
--project node` was re-run, confirming a real failure (`Cannot find package '@/lib/mocks/store'`)
before they were restored and the GREEN commit made._

## Files Created/Modified

- `docs/api/kanban-board-openapi.json` — committed copy of the OpenAPI contract (the
  `.planning/local-assets/` copy is git-ignored developer input)
- `src/lib/api/generated-types.ts` — openapi-typescript output, never hand-edited
- `src/lib/api/server-client.ts` — the server-only `externalApi` client
- `.env.example` — documents `EXTERNAL_API_BASE_URL`
- `.github/workflows/ci.yml` — added "API types drift" step; job-level `EXTERNAL_API_BASE_URL`
  env var so `pnpm build`/`pnpm test` don't fail on the fail-fast read in CI
- `src/lib/mocks/store.ts` — in-memory user map, temp-file mirror, seeded demo account, `THEME`
  enum-like const
- `src/lib/mocks/handlers.ts` — the four MSW request handlers
- `src/lib/mocks/node-server.ts` / `browser.ts` — `setupServer`/`setupWorker` exports
- `src/lib/mocks/handlers.test.ts` — 8 behaviour tests, driven through the real `externalApi`
  client with the Node server listening
- `instrumentation.ts` — Next.js startup hook (repo root)
- `vitest.config.ts` — new `node` project for the mocks test
- `eslint.config.mjs` — new `lib->lib` boundaries policy; `public/mockServiceWorker.js` ignored
- `.prettierignore` — `public/mockServiceWorker.js` ignored
- `package.json` — `openapi-fetch`, `server-only` (deps); `openapi-typescript`, `msw` (devDeps);
  `api:generate` script; `msw.workerDirectory` (from `msw init`)
- `pnpm-workspace.yaml` — `msw` added to `allowBuilds` (its postinstall script was reviewed and
  approved in 01-RESEARCH.md's Package Legitimacy Audit)

## Decisions Made

- **Task 1 checkpoint, pre-resolved:** `POST /signup` returns the bare user id string;
  `POST /signin` returns the full `UserResponseDTO` (`{id, email, displayName, theme}`) — option
  `user-dto-from-signin`. This shape now defines the session payload for plans 01-11/01-14 and the
  behaviour the real backend will eventually have to match.
- Kept `handlers.ts`'s `EXTERNAL_API_BASE_URL` read independent from `server-client.ts` (a small
  duplicated fail-fast helper) rather than importing the client module, because
  `server-client.ts` starts with `import "server-only"` — safe in the Node mock server, but would
  break `browser.ts`'s Storybook/browser-mode use of the same handler array.
- `openapi-fetch`'s runtime always defaults to `.json()` regardless of actual response
  `Content-Type` (it doesn't sniff headers) — signup calls in the test pass
  `parseAs: "text"` explicitly rather than relying on the generated type's `"*/*": string` shape
  to change runtime parsing behaviour.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Copied the git-ignored OpenAPI contract into the worktree**
- **Found during:** Task 2 (precondition check)
- **Issue:** `.planning/local-assets/kanban-board-openapi.json` is git-ignored developer input;
  it exists in the main checkout but worktrees only get tracked files, so the precondition file
  was missing in this worktree.
- **Fix:** Copied the file from the main repo's `.planning/local-assets/` into this worktree's
  identical (git-ignored) path before proceeding — no git operation involved, just a local file
  copy of an already-ignored asset.
- **Files modified:** `.planning/local-assets/kanban-board-openapi.json` (not committed; ignored)
- **Verification:** File present, parses as JSON, contains `/signup`, `/signin`,
  `/users/me/theme` paths.

**2. [Rule 3 - Blocking] Added a `lib -> lib` eslint-plugin-boundaries policy**
- **Found during:** Task 3
- **Issue:** `src/lib/*` treats each subfolder (`api`, `mocks`, ...) as a distinct "lib" element
  instance; no existing policy allowed a cross-instance `lib -> lib` import. The mocks test's
  `@/lib/api/generated-types` import (needed to type the test's `externalApi` client) tripped
  `boundaries/dependencies` with "no policy allowing dependencies from elements of type 'lib' to
  elements of type 'lib'".
- **Fix:** Added `{ from: { element: { type: "lib" } }, allow: [{ to: { element: { type: "lib" } } }] }`
  to `eslint.config.mjs`'s policy list — permits cross-instance lib sharing (the whole point of a
  `lib/` folder) without loosening the feature/ui/layout boundaries.
- **Files modified:** `eslint.config.mjs`
- **Verification:** `pnpm lint` exits 0; the specific import no longer flags.
- **Committed in:** `7d5707b` (RED commit)

**3. [Rule 3 - Blocking] `openapi-fetch` client construction must happen after `server.listen()`**
- **Found during:** Task 3 (test debugging — real ECONNREFUSED errors when running the tests)
- **Issue:** `createClient()` snapshots `globalThis.fetch` as a default parameter at call time
  (`baseFetch = globalThis.fetch`), not per-request. The test originally created the client at
  module scope, before `beforeAll` called `server.listen()` — every request silently bypassed MSW
  and hit the real (non-existent) network.
- **Fix:** Declared `client` with `let` and assigned it inside `beforeAll`, after `server.listen()`.
- **Files modified:** `src/lib/mocks/handlers.test.ts`
- **Verification:** All 8 tests pass; re-ran twice to confirm no flakiness from the fix.

**4. [Rule 1 - Bug] `parseAs: "text"` required for the bare-string signup response**
- **Found during:** Task 3 (test debugging)
- **Issue:** openapi-fetch's runtime always defaults to `.json()` regardless of the operation's
  declared content type or the actual response `Content-Type` header — calling `.json()` on
  signup's bare UUID string body threw `SyntaxError: Unexpected non-whitespace character after
  JSON`.
- **Fix:** Added an explicit `parseAs: "text"` option to every signup call in the test; for
  signin (whose generated type says `content?: never` per the contract's own gap, filled by the
  Task 1 decision), read the client's `data`/`error` field directly (openapi-fetch still parses
  the real JSON body at runtime) rather than re-reading `response.json()` a second time, which
  throws "Body has already been read".
- **Files modified:** `src/lib/mocks/handlers.test.ts`
- **Verification:** All 8 tests pass.

**5. [Rule 3 - Blocking] Ignored MSW's generated browser worker script**
- **Found during:** Task 3 (`pnpm lint`)
- **Issue:** `pnpm exec msw init public/ --save` generated `public/mockServiceWorker.js` (MSW's
  own vendored asset), which ESLint's type-aware tier tried to parse (not covered by
  `tsconfig.json`'s include), failing with "was not found by the project service".
- **Fix:** Added `public/mockServiceWorker.js` to `eslint.config.mjs`'s `globalIgnores` and to
  `.prettierignore`, matching the existing treatment of `src/lib/api/generated-types.ts`.
- **Files modified:** `eslint.config.mjs`, `.prettierignore`
- **Verification:** `pnpm lint` and `pnpm format:check` both exit 0.

---

**Total deviations:** 5 auto-fixed (4 Rule 3 - blocking, 1 Rule 1 - bug).
**Impact on plan:** All five were necessary to complete the task's own verification gates
(precondition satisfaction, lint, and correct test behaviour). No scope creep — no feature or
architectural change beyond what Task 2/3 already specified. `vitest.config.ts` was also modified
even though it was omitted from Task 3's own `<files>` frontmatter list — the task's `<action>`
text explicitly calls for wiring the new test into it, so this is treated as a plan-authoring
omission, not a deviation requiring separate justification.

## Issues Encountered

None beyond the deviations above — all were found and resolved during Task 3's own TDD
red/green cycle before committing.

## User Setup Required

None beyond what's already documented in the plan's `user_setup` frontmatter
(`EXTERNAL_API_BASE_URL`, satisfied locally via `.env.example`/`.env.local` and in CI via the
`quality` job's env block). No external dashboard configuration needed — MSW intercepts every
call regardless of the URL's value while no real backend is deployed.

## Next Phase Readiness

- The data boundary is fully in place: committed contract, drift-guarded generated types,
  server-only client, and an MSW mock that intercepts both test-time and real server-process
  calls. Plans 01-11 (BFF Route Handlers), 01-12 (auth forms), and 01-14 (theme persistence) can
  now build directly against `externalApi` and get realistic mocked responses.
- The seeded demo account (`DEMO_USER_ID`/`DEMO_USER_EMAIL`/`DEMO_USER_PASSWORD`, exported from
  `store.ts`) is available for the plan 01-15 deployment checkpoint, where cold-start memory loss
  is an accepted, documented property of having no real backend (T-01-30).
- No blockers. One flagged item carried forward unchanged from the plan: RESEARCH.md's assumption
  A2 (instrumentation.ts + `NEXT_RUNTIME` gating on Vercel's function runtime) is only confirmed
  locally in this session (via `next dev` + a scratch Route Handler) — the plan 01-15 deployment
  checkpoint is still where a wrong assumption there would surface for real, per the plan's own
  flagged-assumptions section.

## Known Stubs

None — every handler is fully wired to the in-memory store; no hardcoded empty/placeholder
responses ship as part of this plan's scope.

---
*Phase: 01-foundation-auth-preferences*
*Completed: 2026-08-12*

## Self-Check: PASSED

- FOUND: docs/api/kanban-board-openapi.json, src/lib/api/generated-types.ts,
  src/lib/api/server-client.ts, src/lib/mocks/{store,handlers,node-server,browser,handlers.test}.ts,
  instrumentation.ts, .env.example (confirmed via `git ls-files` — tracked and committed)
- FOUND: commits `6f7bf41`, `7d5707b`, `3e04500` (confirmed via `git log --oneline --all`)
