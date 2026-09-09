---
phase: quick-260829-kyv
plan: 01
subsystem: testing
tags: [openapi, playwright, vitest, e2e, ci, springdoc, spring-boot]

requires: []
provides:
  - "Regenerated docs/api/kanban-board-openapi.json and generated-types.ts describing the backend's two-route /admin/reset (fullReset selector plus targeted userIds delete)"
  - "File-backed seeded-user registry (src/test-utils/seeded-user-registry.ts) shared by Playwright and Vitest"
  - "Non-destructive reset-capability probe and scoped delete client (src/test-utils/nonprod-reset-client.ts)"
  - "Scoped globalSetup/globalTeardown for e2e and globalSetup/teardown for the Vitest node project"
  - "pnpm e2e:cleanup escape hatch and pnpm e2e:seed reset-all manual nuclear option"
affects: [e2e-suite, ci-workflow, backend-contract-sync]

actuals:
  tokens: 47500
  tasks: 5
  commits: 6

tech-stack:
  added: []
  patterns:
    - "File-backed per-runner registry (one append-only text file per SEED_SCOPE) for cross-process test cleanup state, instead of an in-process array"
    - "HTTP-status discriminated probe (probeResetCapability) proving a destructive endpoint's capability without invoking its destructive path"

key-files:
  created:
    - src/test-utils/seeded-user-registry.ts
    - src/test-utils/nonprod-reset-client.ts
    - src/test-utils/vitest-nonprod-cleanup.ts
    - e2e/global-teardown.ts
    - e2e/signed-up-user.ts
  modified:
    - docs/api/kanban-board-openapi.json
    - src/lib/core/api-contract/generated-types.ts
    - e2e/seed.ts
    - e2e/seed.sh
    - e2e/global-setup.ts
    - e2e/auth.e2e.spec.ts
    - e2e/theme.e2e.spec.ts
    - e2e/session-bridge.e2e.spec.ts
    - playwright.config.ts
    - vitest.config.ts
    - eslint.config.mjs
    - .gitignore
    - .github/workflows/ci.yml
    - package.json
    - SETUP.md
    - docs/adr/tech/0022-e2e-scope-and-seeding.md
    - src/features/boards/server/fetch-board-full.integration.test.ts
    - src/features/boards/actions/delete-board.integration.test.ts
    - src/features/boards/actions/rename-board.integration.test.ts

key-decisions:
  - "Split Task 1's contract regen into two commits: a catch-up commit for pre-existing ProblemDetail/createdAt drift already live on the backend's origin/main, then the actual reset-scoped diff on top -- decided in consultation with a peer agent after halting on unexpected out-of-scope drift"
  - "Corrected D-D: the probe cannot use an empty userIds list (Spring validates @NotEmpty before the controller's own token check runs, so both a right and wrong token return 400) -- uses a sentinel nonexistent user id instead, empirically verified against both the new and a locally-rebuilt old-contract backend"
  - "SEEDED_USER_REGISTRY_DIR resolves via process.cwd(), not import.meta.url -- Playwright loads globalSetup/globalTeardown through a CommonJS-style transform where import.meta throws"
  - "Did not hand-tune docs/api/kanban-board-openapi.json's /admin/reset operation to mention a fullReset query parameter -- springdoc's actual merge of the two @PostMapping handlers never documents it, and the task's own instruction forbids hand-tuning the committed contract away from what springdoc genuinely emits"

requirements-completed: [QT-KYV-01, QT-KYV-02, QT-KYV-03, QT-KYV-04]

duration: 1h35m
completed: 2026-08-29
status: complete
---

# Phase quick-260829-kyv Plan 01: Regenerate OpenAPI Contract and Scope E2E Cleanup Summary

**Regenerated the OpenAPI contract for the backend's new two-route `/admin/reset`, then replaced the e2e suite's whole-database wipe with cleanup scoped to each run's own seeded user ids, backed by a file-based per-runner registry shared between Playwright and Vitest.**

## Performance

- **Duration:** ~1h35m
- **Started:** 2026-08-29T13:19:21Z
- **Completed:** 2026-08-29T14:55:00Z
- **Tasks:** 5
- **Files modified:** 24 (5 created, 19 modified)

## Accomplishments

- `docs/api/kanban-board-openapi.json` and `generated-types.ts` regenerated from a locally-run backend built from the working tree that carries the targeted-delete route, since the live nonprod backend still serves the old contract.
- A file-backed seeded-user registry (`src/test-utils/seeded-user-registry.ts`) survives Playwright's worker processes and Vitest's pool, shared by both runners.
- `e2e/global-setup.ts`/`global-teardown.ts` no longer wipe the shared backend: setup probes reset capability non-destructively, teardown deletes only the run's own registered users.
- Four e2e sites that create real accounts without `seedAccount()` (`AUTH-07`, `THEME-01`, `THEME-03`'s direct sign-up, `SESSION-02`) now register their ids too, via a new `e2e/signed-up-user.ts` helper that reads the session cookie's own JWT payload.
- The Vitest `node` project's three `*.integration.test.ts` files register their seeded ids and get their own scoped `globalSetup`/`teardown` pair (`vitest-nonprod-cleanup.ts`), with a deliberately different missing-token behavior (warn-and-skip, not throw) from the e2e suite.
- Both CI jobs' `Reset nonprod state` steps now run `pnpm e2e:cleanup` instead of a full-wipe curl call.
- `pnpm e2e:cleanup` (new) and `pnpm e2e:seed reset-all` (unchanged, now documented) give a human two levels of recovery after a killed run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Regenerate the API contract from a locally-run backend** - `9ff2c3c` (fix: pre-existing contract drift catch-up) + `529c422` (feat: scoped reset-endpoint regen)
2. **Task 2: End-to-end scoped cleanup for one seeded account** - `f810156` (feat)
3. **Task 3: Register the accounts that never pass through seed.sh** - `ee1d5f4` (feat)
4. **Task 4: Scope the Vitest integration tests and both CI cleanup steps** - `dbf54d6` (feat)
5. **Task 5: Escape-hatch CLI, documentation, and stack teardown** - `b9543da` (feat)

**Plan metadata:** committed separately by the orchestrator after this summary.

_Note: Task 1 has two commits by design -- see "Deviations from Plan" below for why._

## Files Created/Modified

- `docs/api/kanban-board-openapi.json` - Regenerated contract; two-route `/admin/reset`, `ResetUsersRequestDTO` schema, plus a pre-existing `ProblemDetail`/`createdAt` catch-up (separate commit)
- `src/lib/core/api-contract/generated-types.ts` - Regenerated from the contract above, no manual edits
- `src/test-utils/seeded-user-registry.ts` - File-backed per-scope (`PLAYWRIGHT`/`VITEST`) registry: reset/record/read
- `src/test-utils/nonprod-reset-client.ts` - `probeResetCapability`/`deleteSeededUsers`/`fullReset` over `fetch`
- `src/test-utils/vitest-nonprod-cleanup.ts` - Vitest `node` project's `setup`/`teardown` pair
- `e2e/global-setup.ts` - Truncates the Playwright registry, then probes reset capability instead of wiping
- `e2e/global-teardown.ts` - Deletes exactly the run's registered users
- `e2e/signed-up-user.ts` - Registers a UI sign-up's id from its session cookie's JWT payload
- `e2e/seed.ts` - `seedAccount()` now records its id
- `e2e/seed.sh` - Adds `cleanup [--users ...]` and `reset-all` commands
- `e2e/auth.e2e.spec.ts`, `e2e/theme.e2e.spec.ts`, `e2e/session-bridge.e2e.spec.ts` - Wire `registerSignedUpUser`/direct recording at the four UI/direct sign-up sites
- `playwright.config.ts` - Wires `globalTeardown` alongside the existing `globalSetup`
- `vitest.config.ts` - Wires `vitest-nonprod-cleanup.ts` as the `node` project's `globalSetup`
- `eslint.config.mjs` - Adds `e2e/global-teardown.ts` to the framework-forced default-export exemption list
- `.gitignore` - Adds `.e2e-seeded-users/`
- `.github/workflows/ci.yml` - Both `Reset nonprod state` steps become `Clean up seeded nonprod accounts`, running `pnpm e2e:cleanup`
- `package.json` - Adds `"e2e:cleanup": "bash e2e/seed.sh cleanup"`
- `SETUP.md` - Rewrites the `NONPROD_RESET_TOKEN` section for the scoped-cleanup mechanism
- `docs/adr/tech/0022-e2e-scope-and-seeding.md` - Dated amendment noting the superseded full-wipe references
- `src/features/boards/server/fetch-board-full.integration.test.ts`, `.../delete-board.integration.test.ts`, `.../rename-board.integration.test.ts` - `signUp()` now records its seeded id

## Decisions Made

- **Contract regen split into two commits** (see Deviations): a catch-up commit for pre-existing, unrelated drift, then the actual reset-scoped diff.
- **Sentinel-id probe over empty-list probe** (corrects D-D): empirically verified against the real backend that an empty `userIds` list cannot discriminate a wrong token from a right one, since Spring validates the request body before the controller's own token check runs.
- **`process.cwd()` over `import.meta.url`** for the registry's directory path, since Playwright's `globalSetup`/`globalTeardown` loader is CommonJS-transformed.
- **Left the regenerated `/admin/reset` operation exactly as springdoc emits it**, including that it does not literally document a `fullReset` query parameter (springdoc merges the two `@PostMapping` handlers into one operation and does not represent the `params`-based dispatch at all) -- not hand-tuned, per the task's own explicit instruction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 4 - Architectural, peer-consulted] Pre-existing OpenAPI contract drift split into its own commit**

- **Found during:** Task 1
- **Issue:** Regenerating the contract from a locally-run backend produced a diff touching 14 paths and 2 schemas, not just `/admin/reset` as the task's action expected. Traced both categories to backend commits already on `origin/main` (`70c34b5`, `feat(09-04): document ProblemDetail error envelope on every OpenAPI operation`, and `6aadda1`, `feat(boards): add createdAt timestamp to Board entity and response DTO`) -- pre-existing staleness in this frontend's committed contract, unrelated to and predating the reset-endpoint quick task.
- **Fix:** Halted before committing and returned a checkpoint with three options (full regen split into two commits; hand-splice only the reset-scoped diff; abort the regen). A peer agent operating in this same session reviewed the checkpoint and directed Option A (full regen, two commits), reasoning that hand-splicing would recreate the exact "don't hand-tune, since the point of regenerating from a running backend is that the committed contract matches what it actually produces" anti-pattern the plan itself warns against, just at document scope. Implemented as: commit `9ff2c3c` (the catch-up, unrelated to reset) then `529c422` (the reset-scoped diff, clean and minimal against `9ff2c3c`'s base).
- **Files modified:** `docs/api/kanban-board-openapi.json`, `src/lib/core/api-contract/generated-types.ts`
- **Verification:** After each commit, `pnpm api:generate` reproduced `generated-types.ts` with no diff; `pnpm exec tsc --noEmit` and `pnpm lint` both passed. The diff between `9ff2c3c` and `529c422` touches only `/admin/reset` and the new `ResetUsersRequestDTO` schema.
- **Committed in:** `9ff2c3c`, `529c422`

**2. [Rule 1 - Bug] D-D's probe design corrected: sentinel id, not empty list**

- **Found during:** Task 2
- **Issue:** D-D assumed `probeResetCapability` could send an empty `userIds` list and distinguish "capable" (400) from "wrong token" (403) by status code. Empirically curling the real backend (both the new-contract local instance and a locally-rebuilt old-contract instance, see below) showed this is false: `ResetUsersRequestDTO`'s `@NotEmpty` validation runs during Spring's argument resolution, before the controller method body's own token check executes, so an empty list returns 400 for BOTH a correct and an incorrect token.
- **Fix:** Redesigned the probe to POST a single syntactically-valid, never-real user id (`00000000-0000-0000-0000-000000000000`). This reaches the token check first (validation passes on a non-empty list), giving a genuine 4-way discriminator: 404 ENTITY_NOT_FOUND (capable), 403 ACCESS_DENIED (wrong token, either contract version), 2xx (old contract, ignores the body and wipes -- the plan's accepted "loud and once" cost), 401 UNAUTHENTICATED (nonprod profile inactive -- discovered this is 401, not 404/405 as originally assumed, because the path then falls through to the app's default authenticate-everything security chain rather than resolving to "no route matched").
- **Files modified:** `src/test-utils/nonprod-reset-client.ts`
- **Verification:** Verified all four branches against real running backends -- the new-contract local stack (404/403 cases) and an isolated local clone of the backend checked out to `origin/main` (pre-reset-feature) on remapped ports (5434/8090/9093/8091), proving the 2xx stale-contract case and the wrong-token 403 case on the old contract too. The `docker compose -p kanban-stale-verify` stack was built from a disposable `git clone --local` of the backend repo (never touching the actual sibling repo beyond a read-only clone) and fully torn down (`down -v`) afterward.
- **Committed in:** `f810156`

**3. [Rule 1 - Bug] `import.meta.url` incompatible with Playwright's globalSetup/globalTeardown loader**

- **Found during:** Task 2
- **Issue:** `SEEDED_USER_REGISTRY_DIR` initially resolved via `path.dirname(fileURLToPath(import.meta.url))`, matching `vitest.config.ts`'s own precedent. Running the e2e verify failed immediately: `SyntaxError: Cannot use 'import.meta' outside a module` -- Playwright loads `globalSetup`/`globalTeardown` files through a CommonJS-style transform, unlike Vitest's ESM config loader.
- **Fix:** Switched to `join(process.cwd(), ".e2e-seeded-users")`, which works identically under both runners since both are always invoked from the repo root.
- **Files modified:** `src/test-utils/seeded-user-registry.ts`
- **Verification:** Re-ran the two-spec e2e verify; both workers wrote to the registry and teardown emptied it.
- **Committed in:** `f810156`

**4. [Rule 3 - Blocking] `eslint.config.mjs` missing an entry for the new `global-teardown.ts`**

- **Found during:** Task 2
- **Issue:** `import-x/no-default-export` flagged `e2e/global-teardown.ts`'s required default export (Playwright's own `globalTeardown` config option loads it that way). `e2e/global-setup.ts` already had a lint exemption for the same framework-forced reason; the new file needed the same entry.
- **Fix:** Added `e2e/global-teardown.ts` to the existing default-export exemption list, alongside `global-setup.ts`.
- **Files modified:** `eslint.config.mjs`
- **Verification:** `pnpm lint` passes.
- **Committed in:** `f810156`

**5. [Rule 1 - Bug, documented gap] springdoc does not document the `fullReset` selector at all**

- **Found during:** Task 1
- **Issue:** The task's `<done>` criterion expected the regenerated contract to "describe the `fullReset` selector." Springdoc merges the two `@PostMapping` handlers sharing `/admin/reset` (`params = "fullReset=true"` and `params = "fullReset!=true"`) into a single operation with no representation of the query-parameter dispatch at all -- confirmed via repeated direct fetches of the live `/api/docs` endpoint, deterministic across runs. The merged operation's `operationId` is `reset` but its request body/response docs are `deleteUsers`'s.
- **Fix:** Left the contract exactly as springdoc emits it -- the task's own action text explicitly forbids hand-tuning the operation ("do not hand-tune the operation, since the whole point of regenerating from a running backend is that the committed contract matches what springdoc actually produces"), which takes precedence over the `<done>` prose's aspirational description. Not fixable without either backend-side OpenAPI customization (backend is read-only for this task) or hand-tuning the contract (explicitly forbidden).
- **Files modified:** none (documented as a known gap, not patched)
- **Verification:** N/A -- this is the honest, verified output of the real running backend's springdoc integration.
- **Committed in:** N/A (no fix applied; the committed contract already reflects this)

---

**Total deviations:** 5 (1 architectural/peer-consulted, 3 auto-fixed bugs, 1 documented gap)
**Impact on plan:** All auto-fixes were necessary for correctness -- a wrong-token misconfiguration would otherwise have silently reported "capable," and the registry path bug would have broken every e2e run outright. The peer-consulted split kept the reset-specific commit clean and reviewable rather than bundling in unrelated drift. The springdoc gap is a real, permanent limitation of the backend's current annotation style, not something this quick task's regeneration could fix without touching backend code.

## Issues Encountered

- **Vite/Vitest auto-loads `.env.local` into `process.env`**, which meant a shell invocation with `NONPROD_RESET_TOKEN` simply omitted still resolved to this repo's real configured token (not `undefined`), masking the intended "genuinely unset" test case. Verified the true warn-and-skip branch by temporarily moving `.env.local` aside (never printing its contents) and restoring it immediately after -- see Task 4's commit message.
- Docker Compose overlay files merge array-typed fields like `ports` (they append, not replace) -- the stale-contract verification stack's port remap had to be done by editing the cloned `docker-compose.yml` directly rather than via an overlay, once this was discovered.
- An early throwaway reset-token value written as a bare unquoted all-digit string in a YAML overlay was silently parsed as a float (`1.1111...e+39`) by Docker Compose, truncating it under the backend's 32-character minimum -- fixed by quoting it as a string.

## User Setup Required

None - no external service configuration required for this repo. **However, see "Cross-Repo Precondition" below: the sibling backend repo needs a human-authorized deploy before this branch can be merged.**

## Cross-Repo Precondition (must be resolved before merge)

**The backend must be deployed before this branch can be merged and expected to pass CI end-to-end.** The targeted-user-delete reset route this plan regenerates the contract for exists only in `/home/andre/dev/kanban-board-backend`'s local `main` branch (commits `14dd89d` and `c29a32d`, seven commits ahead of that repo's own `origin/main` as of this run). That repo deploys to the live nonprod backend on every push to its `main`, and this quick task neither pushed nor deployed it -- that is explicitly the user's call, not made here (constraint from the plan's objective).

Until that backend repo is pushed to `origin/main`:

- Every verification in this plan ran against a **locally-run** backend (Docker Compose, nonprod profile, throwaway token), never the live nonprod URL, per the plan's own constraint.
- The next CI run on this branch will hit `e2e/global-setup.ts`'s probe against the still-old-contract live backend, which will report the `STALE_CONTRACT` outcome and refuse to run the suite, loudly, once -- this is the designed behavior, not a regression to chase.
- `git push` for the two backend commits and their deploy is a decision outside this quick task's scope.

## Next Phase Readiness

- This branch (`quick/260829-kyv-regenerate-openapi-contract-reset-scoping`, cut from `origin/main` deliberately isolated from the in-progress Phase 04 branch) is ready to merge into `main` once the backend deploy above happens.
- No blockers for continuing Phase 4 work independently of this quick task -- the contract regen only touched `/admin/reset` and pre-existing drift unrelated to task/subtask features, and nothing under `.planning/phases/04-task-subtask-workflow/` was touched.
- The `docker compose -p kanban-contract-verify` and `kanban-stale-verify` stacks used for verification are fully torn down (`down -v`); `docker ps` is empty; no leftover local images or scratchpad secrets remain.

## Self-Check: PASSED

All 5 created files confirmed present on disk (`src/test-utils/seeded-user-registry.ts`,
`src/test-utils/nonprod-reset-client.ts`, `src/test-utils/vitest-nonprod-cleanup.ts`,
`e2e/global-teardown.ts`, `e2e/signed-up-user.ts`) and all 6 commit hashes confirmed present
in `git log` (`9ff2c3c`, `529c422`, `f810156`, `ee1d5f4`, `dbf54d6`, `b9543da`).

---

_Phase: quick-260829-kyv_
_Completed: 2026-08-29_
