---
phase: quick-260829-kyv
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [QT-KYV-01, QT-KYV-02, QT-KYV-03, QT-KYV-04]

files_modified:
  - docs/api/kanban-board-openapi.json
  - src/lib/core/api-contract/generated-types.ts
  - src/test-utils/seeded-user-registry.ts
  - src/test-utils/nonprod-reset-client.ts
  - src/test-utils/vitest-nonprod-cleanup.ts
  - src/features/boards/server/fetch-board-full.integration.test.ts
  - src/features/boards/actions/delete-board.integration.test.ts
  - src/features/boards/actions/rename-board.integration.test.ts
  - e2e/seed.ts
  - e2e/seed.sh
  - e2e/global-setup.ts
  - e2e/global-teardown.ts
  - e2e/signed-up-user.ts
  - e2e/auth.e2e.spec.ts
  - e2e/theme.e2e.spec.ts
  - e2e/session-bridge.e2e.spec.ts
  - playwright.config.ts
  - vitest.config.ts
  - package.json
  - .gitignore
  - .github/workflows/ci.yml
  - SETUP.md
  - docs/adr/tech/0022-e2e-scope-and-seeding.md

user_setup: []

estimate:
  tokens: 95000
  raw_tokens: 95000
  tasks: 5
  confidence: low

must_haves:
  truths:
    - "The committed OpenAPI contract describes the two-route `/admin/reset` shape (a `fullReset` selector plus a `userIds` request body), and `generated-types.ts` regenerates from it with no diff."
    - "No automated code path in this repo issues a full-database wipe any more — `globalSetup` probes without deleting, `globalTeardown` deletes only this run's users, and CI's two `Reset nonprod state` steps post a scoped list instead of truncating."
    - "Every real account the e2e suite creates — via `seed.sh account`, via a UI sign-up form, or via a direct `POST /signup` — has its backend user id in the on-disk registry before the run ends."
    - "Every real account the Vitest `node` project's integration tests create has its id in the registry, and the project's own teardown deletes exactly those."
    - "A run whose `globalSetup` probe finds an old-contract backend refuses to run the suite instead of proceeding, and says so in terms naming the backend deploy as the fix."
    - "After a killed run, a human can clean up precisely what leaked with `pnpm e2e:cleanup`, and `pnpm e2e:seed reset-all` remains as a documented manual full-wipe escape hatch that nothing automated calls."
    - "Two concurrent e2e runs no longer destroy each other's data, because neither issues a wipe."
  artifacts:
    - src/test-utils/seeded-user-registry.ts
    - src/test-utils/nonprod-reset-client.ts
    - src/test-utils/vitest-nonprod-cleanup.ts
    - e2e/global-teardown.ts
    - e2e/signed-up-user.ts
    - docs/api/kanban-board-openapi.json
  key_links:
    - "`seedAccount()` → `recordSeededUserId()` — the only reason a seeded id ever reaches the registry file."
    - "`e2e/signed-up-user.ts` → the app's session cookie JWT → the backend user id for UI sign-ups, which never pass through `seed.sh`."
    - "`playwright.config.ts`'s `globalTeardown` wiring → `e2e/global-teardown.ts` — an unwired teardown leaks every account silently."
    - "`vitest.config.ts`'s `node` project `globalSetup` → `src/test-utils/vitest-nonprod-cleanup.ts` — the integration tests' only cleanup path once CI's wipe is gone."
    - "The registry directory path constant, shared by the TS registry and `seed.sh cleanup` — two different spellings of it would make the escape hatch silently clean nothing."
---

<objective>
Bring this repo's committed API contract in line with the backend's new two-route
`/admin/reset`, then replace the e2e suite's whole-database wipe with cleanup scoped to the
user ids each run actually created.

Purpose: one shared nonprod backend serves every CI run, every local `pnpm test:e2e`, and every
agent-driven browser session. Today each of those wipes the database, so any two that overlap
destroy each other — observed 2026-08-29 on plan 04-12, where a local run reset the database
underneath CI's in-flight specs and the CI job was blamed for a 401 it did not cause. Scoped
cleanup makes concurrent runs independent by construction rather than by scheduling luck.

Output: a regenerated OpenAPI contract and types; a file-backed seeded-user registry that
survives Playwright's worker processes and Vitest's pool; a non-destructive `globalSetup`
precondition; a `globalTeardown` that deletes only this run's users; the same treatment for the
Vitest integration tests; and a documented manual escape hatch for killed runs.

## Decisions this plan locks

- **D-A — killed-run recovery is a manual escape hatch, not a periodic sweep.** The todo left
  this open. A time-based sweep needs a scheduler and an age policy neither repo has; that is not
  quick-task scope. Instead the registry file survives the crash, so `pnpm e2e:cleanup` replays
  exactly what leaked, and `pnpm e2e:seed reset-all` stays available as the token-gated nuclear
  option. Both are documented in SETUP.md; nothing automated calls `reset-all`.
- **D-B — `EXTERNAL_PATH.ADMIN_RESET` stays `/admin/reset` and gains no sibling constant.** The
  `fullReset=true` selector is a query parameter, and the values in that `as const` map are the
  literal-typed path templates `openapi-fetch` matches against (ADR tech/0012). A second entry
  carrying a query string would be a path template that matches no operation. The selector is
  built at the one call site that needs it. The todo listed this file expecting a change; the
  considered answer is that it needs none.
- **D-C — the registry is a directory of append-only text files, one per test runner.** Playwright
  runs specs in separate worker processes and `globalTeardown` in the main one, so an in-process
  array collects only one worker's ids. A fixed repo-relative path needs no environment-variable
  propagation, and `appendFileSync` of a single short line is atomic enough for concurrent
  workers. Per-runner files keep Playwright and Vitest from truncating each other's registry.
- **D-D — the precondition probe is an empty `userIds` list, which the backend rejects by design.**
  It proves endpoint presence, token validity, and the new contract without deleting anything, and
  its status code discriminates all four failure modes (see Task 2).
- **D-E — UI-created accounts are registered by decoding the app's own session cookie.** It is an
  HS256 JWT whose payload is the full `UserResponseDTO`, id included (`src/lib/server/session.ts`),
  and Playwright's `context.cookies()` returns it despite `httpOnly`. No extra sign-in, so the
  backend's two-concurrent-session cap is untouched.
- **D-F — CI keeps an `if: always()` cleanup step in both jobs, now scoped.** Removing the safety
  net entirely would leak on every cancelled job. The scoped step is a no-op when the registry is
  empty, which is the normal case once teardown has run.

## Cross-repo precondition (surfaced, not resolved here)

The backend's targeted-delete route exists only in `/home/andre/dev/kanban-board-backend`'s local
commits `14dd89d` and `c29a32d`, six commits ahead of its `origin/main`. That repo deploys to the
live nonprod backend on every push to `main`, so **the live backend still serves the old contract**
and this plan neither pushes nor deploys it — that is the user's call.

Two consequences the executor must not paper over:

1. Every verification run in this plan targets a **locally-run** backend built from that working
   tree, never the live nonprod URL.
2. Merging this work before the backend deploys means the next CI e2e run's `globalSetup` probe
   will POST to an old-contract backend, which ignores the body and performs one full wipe, then
   fail the suite with the "backend still serves the old contract" message. That is the designed
   behavior — loud and once — but it means **the backend must be deployed before this branch
   merges**, and the final task's return must say so.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@SETUP.md
@e2e/seed.ts
@e2e/seed.sh
@e2e/global-setup.ts
@e2e/test-env.ts
@playwright.config.ts
@src/lib/server/session.ts
@src/lib/core/api-contract/external-paths.ts
@src/test-utils/api-base-url.ts
</context>

<constraints>
- The sibling repo `/home/andre/dev/kanban-board-backend` is **read-only** for this task. Do not
  edit, stage, commit, push, or deploy anything in it. Running its Docker Compose stack is
  permitted; writing a file into its tree (including a `.env`) is not — pass the three variables
  its compose file interpolates through the shell environment instead.
- Do not touch anything under `.planning/phases/04-task-subtask-workflow/`. This branch is
  deliberately isolated from that in-progress phase.
- `pnpm comments:check` caps any comment block at **3 prose lines** (`MAX_PROSE_LINES`). Every
  comment written here must fit, or the `quality` job goes red before anything else runs.
- No new npm dependencies. Every mechanism here uses `node:fs`, `fetch`, `jose` (already a
  dependency), and Playwright/Vitest configuration that already exists — so no package-legitimacy
  audit is required for this plan.
- `.prettierignore` already excludes `docs/` and `generated-types.ts`, so neither regenerated
  artifact needs formatting. Everything else this plan writes is formatted by `pnpm format`.
</constraints>

<tasks>

<task type="auto">
  <name>Task 1: Regenerate the API contract from a locally-run backend</name>
  <files>docs/api/kanban-board-openapi.json, src/lib/core/api-contract/generated-types.ts</files>
  <precondition>Docker with the Compose v2 plugin is available (`docker compose version` succeeds) and nothing is currently bound to host ports 8080, 8081, 9092, or 5433.</precondition>
  <action>
Stand up the backend locally and refetch the springdoc contract from it, because the live nonprod
backend does not yet serve the new route (see the objective's cross-repo precondition).

Write a Compose overlay in the scratchpad directory — never into the backend repo — containing
only a `services.app.environment` block setting `SPRING_PROFILES_ACTIVE` to `nonprod` and
`APP_RESET_TOKEN` to a throwaway local value of at least 40 characters. Both are load-bearing and
neither is in the backend's committed compose file: `ResetController` is annotated
`@Profile("nonprod")`, so without the profile the reset endpoint's bean does not exist and
springdoc would silently emit a contract with `/admin/reset` **deleted** rather than updated; and
`app.reset.token` has no default, so a nonprod context with no token fails startup in
`@PostConstruct` with a minimum-length error. Record the throwaway token value — Tasks 2 to 4 need
it, and it must never be the real `NONPROD_RESET_TOKEN`.

Bring the stack up with an isolated Compose project name (`-p kanban-contract-verify`) so its
volumes are separate from any pre-existing local-dev data, passing the backend compose file first
and the overlay second, and supplying `DB_NAME`, `DB_USER`, `DB_PASS` (the values in that repo's
`.env.example`) as shell environment variables rather than writing a `.env`. Leave the stack
running — Tasks 2 to 4 verify against it — and tear it down in Task 5.

Poll `http://localhost:8080/api/docs` until it answers 200, then save that JSON to
`docs/api/kanban-board-openapi.json`. Normalize the `servers` array back to exactly the value the
committed file carries today — a single entry with `url` `http://localhost` and `description`
`Generated server url` — per ADR tech/0006, which forbids committing a deployed hostname. Keep
whatever shape springdoc emits for the two `@PostMapping` handlers that share the path; do not
hand-tune the operation, since the whole point of regenerating from a running backend is that the
committed contract matches what springdoc actually produces.

Then run `pnpm api:generate` to rebuild `generated-types.ts`. Inspect `git diff` on the JSON: the
only paths that may change are `/admin/reset` and the `components.schemas` entry for the new
request DTO. Anything else changing means the local tree carries backend API changes beyond this
quick task — stop and report rather than committing unexplained contract drift.

No application call site should need editing: the e2e reset calls use raw `fetch`, not the typed
`openapi-fetch` client. If typecheck disagrees, fix the call site rather than reverting the
contract.
  </action>
  <verify>
    <automated>curl -sf http://localhost:8080/api/docs | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).paths["/admin/reset"];if(!p)throw new Error("no /admin/reset — nonprod profile not active");console.log(JSON.stringify(Object.keys(p)))})'</automated>
    <automated>node -e 'const s=require("./docs/api/kanban-board-openapi.json");if(JSON.stringify(s.servers)!==JSON.stringify([{url:"http://localhost",description:"Generated server url"}]))throw new Error("servers not normalized");if(!JSON.stringify(s.paths["/admin/reset"]).includes("fullReset"))throw new Error("regenerated contract has no fullReset selector")'</automated>
    <automated>pnpm api:generate && git diff --exit-code src/lib/core/api-contract/generated-types.ts</automated>
    <automated>pnpm exec tsc --noEmit</automated>
  </verify>
  <done>`docs/api/kanban-board-openapi.json` describes the `fullReset` selector and the `userIds` request body, its `servers` array is the neutral committed value, `pnpm api:generate` reproduces `generated-types.ts` with no diff, and `git diff --stat` shows no path changed outside `/admin/reset` and its new schema.</done>
</task>

<task type="tracer" tdd="true">
  <name>Task 2: End-to-end scoped cleanup for one seeded account</name>
  <files>src/test-utils/seeded-user-registry.ts, src/test-utils/nonprod-reset-client.ts, e2e/seed.ts, e2e/global-setup.ts, e2e/global-teardown.ts, playwright.config.ts, .gitignore</files>
  <behavior>
    - Seeding two accounts from two Playwright workers puts both ids in the registry file, one per line.
    - Reading the registry deduplicates and drops blank lines, so a retried spec's duplicate id is harmless.
    - `globalSetup` leaves existing backend data untouched: an account seeded before the run still exists after `globalSetup` returns.
    - `globalSetup` against a backend that still serves the old contract refuses to run the suite.
    - `globalTeardown` deletes exactly the registered users and then empties the registry, so a second teardown is a no-op rather than a 404.
    - A run that registered nothing performs no request at all, since an empty `userIds` list is a 400 by design.
  </behavior>
  <action>
This is the thin end-to-end slice: seed one account, record its id, delete only it. Build the two
shared modules, wire both Playwright hooks, and prove the whole path against the local backend from
Task 1 before any of the remaining breadth is added.

Create `src/test-utils/seeded-user-registry.ts`. It owns one exported directory-path constant
resolved relative to the repo root (`.e2e-seeded-users/`), a `SEED_SCOPE` `as const` object with
`PLAYWRIGHT` and `VITEST` members per ADR tech/0012, and three functions taking a scope:
`resetSeededUserRegistry` (remove the scope's file, creating the directory if absent),
`recordSeededUserId` (append the id plus a newline with `appendFileSync`), and
`readSeededUserIds` (read if present, split on newlines, trim, drop blanks, deduplicate, return an
array). It must not throw when the file does not exist — a run that seeded nothing is normal.
`src/test-utils/` is the established home for helpers shared between `src/` tests and `e2e/`
(`api-base-url.ts` is imported by `e2e/test-env.ts` exactly this way), and it keeps the `@/test-utils/*`
alias available to the integration tests in Task 4.

Create `src/test-utils/nonprod-reset-client.ts` over `fetch`, taking the base URL and token as
arguments so it stays usable from both runners. It exports three functions built on the one
`EXTERNAL_PATH.ADMIN_RESET` path template (D-B): `probeResetCapability`, which POSTs an empty
`userIds` array and maps the response to a discriminated outcome; `deleteSeededUsers`, which POSTs
a non-empty `userIds` body; and `fullReset`, which POSTs with `fullReset=true` appended as a query
parameter. Never put the token in a thrown message or a log line (T-KYV-01).

`probeResetCapability`'s four outcomes are the whole reason it exists, and its status mapping is
load-bearing — the backend checks the token before validating the body, so:

- **400** — capable. The token is right, the route exists, and `@NotEmpty` rejected the empty list
  without deleting anything. This is the pass case.
- **403** — the configured token is wrong or missing. The endpoint deliberately answers the same
  403 for an absent header as for a wrong one, so the message must cover both.
- **2xx** — the backend still serves the old single-route contract, which ignored the body and has
  therefore just performed a full wipe. Fail with a message naming the backend deploy as the fix.
- **404 or 405** — no reset endpoint at all, or the nonprod profile is inactive.

Rewrite `e2e/global-setup.ts` around it. Keep the existing `NONPROD_RESET_TOKEN` guard and its
error text intact. Replace the wiping POST with `resetSeededUserRegistry(SEED_SCOPE.PLAYWRIGHT)`
followed by `probeResetCapability`, throwing on anything but the capable outcome. Truncating the
registry here is what stops a previous run's already-deleted ids from poisoning this run's teardown
batch: the backend existence-checks the whole list before deleting anything, so one stale id would
turn the entire cleanup into a 404 that deletes nothing.

Add `e2e/global-teardown.ts`: read the scope's ids, return immediately when empty, otherwise call
`deleteSeededUsers` and throw on a non-ok response with the ids listed in the message so a human
can retry. On success, call `resetSeededUserRegistry` so CI's always-run cleanup step (Task 4) has
nothing left to do. Wire it in `playwright.config.ts` with the same `includesProject("e2e")`
conditional the existing `globalSetup` uses, and update that block's comment to describe the
precondition-plus-teardown pair — within the 3-line comment cap.

In `e2e/seed.ts`, have `seedAccount()` call `recordSeededUserId` with the parsed id before
returning. That single call is the only reason a seeded id ever reaches the registry.

Add `.e2e-seeded-users/` to `.gitignore` beside the other test artifacts.
  </action>
  <verify>
    <automated>pnpm exec tsc --noEmit && pnpm lint</automated>
    <automated>EXTERNAL_API_BASE_URL=http://localhost:8080/api NONPROD_RESET_TOKEN=$LOCAL_RESET_TOKEN pnpm exec playwright test --project e2e --workers=2 e2e/boards-list.e2e.spec.ts e2e/cookie-policy.e2e.spec.ts</automated>
    <automated>test ! -s .e2e-seeded-users/playwright.txt</automated>
  </verify>
  <done>The two-spec, two-worker run passes against the local backend; the registry file held ids from both worker processes during the run (confirm by inspecting it mid-run or by a temporary log line removed before commit) and is empty afterwards; a repeat teardown is a no-op; and pointing `probeResetCapability` at a stale-contract backend produces the deploy-naming refusal rather than a silent pass.</done>
</task>

<task type="auto">
  <name>Task 3: Register the accounts that never pass through seed.sh</name>
  <files>e2e/signed-up-user.ts, e2e/auth.e2e.spec.ts, e2e/theme.e2e.spec.ts, e2e/session-bridge.e2e.spec.ts</files>
  <action>
Four sites in the e2e suite create real accounts without `seedAccount()`, so Task 2's registry
misses them and they would leak on every run forever — the exact accumulation the todo warns
scoped cleanup introduces. Three are UI sign-ups whose backend user id the spec never sees; one is
a direct `POST /signup` that already has the id in hand and merely discards it.

Add `e2e/signed-up-user.ts` exporting one async helper that takes a Playwright `Page`, reads the
session cookie by name from `page.context().cookies()` (Playwright returns `httpOnly` cookies,
which is why this works at all), base64url-decodes the JWT's payload segment, asserts a string
`id`, records it under `SEED_SCOPE.PLAYWRIGHT`, and returns it. Take the cookie name from
`COOKIE.SESSION` in the cookie registry rather than a literal. Decode without verifying the
signature and say why in a comment: the value is used only to name test data for deletion, the
token was minted seconds earlier by the server this run started, and verifying would couple the
helper to a `SESSION_SECRET` that `reuseExistingServer` can make stale off-CI. Throw a clear error
when the cookie is absent or the payload carries no `id`, so a silent miss cannot masquerade as a
clean run.

Call it immediately after each successful UI sign-up, at the point the spec already asserts it
landed on the boards route:

- `e2e/auth.e2e.spec.ts`, AUTH-07 — after the **first** sign-up only. The second is expected to
  fail and creates nothing.
- `e2e/theme.e2e.spec.ts`, THEME-01 — after the sign-up that opens the scenario. This test
  destructures only `page`, so the helper's `Page` argument is what keeps its signature unchanged.
- `e2e/session-bridge.e2e.spec.ts`, SESSION-02 — after the sign-up that establishes backend
  session #1.

In `e2e/theme.e2e.spec.ts`, `signUpDirectCapturingTheme` already parses the identity response;
pull `id` out of the same object and record it directly, without the cookie helper.

Do not add a sign-in, a second request, or any other backend round-trip at these sites: three of
the four exist specifically to stay inside the backend's two-concurrent-session cap, and each
carries a comment saying so.
  </action>
  <verify>
    <automated>pnpm exec tsc --noEmit && pnpm lint</automated>
    <automated>EXTERNAL_API_BASE_URL=http://localhost:8080/api NONPROD_RESET_TOKEN=$LOCAL_RESET_TOKEN pnpm exec playwright test --project e2e --workers=2</automated>
    <automated>test ! -s .e2e-seeded-users/playwright.txt</automated>
  </verify>
  <done>The full e2e suite passes against the local backend, and the registry is empty afterwards. Re-running with the teardown temporarily disabled leaves a registry whose line count is at least the number of `seedAccount()` calls plus four, confirming the UI and direct sign-ups are captured — restore the teardown before committing.</done>
</task>

<task type="auto">
  <name>Task 4: Scope the Vitest integration tests and both CI cleanup steps</name>
  <files>src/test-utils/vitest-nonprod-cleanup.ts, vitest.config.ts, src/features/boards/server/fetch-board-full.integration.test.ts, src/features/boards/actions/delete-board.integration.test.ts, src/features/boards/actions/rename-board.integration.test.ts, .github/workflows/ci.yml</files>
  <action>
The e2e half alone does not reach the goal. CI's `quality` job runs `pnpm test`, whose `node`
Vitest project includes three `*.integration.test.ts` files that create real accounts on the shared
backend, and both that job and the `e2e` job finish with an `if: always()` step that POSTs the full
wipe. Leaving those in place means every CI run still truncates the database at the end, and two
overlapping runs still destroy each other — the change would look done and fix nothing.

Each of the three integration tests has its own local sign-up helper that already parses `body.id`.
Add a `recordSeededUserId(SEED_SCOPE.VITEST, body.id)` call to each, imported through the
`@/test-utils/*` alias. Do not refactor the three duplicated helpers into one — that duplication is
tracked by its own pending todo and is not this task's scope.

Add `src/test-utils/vitest-nonprod-cleanup.ts` exporting Vitest's `setup` and `teardown` pair:
`setup` truncates the `VITEST` scope registry, `teardown` reads it, returns early when empty, calls
the same `deleteSeededUsers` client Task 2 built, throws on a non-ok response, and truncates on
success. Resolve the base URL through `resolveTestApiBaseUrl()` and the token from
`process.env.NONPROD_RESET_TOKEN`. Unlike the e2e suite, a missing token must not fail the run —
`pnpm test` is routinely run by developers who have no token, and the `node` project's tests do not
depend on cleanup to pass. Warn once and skip instead, and make that asymmetry explicit in a
comment.

Register it as the `node` project's `globalSetup` in `vitest.config.ts`. Scope it to that project
only; the `browser`, `unit`, `storybook`, and `tokens` projects create no backend accounts.

In `.github/workflows/ci.yml`, replace the body of both `Reset nonprod state` steps with
`pnpm e2e:cleanup` (added in Task 5), keeping `if: always()` and renaming each step to reflect that
it now deletes only what the job seeded. Rewrite each step's comment block — currently a long
rationale for the full wipe, and both exceed the 3-line cap unless rewritten — to state that
cleanup is scoped, that the step is a no-op once the run's own teardown succeeded, and that it
exists to catch a cancelled or crashed job. Keep the explicit non-zero-exit behavior: a cleanup
that cannot reach the backend must still fail the job loudly rather than silently no-op, which is
what the original curl-status check existed to guarantee.
  </action>
  <verify>
    <automated>pnpm exec tsc --noEmit && pnpm lint</automated>
    <automated>EXTERNAL_API_BASE_URL=http://localhost:8080/api NONPROD_RESET_TOKEN=$LOCAL_RESET_TOKEN pnpm test</automated>
    <automated>test ! -s .e2e-seeded-users/vitest.txt</automated>
    <automated>grep -v '^ *#' .github/workflows/ci.yml | grep -q 'X-Reset-Token' && exit 1 || exit 0</automated>
  </verify>
  <done>`pnpm test` passes against the local backend with the `node` project's registry empty afterwards; `pnpm test` with `NONPROD_RESET_TOKEN` unset still passes and warns rather than throwing; and no wipe request survives in the workflow outside comment prose.</done>
</task>

<task type="auto">
  <name>Task 5: Escape-hatch CLI, documentation, and stack teardown</name>
  <files>e2e/seed.sh, package.json, SETUP.md, docs/adr/tech/0022-e2e-scope-and-seeding.md</files>
  <action>
Close D-A's open question with a usable recovery path, then document the whole new contract.

Extend `e2e/seed.sh` with two commands, both requiring `NONPROD_RESET_TOKEN` (the existing commands
must keep requiring only `EXTERNAL_API_BASE_URL`, so add the check inside the new branches rather
than globally):

- `cleanup [--users <id,id,...>]` — with `--users`, deletes exactly those ids; without it, reads
  every file in the registry directory, which is what makes it the precise recovery path after a
  Ctrl+C or a cancelled CI job, since the registry outlives the crashed process. Exit 0 with a
  message when there is nothing to clean, so CI's always-run step cannot fail a green job. POST the
  ids as a `userIds` array — extend the existing `build_json` approach with a small array-building
  node invocation rather than interpolating JSON by hand, for the escaping reason that helper's own
  comment gives. Truncate the registry after a successful delete.
- `reset-all` — the token-gated full wipe, POSTing with `fullReset=true`. This is the manual
  nuclear option and nothing automated may call it (T-KYV-03).

Update `usage()` to list both, and use the same registry directory path constant spelling the TS
module uses — two spellings would make the escape hatch silently clean nothing.

Add `"e2e:cleanup": "bash e2e/seed.sh cleanup"` to `package.json` scripts, beside the existing
`e2e:seed`.

Rewrite SETUP.md's `NONPROD_RESET_TOKEN` section. The token is still required and the suite still
refuses to run without a working reset capability — that guard is unchanged and ADR tech/0022's
reasoning for it still holds. What changes is everything after: the precondition probes with an
empty list instead of wiping, teardown deletes only this run's users, and a killed run leaves
accounts behind that `pnpm e2e:cleanup` removes precisely and `pnpm e2e:seed reset-all` removes
along with everyone else's. Say plainly that scoped cleanup is not self-healing the way the wipe
was, since that is the property being traded away.

Add a dated amendment section to `docs/adr/tech/0022-e2e-scope-and-seeding.md` noting that its two
references to `globalSetup`'s `POST /admin/reset` full wipe (around lines 62 and 102) describe the
superseded mechanism, and that the decision they record — reset capability as a hard precondition —
is preserved by the probe. Amend rather than rewrite: the ADR is a record of what was decided when.

Finally, tear the local backend stack down: `docker compose -p kanban-contract-verify ... down -v`.
The isolated project name is what makes `-v` safe here — it destroys only this task's volumes, not
any pre-existing local-dev data. Confirm `docker ps` is empty afterwards, and delete the scratchpad
overlay file with its throwaway token.
  </action>
  <verify>
    <automated>bash e2e/seed.sh cleanup; echo "exit=$?" | grep -qx 'exit=0'</automated>
    <automated>pnpm format:check && pnpm comments:check && pnpm lint && pnpm exec tsc --noEmit</automated>
    <automated>docker ps --format '{{.Names}}' | grep -qc . && exit 1 || exit 0</automated>
    <automated>grep -q 'e2e:cleanup' package.json && grep -q 'reset-all' SETUP.md</automated>
  </verify>
  <done>`pnpm e2e:cleanup` exits 0 on an empty registry and deletes the listed users when given ids; SETUP.md documents the probe, the teardown, the killed-run recovery command, and the `reset-all` escape hatch; ADR tech/0022 carries a dated amendment; the Compose stack and its volumes are gone; and every quality gate passes.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| test process → shared nonprod backend | A shared-secret header authorizes deletion of arbitrary user data across every consumer of that backend. |
| CI job → repository secret | `NONPROD_RESET_TOKEN` crosses into shell and Node process environments in both jobs. |
| local Compose stack → developer machine | A backend running with `SPRING_PROFILES_ACTIVE=nonprod` exposes an unauthenticated-by-profile deletion route on `localhost:8080`. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-KYV-01 | Information disclosure | `nonprod-reset-client.ts`, `global-teardown.ts`, `seed.sh cleanup` | high | mitigate | The token is passed only as a request header; it never appears in a thrown message, a log line, or an error path. Teardown failure messages list user ids, never the token. |
| T-KYV-02 | Tampering | `seeded-user-registry.ts` | medium | accept | The delete list is read from a gitignored local file written only by this repo's own seed paths. An attacker able to write it already has local filesystem access, and the backend's own existence check bounds the blast radius to real user ids. |
| T-KYV-03 | Denial of service | `seed.sh reset-all` | high | mitigate | The full wipe survives only as a human-invoked command. No workflow step, config hook, or npm script chains to it, and SETUP.md documents it as the manual last resort. Task 4's `grep` gate proves no automated `/admin/reset` curl remains in CI. |
| T-KYV-04 | Spoofing | local Compose overlay | medium | mitigate | The overlay's `APP_RESET_TOKEN` is a throwaway local-only value, written to the scratchpad and deleted in Task 5. The real `NONPROD_RESET_TOKEN` is never placed in a Compose file, and the overlay is never committed. |
| T-KYV-05 | Elevation of privilege | `e2e/signed-up-user.ts` | low | accept | The helper decodes an unverified JWT. The token is minted seconds earlier by the server this run started, and its only use is naming test data for deletion — a forged value would fail the backend's existence check, not escalate anything. |
| T-KYV-SC | Tampering | npm/pip/cargo installs | high | mitigate | Not applicable — this plan installs no packages. Every mechanism uses `node:fs`, `fetch`, `jose`, and existing runner configuration, so no package-legitimacy checkpoint is required. |
</threat_model>

<verification>
- `pnpm lint`, `pnpm format:check`, `pnpm comments:check`, `pnpm exec tsc --noEmit` all pass.
- `pnpm test` and the full `--project e2e` suite pass against the locally-run backend, with both
  registry files empty afterwards.
- No non-comment line in `.github/workflows/ci.yml` still sends a reset-token header.
- `docker ps` is empty and the scratchpad overlay is deleted.
- CI is **not** expected to go green on this branch until the backend is deployed — see the
  objective's cross-repo precondition. Do not chase a red `e2e` job caused by the stale live
  backend; report it as the known, designed refusal instead.
</verification>

<success_criteria>
- The committed contract and generated types describe the two-route `/admin/reset`.
- No automated path in this repo wipes the shared database.
- Every account-creating path in the e2e suite and the Vitest `node` project registers its user id.
- A killed run is recoverable with `pnpm e2e:cleanup`, and `pnpm e2e:seed reset-all` remains as the
  documented manual escape hatch.
- SETUP.md and ADR tech/0022 describe the mechanism that now exists.
- The summary states plainly that the backend must be deployed before this branch merges.
</success_criteria>

<output>
Create `.planning/quick/260829-kyv-regenerate-openapi-contract-from-backend/260829-kyv-SUMMARY.md` when done.
</output>
</content>
</invoke>
