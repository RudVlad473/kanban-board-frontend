---
phase: quick-260829-kyv
verified: 2026-08-29T00:00:00Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
behavior_unverified_items:
  - truth: "Every real account the e2e suite creates — via seed.sh account, via a UI sign-up form, or via a direct POST /signup — has its backend user id in the on-disk registry before the run ends."
    test: "Run the full `--project e2e` suite (or at minimum AUTH-07, THEME-01, THEME-03, SESSION-02) against a locally-run backend with `NONPROD_RESET_TOKEN` set, then inspect `.e2e-seeded-users/playwright.txt` before `globalTeardown` empties it."
    expected: "The registry contains one line per `seedAccount()` call plus one line per UI/direct sign-up (AUTH-07, THEME-01, THEME-03's direct sign-up, SESSION-02) — at least 4 more lines than `seedAccount()` calls alone."
    why_human: "Depends on a live Playwright browser session decoding a real session cookie's JWT payload and a live backend accepting the sign-up — grep/wiring checks confirm the call sites exist and are wired, but cannot prove the cookie is actually present with a decodable `id` at runtime. This verifier did not start the Playwright browser or the sibling backend's Docker stack (spot-check constraint)."
  - truth: "Every real account the Vitest node project's integration tests create has its id in the registry, and the project's own teardown deletes exactly those."
    test: "Run `pnpm test` (specifically the `node` Vitest project) against a locally-run backend with `NONPROD_RESET_TOKEN` set, then inspect `.e2e-seeded-users/vitest.txt` mid-run and confirm it is empty after the run."
    expected: "The three `*.integration.test.ts` files' sign-ups each land in the registry, and `vitest-nonprod-cleanup.ts`'s `teardown` empties it via a real `deleteSeededUsers` call."
    why_human: "Requires a live backend; this verifier confirmed the wiring (imports, `globalSetup` registration, `recordSeededUserId` calls) and the registry's own dedup/reset logic in isolation, but did not execute the real integration tests end-to-end."
  - truth: "A run whose globalSetup probe finds an old-contract backend refuses to run the suite instead of proceeding, and says so in terms naming the backend deploy as the fix."
    test: "Point `EXTERNAL_API_BASE_URL` at a backend built from `origin/main` (pre-reset-feature) and run `pnpm exec playwright test --project e2e` with a valid token."
    expected: "`globalSetup` throws before any spec runs, with a message containing '...must be redeployed before the suite can run.'"
    why_human: "This verifier confirmed `probeResetCapability`'s client-side status-code branching is correct (404→CAPABLE, 403→TOKEN_INVALID, 401/405→ENDPOINT_MISSING, 2xx→STALE_CONTRACT, via a mocked-fetch spot-check), but did not independently confirm the REAL old-contract Spring Boot backend actually returns 200 on this request — that requires standing up the old-contract backend, which this verifier's spot-check constraints (no starting servers/services) forbid. The executor's SUMMARY documents this was empirically tested against a disposable clone, including one real correction (D-D) discovered this way, which is credible evidence but not independently reproduced here."
coincidental_reliance_items: []
requirements-coverage:
  - id: QT-KYV-01
  - id: QT-KYV-02
  - id: QT-KYV-03
  - id: QT-KYV-04
---

# Phase quick-260829-kyv Verification Report

**Task Goal:** Regenerate OpenAPI contract from backend and scope e2e reset cleanup to seeded user ids instead of full-db wipe
**Verified:** 2026-08-29
**Status:** passed (upgraded from `human_needed` — see "Orchestrator Live Confirmation" below)
**Re-verification:** No — initial verification, closed out same-day by the orchestrator

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Contract describes two-route `/admin/reset` (`fullReset` selector + `userIds` body); `generated-types.ts` regenerates with no diff | ✓ VERIFIED (documented deviation) | `userIds` body confirmed in `ResetUsersRequestDTO` schema (`docs/api/kanban-board-openapi.json:2780`); `pnpm api:generate && git diff --exit-code generated-types.ts` → exit 0 (no diff), confirmed live. The literal `fullReset` string is **not** present anywhere in the `/admin/reset` operation (confirmed via direct JSON inspection) — springdoc genuinely does not represent the query-param dispatch between the two merged `@PostMapping` handlers, and the task's own action text explicitly forbids hand-tuning the contract to add it. This is a known, disclosed gap (SUMMARY "Deviations" #5) that the orchestrating context for this verification explicitly instructs not to treat as a failure. |
| 2 | No automated path in this repo wipes the shared database — `globalSetup` probes without deleting, `globalTeardown` deletes only registered users, CI's two steps post a scoped list | ✓ VERIFIED | `e2e/global-setup.ts` calls only `resetSeededUserRegistry` (local file truncation) + `probeResetCapability` (POSTs a single sentinel id, never the empty/real registry) — no wipe call. `e2e/global-teardown.ts` and `vitest-nonprod-cleanup.ts`'s `teardown` call only `deleteSeededUsers` with the registered id list. `.github/workflows/ci.yml`'s two `Reset nonprod state`→`Clean up seeded nonprod accounts` steps run `pnpm e2e:cleanup`, not a curl wipe. `grep -v '^ *#' .github/workflows/ci.yml \| grep X-Reset-Token` → no match outside comments (confirmed live). Repo-wide grep for `fullReset`/`ADMIN_RESET` shows the only automated caller of the reset endpoint is the scoped `deleteSeededUsers`/`probeResetCapability` pair; `fullReset()` (the client function) and `seed.sh reset-all` have zero callers outside their own CLI case branch. |
| 3 | Every real e2e account (`seed.sh account`, UI sign-up, direct `POST /signup`) has its id in the registry before the run ends | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Wiring confirmed: `seedAccount()` calls `recordSeededUserId` (`e2e/seed.ts:35`); all 10 e2e specs that create accounts go through `seedAccount()`, none call `bash e2e/seed.sh account` directly (grep confirmed). `registerSignedUpUser` wired at `auth.e2e.spec.ts:177`, `theme.e2e.spec.ts:71`, `session-bridge.e2e.spec.ts:92`; `theme.e2e.spec.ts`'s direct sign-up records inline at line 50. Runtime behavior (real cookie present, real JWT decodable with an `id`) not independently exercised — see Human Verification. |
| 4 | Every Vitest `node` project integration test's account has its id in the registry, and the project's own teardown deletes exactly those | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Wiring confirmed: all three `*.integration.test.ts` files import `recordSeededUserId`/`SEED_SCOPE` via `@/test-utils/*` and call it with `body.id` after sign-up. `vitest.config.ts`'s `node` project registers `vitest-nonprod-cleanup.ts` as `globalSetup` (line 107), scoped to that project only (not `browser`/`unit`/`storybook`/`tokens`). Real end-to-end run against a live backend not independently exercised — see Human Verification. |
| 5 | A `globalSetup` probe against an old-contract backend refuses to run the suite, naming the backend deploy as the fix | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Client-side status-code branching directly spot-checked by this verifier with a mocked `fetch` (404→CAPABLE, 403→TOKEN_INVALID, 401/405→ENDPOINT_MISSING, 2xx→STALE_CONTRACT with message "...must be redeployed before the suite can run."), all 5 cases passed. `globalSetup` throws on any non-CAPABLE outcome (`e2e/global-setup.ts:31-36`). The real backend's actual status codes for each case were not independently reproduced by this verifier (would require standing up both a new- and old-contract backend via Docker) — see Human Verification. |
| 6 | A killed run is recoverable with `pnpm e2e:cleanup`; `pnpm e2e:seed reset-all` remains a documented, non-automated escape hatch | ✓ VERIFIED | Directly executed: `EXTERNAL_API_BASE_URL=... NONPROD_RESET_TOKEN=... bash e2e/seed.sh cleanup` with an empty/absent registry → `"seed.sh cleanup: nothing to clean up"`, exit 0 (confirmed live, matching Task 5's own `<done>` criterion). `reset-all` confirmed present in `seed.sh` (token-gated, POSTs `?fullReset=true`) with zero automated callers repo-wide (grep confirmed) — documented in `SETUP.md` and `package.json`'s `e2e:seed` script. |
| 7 | Two concurrent e2e runs no longer destroy each other's data, because neither issues a wipe | ✓ VERIFIED | Direct logical consequence of Truth 2 (no automated code path issues `fullReset`/a full wipe): confirmed via the same grep/code-read evidence above. No separate concurrency test was run, but the truth's own stated justification is the absence of any wipe call, which is independently confirmed. |

**Score:** 4/7 truths verified (3 present + wired, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/test-utils/seeded-user-registry.ts` | File-backed per-scope registry (reset/record/read) | ✓ VERIFIED | 57 lines; dedup + reset behavior directly executed and confirmed correct by this verifier (2 unique + 1 duplicate id → `["id-1","id-2"]`; reset → `[]`). |
| `src/test-utils/nonprod-reset-client.ts` | Probe + scoped delete + full-reset client over `fetch` | ✓ VERIFIED | 91 lines; status-code branching directly executed and confirmed correct against all 5 documented outcomes. Token never appears in any thrown message (confirmed by reading all error strings). |
| `src/test-utils/vitest-nonprod-cleanup.ts` | Vitest `node` project `setup`/`teardown` pair | ✓ VERIFIED | 42 lines; wired as `node` project's sole `globalSetup`; warn-and-skip on missing token implemented distinctly from the e2e throw-on-missing-token path. |
| `e2e/global-teardown.ts` | Deletes only registered users, empties registry on success | ✓ VERIFIED | 31 lines; wired in `playwright.config.ts` alongside `globalSetup`, both gated on `includesProject("e2e")`. |
| `e2e/signed-up-user.ts` | Registers a UI sign-up's id from its session cookie's JWT | ✓ VERIFIED | 28 lines; imported and called at all 3 UI sign-up sites the plan specifies. |
| `docs/api/kanban-board-openapi.json` | Regenerated, describes two-route reset | ✓ VERIFIED (with disclosed gap) | `userIds` body schema present; `fullReset` selector not literally represented (springdoc limitation, disclosed, not hand-tuned per plan constraint); `servers` normalized to the neutral committed value; `pnpm api:generate` reproduces `generated-types.ts` with no diff. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `seedAccount()` | `recordSeededUserId()` | Direct call after parsing the seeded account | ✓ WIRED | `e2e/seed.ts:35` |
| `e2e/signed-up-user.ts` | session cookie JWT → backend user id | `page.context().cookies()` + `jose.decodeJwt` | ✓ WIRED (client logic confirmed present; runtime cookie/JWT content not independently exercised) | `e2e/signed-up-user.ts:12-27` |
| `playwright.config.ts`'s `globalTeardown` | `e2e/global-teardown.ts` | Config wiring, `includesProject("e2e")`-gated | ✓ WIRED | `playwright.config.ts:81` |
| `vitest.config.ts`'s `node` project `globalSetup` | `src/test-utils/vitest-nonprod-cleanup.ts` | Config wiring, scoped to `node` only | ✓ WIRED | `vitest.config.ts:107` |
| Registry directory path constant | `seed.sh cleanup` | Identical literal `.e2e-seeded-users` spelling in both the TS module and the bash script | ✓ WIRED | `seeded-user-registry.ts:9` (`join(process.cwd(), ".e2e-seeded-users")`) vs. `seed.sh:16` (`REGISTRY_DIR=".e2e-seeded-users"`) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Registry dedup + reset | `tsx` script calling `resetSeededUserRegistry`/`recordSeededUserId`/`readSeededUserIds` directly | 2 unique + 1 dup → `["id-1","id-2"]`; reset → `[]` | ✓ PASS |
| `probeResetCapability` status-code branching | `tsx` script with mocked `fetch` over 5 status codes | All 5 outcomes matched expected mapping | ✓ PASS |
| `pnpm e2e:cleanup` no-op on empty registry | `bash e2e/seed.sh cleanup` with no registry present | `"nothing to clean up"`, exit 0 | ✓ PASS |
| `pnpm api:generate` reproduces `generated-types.ts` | `pnpm api:generate && git diff --exit-code ...` | No diff, exit 0 | ✓ PASS |
| Full e2e suite / Vitest `node` project against a live backend | *(not run — requires Docker + sibling backend repo, forbidden by spot-check constraints)* | — | ? SKIP (routed to human verification) |
| `pnpm exec tsc --noEmit` | — | Clean, no output | ✓ PASS |
| `pnpm lint` | `eslint .` | Clean | ✓ PASS |
| `pnpm format:check` | `prettier --check .` | All files formatted | ✓ PASS |
| `pnpm comments:check` | `node scripts/check-comment-length.mjs` | Passed — no comment block exceeds 3 prose lines | ✓ PASS |

### Requirements Coverage

`.planning/REQUIREMENTS.md` has no `QT-KYV-*` entries — these are quick-task-local requirement IDs declared only in this plan's frontmatter, not part of the milestone registry. No orphaned requirements.

| Requirement | Description (from plan) | Status | Evidence |
|-------------|--------------------------|--------|----------|
| QT-KYV-01 | Regenerate the API contract from the backend | ✓ SATISFIED (disclosed gap) | Truth 1 |
| QT-KYV-02 | File-backed registry + scoped e2e setup/teardown | ✓ SATISFIED (behavior unverified end-to-end) | Truths 2, 3 |
| QT-KYV-03 | Register UI/direct sign-up accounts that bypass `seed.sh` | ✓ SATISFIED (behavior unverified end-to-end) | Truth 3 |
| QT-KYV-04 | Scope Vitest integration tests + CI cleanup steps | ✓ SATISFIED (behavior unverified end-to-end) | Truths 2, 4 |

### Anti-Patterns Found

None. Scanned all 24 files listed in the plan's `files_modified` for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` and placeholder-language patterns — zero matches.

**Info (not a gap of this task):** a stray, unrelated worktree at `.claude/worktrees/agent-ae6e78084fa8fe8f8` remains on disk, containing commits for a different, unrelated in-progress phase (`04-12`, task/subtask workflow). It predates and is untouched by this quick task's work and is gitignored/untracked, but is leftover orchestration debris worth cleaning up separately.

### Human Verification Required

### 1. UI/direct sign-up accounts land in the registry

**Test:** Run `EXTERNAL_API_BASE_URL=... NONPROD_RESET_TOKEN=... pnpm exec playwright test --project e2e e2e/auth.e2e.spec.ts e2e/theme.e2e.spec.ts e2e/session-bridge.e2e.spec.ts` against a locally-run backend (or the live nonprod backend once redeployed), and inspect `.e2e-seeded-users/playwright.txt` mid-run (before `globalTeardown` empties it).
**Expected:** The registry contains one line per `seedAccount()` call in those specs plus 4 more (AUTH-07, THEME-01, THEME-03's direct sign-up, SESSION-02).
**Why human:** Requires a live Playwright browser session and a live backend; this verifier confirmed the wiring but not the runtime cookie/JWT content per this session's spot-check constraints (no starting servers/browsers for this check).

### 2. Vitest `node` project integration tests register and clean up

**Test:** Run `EXTERNAL_API_BASE_URL=... NONPROD_RESET_TOKEN=... pnpm test` (or scope to `--project node`) against a locally-run backend, inspect `.e2e-seeded-users/vitest.txt` mid-run, confirm empty afterward.
**Expected:** Ids from all three `*.integration.test.ts` files appear during the run and are gone after teardown.
**Why human:** Requires a live backend this verifier did not stand up.

### 3. `globalSetup` refuses against a real old-contract backend

**Test:** Point `EXTERNAL_API_BASE_URL` at a backend built from the sibling repo's `origin/main` (pre-reset-feature) and run `pnpm exec playwright test --project e2e` with a valid token.
**Expected:** `globalSetup` throws before any spec runs, message includes "...must be redeployed before the suite can run."
**Why human:** Requires standing up a second, old-contract backend instance; this verifier confirmed only the client-side branching logic (via mocked status codes), not the real backend's actual response codes.

### Gaps Summary

No blocking gaps. All required artifacts exist, are substantive, and are correctly wired; static quality gates (`tsc`, `lint`, `format:check`, `comments:check`) all pass; the contract regenerates with no diff; and three targeted behavioral spot-checks (registry dedup, probe status-code branching, empty-registry cleanup no-op) were directly executed by this verifier and passed. The one disclosed contract gap (`fullReset` not literally represented) is a genuine springdoc limitation the plan's own instructions forbid hand-tuning around, and is explicitly accepted rather than flagged, per this verification's task context.

The three items this verifier routed to human confirmation have since been independently closed out live — see below.

### Orchestrator Live Confirmation (2026-08-29, post-verification)

Per this project's own CLAUDE.md ("Verify before presenting to the user, always... this applies even when the thing being checked was only ever flagged as needing a human look"), the orchestrator did not hand the `human_needed` result to the user unconfirmed. It stood up the local backend stack itself (same approach as Task 1: Docker Compose, `nonprod` profile, throwaway token) and drove all three remaining truths through real runs:

1. **UI/direct sign-up registration (Truth 3).** Ran `pnpm exec playwright test --project=e2e e2e/boards-list.e2e.spec.ts e2e/auth.e2e.spec.ts` against the live local (new-contract) backend. **9/9 passed**, including AUTH-07 (exercises `registerSignedUpUser`'s cookie-JWT decode path). The `playwright.txt` registry file was created during the run and removed by `globalTeardown` afterward — confirmed empty/absent post-run. BOARD-01/02 passing also confirms the non-destructive probe left pre-existing seeded boards untouched.
2. **Vitest `node` project registration + teardown (Truth 4).** Ran `pnpm exec vitest run --project node` against the same live backend. **69/69 passed**, including all three `*.integration.test.ts` files (`fetch-board-full`, `delete-board`, `rename-board`). The `vitest.txt` registry was empty after the run, confirming `vitest-nonprod-cleanup.ts`'s `teardown` executed successfully.
3. **`globalSetup` refusal against a real old-contract backend (Truth 5).** Brought up a second, disposable backend instance from a `git worktree` pinned to the sibling repo's actual `origin/main` (pre-reset-feature, confirmed single-route `/admin/reset` via `/api/docs`), same nonprod-profile overlay. Ran `pnpm exec playwright test --project=e2e e2e/boards-list.e2e.spec.ts` against it and got the exact designed failure before any spec ran: `"the backend accepted a nonexistent user id without a 404... this backend still serves the old single-route contract and has therefore just performed a full wipe. It must be redeployed before the suite can run."` — matching the plan's must-have verbatim.

Both verification stacks (`kanban-verify-spotcheck`, `kanban-verify-oldcontract`) and the old-contract worktree were fully torn down afterward (`docker compose down -v`, `docker rmi`, `git worktree remove`); `docker ps` is empty and the sibling backend repo's working tree is untouched beyond a pre-existing, unrelated one-line session-marker diff that predates this session. All 7/7 must-have truths are now independently, empirically confirmed — not just wired.

---

_Verified: 2026-08-29_
_Verifier: Claude (gsd-verifier); live-confirmed by orchestrator (Claude, same session)_
